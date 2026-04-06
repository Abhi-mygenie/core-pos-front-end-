# POS Frontend - Bug Tracker & Audit Document

**Last Updated:** Feb 2026

---

## NOTE-200: `addOrder` Console Log Appears Twice on New Order (React StrictMode)

**Status:** NO ACTION NEEDED (Dev-only artifact)
**Priority:** P3 (Informational)
**Reported:** April 5, 2026

### Symptom
After placing a new order, `[OrderContext] addOrder: Adding new order 730305` appears **twice** in the console.

### Root Cause
**React StrictMode** (development mode only). React 18+ intentionally double-invokes state updater functions to detect impure logic. The `console.log` inside `setOrdersState(prev => { ... })` in `OrderContext.jsx` runs twice, but the second run is discarded — state is only updated once.

### Evidence
- `[Socket] Event received` — logs **once** (server sends event once)
- `[useSocketEvents] Order channel event` — logs **once** (listener registered once)
- `[SocketHandler] new-order received` — logs **once** (handler called once)
- `[SocketHandler] new-order: Added order` — logs **once** (loop runs once)
- `[OrderContext] addOrder: Adding new order` — logs **twice** (inside state updater → StrictMode double-invoke)

Every log outside a state updater appears once. Only the log inside the state updater appears twice.

### Action
- No code change needed
- **Must verify in production** — this double-log should NOT appear in production builds (StrictMode is dev-only)
- If it still appears in production, the investigation should shift to duplicate socket listener registration

---

## BUG-201: Duplicate `get-single-order-new` API Calls on Update Order

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 4, 2026
**Fixed:** April 5, 2026
**Verified:** April 5, 2026 (User console logs confirmed 1 API call)

### Root Cause
Both `OrderEntry.jsx` and `socketHandlers.js` called `fetchSingleOrderForSocket()` after update order.

### Fix Applied
1. Removed `fetchSingleOrderForSocket` from `handlePlaceOrder` update path in `OrderEntry.jsx`
2. Added optimistic local marking (items set to `placed: true`)
3. Expanded `useEffect` to sync from `OrderContext` on any financial change
4. Socket handler remains the only caller of `fetchSingleOrderForSocket`

### Verified Console Flow (Update Order)
```
update-order socket → handleUpdateOrder → fetchSingleOrderForSocket (1 call only)
    → OrderContext.updateOrder → useEffect sync → cartItems + financials updated
```

---

## BUG-202: Duplicate `get-single-order-new` API Calls on Cancel Item

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 4, 2026
**Fixed:** April 5, 2026
**Verified:** April 5, 2026 (User console logs confirmed 1 API call, `[CancelFood] Waiting for socket sync`)

### Root Cause
`handleCancelFood` in `OrderEntry.jsx` called `fetchSingleOrderForSocket` directly after cancel API success.

### Fix Applied
1. Removed `fetchSingleOrderForSocket` from `handleCancelFood`
2. Socket `update-order-status` handler fetches and updates OrderContext
3. `useEffect` syncs cartItems + financials from context
4. `fetchSingleOrderForSocket` import fully removed from `OrderEntry.jsx`

---

## BUG-203: Redundant `update-table` Socket Event Handling

**Status:** FIXED ✅
**Priority:** P1
**Reported:** April 4, 2026
**Fixed:** April 5, 2026
**Verified:** April 5, 2026 (Console shows no `update-table` events, table status derived from order data)

### Root Cause
Server emits on 2 channels for every order action. `update-table` on table channel was redundant — order data already has `table_id` and `f_order_status`.

### Fix Applied
1. Removed table channel subscription from `useSocketEvents.js`
2. Added `syncTableStatus()` helper in `socketHandlers.js`
3. All order handlers now derive and update table status from order data
4. Single source of truth: OrderContext → table status derived from order

### Backend Team Note
Server still emits `update-table` on `update_table_{restaurantId}` channel — we just don't subscribe to it anymore. Questions documented in API_MAPPING_AUDIT.md Section 8.

