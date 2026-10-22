# BUG-496 — Intake

**ID:** BUG-496
**Date:** 2026-10-06
**Source:** OWNER-REPORTED (screenshot + verbal, INV-497 Point 1)
**Severity:** P1 — HIGH
**Risk:** HIGH (financial discount cap, GST sent to backend)
**Sprint:** oct_bug_batch
**Duplicate check:** DISTINCT — BUG-495 was the previous fix attempt; this revises that formula per owner feedback
**Blast radius:** MEDIUM (~6 edit sites, 3 files, all financial)
**Fast Lane eligible:** NO (financial logic, 3 files)

---

## Description

The maxDiscount/maxPct formula implemented in BUG-495 caps the discount at:
`booking_charge − advance × (1 + gstRate)`

This allows ~81% discount on a ₹5,700 room with ₹1,000 advance (i.e., discount up to ₹4,617).

**Owner rule (confirmed):** maxDiscount = **advance amount only**. Reason: GST is always collected from the customer on the discounted price. The hotel can only give back/absorb what they've already collected (the advance).

Additionally: the GST sent to the backend at check-in and checkout is wrong:
- Check-in: `gstTax = GST on full room_price` (should be on discounted price)
- Checkout: `room_gst_tax = 0` (folio has no gst_tax field; should compute on discounted price)

---

## Owner Decisions — ALL LOCKED

**OD-496-01:** maxDiscount = advance paid (₹); maxPct = `floor(advance / booking_charge × 100)`
→ **LOCKED = YES** (owner: "OD-497-01 - yes")

**OD-496-02:** GST at check-in should be computed on discounted price (`orderAmount − roomDiscountRs`), not full orderAmount
→ **LOCKED** (derived from OD-496-01 + owner "cause we will gst paid by customer")

**OD-496-03:** Checkout `room_gst_tax` should be `computeRoomGst(applicable, slabs, net_room_price, nights, 1).gstTotal`
→ **LOCKED** (same principle)

---

## Evidence

- **Screenshot:** Check-in form, ₹5,700 room, ₹1,000 advance → ₹4,650 discount allowed (balance ₹335). Should max at ₹1,000.
- **Code trace:** `CheckInForm.jsx` L68-76 (BUG-495 maxPct), `CheckInPage.jsx` L271-280 (BUG-495 maxPct), `FolioCheckoutPanel.jsx` L53-61 (BUG-495 maxPct), L229-240 (parent discountOverMax)
- **Backend GST:** `CheckInPage.jsx` L301 `gstBase = form.orderAmount` (full price). `FolioCheckoutPanel.jsx` L291 `roomGstTax = order.roomInfo?.gstTax ?? 0` → 0.
- **Confidence:** HIGH (code trace + owner confirmation)

---

## Fix Scope (Gate 2 planning)

| # | File | Site | Change |
|---|------|------|--------|
| E1 | CheckInForm.jsx | L68-76 maxPct | `floor(advance/bc × 100)` |
| E2 | CheckInForm.jsx | L199 Amount max | `Number(c.advance_payment || 0)` |
| E3 | CheckInPage.jsx | L271-280 maxPct | `floor(advance/bc × 100)` |
| E4 | CheckInPage.jsx | L301 gstBase | `orderAmount − roomDiscountRs` |
| E5 | FolioCheckoutPanel.jsx | L53-61 maxPct | `floor(advance/bc × 100)` |
| E6 | FolioCheckoutPanel.jsx | L229-240 discountOverMax | same formula |
| E7 | FolioCheckoutPanel.jsx | L107 Amount max | `Number(c.advance_payment || 0)` |
| E8 | FolioCheckoutPanel.jsx | L291-292 room_gst_tax | `displaySgst + displayCgst` from BUG-494 useMemo |

**Note:** E1-E4 = check-in surfaces; E5-E8 = checkout surface.

Next: **Gate 2 GO → PLANNING (Impact Analysis)**
