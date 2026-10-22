// routes/transactions.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Transaction = require("../models/transactions");
const User = require("../models/user");
const Student = require("../models/student");
const Due = require("../models/dues");
const Budget = require("../models/budget");
// Import validation middleware
const { 
  validateTransaction,
  validateObjectId,
  validateSearchQuery,
  handleValidationError 
} = require('../middleware/validation');
// Import auth middleware
const { authorizeRole } = require('../middleware/auth');
// Import API response utility
const APIResponse = require('../utils/apiResponse');
// Import custom error class
const CustomError = require('../utils/CustomError');
// Import canonical role helpers
const { isStudent, isAdminOrTreasurer } = require('../utils/roles');
const { logAudit } = require('../services/auditService');

// ✅ GET all transactions with pagination (Treasurer/Admin only)
router.get("/", authorizeRole(['Treasurer', 'Admin']), validateSearchQuery, handleValidationError, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orgFilter = req.organizationId ? { organization: req.organizationId } : {};

    const totalTransactions = await Transaction.countDocuments(orgFilter);
    const transactions = await Transaction.find(orgFilter)
      .populate("user", "name registerNumber")
      .populate("student", "fullName registerNumber")
      .populate("due", "reason amount")
      .populate("budget", "title totalAmount")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalTransactions / limit),
      totalTransactions,
      hasNextPage: page < Math.ceil(totalTransactions / limit),
      hasPrevPage: page > 1
    };
    
    res.json(APIResponse.paginated(transactions, pagination));
  } catch (err) {
    next(err);
  }
});

// ✅ GET current user's transactions (preferred for authenticated students)
router.get("/me", async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return next(new CustomError("Authentication required", 401, "UNAUTHORIZED"));
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orgFilter = req.organizationId ? { organization: req.organizationId } : {};

    const totalTransactions = await Transaction.countDocuments({ ...orgFilter, user: user._id });
    const transactions = await Transaction.find({ ...orgFilter, user: user._id })
      .populate("due", "reason amount dueID")
      .populate("budget", "title totalAmount budgetID")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalTransactions / limit) || 1,
      totalTransactions,
      hasNextPage: page < Math.ceil(totalTransactions / limit),
      hasPrevPage: page > 1,
    };

    res.json(APIResponse.paginated(transactions, pagination));
  } catch (err) {
    next(err);
  }
});

// ✅ GET transactions by user ID or register number
router.get("/user/:identifier", async (req, res, next) => {
  try {
    const { identifier } = req.params;

    // Non-admin/treasurer users may only look at their own transactions
    if (!isAdminOrTreasurer(req.user?.role) && req.user?._id.toString() !== identifier && req.user?.registerNumber !== identifier) {
      return next(new CustomError("You can only view your own transactions", 403, 'INSUFFICIENT_PERMISSIONS'));
    }

    // Try to find user by different methods
    let user = null;
    
    // First try by MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      user = await User.findById(identifier);
    }
    
    // If not found, try by register number
    if (!user) {
      user = await User.findOne({ registerNumber: identifier });
    }
    
    // If still not found, try to find in Student collection
    if (!user) {
      const student = await Student.findOne({ registerNumber: identifier });
      if (student) {
        // Find corresponding user
        user = await User.findOne({ registerNumber: student.registerNumber });
      }
    }
    
    if (!user) {
      return res.json(APIResponse.success({
        transactions: [],
        message: "No user found for the provided identifier"
      }));
    }

    // Users may only resolve records within their own organization
    if (req.organizationId && user.organizationId && String(user.organizationId) !== String(req.organizationId)) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orgFilter = req.organizationId ? { organization: req.organizationId } : {};
    
    const totalTransactions = await Transaction.countDocuments({ ...orgFilter, user: user._id });
    const transactions = await Transaction.find({ ...orgFilter, user: user._id })
      .populate("due", "reason amount dueID")
      .populate("budget", "title totalAmount budgetID")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalTransactions / limit),
      totalTransactions,
      hasNextPage: page < Math.ceil(totalTransactions / limit),
      hasPrevPage: page > 1
    };
    
    res.json(APIResponse.paginated(transactions, pagination));
  } catch (err) {
    next(err);
  }
});

