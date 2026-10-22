const Transaction = require("../models/transactions");

const monthStart = (offset = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
};

const getExpensePrediction = async (orgId) => {
  const match = {
    type: "expense",
    date: { $gte: monthStart(-3), $lt: monthStart(0) }
  };
  if (orgId) match.organization = orgId;

  const lastThreeMonths = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" }
        },
        total: { $sum: "$amount" }
      }
    }
  ]);

  const predictedExpense = lastThreeMonths.length
    ? Math.round(lastThreeMonths.reduce((sum, item) => sum + item.total, 0) / lastThreeMonths.length)
    : 0;

  return { predictedExpense };
};

module.exports = {
  getExpensePrediction
};
