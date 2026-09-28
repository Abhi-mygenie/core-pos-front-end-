# BUG-428 — Checkout ROOM Breakdown Missing Lodging GST Line

**ID:** BUG-428
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (investigation 2026-09-16, ss3 + ss4 screenshots)
**Confidence:** CONFIRMED (code-traced)

---

## Description

In the checkout drawer (both `PmsCheckoutDrawer` from the folio page AND the dashboard checkout), the **ROOM section breakdown** shows:

```
Room Charge    ₹1,000
Advance Paid   −₹100
Balance        ₹950
```

The Lodging GST (₹50) is **not shown as a line item**. The Balance ₹950 is numerically correct (BUG-425 fix: 1000 + 50 − 100 = 950), but the displayed sub-items don't add up to it: ₹1,000 − ₹100 = ₹900 ≠ ₹950. The ₹50 GST is hidden inside the Balance figure, making the breakdown **visually misleading** for cashiers and guests.

The correct breakdown should be:
```
Room Charge    ₹1,000
Lodging GST    +₹50
Advance Paid   −₹100
Balance        ₹950   ← now adds up correctly: 1000 + 50 − 100 = 950 ✓
```

---

## Classification

- **Type:** BUG (display gap — no formula change needed)
- **Severity:** P2 — MEDIUM (balance amount is correct; only the visual breakdown is opaque)
- **Risk:** MEDIUM (touches `CollectPaymentPanel.jsx` which is an **R5 hotspot file**)
- **Duplicate check:** DISTINCT — no prior item for GST line in room breakdown
- **Related:** BUG-425 (IMPLEMENTED — PmsCheckoutDrawer roomBalance fix), BUG-423 (folio formula)
- **Fast Lane:** NOT eligible — touches R5 hotspot (`CollectPaymentPanel.jsx`)

---

## Evidence

- Screenshot: ss3 (2026-09-16) — folio checkout, ROOM: Room Charge ₹1,000, Advance Paid −₹100, Balance ₹950 (GST absent)
- Screenshot: ss4 (2026-09-16) — dashboard checkout, same breakdown, same gap
- Code: `CollectPaymentPanel.jsx` L1831–1845 — 3 hardcoded lines (Room Charge, Advance Paid, Balance). No GST line.
- Code: `orderTransform.js` L409: `gstTax: parseFloat(api.room_info.gst_tax) || 0` — field IS mapped into `roomInfo.gstTax`
- Investigation: `/app/memory/investigations/INVESTIGATION_2026_09_16_BALANCE_GST_GAPS.md`
- Source: OWNER-REPORTED | Confidence: CONFIRMED

---

## Code Reality

**CONFIRMED GAP** — `roomInfo.gstTax` is available in the prop but never rendered in the breakdown JSX. One conditional JSX line needed between Room Charge and Advance Paid.

---

## Blast Radius

- `src/components/order-entry/CollectPaymentPanel.jsx` — **R5 HOTSPOT**. 1 JSX line addition inside the room breakdown expansion block (~L1835). No formula change, no state change, no prop change.
- Estimated scope: TINY (1 file, 1 new line) but requires R5 extra caution + regression checklist
- Affects: Both PmsCheckoutDrawer (folio) and Dashboard checkout (both pass roomInfo through CollectPaymentPanel)

---

## ⚠ R5 Hotspot Warning

`CollectPaymentPanel.jsx` is listed in Rule R5 (high-risk files). Any change requires:
- Explicit file-level plan
- Regression checklist covering non-room order flows
- Verify no impact on: dine-in checkout, delivery checkout, split bill, walk-in (non-room)

The change is additive (new display line only, no formula touch) — but R5 protocol must still be followed.

---

## Owner Decisions

| ID | Question | Answer |
|----|----------|--------|
| OD-428-01 | Add Lodging GST as a line item in ROOM breakdown (between Room Charge and Advance Paid)? | ✅ YES |
| OD-428-02 | Show only if `roomInfo.gstTax > 0` (hide for 0% GST rooms)? | ✅ YES — confirmed 2026-09-16 |

---

## Next

Gate 2 — Impact Analysis (R5 hotspot — full plan required)
