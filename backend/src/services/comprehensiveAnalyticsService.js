const Transaction = require("../models/transactions");
const Budget = require("../models/budget");
const Due = require("../models/dues");

const monthStart = (offset = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
};

const orgMatch = (orgId, extra = {}) => {
  const match = { ...extra };
  if (orgId) match.organization = orgId;
  return match;
};

/**
 * Get comprehensive dashboard analytics
 * Combines financial summary, spending trends, category breakdown, and budget utilization
 */
const getDashboardAnalytics = async (orgId) => {
  const currentMonth = monthStart(0);
  const lastMonth = monthStart(-1);
  const sixMonthsAgo = monthStart(-6);

  // 1. Financial Summary
  const currentMonthExpenses = await Transaction.aggregate([
    { $match: orgMatch(orgId, { type: "expense", date: { $gte: currentMonth } }) },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
  ]);

  const lastMonthExpenses = await Transaction.aggregate([
    { $match: orgMatch(orgId, { type: "expense", date: { $gte: lastMonth, $lt: currentMonth } }) },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
  ]);

  const currentMonthIncome = await Transaction.aggregate([
    { $match: orgMatch(orgId, { type: "income", date: { $gte: currentMonth } }) },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
  ]);

  const totalExpenses = currentMonthExpenses[0]?.total || 0;
  const totalIncome = currentMonthIncome[0]?.total || 0;
  const netBalance = totalIncome - totalExpenses;
  const expenseCount = currentMonthExpenses[0]?.count || 0;

  const lastMonthTotal = lastMonthExpenses[0]?.total || 0;
  const expenseChange = lastMonthTotal > 0 
    ? ((totalExpenses - lastMonthTotal) / lastMonthTotal) * 100 
    : 0;

  // 2. Spending Trends (6-month)
  const spendingTrends = await Transaction.aggregate([
    { $match: orgMatch(orgId, { type: "expense", date: { $gte: sixMonthsAgo } }) },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" }
        },
        totalExpense: { $sum: "$amount" },
        transactionCount: { $sum: 1 },
        avgTransaction: { $avg: "$amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // 3. Category Breakdown
  const categoryBreakdown = await Transaction.aggregate([
    { $match: orgMatch(orgId, { type: "expense", date: { $gte: currentMonth } }) },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
        avg: { $avg: "$amount" }
      }
    },
    { $sort: { total: -1 } },
    { $limit: 10 }
  ]);

  const totalCategoryAmount = categoryBreakdown.reduce((sum, c) => sum + c.total, 0);
  const categoryWithPercentages = categoryBreakdown.map(c => ({
    category: c._id,
    total: c.total,
    count: c.count,
    avg: Math.round(c.avg),
    percentage: totalCategoryAmount > 0 ? ((c.total / totalCategoryAmount) * 100).toFixed(1) : 0
  }));

  // 4. Budget Utilization
  const budgetQuery = { status: "approved" };
  if (orgId) budgetQuery.organization = orgId;
  const approvedBudget = await Budget.findOne(budgetQuery).sort({ createdAt: -1 });
  let budgetUtilization = null;

  if (approvedBudget) {
    const utilizationRate = approvedBudget.total_budget > 0 
      ? (approvedBudget.spent / approvedBudget.total_budget) * 100 
      : 0;

    budgetUtilization = {
      totalBudget: approvedBudget.total_budget,
      spent: approvedBudget.spent,
      remaining: approvedBudget.remaining,
      utilizationRate: utilizationRate.toFixed(1),
      status: utilizationRate < 70 ? "healthy" : utilizationRate < 100 ? "warning" : "critical",
      title: approvedBudget.title
    };
  }

  // 5. Dues Collection Status
  const dueQuery = orgId ? { organization: orgId } : {};
  const totalDues = await Due.countDocuments(dueQuery);
  const paidDues = await Due.countDocuments({ ...dueQuery, status: "paid" });
  const pendingDues = await Due.countDocuments({ ...dueQuery, status: "pending" });

  const collectionRate = totalDues > 0 ? (paidDues / totalDues) * 100 : 0;

  // 6. Key Performance Indicators
  const avgDailyExpense = totalExpenses / new Date().getDate();
  const projectedMonthlyExpense = avgDailyExpense * new Date(Date.now().getFullYear(), Date.now().getMonth() + 1, 0).getDate();

  return {
    financialSummary: {
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netBalance: netBalance,
      transactionCount: expenseCount,
      expenseChangePercent: expenseChange.toFixed(1),
      avgDailyExpense: Math.round(avgDailyExpense),
      projectedMonthlyExpense: Math.round(projectedMonthlyExpense)
    },
    spendingTrends: spendingTrends.map(st => ({
      year: st._id.year,
      month: st._id.month,
      totalExpense: st.totalExpense,
      transactionCount: st.transactionCount,
      avgTransaction: Math.round(st.avgTransaction)
    })),
    categoryBreakdown: categoryWithPercentages,
    budgetUtilization: budgetUtilization,
    collectionMetrics: {
      totalDues,
      paidDues,
      pendingDues,
      collectionRate: collectionRate.toFixed(1)
    },
    generatedAt: new Date().toISOString()
  };
};

