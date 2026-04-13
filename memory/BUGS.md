# POS Frontend - Bug Tracker & Audit Document

**Last Updated:** April 13, 2026 (v6 — Socket v2 Implementation Complete)

---

## Quick Summary Table

| S.No | Bug ID | Title | Priority | Status |
|------|--------|-------|----------|--------|
| 1 | NOTE-200 | `addOrder` Console Log Appears Twice (React StrictMode) | P3 | ℹ️ No Action |
| 2 | BUG-201 | Duplicate API Calls on Update Order | P0 | ✅ FIXED |
| 3 | BUG-202 | Duplicate API Calls on Cancel Item | P0 | ✅ FIXED |
| 4 | BUG-203 | Redundant Table Socket Handling | P1 | ✅ FIXED |
| 5 | BUG-204 | `order_sub_total_without_tax` Returns 0 | P1 | ⏳ BLOCKED (Backend) |
| 6 | BUG-205 | Cancel Order Race Condition | P0 | ✅ FIXED |
| 7 | BUG-206 | Partial Cancel Cancels All Items | P0 | ✅ FIXED |
| 8 | BUG-207 | Place Order Payload Format | P0 | ✅ FIXED |
| 9 | BUG-208 | Socket Missing Variations/Addons | P0 | ✅ FIXED |
| 10 | BUG-209 | Placed Item Prices Double-Multiplied | P0 | ✅ FIXED |
| 11 | BUG-210 | No Table Engage Check (Multi-Device Race) | P0 | ❌ OPEN |
| 12 | BUG-211 | No `update-table engage` for New Orders | P1 | ✅ FIXED (v2 API) |
| 13 | BUG-212 | Addon Names Mismatch Between APIs | P0 | ❌ OPEN (Backend) |
| 14 | BUG-213 | Collect Bill Shows Only Placed Items | P0 | ✅ FIXED |
| 15 | BUG-214 | Collect Bill on Existing Order | P0 | ✅ FIXED (V2 Endpoint) |
| 16 | BUG-215 | Full Order Cancel Treated as Partial | P0 | ✅ FIXED |
| 17 | BUG-216 | Missing Table Engage, Incorrect Free | P0 | ✅ FIXED (Frontend — workaround removed, free→ignore) |
| 18 | BUG-221 | Merge Order - Source Table Locked | P0 | ✅ FIXED (by BUG-216 workaround removal) |
| 19 | BUG-222 | waitForTableEngaged timeout on Update Order | P1 | ✅ FIXED (waitForOrderEngaged + fire-and-forget) |
| 20 | BUG-223 | All local locking must be removed | P0 | ✅ FIXED (Dashboard Mark Ready/Served local engage removed) |
| 21 | **BUG-224** | **Manual Bill: `gst_tax` always 0** | **P1** | **❌ OPEN** |
| 22 | **BUG-225** | **Manual Bill: `custName` sends label instead of real name** | **P2** | **❌ OPEN** |
| 23 | BUG-226 | `order-engage` missing before `update-item-status` | P1 | ✅ FIXED (Backend — deployed same day) |
| 24 | **BUG-227** | **Order-level Ready/Serve does not update item-level `food_status`** | **P0** | **❌ OPEN (Backend — Critical)** |
| 25 | **BUG-228** | **`update-order-target` not sent when source is walk-in in merge** | **P0** | **❌ OPEN (Backend — Critical)** |
| 26 | **BUG-229** | **Confirm Order (order-status-update with "paid") — `$orderstatus` undefined** | **P0** | **❌ OPEN (Backend — Critical)** |

### BUG-226: `order-engage` Missing Before `update-item-status` (Backend)

**Status:** ✅ FIXED (Backend — deployed same day)

---

### BUG-227: Order-Level Ready/Serve Does Not Update Item-Level `food_status` (Backend — CRITICAL)

**Status:** ❌ OPEN — Backend Team
**Priority:** P0 — Critical
**Reported:** April 13, 2026

**Problem:** When order-level Mark Ready or Mark Served is triggered (via `PUT /api/v2/vendoremployee/order-status-update`), the backend updates `f_order_status` but does NOT update individual items' `food_status`. This causes a visual mismatch: order card appears in Ready/Served tab, but items still show "Preparing".

