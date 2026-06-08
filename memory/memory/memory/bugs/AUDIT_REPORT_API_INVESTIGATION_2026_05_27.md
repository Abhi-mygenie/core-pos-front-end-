# AUDIT REPORT — Deep API & Data Flow Investigation

**Date:** 2026-05-27
**Type:** Investigation Only (no code changes)
**Scope:** AllOrdersReportPage.jsx (Audit Report) — API round trips, inline transforms, gaps

---

## 1. FULL API CALL CHAIN — What Fires When the Page Loads

When the Audit Report page mounts (or the date picker changes), `fetchOrders()` fires. Here is **every network request** that happens, in order:

### Phase A — Parallel Pre-Fetch (2+ calls)

```
Promise.all([
  getActiveSrmIds(),       ← Call A1 (cascades to A1a + A1b)
  getRunningOrders(),      ← Call A2
])
```

#### Call A1: `getActiveSrmIds()` — The Room SRM Cascade

**Purpose:** Build a `Set<number>` of SRM (Sub-Room) order IDs whose parent room is currently in-house. This is used later to decide whether a `transferToRoom` row should show as "Running" or "Paid".

**Internal cascade:**

| Step | API Endpoint | Method | Purpose | Dependency |
|---|---|---|---|---|
| A1a | `/api/v2/vendoremployee/get-room-list` | GET | Get all currently-active (in-house) rooms | None |
| A1b | `/api/v2/vendoremployee/get-single-order-new` × N | POST | For **each** in-house room, fetch its folio to extract `associatedOrders[].orderId` (the SRM child IDs) | Depends on A1a result |

**Cost:** 1 + N calls, where N = number of currently in-house rooms (typically 0–10).

**Why it exists (root cause):** Backend's `/order-logs-report` never updates `payment_method` on SRM rows after the parent room checks out. So a settled SRM perpetually has `payment_method = 'transferToRoom'`. Without this cascade, every such row would be force-flipped to `status: 'running'` even after checkout. The cascade determines which rooms are STILL in-house, so only those SRMs get the running override.

**Gap identified:** This entire cascade exists because **`/order-logs-report` does not ship a `room_checkout_status` or `parent_room_is_active` flag per SRM row**. If backend added a single boolean field per row, this 1+N cascade would be eliminated.

#### Call A2: `getRunningOrders()`