// ✅ GET transaction summary for a user (must be before /:id)
router.get("/summary/:identifier", async (req, res, next) => {
  try {
    const { identifier } = req.params;

    // Non-admin/treasurer users may only look at their own summary
    if (!isAdminOrTreasurer(req.user?.role) && req.user?._id.toString() !== identifier && req.user?.registerNumber !== identifier) {
      return next(new CustomError("You can only view your own summary", 403, 'INSUFFICIENT_PERMISSIONS'));
    }

    // Find user
    let user = await User.findById(identifier);
    if (!user) {
      user = await User.findOne({ registerNumber: identifier });
    }
    
    if (!user) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }

    // Users may only resolve records within their own organization
    if (req.organizationId && user.organizationId && String(user.organizationId) !== String(req.organizationId)) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }

    const orgFilter = req.organizationId ? { organization: req.organizationId } : {};
    const transactions = await Transaction.find({ ...orgFilter, user: user._id });
    
    const summary = {
      totalIncome: transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0),
      totalExpense: transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0),
      totalTransactions: transactions.length,
      incomeTransactions: transactions.filter(t => t.type === "income").length,
      expenseTransactions: transactions.filter(t => t.type === "expense").length,
      // Category breakdown for expenses
      expenseByCategory: {}
    };
    
    // Calculate expense by category
    transactions
      .filter(t => t.type === "expense")
      .forEach(transaction => {
        const category = transaction.category || "misc";
        if (!summary.expenseByCategory[category]) {
          summary.expenseByCategory[category] = 0;
        }
        summary.expenseByCategory[category] += transaction.amount;
      });
    
    summary.balance = summary.totalIncome - summary.totalExpense;
    
    res.json(APIResponse.success(summary));
  } catch (err) {
    next(err);
  }
});

// ✅ GET transactions with advanced filtering and sorting for students (must be before /:id)
router.get("/user/:identifier/filter", async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const { type, category, startDate, endDate, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    // Non-admin/treasurer users may only filter their own transactions
    if (!isAdminOrTreasurer(req.user?.role) && req.user?._id.toString() !== identifier && req.user?.registerNumber !== identifier) {
      return next(new CustomError("You can only view your own transactions", 403, 'INSUFFICIENT_PERMISSIONS'));
    }

    // Find user
    let user = await User.findById(identifier);
    if (!user) {
      user = await User.findOne({ registerNumber: identifier });
    }
    
    if (!user) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }

    // Users may only resolve records within their own organization
    if (req.organizationId && user.organizationId && String(user.organizationId) !== String(req.organizationId)) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }
    
    // Build filter query
    const filter = { user: user._id };
    if (req.organizationId) filter.organization = req.organizationId;
    
    if (type) {
      filter.type = type;
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Build sort query
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    
    const transactions = await Transaction.find(filter)
      .populate("due", "reason amount dueID")
      .populate("budget", "title totalAmount budgetID")
      .sort(sort);
    
    res.json(APIResponse.success(transactions));
  } catch (err) {
    next(err);
  }
});

// ✅ GET transaction by ID
router.get("/:id", validateObjectId, handleValidationError, async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.organizationId) query.organization = req.organizationId;
    const transaction = await Transaction.findOne(query)
      .populate("user", "name registerNumber")
      .populate("student", "fullName registerNumber")
      .populate("due", "reason amount")
      .populate("budget", "title totalAmount");
      
    if (!transaction) {
      return next(new CustomError("Transaction not found", 404, 'TRANSACTION_NOT_FOUND'));
    }

    // IDOR protection: Non-admin users can only view their own transactions
    if (!isAdminOrTreasurer(req.user?.role) && transaction.user && String(transaction.user._id || transaction.user) !== String(req.user._id)) {
      return next(new CustomError("You can only view your own transactions", 403, 'INSUFFICIENT_PERMISSIONS'));
    }

    res.json(APIResponse.success(transaction));
  } catch (err) {
    next(err);
  }
});

