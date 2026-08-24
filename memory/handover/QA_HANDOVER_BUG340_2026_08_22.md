# QA Handover — BUG-340 Implementation (2026-08-22)

## 1. Registry Sync Confirmation
Registry synced: YES
Item: BUG-340 → IMPLEMENTED, sprint_key: pos_6_0
EXIT GATE: ALL 5 PASSED

## 2. Files Changed (4 files)

| File | Change |
|---|---|
| `src/api/constants.js` | + `{ key: 'popularFood', label: 'Popular Items', endpoint: 'POPULAR_FOOD' }` in `API_LOADING_ORDER` (line 436) |
| `src/pages/LoadingPage.jsx` | + `getPopularFoods` + `productFromAPI` imports; + `setPopularProducts` from useMenu(); + `loadPopularFood` loader function; + `popularFood: loadPopularFood` in loaderMap; + `setPopularProducts(data.popularProducts)` in post-batch dispatch |
| `src/contexts/MenuContext.jsx` | + `popularProducts` state; + `setPopularProducts` callback; + `setPopularProductsData([])` in clearMenu; + exposed in context value + useMemo deps |
| `src/components/order-entry/OrderEntry.jsx` | - removed `getPopularFoods` import; - removed local `popularProducts` state; - removed on-demand fetch useEffect; + `popularProducts` read from `useMenu()` |

## 3. Self-Verification Results (9/9 PASS)

| # | Check | Result |
|---|---|---|
| 1 | `popularFood` in API_LOADING_ORDER (constants.js:436) | ✅ PASS |
| 2 | `getPopularFoods` + `productFromAPI` imports in LoadingPage | ✅ PASS |
| 3 | `loadPopularFood` function in LoadingPage | ✅ PASS |
| 4 | `popularFood: loadPopularFood` in loaderMap | ✅ PASS |
| 5 | `setPopularProducts` dispatch in post-batch | ✅ PASS |
| 6 | `popularProducts` state + setter + clearMenu in MenuContext | ✅ PASS |
| 7 | `popularProducts` from `useMenu()` in OrderEntry | ✅ PASS |
| 8 | On-demand fetch (import + state + useEffect) removed from OrderEntry | ✅ PASS |
| 9 | Webpack: 1 pre-existing warning, 0 new | ✅ PASS |

## 4. Test Cases for QA

| TC | Steps | Expected |
|---|---|---|
| TC-1 | Login with showPopularCategory=true account (owner@18march.com / Qplazm@10) | Loading screen shows "Popular Items" row — loads to SUCCESS |
| TC-2 | Loading completes → open any order table → Order Entry | Popular tab at position #1, highlighted green by default |
| TC-3 | Popular tab items | Item chips show with real names (e.g. "Tandoori Roti", "Butter Chicken") and prices |
| TC-4 | Tap any Popular item | Item added to cart correctly (name, price, quantity visible) |
| TC-5 | Switch from Popular → All → any category → back to Popular | All tab transitions work; Popular items still present |
| TC-6 | Login with showPopularCategory=false account | Loading screen "Popular Items" row shows SUCCESS instantly (no API call in Network tab) |
| TC-7 | Toggle OFF: open Order Entry | "Popular" tab NOT in category list; "All" is position #1 |
| TC-8 | Logout → login different account | Popular items cleared (no cross-account data leak) |

## 5. Regression Tests

| # | What | Why |
|---|---|---|
| R-1 | Regular categories (All, Pepsi, Burgers…) still show correct items | OrderEntry getFilteredItems still uses MenuContext.products for non-popular tabs |
| R-2 | Boot completes normally (no stuck loading screen) | loadPopularFood added to Tier 2 parallel batch — must not break boot flow |
| R-3 | Add item to cart from regular category → place order | Core order flow unaffected |
| R-4 | Expense Report / Purchase Report still accessible | MenuContext, LoadingPage changes must not affect non-Order-Entry flows |

## 6. Credentials + Environment
- Account with Popular toggle ON: owner@18march.com / Qplazm@10
- Account with Popular toggle OFF: owner@cafe103.com / Qplazm@10 (rid=644)
- Preview URL: https://react-pos-frontend-14.preview.emergentagent.com
- Login endpoint: POST /api/v1/auth/vendoremployee/login
