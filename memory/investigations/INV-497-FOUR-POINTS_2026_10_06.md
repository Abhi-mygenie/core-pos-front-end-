# INV-497 — 4-POINT INVESTIGATION: maxDiscount formula, Collect Now cap, Checkout discount base, F&B Both discount

**Date:** 2026-10-06
**Reporter:** Owner — 4 explicit points + screenshots
**Role:** INVESTIGATION (no code edits)
**Steps used:** 10/10
**Credentials used:** `boi@bang.com` / `Qplazm@10` (RID 69)
**Related:** BUG-495 (GATE_5A_IMPLEMENTED), BUG-490, BUG-492, CR-407-B, INV-496

---

## POINT 1 — maxDiscount formula: wrong cap (limits on whole room rent, should be advance only)

### Owner rule stated
> "we are limiting the discount on whole room rent which is 5700 which should be on advance paid only (1000) — cause we will gst paid by customer"

### What the code currently does (BUG-495 formula)

**CheckInForm.jsx / CheckInPage.jsx / FolioCheckoutPanel.jsx (all 3 files changed by BUG-495):**
```javascript
// BUG-495 formula
const gstRate      = (sgst + cgst) / booking_charge;
const gstOnAdvance = advance × gstRate;
maxPct = floor((booking_charge − advance − gstOnAdvance) / booking_charge × 100)
```

For ₹5,700 room, ₹1,000 advance, 5% GST:
- gstRate = 285/5700 = 0.05
- gstOnAdvance = 1000 × 0.05 = ₹50
- maxPct = floor((5700 − 1000 − 50) / 5700 × 100) = **81%**
- Max discount in ₹ = 5700 × 81% = **₹4,617**

Screenshot confirms: ₹4,650 discount was entered and accepted (within the ~81% cap). Balance due = ₹335 = ₹5,985 − ₹1,000 − ₹4,650.

### What the owner wants

maxDiscount = **advance amount only** (₹1,000). Not based on room rent at all.

Reason: The hotel will collect GST from the customer on the remaining balance. The discount can only eat into the advance the hotel already collected — giving more than that means refunding money not yet received.

### Correct formula (owner rule)

```
maxDiscount (₹)  = advance
maxPct (%)       = floor(advance / booking_charge × 100)
```

For ₹5,700 room, ₹1,000 advance:
- Max discount = **₹1,000**
- maxPct = floor(1000/5700 × 100) = **17%**

### Files affected

| File | Change needed |
|------|---------------|
| `CheckInForm.jsx` L68-76 | maxPct formula → `floor(advance/bc × 100)`; Amount mode max → `advance` |
| `CheckInPage.jsx` L271-280 | maxPct formula → `floor(advance/bc × 100)` |
| `FolioCheckoutPanel.jsx` L53-61 | RoomSection maxPct → `floor(advance/bc × 100)` |
| `FolioCheckoutPanel.jsx` L229-240 | parent discountOverMax → same formula |
| `FolioCheckoutPanel.jsx` L107 | Amount input `max` = `advance` (not `balance_due`) |
| `CheckInForm.jsx` L199 | Amount input `max` = `advance` (not `c.balance_due`) |

**OD Needed before fix:** OD-497-01 — "Confirm: maxDiscount = advance amount only (₹). GST is still owed on the net discounted room price."

---

## POINT 2 — Collect Now input has no cap at balance due

### Screenshot evidence
- Room bill balance due = ₹335 (after discount)
- Collect Now input shows **₹5,000** — freely accepted

### Code trace — CheckInForm.jsx L225
```jsx
<input
  type="number"
  min={0}
  // NO max attribute
  value={collect.amount}
  onChange={(e) => setCollect((k) => ({ ...k, amount: e.target.value }))}
/>
```

No `max` attribute. No validation in `missing[]` array that checks `collectAmt <= balance_due - roomDiscountRs`.

The `missing` array only checks: room, upgrade amount, upgrade reason, B2B fields, payment reference, early check-in. Collect Now amount is never validated against balance due.

### What happens with an overpayment
`collectNow` is sent to backend as `pmsCheckIn(..., collectNow: collectAmt, ...)`. The backend stores it as "paid so far." An overpayment at check-in would result in a negative balance at checkout — the hotel would owe the guest a refund.

### Correct fix
```jsx
<input
  type="number"
  min={0}
  max={Math.max(0, Number(c.balance_due || 0) - roomDiscountRs)}
  ...
/>
```

Also add to `missing[]` validation:
```javascript
collectAmt > Math.max(0, Number(c.balance_due || 0) - roomDiscountRs) && 'collect amount exceeds balance due'
```

