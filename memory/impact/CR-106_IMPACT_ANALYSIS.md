# CR-106 — Impact Analysis (Gate 2) — FINAL

**Document:** `impact/CR-106_IMPACT_ANALYSIS.md`
**Created:** 2026-07-25
**Last Updated:** 2026-07-25 (post real-data validation)
**Role:** PLANNING (Gate 2)
**Intake ref:** `change_requests/CR-106_AGGREGATOR_MODULE_INTAKE.md`
**Status:** FROZEN — Design validated with real API data. **Updated 2026-07-25b: 5 gaps incorporated from second API probe (4 orders: 3×status-1, 1×status-5).**

---

## Header Block (v0.7 mandatory)

| Field | Value |
|---|---|
| **Code Reality** | **PARTIAL** — socket scaffolding + source badges + report fetcher exist. No live handler/service/popup/transform. |
| **Conflict Pre-Check** | **LOW** — no active in-flight items on primary target files (see §2) |
| **Risk (v0.7)** | **HIGH** (touches sockets, order flow, dashboard rendering, new API integration, R5 hotspot files) |
| **Fast Lane eligible** | NO (multi-file, multi-layer, hotspot files) |
| **Rules invoked** | R5, R10, R11, R14, R17, R18, R21 |
| **Curl-probe status (R11)** | **COMPLETE** — `get-order-list` probed, 5+4 orders returned across 2 sessions, full response structure mapped + validated |
| **Real-data validation** | **COMPLETE (2 rounds)** — Round 1: 5 orders, 25/26 fields, 4 corrections. Round 2 (2026-07-25b): 4 orders (3×status-1 + 1×status-5), 5 new gaps found + incorporated. |
| **Design docs** | `cr105-design-flow.html` (flow + mockups), `cr105-validation.html` (real data) |

---

## §1 — Code Reality Check

### What already exists ✅

| Layer | File | Evidence | Status |
|---|---|---|---|
| Socket channel generator | `socketEvents.js:43` | `getAggregatorChannel(rid)` → `aggregator_order_${rid}` | ✅ Ready |
| Socket event constants | `socketEvents.js:105-109` | `AGGRIGATOR_ORDER`, `AGGRIGATOR_ORDER_UPDATE` | ✅ Ready |
| Event routing category | `socketEvents.js:148-151` | `EVENTS_REQUIRING_AGGREGATOR_API` array | ✅ Ready |
| Channel import | `socket/index.js:22` | `getAggregatorChannel` imported | ✅ Imported, not subscribed |
| Source badge rendering | `OrderCard.jsx:349-364` | S (swiggy orange), Z (zomato red) badges when `source !== 'own'` | ✅ Ready |
| Source colors | `constants/colors.js:25-29` | `SOURCE_COLORS.swiggy: "#FC8019"`, `.zomato: "#E23744"` | ✅ Ready |
| Order normaliser | `orderTransform.js:52-57` | `normaliseOrderFrom()` passes `'aggregator'` verbatim | ✅ Ready |
| Report aggregator fetch | `reportService.js:204` | `getAggregatorOrders()` (UrbanPiper) | ✅ Ready (different scope — reports) |
| Notification tone | `NotificationContext.jsx:15` | `swiggy_new_order` inferred from notification text | ✅ Ready |
| Sound file | `public/sounds/swiggy_new_order.wav` | Physical file exists | ✅ Ready |
| Web order popup | `ScanOrderPopOut.jsx` (649 lines) | Pattern to clone for aggregator | ✅ Reference |

### What is genuinely missing ❌

| # | Missing | Type | Complexity |
|---|---|---|---|
| 1 | Aggregator socket subscription in `useSocketEvents.js` | WIRE | LOW |
| 2 | Aggregator socket handler functions in `socketHandlers.js` | NEW CODE | MEDIUM |
| 3 | `aggregatorService.js` — API service (accept/reject/ready/dispatch/list) | NEW FILE | MEDIUM |
| 4 | `aggregatorTransform.js` — normalize nested API structure → FE order model | NEW FILE | MEDIUM |
| 5 | `AggregatorOrderPopOut.jsx` — mandatory popup with prep-time + actions | NEW FILE | HIGH |
| 6 | `AggregatorRejectModal.jsx` — cancel reason picker | NEW FILE | LOW |
| 7 | `AggregatorDispatchModal.jsx` — rider name + phone input | NEW FILE | LOW |
| 8 | `f_order_status=0` mapping in `constants.js` | CHANGE | LOW |
| 9 | Aggregator action buttons on OrderCard + TableCard (Ready/Dispatch after accept) | CHANGE | MEDIUM |
| 10 | DashboardPage wire AggregatorOrderPopOut + handlers | CHANGE | MEDIUM |

