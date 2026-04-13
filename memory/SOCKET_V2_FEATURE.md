# Socket v2 Architecture — Feature Spec & Test Plan

**Created:** April 13, 2026
**Last Updated:** April 13, 2026
**Status:** TESTING COMPLETE — Ready for implementation + backend changes for remaining 3 flows

---

## 1. Summary

### What We Verified
- Tested ALL 10 order mutation flows via console logs
- 8 flows are v2 CLEAN (lock → payload → process → release, zero GET API)
- 3 flows remain v1 DIRTY (Cancel Order, Mark Ready, Mark Served) — all share one endpoint `order-status-update`
- Cancel Food Item upgraded to v2 during testing — now CLEAN
- 3 NEW socket events discovered and verified: `update-order-target`, `update-order-source`, `update-order-paid`
- `update-table free` is a v1 artifact — no v2 flow sends it — safe to ignore entirely
- BUG-216 workaround can be removed — cancel food v2 doesn't trigger it

### Architecture Principle
Every v2 flow follows one pattern:
```
1. Lock (order-engage OR update-table engage)
2. Data event WITH complete payload
3. Frontend transforms payload → context update → derive table status
4. Release lock
5. Zero GET API calls
6. No update-table free
```

---

## 2. Complete Flow Map (All 10 Flows Verified)

| Flow | Endpoint | Version | Lock Event | Data Event | Payload? | `update-table free`? | GET API? | Status |
|------|----------|---------|-----------|-----------|----------|---------------------|----------|--------|
| New Order | `order/place-order` | v2 | `update-table engage` | `new-order` | ✅ | ❌ | ❌ | **v2 CLEAN** |
| Update Order | `order/update-place-order` | v2 | `order-engage` | `update-order` | ✅ | ❌ | ❌ | **v2 CLEAN** |
| Switch Table | `order/order-table-room-switch` | v2 | 2× `update-table engage` | `update-order-target` | ✅ | ❌ | ❌ | **v2 CLEAN** |
| Merge Table | `order/transfer-order` | v2 | 2× `order-engage` | `update-order-target` + `update-order-source` | ✅ | ❌ | ❌ | **v2 CLEAN** |
| Transfer Food | `order/transfer-food-item` | v2 | 2× `order-engage` | `update-order-target` + `update-order-source` | ✅ | ❌ | ❌ | **v2 CLEAN** |
| Collect Bill | `order/order-bill-payment` | v2 | `order-engage` | `update-order-paid` | ✅ | ❌ | ❌ | **v2 CLEAN** |
| Cancel Food | `order/cancel-food-item` | v2 | `order-engage` | `update-order` | ✅ | ❌ | ❌ | **v2 CLEAN** |
| Cancel Order | `order-status-update` | v2 | ❌ none | `update-order-status` | ❌ | ⚠️ Yes (×2) | ✅ 2-3s | **v1 DIRTY** |
| Mark Ready | `order-status-update` | v2 | ❌ none | `update-order-status` | ❌ | ❌ | ✅ 1s | **v1 DIRTY** |
| Mark Served | `order-status-update` / `food-status-update` | v2 | ❌ none | `update-order-status` / `update-food-status` | ❌ | ❌ | ✅ | **v1 DIRTY** |

**8 CLEAN. 3 DIRTY — all 3 share `order-status-update` endpoint. Backend fix needed for that one endpoint.**

---

## 3. New Socket Events

| Event | Channel | Used By | Payload? | Currently Handled? |
|-------|---------|---------|----------|-------------------|
| `update-order-target` | `new_order_{restaurantId}` | Switch Table, Merge, Transfer Food | ✅ Yes | ❌ Dropped ("Unknown") |
| `update-order-source` | `new_order_{restaurantId}` | Merge, Transfer Food | ✅ Yes | ❌ Dropped ("Unknown") |
| `update-order-paid` | `new_order_{restaurantId}` | Collect Bill | ✅ Yes | ❌ Dropped ("Unknown") |

