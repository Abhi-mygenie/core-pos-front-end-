# BUG-500 — Intake

**ID:** BUG-500
**Date:** 2026-10-06
**Source:** OWNER-DESCRIBED (2026-10-06 session scenario) + INV-500 (2026-10-06) + INV-LOGIN-BOOKING-PHASE_2026_10_06
**Severity:** P1 — CRITICAL
**Risk:** CRITICAL (financial — wrong GST shown and sent; due balance calculation wrong; hotel collects wrong amount)
**Sprint:** oct_bug_batch
**Duplicate check:** DISTINCT (INV-500 F1/F2/F3 formally registered here; INV-501 also contributed)
**Blast radius:** MEDIUM (1 file — CheckInPage.jsx — 4 calculation chains all in same component)
**Fast Lane eligible:** NO (CRITICAL financial logic)

---

## Description

Three compounding bugs in `CheckInPage.jsx` (legacy check-in) — all in the same calculation chain.
When a check-in discount is entered, three things fail together:

### Bug A — effectiveBalanceDue misses the booking advance

```
CURRENT (L254-259):
  effectiveBalanceDue = orderAmount + computeRoomGst(orderAmount) − form.advancePayment
                      = 9,000 + 1,620 − 0 = ₹10,620   ← WRONG

  Problem: form.advancePayment = collect-NOW (starts 0). The ₹1,000 booking advance is
  in selected?.charge?.advance_payment — it is NOT deducted!

CORRECT:
  bookingAdv = Number(selected?.charge?.advance_payment || 0)  = 1,000
  effectiveBalanceDue = orderAmount + newGST(discounted) − bookingAdv − form.advancePayment
                      = 9,000 + newGST − 1,000 − 0 = 8,000 + newGST

  Impact: effectiveBalanceDue = ₹10,620 instead of ₹9,620 → all downstream caps are ₹1,000 too high
```

### Bug B — effectiveBalanceDue uses full price, not discounted price

```
CURRENT (L254-259):
  gstBase = form.orderAmount = 9,000 (full price, ignores discount)
  gstTotal = computeRoomGst(slabs, 9,000) = 1,620 (18%)
  → effectiveBalanceDue = 9,000 + 1,620 − advance = 10,620 (ignores discount)

  Problem: If discount = ₹4,600 (pushes room from ₹9,000 to ₹4,400 < ₹7,500):
  - Current slab: still 18% (wrong) → shows 18% on full room
  - Correct slab: 5% → gstTotal = 220 → effectiveBalanceDue drops accordingly

CORRECT:
  discountedBase = Math.max(0, orderAmount − roomDiscountRs)
  gstTotal = computeRoomGst(slabs, discountedBase, nights, 1)
  effectiveBalanceDue = discountedBase + gstTotal − bookingAdv − form.advancePayment
```

### Bug C — GST strip shows wrong slab (never recalculates on discount)

```
CURRENT (L924-930):
  const gstBase = amt; // = form.orderAmount = 9,000 (full price always)
  → GST strip always shows 18%, SGST ₹810, CGST ₹810, Total ₹10,620

  Problem: Owner enters 88% discount → room drops to ₹1,000 → slab should switch to 5%
  But strip still shows: SGST ₹810, CGST ₹810, Total ₹10,620  ← completely wrong

  Owner: "if amount crosses/drops ₹7,500 the GST [slab] rise and drops 5-18%"

CORRECT:
  const gstBase = Math.max(0, amt − roomDiscountRs); // on discounted price
  → Slab recalculates live as discount changes
  → Strip shows: SGST ₹25, CGST ₹25, Total ₹1,050  (after 88% discount) ✓
```

---

## Impact Chain

```
Discount entered → roomDiscountRs changes
  ↓
BUG C: GST strip should recalculate on gstBase = (orderAmount − discount)
         Currently: stays at full 18%, shows wrong SGST/CGST/Total
  ↓
BUG B: effectiveBalanceDue should recalculate on discounted + new GST
         Currently: uses full price + wrong GST → too high by ₹(discount + gstDiff)
  ↓
BUG A: effectiveBalanceDue should also deduct booking advance
         Currently: misses ₹1,000 → ₹1,000 too high always
  ↓
Downstream uses of effectiveBalanceDue (all wrong):
  • roomDiscountRs cap (L267): capped at wrong (too-high) effectiveBalanceDue
  • Discount Amount mode input max (L900): wrong max
  • Collect Now max (fixed by BUG-497 using balance_due directly)
```

---

## Owner Decisions

**OD-500-01: GST recalculates on discounted base, slab-aware**
→ **LOCKED 2026-10-06** (owner: "if amount crosses/drops 7500 the GST rise and drops 5-18%")

**OD-500-02: Slab crossing shown live in GST strip**
→ **LOCKED** — strip recalculates with each keystroke on discount input

**OD-500-03: Calculations to right panel (deferred)**
→ **LOCKED but DEFERRED** — will happen in a later phase

---

## Fix Scope (Gate 3 plan will follow)

