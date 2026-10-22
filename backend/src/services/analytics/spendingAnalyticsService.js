const Transaction = require("../../models/transactions");
const Budget = require("../../models/budget");
const { isStudent } = require("../../utils/roles");

/**
 * Deterministic Spending Analytics Service.
 * Calculates verified mathematical financial facts, category distributions,
 * period-over-period comparisons, and budget utilizations.
 *
 * CRITICAL RULE: Gemini MUST NOT compute these numbers.
 * The output of this service is the authoritative source of truth.
 */

/**
 * Resolves period boundaries with timezone awareness and partial-period alignment.
 * Compares current month-to-date against the identical elapsed window in the previous month.
 */
function resolvePeriodBoundaries({ period = "month", startDate, endDate, referenceDate } = {}) {
  const ref = referenceDate ? new Date(referenceDate) : new Date();

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    return {
      current: { start, end, label: "Custom Period" },
      previous: { start: prevStart, end: prevEnd, label: "Prior Period Equivalent" },
      daysElapsed: Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24))),
      isPartialMonth: false
    };
  }

  // Default: Calendar Month (Aligned Month-to-Date)
  const currentYear = ref.getFullYear();
  const currentMonth = ref.getMonth();
  const currentDay = ref.getDate();

  const currentStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
  const currentEnd = new Date(currentYear, currentMonth, currentDay, 23, 59, 59, 999);

  // Previous month calculation
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  const prevEndDay = Math.min(currentDay, daysInPrevMonth);

  const prevStart = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0);
  const prevEnd = new Date(prevYear, prevMonth, prevEndDay, 23, 59, 59, 999);

  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const isPartialMonth = currentDay < daysInCurrentMonth;

  return {
    current: {
      start: currentStart,
      end: currentEnd,
      label: isPartialMonth ? `Month-to-date (Days 1–${currentDay})` : "Full Month",
      year: currentYear,
      month: currentMonth + 1,
      daysElapsed: currentDay,
      totalDays: daysInCurrentMonth
    },
    previous: {
      start: prevStart,
      end: prevEnd,
      label: isPartialMonth ? `Previous Month Aligned (Days 1–${prevEndDay})` : "Previous Full Month",
      year: prevYear,
      month: prevMonth + 1,
      daysElapsed: prevEndDay,
      totalDays: daysInPrevMonth
    },
    daysElapsed: currentDay,
    isPartialMonth
  };
}

/**
 * Builds base query filters respecting multi-tenant boundaries and user RBAC.
 */
function buildQueryFilter({ organizationId, userId, userRole, dateFilter = {} }) {
  const filter = { ...dateFilter };

  if (organizationId) {
    filter.organization = organizationId;
  }

  // Members / Students can only analyze their own transactions
  if (isStudent(userRole)) {
    filter.user = userId;
  } else if (userId && !organizationId) {
    filter.user = userId;
  }

  return filter;
}

/**
 * Calculates comprehensive deterministic spending metrics.
 *
 * @param {object} params
 * @param {string|ObjectId} params.organizationId
 * @param {string|ObjectId} params.userId
 * @param {string} params.userRole
 * @param {string} [params.period="month"]
 * @param {Date} [params.referenceDate]
 * @returns {Promise<object>} Verified financial facts
 */
