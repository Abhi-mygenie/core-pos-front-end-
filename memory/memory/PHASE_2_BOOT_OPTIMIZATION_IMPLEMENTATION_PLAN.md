# Phase 2 — Boot Optimization: Implementation Plan

**Created:** 2026-06-12
**Gate:** 3 (Implementation Plan)
**Items:** CR-037 (Remove Popular Items), CR-038 (Boot Retry Policy)
**Primary File:** `/app/frontend/src/pages/LoadingPage.jsx` (846 lines)
**Total Files:** 8

---

## SCOPE LOCK

### Files I WILL change
| File | CR | Change Type |
|------|-----|-------------|
| `pages/LoadingPage.jsx` | CR-037 + CR-038 | Remove popular loader + add retry counter |
| `api/constants.js` | CR-037 | Remove `POPULAR_FOOD` endpoint + `popularFood` from `API_LOADING_ORDER` |
| `contexts/MenuContext.jsx` | CR-037 | Remove `popularFood` state/callback/export + move `isLoaded` to `setProducts` |
| `components/order-entry/OrderEntry.jsx` | CR-037 | Remove `popularFood` destructure + "popular" branch in `getFilteredItems` |
| `components/order-entry/CategoryPanel.jsx` | CR-037 | Remove "Popular" from specials array |
| `api/services/productService.js` | CR-037 | Remove `getPopularFood` + `getPopularProducts` exports |
| `api/transforms/productTransform.js` | CR-037 | Remove `popularFoodResponse` |
| `hooks/useRefreshAllData.js` | CR-037 | Remove popular fetch + `setPopularFood` |

### Files I will NOT touch
- `App.js` — no routes related to popular
- `DashboardPage.jsx` — does not reference popular
- `Sidebar.jsx` — no popular references
- Any report file, any transform other than `productTransform.js`
- `axios.js` — no changes
- Backend — no changes

---

## CR-037: Remove Popular Items from Boot + Order Screen

### Edit 1 — Remove `POPULAR_FOOD` endpoint from constants
**File:** `api/constants.js`
**Line:** 16
**Remove:**
```js
  POPULAR_FOOD: '/api/v2/vendoremployee/buffet/buffet-popular-food',
```
**Notes:** No other file references `API_ENDPOINTS.POPULAR_FOOD` except `productService.js` (which we also clean in Edit 7).

### Edit 2 — Remove `popularFood` from `API_LOADING_ORDER`
**File:** `api/constants.js`
**Line:** 288
**Remove:**
```js
  { key: 'popularFood', label: 'Popular Items', endpoint: 'POPULAR_FOOD' },
```
**Impact:** This array drives:
- `loadingStatus` initial state (LoadingPage L43) — one fewer key in the status object
- Boot screen row rendering (LoadingPage L760+) — "Popular Items" row disappears
- Error summary (LoadingPage L805) — no longer lists popular in failed items
- Progress denominator (LoadingPage L98) — drops from 7 to 6 Phase 1 items
- Retry button count (LoadingPage L826) — can't include popular in count

All of these are **auto-derived** from `API_LOADING_ORDER` — removing the entry propagates everywhere. No manual fixups needed.

### Edit 3 — Remove `setPopularFood` from LoadingPage context destructure
**File:** `pages/LoadingPage.jsx`
**Line:** 29
**Current:** `const { setCategories, setProducts, setPopularFood } = useMenu();`
**New:** `const { setCategories, setProducts } = useMenu();`

