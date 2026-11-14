# BUG-599 — Impact Analysis Rev 2 (Gate 2) — Expanded Scope

**ID:** BUG-599
**Date:** 2026-10-21
**Stage:** Gate 2 — Impact Analysis (Expanded)
**Supersedes:** `impact/BUG-599_IMPACT_ANALYSIS.md` (Rev 1 — refresh-only scope)
**Code Reality:** PARTIAL — Rev 1 fix (refresh path) already implemented; boot path is NONE
**Risk:** HIGH — aggregator orders invisible to staff after login
**Conflict Pre-Check:** CLEAN — no active item touches `LoadingPage.jsx` or `useRefreshAllData.js`

---

## 1. Summary

Aggregator orders (Swiggy/Zomato via UrbanPiper) are **not part of the boot sequence**. The LoadingPage loads 7 steps (Profile, Categories, Products, Tables, Settings, Running Orders, Popular Items) — all with loading indicators, error handling, and retry. Aggregator orders are fetched silently on DashboardPage mount as a fire-and-forget side effect with no UI, no error display, and no retry. If the fetch fails, staff sees zero aggregator orders with no way to know or recover.

**Expanded scope:** Move aggregator order loading into the LoadingPage boot sequence as a new step — "Aggregator Orders" — running in parallel (Tier 2) after Profile. Same loading/error/retry UX as all other steps.

---

## 2. Current Boot Architecture

### LoadingPage Two-Tier Flow

```
Tier 1 (barrier):   profile ─────────────────────────────────────────────→ done
                         │
Tier 2 (parallel):       ├── categories ──→ ✓
                         ├── products ────→ ✓
                         ├── tables ──────→ ✓    All via Promise.allSettled
                         ├── settings ────→ ✓    Each has own error/retry
                         ├── runningOrders → ✓
                         └── popularFood ─→ ✓
                                               │
Post-batch:              category↔product enrichment → setCategories/setProducts
                                               │
Phase 2 (conditional):  station data (if stations exist)
                                               │
Navigation:              → /dashboard
```

### Key Boot Patterns (from code)
- `API_LOADING_ORDER` in `constants.js` defines 7 steps with `{key, label, endpoint}`
- `loaderMap` in `LoadingPage.jsx` L526-534 maps keys → loader functions
- `loadAllData` L558-598: profile first → `Promise.allSettled(parallelLoaders)` → post-batch enrichment
- Each loader: `updateStatus(LOADING)` → API call → `updateStatus(SUCCESS/ERROR)` → toast on error
- Retry: `handleRetry` L607-646 finds ERROR keys → resets to IDLE → re-runs `loadAllData` with failed subset
- Progress: `useEffect` L101-177 computes `completed/total` → triggers navigation on 100%

### What's Missing
**Aggregator Orders** — currently a DashboardPage side effect (L207-222):
```js
const aggregatorBootDone = useRef(false);
useEffect(() => {
    if (aggregatorBootDone.current || !restaurantLoaded) return;
    aggregatorBootDone.current = true;
    getAggregatorOrderList()
      .then(data => { aggOrders.forEach(o => addOrder(o)); })
      .catch(err => console.warn('...')); // silent — no UI, no retry
}, [restaurantLoaded, addOrder]);
```

---

## 3. Dependency Analysis — Can Aggregator Orders Load in Parallel?

| Dependency | Required? | Available at Tier 2? | Notes |
|-----------|:---------:|:-------------------:|-------|
| **Auth token** | YES | ✅ YES | Already in `localStorage` from login, before LoadingPage mounts. Axios interceptor adds it automatically. |
| **Restaurant ID** | NO | — | `getAggregatorOrderList()` takes no params. Backend derives restaurant from auth token. |
| **Profile data** | NO | — | Transform reads only from API response, not from profile/restaurant context. |
| **Categories/Products** | NO | — | Transform maps food items independently. |
| **Running Orders (POS)** | ⚠️ ORDERING | ✅ Resolved by design | Both run in Tier 2 parallel. **Race condition solved:** combine both sets in the post-batch section BEFORE calling `setOrders`. See §4 below. |
| **Feature flag gate** | NO | — | Current DashboardPage code fetches unconditionally. No `features.delivery` gate. Keep this behavior. |

**Conclusion:** Aggregator orders can run in **Tier 2 parallel** with no barrier dependency. The only concern is the merge ordering with POS running orders — solved in the post-batch section.

---

