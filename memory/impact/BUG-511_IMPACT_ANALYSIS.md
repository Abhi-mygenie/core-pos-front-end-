# BUG-511 — Gate 2: Impact Analysis

**ID:** BUG-511
**Date:** 2026-10-07
**Role:** PLANNING (Gate 2 — Impact Analysis only; Gate 3 not started)
**Code Reality:** FULL — wrong formula live at 2 sites (BUG-509 marker)
**Conflict Pre-check:** RELATED to BUG-512 (same files, different lines — parallel-safe, run BUG-511 first)
**Risk:** CRITICAL (R6 — tax calculation)
**Sprint:** oct_bug_batch

---

## 1. Problem Statement

BUG-509 introduced a universal `gstOnAdvFloor` subtraction that is **only valid in the near-max zone**.
At all other discount levels it incorrectly reduces the GST base by ₹50, producing wrong GST values.

### Symptom Table (owner-confirmed)

| Discount | gstBase | Current computeBase (BUG-509) | Correct computeBase (BUG-511) | Wrong GST | Correct GST | Delta |
|---|---|---|---|---|---|---|
| ₹7,950 (max) | 1050 | 1000 | 1000 | ₹50 ✓ | ₹50 | 0 |
| ₹7,949 (near-max) | 1051 | 1001 | 1001 | ₹50.05 ✓ | ₹50.05 | 0 |
| ₹7,900 | 1100 | **1050** | 1100 | **₹52.50 ❌** | ₹55 | -₹2.50 |
| ₹4,000 | 5000 | **4950** | 5000 | **₹247.50 ❌** | ₹250 | -₹2.50 |
| ₹300 (18% slab) | 8700 | **8650** | 8700 | **₹1,557 ❌** | ₹1,566 | -₹9 |

Boundary rule (owner-confirmed): At ₹7,900, `extraRoom = maxFlat − roomDiscountRs = 7950−7900 = 50`.
Owner verbatim: *"9000-7900=1100×5%=55"* → standard formula applies at extraRoom = 50.

---

## 2. Code Reality Check

### Site A — CheckInForm.jsx (Front Desk v2)

```
grep -n "BUG-509\|computeBase" /app/frontend/src/components/pms/frontdesk/CheckInForm.jsx
```

**Line 104-105 (WRONG):**
```js
// BUG-509: universal formula — always remove gstOnAdv component before GST computation
const computeBase = Math.max(0, gstBase - gstOnAdvFloor);
```

Context:
- `gstBase` = `Math.max(0, bc - roomDiscountRs)` (L103)
- `gstOnAdvFloor` = `bc - advance - maxFlat = 50` (L94, constant regardless of discount)
- Formula subtracts 50 at ALL discount levels → wrong for normal discounts

### Site B — CheckInPage.jsx (legacy path)

**Lines 950-951 (WRONG):**
```js
const gstOnAdvFloor509 = Math.max(0, amt - bookingAdv - maxFlat);  // = 50 (same constant)
const computeBase509 = Math.max(0, gstBase - gstOnAdvFloor509);    // subtracts 50 universally
```

Context:
- Inside a render-time IIFE at L946+, display-only strip
- `roomDiscountRs` and `maxFlat` from component scope (L279-286, L268-276) are accessible
- `gstOnAdvFloor509` evaluates to the same 50 as in CheckInForm

**Code Reality:** FULL — both sites have the defective BUG-509 formula and are live.

---

## 3. Conflict Pre-Check

| Open item | Touches these files? | Lines | Parallel-safe? |
|---|---|---|---|
| BUG-512 (GATE_1_INTAKE) | CheckInForm.jsx L91, L304, L325 + CheckInPage.jsx L291, L863 | Different lines | ✅ parallel-safe; sequential recommended (BUG-511 first as P0) |
| BUG-510 (needs QA handover) | CheckInPage.jsx L274 only | Different area | ✅ no conflict |
| All other check-in bugs (BUG-502..509) | Same files, already shipped | Read-only context | ✅ no conflict |

