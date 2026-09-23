# BACKEND_BRIEF_CR357_MID_STAY_PAYMENT_2026_09_14

## Summary
- **Issue:** Mid-stay payments via `POST pos/room-payment` currently reduce `remaining_room_balance` (room-only outstanding). Business rule requires advance at check-in = room charge; mid-stay payments while the order is running = food charges. These two are not separated in the current backend contract — both advance and interim payments reduce the room balance, and food is always charged in full at checkout regardless of how much was paid mid-stay.
- **Classification:** CONTRACT_MISMATCH — the `payment_type` enum does not distinguish room payments from food payments; `remaining_room_balance` is room-only and does not reflect accumulated food charges.
- **Frontend impact:** The "Record Payment" modal (mid-stay pay button in CartPanel) shows `remaining_room_balance` as "Outstanding Balance". When a guest wants to clear their food tab mid-stay, the front desk sees the room's outstanding, not the food charges. FE cannot show the correct food outstanding balance without a backend contract change. If the FE were to book a mid-stay payment against food, the checkout formula would double-charge the guest for food.
- **Priority/Risk:** P1 · HIGH (billing attribution — affects what the guest is charged for at checkout)
- **CR reference:** CR-357 (Room Advance — Full-Bill Deduction). Related: CR-162 (mid-stay payment, implemented), CR-364 (Guest Folio).

---

## Business Rule (owner-stated)

| Timing | Payment for |
|---|---|
| Advance at check-in (`pmsCheckIn` → `advance_payment`) | **Room charge only** |
| Payment while order is running ("Record Payment" button) | **Food / F&B charges only** |
| Checkout (`order-bill-payment`) | Whatever remains unpaid |

---

## Endpoint

### Current mid-stay payment endpoint
- **Method:** POST
- **URL:** `/pos/room-payment`
- **Auth:** POS bearer token
- **Current payload:**
```json
{
  "room_order_id": 1232244,
  "payment_amount": 2000,
  "payment_mode": "cash",
  "payment_type": "interim"
}
```
- **Current response:**
```json
{
  "success": true,
  "room_payment_summary": {
    "remaining_room_balance": 7440,
    "payments": [...]
  }
}
```

### Check-in advance (for reference)
- **Endpoint:** `POST /pos/pms-check-in` (FormData)
- **Field:** `advance_payment` — amount paid at check-in toward room charge

---

## The Gap

**Current data flow:**
```
Check-in:        advance_payment = 2000      → remaining_room_balance = 10000 - 2000 = 8000
Mid-stay pay:    payment_type='interim' 2000 → remaining_room_balance = 8000 - 2000 = 6000
At checkout:     effectiveTotal = food(3000) + remaining_room_balance(6000) = 9000
Total collected: 2000 + 2000 + 9000 = 13000 = room(10000) + food(3000) ✅ (totals correct)
```

**Problem:** The "Record Payment" modal shows **Outstanding Balance = ₹8,000** (room remaining) when the guest wants to pay off food (₹3,000). Front desk collects ₹2,000 thinking they're clearing food — but the system books it against room. The guest still owes ₹3,000 food at checkout plus ₹6,000 room remaining = ₹9,000. If FE were to show food (₹3,000) as outstanding and book the payment against food, at checkout `effectiveTotal` still adds `food(3000)` — double charge.

**The FE cannot fix this alone.** The checkout formula `effectiveTotal = food + associatedOrders + remaining_room_balance` requires the backend to either:
- Return a separate food-remaining balance that the FE uses at checkout, OR
- Accept `payment_type: 'food'` and adjust the checkout balance accordingly

---

## Backend Questions

| # | Question |
|---|---|
| **Q-357-01** | **Preferred path (pick one):** (A) Add `payment_type: 'food'` — `pos/room-payment` accepts this value, backend tracks food payments separately, and `get-single-order-new` returns a `remaining_food_balance` field so FE can show food outstanding in the mid-stay modal and subtract it at checkout. (B) Redefine `remaining_room_balance` as combined outstanding = (room_price + food_total − all_payments). FE uses this single field for both the modal display and checkout balance — no food/room split in the response. (C) No backend change — FE derives food outstanding from `associated_orders` totals client-side, but this requires confirmation that the checkout `order-bill-payment` will correctly account for food already paid via interim. Which path will you implement? |
| **Q-357-02** | If **Option A** (separate `payment_type: 'food'`): what does `get-single-order-new` return to let FE know how much food has been pre-paid? Proposed: `room_payment_summary.remaining_food_balance` (food_total − food_payments_so_far). Please confirm field name and shape. |
| **Q-357-03** | If **Option B** (combined `remaining_room_balance`): at checkout, `order-bill-payment` receives `grand_total = effectiveTotal`. Does the backend correctly reconcile the combined balance against the full stay (room + food − all payments) so there is no double-charging? |
| **Q-357-04** | At checkout (`order-bill-payment`), the FE currently sends `grand_total = food + associatedOrders + remaining_room_balance`. If interim payments now cover food, should `grand_total` change to `food + associatedOrders + remaining_room_balance − food_payments_already_made`? Or does the backend compute the net payable itself and the FE just sends the raw totals? |
| **Q-357-05** | Does `remaining_room_balance` in the current response already subtract **all** payments (advance + interim), or only advance? Confirming this helps determine if Option B is already partially implemented. |

---

## Current FE Code (for reference)

**Mid-stay balance shown in modal** (`CartPanel.jsx`):
```js
liveBalance = roomSummaryOverride?.remainingRoomBalance
           ?? roomInfo.roomPaymentSummary?.remainingRoomBalance
           ?? roomInfo.balancePayment
```

**Checkout formula** (`CollectPaymentPanel.jsx`):
```js
roomBalance   = Math.max(0, roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment)
effectiveTotal = finalTotal + associatedTotal + roomBalance
//               ^food^        ^transferred^     ^room outstanding^
```

**`payment_type` values FE currently sends:**
- Check-in advance → not via `pos/room-payment` (in `pmsCheckIn` FormData)
- Mid-stay → `payment_type: 'interim'` (hardcoded, per backend reply 2026-09-10)
- Checkout → `order-bill-payment` (separate endpoint, `payment_mode` only)

---

## Frontend Workaround
- **Available:** NO — not without risk of double-charging food at checkout.
- FE is blocked from correctly labelling or routing mid-stay payments until backend confirms the contract path (Q-357-01).

---

## Related
- `CR-162` — mid-stay payment modal (implemented, uses `payment_type: 'interim'`)
- `CR-357` — room advance full-bill deduction (Gate 1, OD-7 open — this brief resolves OD-7)
- `CR-364` — Guest Folio (Q-364P-14 asks about `payment_type` enum — answers here apply there too)
- `BUG-384` — `pos/room-payment` 403 (RESOLVED 2026-09-10)

*Brief filed: 2026-09-14*
