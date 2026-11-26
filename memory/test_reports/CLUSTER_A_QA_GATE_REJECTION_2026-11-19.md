# QA GATE REJECTION — Cluster A (Permissions & Access) — 2026-11-19

**Role:** QA (Role 4)
**Scope:** BUG-720 (route bypass, P0/CRITICAL), BUG-721 (Dashboard button gating, HIGH)
**Result:** CANNOT START — handover rejected (no implementation to verify)

## Precondition check (FAILED)
- QA Handover doc: **MISSING** for both items (none exists in `/app/memory/handover/`).
- Registry status: both `BUG-720` and `BUG-721` = `GATE_1_INTAKE 2026-11-19 — awaiting Gate 2 IA`, sprint `nov_cr_batch`, assignee Abhishek.
- No Impact Analysis (`/app/memory/impact/`) and no Implementation Plan (`/app/memory/plans/`) for either item.
- EXIT GATE 5/5: N/A (nothing implemented).

## Code reality (verified in `frontend/src/App.js`)
Still using login-only `ProtectedRoute` (vulnerability present, unfixed):
- `/menu` (L253), `/settings` (L256), `/employees` (L261) — **PII + password/role edit, urgent**
- `/inventory` + all `/inventory-*` (L264–274)
- all `/pms/*` (L277–289)

`PermissionRoute` is correctly used only on report routes (`/reports/*`, `/reports-module/*`, keys `report` / `show_daily_report`, from CR-490).

## Blocker (owner/team decision required)
Per `backend_briefs/TEAM_BRIEF_2026_11_19_BUG-720_RESTRICTED_PAGE_GATING.md`, the permission-key → role mapping table is **empty**. Needed before any implementation:

| Route | Permission key (gate) | Role name(s) allowed |
|-------|-----------------------|----------------------|
| `/employees` (urgent) | ?? | ?? |
| `/settings` | ?? | ?? |
| `/menu` | ?? | ?? |
| `/inventory-*` | ?? | ?? |
| `/pms/*` | ?? | ?? |

BUG-721: needs the `canPrintBill` / `canCancelOrder` keys (from BUG-711 / CR-515) threaded `ChannelColumn → TableCard`.

## Correct next step (not QA)
These items must go **PLANNING (Gate 2 Impact Analysis)** first — and BUG-720 needs the owner to fill the mapping table — then IMPLEMENTATION, then QA. QA re-engages only once a QA Handover with EXIT GATE 5/5 exists.
