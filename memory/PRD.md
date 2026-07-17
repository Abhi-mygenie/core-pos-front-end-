# MyGenie POS Frontend — PRD

## Original Problem Statement
Deploy existing React frontend repo and implement expense + employee module bug fixes.

## Architecture
- Frontend: React 19 + CRACO + Tailwind + Radix/shadcn on port 3000
- Backend: External Laravel API at preprod.mygenie.online
- Auth: Firebase

## Implemented (2026-07-17)
### Expense Module (11 items — all QA PASS)
- BUG-162, 177, 178, 179, 180, 181, 202, 203 (A/B/C/D), 204, 205, CR-074

### Employee Module (1 item — QA PASS)
- BUG-198: 12 edits — POST→PUT, inline password, eye toggle, status:1, email fix, role type wired, X-localization header, role PUT fix, ResetPasswordDialog deleted

## Prioritized Backlog
- P0: Owner smoke batch for all 12 QA-PASS items
- P1: BUG-197 (inventory post-delivery — shares X-localization fix)
- P1: CR-057, CR-058 (tax + complimentary — INTAKE)
- P2: CR-071 (app-wide role gating — DEFERRED), CR-068 (cancellation gating)
- P2: BUG-201 full (backend-blocked), CR-062 (backend-blocked)
- Backend brief pending: role_type↔template mapping
