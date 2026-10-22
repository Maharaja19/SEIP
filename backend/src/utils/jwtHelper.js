const jwt = require('jsonwebtoken');

/**
 * Standard JWT payload — single source of truth for auth tokens.
 */
const createAuthTokenPayload = (user) => ({
  id: user._id.toString(),
  email: user.email,
  role: user.role,
  name: user.name || user.email,
  registerNumber: user.registerNumber || null,
  onboardingCompleted: !!user.onboardingCompleted,
});

const signAuthToken = (user) =>
  jwt.sign(createAuthTokenPayload(user), process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Resolve user id from decoded JWT (supports legacy claim names).
 */
const getUserIdFromDecoded = (decoded) => {
  if (!decoded) return null;
  const id = decoded.id || decoded._id || decoded.userId;
  return id ? String(id) : null;
};

/**
 * Consistent user shape for API responses.
 */
const formatUserForClient = (user) => ({
  _id: user._id,
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  registerNumber: user.registerNumber || null,
  rollNo: user.rollNo || null,
  contactNo: user.contactNo || null,
  profilePicture: user.profilePicture || user.avatar || null,
  avatar: user.avatar || user.profilePicture || null,
  googleId: user.googleId || null,
  onboardingCompleted: !!user.onboardingCompleted,
  onboarding: user.onboarding || null,
  settings: user.settings || null,
  createdAt: user.createdAt || null,
});

module.exports = {
  createAuthTokenPayload,
  signAuthToken,
  getUserIdFromDecoded,
  formatUserForClient,
};
