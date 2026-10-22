const Transaction = require("../models/transactions");
const Budget = require("../models/budget");

const monthStart = (offset = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
};

const calculateBudgetRisk = async (orgId) => {
  const budgetQuery = { status: "approved" };
  if (orgId) budgetQuery.organization = orgId;
  const approvedBudget = await Budget.findOne(budgetQuery).sort({ createdAt: -1 });
  if (!approvedBudget || approvedBudget.total_budget <= 0) {
    return null;
  }

  const riskScore = (approvedBudget.spent / approvedBudget.total_budget) * 100;
  let riskLevel;
  let riskColor;
  let riskMessage;

  if (riskScore < 70) {
    riskLevel = "Safe";
    riskColor = "green";
    riskMessage = `Budget utilization is healthy at ${riskScore.toFixed(1)}%`;
  } else if (riskScore <= 100) {
    riskLevel = "Warning";
    riskColor = "yellow";
    riskMessage = `Budget usage at ${riskScore.toFixed(1)}% - monitor remaining ₹${(approvedBudget.total_budget - approvedBudget.spent).toLocaleString()}`;
  } else {
    riskLevel = "Critical";
    riskColor = "red";
    riskMessage = `Budget exceeded by ₹${(approvedBudget.spent - approvedBudget.total_budget).toLocaleString()} (${riskScore.toFixed(1)}% utilized)`;
  }

  return {
    score: parseFloat(riskScore.toFixed(1)),
    level: riskLevel,
    color: riskColor,
    message: riskMessage,
    spent: approvedBudget.spent,
    total: approvedBudget.total_budget,
    remaining: approvedBudget.total_budget - approvedBudget.spent
  };
};

const getWeekOfMonth = (date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const firstDayOfWeek = firstDay.getDay();
  return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
};

