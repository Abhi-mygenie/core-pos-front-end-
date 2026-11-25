# BUG-599 — Intake (Gate 1)
## Aggregator orders vanish on page refresh

**ID:** BUG-599
**Type:** BUG
**Date:** 2026-10-21
**Sprint:** nov_cr_batch
**Area:** Aggregator / Sockets
**Priority:** P0
**Risk:** HIGH — orders invisible to staff after any refresh
**Fast Lane eligible:** NO (touches useRefreshAllData + aggregator boot flow)
**Source:** OWNER-REPORTED (Goan Kitchen, RID 69)
**Duplicate check:** DISTINCT

---

## 1. Description
When the dashboard refreshes (manual refresh button or useRefreshAllData), all aggregator orders (Swiggy/Zomato) disappear from the dashboard. They come back only when the next aggregator socket event fires or polling cycle runs (~30 seconds).

## 2. Root Cause (from investigation, HIGH confidence)
`useRefreshAllData.js:44` calls `orderService.getRunningOrders()` which returns POS orders only — aggregator orders come from a separate UrbanPiper API. `setOrders(freshOrders)` REPLACES all orders in context, wiping aggregator orders. The aggregator boot fetch at `DashboardPage.jsx:210-222` uses `aggregatorBootDone.current = true` ref guard and won't re-run after refresh.

## 3. Evidence
- Code trace: `useRefreshAllData.js:44` → `setOrders(freshOrders)` replaces all
- `DashboardPage.jsx:212` → `aggregatorBootDone.current = true` prevents re-fetch
- `useOrderPollingReconciliation.js:206` → explicitly skips aggregator orders (`isAggregator === true → continue`)

## 4. Blast Radius
- `useRefreshAllData.js` — add aggregator fetch after POS orders (~5 lines)
- Possibly `DashboardPage.jsx` — reset aggregator boot ref on refresh
- Scope: SMALL (1-2 files)

## 5. Owner Decisions
- None required

## 6. Next
Planning Gate 2 → Implementation.
