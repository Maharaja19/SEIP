const express = require('express');
const router = express.Router();
const APIResponse = require('../utils/apiResponse');
const CustomError = require('../utils/CustomError');
const { formatUserForClient } = require('../utils/jwtHelper');
const { logUserAccess, ensureStudentForUser } = require('../services/userStudentService');
const { isStudent } = require('../utils/roles');
const Student = require('../models/student');
const User = require('../models/user');

const defaultSettings = () => ({
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    dueReminders: true,
    budgetAlerts: true,
  },
  privacy: {
    profileVisibility: 'public',
    showTransactions: false,
    showEmail: true,
  },
  appearance: {
    theme: 'system',
  },
});

// GET current user settings + profile fields
router.get('/', async (req, res, next) => {
  try {
    logUserAccess(req, 'settings.get');
    const user = req.user;
    if (!user) return next(new CustomError('User not authenticated', 401, 'UNAUTHORIZED'));

    res.json(
      APIResponse.success({
        profile: formatUserForClient(user),
        settings: user.settings || defaultSettings(),
      })
    );
  } catch (err) {
    next(err);
  }
});

// UPDATE settings + editable profile fields
router.put('/', async (req, res, next) => {
  try {
    logUserAccess(req, 'settings.update');
    const user = req.user;
    if (!user) return next(new CustomError('User not authenticated', 401, 'UNAUTHORIZED'));

    const { name, contactNo, branch, batch, year, notifications, privacy, appearance } =
      req.body || {};

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

    if (!user.settings) user.settings = defaultSettings();
    if (notifications) {
      user.settings.notifications = { ...user.settings.notifications, ...notifications };
    }
    if (privacy) {
      user.settings.privacy = { ...user.settings.privacy, ...privacy };
    }
    if (appearance) {
      user.settings.appearance = { ...user.settings.appearance, ...appearance };
    }

    await user.save();

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

    res.json(
      APIResponse.success(
        {
          profile: formatUserForClient(user),
          settings: user.settings,
        },
        'Settings updated successfully'
      )
    );
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});

// GET settings by register number (for legacy test compatibility)
router.get('/:regNo', async (req, res, next) => {
  try {
    const student = await Student.findOne({ registerNumber: req.params.regNo });
    if (!student) {
      return next(new CustomError('Student not found', 404, 'STUDENT_NOT_FOUND'));
    }

    // Ownership guard: only the matching user, or an admin/treasurer, may read.
    // Returns 404 (not 403) to avoid disclosing whether the student exists.
    const { isAdminOrTreasurer } = require('../utils/roles');
    const isOwner = req.user?.registerNumber === req.params.regNo;
    if (!isOwner && !isAdminOrTreasurer(req.user?.role)) {
      return next(new CustomError('Student not found', 404, 'STUDENT_NOT_FOUND'));
    }

    res.json(APIResponse.success(student));
  } catch (err) {
    next(err);
  }
});

// UPDATE settings by register number (for legacy test compatibility)
router.put('/:regNo', async (req, res, next) => {
  try {
    const student = await Student.findOne({ registerNumber: req.params.regNo });
    if (!student) {
      return next(new CustomError('Student not found', 404, 'STUDENT_NOT_FOUND'));
    }

    // Ownership guard: only the matching user, or an admin/treasurer, may update
    const { isAdminOrTreasurer } = require('../utils/roles');
    const isOwner = req.user?.registerNumber === req.params.regNo;
    if (!isOwner && !isAdminOrTreasurer(req.user?.role)) {
      return next(new CustomError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS'));
    }

    const allowedFields = [
      'community', 'firstGraduate', 'quota', 'religion', 'cgpa', 'address', 'phoneNumber'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (req.body.contactNo !== undefined) {
      updates.contactNo = req.body.contactNo;
      updates.phoneNumber = req.body.contactNo; // Sync
    }

    const updatedStudent = await Student.findOneAndUpdate(
      { registerNumber: req.params.regNo },
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json(APIResponse.success(updatedStudent, 'Student updated successfully'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
