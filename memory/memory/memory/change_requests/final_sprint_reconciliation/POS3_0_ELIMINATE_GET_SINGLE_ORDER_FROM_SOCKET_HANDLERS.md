# POS3.0 — Eliminate `get-single-order-new` API Calls from Socket Handlers

**Date:** 2026-05-18
**Author:** QA Regression Agent (owner-requested investigation)
**Status:** Ready for POS3.0 sprint planning

---

## Problem

Every mark-ready / mark-served / cancel-single-item action triggers **two** socket events, causing a redundant API call:

1. **`update-item-status`** (new v2 event) — carries full order payload at index 4 → FE uses it directly, **no API call**
2. **`update-food-status`** (legacy event) — carries NO payload → FE calls `get-single-order-new` API to fetch the same data that already arrived in step 1

**Result:** Every item status change fires a wasted `POST /api/v2/vendoremployee/get-single-order-new` round-trip that does nothing useful — the order is already updated from `update-item-status`.

**Evidence:** Browser console screenshot (2026-05-18, restaurant 478, order 868614) confirms backend sends `update-item-status` with full `{ orders: [...], cancelled_items, newly_added_items }` payload for item-level actions.

---

## What to do

### Action 1 — Stop calling API on `update-food-status` for item actions

**File:** `api/socket/socketHandlers.js` → `handleUpdateFoodStatus` (L344-401)

This handler calls `fetchOrderWithRetry(orderId)` → `get-single-order-new` on every `update-food-status` event. Since `update-item-status` (handled by `handleOrderDataEvent` at L229) already processes the same action with full payload and no API call, the `update-food-status` handler is fully redundant for ready/served/cancel-item.

**Options:**
- **Option A (safe):** Remove the `handleUpdateFoodStatus` handler entirely. Stop listening to `update-food-status`. All item-level actions are already covered by `update-item-status`.
- **Option B (conservative):** Keep listening to `update-food-status` but skip the API call — just log it as a no-op. Safety net in case `update-item-status` fails to fire for some edge case.

### Action 2 — Migrate room transfer to stop emitting `update-food-status`

**Backend change required.**

Room transfer (`order-shifted-room`) is the only known action that emits `update-food-status` but does NOT emit `update-item-status`. This is already documented as a backend bug (BUG-060 / POS3.0 carry-forward item #1).

**Backend should:** Emit `update-order-paid` (or `update-item-status`) with full payload after `order-shifted-room`, instead of `update-food-status`.

**Once backend migrates this:** `handleUpdateFoodStatus` can be deleted entirely.

### Action 3 — Migrate `delivery-assign-order` (low priority)

**File:** `api/socket/socketHandlers.js` → `handleDeliveryAssignOrder` (L535-553)

Same pattern — backend sends `[delivery-assign-order, orderId, restaurantId, riderId]` with no order payload. FE calls `get-single-order-new` to get the full order.

**Backend should:** Include full order payload in `delivery-assign-order` (same shape as `update-order`). Then FE handler can use `handleOrderDataEvent` pattern — no API call.

**Priority:** Low — this event only fires when a rider is assigned to a delivery order. Much less frequent than item status changes.

---

## Files affected

| File | Change |
|---|---|
| `api/socket/socketHandlers.js` | Remove or gut `handleUpdateFoodStatus` (L344-401); optionally remove `handleDeliveryAssignOrder` (L535-553) after backend migration |
| `api/socket/socketEvents.js` | Move `UPDATE_FOOD_STATUS` from `EVENTS_REQUIRING_ORDER_API` to deprecated / remove; same for `DELIVERY_ASSIGN_ORDER` after migration |
| `api/socket/useSocketEvents.js` | Remove `case SOCKET_EVENTS.UPDATE_FOOD_STATUS` (L137-138); update `DELIVERY_ASSIGN_ORDER` case after migration |
| `api/services/orderService.js` | `fetchSingleOrderForSocket` becomes unused after all socket handlers stop calling it — can be deleted |
| `hooks/useStationSocketRefresh.js` | Update comment at L13 (defensive wiring note for `update-food-status`) |

---

## Impact

| Metric | Before | After |
|---|---|---|
| API calls per item status change | 1 (redundant) | 0 |
| Latency per item update | ~200-500ms extra (API round-trip) | Eliminated |
| Double-render per item change | Yes (socket then API) | No (socket only) |
| `get-single-order-new` calls from socket handlers | 2 event types | 0 event types |

---

## Dependencies

| Action | Depends on |
|---|---|
| Action 1 (stop API on update-food-status) | Nothing — can be done immediately on FE |
| Action 2 (room transfer migration) | Backend emitting correct event with payload |
| Action 3 (delivery-assign migration) | Backend adding payload to delivery-assign-order |

**Action 1 is a pure FE change with zero backend dependency. It can ship independently.**

---

## Remaining `get-single-order-new` calls (cannot be eliminated by socket)

These 5 calls are report/audit page drill-downs into historical/completed orders — socket only carries live running orders, so these always need an API call:

1. `CollectBillPanelDrawer` — Hold tab → Collect Bill drawer
2. `OrderDetailSheet` — Audit Report row expand
3. `AllOrdersReportPage.handlePrintBillFromAudit` — Audit Report Print Bill
4. `RoomRowCard` — Room report per-row folio
5. `reportService.getRoomOrdersReport` — Room list folio fetches for SRM badge

These are not targets for this optimization.
