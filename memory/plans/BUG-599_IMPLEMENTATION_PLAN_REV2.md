# BUG-599 — Implementation Plan Rev 2 (Gate 3) — Expanded Scope

**ID:** BUG-599
**Date:** 2026-10-21
**Stage:** Gate 3 — Implementation Plan
**Impact Analysis:** `impact/BUG-599_IMPACT_ANALYSIS_REV2.md` (Gate 2, same session)
**Supersedes:** `plans/BUG-599_IMPLEMENTATION_PLAN.md` (Rev 1 — refresh-only)
**IA Anchors Verified:** YES — all target files unchanged since IA
**Code Reality:** PARTIAL (Rev 1 refresh fix already in `useRefreshAllData.js`)
**Risk:** HIGH (orders invisible) — fix is MEDIUM (4 files, ~12 edit sites, ~55 lines net)

---

## 1. Scope Lock

### Files WILL change

| # | File | Edit Count | Net Lines |
|---|------|:---:|:---:|
| 1 | `src/api/constants.js` | 1 | +1 |
| 2 | `src/pages/LoadingPage.jsx` | 5 | +30 |
| 3 | `src/pages/DashboardPage.jsx` | 2 | -17 |
| 4 | `src/hooks/useRefreshAllData.js` | 3 | +8 |

### Files WILL NOT touch

`OrderContext.jsx` · `aggregatorService.js` · `aggregatorTransform.js` · `orderService.js` · `profileTransform.js` · `socketHandlers.js` · `useSocketEvents.js` · `useOrderPollingReconciliation.js` · `CartPanel.jsx` (R5) · `CollectPaymentPanel.jsx` (R5) · `orderTransform.js` (R5) · any test file · any `.env`

---

## 2. Execution Sequence

```
Step 1: constants.js          — Add aggregatorOrders to API_LOADING_ORDER
Step 2: LoadingPage.jsx        — Add imports + loader + loaderMap + move setOrders to post-batch
Step 3: DashboardPage.jsx      — Remove dead boot fetch + clean imports
Step 4: useRefreshAllData.js   — Add aggregator fetch to refresh path
Step 5: Verify compile
```

---

## 3. Exact Edits

### E-1: Add `aggregatorOrders` to `API_LOADING_ORDER` (`constants.js` L458)

**Current (L457-458):**
```js
  { key: 'popularFood', label: 'Popular Items', endpoint: 'POPULAR_FOOD' }, // BUG-340
];
```

**New:**
```js
  { key: 'popularFood', label: 'Popular Items', endpoint: 'POPULAR_FOOD' }, // BUG-340
  { key: 'aggregatorOrders', label: 'Aggregator Orders', endpoint: 'AGGREGATOR_ORDER_LIST' }, // BUG-599
];
```

---

### E-2a: Add imports to `LoadingPage.jsx` (after L17)

**Current (L17):**
```js
import * as stationService from "../api/services/stationService";
```

**New:**
```js
import * as stationService from "../api/services/stationService";
import { getAggregatorOrderList } from "../api/services/aggregatorService"; // BUG-599
import { fromAPI as aggregatorFromAPI } from "../api/transforms/aggregatorTransform"; // BUG-599
```

---

### E-2b: Add `loadAggregatorOrders` loader function (`LoadingPage.jsx`, after `loadPopularFood` ~L469)

Insert after `loadPopularFood` closing brace (after L469):

```js
  // BUG-599: Aggregator order loader — same pattern as all other boot steps.
  // Fetches UrbanPiper (Swiggy/Zomato) orders. No dependency on profile data
  // beyond the auth token (already in localStorage). Runs in Tier 2 parallel.
  const loadAggregatorOrders = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('aggregatorOrders', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      const apiResponse = await getAggregatorOrderList();
      if (ctrl.aborted) return;
      data.aggregatorOrders = aggregatorFromAPI.aggregatorOrderList(apiResponse);
      const count = data.aggregatorOrders?.length || 0;
      updateStatus('aggregatorOrders', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      data.aggregatorOrders = []; // BUG-599: empty on failure so post-batch combine still works
      updateStatus('aggregatorOrders', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load aggregator orders", description: error.readableMessage || error.message, variant: "destructive" });
    }
  };
```

