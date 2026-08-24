# BUG-250 — Polling Reconciliation Removes Aggregator Orders (~60s)

**ID:** BUG-250
**Type:** BUG
**Created:** 2026-07-26
**Priority:** P0 — CRITICAL (aggregator orders vanish from dashboard after 1 poll cycle, staff cannot manage Swiggy/Zomato orders)
**Risk:** HIGH (touches order state management, polling safety net, financial flow)
**Module:** Dashboard — OrderContext / Polling Reconciliation
**Duplicate Check:** DISTINCT. Related: CR-106 (aggregator module).
**Source:** INVESTIGATION (Investigation Report #1, 2026-07-26)
**Confidence:** CONFIRMED — code traced, behavior observed live (Delivery 8 → Delivery 4)
**Code Reality:** NONE — no `isAggregator` exemption exists in polling removal path

---

## Description

`useOrderPollingReconciliation` polls `getRunningOrders()` (regular POS order API) every 60 seconds. Aggregator orders come from a **separate API** (UrbanPiper `get-order-list`) and are NOT included in the regular response. After 1 missed poll cycle (`REMOVAL_MISS_THRESHOLD = 1`), the reconciliation treats aggregator orders as "local-only orphans" and calls `removeOrder()` on each.

**Impact:** All aggregator orders disappear from the dashboard ~60 seconds after boot. Staff cannot see or manage Swiggy/Zomato orders.

## Evidence

- Investigation report: `/app/memory/evidence/CR-106/INVESTIGATION_REPORT_DESIGN_MISMATCH_2026_07_26.md` §I-2
- User screenshot: Delivery column shows 4 orders (aggregator orders gone) vs 8 at boot
- Code: `useOrderPollingReconciliation.js:182-226` — removal loop, no `isAggregator` check

## Blast Radius

- **File:** `hooks/useOrderPollingReconciliation.js` (line 182-226)
- **Also affects:** `useSocketEvents.js:100` — `mergeRunningOrders` on reconnect also wipes aggregator orders
- **Scope:** SMALL (1-2 files, ~5 lines each)
- **Hotspot:** NO

## Fix (Direct Bug Fix eligible — owner approve)

Add `isAggregator` exemption in removal path:
```js
// After line 201 in useOrderPollingReconciliation.js:
if (l.isAggregator === true) continue; // CR-106: aggregator orders from separate API
```
Also in `mergeRunningOrders` or reconnect handler: preserve aggregator orders during merge.
