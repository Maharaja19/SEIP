# Smart Expense Intelligence Platform (SEIP) — Core Product Architecture

**Document Version:** 1.0.0  
**Date:** October 5, 2026  
**Status:** Implemented & Verified  
**Workspace:** `C:\Users\mmaha\Projects\Budget\SEIP`  

---

## 1. Architectural Philosophy

The **Smart Expense Intelligence Platform (SEIP)** is a modern, modular, multi-tenant financial intelligence platform designed for:
- Individual professionals and students
- Startups and small businesses (SMBs)
- Clubs, community associations, and NGOs
- Corporate departments and academic organizations

The core foundation is deliberately decoupled from institutional or college-specific assumptions. It prioritizes:
1. **Strict Multi-Tenancy:** Absolute logical data isolation between organizations.
2. **Double-Entry Wallet Accounting:** Ledger-backed balance calculations guaranteeing traceability.
3. **Deterministic Financial Calculations:** Transparent, reproducible math for budgets, balances, and allocations without relying on opaque predictive heuristics.
4. **Extensible AI Readiness:** Built-in hooks and classification metadata fields positioned for future LLM integration without introducing external dependencies or mock data prematurely.

---

## 2. Multi-Tenancy & Tenant Context Isolation

SEIP adopts a single-database, logically partitioned multi-tenant design:

```
[ Incoming HTTP Request ]
           │
           ▼
[ authenticateToken ] ──── Extracts & verifies JWT Bearer token
           │                Attaches req.user (User document)
           ▼
[ tenantContext ] ──────── Extracts req.user.organizationId
           │                Attaches req.organizationId
           │                Rejects body/query tenant spoofing
           ▼
[ Controller / Service ] ── All queries strictly filtered by:
                            { organization: req.organizationId }
```

### Security Rules:
- **Zero Client Trust:** Neither `req.body.organizationId` nor `req.query.organizationId` can set or override the operational tenant context.
- **Super Admin Exception:** Only authenticated users with `Super Admin` can specify an explicit target tenant using the `x-organization-id` header for platform maintenance and cross-tenant support.
- **IDOR Protection:** Every query for transactions, budgets, members, wallets, or reports enforces `{ organization: req.organizationId }`.

---

## 3. Core Domain Entities & Data Models

### 3.1 Organization (`models/organization.js`)
The primary tenant container:
- `name`, `legalName`, `displayName`: Identity strings.
- `type`: Generic classification (`INDIVIDUAL`, `STUDENT_GROUP`, `CLUB`, `NGO`, `STARTUP`, `SMALL_BUSINESS`, `ASSOCIATION`, `OTHER`).
- `currency`: Default ISO currency code (default: `INR`).
- `timezone`: Default IANA timezone (default: `Asia/Kolkata`).
- `owner`, `createdBy`: References to `User`.
- `address`: Street, city, state, country, postalCode.
- `status`: `active`, `suspended`, `archived`.
- `settings`: Visual theme, accent colors, fiscal year start month.

### 3.2 User (`models/user.js`)
Core user identity:
- `email`, `name`, `password`, `contactNo`, `avatar`, `googleId`.
- `role`: Canonical role string (`Member`, `Finance Manager`, `Organization Admin`, `Super Admin`).
- `organizationId`: Reference to active `Organization`.
- `onboarding`: Universal onboarding preferences (income, expense, savings goal).

### 3.3 Membership (`models/membership.js`)
Represents a user's formal affiliation with an organization:
- `user`: Reference to `User`.
- `organization`: Reference to `Organization`.
- `role`: Role within this specific organization.
- `status`: `active`, `invited`, `suspended`, `left`.
- `department`: Department or division (default: `General`).
- `title`: Organizational designation (e.g., "Accountant", "Secretary").
- `invitedBy`: Reference to inviting user.
- **Compound Unique Index:** `{ organization: 1, user: 1 }` guarantees a user has exactly one membership record per tenant.

### 3.4 Transaction (`models/transactions.js`)
Individual financial movements:
- `organization`: Scoped tenant reference.
- `user`: Account owner / participant.
- `type`: `income`, `expense`, `transfer`.
- `amount`: Non-negative decimal amount.
- `currency`: Transaction currency (default: `INR`).
- `category`: Financial category identifier.
- `merchant` / `payee`: Vendor or recipient name.
- `paymentMethod`: `UPI`, `Cash`, `Bank Transfer`, `Card`, `Other`.
- `status`: `completed`, `pending`, `failed`, `voided`.
- `reference`: External payment reference code.
- `metadata`: Flexible key-value store for attachments or future receipt intelligence.
- `AIClassification`: Extension point for future automated categorization.

