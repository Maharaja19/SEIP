# Treasury v2 — Database Schema

Mongoose models in `backend/src/models/` and `backend/features/*/`. Mongo database: `BudgetDB`.

## User — `models/user.js` (`users` collection)

| Field | Type | Notes |
|---|---|---|
| `sNo` | Number | required, unique |
| `rollNo` | String | unique, sparse, max 20 (optional for Admin/Treasurer) |
| `registerNumber` | String | GCT format `^[0-9]{6}[A-Za-z]{4}[0-9]{3}$` (validated in routes) |
| `name` | String | required, trim, max 100 |
| `email` | String | required, unique (lowercased at login) |
| `contactNo` | String | required |
| `dob` | Date | |
| `role` | String | enum: `Organization Admin, Finance Manager, Member, Super Admin, Admin, Treasurer, Student` |
| `organizationId` | ObjectId → Organization | |
| `permissions` | [String] | default [] |
| `password` | String | minlength 6, bcrypt-hashed |
| `lastLogin`, `lastPasswordChange` | Date | |
| `isActive` | Boolean | default true |
| `failedLoginAttempts` | Number | default 0 |
| `lockUntil` | Date | |
| `passwordResetToken`, `passwordResetExpires` | String / Date | |
| `avatar`, `profilePicture` | String | |
| `googleId` | String | unique, sparse |
| `onboarding.academic` | { branch, batch, year } | |
| `onboarding.financial` | { hasWallet, monthlyIncome, monthlyExpense, savingsGoal, emergencyFundTarget, … } | |

> ⚠️ Two overlapping role vocabularies exist in the enum (e.g. both `Treasurer` and `Finance Manager`).
> `utils/constants.js` uses `Organization Admin / Finance Manager / Member / Super Admin`; most routes
> use `Treasurer / Admin / Student`.

## Student — `models/student.js`

| Field | Type | Notes |
|---|---|---|
| `organization` | ObjectId → Organization | |
| `user` | ObjectId → User | unique, sparse |
| `fullName` | String | required, trim, max 100 |
| `registerNumber` | String | required, unique |
| `dob` | Date | required |
| `gender` | String | enum `Male/Female/Other`, required |
| `department` | String | default `"CSE"`, max 10 |
| `year` | String | default `"III"`, max 10 |
| `email` | String | required, unique |
| `phoneNumber` | String | required |
| `address` | String | max 500 |
| `religion`, `quota`, `community` | String | max 50 |
| `firstGraduate`, `otherState` | Boolean | default false |
| `contactNo` | String | match `^[6-9]\d{9}$` |
| `section` | String | max 10 |
| `dues` | Number | default 0, min 0 (denormalized total) |
| `cgpa` | Number | 0–10 |

## StudentDetails — `models/studentDetails.js`

Extended student attributes (registerNumber, gender, religion, quota, community, firstGraduate,
otherState, contactNo, …) — largely overlapping with `Student`; verify current usage (possibly legacy).

## Due — `models/dues.js`

| Field | Type | Notes |
|---|---|---|
| `organization` | ObjectId → Organization | |
| `dueID` | Number | unique, sparse |
| `student` | ObjectId → Student | |
| `studentRegNo` | String | trim |
| `amount` | Number | required, min 0 |
| `reason` | String | required, trim, max 200 |
| `dueDate` | Date | required |
| `status` | String | enum `Unpaid, Paid, Pending Verification, pending, paid, Pending` (mixed casing) |
| `paymentMethod` | String | enum `UPI, Cash, Bank Transfer, null` |
| `transactionRef` | String | max 100 |
| `paidDate`, `verifiedDate` | Date | |
| `verifiedBy` | ObjectId → User | |
| `treasurerNotes` | String | max 500 |
| `upiTransactionId` | String | max 100 |
| `paymentScreenshot` | String | max 500 (URL) |

## Budget — `models/budget.js`

| Field | Type | Notes |
|---|---|---|
| `organization` | ObjectId → Organization | |
| `category` | String | default `"General"` |
| `allocated` | Number | required, min 0 |
| `budgetID` | String | unique, sparse |
| `title` | String | required, trim, max 200 |
| `description` | String | max 1000 |
| `spent` | Number | default 0, min 0 |
| `remaining` | Number | required, min 0 |
| `status` | String | enum `pending, approved, rejected` |
| `proposedBy`, `approvedBy` | ObjectId → User | |
| `approvedAt` | Date | |
| `items[]` | [{ item, amount, category }] | expense items |

## Transaction — `models/transactions.js`