**Execution order:** BUG-511 first (P0/CRITICAL) → BUG-512 second (P1/CRITICAL).

---

## 4. Correct Formula — Derivation

### The Near-Max Zone Rule

`extraRoom = maxFlat − roomDiscountRs`

This is the amount of actual room balance left beyond the advance.

- When `extraRoom ≥ gstOnAdvFloor (50)`: the gstOnAdv component is not part of the remaining balance being taxed. Apply GST to `gstBase` directly. **Standard path.**
- When `extraRoom < gstOnAdvFloor (50)`: the remaining balance includes some (or all) of the gstOnAdv component — subtracting it avoids compound taxation. **Near-max path.**

### Correct Formula

```js
const extraRoom = maxFlat - roomDiscountRs;
const computeBase = extraRoom < gstOnAdvFloor
  ? gstBase - gstOnAdvFloor   // near-max only: advance+extraRoom < gstOnAdv
  : gstBase;                   // standard: tax the full discounted room
```

### Verification Against All Confirmed Data Points

| Discount | extraRoom | Condition | computeBase | GST (5% slab) | Expected | Match? |
|---|---|---|---|---|---|---|
| ₹7,950 | 0 | 0 < 50 = TRUE | 1050−50 = 1000 | ₹50.00 | ₹50.00 | ✅ |
| ₹7,949 | 1 | 1 < 50 = TRUE | 1051−50 = 1001 | ₹50.05 | ₹50.05 | ✅ |
| ₹7,901 | 49 | 49 < 50 = TRUE | 1099−50 = 1049 | ₹52.45 | ₹52.45 | ✅ (near-max zone) |
| ₹7,900 | 50 | 50 < 50 = FALSE | 1100 | **₹55.00** | **₹55.00** | ✅ |
| ₹4,000 | 3950 | 3950 < 50 = FALSE | 5000 | **₹250.00** | **₹250.00** | ✅ |
| ₹300 (18%) | 7650 | 7650 < 50 = FALSE | 8700 | **₹1,566** | **₹1,566** | ✅ |

Boundary: `extraRoom = gstOnAdvFloor = 50` (at discount ₹7,900) → `50 < 50 = FALSE` → standard formula. Confirmed by owner verbatim.

---

## 5. Affected Files

### Files WILL change

| File | Lines | Change | Risk |
|---|---|---|---|
| `src/components/pms/frontdesk/CheckInForm.jsx` | L104-105 | Replace 1 line: add `extraRoom` const + conditional `computeBase` | CRITICAL (R6) |
| `src/pages/pms/CheckInPage.jsx` | L950-951 | Replace 1 line: add `extraRoom509` const + conditional `computeBase509` | CRITICAL (R6) |

**Total: 2 files, ~2-3 lines net change.**

### Files WILL NOT touch

- `FolioCheckoutPanel.jsx` — checkout formula unrelated
- `pmsService.js` — backend payload uses `gstBase` from submit (different code path, L310-314)
- `roomGstCalculator.js` — utility unchanged
- `CollectPaymentPanel.jsx` (R5) — not in scope
- `orderTransform.js` (R5) — not in scope
- Any test files (no unit tests for this display-only IIFE)

---

## 6. Downstream Impact

### CheckInForm.jsx — displayBalance change

`displayBalance = displayGstBase + displayGstTotal − advance` (L109)

After BUG-511 fix at ₹4,000 discount:
- `computeBase` = 5000 (was 4950)
- `displayGstTotal` = ₹250 (was ₹247.50)
- `displayBalance` = 5000 + 250 − 1000 = **₹4,250** (was ₹4,197.50)

The hint at L304 (`displayBalance > collectMax`) still fires: 4250 > 4000 = TRUE ✓

At ₹7,950 max — no change:
- `displayBalance` = 1000 + 50 − 1000 = **₹50** (unchanged) ✓

