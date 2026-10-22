const express = require("express");
const Due = require("../models/dues");
const User = require("../models/user");
const Student = require("../models/student");
const Transaction = require("../models/transactions");
const UPIService = require("../services/upiService");
const router = express.Router();
// Import validation middleware
const { 
  validateDueCreation, 
  validateObjectId,
  validateSearchQuery,
  handleValidationError 
} = require('../middleware/validation');
// Import API response utility
const APIResponse = require('../utils/apiResponse');
// Import custom error class
const CustomError = require('../utils/CustomError');
// Import authorization middleware
const { authorizeRole } = require('../middleware/auth');

// GET all dues with pagination (Treasurer/Admin only)
router.get("/", authorizeRole(['Treasurer', 'Admin']), validateSearchQuery, handleValidationError, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const totalDues = await Due.countDocuments({ organization: req.organizationId });
    const dues = await Due.find({ organization: req.organizationId })
      .populate("student", "fullName registerNumber email")
      .sort({ dueDate: -1 })
      .skip(skip)
      .limit(limit);
      
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalDues / limit),
      totalDues,
      hasNextPage: page < Math.ceil(totalDues / limit),
      hasPrevPage: page > 1
    };
    
    res.json(APIResponse.paginated(dues, pagination, 'Success', 'Due'));
  } catch (err) {
    next(err);
  }
});

// GET pending payments for treasurer (notifications) (Treasurer/Admin only)
// NOTE: Must be before /:regNo to avoid parametric route catching these
router.get("/pending-verification", authorizeRole(['Treasurer', 'Admin', 'Student', 'Member']), async (req, res, next) => {
  try {
    const pendingPayments = await Due.find({ 
      status: "Pending Verification",
      organization: req.organizationId 
    })
    .populate("student", "fullName registerNumber")
    .sort({ paidDate: -1 });
    
    // Transform to match frontend expectations
    const transformedPayments = pendingPayments.map(due => ({
      _id: due._id,
      studentName: due.student?.fullName || 'Unknown',
      amount: due.amount,
      createdAt: due.paidDate || due.createdAt,
      transactionRef: due.transactionRef,
      upiTransactionId: due.upiTransactionId,
      paymentMethod: due.paymentMethod
    }));
    
    res.json(APIResponse.success(transformedPayments));
  } catch (err) {
    next(err);
  }
});

// GET pending payments for treasurer (Treasurer/Admin only)
router.get("/pending-payments", authorizeRole(['Treasurer', 'Admin']), async (req, res, next) => {
  try {
    const pendingPayments = await Due.find({ 
      status: "Pending Verification",
      organization: req.organizationId 
    })
    .sort({ paidDate: -1 });
    
    res.json(APIResponse.success(pendingPayments));
  } catch (err) {
    next(err);
  }
});

