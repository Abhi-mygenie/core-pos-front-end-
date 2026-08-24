# BUG-340 — Popular Tab Empty Chips
## Gate 3: Implementation Plan

**Date:** 2026-08-22
**Role:** PLANNING agent
**Stage:** Gate 3 — Implementation Plan
**Risk:** HIGH
**Sprint:** POS 6.0

---

## Owner Decisions: ALL RESOLVED
OQ-1: Load at boot, gated by showPopularCategory ✅
OQ-2: Refresh alongside menu refresh ✅
OQ-3: Block boot on API failure ✅

---

## Scope Lock

**Files WILL change (4 files):**
- `src/api/constants.js`
- `src/pages/LoadingPage.jsx`
- `src/contexts/MenuContext.jsx`
- `src/components/order-entry/OrderEntry.jsx`

**Files WILL NOT touch:**
- `productTransform.js` · `CategoryPanel.jsx` · `DashboardPage.jsx` · `CollectPaymentPanel.jsx` · `orderTransform.js`

---

## Edit 1 — `src/api/constants.js`
**Change:** Add `popularFood` entry to `API_LOADING_ORDER`.

**Location:** Line 435 (after `runningOrders` entry).

**Before:**
```js
  { key: 'cancellationReasons', label: 'Settings', endpoint: 'CANCELLATION_REASONS' },
  { key: 'runningOrders', label: 'Running Orders', endpoint: 'RUNNING_ORDERS' },
];
```

**After:**
```js
  { key: 'cancellationReasons', label: 'Settings', endpoint: 'CANCELLATION_REASONS' },
  { key: 'runningOrders', label: 'Running Orders', endpoint: 'RUNNING_ORDERS' },
  { key: 'popularFood', label: 'Popular Items', endpoint: 'POPULAR_FOOD' }, // BUG-340
];
```

**Why:** `loadingStatus` is derived from `API_LOADING_ORDER`. Adding `popularFood` here means:
- It appears in the boot progress bar UI
- `phase1HasError` check includes it → blocks boot on failure (OQ-3)
- Retry logic re-runs it when it failed (OQ-2)

**Risk:** LOW — additive only.

---

## Edit 2 — `src/pages/LoadingPage.jsx`

### Edit 2a — Import `setPopularProducts` from `useMenu`

**Location:** Line 29 (current `const { setCategories, setProducts } = useMenu();`)

**Before:**
```js
  const { setCategories, setProducts } = useMenu();
```

**After:**
```js
  const { setCategories, setProducts, setPopularProducts } = useMenu(); // BUG-340: +setPopularProducts
```

---

### Edit 2b — Import `getPopularFoods` from service

**Location:** After existing service imports at top of file.

Find the line:
```js
import * as productService from "../api/services/productService";
```

Add after it:
```js
import { getPopularFoods } from '../api/services/menuManagementService'; // BUG-340
import { fromAPI as productFromAPI } from '../api/transforms/productTransform'; // BUG-340
```

---

### Edit 2c — Add `loadPopularFood` loader function

**Location:** After the `loadProducts` function (after line ~436, before `loadTables`).

**Add:**
```js
  // BUG-340: Popular food loader — gated by showPopularCategory.
  // Runs in Tier 2 parallel batch alongside products/categories.
  // Early-exits with SUCCESS when toggle is off (zero API cost).
  // Errors BLOCK BOOT (owner decision OQ-3) via phase1HasError.
  const loadPopularFood = async (ctrl, data) => {
    const t0 = Date.now();
    const showPopular = data.profile?.restaurant?.settings?.showPopularCategory;

    // Gate: if toggle is off, skip silently with SUCCESS (no boot cost)
    if (!showPopular) {
      updateStatus('popularFood', LOADING_STATES.SUCCESS, null, 0, 0, { elapsed: '0.0', startedAt: null });
      data.popularProducts = [];
      return;
    }

    updateStatus('popularFood', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      const res = await getPopularFoods('all');
      if (ctrl.aborted) return;
      // Transform through productTransform.fromAPI — same path as all menu products.
      // This fixes the field name mismatch (api.id → productId, api.name → productName, etc.)
      const raw = res.data?.products || [];
      data.popularProducts = raw.map(p => productFromAPI.product(p));
      const count = data.popularProducts.length;
      updateStatus('popularFood', LOADING_STATES.SUCCESS, null, count, count, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('popularFood', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load popular items", description: error.readableMessage, variant: "destructive" });
    }
  };
```