### Edit 4 — Remove `loadPopularFood` function
**File:** `pages/LoadingPage.jsx`
**Lines:** 461-476
**Remove entire function:**
```js
  const loadPopularFood = async (ctrl, data) => {
    const t0 = Date.now();
    updateStatus('popularFood', LOADING_STATES.LOADING, null, 0, 0, { startedAt: t0 });
    try {
      const popularResponse = await productService.getPopularFood({ limit: 50, offset: 1, type: 'all' });
      if (ctrl.aborted) return;
      data.popularFood = popularResponse.products;
      const loadedCount = data.popularFood?.length || 0;
      const totalCount = popularResponse.total || loadedCount;
      updateStatus('popularFood', LOADING_STATES.SUCCESS, null, loadedCount, totalCount, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
    } catch (error) {
      if (ctrl.aborted) return;
      updateStatus('popularFood', LOADING_STATES.ERROR, error.readableMessage || error.message, 0, 0, { elapsed: ((Date.now() - t0) / 1000).toFixed(1), startedAt: null });
      toast({ title: "Failed to load popular items", description: error.readableMessage, variant: "destructive" });
    }
  };
```

### Edit 5 — Remove `popularFood` from `loaderMap`
**File:** `pages/LoadingPage.jsx`
**Line:** 506
**Remove:**
```js
    popularFood: loadPopularFood,
```

### Edit 6 — Remove `popularFood` dispatch after batch
**File:** `pages/LoadingPage.jsx`
**Line:** 569
**Remove:**
```js
    if (data.popularFood) setPopularFood(data.popularFood);
```

### Edit 7 — Remove `getPopularFood` and `getPopularProducts` from productService
**File:** `api/services/productService.js`
**Lines:** 32-46 (getPopularFood) + 104-114 (getPopularProducts)
**Remove both functions:**
```js
/**
 * Fetch popular/bestseller products
 * @param {Object} options - { limit, offset, type }
 * @returns {Promise<Object>} - Transformed popular products response
 */
export const getPopularFood = async (options = {}) => {
  const params = {
    limit: options.limit || PAGINATION.DEFAULT_LIMIT,
    offset: options.offset || PAGINATION.DEFAULT_OFFSET,
    type: options.type || PAGINATION.PRODUCTS_TYPE,
  };
  
  const response = await api.get(API_ENDPOINTS.POPULAR_FOOD, { params });
  return fromAPI.popularFoodResponse(response.data);
};
```
and:
```js
/**
 * Get popular products (sorted by order count)
 * @param {Array} products - Products list
 * @param {number} limit - Number of products to return
 * @returns {Array} - Popular products
 */
export const getPopularProducts = (products, limit = 10) => {
  return [...products]
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, limit);
};
```
**Notes:** `getPopularProducts` (client-side sort helper) is never called anywhere — verified via grep. Safe to remove.

### Edit 8 — Remove `popularFoodResponse` from productTransform
**File:** `api/transforms/productTransform.js`
**Lines:** 187-190
**Remove:**
```js
  /**
   * Transform popular food response (same structure)
   */
  popularFoodResponse: (api) => fromAPI.productListResponse(api),
```
**Notes:** This is the last entry in the `fromAPI` object. Ensure the preceding entry's trailing comma is correct after removal.

### Edit 9 — Remove `popularFood` state + callback from MenuContext + move `isLoaded`
**File:** `contexts/MenuContext.jsx`

**9a — Remove state (L10):**
```js
// Remove:
  const [popularFood, setPopularFoodData] = useState([]);
```

**9b — Remove `setPopularFood` callback (L38-42) and move `setIsLoaded(true)` into `setProducts`:**
```js
// Remove entirely:
  // Set popular food (called from LoadingPage)
  const setPopularFood = useCallback((data) => {
    setPopularFoodData(data || []);
    setIsLoaded(true);
  }, []);
```

**9c — Update `setProducts` to set `isLoaded` (L18-20):**
**Current:**
```js
  const setProducts = useCallback((data) => {
    setProductsData(data || []);
  }, []);
```
**New:**
```js
  const setProducts = useCallback((data) => {
    setProductsData(data || []);
    setIsLoaded(true);
  }, []);
```
**Notes:** Owner decision — `isLoaded` moves to `setProducts` since products is the primary menu data. Nobody reads `MenuContext.isLoaded` externally today, but this keeps the flag alive as a safety net.