**Evidence (Order 730451, Mark Ready):**
```
Socket payload: update-order-paid
├── f_order_status: 2          ← Order-level = READY ✅
├── orderDetails[0].food_status: 1   ← Item-level = PREPARING ❌ (should be 2)
├── ready_order_details: []    ← Empty (should contain the item)
└── serve_order_details: []    ← Empty
```

**Visual impact:**
- Screenshot 1 (before): Order in Preparing tab, item shows "Preparing", button = "Ready"
- Screenshot 2 (after): Order moved to Ready tab, button = "Serve", BUT item STILL shows "Preparing"
- User expects: item should also show "Ready" when order is marked Ready

**Expected backend behavior:**
When `order-status-update` is called with `order_status: "ready"`:
1. Set `f_order_status = 2` (ready) ✅ Already done
2. Set ALL non-cancelled items' `food_status = 2` (ready) ❌ Missing
3. Populate `ready_order_details` with those items ❌ Missing

Same for `order_status: "serve"`:
1. Set `f_order_status = 5` (served) ✅ Already done
2. Set ALL non-cancelled items' `food_status = 4` (served) ❌ Missing
3. Populate `serve_order_details` with those items ❌ Missing

**Frontend status:** No frontend change needed. Frontend correctly displays what backend sends. Once backend updates `food_status` in the socket payload, items will show correct status automatically.

**Affected flows:** Order-level Mark Ready, Order-level Mark Served (dashboard buttons)
**API endpoint:** `PUT /api/v2/vendoremployee/order-status-update`
**Socket event:** `update-order-paid` on `new_order_{restaurantId}` channel

**Status:** ❌ OPEN — Backend Socket Team
**Priority:** P1
**Reported:** April 13, 2026

**Problem:** All v2 flows send `order-engage {orderId} engage` before the data event — except `update-item-status`. This breaks the architectural principle that ALL order locking comes from socket events.

**Current behavior:**
```
update-item-status {orderId} {f_status} {payload}   ← data arrives, no lock
```

**Expected behavior (consistent with all other v2 flows):**
```
order-engage {orderId} engage                        ← lock order card
update-item-status {orderId} {f_status} {payload}    ← data arrives
```

**Impact:** Currently sub-second so no visible issue. But on slow networks or under load, the order card is clickable during processing — could cause race conditions on multi-device setups.

**Frontend status:** Handler already releases `setOrderEngaged(orderId, false)` after processing. Once backend sends `order-engage`, locking will work automatically — zero frontend change needed.

**Affected flows:** Item-level Ready, Item-level Serve (via OrderCard toggles on dashboard)
**API endpoint:** `PUT /api/v2/vendoremployee/food-status-update`
**Socket event:** `update-item-status` on `new_order_{restaurantId}` channel

---

### BUG-228: `update-order-target` Not Sent When Source is Walk-In in Merge (Backend — CRITICAL)

**Status:** ❌ OPEN — Backend Socket Team
**Priority:** P0 — Critical
**Reported:** April 13, 2026

**Problem:** When merging orders where the SOURCE is a walk-in (tableId=0), the backend sends `update-order-source` (source cancelled) but does NOT send `update-order-target` (target updated with merged items). Table-to-table merge works correctly.

**Evidence:**

Test 1 — Walk-in → T1 merge (Order 730902 source, 730917 target):
```
order-engage 730902 engage        ✅ source locked
order-engage 730917 engage        ✅ target locked
update-order-source 730902 (3)    ✅ source cancelled, removed
update-order-target 730917        ❌ NEVER RECEIVED
setOrderEngaged 730917 → false    ❌ NEVER RELEASED
```

Test 2 — Walk-in → Walk-in merge (Order 730917 source, 730919 target):
```
order-engage 730917 engage        ✅ source locked
order-engage 730919 engage        ✅ target locked
update-order-source 730917 (3)    ✅ source cancelled, removed
update-order-target 730919        ❌ NEVER RECEIVED
setOrderEngaged 730919 → false    ❌ NEVER RELEASED
```

Test 3 — Table → Table merge (730882 source, 730902 target) — WORKS:
```
order-engage 730882 engage        ✅
order-engage 730902 engage        ✅
update-order-target 730902        ✅ RECEIVED — target updated
update-order-source 730882 (3)    ✅ source removed
```

**Merge scenario matrix:**

| Source → Target | `update-order-source` | `update-order-target` | Works? |
|----------------|----------------------|----------------------|--------|
| Table → Table | ✅ | ✅ | ✅ |
| Walk-in → Walk-in | ✅ | ✅ | ✅ |
| Table → Walk-in | ✅ | ✅ | ✅ |
| Walk-in → Table | ✅ | ❌ | ❌ |

