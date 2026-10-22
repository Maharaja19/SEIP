const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Student = require("../models/student");
const bcrypt = require("bcryptjs");
// Import validation middleware
const { 
  validateObjectId,
  handleValidationError 
} = require('../middleware/validation');
// Import API response utility
const APIResponse = require('../utils/apiResponse');
// Import custom error class
const CustomError = require('../utils/CustomError');
const { formatUserForClient } = require('../utils/jwtHelper');
const { isStudent, isAdmin, roleMatches } = require('../utils/roles');
const {
  ensureStudentForUser,
  logUserAccess,
  logProfileCompleteness,
} = require('../services/userStudentService');
const { authorizeRole } = require("../middleware/auth");
const { USER_ROLES } = require("../utils/constants");

// ✅ Create a new user
router.post("/", authorizeRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]), async (req, res, next) => {
  try {
    const user = new User({ ...req.body, organizationId: req.organizationId });
    await user.save();
    res.status(201).json(APIResponse.success(user, "User created successfully", 201));
  } catch (err) {
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});

// ✅ Get all users
router.get("/", authorizeRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]), async (req, res, next) => {
  try {
    const users = await User.find({ organizationId: req.organizationId });
    res.json(APIResponse.success(users));
  } catch (err) {
    next(err);
  }
});

// ✅ Get current user profile (/me endpoint)
router.get("/me", async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new CustomError("User not authenticated", 401, 'UNAUTHORIZED'));
    }

    const user = req.user;

    const userData = {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      registerNumber: user.registerNumber,
      rollNo: user.rollNo,
      contactNo: user.contactNo,
      dob: user.dob,
      profilePicture: user.profilePicture || user.avatar || null,
      avatar: user.avatar || user.profilePicture || null,
      googleId: user.googleId || null,
      onboardingCompleted: user.onboardingCompleted,
      onboarding: user.onboarding
    };

    res.json(APIResponse.success(userData));
  } catch (err) {
    console.error("Error in /me endpoint:", err);
    next(err);
  }
});

// ✅ Full profile for current user (User + Student merge)
router.get("/profile", async (req, res, next) => {
  try {
    logUserAccess(req, 'users.profile.get');
    if (!req.user) {
      return next(new CustomError("User not authenticated", 401, 'UNAUTHORIZED'));
    }

    const user = req.user;
    let profile = formatUserForClient(user);

    if (isStudent(user.role) && user.onboardingCompleted) {
      try {
        const student = await ensureStudentForUser(user);
        if (student) {
          profile = {
            ...profile,
            name: student.fullName || user.name,
            fullName: student.fullName,
            email: student.email || user.email,
            dob: student.dob || null,
            gender: student.gender,
            religion: student.religion,
            department: student.department || user.onboarding?.academic?.branch,
            year: student.year || user.onboarding?.academic?.year,
            batch: user.onboarding?.academic?.batch || null,
            branch: user.onboarding?.academic?.branch || null,
            section: student.section,
            address: student.address,
            phone: student.phoneNumber,
            contactNo: student.phoneNumber || user.contactNo,
            registerNumber: student.registerNumber || user.registerNumber,
            quota: student.quota,
            community: student.community,
            cgpa: student.cgpa,
          };
        }
      } catch (syncErr) {
        console.warn('[PROFILE] Student sync skipped:', syncErr.message);
      }
    }

    res.json(APIResponse.success(profile, "Profile fetched"));
  } catch (err) {
    next(err);
  }
});

// ✅ Update current user profile
router.put("/profile", async (req, res, next) => {
  try {
    logUserAccess(req, 'users.profile.update');
    const user = req.user;
    if (!user) {
      return next(new CustomError("User not authenticated", 401, 'UNAUTHORIZED'));
    }

    const { name, contactNo, branch, batch, year } = req.body || {};

    if (name?.trim()) user.name = name.trim();
    if (contactNo?.trim()) {
      if (!/^[6-9]\d{9}$/.test(contactNo.trim())) {
        return next(new CustomError('Invalid contact number', 400, 'VALIDATION_ERROR'));
      }
      user.contactNo = contactNo.trim();
    }

    if (!user.onboarding) user.onboarding = {};
    if (!user.onboarding.academic) user.onboarding.academic = {};
    if (branch?.trim()) user.onboarding.academic.branch = branch.trim();
    if (batch?.trim()) user.onboarding.academic.batch = batch.trim();
    if (year?.trim()) user.onboarding.academic.year = year.trim();

    await user.save();
    logProfileCompleteness(user);

    if (isStudent(user.role) && user.onboardingCompleted) {
      const student = await ensureStudentForUser(user);
      if (student) {
        if (name?.trim()) student.fullName = name.trim();
        if (contactNo?.trim()) {
          student.phoneNumber = contactNo.trim();
          student.contactNo = contactNo.trim();
        }
        if (branch?.trim()) student.department = branch.trim();
        if (year?.trim()) student.year = year.trim();
        await student.save();
      }
    }

    res.json(APIResponse.success(formatUserForClient(user), 'Profile updated successfully'));
  } catch (err) {
    next(err);
  }
});

// ✅ Get a single user by ID
router.get("/:id", validateObjectId, handleValidationError, async (req, res, next) => {
  try {
    // Non-staff may only view their own record
    const isSelf = req.user?._id?.toString() === req.params.id;
    if (isStudent(req.user?.role) && !isSelf) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }
    const user = await User.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!user) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }
    res.json(APIResponse.success(user));
  } catch (err) {
    next(err);
  }
});

// ✅ Update a user by ID
router.put("/:id", validateObjectId, handleValidationError, async (req, res, next) => {
  try {
    // Check if the user is updating themselves or is an admin
    const isClientAdmin = isAdmin(req.user.role);
    if (req.user._id.toString() !== req.params.id && !isClientAdmin) {
      return next(new CustomError("Insufficient permissions", 403, 'INSUFFICIENT_PERMISSIONS'));
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!user) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }
    res.json(APIResponse.success(user, "User updated successfully"));
  } catch (err) {
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});

// ✅ Change user password
router.put("/:id/change-password", validateObjectId, handleValidationError, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.id;

    // Find the user
    const user = await User.findOne({ _id: userId, organizationId: req.organizationId });
    if (!user) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }

    // Check if current password matches
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return next(new CustomError("Current password is incorrect", 400, 'INVALID_PASSWORD'));
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return next(new CustomError("New password must be at least 6 characters", 400, 'WEAK_PASSWORD'));
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, organizationId: req.organizationId },
      { password: hashedPassword },
      { new: true }
    );

    res.json(APIResponse.success(null, "Password changed successfully"));
  } catch (err) {
    next(err);
  }
});

// ✅ Delete a user
router.delete("/:id", authorizeRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]), validateObjectId, handleValidationError, async (req, res, next) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, organizationId: req.organizationId });
    if (!user) {
      return next(new CustomError("User not found", 404, 'USER_NOT_FOUND'));
    }
    res.json(APIResponse.success(null, "User deleted successfully"));
  } catch (err) {
    next(err);
  }
});

module.exports = router;