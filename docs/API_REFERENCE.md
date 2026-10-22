# Treasury v2 — API Reference

Complete endpoint inventory extracted from the backend route files (audit date: 2026-08-08).
All routes are mounted from `backend/server.js`. The server runs on `PORT` (default 5000).

- Base URL (dev): `http://localhost:5000`
- Swagger UI: `GET /api-docs` (generated from `backend/src/config/swagger.js`)
- Health: `GET /health`

## Conventions

- **Auth:** `Authorization: Bearer <token>` header. JWT signed with `JWT_SECRET`, expiry `JWT_EXPIRES_IN` (default `7d`).
- **Token storage (frontend):** `localStorage` keys `token` and `user`.
- **Response envelope:** `APIResponse.success(data, message?, statusCode?)` →
  `{ success: true, data, message }`; paginated → `{ success: true, items, pagination, message, resource }`.
- **Errors:** `CustomError(message, statusCode, code)` → `{ success: false, error: <code>, message }`.
  Handled by `backend/src/middleware/errorHandler.js`, which also appends to `backend/src/logs/app.log`.
- **Global middleware (all requests):** helmet, CORS, `express.json({limit:'10kb'})`, urlencoded,
  express-session, passport (session), global rate-limit, request-ID, sanitization (`xss` +
  `express-mongo-sanitize` + custom `$`-key stripping), request monitor.
- **Auth middleware:**
  - `authenticateToken` — verifies Bearer JWT and loads the `User` from DB.
  - `authorizeRole([...roles])` — must follow `authenticateToken` where used; compares `req.user.role`.
  - `verifyToken` — alternative JWT verifier in `backend/src/middleware/verifyToken.js` (single export).
  - `tenantContext` — sets `req.organizationId` (used on assistant + receipts).
  - `roleCheck([...roles])` — feature-module middleware (lowercase role names) in `features/roles/roleMiddleware.js`.

> ⚠️ **Role-name inconsistency:** core routes use `['Treasurer','Admin','Student']`, the
> `constants.js` `USER_ROLES` map uses `'Finance Manager'` / `'Organization Admin'` / `'Member'`,
> and feature `roleCheck` uses lowercase `'treasurer'`/`'admin'`/`'student'`. The User model enum
> contains all variants. Role-gated access is therefore inconsistent and should be verified against
> how roles are actually stored.

## Router mounts (`server.js`)

| Mount | File |
|---|---|
| `/api/auth`, `/api/login` | `src/routes/auth.js` |
| `/api/users` | `src/routes/users.js` |
| `/api/students` | `src/routes/student.js` |
| `/api/budgets` | `src/routes/budget.js` |
| `/api/dues` | `src/routes/dues.js` |
| `/api/transactions` | `src/routes/transactions.js` |
| `/api/settings` | `src/routes/settings.js` |
| `/api/payments` | `src/routes/payments.js` |
| `/api/analytics` | `src/routes/analytics.js` |
| `/api/insights` | `src/routes/insights.js` |
| `/api/prediction` | `src/routes/prediction.js` |
| `/api/reports` | `src/routes/reports.js` |
| `/api/risk` | `src/routes/risk.js` |
| `/api/organizations` | `src/routes/organizations.js` |
| `/api/assistant` | `src/routes/assistant.js` |
| `/api/receipts` | `src/routes/receipts.js` |
| `/api/features/events` | `features/events/eventRoutes.js` |
| `/api/features/excel` | `features/treasurer/excelRoutes.js` |
| `/api/features/admin` | `features/admin/adminRoutes.js` |
| `/api/features/feedback` | `features/feedback/feedbackRoutes.js` |
| `/api/features/wallet` | `features/wallet/walletRoutes.js` |
| `/api/razorpay` | `src/routes/razorpay.js` |
| `/api/password-reset`, `/api/password/reset` | `src/routes/passwordReset.js` |
| `/health` | `src/routes/health.js` |

---

## Auth — `src/routes/auth.js` (mount: `/api/auth`, `/api/login`)

