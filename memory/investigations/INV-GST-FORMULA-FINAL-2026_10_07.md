# INV-GST-FORMULA-FINAL-2026_10_07 — Final Investigation

**Date:** 2026-10-07
**Role:** INVESTIGATION (no code changes)
**Steps:** 9/10. Confidence: HIGH.

---

## Issue 1 — GST formula is wrong at normal discounts (BUG-509 over-corrects)

### Root cause

BUG-509 formula `computeBase = Math.max(0, gstBase - gstOnAdvFloor)` UNIVERSALLY
subtracts gstOnAdvFloor (50) from gstBase at ALL discount levels.

This is ONLY valid in the "near-max zone" (extraRoom < gstOnAdvFloor = 50).
For normal discounts, it artificially reduces the GST base.

### Impact table

| Discount | extra_room | BUG-509 GST | Correct GST | Status |
|---------|-----------|------------|-------------|--------|
| ₹300 | 7650 | 1557 (18%×8650) | **1566** (18%×8700) | ❌ BUG |
| ₹4,000 | 3950 | 247.50 (5%×4950) | **250** (5%×5000) | ❌ BUG |
| ₹7,900 | 50 | 52.50 (5%×1050) | **55** (5%×1100) | ❌ BUG |
| ₹7,949 | 1 | 50.05 (5%×1001) | 50.05 | ✓ |
| ₹7,950 | 0 | 50 (5%×1000) | 50 | ✓ |

### Correct formula (recommendation)

```js
const extraRoom = maxFlat - roomDiscountRs;
const computeBase = extraRoom < gstOnAdvFloor
  ? gstBase - gstOnAdvFloor   // near-max zone: advance + extraRoom
  : gstBase;                   // normal zone: standard
```

The boundary: extraRoom = gstOnAdvFloor = 50.
At ₹7,900 (extra=50): 50 < 50 = FALSE → standard (1100, GST=55) ✓
At ₹7,949 (extra=1):   1 < 50 = TRUE  → corrected (1001, GST=50.05) ✓

### Scope
CheckInForm.jsx L103-105 (1 line) + CheckInPage.jsx GST strip IIFE (1 line)

---

## Issue 2 — Collect Now at max (₹7,950) allows collecting GST

collectMax=50=gstOnAdvFloor at max. Hint: `50 > 50` = FALSE. User can collect ₹50 = gstOnAdv.

Fix direction: condition `collectMax <= gstOnAdvFloor && collectMax > 0` fires ONLY at max.
Show: "Maximum discount applied. GST settled at checkout. Nothing to collect at check-in."
Set collect input max = 0.

---

## Screenshots verified

- Screenshot 1 (₹7,900): shows CGST ₹26.25 = BUG-509 (5%×1050/2). Correct = ₹27.50 (5%×1100/2).
- Screenshot 2 (₹4,000): shows CGST ₹123.75 = BUG-509 (5%×4950/2). Correct = ₹125 (5%×5000/2).
- Screenshot 3 (₹4,000 collect): hint fires correctly (4197.50 > 4000). Collect now protection WORKS for normal discounts. 
- Max ₹7,950 collect: hint does NOT fire (50 = 50). BUG confirmed.