| API Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/vendoremployee/pos/employee-orders-list` | GET `?role_name=Manager` | Fetch all currently running orders |

**Purpose:** Used for **gap detection** in the Audit tab. When the page detects a missing order ID in the sequence, it checks if that ID exists in the running orders list. If yes → it's "running, not missing". If no → it's flagged as a missing/audit gap.

**Gap identified:** This call exists because `/order-logs-report` **does not include currently-running (unfinished) orders**. The logs endpoint only returns orders that have reached a terminal or near-terminal state. So to avoid false-positives in gap detection, the page cross-references with the running orders list.

### Phase B — The Main Report Call (1 call, sequential after Phase A)

```
getOrderLogsReport(selectedDate, schedules, 'created_at', activeSrmIds)
```

| API Endpoint | Method | Body | Purpose |
|---|---|---|---|
| `/api/v2/vendoremployee/report/order-logs-report` | POST | `{ sort_by: 'created_at', from_date: 'YYYY-MM-DD', to_date: 'YYYY-MM-DD' }` | The **primary** data source for ALL rows in the audit report |

**This is the only call that returns the order list.** Everything else is supplementary.

### Phase C — Row Click (1 call, on-demand)

When the operator clicks a row, `OrderDetailSheet` fires:

```
getSingleOrderNew(order.id)
```

| API Endpoint | Method | Body | Purpose |
|---|---|---|---|
| `/api/v2/vendoremployee/get-single-order-new` | POST | `{ order_id: <id> }` | Rich item-level detail for the side sheet |

---

## 2. TOTAL ROUND TRIPS SUMMARY

| When | Calls | Endpoints Hit |
|---|---|---|
| **Page load / date change** | **3 + N** | `get-room-list` (1) + `get-single-order-new` × N rooms + `employee-orders-list` (1) + `order-logs-report` (1) |
| **Row click** | **1** | `get-single-order-new` (1) |

For a restaurant with 5 in-house rooms, that's **8 API calls** just to populate the table.

---

## 3. WHY THE ROUND TRIPS EXIST — Root Cause Analysis

### Round Trip 1: `getActiveSrmIds()` — The Room SRM Cascade (1 + N calls)

**Root cause:** `/order-logs-report` does not update `payment_method` on SRM rows after room checkout. The field stays as `transferToRoom` forever.

**What backend could fix:** Add a field like `is_parent_room_active: true/false` or `room_settlement_status` to each `transferToRoom` row in the `/order-logs-report` response. This would eliminate 1 + N calls entirely.

### Round Trip 2: `getRunningOrders()` — Gap Detection Cross-Reference (1 call)

**Root cause:** `/order-logs-report` does not include currently-running orders (orders still being prepared/served/billed). It only includes orders that have reached a settled state.

**What backend could fix:** Either:
- (a) Include running orders in `/order-logs-report` with their current `f_order_status`, OR
- (b) Add a `highest_order_id` and `lowest_order_id` field in the response metadata so frontend can do gap detection without needing the running orders list, OR
- (c) Backend does the gap detection server-side and returns a `missing_order_ids[]` array.

### Round Trip 3: `getSingleOrderNew()` on Row Click (1 call)

**Root cause:** `/order-logs-report` returns a **flat summary row** per order with ~30 fields from `orders_table`. It does NOT return:
- Item-level detail (`orderDetails[]` with food name, price, qty, variations, add-ons, notes)
- Item-level timestamps (ready_at, serve_at, cancel_at per item)
- Customer contact info (phone, email)
- Table area/section name
- Vendor employee full name (only `waiter_name`)
- Rich food properties (veg/non-veg, image, tax_type, tax_calc)

**What backend could fix:** This one is arguably justified — loading 100+ fields per item for every order in a 200-row report would be expensive. The drill-down pattern (list → detail on click) is a standard optimization. **This round trip is acceptable.**

---

## 4. WHY THERE IS NO TRANSFORM — The Inline Code Problem

### Current Architecture (Violation)

The codebase has a clear **service → transform → consumer** pattern:
- `reportTransform.js` has `reportListFromAPI.paidOrders()`, `reportListFromAPI.cancelledOrders()`, `reportFromAPI.orderDetails()`, `reportFromAPI.singleOrderNew()`, etc.
- `orderTransform.js` has `fromAPI.order()`, `fromAPI.orderList()`, etc.

But `getOrderLogsReport()` in `reportService.js` **breaks this pattern**. The entire 300-line transform is written **inline** inside the service function (lines 636–947).

### What the Inline Code Does (reportService.js L636-947)

For each raw `orderWrapper` from the API, the inline code:

1. **Extracts** `orders_table` fields → 25+ frontend fields
2. **Derives status** via a 60-line priority chain (10+ rules, L666-728)
3. **Normalizes channel** from `order_type` (L738-746)
4. **Normalizes platform** from `order_from` (L752-762)
5. **Computes payment gateway** tri-state (L765-766)
6. **Computes display fields** — order ID prefix, table display label, punched by, actioned by (L779-886)
7. **Builds the return object** with 40+ fields (L888-947)
8. **Runs dev-mode audit** logging (L545-633) — checking for missing backend fields

### Why It Was Written Inline (Historical Reason)

Based on code comments and the CR trail:
- The original report endpoints (`paid-order-list`, `cancel-order-list`, etc.) use the standard `reportTransform.js` transforms.
- `/order-logs-report` was added later (CR-001) as a **unified replacement** for those separate endpoints.
- The response shape of `/order-logs-report` is significantly different from the older endpoints — it uses `{ order: [{ orders_table: {...}, order_details_table: [...], room_info: {...} }] }` (a wrapper structure), whereas older endpoints use flat `{ orders: [...] }`.
- Multiple CRs (CR-001 Phase 1, Phase 2, CR-003, CR-005, POS2-005, POS2-006, BUG-042-A, BUG-059, etc.) incrementally added fields and logic directly into the service function rather than extracting to a proper transform.

### Gaps Created by Inline Code

| Gap | Impact |
|---|---|
| **No reuse** — the status derivation logic (L666-728) cannot be used by other consumers | If another page needs to classify orders by the same rules, it must duplicate the logic |
| **No unit testability** — inline transforms cannot be imported and tested in isolation | The only way to test is to mock the full API response and call the service |
| **Mixed concerns** — network I/O, data transformation, business-day filtering, diagnostic logging, and display formatting are all in one 400-line function | Any change requires understanding the entire block |
| **Drift risk** — the status derivation here differs from `reportTransform`'s simpler transforms for the older endpoints | Paid/Cancelled/Hold classification may produce different results depending on which endpoint was used |
| **Dev diagnostics hardcoded** — 80+ lines of console.warn/console.log (WATCH_ORDER_IDS, G5 unprefixed snapshot, BE-1 invariant checks) are in production code | Performance and console noise in prod, even though gated by `NODE_ENV === 'development'` |

---

## 5. FIELD-BY-FIELD: What `/order-logs-report` Returns vs What `get-single-order-new` Returns

### Fields available ONLY in `/order-logs-report` (NOT in `get-single-order-new`)

| Field | Backend Key | Usage | Why Missing from Detail |
|---|---|---|---|
| order_in (RM/SRM/TB) | `orders_table.order_in` | Tab routing, prefix, room detection | Detail endpoint doesn't expose this |
| parent_order_id | `orders_table.parent_order_id` | SRM→Room linking | Not in detail response |
| razorpay_order_id | `orders_table.razorpay_order_id` | PG filter | Not in detail response |
| snapshot_razorpay_status | `orders_table.snapshot_razorpay_status` | PG status column | Not in detail response |
| payment_amount (PG) | `orders_table.payment_amount` | PG capture amount | Not in detail response |
| cancellation_reason | `orders_table.cancellation_reason` | Cancel reason text | Detail uses item-level cancel |
| cancel_type | `order_details_table[0].cancel_type` | Pre-Serve/Post-Serve | Not in detail response |
| order_from | `orders_table.order_from` | Platform (pos/web) | Not in detail response |
| collect_bill timestamp | `orders_table.collect_bill` | Bill collection time | Not in detail response |
| room_info (wrapper-level) | `orderWrapper.room_info` | Room number, pricing | Not in detail transform (available in raw but not extracted by `singleOrderNew`) |
| associated_orders (wrapper-level) | `orderWrapper.associated_orders` | SRM children list | Not extracted by `singleOrderNew` (only by `getSingleOrderRoom`) |
| employee_name | `orders_table.employee_name` | "Collected by" | Detail uses `vendorEmployee.f_name` (different field = waiter, not collector) |
| waiter_name | `orders_table.waiter_name` | "Punched by" | Detail uses `vendorEmployee.f_name` (same person but different join) |

### Fields available ONLY in `get-single-order-new` (NOT in `/order-logs-report`)

| Field | Backend Key | Usage | Why Missing from List |
|---|---|---|---|
| Item-level details | `orderDetails[]` | Item names, prices, quantities | List endpoint only has `orders_table` summary |
| Item variations | `orderDetails[].variation[]` | Size/flavor selections | Not in list |
| Item add-ons | `orderDetails[].add_ons[]` | Extra toppings, sides | Not in list |
| Item food_level_notes | `orderDetails[].food_level_notes` | Kitchen notes per item | Not in list |
| Item timestamps | `orderDetails[].ready_at, serve_at, cancel_at` | Per-item timeline | Not in list |
| Item food_details | `orderDetails[].food_details` | Veg/non-veg, image, tax info | Not in list |
| Item station | `orderDetails[].station` | KDS/BAR routing | Not in list |
| Customer phone | `user.phone` | Contact info | List only has `user_name` |
| Customer email | `user.email` | Contact info | Not in list |
| Table area title | `restaurantTable.title` | "Main Hall", "Garden" | List only has `table_name` |
| Vendor employee details | `vendorEmployee.f_name, l_name` | Full staff name | List has `waiter_name` (flat) |
| delivery_charge | `order.delivery_charge` | Delivery breakdown | List has no delivery_charge field |

### Fields MISSING from BOTH APIs

| Field | Impact | Status |
|---|---|---|
| **Discount breakdown** (manual vs coupon vs loyalty) | Detail sheet bundles discount into "Tax" line | `/order-logs-report` has `restaurant_discount_amount` but detail doesn't extract it |
| **Service charge amount** | Neither API surfaces this cleanly for the detail view | List has `service_tax` but detail computes Tax as remainder |
| **Tip amount** | List has `tip_amount`; detail doesn't read it | Detail bundles tip into Tax line |
| **Round-off amount** | Neither surfaces this | Bundled into Tax |
| **Coupon code/title** | Neither API surfaces this on the list; detail doesn't read it | `orderTransform.order` recently added these (BUG-111) but `singleOrderNew` transform doesn't |
| **Loyalty discount** | Same as coupon | Recently added to `orderTransform.order` but not to `singleOrderNew` |
| **merge_by_name** (order-level) | Backend pending (BE-1 PENDING) | No name for who merged |
| **cancel_by_name** (order-level) | Backend pending (BE-1 PENDING); item-level exists | Partial |

---

## 6. DETAIL SHEET BILL SUMMARY — The Tax Bundling Problem

The `OrderDetailSheet` footer shows:
```
Subtotal (N items)     ₹X   ← computed from orderDetails[].price sum
Delivery Charge        ₹Y   ← order.delivery_charge (BUG-039 fix)
Tax (GST)              ₹Z   ← DERIVED as: amount - subtotal - deliveryCharge
─────────────────────────────
Total                  ₹T   ← order.order_amount
```

**The Tax line is a remainder calculation**, not an actual tax value. This means:
- If the order has a **discount** → discount is subtracted from Tax, making Tax appear lower (or negative)
- If the order has a **tip** → tip is added to Tax, making Tax appear inflated
- If the order has **service charge** → SC is added to Tax
- If the order has **round-off** → round-off is bundled

**This is a known display inaccuracy.** The detail endpoint ships `order_amount` (grand total) and individual item prices, but does NOT ship the intermediate breakdown fields (discount, tip, SC, round-off) that would allow proper line-by-line rendering.

---

## 7. STATUS DERIVATION MISMATCH

The **list view** (inline in reportService.js) uses a 60-line priority chain:
```
Cancel → Merge → TAB → Hold (9/8/paylater) → transferToRoom → unpaid → paid (6) → running → audit (default)
```

The **detail view** (reportTransform.singleOrderNew) uses raw `order.order_status` from the backend:
```
status: order.order_status   ← whatever backend says
```

This means the status badge in the **row** can differ from the status badge in the **side sheet** for the same order. For example:
- A `paylater` + `f_order_status=6` order → row shows "Hold", detail shows "delivered" (or whatever `order_status` says)
- A `transferToRoom` + settled room → row shows "Paid" (via SRM cascade), detail shows whatever `order_status` says

---

## 8. RECOMMENDATIONS (Not Implementing — Investigation Only)

### Backend Asks (would eliminate round trips)

| Priority | Ask | Eliminates |
|---|---|---|
| **P0** | Add `is_parent_room_active` boolean per SRM row in `/order-logs-report` | The entire `getActiveSrmIds()` cascade (1+N calls) |
| **P1** | Include running orders in `/order-logs-report` (or add gap-detection metadata) | The `getRunningOrders()` call (1 call) |
| **P2** | Ship `discount_amount`, `service_charge_amount`, `tip_amount`, `round_off_amount`, `delivery_charge` as separate fields in `get-single-order-new` | The Tax bundling problem in detail sheet |
| **P2** | Ship `coupon_discount`, `coupon_code`, `loyalty_discount` in `get-single-order-new` | Missing discount breakdown |
| **P3** | Ship `order_in`, `razorpay_order_id`, `cancellation_reason` in `get-single-order-new` | Missing fields in detail view |

### Frontend Refactor (architectural debt)

| Priority | Refactor | Impact |
|---|---|---|
| **P1** | Extract inline transform from `getOrderLogsReport()` into `reportTransform.js` as `reportListFromAPI.orderLogsReport()` | Testable, reusable, follows codebase pattern |
| **P1** | Extract status derivation into a shared utility (`deriveOrderStatus(raw)`) | Single source of truth for status classification |
| **P2** | Remove/gate dev diagnostic logging (WATCH_ORDER_IDS, G5 snapshots, BE-1 invariant checks) behind a flag | Clean console in development |
| **P3** | Align detail sheet status derivation with list view derivation | Consistent badges across views |

---

## 9. CALL FLOW DIAGRAM

```
AllOrdersReportPage.fetchOrders()
│
├─── PARALLEL ──────────────────────────────────────────
│    │
│    ├── getActiveSrmIds()
│    │   ├── GET  /get-room-list                         (A1a)
│    │   └── POST /get-single-order-new × N rooms        (A1b) ← N = in-house rooms
│    │       └── returns Set<srmOrderId>
│    │
│    └── getRunningOrders()
│        └── GET  /employee-orders-list?role_name=Manager (A2)
│            └── returns running order list (for gap detection)
│
├─── SEQUENTIAL (after parallel completes) ─────────────
│    │
│    └── getOrderLogsReport(date, schedules, sortBy, activeSrmIds)
│        └── POST /order-logs-report                      (B1)
│            └── INLINE TRANSFORM (300 lines, L636-947):
│                ├── Extract orders_table fields
│                ├── Derive status (60-line priority chain)
│                ├── Normalize channel, platform, PG flag
│                ├── Compute display fields (prefix, table label, actioned by)
│                ├── Filter by business day
│                └── Dev diagnostics (80 lines)
│
├─── POST-PROCESSING (in fetchOrders, L260-359) ────────
│    ├── Filter room orders out of display list
│    ├── Build running orders lookup map
│    ├── Gap detection (missing order ID scan)
│    ├── Calculate tab counts per filter
│    └── Set state
│
└─── ON ROW CLICK ──────────────────────────────────────
     │
     └── OrderDetailSheet → getSingleOrderNew(order.id)
         └── POST /get-single-order-new                   (C1)
             └── reportFromAPI.singleOrderNew() transform
                 └── Returns rich item detail + timeline
```

**Total calls on page load:** 3 + N (where N = in-house rooms)
**Total calls on row click:** 1

---

**End of Investigation.**
