# SEIP Core Architecture Audit

**Document Version:** 1.0.0  
**Date:** October 5, 2026  
**Workspace:** `C:\Users\mmaha\Projects\Budget\SEIP`  
**Purpose:** Comprehensive architectural inventory of SEIP baseline prior to Core Product Foundation implementation.

---

## 1. Architectural Overview

SEIP (Smart Expense Intelligence Platform) is built as a decoupled full-stack platform:
- **Backend:** Node.js (v18+) with Express 5.1, Mongoose 8.18 (MongoDB), Jest for automated testing.
- **Frontend:** React 18, Vite 5.4, Tailwind CSS, Framer Motion, Lucide React, Axios, React Router v6.
- **Multi-Tenancy:** Single shared database with logical tenant context isolation (`organizationId`) injected into request contexts via `tenant.js` middleware based on verified JWT session claims.
- **Authentication:** Dual-mode auth with local JWT (email/password) and Google OAuth2 (`google-auth-library`), with bcrypt-based password hashing.

---

## 2. Inventory of Existing Models

| Model | File Path | Current Role / Responsibility | Reuse vs. Refactor Status |
| :--- | :--- | :--- | :--- |
| `Organization` | `backend/src/models/organization.js` | Tenant container with `name`, `type`, `settings`, `createdBy`, `subscriptionPlan`. | **Refactor:** Expand to first-class tenant with legal name, contact info, timezone, currency, address, and universal types (`INDIVIDUAL`, `STUDENT_GROUP`, `CLUB`, `NGO`, `STARTUP`, `SMALL_BUSINESS`, `ASSOCIATION`, `OTHER`). |
| `User` | `backend/src/models/user.js` | Core identity containing auth credentials, roles, profile, onboarding preferences, and `organizationId`. | **Reuse & Expand:** Already supports canonical roles (`Member`, `Finance Manager`, `Organization Admin`, `Super Admin`). |
| `Membership` | *New Model Needed* | Represents a user's formal membership in an organization, distinct from student profiles. | **Create:** Establish clean `Membership` entity with role, status, joinedAt, invitedBy. |
| `Wallet` | `backend/src/models/wallet.js` | Digital wallet tracking balance, linked to `owner` (User) and optional `student` reference. | **Reuse:** Supports user and student references with sparse indexes. Ensure organization scoping. |
| `WalletLedger` | `backend/src/models/walletLedger.js` | Transaction journal for wallet balances (`TOPUP`, `EVENT_PAYMENT_DEBIT`, `ADJUSTMENT`). | **Reuse & Expand:** Source of truth for credits, debits, and transfers. |
| `Transaction` | `backend/src/models/transactions.js` | Financial movement records (`income`, `expense`). Tracks category, merchant, amount, payment method. | **Refactor & Normalize:** Support `TRANSFER` type, currency, owner/user scoping, and rich metadata. |
| `Category` | *Embedded strings* in Transaction & Budget | Currently hardcoded enum strings in schemas. | **Create Dedicated Model:** System, Organization, and User-scoped category entities with custom category support. |
| `Budget` | `backend/src/models/budget.js` | Budget tracking with `allocated`, `spent`, `remaining`, `status`, `expenses` subdocuments. | **Normalize:** Add explicit support for periods (`MONTHLY`, `WEEKLY`, `YEARLY`, `CUSTOM`), start/end dates, deterministic calculations. |
| `Student` | `backend/src/models/student.js` | Auxiliary academic profile (`registerNumber`, `department`, `batch`). | **Maintain Optional Auxiliary:** Preserved strictly for legacy backward compatibility with `tests/student.test.js`. |
| `StudentDetails`| `backend/src/models/studentDetails.js` | Detailed student metadata. | **Maintain Optional Auxiliary:** Preserved for backward compatibility. |
| `Due` / `Dues` | `backend/src/models/dues.js` | Collection/receivables tracking. | **Maintain Compatible:** Preserved for backward compatibility with `tests/dues.test.js`. |
| `AuditLog` | `backend/features/admin/Log.js` | System action logs (`action`, `performedBy`, `details`). | **Reuse & Formalize:** Connect to core financial mutation events (transactions, budgets, member changes). |

---

## 3. Inventory of Existing APIs