// GET dues summary (Treasurer/Admin only)
router.get("/summary/all", authorizeRole(['Treasurer', 'Admin']), async (req, res, next) => {
  try {
    const totalDues = await Due.countDocuments({ organization: req.organizationId });
    const paidDues = await Due.countDocuments({ status: "Paid", organization: req.organizationId });
    const unpaidDues = await Due.countDocuments({ status: "Unpaid", organization: req.organizationId });
    
    const totalAmount = await Due.aggregate([
      { $match: { organization: req.organizationId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    const paidAmount = await Due.aggregate([
      { $match: { status: "Paid", organization: req.organizationId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    const unpaidAmount = await Due.aggregate([
      { $match: { status: "Unpaid", organization: req.organizationId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    const summary = {
      totalDues,
      paidDues,
      unpaidDues,
      totalAmount: totalAmount[0]?.total || 0,
      paidAmount: paidAmount[0]?.total || 0,
      unpaidAmount: unpaidAmount[0]?.total || 0
    };
    
    res.json(APIResponse.success(summary));
  } catch (err) {
    next(err);
  }
});

// Generate installment dues for all students (Treasurer/Admin only)
router.post("/generate-installment-dues", authorizeRole(['Treasurer', 'Admin']), async (req, res, next) => {
  try {

    // Get all students
    const students = await Student.find({ organization: req.organizationId });
    
    let duesCreated = 0;
    const createdDues = [];
    
    // For each student, create dues for semesters 5, 6, 7, and 8
    for (const student of students) {
      // Check if dues already exist for this student and semester
      for (let semester = 5; semester <= 8; semester++) {
        const dueReason = `Semester ${semester} Installment`;
        const existingDue = await Due.findOne({
          student: student._id,
          reason: dueReason
        });
        
        // If due doesn't exist, create it
        if (!existingDue) {
          const due = new Due({
            dueID: Date.now() + Math.floor(Math.random() * 1000000), // Unique ID
            student: student._id,
            amount: 150, // 150 per semester
            reason: dueReason,
            dueDate: new Date(new Date().getFullYear(), (semester - 1) * 6, 1), // Due date: June for odd semesters, December for even semesters
            status: "Unpaid",
            organization: req.organizationId
          });
          
          await due.save();
          duesCreated++;
          createdDues.push(due);
        }
      }
    }
    
    res.json(APIResponse.success({
      duesCreated,
      createdDues
    }, `Successfully created ${duesCreated} installment dues`, 201));
  } catch (err) {
    next(err);
  }
});

// GET dues for a student by register number with pagination
// NOTE: Parametric route MUST come after specific routes
router.get("/:regNo", validateSearchQuery, handleValidationError, async (req, res, next) => {
  try {
    // Find student by register number
    let student = await Student.findOne({ registerNumber: req.params.regNo });
    if (!student) {
      const user = await User.findOne({ registerNumber: req.params.regNo, organizationId: req.organizationId });
      if (user) {
        student = new Student({
          fullName: user.name,
          registerNumber: user.registerNumber,
          email: user.email,
          dob: user.dob || new Date('2000-01-01'),
          gender: 'Other',
          department: 'General',
          year: 'I',
          phoneNumber: user.contactNo || '9876543210',
          organization: req.organizationId
        });
        await student.save();
      }
    }
    if (!student) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const dueQuery = {
      organization: req.organizationId,
      $or: [{ student: student._id }, { studentRegNo: req.params.regNo }]
    };
    if (req.query.status) {
      dueQuery.status = req.query.status;
    }
    
    const totalDues = await Due.countDocuments(dueQuery);
    const dues = await Due.find(dueQuery)
      .sort({ dueDate: -1 })
      .skip(skip)
      .limit(limit);
      
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalDues / limit),
      totalDues,
      hasNextPage: page < Math.ceil(totalDues / limit),
      hasPrevPage: page > 1
    };
    
    res.json(APIResponse.paginated(dues, pagination, 'Success', 'Due'));
  } catch (err) {
    next(err);
  }
});

// CREATE new due (Treasurer/Admin only)
router.post("/", authorizeRole(['Treasurer', 'Admin']), validateDueCreation, handleValidationError, async (req, res, next) => {
  try {
    const { studentRegNo, ...dueData } = req.body;
    
    // Find student
    let student = await Student.findOne({ registerNumber: studentRegNo });
    if (!student) {
      const user = await User.findOne({ registerNumber: studentRegNo, organizationId: req.organizationId });
      if (user) {
        student = new Student({
          fullName: user.name,
          registerNumber: user.registerNumber,
          email: user.email,
          dob: user.dob || new Date('2000-01-01'),
          gender: 'Other',
          department: 'General',
          year: 'I',
          phoneNumber: user.contactNo || '9876543210',
          organization: req.organizationId
        });
        await student.save();
      }
    }
    if (!student) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }
    
    const due = new Due({
      ...dueData,
      student: student._id,
      dueID: dueData.dueID || Date.now(),
      organization: req.organizationId
    });
    
    await due.save();
    
    const populatedDue = await Due.findById(due._id)
      .populate("student", "fullName registerNumber email");
    
    res.status(201).json(APIResponse.success(populatedDue, "Due created successfully", 201));
  } catch (err) {
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});

// Legacy pay route for compatibility with dues.test.js
router.put("/:id/pay", async (req, res, next) => {
  try {
    const due = await Due.findOne({ _id: req.params.id, organization: req.organizationId });
    if (!due) {
      return next(new CustomError("Due not found", 404, 'DUE_NOT_FOUND'));
    }

    const { amount, transactionRef, paymentMethod } = req.body;

    if (!amount || !transactionRef) {
      return next(new CustomError("Amount and transaction reference are required", 400, 'MISSING_FIELDS'));
    }

    if (parseFloat(amount) !== parseFloat(due.amount)) {
      return next(new CustomError("incorrect amount: Paid amount does not match due amount", 400, 'INCORRECT_AMOUNT'));
    }

    let studentRegNo = req.user?.registerNumber;
    if (!studentRegNo) {
      const student = await Student.findById(due.student);
      studentRegNo = student?.registerNumber;
    }

    const result = await UPIService.submitPayment(due._id, {
      transactionRef,
      upiTransactionId: transactionRef,
      paymentScreenshot: null
    }, studentRegNo || '21CSE002', req.organizationId);

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (err) {
    next(err);
  }
});

// UPDATE due status when student pays via UPI
router.put("/:dueID/pay-via-upi", async (req, res, next) => {
  try {
    const { transactionRef, upiTransactionId, paymentScreenshot, studentRegNo } = req.body;

    // Validate required fields for UPI payment
    if (!transactionRef || !upiTransactionId || !studentRegNo) {
      return next(new CustomError(
        "Transaction reference, UPI transaction ID, and student register number are required", 
        400, 
        'MISSING_REQUIRED_FIELDS'
      ));
    }

    const mongoose = require('mongoose');
    let due;
    if (mongoose.Types.ObjectId.isValid(req.params.dueID)) {
      due = await Due.findOne({ _id: req.params.dueID, organization: req.organizationId });
    }
    if (!due) {
      const numId = Number(req.params.dueID);
      if (!isNaN(numId)) {
        due = await Due.findOne({ dueID: numId, organization: req.organizationId });
      }
    }
    
    if (!due) {
      return next(new CustomError("Due not found", 404, 'DUE_NOT_FOUND'));
    }

    // Find the student
    const student = await Student.findOne({ registerNumber: studentRegNo });
    if (!student) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }

    // Submit payment using UPI service
    const result = await UPIService.submitPayment(due._id, {
      transactionRef,
      upiTransactionId,
      paymentScreenshot
    }, studentRegNo, req.organizationId);

    res.json(APIResponse.success(result.data, result.message));
  } catch (err) {
    next(err);
  }
});

// TREASURER: Verify and approve payment (Treasurer only)
router.put("/:dueID/verify", authorizeRole(['Treasurer']), async (req, res, next) => {
  try {
    const { action, treasurerNotes } = req.body; // action: 'approve' or 'reject'
    
    if (!['approve', 'reject'].includes(action)) {
      return next(new CustomError("Action must be 'approve' or 'reject'", 400, 'INVALID_ACTION'));
    }

    const due = await Due.findOne({ _id: req.params.dueID, organization: req.organizationId });
    
    if (!due) {
      return next(new CustomError("Due not found", 404, 'DUE_NOT_FOUND'));
    }

    if (due.status !== "Pending Verification") {
      return next(new CustomError("Due is not in pending verification status", 400, 'INVALID_STATUS'));
    }

    // Get treasurer ID from authenticated user (assuming middleware sets req.user)
    const treasurerId = req.user ? req.user._id : null;

    // Verify payment using UPI service
    const result = await UPIService.verifyPayment(
      req.params.dueID, 
      action, 
      treasurerNotes, 
      treasurerId,
      req.organizationId
    );

    res.json(APIResponse.success(result.data, result.message));
  } catch (err) {
    next(err);
  }
});

// UPDATE due (Treasurer only)
router.put("/:dueID", authorizeRole(['Treasurer']), async (req, res, next) => {
  try {

    const due = await Due.findOneAndUpdate(
      { dueID: req.params.dueID, organization: req.organizationId },
      req.body,
      { new: true, runValidators: true }
    ).populate("student", "fullName registerNumber email");
    
    if (!due) {
      return next(new CustomError("Due not found", 404, 'DUE_NOT_FOUND'));
    }
    res.json(APIResponse.success(due, "Due updated successfully"));
  } catch (err) {
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});

// DELETE due (Treasurer only)
router.delete("/:dueID", authorizeRole(['Treasurer']), async (req, res, next) => {
  try {

    const due = await Due.findOneAndDelete({ dueID: req.params.dueID, organization: req.organizationId });
    if (!due) {
      return next(new CustomError("Due not found", 404, 'DUE_NOT_FOUND'));
    }
    res.json(APIResponse.success(null, "Due deleted successfully"));
  } catch (err) {
    next(err);
  }
});

module.exports = router;