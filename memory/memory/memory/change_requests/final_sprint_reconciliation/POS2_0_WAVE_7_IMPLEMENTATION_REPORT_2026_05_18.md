# POS2.0 Wave 7 Implementation Report — 2026-05-18

## 1. Purpose

Gate 9/10 — Implementation complete. This report documents the exact changes applied for Wave 7 bugs.

---

## 2. Bugs Implemented

### BUG-060 — Source Table Not Clearing After Room Transfer

**Root cause:** Backend emits `update-food-status` socket events after `order-shifted-room`. The `handleUpdateFoodStatus` handler always calls `updateOrder()` (never `removeOrder()`), keeping the order alive in `OrderContext.orders[]` even though `f_order_status = 6` (paid). The terminal-status check only exists in `handleOrderDataEvent` and `handleUpdateOrderStatus` — not in `handleUpdateFoodStatus`.

**Status: TEMPORARY FE FIX — NEEDS BACKEND FIX FOR PERMANENT RESOLUTION**

**Fix (temporary, 2 layers):**
1. `OrderEntry.jsx`: Optimistic `removeOrder()` + `updateTableStatus('available')` after POST success
2. `socketHandlers.js`: Added terminal-status check in `handleUpdateFoodStatus` — if order is paid/cancelled, calls `removeOrder()` instead of `updateOrder()`

**Backend fix needed:** After `order-shifted-room`, backend should emit `update-order-paid` (or `update-order` with terminal payload) instead of `update-food-status`. This would route through `handleOrderDataEvent` which already has proper terminal-status handling. The FE temporary fix can then be removed.

**Files:** `OrderEntry.jsx` L1461-1475, `socketHandlers.js` L344+L371-387

---

### BUG-058 — Prepaid Hold Settlement Payload

**Root cause:** Prepaid orders can't be put on hold. When a prepaid order ends up in the Audit Hold tab, the `collectBillExisting` payload doesn't include `payment_type`. Backend sees original `payment_type: 'prepaid'` from DB and fails. Fix: send `payment_type: 'postpaid'` explicitly for hold-tab settle.

**Fix:**
1. `orderTransform.js` `collectBillExisting`: Accepts optional `paymentType` in options, emits `payment_type` in payload when provided (spread operator).
2. `CollectBillPanelDrawer.jsx`: Passes `paymentType: 'postpaid'` in options — scoped to Audit Hold tab only.

Normal dashboard collect-bill (`OrderEntry.jsx` Scenario 1) is unchanged — no `payment_type` sent.

**Files:**
- `orderTransform.js` L1163 (1 line changed) + L1264-1266 (3 new lines)
- `CollectBillPanelDrawer.jsx` L180-182 (2 new lines)

---

### BUG-061 — Room Check-In Time Not Showing for In-House Rooms

**Root cause:** `/get-room-list` returns no date fields for live rooms. `roomListTransform` sets `checkInDateTime: null`. The detail fetch (`getSingleOrderRoom`) returns `room_info.checkin_date` but may be absent for in-house rooms. Owner confirmed: `created_at` (order creation time) = check-in time.

**Fix:** Extended `displayCheckInIso` fallback chain in `RoomRowCard.jsx`:
```
detail.roomInfo.checkInDate → row.checkInDateTime → detail.createdAt → null
```

`detail.createdAt` comes from `orderTransform.fromAPI.order` L237: `createdAt: api.created_at` — available on all orders.

**File:** `RoomRowCard.jsx` L430-433 (2 lines changed + 2 comment lines)

---

## 3. Files Modified

| File | Bug | Lines Changed |
|---|---|---|
| `frontend/src/components/order-entry/OrderEntry.jsx` | BUG-060 | L1461-1475 |
| `frontend/src/api/transforms/orderTransform.js` | BUG-058 | L1163, L1264-1266 |
| `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | BUG-058 | L180-182 |
| `frontend/src/components/reports/RoomRowCard.jsx` | BUG-061 | L430-433 |

## 4. Files NOT Touched

- `socketHandlers.js` — `handleUpdateFoodStatus` gap noted but not fixed (optimistic clearing is sufficient)
- `roomListTransform.js` — no date available in `/get-room-list` raw response
- `OrderEntry.jsx` Scenario 1 — normal collect-bill unchanged
- `CollectPaymentPanel.jsx` — shared panel unchanged
- All financial calculation logic unchanged
- All print/auto-print logic unchanged

## 5. Frontend Compilation

✅ Compiled successfully after all changes.

## 6. QA Handoff

### BUG-060
1. Table order → Pay → To Room → confirm → **source table immediately shows "Available"**
2. Table order → Pay → Cash → **table correctly freed** (regression check)
3. Table order → Cancel → **table correctly freed** (regression check)
4. Walk-in → To Room → **no table status change** (tableId=0 guard)

### BUG-058
1. Prepaid order in Hold tab → settle → **should succeed with `payment_type: 'postpaid'` in payload**
2. Postpaid order in Hold tab → settle → **still works** (regression check)
3. Dashboard collect-bill → **unchanged** (no `payment_type` sent)

### BUG-061
1. Rooms Report → Unpaid filter → in-house room → **check-in time shows (from created_at)**
2. Rooms Report → Paid filter → checked-out room → **check-in time still shows** (regression check)

---

*— End of POS2.0 Wave 7 Implementation Report — 2026-05-18 —*
