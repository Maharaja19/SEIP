const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const aiService = require("../services/ai/AIService");
const AIInsight = require("../models/aiInsight");
const APIResponse = require("../utils/apiResponse");
const { isStudent } = require("../utils/roles");

// AI Rate Limiter to prevent cost/request exhaustion
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: "Too many AI requests. Please try again later.",
    errorCode: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test"
});

router.use(aiLimiter);

/**
 * GET /api/ai/status
 * Returns operational status of the AI Layer.
 * NEVER exposes API keys, secrets, or internal credentials.
 */
router.get("/status", (req, res) => {
  const status = aiService.getStatus();
  return res.status(200).json(
    APIResponse.success(status, "AI system status retrieved")
  );
});

/**
 * GET /api/ai/insights
 * Returns persistent AI insights scoped strictly to the authenticated organization.
 */
router.get("/insights", async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const query = { organization: orgId };

    // Members only see their own insights or general organization-wide insights
    if (isStudent(req.user.role)) {
      query.$or = [{ user: req.user._id }, { user: null }, { user: { $exists: false } }];
    }

    const { limit = 20, type } = req.query;
    if (type) query.type = type;

    const insights = await AIInsight.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 20, 100))
      .lean();

    return res.status(200).json(
      APIResponse.success(insights, "Insights retrieved successfully")
    );
  } catch (err) {
    next(err);
  }
});

const spendingInsightsService = require("../services/ai/spendingInsightsService");

/**
 * GET /api/ai/insights/spending
 * Generates or retrieves cached grounded AI spending insights based on verified deterministic metrics.
 */
router.get("/insights/spending", async (req, res, next) => {
  try {
    const force = req.query.force === "true" || req.query.refresh === "true";
    const { period, startDate, endDate, referenceDate } = req.query;

    const result = await spendingInsightsService.getSpendingInsights({
      organizationId: req.organizationId,
      user: req.user,
      force,
      period,
      startDate,
      endDate,
      referenceDate
    });

    return res.status(200).json(
      APIResponse.success(result, "Spending insights retrieved successfully")
    );
  } catch (err) {
    next(err);
  }
});

const mongoose = require("mongoose");
const classificationService = require("../services/ai/classification/classificationService");
const CustomError = require("../utils/CustomError");

// Helper to validate ObjectId
function validateParamId(req, paramName = "transactionId") {
  const id = req.params[paramName];
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new CustomError(`Invalid ${paramName}: must be a valid MongoDB ObjectId`, 400, "INVALID_ID");
  }
}

/**
 * POST /api/ai/transactions/:transactionId/classify
 * Analyzes a transaction and recommends an authorized financial category.
 */
router.post("/transactions/:transactionId/classify", async (req, res, next) => {
  try {
    validateParamId(req, "transactionId");
    const { transactionId } = req.params;
    const force = req.query.force === "true" || req.body?.force === true;

    const result = await classificationService.classifyTransaction(transactionId, {
      organizationId: req.organizationId,
      user: req.user,
      force,
      req
    });

    return res.status(200).json(
      APIResponse.success(result, "Transaction classified successfully")
    );
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ai/transactions/:transactionId/classification/accept
 * User accepts the suggested category, updating the authoritative transaction category.
 */
router.post("/transactions/:transactionId/classification/accept", async (req, res, next) => {
  try {
    validateParamId(req, "transactionId");
    const { transactionId } = req.params;

    const result = await classificationService.acceptClassification(transactionId, {
      organizationId: req.organizationId,
      user: req.user,
      req
    });

    return res.status(200).json(
      APIResponse.success(result, result.message)
    );
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ai/transactions/:transactionId/classification/reject
 * User rejects the suggested category. Transaction category remains unchanged.
 */
router.post("/transactions/:transactionId/classification/reject", async (req, res, next) => {
  try {
    validateParamId(req, "transactionId");
    const { transactionId } = req.params;
    const rejectionReason = req.body?.reason || "User rejected suggestion";

    const result = await classificationService.rejectClassification(transactionId, {
      organizationId: req.organizationId,
      user: req.user,
      rejectionReason,
      req
    });

    return res.status(200).json(
      APIResponse.success(result, result.message)
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