**Existing events already handled correctly:**
| Event | Used By (v2) | Handler |
|-------|-------------|---------|
| `new-order` | New Order | `handleNewOrder` ✅ |
| `update-order` | Update Order, Cancel Food (v2) | `handleUpdateOrder` ✅ |
| `update-table` (engage) | New Order, Switch Table | `handleUpdateTable` ✅ |
| `order-engage` | Update, Merge, Transfer, Bill, Cancel Food | `handleOrderEngage` ✅ |

---

## 4. Verified Console Log Evidence

### 4.1 Collect Bill — Dine-in (Order 730862, Table 3239)
```
14:22:36  order-engage 730862 engage
14:22:37  update-order-paid 730862, f_order_status=6, {payload}
— no update-order-status, no update-table free —
```
**Result:** CLEAN. Only 2 events. No double fire.

### 4.2 Collect Bill — Walk-in (Order 730843)
```
14:28:14  order-engage 730843 engage
14:28:15  update-order-paid 730843, f_order_status=6, {payload}
```
**Result:** Identical to dine-in. No table events.

### 4.3 Collect Bill — Delivery (Order 730852)
```
14:28:50  order-engage 730852 engage
14:28:52  update-order-paid 730852, f_order_status=6, {payload}
```
**Result:** Identical. 2 sec gap between HTTP response and socket (not a problem).

### 4.4 Cancel Food — Partial, Walk-in (Order 730851, v1 endpoint)
```
14:33:24  update-table 0 free (skipped — tableId=0)
14:33:24  update-order-status 730851, f_order_status=6 (wrong — should be preparing)
14:33:26  GET API → order still "preparing" → updateOrder
```
**Result:** v1 DIRTY. Wrong f_order_status, GET needed. Walk-in safe (tableId=0 skipped).

### 4.5 Cancel Food — Full, Walk-in (Order 730848, v1 endpoint)
```
14:32:14  update-table 0 free (skipped)
14:32:14  update-order-status 730848, f_order_status=6 (wrong — order is "paid"?)
14:32:17  GET API → order is "paid" → removeOrder
```
**Result:** v1 DIRTY. 3 sec GET.

### 4.6 Cancel Food — Partial, Dine-in (Order 730849, Table 3239, v1 endpoint)
```
14:35:27  update-table 3239 free → BUG-216 converts to engage
14:35:27  update-order-status 730849, f_order_status=6 (wrong)
14:35:28  GET API → order "preparing" → updateOrder
14:35:28  setTableEngaged(3239, false) → released
```
**Result:** v1 DIRTY. BUG-216 workaround saves it. Without workaround: 1 sec window where table shows "available".

### 4.7 Cancel Food — Partial, Dine-in (Order 730865, v2 endpoint!)
```
14:56:11  order-engage 730865 engage
14:56:11  update-order 730865, f_order_status=7, {payload}
14:56:11  setOrderEngaged(730865, false) → released
```
**Result:** v2 CLEAN! Uses existing `update-order` event + `order-engage`. No `update-table free`. No GET API. Existing handler works perfectly.

### 4.8 Cancel Full Order — Dine-in (Order 730849, Table 3239)
```
14:43:33  update-table 3239 free → BUG-216 converts to engage
14:43:34  update-table 3239 free → BUG-216 converts to engage (duplicate)
14:43:35  update-order-status 730849, f_order_status=3 (correct!)
14:43:37  GET API → order "cancelled" → removeOrder → table available
14:43:37  setTableEngaged(3239, false) → released
```
**Result:** v1 DIRTY. Uses `order-status-update` endpoint. Double `update-table free`. GET takes 2 sec.

### 4.9 Cancel Food — Last Item, Walk-in (Order 730863, v1 endpoint)
```
14:39:09  update-table 0 free (skipped)
14:39:09  update-order-status 730863, f_order_status=6
14:39:10  GET API → order "cancelled" → removeOrder
```
**Result:** v1 DIRTY. Walk-in safe.

