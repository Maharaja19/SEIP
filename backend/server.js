// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Validate environment variables before proceeding
const validateEnv = require("./src/utils/validateEnv");
validateEnv();

const swaggerSpec = require('./src/config/swagger');
const swaggerUi = require('swagger-ui-express');

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const passport = require("passport");
require("./src/config/passport");

// Models
const User = require("./src/models/user");

// Routes
const studentRoutes = require("./src/routes/student");
const budgetRoutes = require("./src/routes/budget");
const duesRoutes = require("./src/routes/dues");
const transactionRoutes = require("./src/routes/transactions");
const userRoutes = require("./src/routes/users");
const settingsRoutes = require("./src/routes/settings");
const paymentRoutes = require("./src/routes/payments");
// const databaseRoutes = require("./routes/database"); // Not implemented
const authRoutes = require("./src/routes/auth");
const analyticsRoutes = require("./src/routes/analytics");
const insightsRoutes = require("./src/routes/insights");
const predictionRoutes = require("./src/routes/prediction");
const reportsRoutes = require("./src/routes/reports");
const riskRoutes = require("./src/routes/risk");
const organizationRoutes = require("./src/routes/organizations");
const memberRoutes = require("./src/routes/members");
const categoryRoutes = require("./src/routes/categories");
const assistantRoutes = require("./src/routes/assistant");
const receiptRoutes = require("./src/routes/receipts");
const aiRoutes = require("./src/routes/ai");

// Feature routes (events/excel/audit/feedback)
const eventFeatureRoutes = require("./features/events/eventRoutes");
const excelFeatureRoutes = require("./features/treasurer/excelRoutes");
const adminFeatureRoutes = require("./features/admin/adminRoutes");
const feedbackFeatureRoutes = require("./features/feedback/feedbackRoutes");
const walletFeatureRoutes = require("./features/wallet/walletRoutes");
// Password reset disabled - Google OAuth is the only login method
// const passwordResetRoutes = require("./routes/passwordReset");

// Database connection
const connectDB = require("./src/config/db");

// Import caching middleware
const { cacheMiddleware } = require('./src/middleware/cache');

// Import sanitization middleware
const { sanitizeInputs } = require('./src/middleware/sanitization');

const session = require('express-session');
const app = express();

// Security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'seip-session-secret-change-me',
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting - Global (applied to all routes)
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
});

// Apply rate limiting to all API routes
app.use("/api", generalLimiter);

// Rate limiting - Login endpoints (stricter limits)
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Debug middleware to log all requests (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ✅ Connect to MongoDB (skip in test environment as tests configure their own connection)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Import middleware
const { authenticateToken } = require('./src/middleware/auth');
const { tenantContext } = require('./src/middleware/tenant');
const { errorHandler, notFound, requestLogger } = require('./src/middleware/errorHandler');
const { performanceMonitor, requestIdMiddleware, healthCheck, metricsEndpoint } = require('./src/middleware/monitoring');

// Request logging and monitoring middleware
app.use(requestIdMiddleware);
app.use(performanceMonitor);
app.use(requestLogger);
// Input sanitization middleware
app.use(sanitizeInputs);
// Caching middleware for GET requests (temporarily disabled)
// app.get("/api/*", cacheMiddleware);

// Routes with authentication
app.use("/api/organizations", authenticateToken, organizationRoutes);
app.use("/api/members", authenticateToken, tenantContext, memberRoutes);
app.use("/api/categories", authenticateToken, tenantContext, categoryRoutes);
app.use("/api/wallet", authenticateToken, tenantContext, walletFeatureRoutes);
app.use("/api/assistant", authenticateToken, tenantContext, assistantRoutes);
app.use("/api/receipts", authenticateToken, tenantContext, receiptRoutes);
app.use("/api/ai", authenticateToken, tenantContext, aiRoutes);

app.use("/api/students", authenticateToken, tenantContext, studentRoutes);
app.use("/api/budgets", authenticateToken, tenantContext, budgetRoutes);
app.use("/api/budget", authenticateToken, tenantContext, budgetRoutes);
app.use("/api/dues", authenticateToken, tenantContext, duesRoutes);
app.use("/api/transactions", authenticateToken, tenantContext, transactionRoutes);
app.use("/api/users", authenticateToken, tenantContext, userRoutes);
app.use("/api/settings", authenticateToken, settingsRoutes);
app.use("/api/payments", authenticateToken, tenantContext, paymentRoutes);
app.use("/api/analytics", authenticateToken, tenantContext, analyticsRoutes);
app.use("/api/insights", authenticateToken, tenantContext, insightsRoutes);
app.use("/api/prediction", authenticateToken, tenantContext, predictionRoutes);
app.use("/api/reports", authenticateToken, tenantContext, reportsRoutes);
app.use("/api/risk", authenticateToken, tenantContext, riskRoutes);
// app.use("/api/razorpay", razorpayRoutes); // Disabled for UPI-only mode

// Feature routes (mounted under /api/features/*)
app.use("/api/features/events", authenticateToken, tenantContext, eventFeatureRoutes);
app.use("/api/features/excel", authenticateToken, tenantContext, excelFeatureRoutes);
app.use("/api/features/admin", authenticateToken, tenantContext, adminFeatureRoutes);
app.use("/api/features/feedback", authenticateToken, tenantContext, feedbackFeatureRoutes);
app.use("/api/features/wallet", authenticateToken, tenantContext, walletFeatureRoutes);

// Auth routes (no authentication required)
app.use("/api/auth", authRoutes);

// Local login route for backward compatibility with legacy tests
app.post("/api/login", loginLimiter, async (req, res, next) => {
  try {
    const { role, registerNumber, dob, password } = req.body;

    if (!role || !registerNumber || !dob || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const user = await User.findOne({ registerNumber, role });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isLocked()) {
      return res.status(429).json({
        success: false,
        message: 'Account is locked. Please try again later.'
      });
    }

    // Check DOB
    const inputDob = new Date(dob);
    const userDob = new Date(user.dob);
    if (isNaN(inputDob.getTime()) || inputDob.toDateString() !== userDob.toDateString()) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Wrong DOB'
      });
    }

    // Check Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Wrong password'
      });
    }

    // Reset login attempts on success
    await user.resetLoginAttempts();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role, organizationId: user.organizationId },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '1h' }
    );

    // Format user for client (excluding password)
    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      token,
      user: userObj
    });
  } catch (error) {
    next(error);
  }
});

// Default route
app.get("/", (req, res) => {
  res.send("✅ Server is running");
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Simple health check (returns immediately without metrics)
app.get("/api/health", (req, res) => {
  console.log('✅ Simple health endpoint called');
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check with metrics (for advanced monitoring)
app.get("/api/health/detailed", healthCheck);

// System metrics endpoint  
app.get("/api/metrics", metricsEndpoint);

const http = require("http");
const socketService = require("./src/services/socketService");

const server = http.createServer(app);
socketService.init(server);

// Start server
const PORT = process.env.PORT || 5000;

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
} else {
  console.log(`ℹ️ Test environment detected - server listener bypassed`);
}

module.exports = app;