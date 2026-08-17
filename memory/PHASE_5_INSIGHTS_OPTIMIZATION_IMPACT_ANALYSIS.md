# Phase 5 — Insights Optimization: Impact Analysis

**Created:** 2026-06-12
**Gate:** 2 (Impact Analysis)
**Items:** CR-044 (Report Data Persistence / Shared Cache), CR-045 (Suppress Unused API Fields)

---

## CR-044: Report Data Persistence Across Navigation

### Complete API Call Map Per Report

| # | Report | Service Function | API Calls | sort_by | Shared With |
|---|--------|------------------|-----------|---------|-------------|
| 1 | **Dashboard** | `insightsService.getDashboardAggregated` | 3× `order-logs-report` (created_at + collect_bill + cancel lookback) + `cancellation-reasons` + `tap-waiter-list` + `tab-settlements` | created_at + collect_bill | Sales (#3), Payments (#4) call same service via `orderLedgerService` |
| 2 | **Item Ledger** | `insightsService.getItemSalesAggregated` | 1× `order-logs-report` + `products` + `categories` + `cancellation-reasons` | created_at | Unique aggregation |
| 3 | **Sales** | `orderLedgerService.getRevenueOrdersForRange` + `getTabSettlementsForRange` | 2× `order-logs-report` (created_at + collect_bill) + N× `daily-sales-report` | created_at + collect_bill | Shares raw orders with Dashboard |
| 4 | **Payments** | `orderLedgerService.getRevenueOrdersForRange` + `getTabSettlementsForRange` | Same as Sales | created_at + collect_bill | Shares raw orders with Sales & Dashboard |
| 5 | **Order Ledger** | `orderLedgerService.getOrderLedgerForRange` | 1-2× `order-logs-report` | created_at (or collect_bill) | Unique aggregation |
| 6 | **Cancellations** | Direct `api.post` | 1× `order-logs-report` | created_at | Subset of Dashboard cancel fetch |
| 7 | **Prep/Serve Time** | Own aggregation via `useReportFetch` | 1× `order-logs-report` | created_at | Subset of Dashboard punch fetch |
| 8 | **Room Orders** | `roomOrdersService` | 1× `order-logs-report` + room detail APIs | created_at | Unique (room-specific) |
| 9 | **Food Court** | `foodCourtService` | 1× `order-logs-report` | created_at | Unique (station-specific) |
| 10 | **Settlement** | `settlementReportService` | N× `get-settlement-report` (1 per day) | — | Completely different API |

### Total API Calls Per User Session (browsing all reports for same date range)

**Current (no cache):**
- `order-logs-report`: **~12 calls** (3 from Dashboard + 1 Item Ledger + 2 Sales + 2 Payments + 2 Order Ledger + 1 Cancellations + 1 Prep/Serve)
- `products` + `categories` + `cancellation-reasons`: **3 calls** (Item Ledger fetches these; already in MenuContext from boot but fetched fresh anyway)
- `tap-waiter-list`: 1 call (Dashboard)
- `daily-sales-report`: N calls (Sales, 1 per day in range)
- `get-settlement-report`: 1 call (Settlement)
- **Total: ~17+ API calls** for same underlying data

**With cache (CR-044):**
- `order-logs-report` with `created_at` for range X→Y: **1 call** (cached, reused by Dashboard, Item Ledger, Cancellations, Prep/Serve, Room, Food Court)
- `order-logs-report` with `collect_bill` for range X→Y+1: **1 call** (cached, reused by Dashboard, Sales, Payments, Order Ledger)
- `order-logs-report` with cancel lookback: **1 call** (Dashboard-specific but cacheable)
- `products` + `categories`: **0 calls** (already in MenuContext from boot — can reuse)
- `daily-sales-report`: N calls (uncacheable per-day — but persistent across Sales↔Payments navigation)
- **Total: ~3-5 API calls** for same data → **70-80% reduction**

### Caching Strategy

**Cache key:** `{endpoint}:{sort_by}:{from_date}:{to_date}`

**Cache levels (from most impactful to least):**

| Level | What to Cache | Reused By | Savings |
|-------|---------------|-----------|---------|
| **L1 — Raw order-logs-report response** | `{sort_by:created_at, from, to}` → raw orders array | Dashboard, Item Ledger, Cancellations, Prep/Serve, Room Orders, Food Court | **6 reports share 1 fetch** |
| **L2 — Raw collect_bill response** | `{sort_by:collect_bill, from, to+1}` → raw orders array | Dashboard, Sales, Payments, Order Ledger | **4 reports share 1 fetch** |
| **L3 — Products + Categories** | Already in MenuContext from boot | Item Ledger (currently re-fetches) | **Eliminates 2 API calls** |
| **L4 — Aggregated results** | Per-report aggregated data | Same report when navigating back | **Eliminates re-aggregation** |
| **L5 — Date range persistence** | `{from, to}` shared across all reports | All reports | **User doesn't re-enter dates** |

### Architecture Decision: Where to Cache

| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| **A — Context + useRef cache** | `InsightsCacheContext` wraps all `/reports-module/*` routes. Stores raw responses in `useRef` (survives re-renders). Date range in `useState`. | Simple, no external deps. Cleared on unmount of context (logout/leave Insights). | Cache lost if user navigates to Dashboard main and back to Insights. |
| **B — sessionStorage** | Store responses in sessionStorage keyed by endpoint+params. | Survives all navigation. | 5-10 MB sessionStorage limit. Serialization overhead. |
| **C — In-memory module-level Map** | Singleton `Map` outside React. | Simplest. Survives all navigation. No size limit. Cleared on page refresh. | Not reactive — needs manual invalidation. |

**Recommendation:** Option A (Context) for date range + Option C (module-level Map) for raw API responses. Context provides reactive date sharing. Module-level Map provides fast cache without serialization overhead.

### Affected Files

| File | Change | Impact |
|------|--------|--------|
| **NEW `contexts/InsightsCacheContext.jsx`** | Shared date range state + cache invalidation API | ~80 lines |
| **NEW `api/services/insightsCacheService.js`** (or extend existing) | Module-level Map cache for raw API responses | ~50 lines |
| `App.js` | Wrap `/reports-module/*` routes in `InsightsCacheProvider` | 3 lines |
| `useReportFetch.js` | Add cache-aware option: check cache before fetch | ~20 lines |
| `pages/reports-module/DashboardMockup.jsx` | Replace local date state with shared context | ~10 lines |
| `pages/reports-module/ItemSalesHybridMockup.jsx` | Same | ~10 lines |
| `pages/reports-module/OrderLedgerMockup.jsx` | Same | ~10 lines |
| `pages/reports-module/SalesMockup.jsx` | Same | ~10 lines |
| `pages/reports-module/PaymentsMockup.jsx` | Same | ~10 lines |
| `pages/reports-module/CancellationsMockup.jsx` | Same | ~10 lines |
| `pages/reports-module/PrepServeTimeMockup.jsx` | Same | ~10 lines |
| `pages/reports-module/RoomOrdersMockup.jsx` | Same | ~10 lines |
| `pages/reports-module/FoodCourtMockup.jsx` | Same | ~10 lines |
| `pages/reports-module/SettlementReportMockup.jsx` | Same (date only — Settlement uses different API) | ~10 lines |
| `api/services/insightsService.js` | Read from cache before calling API | ~15 lines |
| `api/services/orderLedgerService.js` | Same | ~15 lines |

**Total: 2 new files + 12-14 modified files**

### Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R-1 | Stale cache — user expects fresh data but gets cached | MEDIUM → **HIGH for "today"** | Cache key includes date range. "Refresh" button clears cache. **UPDATED: Split TTL — today's range = 60s, historical = 5 min.** |
| R-2 | Memory pressure — large responses in memory | LOW → **MEDIUM for high-volume** | Cache max 5 entries. LRU eviction. **UPDATED: Per-entry size guard — skip cache if >3000 orders.** |
| R-3 | Race condition — two reports fetch same data simultaneously | MEDIUM | **Must store Promise in pending Map** — second caller awaits same Promise. Plan code must implement this (not just mention it). |
| R-4 | Products/categories permission mismatch | **MEDIUM** | **CORRECTED: DO NOT use MenuContext for reports.** A report-only user may not have menu API permissions — MenuContext could be empty. Reports must keep fetching products/categories via their own API calls (current behavior). Cache these independently in Insights cache (key: `{rid}:products`). |
| **R-5** | **Cache survives logout — data leak between restaurants** | **CRITICAL** | **NEW: Clear module-level `responseCache` on logout.** Wire into logout handler. Security requirement. |
| **R-6** | **Cache key collision across restaurants** | **CRITICAL** | **NEW: Include `restaurant_id` in cache key** — format `{rid}:{endpoint}:{sort_by}:{from}:{to}`. Defence-in-depth against R-5. |

---

## CR-045: Suppress/Ignore Unused API Response Fields

### DOC10 Audit Summary (from `api-optimization` branch)

| Component | Total Fields | Used | Dead | Savings per order |
|-----------|-------------|------|------|-------------------|
| `orders_table` | 128 | 52 (+ 8 doubt) | 68 | ~1.7 KB |
| `order_details_table` | 47/item | 30 (+ 4 doubt) | 13 | ~0.3 KB/item |
| `food_details` blob | 72/item | **7** | **65** | **~1.5 KB/item** |
| `operations` | 26/op | 8 | 18 | ~0.3 KB/op |

**Total monthly savings:** ~37 MB raw / ~6 MB gzipped (cafe103). **75% payload reduction.**

**Biggest single win:** `food_details` blob — 72 fields, only 7 used. Each blob is ~1.6 KB; stripping to 7 fields → ~100 bytes. **96% smaller per item.**

### Two-Track Approach

**Track A — FE-side strip (CR-045 scope, no backend change):**
At the transform entry point, immediately project only needed fields from the raw response. Discard the rest before storing in React state or cache.

**Track B — Backend-side strip (recommendation to backend team, out of CR-045 scope):**
Backend modifies SELECT clause or JSON projection to only return needed fields. Saves network bandwidth + server CPU + DB reads. DOC10 §F documents the staged backend plan.

**CR-045 = Track A only.** Track B is a backend recommendation doc.

### FE Strip Implementation Points

| # | Where | What to Strip | How | Impact |
|---|-------|---------------|-----|--------|
| **S-1** | `insightsService.js` — after `ordersResp.data.order` read | Strip `orders_table` to 52 used fields + `order_details_table` items to 30 fields + `food_details` to 7 fields | Map + pick at loop entry | Affects: Dashboard, Item Ledger |
| **S-2** | `orderLedgerService.js` — after `resp.data.order` read | Same strip pattern | Same | Affects: Order Ledger, Sales, Payments |
| **S-3** | `CancellationsMockup.jsx` — after `resp.data.order` read (direct API call) | Same strip pattern | Same | Affects: Cancellations |
| **S-4** | `reportTransform.js` — `orderLogsReportRow` entry | Strip at transform entry (most natural point) | Same | Affects: Audit Report (AllOrdersReportPage) |
| **S-5** | `roomOrdersService.js` — after order fetch | Same | Same | Affects: Room Orders |
| **S-6** | `foodCourtService.js` — after order fetch | Same | Same | Affects: Food Court |
| **S-7** | `PrepServeTimeMockup.jsx` — after fetch | Same | Same | Affects: Prep/Serve Time |

**Better approach: centralized strip function** — create ONE `stripOrderPayload(order)` utility that all 7 consumers call. This function picks only the needed fields from `orders_table`, `order_details_table`, `food_details`, and `operations`. ~30 lines, single file.

### Interaction with CR-044 (Cache)

**Critical synergy:** If CR-044 caches raw API responses, stripping BEFORE caching means the cache stores lean data (~12 MB instead of ~49 MB per month). This is the optimal order:

```
API response (49 MB) → stripOrderPayload() → lean data (12 MB) → cache → reports consume
```

**If we strip AFTER cache, the cache stores 49 MB of bloated data.** So CR-045 should be implemented BEFORE or simultaneously with CR-044.

### Affected Files

| File | Change |
|------|--------|
| **NEW `api/transforms/orderPayloadStripper.js`** | Centralized strip function (~30 lines) |
| `api/services/insightsService.js` | Call `stripOrderPayload` after API response, before aggregation |
| `api/services/orderLedgerService.js` | Same |
| `api/transforms/reportTransform.js` | Same (at `orderLogsReportRow` entry) |
| `api/services/roomOrdersService.js` | Same |
| `api/services/foodCourtService.js` | Same |
| `pages/reports-module/CancellationsMockup.jsx` | Same |
| `pages/reports-module/PrepServeTimeMockup.jsx` | Same |

**Total: 1 new file + 7 modified files**

### Field Whitelists (from DOC10)

```js
// orders_table: 52 USED fields (keep list)
const ORDERS_TABLE_KEEP = [
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
];

// order_details_table: 30 USED fields
const ITEMS_KEEP = [
  'id', 'food_id', 'food_details', 'food_status', 'quantity', 'unit_price',
  'price', 'station', 'variation', 'add_ons', 'food_level_notes',
  'cancel_at', 'cancel_by_name', 'cancel_type', 'cancel_reason_text',
  'complementary', 'complementary_price', 'gst_tax_amount', 'vat_tax_amount',
  'discount_amount', 'service_charge', 'ready_at', 'ready_by',
  'serve_at', 'serve_by', 'created_at', 'item_type',
  'total_add_on_price', 'total_variation_price', 'discount_on_food',
];

// food_details: 7 USED fields (96% reduction)
const FOOD_DETAILS_KEEP = [
  'id', 'name', 'category_id', 'tax', 'tax_type', 'tax_calc', 'veg',
];

// operations: 8 USED fields
const OPS_KEEP = [
  'operation', 'created_at', 'previous_order_amount',
  'previous_payment_method', 'current_payment_method',
  'vendor_employee_name', 'food_id', 'restaurant_order_id',
];
```

### Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R-1 | Strip removes a field that's actually needed by a niche path | LOW | DOC10 audit was thorough (full codebase grep). 8 DOUBT fields kept in "used" list as safety. |
| R-2 | `food_details` is a JSON string — parsing + re-serializing adds CPU | LOW | Parse once → pick 7 fields → keep as object (don't re-stringify). Consumers already parse it. |
| R-3 | Future features may need currently-dead fields | LOW | Whitelist is easy to extend — add field to KEEP array. Well-documented. |

---

## Recommended Execution Order

```
1. CR-045 FIRST (strip unused fields)
   → Immediate memory/perf win
   → Lean data ready for caching

2. CR-044 SECOND (shared cache + date persistence)
   → Cache stores lean data (CR-045 already stripped)
   → Maximum combined impact
```

**Combined impact:** 75% smaller payloads + 70-80% fewer API calls = **~95% reduction in total data transferred** when a user browses multiple Insights reports for the same date range.

---

*Phase 5 Impact Analysis — 2026-06-12. Gate 2 complete for CR-044 + CR-045.*