### 4.10 Mark Ready (Order 730850, Table 4086)
```
14:45:21  update-order-status 730850, f_order_status=2 (ready)
14:45:22  GET API → order "ready" → updateOrder
14:45:22  setTableEngaged(4086, false) → released
```
**Result:** v1 DIRTY. No lock, no payload, GET needed.

### 4.11 Switch Table — Table→Table (Order 730850, Table 4086→3237)
```
13:36:31  update-table 3237 engage (dest)
13:36:31  update-table 4086 engage (source)
13:36:31  update-order-target 730850, f_order_status=1, {payload}
```
**Result:** v2 CLEAN. Both tables engaged. No `update-table free`.

### 4.12 Switch Table — Walk-in→Table (Order 730850, 0→3239)
```
12:55:15  update-table 3239 engage (dest)
12:55:15  update-order 730850 (no payload — was v1 at this time)
12:55:15  update-table 0 free (skipped)
12:55:15  update-table 3239 engage (duplicate)
```
**Result:** Was v1 at time of test. Now on v2 — expect clean pattern.

### 4.13 Merge Table (Order 730850→730849)
```
13:21:14  order-engage 730850 engage (source)
13:21:14  order-engage 730849 engage (target)
13:21:15  update-order-target 730849, f_order_status=1, {payload}
13:21:15  update-order-source 730850, f_order_status=3, {payload}
```
**Result:** v2 CLEAN. Both orders locked. Source cancelled.

### 4.14 Transfer Food (Order 730849→730850)
```
13:28:17  order-engage 730849 engage (source)
13:28:17  order-engage 730850 engage (target)
13:28:17  update-order-target 730850, f_order_status=1, {payload}
13:28:17  update-order-source 730849, f_order_status=1, {payload}
```
**Result:** v2 CLEAN. Both locked. Source stays active (fewer items).

---

## 5. Risk Register (Final)

| # | Risk | Level | Status | Evidence |
|---|------|-------|--------|----------|
| R1 | Double fire: `update-order-paid` + `update-order-status` for collect bill | LOW | ✅ **ELIMINATED** | Test 4.1, 4.2, 4.3 — no `update-order-status` fires |
| R2 | `update-table free` on collect bill | UNKNOWN | ✅ **ELIMINATED** | Test 4.1, 4.2, 4.3 — no table events at all |
| R3 | BUG-216 removal breaks cancel food | MEDIUM | ✅ **ELIMINATED** | Test 4.7 — cancel food v2 is CLEAN, no `update-table free` |
| R4 | Collect bill local `setTableEngaged` → permanent lock | HIGH | ⚠️ **CONFIRMED but fixable** | No `update-table free` to undo local lock. Fix: remove local engage, handle in `update-order-paid` handler |
| R5 | Transfer food last item → source cancelled | LOW | ❓ **NOT YET TESTED** | Need test with single-item order |
| R6 | Walk-in collect bill table events | LOW | ✅ **ELIMINATED** | Test 4.2, 4.3 — identical to dine-in |

---

## 6. Backend Changes Needed

### One Endpoint to Fix: `order-status-update`

Used by 3 flows that are still v1 DIRTY:
- Cancel Order (`order_status: "cancelled"`)
- Mark Ready (`order_status: "ready"`)
- Mark Served (`order_status: "serve"`)

**Current behavior:**
```
Socket: update-table free (cancel only, wrong)
Socket: update-order-status {orderId} {f_order_status} — no payload
Frontend: GET API call (1-3 seconds)
```

**Required behavior (match v2 pattern):**
```
Socket: order-engage {orderId} engage
Socket: update-order {orderId} {f_order_status} {full_payload}
   OR: update-order-cancelled / update-order-ready / update-order-served (dedicated events)
No update-table free
No GET API needed
```

### `food-status-update` Endpoint

Used for item-level status changes (confirm order, mark item ready/served).

**Current behavior:** `update-food-status` or `update-order-status` — no payload, GET API required.

**Required:** Same v2 pattern — `order-engage` + data event with payload.

### Summary for Backend Team

