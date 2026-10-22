const { calculateSpendingAnalytics } = require("../analytics/spendingAnalyticsService");
const { prepareSpendingAnalyticsContext } = require("./dataPreparation/dataPreparation");
const aiService = require("./AIService");
const AIInsight = require("../../models/aiInsight");
const { isStudent } = require("../../utils/roles");

const CACHE_TTL_HOURS = 6;

/**
 * Service to orchestrate deterministic financial analytics and AI spending insights.
 */

/**
 * Retrieves or generates grounded spending insights.
 *
 * @param {object} params
 * @param {string|ObjectId} params.organizationId
 * @param {object} params.user - Authenticated user object
 * @param {boolean} [params.force=false] - Bypass cache and regenerate
 * @param {string} [params.period="month"]
 * @param {Date} [params.startDate]
 * @param {Date} [params.endDate]
 * @param {Date} [params.referenceDate]
 */
async function getSpendingInsights({
  organizationId,
  user,
  force = false,
  period = "month",
  startDate,
  endDate,
  referenceDate
} = {}) {
  // 1. Calculate deterministic financial analytics (authoritative source of truth)
  const analytics = await calculateSpendingAnalytics({
    organizationId,
    userId: user?._id,
    userRole: user?.role,
    period,
    startDate,
    endDate,
    referenceDate
  });

  // 2. Data Sufficiency Check (Phase 5)
  // If no transactions exist, do not call Gemini; return deterministic guidance
  if (analytics.dataSufficiency?.insufficientData) {
    return {
      period: analytics.period,
      summary: analytics.summary,
      comparison: analytics.comparison,
      categories: analytics.categories,
      budgets: analytics.budgets,
      rankings: analytics.rankings,
      dataSufficiency: analytics.dataSufficiency,
      insights: [
        {
          type: "SPENDING_SUMMARY",
          title: "Insufficient Data",
          summary: analytics.dataSufficiency.notice || "Not enough spending data yet to generate insights.",
          message: analytics.dataSufficiency.notice || "Not enough spending data yet to generate insights.",
          severity: "info",
          confidence: 1.0,
          recommendation: "Record transactions to receive personalized spending insights and trends.",
          source: "deterministic"
        }
      ],
      cached: false,
      source: "deterministic"
    };
  }

  // 3. Cache Evaluation (Phase 12)
  const cacheUserFilter = isStudent(user?.role) ? user._id : null;
  const recentCacheCutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000);

  if (!force) {
    const cachedInsights = await AIInsight.find({
      organization: organizationId,
      user: cacheUserFilter,
      type: {
        $in: [
          "SPENDING_SUMMARY",
          "SPENDING_INSIGHT",
          "CATEGORY_TREND",
          "SPENDING_CHANGE",
          "BUDGET_PROGRESS",
          "TOP_CATEGORY",
          "SAVING_OPPORTUNITY",
          "SPENDING_RECOMMENDATION"
        ]
      },
      createdAt: { $gte: recentCacheCutoff },
      isDismissed: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .lean();

    if (cachedInsights && cachedInsights.length > 0) {
      return {
        period: analytics.period,
        summary: analytics.summary,
        comparison: analytics.comparison,
        categories: analytics.categories,
        budgets: analytics.budgets,
        rankings: analytics.rankings,
        dataSufficiency: analytics.dataSufficiency,
        insights: cachedInsights,
        cached: true,
        source: "cache"
      };
    }
  }

  // 4. Prepare sanitized, grounded AI DTO (Phase 7)
  const sanitizedContext = prepareSpendingAnalyticsContext(analytics);

  // 5. Generate structured interpretations via AIService (Phase 8 & 9)
  const aiResult = await aiService.generateSpendingInsights({
    analyticsContext: sanitizedContext,
    organizationId,
    userId: user?._id
  });

  const rawInsights = aiResult.insights || [];

  // Fallback: If AI returned empty array, generate deterministic fallback insights
  const insightsToPersist = rawInsights.length > 0
    ? rawInsights
    : generateDeterministicFallbackInsights(analytics);

  // 6. Persist insights into AIInsight collection (Phase 6 & 11)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const savedInsights = [];

  for (const item of insightsToPersist) {
    const doc = await AIInsight.create({
      organization: organizationId,
      user: cacheUserFilter,
      type: item.type,
      title: item.title,
      summary: item.summary,
      message: item.summary,
      suggestion: item.recommendation || item.suggestion,
      severity: item.severity || "info",
      confidence: typeof item.confidence === "number" ? item.confidence : 0.85,
      source: "ai",
      metadata: {
        provider: aiResult.provider,
        model: aiResult.model,
        period: analytics.period?.current?.label,
        totalExpense: analytics.summary.totalExpense
      },
      expiresAt
    });
    savedInsights.push(doc);
  }

  return {
    period: analytics.period,
    summary: analytics.summary,
    comparison: analytics.comparison,
    categories: analytics.categories,
    budgets: analytics.budgets,
    rankings: analytics.rankings,
    dataSufficiency: analytics.dataSufficiency,
    insights: savedInsights,
    cached: false,
    source: "ai"
  };
}

/**
 * Deterministic fallback generator when AI model produces an empty list.
 */
function generateDeterministicFallbackInsights(analytics) {
  const insights = [];

  // Top spending insight
  if (analytics.rankings?.topCategory) {
    const top = analytics.rankings.topCategory;
    insights.push({
      type: "TOP_CATEGORY",
      title: `${top.category} is your highest spending category`,
      summary: `${top.category} accounted for ${top.shareOfSpending}% of your expenses (₹${top.current.toLocaleString()}).`,
      severity: "info",
      confidence: 1.0,
      recommendation: `Monitor your ${top.category} spending to maintain budget adherence.`
    });
  }

  // Spending change insight
  if (analytics.comparison?.hasPreviousPeriodData && analytics.comparison.percentageChange !== 0) {
    const isIncrease = analytics.comparison.percentageChange > 0;
    insights.push({
      type: "SPENDING_CHANGE",
      title: `Spending ${isIncrease ? "increased" : "decreased"} by ${Math.abs(analytics.comparison.percentageChange)}%`,
      summary: `Total expenses are ₹${Math.abs(analytics.comparison.absoluteChange).toLocaleString()} ${isIncrease ? "higher" : "lower"} compared to the previous period.`,
      severity: isIncrease && analytics.comparison.percentageChange > 20 ? "warning" : "info",
      confidence: 1.0,
      recommendation: isIncrease ? "Review recent discretionary purchases." : "Great job maintaining spending discipline."
    });
  }

  return insights;
}

module.exports = {
  getSpendingInsights,
  generateDeterministicFallbackInsights
};
