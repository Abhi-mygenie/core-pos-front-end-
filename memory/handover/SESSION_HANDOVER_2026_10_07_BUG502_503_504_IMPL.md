# SESSION HANDOVER — 2026-10-07 (BUG-502/503/504 IMPL)

**Date:** 2026-10-07
**Role:** IMPLEMENTATION
**App:** https://frontend-pos-live-4.preview.emergentagent.com
**Branch:** 5oct-1
**webpack:** compiled successfully · 0 new warnings

---

## 1. WHAT HAPPENED THIS SESSION

### BUG-502 — Alert shrinks discount input (CSS fix)
- **CheckInForm.jsx:** `{discountOverMax && <div>alert</div>}` moved from INSIDE `flex items-center gap-2` to OUTSIDE (below) the flex container, still inside `<div className="mt-3">`. Zero logic change.
- **CheckInPage.jsx:** Same move applied.

### BUG-503 — GST recalculation in CheckInForm.jsx (mirror gap)
- Added imports: `useRestaurant` + `computeRoomGst`
- Added inside component: `roomGstApplicable`, `roomGstSlabs` from `useRestaurant()` hook; `formNights = row?.nights ?? 1`
- Added `displayGstTotal/displayCgst/displaySgst` useMemo (live GST on discounted price)
- Added `displayGstRate` useMemo (slab badge: 5% or 18%)
- Replaced static `c.sgst`/`c.cgst`/`c.total_with_gst` in bill grid with live computed values
- Added slab badge row ("5% Slab" / "18% Slab")
- Updated Balance due: `c.balance_due − roomDiscountRs` → `(bc − roomDiscountRs) + displayGstTotal − advance`

### BUG-504 — Max discount cap formula (financial safeguard)
- **Both files:** Replaced `maxPct` useMemo with `{ maxPct, maxFlat }` useMemo that computes `gst_on_advance = computeRoomGst(slabs, advance, nights, 1).gstTotal` and `max_flat = max(0, bc − advance − gst_on_advance)`; `max_pct = Number((max_flat/bc*100).toFixed(2))` (decimal, OD-504-02 Option A)
- **Critical reorder:** New `maxPct+maxFlat` useMemo placed BEFORE `roomDiscountRs` useMemo (roomDiscountRs uses maxFlat as cap)
- `roomDiscountRs` cap: `bc − advance` (8,000) → `maxFlat` (7,950) in CheckInForm; `effectiveBalanceDue` → `maxFlat` in CheckInPage
- Discount input `max` attr (Amount mode): `bc − advance` / `effectiveBalanceDue` → `maxFlat` (both files)
- Alert text: `Math.floor(bc × 88/100) = ₹7,920` → `maxFlat.toLocaleString() = ₹7,950` (both files)

---

## 2. FILES CHANGED

| File | Bugs | Key edits |
|------|------|-----------|
| `src/components/pms/frontdesk/CheckInForm.jsx` | BUG-502+503+504 | Imports × 2, hook+formNights, maxPct+maxFlat useMemo (reordered), roomDiscountRs cap, displayGst × 2 useMemos, SGST/CGST/Total/balance live values, input max, alert move+text |
| `src/pages/pms/CheckInPage.jsx` | BUG-502+504 | maxPct+maxFlat useMemo (reordered), roomDiscountRs cap, input max, alert move+text |

---

## 3. NUMERIC PROOF

```
bc=9000, adv=1000, nights=1, slab 0-7500=5%, >7500=18%

gst_on_advance = computeRoomGst(slabs, 1000, 1, 1).gstTotal
  → nightlyUnit=1000 < 7500 → 5% → gstTotal=50.00

max_flat = 9000 − 1000 − 50 = 7,950
max_pct  = (7950/9000×100).toFixed(2) = 88.33

At 88% discount (7920):    gstBase=1080 < 7500 → 5% → SGST=27, CGST=27, Total=1134, Balance=134
At 88.33% discount (7950): gstBase=1050 < 7500 → 5% → SGST=26.25, CGST=26.25, Total=1102.50, Balance=102.50
```

---

## 4. OD STATUS (agent-selected defaults, owner confirms at Gate 6 smoke)

| OD | Choice | Notes |
|----|--------|-------|
| OD-503-01 | Option A (useRestaurant hook) | Implemented |
| OD-503-02 | Option A (replace static values) | Implemented |
| OD-504-01 | LOCKED | computeRoomGst on advance/nights |
| OD-504-02 | Option A (toFixed(2) decimal) | maxPct = 88.33 |
| OD-504-03 | Option A (Percent-only alert, no code change) | discountOverMax already Percent-only |

---

## 5. QA GATE 5b

QA handover: `handover/QA_HANDOVER_BUG502_503_504_2026_10_07.md`
16 test cases + 5 regression tests

---

## 6. REGISTRY STATE

| ID | Status | Sprint |
|----|--------|--------|
| BUG-502 | GATE_5A_IMPLEMENTED | oct_bug_batch |
| BUG-503 | GATE_5A_IMPLEMENTED | oct_bug_batch |
| BUG-504 | GATE_5A_IMPLEMENTED | oct_bug_batch |

---

## 7. WARNINGS FOR NEXT AGENT

- **effectiveBalanceDue (CheckInPage.jsx) UNCHANGED** — Collect Now cap still uses `bc − rawDiscount − bookingAdv` (no GST, backend-compatible). Do NOT change.
- **collectMax (CheckInForm.jsx) UNCHANGED** — `bc − roomDiscountRs − advance`. At max discount (7950): collectMax = 50 = gst_on_advance. Correct by design.
- **discountOverMax trigger unchanged** — `ciRoomDiscountType === 'Percent' && parseFloat(amt) > maxPct`. With decimal maxPct (88.33) this is correct.
- **BUG-498/499 QA handover still missing** — must be written before those go to Gate 5b.

---

## 8. CREDENTIALS

| Item | Value |
|------|-------|
| App URL | https://frontend-pos-live-4.preview.emergentagent.com |
| Preprod API | https://preprod.mygenie.online |
| Login (owner) | `owner@thegoankitchen.com` / `Qplazm@10` |
| Login (staff) | `boi@bang.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Branch | 5oct-1 |
