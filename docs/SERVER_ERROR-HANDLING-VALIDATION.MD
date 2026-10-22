# Error Handling and Validation Documentation

## Overview

This document explains the enhanced error handling and validation system implemented in the application. The system provides consistent, informative error responses and robust input validation to improve security and user experience.

## Error Handling Architecture

### Custom Error Class

A custom error class `CustomError` is used to create operational errors with additional metadata:

```javascript
class CustomError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
  }
}
```

### Global Error Handler

The global error handler in [server/middleware/errorHandler.js](file:///c%3A/Users/mmaha/Budget/Project/server/middleware/errorHandler.js) catches all errors and formats them consistently:

```javascript
const errorHandler = (err, req, res, next) => {
  // Handle custom operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errorCode && { error: err.errorCode }),
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
  
  // Handle various error types (Mongoose, JWT, etc.)
  // ...
}
```

### API Response Utility

The [APIResponse](file:///c%3A/Users/mmaha/Budget/Project/server/utils/apiResponse.js#L7-L32) utility provides standardized response formats:

```javascript
class APIResponse {
  static success(data = null, message = 'Success', statusCode = 200) {
    return {
      success: true,
      message,
      ...(data !== null && { data }),
      statusCode
    };
  }

  static error(message = 'An error occurred', statusCode = 500, errorCode = null, details = null) {
    // ...
  }

  static paginated(data, pagination, message = 'Success') {
    // ...
  }
}
```

## Validation System

### Express Validator Integration

The application uses [express-validator](https://express-validator.github.io/) for input validation with enhanced middleware:

```javascript
const { body, validationResult, param, query } = require('express-validator');

// Example validation rules
const validateStudentRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name must contain only letters and spaces'),
  body('registerNumber')
    .matches(/^[0-9]{13}$/)
    .withMessage('Register number must be 13 digits'),
  // ...
];
```

### Validation Error Handling

Validation errors are formatted consistently:

```javascript
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors for better client consumption
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: formattedErrors
    });
  }
  next();
};
```

## Input Sanitization

### MongoDB Injection Protection

Uses `express-mongo-sanitize` to prevent MongoDB injection attacks:

```javascript
const mongoSanitize = require('express-mongo-sanitize');
const sanitizeInput = mongoSanitize();
```

### XSS Protection

Uses the `xss` library to sanitize user inputs:

```javascript
const xss = require('xss');

const sanitizeInputs = (req, res, next) => {
  // Apply MongoDB injection protection
  mongoSanitize({ replaceWith: '_' })(req, res, next);
  
  // Sanitize body, query, and params
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  // ...
};
```

## Error Response Format

All error responses follow a consistent format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": {
    // Additional error details when applicable
  }
}
```

### Example Error Responses

1. Validation Error:
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address",
      "value": "invalid-email"
    }
  ]
}
```

2. Authentication Error:
```json
{
  "success": false,
  "message": "Invalid token",
  "error": "INVALID_TOKEN"
}
```

3. Resource Not Found:
```json
{
  "success": false,
  "message": "Student not found",
  "error": "STUDENT_NOT_FOUND"
}
```

## Implementation Examples

### Route with Validation

```javascript
router.post("/", validateStudentRegistration, handleValidationError, async (req, res, next) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json(APIResponse.success(student, "Student created successfully", 201));
  } catch (err) {
    // Handle specific errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return next(new CustomError(`${field} already exists`, 400, 'DUPLICATE_KEY_ERROR'));
    }
    next(err);
  }
});
```

### Error Throwing

```javascript
if (!student) {
  return next(new CustomError("Student not found", 404, 'STUDENT_NOT_FOUND'));
}
```

## Best Practices

1. Always use validation middleware for user inputs
2. Handle specific error types appropriately
3. Provide meaningful error messages for developers and users
4. Use consistent error response formats
5. Log errors for monitoring and debugging
6. Sanitize all user inputs to prevent injection attacks
7. Use appropriate HTTP status codes
8. Include error codes for client-side handling

## HTTP Status Codes

| Code | Description           | Usage                              |
|------|-----------------------|------------------------------------|
| 200  | OK                    | Successful GET, PUT requests       |
| 201  | Created               | Successful POST requests           |
| 400  | Bad Request           | Validation errors, malformed data  |
| 401  | Unauthorized          | Authentication failures            |
| 403  | Forbidden             | Insufficient permissions           |
| 404  | Not Found             | Resource not found                 |
| 500  | Internal Server Error | Unexpected server errors           |

This enhanced error handling and validation system ensures that the application provides consistent, secure, and informative responses to all client requests.