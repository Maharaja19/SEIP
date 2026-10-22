# Treasury v2 — Architecture

Audit date: 2026-08-08. Read-only snapshot of the current codebase structure and request flow.

## Monorepo layout

```
treasury-v2/
├── backend/                # Node.js + Express 5 + MongoDB (Mongoose 8)
│   ├── server.js           # App entry: middleware chain, router mounts, listen
│   ├── src/
│   │   ├── config/         # db.js, passport.js, swagger.js, swagger-docs.js
│   │   ├── routes/         # Express routers (18 files)
│   │   ├── controllers/    # Analytics, insights, prediction, reports, risk, onboarding, efficiency
│   │   ├── middleware/     # auth, tenant, validation, sanitization, monitoring, errorHandler, cache, verifyToken
│   │   ├── models/         # Mongoose models (14 files)
│   │   ├── services/       # Business logic + integrations (13 files)
│   │   ├── utils/          # apiResponse, CustomError, jwtHelper, constants, validateEnv
│   │   └── logs/           # app.log (written by errorHandler)
│   ├── features/           # Feature-module architecture
│   │   ├── events/         # Event.js, eventController.js, eventRoutes.js
│   │   ├── feedback/       # Feedback.js, feedbackController.js, feedbackRoutes.js
│   │   ├── admin/          # Log.js, adminController.js, adminRoutes.js
│   │   ├── wallet/         # walletController.js, walletRoutes.js
│   │   ├── treasurer/      # excelController.js, excelRoutes.js
│   │   └── roles/          # roleMiddleware.js (roleCheck)
│   ├── tests/              # Jest + supertest suites (legacy API surface — outdated)
│   └── scripts/            # seeding, import, index, password-hash helpers
├── frontend/               # React 18 + Vite + Tailwind v4
│   └── src/
│       ├── App.jsx         # React Router v6 route table
│       ├── pages/          # 22 page components
│       ├── components/     # layout/, ui/, Dashboard, dialogs, ProtectedRoute, GoogleCallback
│       ├── features/       # admin/, events/, feedback/, payments/, reports/, treasurer/
│       ├── context/        # AuthContext.js (wraps zustand store), theme.service.js
│       ├── store/          # useStore.js (zustand — auth state)
│       ├── hooks/          # useApi.js
│       └── utils/          # api.js (axios), authUser, authRouting, exportUtils, cn
├── ai-service/             # ⚠️ EMPTY — only empty subdirs (src/{agents,analytics,config,llm,ml,rag,utils}, tests)
├── docker/                 # ⚠️ EMPTY — mongodb/, nginx/, redis/ placeholders
├── infra/                  # ⚠️ EMPTY — kubernetes/, monitoring/, terraform/ placeholders
├── scripts/                # ⚠️ EMPTY
└── *.md                    # Audit docs from earlier phases (June 2026)
```

## Backend layers

- **Express 5** app in `server.js`; **Mongoose 8**; **JWT** (`jsonwebtoken`); **Passport** (Google OAuth20,
  sessions); **BullMQ + Redis** (queueService); **socket.io** (socketService); **node-cache/redis** (cache);
  **nodemailer** (SMTP notifications); **@google/generative-ai** (Gemini insights);
  **razorpay** (order/webhook); **swagger-ui-express** (docs); **xlsx** (Excel import);
  **helmet + express-rate-limit + express-mongo-sanitize + xss** (security).

### Request flow / middleware order (`server.js`)

1. `helmet()`
2. `cors({ origin: ALLOWED_ORIGINS split, credentials: true })`
3. `express.json({ limit: '10kb' })` + `express.urlencoded({ extended: true })`
4. `express-session` (secret = `JWT_SECRET`, cookie secure in prod) + `passport.initialize()` + `passport.session()`
5. Global `rateLimit` (window `RATE_LIMIT_WINDOW_MS`=900000ms default, max `RATE_LIMIT_MAX_REQUESTS` default **100** in code)
6. Request-ID middleware (`req.id` from `x-request-id` or generated; sets `x-request-id` header)
7. `sanitizeInputs` (xss + mongo-sanitize + custom `$`-key stripping)
8. `requestMonitor` (perf metrics)
9. Routers (see mounts in API_REFERENCE.md)
10. `errorHandler` (4-arg; logs to `src/logs/app.log`)
11. 404 JSON handler

> ⚠️ Order note: the 404 handler is registered **after** `errorHandler`. Since `errorHandler` is a
> 4-arg error middleware it doesn't intercept normal requests, but the more conventional order is
> 404-then-error.

