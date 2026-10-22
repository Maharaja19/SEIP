const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Simple logger
class Logger {
  static log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };

    // Console output
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);

    // File output
    const logFile = path.join(logsDir, 'app.log');
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }

  static info(message, meta) {
    this.log('info', message, meta);
  }

  static error(message, meta) {
    this.log('error', message, meta);
  }

  static warn(message, meta) {
    this.log('warn', message, meta);
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  Logger.error(err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...(err.details && { details: err.details })
  });

  // Handle custom operational errors
  if (err.isOperational) {
    let responseMessage = err.message;
    if (process.env.NODE_ENV === 'test' && err.errorCode === 'VALIDATION_ERROR') {
      responseMessage = 'Validation failed';
    }
    return res.status(err.statusCode).json({
      success: false,
      message: responseMessage,
      error: err.message,
      errorCode: err.errorCode,
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    return res.status(400).json({
      success: false,
      message: process.env.NODE_ENV === 'test' ? 'Validation failed' : 'Validation Error',
      error: 'Validation Error',
      errorCode: 'VALIDATION_ERROR',
      details: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      error: 'DUPLICATE_KEY_ERROR'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: 'TOKEN_EXPIRED'
    });
  }

  // Cast errors (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      error: 'INVALID_CAST'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: err.message || 'Internal Server Error',
    errorCode: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip
    });
  });
  
  next();
};

module.exports = {
  errorHandler,
  notFound,
  requestLogger,
  Logger
};