# CR-405 — Impact Analysis (Gate 2)

**ID:** CR-405
**Title:** Room Folio — Discount at Checkout + Check-in, Partial Room Payments, Shift Dine-in to Room
**Type:** CR
**Date:** 2026-10-01
**Execution order (OD-405-01):** Phase A → Phase B → Phase D → Phase C
**Code Reality:** PARTIAL (constants declared, FolioCheckoutPanel discount button disabled, pmsService no discount fields)
**Conflict Pre-Check:** NONE — no open CR/BUG active on target files after 2026-09-24
**Risk:** HIGH (room billing, settlement, order flow — R6 at implementation)

---

## Conflict Pre-Check

| File | Last touched | Open conflict? |
|---|---|---|
| `constants.js` | BUG-451 2026-09-24 (PAGINATION, parallel-safe zone) | NONE |
| `orderTransform.js` | BUG-395 2026-09-11 | NONE |
| `CollectPaymentPanel.jsx` | BUG-360 2026-08-26 | NONE |
| `FolioCheckoutPanel.jsx` | CR-385 M6 2026-09-22 | NONE (CR-385 awaiting owner sign-off, no code change) |
| `pmsService.js` | BUG-430 2026-09-16 | NONE |
| `CheckInPage.jsx` | CR-380 2026-09-14 | NONE |

---

## Phase A — Checkout Room Discount (`room_discount_apply_to`)

### Code Reality: NONE

`FolioCheckoutPanel.jsx:52` — **disabled button already exists in UI:**
```jsx
<button type="button" disabled data-testid="bill-room-discount-btn"
  title="needs BQ-385-07" className="fd-btn ... disabled:opacity-40 disabled:cursor-not-allowed">
  Apply…
</button>
```
`title="needs BQ-385-07"` — BQ-385-07 is now answered by handover_5. Button exists, just disabled.

### Data Flow

```
FolioCheckoutPanel.jsx
  └─ RoomSection (L52): "Room discount" Apply… button (disabled)
  └─ handlePaymentComplete (L113): calls orderToAPI.collectBillExisting(...)
       └─ paymentData passed to transform

orderTransform.js:collectBillExisting (L1624–1738)
  └─ payload built — no room_discount_apply_to fields today

POST /api/v2/vendoremployee/order/order-bill-payment
```

### API Contract (handover_5 §4.4)

```
room_discount_apply_to: 'food' | 'room' | 'both'   ← required when room_discount > 0
room_discount:          number (₹)                   ← required when apply_to = room|both
room_discount_type:     'Percent' | 'Amount'         ← optional, audit
room_discount_value:    number/string                ← optional, audit (raw %)
room_discount_reason:   string | null                ← optional
```

**Validation rules (live 422):**
- `room_discount > 0` AND no `apply_to` → **422**
- `apply_to = room|both` AND `room_discount ≤ 0` → **422**

**OD-405-02 (locked):** Use existing greyed `bill-room-discount-btn` — enable it.
**OD-405-03 (locked):** UI may show %, wire always sends ₹. Type/value/reason optional.

### Edit Sites

| Edit | File | Location | Change |
|---|---|---|---|
| E-A1 | `FolioCheckoutPanel.jsx` | L52 (disabled button) | Add state `roomDiscount`, `roomDiscountApplyTo`=`'room'` (only value that cuts UID; `food`/`both` need separate UI decision). Enable button → open inline input for ₹ amount. Validate: apply_to must be set when roomDiscount > 0. |
| E-A2 | `FolioCheckoutPanel.jsx` | `handlePaymentComplete` (L113) | Pass `roomDiscount`, `roomDiscountApplyTo`, `roomDiscountType`, `roomDiscountValue`, `roomDiscountReason` into paymentData before calling collectBillExisting |
| E-A3 | `orderTransform.js` | `collectBillExisting` payload block (~L1710 after paid_room) | Emit `room_discount_apply_to`, `room_discount`, `room_discount_type`, `room_discount_value`, `room_discount_reason` from paymentData when present |

**Files WILL change:** `FolioCheckoutPanel.jsx`, `orderTransform.js`
**Files will NOT touch:** `CollectPaymentPanel.jsx`, `PmsCheckoutDrawer.jsx` (PmsCheckoutDrawer is legacy; discount via Front Desk only per OD-405-02)

### Verification Matrix (Phase A)

| # | Test | Expected |
|---|---|---|
| VA-1 | Enable room discount button in Front Desk Bill | Button active, ₹ input appears |
| VA-2 | Apply ₹100 room discount, apply_to=room, settle | HTTP 200; UID balance cut by 100 |
| VA-3 | Apply room_discount > 0 without apply_to | 422 caught client-side; user sees validation error |
| VA-4 | Settle with no room discount | No room_discount fields in payload; 200 unchanged |
| VA-5 | Non-room order settle | No room_discount fields; unaffected |