### Route vs controller pattern

Core routes use **inline handlers** in `routes/*.js` (students, dues, transactions, users, budgets,
payments, auth, organizations, settings) rather than controllers. Dedicated **controllers** exist only
for the analytics family, prediction, reports, risk, insights, onboarding, and the feature modules
(events, feedback, wallet, admin, excel). Business logic lives partly in `services/*`.

## Services (`backend/src/services/`)

| Service | Responsibility |
|---|---|
| `analyticsService` | Student/monthly/category/department analytics |
| `comprehensiveAnalyticsService` | Dashboard analytics + budget predictions |
| `efficiencyService` | Efficiency metrics |
| `insightService` | AI insight generation (feeds `aiInsight` model) |
| `predictionService` | Spend forecasting |
| `reportsService` | Report generation |
| `riskService` (via riskController) | Financial risk score |
| `geminiService` | Gemini LLM calls (assistant, classification) |
| `notificationService` | Email/notification sending |
| `queueService` | BullMQ job queue (async notification/jobs) |
| `socketService` | Socket.io realtime |
| `razorpayService` | Razorpay order creation/verification |
| `upiService` | UPI deep-link generation (PhonePe) |
| `userStudentService` | `ensureStudentForUser`, `ensureWalletForStudent`, `logUserAccess`, `logProfileCompleteness` |

## Frontend architecture

- **State:** zustand (`store/useStore.js`) holds `user`, `token`, `isAuthenticated`, `loading`,
  `activeOrganization`. `AuthContext` is a thin wrapper exposing `login/logout/refreshUser/hasRole`.
- **HTTP:** axios instance in `utils/api.js` (`baseURL` from `VITE_API_URL` → `REACT_APP_API_URL` →
  fallback `http://localhost:5000/api`). Request interceptor injects `Bearer` token from localStorage;
  response interceptor redirects to `/login` on 401/403 (except `/auth/me`).
- **Routing (App.jsx):** React Router v6. All pages wrapped in `ProtectedRoute`; `/login` and
  `/onboarding` skip the onboarding check; `/` redirects to `/dashboard`; `*` → `/login`.
- **Routes → pages:** `/dashboard`, `/student`, `/admin`, `/treasurer`, `/dues`, `/my-transactions`,
  `/transactions`, `/collection-report`, `/mark-dues`, `/manage-students`, `/manage-dues`,
  `/monthly-report`, `/view-profile`, `/class-budget`, `/settings`, `/reports`, `/analytics`,
  `/event-timeline`, `/manage-events`, `/wallet`, `/wallet-ledger`, `/google/callback`.
- **Charts/UI:** recharts, framer-motion, lucide-react, react-hook-form, zod, tailwind-merge,
  jspdf (receipts), xlsx (export), react-toastify + react-hot-toast.

> ⚠️ **Config mismatch:** the app is built with Vite (only `VITE_*` env vars are exposed), but
> `frontend/.env.example` defines `REACT_APP_API_URL`/`REACT_APP_UPI_ID`. `utils/api.js` checks
> `import.meta.env.VITE_API_URL` first, so the frontend currently falls back to the hardcoded
> `http://localhost:5000/api` unless a `VITE_API_URL` is set.

## Integrations / external services

| Integration | Used for | Config |
|---|---|---|
| MongoDB Atlas | Persistence | `MONGO_URI` |
| Google OAuth 2.0 | Social login | `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` |
| SMTP (Gmail) | Notifications | `SMTP_HOST/PORT/USER/PASS` |
| PhonePe UPI | UPI payment links | `UPI_ID`, `UPI_MERCHANT_NAME`, `PAYMENT_PROVIDER` |
| Razorpay | Orders + webhooks | razorpay keys (in `razorpayService`) |
| Gemini (`@google/generative-ai`) | AI insights/classification | GEMINI key (in `geminiService`) |
| Redis | Queue (BullMQ) + cache | redis client config |

## Notable environment defaults

`backend/src/utils/validateEnv.js` — required: `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`. Optional defaults: `PORT=5000`,
`JWT_EXPIRES_IN=7d`, `RATE_LIMIT_WINDOW_MS=900000`, `RATE_LIMIT_MAX_REQUESTS=500` (note: `server.js`
falls back to **100** if unset — mismatch), `AUTH_RATE_LIMIT_MAX=10` (currently unused anywhere),
`MONGO_MAX_POOL_SIZE=10`, `MONGO_MIN_POOL_SIZE=5`, `ALLOWED_ORIGINS`.
