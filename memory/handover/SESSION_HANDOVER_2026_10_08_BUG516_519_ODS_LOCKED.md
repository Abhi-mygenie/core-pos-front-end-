# Session Handover — BUG-516..519 ODs Locked / Gate 2 Closed (2026-10-08)

**Role:** INTAKE (OD resolution)
**Status:** GATE_2_CLOSED for all 4 items. Ready for Gate 3 GO → PLANNING.

---

## ODs Locked This Session

### BUG-517 — OD-517-01 LOCKED
maxCheckoutDiscount = baseBalance − floor(advance_paid × gst_rate)
= 600 − floor(1500 × 0.05) = 600 − 75 = **₹525**
maxPct = floor(525/3000 × 100) = **17%**

Scope expanded: Amount mode cap also wrong (600 vs 525).
Both Amount + Percent modes need the new formula.

### BUG-518 — OD-518-01/02/03 LOCKED
- 01 = a: each half capped independently (min(half, roomCap) + min(half, foodCap))
- 02 = YES: display = payload, no mismatch
- 03 = YES: fnbTotal = order.amount. Room discount is additive on top of CollectPaymentPanel F&B discount.

### BUG-519 — OD-519-01/02/03 LOCKED
- 01 = YES: left shows dynamic read-only "Room discount: −₹X" line
- 02 = a: room discount controls ABOVE CollectPaymentPanel on right
- 03 = a: split room payment also moves to right

### BUG-516 — No ODs
Gate 2 closed automatically. Fix: add taxType to folioTransform + label check in FolioCheckoutPanel.

---

## Next

Gate 3 GO for all 4 → PLANNING writes Implementation Plans.
Recommended order: BUG-518 (P0) first → BUG-517 (P1) → BUG-516+BUG-519 (P2).
