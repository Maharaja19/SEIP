const Transaction = require("../../../models/transactions");
const Category = require("../../../models/category");
const AIInsight = require("../../../models/aiInsight");
const aiService = require("../AIService");
const { prepareTransactionContext } = require("../dataPreparation/dataPreparation");
const {
  CONFIDENCE_LEVELS,
  CONFIDENCE_THRESHOLDS,
  evaluateConfidenceTier,
  isStrongSuggestion
} = require("./confidencePolicy");
const { logAudit } = require("../../auditService");
const CustomError = require("../../../utils/CustomError");
const { isAdminOrTreasurer } = require("../../../utils/roles");
const { ensureSystemCategories } = require("../../../controllers/categoryController");

/**
 * Retrieves the authorized active categories for a tenant/user context.
 * Only categories from system, caller's organization, or caller's user are allowed.
 *
 * @param {string|ObjectId} organizationId
 * @param {string|ObjectId} userId
 * @returns {Promise<Array<{ name: string, slug: string, id: string }>>}
 */
async function getAuthorizedCategories(organizationId, userId) {
  await ensureSystemCategories();

  const query = {
    isActive: true,
    $or: [
      { scope: "system" },
      ...(organizationId ? [{ scope: "organization", organization: organizationId }] : []),
      ...(userId ? [{ scope: "user", user: userId }] : [])
    ]
  };

  const categories = await Category.find(query).sort({ scope: 1, name: 1 }).lean();
  return categories;
}

/**
 * Resolves authorized category name strings for the AI prompt and validation whitelist.
 *
 * @param {string|ObjectId} organizationId
 * @param {string|ObjectId} userId
 * @returns {Promise<string[]>} List of authorized category names
 */
async function getAuthorizedCategoryNames(organizationId, userId) {
  const categories = await getAuthorizedCategories(organizationId, userId);
  const names = categories.map(c => c.name);
  return Array.from(new Set(names));
}

/**
 * Validates that a user has permission to access / classify a transaction.
 */
function verifyTransactionAccess(transaction, user, organizationId) {
  if (!transaction) {
    throw new CustomError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  }

  // Tenant boundary verification
  if (organizationId && transaction.organization && String(transaction.organization) !== String(organizationId)) {
    throw new CustomError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  }

  // IDOR check: Non-admin users can only classify/access their own transactions
  if (!isAdminOrTreasurer(user?.role)) {
    const ownerId = transaction.user?._id || transaction.user;
    if (ownerId && String(ownerId) !== String(user?._id)) {
      throw new CustomError("You can only access your own transactions", 403, "INSUFFICIENT_PERMISSIONS");
    }
  }
}

/**
 * Request AI expense classification for an existing transaction.
 *
 * @param {string} transactionId - MongoDB ObjectId of transaction
 * @param {object} context - { organizationId, user, force }
 * @returns {Promise<object>} Classification result with confidence evaluation
 */