const generateInsights = async (orgId) => {
  const insights = [];

  const expenseMatch = (dateMatch) => {
    const match = { type: "expense", ...dateMatch };
    if (orgId) match.organization = orgId;
    return match;
  };

  // 1. Current vs Last Month Comparison
  const [currentMonthTotal] = await Transaction.aggregate([
    { $match: expenseMatch({ date: { $gte: monthStart(0) } }) },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const [lastMonthTotal] = await Transaction.aggregate([
    { $match: expenseMatch({ date: { $gte: monthStart(-1), $lt: monthStart(0) } }) },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const currentExpense = currentMonthTotal?.total || 0;
  const previousExpense = lastMonthTotal?.total || 0;
  const expenseDifference = currentExpense - previousExpense;
  const expenseChangePercent = previousExpense > 0 ? ((expenseDifference / previousExpense) * 100).toFixed(1) : 0;

  // 2. Category Analysis (for actionable insights)
  const [categoryTotals, [overall]] = await Promise.all([
    Transaction.aggregate([
      { $match: expenseMatch({ date: { $gte: monthStart(0) } }) },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } }
    ]),
    Transaction.aggregate([
      { $match: expenseMatch({ date: { $gte: monthStart(0) } }) },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])
  ]);

  const total = overall?.total || 0;
  const topCategories = categoryTotals.slice(0, 3);

  // 3. Weekly Pattern Detection (WOW Insight)
  const weeklyPattern = await Transaction.aggregate([
    {
      $match: expenseMatch({ date: { $gte: new Date(new Date().getFullYear(), 0, 1) } })
    },
    {
      $group: {
        _id: {
          month: { $month: "$date" },
          week: { $let: { vars: { wd: { $dayOfMonth: "$date" }, fd: { $dayOfWeek: { $dateTrunc: { unit: "month", startDate: "$date" } } } } }, in: { $ceil: { $divide: [{ $subtract: ["$$wd", { $dayOfWeek: "$$fd" }] }, 7] } } }
        },
        total: { $sum: "$amount" },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ]);

  let weeklyInsight = null;
  if (weeklyPattern.length > 0) {
    const highestWeek = weeklyPattern[0];
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    weeklyInsight = {
      type: "pattern",
      title: "Spending Pattern Detected",
      message: `Week ${highestWeek._id.week} of ${monthNames[highestWeek._id.month]} consistently shows highest spending (₹${highestWeek.total.toLocaleString()}). Consider optimizing event scheduling to distribute costs evenly.`,
      suggestion: "Schedule high-cost events in week 1-2 to allow recovery time"
    };
  }

  // 4. Budget Risk Score Calculation
  const budgetRisk = await calculateBudgetRisk(orgId);

  // 5. Generate Actionable Insights
  if (previousExpense > 0 && currentExpense > previousExpense * 1.2) {
    const topCategory = topCategories[0];
    insights.push({
      type: "alert",
      title: "Spending Increase Detected",
      message: `Spending increased by ${expenseChangePercent}% (₹${expenseDifference.toLocaleString()}) compared to last month`,
      cause: topCategory ? `Mainly due to ${topCategory._id} category (₹${topCategory.total.toLocaleString()})` : "Across multiple categories",
      suggestion: topCategory && topCategory.total > total * 0.3
        ? `Consider reducing ${topCategory._id} allocation by ₹${Math.round(topCategory.total * 0.2).toLocaleString()} next month`
        : "Review expense approvals and set category-wise limits"
    });
  } else if (previousExpense > 0 && currentExpense < previousExpense * 0.8) {
    insights.push({
      type: "positive",
      title: "Cost Reduction Achieved",
      message: `Spending decreased by ${Math.abs(expenseChangePercent)}% (saved ₹${Math.abs(expenseDifference).toLocaleString()})`,
      cause: "Efficient budget management",
      suggestion: "Maintain current spending discipline for consistent savings"
    });
  }

  // High spending categories with suggestions
  if (total > 0) {
    topCategories.forEach((item) => {
      if (item.total / total > 0.4) {
        insights.push({
          type: "warning",
          title: `High ${item._id} Spending`,
          message: `${item._id} category consumes ${(item.total / total * 100).toFixed(0)}% of total budget (₹${item.total.toLocaleString()})`,
          cause: `Concentrated expenses in ${item._id}`,
          suggestion: `Cap ${item._id} expenses at ₹${Math.round(total * 0.3).toLocaleString()} (30% of budget) and explore cost-effective alternatives`
        });
      }
    });
  }

  // Budget exceeded alert
  if (budgetRisk && budgetRisk.spent > budgetRisk.total) {
    insights.push({
      type: "critical",
      title: "Budget Limit Exceeded",
      message: `Spent ₹${budgetRisk.spent.toLocaleString()} against ₹${budgetRisk.total.toLocaleString()} budget`,
      cause: "Expenses surpassed approved budget allocation",
      suggestion: "Freeze non-essential spending and request budget revision if needed"
    });
  }

  // Savings opportunity (optional insight)
  if (topCategories.length >= 2 && total > 0) {
    const secondHighest = topCategories[1];
    if (secondHighest.total < total * 0.2) {
      insights.push({
        type: "opportunity",
        title: "Savings Opportunity",
        message: `${secondHighest._id} expenses are low (₹${secondHighest.total.toLocaleString()}) - good cost control`,
        cause: "Efficient management in this category",
        suggestion: "Apply similar cost-saving strategies to other categories"
      });
    }
  }

  // Default stable insight
  if (insights.length === 0) {
    insights.push({
      type: "info",
      title: "Stable Spending",
      message: "Spending trend is stable this month",
      cause: "Consistent expense patterns",
      suggestion: "Continue current budget management practices"
    });
  }

  // Add weekly pattern as WOW insight if detected
  if (weeklyInsight) {
    insights.unshift(weeklyInsight);
  }

  return {
    insights,
    budgetRisk,
    weeklyInsight,
    comparison: {
      current: currentExpense,
      previous: previousExpense,
      difference: expenseDifference,
      changePercent: parseFloat(expenseChangePercent)
    },
    topCategories: topCategories.map(c => ({
      category: c._id,
      amount: c.total,
      percentage: total > 0 ? ((c.total / total) * 100).toFixed(1) : 0
    }))
  };
};

module.exports = {
  generateInsights,
  calculateBudgetRisk
};