---

## §2 — Conflict Pre-Check (R16)

| Target file | Last modifier | In-flight items? | Risk |
|---|---|---|---|
| `useSocketEvents.js` | BUG-167 (2026-07) | **BUG-167** (QA PASS — awaiting smoke, diff scope: menu socket persistence) | **LOW** — BUG-167 moved socket to AppSocketManager, we ADD a new channel subscription |
| `socketHandlers.js` | BUG-116 (2026-06) | None active | LOW |
| `OrderCard.jsx` | CR-098/CR-099 (2026-07) | None active | LOW |
| `TableCard.jsx` | — | None active | LOW |
| `DashboardPage.jsx` | CR-056 (2026-07) | **BUG-167** (non-overlapping scope) | LOW |
| `constants.js` | CR-062 (2026-06) | None active | LOW |
| `OrderContext.jsx` | — | None active | ZERO — we use existing `addOrder`/`updateOrder` |
| `api/socket/index.js` | — | None active | ZERO — import only, no logic change |

**Conflict verdict:** No hard conflicts. All target files are clear or have non-overlapping in-flight items.

---

## §3 — Data Flow Trace

### A. Regular Order Flow (existing — reference)

```
Socket: new_order_${rid} → [event, orderId, rid, status, payload]
  ↓
useSocketEvents.js → handleOrderChannelEvent → switch(eventName)
  ↓
socketHandlers.js → handleNewOrder(args, context)
  ↓
orderTransform.js → fromAPI.singleOrder(api) → flat FE order model
  ↓
OrderContext.addOrder(order) → orders[] state
  ↓
DashboardPage.jsx → useOrders().deliveryOrders → delivery channel grid
  ↓
OrderCard.jsx / TableCard.jsx → renders order with status badges, source badge, action buttons
```

### B. Aggregator Order Flow (NEW — to be built)

```
Socket: aggregator_order_${rid} → [event, orderId, rid, status?, full_payload]
  ↓
useSocketEvents.js → handleAggregatorChannelEvent → switch(eventName)
  ↓                                                   ├─ 'aggrigator-order' → handleAggregatorNewOrder
  ↓                                                   └─ 'aggrigator-order-update' → handleAggregatorOrderUpdate
  ↓
aggregatorTransform.js → fromAPI.aggregatorOrder(nested) → flat FE order model
  (maps order_details_order, order_details_food, customer_details, rider_info)
  (sets: source = order_plateform, isAggregator = true, orderType = 'delivery')
  ↓
OrderContext.addOrder(order) / updateOrder(orderId, order) → orders[] state
  ↓
DashboardPage.jsx → useOrders().deliveryOrders → delivery channel grid
  ├─ AggregatorOrderPopOut: triggers when isAggregator && (fOrderStatus === 0 || fOrderStatus === 7)
  └─ OrderCard.jsx / TableCard.jsx → source badge (S/Z) + aggregator action buttons (Ready/Dispatch)
```

### C. Aggregator Status Update API Flow

```
User action in popup/card → aggregatorService.updateOrderStatus(payload)
  ↓
POST /api/v1/urbanpiper/orders-status-update
  { order_id, urban_order_id, new_status, message, extra?, reason_code? }
  ↓
Backend processes → emits socket event on aggregator_order_${rid}
  ↓
Socket handler → updateOrder in OrderContext → UI auto-updates
```

---

## §4 — Detailed Impact Per File

### 4.1 NEW FILES (5)

