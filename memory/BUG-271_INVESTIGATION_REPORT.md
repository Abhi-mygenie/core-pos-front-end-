# BUG-271 Investigation Report

**ID:** BUG-271
**Role:** INVESTIGATION
**Date:** 2026-07-30
**Steps Used:** 6/10

---

## 1. Summary

**Root cause:** BUG-271's manual print path (`buildBillPrintPayload`, lines 1882-1893 of `orderTransform.js`) reads `item.gst_tax_amount` from `rawOrderDetails` (raw backend API response). The backend returns `gst_tax_amount: null` for all order items, so `parseFloat(null || 0) = 0`, and `gst_tax` / `vat_tax` accumulate to 0. The Collect Bill path in the same function has a 7-line fallback that computes tax from `item.food_details.tax` when `gst_tax_amount` is null/0; that fallback was not carried over to the BUG-271 manual print path.

**Classification:** FE_BUG  
**Confidence:** HIGH (reproduced by evidence + code trace)  
**Steps used:** 6/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | BUG-271 manual path reads `gst_tax_amount` which backend returns null → always 0 | Code trace + real API evidence | 3 | **CONFIRMED** | `/app/memory/evidence/BUG-271/api_evidence.json` |
| H2 | Collect Bill works because it has `food_details.tax` fallback that the manual path lacks | Code trace of both branches | 2 | **CONFIRMED** | `orderTransform.js:1820-1829` (CB path has fallback); `L1882-1893` (BUG-271 path has no fallback) |
| H3 | Old code (`.bak.cr013`) had the fallback for ALL paths | Code trace of backup file | 1 | **CONFIRMED** | `orderTransform.js.bak.cr013:1260-1268` — single path with fallback for both manual and Collect Bill |

---

## 3. Data Flow Trace

```
User clicks "Print Bill" on dashboard (TableCard / OrderCard / RePrintButton / AllOrdersReportPage)
    → printOrder(orderId, 'bill', null, order, scPct, {serviceChargeTaxPct, deliveryChargeGstPct})
    → orderService.js:137 → toAPI.buildBillPrintPayload(orderData, scPct, overrides)
    → orderTransform.js:1803 → hasFinancialOverrides = (overrides.orderItemTotal !== undefined)
                                                     = false  ← manual print path
    → L1872: else branch — MANUAL PRINT PATH (BUG-271)
    → L1882-1893: billFoodList.forEach → taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0)
    
BREAK POINT: item.gst_tax_amount = null (backend doesn't send per-item tax amounts in orderDetails)
             item.tax_amount = null → parseFloat(null || 0) = 0 → gst_tax = 0, vat_tax = 0

Collect Bill path (hasFinancialOverrides = true):
    → L1807-1868 → same read: taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0)
    → L1822-1829: FALLBACK — if (!taxAmt && item.food_details) { taxPct = food_details.tax; compute }
    → food_details.tax IS present (e.g. 4 for 4% VAT item)
    → taxAmt computed correctly → gst_tax / vat_tax correct
```

---

## 4. Evidence Artifacts

All saved to: `/app/memory/evidence/BUG-271/`

- `api_evidence.json` — Real backend `orderDetails` item showing `gst_tax_amount: null`, `vat_tax_amount: null`, `tax_amount: null`, `food_details.tax: 4` (from `/app/memory/evidence/BUG-168-reinvestigation/single_order_940279.json`)

### Key Code References

**BUG-271 manual print path (BROKEN — lines 1882-1893 of `orderTransform.js`):**
```javascript
billFoodList.forEach(item => {
  if (isDetailComplimentary(item)) return;
  const taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);  // ← null → 0
  const taxType = (item.food_details?.tax_type || 'GST').toUpperCase();
  if (taxType === 'VAT') vat_tax += taxAmt;  // ← always adds 0
  else gst_tax += taxAmt;                     // ← always adds 0
});
```

**Collect Bill path (CORRECT — lines 1820-1834 of `orderTransform.js`):**
```javascript
let taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);  // ← 0 for null
if (!taxAmt && item.food_details) {           // ← FALLBACK: food_details.tax
  const taxPct = parseFloat(item.food_details.tax) || 0;
  if (taxPct > 0) {
    const isInclusive = (item.food_details.tax_calc || '').toLowerCase() === 'inclusive';
    taxAmt = isInclusive
      ? lineTotal * taxPct / (100 + taxPct)
      : lineTotal * taxPct / 100;
  }
}
```

**Old code (`.bak.cr013`, lines 1259-1268 — worked for both paths):**
```javascript
let taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
if (!taxAmt && item.food_details) {   // ← fallback was in both paths
  const taxPct = parseFloat(item.food_details.tax) || 0;
  if (taxPct > 0) { ... }
}
```

---

## 5. Recommendations

**Classification:** FE_FIX

**Scope:**
- File: `frontend/src/api/transforms/orderTransform.js`
- Location: Lines 1882-1893 (BUG-271 manual print path inside `buildBillPrintPayload`)
- Change: Add the `food_details.tax` fallback block (same as Collect Bill path lines 1820-1829)
- Lines changed: ~7 (add the fallback block; also need `qty`, `unitPrice`, `price`, `lineTotal` for the fallback calculation — ~12 lines total including prerequisite values)

**Planning skip eligibility:**
- ≤10 lines: BORDERLINE (~12 lines needed including prerequisite vars for lineTotal)
- 1 file: YES
- Not hotspot (R5): BORDERLINE — `orderTransform.js` is a shared transform file. Per R5, it IS a hotspot.
- Not financial (R6): NO — gst_tax and vat_tax are financial fields

**Verdict: NOT planning-skip-eligible (financial + hotspot). Full gate cycle required.**

**Suggested fix approach:**
Replace the BUG-271 manual print loop (L1882-1893) with the same logic as the Collect Bill path (L1807-1835 minus SC/tip/delivery proration, which doesn't apply to manual print). Specifically: compute lineTotal for fallback, read `gst_tax_amount`, fall back to `food_details.tax` when null.

---

## 6. Retroactive Candidates

**BUG-271 registry status: INTAKE** (BUG_TRACKER.md shows INTAKE).  
**Code shows: PARTIAL FIX APPLIED** (comment "BUG-271 FIX (2026-07-29)" at L1879, but fix is broken due to missing fallback).  
**Recommendation:** Keep as IN-PROGRESS, not retroactive closure — the fix comment is misleading. The actual fix needs to be completed per this investigation.

---

## Handover to Next Role (→ PLANNING)

"Root cause: BUG-271 manual print path in `buildBillPrintPayload` (`orderTransform.js` L1882-1893) reads `item.gst_tax_amount` which backend returns null; no fallback to `food_details.tax`. Collect Bill path has the fallback and works correctly. Confidence: HIGH. Steps: 6/10.

FE fix: YES — 1 file, ~12 lines, add `food_details.tax` fallback to manual print path (same logic as Collect Bill path L1820-1829). 

Backend ask: NO — issue is entirely in FE. Backend correctly returns `food_details.tax` (non-null). It's the FE's responsibility to use it as a fallback.

Planning skip eligible: NO (financial R6 + hotspot R5).

Retroactive candidates: none.

Investigation report at: `/app/memory/BUG-271_INVESTIGATION_REPORT.md`"