async function calculateSpendingAnalytics({
  organizationId,
  userId,
  userRole,
  period = "month",
  startDate,
  endDate,
  referenceDate
} = {}) {
  const boundaries = resolvePeriodBoundaries({ period, startDate, endDate, referenceDate });

  // 1. Fetch current and previous period transactions
  const currentQuery = buildQueryFilter({
    organizationId,
    userId,
    userRole,
    dateFilter: {
      date: { $gte: boundaries.current.start, $lte: boundaries.current.end }
    }
  });

  const previousQuery = buildQueryFilter({
    organizationId,
    userId,
    userRole,
    dateFilter: {
      date: { $gte: boundaries.previous.start, $lte: boundaries.previous.end }
    }
  });

  const [currentTxs, previousTxs] = await Promise.all([
    Transaction.find(currentQuery).lean(),
    Transaction.find(previousQuery).lean()
  ]);

  // 2. Compute Current Period Totals
  const currentExpenses = currentTxs.filter(t => t.type === "expense");
  const currentIncome = currentTxs.filter(t => t.type === "income");

  const totalExpense = currentExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalIncome = currentIncome.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const netCashFlow = totalIncome - totalExpense;
  const expenseCount = currentExpenses.length;
  const avgExpenseAmount = expenseCount > 0 ? Math.round(totalExpense / expenseCount) : 0;

  // 3. Compute Previous Period Totals
  const previousExpenses = previousTxs.filter(t => t.type === "expense");
  const previousIncome = previousTxs.filter(t => t.type === "income");

  const prevTotalExpense = previousExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const prevTotalIncome = previousIncome.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const prevExpenseCount = previousExpenses.length;

  const expenseAbsoluteChange = totalExpense - prevTotalExpense;
  const expensePercentageChange = prevTotalExpense > 0
    ? Number(((expenseAbsoluteChange / prevTotalExpense) * 100).toFixed(1))
    : (totalExpense > 0 ? 100 : 0);

  // 4. Category Breakdown Analysis
  const currentCategoryMap = {};
  for (const t of currentExpenses) {
    const cat = t.category || "Other / Misc";
    if (!currentCategoryMap[cat]) {
      currentCategoryMap[cat] = { total: 0, count: 0 };
    }
    currentCategoryMap[cat].total += Number(t.amount) || 0;
    currentCategoryMap[cat].count += 1;
  }

  const prevCategoryMap = {};
  for (const t of previousExpenses) {
    const cat = t.category || "Other / Misc";
    if (!prevCategoryMap[cat]) {
      prevCategoryMap[cat] = { total: 0, count: 0 };
    }
    prevCategoryMap[cat].total += Number(t.amount) || 0;
    prevCategoryMap[cat].count += 1;
  }

  const allCategoryNames = Array.from(
    new Set([...Object.keys(currentCategoryMap), ...Object.keys(prevCategoryMap)])
  );

  const categories = allCategoryNames.map(name => {
    const curr = currentCategoryMap[name] || { total: 0, count: 0 };
    const prev = prevCategoryMap[name] || { total: 0, count: 0 };

    const absChange = curr.total - prev.total;
    const pctChange = prev.total > 0
      ? Number(((absChange / prev.total) * 100).toFixed(1))
      : (curr.total > 0 ? 100 : 0);

    const shareOfSpending = totalExpense > 0
      ? Number(((curr.total / totalExpense) * 100).toFixed(1))
      : 0;

    return {
      category: name,
      current: curr.total,
      previous: prev.total,
      count: curr.count,
      average: curr.count > 0 ? Math.round(curr.total / curr.count) : 0,
      shareOfSpending,
      absoluteChange: absChange,
      percentageChange: pctChange
    };
  }).filter(c => c.current > 0 || c.previous > 0);

  // Sort categories by current spend descending
  categories.sort((a, b) => b.current - a.current);

  const topCategory = categories[0] || null;
  const top3Categories = categories.slice(0, 3);

  // Category with highest nominal growth and drop
  const categoriesWithPrior = categories.filter(c => c.previous > 0);
  const highestIncrease = categoriesWithPrior.length > 0
    ? [...categoriesWithPrior].sort((a, b) => b.absoluteChange - a.absoluteChange)[0]
    : null;

  const highestDecrease = categoriesWithPrior.length > 0
    ? [...categoriesWithPrior].sort((a, b) => a.absoluteChange - b.absoluteChange)[0]
    : null;

  // 5. Active Budget Analysis
  const budgetQuery = { status: "approved" };
  if (organizationId) budgetQuery.organization = organizationId;
  const budgets = await Budget.find(budgetQuery).lean();

  const daysElapsed = boundaries.daysElapsed || 1;
  const totalDays = boundaries.current.totalDays || 30;
  const expectedPacePct = Number(((daysElapsed / totalDays) * 100).toFixed(1));

  const budgetAnalysis = budgets.map(b => {
    const allocated = Number(b.total_budget || b.allocated || b.amount || 0);
    const spent = Number(b.spent || 0);
    const remaining = allocated - spent;
    const utilization = allocated > 0 ? Number(((spent / allocated) * 100).toFixed(1)) : 0;

    let riskLevel = "INFO";
    if (utilization > 100) {
      riskLevel = "CRITICAL";
    } else if (utilization >= 85) {
      riskLevel = "WARNING";
    } else if (utilization >= 70) {
      riskLevel = "NOTICE";
    }

    const isAheadOfPace = utilization > (expectedPacePct + 15);

    return {
      budgetId: b._id,
      title: b.title || "Operating Budget",
      allocated,
      spent,
      remaining,
      utilization,
      riskLevel,
      daysElapsed,
      totalDays,
      expectedPacePct,
      isAheadOfPace
    };
  });

  // 6. Data Sufficiency Evaluation
  const hasTransactions = expenseCount > 0;
  const hasMultipleTransactions = expenseCount >= 3;
  const hasPreviousPeriodData = prevExpenseCount > 0 && prevTotalExpense > 0;

  let sufficiencyNotice = null;
  if (!hasTransactions) {
    sufficiencyNotice = "Not enough spending data yet to generate insights.";
  } else if (!hasMultipleTransactions) {
    sufficiencyNotice = "Limited spending data: trend claims are suppressed until more history is recorded.";
  } else if (!hasPreviousPeriodData) {
    sufficiencyNotice = "First recorded spending period: period-over-period variance will be enabled next month.";
  }

  return {
    period: {
      current: boundaries.current,
      previous: boundaries.previous,
      isPartialMonth: boundaries.isPartialMonth
    },
    summary: {
      totalIncome,
      totalExpense,
      netCashFlow,
      expenseCount,
      avgExpenseAmount,
      currency: "INR"
    },
    comparison: {
      previousTotalExpense: prevTotalExpense,
      previousTotalIncome: prevTotalIncome,
      previousExpenseCount: prevExpenseCount,
      absoluteChange: expenseAbsoluteChange,
      percentageChange: expensePercentageChange,
      hasPreviousPeriodData
    },
    categories,
    rankings: {
      topCategory,
      top3Categories,
      highestIncrease: highestIncrease && highestIncrease.absoluteChange > 0 ? highestIncrease : null,
      highestDecrease: highestDecrease && highestDecrease.absoluteChange < 0 ? highestDecrease : null
    },
    budgets: budgetAnalysis,
    dataSufficiency: {
      hasTransactions,
      hasMultipleTransactions,
      hasPreviousPeriodData,
      insufficientData: !hasTransactions,
      notice: sufficiencyNotice
    }
  };
}

module.exports = {
  resolvePeriodBoundaries,
  calculateSpendingAnalytics
};
