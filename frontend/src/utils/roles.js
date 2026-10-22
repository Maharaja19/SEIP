// Frontend canonical role helpers.
// Mirrors backend/src/utils/roles.js so legacy role names still work.

const ROLE_ALIASES = {
  admin: "Organization Admin",
  "organization admin": "Organization Admin",
  treasurer: "Finance Manager",
  "finance manager": "Finance Manager",
  student: "Member",
  member: "Member",
  "super admin": "Super Admin",
};

export const normalizeRole = (role) =>
  ROLE_ALIASES[String(role || "").trim().toLowerCase()] || null;

export const isStudent = (role) => normalizeRole(role) === "Member";
export const isAdmin = (role) =>
  normalizeRole(role) === "Organization Admin" || normalizeRole(role) === "Super Admin";
export const isTreasurer = (role) => normalizeRole(role) === "Finance Manager";
export const isSuperAdmin = (role) => normalizeRole(role) === "Super Admin";
export const isAdminOrTreasurer = (role) =>
  isAdmin(role) || isTreasurer(role);
