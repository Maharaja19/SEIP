const Budget = require("../models/budget");
const Due = require("../models/dues");
const Transaction = require("../models/transactions");
const { calculateBudgetRisk } = require("./insightService");

const formatReportDate = (date = new Date()) =>
  date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const getReports = async (orgId) => {
  const now = new Date();
  const reports = [];

  const budgetQuery = { status: "approved" };
  if (orgId) budgetQuery.organization = orgId;
  const approvedBudget = await Budget.findOne(budgetQuery).sort({ createdAt: -1 });
  if (approvedBudget) {
    reports.push({
      type: "budget",
      title: approvedBudget.title || "Class Budget Report",
      date: formatReportDate(approvedBudget.updatedAt || now),
      description: approvedBudget.description || "Approved class budget utilization summary.",
      total: approvedBudget.total_budget,
      spent: approvedBudget.spent,
      remaining: approvedBudget.remaining
    });
  }

  const dueMatch = orgId ? { organization: orgId } : {};
  const [dueStats] = await Due.aggregate([
    { $match: dueMatch },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        collected: {
          $sum: {
            $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0]
          }
        }
      }
    }
  ]);

  if (dueStats) {
    reports.push({
      type: "collection",
      title: "Collection Report",
      date: formatReportDate(now),
      description: "Dues collection status across all students.",
      total: dueStats.total,
      spent: dueStats.collected,
      remaining: dueStats.total - dueStats.collected
    });
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const expenseMatch = { type: "expense", date: { $gte: monthStart } };
  if (orgId) expenseMatch.organization = orgId;
  const [monthlyExpense] = await Transaction.aggregate([
    { $match: expenseMatch },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const budgetRisk = await calculateBudgetRisk(orgId);
  reports.push({
    type: "monthly",
    title: "Monthly Financial Summary",
    date: formatReportDate(now),
    description: "Current month expense activity and budget risk overview.",
    total: budgetRisk?.total || monthlyExpense?.total || 0,
    spent: monthlyExpense?.total || budgetRisk?.spent || 0,
    remaining: budgetRisk?.remaining ?? 0,
    riskLevel: budgetRisk?.level || "Safe",
    riskScore: budgetRisk?.score || 0
  });

  return reports;
};

module.exports = {
  getReports
};
