const express = require("express");
const router = express.Router();
const { authorizeRole } = require("../middleware/auth");
const { USER_ROLES } = require("../utils/constants");
const analyticsController = require("../controllers/analyticsController");
const comprehensiveAnalyticsController = require("../controllers/comprehensiveAnalyticsController");
const efficiencyController = require("../controllers/efficiencyController");

// Student-scoped analytics (must be registered before admin/treasurer guard)
router.get(
  "/student",
  authorizeRole([USER_ROLES.STUDENT]),
  analyticsController.getStudentAnalytics
);

router.use(authorizeRole([USER_ROLES.ADMIN, USER_ROLES.TREASURER]));

// Basic analytics endpoints
router.get("/monthly", analyticsController.getMonthlyAnalytics);
router.get("/category", analyticsController.getCategoryAnalytics);
router.get("/department", analyticsController.getDepartmentAnalytics);

// Comprehensive analytics endpoints
router.get("/dashboard", comprehensiveAnalyticsController.getDashboardAnalytics);
router.get("/predictions", comprehensiveAnalyticsController.getBudgetPredictions);
router.get("/efficiency-metrics", efficiencyController.getEfficiencyMetrics);

module.exports = router;
