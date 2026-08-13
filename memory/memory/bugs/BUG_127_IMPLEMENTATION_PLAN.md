# BUG-127 — Implementation Plan (Gate 3)

**Date:** 2026-06-11 · Workstream B · Decisions: H2 (credit API source), R2 + CREDIT-TILE option a

## Scope (LOCKED)
Replace dead "Unsettled TAB" tile with "Credit Outstanding" sourced from the Credit Management API.

## Changes
1. `frontend/src/api/services/insightsService.js`
   - Delete dead `unsettledTab` accumulation (unreachable branch ~line 655)
   - New small fetch: `creditService.getCreditCustomers()` (existing service, `tap-waiter-list`) → `creditOutstanding = Σ customer.balance` (parse "1,92,898.00" format)
2. `frontend/src/pages/reports-module/DashboardMockup.jsx`
   - Tile relabel: "Credit Outstanding (TAB)" + value
   - **Option a rule:** if selected range ends today → show current outstanding; else show "—" with tooltip "Historical balance available after backend update" (backend brief asks for balance-as-of-date)
   - data-testid: `dashboard-credit-outstanding-tile`

## Expected values (live-verified)
Palm House today: ~₹4.4L+ (LOUISE 1,92,898 + BRAD 2,04,770 + YVONNE 43,088 + …). Replica cross-check: tile = Σ balances from same API call.

## QA
- Range ending today → value equals credit screen total; historical range → "—"
- TAB orders still excluded from Paid revenue everywhere (CR-030 spec)

## Dependencies / order
Ship with or after CR-030 Phase B3 (Dashboard slice) to avoid two label states.

## Freeze-log
Dashboard not frozen — none. Rollback: restore old tile (shows ₹0).

---
## ADDENDUM 2026-06-11 (live-API session) — SCOPE SIMPLIFIED, BACKEND-UNBLOCKED
- Backend shipped `restaurant-tap-summary` {total_credit, total_debit, balance} in `tap-waiter-list` response (live-verified both rids). Date params still IGNORED (as_of_date/to_date/from+to all return as-of-now).
- **Owner ruling R2-AMEND:** tile shows CURRENT outstanding for ALL ranges, labeled **"as of today"** — replaces the "—" historical placeholder. True as-of-range-end deferred until backend brief #2 (`as_of_date`) ships; no rework needed then beyond swapping the source value.
- **Implementation update:** read `restaurant-tap-summary.balance` directly (strip commas) — client-side Σ over customer list no longer needed (keep as harness cross-check only).
- Updated expected value: Palm House balance now ₹6,27,428.00 (₹88,612.50 settled since audit — data moved; audit-time ₹4.4L/zero-settled snapshot is stale).
- QA: tile == summary.balance == Σ customer balances; label "as of today" present on all ranges.
