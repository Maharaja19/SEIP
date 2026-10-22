/**
 * Normalize user object from /auth/me or onboarding response.
 */
export const normalizeUserFromApi = (userData) => {
  if (!userData) return null;

  const id = userData._id || userData.id;

  return {
    _id: id,
    id,
    email: userData.email,
    name: userData.name,
    role: userData.role,
    registerNumber: userData.registerNumber || null,
    rollNo: userData.rollNo || null,
    profilePicture: userData.profilePicture || userData.avatar || null,
    googleId: userData.googleId || null,
    onboardingCompleted: !!userData.onboardingCompleted,
    onboarding: userData.onboarding || null,
    settings: userData.settings || null,
    contactNo: userData.contactNo || null,
  };
};

export const clearAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
};

export const getAuthErrorMessage = (error) => {
  const code = error.response?.data?.error;
  const message = error.response?.data?.message;

  const messages = {
    USER_NOT_FOUND: 'User not found. Please sign in again.',
    INVALID_TOKEN: 'Invalid token. Please sign in again.',
    TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
    ACCESS_TOKEN_REQUIRED: 'Authentication required. Please sign in.',
    ACCOUNT_DISABLED: 'Your account has been disabled.',
  };

  if (code && messages[code]) return messages[code];
  if (message) return message;
  return error.message || 'Authentication failed';
};
