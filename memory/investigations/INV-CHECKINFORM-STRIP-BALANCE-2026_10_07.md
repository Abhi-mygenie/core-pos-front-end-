# INV-CHECKINFORM-STRIP-BALANCE-2026_10_07 — Investigation Report

**Date:** 2026-10-07
**Role:** INVESTIGATION
**Source:** Owner screenshots + code trace
**Files inspected:** `CheckInForm.jsx` L96-111, L287
**Steps used:** 4/10
**Status:** ROOT CAUSE FOUND — HIGH confidence

---

## 1. Summary

Two root causes confirmed. Both are in `CheckInForm.jsx` only.

| # | Issue | Line | Root cause |
|---|-------|------|-----------|
| **I-1** | GST strip shows wrong values at full discount (CGST ₹26.25/SGST ₹26.25/Total ₹1,102.50 — should be ₹25/₹25/₹1,050) | L101, L287 | `displayGstTotal` useMemo applies 5% to `gstBase = 1,050` which includes `gstOnAdv (₹50)` → compound error: 5%×1,050=52.50 |
| **I-2** | Balance due at partial discount excludes GST (shows ₹2,000 not ₹2,150 at ₹6,000 disc) | L96-98 | BUG-506 `displayBalance` uses `bc−disc−advance` (no GST) for ALL non-zero discounts |

---

## 2. Data Flow Trace

### I-1: GST strip compound error at max discount

```
L101: gstBase = bc - roomDiscountRs = 9000 - 7950 = 1050
      BUT: 1050 = advance(1000) + gstOnAdv(50)

computeRoomGst(slabs, 1050, 1, 1):
  5% × 1050 = 52.50   ← applies GST to gstOnAdv(50) itself = 5% × 50 = 2.50 extra (compound)
  Correct:  5% × 1000 = 50.00

L287 strip "Total incl. GST": gstBase(1050) + displayGstTotal(52.50) = 1102.50
  Should be: advance(1000) + gstOnAdv(50) = 1050
```

### I-2: Balance excludes GST at partial discount

```
L96-98 (current BUG-506 fix):
  displayBalance = roomDiscountRs > 0
    ? max(gstOnAdvFloor, bc - roomDiscountRs - advance)   ← NO GST for any discount > 0
    : total_with_gst - advance

At ₹6000 discount:
  max(50, 9000 - 6000 - 1000) = max(50, 2000) = 2000   ← GST (₹150) excluded
  Should be: (3000 + 150) - 1000 = 2150

Owner observation: GST strip shows 3150 (= 3000+150, correct), but balance = 2000 (ignores GST).
These two panels are inconsistent for partial discount.
```

---

## 3. Full picture: what every case produces now vs correct

| Discount | Current balance | Correct | Strip Total incl GST (current) | Strip (correct) |
|----------|----------------|---------|-------------------------------|-----------------|
| ₹0 | 9,620 ✅ | 9,620 | — (strip hidden) | — |
| ₹6,000 | 2,000 ❌ | **2,150** | 3,150 ✅ | 3,150 |
| ₹7,950 (max) | 50 ✅ | 50 | 1,102.50 ❌ | **1,050** |

---

## 4. Unified Fix

Both issues share the same root fix: a `computeBase` guard that routes `displayGstTotal` through `advance` (not `gstBase`) when at max discount. This single change cascades to fix both the strip and the balance.

### Step A — Fix `displayGstTotal` useMemo (L100-103)

```javascript
// CURRENT:
const { gstTotal: displayGstTotal, cgst: displayCgst, sgst: displaySgst } = useMemo(() => {
    const gstBase = Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs);
    return computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, formNights, 1);
}, [c.booking_charge, roomDiscountRs, roomGstApplicable, roomGstSlabs, formNights]);

// FIX: add computeBase guard + expose displayGstBase for balance + strip:
const { gstTotal: displayGstTotal, cgst: displayCgst, sgst: displaySgst, displayGstBase } = useMemo(() => {
    const bc      = Number(c.booking_charge  || 0);
    const advance = Number(c.advance_payment || 0);
    const gstBase = Math.max(0, bc - roomDiscountRs);
    // Compound GST guard: when gstBase = advance + gstOnAdv (at max), use advance as base
    const computeBase = gstBase <= advance + gstOnAdvFloor ? advance : gstBase; // BUG-508+506
    return { ...computeRoomGst(roomGstApplicable, roomGstSlabs, computeBase, formNights, 1), displayGstBase: computeBase };
}, [c.booking_charge, c.advance_payment, roomDiscountRs, roomGstApplicable, roomGstSlabs, formNights, gstOnAdvFloor]);
```

Note: `gstOnAdvFloor` is already computed as a const at L95 (`bc - advance - maxFlat = 50`). Add it as dep.

### Step B — Fix `displayBalance` (L96-98) — remove conditional, use clean unified formula

```javascript
// CURRENT (BUG-506 — wrong for partial discount):
const displayBalance = roomDiscountRs > 0
  ? Math.max(gstOnAdvFloor, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0))
  : Number(c.total_with_gst || 0) - Number(c.advance_payment || 0);

// FIX — unified, no conditional needed:
const displayBalance = displayGstBase + displayGstTotal - Number(c.advance_payment || 0); // BUG-506+508
```

### Step C — Fix strip "Total incl. GST" (L287)

```javascript
// CURRENT:
₹{(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs) + displayGstTotal).toLocaleString(...)}

// FIX — use displayGstBase (matches computeBase, avoids 1050+52.50=1102.50):
₹{(displayGstBase + displayGstTotal).toLocaleString(...)}
```

### Verified trace

| Discount | computeBase | displayGstTotal | displayBalance | Strip Total |
|----------|------------|----------------|----------------|-------------|
| ₹0 | 9,000 (>1050) | 18%×9,000=1,620 | **9,620** ✅ | 10,620 |
| ₹6,000 | 3,000 (>1050) | 5%×3,000=150 | **2,150** ✅ | 3,150 |
| ₹7,950 | 1,000 (≤1050) | 5%×1,000=50 | **50** ✅ | **1,050** ✅ |

---

## 5. Impact on existing code

| Item | Status after fix |
|------|-----------------|
| `gstOnAdvFloor` const (L95) | Kept — now also used as dep in useMemo |
| `displayBalance` conditional | Replaced by clean 1-line formula |
| `displayGstTotal` useMemo | Extended with `computeBase` + adds `displayGstBase` to return |
| `displayCgst` / `displaySgst` | Automatically correct (from same useMemo) |
| `collectMax` (L90) | Not touched |
| `effectiveBalanceDue` CheckInPage | Not touched |

---

## 6. Files affected

`src/components/pms/frontdesk/CheckInForm.jsx` only — 3 edits (L96-98, L100-103, L287).

---

## 7. Planning skip eligibility

| Check | Result |
|-------|--------|
| Financial logic? | YES — balance display |
| ≤ 10 changed lines? | YES (~8 lines) |
| 1 file only? | YES |
| Not a hotspot (R5)? | YES |
| Owner decision needed? | NO — formula is mathematically confirmed |

Fast Lane NOT eligible (financial, Rule R6). Needs Gate 4 GO.
But since this is a REVISION of the just-shipped BUG-506 fix, implementation can be expedited after owner GO.

---

## 8. Evidence

`evidence/INV-CHECKINFORM-FORMULA-2026_10_07/formula_trace.md` — updated
`evidence/INV-CHECKINFORM-STRIP-BALANCE-2026_10_07/` — this report