---

## Phase B — Shift Dine-in to Room (order-shifted-room v1)

### Code Reality: PARTIAL (wrong payload + wrong version)

**Current flow:**
- `CollectPaymentPanel.jsx:2792` — "To Room" button sets `paymentMethod = 'transferToRoom'`
- `CollectPaymentPanel.jsx:1187-1189` — sets `paymentData.isTransferToRoom = true`, `paymentData.roomId = selectedRoom.tableId`
- `OrderEntry.jsx:2095-2097` — calls `api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, orderToAPI.transferToRoom(...))`
- `constants.js:96` — `ORDER_SHIFTED_ROOM: '/api/v2/vendoremployee/order/order-shifted-room'` ← **wrong version**

**Current `transferToRoom` payload (orderTransform.js:1758-1775):**
```javascript
{
  order_id:         String(table.orderId),   // dine-in order → WRONG key
  room_id:          String(roomId),           // room table ID → WRONG key
  payment_mode:     method,                   // ← not needed
  payment_amount:   finalTotal,               // ← not needed
  payment_status:   'paid',                   // ← not needed
  // ... financial fields not needed
}
```

**Handover_5 §6 contract (v1):**
```json
{
  "source_order_id": <room_order_id>,     // room order RECEIVING items
  "target_order_id": <dine_in_order_id>,  // dine-in order LOSING items
  "transfer_note":   "Yes"               // optional
}
```

**Key:** `source_order_id` = room's **orderId** (NOT tableId). Room tables in the list have `orderId`. `selectedRoom.orderId` is available.

### Edit Sites

| Edit | File | Location | Change |
|---|---|---|---|
| E-B1 | `api/constants.js` | L96 | `/api/v2/` → `/api/v1/` (**Fast Lane approved OD-405-06**) |
| E-B2 | `CollectPaymentPanel.jsx` | L1189 | Also set `paymentData.roomOrderId = selectedRoom.orderId` alongside existing `paymentData.roomId = selectedRoom.tableId` |
| E-B3 | `orderTransform.js` | L1748-1775 `transferToRoom` | Rewrite to emit `{ source_order_id, target_order_id, transfer_note }` only |

**New `transferToRoom` payload:**
```javascript
transferToRoom: (table, paymentData) => ({
  // BUG-484 / CR-405-B — handover_5 §6 v1 contract
  source_order_id: String(paymentData.roomOrderId || ''),  // room's orderId (receives items)
  target_order_id: String(table.orderId),                   // dine-in orderId (loses items)
  transfer_note:   'Yes',
}),
```

**After shift:** OrderEntry.jsx already handles success (removeOrder + updateTableStatus). Settle happens separately on the room order. No change to post-shift flow needed.

**Files WILL change:** `constants.js` (E-B1, Fast Lane), `CollectPaymentPanel.jsx` (E-B2), `orderTransform.js` (E-B3)
**Files will NOT touch:** `OrderEntry.jsx` (post-shift handling already correct)

### Verification Matrix (Phase B)

| # | Test | Expected |
|---|---|---|
| VB-1 | constants.js: `ORDER_SHIFTED_ROOM` value | `/api/v1/...` |
| VB-2 | `transferToRoom(table, paymentData)` with roomOrderId=999, table.orderId=888 | `{source_order_id:"999", target_order_id:"888", transfer_note:"Yes"}` |
| VB-3 | `selectedRoom.orderId` passed in paymentData | `paymentData.roomOrderId` set correctly |
| VB-4 | Click "To Room", select room, Transfer → HTTP 200 | `{source_order_id, target_order_id, shifted_item_count}` response |
| VB-5 | Source dine-in table freed after shift | OrderEntry removes source order from dashboard |

---

## Phase D — Check-in Discount Bake

### Code Reality: NONE

`pmsService.js:pmsCheckIn` (L218-285) builds a FormData for `user-group-check-in`. No `room_discount` fields exist today.

### API Contract (handover_5 §3)

```
room_discount:        number ≥ 0 (₹)   ← optional, omit if 0
room_discount_type:   'Percent' | 'Amount'  ← optional
room_discount_value:  number/string     ← optional, audit input (10 for 10%, or flat ₹)
room_discount_reason: string | null     ← optional
```

**Backend behavior:** clamps to `balance_payment`, cuts UID, writes `at=check_in`, sets `orders.room_discount = {apply_to: "room"}`.

### Edit Sites