// ✅ CREATE new transaction (Enhanced for student expenses)
router.post("/", validateTransaction, handleValidationError, async (req, res, next) => {
  try {
    const { user: userIdentifier, student: studentIdentifier, ...transactionData } = req.body;
    
    if (!transactionData.type || !transactionData.amount) {
      return next(new CustomError("Type and amount are required", 400, 'MISSING_REQUIRED_FIELDS'));
    }

    // Students / general members create transactions for themselves if user not specified
    const targetIdentifier = isStudent(req.user?.role) ? req.user?._id.toString() : (userIdentifier || req.user?._id?.toString());
    if (!targetIdentifier) {
      return next(new CustomError("User is required", 400, 'MISSING_USER'));
    }
    
    // Find user
    let user = await User.findById(targetIdentifier);
    if (!user) {
      user = await User.findOne({ registerNumber: targetIdentifier });
    }
    
    if (!user) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }

    // Target user must belong to the requesting user's organization
    if (req.organizationId && user.organizationId && String(user.organizationId) !== String(req.organizationId)) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }
    
    // Find student if provided
    let student = null;
    if (studentIdentifier) {
      student = await Student.findById(studentIdentifier);
      if (!student) {
        student = await Student.findOne({ registerNumber: studentIdentifier });
      }
    }
    
    // If student not explicitly provided, try to find from user
    if (!student) {
      student = await Student.findOne({ registerNumber: user.registerNumber });
    }
    
    const transaction = new Transaction({
      ...transactionData,
      user: user._id,
      student: student?._id,
      organization: req.organizationId,
      createdBy: req.user?._id || user._id,
      date: transactionData.date || new Date(),
      isStudentEntry: true // Mark as student-added transaction
    });
    
    await transaction.save();

    await logAudit({
      action: "TRANSACTION_CREATED",
      entityType: "TRANSACTION",
      entityId: transaction._id,
      organization: req.organizationId,
      performedBy: req.user?._id || user._id,
      details: { amount: transaction.amount, type: transaction.type, category: transaction.category },
      req
    });

    // Phase 7: Non-blocking AI classification hook (if requested)
    // AI failure must NEVER fail transaction creation
    if (req.query.classify === "true" || req.body.autoClassify === true) {
      try {
        const classificationService = require("../services/ai/classification/classificationService");
        await classificationService.classifyTransaction(transaction._id, {
          organizationId: req.organizationId,
          user: req.user,
          force: true,
          req
        });
      } catch (aiErr) {
        // Non-blocking: transaction creation remains 100% successful
        if (process.env.NODE_ENV !== "test") {
          console.warn("Non-blocking AI classification skipped/failed:", aiErr.message);
        }
      }
    }
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate("user", "name registerNumber")
      .populate("student", "fullName registerNumber")
      .populate("due", "reason amount")
      .populate("budget", "title totalAmount");
    
    res.status(201).json(APIResponse.success(populatedTransaction, "Transaction created successfully", 201));
  } catch (err) {
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});

// ✅ UPDATE transaction (Enhanced for student expenses)
router.put("/:id", validateObjectId, validateTransaction, handleValidationError, async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.organizationId) query.organization = req.organizationId;
    const transaction = await Transaction.findOne(query);
    
    if (!transaction) {
      return next(new CustomError("Transaction not found", 404, 'TRANSACTION_NOT_FOUND'));
    }
    
    // Prevent students from editing non-student entries (like dues payments)
    const studentUser = isStudent(req.user?.role);
    if (studentUser && transaction.isStudentEntry === false && req.body.isStudentEntry !== true) {
      // This is a system-generated transaction (like a dues payment)
      // Students shouldn't be able to edit these
      return next(new CustomError(
        "Cannot edit system-generated transactions. Only student-added expenses can be modified.", 
        403, 
        'INSUFFICIENT_PERMISSIONS'
      ));
    }

    // IDOR protection: Non-admin users can only edit their own transactions
    if (!isAdminOrTreasurer(req.user?.role) && transaction.user && String(transaction.user._id || transaction.user) !== String(req.user._id)) {
      return next(new CustomError("You can only edit your own transactions", 403, 'INSUFFICIENT_PERMISSIONS'));
    }
    
    // Phase 13: Manual category override takes precedence over AI suggestions
    if (req.body.category && transaction.AIClassification && transaction.AIClassification.status === "SUGGESTED") {
      if (req.body.category.toLowerCase() !== (transaction.AIClassification.suggestedCategory || "").toLowerCase()) {
        transaction.AIClassification.status = "REJECTED";
        transaction.AIClassification.reason = "Overridden manually by user";
      }
    }

    // Update the transaction
    Object.assign(transaction, req.body);
    await transaction.save();

    await logAudit({
      action: "TRANSACTION_UPDATED",
      entityType: "TRANSACTION",
      entityId: transaction._id,
      organization: req.organizationId,
      performedBy: req.user?._id,
      details: { updatedFields: Object.keys(req.body) },
      req
    });
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate("user", "name registerNumber")
      .populate("student", "fullName registerNumber")
      .populate("due", "reason amount")
      .populate("budget", "title totalAmount");
   
    res.json(APIResponse.success(populatedTransaction, "Transaction updated successfully"));
  } catch (err) {
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});

