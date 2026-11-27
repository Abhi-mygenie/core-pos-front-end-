# BUG-599 — Impact Analysis (Gate 2)

**ID:** BUG-599
**Date:** 2026-10-21
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE (no fix code exists yet)
**Risk:** HIGH — orders invisible to staff after any refresh
**Conflict Pre-Check:** CLEAN — no other active item touches `useRefreshAllData.js`

---

## 1. Summary

Aggregator orders (Swiggy/Zomato via UrbanPiper) vanish from the dashboard whenever the staff triggers a manual refresh. Root cause: `useRefreshAllData` calls `setOrders(freshOrders)` which does a **full replace** of the orders array with POS-only orders. Aggregator orders are wiped. They do not return because (a) the boot fetch guard `aggregatorBootDone.current = true` prevents re-fetch, and (b) the polling reconciliation hook explicitly skips aggregator orders.

A **proven fix pattern already exists** in the codebase: `mergeRunningOrders()` (OrderContext L48-58, shipped for BUG-250) preserves aggregator orders during a POS order refresh. The fix is to use `mergeRunningOrders` instead of `setOrders` in `useRefreshAllData`.

---

## 2. Data Flow Trace

```
Manual Refresh Button (DashboardPage L543-556)
  → handleRefreshAll()
    → refreshAllData()  (useRefreshAllData hook)
      → orderService.getRunningOrders(roleParam)   ← returns POS orders ONLY
      → setOrders(freshOrders)                      ← FULL REPLACE ← BREAK POINT
        → OrderContext.setOrdersState(list)          ← aggregator orders GONE
        → ordersRef.current = list                   ← ref also loses them

After setOrders:
  → aggregatorBootDone.current === true              ← ref guard blocks re-fetch
  → useOrderPollingReconciliation L206               ← explicitly skips isAggregator
  → Result: aggregator orders invisible until next socket event (~30s)
```

---

## 3. Affected Files & Lines

### File WILL change: `src/hooks/useRefreshAllData.js`

| Line | Current | Issue |
|------|---------|-------|
| L19 | `const { setOrders } = useOrders();` | Only destructures `setOrders` (full replace) |
| L45 | `setOrders(freshOrders);` | Full replace — wipes aggregator orders |

### Files will NOT touch

- `DashboardPage.jsx` (R5) — no change needed; `aggregatorBootDone` ref stays as-is
- `OrderContext.jsx` — `mergeRunningOrders` already exists and works correctly
- `useOrderPollingReconciliation.js` — aggregator skip is correct behavior for polling
- `orderService.js` — `getRunningOrders` correctly returns POS orders only
- `aggregatorService.js` — boot fetch logic is fine
- Any socket handler, transform, or other service

---

## 4. Root Cause Classification

**FE_BUG** — `useRefreshAllData` uses `setOrders` (full replace) instead of `mergeRunningOrders` (preserves aggregator orders). The correct merge function was built for BUG-250 (same root pattern: POS refresh wipes aggregator orders during socket reconnect) but was never applied to the manual refresh path.

---

## 5. Existing Fix Pattern — `mergeRunningOrders` (OrderContext L48-58)

```js
const mergeRunningOrders = useCallback((freshOrders) => {
    if (!Array.isArray(freshOrders)) return;
    setOrdersState((prev) => {
      // BUG-250: Preserve aggregator orders during merge
      const aggregatorOrders = prev.filter(o => o.isAggregator === true);
      const merged = [...freshOrders, ...aggregatorOrders];
      ordersRef.current = merged;
      return merged;
    });
}, []);
```

This function:
- Keeps all `isAggregator === true` orders from the previous state
- Merges them with the fresh POS orders
- Updates both state and ref
- Already exposed via `useOrders()` (OrderContext L362, L391)
- Already tested in production for BUG-250 (socket reconnect path)

**One difference**: `setOrders` sets `isLoaded = true`; `mergeRunningOrders` does not. At refresh time, `isLoaded` is already `true` (set during boot). No regression.

---

## 6. Recommended Fix

**Change `useRefreshAllData.js` only (1 file, ~3 lines):**

1. **L19**: Destructure `mergeRunningOrders` instead of (or alongside) `setOrders`
2. **L45**: Replace `setOrders(freshOrders)` with `mergeRunningOrders(freshOrders)`
3. **L46**: Update deps array if needed

No other file changes required. No `aggregatorBootDone` reset needed — existing aggregator orders are preserved through the merge, and new ones arrive via sockets.

---

## 7. Downstream Consumers

| Consumer | Impact |
|----------|--------|
| DashboardPage `handleRefreshAll` (L543) | **Fixed** — aggregator orders survive refresh |
| Sidebar refresh button | Same path → fixed |
| Socket reconnect (`mergeRunningOrders`) | Already uses correct function — no change |
| Polling reconciliation | Skips aggregator orders — correct, no change |
| Aggregator boot fetch (DashboardPage L210-222) | Runs once on mount — correct, no change |
| LoadingPage initial load | Uses `setOrders` — correct for boot (no aggregator orders yet) |

---

## 8. Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Aggregator orders duplicated after merge | LOW | `mergeRunningOrders` replaces all non-aggregator orders with fresh list; aggregator orders are additive from prev. Duplicates only possible if same order appears in both POS and aggregator results — impossible by API design. |
| `isLoaded` not re-set | NONE | Already `true` at refresh time. Boot path still uses `setOrders`. |
| Stale aggregator orders after refresh | LOW | Socket events continue updating aggregator orders in real-time. Refresh doesn't affect socket channel. Worst case: a 30s window of slightly stale aggregator status. |

---

## 9. Owner Decisions

**None required.** The fix uses an existing, production-tested function (`mergeRunningOrders`) for a well-understood root cause. No business logic change. No financial impact. No API change.

---

## 10. Verification Matrix (seeds Gate 3 plan + QA)

| # | What to Verify | Method | Automated? |
|---|---------------|--------|:---:|
| V1 | After manual refresh, aggregator orders remain visible on dashboard | Browser: login as Goan Kitchen → see aggregator orders → click refresh → orders still visible | NO |
| V2 | POS orders correctly refreshed after manual refresh | Browser: place a POS order → refresh → new order visible | NO |
| V3 | No duplicate aggregator orders after multiple refreshes | Browser: refresh 3x → count aggregator orders stays same | NO |
| V4 | `mergeRunningOrders` called instead of `setOrders` in useRefreshAllData | Code review: grep for `setOrders` in useRefreshAllData.js → 0 hits | YES |
| V5 | LoadingPage boot still uses `setOrders` (not changed) | Code review: grep LoadingPage.jsx for setOrders | YES |
| V6 | webpack compiles with 0 new warnings | `yarn build` or dev server log | YES |

---

## 11. Evidence Artifacts

- Investigation report: `evidence/BUG-599-600-601/INVESTIGATION_REPORT_AGGREGATOR_2026_10_21.md`
- Code trace: `useRefreshAllData.js` L44-45, `OrderContext.jsx` L21-26 vs L48-58, `DashboardPage.jsx` L209-222
- Intake doc: `change_requests/BUG-599_AGGREGATOR_ORDERS_VANISH_ON_REFRESH_INTAKE.md`
