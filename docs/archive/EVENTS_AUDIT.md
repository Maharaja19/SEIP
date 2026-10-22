# EVENTS MODULE AUDIT

Date: 2026-06-06

Scope:
- Verify event management, voting, participation, budget voting, event payments, reminders.

Findings:
- Feature routes and controllers present under `backend/features/events`:
  - `POST /api/features/events` — createEvent (Treasurer/Admin)
  - `GET /api/features/events` — getEvents
  - `POST /api/features/events/:id/vote` — voteOnBudget
  - `POST /api/features/events/:id/execute` — executeEventPayments
  - `POST /api/features/events/:id/pay-from-wallet` — payEventFromWallet
  - `POST /api/features/events/:id/remind-voting` — remindVoting
  - `POST /api/features/events/:id/remind-payment` — remindPayment
- Controllers implement participant/roster, EventBudgetVote, EventPayment, and event-execution logic with wallet debits.

Potential issues to verify at runtime:
- Atomic wallet debit logic must prevent negative balances and create transaction records.
- Voting flow requires student to be marked as participating in `EventParticipant`.
- Reminders rely on `notificationService` (email/SMS) — verify this service and environment variables for SMTP.

Recommendations:
- Run end-to-end event flow: create event (treasurer), mark participants (upload roster), open voting, students vote, treasurer executes, students pay from wallet.
- Monitor transaction and eventpayment collections for correct records.

Status: Code present; recommend E2E verification and SMTP checks for reminders.
