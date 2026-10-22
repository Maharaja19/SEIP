const APIResponse = require("../utils/apiResponse");
const comprehensiveAnalyticsService = require("../services/comprehensiveAnalyticsService");

const getDashboardAnalytics = async (req, res, next) => {
  try {
    const data = await comprehensiveAnalyticsService.getDashboardAnalytics(req.organizationId);
    return res.json(APIResponse.success(data, "Dashboard analytics fetched"));
  } catch (error) {
    return next(error);
  }
};

const getBudgetPredictions = async (req, res, next) => {
  try {
    const predictions = await comprehensiveAnalyticsService.getBudgetPredictions(req.organizationId);
    return res.json(APIResponse.success(predictions, "Budget predictions fetched"));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getDashboardAnalytics,
  getBudgetPredictions
};