| Method | Path | Middleware | Handler / purpose |
|---|---|---|---|
| GET | `/google` | `passport.authenticate('google', {scope:['profile','email']})` | Start Google OAuth login |
| GET | `/google/callback` | passport callback | Exchange code; on success `res.redirect(FRONTEND_URL + '/google/callback?token=<jwt>')` |
| POST | `/login` | — | Email+password login → `{ token, user }`. Checks `bcrypt` password; fails on missing `user.password` |
| POST | `/logout` | `authenticateToken` | Stateless logout (client clears storage) |
| GET | `/me` | `authenticateToken` | Current user via `formatUserForClient(user)`. Contains dead `User.findOne({_id}).populate('onboardingPlan')` call (no such path on User) |
| GET | `/me2` | `authenticateToken` | Same as `/me` (duplicate endpoint) |
| POST | `/complete-onboarding` | `authenticateToken` | Delegates to `onboardingController.completeOnboarding` |
| POST | `/refresh` | — | Stateless JWT refresh: verifies body `refreshToken`, re-issues token |
| POST | `/password/reset/request` | — | Deprecated alias → `passwordReset.requestReset` |
| POST | `/password/reset/confirm` | — | Deprecated alias → `passwordReset.confirmReset` |

## Users — `src/routes/users.js` (mount: `/api/users`)

| Method | Path | Middleware | Handler / purpose |
|---|---|---|---|
| POST | `/` | `authorizeRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN])` | Create user (`new User(req.body)`); duplicate-key → 400 |
| GET | `/` | `authorizeRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN])` | List all users (no pagination) |
| GET | `/me` | — (relies on `req.user` set upstream? — **no `authenticateToken` on this route**) | Self profile; populates `organizationId`; auto-creates Student+Wallet for Student role |
| PUT | `/me` | — (no `authenticateToken`) | Update profile; validates phone (`^[6-9]\d{9}$`) and register number (GCT format `^[0-9]{6}[A-Za-z]{4}[0-9]{3}$`); syncs to Student record. Contains stray no-op statements (`user.dob;`, `student.emburse;`) |
| PUT | `/:id` | `authorizeRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN])` | Update user |
| DELETE | `/:id` | `authorizeRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN])` | Delete user |

> ⚠️ `GET /me` and `PUT /me` have **no auth middleware** in the file — they rely on `req.user` being
> populated. Verify whether `authenticateToken` is applied router-level (it is not, per file contents).

## Students — `src/routes/student.js` (mount: `/api/students`)

| Method | Path | Middleware | Handler / purpose |
|---|---|---|---|
| POST | `/` | `authorizeRole(['Treasurer','Admin'])` | Create student; duplicate-key → 400 |
| GET | `/` | `authorizeRole(['Treasurer','Admin'])` | Paginated list (`page`, `limit`), populated `user` + `organization` |
| GET | `/me` | `authorizeRole(['Treasurer','Admin'])` | Self-student record (role guard looks inverted) |
| GET | `/profile` | **none** | Student profile (public) |
| GET | `/me/dues` | — | Current student's dues |
| GET | `/me/wallet` | — | Current student's wallet |
| GET | `/:id` | `authorizeRole` + `validateObjectId` | Get student by `_id` |
| GET | `/by-regno/:regNo` | `authorizeRole` | Get student by register number |
| PUT | `/:id` | `authorizeRole` | Update student |
| DELETE | `/:id` | `authorizeRole` | Delete student |

> ⚠️ Duplicate/conflicting route registrations were observed while auditing this file
> (repeated `router.get('/')` blocks). Re-verify exact route table before relying on it.

## Budgets — `src/routes/budget.js` (mount: `/api/budgets`)

| Method | Path | Middleware | Handler / purpose |
|---|---|---|---|
| GET | `/` | — | List budgets |
| GET | `/current` | — | Current/active budget |
| GET | `/:id` | — | Get budget by id |
| GET | `/:id/get-expenses` | — | Expenses for a budget |
| POST | `/` | `authorizeRole(['Treasurer','Admin'])`, `validateBudget` | Create budget |
| PUT | `/:id` | `authorizeRole(['Treasurer','Admin'])` | Update budget |
| DELETE | `/:id` | `authorizeRole(['Treasurer','Admin'])` | Delete budget |
| POST | `/:id/approve` | `authorizeRole(['Treasurer','Admin'])` | Approve/reject budget |
| POST | `/:id/expense` | `authorizeRole(['Treasurer','Admin'])`, `validateExpense` | Record expense against budget |

## Dues — `src/routes/dues.js` (mount: `/api/dues`)