| Endpoint | Current Socket | Needed Socket | Priority |
|----------|---------------|--------------|----------|
| `order-status-update` (cancel/ready/serve) | `update-order-status` (no payload) + `update-table free` (cancel) | `order-engage` + `update-order` (with payload). No `update-table free` | **P0** — 3 flows depend on this |
| `food-status-update` (item-level) | `update-food-status` (no payload) | `order-engage` + `update-order` (with payload) | **P1** |

---

## 7. Frontend Implementation Plan

### What Needs to Be Built (for 8 v2 CLEAN flows)

#### Step 1: `socketEvents.js` — Add 3 event constants
```
UPDATE_ORDER_TARGET: 'update-order-target'
UPDATE_ORDER_SOURCE: 'update-order-source'
UPDATE_ORDER_PAID:   'update-order-paid'
```

#### Step 2: `socketHandlers.js` — Unified handler

One `handleOrderDataEvent(message, context, eventName)` covering all v2 data events:

**Strategy per event:**

| Event | Transform | Action | Table Change Detection | Release |
|-------|-----------|--------|----------------------|---------|
| `update-order` | payload → order | `updateOrder()` | No | `setOrderEngaged(false)` |
| `update-order-target` | payload → order | `updateOrder()` | Yes — compare old vs new tableId | `setTableEngaged(false)` or `setOrderEngaged(false)` |
| `update-order-source` | payload → order | If cancelled/paid → `removeOrder()`. Else → `updateOrder()` | No | `setOrderEngaged(false)` |
| `update-order-paid` | payload → order | `removeOrder()` + `updateTableStatus('available')` | No | `setOrderEngaged(false)` |

**Table change detection (for Switch Table):**
```
oldOrder = getOrderById(orderId)
newOrder = transform(payload)
if (oldOrder.tableId !== newOrder.tableId):
  if (oldOrder.tableId && oldOrder.tableId !== 0):
    updateTableStatus(oldTableId, 'available')
    setTableEngaged(oldTableId, false)
```

**tableId=0 guard:** All `updateTableStatus` and `setTableEngaged` calls skip tableId=0.

**GET API fallback:** If no payload in message, fall back to `fetchOrderWithRetry()` (backwards compat for any v1 events).

#### Step 3: `socketHandlers.js` — BUG-216 fix

`handleUpdateTable` for `free` status:
```
if (status === 'free'):
  → Log and ignore. Table status derived from order data.
```

No v2 flow sends `update-table free`. Only v1 cancel sends it (incorrectly). Once backend fixes `order-status-update`, no flow will send it.

#### Step 4: `useSocketEvents.js` — Wire new events

```
case 'update-order':
case 'update-order-target':
case 'update-order-source':
case 'update-order-paid':
  handleOrderDataEvent(args, actionsRef.current, eventName);
  break;
```

#### Step 5: `OrderContext.jsx` — Add `waitForOrderEngaged()`

Same pattern as `waitForTableEngaged` — poll `engagedOrdersRef` until orderId appears.

#### Step 6: `OrderEntry.jsx` — Update wait/engage logic

| Handler | Current | New |
|---------|---------|-----|
| `handlePlaceOrder` (update, line 423) | `waitForTableEngaged(tableId)` | `waitForOrderEngaged(orderId)` |
| `handleShift` (line 518) | Fire & close | `waitForTableEngaged(destTableId)` |
| `handleMerge` (line 505) | Fire & close | `waitForOrderEngaged(targetOrderId)` |
| `handleTransfer` (line 494) | Fire & close | `waitForOrderEngaged(sourceOrderId)` |
| Collect bill (line 792) | `setTableEngaged(tableId, true)` (local) | Remove local engage — `order-engage` handles lock |
| `handleCancelFood` (line 540) | `waitForTableEngaged(tableId)` | `waitForOrderEngaged(orderId)` — now v2, order-level |

---

## 8. What Stays Unchanged (v1 handlers for remaining 3 dirty flows)

