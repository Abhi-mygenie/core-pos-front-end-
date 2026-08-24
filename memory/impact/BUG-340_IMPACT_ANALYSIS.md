# BUG-340 — Popular Tab Empty Chips
## Gate 2: Impact Analysis

**Date:** 2026-08-22
**Role:** PLANNING agent
**Stage:** Gate 2 — Impact Analysis
**Risk:** HIGH (LoadingPage.jsx + OrderEntry.jsx = R5 hotspots)
**Sprint:** POS 6.0
**Related:** CR-148 (parent), CR-037 (removed old popular boot flow — inverse history)

---

## Code Reality: PARTIAL

On-demand fetch approach exists in `OrderEntry.jsx` (lines 41, 97-140, 550) but transform chain is broken.
`MenuContext.jsx` does NOT have `popularProducts` field — never added.
`LoadingPage.jsx` does NOT have `loadPopularFood` loader — never added.

---

## Step 1 — Conflict Pre-Check

| File | Last Modifier | Open Conflict? |
|---|---|---|
| `src/api/constants.js` | CR-148 agent (2026-08-22) — `POPULAR_FOOD` endpoint added | ✅ Clean — additive only |
| `src/pages/LoadingPage.jsx` | CR-037/CR-038 agent (2026-06-13) — removed popular items from boot | ⚠️ INVERSE — CR-037 removed popular from boot; BUG-340 re-adds via new architecture. No code conflict; historical context only. |
| `src/contexts/MenuContext.jsx` | CR-037 agent (2026-06-13) — removed popular items, moved isLoaded | ⚠️ INVERSE — CR-037 removed `popularProducts` from context. Adding it back now. |
| `src/components/order-entry/OrderEntry.jsx` | CR-148 agent (2026-08-22) — added on-demand fetch (the broken approach) | ✅ Replacing own code — no foreign conflict |

**CR-037 conflict verdict:** SAFE. CR-037 removed the OLD boot approach (eager pre-fetch into MenuContext during profile/boot). BUG-340 re-introduces popular items into the boot flow, but gated by `showPopularCategory` and using the correct `productTransform.fromAPI()` chain — a different, better architecture than what CR-037 removed.

---

## Step 2 — Root Cause Confirmed

```
Current (broken) chain:
  OrderEntry.jsx useEffect
    → getPopularFoods('all')          ← on-demand, fires every time Order Entry opens
    → res.data.products[].map(adaptProduct)
                           ↑
               adaptProduct reads: product.productId, product.productName, product.basePrice
               raw API returns:    product.id,        product.name,        product.price
    → popularProducts[] = [{ id: undefined, name: undefined, price: undefined }]
    → item chips render with no text ← SYMPTOM

Fixed chain:
  LoadingPage.jsx boot (Tier 2, parallel)
    → getPopularFoods('all')          ← once at boot, gated by showPopularCategory
    → res.data.products[].map(productTransform.fromAPI.product)
                                       ↑
                           maps: api.id → productId, api.name → productName, api.price → basePrice
    → data.popularProducts = [{ productId: 116723, productName: "Tandoori Roti", ... }]
    → setPopularProducts(data.popularProducts) → MenuContext.popularProducts[]
  
  OrderEntry.jsx (on mount)
    → const { popularProducts } = useMenu()   ← reads from context, already correct format
    → getFilteredItems() returns popularProducts when activeCategory === "popular"
    → adaptProduct(p) works: reads p.productId ✅, p.productName ✅, p.basePrice ✅
    → item chips render correctly ← FIXED
```

---

## Step 3 — Owner Decisions (ALL RESOLVED)

| # | Question | Answer |
|---|---|---|
| OQ-1 | Load at boot, gated by `showPopularCategory`? | **YES** |
| OQ-2 | Refresh alongside menu refresh? | **YES** — `popularFood` added to `loaderMap` so retry/refresh re-runs it |
| OQ-3 | Fail on boot if API errors? | **BLOCK BOOT** — `updateStatus(ERROR)` triggers `phase1HasError=true` → no navigation to dashboard |

---

## Step 4 — Boot Sequence Architecture

### How existing LoadingPage boot works