---

### E-2c: Add to `loaderMap` (`LoadingPage.jsx` L533)

**Current (L533):**
```js
    popularFood: loadPopularFood, // BUG-340
  };
```

**New:**
```js
    popularFood: loadPopularFood, // BUG-340
    aggregatorOrders: loadAggregatorOrders, // BUG-599
  };
```

---

### E-2d: Remove inline `setOrders` from `loadRunningOrders` (`LoadingPage.jsx` L516)

**Current (L515-517):**
```js
      const count = data.runningOrders?.length || 0;
      setOrders(data.runningOrders);
      updateStatus('runningOrders', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
```

**New:**
```js
      const count = data.runningOrders?.length || 0;
      // BUG-599: setOrders moved to post-batch — combines POS + aggregator orders
      updateStatus('runningOrders', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
```

---

### E-2e: Add combined orders dispatch to post-batch section (`LoadingPage.jsx` L594-597)

**Current (L593-597):**
```js
    if (data.categories) setCategories(data.categories);
    if (data.products) setProducts(data.products);
    if (data.popularProducts) setPopularProducts(data.popularProducts); // BUG-340

    loadedDataRef.current = data;
```

**New:**
```js
    if (data.categories) setCategories(data.categories);
    if (data.products) setProducts(data.products);
    if (data.popularProducts) setPopularProducts(data.popularProducts); // BUG-340

    // BUG-599: Combine POS + aggregator orders before dispatching to context.
    // Both load in Tier 2 parallel; merging here avoids the race where
    // setOrders(POS) would wipe aggregator orders added via addOrder.
    if (data.runningOrders) {
      const combined = [...data.runningOrders, ...(data.aggregatorOrders || [])];
      setOrders(combined);
    }

    loadedDataRef.current = data;
```

---

### E-3a: Remove aggregator boot fetch from `DashboardPage.jsx` (L207-222)

**Remove entire block:**
```js
  // CR-106: Fetch existing aggregator orders on dashboard boot
  // These come from a separate API (UrbanPiper) and aren't included in regular getRunningOrders
  const aggregatorBootDone = useRef(false);
  useEffect(() => {
    if (aggregatorBootDone.current || !restaurantLoaded) return;
    aggregatorBootDone.current = true;
    getAggregatorOrderList()
      .then(data => {
        const aggOrders = aggregatorFromAPI.aggregatorOrderList(data);
        aggOrders.forEach(o => addOrder(o));
        if (aggOrders.length > 0) {
          console.log(`[Dashboard] CR-106: Loaded ${aggOrders.length} aggregator orders on boot`);
        }
      })
      .catch(err => console.warn('[Dashboard] CR-106: Aggregator boot fetch failed (non-blocking):', err?.message));
  }, [restaurantLoaded, addOrder]);
```

**Replace with:**
```js
  // BUG-599: Aggregator orders now loaded during boot (LoadingPage).
  // Socket events (aggregator_order_69) handle real-time updates post-boot.
```

---

### E-3b: Clean DashboardPage imports (L35-36)

**Current (L35-36):**
```js
import { updateAggregatorOrderStatus, getAggregatorOrderList } from "../api/services/aggregatorService";    // CR-106
import { fromAPI as aggregatorFromAPI } from "../api/transforms/aggregatorTransform"; // CR-106
```

**New:**
```js
import { updateAggregatorOrderStatus } from "../api/services/aggregatorService";    // CR-106
// BUG-599: getAggregatorOrderList + aggregatorFromAPI moved to LoadingPage boot
```

---

### E-4: Expand `useRefreshAllData.js` — add aggregator fetch to refresh path