| Method | Path | Middleware | Handler / purpose |
|---|---|---|---|
| GET | `/` | `authorizeRole(['Treasurer','Admin'])`, `validateSearchQuery` | Paginated dues list |
| GET | `/pending` | `authorizeRole(['Treasurer','Admin'])` | Pending dues (`Unpaid`/`pending`) |
| GET | `/department` | `authorizeRole(['Treasurer','Admin'])` | Dues grouped by department |
| GET | `/reports/collection-report` | `authorizeRole(['Treasurer','Admin'])` | Collection totals (collected vs total) |
| GET | `/reports/monthly-report` | `authorizeRole(['Treasurer','Admin'])` | Monthly collection report |
| GET | `/my-dues` | `authenticateToken` | Student's own dues |
| GET | `/:id` | `authorizeRole` + `validateObjectId` | Get due by id |
| POST | `/` | `authorizeRole` + `validateDueCreation` | Create due |
| POST | `/:id/verify` | `authorizeRole` | Mark verified/paid + create income transaction |
| POST | `/:id/pay` | `authorizeRole` | Mark paid directly (no verification) |
| POST | `/:id/pending` | `authorizeRole` | Revert to pending |
| POST | `/:id/notify` | `authorizeRole` | Send payment-reminder notification |
| PUT | `/:id` | `authorizeRole` | Update due |
| DELETE | `/:id` | `authorizeRole` | Delete due |

> ⚠️ A second `router.get('/reports/collection-report', ...)` registration was observed at line ~73
> (duplicate route). Verify and remove.

## Transactions — `src/routes/transactions.js` (mount: `/api/transactions`)

| Method | Path | Middleware | Handler / purpose |
|---|---|---|---|
| GET | `/` | `authorizeRole(['Treasurer','Admin'])`, `validateSearchQuery` | Paginated transactions |
| GET | `/me` | — (relies on `req.user`) | Current user's transactions |
| GET | `/summary` | `authorizeRole(['Treasurer','Admin'])` | Summary stats |
| GET | `/:id` | `authorizeRole` + `validateObjectId` | Get transaction |
| POST | `/` | `authorizeRole` + `validateTransaction` | Create transaction (income/expense) |
| PUT | `/:id` | `authorizeRole` | Update transaction |
| DELETE | `/:id` | `authorizeRole` | Delete transaction |

## Settings — `src/routes/settings.js` (mount: `/api/settings`)

| Method | Path | Middleware | Handler / purpose |
|---|---|---|---|
| GET | `/` | — | Get settings |
| PUT | `/` | — | Update settings |

## Organizations — `src/routes/organizations.js` (mount: `/api/organizations`)

| Method | Path | Middleware | Handler / purpose |
|---|---|---|---|
| POST | `/` | `authenticateToken` | Create organization |
| GET | `/` | `authenticateToken` | List organizations |
| GET | `/me` | `authenticateToken` | Current user's organization |
| PUT | `/:id` | `authenticateToken` | Update organization |
| GET | `/:id/members` | `authenticateToken` | Organization members |

## Payments — `src/routes/payments.js` (mount: `/api/payments`)

| Method | Path | Middleware | Handler / purpose |
|---|---|---|---|
| POST | `/generate-upi-link` | **none** | Validate `{amount, dueId, studentRegNo}`; amount must match `due.amount`; returns UPI link. **Logs request body + Authorization header to console (security issue)** |
| POST | `/submit-upi-payment` | **none** | Submit UPI payment |
| POST | `/verify-payment` | **none** | Verify submitted payment |
| POST | `/razorpay/create-order` | **none** | Create Razorpay order |
| POST | `/razorpay/verify-payment` | **none** | Verify Razorpay payment |

> ⚠️ **No authentication on any payment route** — anyone can generate links, create orders, and call
> verify endpoints.

## Analytics / Insights / Prediction / Reports / Risk

