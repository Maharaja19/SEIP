# Treasury v2 — Project Status

Snapshot date: 2026-08-08.

## What exists

**Backend (functional, ~70 JS files under `backend/src` + `backend/features`):**
- Auth: JWT (email/password) + Google OAuth + deprecated password-reset aliases; onboarding flow.
- Core domains: users, students, budgets, dues, transactions, settings, organizations.
- Payments: UPI link generation (PhonePe), Razorpay orders + webhook, receipt upload.
- Analytics family: monthly/category/department/student analytics, dashboard analytics,
  predictions, efficiency metrics, risk score, insights (Gemini), reports.
- Features: events (budget vote, split payments, wallet pay), wallet + ledger, Excel import,
  audit logs, system analytics, feedback.
- Infra: BullMQ + Redis queue, socket.io, node-cache, nodemailer, swagger docs, health endpoint.
- Tests: 8 Jest+supertest suites in `backend/tests/`.

**Frontend (React 18 + Vite + Tailwind v4, ~60 files):**
- 22 pages wired in `App.jsx` behind `ProtectedRoute`; zustand auth store + axios interceptors;
  Google-callback page; UI kit (`ui/Button|Card|Input`), layout (`Layout/MainLayout/Sidebar`).

**Placeholders (empty):** `ai-service/`, `docker/`, `infra/`, `scripts/` at repo root contain only
empty subdirectories — the intended AI-service microservice and deployment manifests are not yet built.

## Feature parity (frontend ↔ backend)

| Page | Backend endpoint(s) used | Status |
|---|---|---|
| Dashboard | `/api/analytics/dashboard`, `/api/analytics/*` | ✅ wired |
| Login / Google callback | `/api/auth/login`, `/api/auth/google*` | ✅ |
| Onboarding | `/api/auth/complete-onboarding` | ✅ |
| Dues list / my-dues | `/api/dues`, `/api/dues/my-dues` | ✅ |
| Transactions / my-transactions | `/api/transactions`, `/api/transactions/me` | ✅ |
| Mark dues / manage dues | `/api/dues` POST/PUT, `/:id/verify`, `/:id/pay` | ✅ |
| Manage students | `/api/students` CRUD | ✅ |
| Collection / monthly report | `/api/dues/reports/*` | ✅ |
| Class budget | `/api/budgets*` | ✅ |
| Wallet / wallet-ledger | `/api/features/wallet/*` | ✅ |
| Events (timeline/manage) | `/api/features/events/*` | ✅ |
| Settings | `/api/settings` | ✅ |
| Analytics/Reports pages | `/api/analytics`, `/api/reports` | ✅ |
| View profile | `/api/users/me`, `PUT /api/users/me` | ✅ |

Coverage looks complete at the page level; gaps are at the API-security level (see
SECURITY_REVIEW.md) rather than missing screens.

## Known problems (from audit)

1. **Tests are stale.** `backend/tests/*.test.js` hit a legacy API surface (`GET /api/dues/:regNo`,
   `PUT /api/dues/:dueID/pay-via-upi`, `GET /api/dues/pending-verification`,
   `GET /api/transactions/user/:identifier`, `GET /api/students/:regNo`, ...). They will fail
   against current routes. The suite needs a rewrite keyed to the current route table
   (see docs/API_REFERENCE.md).
2. **Security:** secrets in `.env.example`, JWT printed in logs, unauthenticated payment routes,
   inconsistent role vocabularies, public student/profile endpoints (docs/SECURITY_REVIEW.md).
3. **Role vocabulary inconsistency** across `authorizeRole`, `USER_ROLES` constants, and `roleCheck`.
4. **Config mismatch:** frontend built with Vite but `.env.example` documents `REACT_APP_*` vars —
   `VITE_API_URL` is what actually works.
5. **Duplicate route registrations** observed in `dues.js` and `student.js`.
6. **Dead code:** duplicated auth endpoints (`/me`, `/me2`), deprecated reset aliases,
   `verifyToken.js` vs `auth.js`, stray no-op statements in `users.js` PUT /me.
7. **Empty directories** (`ai-service`, `docker`, `infra`, `scripts`) — planned work not started.

## Prior documentation (repo root, June 2026)

- Audits: `BACKEND_AUDIT.md`, `FRONTEND_AUDIT.md`, `DATABASE_AUDIT.md`, `SECURITY_AUDIT.md`,
  `CODEBASE_MAP.md`, `ARCHITECTURE_REVIEW.md`, `PERFORMANCE_REPORT.md`, `DUPLICATE_CODE_REPORT.md`,
  `HARDCODED_VALUES_REPORT.md`, `FEATURE_PARITY_REPORT.md`, `USER_FEATURES_SUMMARY.md`.
- AI-track docs: `AI_EXECUTIVE_SUMMARY.md`, `AI_IMPLEMENTATION_GUIDE.md`, `AI_ARCHITECTURE_DIAGRAMS.md`,
  `AI_READINESS_REPORT.md`, `AI_QUICK_REFERENCE.md`.
- Delivery: `DELIVERY_SUMMARY.md`, `PHASE_1_COMPLETE.md`, `MODERNIZATION_ROADMAP.md`,
  `V2_01_ARCHITECTURE_DIAGRAM.md`.

## Suggested next steps

1. **Fix tests** to match the real API (highest confidence item, unblocks CI).
2. **Security pass:** rotate secrets, purge console logging, auth-gate payments + `/me` + analytics.
3. **Normalize roles** to one enum and one guard.
4. **Env cleanup:** document `VITE_*` vars, reconcile rate-limit defaults.
5. Then resume roadmap work (AI service, docker/infra, etc.).