**Current (L1-47):**
```js
// useRefreshAllData — Refreshes volatile data without re-login
// Scope: Tables → Categories + Products (parallel) → Orders
// Skips: Profile/Permissions (session-sensitive), Cancellation Reasons (static)

import { useCallback } from 'react';
import { useMenu } from '../contexts/MenuContext';
import { useTables } from '../contexts/TableContext';
import { useOrders } from '../contexts/OrderContext';
import { useAuth } from '../contexts/AuthContext';
import * as categoryService from '../api/services/categoryService';
import * as productService from '../api/services/productService';
import * as tableService from '../api/services/tableService';
import * as orderService from '../api/services/orderService';
import { PAGINATION } from '../api/constants'; // BUG-451

export const useRefreshAllData = () => {
  const { setCategories, setProducts } = useMenu();
  const { setTables } = useTables();
  const { mergeRunningOrders } = useOrders(); // BUG-599
  const { permissions } = useAuth();

  return useCallback(async () => {
    // Step A: Tables first — fastest, no dependencies
    const freshTables = await tableService.getTables(true);
    setTables(freshTables);

    // Step B: Categories + Products in parallel
    const [catResult, prodResult] = await Promise.all([
      categoryService.getCategories(),
      productService.getProducts({ limit: PAGINATION.DEFAULT_LIMIT, offset: 1, type: 'all' }), // BUG-451
    ]);

    // Cross-calculate item counts (same pattern as LoadingPage)
    const enrichedCategories = categoryService.calculateItemCounts(
      catResult,
      prodResult.products
    );
    setCategories(enrichedCategories);
    setProducts(prodResult.products);

    // Step C: Orders last — backend-authoritative role tier is permissions[0]
    // (raw `role[0]`). Fallback 'Manager' for safety.
    const roleParam = permissions?.[0] || 'Manager';
    const freshOrders = await orderService.getRunningOrders(roleParam);
    mergeRunningOrders(freshOrders); // BUG-599: preserve aggregator orders
  }, [setCategories, setProducts, setTables, mergeRunningOrders, permissions]); // BUG-599
};
```

**New (full file rewrite):**
```js
// useRefreshAllData — Refreshes volatile data without re-login
// Scope: Tables → Categories + Products (parallel) → POS Orders + Aggregator Orders
// Skips: Profile/Permissions (session-sensitive), Cancellation Reasons (static)

import { useCallback } from 'react';
import { useMenu } from '../contexts/MenuContext';
import { useTables } from '../contexts/TableContext';
import { useOrders } from '../contexts/OrderContext';
import { useAuth } from '../contexts/AuthContext';
import * as categoryService from '../api/services/categoryService';
import * as productService from '../api/services/productService';
import * as tableService from '../api/services/tableService';
import * as orderService from '../api/services/orderService';
import { getAggregatorOrderList } from '../api/services/aggregatorService'; // BUG-599
import { fromAPI as aggregatorFromAPI } from '../api/transforms/aggregatorTransform'; // BUG-599
import { PAGINATION } from '../api/constants'; // BUG-451

export const useRefreshAllData = () => {
  const { setCategories, setProducts } = useMenu();
  const { setTables } = useTables();
  const { setOrders } = useOrders(); // BUG-599 Rev2: full replace with combined POS+aggregator
  const { permissions } = useAuth();

  return useCallback(async () => {
    // Step A: Tables first — fastest, no dependencies
    const freshTables = await tableService.getTables(true);
    setTables(freshTables);

    // Step B: Categories + Products in parallel
    const [catResult, prodResult] = await Promise.all([
      categoryService.getCategories(),
      productService.getProducts({ limit: PAGINATION.DEFAULT_LIMIT, offset: 1, type: 'all' }), // BUG-451
    ]);

    // Cross-calculate item counts (same pattern as LoadingPage)
    const enrichedCategories = categoryService.calculateItemCounts(
      catResult,
      prodResult.products
    );
    setCategories(enrichedCategories);
    setProducts(prodResult.products);

    // Step C: POS Orders + Aggregator Orders in parallel — BUG-599
    const roleParam = permissions?.[0] || 'Manager';
    const [freshOrders, aggResult] = await Promise.allSettled([
      orderService.getRunningOrders(roleParam),
      getAggregatorOrderList().then(res => aggregatorFromAPI.aggregatorOrderList(res)),
    ]);

    const posOrders = freshOrders.status === 'fulfilled' ? freshOrders.value : [];
    const aggOrders = aggResult.status === 'fulfilled' ? aggResult.value : [];
    if (aggResult.status === 'rejected') {
      console.warn('[useRefreshAllData] BUG-599: Aggregator refresh failed (non-blocking):', aggResult.reason?.message);
    }
    setOrders([...posOrders, ...aggOrders]); // BUG-599: combined replace
  }, [setCategories, setProducts, setTables, setOrders, permissions]); // BUG-599 Rev2
};
```

