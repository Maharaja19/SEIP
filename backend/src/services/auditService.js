const AuditLog = require("../models/auditLog");

/**
 * Log a financial or administrative audit event.
 * Non-blocking: failures to log do not interrupt primary transactions.
 */
async function logAudit({
  action,
  entityType = "OTHER",
  entityId,
  organization,
  performedBy,
  details = {},
  req
}) {
  try {
    const orgId = organization || req?.organizationId || req?.user?.organizationId || null;
    const actorId = performedBy || req?.user?._id || null;
    const ip = req?.ip || req?.connection?.remoteAddress || null;
    const ua = req?.headers ? req.headers["user-agent"] : null;

    return await AuditLog.create({
      action,
      entityType,
      entityId,
      organization: orgId,
      performedBy: actorId,
      details,
      ipAddress: ip,
      userAgent: ua
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Audit logging warning:", error.message);
    }
    return null;
  }
}

module.exports = {
  logAudit
};
