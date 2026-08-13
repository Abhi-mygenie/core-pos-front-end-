# POS3.0 — Room Transfer: Migrate to v2 Endpoint + Socket Payload

**Date:** 2026-05-18
**Author:** QA Regression Agent (owner-requested investigation)
**Status:** Ready for POS3.0 sprint planning
**Related:** POS3.0 carry-forward BUG-060, `POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md`

---

## Current State

### Endpoint
FE calls **v1**: `POST /api/v1/vendoremployee/order-shifted-room`

### Payload sent by FE (built by `orderTransform.toAPI.transferToRoom`)
```
{
  order_id, payment_mode, payment_amount, payment_status: 'paid',
  room_id, order_discount, self_discount, comm_discount,
  tip_amount, vat_tax, gst_tax, service_tax,
  service_gst_tax_amount, tip_tax_amount
}
```

**File:** `orderTransform.js` L1344-1377
**Caller:** `OrderEntry.jsx` L1465-1467

### What happens after the POST
1. FE does **optimistic clearing** (BUG-060 Wave 7 fix):
   - `removeOrder(sourceOrderId)` — removes order from dashboard
   - `updateTableStatus(sourceTableId, 'available')` — frees source table
   - `setTableEngaged(sourceTableId, false)` — releases engage lock
   
   **File:** `OrderEntry.jsx` L1469-1483

2. Backend emits **`update-food-status`** (legacy, no payload):
   - `[update-food-status, orderId, restaurantId, fOrderStatus]`
   - FE handler (`handleUpdateFoodStatus`) calls `get-single-order-new` API
   - The guard at L356 skips re-adding because order was already removed in step 1
   - **Net effect:** Wasted API call that does nothing

### Problems with current state
1. **Wrong endpoint version** — v1 instead of v2
2. **Wrong socket event** — backend emits `update-food-status` (no payload) instead of a v2 event with full data
3. **Wasted API call** — `handleUpdateFoodStatus` fires, calls API, but the order is already gone from context
4. **Optimistic FE workaround** — FE has to guess the correct post-transfer state because it never gets authoritative backend data via socket

---

## Target State

### Endpoint
FE calls **v2**: `POST /api/v2/vendoremployee/order/order-shifted-room`

### Socket event after transfer
Backend emits a **v2 data event** (e.g. `update-order-paid` or `update-item-status` or `update-order`) with full order payload:
```
['update-order-paid', orderId, restaurantId, fOrderStatus, { orders: [...] }]
```
This is already handled by `handleOrderDataEvent` — no API call, no special code needed.

### What changes

| Component | Current | Target |
|---|---|---|
| **Endpoint** | `POST /api/v1/vendoremployee/order-shifted-room` | `POST /api/v2/vendoremployee/order/order-shifted-room` |
| **Socket event from backend** | `update-food-status` (no payload) | `update-order-paid` or `update-order` (with full payload) |
| **FE socket handler** | `handleUpdateFoodStatus` → API call → skipped | `handleOrderDataEvent` → uses socket data → removes order (terminal status) |
| **Optimistic FE clearing** (BUG-060) | Required (L1469-1483) | Can be removed — socket handler will do the removal authoritatively |
| **API call on socket** | Yes (`get-single-order-new`) | No |

---

## FE Changes Required

### 1. Update endpoint constant
**File:** `api/constants.js` L50
```
// Before
ORDER_SHIFTED_ROOM: '/api/v1/vendoremployee/order-shifted-room',

// After
ORDER_SHIFTED_ROOM: '/api/v2/vendoremployee/order/order-shifted-room',
```

### 2. Review payload shape
**File:** `orderTransform.js` L1344-1377 (`toAPI.transferToRoom`)

v2 endpoint may accept a different payload shape. **Backend team must confirm** whether the v2 endpoint accepts the same keys or needs changes (e.g. nested structure, different field names).

### 3. Remove optimistic FE clearing (after socket migration confirmed)
**File:** `OrderEntry.jsx` L1469-1483

Once backend sends a v2 socket event with full payload after room transfer, the `handleOrderDataEvent` handler will:
- Detect terminal status (`paid`) at L289
- Call `removeOrder(orderId)` at L303
- Call `syncTableStatus(order, updateTableStatus, 'available')` at L301

This is the **same logic** that already works for bill collection, prepaid settle, and every other terminal event. The optimistic clearing block at L1469-1483 becomes redundant and can be removed.

**However:** Keep the optimistic clearing until the v2 socket event is confirmed working in production. Removing it prematurely would regress BUG-060.

### 4. Remove `handleUpdateFoodStatus` entirely (after all migrations)
**File:** `socketHandlers.js` L344-401

Once room transfer is the last consumer of `update-food-status` and it's migrated:
- Delete `handleUpdateFoodStatus`
- Remove `UPDATE_FOOD_STATUS` from event listeners
- Remove from `EVENTS_REQUIRING_ORDER_API`
- Delete `fetchSingleOrderForSocket` from `orderService.js` (if no other consumers)

This is detailed in the companion doc `POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md`.

---

## Backend Requirements (for backend team)

| # | Requirement |
|---|---|
| 1 | v2 endpoint `POST /api/v2/vendoremployee/order/order-shifted-room` must be live and accept the transfer payload |
| 2 | Confirm payload shape — same keys as v1, or different? |
| 3 | After successful transfer, emit a v2 socket event (`update-order-paid` or `update-order`) with full order payload (`{ orders: [...] }`) — same shape as other v2 events |
| 4 | Stop emitting `update-food-status` for room transfers (or keep it for backward compat — FE will ignore it once migrated) |
| 5 | The transferred order's `f_order_status` should be terminal (6 = paid) so FE correctly removes it from dashboard |

---

## Recommended Implementation Sequence

| Step | Owner | Description |
|---|---|---|
| 1 | Backend | Confirm v2 endpoint is live + payload shape + socket event |
| 2 | FE | Update endpoint constant to v2 |
| 3 | FE | Adjust payload builder if v2 shape differs |
| 4 | FE + QA | Test room transfer end-to-end: transfer → socket arrives with payload → order removed from dashboard → source table freed |
| 5 | FE | Remove optimistic clearing block (L1469-1483) once socket-driven removal is confirmed |
| 6 | FE | Remove `handleUpdateFoodStatus` + cleanup (per companion doc) |

---

## Risk

| Risk | Mitigation |
|---|---|
| v2 endpoint payload shape differs from v1 | Backend confirms shape before FE changes |
| v2 socket event not emitted or wrong shape | Keep optimistic clearing as fallback until confirmed |
| Other flows still emit `update-food-status` | Already verified: only room transfer uses it post-`update-item-status` migration |
| Regression on source table not freeing | Covered by existing BUG-060 QA checklist in POS2.0 regression report |

---

## Files Reference

| File | Lines | What |
|---|---|---|
| `api/constants.js` | L50 | Endpoint URL |
| `api/transforms/orderTransform.js` | L1344-1377 | `toAPI.transferToRoom` payload builder |
| `components/order-entry/OrderEntry.jsx` | L1463-1498 | Room transfer call site + optimistic clearing |
| `api/socket/socketHandlers.js` | L344-401 | `handleUpdateFoodStatus` (to be removed) |
| `api/socket/socketHandlers.js` | L229-325 | `handleOrderDataEvent` (already handles v2 events correctly) |
| `api/socket/socketEvents.js` | L59, L119 | `UPDATE_FOOD_STATUS` event definition + category |
| `api/socket/useSocketEvents.js` | L137-138 | `UPDATE_FOOD_STATUS` case in event router |
