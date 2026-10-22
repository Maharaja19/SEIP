const express = require("express");
const router = express.Router();
const Budget = require("../models/budget");
const User = require("../models/user");
const mongoose = require("mongoose");
const notificationService = require("../services/notificationService");
// Import validation middleware
const { 
  validateBudget,
  validateBudgetUpdate,
  validateObjectId,
  handleValidationError 
} = require('../middleware/validation');
// Import API response utility
const APIResponse = require('../utils/apiResponse');
// Import custom error class
const CustomError = require('../utils/CustomError');
// Import authorization middleware
const { authorizeRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// GET all budgets
router.get("/", async (req, res, next) => {
  try {
    const budgets = await Budget.find({ organization: req.organizationId }).sort({ createdAt: -1 });
    res.json(APIResponse.success(budgets));
  } catch (err) {
    console.error('Error fetching budgets:', err);
    next(err);
  }
});

// GET current budget (for treasurer dashboard)
router.get("/current", async (req, res, next) => {
  try {
    // Get the most recent approved budget or create a default one
    let budget = await Budget.findOne({ status: "approved", organization: req.organizationId }).sort({ createdAt: -1 });
    
    if (!budget) {
      // Create default budget if none exists
      budget = {
        total_budget: 0,
        spent: 0,
        remaining: 0,
        last_updated: new Date().toISOString().split('T')[0],
        expenses: []
      };
    }
    
    res.json(APIResponse.success(budget));
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching current budget:', err);
    }
    next(err);
  }
});

// GET budget summary (must be before /:id)
router.get("/summary/all", async (req, res, next) => {
  try {
    const totalBudgets = await Budget.countDocuments({ organization: req.organizationId });
    const approvedBudgets = await Budget.countDocuments({ status: "approved", organization: req.organizationId });
    const pendingBudgets = await Budget.countDocuments({ status: "pending", organization: req.organizationId });
    const rejectedBudgets = await Budget.countDocuments({ status: "rejected", organization: req.organizationId });
    
    const totalAmount = await Budget.aggregate([
      { $match: { organization: req.organizationId } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    
    const approvedAmount = await Budget.aggregate([
      { $match: { status: "approved", organization: req.organizationId } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    
    const summary = {
      totalBudgets,
      approvedBudgets,
      pendingBudgets,
      rejectedBudgets,
      totalAmount: totalAmount[0]?.total || 0,
      approvedAmount: approvedAmount[0]?.total || 0
    };
    
    res.json(APIResponse.success(summary));
  } catch (err) {
    next(err);
  }
});

// GET budget by ID
router.get("/:id", async (req, res, next) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId ? { $or: [{ _id: req.params.id }, { budgetID: req.params.id }] } : { budgetID: req.params.id };
    query.organization = req.organizationId;
    const budget = await Budget.findOne(query);
    if (!budget) {
      return next(new CustomError("Budget not found", 404, 'BUDGET_NOT_FOUND'));
    }
    res.json(APIResponse.success(budget));
  } catch (err) {
    next(err);
  }
});

// CREATE new budget (Treasurer/Admin only)
router.post("/", authorizeRole(['Treasurer', 'Admin']), validateBudget, handleValidationError, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating/updating budget with data:', req.body);
    }
    
    // Calculate remaining amount
    const expenseTotal = req.body.expenses ? 
      req.body.expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0) : 0;
    
    const budgetData = {
      ...req.body,
      spent: expenseTotal,
      remaining: (parseFloat(req.body.total_budget) || 0) - expenseTotal,
      last_updated: new Date().toISOString().split('T')[0]
    };
    
    // Find existing budget and update or create new one
    let budget = await Budget.findOneAndUpdate(
      { status: "approved", organization: req.organizationId }, 
      { ...budgetData, organization: req.organizationId }, 
      { new: true, upsert: true, runValidators: true }
    );
    
    await logAudit({
      action: "BUDGET_CREATED",
      entityType: "BUDGET",
      entityId: budget._id,
      organization: req.organizationId,
      performedBy: req.user?._id,
      details: { title: budget.title, allocated: budget.allocated, period: budget.period },
      req
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Budget saved successfully:', budget._id);
    }
    res.status(201).json(APIResponse.success(budget, "Budget created successfully", 201));
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error creating budget:', err);
    }
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});

// UPDATE budget (Treasurer/Admin only)
router.put("/:id", authorizeRole(['Treasurer', 'Admin']), validateBudgetUpdate, handleValidationError, async (req, res, next) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId ? { $or: [{ _id: req.params.id }, { budgetID: req.params.id }] } : { budgetID: req.params.id };
    query.organization = req.organizationId;
    const budget = await Budget.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    );
    if (!budget) {
      return next(new CustomError("Budget not found", 404, 'BUDGET_NOT_FOUND'));
    }

    await logAudit({
      action: "BUDGET_UPDATED",
      entityType: "BUDGET",
      entityId: budget._id,
      organization: req.organizationId,
      performedBy: req.user?._id,
      details: { updatedFields: Object.keys(req.body) },
      req
    });

    res.json(APIResponse.success(budget, "Budget updated successfully"));
  } catch (err) {
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});