## 4. Race Condition: POS Orders vs Aggregator Orders

### The Problem
Both `loadRunningOrders` and the new `loadAggregatorOrders` run in Tier 2 parallel. Currently `loadRunningOrders` calls `setOrders(data.runningOrders)` at L516 — a **full replace**. If aggregator orders are added via `addOrder` before `setOrders` fires, they get wiped.

### The Solution
**Defer `setOrders` to the post-batch section.** Both loaders store their results in `data.runningOrders` and `data.aggregatorOrders`. After `Promise.allSettled`, combine them:

```
Post-batch:
  combinedOrders = [...(data.runningOrders || []), ...(data.aggregatorOrders || [])]
  setOrders(combinedOrders)
```

This is the same pattern already used for category↔product enrichment (L583-594): individual loaders store data, post-batch combines and dispatches.

---

## 5. Files Affected

### Files WILL change

| # | File | What | Scope |
|---|------|------|-------|
| 1 | `src/api/constants.js` | Add `aggregatorOrders` entry to `API_LOADING_ORDER` | +1 line in array |
| 2 | `src/pages/LoadingPage.jsx` | Add `loadAggregatorOrders` loader function (same pattern as others) | +~25 lines |
| 2b | `src/pages/LoadingPage.jsx` | Add to `loaderMap` | +1 line |
| 2c | `src/pages/LoadingPage.jsx` | Add imports: `aggregatorService` + `aggregatorTransform` | +2 lines |
| 2d | `src/pages/LoadingPage.jsx` | Move `setOrders` call from inside `loadRunningOrders` to post-batch section, combining POS + aggregator | ~5 lines changed |
| 3 | `src/pages/DashboardPage.jsx` | Remove the `aggregatorBootDone` useEffect (L207-222) — no longer needed | -16 lines |
| 3b | `src/pages/DashboardPage.jsx` | Remove `getAggregatorOrderList` and `aggregatorFromAPI` imports (L35-36) if no other consumer | -2 lines |
| 4 | `src/hooks/useRefreshAllData.js` | Add aggregator re-fetch after POS orders (Fix B from original IA) | +5 lines |

### Files WILL NOT touch

`OrderContext.jsx` · `aggregatorService.js` · `aggregatorTransform.js` · `profileTransform.js` · `orderService.js` · `socketHandlers.js` · `useSocketEvents.js` · `useOrderPollingReconciliation.js` · `CartPanel.jsx` (R5) · `CollectPaymentPanel.jsx` (R5) · `orderTransform.js` (R5)

---

## 6. Data Flow — Proposed Boot Sequence

```
Tier 1 (barrier):   profile ──────────────────────────────────────────────→ done
                         │
Tier 2 (parallel):       ├── categories ──────→ data.categories ✓
                         ├── products ────────→ data.products ✓
                         ├── tables ──────────→ data.tables ✓      All via Promise.allSettled
                         ├── settings ────────→ data.settings ✓    Each has own error/retry
                         ├── runningOrders ───→ data.runningOrders ✓  (NO setOrders here)
                         ├── popularFood ─────→ data.popularProducts ✓
                         └── aggregatorOrders → data.aggregatorOrders ✓  ← NEW
                                                    │
Post-batch:              category↔product enrichment
                         combinedOrders = POS + aggregator → setOrders(combined)  ← NEW
                                                    │
Phase 2 (conditional):  station data
                                                    │
Navigation:              → /dashboard (aggregator orders already in context)
```

---

## 7. Refresh Path (Fix B — already partially implemented in Rev 1)

The `useRefreshAllData` hook currently fetches POS orders only. It needs to also re-fetch aggregator orders:

```
Current:   getTables → getCategories+getProducts → getRunningOrders → mergeRunningOrders
Proposed:  getTables → getCategories+getProducts → getRunningOrders + getAggregatorOrderList
           → combine POS + aggregator → mergeRunningOrders(combined)
```

This ensures the Refresh button reloads both POS and aggregator orders.

---

## 8. Retry Behavior

The new `loadAggregatorOrders` follows the exact same pattern as all other loaders:
- `updateStatus('aggregatorOrders', LOADING)` on start
- `updateStatus('aggregatorOrders', SUCCESS, count)` on success
- `updateStatus('aggregatorOrders', ERROR, message)` on failure + destructive toast
- `handleRetry` automatically picks up ERROR keys and retries them
- Progress bar includes the new step in its denominator

