# BUG-666 — Implementation Plan (Gate 3)

**ID:** BUG-666
**Date:** 2026-11-10
**Stage:** Gate 3 — Implementation Plan
**Risk:** CRITICAL (financial, R5 hotspot)
**Code Reality at HEAD:** PARTIAL — both buggy paths present. `BUG-666` marker absent.
**OD-666-01:** LOCKED — Option A (CPP internal fix; `orderTransform.js` NOT touched)
**OD-666-02:** LOCKED — ALL types (prepaid, postpaid, QSR, collect-bill)
**IA:** `impact/BUG-666_IMPACT_ANALYSIS.md`

---

## 1. Scope Lock

**WILL change:**
- `src/components/order-entry/CollectPaymentPanel.jsx`
  - E1a: add `let gstAcc = 0, dGstAcc = 0;` after the `dSgst/dCgst/dVat` declaration (~L281, +1 line)
  - E1b: add `gstAcc`/`dGstAcc` accumulations after `sgst += taxAmt/2` line (~L300, +2 lines)
  - E1c: add `gstTotal`/`dGstTotal` to `taxTotals` return before closing `};` (~L315, +2 lines)
  - E2: replace `itemGstPostDiscount` formula (~L781-783, 3 lines → 3 lines)

**WILL NOT touch:**
- `src/api/transforms/orderTransform.js` (Option A — untouched)
- `taxTotals.sgst`, `taxTotals.cgst`, `taxTotals.dSgst`, `taxTotals.dCgst`, `taxTotals.vat` (all unchanged)
- BUG-665 `finalSplitBase` block (stays — works correctly once `totalGst` is fixed)
- Any financial formula outside the two edit sites
- `onChange` split handler (BUG-113 parity)
- Any print, report, settlement, receipt code

**Files: 1 · Edits: 2 sites (4 sub-edits) · R5 hotspot: YES · Fast Lane: NOT eligible**

---

## 2. Exact Edits

### E1a — Add `gstAcc` / `dGstAcc` declarations · after L281

**After line:** `let dSgst = 0, dCgst = 0, dVat = 0; // BUG-304: discountable-only buckets`

**Insert:**
```js
    let gstAcc = 0, dGstAcc = 0; // BUG-666: whole-item GST totals (match orderTransform rounding)
```

---

### E1b — Accumulate full `taxAmt` per GST item · after L300

**After line:** `sgst += taxAmt / 2; cgst += taxAmt / 2;`

**Insert:**
```js
        gstAcc += taxAmt; if (isDiscountable) dGstAcc += taxAmt; // BUG-666
```

**Why:** accumulate the full (not halved) `taxAmt` per item. After the loop, `gstAcc = 5.7145...` for one item at ₹114.29 × 5%.

---

### E1c — Add `gstTotal` / `dGstTotal` to `taxTotals` return · before closing `};`

**After line:** `dVat:  Math.round(dVat  * 100) / 100,`

**Insert:**
```js
      gstTotal:  Math.round(gstAcc  * 100) / 100, // BUG-666: 5.71 (matches orderTransform parseFloat)
      dGstTotal: Math.round(dGstAcc * 100) / 100, // BUG-666: discountable portion for discount orders
```

**Why:** `Math.round(5.7145... × 100)/100 = 5.71` — rounds the WHOLE item GST once, same as orderTransform's `parseFloat(item.gst_amount)`.

---

### E2 — Replace `itemGstPostDiscount` formula · L781-783

**Current:**
```js
  const itemGstPostDiscount =
    (taxTotals.dSgst + taxTotals.dCgst) * (1 - discountableRatio)
    + (taxTotals.sgst - taxTotals.dSgst) + (taxTotals.cgst - taxTotals.dCgst);
```

**New:**
```js
  // BUG-666: use whole-item rounded GST total (matches orderTransform.calcOrderTotals L846)
  const itemGstPostDiscount =
    taxTotals.dGstTotal * (1 - discountableRatio)   // BUG-666: discountable, reduced by ratio
    + (taxTotals.gstTotal - taxTotals.dGstTotal);   // BUG-666: non-discountable, unchanged
```

**Why equivalent:**
- Old formula: `discountableGST × (1-ratio) + nonDiscountableGST`
- New formula: same semantics, `dGstTotal` = discountable portion, `gstTotal - dGstTotal` = non-discountable
- For this order (no discount): `discountableRatio = 0` → `itemGstPostDiscount = dGstTotal + 0 = gstTotal = 5.71` ✓

---

## 3. Full Number Trace After Fix