// ✅ VOID transaction (Admin/Treasurer or owner)
router.post("/:id/void", validateObjectId, handleValidationError, async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.organizationId) query.organization = req.organizationId;
    const transaction = await Transaction.findOne(query);

    if (!transaction) {
      return next(new CustomError("Transaction not found", 404, 'TRANSACTION_NOT_FOUND'));
    }

    const isOwner = req.user && transaction.user && String(transaction.user._id || transaction.user) === String(req.user._id);
    const hasPrivilege = isAdminOrTreasurer(req.user?.role);

    if (!isOwner && !hasPrivilege) {
      return next(new CustomError("You can only void your own transactions", 403, 'INSUFFICIENT_PERMISSIONS'));
    }

    transaction.status = "voided";
    await transaction.save();

    await logAudit({
      action: "TRANSACTION_VOIDED",
      entityType: "TRANSACTION",
      entityId: transaction._id,
      organization: req.organizationId,
      performedBy: req.user?._id,
      details: { amount: transaction.amount, type: transaction.type, status: "voided" },
      req
    });

    res.json(APIResponse.success(transaction, "Transaction voided successfully"));
  } catch (err) {
    next(err);
  }
});

// ✅ DELETE transaction (Admin/Treasurer can delete any, students can only delete their own student-added transactions)
router.delete("/:id", validateObjectId, handleValidationError, async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.organizationId) query.organization = req.organizationId;
    const transaction = await Transaction.findOne(query);
    
    if (!transaction) {
      return next(new CustomError("Transaction not found", 404, 'TRANSACTION_NOT_FOUND'));
    }
    
    const user = req.user;
    const isAdminOrTreasurerUser = isAdminOrTreasurer(user.role);
    
    // Admin/Treasurer can delete any transaction
    if (isAdminOrTreasurerUser) {
      await Transaction.findByIdAndDelete(req.params.id);
      await logAudit({
        action: "TRANSACTION_DELETED",
        entityType: "TRANSACTION",
        entityId: transaction._id,
        organization: req.organizationId,
        performedBy: user._id,
        details: { amount: transaction.amount, type: transaction.type },
        req
      });
      return res.json(APIResponse.success(null, "Transaction deleted successfully"));
    }
    
    // Students can only delete their own student-added transactions
    if (transaction.user.toString() !== user._id.toString()) {
      return next(new CustomError("You can only delete your own transactions", 403, 'INSUFFICIENT_PERMISSIONS'));
    }
    
    // Prevent students from deleting non-student entries
    if (transaction.isStudentEntry === false) {
      return next(new CustomError(
        "Cannot delete system-generated transactions. Only student-added expenses can be removed.", 
        403, 
        'INSUFFICIENT_PERMISSIONS'
      ));
    }
    
    await Transaction.findByIdAndDelete(req.params.id);
    res.json(APIResponse.success(null, "Transaction deleted successfully"));
  } catch (err) {
    next(err);
  }
});

module.exports = router;