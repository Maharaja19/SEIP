# EMAIL SYSTEM AUDIT

Date: 2026-06-06

Scope:
- Verify SMTP and email triggers for: Payment Confirmation, Budget Approval, Due Reminder, Event Reminder.

Findings:
- `notificationService` referenced in `backend/src/routes/budget.js` and other places.
- Look for SMTP config in `src/config` or `src/services/notificationService`.

Quick scan results:
- `backend/src/services/notificationService.js` should be inspected to confirm `sendEmail` implementation and transport configuration.
- Environment variables required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM — ensure these are set in env.

Recommendations:
1. Inspect `notificationService` and validate it calls a configured transport (nodemailer or similar).
2. Run integration test: trigger a budget approval and confirm email is sent (or check logs in development mode).
3. For reminders (events, dues): ensure cron or explicit reminder endpoints call `notificationService`.

Status: No runtime validation yet; code references present. Next step: inspect `notificationService` file and test with dev SMTP (Mailtrap or similar).
