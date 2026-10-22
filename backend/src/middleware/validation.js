const { body, validationResult, param, query, oneOf, check } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const CustomError = require('../utils/CustomError');

// Apply MongoDB injection protection
const sanitizeInput = mongoSanitize();

// Common validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    const formattedErrors = errors.array().map(error => ({
      field: error.param || error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: process.env.NODE_ENV === 'test' ? 'Validation failed' : `Validation failed: ${errorMessages.join(', ')}`,
      error: errorMessages.join(', '),
      errorCode: 'VALIDATION_ERROR',
      details: formattedErrors
    });
  }
  next();
};

// Enhanced error handler for validation
const handleValidationError = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return next(new CustomError(
      `Validation failed: ${errorMessages.join(', ')}`,
      400,
      'VALIDATION_ERROR',
      errors.array()
    ));
  }
  next();
};

// UPI Payment validation
const validateUPIPayment = [
  body('amount')
    .isFloat({ min: 0.01, max: 100000 })
    .withMessage('Amount must be a number between 0.01 and 100000')
    .toFloat(),
  body('transactionRef')
    .notEmpty()
    .withMessage('Transaction reference is required')
    .isLength({ min: 10, max: 50 })
    .withMessage('Transaction reference must be 10-50 characters')
    .trim()
    .escape(),
  body('paymentMethod')
    .isIn(['UPI', 'Cash', 'Bank Transfer'])
    .withMessage('Invalid payment method'),
  body('upiTransactionId')
    .optional()
    .isLength({ min: 5, max: 100 })
    .withMessage('UPI transaction ID must be 5-100 characters')
    .trim()
    .escape(),
  handleValidationErrors
];

// Due creation validation
const validateDueCreation = [
  body('studentRegNo')
    .notEmpty()
    .withMessage('Student register number is required')
    .matches(/^(?:[0-9]{6}[A-Za-z]{4}[0-9]{3}|[0-9]{13}|[A-Za-z0-9_-]{3,20})$/)
    .withMessage('Invalid register number format'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Reason must be 3-100 characters')
    .trim()
    .escape(),
  body('dueDate')
    .isISO8601()
    .withMessage('Invalid due date format (must be ISO8601)'),
  body('dueID')
    .optional()
    .isNumeric()
    .withMessage('Due ID must be numeric'),
  handleValidationErrors
];

// Budget validation
const validateBudget = [
  body('total_budget')
    .isFloat({ min: 0 })
    .withMessage('Total budget must be a positive number')
    .toFloat(),
  body('expenses')
    .isArray({ min: 1 })
    .withMessage('Expenses must be an array with at least one item'),
  body('expenses.*.item')
    .notEmpty()
    .withMessage('Expense item name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Expense item name must be 1-100 characters')
    .trim()
    .escape(),
  body('expenses.*.amount')
    .isFloat({ min: 0 })
    .withMessage('Expense amount must be a positive number')
    .toFloat(),
  body('expenses.*.category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Expense category must be less than 50 characters')
    .trim()
    .escape(),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('role')
    .isIn(['Student', 'Treasurer', 'Admin', 'Member', 'Finance Manager', 'Organization Admin'])
    .withMessage('Invalid role. Must be Student, Member, Treasurer, Finance Manager, Admin, or Organization Admin'),
  body('registerNumber')
    .optional()
    .matches(/^[A-Z0-9]{1,20}$/)
    .withMessage('Invalid register number format (alphanumeric, 1-20 characters)'),
  body('rollNo')
    .optional()
    .matches(/^[A-Z0-9]{1,10}$/)
    .withMessage('Invalid roll number format (alphanumeric, 1-10 characters)'),
  body('dob')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Date of birth must be in ISO8601 format (YYYY-MM-DD)'),
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be 6-100 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  handleValidationErrors
];

// Student registration validation
const validateStudentRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name must contain only letters and spaces'),
  body('registerNumber')
    .matches(/^(?:[0-9]{6}[A-Za-z]{4}[0-9]{3}|[0-9]{13}|[A-Za-z0-9_-]{3,20})$/)
    .withMessage('Invalid register number format'),
  body('contactNo')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid mobile number (must start with 6-9 and be 10 digits)'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('dob')
    .isISO8601()
    .withMessage('Date of birth must be in ISO8601 format (YYYY-MM-DD)'),
  body('gender')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('department')
    .isLength({ max: 10 })
    .withMessage('Department must be less than 10 characters')
    .trim()
    .escape(),
  body('year')
    .isLength({ max: 10 })
    .withMessage('Year must be less than 10 characters')
    .trim()
    .escape(),
  handleValidationErrors
];

// Transaction validation
const validateTransaction = [
  body('amount')
    .optional()
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between 0.01 and 1,000,000')
    .toFloat(),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Description must be 3-200 characters')
    .escape(),
  body('type')
    .optional()
    .isIn(['income', 'expense', 'payment', 'refund', 'fine', 'transfer'])
    .withMessage('Invalid transaction type. Must be income, expense, payment, refund, fine, or transfer'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 60 })
    .withMessage('Category must be between 1 and 60 characters')
    .escape(),
  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter currency code (e.g. INR, USD)'),
  body('department')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be 2-100 characters')
    .trim()
    .escape(),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO format'),
  body('paymentMethod')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Payment method must be less than 50 characters')
    .trim()
    .escape(),
  handleValidationErrors
];

// ID parameter validation
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format. Must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

// Multiple ID validation
const validateMultipleObjectIds = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format. Must be a valid MongoDB ObjectId'),
  query('ids')
    .optional()
    .isArray()
    .withMessage('IDs must be an array'),
  query('ids.*')
    .optional()
    .isMongoId()
    .withMessage('Each ID must be a valid MongoDB ObjectId'),
  handleValidationErrors
];

// Search query validation
const validateSearchQuery = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query too long (max 100 characters)')
    .escape(),
  query('sortBy')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Sort by field name too long')
    .trim()
    .escape(),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  handleValidationErrors
];

// Partial update validation for budgets (all fields optional)
const validateBudgetUpdate = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be 1-200 characters')
    .trim()
    .escape(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('total_budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total budget must be a positive number')
    .toFloat(),
  body('expenses')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Expenses must be an array with at least one item'),
  body('expenses.*.item')
    .optional()
    .notEmpty()
    .withMessage('Expense item name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Expense item name must be 1-100 characters')
    .trim()
    .escape(),
  body('expenses.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Expense amount must be a positive number')
    .toFloat(),
  body('expenses.*.category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Expense category must be less than 50 characters')
    .trim()
    .escape(),
  handleValidationErrors
];

module.exports = {
  validateUPIPayment,
  validateDueCreation,
  validateBudget,
  validateBudgetUpdate,
  validateLogin,
  validateStudentRegistration,
  validateTransaction,
  validateObjectId,
  validateMultipleObjectIds,
  validateSearchQuery,
  sanitizeInput,
  handleValidationErrors,
  handleValidationError
};