# E2E TEST REPORT — Initial Plan & Findings

Date: 2026-06-06

Goal: Perform end-to-end tests for critical flows:
- Register, Login, Google Login, Onboarding, Dashboard, Wallet, Transaction, Reports, Events, Profile, Settings

Status: Test plan created; automated execution not yet run in this environment.

Planned Tests (manual/automated):
1. Register (local) → Expect user record + onboarding flag false
2. Login (email/password) → Receive JWT, store in localStorage
3. Google Login (OAuth flow) → Validate callback and token
4. Onboarding → Complete forms, check user profile fields
5. Student Dashboard → Wallet balance, transactions list
6. Wallet top-up → Confirm transaction and ledger entry
7. Create Transaction (student expense) → Verify transaction created
8. Treasurer: Create budget → Approve budget (Admin) → Email notification
9. Dues: Create due → Student pays via UPI → Treasurer verifies
10. Events: Create event (treasurer) → Vote (student) → Execute → Pay from wallet
11. Reports: Generate monthly and collection reports
12. Profile: GET /api/users/profile returns all fields

Tools:
- Cypress or Playwright for automated browser flows
- Postman for API-level verification

Next steps to run tests locally:
- Start backend: `cd treasury-v2/backend && npm install && npm run dev`
- Start frontend: `cd treasury-v2/frontend && npm install && npm start`
- Run Cypress tests or run manual steps from the plan.

Status: Test plan written; execution requires running services and test runner locally.