**No OD needed — this is a clear validation gap.**

---

## POINT 3 — Checkout Bill page: discount applies to full room rent; check-in discount vanishes

### Screenshot evidence (order #000326, Room r4 "maka")

| What is shown | What should be shown |
|---------------|---------------------|
| Booking amount ₹6,700 (full) | Booking amount ₹6,700 |
| [no check-in discount line] | Check-in discount −₹5,325 (80%) ← **MISSING** |
| Room discount input applies to ₹6,700 | Room discount should apply to ₹1,375 (net after check-in discount) |
| SGST ₹0, CGST ₹0 | SGST/CGST on net ₹1,375 |
| Room balance ₹0 | Room balance ₹0 (or ₹68.75 pending OD) |

**Screenshot 2:** With 50% (Both) checkout discount, bill shows −₹3,350 on full ₹6,700. The check-in discount of ₹5,325 has completely disappeared. Combined effective discount = ₹5,325 + ₹3,350 = ₹8,675 on a ₹6,700 room — clearly impossible.

### Root cause 1: No check-in discount display line

`FolioCheckoutPanel.jsx` RoomSection renders: Booking amount → [discount UI] → SGST → CGST → Already paid → Room balance.

The folio has `order.roomInfo.discountAmount = 5325` and `room_discount_detail = {check_in: {type:Percent, value:80, amount:5325}}`. Neither is rendered as a line item.

### Root cause 2: roomDiscountRs uses stale LR booking_charge

`FolioCheckoutPanel.jsx` L45-53 (RoomSection):
```javascript
const bookingCharge = Number(c.booking_charge || 0); // c = row.charge (LR) = ₹6,700 FULL PRICE
if (roomDiscountType === 'Percent') {
  return Math.min(Math.floor(bookingCharge * roomDiscount / 100), balanceDue);
  // = floor(6700 × discount%), NOT floor(1375 × discount%)
}
```

`c.booking_charge` is from LR API = ₹6,700 (LR never sees the check-in discount). The correct base for a CHECKOUT discount should be:
```
net_room_price = booking_charge − check_in_discount_amount
              = 6700 − 5325 = ₹1,375
```

`order.roomInfo.discountAmount` (from folio) has this value. It needs to be passed into `RoomSection` and used as the base.

### Root cause 3: Amount mode max uses stale balance_due

`FolioCheckoutPanel.jsx` L104:
```javascript
max={roomDiscountType === 'Percent' ? maxPct : Number(c.balance_due || 0) || undefined}
// c.balance_due from LR = ₹5,660 (no knowledge of check-in discount)
```

The correct Amount mode cap = `net_room_price = ₹1,375` (or `baseBalance` which is already correct at ₹0 for fully-paid bookings).

### Root cause 4: handlePaid room discount base also wrong

`FolioCheckoutPanel.jsx` L296-300:
```javascript
const balanceDue    = order.roomInfo?.balancePayment ?? 0; // = ₹0
const bookingCharge = order.roomInfo?.roomPrice      ?? 0; // = ₹6,700 FULL PRICE
const roomDiscountRs = roomDiscountType === 'Percent'
  ? Math.min(Math.floor(bookingCharge * roomDiscount / 100), balanceDue) // ← floor(6700 × 50%, 0) = 0 (capped to 0!)
  : roomDiscount;
```

Wait — for order #000326 where `balanceDue = 0`, the Percent discount caps at 0. So `room_discount = 0` is sent to the backend even when user enters 50%! The DISPLAY shows −₹3,350 but the actual payload would send `room_discount = 0` (capped at `balanceDue = 0`). This is a **silent data mismatch** between display and payload.

### Fix scope

| # | Fix | File |
|---|-----|------|
| F3a | Add "Check-in discount" line (conditionally) between Booking amount and SGST | FolioCheckoutPanel.jsx RoomSection |
| F3b | Change roomDiscountRs base from `c.booking_charge` to `c.booking_charge − discountAmtFromFolio` | FolioCheckoutPanel.jsx RoomSection |
| F3c | Change Amount mode `max` from `c.balance_due` to `net_room_price` | FolioCheckoutPanel.jsx |
| F3d | Fix handlePaid bookingCharge to use `booking_charge − discountAmount` not full roomPrice | FolioCheckoutPanel.jsx |

**OD needed: OD-497-02 — "When a check-in discount was already applied, should the checkout discount also be limited to ₹advance (like Point 1), or to the net room price after check-in discount?"**

---

## POINT 4 — "Both" discount: F&B not visually applied; backend behaviour unconfirmed

