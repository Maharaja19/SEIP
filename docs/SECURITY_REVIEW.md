# Treasury v2 — Security Review

Findings from the 2026-08-08 code audit. Read-only; no fixes applied.

## Summary

The codebase has solid baseline protections (helmet, CORS, rate limiting, body-size limit, XSS +
NoSQL sanitization, bcrypt, JWT) but contains several credential-exposure and authorization issues
that should be addressed before any production deployment.

---

## Findings

### CRITICAL

#### C1. Real secrets committed in `backend/.env.example`
`backend/.env.example` (and `backend/.env`) contain live-looking credentials:
- MongoDB Atlas URI with username/password
- `JWT_SECRET` (long hex string)
- Google OAuth `GOOGLE_CLIENT_SECRET`
- SMTP app password for `m.maharaja1964@gmail.com`
- UPI ID / merchant details

`.env.example` should contain **placeholders only** (e.g. `JWT_SECRET=change-me`). If this repo has
ever been shared/pushed, rotate all of the above. Also confirm the real `.env` files are gitignored.

#### C2. Authorization header (JWT) printed to console
`backend/src/routes/payments.js:26`
```js
console.log("Authorization header:", req.headers.authorization);
```
Also logs full request bodies (lines 23–25). If logs are captured anywhere, JWTs and PII leak.
Remove these log lines.

#### C3. Payment endpoints have no authentication
`backend/src/routes/payments.js` — none of
`POST /generate-upi-link`, `POST /submit-upi-payment`, `POST /verify-payment`,
`POST /razorpay/create-order`, `POST /razorpay/verify-payment`
apply `authenticateToken` or any role guard. Anyone who can reach the API can:
- generate UPI payment links for any due/student,
- create Razorpay orders,
- call verify endpoints (payment-verification bypass risk).

### HIGH

#### H1. Public student data endpoints
`backend/src/routes/student.js` — `GET /profile` (and possibly `/me/dues`, `/me/wallet`) have no
auth middleware, exposing student profile, dues, and wallet data without authentication.

#### H2. Inconsistent authorization role names
Three different role vocabularies are in use:
- `authorizeRole(['Treasurer','Admin'])` — core routes (mixed-case)
- `USER_ROLES` constants → `'Organization Admin' / 'Finance Manager' / 'Member' / 'Super Admin'`
- `roleCheck(['treasurer','admin','student'])` — feature routes (lowercase)

`User.role` enum contains **both** vocabularies. Whether a request passes depends on how roles are
actually stored in the DB. This is a privilege-boundary ambiguity: an account stored as `Treasurer`
passes `authorizeRole(['Treasurer','Admin'])` but would be rejected by `roleCheck(['treasurer'])` and
vice-versa. Centralize role checks on a single normalized value.

#### H3. `GET /me` and `PUT /me` rely on `req.user` without declaring auth middleware
`backend/src/routes/users.js` and `transactions.js` `/me` handlers read `req.user` but the route
declarations do not include `authenticateToken`. If no upstream guard populates `req.user`, these
either 401 or crash; if some router-level guard is intended, it is missing. Also
`GET /api/students/me` is guarded with `authorizeRole(['Treasurer','Admin'])` — an inverted guard
for a "me" endpoint.

### MEDIUM

#### M1. `JWT_SECRET` reused as express-session secret
`server.js`: `expressSession({ secret: process.env.JWT_SECRET, ... })`. Session and token signing
share one secret; if either leaks, both are compromised. Use a dedicated `SESSION_SECRET`.

#### M2. No trust proxy / login-specific throttling
- Global rate limit uses default `max: 100` per 15 min in `server.js`, while `validateEnv` defaults
  `RATE_LIMIT_MAX_REQUESTS` to **500** — mismatch means behavior depends on env setup.
- `AUTH_RATE_LIMIT_MAX=10` exists in defaults but is **never referenced** — login has no
  stricter/throttling beyond the global limiter, despite `failedLoginAttempts`/`lockUntil` fields
  on the User model (no enforcement code found).

#### M3. Login handler lacks protection against empty/missing password edge cases
`auth.js /login` checks `passwordMatches || !user.password` after `bcrypt.compare` — accounts created
without a password (Google-only) can never log in with password (by design) but the branching is
confusing; ensure null-password accounts are explicitly handled, not just incidentally rejected.

#### M4. Error handler may log sensitive data
`backend/src/middleware/errorHandler.js` writes entries (including request details and stack traces)
to `backend/src/logs/app.log`. Ensure logs are rotated, access-controlled, and never shipped with the
repo (check `.gitignore`).

#### M5. Duplicate route registrations
Observed in `dues.js` (`/reports/collection-report` appears twice) and `student.js` (repeated
`router.get('/')` blocks). Duplicates shadow handlers and can mask auth differences; verify and
deduplicate.

### LOW

- **L1.** `GET /api/analytics/monthly|categoría|department|dashboard|predictions|efficiency-metrics`
  declare no auth/role middleware (only `/student` has a role check) — analytics may be readable
  without auth depending on handler behavior.
- **L2.** Frontend relies on `localStorage` for `token`/`user` (XSS-exposable); the custom XSS
  sanitizer mitigates server-side, but consider httpOnly cookies for stronger protection.
- **L3.** `/api/razorpay/simulate-success` is a dev/testing endpoint with no guard — remove or gate
  behind `NODE_ENV !== 'production'`.
- **L4.** Passport `require('./config/passport')` + session middleware enabled but the API uses
  bearer JWT — the session layer is largely dead surface area.
- **L5.** `express.json({ limit: '10kb' })` is good, but `express.urlencoded` has no explicit limit
  (defaults to 100kb) — align both.

---

## What is in place (positive controls)

- `helmet()` with defaults.
- CORS restricted to `ALLOWED_ORIGINS` (default `http://localhost:3000`), `credentials: true`.
- Global rate limiter (15-min window).
- Body size cap (10kb JSON).
- `xss` + `express-mongo-sanitize` + custom `$`-key stripping applied to all requests.
- bcrypt (12 rounds default in env) for passwords.
- JWT with 7-day expiry; `authenticateToken` re-loads user from DB per request.
- `validateEnv` fails fast on missing required env vars (outside test).
- Swagger UI exposed at `/api-docs` (consider disabling in production).

## Recommended remediation order

1. Rotate all leaked secrets; replace `.env.example` values with placeholders.
2. Remove console logging of request bodies / Authorization header in `payments.js`.
3. Add `authenticateToken` (and role checks) to all `/api/payments/*` and unguarded `/me`,
   `/profile`, `/me/dues`, `/me/wallet`, and analytics routes.
4. Normalize role vocabulary to a single source of truth and update all guards.
5. Add login-specific rate limiting (`AUTH_RATE_LIMIT_MAX`) + account lockout enforcement.
6. Use dedicated `SESSION_SECRET`; set `trust proxy` if behind a reverse proxy.
7. Remove/disable `simulate-success` in production.