**Impact:**
1. Target table order has stale data — merged items from walk-in source never reflected
2. Target order card spinner stuck permanently — `setOrderEngaged(targetId)` never released
3. Only fix is page refresh

**Expected backend behavior:**
When merge API is called with walk-in source merging INTO a table order, backend must send BOTH:
1. `update-order-source {sourceOrderId} {3} {payload}` — source cancelled ✅ Already sent
2. `update-order-target {targetOrderId} {f_status} {payload}` — target updated with merged items ❌ MISSING only for walk-in → table

**Frontend status:** Handler for `update-order-target` is implemented and working (confirmed with table-to-table merge). Zero frontend change needed — once backend sends the event, it will work automatically.

**API endpoint:** `POST /api/v2/vendoremployee/order/transfer-order`
**Socket events:** `update-order-target` + `update-order-source` on `new_order_{restaurantId}` channel


---

### BUG-229: Confirm Order — `$orderstatus` Undefined in Backend (Backend — CRITICAL)

**Status:** ❌ OPEN — Backend Team
**Priority:** P0 — Critical (blocks order confirmation flow)
**Reported:** April 13, 2026

**Problem:** When calling `PUT /api/v2/vendoremployee/order/order-status-update` with `order_status: "paid"` to confirm a YTC order, the backend throws an `ErrorException: Undefined variable $orderstatus`.

**Request payload:**
```json
{
    "order_id": "730927",
    "role_name": "Owner",
    "order_status": "paid"
}
```

**Backend response:**
```json
{
    "message": "Undefined variable $orderstatus",
    "exception": "ErrorException",
    "file": "/var/www/html/app/Http/Controllers/Api/V2/Vendoremployee/OrderController.php",
    "line": 3643
}
```

**Root cause:** Likely a typo in `OrderController.php` line 3643 — `$orderstatus` vs `$orderStatus` or `$order_status`.

**Impact:** Order confirmation from YTC tab is completely broken. Cannot move orders from YTC → Preparing.

**Frontend status:** Frontend sends correct payload. Zero frontend change needed — once backend fixes the variable reference, it will work.

**API endpoint:** `PUT /api/v2/vendoremployee/order/order-status-update`
**Socket events expected (after fix):** `order-engage` + `update-order-paid` (with f_order_status=1, preparing)
#### v2 Endpoint Payload Test (April 11, 2026)
All 3 endpoints tested on v2 — **no socket payload benefit found**. Reverted to v1.

| Endpoint | v1 Payload? | v2 Payload? | Verdict |
|----------|------------|------------|---------|
| transfer-order | ❌ No | ✅ Yes (`update-order-target` + `update-order-source`) | **Upgraded to v2** (Apr 13) |
| transfer-food-item | ❌ No | ✅ Yes (`update-order-target` + `update-order-source`) | **Upgraded to v2** (Apr 13) |
| cancel-food-item | ❌ No | ✅ Yes (`order-engage` + `update-order` with payload) | **Upgraded to v2** (Apr 13) |

**Conclusion (Updated Apr 13):** Backend v2 now provides full socket payloads for transfer-order, transfer-food-item, and cancel-food-item. Cancel Order / Mark Ready / Mark Served (all via `order-status-update` endpoint) remain v1 — backend change needed for that one endpoint.

### April 11, 2026 Updates (Session 10 — Socket Event Audit)

#### BUG-216 — Backend Fix Confirmed → Workaround Removal Pending
- User confirmed BUG-216 backend fix is deployed
- `free→engage` workaround in `handleUpdateTable` to be REMOVED
- `free` should genuinely free/release the table
- This also fixes BUG-221 (Merge Order source table locked)

#### BUG-223 — NEW: Remove All Local Locking
**Problem:** Multiple places in the frontend set `setTableEngaged` or call `waitForTableEngaged` locally, without socket events driving the lock. This creates inconsistencies, timeouts, and stuck spinners.

**Principle:** ALL locking must come from socket events only. Zero local locking.

**10 locations to clean:** See ROADMAP.md TASK-A for full list.

**Flow-specific wait logic:** See ROADMAP.md TASK-B for socket event map.

#### Endpoint Verification (Updated April 13, 2026)

