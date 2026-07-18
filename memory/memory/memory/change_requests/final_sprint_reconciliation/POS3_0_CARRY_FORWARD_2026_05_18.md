# POS3.0 Carry-Forward Document

## 1. Purpose

Items not resolved in POS2.0 sprint, carried forward to POS3.0 for planning and implementation.

---

## 2. Critical Carry-Forward (1 bug)

### BUG-058 — PayLater PAID Badge + Prepaid Hold Settle
**Priority:** 🔴 CRITICAL

**Problem:** When a PayLater order is placed via the prepaid path, the dashboard card shows a "PAID" badge. The badge check is `paymentType === 'prepaid'`. PayLater orders should not show as "PAID" since payment is deferred.

**Work done in POS2.0 (kept in codebase):**
- `orderTransform.js` `placeOrderWithPayment`: PayLater sends `payment_status: 'sucess'`
- `orderTransform.js` `collectBillExisting`: Accepts optional `paymentType` in options
- `CollectBillPanelDrawer.jsx`: Passes `paymentType: 'postpaid'` for hold-tab settle
- `OrderCard.jsx`, `TableCard.jsx`, `ScanOrderPopOut.jsx`, `DashboardPage.jsx`: PayLater excluded from prepaid badge/settle logic + `paymentMethod` added to table entries

**Why not resolved:** PAID badge still shows. The `paymentMethod` field propagation from socket events to dashboard table entries needs deeper investigation. The backend `payment_type` contract for PayLater orders needs clarification.

**POS3.0 actions:**
1. Backend: Clarify `payment_type` contract for PayLater orders — should it be `'prepaid'` or `'postpaid'`?
2. FE: Trace `paymentMethod` field availability through socket → OrderContext → DashboardPage → TableCard chain
3. FE: Verify the `paymentMethod` exclusion logic works end-to-end after backend clarification

---

## 3. Future Sprint Bugs (4 bugs)

### BUG-064 — Room Transfer Notification Shows as "New Order"
**Priority:** Medium

**Problem:** When an order is transferred to a room, the dashboard notification says "New Order" with new-order sound. Should indicate "Room Transfer."

**Blocker:** Backend FCM payload has no transfer marker. Backend must add `notification_type: 'room_transfer'` (or different title) to FCM push.

**POS3.0 actions:**
1. Backend: Add transfer marker to FCM payload after `order-shifted-room`
2. FE: Read marker in `NotificationContext.processNotification` → show different message/sound

---

### BUG-069 — Sound Plays Before Order Appears on Dashboard
**Priority:** Medium

**Problem:** FCM notification sound arrives before socket delivers the order data. User hears sound but order card isn't visible yet.

**Blocker:** Architecture issue — FCM (Google push) is faster than WebSocket. Fix requires backend sequencing.

**POS3.0 actions:**
1. Backend: Either delay FCM until socket confirms, or bundle order data in FCM payload
2. FE: If order data in FCM → render immediately from notification; else → queue sound until order appears in context

---

### BUG-084 — Per-Component CGST/SGST Payload Keys
**Priority:** Low

**Problem:** Backend doesn't need per-component CGST/SGST keys this sprint. FE UI already shows correct split.

**POS3.0 actions:**
1. Backend: Confirm when per-component keys are needed
2. FE: Add individual CGST/SGST keys to payload builders when backend is ready

---

### BUG-085 — Print Template GST Display Slot
**Priority:** Low

**Problem:** Question Q-085-2 parked: does the print template have a slot for `delivery_charge_gst_amount`? If yes → bundles with BUG-083 (already done). If no → needs template update.

**POS3.0 actions:**
1. Backend: Answer Q-085-2 — does the print template support `delivery_charge_gst_amount`?
2. FE: If template supports it, no further work. If not, coordinate template update.

---

## 4. Backend Follow-Up Items (Discovered in POS2.0, Outside the 37)

| # | Source Bug | Description | Owner |
|---|---|---|---|
| 1 | BUG-060 | Emit `update-order-paid` (not `update-food-status`) after `order-shifted-room`. Current FE temp fix: optimistic clearing + terminal check in `handleUpdateFoodStatus`. | Backend |
| 2 | BUG-065 | Store CRM `customer_id` on room orders during check-in. Currently FE uses `isCustomerSelected` workaround based on name+phone presence. | Backend |
| 3 | BUG-065 | CRM search API returns duplicate entries for same phone number. Dedup needed. | CRM Backend |
| 4 | BUG-065 | Clarify phone format contract: should check-in send `+91` prefix or raw 10 digits? | Backend |
| 5 | BUG-058 | Clarify PayLater `payment_type` contract for dashboard display and hold-settle. | Backend |
| 6 | BUG-061 | Include `room_info.checkin_date` in `get-single-order-new` for in-house rooms. Currently FE uses `createdAt` fallback. | Backend (optional) |

---

## 5. Summary

| Category | Count | Bug IDs |
|---|---|---|
| 🔴 Critical carry-forward | 1 | BUG-058 |
| 📋 Future sprint | 3 | BUG-064, BUG-069, BUG-084 |
| 📋 Pending backend answer | 1 | BUG-085 |
| 🔧 Backend follow-ups (outside 37) | 6 | See §4 |
| **Total POS3.0 intake** | **5 bugs + 6 follow-ups** | |

---

*— POS3.0 Carry-Forward — Created 2026-05-18 —*
