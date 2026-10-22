const APIResponse = require("../utils/apiResponse");
const { generateInsights } = require("../services/insightService");

const getInsights = async (req, res, next) => {
  try {
    const result = await generateInsights(req.organizationId);
    return res.json(APIResponse.success(result, "Insights generated"));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getInsights
};
