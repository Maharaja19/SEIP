const APIResponse = require("../utils/apiResponse");
const { calculateBudgetRisk } = require("../services/insightService");

const getRiskScore = async (req, res, next) => {
  try {
    const budgetRisk = await calculateBudgetRisk(req.organizationId);

    if (!budgetRisk) {
      return res.json(
        APIResponse.success(
          { score: 0, level: "Safe", message: "No approved budget found" },
          "Risk score generated"
        )
      );
    }

    return res.json(
      APIResponse.success(
        {
          score: budgetRisk.score,
          level: budgetRisk.level,
          message: budgetRisk.message,
          spent: budgetRisk.spent,
          total: budgetRisk.total,
          remaining: budgetRisk.remaining
        },
        "Risk score generated"
      )
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getRiskScore
};