---

## 4. Verification Matrix

| # | Edit | What to Verify | Method | Auto? |
|---|------|---------------|--------|:---:|
| V-1 | E-1 | `API_LOADING_ORDER` has 8 entries | grep count | YES |
| V-2 | E-2a | aggregatorService + aggregatorTransform imported in LoadingPage | grep | YES |
| V-3 | E-2b | `loadAggregatorOrders` function exists | grep | YES |
| V-4 | E-2c | `aggregatorOrders` in loaderMap | grep | YES |
| V-5 | E-2d | `setOrders` NOT called inside `loadRunningOrders` | grep confirms 0 hits in that function | YES |
| V-6 | E-2e | `setOrders(combined)` in post-batch section | grep | YES |
| V-7 | E-3a | `aggregatorBootDone` removed from DashboardPage | grep → 0 hits | YES |
| V-8 | E-3b | `getAggregatorOrderList` removed from DashboardPage import | grep → 0 hits | YES |
| V-9 | E-4 | useRefreshAllData fetches aggregator + POS in parallel | code review | YES |
| V-10 | ALL | webpack compiles with 0 new warnings | dev server log | YES |
| V-11 | ALL | "Aggregator Orders" row visible on LoadingPage | Browser | NO |
| V-12 | ALL | Aggregator orders visible on dashboard after boot | Browser | NO |
| V-13 | ALL | If aggregator API fails → error row + retry works | Browser | NO |
| V-14 | ALL | POS orders still load correctly (no regression) | Browser | NO |
| V-15 | ALL | Refresh re-fetches both POS + aggregator | Console: setOrders log | NO |
| V-16 | ALL | Socket aggregator events still work post-boot | Browser | NO |

---

## 5. Risk Register

| # | Risk | Level | Mitigation |
|---|------|-------|------------|
| R-1 | Race: POS setOrders wipes aggregator | ELIMINATED | Both stored in `data`, combined in post-batch |
| R-2 | Aggregator API slow delays boot | LOW | Runs in parallel via allSettled; doesn't block others |
| R-3 | Aggregator fails blocks boot | BY DESIGN | Same as other steps — error shown, retry available |
| R-4 | Removing DashboardPage boot fetch breaks sockets | NONE | Socket events independent — handled by useSocketEvents |
| R-5 | Refresh: aggregator fails → POS orders also lost | ELIMINATED | `Promise.allSettled` — POS resolves independently; both results extracted; combined |
| R-6 | Retry: only aggregator failed → POS orders lost on re-dispatch | NONE | Post-batch combines `data.runningOrders` (still in ref from prior success) + freshly retried aggregator |

---

## 6. Post-Code Registry Checklist

- [ ] `registry.json`: BUG-599 → `status: GATE_5A_IMPLEMENTED`, notes updated with Rev 2 scope
- [ ] `BUG_TRACKER.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: add `constants.js`, `LoadingPage.jsx`, `DashboardPage.jsx`, `useRefreshAllData.js` with BUG-599
- [ ] Code markers: `// BUG-599` on every modified line/block
- [ ] Compile check: webpack 0 new warnings
