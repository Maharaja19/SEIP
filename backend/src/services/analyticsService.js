const Transaction = require("../models/transactions");

const expenseMatchStage = (orgId) => {
  const match = { type: "expense" };
  if (orgId) match.organization = orgId;
  return match;
};

const getMonthlyExpenses = async (orgId) => {
  return Transaction.aggregate([
    { $match: expenseMatchStage(orgId) },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" }
        },
        totalExpense: { $sum: "$amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        totalExpense: 1
      }
    }
  ]);
};

const getCategoryExpenses = async (orgId) => {
  return Transaction.aggregate([
    { $match: expenseMatchStage(orgId) },
    {
      $group: {
        _id: "$category",
        totalExpense: { $sum: "$amount" }
      }
    },
    { $sort: { totalExpense: -1 } },
    {
      $project: {
        _id: 0,
        category: "$_id",
        totalExpense: 1
      }
    }
  ]);
};

const getDepartmentExpenses = async (orgId) => {
  return Transaction.aggregate([
    { $match: expenseMatchStage(orgId) },
    {
      $group: {
        _id: "$department",
        totalExpense: { $sum: "$amount" }
      }
    },
    { $sort: { totalExpense: -1 } },
    {
      $project: {
        _id: 0,
        department: { $ifNull: ["$_id", "General"] },
        totalExpense: 1
      }
    }
  ]);
};

const getMonthlyExpensesForUser = async (userId, orgId) => {
  return Transaction.aggregate([
    { $match: { ...expenseMatchStage(orgId), user: userId } },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" }
        },
        totalExpense: { $sum: "$amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        totalExpense: 1
      }
    }
  ]);
};

const getCategoryExpensesForUser = async (userId, orgId) => {
  return Transaction.aggregate([
    { $match: { ...expenseMatchStage(orgId), user: userId } },
    {
      $group: {
        _id: "$category",
        totalExpense: { $sum: "$amount" }
      }
    },
    { $sort: { totalExpense: -1 } },
    {
      $project: {
        _id: 0,
        category: "$_id",
        totalExpense: 1
      }
    }
  ]);
};

const getStudentAnalytics = async (userId, orgId) => {
  const [monthly, category] = await Promise.all([
    getMonthlyExpensesForUser(userId, orgId),
    getCategoryExpensesForUser(userId, orgId)
  ]);
  return { monthly, category };
};

module.exports = {
  getMonthlyExpenses,
  getCategoryExpenses,
  getDepartmentExpenses,
  getMonthlyExpensesForUser,
  getCategoryExpensesForUser,
  getStudentAnalytics
};