| Action | Endpoint | Status |
|--------|----------|--------|
| Switch Table | `POST /api/v2/vendoremployee/order/order-table-room-switch` | ✅ v2 verified — `update-table engage` (both) + `update-order-target` with payload |
| Transfer Order (Merge) | `POST /api/v2/vendoremployee/order/transfer-order` | ✅ v2 verified — `order-engage` (both) + `update-order-target` + `update-order-source` |
| Transfer Food Item | `POST /api/v2/vendoremployee/order/transfer-food-item` | ✅ v2 verified — same events as merge |
| Collect Bill | `POST /api/v2/vendoremployee/order/order-bill-payment` | Path updated, socket behavior TBD |
| Cancel Food Item | `PUT /api/v2/vendoremployee/order/cancel-food-item` | ✅ v2 verified — `order-engage` + `update-order` with payload. No `update-table free`. No GET API. |

#### Socket Event Audit Results (Updated April 13, 2026)

**Switch Table v2** (verified):
- 2x `update-table engage` (source + dest tables locked)
- `update-order-target` with full payload (order now on dest table)
- No `update-order-source` (same order, just moved)
- No `update-table free` — frontend releases both after context update
- Both tables get `engage` (v1 only engaged dest — BUG-216 no longer triggers)

**Transfer Order / Merge Table v2** (verified):
- 2x `order-engage` (source + target orders locked)
- `update-order-target` with full payload (target updated)
- `update-order-source` with full payload (source cancelled, f_order_status=3)
- No `update-table` events — order-level locking only
- Zero GET API calls needed

**Transfer Food Item v2** (verified):
- Identical socket pattern to Merge Table
- 2x `order-engage` (source + target orders locked)
- `update-order-target` with full payload (target gets item)
- `update-order-source` with full payload (source loses item, f_order_status=1, still active)
- Zero GET API calls needed

**Switch Table v1** (unchanged):
- `update-table engage` (dest) + `update-order` (no payload) + `update-table free` (source)
- GET API still required

**Cancel Food Item v1** (unchanged):
- `update-table free` (table) + `update-order-status` (status 6, but API returns "ready")
- BUG-216 workaround currently converts `free` → `engage`
- No `order-engage` event

### April 10, 2026 Updates

#### BUG-211 - FIXED
- v2 API now sends `update-table engage` socket BEFORE HTTP response
- New Order flow now waits for socket before redirect

#### BUG-222 - NEW & FIXED
**Problem:** `waitForTableEngaged: timeout` on Update Order because backend no longer sends `update-table engage` for updates.

**Solution:** New `order-engage` channel handles order-level locking:
- Backend sends `order-engage [orderId, restaurantOrderId, restaurantId, 'engage']`
- Frontend uses `setOrderEngaged()` instead of `setTableEngaged()`
- Works for ALL order types (dine-in, walk-in, takeaway, delivery)

### Open Bug Notes (April 11, 2026)
- **BUG-210**: Multi-device race condition — needs `isTableEngaged` check BEFORE opening OrderEntry. Low risk now that permission gating prevents unauthorized operations.
- **BUG-212**: Backend addon name mismatch — frontend workaround possible but not clean. Waiting on backend.
- **BUG-216**: Backend fix confirmed by user (April 11). `free→engage` workaround to be REMOVED. `free` should genuinely free the table.
- **BUG-223**: All local locking (without socket events) to be removed. See ROADMAP TASK-A.

### Status Legend
- ✅ FIXED - Issue resolved and verified
- ❌ OPEN - Needs fix (frontend or backend)
- ⏳ BLOCKED - Waiting on backend fix
- ⚠️ Workaround - Temporary fix in place
- ℹ️ No Action - Informational only

### Priority Legend
- **P0** - Critical/Blocking
- **P1** - High Priority
- **P2** - Medium Priority
- **P3** - Low Priority

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

## Updated Endpoint Mapping (April 6, 2026)

| Action | Endpoint | Status |
|--------|----------|--------|
| Place New Order | `POST /api/v1/vendoremployee/order/place-order` (multipart/form-data) | Updated |
| Update Order | `PUT /api/v1/vendoremployee/order/update-place-order` (JSON) | Updated |
| Collect Bill (existing order) | `POST /api/v2/vendoremployee/order/order-bill-payment` (JSON) | Working |
| Place + Pay (new order) | `POST /api/v1/vendoremployee/order/place-order` (multipart/form-data, payment_status=paid) | Updated |
| Cancel Item (full/partial) | `PUT /api/v2/vendoremployee/order/cancel-food-item` | Working (v2) |
| Cancel Full Order | `PUT /api/v2/vendoremployee/order-status-update` | Working |
| Get Single Order | `POST /api/v2/vendoremployee/get-single-order-new` | Working |
| Food Status Update | `PUT /api/v2/vendoremployee/food-status-update` | Working |