// APPROVE/REJECT budget (Admin only)
router.put("/:id/status", authorizeRole(['Admin', 'Treasurer']), async (req, res, next) => {
  try {
    const { status, approvedBy } = req.body;
    const normalizedStatus = String(status || "").toLowerCase();

    if (!['approved', 'rejected'].includes(normalizedStatus)) {
      return next(new CustomError("Status must be 'approved' or 'rejected'", 400, 'INVALID_STATUS'));
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId ? { $or: [{ _id: req.params.id }, { budgetID: req.params.id }] } : { budgetID: req.params.id };
    query.organization = req.organizationId;
    const budget = await Budget.findOneAndUpdate(
      query,
      { status: normalizedStatus, approvedBy, approvedAt: normalizedStatus === 'approved' ? new Date() : undefined },
      { new: true, runValidators: true }
    ).populate("proposedBy", "name email");

    if (!budget) {
      return next(new CustomError("Budget not found", 404, 'BUDGET_NOT_FOUND'));
    }

    if (budget.proposedBy?.email) {
      const emailStatus = normalizedStatus === "approved" ? "Approved" : "Rejected";
      await notificationService.sendBudgetApprovalNotification(
        budget.proposedBy.email,
        budget.proposedBy.name || "Treasurer",
        budget.title,
        emailStatus
      );
    }

    await logAudit({
      action: "BUDGET_STATUS_CHANGED",
      entityType: "BUDGET",
      entityId: budget._id,
      organization: req.organizationId,
      performedBy: req.user?._id,
      details: { status: normalizedStatus },
      req
    });

    res.json(APIResponse.success(budget, `Budget ${normalizedStatus} successfully`));
  } catch (err) {
    next(err);
  }
});

// DELETE budget (Admin only)
router.delete("/:id", authorizeRole(['Admin', 'Treasurer']), async (req, res, next) => {
  try {
    const isObjectId = mongoose.Types.ObjectId.isValid(req.params.id);
    const query = isObjectId ? { $or: [{ _id: req.params.id }, { budgetID: req.params.id }] } : { budgetID: req.params.id };
    query.organization = req.organizationId;
    const budget = await Budget.findOneAndDelete(query);
    if (!budget) {
      return next(new CustomError("Budget not found", 404, 'BUDGET_NOT_FOUND'));
    }

    await logAudit({
      action: "BUDGET_DELETED",
      entityType: "BUDGET",
      entityId: budget._id,
      organization: req.organizationId,
      performedBy: req.user?._id,
      details: { title: budget.title },
      req
    });

    res.json(APIResponse.success(null, "Budget deleted"));
  } catch (err) {
    next(err);
  }
});

module.exports = router;