# BUG-511 — INTAKE DOC

**ID:** BUG-511
**Date:** 2026-10-07
**Status:** GATE_1_INTAKE
**Registered by:** INTAKE agent

---

## Title
CheckInForm GST strip shows wrong values at normal discounts — BUG-509 universal gstOnAdvFloor subtraction is a regression

---

## Description

BUG-509 introduced the formula:
```js
const computeBase = Math.max(0, gstBase - gstOnAdvFloor);  // always subtracts 50
```

This is **wrong for normal discounts**. The subtraction should only apply in the "near-max zone" where `(maxFlat - roomDiscountRs) < gstOnAdvFloor`.

### Symptoms

| Discount | Shows (BUG-509) | Should be | Error |
|----------|----------------|-----------|-------|
| ₹7,900 | CGST ₹26.25, GST ₹52.50 | GST = 5%×1100 = **₹55** | -₹2.50 |
| ₹4,000 | GST ₹247.50 | GST = 5%×5000 = **₹250** | -₹2.50 |
| ₹300 | GST ₹1,557 | GST = 18%×8700 = **₹1,566** | -₹9 |
| ₹7,949 | GST ₹50.05 | ₹50.05 | ✓ (correct near-max) |
| ₹7,950 max | GST ₹50 | ₹50 | ✓ |

### Root cause
BUG-509 was a gate-violation fix (no registration, no Gate 2-4 approval). It correctly handles the near-max zone but incorrectly universalises the subtraction to all discount levels.

---

## Code Reality
**FULL — code exists at `CheckInForm.jsx` L104-105 and `CheckInPage.jsx` GST IIFE.** Status: GATE_5A_IMPLEMENTED_WITH_DEFECT (BUG-509 marker, wrong formula).

---

## Duplicate Check
**RELATED to BUG-509** (this is the regression it caused).
**RELATED to BUG-508** (BUG-509 was an attempted fix for BUG-508's miss at ₹7,949).
**DISTINCT** new issue — different files and logic path.

---

## Severity & Risk
- **Severity:** P0 — financial GST display wrong at all normal discount levels
- **Risk:** CRITICAL (R6 — tax calculation)
- **Fast Lane:** NO — financial formula change, owner approval required

---

## Evidence
- Screenshot: ₹7,900 discount → CGST ₹26.25, Total GST ₹52.50, Balance ₹102.50 (session screenshots)
- Screenshot: ₹4,000 discount → CGST ₹123.75, Total GST ₹247.50 (session screenshots)
- Investigation: `investigations/INV-GST-FORMULA-FINAL-2026_10_07.md`
- Steps: Open check-in form for any booking, enter flat discount ₹7,900 → observe GST strip

---

## Blast Radius
- `CheckInForm.jsx` L103-105 (1 line change)
- `CheckInPage.jsx` GST IIFE (~2 lines)
- **SMALL** (2 files, ~3 lines)
- Hotspot: NO (not in R5 list)

---

## Correct Formula (owner decision needed)
```js
const extraRoom = maxFlat - roomDiscountRs;
const computeBase = extraRoom < gstOnAdvFloor
  ? gstBase - gstOnAdvFloor   // near-max zone only
  : gstBase;                   // standard — full room charge
```

Verified:
- ₹7,950: extraRoom=0 < 50 → computeBase=1000, GST=50 ✓
- ₹7,949: extraRoom=1 < 50 → computeBase=1001, GST=50.05 ✓
- ₹7,900: extraRoom=50 NOT < 50 → computeBase=1100, GST=55 ✓
- ₹300:   extraRoom=7650 NOT < 50 → computeBase=8700, GST=1566 ✓

---

## Open Questions
None — formula confirmed by owner's statement "9000-7900=1100×5%=55" and prior ₹7,949 confirmation.

---

## Next
Gate 2 GO → PLANNING
