# BUG-500 — Gate 3 Implementation Plan (FINAL)

**Date:** 2026-10-06 — revised post-probe
**Author:** PLANNING agent
**Probe finding:** Backend ignores `gst_tax`; `balance_payment = room − discount − advance` (no GST)
**OD-500-04 confirmed:** Collect Now max uses backend formula (no GST). GST strip = display only.
**Risk:** CRITICAL
**File WILL change:** `src/pages/pms/CheckInPage.jsx` ONLY — 2 edits
**Files WILL NOT touch:** CheckInForm.jsx · pmsService.js · frontDeskService.js · any other file

**Must run BEFORE BUG-496 and BUG-497** (both depend on corrected effectiveBalanceDue)

---

## F1 — CheckInPage.jsx L253-259 · effectiveBalanceDue useMemo (REVISED)

### Why the previous Gate 3 formula was wrong

Previous plan included `computeRoomGst` (new slab GST). Probe showed:
- Backend formula: `bp = room − discount − advance` (NO GST)
- If FE effectiveBalanceDue = 134 (with new 5% GST) and staff collects 134:
  - Backend stores `bp = −54` → in-house balance shows `−54 + chargeGst(1620) = 1566` (wrong)
- Correct: effectiveBalanceDue = 80 → staff collects 80 → `bp = 0` → balance = 0 ✓

### Current (L253-259):
```javascript
  // BUG-490: effective balance due = room amount + GST − advance already paid
  const effectiveBalanceDue = useMemo(() => {
    const base    = Number(form?.orderAmount   || 0);
    const advance = Number(form?.advancePayment || 0);
    const { gstTotal } = computeRoomGst(roomGstApplicable, roomGstSlabs, base, formNights ?? 1, 1);
    return Math.max(0, base + (gstTotal || 0) - advance);
  }, [form?.orderAmount, form?.advancePayment, roomGstApplicable, roomGstSlabs, formNights]);
```

### After:
```javascript
  // BUG-500: effectiveBalanceDue = backend-compatible formula (no GST, OD-500-04)
  // Backend stores: bp = room_price − discount − advance_total (confirmed by curl probe 2026-10-06)
  // Sending GST-inclusive value causes negative bp → broken in-house balance display.
  // bookingAdv: booking advance from LR (selected?.charge?.advance_payment)
  // rawDiscount: raw discount input (uncapped) to avoid circular dep with roomDiscountRs
  const effectiveBalanceDue = useMemo(() => {
    const base       = Number(form?.orderAmount || 0);
    const bookingAdv = Number(selected?.charge?.advance_payment || 0); // BUG-500: booking advance
    const rawDiscount = ciRoomDiscountType === 'Percent'
      ? Math.floor(base * (parseFloat(ciRoomDiscountAmt) || 0) / 100)
      : (parseFloat(ciRoomDiscountAmt) || 0);                          // BUG-500: raw (uncapped)
    return Math.max(0, base - rawDiscount - bookingAdv);               // BUG-500: no GST
  }, [form?.orderAmount, ciRoomDiscountAmt, ciRoomDiscountType, selected?.charge?.advance_payment]);
```

**What changes:**
- Removes `computeRoomGst` call — no GST in formula
- Removes `form.advancePayment` from formula — collect-now does not reduce discount Amount cap
- Adds `bookingAdv = selected?.charge?.advance_payment` — booking advance deducted
- Uses `rawDiscount` from input (before cap) — breaks circular dep with `roomDiscountRs`
- New deps: `ciRoomDiscountAmt, ciRoomDiscountType, selected?.charge?.advance_payment`

**Numeric proof:**
```
Room=9000, bookingAdv=1000, 88% disc:   rawDiscount=7920 → effectiveBalanceDue=80 ✓
Room=9000, bookingAdv=1000, 0% disc:    rawDiscount=0    → effectiveBalanceDue=8000 ✓
Room=9000, bookingAdv=0 (walk-in), 0%: rawDiscount=0    → effectiveBalanceDue=9000 ✓
```

**Walk-in safety:** `selected?.charge?.advance_payment` = undefined → `bookingAdv = 0` → no deduction ✓

---

## F2 — CheckInPage.jsx L926 · GST strip gstBase

### Current (L926):
```javascript
                      const gstBase = amt; // BUG-396: advance is deposit — GST base is room amount only
```

### After:
```javascript
                      const gstBase = Math.max(0, amt - roomDiscountRs); // BUG-500: GST on discounted price (OD-500-01, display only)
```

**What changes:** One-line change. `roomDiscountRs` is in scope (computed at L263-270).
- No discount: `gstBase = 9000` → 18% slab → SGST ₹810, CGST ₹810 ✓ (unchanged)
- 88% discount: `gstBase = 9000 − 7920 = 1080` → 5% slab → SGST ₹27, CGST ₹27 ✓
- Cascade: `rate` (L930), `gstTotal` (L928), `total incl. GST` (L960) all update automatically

---

## Verification Matrix

| # | Edit | Check | How |
|---|------|-------|-----|
| V1 | F1 | effectiveBalanceDue=80 for 88% disc on ₹9000/₹1000 adv | Code: max(0,9000−7920−1000)=80 |
| V2 | F1 | effectiveBalanceDue=8000 for 0% disc | Code: max(0,9000−0−1000)=8000 |
| V3 | F1 | Walk-in: effectiveBalanceDue=9000 | Code: selected?.charge?.advance_payment=undef → 0 |
| V4 | F1 | No circular dep: uses rawDiscount not roomDiscountRs | grep: `ciRoomDiscountAmt` in deps not `roomDiscountRs` |
| V5 | F2 | GST strip shows 5% after 88% disc | Browser: type 88% → strip shows 5% Slab |
| V6 | F2 | Strip updates live on each keystroke | Browser: watch while typing |
| V7 | F2 | At 0% disc: strip unchanged (18%) | Browser: no discount entered → 18% |
| V8 | ALL | webpack 0 new warnings | tail frontend.out.log |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-500 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-500 row updated
- [ ] FILE_OWNERSHIP.md: CheckInPage.jsx — BUG-500 2026-10-06
- [ ] Code markers: // BUG-500 in every modified block
- [ ] Compile: 0 new warnings
```