```
taxTotals.gstAcc  = 5.7145...        (accumulated, not halved)
taxTotals.gstTotal = Math.round(5.7145...*100)/100 = 5.71  ← matches orderTransform

itemGstPostDiscount = 5.71            (from gstTotal, no discount)
scGst               = 11.43 × 0.05 = 0.5715...
totalGst            = 5.71 + 0.5715 = 6.2815...
splitGst (BUG-665)  = Math.round(6.2815*100)/100 = 6.28  ← 6.28 = orderTransform ✓
rawSplitBase        = Math.round((125.72 + 6.28)*100)/100 = 132.00
finalSplitBase      = 132.00  (totalRound=true→floor or totalRound=false→stays)
splitCap            = 132.00 = order_amount ✓

Bonus — displayed values also correct:
totalGst (for display) = 6.2815
sgst (display)  = Math.round(6.2815/2*100)/100 = 3.14  (was 3.15 ✗)
cgst (display)  = 3.14
rawFinalTotal   = 125.72 + 3.14 + 3.14 = 132.00  (was 132.02 ✗)
```

---

## 4. Execution Sequence

1. **Entry verification** — confirm L281, L300, L315, L781-783 match "Current" blocks.
2. Apply **E1a** (insert 1 line after L281).
3. Apply **E1b** (insert 1 line after L300).
4. Apply **E1c** (insert 2 lines after L315).
5. Apply **E2** (replace L781-783).
6. **Compile check** — webpack 0 new warnings.
7. **Self-test** per Verification Matrix.

---

## 5. Verification Matrix

| # | Edit | Scenario | Expected | How |
|---|---|---|---|---|
| V1 | E1/E2 | ₹114.29 × 5% item + SC 10% prepaid split | `splitCap=132`, `upi=32`, `sum=132=order_amount`, NO backend error | Playwright intercept `place-order` |
| V2 | E1/E2 | Same flow — displayed SGST/CGST | Shows 3.14 + 3.14 = ₹6.28 (was 3.15+3.15=6.30) | Screenshot |
| V3 | E1/E2 | Round item prices (₹149, ₹420) | No behaviour change — `gstTotal = taxTotals.sgst + cgst` for clean prices | Code review (math) |
| V4 | E1/E2 | BUG-666 order + BUG-665 together | `splitGst = 6.28`, `rawSplitBase = 132.00` ✓ | Math trace |
| V5 | E2 | Discount order (10% discount) | `itemGstPostDiscount = dGstTotal*(1-ratio)+(gstTotal-dGstTotal)` = same as old formula | Code review |
| V6 | — | Compile | 0 new warnings | webpack log |
| V7 | — | `taxTotals.sgst`, `.cgst` unchanged | Display values: existing code reading `.sgst`/`.cgst` sees no change | grep confirm |
| V8 | — | Code markers | `// BUG-666` at E1a, E1b, E1c, E2 | grep |
| V9 | — | BUG-665 `finalSplitBase` block intact | `splitGst = Math.round(totalGst*100)/100` unchanged at L857 | grep |
| V10 | — | VAT items unaffected | `gstAcc` only receives GST items (guarded by `taxType === 'GST'` check) | Code review |

---

## 6. Risk Register

| # | Risk | Mitigation | Verified by |
|---|---|---|---|
| R1 | Round-price regression (₹149, ₹420) | For exact prices (5.71 × 2 = 11.42 clean): `gstTotal = taxTotals.sgst + cgst` → no change | V3 |
| R2 | BUG-304 discount regression | `dGstTotal` accumulates discountable portion identically to old `dSgst+dCgst` logic | V5 |
| R3 | VAT items receiving wrong gstAcc | `gstAcc` only incremented inside `if GST` branch; VAT branch unchanged | V10 |
| R4 | BUG-665 interop | BUG-665 reads `totalGst` → now = 6.2815 (correct) → `splitGst = 6.28` ✓ | V4 |
| R5 | Display values change | `taxTotals.sgst` / `.cgst` unchanged; bill display surfaces read those directly → no change to UI other than the BONUS correction to `rawFinalTotal` | V7 |

---

## 7. Post-Code Registry Checklist

- [ ] `registry.json`: BUG-666 → status `GATE_5A_IMPLEMENTED`, gate 5, sprint_key `nov_cr_batch`
- [ ] `BUG_TRACKER.md`: row updated with IMPLEMENTED status
- [ ] `FILE_OWNERSHIP.md`: add `CollectPaymentPanel.jsx` row — BUG-666 E1a/E1b/E1c/E2
- [ ] Code markers: `// BUG-666` at all 4 edit sites
- [ ] QA handover: `handover/QA_HANDOVER_BUG666_<date>.md` from §5 matrix