/**
 * Get budget predictions and forecasts
 */
const getBudgetPredictions = async (orgId) => {
  // Get last 6 months data for better prediction
  const sixMonthsAgo = monthStart(-6);

  const historicalData = await Transaction.aggregate([
    { $match: orgMatch(orgId, { type: "expense", date: { $gte: sixMonthsAgo } }) },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" }
        },
        total: { $sum: "$amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Calculate predictions using weighted moving average (more recent months weighted higher)
  let nextMonthPrediction = 0;
  let confidence = "low";

  if (historicalData.length >= 3) {
    const recentMonths = historicalData.slice(-6);
    const weights = recentMonths.map((_, idx) => idx + 1); // [1, 2, 3, 4, 5, 6]
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    nextMonthPrediction = recentMonths.reduce((sum, month, idx) => {
      return sum + (month.total * weights[idx]) / totalWeight;
    }, 0);

    confidence = historicalData.length >= 6 ? "high" : "medium";
  } else if (historicalData.length > 0) {
    // Simple average if less than 3 months
    nextMonthPrediction = historicalData.reduce((sum, m) => sum + m.total, 0) / historicalData.length;
  }

  // Generate recommendations based on trends
  const recommendations = [];
  
  if (historicalData.length >= 2) {
    const lastMonth = historicalData[historicalData.length - 1];
    const prevMonth = historicalData[historicalData.length - 2];
    
    if (lastMonth.total > prevMonth.total * 1.1) {
      recommendations.push({
        type: "warning",
        message: "Spending trend is increasing. Consider reviewing budget allocation for next month.",
        action: "Reduce discretionary spending by 10-15%"
      });
    } else if (lastMonth.total < prevMonth.total * 0.9) {
      recommendations.push({
        type: "positive",
        message: "Spending trend is decreasing. Good cost control observed.",
        action: "Maintain current spending discipline"
      });
    }
  }

  recommendations.push({
    type: "info",
    message: `Predicted expense for next month is ₹${Math.round(nextMonthPrediction).toLocaleString()}`,
    action: "Plan budget allocation based on this prediction"
  });

  return {
    nextMonthPrediction: {
      amount: Math.round(nextMonthPrediction),
      method: "Weighted Moving Average (6-month)",
      dataPoints: historicalData.length
    },
    confidence: {
      level: confidence,
      explanation: confidence === "high" 
        ? "Based on 6+ months of historical data" 
        : confidence === "medium" 
          ? "Based on 3-6 months of historical data" 
          : "Limited historical data available"
    },
    historicalTrend: historicalData.map(h => ({
      month: h._id.month,
      year: h._id.year,
      total: h.total
    })),
    recommendations
  };
};

module.exports = {
  getDashboardAnalytics,
  getBudgetPredictions
};
