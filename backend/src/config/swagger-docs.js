/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Financial analytics and insights dashboard
 */

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get comprehensive analytics dashboard
 *     description: Returns financial metrics, spending trends, budget utilization, and category breakdown
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     financialSummary:
 *                       type: object
 *                     spendingTrends:
 *                       type: array
 *                     categoryBreakdown:
 *                       type: array
 *                     budgetUtilization:
 *                       type: object
 *       403:
 *         description: Access denied - Admin or Treasurer role required
 */

/**
 * @swagger
 * /api/analytics/predictions:
 *   get:
 *     summary: Get budget predictions and forecasts
 *     description: AI-powered budget forecasting based on historical data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget predictions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     nextMonthPrediction:
 *                       type: object
 *                     confidence:
 *                       type: number
 *                     recommendations:
 *                       type: array
 */

/**
 * @swagger
 * /api/analytics/efficiency-metrics:
 *   get:
 *     summary: Get operational efficiency metrics
 *     description: Collection rates, processing times, and performance indicators
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Efficiency metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization
 */

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     description: Redirects to Google for authentication
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     description: Processes OAuth response and returns JWT token
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Student management operations
 */

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Get all students
 *     description: Retrieve list of all registered students with pagination
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of students
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Create new student
 *     description: Register a new student in the system
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               registerNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Validation error
 */

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Payment transaction management
 */

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions
 *     description: Retrieve transaction history with filtering options
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: Filter by transaction type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, verified, rejected]
 *         description: Filter by verification status
 *     responses:
 *       200:
 *         description: Transaction list
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/transactions/{id}/verify:
 *   post:
 *     summary: Verify a transaction
 *     description: Mark a pending transaction as verified (Admin/Treasurer only)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction verified
 *       403:
 *         description: Access denied
 */

/**
 * @swagger
 * tags:
 *   name: Dues
 *   description: Due payment tracking
 */

/**
 * @swagger
 * /api/dues:
 *   get:
 *     summary: Get all dues
 *     description: Retrieve outstanding and paid dues
 *     tags: [Dues]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of dues
 */

/**
 * @swagger
 * tags:
 *   name: Budget
 *   description: Budget planning and management
 */

/**
 * @swagger
 * /api/budget:
 *   get:
 *     summary: Get current budget
 *     description: Retrieve budget allocation and utilization
 *     tags: [Budget]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget information
 */

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: System health monitoring
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Simple health check
 *     description: Returns server status without detailed metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Detailed health check with metrics
 *     description: Returns comprehensive system metrics including memory, CPU, database stats
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health metrics
 *       503:
 *         description: Service unhealthy
 */
