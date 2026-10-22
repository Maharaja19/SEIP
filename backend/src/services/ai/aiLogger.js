/**
 * Dedicated operational logger for SEIP AI Layer.
 * Sanitizes and redacts all sensitive tokens, credentials, and raw financial secrets.
 */

const REDACTED_KEYS = ["password", "token", "jwt", "apikey", "secret", "authorization", "cookie"];

function sanitizeMetadata(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeMetadata);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (REDACTED_KEYS.some(bad => lowerKey.includes(bad))) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeMetadata(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

const aiLogger = {
  info(operation, { provider, model, latencyMs, organizationId, userId, tokens, details } = {}) {
    if (process.env.NODE_ENV === "test" && !process.env.DEBUG_AI) return;

    const logEntry = {
      level: "INFO",
      timestamp: new Date().toISOString(),
      component: "SEIP_AI",
      operation,
      provider: provider || "unknown",
      model: model || "unknown",
      latencyMs: latencyMs !== undefined ? latencyMs : null,
      organizationId: organizationId ? String(organizationId) : undefined,
      userId: userId ? String(userId) : undefined,
      tokens: tokens || undefined,
      details: sanitizeMetadata(details)
    };

    console.log(`[AI_LOG] ${JSON.stringify(logEntry)}`);
  },

  warn(operation, message, { provider, model, organizationId, userId, details } = {}) {
    if (process.env.NODE_ENV === "test" && !process.env.DEBUG_AI) return;

    const logEntry = {
      level: "WARN",
      timestamp: new Date().toISOString(),
      component: "SEIP_AI",
      operation,
      message,
      provider: provider || "unknown",
      model: model || "unknown",
      organizationId: organizationId ? String(organizationId) : undefined,
      userId: userId ? String(userId) : undefined,
      details: sanitizeMetadata(details)
    };

    console.warn(`[AI_WARN] ${JSON.stringify(logEntry)}`);
  },

  error(operation, error, { provider, model, latencyMs, organizationId, userId, details } = {}) {
    const logEntry = {
      level: "ERROR",
      timestamp: new Date().toISOString(),
      component: "SEIP_AI",
      operation,
      errorMessage: error?.message || String(error),
      errorCode: error?.code || "AI_ERROR",
      provider: provider || "unknown",
      model: model || "unknown",
      latencyMs: latencyMs !== undefined ? latencyMs : null,
      organizationId: organizationId ? String(organizationId) : undefined,
      userId: userId ? String(userId) : undefined,
      details: sanitizeMetadata(details)
    };

    console.error(`[AI_ERROR] ${JSON.stringify(logEntry)}`);
  }
};

module.exports = aiLogger;
