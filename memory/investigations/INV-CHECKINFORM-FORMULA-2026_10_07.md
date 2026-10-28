# INV-CHECKINFORM-FORMULA-2026_10_07 — FINAL Investigation Report

**Date:** 2026-10-07
**Status:** ROOT CAUSE FOUND — HIGH confidence
**Steps used:** 9/10
**Files inspected:** `CheckInForm.jsx`, `CheckInPage.jsx`

---

## 1. Summary

Three root causes confirmed. All FE_BUG. Owner has confirmed all formulas.

| # | Bug | File(s) | Lines | Fix scope |
|---|-----|---------|-------|-----------|
| **BUG-506** | Balance due display uses `c.booking_charge` base — excludes GST, shows ₹8,000 not ₹9,620 at zero discount | CheckInForm.jsx | L201 only | SMALL — 1 line |
| **BUG-507** | Flat discount alert missing — `discountOverMax` Percent-only, Amount mode silently caps | CheckInForm.jsx + CheckInPage.jsx | L86, L287 | SMALL — 1 line each |
| **BUG-508** | GST strip compound error — `displayGstTotal` applies 5% to 1,050 (which contains gstOnAdv=50), gives 52.50 not 50 at max discount | CheckInForm.jsx | L92 | LOW priority — park |

---

## 2. BUG-506 — Balance display formula

### Root cause

L201 current:
`Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0))`
Uses `c.booking_charge` (₹9,000, pre-GST) as base.
At zero discount: 9,000 - 0 - 1,000 = **8,000** WRONG (should be **9,620**)

### Owner-confirmed formula

| Scenario | Expected | Logic |
|---------|----------|-------|
| Zero discount | ₹9,620 | `c.total_with_gst − advance = 10,620 − 1,000` |
| Max discount (₹7,950) | ₹50 | `bc − roomDiscountRs − advance = 1,050 − 1,000` |
| Floor | ≥ ₹50 | `max(gstOnAdv, bc−disc−advance)` — gstOnAdv secured |
| ₹102.50 | NEVER | Compound GST error — `displayGstTotal` wrong |

Owner statement: "50 will be the gst amount of 1000 — neither at check out the gst will go negative it should secure from discount"

### Fix — L201 only

```javascript
// gstOnAdv_floor = bc - advance - maxFlat (derivable from existing maxFlat, no new dep)
// Conditional: no-discount → full GST-inclusive; with-discount → room-balance (gstOnAdv secured)
const gstOnAdv_floor = Number(c.booking_charge||0) - Number(c.advance_payment||0) - maxFlat;
const displayBalance = roomDiscountRs > 0
  ? Math.max(gstOnAdv_floor, Number(c.booking_charge||0) - roomDiscountRs - Number(c.advance_payment||0))
  : Number(c.total_with_gst||0) - Number(c.advance_payment||0);
```

Trace: zero=9620 ✅ · max=50 ✅ · 102.50 never appears ✅

### CRITICAL: collectMax (L88) — MUST NOT CHANGE

Per BUG-500 / OD-500-04: deliberately no-GST (backend-compatible).
Backend stores `bp = room − discount − advance`. GST-inclusive collection causes negative bp.
At zero discount: collectMax = 8,000 (room-only, correct for backend).
Display balance (9,620) will differ from collectMax (8,000) by booking-time GST (1,620). This is correct hotel accounting.

### CheckInPage.jsx effectiveBalanceDue (L262) — MUST NOT CHANGE

Same backend constraint. Used for Collect Now max + formValid. Not in scope.

---

## 3. BUG-507 — Flat discount alert

### Root cause

L86: `discountOverMax = ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct`
Amount mode never triggers → silent cap when flat input > maxFlat.
Same bug at CheckInPage.jsx L287.

### Fix (both files)

```javascript
const discountOverMax =
  (ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct) ||
  (ciRoomDiscountType === 'Amount'  && parseFloat(ciRoomDiscountAmt) > maxFlat);
```

No JSX change needed — existing alert `div` at L241-245 already renders on `discountOverMax`.

---

## 4. BUG-508 — GST strip compound error (LOW — park)

`displayGstTotal` (L92) = `computeRoomGst(bc − roomDiscountRs, 1, 1).gstTotal`
At max: base=1,050 = advance(1,000)+gstOnAdv(50) → 5%×1,050=52.50 (5%×50=2.50 compound error)
Should be: 5%×1,000=50. Strip shows 52.50 instead of 50. Minor 2.50 discrepancy.
Balance fix (BUG-506) is independent and correct. Park this for separate sprint.

---

## 5. Blast radius

| Bug | Files | Change |
|-----|-------|--------|
| BUG-506 | `CheckInForm.jsx` L201 | 1 line — display balance conditional |
| BUG-507 | `CheckInForm.jsx` L86 + `CheckInPage.jsx` L287 | 2 lines — extend condition |
| BUG-508 | `CheckInForm.jsx` L92 | Parked |

---

## 6. Recommendations

- **BUG-507** (flat alert): Fast Lane eligible (1-line change per file, LOW risk, no financial logic). Owner approval needed.
- **BUG-506** (balance display): Full Gate 2-3-4 required (financial display, P1/HIGH).
- **BUG-508**: Park — LOW priority, 2.50 discrepancy only visible in strip at max discount.
