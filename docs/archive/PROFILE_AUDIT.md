# PROFILE MODULE AUDIT

Date: 2026-06-06

Scope:
- Verify `GET /api/users/profile` returns required fields and frontend displays them correctly.

Findings:
- Route `GET /api/users/profile` implemented in `backend/src/routes/users.js` as `/profile` and returns merged `User` + `Student` info for `Student` role.
- Returned fields include: `_id`, `name`, `email`, `role`, `registerNumber`, `dob`, `contactNo`, `onboardingCompleted`, plus student fields when applicable (`department`, `year`, `address`, etc.).

Notes:
- Frontend `ViewProfile.jsx` expects name, email, register number, DOB, phone, address, department, batch/year. The backend provides these fields when `Student` record exists; otherwise some fields may be null.

Fixes / Recommendations:
- Ensure frontend handles missing fields gracefully (show 'Not provided').
- Ensure consistent field names (`phone` vs `contactNo` vs `phoneNumber`) — map on controller or frontend.

Status: Route present; runtime validation needed to confirm field availability for sample users.