| Method | Path (mount) | Middleware | Purpose |
|---|---|---|---|
| GET | `/api/analytics/student` | `authorizeRole([USER_ROLES.STUDENT])` | Student analytics |
| GET | `/api/analytics/monthly` | — | Monthly analytics |
| GET | `/api/analytics/category` | — | Category analytics |
| GET | `/api/analytics/department` | — | Department analytics |
| GET | `/api/analytics/dashboard` | — | Dashboard analytics (comprehensive) |
| GET | `/api/analytics/predictions` | — | Budget predictions (comprehensive) |
| GET | `/api/analytics/efficiency-metrics` | — | Efficiency metrics |
| GET | `/api/insights/` | `authorizeRole([ADMIN, TREASURER, STUDENT])` | AI insights |
| GET | `/api/prediction/` | `authorizeRole([ADMIN, TREASURER, STUDENT])` | Spend predictions |
| GET | `/api/reports/` | `authorizeRole([ADMIN, TREASURER, STUDENT])` | Reports |
| GET | `/api/risk/score` | `authorizeRole([ADMIN, TREASURER, STUDENT])` | Financial risk score |

## AI Assistant — `src/routes/assistant.js` (mount: `/api/assistant`)

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| POST | `/chat` | `authenticateToken`, `tenantContext` | Chat with Gemini-based assistant |

## Receipts — `src/routes/receipts.js` (mount: `/api/receipts`)

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| POST | `/upload` | `authenticateToken`, `tenantContext`, `upload.single('receipt')` | Upload payment screenshot (multer) |

## Razorpay — `src/routes/razorpay.js` (mount: `/api/razorpay`)

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| POST | `/webhook` | — | Razorpay webhook (raw body handling required) |
| POST | `/simulate-success` | — | Dev/testing: simulate a successful payment |

## Password reset — `src/routes/passwordReset.js` (mounts: `/api/password-reset`, `/api/password/reset`)

| Method | Path | Middleware | Purpose |
|---|---|---|---|
| POST | `/request` | — | Request password reset (email) |
| POST | `/confirm` | — | Confirm reset with token |

## Feature modules

### Events — `/api/features/events`
| Method | Path | Middleware | Purpose |
|---|---|---|---|
| POST | `/` | `roleCheck(['Treasurer','Admin'])` | Create event |
| GET | `/` | — | List events |
| POST | `/:id/vote` | `roleCheck(['Student'])` | Vote on event budget |
| POST | `/:id/execute` | `roleCheck(['Treasurer','Admin'])` | Execute event payments (split mode) |
| POST | `/:id/pay-from-wallet` | `roleCheck(['Student'])` | Pay event share from wallet |
| GET | `/:id/leaderboard` | — | Leaderboard |
| POST | `/:id/remind-voting` | `roleCheck(['Treasurer','Admin'])` | Remind students to vote |
| POST | `/:id/remind-payment` | `roleCheck(['Treasurer','Admin'])` | Remind students to pay |

### Excel import — `/api/features/excel`
| Method | Path | Middleware | Purpose |
|---|---|---|---|
| POST | `/upload` | `roleCheck(['treasurer','admin'])`, `upload.single('file')` | Import students from Excel (`xlsx`) |

### Admin — `/api/features/admin`
| Method | Path | Middleware | Purpose |
|---|---|---|---|
| GET | `/logs` | `roleCheck(['admin'])` | Audit logs |
| GET | `/analytics` | `roleCheck(['admin'])` | System analytics |

### Feedback — `/api/features/feedback`
| Method | Path | Middleware | Purpose |
|---|---|---|---|
| POST | `/` | `roleCheck(['student'])` | Submit event feedback |
| GET | `/:eventId` | `roleCheck(['student','treasurer','admin'])` | Feedback for event |

### Wallet — `/api/features/wallet`
| Method | Path | Middleware | Purpose |
|---|---|---|---|
| GET | `/balance` | — | Wallet balance |
| GET | `/ledger` | — | Wallet ledger entries |
| POST | `/topup` | `roleCheck(['Student'])` | Top up wallet |

---

## Notes

- **Auth on `/api/users/me` and `/api/transactions/me`:** these rely on `req.user` but do not declare
  `authenticateToken`. If no router-level guard exists, they return 401/500 — verify.
- **Tests (`backend/tests/*.test.js`)** reference an older API surface (e.g. `GET /api/dues/:regNo`,
  `PUT /api/dues/:dueID/pay-via-upi`, `GET /api/dues/pending-verification`,
  `GET /api/transactions/user/:identifier`, `GET /api/students/:regNo`) that no longer matches the
  current routes — the suite will fail against current code and needs a rewrite.