| Field | Type | Notes |
|---|---|---|
| `student` | ObjectId → Student | |
| `user` | ObjectId → User | required |
| `organization` | ObjectId → Organization | |
| `wallet` | ObjectId → Wallet | |
| `due` | ObjectId → Due | |
| `budget` | ObjectId → Budget | |
| `type` | String | enum `income, expense`, required |
| `merchant` | String | trim, max 100 |
| `AIClassification` | { category, confidence, classifiedAt } | Gemini classification |
| `category` | String | enum (dues, budget, food, transport, books, entertainment, shopping, health, education, misc) |
| `department` | String | default `"General"`, max 100 |
| `date` | Date | default now |
| `createdBy` | ObjectId → User | |
| `amount` | Number | required, min 0 |
| `description` | String | trim, max 500 |
| `isStudentEntry` | Boolean | default false |
| `paymentMethod` | String | enum `UPI, Cash, Bank Transfer, null` |
| `transactionRef` | String | max 100 |

## Organization — `models/organization.js`

`name` (req, max 100), `type` (enum: College, Department, Club, Community, NGO, Startup,
Small Business, Personal, Other), `logo`, `description`, `industry`, `createdBy` (→User, req),
`subscriptionPlan` (Free/Growth/Enterprise), `settings` = { theme: light/dark/system,
accentColor, allowMemberSubmission, currency (default INR) }.

## Wallet — `models/wallet.js`

`student` (→Student, sparse), `owner` (→User, required), `organization` (→Organization),
`balance` (Number, default 0, min 0).

## WalletLedger — `models/walletLedger.js`

`student` (→Student, sparse, index), `user` (→User, required, index), `organization` (→Organization,
index), `event` (→Event), `type` (enum `TOPUP, EVENT_PAYMENT_DEBIT, ADJUSTMENT`, required),
`amount` (req, min 0), `balanceBefore`, `balanceAfter` (req, min 0), `note` (max 500),
`createdBy` (→User), timestamps.

## Event — `features/events/Event.js`

`name` (req, max 200), `date` (req), `paymentDeadline` (req), `status` (enum `Open/Closed/Completed`),
`budgetVoteStatus` (enum `pending/approved/rejected`), `budgetVoteApprovedAt`, `budgetExecutedAt`,
`splitMode` (enum `equal/gender_custom`), `genderSplitAmounts` { Male, Female }, `expenses`
{ food, transport, misc }, `budgetAllocated`, `budgetUsed`, `summary`, `createdBy` (→User).

## EventParticipant — `features/events/EventParticipant.js`

`event` (→Event, index), `student` (→Student, index), `studentRegNo` (req), `name`, `department`,
`batch`, `gender` (enum, req), `participate` (default true), `createdBy` (→User).

## EventPayment — `features/events/EventPayment.js`

`event` (→Event, index), `student` (→Student, index), `amountDue` (req, min 0),
`amountPaid` (default 0), `status` (enum `Unpaid/Paid`, default Unpaid, index), `paidAt`,
`createdBy` (→User).

## EventBudgetVote — `features/events/EventBudgetVote.js`

`event` (→Event, index), `student` (→Student, index), `vote` (enum `approve/reject`, req),
`createdBy` (→User).

## Feedback — `features/feedback/Feedback.js`

`eventId` (→Event, req), `studentId` (→User, req), `rating` (1–5, req), `comments`.

## Audit Log — `features/admin/Log.js`

`action` (req), `performedBy` (→User), `details` (Mixed), timestamps.

## AI Insight — `models/aiInsight.js`

`organization` (→Organization, req), `type` (enum trend/alert/budget_adherence/forecast/anomaly, req),
`severity` (enum info/low/medium/high/critical), `title` (req), `message` (req), `cause`, `suggestion`,
`forecastData` { nextWeek, nextMonth, nextQuarter }, `rawAIResponse`, `createdAt`.

## FinancialHealth — `models/financialHealth.js`

`organization` (req), `user` (req), `score` (0–100, req), `type` (enum spending/savings/budget/general),
`message` (req), `impact` (enum positive/neutral/negative), `action` (req), `estimatedSavings`,
`priority` (enum low/medium/high), `calculatedAt`.

## PaymentOrder — `models/PaymentOrder.js` (Razorpay)

`orderId` (req, unique — razorpay_order_id), `amount` (paise), `currency` (INR), `status`
(created/paid/failed), `student` (→Student), `due` (→Due), `receipt`, `paymentId`, `method`,
`email`, `contact`, `notes`, timestamps.

---

## Cross-cutting observations

- **Denormalization:** `Student.dues` stores a running due total while `Due`/`Transaction` hold the
  source of truth — keep in sync when creating/verifying dues.
- **Enum drift:** `Due.status` mixes cases (`Unpaid`, `pending`, `paid`, `Pending`); queries filter on
  multiple values to compensate. Recommend normalizing to a single vocabulary.
- **Dual role vocabularies** on `User.role` (see User table).
- **Sparse/unique indexes:** `registerNumber`, `googleId`, `dueID`, `budgetID`, `rollNo`, `user` on
  Student — index creation script exists at `backend/scripts/createIndexes.js`.
