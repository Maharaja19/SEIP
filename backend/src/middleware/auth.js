// Authentication Middleware for protecting routes
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { getUserIdFromDecoded, signAuthToken } = require('../utils/jwtHelper');
const { normalizeRole } = require('../utils/roles');

// Rate limiting for authentication attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Enhanced token verification with additional security checks
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const errorMsg = req.originalUrl && req.originalUrl.endsWith('/me') ? 'User not authenticated' : 'Access token required';
    return res.status(401).json({ 
      success: false,
      error: errorMsg,
      message: 'Access token required' 
    });
  }

  try {
    // Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    const userId = getUserIdFromDecoded(decoded);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid token payload',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        error: 'ACCOUNT_DISABLED',
        message: 'Account has been disabled' 
      });
    }

    // Check if token was issued before last password change
    if (user.lastPasswordChange && decoded.iat < Math.floor(user.lastPasswordChange.getTime() / 1000)) {
      return res.status(401).json({ 
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Token expired due to password change' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false,
        error: 'Invalid or expired token',
        message: 'Invalid token' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        success: false,
        error: 'Invalid or expired token',
        message: 'Token expired' 
      });
    }
    return res.status(403).json({ 
      success: false,
      error: 'Invalid or expired token',
      message: 'Invalid or expired token'
    });
  }
};

// Enhanced role authorization with multiple role support
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required' 
      });
    }
    if (!Array.isArray(allowedRoles)) {
      allowedRoles = [allowedRoles];
    }

    const userRole = normalizeRole(req.user.role);
    const normalizedAllowed = allowedRoles.map(r => normalizeRole(r)).filter(Boolean);

    if (!userRole || !normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ 
        success: false,
        error: 'Insufficient permissions',
        message: 'Insufficient permissions' 
      });
    }
    next();
  };
};

// Generate secure random tokens
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

module.exports = {
  authenticateToken,
  authorizeRole,
  authLimiter,
  generateSecureToken,
  createSecureToken: signAuthToken,
};