| Handler | File | Why Keep |
|---------|------|----------|
| `handleUpdateOrderStatus` | `socketHandlers.js` | Cancel Order, Mark Ready, Mark Served still v1 — need GET API |
| `handleUpdateFoodStatus` | `socketHandlers.js` | Item-level status still v1 — need GET API |
| `handleScanNewOrder` | `socketHandlers.js` | QR orders — v1, need GET API |
| `handleDeliveryAssignOrder` | `socketHandlers.js` | Delivery — v1, need GET API |
| `fetchOrderWithRetry` | `socketHandlers.js` | Used by all v1 handlers + GET fallback in unified handler |

---

## 9. Files to Change

| File | Phase | Changes |
|------|-------|---------|
| `socketEvents.js` | 1 | Add 3 new event constants |
| `socketHandlers.js` | 1 | New unified `handleOrderDataEvent()` + BUG-216 fix (ignore `free`) |
| `useSocketEvents.js` | 1 | Wire 4 events to unified handler |
| `OrderContext.jsx` | 2 | Add `waitForOrderEngaged()` |
| `OrderEntry.jsx` | 2 | Update wait/engage patterns in 6 handlers |

---

## 10. Rollback Plan

- Phase 1 (socket handlers) and Phase 2 (OrderEntry) are independently deployable
- BUG-216 fix: if any v1 cancel flow breaks, restore `free→engage` line (1-line revert)
- New event handlers: old events still processed by existing handlers — additive change
- `waitForOrderEngaged`: if timeouts occur, revert to fire-and-close (existing behavior)

---

## 11. Endpoints Reference (Current)

| Flow | Constant | Endpoint | Version | Method |
|------|----------|----------|---------|--------|
| Place Order | `PLACE_ORDER` | `/api/v2/vendoremployee/order/place-order` | v2 | POST |
| Update Order | `UPDATE_ORDER` | `/api/v2/vendoremployee/order/update-place-order` | v2 | PUT |
| Switch Table | `ORDER_TABLE_SWITCH` | `/api/v2/vendoremployee/order/order-table-room-switch` | v2 | POST |
| Merge Table | `MERGE_ORDER` | `/api/v2/vendoremployee/order/transfer-order` | v2 | POST |
| Transfer Food | `TRANSFER_FOOD` | `/api/v2/vendoremployee/order/transfer-food-item` | v2 | POST |
| Collect Bill | `BILL_PAYMENT` | `/api/v2/vendoremployee/order/order-bill-payment` | v2 | POST |
| Cancel Food | `CANCEL_ITEM` | `/api/v2/vendoremployee/order/cancel-food-item` | v2 | PUT |
| Cancel Order / Ready / Served | `ORDER_STATUS_UPDATE` | `/api/v2/vendoremployee/order-status-update` | v2 | PUT |
| Food Status | `FOOD_STATUS_UPDATE` | `/api/v2/vendoremployee/food-status-update` | v2 | PUT |
| Get Single Order | `SINGLE_ORDER_NEW` | `/api/v2/vendoremployee/get-single-order-new` | v2 | POST |

---

## 12. GET Single Order Callers

| # | Caller | File | Trigger | Needed After v2? |
|---|--------|------|---------|-----------------|
| 1 | `handleOrderDataEvent` (fallback) | `socketHandlers.js` | Any data event without payload | Keep (backwards compat) |
| 2 | `handleUpdateFoodStatus` | `socketHandlers.js` | `update-food-status` | Keep until backend adds payload |
| 3 | `handleUpdateOrderStatus` | `socketHandlers.js` | `update-order-status` | Keep until backend fixes `order-status-update` |
| 4 | `handleScanNewOrder` | `socketHandlers.js` | `scan-new-order` | Keep until backend adds payload |
| 5 | `handleDeliveryAssignOrder` | `socketHandlers.js` | `delivery-assign-order` | Keep until backend adds payload |
| 6 | OrderEntry (Split Bill) | `OrderEntry.jsx` | After split API response | Keep (deliberate fetch, not socket) |
| 7 | Report Detail Sheet | `reportService.js` | UI detail view | Keep (not socket related) |

---

