# Phase 5 — Insights Optimization: Implementation Plan

**Created:** 2026-06-12
**Updated:** 2026-06-12 (added TEMPORARY ARRANGEMENT notice + deprecation plan for CR-045)
**Gate:** 3 (Implementation Plan)
**Items:** CR-045 (Field Stripping — implement FIRST) + CR-044 (Shared Cache — implement SECOND)
**Validated against:** Live API data from `cafe103` (owner@cafe103.com), 2026-05-25

---

## ⚠️ CR-045 TEMPORARY ARRANGEMENT NOTICE

**CR-045 (FE-side field stripping) is a TEMPORARY optimization.** Backend will ship server-side field stripping in a future release. When that happens, the FE stripper must be disabled and eventually removed.

### Transition Plan

| Phase | Trigger | Action |
|-------|---------|--------|
| **Current** | Backend sends full payload | FE strips via `orderPayloadStripper.js` (CR-045) |
| **Backend ships strip** | Backend confirms server-side stripping is live | Set `REACT_APP_STRIP_ORDERS=false` in frontend `.env` → FE stripper becomes a passthrough |
| **QA verification** | All 10 Insights reports verified with FE strip OFF | Confirm no data regressions — backend strip covers all fields FE needs |
| **Cleanup** | QA passes | Remove `orderPayloadStripper.js` entirely + remove `stripOrders`/`stripOrder` import lines from 6+ files |

### Design Constraints for Implementor

1. **`STRIP_ENABLED` flag is MANDATORY.** The stripper must be togglable via env var so it can be disabled without code changes when backend ships its version:
   ```js
   const STRIP_ENABLED = process.env.REACT_APP_STRIP_ORDERS !== 'false'; // default ON
   export const stripOrders = (orders) => STRIP_ENABLED ? orders.map(stripOrder) : orders;
   export const stripOrder = (orderWrapper) => STRIP_ENABLED ? _stripOrder(orderWrapper) : orderWrapper;
   ```

2. **File header must document temporary nature:**
   ```
   // TEMPORARY FE-SIDE OPTIMIZATION (CR-045)
   // Backend will ship server-side field stripping in future.
   // When backend strips: set REACT_APP_STRIP_ORDERS=false in .env to disable.
   // Then remove this file entirely once backend strip is verified across all reports.
   ```

