# BUG-599 — Implementation Plan (Gate 3)

**ID:** BUG-599
**Date:** 2026-10-21
**Stage:** Gate 3 — Implementation Plan
**Impact Analysis:** `impact/BUG-599_IMPACT_ANALYSIS.md` (Gate 2, same session)
**IA Anchors Verified:** YES — `useRefreshAllData.js` unchanged (md5 `4f32b345bb1194a2dde4ee6c06a5a841`)
**Code Reality:** NONE
**Risk:** HIGH (orders invisible to staff) — but fix is SMALL (1 file, 3 edit sites, ~5 changed lines)
**Fast Lane Eligible:** YES (1 file, ≤10 lines, no API/state-schema/localStorage/env change, no R5 hotspot, not financial)

---

## 1. Scope Lock

### Files WILL change

| # | File | Lines | Change |
|---|------|-------|--------|
| 1 | `src/hooks/useRefreshAllData.js` | L19, L45, L46 | Swap `setOrders` → `mergeRunningOrders` |

### Files WILL NOT touch

`DashboardPage.jsx` (R5) · `OrderContext.jsx` · `useOrderPollingReconciliation.js` · `aggregatorService.js` · `aggregatorTransform.js` · `orderService.js` · `socketHandlers.js` · `useSocketEvents.js` · `LoadingPage.jsx` · `CartPanel.jsx` (R5) · `CollectPaymentPanel.jsx` (R5) · `orderTransform.js` (R5) · any test file · any transform · any service · any `.env`

---

## 2. Exact Edits

### E-1: Destructure `mergeRunningOrders` instead of `setOrders` (L19)

**Current (L19):**
```js
  const { setOrders } = useOrders();
```

**New (L19):**
```js
  const { mergeRunningOrders } = useOrders(); // BUG-599
```

**Rationale:** `mergeRunningOrders` (OrderContext L48-58) preserves `isAggregator === true` orders from the previous state while replacing all POS orders with the fresh list. `setOrders` does a full replace, wiping aggregator orders. We no longer need `setOrders` in this hook.

---

### E-2: Call `mergeRunningOrders` instead of `setOrders` (L45)

**Current (L45):**
```js
    setOrders(freshOrders);
```

**New (L45):**
```js
    mergeRunningOrders(freshOrders); // BUG-599: preserve aggregator orders
```

**Rationale:** Direct swap — same input (`freshOrders` from `getRunningOrders`), different merge strategy (preserves aggregator orders in context).

---

### E-3: Update `useCallback` deps array (L46)

**Current (L46):**
```js
  }, [setCategories, setProducts, setTables, setOrders, permissions]);
```

**New (L46):**
```js
  }, [setCategories, setProducts, setTables, mergeRunningOrders, permissions]); // BUG-599
```

**Rationale:** React hooks exhaustive-deps rule — the callback now closes over `mergeRunningOrders` instead of `setOrders`. Both are stable refs (`useCallback` with `[]` deps in OrderContext), so no re-render impact.

---

## 3. Execution Sequence

Single file, 3 adjacent edit sites — execute in one pass:

1. **E-1** (L19): swap destructure
2. **E-2** (L45): swap call
3. **E-3** (L46): swap dep

All three are in the same file within 27 lines of each other. No ordering dependency between them. Can be applied as a single `search_replace` or three parallel `search_replace` calls.

---

## 4. Verification Matrix

| # | Edit | What to Verify | Method | Automated? |
|---|------|---------------|--------|:---:|
| V-1 | E-1 | `mergeRunningOrders` destructured from `useOrders()` | `grep -n "mergeRunningOrders" src/hooks/useRefreshAllData.js` → 2 hits (L19 + L46) | YES |
| V-2 | E-1 | `setOrders` no longer imported in useRefreshAllData | `grep -c "setOrders" src/hooks/useRefreshAllData.js` → 0 | YES |
| V-3 | E-2 | `mergeRunningOrders(freshOrders)` called at L45 | Code review | YES |
| V-4 | E-3 | `mergeRunningOrders` in deps, `setOrders` removed from deps | Code review L46 | YES |
| V-5 | ALL | webpack compiles with 0 new warnings | `tail -5 /var/log/supervisor/frontend.out.log` → "compiled" | YES |
| V-6 | ALL | After manual refresh, aggregator orders remain visible | Browser: login as aggregator restaurant → see aggregator orders → refresh → still visible | NO |
| V-7 | ALL | POS orders correctly refreshed | Browser: place POS order → refresh → new order visible, old settled orders gone | NO |
| V-8 | ALL | No duplicate aggregator orders after 3× refresh | Browser: refresh 3 times → aggregator order count unchanged | NO |
| V-9 | — | `LoadingPage.jsx` still uses `setOrders` (boot path unchanged) | `grep -c "setOrders" src/pages/LoadingPage.jsx` → ≥1 | YES |
| V-10 | — | `mergeRunningOrders` in OrderContext still preserves aggregator orders | Code review OrderContext L48-58 unchanged | YES |

---

## 5. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R-1 | Aggregator orders duplicated after merge | VERY LOW | MEDIUM | `mergeRunningOrders` replaces ALL non-aggregator orders with fresh list; aggregator orders carried from prev. Same orderId can't appear in both POS and aggregator APIs. |
| R-2 | `isLoaded` not re-set on refresh | NONE | — | `isLoaded` is already `true` at refresh time (set during boot by `setOrders` in LoadingPage). `mergeRunningOrders` not setting it is a no-op. |
| R-3 | Stale aggregator order status after refresh | LOW | LOW | Socket events continue updating aggregator orders in real-time. Refresh only touches POS orders. Worst case: ~30s window of slightly stale aggregator status (same as today for non-refresh scenarios). |
| R-4 | `mergeRunningOrders` deps change breaks memoization | NONE | — | `mergeRunningOrders` is `useCallback(fn, [])` — stable reference, same as `setOrders`. No re-render impact. |

---

## 6. Post-Code Registry Checklist

The Implementation agent MUST execute after coding:

- [ ] `registry.json`: BUG-599 → `status: GATE_5A_IMPLEMENTED`, `sprint_key: nov_cr_batch`
- [ ] `BUG_TRACKER.md`: row updated with IMPLEMENTED status
- [ ] `FILE_OWNERSHIP.md`: add `src/hooks/useRefreshAllData.js` with BUG-599 + date
- [ ] Code markers: `// BUG-599` comment on every modified line (E-1 L19, E-2 L45, E-3 L46)
- [ ] Compile check: webpack 0 new warnings

---

## 7. Final State (expected file after all edits)

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
