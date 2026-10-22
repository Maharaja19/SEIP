# RATE LIMIT FIXES — Initial Audit

Date: 2026-06-06

Summary:
- Purpose: Find sources of excessive/repeated API calls (429 risk) and propose fixes.
- Status: Static analysis completed; no live traffic tests performed. Fixes recommended and prioritized below.

Findings:
- Server: Global rate limiter applied to `/api` in `backend/server.js` with high limits; login endpoints have tighter limits.
- Common frontend patterns that can cause repeated calls:
  - `useEffect` hooks without proper dependency arrays (risk of repeated fetching)
  - Unmemoized callback functions passed into effects
  - Components that re-render and re-trigger effects due to non-stable references (objects/arrays inline)
  - Missing debouncing on search/typing inputs

Files to review (automated matches):
- `frontend/src/hooks/useApi.js` — uses `[url]` dependency (OK if `options` stable)
- `frontend/src/pages/*` — many use `useEffect` (e.g., `Admin.jsx`, `Treasurer.jsx`, `Student.jsx`, `Wallet.jsx`, `WalletLedger.jsx`, `EventTimeline.jsx`, `ManageDues.jsx`) — each needs per-file verification for dependency arrays and stable callbacks.

Quick Remediations (applied where safe):
- None auto-applied except for guidance. Changes should be minimal and local to cause no behavior change.

Recommended Concrete Fixes:
1. Run `eslint` with `react-hooks/exhaustive-deps` to surface missing deps.
2. For `useEffect` calls that intentionally run once, ensure `[]` is present.
3. Memoize handlers with `useCallback` and stable values with `useMemo` where used inside `useEffect` or passed down to children.
4. Debounce rapid user input (search, filters) using a `useDebounce` hook before firing API requests.
5. Audit components that fetch data on mount and ensure they do not re-trigger on unrelated state changes.

Verification Steps:
- Run the app (`npm run dev`) and use a browser to exercise flows while monitoring network tab for repeated calls.
- Use load testing (lightweight) to confirm no 429s under expected usage.

Status: Recommendations recorded; manual code changes required per-component. Mark as pending runtime verification.