async function classifyTransaction(transactionId, { organizationId, user, force = false, req = null } = {}) {
  const query = { _id: transactionId };
  if (organizationId) {
    query.organization = organizationId;
  }

  const transaction = await Transaction.findOne(query);
  verifyTransactionAccess(transaction, user, organizationId);

  // Idempotency Policy:
  // If a recent valid suggestion already exists and transaction has not been updated since, reuse it unless forced
  if (
    !force &&
    transaction.AIClassification &&
    transaction.AIClassification.status === "SUGGESTED" &&
    transaction.AIClassification.classifiedAt
  ) {
    const classifiedTime = transaction.AIClassification.classifiedAt ? new Date(transaction.AIClassification.classifiedAt).getTime() : 0;
    const updatedTime = transaction.updatedAt ? new Date(transaction.updatedAt).getTime() : 0;
    // Transaction is only stale if modified significantly after the classification was saved
    const isStale = (updatedTime - classifiedTime) > 2000;

    if (!isStale) {
      return {
        transactionId: transaction._id,
        classification: transaction.AIClassification,
        confidenceTier: evaluateConfidenceTier(transaction.AIClassification.confidence),
        isStrongSuggestion: isStrongSuggestion(transaction.AIClassification.confidence),
        currentCategory: transaction.category,
        reused: true
      };
    }
  }

  // 1. Fetch authorized category whitelist strictly scoped to tenant
  const allowedCategories = await getAuthorizedCategoryNames(
    organizationId || transaction.organization,
    user?._id || transaction.user
  );

  // 2. Prepare safe DTO for AI ingestion (sanitized, zero secrets)
  const preparedData = prepareTransactionContext(transaction, allowedCategories);

  // 3. Mark classification as PENDING during execution
  transaction.AIClassification = {
    ...(transaction.AIClassification || {}),
    status: "PENDING"
  };
  await transaction.save();

  try {
    // 4. Invoke AI service through provider abstraction
    const aiResult = await aiService.classify({
      description: preparedData.description || preparedData.merchant || `Transaction of ${preparedData.amount} ${preparedData.currency}`,
      amount: preparedData.amount,
      currency: preparedData.currency,
      merchant: preparedData.merchant,
      type: preparedData.type,
      date: preparedData.date,
      allowedCategories,
      organizationId: organizationId || transaction.organization,
      userId: user?._id || transaction.user
    });

    const confidenceTier = evaluateConfidenceTier(aiResult.confidence);

    // 5. Save structured recommendation to transaction (does NOT alter transaction.category)
    transaction.AIClassification = {
      suggestedCategory: aiResult.suggestedCategory,
      category: aiResult.suggestedCategory, // legacy alias
      confidence: aiResult.confidence,
      reason: aiResult.reason,
      provider: aiResult.provider,
      model: aiResult.model,
      status: "SUGGESTED",
      classifiedAt: new Date()
    };
    await transaction.save();

    // 6. Record or update persistent AIInsight for this transaction (preventing duplicates)
    if (transaction.organization) {
      await AIInsight.findOneAndUpdate(
        {
          organization: transaction.organization,
          "relatedEntity.entityType": "TRANSACTION",
          "relatedEntity.entityId": transaction._id
        },
        {
          organization: transaction.organization,
          user: transaction.user,
          type: "EXPENSE_CLASSIFICATION",
          severity: "info",
          title: `Category Suggestion: ${aiResult.suggestedCategory}`,
          summary: `Suggested category "${aiResult.suggestedCategory}" with ${(aiResult.confidence * 100).toFixed(0)}% confidence`,
          message: aiResult.reason || `AI categorized this transaction as ${aiResult.suggestedCategory}.`,
          confidence: aiResult.confidence,
          source: "ai",
          relatedEntity: {
            entityType: "TRANSACTION",
            entityId: transaction._id
          },
          metadata: {
            suggestedCategory: aiResult.suggestedCategory,
            provider: aiResult.provider,
            model: aiResult.model,
            confidenceTier
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    return {
      transactionId: transaction._id,
      classification: transaction.AIClassification,
      confidenceTier,
      isStrongSuggestion: isStrongSuggestion(aiResult.confidence),
      currentCategory: transaction.category,
      reused: false
    };
  } catch (err) {
    // If AI fails, transaction financial record remains completely unaffected
    transaction.AIClassification = {
      ...(transaction.AIClassification || {}),
      status: "FAILED",
      reason: err.message ? err.message.substring(0, 300) : "AI categorization failed",
      classifiedAt: new Date()
    };
    await transaction.save();
    throw err;
  }
}

/**
 * Accept the AI category suggestion and update the authoritative transaction category.
 *
 * @param {string} transactionId
 * @param {object} context - { organizationId, user, req }
 * @returns {Promise<object>} Updated transaction
 */
async function acceptClassification(transactionId, { organizationId, user, req = null } = {}) {
  const query = { _id: transactionId };
  if (organizationId) {
    query.organization = organizationId;
  }

  const transaction = await Transaction.findOne(query);
  verifyTransactionAccess(transaction, user, organizationId);

  const classification = transaction.AIClassification;
  if (!classification || classification.status !== "SUGGESTED" || !classification.suggestedCategory) {
    throw new CustomError("No pending classification suggestion available to accept", 400, "NO_PENDING_SUGGESTION");
  }

  // Verify that suggested category is still active and authorized in this tenant
  const allowedCategories = await getAuthorizedCategoryNames(
    organizationId || transaction.organization,
    user?._id || transaction.user
  );

  const isStillValid = allowedCategories.some(
    c => c.toLowerCase() === classification.suggestedCategory.toLowerCase()
  );

  if (!isStillValid) {
    classification.status = "FAILED";
    classification.reason = "Suggested category is no longer valid or authorized";
    await transaction.save();
    throw new CustomError("Suggested category is no longer valid or active", 400, "INVALID_SUGGESTED_CATEGORY");
  }

  const oldCategory = transaction.category;
  const newCategory = classification.suggestedCategory;

  // Authoritative financial update: update transaction category
  transaction.category = newCategory;
  classification.status = "ACCEPTED";
  await transaction.save();

  // Audit logging for AI decision
  await logAudit({
    action: "AI_CLASSIFICATION_ACCEPTED",
    entityType: "TRANSACTION",
    entityId: transaction._id,
    organization: transaction.organization,
    performedBy: user?._id,
    details: {
      previousCategory: oldCategory,
      newCategory,
      confidence: classification.confidence,
      reason: classification.reason,
      provider: classification.provider
    },
    req
  });

  // Mark AI insight as handled/dismissed
  if (transaction.organization) {
    await AIInsight.updateOne(
      {
        organization: transaction.organization,
        "relatedEntity.entityType": "TRANSACTION",
        "relatedEntity.entityId": transaction._id
      },
      { isDismissed: true, isRead: true }
    );
  }

  return {
    transactionId: transaction._id,
    category: transaction.category,
    classification: transaction.AIClassification,
    message: `Category successfully updated to "${newCategory}"`
  };
}

/**
 * Reject the AI category suggestion without modifying the financial category.
 *
 * @param {string} transactionId
 * @param {object} context - { organizationId, user, rejectionReason, req }
 * @returns {Promise<object>}
 */
async function rejectClassification(transactionId, { organizationId, user, rejectionReason = "User rejected", req = null } = {}) {
  const query = { _id: transactionId };
  if (organizationId) {
    query.organization = organizationId;
  }

  const transaction = await Transaction.findOne(query);
  verifyTransactionAccess(transaction, user, organizationId);

  const classification = transaction.AIClassification;
  if (!classification || !classification.suggestedCategory) {
    throw new CustomError("No classification found for this transaction", 400, "NO_CLASSIFICATION_FOUND");
  }

  // Financial category remains unchanged
  classification.status = "REJECTED";
  await transaction.save();

  // Audit logging for user rejection
  await logAudit({
    action: "AI_CLASSIFICATION_REJECTED",
    entityType: "TRANSACTION",
    entityId: transaction._id,
    organization: transaction.organization,
    performedBy: user?._id,
    details: {
      suggestedCategory: classification.suggestedCategory,
      currentCategory: transaction.category,
      rejectionReason
    },
    req
  });

  // Mark AI insight as dismissed
  if (transaction.organization) {
    await AIInsight.updateOne(
      {
        organization: transaction.organization,
        "relatedEntity.entityType": "TRANSACTION",
        "relatedEntity.entityId": transaction._id
      },
      { isDismissed: true }
    );
  }

  return {
    transactionId: transaction._id,
    category: transaction.category,
    classification: transaction.AIClassification,
    message: "AI suggestion rejected"
  };
}

module.exports = {
  getAuthorizedCategories,
  getAuthorizedCategoryNames,
  classifyTransaction,
  acceptClassification,
  rejectClassification,
  verifyTransactionAccess
};