**9d — Remove `setPopularFoodData([])` from `clearMenu` (L48):**
**Current:**
```js
  const clearMenu = useCallback(() => {
    setCategoriesData([]);
    setProductsData([]);
    setPopularFoodData([]);
    setIsLoaded(false);
  }, []);
```
**New:**
```js
  const clearMenu = useCallback(() => {
    setCategoriesData([]);
    setProductsData([]);
    setIsLoaded(false);
  }, []);
```

**9e — Remove `popularFood` + `setPopularFood` from context value (L93-130):**

Remove from the `useMemo` value object:
- `popularFood,` (L97)
- `setPopularFood,` (L104)

Remove from the `useMemo` dependency array:
- `popularFood,` (L117)
- `setPopularFood,` (L122)

### Edit 10 — Remove `popularFood` from OrderEntry
**File:** `components/order-entry/OrderEntry.jsx`

**10a — Remove from destructure (L51):**
**Current:** `const { categories, products, popularFood } = useMenu();`
**New:** `const { categories, products } = useMenu();`

**10b — Remove "popular" branch from `getFilteredItems` (L525-527):**
**Current:**
```js
    } else if (activeCategory === "popular") {
      const source = popularFood.length > 0 ? popularFood : products.slice(0, 20);
      items = source.filter(p => p.isActive && !p.isDisabled).map(adaptProduct);
    } else {
```
**New:**
```js
    } else {
```
**Notes:** The `if (activeCategory === "all")` branch at L523 stays. The `else` at L528 (category-specific filter) stays. Only the `else if ("popular")` middle branch is removed. After removal, the `getFilteredItems` function has two paths: "all" and "specific category". If `activeCategory` somehow equals `"popular"` (stale localStorage), it falls into the specific-category branch and returns 0 items — harmless and self-correcting on next click.

### Edit 11 — Remove "Popular" from CategoryPanel
**File:** `components/order-entry/CategoryPanel.jsx`
**Line:** 10
**Remove:**
```js
      { id: "popular", name: "Popular" },
```
**Updated specials array becomes:**
```js
    const specials = [
      { id: "all", name: "All" },
    ];
```
**Notes:** Comment at L6 says "Build full category list: All + Popular + real categories" — update to "Build full category list: All + real categories".

### Edit 12 — Remove popular from useRefreshAllData
**File:** `hooks/useRefreshAllData.js`

**12a — Remove `setPopularFood` from destructure (L16):**
**Current:** `const { setCategories, setProducts, setPopularFood } = useMenu();`
**New:** `const { setCategories, setProducts } = useMenu();`

**12b — Remove popular from parallel fetch (L27-31):**
**Current:**
```js
    const [catResult, prodResult, popResult] = await Promise.all([
      categoryService.getCategories(),
      productService.getProducts({ limit: 500, offset: 1, type: 'all' }),
      productService.getPopularFood({ limit: 50, offset: 1, type: 'all' }),
    ]);
```
**New:**
```js
    const [catResult, prodResult] = await Promise.all([
      categoryService.getCategories(),
      productService.getProducts({ limit: 500, offset: 1, type: 'all' }),
    ]);
```

**12c — Remove `setPopularFood` call (L40):**
**Remove:** `setPopularFood(popResult.products);`

**12d — Remove `setPopularFood` from useCallback deps (L47):**
**Current:** `}, [setCategories, setProducts, setPopularFood, setTables, setOrders, permissions]);`
**New:** `}, [setCategories, setProducts, setTables, setOrders, permissions]);`

**12e — Update header comment (L2):**
**Current:** `// Scope: Tables → Categories + Products + Popular (parallel) → Orders`
**New:** `// Scope: Tables → Categories + Products (parallel) → Orders`

---

## CR-038: Boot Screen Retry Policy — Manual Retry with Counter/Limit