| API Prefix | Purpose | Status / Action Needed |
| :--- | :--- | :--- |
| `/api/auth` | Login, registration, Google callback, onboarding, profile | Working; keep intact. |
| `/api/organizations` | CRUD and settings for organizations | Working; expand to full tenant management and member assignment. |
| `/api/members` | *Missing normalized route* | **Create:** Dedicated membership management endpoints for Org Admins and members. |
| `/api/wallet` & `/api/features/wallet` | Digital wallet balance and ledger history | Mount `/api/wallet` directly as primary, keeping `/api/features/wallet` alias. |
| `/api/transactions` | Financial transactions CRUD, pagination, filtering | Normalize types, ensure strict organization context. |
| `/api/categories` | *Missing normalized route* | **Create:** Endpoints to list default categories and manage custom organization categories. |
| `/api/budgets` | Budget creation, status approval, summaries | Working; ensure deterministic calculations and period support. |
| `/api/reports` | Summary reports (budget, collection, monthly) | Working; generalize titles and ensure tenant isolation. |
| `/api/settings` | User and application settings | Working; preserve for tests. |
| `/api/students` | Auxiliary student CRUD | Preserved for legacy compatibility with 90/90 tests. |
| `/api/dues` | Dues management and UPI payments | Preserved for legacy compatibility with tests. |

---

## 4. Role Architecture & Mapping

The platform defines 4 canonical roles in `backend/src/utils/roles.js`:
1. **Member** (Legacy alias: `Student`)
2. **Finance Manager** (Legacy alias: `Treasurer`)
3. **Organization Admin** (Legacy alias: `Admin`)
4. **Super Admin** (Global platform administrator)

All authorization middleware (`authorizeRole`) and client routing utilities use `normalizeRole()` so both new canonical roles and legacy aliases resolve identically without authorization regressions.

---

## 5. Frontend Pages & Components Inventory

| Frontend Component | Current Responsibility | Action for Core Architecture |
| :--- | :--- | :--- |
| `Login.jsx` | Authentication interface | Completed (SEIP branding, logo.png). |
| `Onboarding.jsx` | User onboarding flow | Completed (Universal identifier, optional affiliation). |
| `Dashboard.jsx` | Financial overview dashboard | Update terminology from student/class to Financial Overview, universal metrics. |
| `Transactions.jsx` | Transaction management for treasurers/finance managers | Normalize interface to support Add Income, Add Expense, filtering, search. |
| `MyTransactions.jsx` | Personal transactions for members | Maintain member-scoped personal view. |
| `ClassBudget.jsx` | Budget view & approval | Normalize to Organization Budget with period and progress tracking. |
| `Admin.jsx` | Administration panel | Add organization profile and member role management components. |
| `Treasurer.jsx` | Finance manager dashboard | Modernize terminology to Financial Management. |
| `Wallet.jsx` & `WalletLedger.jsx` | Digital wallet operations | Generic member wallet interface. |
| `ManageStudents.jsx` | Student management | Support general membership while keeping student fields optional. |

---

## 6. What Can Be Reused vs. What Needs Refactoring

### Can Be Reused Directly:
- JWT verification, password hashing, and rate limiting in `auth.js`.
- Tenant context extraction logic in `tenant.js`.
- Role normalization utilities in `utils/roles.js`.
- Automated test harness and MongoMemoryServer setup in `tests/setup.js`.
- Responsive layout primitives and glassmorphism styling in frontend.

### Needs Refactoring / Extension:
1. **Organization Model:** Add support for generic organization types (`INDIVIDUAL`, `STUDENT_GROUP`, `CLUB`, `NGO`, `STARTUP`, `SMALL_BUSINESS`, `ASSOCIATION`, `OTHER`), contact details, currency, and timezone.
2. **Membership Model:** Create a first-class `Membership` model linking `User` and `Organization`.
3. **Category Model:** Create a dedicated `Category` model with system, organization, and user scoping.
4. **Normalized Transaction Schema:** Ensure `type` includes `income`, `expense`, `transfer`, with currency, metadata, and deterministic ledger ties.
5. **Deterministic Budget Enhancements:** Add support for standard periods (`monthly`, `weekly`, `yearly`, `custom`).
6. **New Routes:** Expose `/api/members`, `/api/categories`, and normalized `/api/wallet`.
7. **Audit Logging Integration:** Automatically log mutations for transactions, budgets, and member changes.

### Must Remain Backward Compatible:
- All 90 existing backend tests must pass with 0 failures (`npm test -- --runInBand --forceExit`).
- Existing route endpoints (`/api/students`, `/api/dues`, `/api/features/*`) must respond as expected.
- Legacy role strings (`Student`, `Treasurer`, `Admin`) must authenticate and authorize transparently.
- Frontend production build must succeed with 0 errors (`npm run build`).