If aggregator fetch fails but all other steps succeed → boot stops at error state → Retry button appears → user clicks Retry → only the failed aggregator step re-runs.

---

## 9. DashboardPage Cleanup

Remove the entire `aggregatorBootDone` useEffect block (L207-222) from DashboardPage. This code becomes dead once aggregator orders load during boot. The `aggregatorBootDone` ref, `getAggregatorOrderList` import, and `aggregatorFromAPI` import are all removed (unless `aggregatorFromAPI` is used elsewhere in DashboardPage for socket events — check needed at Gate 3).

---

## 10. Risk Assessment

| # | Risk | Level | Mitigation |
|---|------|-------|------------|
| R-1 | Race condition: POS `setOrders` wipes aggregator orders | ELIMINATED | Both stored in `data`, combined in post-batch before single `setOrders` call |
| R-2 | Aggregator API slow → delays boot | LOW | Runs in parallel with 6 other APIs via `Promise.allSettled`. Doesn't block others. Worst case: progress bar shows this step still loading while others complete. |
| R-3 | Aggregator API fails → blocks boot | LOW | Same as any other boot step — error shown, retry available. User can see which step failed. |
| R-4 | Removing DashboardPage boot fetch breaks socket-driven aggregator updates | NONE | Socket events (`aggregator_order_69`) are handled by `useSocketEvents.js` — completely independent of the boot fetch. Sockets add/update orders via `addOrder`/`updateOrder` in OrderContext. |
| R-5 | `loadRunningOrders` no longer calls `setOrders` inline — could this break retry? | NONE | On retry, `loadAllData` re-runs with failed keys. Post-batch always combines and dispatches. If only `runningOrders` failed, aggregator data is still in `data` from previous successful load. |

---

## 11. Owner Decisions

**None required.** This is an architectural improvement that:
- Adds aggregator orders to the existing boot framework with the same UX patterns
- No new UI design needed (reuses existing loading row, error, retry)
- No API changes
- No business logic changes
- No financial impact

---

## 12. Verification Matrix (seeds Gate 3 + QA)

| # | What to Verify | Method | Automated? |
|---|---------------|--------|:---:|
| V-1 | "Aggregator Orders" row visible on LoadingPage during boot | Browser: login → loading screen shows new row | NO |
| V-2 | Aggregator orders loaded with count and timing | Browser: row shows "N loaded Xs" | NO |
| V-3 | Aggregator orders visible on dashboard after boot (Delivery section) | Browser: dashboard shows delivery/aggregator cards | NO |
| V-4 | If aggregator API fails, error shown + retry works | Browser: simulate failure → red row → click Retry → recovers | NO |
| V-5 | POS running orders still load correctly (no regression) | Browser: Dine-In / Walk-In orders visible | NO |
| V-6 | No duplicate orders after boot (POS + aggregator combined correctly) | Browser: order count matches API totals | NO |
| V-7 | DashboardPage `aggregatorBootDone` useEffect removed | `grep -c "aggregatorBootDone" src/pages/DashboardPage.jsx` → 0 | YES |
| V-8 | `API_LOADING_ORDER` has 8 entries | `grep -c "key:" src/api/constants.js` in the array | YES |
| V-9 | Refresh button re-fetches aggregator orders | Browser: click Refresh → `mergeRunningOrders` log shows aggregator count > 0 | NO |
| V-10 | Socket-driven aggregator updates still work after boot | Browser: wait for new Swiggy/Zomato order via socket → appears | NO |
| V-11 | webpack compiles with 0 new warnings | Dev server log | YES |

---

## 13. Evidence Artifacts

- Rev 1 IA: `impact/BUG-599_IMPACT_ANALYSIS.md`
- Rev 1 Plan: `plans/BUG-599_IMPLEMENTATION_PLAN.md` (refresh-only — to be superseded by expanded plan)
- Rev 1 Implementation: `useRefreshAllData.js` BUG-599 edit (already shipped)
- Investigation: `evidence/BUG-599-600-601/INVESTIGATION_REPORT_AGGREGATOR_2026_10_21.md`
- Intake: `change_requests/BUG-599_AGGREGATOR_ORDERS_VANISH_ON_REFRESH_INTAKE.md`
- Boot architecture trace: `LoadingPage.jsx` L558-598, `constants.js` `API_LOADING_ORDER`
- API probe: `get-order-list` returns 20 orders for RID 69 (Goan Kitchen), all `f_order_status: 1-2`, Swiggy + Zomato
