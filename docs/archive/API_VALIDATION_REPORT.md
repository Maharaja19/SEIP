# API VALIDATION REPORT — Initial Mapping

Date: 2026-06-06

Purpose: Automated first-pass mapping of frontend API calls (treasury-v2 frontend) to backend route files. Each endpoint below was discovered by scanning `treasury-v2/frontend/src` for `api.get/post/put/delete` usages.

Legend:
- **Mapped**: A likely backend route file exists (based on route filenames under `treasury-v2/backend/src/routes`).
- **Unknown**: No immediate route file match found; manual inspection required.
- **Status**: `pending` = needs runtime verification (controller returns data and shape).

---

1) Endpoints discovered (sorted):

- `GET /budgets` — Candidate route: `budget.js` — Status: pending (Mapped)
- `GET /budgets/current` — Candidate route: `budget.js` — Status: pending (Mapped)
- `GET /transactions` — Candidate route: `transactions.js` — Status: pending (Mapped)
- `POST /transactions` — Candidate route: `transactions.js` — Status: pending (Mapped)
- `DELETE /transactions/:id` — Candidate route: `transactions.js` — Status: pending (Mapped)

- `POST /features/excel/upload` — Candidate route: Unknown (no `features` route file in initial scan) — Status: pending (Unknown)

- `GET /features/events` — Candidate route: Unknown — Status: pending (Unknown)
- `POST /features/events` — Candidate route: Unknown — Status: pending (Unknown)
- `POST /features/events/:id/execute` — Candidate route: Unknown — Status: pending (Unknown)
- `POST /features/events/:id/remind-voting` — Candidate route: Unknown — Status: pending (Unknown)
- `POST /features/events/:id/remind-payment` — Candidate route: Unknown — Status: pending (Unknown)

- `GET /students` — Candidate route: `student.js` — Status: pending (Mapped)
- `POST /students` — Candidate route: `student.js` — Status: pending (Mapped)
- `PUT /students/:registerNumber` — Candidate route: `student.js` — Status: pending (Mapped)
- `DELETE /students/:registerNumber` — Candidate route: `student.js` — Status: pending (Mapped)

- `PUT <settings endpoint>` — Candidate route: `settings.js` — Status: pending (Mapped — verify exact endpoint strings in code)

- `GET /features/wallet/ledger` (query `limit=50`) — Candidate route: possibly `payments.js` or `transactions.js` or a `wallet` feature route — Status: pending (Unknown)

- `GET /users/profile` — Candidate route: `users.js` — Status: pending (Mapped)

- `GET /reports` — Candidate route: `reports.js` — Status: pending (Mapped)

- `GET /dues/pending-verification` — Candidate route: `dues.js` — Status: pending (Mapped)

- Other common frontend usage (generic): `api.get(url)` calls via `hooks/useApi.js` — these are dynamic and need per-call resolution.

---

Next actions (Phase 2 detailed):
- For every endpoint above, open the corresponding route file under `treasury-v2/backend/src/routes` and confirm:
  - Route path and HTTP verb match frontend usage.
  - Controller exists and imports expected service.
  - Controller returns consistent JSON shape the frontend expects.
- For `Unknown` mappings (features/* and wallet ledger), search `backend/src` for implementations under `features/` or `controllers/` directories and update the mapping accordingly.
- Run the backend locally (or inspect logs) to verify responses and adjust frontend parsing where necessary.

I'll proceed to inspect `treasury-v2/backend/src/routes` files for the mapped candidates (`budget.js`, `transactions.js`, `student.js`, `reports.js`, `dues.js`, `users.js`) and report findings next.
