/**
 * Canonical role definitions and normalization for SEIP.
 *
 * Single source of truth for platform roles.
 * Canonical Roles:
 * 1. Member
 * 2. Finance Manager
 * 3. Organization Admin
 * 4. Super Admin
 *
 * Backward-compatible mappings:
 * Student -> Member
 * Treasurer -> Finance Manager
 * Admin -> Organization Admin
 * Super Admin -> Super Admin
 */

const USER_ROLES = {
  // Canonical Primary Roles
  MEMBER: 'Member',
  FINANCE_MANAGER: 'Finance Manager',
  ORGANIZATION_ADMIN: 'Organization Admin',
  SUPER_ADMIN: 'Super Admin',

  // Backward-Compatible Property Aliases
  ADMIN: 'Organization Admin',
  TREASURER: 'Finance Manager',
  STUDENT: 'Member'
};

const LEGACY_ROLE_ALIASES = {
  'admin': USER_ROLES.ORGANIZATION_ADMIN,
  'organization admin': USER_ROLES.ORGANIZATION_ADMIN,
  'treasurer': USER_ROLES.FINANCE_MANAGER,
  'finance manager': USER_ROLES.FINANCE_MANAGER,
  'student': USER_ROLES.MEMBER,
  'member': USER_ROLES.MEMBER,
  'super admin': USER_ROLES.SUPER_ADMIN
};

/**
 * Normalize any role string to its canonical form.
 * Returns null for unknown roles.
 */
const normalizeRole = (role) => {
  const key = String(role || '').trim().toLowerCase();
  return LEGACY_ROLE_ALIASES[key] || null;
};

/**
 * Case/alias-insensitive check: does the user's role match any of the allowed roles?
 */
const roleMatches = (userRole, allowedRoles) => {
  const normalized = normalizeRole(userRole);
  if (!normalized) return false;
  const allowed = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map(normalizeRole);
  return allowed.includes(normalized);
};

// Canonical Role Checkers
const isMember = (role) => roleMatches(role, USER_ROLES.MEMBER);
const isFinanceManager = (role) => roleMatches(role, USER_ROLES.FINANCE_MANAGER);
const isOrgAdmin = (role) => roleMatches(role, [USER_ROLES.ORGANIZATION_ADMIN, USER_ROLES.SUPER_ADMIN]);
const isSuperAdmin = (role) => roleMatches(role, USER_ROLES.SUPER_ADMIN);

// Backward-Compatible Checkers
const isStudent = isMember;
const isTreasurer = isFinanceManager;
const isAdmin = isOrgAdmin;
const isAdminOrTreasurer = (role) => roleMatches(role, [
  USER_ROLES.ORGANIZATION_ADMIN,
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.FINANCE_MANAGER
]);

module.exports = {
  USER_ROLES,
  LEGACY_ROLE_ALIASES,
  normalizeRole,
  roleMatches,
  isMember,
  isFinanceManager,
  isOrgAdmin,
  isSuperAdmin,
  // Backward compatibility exports
  isStudent,
  isTreasurer,
  isAdmin,
  isAdminOrTreasurer
};