---

### Edit 2d — Wire `loadPopularFood` into `loaderMap`

**Location:** Lines 493-500 (the `loaderMap` object).

**Before:**
```js
  const loaderMap = {
    profile: loadProfile,
    categories: loadCategories,
    products: loadProducts,
    tables: loadTables,
    cancellationReasons: loadCancellationReasons,
    runningOrders: loadRunningOrders,
  };
```

**After:**
```js
  const loaderMap = {
    profile: loadProfile,
    categories: loadCategories,
    products: loadProducts,
    tables: loadTables,
    cancellationReasons: loadCancellationReasons,
    runningOrders: loadRunningOrders,
    popularFood: loadPopularFood, // BUG-340
  };
```

---

### Edit 2e — Dispatch `setPopularProducts` in post-batch

**Location:** Lines 559-560 (current `setCategories` + `setProducts` dispatch).

**Before:**
```js
    if (data.categories) setCategories(data.categories);
    if (data.products) setProducts(data.products);
```

**After:**
```js
    if (data.categories) setCategories(data.categories);
    if (data.products) setProducts(data.products);
    if (data.popularProducts) setPopularProducts(data.popularProducts); // BUG-340
```

**Risk:** HIGH (R5 LoadingPage). All edits are additive — no existing loader, loaderMap entry, or dispatch call is modified.

---

## Edit 3 — `src/contexts/MenuContext.jsx`

### Edit 3a — Add `popularProducts` state

**Location:** Line 10 (after `products` state declaration).

**Before:**
```js
  const [products, setProductsData] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
```

**After:**
```js
  const [products, setProductsData] = useState([]);
  const [popularProducts, setPopularProductsData] = useState([]); // BUG-340
  const [isLoaded, setIsLoaded] = useState(false);
```

---

### Edit 3b — Add `setPopularProducts` action

**Location:** After the existing `setProducts` callback (after line ~21).

**Before:**
```js
  // Set products (called from LoadingPage)
  const setProducts = useCallback((data) => {
    setProductsData(data || []);
    setIsLoaded(true);
  }, []);
```

**After:**
```js
  // Set products (called from LoadingPage)
  const setProducts = useCallback((data) => {
    setProductsData(data || []);
    setIsLoaded(true);
  }, []);

  // BUG-340: Set popular products (called from LoadingPage boot, gated by showPopularCategory)
  const setPopularProducts = useCallback((data) => {
    setPopularProductsData(data || []);
  }, []);
```

---

### Edit 3c — Add `popularProducts` to `clearMenu`

**Location:** Lines 45-50 (clearMenu callback).

**Before:**
```js
  const clearMenu = useCallback(() => {
    setCategoriesData([]);
    setProductsData([]);
    setIsLoaded(false);
  }, []);
```

**After:**
```js
  const clearMenu = useCallback(() => {
    setCategoriesData([]);
    setProductsData([]);
    setPopularProductsData([]); // BUG-340
    setIsLoaded(false);
  }, []);
```

---

### Edit 3d — Expose in context value

**Location:** The `value = useMemo(...)` object and its dependency array.

In the `value` object, add after `products`:
```js
    popularProducts,       // BUG-340
    setPopularProducts,    // BUG-340
```

In the `useMemo` dependency array, add:
```js
    popularProducts,
    setPopularProducts,
```

