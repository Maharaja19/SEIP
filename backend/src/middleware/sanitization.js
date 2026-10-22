const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

/**
 * Enhanced input sanitization middleware
 */

// Sanitize request body, query, and params
const sanitizeInputs = (req, res, next) => {
  // Manual MongoDB injection protection
  // This replaces the crashing express-mongo-sanitize library
  const sanitizeNoSQL = (input) => {
    if (input instanceof Object) {
      for (const key in input) {
        if (/^\$/.test(key)) {
          const cleanKey = key.replace(/^\$/, '_');
          input[cleanKey] = input[key];
          delete input[key];
        } else {
          sanitizeNoSQL(input[key]);
        }
      }
    }
  };

  if (req.body) sanitizeNoSQL(req.body);
  if (req.query) sanitizeNoSQL(req.query);
  if (req.params) sanitizeNoSQL(req.params);

  // Sanitize body for XSS
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize query for XSS
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  // Sanitize params for XSS
  if (req.params && typeof req.params === 'object') {
    sanitizeObject(req.params);
  }

  next();
};

// Recursively sanitize object properties
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = xss(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
};

// Sanitize specific fields only
const sanitizeFields = (...fields) => {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body[field]) {
        req.body[field] = xss(req.body[field]);
      }
      if (req.query[field]) {
        req.query[field] = xss(req.query[field]);
      }
      if (req.params[field]) {
        req.params[field] = xss(req.params[field]);
      }
    });
    next();
  };
};

module.exports = {
  sanitizeInputs,
  sanitizeFields
};