BUG-512's hint condition (`displayBalance > collectMax` at max = 50 > 50 = FALSE) is **not affected** — BUG-512 must still be fixed separately.

### CheckInPage.jsx — display-only IIFE

The GST strip values (`gstTotal`, `cgst`, `sgst`, `computeBase509`) are used only for display in the UI. The `gstBase` submitted to the backend (L310: `gstBase = Math.max(0, amt - roomDiscountRs)`) is **not touched** by this fix.

### Slab Badge

Both files use `gstBase / formNights` (not `computeBase`) for slab determination (CheckInForm L112-116, CheckInPage L954). No change to slab logic. ✓

---

## 7. Risk Assessment

| Dimension | Assessment |
|---|---|
| **Risk class** | CRITICAL (R6 — tax display) |
| **Hotspot files?** | NO — CheckInForm + CheckInPage are NOT in the R5 list |
| **Financial write path affected?** | NO — `pmsService.js` submit uses `gstBase` (L310), not `computeBase`. Display only. |
| **Backend payload change?** | NO |
| **Regression risk** | LOW — change is conditional; max/near-max cases produce identical results |
| **Fast Lane eligible?** | NO — CRITICAL financial display, owner approval required |
| **Planning skip eligible?** | NO — 2 files, CRITICAL risk (standard gate flow required even though blast is small) |

---

## 8. Open Questions / Owner Decisions

**None.** Formula and all data points confirmed by:
- Owner verbatim: *"9000-7900=1100×5%=55"*
- Owner confirmation of ₹7,949 producing ₹50.05
- Owner confirmation of ₹7,950 (max) producing ₹50
- Investigation report: `investigations/INV-GST-FORMULA-FINAL-2026_10_07.md`

---

## 9. Verification Matrix (seeds Gate 3 Implementation Plan)

| # | File | Lines | Change Description | Verification Method |
|---|---|---|---|---|
| 1 | CheckInForm.jsx | L104-105 | Add `extraRoom = maxFlat−roomDiscountRs` const; change `computeBase` to conditional | Browser: enter ₹7,900 → CGST ₹27.50 / Total GST ₹55 / Balance ₹155. Enter ₹7,950 → GST ₹50 (unchanged). |
| 2 | CheckInPage.jsx | L950-951 | Add `extraRoom509` const; change `computeBase509` to conditional | Same verification on legacy `/pms/check-in` route with same discount values. |
| REG | Both files | — | `// BUG-511` markers on every changed line | `grep -n "BUG-511" CheckInForm.jsx CheckInPage.jsx` — must return ≥1 hit each |
| COMPILE | webpack | — | 0 new warnings | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled successfully" |

---

## 10. Post-Code Registry Checklist (for Implementation agent)

- [ ] `registry.json`: BUG-511 → `status: GATE_5A_IMPLEMENTED`, `sprint_key: oct_bug_batch`
- [ ] `BUG_TRACKER.md`: row updated with IMPLEMENTED status
- [ ] `FILE_OWNERSHIP.md`: CheckInForm.jsx + CheckInPage.jsx — add BUG-511 + date
- [ ] Code markers: `// BUG-511` on every modified line
- [ ] Compile check: webpack 0 new warnings

---

## Gate 2 Summary

```
Impact Analysis complete: BUG-511
Code Reality: FULL (both sites live with defective BUG-509 formula)
Conflict: RELATED to BUG-512 (same files, different lines — sequential, BUG-511 first)
Risk: CRITICAL (R6) — display-only, no backend payload change
Files WILL change: CheckInForm.jsx (L104-105) + CheckInPage.jsx (L950-951)
Files WILL NOT touch: FolioCheckoutPanel, pmsService, roomGstCalculator, CollectPaymentPanel, orderTransform
Owner decisions needed: NONE — formula confirmed, no open ODs
Awaiting: Gate 3 GO → Implementation Plan
```