**Risk:** HIGH (MenuContext — consumed everywhere). Additive only — zero changes to existing `products`, `categories`, `setProducts` etc.

---

## Edit 4 — `src/components/order-entry/OrderEntry.jsx`

### Edit 4a — Remove `getPopularFoods` import

**Location:** Line 41.

**Before:**
```js
import { getPopularFoods } from '../../api/services/menuManagementService'; // CR-148
```

**After:**
```js
// BUG-340: getPopularFoods import removed — popular items now loaded at boot via LoadingPage/MenuContext
```

*(Keep as comment so the change is traceable, or remove entirely — either acceptable)*

---

### Edit 4b — Replace local `popularProducts` state + useEffect with context read

**Location:** Lines 97-140 (CR-148 on-demand fetch block).

**Before:**
```js
  // CR-148: Popular category gate + state
  const showPopularCategory = !!restaurant?.settings?.showPopularCategory;
  const [activeCategory, setActiveCategory] = useState(() => showPopularCategory ? "popular" : "all"); // CR-148: default to popular if enabled
  const [popularProducts, setPopularProducts] = useState([]); // CR-148
```

**After:**
```js
  // CR-148 / BUG-340: Popular category gate — read from MenuContext (loaded at boot)
  const showPopularCategory = !!restaurant?.settings?.showPopularCategory;
  const [activeCategory, setActiveCategory] = useState(() => showPopularCategory ? "popular" : "all");
```

*(Remove the local `popularProducts` state — it comes from context now)*

---

### Edit 4c — Remove the `getPopularFoods` useEffect (lines 131-140)

**Before:**
```js
  // CR-148: Fetch popular foods on mount if showPopularCategory is enabled
  useEffect(() => {
    if (!showPopularCategory) return;
    getPopularFoods('all')
      .then(res => {
        const items = (res.data?.products || []).map(adaptProduct);
        setPopularProducts(items);
      })
      .catch(() => {}); // silent fail — Popular tab shows empty, app doesn't crash
  }, [showPopularCategory]); // eslint-disable-line react-hooks/exhaustive-deps
```

**After:** *(remove entirely)*

---

### Edit 4d — Read `popularProducts` from `useMenu()`

**Location:** Line 53.

**Before:**
```js
  const { categories, products } = useMenu();
```

**After:**
```js
  const { categories, products, popularProducts } = useMenu(); // BUG-340: popularProducts from boot
```

**Risk:** HIGH (R5 OrderEntry). Net simpler — removes broken useEffect + local state, replaces with 1 destructure change. Existing `getFilteredItems` line 550 (`items = popularProducts`) continues to work unchanged — now reads from context instead of local state.

---

## Execution Sequence

```
1. Edit 1 — constants.js          (independent — add to API_LOADING_ORDER)
2. Edit 3a-d — MenuContext.jsx     (independent — add popularProducts state + setter + clear + context)
3. Edit 2a — LoadingPage import setPopularProducts  (depends on Edit 3)
4. Edit 2b — LoadingPage import getPopularFoods + productFromAPI
5. Edit 2c — LoadingPage loadPopularFood function   (depends on 2b)
6. Edit 2d — LoadingPage loaderMap wire             (depends on Edit 1 + 2c)
7. Edit 2e — LoadingPage post-batch dispatch        (depends on Edit 3)
8. Edit 4a-d — OrderEntry.jsx     (depends on Edit 3 — context must expose popularProducts)
```

Webpack compile check after Edit 4d.

---

## Verification Matrix

