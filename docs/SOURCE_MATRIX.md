# SEIP Source-of-Truth Matrix

This matrix establishes the origin, selection rationale, and status for each functional module migrated into **SEIP (Smart Expense Intelligence Platform)** from across the `Budget` workspace (`Project`, `app`, `treasury-v2`, `Document`).

---

## 📊 Module Matrix

| Module | Selected Source | Reason | Status in SEIP |
|---|---|---|---|
| **Architecture & Spec** | `app/SEIP_DOCUMENTATION.md` & `treasury-v2/docs/` | Comprehensive specification of problem space, user personas, workflows, and modern `src/` modular layout | ✅ Integrated into `SEIP/docs/` & clean modular layout |
| **Authentication (OAuth)** | `treasury-v2/backend/src/routes/auth.js` & `config/passport.js` | Direct Google OAuth 2.0 flow without injected fake registration numbers; redirects to 5-step onboarding | ✅ Verified & Tested |
| **Authentication (Local/Legacy)** | `treasury-v2/backend/server.js` (`POST /api/login`) | Provides fallback local authentication with bcrypt verification, rate limiting, and lockout | ✅ 8/8 Tests Passing |
| **User Model** | `treasury-v2/backend/src/models/user.js` | Most complete schema: includes academic details, financial parameters, AI preferences, consent tracking, lockout counters, and avatar support | ✅ Schema Verified & Loaded |
| **Organization (Tenancy)** | `treasury-v2/backend/src/models/organization.js` & `middleware/tenant.js` | Multi-tenant organization support with safe fallback fix for legacy/single-tenant users | ✅ Fix applied; backwards compatible |
| **Wallet & Ledger** | `treasury-v2/backend/features/wallet/` + `models/wallet.js` + `models/walletLedger.js` | Dual-layer wallet ledger with atomic transactions, top-up simulation, and balance inquiry | ✅ Functional & Integrated |
| **Transactions** | `treasury-v2/backend/src/routes/transactions.js` & `models/transactions.js` | 12 expense categories, department attribution, student entry workflow, pagination, and aggregations | ✅ 13/13 Tests Passing |
| **Budget Management** | `treasury-v2/backend/src/routes/budget.js` & `models/budget.js` | Itemized expenses, approval/rejection lifecycle, email notifications, and real-time utilization virtuals | ✅ 12/12 Tests Passing |
| **Dues Management** | `treasury-v2/backend/src/routes/dues.js` & `models/dues.js` | Installment tracking, student dues listing, payment status verification, and `due.js` backward-compatibility alias | ✅ 7/7 Tests Passing |
| **Payments (UPI & Razorpay)** | `treasury-v2/backend/src/services/upiService.js` + `routes/payments.js` | Complete UPI intent/QR generation, payment submission with ref IDs, treasurer verification workflow, and email receipts | ✅ 16/16 Tests Passing |
| **Analytics Engine** | `treasury-v2/backend/src/services/comprehensiveAnalyticsService.js`, `efficiencyService.js`, `analyticsService.js` (originated in `app`) | Department spend, category breakdown, monthly run rates, operational efficiency scores, and collection tracking | ✅ Consolidated & Tested |
| **AI Integration** | `treasury-v2/backend/src/services/geminiService.js` + `routes/assistant.js` + `models/aiInsight.js` | Real Google Gemini 1.5/2.0 API service with prompt engineering, financial advisory chat, predictive risk assessment, and anomaly detection | ✅ Fully Integrated |
| **User Profile** | `treasury-v2/backend/src/services/userStudentService.js` + `routes/users.js` | Automatic bi-directional synchronization between User and Student collections, completeness scoring, and `/me` endpoint | ✅ 16/16 Tests Passing |
| **Settings** | `treasury-v2/backend/src/routes/settings.js` & `frontend/src/pages/Settings.jsx` | Student settings, contact updates, notification preferences, privacy toggles, and appearance settings | ✅ 8/8 Tests Passing |
| **Student Management** | `treasury-v2/backend/src/routes/student.js` & `models/student.js` | Complete CRUD with pagination, roll number / register number uniqueness, academic details, and dues aggregation | ✅ 10/10 Tests Passing |
| **Events Management** | `treasury-v2/backend/features/events/` & `frontend/src/pages/EventTimeline.jsx` & `ManageEvents.jsx` | Event budgeting, participant registration, student voting, and wallet-based event payments | ✅ Verified & Integrated |
| **Onboarding Flow** | `treasury-v2/frontend/src/pages/Onboarding.jsx` + `Project/client/src/components/OnboardingModal.jsx` + `Project/server/scripts/*` | 5-step wizard (Profile, Academic, Financial, AI, Consent) + modal component + CLI migration and status scripts | ✅ Complete & Verified |
| **Frontend Framework & UI** | `treasury-v2/frontend` | Modern Vite 5 + React 18 + Tailwind CSS v4 + TanStack Query + Zustand + Lucide Icons + Framer Motion | ✅ 2,865 modules transformed; 0 build errors |
| **Security & Middleware** | `treasury-v2/backend/src/middleware/` | Helmet, CORS origin whitelisting, Express rate limiting (general & login), input sanitization (`xss` + `express-mongo-sanitize`), request ID tracing | ✅ Verified & Enforced |
| **Sample Data & Tools** | `Document/` (`student.xlsx`, `user.xlsx`, `convert.js`) | Institutional sample spreadsheets and JSON converter tool | ✅ Copied to `SEIP/data/` |