### What the frontend does

`FolioCheckoutPanel.jsx` handlePaid:
```javascript
payload.room_discount_apply_to = 'both'; // sent to backend ✓
```

The payload correctly sends `room_discount_apply_to = 'both'`. The backend should apply the discount to both room and F&B.

### Display gap confirmed

The LEFT panel's F&B sections (Room Orders, Transferred) display raw amounts from the folio:
```javascript
orders.map((o) => <Line value={fmtINR(o.totalAmount)} />) // never updated for discount
folio.associatedOrders.map((a) => <Line value={fmtINR(a.amount)} />) // never updated
```

The CollectPaymentPanel (right) shows `total={order.amount}` = pre-discount total from folio.

**When the user selects "Both" at 50%, the left panel shows full F&B prices.** The user cannot see the F&B discount before clicking Pay. This is a display gap — the user is flying blind.

### Backend behaviour: UNCONFIRMED

Whether the backend correctly applies `room_discount` to F&B when `apply_to = 'both'` could not be confirmed without a test checkout. Needs:
- A test checkout with "Both" + verify the resulting order shows F&B discount applied
- OR: review backend contract at `payBill` endpoint

### What "Both" should logically mean (for investigation — not a decision)

When user selects "Both" + enters 50%:
- Room discount: `net_room_price × 50%`
- F&B discount: `(room_orders_total + transferred_orders_total) × 50%` OR same flat amount?

This is ambiguous. The backend contract for `room_discount + room_discount_apply_to = both` needs to be documented.

### Fix needed

1. **Display fix:** When `roomApplyTo === 'both'`, show a "F&B discount" line below each F&B section showing the projected discount
2. **Backend verification:** Probe `payBill` response with `apply_to = 'both'` to confirm F&B is discounted

**OD needed: OD-497-03 — "When 'Both' is selected, should F&B discount be: (a) same ₹ amount as room discount, or (b) same % applied to F&B total?"**

---

## Summary Table

| Point | Issue | Root Cause | Files | OD Needed |
|-------|-------|-----------|-------|-----------|
| 1 | maxDiscount = booking_charge-based (81%), should be advance-based (17%) | BUG-495 formula was wrong per owner rule | CheckInForm, CheckInPage, FolioCheckoutPanel (6 sites) | OD-497-01 |
| 2 | Collect Now has no max cap; ₹5,000 on ₹335 balance allowed | Missing `max` attr + missing validation in `missing[]` | CheckInForm | None |
| 3 | Checkout discount base = full ₹6,700; check-in discount (-₹5,325) vanishes; handlePaid sends wrong ₹0 discount | RoomSection uses stale LR `booking_charge`; no check-in discount line; handlePaid caps to `balanceDue=0` | FolioCheckoutPanel (4 sites) | OD-497-02 |
| 4 | F&B not visually shown as discounted when "Both" selected; backend application unconfirmed | Display never subtracts discount from F&B lines; backend contract unknown | FolioCheckoutPanel + backend verification | OD-497-03 |

**All are FE_BUG / FE_DISPLAY_GAP / PLAN_GAP. No new API endpoints needed.**

---

## GST Sending to Backend (owner question across Points 1 + 3)

**At check-in (`pmsCheckIn` in CheckInPage.jsx L301-308):**
```javascript
const gstBase = Number(form.orderAmount); // = FULL room amount, NOT discounted
const { gstTotal: gstTax } = computeRoomGst(..., gstBase, ...);
// → gstTax = GST on full ₹5,700 or ₹6,700 (WRONG — should be on discounted price)
```
**Yes, the wrong GST is being sent at check-in.** It's GST on the full room price, not the discounted price.

**At check-out (`handlePaid` in FolioCheckoutPanel.jsx L291-292):**
```javascript
const roomGstTax = order.roomInfo?.gstTax ?? 0; // gst_tax = null in folio → 0
if (roomGstTax > 0) payload.room_gst_tax = roomGstTax; // NOT sent (0)
```
**Yes, room_gst_tax = 0 is sent (nothing) at checkout.** The folio has no `gst_tax` field (it's always null).

The correct at-checkout GST should be: `computeRoomGst(applicable, slabs, net_room_price, nights, 1).gstTotal`.

---

## Next Steps (pending owner OD answers)

1. Owner confirms OD-497-01, OD-497-02, OD-497-03
2. Register as BUG-497 / BUG-498 etc. per standard intake flow
3. Planning Gate 2 → Gate 3 → Gate 4 GO → Implementation

**Investigation report saved:** `memory/investigations/INV-497-FOUR-POINTS_2026_10_06.md`