---

## BUG-204: `order_sub_total_without_tax` Returns 0 from Backend API

**Status:** BLOCKED (Backend team required)
**Priority:** P1
**Reported:** April 4, 2026

### Symptom
`get-single-order-new` API always returns `order_sub_total_without_tax: 0`. Frontend uses `order_sub_total_amount` as fallback.

### Action Required
Backend team must fix. Documented for handover.

---

## BUG-205: Cancel Complete Order — Race Condition (Order Re-added)

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 5, 2026
**Fixed:** April 5, 2026
**Verified:** April 5, 2026 (Console: `Order 730308 already removed (full cancel), skipping`)

### Root Cause
Old flow used per-item `PUT /food-status-update` loop (N API calls, N socket events). Socket arrived before HTTP response → handler found order still in context → re-added after `removeOrder`.

### Fix Applied
1. New endpoint: `PUT /order-status-update` (single call for full order cancel)
2. `removeOrder` + `updateTableStatus('available')` called BEFORE `api.put` (socket can't re-add)
3. Socket handler: `update-order-status` (status=3) → `getOrderById` → null → skip
4. Added `useTables` to `OrderEntry.jsx` for `updateTableStatus`
5. Fixed `tableId` type mismatch (string vs number in TableContext)

### Files Changed
- `constants.js` — Added `ORDER_STATUS_UPDATE`, `FOOD_STATUS_UPDATE`
- `orderTransform.js` — Added `toAPI.cancelOrder`, removed `cancelOrderItem`
- `OrderEntry.jsx` — `handleCancelOrder` → single API call, immediate remove
- `DashboardPage.jsx` — `handleCancelOrderConfirm` → same fix
- `socketHandlers.js` — `handleUpdateOrderStatus` → immediate skip for removed orders

---

## BUG-206: Partial Item Cancel Cancels All Items

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 5, 2026
**Fixed:** April 5, 2026

### Root Cause
Old endpoint `PUT /cancel-food-item` (v2) ignores `cancel_qty` — cancels all quantity regardless.

### Fix Applied
Switched to correct endpoint: `PUT /api/v1/vendoremployee/order/cancel-food-item`
- Handles both full and partial via `cancel_qty` field
- Full cancel = `cancel_qty: item.qty`
- Unified `cancelItem` transform replaces `cancelItemFull` + `cancelItemPartial`

### Endpoint Testing Results
| Endpoint | cancel_qty respected? |
|----------|----------------------|
| `v2 /partial-cancel-food-item` | NO — "Order item not found" error |
| `v2 /cancel-food-item` | NO — ignores cancel_qty, cancels all |
| `v1 /order/cancel-food-item` | **YES — works correctly** ✅ |

---

## BUG-207: Place Order Payload — Price Field & Addon Format

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 5, 2026
**Fixed:** April 6, 2026

### Symptoms Fixed
1. `price` field now sends unit price (correct — backend expects unit price, calculates total internally)
2. Addon format now uses nested arrays: `add_ons: [[id1, id2]]`, `add_on_qtys: [[qty1, qty2]]`
3. Endpoint migrated to `POST /api/v1/vendoremployee/order/place-order` with `multipart/form-data`
4. `buildCartItem` + `calcOrderTotals` helper functions implemented
5. All 4 flows updated: Place Order, Update Order, Place+Pay, Collect Bill (existing)

### Files Modified
- `orderTransform.js` — Added `buildCartItem()`, `calcOrderTotals()` helpers
- `OrderEntry.jsx` — Fixed FormData wrapping, corrected function/endpoint references

---

## Updated Endpoint Mapping (April 5, 2026)

| Action | Endpoint | Status |
|--------|----------|--------|
| Place New Order | `POST /api/v1/vendoremployee/order/place-order` (multipart/form-data) | Updated ✅ |
| Update Order | `PUT /api/v1/vendoremployee/order/update-place-order` (JSON) | Updated ✅ |
| Collect Bill (existing order) | `POST /api/v1/vendoremployee/order/place-order` (multipart/form-data, with order_id) | Updated ✅ |
| Place + Pay (new order) | `POST /api/v1/vendoremployee/order/place-order` (multipart/form-data, payment_status=paid) | Updated ✅ |
| Cancel Item (full/partial) | `PUT /api/v1/vendoremployee/order/cancel-food-item` | Working ✅ |
| Cancel Full Order | `PUT /api/v2/vendoremployee/order-status-update` | Working ✅ |
| Get Single Order | `POST /api/v2/vendoremployee/get-single-order-new` | Working ✅ |
| Food Status Update | `PUT /api/v2/vendoremployee/food-status-update` | Working ✅ |

---

## Socket Event → User Action (Verified April 5, 2026)

| Action | Socket Event | Status |
|--------|-------------|--------|
| Place New Order | `new-order` (with payload) | ✅ 0→1 API call (GET single order enrichment) |
| Update Order | `update-order` | ✅ 1 API call |
| Cancel Single Item | `update-order-status` (status=3) | ✅ 1 API call |
| Cancel Partial Item | `update-order-status` (status=3) | ✅ 1 API call |
| Cancel Full Order | `update-order-status` (status=3) | ✅ 0 API calls (skipped, already removed) |


---

## BUG-208: Socket orderDetails returns empty `variation` and `add_ons`

**Status:** FIXED ✅ (both addons and variations now returned by backend)
**Priority:** CLOSED
**Reported:** April 6, 2026
**Fixed:** April 6, 2026

### Resolution
Backend now returns both fields correctly:
- `variation`: `[{name: "Size", values: [{label: "Large", optionPrice: "40"}]}]`
- `add_ons`: `[{id: 10730, name: "lemon pepper Sprinkler", price: 15, quantity: 1}]`

### Frontend fixes applied:
- `fromAPI.orderItem` normalizes `price` to `unit_price` (BUG-209)
- PlacedItemRow + CollectPaymentPanel parse nested `variation[].values[].optionPrice`
- Display shows "Size: Large" format (handles both array and object `values`)

---

## BUG-209: Placed Item Prices Double-Multiplied

**Status:** FIXED ✅
**Priority:** P0
**Reported:** April 6, 2026
**Fixed:** April 6, 2026

### Symptom
Placed items showed ₹1,904 instead of ₹476 for qty=4. The socket `detail.price` returns the **total** line price (unit × qty), but display code multiplied by qty again.

### Root Cause
`fromAPI.orderItem()` mapped `detail.price` directly. Display then did `price × qty` = double multiplication.

### Fix Applied
`fromAPI.orderItem()` now normalizes `price` to use `unit_price` (per-unit base). Display formula `unit_price × qty` is correct.

### Files Changed
- `orderTransform.js` — `fromAPI.orderItem()`: `price: parseFloat(detail.unit_price) || detail.food_details?.price || 0`

---

## BUG-210: No table engage check before placing order (MULTI-DEVICE RACE CONDITION)

**Status:** OPEN — CRITICAL
**Priority:** P0 CRITICAL
**Reported:** April 6, 2026

### Problem
When user clicks "Place Order", there is no pre-check to verify the table is free on the server. On multi-device setups, two users can place orders on the same table simultaneously.

### Required Fix
Before calling place-order API:
1. Call `GET /api/v1/vendoremployee/all-table-list`
2. Find table by ID → check `engage` field
3. If `engage === "Yes"` → toast "Table already occupied" → redirect to dashboard
4. If `engage === "No"` → proceed with place order

### API Reference
**Endpoint:** `GET /api/v1/vendoremployee/all-table-list`
**Response:** Array of tables, each with `engage: "Yes"` or `"No"`
```json
{"id": 4252, "table_no": "1", "engage": "Yes", "rtype": "TB"}
```
**Note:** No single-table endpoint available — must filter from full list.

### Impact
Two orders on same table → billing confusion, order conflicts, data corruption.

---

## BUG-211: Backend does NOT send `update-table engage` for new orders

**Status:** WORKAROUND IMPLEMENTED ✅
**Priority:** P1
**Reported:** Feb 2026
**Workaround:** Feb 2026

### Problem
When placing a **new order**, the backend sends:
- `new-order` on the order channel ✅
- But **NO** `update-table engage` on the table channel ❌

For **update order**, the backend correctly sends:
- `update-order` on the order channel ✅
- `update-table engage` on the table channel ✅

This asymmetry caused `waitForTableEngaged(tableId)` to **timeout** (5s) for new orders, because nobody ever set the table as engaged.

### Evidence (User Console Logs)
```
[SocketHandler] new-order received: 730440
[OrderContext] addOrder: Adding new order 730440
[TableContext] updateTableStatus: 4259 → occupied
[SocketHandler] Fetching order 730440 (attempt 1)
[PlaceOrder] response: {message: 'Order placed successfully', order_id: 730440}
[SocketHandler] Fetched order 730440 successfully
[OrderContext] updateOrder: Updating order 730440
[SocketHandler] new-order: Enriched order 730440 (GET API data)
[TableContext] setTableEngaged: 4259 → false          ← Released, but never engaged!
[TableContext] waitForTableEngaged: timeout for 4259   ← TIMED OUT because never engaged
```

### Workaround Applied (Frontend)
In `socketHandlers.js` → `handleNewOrder`:
1. Immediately call `setTableEngaged(tableId, true)` when `new-order` arrives
2. This triggers `waitForTableEngaged()` in `OrderEntry.jsx` to resolve
3. After GET enrichment completes, release via `requestAnimationFrame × 2 → setTableEngaged(false)`

### Backend Action Suggested
Send `update-table engage` on the table channel for new orders, same as update orders, for consistency.

---

## BUG-213: Collect Bill Summary Shows Only Placed Items When New Items in Cart

**Status:** FIXED ✅
**Priority:** P0
**Reported:** Feb 2026
**Fixed:** Feb 2026

### Symptom
When reopening a placed order and adding a new item (e.g., 4 PC Fried Wings ₹149 to existing Pop Corn ₹199), the "Collect Bill" panel showed:
- Item Total: ₹199 (only Pop Corn)
- SGST/CGST: ₹4.50 each (tax on ₹199 only)
- Pay: ₹208

**Expected:** Item Total ₹348, tax on ₹348, Pay ≈₹365

### Root Cause
`CollectPaymentPanel.jsx` had a conditional shortcut:
```js
const itemTotal = hasPlacedItems && orderFinancials.subtotalAmount > 0
    ? orderFinancials.subtotalAmount   // ← Only placed items' total from context
    : activeItems.reduce(...)          // ← All items (never reached when placed exist)
```
When `hasPlacedItems=true`, it used `orderFinancials.subtotalAmount` (from the API response for placed items only), completely ignoring any NEW unplaced items in the cart. Same pattern for tax calculation using `orderFinancials.amount`.

### Fix Applied
Removed the `hasPlacedItems && orderFinancials` branching. Both `itemTotal` and tax are now **always** computed from ALL active cart items (placed + unplaced):
```js
const itemTotal = activeItems.reduce((sum, item) => sum + getItemLinePrice(item), 0);
const sgst = taxTotals.sgst;  // computed from ALL activeItems
const cgst = taxTotals.cgst;
```

### Files Changed
- `CollectPaymentPanel.jsx` — Lines 119, 152-161

---


## BUG-204 (Extended): Socket `new-order` Missing Financial Fields

**Status:** WORKAROUND IMPLEMENTED (GET single order enrichment)
**Priority:** P1
**Reported:** April 6, 2026
**Updated:** April 6, 2026

### Problem
Socket `new-order` event sends only 35 keys. GET single order API returns 51 keys. The 16 missing fields include critical financial data needed for Collect Bill.

### Evidence (verified April 6)

**Socket `new-order` payload (35 keys):**
```
order_amount: 166                    ✅ Present
order_sub_total_amount:              ❌ MISSING
order_sub_total_without_tax:         ❌ MISSING
total_service_tax_amount:            ❌ MISSING
payment_method:                      ❌ MISSING
delivery_charge:                     ❌ MISSING
order_edit_count:                    ❌ MISSING
print_bill_status:                   ❌ MISSING
payment_id:                          ❌ MISSING
parent_order_id:                     ❌ MISSING
canceled_by:                         ❌ MISSING
cancel_at:                           ❌ MISSING
send_payment_link:                   ❌ MISSING
tablepart:                           ❌ MISSING
associated_order_list:               ❌ MISSING
delivery_man / delivery_man_id:      ❌ MISSING
```

**GET `/api/v2/vendoremployee/get-single-order-new` (51 keys):**
```
order_amount: 166                    ✅
order_sub_total_amount: 159          ✅
order_sub_total_without_tax: 159     ✅
total_service_tax_amount: 0.00       ✅
(all 51 keys present)
```

### Frontend Workaround (April 6)
After socket `new-order`, immediately call GET single order API to enrich the order with missing fields. Flow:
1. Socket → addOrder (35 keys, cart items render)
2. GET API → updateOrder (51 keys, financials render)
3. When backend adds fields to socket, remove step 2.

### Backend Action Required
Add these fields to socket `new-order` event payload to match GET single order:
- `order_sub_total_amount`
- `order_sub_total_without_tax`
- `total_service_tax_amount`
- (ideally all 16 missing fields for full parity)



## BUG-212: Addon Names Mismatch Between Product Catalog API and Order Response API

**Status:** OPEN — CRITICAL (Backend)
**Priority:** P0 CRITICAL
**Reported:** Feb 2026
**Component:** Backend API — Data Consistency

### Problem
The **same addon ID** returns **different names** depending on which API is called:
- **Product Listing API** (`GET /api/v1/vendoremployee/all-product-list`) → `add_ons[].name` = catalog name
- **Order Details API** (`POST /api/v2/vendoremployee/get-single-order-new`) → `add_ons[].name` = different name

### Evidence (Same Restaurant, Same Addons)

| Addon ID | Product Catalog Name | Order Response Name |
|----------|---------------------|---------------------|
| **10725** | Garlic mayo | Garlic Sauce |
| **10728** | Thandoori sauce | Tandoori sauce |
| **10729** | Peri peri | Peri peri Sprinkler |
| **10730** | lemon pepper | lemon pepper Sprinkler |
| **10731** | chipotle | chipotle Sprinkler |

### Reproduction Steps
1. Load product catalog → note addon names for a product (e.g., Pop Corn)
2. Place order with those addons (frontend sends correct `add_on_ids: [10725, 10728, 10729, 10730, 10731]`)
3. Fetch placed order via GET single order API
4. Compare addon names → **they differ**

### Frontend Debug Log (Raw Addon Object from Product API)
```json
{
  "allKeys": ["id", "name", "price", "show_type", "veg", "inventory_id", "recipe_id", "has_inventory", "created_at", "updated_at", "restaurant_id", "status", "quantity"],
  "id": 10725,
  "name": "Garlic mayo"
}
```
- No `food_id`, `add_on_id`, or alternate ID field exists — `id` is the only identifier
- Frontend sends `add_on_ids: [10725, ...]` which IS the correct ID from the product catalog

### Impact
- **User confusion:** Addon names change visually after placing an order (e.g., "Garlic mayo" becomes "Garlic Sauce")
- **Data integrity:** If the product catalog and order system reference different name sources for the same addon ID, reporting/analytics may be inconsistent
- **KOT printing:** Kitchen may see different addon names than what the POS user selected

### Root Cause (Suspected)
The product listing API and the order details API likely resolve addon names from **different database tables or columns**:
- Product API: reads from the `add_ons` master table (catalog name)
- Order API: reads from the `food` table using the addon's `food_id` foreign key (food item name)

If the addon master record has `name: "Garlic mayo"` but the linked food item has `name: "Garlic Sauce"`, the mismatch occurs.

### Backend Action Required
Ensure both APIs return the **same name** for the same addon ID. Either:
1. Product API should resolve addon name from the same source as the Order API, OR
2. Order API should use the addon catalog name, OR
3. Normalize the names in both tables to be identical


## BUG-214: Collect Bill on Existing Order — "Table is already occupied" Error

**Status:** BLOCKED — Awaiting Backend Clarification
**Priority:** P0 CRITICAL
**Reported:** Feb 2026
**Component:** Backend API — `POST /api/v1/vendoremployee/order/place-order`

### Problem
When attempting to collect payment on an existing placed order (postpaid → paid), the backend returns:
```
{"error": "Table is already occupied by a running order. Please choose another table or wait until it is free."}
```

### All Attempts Made

| # | Payload Variation | Result |
|---|-------------------|--------|
| 1 | `order_id` + financials, **NO `cart`** | `{"error": "Cart is required"}` |
| 2 | `cart` + financials, **NO `order_id`** | Creates a **duplicate new order** (not payment) |
| 3 | `order_id` + `cart` + `payment_status: "paid"` + `payment_type: "postpaid"` | `"Table is already occupied by a running order"` |

### Payload Sent (Attempt 3)
```json
{
  "order_id": "730461",
  "user_id": "",
  "restaurant_id": 475,
  "table_id": "4259",
  "order_type": "pos",
  "cust_name": "",
  "cust_mobile": "",
  "payment_method": "cash",
  "payment_status": "paid",
  "payment_type": "postpaid",
  "transaction_id": null,
  "print_kot": "Yes",
  "auto_dispatch": "No",
  "scheduled": 0,
  "schedule_at": null,
  "order_sub_total_amount": 149,
  "order_sub_total_without_tax": 149,
  "tax_amount": 7.46,
  "gst_tax": 7.46,
  "vat_tax": 0,
  "order_amount": 157,
  "round_up": "0.55",
  "cart": [
    {
      "food_id": 116608,
      "quantity": 1,
      "price": 129,
      "variant": "",
      "add_on_ids": [10726],
      "add_on_qtys": [1],
      "variations": [],
      "add_ons": [],
      "station": "KDS",
      "food_amount": 129,
      "variation_amount": 0,
      "addon_amount": 20,
      "gst_amount": "7.45",
      "vat_amount": "0.00",
      "discount_amount": "0.00",
      "complementary_price": 0,
      "is_complementary": "No",
      "food_level_notes": ""
    }
  ]
}
```

### Questions for Backend Team
1. What is the correct payload structure to collect payment on an existing running order?
2. Does the endpoint differentiate "create new order" vs "collect payment on existing" by `order_id`, by `payment_status`, or by another mechanism?
3. Is there a separate endpoint for collecting payment on existing orders?
4. Is the table occupancy check ignoring the `order_id` field entirely — i.e., it always rejects if the table has a running order regardless?

### Impact
- **Collect Bill flow is completely non-functional** for postpaid (dine-in) orders
- Users cannot close out tables that have running orders
- Only prepaid (Place+Pay) flow works currently


## BUG-215: Full Order Cancel — Socket Handler Treated Cancelled Order as Partial Cancel

**Status:** FIXED ✅
**Priority:** P0
**Reported:** Feb 2026
**Fixed:** Feb 2026

### Symptom
After cancelling a full order, the table stayed "occupied" and the order was never removed. `waitForOrderRemoval` timed out after 5s. The loading overlay stayed visible indefinitely.

### Console Evidence
```
[SocketHandler] update-order-status received: 730480, status: 3
[SocketHandler] Fetching order 730480 (attempt 1)
[SocketHandler] Fetched order 730480 successfully
[OrderContext] updateOrder: Updating order 730480              ← WRONG: should remove, not update
[TableContext] updateTableStatus: 5583 → occupied              ← WRONG: should be available
[SocketHandler] update-order-status: Updated order 730480 (single item cancel)  ← Misidentified!
[OrderContext] waitForOrderRemoval: timeout for 730480         ← Never removed
```

### Root Cause
The `handleUpdateOrderStatus` handler (for status=3) fetched the order from the GET API and checked:
```js
const allItemsCancelled = !order.items?.length || 
  order.items.every(item => item.status === 'cancelled');
```
But the backend's GET single order API returns a fully cancelled order with **individual items still showing non-cancelled statuses** (e.g., `preparing`, `ready`). Only the order-level `f_order_status` is `3` (cancelled). So `allItemsCancelled` was `false`, and the handler treated it as a partial cancel — calling `updateOrder` instead of `removeOrder`.

### Fix Applied
Added order-level status check:
```js
const allItemsCancelled = !order.items?.length || 
  order.items.every(item => item.status === 'cancelled') ||
  order.status === 'cancelled';  // order-level status from API
```

### Additional Fix: Removed Optimistic Cancel
Previously, `handleCancelOrder` in `OrderEntry.jsx` and `DashboardPage.jsx` pre-emptively called `removeOrder` + `updateTableStatus` locally BEFORE the API call. This violated the socket-first principle. Replaced with:
1. `await api.put(cancel)` — wait for backend
2. `await waitForOrderRemoval(orderId)` — wait for socket to confirm
3. Socket handler does the actual `removeOrder` + `updateTableStatus`

### Files Changed
- `socketHandlers.js` — Added `order.status === 'cancelled'` check
- `OrderEntry.jsx` — Rewrote `handleCancelOrder` to socket-first pattern
- `DashboardPage.jsx` — Rewrote `handleCancelOrderConfirm` to socket-first pattern
- `OrderContext.jsx` — Added `ordersRef` + `waitForOrderRemoval(orderId, timeout)`

### Backend Note
The GET single order API should ideally mark individual item statuses as `cancelled` when the entire order is cancelled, for consistency.

## BUG-214 (Updated): Collect Bill — Backend Does Not Mark Order as Paid

**Status:** OPEN — Backend Bug
**Priority:** P0 CRITICAL
**Reported:** Feb 2026
**Updated:** Feb 2026

### Progress
- **Fixed endpoint:** Now correctly uses `PUT /api/v1/vendoremployee/order/update-place-order` (was wrongly using `POST place-order`)
- **Fixed payload:** Uses `cart-update: []` (empty), `payment_status: "paid"`, `payment_type: "postpaid"`, `payment_method: "cash"`, correct financials
- **API accepts the payload** — returns `{message: "Items added to order successfully!", order_id: 730498, total_amount: 263}`
- **But order is NOT marked as paid** — GET single order still returns the order with `occupied` status, not `paid`

### Payload Sent (Working — No Errors)
```json
{
  "order_id": "730498",
  "order_type": "pos",
  "payment_method": "cash",
  "payment_status": "paid",
  "payment_type": "postpaid",
  "print_kot": "No",
  "auto_dispatch": "No",
  "order_sub_total_amount": 250,
  "order_sub_total_without_tax": 250,
  "tax_amount": 12.5,
  "gst_tax": 12.5,
  "order_amount": 263,
  "round_up": "0.50",
  "cart-update": []
}
```

### Console Evidence
```
[CollectBill] response: {message: 'Items added to order successfully!', order_id: 730498, total_amount: 263}
[SocketHandler] Fetched order 730498 successfully
[TableContext] updateTableStatus: 5502 → occupied    ← Still occupied, NOT paid/available
```

### Questions for Backend Team
1. Does `PUT update-place-order` support changing `payment_status` from `unpaid` to `paid`?
2. Is there a separate endpoint for collecting payment on existing orders?
3. The response says "Items added to order successfully!" even with `cart-update: []` — is `payment_status` being ignored?

### Impact
- Collect Bill flow does not actually collect payment — order stays unpaid
- Tables cannot be freed through payment
- Only Place+Pay (prepaid) works for payment
