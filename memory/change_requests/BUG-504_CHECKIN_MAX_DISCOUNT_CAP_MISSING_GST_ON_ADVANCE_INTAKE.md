# BUG-504 — Intake Document

**ID:** BUG-504
**Date:** 2026-10-07
**Phase:** Check-In · Front Desk (Beta) + Check-In Page
**Area:** PMS → Check-In → Max Discount Cap Formula
**Priority:** P0
**Severity:** BLOCKER (financial safeguard — discount cap is incorrect; staff can over-discount)
**Risk:** CRITICAL
**Sprint:** oct_bug_batch
**Status:** GATE_1_INTAKE
**Source:** OWNER-REPORTED (formula described in owner message + screenshots 2026-10-07)
**Confidence:** HIGH (code-traced + owner's numeric proof verified)
**Duplicate check:** RELATED BUG-496 — BUG-496 revised the maxPct formula but still omits GST-on-advance preservation. This registers the remaining gap.
**Blast radius:** SMALL — 2 files (CheckInForm.jsx + CheckInPage.jsx), ~8-10 lines total
**Fast Lane eligible:** NO (CRITICAL risk, financial cap, 2 files)

---

## 1. Symptom

The maximum discount cap in the check-in discount input shows **two wrong values simultaneously**:

| Value | Currently shown | Correct | Direction of error |
|-------|----------------|---------|-------------------|
| **Green** `−₹8,000` | Flat cap = `bc − advance` = 8,000 | ₹7,950 | **Too permissive** — allows discounting ₹50 more than safe |
| **Red alert** `88% (₹7,920)` | `floor((bc−adv)/bc×100)` = 88% → `9000×88/100` = 7,920 | 88.33% (₹7,950) | **Too conservative in text** — shows ₹30 less than true max |

Both are wrong, in opposite directions. The flat input allows up to ₹8,000 (over-discounts), while the % alert warns at ₹7,920 (under-represents the headroom).

**Owner's scenario (room=9,000 · advance=1,000 · 1 night · GST slabs {0-7500:5%, >7500:18%}):**
```
gst_on_advance = computeRoomGst(slabs, advance=1000, nights=1, rooms=1).gstTotal
               = nightlyUnit(1000) → 5% slab → 50.00

max_flat       = (bc − advance) − gst_on_advance
               = (9,000 − 1,000) − 50 = ₹7,950

max_pct        = (max_flat / bc × 100).toFixed(2)
               = (7,950/9,000 × 100) = 88.33%

Alert should read: "Maximum discount: 88.33% (₹7,950)..."
```

---

## 2. Business Rule (owner-stated, LOCKED)

**"Maximum discount = due balance (excl. GST) minus GST of advance at booking time"**

- `due_balance_excl_gst` = `bc − advance` (room rent minus advance already paid)
- `gst_on_advance` = GST on the advance amount, using the accommodation slab applicable to `advance/nights` per night:
  - advance=1,000, nights=1 → nightlyUnit=1,000 < 7,500 → **5% slab → gst=50**
  - advance=9,000, nights=1 → nightlyUnit=9,000 > 7,500 → **18% slab → gst=1,620**
- The cap ensures: after discount, `remaining_balance ≥ gst_on_advance` (the GST that was implicitly collected on the advance is protected)

**Two cases confirmed by owner:**
```
Case 1 (5% on advance): max_flat = 8,000 − 50 = ₹7,950 → max_pct = 88.33%
Case 2 (18% on advance): max_flat = 8,000 − 180 = ₹7,820 → max_pct = 86.89%
```

---

## 3. Root Cause (from investigation)

**Current BUG-496 implementation (both files):**
```javascript
// CheckInForm.jsx L70-75 — maxPct:
return Math.floor(Math.max(0, bc - advance) / bc * 100); // = floor(88.88) = 88

// CheckInForm.jsx L63 — flat cap:
const cap = Math.max(0, bc - Number(c.advance_payment || 0)); // = 8000 (no gst deducted)

// Alert text L219:
Maximum discount: {maxPct}% (₹{Math.floor(bc * maxPct / 100)})
// = "88% (₹7920)" — floor of floor causes double precision loss
```

**What's missing:**
1. `computeRoomGst(applicable, slabs, advance, nights, 1)` call to get `gst_on_advance`
2. `max_flat = (bc − advance) − gst_on_advance` (not just `bc − advance`)
3. `max_pct` expressed as `(max_flat/bc×100).toFixed(2)` (not floor'd integer)
4. Alert text shows `max_flat` directly (not re-derived from floor'd %)

---

## 4. Fix Scope

```
Files WILL change:  CheckInForm.jsx · CheckInPage.jsx
Files WILL NOT touch: FolioCheckoutPanel.jsx · pmsService.js · any other file
```

**CheckInPage.jsx** — can be fixed independently (already has `computeRoomGst` + `roomGstSlabs`).

**CheckInForm.jsx** — DEPENDS ON BUG-503 being implemented first (needs `computeRoomGst` import and slab config from BUG-503 infrastructure).

**Estimated:** ~5 lines per file (maxPct useMemo + flat cap + alert text).

---

## 5. Owner Decisions

**OD-504-01 — LOCKED (from investigation):**
Use `computeRoomGst(applicable, slabs, advance, nights, 1).gstTotal` for `gst_on_advance`.
- CheckInForm.jsx: `nights` = `row.nights ?? 1` (available from props)
- CheckInPage.jsx: `nights` = `formNights ?? 1` (already in scope)

**OD-504-02 (OPEN):** Percentage display format in alert and cap indicator

- **Option A — Decimal precision (RECOMMENDED):** Show `(max_flat/bc×100).toFixed(2)` = `88.33%` in alert. Matches owner's expectation ("88.32%" was stated, rounding to 2dp). Alert reads: `"Maximum discount: 88.33% (₹7,950)..."`
- **Option B — Floor with correct flat:** Keep `floor()` for the % but show `max_flat` (₹7,950) in the alert, not `bc × floor_pct / 100` (₹7,920). Alert reads: `"Maximum discount: 88% (₹7,950)..."`

Owner's stated values ("88.32%") suggest Option A (decimal precision).

**OD-504-03 (OPEN):** `discountOverMax` trigger condition (when to show the red alert)

- **Option A:** `parseFloat(ciRoomDiscountAmt) > max_flat_pct` (comparing against decimal %, stricter)
- **Option B:** `roomDiscountRs >= max_flat` (comparing resolved ₹ against ₹ cap, equivalent but cleaner)

Recommendation: Option B — simpler, avoids floating point comparison, works for both Amount and Percent modes uniformly.

---

## 6. Evidence

- Owner message with explicit formula + two numeric examples (5% and 18% cases)
- Screenshots: red alert shows "88% (₹7920)", green shows "₹8000"
- Code trace: `CheckInForm.jsx:59-75,201,219` · `CheckInPage.jsx:277-282,903,920`
- `roomGstCalculator.js`: `computeRoomGst` — `nightlyUnit = totalAmount/roomCount/nights`; 5% slab when nightlyUnit ≤ 7500
- Investigation: `investigations/INV-CHECKIN-DISCOUNT-CAP-GST-2026_10_07.md` § F3

---

## 7. Execution constraint

**CheckInForm.jsx fix** requires BUG-503 infrastructure (imports + slab config) first.
**CheckInPage.jsx fix** is independent — can proceed in parallel with BUG-503.

Recommended order: BUG-502 (Fast Lane) → BUG-503 → BUG-504 (both files, same implementation batch).
