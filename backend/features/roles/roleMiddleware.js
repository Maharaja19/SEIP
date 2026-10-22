const { normalizeRole } = require("../../src/utils/roles");

const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    // Prevent overriding existing auth logic. We assume the auth middleware
    // has correctly set req.user and req.user.role before this is called.
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Unauthorized: User role not found' });
    }

    // Compare roles case-insensitively AND alias-insensitively so both
    // canonical (`Member`) and legacy (`Student`) roles are honored.
    const userRole = normalizeRole(req.user.role);
    const normalizedAllowedRoles = (allowedRoles || []).map(normalizeRole);

    if (!userRole || !normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient role permissions' });
    }

    next();
  };
};

module.exports = { roleCheck };