```
Tier 1 (sequential):   loadProfile()  →  data.profile (sets restaurant context)
Tier 2 (parallel):     loadCategories, loadProducts, loadTables, loadCancellationReasons, loadRunningOrders
                        → Promise.allSettled()
Post-batch:            calculateItemCounts(categories, products)
                       setCategories(), setProducts()  →  MenuContext dispatched
```

### Where `popularFood` fits

`popularFood` joins **Tier 2 parallel**. It needs `data.profile` (available after Tier 1) to gate on `showPopularCategory`. It runs alongside products/categories — no ordering dependency.

```
Tier 2 (parallel, extended):
  loadCategories, loadProducts, loadTables, loadCancellationReasons, loadRunningOrders,
  + loadPopularFood (gated: no-op SUCCESS if !showPopularCategory)

Post-batch (extended):
  + if (data.popularProducts) setPopularProducts(data.popularProducts)
```

### Boot completion guarantee (OQ-3)

`loadingStatus` is an object derived from `API_LOADING_ORDER`. Boot completion uses:
```js
const phase1HasError = Object.values(loadingStatus).some(s => s.status === ERROR);
if (allDone && !anyError) setIsComplete(true);  // navigates to dashboard
```

Adding `popularFood` to `API_LOADING_ORDER` means:
- If `loadPopularFood` errors → `updateStatus('popularFood', ERROR)` → `phase1HasError = true` → `isComplete` never set → boot **BLOCKED** ✅
- If `showPopularCategory = false` → loader early-exits with `updateStatus('popularFood', SUCCESS, null, 0, 0)` → boot proceeds normally ✅

### Retry / Refresh (OQ-2)

`handleRetry()` reads `failedKeys` from `loadingStatus` and calls `loadAllData(ctrl, failedKeys)`. Since `popularFood` is in `loaderMap`, it is re-fetched on retry if it failed. A full reload also re-fetches it. ✅

---

## Step 5 — Files WILL Change (4 files)

| File | Change | Risk |
|---|---|---|
| `src/api/constants.js` | + `{ key: 'popularFood', label: 'Popular Items', endpoint: 'POPULAR_FOOD' }` in `API_LOADING_ORDER` | LOW |
| `src/pages/LoadingPage.jsx` | + `loadPopularFood` loader + wire into `loaderMap` + dispatch `setPopularProducts` | HIGH (R5) |
| `src/contexts/MenuContext.jsx` | + `popularProducts` state + `setPopularProducts` + `clearMenu` + context value | HIGH (R5 adjacent) |
| `src/components/order-entry/OrderEntry.jsx` | - remove import/state/useEffect; + read `popularProducts` from `useMenu()` | HIGH (R5) |

## Files WILL NOT Touch

- `productTransform.js` — `fromAPI.product()` already handles the transformation correctly
- `CategoryPanel.jsx` — already receives `showPopularCategory` prop, no change
- `DashboardPage.jsx`
- `CollectPaymentPanel.jsx`
- `orderTransform.js`
- Any financial/payment logic

---

## Step 6 — Downstream Safety Analysis

| Consumer | Impact |
|---|---|
| `OrderEntry.jsx` line 550 — `items = popularProducts` | Now reads correctly-shaped products (productId, productName, basePrice) ✅ |
| `adaptProduct(p)` in getFilteredItems | `p.productId` ✅, `p.productName` ✅, `p.basePrice` ✅ — no longer undefined |
| Cart item flow (addToCart → buildCartItem) | Receives correctly shaped item from adaptProduct ✅ |
| `clearMenu()` on logout | Must also clear `popularProducts` — added to `clearMenu` |
| Boot retry UX | `popularFood` row visible in loading screen — user sees it loading/failing |

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| LoadingPage R5 hotspot | HIGH | Additive only — new loader function + 3 wiring lines. Existing loaders untouched. |
| OrderEntry R5 hotspot | HIGH | Removing broken code + adding 1 import change. Net simpler. |
| Boot performance | LOW | Popular food fetch runs in parallel with products/categories — no additional boot time vs. current parallel batch |
| `showPopularCategory = false` restaurants | NONE | Loader early-exits with SUCCESS — zero API call, zero cost |
| `API_LOADING_ORDER` UI rendering | LOW | Adds 1 row to loading screen progress — "Popular Items" shows as a boot step. Acceptable. |
| Stale popularProducts on menu refresh | NONE | OQ-2 resolved — `loaderMap` + retry handles refresh |
