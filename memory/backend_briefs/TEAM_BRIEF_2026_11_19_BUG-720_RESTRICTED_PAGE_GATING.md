# TEAM BRIEF — Restricted-page gating & role mapping needed (BUG-720)

**Date:** 2026-11-19
**From:** Owner (via E1)
**To:** Dev team (FE: Abhishek)
**Item:** BUG-720 — P0 / CRITICAL — Auth/Routing
**Status:** BLOCKED — awaiting team input before implementation

## The problem
In `App.js` these routes are wrapped in `ProtectedRoute` (only checks "is logged in"),
not `PermissionRoute` (checks a specific permission). So a low-rights user can paste a
direct URL and open pages they shouldn't. The `/employees` page is the most urgent — it
exposes personal data (PII) and lets passwords and roles be edited.

## What we need from the team
For EACH restricted route below, tell us:
(a) the exact **permission key / gate** that should protect it, and
(b) the **role name(s)** that are allowed to open it.

| Route | Permission key (gate) to use | Role name(s) allowed |
|-------|------------------------------|----------------------|
| `/employees`  *(urgent — PII, password/role edit)* | _??_ | _??_ |
| `/settings`      | _??_ | _??_ |
| `/menu`          | _??_ | _??_ |
| `/inventory-*`   | _??_ | _??_ |
| `/pms/*`         | _??_ | _??_ |

Notes:
- If a route group (`/inventory-*`, `/pms/*`) needs different gates per sub-page, list each sub-page.
- Reuse existing permission keys where they already exist (e.g. the keys used by BUG-711 / CR-515).
- Once this table is filled, FE swaps `ProtectedRoute` → `PermissionRoute` with the specified keys.

## Done when
- Table above is fully filled with real permission keys + role names.
- FE applies `PermissionRoute` per the mapping; a low-rights user deep-linking any route is blocked.
