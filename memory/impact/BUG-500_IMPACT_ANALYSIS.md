# BUG-500 — Gate 2 Impact Analysis

**Date:** 2026-10-06
**Role:** PLANNING (Gate 2 only)
**Risk:** CRITICAL (financial — wrong GST rate shown and sent; wrong balance display; wrong collect-now cap cascade)
**Code Reality:** PARTIAL — `computeRoomGst` is called correctly elsewhere; wrong input (full price) given at these sites

---

## Conflict Pre-Check

| File | Last touched | By | Lines we'll touch | Safe? |
|------|-------------|-----|-------------------|-------|
| `CheckInPage.jsx` | 2026-10-06 | BUG-495 + BUG-492 IMPL | L254-259 effectiveBalanceDue, L924-930 GST strip | ✅ non-overlapping with BUG-496 (L271-280, L301) and BUG-497 (L847, L283, L887, L903) |

Single file. No conflict.

---

## Data Flow Trace

### Root Cause A — effectiveBalanceDue (L254-259)

```
CURRENT:
  const base    = Number(form?.orderAmount   || 0);  // 9,000
  const advance = Number(form?.advancePayment || 0); // 0 (collect-now, starts empty)
  const { gstTotal } = computeRoomGst(roomGstApplicable, roomGstSlabs, base, formNights, 1);
  // gstTotal = computeRoomGst(slabs, 9000, 1, 1) = 1,620 (18%)
  return Math.max(0, base + gstTotal - advance);
  // = Math.max(0, 9000 + 1620 - 0) = 10,620  ← WRONG (should be ~9,620)

Two bugs compound:
  1. Booking advance (₹1,000) never deducted → result 1,000 too high
  2. GST computed on FULL price, not discounted price → gstTotal wrong when discount applied

CORRECT:
  const bookingAdv  = Number(selected?.charge?.advance_payment || 0); // 1,000
  const rawDiscount = ciRoomDiscountType === 'Percent'
    ? Math.floor((Number(form?.orderAmount||0) * (parseFloat(ciRoomDiscountAmt)||0)) / 100)
    : (parseFloat(ciRoomDiscountAmt) || 0);
  const discountedBase = Math.max(0, Number(form?.orderAmount||0) - rawDiscount);
  const { gstTotal } = computeRoomGst(roomGstApplicable, roomGstSlabs, discountedBase, formNights??1, 1);
  return Math.max(0, discountedBase + gstTotal - bookingAdv - Number(form?.advancePayment||0));

  // Example — 88% discount entered:
  // discountedBase = 9000 - 7920 = 1,080
  // gstTotal = computeRoomGst(1080) = 54 (5% slab — CORRECT slab crossing!)
  // effectiveBalanceDue = 1080 + 54 - 1000 - 0 = 134  ✓

Why rawDiscount not roomDiscountRs?
  roomDiscountRs is capped at effectiveBalanceDue (creates circular dependency).
  Using the RAW input (before capping) breaks the cycle.
  rawDiscount may exceed bc - advance, but effectiveBalanceDue handles this via Math.max(0,...).
```

### Root Cause B — GST Strip (L924-930)

```
CURRENT (L924-930):
  const amt     = Number(form.orderAmount) || 0;  // 9,000
  const gstBase = amt;  // BUG-396: full price always, never discounted ← WRONG
  const { gstTotal, cgst, sgst } = computeRoomGst(slabs, gstBase, nights, 1);
  const rate = slabs.find(s => (gstBase/nights) >= s.min && ...).gst_percent;

  For 88% discount scenario:
    gstBase = 9,000 → slab: 9,000/1 = 9,000 > 7,500 → 18%
    Shows: SGST ₹810, CGST ₹810, Total ₹10,620  ← WRONG

CORRECT:
  const gstBase = Math.max(0, amt - roomDiscountRs);  // discounted base
  // roomDiscountRs is safe to use here (no circular dep — GST strip is READ-ONLY, not feeding effectiveBalanceDue)

  For 88% discount:
    roomDiscountRs = 7,920
    gstBase = 9,000 - 7,920 = 1,080
    1,080/1 = 1,080 < 7,500 → 5% slab
    Shows: SGST ₹27, CGST ₹27, Total ₹1,134  ← CORRECT ✓
```

### Cascade: effectiveBalanceDue → roomDiscountRs cap

```
CURRENT:
  roomDiscountRs (L263-270):
    cap = effectiveBalanceDue  (= 10,620 currently)
    → discount can be up to ₹10,620 (more than room rent + GST + advance!)

AFTER BUG-500 fix:
  effectiveBalanceDue → 134 (for 88% discount scenario) — correct
  roomDiscountRs cap = 134  ← correct, prevents discount beyond actual balance

Note: BUG-496 also changes cap via roomDiscountRs in CheckInForm (different file).
In CheckInPage, the cap source is effectiveBalanceDue (owned by BUG-500).
```

