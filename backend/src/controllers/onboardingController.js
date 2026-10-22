const User = require('../models/user');

const { signAuthToken, formatUserForClient } = require('../utils/jwtHelper');
const {
  ensureStudentForUser,
  ensureWalletForStudent,
  ensureWalletForUser,
  logProfileCompleteness,
} = require('../services/userStudentService');



const IDENTIFIER_PATTERN = /^[A-Za-z0-9_./-]{2,30}$/;

exports.completeOnboarding = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (user.onboardingCompleted) {
      return res.status(400).json({
        success: false,
        error: 'ONBOARDING_COMPLETE',
        message: 'Onboarding has already been completed',
      });
    }

    const {
      registerNumber,
      branch,
      batch,
      year,
      hasWallet,
      monthlyIncome,
      monthlyExpense,
      savingsGoal,
      spendingCategories,
      aiPreferences,
      termsAccepted,
      privacyAccepted,
      analyticsConsent,
    } = req.body || {};

    const trimmedIdentifier = registerNumber ? String(registerNumber).trim() : '';

    if (trimmedIdentifier && !IDENTIFIER_PATTERN.test(trimmedIdentifier)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REGISTER_NUMBER',
        message: 'Identifier must be 2-30 alphanumeric characters (e.g. 23CS101, EMP-1042, STU-2026-009)',
      });
    }



    if (typeof hasWallet !== 'boolean') {

      return res.status(400).json({

        success: false,

        error: 'VALIDATION_ERROR',

        message: 'Wallet preference (hasWallet) is required',

      });

    }



    if (!Array.isArray(spendingCategories) || spendingCategories.length === 0) {

      return res.status(400).json({

        success: false,

        error: 'VALIDATION_ERROR',

        message: 'At least one spending category is required',

      });

    }



    if (!termsAccepted || !privacyAccepted || !analyticsConsent) {

      return res.status(400).json({

        success: false,

        error: 'CONSENT_REQUIRED',

        message: 'All consent checkboxes must be accepted',

      });

    }



    const normalizedRegNo = trimmedIdentifier ? trimmedIdentifier.toUpperCase() : null;

    if (normalizedRegNo) {
      const existingUser = await User.findOne({
        registerNumber: normalizedRegNo,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'REGISTER_NUMBER_EXISTS',
          message: 'Register number / Member ID already exists',
        });
      }
    }

    user.registerNumber = normalizedRegNo;

    user.onboarding = {
      academic: {
        branch: (branch || 'General').trim(),
        batch: (batch || 'General').trim(),
        year: (year || 'Member').trim(),
      },
      financial: {
        hasWallet: !!hasWallet,
        monthlyIncome: Number(monthlyIncome) || 0,
        monthlyExpense: Number(monthlyExpense) || 0,
        savingsGoal: Number(savingsGoal) || 0,
        emergencyFundTarget: user.onboarding?.financial?.emergencyFundTarget || 0,
      },
      preferences: {
        spendingCategories,
        aiPreferences: {
          insights: aiPreferences?.insights !== false,
          forecasting: aiPreferences?.forecasting !== false,
          recommendations: aiPreferences?.recommendations !== false,
        },
      },
      consent: {
        termsAccepted: true,
        privacyAccepted: true,
        analyticsConsent: true,
        acceptedAt: new Date(),
      },
    };

    user.onboardingCompleted = true;

    await user.save();

    logProfileCompleteness(user);

    const student = await ensureStudentForUser(user);
    if (student) {
      await ensureWalletForStudent(student);
    } else {
      await ensureWalletForUser(user);
    }

    console.log(
      'Onboarding completed for:',
      user.email,
      'registerNumber:',
      user.registerNumber
    );

    const token = signAuthToken(user);

    const userObj = user.toObject();

    delete userObj.password;

    delete userObj.passwordResetToken;

    delete userObj.passwordResetExpires;



    return res.status(200).json({

      success: true,

      message: 'Onboarding completed',

      user: formatUserForClient(user),

      token,

    });

  } catch (err) {

    if (err.code === 11000) {

      return res.status(400).json({

        success: false,

        error: 'REGISTER_NUMBER_EXISTS',

        message: 'Register number already exists',

      });

    }

    console.error('Onboarding error:', err.message, err.stack);

    next(err);

  }

};

