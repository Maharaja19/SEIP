/**
 * Safe Data Preparation Layer for AI Ingestion.
 * Strips all internal tokens, hashes, passwords, and sensitive entity internals.
 * Yields clean, normalized DTOs for the AI layer.
 */

/**
 * Prepares a sanitized Transaction DTO for AI analysis / categorization.
 */
function prepareTransactionContext(transaction, allowedCategories = []) {
  if (!transaction) return null;

  const raw = transaction.toObject ? transaction.toObject() : transaction;

  return {
    type: String(raw.type || "expense").toLowerCase(),
    amount: Number(raw.amount) || 0,
    currency: String(raw.currency || "INR").toUpperCase(),
    merchant: raw.merchant || raw.payee || undefined,
    description: raw.description ? String(raw.description).trim().substring(0, 300) : undefined,
    currentCategory: raw.category || undefined,
    department: raw.department || "General",
    date: raw.date ? new Date(raw.date).toISOString().split("T")[0] : undefined,
    paymentMethod: raw.paymentMethod || undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 10) : [],
    allowedCategories: Array.isArray(allowedCategories) ? allowedCategories : []
  };
}

/**
 * Prepares a sanitized Budget DTO for AI recommendation / adherence.
 */
function prepareBudgetContext(budget) {
  if (!budget) return null;

  const raw = budget.toObject ? budget.toObject() : budget;

  return {
    title: raw.title || raw.name || "Budget",
    period: raw.period || "MONTHLY",
    allocated: Number(raw.allocated || raw.total_budget || raw.amount || 0),
    spent: Number(raw.spent || raw.spentAmount || 0),
    remaining: Number(raw.remaining || 0),
    utilizationPercentage: Number(raw.utilizationPercentage || (raw.allocated > 0 ? (raw.spent / raw.allocated) * 100 : 0).toFixed(1)),
    category: raw.category || "General",
    expensesCount: Array.isArray(raw.expenses) ? raw.expenses.length : 0
  };
}

/**
 * Prepares aggregated financial metrics for high-level insight generation.
 */
function prepareAggregatedContext({ transactions = [], budgets = [], walletBalance = 0, currency = "INR" } = {}) {
  const expenseTransactions = transactions.filter(t => t.type === "expense");
  const incomeTransactions = transactions.filter(t => t.type === "income");

  const totalExpense = expenseTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalIncome = incomeTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  const categoryBreakdown = {};
  for (const t of expenseTransactions) {
    const cat = t.category || "misc";
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (t.amount || 0);
  }

  const budgetSummary = budgets.map(prepareBudgetContext);

  return {
    currency,
    walletBalance: Number(walletBalance) || 0,
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
    transactionsCount: transactions.length,
    topCategories: Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, amt]) => ({ category: cat, amount: amt })),
    budgets: budgetSummary
  };
}

/**
 * Prepares deterministic spending analytics into a sanitized, grounded AI prompt DTO.
 * Excludes all sensitive keys, MongoDB IDs, passwords, session tokens.
 */
function prepareSpendingAnalyticsContext(analytics) {
  if (!analytics) return null;

  return {
    period: {
      current: analytics.period?.current?.label || "Current Period",
      previous: analytics.period?.previous?.label || "Previous Period",
      isPartialMonth: Boolean(analytics.period?.isPartialMonth)
    },
    summary: {
      totalIncome: Number(analytics.summary?.totalIncome || 0),
      totalExpense: Number(analytics.summary?.totalExpense || 0),
      netCashFlow: Number(analytics.summary?.netCashFlow || 0),
      expenseCount: Number(analytics.summary?.expenseCount || 0),
      currency: analytics.summary?.currency || "INR"
    },
    comparison: {
      previousTotalExpense: Number(analytics.comparison?.previousTotalExpense || 0),
      absoluteChange: Number(analytics.comparison?.absoluteChange || 0),
      percentageChange: Number(analytics.comparison?.percentageChange || 0),
      hasPreviousPeriodData: Boolean(analytics.comparison?.hasPreviousPeriodData)
    },
    categories: (analytics.categories || []).slice(0, 7).map(c => ({
      name: c.category,
      current: c.current,
      previous: c.previous,
      change: c.absoluteChange,
      changePercentage: c.percentageChange,
      shareOfSpending: c.shareOfSpending
    })),
    topCategories: (analytics.rankings?.top3Categories || []).map(c => c.category),
    highestIncrease: analytics.rankings?.highestIncrease ? {
      category: analytics.rankings.highestIncrease.category,
      increase: analytics.rankings.highestIncrease.absoluteChange,
      percentage: analytics.rankings.highestIncrease.percentageChange
    } : null,
    highestDecrease: analytics.rankings?.highestDecrease ? {
      category: analytics.rankings.highestDecrease.category,
      decrease: Math.abs(analytics.rankings.highestDecrease.absoluteChange),
      percentage: Math.abs(analytics.rankings.highestDecrease.percentageChange)
    } : null,
    budgets: (analytics.budgets || []).map(b => ({
      title: b.title,
      allocated: b.allocated,
      spent: b.spent,
      remaining: b.remaining,
      utilization: b.utilization,
      riskLevel: b.riskLevel,
      isAheadOfPace: b.isAheadOfPace
    })),
    dataSufficiency: {
      hasTransactions: Boolean(analytics.dataSufficiency?.hasTransactions),
      hasMultipleTransactions: Boolean(analytics.dataSufficiency?.hasMultipleTransactions),
      hasPreviousPeriodData: Boolean(analytics.dataSufficiency?.hasPreviousPeriodData),
      insufficientData: Boolean(analytics.dataSufficiency?.insufficientData),
      notice: analytics.dataSufficiency?.notice || null
    }
  };
}

module.exports = {
  prepareTransactionContext,
  prepareBudgetContext,
  prepareAggregatedContext,
  prepareSpendingAnalyticsContext
};
