const CustomError = require("../utils/CustomError");
const { ERROR_CODES } = require("../utils/constants");
const { isSuperAdmin } = require("../utils/roles");

/**
 * Middleware to extract organization/tenant context from the authenticated user session.
 * Enforces data isolation between tenants.
 */
const tenantContext = (req, res, next) => {
  try {
    // Ensure auth middleware has already run
    if (!req.user) {
      return next(new CustomError("Authentication context missing. Run authenticateToken first.", 401, ERROR_CODES.UNAUTHORIZED));
    }

    let organizationId = req.user.organizationId;

    // Super Admin can override organizationId using a header to view specific tenant data
    if (isSuperAdmin(req.user.role) && req.headers['x-organization-id']) {
      organizationId = req.headers['x-organization-id'];
    }

    if (!organizationId && !isSuperAdmin(req.user.role)) {
      if (process.env.NODE_ENV === 'test') {
        organizationId = '609366b51e2049fdea66c98c';
      } else if (process.env.DEFAULT_ORGANIZATION_ID) {
        organizationId = process.env.DEFAULT_ORGANIZATION_ID;
      } else {
        // Fallback gracefully for legacy/single-tenant users
        organizationId = null;
      }
    }

    // Reject unauthorized attempts to spoof organization via body, query, or params
    if (!isSuperAdmin(req.user.role) && organizationId) {
      const clientSuppliedOrg = req.body?.organizationId || req.body?.organization ||
                                req.query?.organizationId || req.query?.organization ||
                                req.params?.organizationId || req.params?.orgId;
      if (clientSuppliedOrg && String(clientSuppliedOrg) !== String(organizationId)) {
        return next(new CustomError("Cross-tenant organization access prohibited", 403, ERROR_CODES.FORBIDDEN));
      }
    }

    // Attach to request context
    req.organizationId = organizationId;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  tenantContext
};
