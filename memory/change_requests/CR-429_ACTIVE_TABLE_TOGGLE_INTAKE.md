# CR-429 — Intake (Gate 1)
## Active Table Toggle — Show only occupied/active tables in table view

**ID:** CR-429 · **Type:** CR · **Date:** 2026-10-16
**Severity:** P2 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Menu / Order Entry
**Duplicate check:** DISTINCT — no prior table-view filter CR found
**Source:** OWNER-REPORTED (smoke test 2026-10-16)

## Description
In table view (channel view or status view), all tables are shown — both available and occupied. Owner wants a toggle to either (a) show only active/occupied tables, or (b) sort active tables first, so staff can quickly see only tables that need attention without scrolling past empty ones.

## Code Reality: NONE
No `activeOnly` filter toggle exists. `DashboardPage.jsx` passes `allTablesList` unfiltered to the grid. Filtering logic for `!["available","reserved"].includes(t.status)` exists in counting (L1956) but not as a user-facing toggle.

## Blast Radius: SMALL
- `DashboardPage.jsx` — add toggle state + filter
- Possibly `ChannelColumn.jsx` — filter items passed to grid
- No API/transform/financial changes needed

## Open Decisions
**OD-429-01:** Toggle placement — in the table view header toolbar? And should it be per-session (UI state) or persist in localStorage?