### Owner Decisions (all resolved)
| # | Decision | Answer |
|---|----------|--------|
| OQ-1 | Max retry count | **3** |
| OQ-2 | After max retries | **Disable button + show "Contact support" message** |
| OQ-3 | Show counter to user | **YES** — "Attempt N of 3" |
| OQ-4 | Counter scope | **Global** — 3 total clicks regardless of which API fails |

### Edit 13 — Add `retryCount` state
**File:** `pages/LoadingPage.jsx`
**After Line:** 67 (after `const [hasError, setHasError] = useState(false);`)
**Insert:**
```js
  // CR-038: Global retry counter — max 3 attempts
  const MAX_RETRIES = 3;
  const [retryCount, setRetryCount] = useState(0);
```

### Edit 14 — Increment counter in `handleRetry`
**File:** `pages/LoadingPage.jsx`
**Inside `handleRetry` function (L581), at the very top of the function body (after line 581):**
**Insert:**
```js
    setRetryCount(prev => prev + 1);
```
**Notes:** The increment happens before the actual retry logic. This ensures the counter reflects the click even if the retry itself is a no-op (e.g., no failed keys).

### Edit 15 — Replace retry button with counter-aware version
**File:** `pages/LoadingPage.jsx`
**Lines:** 820-827
**Current:**
```jsx
            <button
              onClick={handleRetry}
              className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: COLORS.primaryOrange }}
              data-testid="retry-button"
            >
              Retry Failed ({API_LOADING_ORDER.filter(i => loadingStatus[i.key].status === LOADING_STATES.ERROR).length + (stationStatus.status === LOADING_STATES.ERROR ? 1 : 0)})
            </button>
```
**New:**
```jsx
            {retryCount < MAX_RETRIES ? (
              <button
                onClick={handleRetry}
                className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: COLORS.primaryOrange }}
                data-testid="retry-button"
              >
                Retry Failed ({API_LOADING_ORDER.filter(i => loadingStatus[i.key].status === LOADING_STATES.ERROR).length + (stationStatus.status === LOADING_STATES.ERROR ? 1 : 0)}) — Attempt {retryCount + 1} of {MAX_RETRIES}
              </button>
            ) : (
              <div className="space-y-2" data-testid="retry-exhausted">
                <button
                  disabled
                  className="w-full py-3 rounded-lg font-semibold text-white transition-all opacity-50 cursor-not-allowed"
                  style={{ backgroundColor: COLORS.grayText }}
                  data-testid="retry-button-disabled"
                >
                  Retry Failed — All attempts used
                </button>
                <p className="text-xs text-center px-4" style={{ color: '#ef4444' }}>
                  Unable to load after {MAX_RETRIES} attempts. Please contact support or check your internet connection and reload the page.
                </p>
              </div>
            )}
```

**Behavior walkthrough:**
1. First failure: button shows "Retry Failed (1) — Attempt 1 of 3"
2. User clicks → `retryCount` goes to 1 → retry fires → if fails again: "Attempt 2 of 3"
3. User clicks → `retryCount` goes to 2 → retry fires → if fails again: "Attempt 3 of 3"
4. User clicks → `retryCount` goes to 3 → `retryCount >= MAX_RETRIES` → disabled button + "Contact support" message

### Edge Case: retry succeeds on attempt 2, then another API fails later
This can't happen in the current flow — the boot screen either succeeds (navigates away to dashboard) or stays on the error state. There's no "partial success then new failure" path. If retry succeeds, `isComplete && !hasError` triggers the redirect at L152-165. The retry counter persists only within this component mount lifecycle — a fresh login starts at 0.

---

## Execution Sequence

