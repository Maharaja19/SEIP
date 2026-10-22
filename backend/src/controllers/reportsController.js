const APIResponse = require("../utils/apiResponse");
const { getReports } = require("../services/reportsService");

const listReports = async (req, res, next) => {
  try {
    const reports = await getReports(req.organizationId);
    return res.json(APIResponse.success(reports, "Reports generated"));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listReports
};
