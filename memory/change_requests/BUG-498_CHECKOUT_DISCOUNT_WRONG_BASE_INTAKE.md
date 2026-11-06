# BUG-498 — Intake

**ID:** BUG-498
**Date:** 2026-10-06
**Source:** OWNER-REPORTED (screenshots order #000326, INV-497 Point 3 + INV-496 P1)
**Severity:** P1 — CRITICAL
**Risk:** CRITICAL (financial — wrong discount amounts sent to backend; check-in discount silently dropped)
**Sprint:** oct_bug_batch
**Duplicate check:** DISTINCT (related to BUG-492 Sub-A which introduced the base issue; also absorbs INV-496 P1 display gap)
**Blast radius:** MEDIUM (4 fix sites + 1 new display line, FolioCheckoutPanel.jsx only)
**Fast Lane eligible:** NO (CRITICAL risk, financial)

---

## Description

Four problems in FolioCheckoutPanel.jsx when a check-in discount exists:

**P1 — Missing check-in discount display line:**
The folio has `room_discount_amount` and `room_discount_detail` (e.g. 80% at check-in = ₹5,325), but no line item is shown in the Bill panel. Guest and staff cannot see the check-in discount on the Bill page.

**P2 — roomDiscountRs base = stale LR booking_charge (₹6,700):**
The checkout discount% applies to the FULL original booking charge, not the net price after check-in discount. For order #000326: 50% discount shows −₹3,350 on ₹6,700, ignoring the existing ₹5,325 check-in discount.

**P3 — Amount input max = stale LR balance_due (₹5,660):**
The amount mode discount max uses `c.balance_due` from LR (which doesn't know about the check-in discount), not the folio's `balancePayment`.

**P4 — handlePaid silent mismatch: room_discount capped at balanceDue=0:**
In handlePaid, `balanceDue = order.roomInfo?.balancePayment` = ₹0 for orders where advance covers discounted base. `Math.min(floor(6700×50%, 0) = 0)`. So the DISPLAY shows −₹3,350 but the actual `room_discount` sent in payload = **₹0**. Silent data mismatch.

---

## Owner Decisions — ALL LOCKED

**OD-498-01:** Checkout discount base = `folio.balancePayment` (remaining due after all advances + check-in discounts).
→ **LOCKED** — "OD-497-02: on balance due — 1500 room rent, 300 advance, 600 check-in advance → discount on 600 balance due"

**OD-498-02:** Checkout maxPct = `floor(balancePayment / booking_charge × 100)` — same pattern as check-in formula.
→ **LOCKED** — "but we will cap the % same as we do at check in"

**Example locked:**
- Room ₹1,500, booking advance ₹300, collect-now at check-in ₹600
- `balancePayment = 1500 − 300 − 600 = ₹600`
- `maxDiscount = ₹600`
- `maxPct = floor(600/1500 × 100) = 40%`

---

## Evidence

- **Screenshots:** Order #000326 Bill panel — booking amount ₹6,700, no check-in discount line, −₹3,350 on full ₹6,700 with 50% discount
- **Code trace:**
  - `FolioCheckoutPanel.jsx` L45-53 RoomSection `roomDiscountRs`: base=`c.booking_charge` (LR, stale)
  - `FolioCheckoutPanel.jsx` L104 Amount input max: `c.balance_due` (LR, stale)
  - `FolioCheckoutPanel.jsx` L296-300 handlePaid: `bookingCharge=order.roomInfo?.roomPrice` (full), `balanceDue=order.roomInfo?.balancePayment` (0) → `Math.min(floor(6700×50%), 0) = 0` → sends ₹0
  - Display: no `<Line>` for `order.roomInfo?.discountAmount`
- **Folio probe:** order 1232976: `room_discount_amount=5325, room_discount_detail={check_in:{type:Percent,value:80,amount:5325}}`
- **Confidence:** HIGH

---

## Fix Scope

| # | File | Site | Change |
|---|------|------|--------|
| E1 | FolioCheckoutPanel.jsx | RoomSection: add check-in discount line | New `<Line>` after Booking amount, conditioned on `discountFromCheckin > 0` |
| E2 | FolioCheckoutPanel.jsx | RoomSection L45-53 roomDiscountRs | Base = `net_room_price = bc − discountFromCheckin` not `bc`; cap = `balancePayment` not `c.balance_due` |
| E3 | FolioCheckoutPanel.jsx | L104 Amount input max | `baseBalance` (folio bp) not `c.balance_due` (LR) |
| E4 | FolioCheckoutPanel.jsx | maxPct L53-61 (RoomSection) | `floor(bp/bc × 100)` where `bp = baseBalance` |
| E5 | FolioCheckoutPanel.jsx | L229-240 parent discountOverMax | Same formula update |
| E6 | FolioCheckoutPanel.jsx | L296-300 handlePaid | bookingCharge/balanceDue replace with correct folio `bp`; roomDiscountRs computed on `bp` |

**Note:** `baseBalance` from BUG-494 E-494-6 useMemo already has `folio.balancePayment`. Will be reused.

Next: **Gate 2 GO → PLANNING (Impact Analysis)**
