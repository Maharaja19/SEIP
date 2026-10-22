# RBAC Audit — treasury-v2

Date: 2026-06-06

Summary:
- Inspected authentication and role authorization middleware and routes.
- Found potential role-casing mismatch between `authorizeRole` (strict compare) and feature-level `roleCheck` (case-insensitive).

Findings:
- `authenticateToken` (src/middleware/auth.js): verifies JWT, loads `req.user` and enforces `isActive` and `lastPasswordChange` checks.
  - Returns clear JSON error codes for missing/invalid/expired tokens.
- `authorizeRole` (src/middleware/auth.js): previously used strict equality against `req.user.role`, which could cause 403 errors when role strings used different casing across codebase (e.g., `Admin` vs `admin` vs `Treasurer` vs `treasurer`).
- `roleCheck` (features/roles/roleMiddleware.js): already compared roles case-insensitively.
- Many routes use `authorizeRole(['Treasurer','Admin'])` while some feature routes use `roleCheck(['treasurer','admin'])` — inconsistent casing risk.

Fixes applied:
- Updated `authorizeRole` to perform case-insensitive comparisons of roles. File changed: `backend/src/middleware/auth.js`.
  - This aligns `authorizeRole` behavior with `roleCheck` and reduces accidental 403 responses caused by role string casing differences.

Recommendations / Next steps:
- Verify in staging by running E2E flows for Student, Treasurer, and Admin to confirm access boundaries:
  - Student: Dashboard, Wallet, Transactions, Profile, Event voting, Paying from wallet
  - Treasurer: Budget management, Reports, Dues verification, Event execution
  - Admin: User management, Audit logs, Settings
- Consider standardizing role constants across codebase (`USER_ROLES` util) to prevent future mismatches.
- Audit token creation paths to ensure assigned `role` values are the canonical ones (e.g., `Student`, `Treasurer`, `Admin`) or adopt lowercase consistently.

Files changed:
- `backend/src/middleware/auth.js` — made `authorizeRole` case-insensitive.

Status: Phase 4 (RBAC audit) — partial fix applied; requires runtime verification (E2E) to confirm resolution.