---

## Socket Event → User Action (Verified April 6, 2026)

| Action | Socket Event | Status |
|--------|-------------|--------|
| Place New Order | `new-order` (with payload) | 0→1 API call (GET single order enrichment) |
| Update Order | `update-order` | 1 API call |
| Cancel Single Item | `update-order-status` (status=3) | 1 API call |
| Cancel Partial Item | `update-order-status` (status=3) | 1 API call |
| Cancel Full Order | `update-order-status` (status=3) | 0 API calls (skipped, already removed) |
| Collect Bill | `update-order-status` (status=6) + `update-table free` | 1 API call (GET for status check) |


---

## BUG-220: Socket orderId Type Mismatch — `removeOrder` / `getOrderById` Never Match

**Status:** FIXED
**Priority:** P0 CRITICAL
**Reported:** April 6, 2026
**Fixed:** April 6, 2026

### Symptom
After Collect Bill (or any socket-driven order removal), the table card kept showing stale order data (amount, waiter, time, bill button) even though console logs showed `removeOrder` being called. The order was never actually removed from `OrderContext`.

### Root Cause
Socket messages send `orderId` as a **string** (e.g., `'730522'`), but `OrderContext` stores orders with **numeric** `orderId` (e.g., `730522`). 

- `removeOrder('730522')` → `prev.filter(o => o.orderId !== '730522')` → `730522 !== '730522'` is `true` (strict equality, different types) → **order NOT removed**
- `getOrderById('730522')` → `orders.find(o => o.orderId === '730522')` → `730522 === '730522'` is `false` → **always returns null**

This also broke the "already removed" guard in `handleUpdateOrder`, causing it to skip ALL socket updates for existing orders.

### Fix Applied (3 locations)
1. **`socketHandlers.js` → `parseMessage()`**: Convert `orderId` to `Number()` at the source — fixes all downstream handlers
2. **`OrderContext.jsx` → `removeOrder()`**: Safety net `Number()` conversion before filter
3. **`OrderContext.jsx` → `getOrderById()`**: Safety net `Number()` conversion before find

### Additional Fix (same session)
Converted `DashboardPage.jsx` table derivation from `useEffect+setState` (async, 2-render-cycle) to `useMemo` (synchronous). This ensures table card data clears in the same render cycle as context updates — no intermediate stale frame.

### Files Changed
- `socketHandlers.js` — `parseMessage()`: `orderId: Number(message[1])`
- `OrderContext.jsx` — `removeOrder()`, `getOrderById()`: `Number()` safety net
- `DashboardPage.jsx` — `useEffect → useMemo` for table data derivation; `handleUpdateTableStatus` now flows through `TableContext` instead of local state


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


## BUG-214: Collect Bill on Existing Order — Resolved with V2 Endpoint

**Status:** FIXED
**Priority:** P0 CRITICAL (was BLOCKED)
**Reported:** Feb 2026
**Fixed:** April 6, 2026

### Resolution
The original `POST /api/v1/vendoremployee/order/place-order` endpoint could not handle postpaid collect bill (returned "Table is already occupied"). User provided the correct dedicated endpoint:

**New Endpoint:** `POST /api/v2/vendoremployee/order-bill-payment`
**Content-Type:** `application/json`

### Working Payload
```json
{
  "order_id": "730522",
  "payment_mode": "cash",
  "payment_amount": 190,
  "payment_status": "paid",
  "transaction_id": "",
  "order_sub_total_amount": 190,
  "order_sub_total_without_tax": 190,
  "total_gst_tax_amount": 0,
  "gst_tax": 0,
  "vat_tax": 0,
  "round_up": 0,
  "service_tax": 0,
  "service_gst_tax_amount": 0,
  "tip_amount": 0,
  "tip_tax_amount": 0,
  "restaurant_discount_amount": 0,
  "order_discount": 0,
  "comunity_discount": 0,
  "discount_value": 0
}
```

### Success Response
```json
{"message": "Bill cleared via cash"}
```

