const APIResponse = require("../utils/apiResponse");
const analyticsService = require("../services/analyticsService");

const getMonthlyAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getMonthlyExpenses(req.organizationId);
    return res.json(APIResponse.success(data, "Monthly analytics fetched"));
  } catch (error) {
    return next(error);
  }
};

const getCategoryAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getCategoryExpenses(req.organizationId);
    return res.json(APIResponse.success(data, "Category analytics fetched"));
  } catch (error) {
    return next(error);
  }
};

const getDepartmentAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getDepartmentExpenses(req.organizationId);
    return res.json(APIResponse.success(data, "Department analytics fetched"));
  } catch (error) {
    return next(error);
  }
};

const getStudentAnalytics = async (req, res, next) => {
  try {
    const data = await analyticsService.getStudentAnalytics(req.user._id, req.organizationId);
    return res.json(APIResponse.success(data, "Student analytics fetched"));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMonthlyAnalytics,
  getCategoryAnalytics,
  getDepartmentAnalytics,
  getStudentAnalytics
};