| Edit | File | Location | Change |
|---|---|---|---|
| E-D1 | `pmsService.js` | After L278 (gst_tax append) | Add 4 conditional fd.append calls for `room_discount`, `room_discount_type`, `room_discount_value`, `room_discount_reason` when `p.roomDiscount > 0` |
| E-D2 | `CheckInPage.jsx` | Check-in form, in the money section | Add optional "Room Discount" field (₹ input or % input with FE converts to ₹ per OD-405-03). Wire to `pmsCheckIn` params `roomDiscount`, `roomDiscountType`, `roomDiscountValue`, `roomDiscountReason` |

**Files WILL change:** `pmsService.js` (E-D1), `CheckInPage.jsx` (E-D2)
**Files will NOT touch:** `BUG-386` GST formula untouched, `BUG-396` advance/balance untouched

### Verification Matrix (Phase D)

| # | Test | Expected |
|---|---|---|
| VD-1 | Check-in with no discount | No room_discount in FormData; 200 unchanged |
| VD-2 | Check-in with ₹100 flat discount | FormData has `room_discount=100`; UID balance cut |
| VD-3 | % input in UI | FE converts to ₹ before `fd.append` |
| VD-4 | Check-in read-back after discount | `room_info.room_discount_amount=100`, `at=check_in` |

---

## Phase C — `partial_payments_room` (multi-leg room payment)

### Code Reality: NONE

`orderTransform.js:collectBillExisting` emits `partial_payments` for F&B split (L1730-1736) but no `partial_payments_room`.

### API Contract (handover_5 §4.5)

```javascript
partial_payments_room: [
  { payment_mode: 'cash', payment_amount: 500 },
  { payment_mode: 'upi',  payment_amount: 350 },
]
```
- Present + at least 1 leg > 0 → separate ledger rows; `balance_payment_mode = 'partial'`
- Absent → single legacy checkout row (backward-compatible)
- Independent from `partial_payments` (F&B legs)

### Edit Sites

| Edit | File | Location | Change |
|---|---|---|---|
| E-C1 | `FolioCheckoutPanel.jsx` | Bill section | Add "Room payment split" option — allows N payment method legs for room balance. Sends `splitPaymentsRoom` in paymentData |
| E-C2 | `orderTransform.js` | `collectBillExisting` after partial_payments block | Emit `partial_payments_room` array when `paymentData.splitPaymentsRoom?.length > 0` |

**Files WILL change:** `FolioCheckoutPanel.jsx` (E-C1), `orderTransform.js` (E-C2)
**Files will NOT touch:** `CollectPaymentPanel.jsx` (room split is Front Desk only), `PmsCheckoutDrawer.jsx`

**Note:** Phase C is the backend mechanism for FU-385-D. If Planning agent at Gate 2 decides FU-385-D owns this, declare explicitly here. Otherwise implement as Phase C last in this CR.

### Verification Matrix (Phase C)

| # | Test | Expected |
|---|---|---|
| VC-1 | Room settle with 2-leg room payment | `partial_payments_room` in payload; 2 ledger rows |
| VC-2 | Room settle without room split | No `partial_payments_room`; single legacy row |
| VC-3 | `balance_payment_mode` on order | `partial` when multi-leg used |

---

## Full Blast Radius Summary

| File | R5? | Phase | Lines (est.) |
|---|---|---|---|
| `api/constants.js` | no | B | 1 (Fast Lane) |
| `api/transforms/orderTransform.js` | YES | A, B, C | ~15 |
| `components/order-entry/CollectPaymentPanel.jsx` | YES | B | ~2 |
| `components/pms/frontdesk/FolioCheckoutPanel.jsx` | no | A, C | ~30 |
| `api/services/pmsService.js` | no | D | ~8 |
| `pages/pms/CheckInPage.jsx` | no | D | ~20 |

Total: 6 files, ~76 lines. Hotspots touched: `orderTransform.js` (R5) + `CollectPaymentPanel.jsx` (R5).

---

## Owner Decisions Remaining

All OD-405-01…06 are LOCKED. No new owner decisions surfaced by this IA.

One planning note to confirm at Gate 3:
- **OD-405-04 note:** Phase C stays in CR-405. If FU-385-D wants to own it, owner must say so at Gate 3 to split it out before implementation starts.

---

## Gate Status

```
Code Reality: PARTIAL — disabled button (Phase A), v2/wrong-payload (Phase B), no discount fields (Phase D/C)
Conflict Pre-Check: NONE
All ODs: LOCKED
Files WILL change: 6 (list above)
Files will NOT touch: PmsCheckoutDrawer.jsx, OrderEntry.jsx, all non-room flows
Next: Gate 3 GO → Implementation Plan (Phase A first, independently closable)
```
