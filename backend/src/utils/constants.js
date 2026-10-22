/**
 * Application constants
 * Centralized constants for the application
 */

const USER_ROLES = {
  ADMIN: 'Organization Admin',
  TREASURER: 'Finance Manager',
  STUDENT: 'Member',
  SUPER_ADMIN: 'Super Admin'
};

const BUDGET_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const DUE_STATUS = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  PENDING_VERIFICATION: 'Pending Verification'
};

const PAYMENT_METHODS = {
  UPI: 'UPI',
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer'
};

const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense'
};

const TRANSACTION_CATEGORIES = {
  DUES: 'dues',
  BUDGET: 'budget',
  FOOD: 'food',
  TRANSPORT: 'transport',
  BOOKS: 'books',
  ENTERTAINMENT: 'entertainment',
  SHOPPING: 'shopping',
  HEALTH: 'health',
  EDUCATION: 'education',
  MISC: 'misc'
};

const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_KEY_ERROR: 'DUPLICATE_KEY_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  BUDGET_NOT_FOUND: 'BUDGET_NOT_FOUND',
  DUE_NOT_FOUND: 'DUE_NOT_FOUND',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND'
};

module.exports = {
  USER_ROLES,
  BUDGET_STATUS,
  DUE_STATUS,
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
  TRANSACTION_CATEGORIES,
  ERROR_CODES
};