### 3.5 Category (`models/category.js`)
Hierarchical category structure:
- `name`, `slug`, `icon`, `color`, `type` (`income`, `expense`, `both`).
- `scope`:
  - `system`: Built-in global defaults available to all organizations.
  - `organization`: Custom categories created by organization finance managers/admins.
  - `user`: Personal categories.
- Built-in defaults include: Food & Dining, Transport, Shopping, Bills & Utilities, Education, Healthcare, Entertainment, Salary & Wages, Business Revenue, Investment, Other.

### 3.6 Budget (`models/budget.js`)
Deterministic budget planning:
- `organization`: Scoped tenant reference.
- `owner` / `proposedBy`: Proposer reference.
- `title` / `name`: Budget name.
- `category`: Budget category allocation.
- `amount` / `allocated`: Budgeted ceiling.
- `spent` / `spentAmount`: Computed expenditures.
- `remaining`: Deterministically derived: `allocated - spent`.
- `period`: `MONTHLY`, `WEEKLY`, `YEARLY`, `CUSTOM`.
- `startDate`, `endDate`: Timeframe boundaries.
- `status`: `pending`, `approved`, `rejected`.
- `alertThresholds`: Utilization percentages for notifications (e.g. `[80, 100]`).

### 3.7 Wallet & WalletLedger (`models/wallet.js`, `models/walletLedger.js`)
Double-entry digital wallet system:
- `Wallet`: Tracks cached current balance, currency, and status (`active`, `frozen`, `closed`).
- `WalletLedger`: Immutable audit journal for every balance change (`TOPUP`, `DEBIT`, `CREDIT`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUSTMENT`). Stores `balanceBefore`, `balanceAfter`, `amount`, and `note`.

### 3.8 AuditLog (`models/auditLog.js`)
Immutable event record for governance:
- `action`: `ORGANIZATION_CREATED`, `MEMBER_ADDED`, `TRANSACTION_CREATED`, `BUDGET_APPROVED`, etc.
- `entityType`: `TRANSACTION`, `BUDGET`, `ORGANIZATION`, `MEMBERSHIP`, `WALLET`, `USER`.
- `entityId`, `organization`, `performedBy`, `details`, `ipAddress`, `userAgent`.

---

## 4. API Endpoints Structure

```
/api
 ├── /auth            Authentication, Google OAuth, Profile, Onboarding
 ├── /organizations   Tenant profile, settings, and updates
 ├── /members         Membership directory, invites, and role changes
 ├── /wallet          Digital wallet balances, top-ups, and ledger activity
 ├── /transactions    CRUD, search, filtering, and summary metrics
 ├── /categories      System and tenant-scoped category management
 ├── /budgets         Deterministic budget allocation, tracking, and approval
 ├── /reports         Consolidated financial summaries
 ├── /analytics       Spending distributions and historical trends
 └── /settings        Personal preferences and security controls
```

---

## 5. Backward Compatibility & Transition Strategy

To maintain seamless interoperability with existing automated tests (90/90 pass rate) and existing client components:
1. **Auxiliary Student Entity:** The `Student` model is retained as an optional auxiliary profile for academic environments. Non-student members operate fully without it.
2. **Dual Route Support:** Legacy feature routes (`/api/features/wallet`) remain active while normalized routes (`/api/wallet`) point to the same controllers.
3. **Role Normalization:** `normalizeRole()` automatically maps legacy role strings (`Student`, `Treasurer`, `Admin`) to canonical roles (`Member`, `Finance Manager`, `Organization Admin`).

---

## 6. Future AI Extension Points

Clean, passive extension points are prepared for Milestone 2:
- `Transaction.AIClassification`: Pre-structured schema to store confidence scores and suggested categories.
- `Organization.settings.aiPreferences`: Configurable toggles for automated forecasting and anomaly alerts.
- Dedicated schemas (`aiInsight.js`, `financialHealth.js`) ready to receive analytical pipelines without architectural overhaul.