### Socket Events After Collect Bill
1. `update-order-status` with `f_order_status: 6` (paid) — order channel
2. `update-table free` — table channel

### Frontend Flow
```
CollectPaymentPanel → onPaymentComplete:
  1. setTableEngaged(tableId, true)
  2. await api.post(BILL_PAYMENT, payload)
  3. toast("Bill cleared via cash")
  4. onClose() → redirect to Dashboard

socketHandlers.handleUpdateOrderStatus (status=6):
  1. fetchOrderWithRetry(orderId)
  2. order.status === 'paid' → syncTableStatus('available') + removeOrder(orderId)
  3. requestAnimationFrame × 2 → setTableEngaged(false)
```


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

## BUG-214 (History): Collect Bill — Previous Attempts Before V2 Endpoint

**Status:** CLOSED — Superseded by V2 endpoint fix above
**Historical Reference Only**

### Attempt 1: `POST /api/v1/vendoremployee/order/place-order`
- Returned "Table is already occupied" with `order_id` + `cart` + `payment_status: "paid"`
- Returned "Cart is required" without `cart`
- Created duplicate order without `order_id`

### Attempt 2: `PUT /api/v1/vendoremployee/order/update-place-order`
- API accepted payload with `cart-update: []`, `payment_status: "paid"`, `payment_type: "postpaid"`
- Returned `{message: "Items added to order successfully!", order_id: 730498, total_amount: 263}`
- **But order was NOT marked as paid** — GET single order still returned `occupied` status
- `payment_status` field was silently ignored by the update endpoint

### Resolution
User provided dedicated V2 endpoint: `POST /api/v2/vendoremployee/order-bill-payment` — works correctly


## BUG-216 (Updated): Backend Table Socket Events — Missing Engage, Incorrect Free

**Status:** OPEN — CRITICAL (Backend)
**Priority:** P0 CRITICAL
**Reported:** Feb 2026
**Updated:** Feb 2026

### Problem Summary
The backend does not send consistent `update-table engage`/`free` socket events across all flows. Some flows send `free` without a prior `engage`, some don't send any table event at all, and the shift table flow doesn't lock/release both tables.

### Current Behavior Per Flow

| Flow | Source Table | Destination Table | Issue |
|------|-------------|-------------------|-------|
| **Place New Order** | — | No `engage` sent | BUG-211: Frontend workaround — engages locally in `handleNewOrder` |
| **Place+Pay (prepaid)** | — | No `engage` sent | BUG-219: Frontend workaround — same as Place New Order |
| **Update Order** | — | `engage` ✅ then released by frontend after GET | ✅ Working |
| **Cancel Item** | — | `free` sent (no prior `engage`) | BUG-216: Frontend workaround needed — engage locally in `handleCancelFood` |
| **Cancel Full Order** | — | `free` sent (no prior `engage`) | Currently works with BUG-216 workaround but workaround causes other issues |
| **Shift Table** | `free` only (no `engage`) | `engage` ✅ | ❌ Source table never locked, `free` is mishandled |

### Shift Table — Detailed Analysis

**Order 730482 shifted from table 5507 → table 5510**

**Socket events received:**
```
14:38:19  update-table 5510 engage    ← Destination locked ✅
14:38:19  update-order 730482         ← Order updated
14:38:20  update-table 5507 free      ← Source freed (no prior engage) ❌
```

**What backend SHOULD send:**
```
1. update-table 5507 engage     ← Lock source table
2. update-table 5510 engage     ← Lock destination table
3. update-order 730482          ← Order updated (now on destination)
4. update-table 5507 free       ← Release source (now available)
5. update-table 5510 free       ← Release destination (now occupied, clickable)
```

**Currently:** Backend only controls engage/free for destination. Source table gets a `free` without prior `engage`. The frontend's BUG-216 workaround (treating `free` as `engage`) causes the source table to get LOCKED instead of freed — stuck with a spinner forever.

### Frontend Workaround Status

**Current workaround (BUG-216):** Treat ALL `update-table free` as `engage` in `handleUpdateTable`.

**This workaround breaks:**
- **Shift table:** Old (source) table gets engaged instead of freed → spinner stuck forever
- **Cancel full order:** Table gets engaged instead of freed (but `update-order-status` handler eventually releases it)

**Correct workaround (to be implemented):**
1. **Revert** the blanket `free→engage` workaround — let `free` genuinely free the table
2. **Cancel item:** Engage table locally in `handleCancelFood` before API call (same pattern as `handleNewOrder` for BUG-211)
3. **Shift table:** `free` on source table works correctly (table becomes available)
4. **Cancel full order:** `free` on table works correctly (table becomes available)