## 13. Test Execution Tracker

| # | Test | Date | Logs? | Result | Risks |
|---|------|------|-------|--------|-------|
| 1 | Collect Bill dine-in (cash) | Apr 13 | ✅ | CLEAN — `order-engage` + `update-order-paid`. No double fire. | R1 ✅, R2 ✅ |
| 2 | Collect Bill walk-in (cash) | Apr 13 | ✅ | CLEAN — identical to dine-in. | R6 ✅ |
| 2b | Collect Bill delivery (cash) | Apr 13 | ✅ | CLEAN — identical. | R6 ✅ |
| 3 | Cancel food partial (walk-in, v1) | Apr 13 | ✅ | v1 DIRTY — `update-table 0 free` + `update-order-status` + GET. | R3 partial |
| 3b | Cancel food full (walk-in, v1) | Apr 13 | ✅ | v1 DIRTY — same pattern. | R3 partial |
| 3c | Cancel food partial (dine-in, v1) | Apr 13 | ✅ | v1 DIRTY — BUG-216 saves it. 1 sec GET. | R3 confirmed |
| 3d | Cancel food partial (dine-in, v2!) | Apr 13 | ✅ | **v2 CLEAN!** `order-engage` + `update-order` with payload. No `update-table free`. No GET. | R3 ✅ ELIMINATED |
| 4 | Cancel food last item (walk-in, v1) | Apr 13 | ✅ | v1 DIRTY — GET returns cancelled, removeOrder. | — |
| 5 | Cancel full order (dine-in) | Apr 13 | ✅ | v1 DIRTY — 2× `update-table free` + `update-order-status` + GET. | — |
| 6 | Transfer food last item | — | ❌ | Not yet tested | R5 |
| 7 | Mark Ready | Apr 13 | ✅ | v1 DIRTY — `update-order-status` only, no lock, GET 1 sec. | — |
| 8 | Switch Table table→table | Apr 13 | ✅ | v2 CLEAN — 2× `update-table engage` + `update-order-target`. | — |
| 9 | Switch Table walk-in→table | Apr 13 | ✅ | v1 at test time, now v2. | — |
| 10 | Merge Table | Apr 13 | ✅ | v2 CLEAN — 2× `order-engage` + `target` + `source`. | — |
| 11 | Transfer Food | Apr 13 | ✅ | v2 CLEAN — identical to merge pattern. | — |


---

## 14. BLOCKER BUG: `food_details: null` in ALL Socket Payloads

**Status:** P0 BLOCKER — Backend Socket Team
**Found:** April 13, 2026
**Affects:** ALL v2 socket events (`new-order`, `update-order`, `update-order-target`, `update-order-source`, `update-order-paid`)

### Problem
Socket payload `orderDetails[].food_details` is `null` for every item. GET single order API returns it correctly. This causes "Unknown Item" on all order cards populated from socket data.

### Evidence (Order 730885)
```
Socket:  orderDetails[0].food_details = null
GET API: orderDetails[0].food_details = { id: 62170, name: "3 pc FRIED WINGS", price: 297, tax: 5, tax_type: "GST", ... }
```

All 5 items in the order have `food_details: null`.

### Impact
- Item names show "Unknown Item"
- Item tax info missing (percentage, type, calculation)
- Item food_id missing (needed for cancel, transfer)
- Available variations/addons from catalog missing
- ALL v2 socket-first flows affected — every order card populated from socket

### What Frontend Transform Expects
```
detail.food_details?.name    → item name
detail.food_details?.id      → food catalog ID
detail.food_details?.tax     → tax percentage
detail.food_details?.tax_type → "GST" / "VAT"
```

### Backend Action Required
Populate `food_details` object in socket payload `orderDetails[]` — same data structure as GET single order API response (`/api/v2/vendoremployee/get-single-order-new`).

### Frontend Workaround (Parked)
If backend fix is delayed: background GET API call after socket payload to enrich `food_details`. This defeats the zero-GET purpose but restores item names. Not implementing until backend confirms timeline.