#### `api/services/aggregatorService.js`
- **Purpose:** API calls for aggregator order lifecycle
- **Functions:**
  - `getAggregatorOrderList()` — GET `/api/v1/vendoremployee/urbanpiper/get-order-list`
  - `updateAggregatorOrderStatus({ order_id, urban_order_id, new_status, message, extra?, reason_code? })` — POST `/api/v1/urbanpiper/orders-status-update`
- **Dependencies:** `api` (axios instance), auth token from session
- **Risk:** LOW — new file, no side effects on existing code

#### `api/transforms/aggregatorTransform.js`
- **Purpose:** Normalize nested aggregator API response → flat FE order model
- **Input shape:** `{ order_details_order: {...}, order_details_food: [...], customer_details: {...}, rider_info: {...} }`
- **Output shape:** Same as `orderTransform.fromAPI.singleOrder()` — compatible with `OrderContext.addOrder()`
- **Key field mappings (VALIDATED against real data 2026-07-25):**

| API (nested) | FE (flat) | Real Value (Order #002327) | Validated |
|---|---|---|---|
| `order_details_order.id` | `orderId` | `40458` | ✅ |
| `order_details_order.urban_order_id` | `urbanOrderId` | `"2698317"` | ✅ |
| `order_details_order.f_order_status` | `fOrderStatus` | `1` | ✅ |
| `order_details_order.order_plateform` | `source` | `"swiggy"` (NOTE: misspelled "plateform") | ✅ |
| `order_details_order.order_type` | `orderType` | `"delivery"` | ✅ |
| `order_details_order.order_amount` | `amount` | `126` | ✅ |
| `order_details_order.item_total` | `itemTotal` | `120` | ✅ |
| `order_details_order.total_tax_amount` | `taxAmount` | `6` | ✅ |
| `order_details_order.delivery_charge` | `deliveryCharge` | `0` | ✅ |
| `order_details_order.payment_method` | `paymentMethod` | `"aggregator"` | ✅ |
| `order_details_order.payment_status` | `paymentType` | `"unpaid"` | ✅ |
| `order_details_order.order_note` **OR** `order_details_food[0].food_details.order_note` | `orderNote` | **⚠️ GAP-1 CORRECTED:** `order_details_order.order_note` = NULL on all probed orders. Actual note lives at `food_details.order_note` = `"order level note"`. Transform must check both (fallback chain). | ⚠️ |
| `order_details_order.created_at` | `createdAt` | `"2026-07-13 14:13:29"` | ✅ |
| `order_details_order.restaurant_order_id` | `orderNumber` | `"478/002327"` | ✅ |
| `order_details_order.restaurant_id` | `restaurantId` | `478` | ✅ |
| `order_details_order.prep_time_mins` | `prepTimeMins` | `null` | ✅ |
| `order_details_order.rider_name` | `riderName` | `null` | ✅ |
| `order_details_order.rider_phone_number` | `riderPhone` | `null` | ✅ |
| `order_details_order.otp` | `deliveryOtp` | `"2615"` | ✅ |
| `order_details_food[*].food_details.title` | `items[*].name` | `"Cut Dosa"` | ✅ **CORRECTED: was `.name`, real field is `.title`** |
| `order_details_food[*].food_details.category.name` | `items[*].categoryName` | `"Dosa"` | ✅ bonus |
| `order_details_food[*].quantity` | `items[*].quantity` | `1` | ✅ |
| `order_details_food[*].unit_price` | `items[*].unitPrice` | `"120.00"` | ✅ |
| `order_details_food[*].gst` | `items[*].tax` | `6` | ✅ |
| `order_details_food[*].food_level_notes` | `items[*].notes` | `null` | ✅ field confirmed |
| `order_details_food[*].add_ons` | `items[*].addOns` | `[]` | ✅ |
| `order_details_food[*].variation` | `items[*].variation` | `null` | ✅ |
| `order_details_food[*].food_details.image_url` | `items[*].imageUrl` | S3 URL | ✅ bonus |
| `customer_details.name` | `customerName` | `"SWIGGY"` (masked) | ✅ |
| `customer_details.phone` | `phone` | `"+919999999992"` (masked) | ✅ |
| `customer_details.address` | `deliveryAddress` | `{ line_1: "Bangalore", city: "Bangalore" }` | ✅ |
| `rider_info` | `riderInfo` | `{ id: null, name: null, Phone: null }` — **⚠️ GAP-3:** Keys use inconsistent casing: `Phone` (capital P), `Cahnel` (misspelled "Channel"). Also includes `order_return_otp`, `bag_return_otp`. Some orders return `{}`, others return full null-valued object. Transform must handle both shapes. | ⚠️ |
| `order_details_order.coupon_code` | `couponCode` | **GAP-2 (NEW):** `"10% off"` — present on all probed orders. Needed to explain total breakdown to staff. | ⚠️ NEW |
| `order_details_order.coupon_discount_amount` | `couponDiscount` | **GAP-2 (NEW):** `19` — formula: `order_amount = item_total - coupon_discount + tax` (190 − 19 + 8.55 = 179.55) | ⚠️ NEW |
| `order_details_order.discount_on_product_by` | `discountBy` | **GAP-2 (NEW):** `"vendor"` — who funded the discount | ⚠️ NEW |
| `order_details_food[*].discount_on_food` | `items[*].discount` | **GAP-2 (NEW):** `19` — per-item discount amount | ⚠️ NEW |
| `order_details_order.schedule_at` | `scheduledAt` | **GAP-5 (NEW):** `"2026-07-16 12:37:10"` — aggregator orders can be scheduled. Show "Scheduled for X" in popup if future. | ⚠️ NEW |
| — | `isAggregator` | **NEW derived field** = `true` | — |
| — | `orderFrom` | Set to `'aggregator'` | — |
| — | `isWebOrder` | Set to `false` (prevents ScanOrderPopOut from triggering) | — |

- **Risk:** LOW — new file, uses same output shape as existing orders

#### `components/dashboard/AggregatorOrderPopOut.jsx`
- **Purpose:** Mandatory popup for incoming aggregator orders
- **Pattern:** Clones `ScanOrderPopOut.jsx` structure with modifications:
  - **Size:** SAME as `ScanOrderPopOut` — desktop ≥50% viewport centered, tablet full-screen
  - **Predicate:** `isAggregator === true && (fOrderStatus === 0 || fOrderStatus === 7)` (vs web popup: `isWebOrder && fOrderStatus === 7`)
  - **Header:** Shows aggregator source badge (Swiggy orange `#FC8019` / Zomato red `#E23744`) with "S" or "Z" letter badge
  - **Body:** Order number, OTP, type, total, tax, **coupon discount line (GAP-2: show coupon_code + coupon_discount_amount so staff understands total breakdown)**, customer (masked), delivery address, order note **(GAP-1: read from `food_details.order_note` first, fallback to `order_details_order.order_note`)**, scheduled time **(GAP-5: show if `schedule_at` is future)**, item list with category + notes (conditional)
  - **Prep time picker:** Pill presets (5/10/15/20/25/30) + manual input field — user MUST select before accepting
  - **Actions:** **Reject + Accept ONLY** (no View button — all data visible in popup)
  - **Blocking:** App unusable until all orders in queue are actioned
  - **Queue:** Sequential with Prev/Next navigation, "Order N of M" indicator
  - **Sound:** Server-side FCM handles tone; popup is visual-only
- **Props** (from DashboardPage):
  - `orders` — full order list (from useOrders)
  - `onAccept(order, prepTimeMins)` — calls aggregatorService with "Acknowledged"
  - `onReject(order)` — opens AggregatorRejectModal
  - `currencySymbol`
- **Risk:** MEDIUM — new file but complex UI; must not interfere with ScanOrderPopOut

#### `components/modals/AggregatorRejectModal.jsx`
- **Purpose:** Cancel reason picker for rejecting aggregator orders
- **UI:** Modal with dropdown of 11 cancel reasons + optional message field
- **Cancel reasons (SAME for both Swiggy & Zomato — UrbanPiper abstracts both):**
  ```
  ITEM_OUT_OF_STOCK, STORE_CLOSED, STORE_BUSY, RIDER_NOT_AVAILABLE,
  OUT_OF_DELIVERY_RADIUS, CONNECTIVITY_ISSUE, TOTAL_MISSMATCH,
  INVALID_ITEM, OPTION_OUT_OF_STOCK, INVALID_OPTION, UNSPECIFIED
  ```
- **On confirm:** Calls `aggregatorService.updateOrderStatus` with `new_status: "Cancelled"` + selected `reason_code`
- **Risk:** LOW — isolated modal, no side effects

#### `components/modals/AggregatorDispatchModal.jsx`
- **Purpose:** Rider name + phone input for dispatching aggregator orders
- **UI:** Simple form with rider name (text) + phone number (text/tel) + confirm button
- **On confirm:** Calls `aggregatorService.updateOrderStatus` with `new_status: "Dispatched"` + `extra: { rider_name, rider_phone_number }`
- **Risk:** LOW — isolated modal, no side effects

### 4.2 MODIFIED FILES (6)

#### `api/constants.js` — Add f_order_status=0 + new endpoints
- **Change 1:** Add `0: 'aggregatorNew'` to `F_ORDER_STATUS`
- **Change 2:** Add aggregator endpoints to `API_ENDPOINTS`:
  ```
  AGGREGATOR_ORDER_LIST: '/api/v1/vendoremployee/urbanpiper/get-order-list',
  AGGREGATOR_ORDER_STATUS: '/api/v1/urbanpiper/orders-status-update',
  ```
- **Risk:** LOW — additive changes only

#### `api/socket/useSocketEvents.js` — Subscribe to aggregator channel
- **Change:** Add `getAggregatorChannel` subscription in the `useEffect` block
- **Pattern:** Identical to existing channel subscriptions (order, table, food-update)
- **New handler callback:** `handleAggregatorChannelEvent`
- **Risk:** LOW — additive

#### `api/socket/socketHandlers.js` — Add aggregator handlers
- **New functions:**
  - `handleAggregatorNewOrder(message, context)` — full payload from socket → transform → `addOrder()`
  - `handleAggregatorOrderUpdate(message, context)` — full payload from socket → transform → `updateOrder()` or `removeOrder()` for terminal statuses
- **Socket carries full payload (owner confirmed)** — no separate API fetch needed
- **Risk:** MEDIUM — new handler functions but follows existing handler pattern exactly

#### `pages/DashboardPage.jsx` (R5 HOTSPOT)
- **Changes:** Import + mount `AggregatorOrderPopOut` + `AggregatorRejectModal` + `AggregatorDispatchModal`. Add aggregator accept/reject/dispatch handlers. Block card click for aggregator orders (read-only).
- **Scope lock:** ONLY adds new components + handlers. Does NOT change existing ScanOrderPopOut, channel data, grid rendering, or any existing handler.
- **Risk:** MEDIUM — R5 hotspot but changes are purely additive

#### `components/cards/OrderCard.jsx` (R5 HOTSPOT) — Order/List View
- **Change 1:** Aggregator lifecycle action buttons (Ready → calls "Food Ready" API, Dispatch → opens modal)
- **Change 2:** Hide POS-specific buttons for aggregator orders (Cancel, Settle Bill) — payment handled externally
- **Change 3:** Card body click = no-op for aggregator orders (read-only)
- **Change 4:** Rider timeline section (No Rider → Assigned → On the Way → Arrived with waiting timer). **GAP-4: Default to "No Rider" even on dispatched orders — rider data may only arrive via socket push, not in order list API. Tested: status-5 order has all rider fields NULL.**
- **S/Z badge already works** at line 349-364 — no change needed
- **Risk:** MEDIUM — R5 hotspot but changes are conditional (gated by `isAggregator`)

#### `components/cards/TableCard.jsx` — Table/Grid View
- **Change 1:** Aggregator lifecycle action buttons (compact: Ready/Dispatch)
- **Change 2:** Hide POS buttons for aggregator (read-only)
- **Change 3:** Card click = no-op for aggregator orders
- **Change 4:** Compact rider status pill (no full timeline — space too small)
- **Risk:** LOW

---

## §5 — Owner Decisions (ALL LOCKED)

| # | Decision | Owner Answer | Impact |
|---|---|---|---|
| OD-1 | Where do aggregator orders appear? | **Merged into same dashboard, under Delivery channel** | Auto via `orderType='delivery'` |
| OD-2 | Popup trigger | **Both f_order_status=0 AND 7 trigger popup for aggregator orders** | Predicate: `isAggregator && (status === 0 \|\| status === 7)` |
| OD-3 | Dispatch rider info | **Yes — rider_name + phone required in dispatch UI** | AggregatorDispatchModal |
| OD-4 | Prep time UX | **Pill presets (5/10/15/20/25/30) + manual input** | In popup, must select before accept |
| OD-5 | Sound/notification | **Yes — distinct ringer. Server-side FCM. `swiggy_new_order.wav` exists** | Zero FE sound code changes |
| OD-6 | Popup actions | **Reject + Accept ONLY. No View button** (all data visible in popup) | Simplified popup |
| OD-7 | Popup size | **Same as ScanOrderPopOut** | Clone dimensions |
| OD-8 | Cancellation | **Identical for both Swiggy & Zomato** (UrbanPiper abstracts) | Single reject modal, 11 reasons |
| OD-9 | Customer data | **Masked by UrbanPiper**. Display as-is. | No FE masking logic |
| OD-10 | Edit orders | **NO EDIT. Read-only. Card click = no-op** | Block OrderEntry open for aggregator |
| OD-11 | Dashboard views | **2 views: TableCard (grid) + OrderCard (list)**. NOT 3. | TableCard + OrderCard only |
| OD-12 | Rider timeline | **4 stages: No Rider → Assigned → On the Way → Arrived (with red waiting timer)** | New rider timeline component |
| OD-13 | Rider data via socket | **Yes — all rider lifecycle data comes via socket. No polling.** | Socket = single source of truth |
| OD-14 | Print KOT | **Yes — after accept** | Print button stays visible |

---

## §6 — Resolved Questions (ALL CLOSED)

| # | Question | Answer |
|---|---|---|
| OQ-1 | API pagination | Get-order-list returns all active orders, no pagination |
| OQ-2 | Socket payload | **Full payload** — no separate API fetch |
| OQ-3 | Print KOT | **Yes** — after accept |
| OQ-4 | Sound/ringer | **Server-side FCM** — `swiggy_new_order.wav` exists |

---

## §7 — Real Data Validation Corrections

Corrections discovered during real-data validation with 5 live orders from 18march (restaurant_id 478):

| # | Correction | Before | After | Severity |
|---|---|---|---|---|
| C-1 | **Item name field** | `food_details.name` | **`food_details.title`** = "Cut Dosa", "Double Chicken Keema Roll" | HIGH — transform must use correct field |
| C-2 | **Dashboard views** | 3 card types (TableCard + OrderCard + DeliveryCard) | **2 card types (TableCard + OrderCard)** — DeliveryCard is NOT a separate user-facing view | MEDIUM — scope reduction |
| C-3 | **Item category** | Not mapped | **`food_details.category.name`** = "Dosa", "Non-veg Roll" — bonus field, show in popup | LOW |
| C-4 | **Item image** | Not mapped | **`food_details.image_url`** = S3 URL — available but not required for MVP | LOW |

### Round 2 Gaps (discovered 2026-07-25, second API probe with 4 orders: 3×status-1, 1×status-5)

| # | Gap | Detail | Severity | Action |
|---|---|---|---|---|
| GAP-1 | **Order note location** | `order_details_order.order_note` = NULL on all 4 orders. Actual note at `order_details_food[0].food_details.order_note` = `"order level note"`. | **MEDIUM** | Transform reads from `food_details.order_note` first, falls back to `order_details_order.order_note` |
| GAP-2 | **Discount/coupon data not mapped** | All orders have `coupon_code: "10% off"`, `coupon_discount_amount: 19`. Formula: `order_amount = item_total − coupon_discount + tax` (190 − 19 + 8.55 = 179.55). Food-level: `discount_on_food: 19`. Staff will see confusing totals without discount context. | **MEDIUM** | Map `couponCode`, `couponDiscount`, `discountBy` in transform. Display discount line in popup total breakdown. |
| GAP-3 | **`rider_info` key casing inconsistent** | API returns `Phone` (capital P), `Cahnel` (misspelled "Channel"). Some orders return `{}`, others `{id: null, name: null, Phone: null, Cahnel: null, order_return_otp: null, bag_return_otp: null}`. | **LOW** | Transform must handle both empty and full shapes. Use `rider_info.Phone` (not `.phone`). |
| GAP-4 | **Dispatched order has NO rider data** | Order #478/002362 at status 5 — `rider_name`, `rider_phone_number`, `rider_info.*` ALL null. Rider data likely only arrives via socket push, not in order list API. | **LOW** | Rider timeline defaults to "No Rider" state. Timeline only populates when socket delivers rider updates. Graceful handling required. |
| GAP-5 | **`schedule_at` field present** | `schedule_at: "2026-07-16 12:37:10"` — aggregator orders can be scheduled for future prep. Not mapped. | **LOW** | Map `scheduledAt` in transform. Show "Scheduled for X" in popup if in the future. Defer for MVP if needed. |

---

## §8 — Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | `f_order_status=0` not returned by regular order API → could confuse non-aggregator flows | LOW | MEDIUM | Gate all status-0 logic behind `isAggregator` check |
| R2 | AggregatorOrderPopOut + ScanOrderPopOut both open simultaneously | LOW | HIGH | Predicates are mutually exclusive: `isWebOrder` vs `isAggregator` |
| R3 | Aggregator order transform mismatches regular order shape → breaks OrderCard | MEDIUM | HIGH | Test with all 5 probed orders; ensure all OrderCard-consumed fields present |
| R4 | Socket event payload shape differs from API `get-order-list` shape | LOW | MEDIUM | Confirm via live socket testing; owner says full payload |
| R5 | `food_details.title` used incorrectly as `.name` | RESOLVED | — | Corrected in C-1 above |
| R6 | **Order note read from wrong location** (GAP-1) | HIGH | MEDIUM | Transform uses fallback chain: `food_details.order_note` → `order_details_order.order_note` |
| R7 | **Confusing totals without discount context** (GAP-2) | HIGH | MEDIUM | Map coupon fields; show discount line in popup breakdown |
| R8 | **`rider_info` key casing crash** (GAP-3) | MEDIUM | LOW | Defensive access: `rider_info?.Phone` with fallback to `rider_info?.phone` |
| R9 | **Rider timeline shows empty on dispatched orders** (GAP-4) | MEDIUM | LOW | Default "No Rider" state; timeline populates only from socket push |

---

## §9 — Implementation Sequence (Preview for Gate 3)

```
Phase 1: Foundation (no UI)
  1. constants.js — f_order_status=0 + endpoints
  2. aggregatorTransform.js — normalize nested → flat (use food_details.title! + GAP-1 order_note fallback + GAP-2 coupon fields + GAP-3 rider_info casing + GAP-5 schedule_at)
  3. aggregatorService.js — API calls
  4. socketHandlers.js — aggregator handlers
  5. useSocketEvents.js — aggregator channel subscription

Phase 2: UI Components (independent)
  6. AggregatorRejectModal.jsx
  7. AggregatorDispatchModal.jsx
  8. AggregatorOrderPopOut.jsx (same size as ScanOrderPopOut, Reject+Accept only)

Phase 3: Integration (depends on Phase 1+2)
  9. DashboardPage.jsx — wire popup + handlers + block card click for aggregator
  10. OrderCard.jsx — aggregator action buttons + rider timeline + read-only
  11. TableCard.jsx — aggregator action buttons + compact rider pill + read-only

Phase 4: Polish
  12. orderOrigin.js — aggregator origin helper
  13. PlatformDropdown.jsx — Swiggy/Zomato filter options
```

---

## §10 — Verification Matrix (seeds QA)

| # | File | Change | How to Verify |
|---|---|---|---|
| V1 | constants.js | f_order_status=0 mapping | Status lookup returns 'aggregatorNew' |
| V2 | aggregatorTransform.js | Nested → flat, `food_details.title` | Input real JSON → validate all output fields including item name |
| V3 | aggregatorService.js | API calls | Curl: accept/reject/ready/dispatch with test orders |
| V4 | useSocketEvents.js | Aggregator channel subscription | Console log confirms subscription |
| V5 | socketHandlers.js | Aggregator handlers | Mock socket event → verify addOrder/updateOrder called |
| V6 | AggregatorOrderPopOut.jsx | Popup appears for f_order_status=0 | Popup blocks UI, shows order data |
| V7 | AggregatorOrderPopOut.jsx | Prep time pills + accept | Select pill → accept → verify API payload has prep_time_mins |
| V8 | AggregatorRejectModal.jsx | Cancel reason | Reject → pick reason → verify API payload has reason_code |
| V9 | AggregatorDispatchModal.jsx | Rider info | Dispatch → enter rider → verify API payload has rider fields |
| V10 | DashboardPage.jsx | Popup wired + no conflict with ScanOrderPopOut | Web orders still use web popup |
| V11 | OrderCard.jsx | Ready/Dispatch buttons for aggregator | Accepted aggregator order shows Ready button |
| V12 | OrderCard.jsx | Source badge S/Z | Swiggy order shows orange S badge |
| V13 | OrderCard.jsx | Print KOT for aggregator | Click Print → KOT prints |
| V14 | OrderCard.jsx | Card click = no-op for aggregator | Click card body → nothing opens |
| V15 | OrderCard.jsx | Rider timeline 4 stages | Verify timeline renders per rider state |
| V16 | TableCard.jsx | S/Z badge + action buttons | Swiggy grid card shows S badge + Ready/Dispatch |
| V17 | TableCard.jsx | Card click = no-op for aggregator | Click card → nothing opens |

---

## §11 — Blast Radius (FINAL)

### Files WILL change (10: 5 new + 5 modified)

| # | File | Type | Risk |
|---|---|---|---|
| 1 | `api/constants.js` | MODIFY — add endpoints + status 0 | LOW |
| 2 | `api/services/aggregatorService.js` | **NEW** | LOW |
| 3 | `api/transforms/aggregatorTransform.js` | **NEW** | MEDIUM |
| 4 | `api/socket/useSocketEvents.js` | MODIFY — add channel subscription | LOW |
| 5 | `api/socket/socketHandlers.js` | MODIFY — add handler functions | MEDIUM |
| 6 | `components/dashboard/AggregatorOrderPopOut.jsx` | **NEW** | HIGH |
| 7 | `components/modals/AggregatorRejectModal.jsx` | **NEW** | LOW |
| 8 | `components/modals/AggregatorDispatchModal.jsx` | **NEW** | LOW |
| 9 | `pages/DashboardPage.jsx` (R5 hotspot) | MODIFY — wire popup + handlers | MEDIUM |
| 10 | `components/cards/OrderCard.jsx` (R5 hotspot) | MODIFY — aggregator actions + rider timeline | MEDIUM |
| 11 | `components/cards/TableCard.jsx` | MODIFY — aggregator actions + compact rider | LOW |

### Files WILL NOT touch

- `ScanOrderPopOut.jsx` (web popup stays untouched)
- `CollectPaymentPanel.jsx` (aggregator payment handled externally)
- `orderTransform.js` (regular orders unchanged; aggregator gets own transform)
- Report modules (`getAggregatorOrders()` stays as-is)
- Settlement/financial logic
- Auth/permissions
- NotificationContext (sound already handled server-side)

---

## Handover

```
IMPACT ANALYSIS COMPLETE + DESIGN FROZEN for CR-106.
Updated 2026-07-25b: 5 gaps incorporated (GAP-1 order note location, GAP-2 discount/coupon, GAP-3 rider_info casing, GAP-4 rider data null on dispatched, GAP-5 schedule_at).
Code reality: PARTIAL (scaffolding exists, live handler/service/popup missing).
Conflict pre-check: LOW (no active conflicts on target files).
Risk: HIGH (R5 hotspots DashboardPage + OrderCard, socket wiring, new API). 9 risks registered (R1-R9).
Files WILL change: 11 (5 new + 6 modified).
Files WILL NOT touch: ScanOrderPopOut, CollectPaymentPanel, orderTransform.js, settlement, auth.
Owner decisions: ALL 14 locked. All OQs resolved. 4 corrections + 5 gaps applied from real-data validation.
Verification matrix: 17 checks.
Design docs: cr105-design-flow.html + cr105-validation.html
Next: Gate 3 (Implementation Plan) — exact edits per file with line numbers.
```