### Backend Action Required
1. Send `update-table engage` for ALL flows that modify orders (not just Update Order)
2. For Shift Table: send engage for BOTH source and destination tables, then free both after processing
3. For Cancel Item: send `engage` instead of `free` (or send `engage` first, then `free` after processing)
4. Ensure all flows follow the pattern: `engage → process → free`

### Impact
- Shift table leaves source table with permanent spinner (unusable)
- Inconsistent locking behavior across flows
- Frontend needs per-flow workarounds instead of one unified socket-based locking mechanism

## BUG-219: Backend Does NOT Send `update-table engage` for Place+Pay (prepaid)

**Status:** OPEN — Backend Bug
**Priority:** P1
**Reported:** Feb 2026

### Problem
Same as BUG-211 (Place New Order). The backend does not send `update-table engage` for prepaid orders. Frontend workaround: `handleNewOrder` engages locally (same handler as unpaid new orders).

### Console Evidence
```
[SocketHandler] new-order received: 730494
[OrderContext] addOrder: Adding new order 730494
[TableContext] updateTableStatus: 5521 → occupied
[TableContext] setTableEngaged: 5521 → true          ← Frontend local engage (workaround)
[SocketHandler] new-order: Table 5521 ENGAGED (locked)
[SocketHandler] Fetching order 730494 (attempt 1)
[SocketHandler] Fetched order 730494 successfully
[OrderContext] updateOrder: Updating order 730494
[TableContext] setTableEngaged: 5521 → false          ← Released after enrichment
```

No `update-table 5521 engage` socket event was received from backend.

### Backend Action Required
Send `update-table engage` for prepaid orders, same as Update Order flow.


## BUG-221: Merge Order — Source Table Permanently Locked After Merge

**Status:** RESOLVED — v2 endpoint fixes this
**Priority:** P0 CRITICAL → RESOLVED
**Reported:** April 6, 2026
**Resolved:** April 13, 2026
**Component:** Frontend (BUG-216 workaround) + Backend (missing engage for source table)

### Resolution
Merge endpoint upgraded to v2 (`POST /api/v2/vendoremployee/order/transfer-order`). v2 uses:
- **Order-level locking** (`order-engage`) instead of table-level (`update-table`)
- **New events:** `update-order-target` + `update-order-source` with full payloads
- **No `update-table free`** sent → BUG-216 workaround no longer triggers
- **Frontend TODO:** Add handlers for `update-order-target` and `update-order-source`

### Original Problem (v1)
After merging order 730506 from table 6476 (source) → table 6235 (destination), the source table 6476 gets permanently stuck with a spinner overlay and cannot be clicked.

### Console Evidence (Timestamped)

```
18:01:19  [Dashboard] Table click: 6476 (source, has order 730506)
18:01:19  [OrderEntry] Syncing from OrderContext {orderId: 730506, amount: 120}

--- Merge API called, socket events arrive ---

18:01:19  update-table 6235 engage           ← Destination locked ✅
18:01:19  update-order 730506, status 5       ← Order updated (now on 6235), triggers GET
18:01:19  update-table 6476 free              ← Source should be freed
18:01:19  setTableEngaged: 6476 → true        ← ❌ BUG-216 workaround converts free→engage
18:01:19  "Table 6476 ENGAGED (free→engage workaround, BUG-216)"
18:01:19  update-table 6235 engage            ← Duplicate, harmless
18:01:19  Fetched order 730506 successfully
18:01:19  updateTableStatus: 6235 → billReady ← Destination gets correct status
18:01:20  setTableEngaged: 6235 → false       ← Destination released ✅
          — Table 6476: NEVER RELEASED —       ← ❌ Permanent spinner
```

### Root Cause (Two-Part)

**1. Frontend (BUG-216 workaround):** `handleUpdateTable` in `socketHandlers.js` converts ALL `update-table free` events to `engage`. When the backend sends `update-table 6476 free` to release the source table, the workaround intercepts it and locks 6476 instead.

**2. Backend (missing engage pattern):** Backend sends `free` for the source table without a prior `engage`. The ideal flow would be `engage → process → free` for both tables.