| # | File | Site | Change |
|---|------|------|--------|
| F1 | CheckInPage.jsx | L254-259 effectiveBalanceDue | Deduct bookingAdv; use discountedBase for GST compute |
| F2 | CheckInPage.jsx | L924-930 GST strip gstBase | `Math.max(0, amt − roomDiscountRs)` instead of full `amt` |
| F3 | CheckInPage.jsx | L960 strip total line | `gstBase + gstTotal` (where gstBase = discounted) |
| F4 | CheckInPage.jsx | L267 roomDiscountRs cap | Uses effectiveBalanceDue (cascades from F1 fix) |

**New variable needed:** `bookingAdv = Number(selected?.charge?.advance_payment || 0)` — derived from `selected` (the arrival row already in scope, set in `selectArrival`).

**Files WILL NOT touch:** CheckInForm.jsx · FolioCheckoutPanel.jsx · pmsService.js · any other file

---

## Evidence

- **INV-500:** `investigations/INV-500-DESIGN-GST-SLAB-ROW-CLICK.md` F1/F2/F3 confirmed
- **INV report:** `investigations/INV-LOGIN-BOOKING-PHASE_2026_10_06.md` §F5/F6
- **Code trace:**
  - `CheckInPage.jsx L254-259`: effectiveBalanceDue no bookingAdv, no discounted base
  - `CheckInPage.jsx L924-930`: `gstBase = amt` (line L926 comment: "BUG-396: advance is deposit — GST base is room amount only" — this comment is from a different fix and is stale here)
  - `roomGstCalculator.js`: already handles slab correctly — just needs discounted amount as input
- **Owner scenario proof:**
  ```
  room=9000, advance=1000, discount=88%(~₹7920)
  discountedBase = 9000−7920 = 1080
  slab: 1080 < 7500 → 5%
  gst = 54, sgst=27, cgst=27
  total = 1134
  effectiveBalanceDue = 1134 − 1000 (bookingAdv) − 0 (collectNow) = 134 ✓ (positive)

  CURRENT SHOWS (wrong):
  gstBase = 9000 (full), gst = 1620 (18%), total = 10620
  effectiveBalanceDue = 10620 − 0 (no bookingAdv) = 10620 ← wrong by ₹10,486
  ```
- **Confidence:** HIGH

---

## Circular Dependency Solution

`effectiveBalanceDue` currently uses `roomDiscountRs` as cap, and `roomDiscountRs` uses `effectiveBalanceDue` as cap → circular.

**Solution (from INV-500):** Break cycle by using `ciRoomDiscountAmt` RAW (uncapped) for effectiveBalanceDue, not the capped `roomDiscountRs`:
```js
// effectiveBalanceDue uses raw discount input (before capping)
const discountAmtRaw = ciRoomDiscountType === 'Percent'
  ? Math.floor((Number(form?.orderAmount||0) * (parseFloat(ciRoomDiscountAmt)||0)) / 100)
  : (parseFloat(ciRoomDiscountAmt) || 0);
const discountedBase = Math.max(0, Number(form?.orderAmount||0) − discountAmtRaw);
const { gstTotal } = computeRoomGst(roomGstApplicable, roomGstSlabs, discountedBase, formNights??1, 1);
const bookingAdv = Number(selected?.charge?.advance_payment || 0);
effectiveBalanceDue = Math.max(0, discountedBase + gstTotal − bookingAdv − Number(form?.advancePayment||0));

// roomDiscountRs STILL uses the capped effectiveBalanceDue (unchanged formula)
roomDiscountRs = Math.min(discountAmtRaw, effectiveBalanceDue)
```

---

## Verification Matrix

| # | Check | How |
|---|-------|-----|
| V1 | GST strip shows 5% after discount crosses ₹7,500 boundary | Browser: enter 88% discount on ₹9,000 room → strip shows 5% slab |
| V2 | SGST/CGST update live with each keystroke | Browser: watch GST strip update as discount entered |
| V3 | effectiveBalanceDue = 134 for ₹9,000/₹1,000/88% scenario | Code: Math.max(0, 1080+54−1000−0) = 134 |
| V4 | No circular dependency | Code: effectiveBalanceDue uses raw input, not roomDiscountRs |
| V5 | Walk-in (no booking advance): effectiveBalanceDue = full total | Code: bookingAdv=0 → no change for walk-in |
| V6 | Compile: 0 new warnings | tail frontend.out.log |

---

## Post-Code Checklist

```
- [ ] registry.json: BUG-500 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: new row added + updated
- [ ] FILE_OWNERSHIP.md: CheckInPage.jsx — BUG-500 2026-10-06
- [ ] Code markers: // BUG-500 in every modified block
- [ ] Compile: 0 new warnings
```

---

**Status:** GATE_1_INTAKE → Gate 2 + Gate 3 needed before Gate 4 GO
**Recommended sequencing:** BUG-496 first (fixes maxPct) → BUG-500 (fixes effectiveBalanceDue + GST strip, uses same file) → BUG-497 (fixes Collect Now cap + reset — picks up corrected effectiveBalanceDue)
