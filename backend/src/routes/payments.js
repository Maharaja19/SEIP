const express = require("express");
const router = express.Router();
const Due = require("../models/dues");
const Student = require("../models/student");
const Transaction = require("../models/transactions");
const UPIService = require("../services/upiService");
// Import validation middleware
const {
  validateUPIPayment,
  validateObjectId,
  handleValidationError
} = require('../middleware/validation');
// Import API response utility
const APIResponse = require('../utils/apiResponse');
// Import custom error class
const CustomError = require('../utils/CustomError');
const { ensureStudentForUser, logUserAccess } = require('../services/userStudentService');
// const RazorpayService = require("../services/razorpayService"); // Disabled for UPI-only mode

// Generate UPI payment link
router.post("/generate-upi-link", async (req, res, next) => {
  try {
    const { amount, dueId, studentRegNo } = req.body;

    // Validate input
    if (!amount || !dueId || !studentRegNo) {
      return next(new CustomError(
        "Amount, dueId, and studentRegNo are required",
        400,
        'MISSING_REQUIRED_FIELDS'
      ));
    }

    logUserAccess(req, 'payments.generate-upi-link');

    const due = await Due.findOne({ _id: dueId, organization: req.organizationId });
    let student = await Student.findOne({ registerNumber: studentRegNo });

    if (!due) {
      return next(new CustomError("Due not found", 404, 'DUE_NOT_FOUND'));
    }

    if (!student && req.user?.registerNumber === studentRegNo) {
      student = await ensureStudentForUser(req.user);
    }

    if (!student) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }

    // Generate UPI payment link
    const upiLink = UPIService.generatePaymentLink(amount, studentRegNo, due.reason);
    const qrCodeUrl = UPIService.generateQRCode(amount, studentRegNo, due.reason);

    const paymentData = {
      upiLink,
      qrCodeUrl,
      amount,
      due: {
        id: due._id,
        reason: due.reason
      },
      student: {
        name: student.fullName,
        registerNumber: student.registerNumber
      }
    };

    res.json({
      success: true,
      message: "UPI link generated successfully",
      upiLink,
      qrCodeUrl,
      amount,
      data: paymentData,
      statusCode: 200
    });
  } catch (error) {
    console.error("Error generating UPI link:", error);
    next(error);
  }
});

// Submit UPI payment with enhanced validation
router.post("/submit-upi-payment", async (req, res, next) => {
  try {
    const { dueId, transactionRef, upiTransactionId, paymentScreenshot, studentRegNo } = req.body;

    // Validate input
    if (!dueId || !transactionRef || !upiTransactionId || !studentRegNo) {
      return next(new CustomError(
        "dueId, transactionRef, upiTransactionId, and studentRegNo are required",
        400,
        'MISSING_REQUIRED_FIELDS'
      ));
    }

    // Validate UPI transaction ID format
    if (!UPIService.validateUPITransactionId(upiTransactionId)) {
      return next(new CustomError("Invalid UPI transaction ID format", 400, 'INVALID_UPI_TRANSACTION_ID'));
    }

    // Submit payment using UPI service
    const result = await UPIService.submitPayment(dueId, {
      transactionRef,
      upiTransactionId,
      paymentScreenshot
    }, studentRegNo, req.organizationId);

    res.json(APIResponse.success(result.data, result.message));
  } catch (error) {
    console.error("Error submitting UPI payment:", error);
    next(error);
  }

});

// Razorpay Order Creation - DISABLED FOR UPI-ONLY MODE
// router.post("/create-razorpay-order", async (req, res, next) => {
//   try {
//     const { amount, dueId, studentRegNo } = req.body;
//
//     if (!amount || !studentRegNo) {
//       return next(new CustomError("Amount and Student Register Number required", 400, "MISSING_FIELDS"));
//     }
//
//     // Resolve student
//     let studentId;
//     const student = await Student.findOne({ registerNumber: studentRegNo });
//     if (!student) {
//       return next(new CustomError("Student not found", 404, "STUDENT_NOT_FOUND"));
//     }
//     studentId = student._id;
//
//     const result = await RazorpayService.createOrder(amount, studentId, dueId);
//     res.json(APIResponse.success(result, "Order created successfully"));
//   } catch (error) {
//     console.error("Error creating Razorpay order:", error);
//     next(error);
//   }
// });



module.exports = router;