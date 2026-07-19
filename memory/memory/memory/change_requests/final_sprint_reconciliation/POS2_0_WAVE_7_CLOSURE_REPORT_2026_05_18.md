# POS2.0 Wave 7 Closure Report — 2026-05-18

## 1. Purpose

Closure report for Wave 7 (Constraint Resolution + Investigation). Documents final status of all bugs.

---

## 2. Bug Status Summary

| Bug | Description | Status | Notes |
|---|---|---|---|
| BUG-060 | Source table not clearing after room transfer | ✅ FIXED (TEMPORARY FE FIX) | Backend should emit `update-order-paid` instead of `update-food-status` after `order-shifted-room` |
| BUG-061 | Room check-in time not showing for in-house rooms | ✅ FIXED | `detail.createdAt` used as fallback for check-in time |
| BUG-058 | Prepaid hold settlement / PayLater badge | ⏸️ DEFERRED | Needs deeper investigation — PAID badge logic + PayLater flow needs backend alignment |

---

## 3. BUG-060 — Details

**Root cause:** Backend emits `update-food-status` socket events after `order-shifted-room`. The `handleUpdateFoodStatus` handler had no terminal-status check — always called `updateOrder()`, never `removeOrder()`, even when `f_order_status = 6` (paid). This kept the order alive in FE context and the table showed stale data.

**Temporary FE fix (2 layers):**
1. `OrderEntry.jsx` L1461-1475: Optimistic `removeOrder()` + `updateTableStatus('available')` + `setTableEngaged(false)` after successful POST
2. `socketHandlers.js` L344, L371-387: Terminal-status check in `handleUpdateFoodStatus` — paid/cancelled orders now call `removeOrder()` instead of `updateOrder()`

**Backend action item:** After `order-shifted-room`, emit `update-order-paid` or `update-order` (with terminal payload) instead of `update-food-status`. This routes through `handleOrderDataEvent` which already has proper terminal handling.

**Owner verification:** PASSED ✅

---

## 4. BUG-061 — Details

**Root cause:** `/get-room-list` returns no date fields for live (in-house) rooms. `roomListTransform` sets `checkInDateTime: null`. The detail fetch may not return `room_info.checkin_date` for in-house rooms.

**Fix:** Extended `displayCheckInIso` fallback chain in `RoomRowCard.jsx` L430-433:
```
detail.roomInfo.checkInDate → row.checkInDateTime → detail.createdAt → null
```
Owner confirmed: order `created_at` = check-in time.

**Owner verification:** PASSED ✅

---

## 5. BUG-058 — Details

**Status:** DEFERRED for further investigation.

**Work done (kept in codebase):**
- `orderTransform.js` `collectBillExisting`: Accepts optional `paymentType` in options, emits `payment_type` in payload when provided
- `CollectBillPanelDrawer.jsx`: Passes `paymentType: 'postpaid'` for hold-tab settle
- `orderTransform.js` `placeOrderWithPayment`: PayLater sends `payment_status: 'sucess'` (matching postpaid contract)
- `OrderCard.jsx`, `TableCard.jsx`, `ScanOrderPopOut.jsx`, `DashboardPage.jsx`: PayLater excluded from prepaid badge/settle logic
- `DashboardPage.jsx`: `paymentMethod` added to all table entry creation points

**Remaining issue:** PAID badge still shows for PayLater orders. Needs deeper investigation into how `paymentType` flows from backend response through socket events to the dashboard. The `paymentMethod` field availability on table entries may not be sufficient — the socket-delivered order data may not carry the correct field.

**Owner decision:** Defer, investigate later.

---

## 6. Files Modified in Wave 7

| File | Bugs | Change Summary |
|---|---|---|
| `OrderEntry.jsx` | BUG-060 | Optimistic context clearing after room transfer |
| `socketHandlers.js` | BUG-060 | Terminal-status check in `handleUpdateFoodStatus` |
| `RoomRowCard.jsx` | BUG-061 | `createdAt` fallback for check-in time |
| `orderTransform.js` | BUG-058 | `paymentType` option in `collectBillExisting`; PayLater `payment_status` in `placeOrderWithPayment` |
| `CollectBillPanelDrawer.jsx` | BUG-058 | `paymentType: 'postpaid'` for hold-tab settle |
| `OrderCard.jsx` | BUG-058 | PayLater excluded from PAID badge + Settle button |
| `TableCard.jsx` | BUG-058 | PayLater excluded from PAID badge + Settle button |
| `ScanOrderPopOut.jsx` | BUG-058 | PayLater excluded from PAID badge + payment label |
| `DashboardPage.jsx` | BUG-058, BUG-060 | `paymentMethod` passed to table entries; PayLater excluded from prepaid serve path |

---

## 7. Backend Action Items

1. **BUG-060:** Emit `update-order-paid` (not `update-food-status`) after `order-shifted-room` endpoint
2. **BUG-058:** Align PayLater flow — clarify whether PayLater+prepaid orders should appear as "PAID" on dashboard or not; clarify `payment_type` contract for PayLater orders
3. **BUG-061:** (Optional) Include `room_info.checkin_date` in `get-single-order-new` response for in-house rooms

---

*— End of POS2.0 Wave 7 Closure Report — 2026-05-18 —*