---

## Circular Dependency — Solved

```
PROBLEM:
  effectiveBalanceDue uses → roomDiscountRs (for balance calc)
  roomDiscountRs    uses → effectiveBalanceDue (as cap)
  → infinite circular dependency if effectiveBalanceDue tries to use roomDiscountRs

SOLUTION:
  effectiveBalanceDue uses → rawDiscount (uncapped input directly)
  roomDiscountRs    uses → effectiveBalanceDue (as cap — same as before)
  
  rawDiscount derived from ciRoomDiscountAmt + ciRoomDiscountType (same source as roomDiscountRs input)
  but WITHOUT the cap — breaking the cycle cleanly.
```

---

## Affected Lines — Final Edit Map

### CheckInPage.jsx — only file

| Edit | Line | Current | Change | Risk |
|------|------|---------|--------|------|
| F1 | L254-259 | `effectiveBalanceDue` — full price, no bookingAdv | Rewrite: use `discountedBase` + deduct `bookingAdv` | CRITICAL |
| F2 | L924-930 | `const gstBase = amt` (full price) | `const gstBase = Math.max(0, amt - roomDiscountRs)` | CRITICAL |
| F3 | L930 | `rate` lookup uses full `gstBase/nights` | Cascades from F2 — no separate change | — |
| F4 | L960 | `₹{fmt(gstBase + gstTotal)}` | Cascades from F2 — no separate change | — |

**2 targeted edits, 1 file.** F3 and F4 cascade automatically from F2.

---

## New Variable for F1

```js
// Inline derivation — no new state or hook needed:
const bookingAdv = Number(selected?.charge?.advance_payment || 0);

const rawDiscount = ciRoomDiscountType === 'Percent'
  ? Math.floor((Number(form?.orderAmount || 0) * (parseFloat(ciRoomDiscountAmt) || 0)) / 100)
  : (parseFloat(ciRoomDiscountAmt) || 0);

const discountedBase = Math.max(0, Number(form?.orderAmount || 0) - rawDiscount);
const { gstTotal } = computeRoomGst(roomGstApplicable, roomGstSlabs, discountedBase, formNights ?? 1, 1);
effectiveBalanceDue = Math.max(0, discountedBase + gstTotal - bookingAdv - Number(form?.advancePayment || 0));
```

`selected` and `ciRoomDiscountAmt` / `ciRoomDiscountType` are already in scope at L254. No new state.

---

## Downstream Consumers of effectiveBalanceDue

| Consumer | Line | Impact after fix |
|----------|------|-----------------|
| `roomDiscountRs` cap (L267, L269) | L263-270 | Correct cap — ≤ real balance |
| Discount Amount input `max` (L900) | L900 | `max={effectiveBalanceDue}` — shows correct Amount max |
| `discountOverMax` alert ₹ display (L917) | L917 | Uses `form.orderAmount × maxPct / 100` — unaffected |

---

## GST Strip — Additional Lines Checked

```
L931: const hasGst = roomGstApplicable && roomGstSlabs && gstTotal > 0
  After fix: if discount = 100% → gstBase = 0 → gstTotal = 0 → hasGst = false → strip hidden ✓

L933: if (!amt || (!hasGst && !notApplicable)) return null
  amt = form.orderAmount (full room amount) — stays as-is.
  Strip only hides when user hasn't entered room amount, or GST not configured.
  When discount = 100%: amt > 0 but gstTotal = 0 → hasGst = false → strip hidden ✓
```

---

## Walk-in Edge Case

Walk-in: `selected = { bookingType:'WalkIn' }` → `selected?.charge?.advance_payment = undefined` → `bookingAdv = 0`

```
effectiveBalanceDue = discountedBase + gstTotal - 0 - form.advancePayment
```
No booking advance to deduct → same result as current for walk-in with 0 advance. ✓

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| rawDiscount in effectiveBalanceDue > max valid discount | `Math.max(0, ...)` guards negative result |
| `ciRoomDiscountAmt` is '' on page load → rawDiscount = 0 | `parseFloat('')||0 = 0` → safe |
| GST strip shows nothing after large discount | By design — if gstBase = 0, no GST strip needed |
| formNights = null before dates selected | `formNights ?? 1` guard unchanged |
| `computeRoomGst` import | Already imported at L12, no change |

---

## Owner Decisions

All locked (OD-500-01/02/03). No new decisions needed.

---

**Gate 2 complete. No open decisions. Ready for Gate 3 (Implementation Plan) on owner GO.**
**Files WILL change:** `CheckInPage.jsx` only
**Files WILL NOT touch:** CheckInForm.jsx · pmsService.js · frontDeskService.js · any other file