3. **No format mutations.** The stripper must NOT change data types (e.g., don't parse `food_details` from string→object). If a field is a JSON string in the API, it must remain a JSON string after stripping. This prevents double-strip conflicts when backend ships its own version. **Update to `stripFoodDetails`:** Instead of parsing and returning an object, parse→strip→re-stringify:
   ```js
   const stripFoodDetails = (fd) => {
     if (!fd) return fd;
     if (typeof fd === 'string') {
       try {
         const parsed = JSON.parse(fd);
         return JSON.stringify(pick(parsed, FOOD_DETAILS_KEEP));
       } catch { return fd; }
     }
     return pick(fd, FOOD_DETAILS_KEEP);
   };
   ```

4. **Whitelist drift risk.** If backend adds new fields that FE needs BEFORE backend ships its own strip, someone must update `ORDERS_TABLE_KEEP` / `ITEMS_KEEP` etc. in the FE stripper. **Mitigation:** The DOUBT fields are already kept. Any new field consumed by FE code should be added to the whitelist in the same PR that reads it.

5. **Double-strip safety.** When backend ships strip, the FE stripper running on already-stripped data must be harmless. The `pick()` function picking from a smaller object returns fewer/same keys — **no crash, no data loss.** But it's wasted CPU, hence the env flag to disable.

---

## LIVE API VALIDATION RESULTS

| Component | DOC10 Count | Live API Count | Used | Dead | Validated |
|-----------|-------------|----------------|------|------|-----------|
| `orders_table` | 128 | **128** ✅ | 52 | 76 | Field-by-field confirmed |
| `order_details_table` | 47 | **49** (2 new) | 30 | 19 | ✅ |
| `food_details` | 72 | **70** | 7 | 63 | ✅ |
| `operations` | 26 | **41** (15 new item-level ops) | 8 | 33 | 14 new fields verified dead (0 FE references) |

**Live payload measurement (20-order sample):**
- Raw: 18,218 bytes/order avg
- Stripped: 5,792 bytes/order avg
- **Reduction: 68.2%** (12,426 bytes saved per order)

**Note:** `cust_mobile` is in the USED whitelist but NOT present in the live API `orders_table` response. It IS referenced in `reportTransform.js` L1012 with a fallback chain (`api.cust_mobile || api.user_phone || api.phone`). Since it's absent from API, the fallback fires. **Keep it in the whitelist** (harmless — picking a non-existent key returns `undefined`).

---

## CROSS-RESTAURANT VALIDATION (2026-06-12)

Whitelists validated against live May data from 3 restaurants (cafe103 original + 2 new):

| Restaurant | Orders Sampled | `orders_table` Keys | `order_details_table` Keys | `food_details` Keys | Match |
|-----------|---------------|--------------------|--------------------------|--------------------|-------|
| cafe103 (rid=644) | 20 (original) | 128 | 49 | 70 | ✅ Baseline |
| **Welcome Resort** (rid=474) | 51 (May 1-5) | **128** | **49** | **70** | ✅ Identical |
| **Palm House** (rid=541) | 168 (May 1-3) | **128** | **49** | — | ✅ Identical |

**Key finding:** All 3 restaurants return identical field sets. Schema is uniform across restaurants.

### Dead Field Cross-Check Against Report Pipeline Code

Searched all 69 dead `orders_table` fields and 18 dead `order_details_table` fields against all report pipeline files (insightsService, orderLedgerService, reportTransform, CancellationsMockup, etc.).

| Component | Dead Fields | FE Grep Hits | Real Misses | Action |
|-----------|------------|-------------|-------------|--------|
| `orders_table` | 69 | 22 hits — ALL false positives (generic English words like `accepted`, `callback`, `failed`, `pending`, or running-order transforms unrelated to reports) | **0** | No change |
| `order_details_table` | 18 → **17** | 7 hits — 6 false positives + **1 real: `cancel_by`** (used in `reportTransform.js` L644-649 for cancel attribution) | **1: `cancel_by`** | **ADDED to ITEMS_KEEP** |

### Phantom Keeps (in whitelist but not in API)

| Whitelist | Phantom Fields | Reason to Keep |
|-----------|---------------|----------------|
| `ORDERS_TABLE_KEEP` | `cust_mobile`, `cust_email`, `user_email`, `user_phone`, `phone`, `order_plateform`, `order_platform`, `gst_tax`, `vat_tax`, `service_tax`, `transection_id` (11) | All referenced in `reportTransform.js` with fallback chains. Harmless — `pick()` on absent key = `undefined`. Keep for forward-compat if backend adds them. |
| `ITEMS_KEEP` | `station_name` (1) | Referenced in `foodCourtService.js`. May appear in some restaurants. Harmless. |

**Conclusion:** Whitelists validated. One correction applied (`cancel_by` added). Safe to implement.

---

## SCOPE LOCK

### Files I WILL create
| File | Purpose |
|------|---------|
| `api/transforms/orderPayloadStripper.js` | Centralized strip function + field whitelists |
| `contexts/InsightsCacheContext.jsx` | Shared date range + cache invalidation |

### Files I WILL modify
| File | CR | Change |
|------|-----|--------|
| `api/services/insightsService.js` | CR-045 | Call `stripOrders()` after API response |
| `api/services/orderLedgerService.js` | CR-045 | Same |
| `api/services/roomOrdersService.js` | CR-045 | Same |
| `api/services/foodCourtService.js` | CR-045 | Same |
| `api/transforms/reportTransform.js` | CR-045 | Call `stripOrder()` at `orderLogsReportRow` entry |
| `pages/reports-module/CancellationsMockup.jsx` | CR-045 + CR-044 | Strip + shared date |
| `pages/reports-module/PrepServeTimeMockup.jsx` | CR-045 + CR-044 | Strip + shared date |
| `App.js` | CR-044 | Wrap `/reports-module/*` in `InsightsCacheProvider` |
| `components/reports/useReportFetch.js` | CR-044 | Add cache-aware option |
| 9× report pages (`DashboardMockup`, `ItemSalesHybridMockup`, `OrderLedgerMockup`, `SalesMockup`, `PaymentsMockup`, `CancellationsMockup`, `PrepServeTimeMockup`, `RoomOrdersMockup`, `FoodCourtMockup`, `SettlementReportMockup`) | CR-044 | Replace local date state with shared context |

### Files I will NOT touch
- `api/axios.js` — no interceptor changes
- `api/constants.js` — endpoints unchanged
- Backend — no changes (FE-only optimization)
- Any non-Insights page

---

## PART 1: CR-045 — Field Stripping (implement FIRST)

### Edit 1 — Create `orderPayloadStripper.js`

**File:** NEW `api/transforms/orderPayloadStripper.js`

```js
/**
 * orderPayloadStripper.js — CR-045
 * 
 * TEMPORARY FE-SIDE OPTIMIZATION.
 * Backend will ship server-side field stripping in future.
 * When backend strips: set REACT_APP_STRIP_ORDERS=false in .env to disable.
 * Then remove this file entirely once backend strip is verified across all reports.
 *
 * Strips unused fields from order-logs-report API responses before
 * they enter React state or cache. Reduces payload ~68% (validated
 * against live API: 18.2 KB → 5.8 KB per order).
 *
 * Field whitelists derived from DOC10 audit + live API validation
 * (cafe103, 2026-05-25, 128-field orders_table confirmed).
 */

// Toggle: set REACT_APP_STRIP_ORDERS=false in .env to disable FE stripping
// (e.g., when backend ships server-side strip).
const STRIP_ENABLED = process.env.REACT_APP_STRIP_ORDERS !== 'false'; // default ON

// === Field Whitelists (keep these, drop everything else) ===

const ORDERS_TABLE_KEEP = new Set([
  'id', 'restaurant_order_id', 'created_at', 'collect_bill', 'updated_at',
  'f_order_status', 'payment_method', 'payment_status', 'payment_type',
  'order_amount', 'order_in', 'order_type', 'order_from',
  'order_sub_total_amount', 'order_sub_total_without_tax',
  'delivery_charge', 'delivery_charge_gst', 'tip_amount', 'tip_tax_amount',
  'round_up', 'table_name', 'table_id', 'waiter_name', 'employee_name',
  'employee_id', 'restaurant_discount_amount', 'coupon_discount_amount',
  'coupon_code', 'cancellation_reason', 'cancel_at',
  'total_gst_tax_amount', 'total_vat_tax_amount', 'total_service_tax_amount',
  'service_gst_tax_amount', 'discount_value', 'order_discount',
  'order_discount_type', 'comunity_discount', 'discount_member_category',
  'user_id', 'user_name', 'cust_mobile', 'razorpay_order_id',
  'transaction_id', 'parent_order_id', 'payment_amount',
  'snapshot_razorpay_status', 'order_note', 'ready_at', 'serve_at',
  'loyalty_info', 'canceled_by',
  // DOC10 DOUBT fields — kept for safety
  'order_status', 'total_tax_amount', 'cancel_state', 'waiter_id',
  'print_bill_status', 'print_kot', 'scheduled', 'schedule_at',
  // reportTransform additional fields (from parseOrderItem / orderLogsReportRow)
  'cust_email', 'user_email', 'user_phone', 'phone',
  'order_from', 'order_plateform', 'order_platform',
  'gst_tax', 'vat_tax', 'service_tax',
  'transection_id',
]);

const ITEMS_KEEP = new Set([
  'id', 'food_id', 'food_details', 'food_status', 'quantity', 'unit_price',
  'price', 'station', 'station_name', 'variation', 'add_ons', 'food_level_notes',
  'cancel_at', 'cancel_by', 'cancel_by_name', 'cancel_type', 'cancel_reason_text',
  'complementary', 'complementary_price', 'gst_tax_amount', 'vat_tax_amount',
  'discount_amount', 'service_charge', 'ready_at', 'ready_by',
  'serve_at', 'serve_by', 'created_at', 'item_type',
  'total_add_on_price', 'total_variation_price', 'discount_on_food',
  // DOC10 DOUBT fields — kept for safety
  'reason_type',
]);

const FOOD_DETAILS_KEEP = new Set([
  'id', 'name', 'category_id', 'tax', 'tax_type', 'tax_calc', 'veg',
]);

const OPS_KEEP = new Set([
  'operation', 'created_at', 'previous_order_amount',
  'previous_payment_method', 'current_payment_method',
  'vendor_employee_name', 'food_id', 'restaurant_order_id',
]);

/** Pick only whitelisted keys from an object */
const pick = (obj, keyset) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const k of keyset) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
};

/** Strip food_details blob to 7 fields. Preserves original format (string→string, object→object). */
const stripFoodDetails = (fd) => {
  if (!fd) return fd;
  if (typeof fd === 'string') {
    try {
      const parsed = JSON.parse(fd);
      return JSON.stringify(pick(parsed, FOOD_DETAILS_KEEP)); // re-stringify to preserve format
    } catch { return fd; }
  }
  return pick(fd, FOOD_DETAILS_KEEP);
};

/**
 * Strip a single order wrapper to only used fields.
 * No-op when STRIP_ENABLED is false (backend handles stripping).
 * @param {Object} orderWrapper — raw API order { orders_table, order_details_table, operations, ... }
 * @returns {Object} — stripped order wrapper (or original if disabled)
 */
const _stripOrder = (orderWrapper) => {
  if (!orderWrapper) return orderWrapper;
  return {
    orders_table: pick(orderWrapper.orders_table, ORDERS_TABLE_KEEP),
    order_details_table: (orderWrapper.order_details_table || []).map(item => ({
      ...pick(item, ITEMS_KEEP),
      food_details: stripFoodDetails(item.food_details),
    })),
    operations: (orderWrapper.operations || []).map(op => pick(op, OPS_KEEP)),
    // Keep wrapper-level keys as-is (all USED per DOC10)
    partial_payments: orderWrapper.partial_payments,
    room_info: orderWrapper.room_info,
    customer_details: orderWrapper.customer_details,
    order_info: orderWrapper.order_info,
  };
};

/**
 * Public API — strip a single order. Passthrough when disabled.
 */
export const stripOrder = (orderWrapper) => STRIP_ENABLED ? _stripOrder(orderWrapper) : orderWrapper;

/**
 * Strip an array of order wrappers. Passthrough when disabled.
 * @param {Array} orders — raw API orders array
 * @returns {Array} — stripped orders (or original if disabled)
 */
export const stripOrders = (orders) => {
  if (!STRIP_ENABLED) return orders;
  if (!Array.isArray(orders)) return orders;
  return orders.map(_stripOrder);
};
```

**Line count:** ~95 lines
**Test:** `stripOrders(rawOrders)` reduces payload 68% while preserving every field the FE reads.

### Edit 2 — Wire into `insightsService.js`

Two functions fetch `order-logs-report`: `getItemSalesAggregated` (L47) and `getDashboardAggregated` (L599).

**Edit 2a — Add import (top of file):**
```js
import { stripOrders } from '../transforms/orderPayloadStripper';
```

**Edit 2b — Strip in `getItemSalesAggregated` (after L58):**
After `const ordersResp = ...` resolves:
**Current L59:** `const orders = ordersResp.data?.order || [];`
**New:** `const orders = stripOrders(ordersResp.data?.order || []);`

**Edit 2c — Strip in `getDashboardAggregated` (after L618):**
**Current L620-622:**
```js
  const orders = ordersResp.data?.order || [];
  const collectOrders = collectResp.data?.order || [];
  const cancelDataOrders = cancelResp.data?.order || [];
```
**New:**
```js
  const orders = stripOrders(ordersResp.data?.order || []);
  const collectOrders = stripOrders(collectResp.data?.order || []);
  const cancelDataOrders = stripOrders(cancelResp.data?.order || []);
```

### Edit 3 — Wire into `orderLedgerService.js`

**Edit 3a — Add import:**
```js
import { stripOrders } from '../transforms/orderPayloadStripper';
```

**Edit 3b — Strip in `getOrderLedgerForRange` (L133):**
After API call, strip the response:
**Current ~L135:** `const orders = resp.data?.order || [];`
**New:** `const orders = stripOrders(resp.data?.order || []);`

**Edit 3c — Strip in `getRevenueOrdersForRange` (L211):**
Same pattern.

### Edit 4 — Wire into `reportTransform.js` (Audit Report path)

**Edit 4a — Add import:**
```js
import { stripOrder } from '../transforms/orderPayloadStripper';
```

**Edit 4b — Strip at `orderLogsReportRow` entry (L837):**
**Current:** `const api = orderWrapper.orders_table || {};`
**New:**
```js
  const stripped = stripOrder(orderWrapper);
  const api = stripped.orders_table || {};
```
And update subsequent references to use `stripped` instead of `orderWrapper` for `order_details_table`, `operations`, `customer_details`.

### Edit 5 — Wire into `CancellationsMockup.jsx` (direct API call)

**Edit 5a — Add import:**
```js
import { stripOrders } from '../../api/transforms/orderPayloadStripper';
```

**Edit 5b — Strip after API response (~L212):**
After `const resp = await api.post(...)`:
**Current:** Uses `resp.data?.order` directly
**New:** `const rawOrders = stripOrders(resp.data?.order || []);` then use `rawOrders`

### Edit 6 — Wire into remaining services

Same 1-line pattern for each:
- `roomOrdersService.js` — add import + `stripOrders()` after order fetch
- `foodCourtService.js` — same
- `PrepServeTimeMockup.jsx` — same (if it fetches directly)

### CR-045 Verification Checklist

After all stripping edits:
- [ ] **Dashboard** loads correctly — all 6 KPI tiles show values, payment mix chart works
- [ ] **Item Ledger** — all tabs (All/Sold/Cancelled/Comp/Pending/Top/Slow) show data, drill-down works
- [ ] **Order Ledger** — all tabs, side-sheet detail works, all 51 columns show data
- [ ] **Sales** — revenue chart, channel breakdown, tab settlements all work
- [ ] **Payments** — payment method breakdown works
- [ ] **Cancellations** — cancel reasons, item breakdown works
- [ ] **Prep/Serve Time** — time buckets render
- [ ] **Room Orders** — room list, associated orders, KPI cards work
- [ ] **Food Court** — station breakdown works
- [ ] **Audit Report** (AllOrdersReportPage) — all tabs, side-sheet, exports work
- [ ] **No console errors** across all reports
- [ ] **Network tab:** API response size unchanged (backend still sends full payload). But JS memory should be lower.

---

## PART 2: CR-044 — Shared Cache + Date Persistence (implement SECOND)

### RISK MITIGATIONS INCORPORATED INTO EDITS

| Risk | Mitigation | Incorporated In |
|------|-----------|-----------------|
| **R-3 Stale "today"** | Split TTL: 60s if `toDate >= today`, else 5 min | Edit 7 (`getCached` TTL logic) |
| **R-4 Memory pressure** | MAX_CACHE_ENTRIES=5, skip cache if >3000 orders | Edit 7 (constants + `setCache` guard) |
| **R-7 Race condition** | `pendingFetches` Map stores Promises, dedup on same key | Edit 7a (new `fetchOrReuse` helper) |
| **R-8 Logout data leak** | `clearInsightsCache()` exported, called from `handleLogout` | Edit 7 (export) + Edit 8a (Sidebar.jsx) |
| **R-9 Cache key collision** | `restaurant.id` included in key: `{rid}:{endpoint}:{sort_by}:{from}:{to}` | Edit 7 (`buildCacheKey` signature) |
| **R-10 Products/categories** | DO NOT use MenuContext. Keep API fetches. Cache products/categories in Insights cache separately. | Edit 10 (insightsService cache key for products/categories) |

---

### Edit 7 — Create `insightsCache.js` (module-level cache + helpers)

**File:** NEW `api/services/insightsCache.js`

**Rationale:** Separating the module-level cache from React context. Services import this directly (no React dependency). Context (Edit 7b) wraps date state only.

```js
/**
 * insightsCache.js — CR-044
 *
 * Module-level response cache for Insights reports.
 * Survives React re-renders and route changes. Cleared on logout.
 *
 * Two data structures:
 *   responseCache — stores resolved data (keyed by rid:endpoint:sort:from:to)
 *   pendingFetches — stores in-flight Promises (dedup concurrent requests)
 */

const responseCache = new Map();
const pendingFetches = new Map();

const MAX_CACHE_ENTRIES = 5;
const TTL_TODAY_MS = 60 * 1000;       // 60s for date ranges including today
const TTL_HISTORICAL_MS = 5 * 60 * 1000; // 5 min for purely historical ranges

const _today = () => new Date().toISOString().slice(0, 10);

/** Build cache key including restaurant ID for cross-restaurant safety (R-9) */
export const buildCacheKey = (rid, endpoint, sortBy, from, to) =>
  `${rid}:${endpoint}:${sortBy}:${from}:${to}`;

/** Get cached data if not expired. TTL depends on whether range includes today (R-3). */
export const getCached = (key) => {
  const entry = responseCache.get(key);
  if (!entry) return null;
  // Split TTL: today's data expires faster (R-3)
  const toDate = key.split(':').pop(); // last segment is "to" date
  const ttl = toDate >= _today() ? TTL_TODAY_MS : TTL_HISTORICAL_MS;
  if (Date.now() - entry.timestamp > ttl) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
};

/** Store data in cache with LRU eviction and size guard (R-4). */
export const setCache = (key, data, orderCount = 0) => {
  // R-4: Skip cache for very large responses
  if (orderCount > 3000) return;
  // LRU eviction
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = responseCache.keys().next().value;
    responseCache.delete(oldest);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
};

/**
 * Fetch-or-reuse: dedup concurrent requests for the same cache key (R-7).
 * If a fetch for this key is already in-flight, return the same Promise.
 * If cached data exists, return it immediately (no fetch).
 * Otherwise, call fetchFn(), cache result, return data.
 *
 * @param {string} key — cache key (from buildCacheKey)
 * @param {Function} fetchFn — async function that returns { data, orderCount }
 * @returns {Promise<any>} — cached or freshly fetched data
 */
export const fetchOrReuse = async (key, fetchFn) => {
  // 1. Check cache
  const cached = getCached(key);
  if (cached) return cached;

  // 2. Check if already in-flight (R-7)
  if (pendingFetches.has(key)) return pendingFetches.get(key);

  // 3. Fetch, cache, return
  const promise = fetchFn().then(({ data, orderCount }) => {
    setCache(key, data, orderCount);
    pendingFetches.delete(key);
    return data;
  }).catch((err) => {
    pendingFetches.delete(key);
    throw err;
  });

  pendingFetches.set(key, promise);
  return promise;
};

/** Clear all cache + pending fetches. Called on logout (R-8) and manual refresh. */
export const clearInsightsCache = () => {
  responseCache.clear();
  pendingFetches.clear();
};
```

**Line count:** ~75 lines

---

### Edit 7b — Create `InsightsCacheContext.jsx` (React context for shared dates only)

**File:** NEW `contexts/InsightsCacheContext.jsx`

```jsx
/**
 * InsightsCacheContext — CR-044
 * React context for shared date range across Insights reports.
 * Cache logic lives in api/services/insightsCache.js (module-level, no React dependency).
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { clearInsightsCache } from '../api/services/insightsCache';

const InsightsCacheContext = createContext(null);

export const InsightsCacheProvider = ({ children }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [sharedFrom, setSharedFrom] = useState(today);
  const [sharedTo, setSharedTo] = useState(today);

  // Clears module-level cache + resets dates to today
  const resetAll = useCallback(() => {
    clearInsightsCache();
    setSharedFrom(today);
    setSharedTo(today);
  }, [today]);

  return (
    <InsightsCacheContext.Provider value={{
      sharedFrom, sharedTo, setSharedFrom, setSharedTo, resetAll,
    }}>
      {children}
    </InsightsCacheContext.Provider>
  );
};

export const useInsightsCache = () => {
  const ctx = useContext(InsightsCacheContext);
  if (!ctx) throw new Error('useInsightsCache must be used within InsightsCacheProvider');
  return ctx;
};

export const useInsightsCacheSafe = () => useContext(InsightsCacheContext);
```

**Line count:** ~35 lines

---

### Edit 8 — Wrap Insights routes in `App.js`

**File:** `App.js`
**Add import:** `import { InsightsCacheProvider } from './contexts/InsightsCacheContext';`

**Wrap ALL `/reports-module/*` routes** (L62-88) with `<InsightsCacheProvider>`:

```jsx
<InsightsCacheProvider>
  <Route path="/reports-module/dashboard" element={<ProtectedRoute><DashboardMockup /></ProtectedRoute>} />
  <Route path="/reports-module/items" element={<ProtectedRoute><ItemSalesHybridMockup /></ProtectedRoute>} />
  {/* ... all 15 reports-module routes (L62-88) ... */}
  <Route path="/reports-module/settlement" element={<ProtectedRoute><SettlementReportMockup /></ProtectedRoute>} />
</InsightsCacheProvider>
```

**Note:** Audit Report at `/reports/audit` is NOT wrapped — stays independent.

---

### Edit 8a — Wire logout cache clear in `Sidebar.jsx` (R-8 CRITICAL)

**File:** `components/layout/Sidebar.jsx`
**Add import:** `import { clearInsightsCache } from '../../api/services/insightsCache';`

**In `handleLogout` (L339-351), add `clearInsightsCache()` call:**

```js
const handleLogout = () => {
    clearInsightsCache();       // ← CR-044 R-8: clear report cache on logout
    authLogout();
    clearRestaurant();
    clearMenu();
    clearTables();
    clearSettings();
    clearOrders();
    sessionStorage.clear();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('remember_me');
    navigate("/");
};
```

---

### Edit 9 — Update 10 report pages to use shared date range

**Pattern per page.** Two variations exist across the 10 pages:

**Variation A (7 pages — default 7 days ago to today):** OrderLedgerMockup, SalesMockup, PaymentsMockup, CancellationsMockup, PrepServeTimeMockup, RoomOrdersMockup, FoodCourtMockup, SettlementReportMockup

```js
// BEFORE:
const [fromDate, setFromDate] = useState(fmtISO(sevenDaysAgo));
const [toDate, setToDate] = useState(fmtISO(today));
const [appliedFrom, setAppliedFrom] = useState(fmtISO(sevenDaysAgo));
const [appliedTo, setAppliedTo] = useState(fmtISO(today));

// AFTER:
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
// ...
const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
const [fromDate, setFromDate] = useState(sharedFrom);
const [toDate, setToDate] = useState(sharedTo);
const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
const [appliedTo, setAppliedTo] = useState(sharedTo);
```

**Variation B (2 pages — default today to today):** DashboardMockup, ItemSalesHybridMockup

```js
// Same pattern — just different initial defaults that are now overridden by shared context
```

**handleApply update (ALL 10 pages):** Add `setSharedFrom`/`setSharedTo` sync:

```js
// BEFORE (example — SalesMockup):
const handleApply = () => { if (canApply) { setAppliedFrom(fromDate); setAppliedTo(toDate); setActivePreset(''); } };

// AFTER:
const handleApply = () => {
  if (canApply) {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
    setSharedFrom(fromDate);   // ← CR-044: persist for other reports
    setSharedTo(toDate);       // ← CR-044: persist for other reports
    setActivePreset('');
  }
};
```

**Files and exact locations:**

| # | File | Date init lines | handleApply location |
|---|------|----------------|---------------------|
| 1 | `DashboardMockup.jsx` | L53-56 | L85 (`useCallback`) |
| 2 | `ItemSalesHybridMockup.jsx` | L107-110 (uses URL params as override) | L155 (inline fn) |
| 3 | `OrderLedgerMockup.jsx` | L208-211 | L273 (inline fn) |
| 4 | `SalesMockup.jsx` | L110-113 | L136 (inline fn) |
| 5 | `PaymentsMockup.jsx` | L155-158 | L181 (inline fn) |
| 6 | `CancellationsMockup.jsx` | L171-174 | L190 (inline fn) |
| 7 | `PrepServeTimeMockup.jsx` | L138-141 | L169 (inline fn) |
| 8 | `RoomOrdersMockup.jsx` | L248-251 | L270 (inline fn) |
| 9 | `FoodCourtMockup.jsx` | L110-113 | L145 (inline fn) |
| 10 | `SettlementReportMockup.jsx` | L91-94 | L123 (inline fn) |

**Special case — ItemSalesHybridMockup:** Uses URL params (`urlFrom`/`urlTo`) as override. Priority: URL params > shared context > today. Update:
```js
const initialFrom = urlFrom && /^\d{4}-\d{2}-\d{2}$/.test(urlFrom) ? urlFrom : sharedFrom;
const initialTo   = urlTo   && /^\d{4}-\d{2}-\d{2}$/.test(urlTo)   ? urlTo   : sharedTo;
```

---

### Edit 10 — Wire cache-aware fetch into API services

**File:** `api/services/insightsService.js`

**10a — Import cache helpers:**
```js
import { buildCacheKey, fetchOrReuse } from './insightsCache';
```

**10b — `getItemSalesAggregated` — cache the `order-logs-report` call:**

```js
// BEFORE (L46-58):
const [ordersResp, productsResp, ...] = await Promise.all([
  api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, { sort_by: sortBy, from_date: fromDate, to_date: toDate }),
  api.get(API_ENDPOINTS.PRODUCTS, ...),
  ...
]);
const orders = stripOrders(ordersResp.data?.order || []);

// AFTER:
const rid = restaurantId; // passed as parameter from report page
const ordersCacheKey = buildCacheKey(rid, 'order-logs', sortBy, fromDate, toDate);

const [orders, productsResp, ...] = await Promise.all([
  fetchOrReuse(ordersCacheKey, async () => {
    const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, { sort_by: sortBy, from_date: fromDate, to_date: toDate });
    const stripped = stripOrders(resp.data?.order || []);
    return { data: stripped, orderCount: stripped.length };
  }),
  api.get(API_ENDPOINTS.PRODUCTS, ...),  // R-10: keep API fetch, don't use MenuContext
  ...
]);
// `orders` is already stripped + cached
```

**10c — Same pattern for `getDashboardAggregated`** — 3 order-logs calls, each wrapped in `fetchOrReuse`:

```js
const [orders, collectOrders, cancelDataOrders, ...] = await Promise.all([
  fetchOrReuse(buildCacheKey(rid, 'order-logs', 'created_at', fromDate, toDate), async () => {
    const resp = await api.post(...);
    const stripped = stripOrders(resp.data?.order || []);
    return { data: stripped, orderCount: stripped.length };
  }),
  fetchOrReuse(buildCacheKey(rid, 'order-logs', 'collect_bill', fromDate, addDaysISO(toDate, 1)), async () => {
    // ... same pattern
  }),
  fetchOrReuse(buildCacheKey(rid, 'order-logs', 'created_at', cancelLookbackFrom, addDaysISO(toDate, 1)), async () => {
    // ... same pattern
  }),
  // non-order-logs calls are NOT cached (low volume, unique per report)
  ...
]);
```

**10d — `restaurantId` parameter:** Each service function needs `restaurantId` for the cache key (R-9). Two options:

**Option A — Pass as parameter from report pages:**
```js
// Report page:
const { restaurant } = useRestaurant();
const data = await getItemSalesAggregated(appliedFrom, appliedTo, schedules, restaurant.id);
```

**Option B — Import from a shared getter:**
Services already can't access React context. Pass `restaurantId` as a parameter — **all 10 report pages already import `useRestaurant`** (verified via grep). Adding one more parameter is minimal.

**Recommendation: Option A** — explicit, no hidden state.

---

**File:** `api/services/orderLedgerService.js`

**10e — Same pattern for `getOrderLedgerForRange` and `getRevenueOrdersForRange`:**
```js
import { buildCacheKey, fetchOrReuse } from './insightsCache';

// In getOrderLedgerForRange:
const orders = await fetchOrReuse(
  buildCacheKey(restaurantId, 'order-logs', sortBy, fromDate, toDate),
  async () => {
    const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, ...);
    const stripped = stripOrders(resp.data?.order || []);
    return { data: stripped, orderCount: stripped.length };
  }
);
const transformed = reportListFromAPI.orderLogsReport(orders, null);
```

**Note:** The `reportListFromAPI.orderLogsReport(orders)` call receives already-stripped + cached data. Transform still runs every time (aggregation is report-specific). Only the raw API call is cached.

---

**Files:** `roomOrdersService.js`, `foodCourtService.js`, `prepServeService.js`

**10f — Same `fetchOrReuse` pattern.** Each wraps its `api.post(ORDER_LOGS_REPORT, ...)` call.

**Special case — `roomOrdersService.js`:** Pre-scans raw wrappers for `room_info` BEFORE transform (L88-110). Must scan the cached data too — `fetchOrReuse` returns stripped data which preserves `room_info` (it's in the wrapper-level passthrough of `orderPayloadStripper.js`). **No issue.**

---

**File:** `pages/reports-module/CancellationsMockup.jsx`

**10g — Direct API call in component.** Same `fetchOrReuse` wrapping:
```js
import { buildCacheKey, fetchOrReuse } from '../../api/services/insightsCache';
// ...
const { restaurant } = useRestaurant();
// In useReportFetch callback:
const raw = await fetchOrReuse(
  buildCacheKey(restaurant.id, 'order-logs', 'created_at', cancelFrom, cancelTo),
  async () => {
    const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, ...);
    const stripped = stripOrders(resp.data?.order || []);
    return { data: stripped, orderCount: stripped.length };
  }
);
```

---

### Edit 11 — Wire Refresh button to clear cache

Each report page has a Refresh mechanism (either via `useReportFetch.refetch()` or a manual button). On refresh, clear the cache so fresh data is fetched.

**Pattern:** In each report's refetch/refresh handler, call `clearInsightsCache()`:

```js
import { clearInsightsCache } from '../../api/services/insightsCache';
// ...
const handleRefresh = () => {
  clearInsightsCache(); // ← CR-044: force fresh fetch
  refetch();
};
```

**Alternative:** Only clear the specific cache key (surgical invalidation). But `clearInsightsCache()` is simpler and the TTL is short anyway.

---

## Execution Sequence (CR-044)

```
Step 8:  Create insightsCache.js (module-level cache + helpers)          ~10 min
Step 8b: Create InsightsCacheContext.jsx (React date context)             ~5 min
Step 9:  Wrap routes in App.js                                           ~3 min
Step 9a: Wire logout cache clear in Sidebar.jsx (R-8)                    ~2 min
Step 10: Update 10 report pages — shared date init + handleApply sync    ~25 min
Step 11: Wire fetchOrReuse into insightsService (2 functions)            ~10 min
Step 12: Wire fetchOrReuse into orderLedgerService (2 functions)         ~5 min
Step 13: Wire fetchOrReuse into roomOrders + foodCourt + prepServe       ~10 min
Step 14: Wire fetchOrReuse into CancellationsMockup                      ~5 min
Step 15: Wire Refresh → clearInsightsCache in all 10 pages               ~10 min
Step 16: Add restaurantId parameter to service function signatures       ~10 min
Step 17: VERIFY — navigate reports with same date, check Network tab     ~15 min
```

**Total CR-044: ~110 min** (revised up from ~60 min due to risk mitigations)

---

## Complete File Change Map (CR-044)

| # | File | Change | Risk Addressed |
|---|------|--------|---------------|
| 1 | `api/services/insightsCache.js` **(NEW)** | Module-level cache Map + `fetchOrReuse` + `buildCacheKey` + `clearInsightsCache` | R-3, R-4, R-7, R-8, R-9 |
| 2 | `contexts/InsightsCacheContext.jsx` **(NEW)** | React context for shared dates + `resetAll` | Date persistence |
| 3 | `App.js` | Wrap `/reports-module/*` routes in `InsightsCacheProvider` | Provider setup |
| 4 | `components/layout/Sidebar.jsx` | `clearInsightsCache()` in `handleLogout` | **R-8 (CRITICAL)** |
| 5 | `pages/reports-module/DashboardMockup.jsx` | Shared date init + handleApply sync | Date persistence |
| 6 | `pages/reports-module/ItemSalesHybridMockup.jsx` | Same + URL param priority | Date persistence |
| 7 | `pages/reports-module/OrderLedgerMockup.jsx` | Same | Date persistence |
| 8 | `pages/reports-module/SalesMockup.jsx` | Same | Date persistence |
| 9 | `pages/reports-module/PaymentsMockup.jsx` | Same | Date persistence |
| 10 | `pages/reports-module/CancellationsMockup.jsx` | Same + fetchOrReuse | Date persistence + cache |
| 11 | `pages/reports-module/PrepServeTimeMockup.jsx` | Same | Date persistence |
| 12 | `pages/reports-module/RoomOrdersMockup.jsx` | Same | Date persistence |
| 13 | `pages/reports-module/FoodCourtMockup.jsx` | Same | Date persistence |
| 14 | `pages/reports-module/SettlementReportMockup.jsx` | Shared dates only (different API — no order cache) | Date persistence |
| 15 | `api/services/insightsService.js` | `fetchOrReuse` for 4 order-logs calls + `restaurantId` param | Cache + R-9 + R-10 |
| 16 | `api/services/orderLedgerService.js` | `fetchOrReuse` for 2 order-logs calls + `restaurantId` param | Cache + R-9 |
| 17 | `api/services/roomOrdersService.js` | `fetchOrReuse` for 1 order-logs call + `restaurantId` param | Cache + R-9 |
| 18 | `api/services/foodCourtService.js` | `fetchOrReuse` for 1 order-logs call + `restaurantId` param | Cache + R-9 |
| 19 | `api/services/prepServeService.js` | `fetchOrReuse` for 1 order-logs call + `restaurantId` param | Cache + R-9 |

**Total: 2 new files + 17 modified files. ~250 lines added.**

---

## Execution Sequence

```
=== CR-045 (DONE) ===
Step 1-7: COMPLETE — orderPayloadStripper.js + 10 strip points wired

=== CR-044 (cache + date persistence) ===
Step 8:  Create insightsCache.js (module-level cache + helpers)          ~10 min
Step 8b: Create InsightsCacheContext.jsx (React date context)             ~5 min
Step 9:  Wrap routes in App.js                                           ~3 min
Step 9a: Wire logout cache clear in Sidebar.jsx (R-8 CRITICAL)           ~2 min
Step 10: Update 10 report pages — shared date init + handleApply sync    ~25 min
Step 11: Wire fetchOrReuse into insightsService (2 functions)            ~10 min
Step 12: Wire fetchOrReuse into orderLedgerService (2 functions)         ~5 min
Step 13: Wire fetchOrReuse into roomOrders + foodCourt + prepServe       ~10 min
Step 14: Wire fetchOrReuse into CancellationsMockup                      ~5 min
Step 15: Wire Refresh → clearInsightsCache in all 10 pages               ~10 min
Step 16: Add restaurantId parameter to service function signatures       ~10 min
Step 17: VERIFY — navigate reports with same date, check Network tab     ~15 min
```

**Total: CR-045 DONE + CR-044 ~110 min**

---

## Risk Register

### CR-045 Risks (Field Stripping — IMPLEMENTED)

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R-1 | Stripping removes a field that's actually needed | LOW | Whitelists validated against live API + full codebase grep across 3 restaurants. DOUBT fields included. `cancel_by` caught and added during validation. |
| R-2 | `food_details` format mutation breaks consumers | LOW | **Updated:** `stripFoodDetails` preserves format (string→strip→re-stringify). No type mutation. |

### CR-044 Risks (Shared Cache — PLANNING)

| # | Risk | Severity | Status | Required Mitigation |
|---|------|----------|--------|-------------------|
| **R-3** | **Stale "today" data** | **HIGH** | **GAP — must fix before implementation** | **Split TTL strategy:** Today's date range = 0s or 60s TTL (data is volatile — orders arrive every few minutes). Historical date ranges (past dates) = 5-min TTL (data is stable). Check: `if (toDate >= today) ttl = 60_000; else ttl = 300_000;`. Without this, a restaurant doing 10 orders/hour shows ~1 missing order on average during the 5-min window. Dashboard defaults to "today" — this is the most common use case. |
| **R-4** | **Memory pressure on high-volume restaurants** | **MEDIUM** | **GAP — must fix before implementation** | **Per-entry size guard:** If `orders.length > 3000`, skip caching for that key (re-fetch is cheaper than OOM). LRU eviction stays at max 10 entries. Also: reduce MAX_CACHE_ENTRIES from 10 → 5 for safety. Worst case: 5 entries × 5.8 MB (stripped) × 1000 orders = ~29 MB — comfortable. For mobile/tablet: detect `navigator.deviceMemory` — if < 4 GB, reduce to max 3 entries. |
| R-5 | Shared date context breaks individual report date logic | LOW | Mitigated | Each report keeps local draft dates (`fromDate`/`toDate` for date picker). Only `appliedFrom`/`appliedTo` sync to shared context on Apply. Draft edits don't leak across reports. |
| R-6 | `InsightsCacheProvider` not present for non-Insights consumers | LOW | Mitigated | `useInsightsCacheSafe()` returns null. Services check before using cache. Audit Report at `/reports/audit` doesn't use cache. |
| **R-7** | **Race condition — two reports fetch same data simultaneously** | **MEDIUM** | **GAP — plan code doesn't implement this** | **Store Promises in a pending Map, not resolved data.** When two reports request the same cache key within milliseconds, the second caller must await the first's Promise instead of firing a duplicate API call. Pattern: `const pending = new Map(); const fetchOrReuse = (key, fn) => { if (pending.has(key)) return pending.get(key); const p = fn().then(d => { setCache(key, d); pending.delete(key); return d; }); pending.set(key, p); return p; };` Without this, rapid Dashboard→Item Ledger clicks fire 2 identical `order-logs-report` calls. |
| **R-8** | **Cache survives logout — data leak between restaurants** | **CRITICAL** | **NOT IN PLAN — must add** | **Clear module-level `responseCache` on logout.** The `Map` is outside React — it persists across logouts if the tab stays open. If Owner A logs out and Owner B logs into a different restaurant in the same tab, Owner B would see Owner A's cached report data. **Fix:** Wire `responseCache.clear()` into the logout handler (`AuthContext.logout` or `clearMenu` in `MenuContext`). This is a **security requirement**, not optional. |
| **R-9** | **Cache key collision across restaurants** | **CRITICAL** | **NOT IN PLAN — must add** | **Include `restaurant_id` in cache key.** Current key format `{endpoint}:{sort_by}:{from}:{to}` is identical across restaurants. If somehow two restaurant contexts exist (admin multi-restaurant switching), wrong data could be served. **Fix:** Key format becomes `{rid}:{endpoint}:{sort_by}:{from}:{to}`. The `rid` comes from `RestaurantContext.restaurant.id` (available at all report pages). Even without multi-restaurant, this is defence-in-depth against R-8 (logout leak) — a stale cache entry for rid=474 won't match a request for rid=541. |
| **R-10** | **Products/categories permission mismatch** | **MEDIUM** | **Original plan was WRONG — corrected** | **DO NOT use MenuContext for report enrichment.** A report-only user may not have menu API permissions — `MenuContext` could be empty for them. Reports must keep fetching products/categories from their own API calls (current behavior). If caching products/categories for Item Ledger, cache them in the Insights cache (separate key: `{rid}:products` / `{rid}:categories`) — NOT from MenuContext. The report data pipeline must be self-contained: `order-logs-report` provides `food_details` blob (name, category_id, tax, veg), and the supplementary products/categories fetch provides category NAME mapping. Both come from API, never from boot-time MenuContext. |

### Risk Priority Matrix

```
CRITICAL (must fix before implementation):
  R-8  Cache survives logout (data leak)
  R-9  Cache key collision across restaurants

HIGH (must fix before implementation):
  R-3  Stale "today" data (split TTL)

MEDIUM (should fix during implementation):
  R-4  Memory pressure (size guard)
  R-7  Race condition (Promise dedup)
  R-10 Products/categories permission (keep API fetch, don't use MenuContext)

LOW (mitigated, monitor):
  R-5  Shared date context drift
  R-6  Provider absence for non-Insights
```

---

## DEPRECATION PLAN — CR-045 Removal When Backend Ships Strip

### Pre-conditions
- Backend team confirms server-side field stripping is live in production
- Backend provides field list being stripped (to compare against FE whitelist)

### Steps
1. **Disable FE strip:** Add `REACT_APP_STRIP_ORDERS=false` to frontend `.env`
2. **Restart frontend** (env change requires restart)
3. **QA all 10 Insights reports + Audit Report** — verify data matches pre-disable state
4. **If QA passes:** Remove `orderPayloadStripper.js` file entirely
5. **Remove import lines** from: `insightsService.js`, `orderLedgerService.js`, `reportTransform.js`, `CancellationsMockup.jsx`, `roomOrdersService.js`, `foodCourtService.js`, `PrepServeTimeMockup.jsx`
6. **Remove `REACT_APP_STRIP_ORDERS` from `.env`**
7. **If QA fails:** Compare backend strip field list vs FE whitelist — identify fields backend is stripping that FE needs. Raise with backend team. Keep FE strip ON until resolved.

### Risk during transition
- **Double-strip (both FE + backend active):** Safe — `pick()` on already-stripped data returns same/fewer keys. No crash, no data loss. Just wasted CPU (~1ms per order). The env flag allows instant disable.
- **Backend strips a field FE needs:** QA step 3 catches this. Rollback = set `REACT_APP_STRIP_ORDERS=true` to re-enable FE strip (which preserves the field since it's in the whitelist).

---

*Phase 5 Implementation Plan — 2026-06-12. Updated 2026-06-12: TEMPORARY ARRANGEMENT notice + deprecation plan for CR-045. Validated against live API data. Ready for Gate 4.*
