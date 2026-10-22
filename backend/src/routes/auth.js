const express = require('express');

const passport = require('passport');

const { authenticateToken } = require('../middleware/auth');

const onboardingController = require('../controllers/onboardingController');

const { signAuthToken, formatUserForClient } = require('../utils/jwtHelper');
const {
  logProfileCompleteness,
  ensureStudentForUser,
  ensureWalletForStudent,
} = require('../services/userStudentService');
const { isStudent } = require('../utils/roles');



const router = express.Router();



// Google OAuth login route

router.get(

  '/google',

  passport.authenticate('google', {

    scope: ['profile', 'email'],

  })

);



// Google OAuth callback route

router.get(

  '/google/callback',

  (req, res, next) => {

    passport.authenticate('google', (err, user, info) => {

      if (err) {

        console.error('Google OAuth error:', err.message, err.stack);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const redirectUrl = `${frontendUrl}/login?error=true&message=${encodeURIComponent(

          'Google authentication failed: ' + (err.message || 'Unknown error')

        )}`;

        return res.redirect(redirectUrl);

      }



      if (!user) {

        console.error('Google OAuth failed — no user returned:', info);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const message = info?.message || 'Google authentication failed';

        const redirectUrl = `${frontendUrl}/login?error=true&message=${encodeURIComponent(message)}`;

        return res.redirect(redirectUrl);

      }



      req.user = user;

      next();

    })(req, res, next);

  },

  async (req, res) => {

    try {

      if (!req.user) {

        console.error('No user object in request after Google authentication');

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const redirectUrl = `${frontendUrl}/login?error=true&message=${encodeURIComponent(

          'User not found after authentication'

        )}`;

        return res.redirect(redirectUrl);

      }



      console.log('Google OAuth success — issuing JWT for authenticated user');



      const token = signAuthToken(req.user);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      const redirectUrl = `${frontendUrl}/auth/google/callback?token=${token}`;

      res.redirect(redirectUrl);

    } catch (error) {

      console.error('Google OAuth callback error:', error.message, error.stack);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      const redirectUrl = `${frontendUrl}/login?error=true&message=${encodeURIComponent(

        'Internal server error during authentication: ' + error.message

      )}`;

      res.redirect(redirectUrl);

    }

  }

);



// Google OAuth logout route

router.get('/google/logout', (req, res) => {

  res.status(200).json({

    success: true,

    message: 'Logged out successfully',

  });

});



// Get current authenticated user (single source of truth after OAuth)

router.get('/me', authenticateToken, async (req, res) => {

  try {

    logProfileCompleteness(req.user);

    if (isStudent(req.user.role) && req.user.onboardingCompleted && req.user.registerNumber) {
      try {
        const student = await ensureStudentForUser(req.user);
        if (student) await ensureWalletForStudent(student);
      } catch (syncErr) {
        console.warn('[AUTH/ME] Student sync failed:', syncErr.message);
      }
    }

    res.json({

      success: true,

      user: formatUserForClient(req.user),

    });

  } catch (error) {

    console.error('Error in GET /auth/me:', error.message);

    res.status(500).json({ success: false, message: 'Failed to fetch user profile' });

  }

});



// Complete onboarding — protected route

router.post('/onboarding', authenticateToken, onboardingController.completeOnboarding);



module.exports = router;