**3. No release path for source:** After the merge, order 730506 now belongs to table 6235. The `update-order` handler only releases the NEW table (6235) via `setTableEngaged(6235, false)`. Nobody calls `setTableEngaged(6476, false)` because no order references 6476 anymore.

### Socket Events Received (Actual)
```
1. update-table 6235 engage     ← Destination locked
2. update-order 730506          ← Order moved to 6235
3. update-table 6476 free       ← Source freed (intercepted by BUG-216 workaround → locked)
4. update-table 6235 engage     ← Duplicate destination lock
```

### Socket Events Expected (Ideal)
```
1. update-table 6476 engage     ← Lock source
2. update-table 6235 engage     ← Lock destination
3. update-order 730506          ← Order moved to 6235
4. update-table 6476 free       ← Release source (now available)
5. update-table 6235 free       ← Release destination (now occupied, clickable)
```

### Frontend Fix Required
Remove the blanket `free→engage` workaround in `handleUpdateTable` (`socketHandlers.js`). Let `free` genuinely free the table. Handle cancel-item locking locally in `handleCancelFood` instead (same pattern as `handleNewOrder` for BUG-211). This also fixes Shift Table (BUG-216).

### Backend Fix Suggested
1. Send `update-table engage` for source table BEFORE processing merge
2. Follow the `engage → process → free` pattern for BOTH source and destination tables

### Impact
- Source table permanently stuck with spinner after every merge — unusable until page refresh
- Same root cause as Shift Table (BUG-216) — both broken by the `free→engage` workaround
- Blocks production use of merge/shift flows


---

## BUG-224: Manual Bill `gst_tax` Always 0

**Priority:** P1
**Status:** ❌ OPEN
**Filed:** April 11, 2026

### Symptom
When manual bill is printed from TableCard or OrderCard, the payload sends `gst_tax: 0` regardless of actual tax on items.

### Root Cause
`buildBillPrintPayload()` in `orderTransform.js` computes GST from:
```js
parseFloat(item.gst_tax_amount || item.tax_amount || 0)
```

But `rawOrderDetails` items (from socket) **do NOT have `gst_tax_amount` or `tax_amount` fields**. These are computed fields that the socket doesn't return at item level.

### Evidence
- Place order payload sends `gst_tax: 43.65` (computed by frontend before sending)
- Socket payload does NOT include `gst_tax` or `vat_tax` at order level
- Socket `orderDetails` items do NOT include `gst_tax_amount` or `tax_amount`
- What IS available per item: `food_details.tax` (percentage), `food_details.tax_type` ("GST"/"VAT"), `food_details.tax_calc` ("Exclusive"/"Inclusive"), `unit_price`, `quantity`, `total_add_on_price`

### Fix
Compute from available percentage + price data instead of reading pre-computed fields:
```
For each rawOrderDetails item:
  taxable = (unit_price × quantity) + total_add_on_price
  tax_percent = food_details.tax (e.g., 5)
  
  if Exclusive: item_tax = taxable × (tax_percent / 100)
  if Inclusive: item_tax = taxable - (taxable / (1 + tax_percent / 100))
  
  Route to gst_tax or vat_tax sum based on food_details.tax_type
```

### Verification
Compare computed `gst_tax` in bill payload against place order's `gst_tax` for the same order — should match exactly.

### Files
- `api/transforms/orderTransform.js` → `toAPI.buildBillPrintPayload()` lines 750-758

---

## BUG-225: Manual Bill `custName` Sends Label Instead of Real Name

**Priority:** P2
**Status:** ❌ OPEN
**Filed:** April 11, 2026

### Symptom
Bill payload sends `custName: "Walk-In"` for walk-in orders. The backend/printer expects an empty string `""` when there's no real customer name. Labels like "Walk-In", "TA", "Del" are UI display labels, not customer names.

### Root Cause
`fromAPI.order()` maps customer to `customerLabel`:
```js
// If no customer name, defaults:
// walk-in → "Walk-In", takeaway → "TA", delivery → "Del"
```

`buildBillPrintPayload` reads `order.customer` which is the label, not the raw name.

### Fix
Store raw customer name separately in `fromAPI.order()`:
```js
rawCustomerName: customer,  // actual name or empty string
customer: customerLabel,     // display label (existing)
```
Then in `buildBillPrintPayload`: use `order.rawCustomerName || ''` for `custName`.

### Files
- `api/transforms/orderTransform.js` → `fromAPI.order()` line 165 + `buildBillPrintPayload()` line 796
