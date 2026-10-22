const express = require("express");
const router = express.Router();
const Student = require("../models/student");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const Due = require("../models/dues");
const Transaction = require("../models/transactions");
// Import authorization middleware
const { authorizeRole } = require('../middleware/auth');
// Import API response utility
const APIResponse = require('../utils/apiResponse');
// Import custom error class
const CustomError = require('../utils/CustomError');
const {
  ensureStudentForUser,
  logUserAccess,
} = require('../services/userStudentService');

const { isStudent } = require('../utils/roles');

const resolveStudentByRegNo = async (req, regNo) => {
  // Self-only lookup: a student may only resolve their own record
  const isSelf = req.user?.registerNumber === regNo;
  if (isStudent(req.user?.role) && !isSelf) return null;

  let student = await Student.findOne({ registerNumber: regNo, organization: req.organizationId });
  if (!student && isSelf) {
    student = await ensureStudentForUser(req.user);
  }
  return student;
};

// ✅ Create a new student (Treasurer/Admin only)
router.post("/", authorizeRole(['Treasurer', 'Admin']), async (req, res, next) => {
  try {
    const student = new Student({ ...req.body, organization: req.organizationId });
    await student.save();
    res.status(201).json(APIResponse.success(student, "Student created successfully", 201));
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});

// ✅ Get all students with pagination (Treasurer/Admin only)
router.get("/", authorizeRole(['Treasurer', 'Admin']), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalStudents = await Student.countDocuments({ organization: req.organizationId });
    const students = await Student.find({ organization: req.organizationId }).skip(skip).limit(limit);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalStudents / limit),
      totalStudents,
      hasNextPage: page < Math.ceil(totalStudents / limit),
      hasPrevPage: page > 1
    };

    res.json(APIResponse.paginated(students, pagination));
  } catch (err) {
    next(err);
  }
});

// ✅ Get current authenticated student's record
router.get("/me", async (req, res, next) => {
  try {
    logUserAccess(req, "students.me");
    const student = await ensureStudentForUser(req.user);
    if (!student) {
      return next(new CustomError("Student profile not found", 404, "STUDENT_NOT_FOUND"));
    }
    res.json(APIResponse.success(student));
  } catch (err) {
    next(err);
  }
});

// ✅ Get installment dues for current authenticated student
router.get("/me/installment-dues", async (req, res, next) => {
  try {
    logUserAccess(req, "students.me.installment-dues");
    const student = await ensureStudentForUser(req.user);
    if (!student) {
      return next(new CustomError("Student profile not found", 404, "STUDENT_NOT_FOUND"));
    }

    const installmentDues = await Due.find({
      student: student._id,
      organization: req.organizationId,
      reason: { $regex: /Semester [5-8] Installment/ },
    }).sort({ dueDate: 1 });

    res.json(APIResponse.success(installmentDues));
  } catch (err) {
    next(err);
  }
});

// ✅ Get a single student by email
router.get("/email/:email", async (req, res, next) => {
  try {
    // Non-staff may only fetch their own email record
    if (isStudent(req.user?.role) && req.user?.email !== req.params.email) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }
    const student = await Student.findOne({ email: req.params.email, organization: req.organizationId });
    if (!student) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }
    res.json(APIResponse.success(student));
  } catch (err) {
    next(err);
  }
});

// ✅ Get a single student by register number
router.get("/:regNo", async (req, res, next) => {
  try {
    const student = await resolveStudentByRegNo(req, req.params.regNo);
    if (!student) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }
    res.json(APIResponse.success(student));
  } catch (err) {
    next(err);
  }
});

// ✅ Get installment dues for a student
router.get("/:regNo/installment-dues", async (req, res, next) => {
  try {
    const student = await resolveStudentByRegNo(req, req.params.regNo);
    if (!student) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }

    const installmentDues = await Due.find({
      student: student._id,
      organization: req.organizationId,
      reason: { $regex: /Semester [5-8] Installment/ }
    }).sort({ dueDate: 1 });

    res.json(APIResponse.success(installmentDues));
  } catch (err) {
    next(err);
  }
});

// ✅ Get financial summary for a student
router.get("/:regNo/financial-summary", async (req, res, next) => {
  try {
    const student = await resolveStudentByRegNo(req, req.params.regNo);
    if (!student) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }

    const user =
      req.user?.registerNumber === req.params.regNo
        ? req.user
        : await User.findOne({ registerNumber: req.params.regNo, organizationId: req.organizationId });
    if (!user) {
      return next(new CustomError("User account not found", 404, 'USER_NOT_FOUND'));
    }

    // Get all transactions for the student
    const transactions = await Transaction.find({ user: user._id, organization: req.organizationId });

    // Calculate summary
    const totalIncome = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalIncome - totalExpense;

    // Get dues information
    const allDues = await Due.find({ student: student._id, organization: req.organizationId });
    const paidDues = allDues.filter(due => due.status === "Paid");
    const unpaidDues = allDues.filter(due => due.status === "Unpaid");
    const pendingDues = allDues.filter(due => due.status === "Pending Verification");

    const totalDuesAmount = allDues.reduce((sum, due) => sum + due.amount, 0);
    const paidDuesAmount = paidDues.reduce((sum, due) => sum + due.amount, 0);

    const summary = {
      financialSummary: {
        totalIncome,
        totalExpense,
        balance,
        totalTransactions: transactions.length
      },
      duesSummary: {
        totalDues: allDues.length,
        paidDues: paidDues.length,
        unpaidDues: unpaidDues.length,
        pendingDues: pendingDues.length,
        totalDuesAmount,
        paidDuesAmount
      }
    };

    res.json(APIResponse.success(summary));
  } catch (err) {
    next(err);
  }
});

// ✅ Update a student by register number (Treasurer/Admin only)
router.put("/:regNo", authorizeRole(['Treasurer', 'Admin']), async (req, res, next) => {
  try {
    const student = await Student.findOneAndUpdate(
      { registerNumber: req.params.regNo, organization: req.organizationId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!student) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }
    res.json(APIResponse.success(student, "Student updated successfully"));
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});

// ✅ Change student password
router.put("/:regNo/change-password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const regNo = req.params.regNo;

    // Find the student
    const student = await Student.findOne({ registerNumber: regNo, organization: req.organizationId });
    if (!student) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }

    // Find the corresponding user
    const user = await User.findOne({ registerNumber: regNo, organizationId: req.organizationId });
    if (!user) {
      return next(new CustomError("User account not found", 404, 'USER_NOT_FOUND'));
    }

    // Check if user has a password (Google OAuth users might not have passwords)
    if (!user.password) {
      return next(new CustomError("Password change not available for Google OAuth users", 400, 'PASSWORD_NOT_SET'));
    }

    // Check if current password matches
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return next(new CustomError("Current password is incorrect", 400, 'INVALID_PASSWORD'));
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password in user collection
    await User.findOneAndUpdate(
      { registerNumber: regNo },
      { password: hashedPassword, lastPasswordChange: new Date() },
      { new: true }
    );

    res.json(APIResponse.success(null, "Password changed successfully"));
  } catch (err) {
    next(err);
  }
});

// ✅ Delete a student by register number (Admin only)
router.delete("/:regNo", authorizeRole(['Admin']), async (req, res, next) => {
  try {
    const student = await Student.findOneAndDelete({ registerNumber: req.params.regNo, organization: req.organizationId });
    if (!student) {
      return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
    }
    res.json(APIResponse.success(null, "Student deleted successfully"));
  } catch (err) {
    next(err);
  }
});

module.exports = router;