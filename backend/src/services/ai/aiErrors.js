/**
 * Standardized error classes for SEIP AI Layer.
 * Ensures caller code can distinguish AI infrastructure failures from business logic errors.
 */

class AIError extends Error {
  constructor(message, code = "AI_ERROR", status = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.statusCode = status;
    this.errorCode = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class AIConfigurationError extends AIError {
  constructor(message = "AI provider is not configured or disabled") {
    super(message, "AI_CONFIG_ERROR", 503);
  }
}

class AIProviderError extends AIError {
  constructor(message = "AI provider encountered an error", originalError = null) {
    super(message, "AI_PROVIDER_ERROR", 502, originalError ? { originalMessage: originalError.message } : null);
  }
}

class AIRateLimitError extends AIError {
  constructor(message = "AI request rate limit exceeded or quota exhausted") {
    super(message, "AI_RATE_LIMIT_ERROR", 429);
  }
}

class AITimeoutError extends AIError {
  constructor(message = "AI request timed out", timeoutMs = 10000) {
    super(message, "AI_TIMEOUT_ERROR", 504, { timeoutMs });
  }
}

class AIValidationError extends AIError {
  constructor(message = "AI response failed structured schema validation", validationErrors = null) {
    super(message, "AI_VALIDATION_ERROR", 502, { validationErrors });
  }
}

class AIRequestSizeError extends AIError {
  constructor(message = "AI prompt or payload exceeded maximum allowable size", maxSize = 4000) {
    super(message, "AI_PAYLOAD_TOO_LARGE", 413, { maxSize });
  }
}

module.exports = {
  AIError,
  AIConfigurationError,
  AIProviderError,
  AIRateLimitError,
  AITimeoutError,
  AIValidationError,
  AIRequestSizeError
};