```
Step 1: Edit 1-2   (constants.js — remove POPULAR_FOOD endpoint + API_LOADING_ORDER entry)
Step 2: Edit 3-6   (LoadingPage.jsx — remove popular loader + dispatch)
Step 3: Edit 7     (productService.js — remove 2 functions)
Step 4: Edit 8     (productTransform.js — remove 1 transform)
Step 5: Edit 9a-9e (MenuContext.jsx — remove popular state/callback + move isLoaded)
Step 6: Edit 10    (OrderEntry.jsx — remove popular destructure + branch)
Step 7: Edit 11    (CategoryPanel.jsx — remove "Popular" from specials)
Step 8: Edit 12    (useRefreshAllData.js — remove popular fetch + deps)
Step 9: Edit 13-15 (LoadingPage.jsx — add retry counter + UI)
Step 10: Visual verification (screenshot)
```

Steps 1-8 are CR-037 (all removals, can be done in parallel).
Steps 9 is CR-038 (additive, single file).
Step 10 is verification.

**Total implementation time: ~30 minutes**

---

## Test Plan

### CR-037 — Popular Items Removal
1. **Boot screen:** Login → Loading screen shows 6 items (was 7). "Popular Items" row is gone. Progress reaches 100% faster (~8.6s saved).
2. **Order Entry:** Open any order → CategoryPanel shows "All" + real categories. No "Popular" tab. Selecting "All" shows all active products.
3. **Refresh:** Click sidebar "Refresh" → data reloads without errors. No popular API call in network tab.
4. **No console errors:** No `setPopularFood is not a function` or similar.
5. **Webpack compilation:** Clean (no unused import warnings for removed references).

### CR-038 — Retry Policy
1. **Simulate failure:** Block `preprod.mygenie.online` in browser DevTools → Login → Products fails after 60s timeout → "Retry Failed (1) — Attempt 1 of 3" button appears.
2. **Click retry 1:** Button changes to "Attempt 2 of 3". (Still fails if blocked.)
3. **Click retry 2:** Button changes to "Attempt 3 of 3".
4. **Click retry 3:** Button becomes disabled (gray) with "All attempts used". "Contact support" message appears below.
5. **Normal flow:** Unblock network → Login → all APIs succeed → no retry UI shown → redirects to dashboard.

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R-1 | `isLoaded` breaks something downstream | VERY LOW | LOW | Nobody reads `MenuContext.isLoaded`. Moved to `setProducts` per owner decision. |
| R-2 | Stale `activeCategory === "popular"` in localStorage | LOW | ZERO | Falls into category filter branch → returns 0 items → user clicks "All" |
| R-3 | `useRefreshAllData` parallel promise count changes | CERTAIN (intended) | ZERO | `Promise.all` works with 2 or 3 promises identically |
| R-4 | Retry counter persists across logins | ZERO | — | Component remounts on fresh login → state resets to 0 |
| R-5 | `productService` import unused after removal | LOW | ZERO | LoadingPage still imports `productService` for `getProducts` (L11). Only `getPopularFood` is removed. |
| R-6 | `API_LOADING_ORDER` consumers break with 6 vs 7 items | ZERO | — | All consumers iterate dynamically (`.map`, `.filter`, `.reduce`). No hardcoded index. |

---

## Files Changed Summary

| File | Lines Removed | Lines Added | Net |
|------|--------------|-------------|-----|
| `api/constants.js` | 2 | 0 | -2 |
| `pages/LoadingPage.jsx` | ~20 | ~18 | ~-2 |
| `api/services/productService.js` | ~28 | 0 | -28 |
| `api/transforms/productTransform.js` | ~4 | 0 | -4 |
| `contexts/MenuContext.jsx` | ~12 | 1 | -11 |
| `components/order-entry/OrderEntry.jsx` | ~4 | 0 | -4 |
| `components/order-entry/CategoryPanel.jsx` | ~2 | 0 | -2 |
| `hooks/useRefreshAllData.js` | ~5 | 0 | -5 |
| **TOTAL** | **~77** | **~19** | **~-58** |

Net reduction: **58 lines** of code removed. Cleaner codebase + 8.6s faster boot.

---

*Phase 2 Implementation Plan — 2026-06-12. Ready for Gate 4 (Code Gate) approval.*