| # | Edit | File | What to verify | How | Auto |
|---|---|---|---|---|---|
| 1 | 1 | constants.js | `popularFood` in `API_LOADING_ORDER` | `grep -n "popularFood" src/api/constants.js` | AUTO |
| 2 | 2b | LoadingPage.jsx | `getPopularFoods` + `productFromAPI` imports | `grep -n "getPopularFoods\|productFromAPI" src/pages/LoadingPage.jsx` | AUTO |
| 3 | 2c | LoadingPage.jsx | `loadPopularFood` function exists | `grep -n "loadPopularFood" src/pages/LoadingPage.jsx` | AUTO |
| 4 | 2d | LoadingPage.jsx | `popularFood: loadPopularFood` in loaderMap | `grep -n "popularFood" src/pages/LoadingPage.jsx` | AUTO |
| 5 | 2e | LoadingPage.jsx | `setPopularProducts` dispatch in post-batch | `grep -n "setPopularProducts" src/pages/LoadingPage.jsx` | AUTO |
| 6 | 3 | MenuContext.jsx | `popularProducts` state + setter + clearMenu | `grep -n "popularProducts" src/contexts/MenuContext.jsx` | AUTO |
| 7 | 4d | OrderEntry.jsx | `popularProducts` from `useMenu()` | `grep -n "popularProducts.*useMenu\|useMenu.*popularProducts" ...` | AUTO |
| 8 | 4b/4c | OrderEntry.jsx | Local state + useEffect removed | `grep -n "setPopularProducts\|getPopularFoods" OrderEntry.jsx` → 0 hits | AUTO |
| 9 | — | Webpack | 0 new warnings | `tail -3 /var/log/supervisor/frontend.out.log` | AUTO |
| 10 | — | Boot behavior | Loading screen shows "Popular Items" row | Browser: open app → loading screen visible → "Popular Items" row appears | MANUAL |
| 11 | — | Toggle OFF | Popular Items row shows SUCCESS instantly (no API call) | Network tab: no /popular-food call when toggle off | MANUAL |
| 12 | — | Toggle ON | Popular tab shows items with names | Order Entry → Popular tab → items visible with names + prices | MANUAL |
| 13 | — | Toggle ON | Cart works from Popular tab | Tap item in Popular → item added to cart correctly | MANUAL |
| 14 | — | Boot block | API failure blocks navigation | (manual test: mock network error on popular-food endpoint) | MANUAL |
| 15 | — | Regression | Regular categories still work | Switch from Popular to any real category → correct items | MANUAL |
| 16 | — | Logout | `clearMenu()` clears popularProducts | Logout → login different account → no stale popular items | MANUAL |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-340 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] BUG_TRACKER.md: BUG-340 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add constants.js, LoadingPage.jsx, MenuContext.jsx, OrderEntry.jsx (BUG-340, 2026-08-22)
- [ ] Code markers: // BUG-340 in every modified file
```

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| LoadingPage R5 — new loader added | HIGH | All edits additive. `loadPopularFood` follows exact same pattern as `loadProducts`/`loadCategories`. |
| OrderEntry R5 — removing local state | HIGH | Removing broken code. `popularProducts` reference on line 550 unchanged — now reads from context. |
| MenuContext — consumed by entire app | HIGH | Adding new fields only. Zero changes to `categories`, `products`, `setProducts`, `addOrUpdateProduct`. |
| `productFromAPI.product(p)` on popular API items | LOW | Confirmed via evidence: popular-food API returns same field names as regular products API (id, name, price, category_id, variations, add_ons, tax, etc.). `productTransform.fromAPI.product()` handles all these fields. |
| Toggle OFF restaurants paying boot cost | NONE | Early-exit with SUCCESS, zero API call. |

---

Planning complete: BUG-340
Stage: Gate 2 (Impact Analysis) + Gate 3 (Implementation Plan)
Code reality: PARTIAL (on-demand fetch exists but broken)
Risk: HIGH
Files WILL change: constants.js · LoadingPage.jsx · MenuContext.jsx · OrderEntry.jsx (4 files)
Files WILL NOT touch: productTransform.js · CategoryPanel.jsx · DashboardPage.jsx · CollectPaymentPanel.jsx
Owner decisions: ALL RESOLVED
Docs:
  /app/memory/impact/BUG-340_IMPACT_ANALYSIS.md
  /app/memory/plans/BUG-340_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
