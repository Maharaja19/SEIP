const APIResponse = require("../utils/apiResponse");
const efficiencyService = require("../services/efficiencyService");

const getEfficiencyMetrics = async (req, res, next) => {
  try {
    const metrics = await efficiencyService.getEfficiencyMetrics(req.organizationId);
    return res.json(APIResponse.success(metrics, "Efficiency metrics fetched"));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getEfficiencyMetrics
};
