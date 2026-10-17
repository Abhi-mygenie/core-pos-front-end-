# INVESTIGATION REPORT — SC GST Missing from Manual Bill Print
**ID:** INV-SC-GST-PRINT
**Date:** 2026-10-12
**Status:** CLOSED — Root cause confirmed, handed to INTAKE queue
**Steps used:** 8/10
**Confidence:** HIGH

---

## 1. Summary

**Root cause:** `buildBillPrintPayload` in `orderTransform.js` has two internal paths gated by `hasFinancialOverrides = overrides.orderItemTotal !== undefined`. The **Collect Bill path** (L1886–1962) correctly adds `serviceChargeAmount * scTaxRate` to `gst_tax` (L1954). The **Manual Print path** (L1964–2011) reads `serviceChargeAmount` but **never adds SC GST to `gst_tax`** — the `scTaxRate` derived from `overrides.serviceChargeTaxPct` is completely unused.

- **Classification:** FE_BUG
- **Confidence:** HIGH (code trace + confirmed caller audit across all print paths)
- **Steps used:** 8/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | SC GST computed differently in Collect Bill vs manual print paths | Code trace `buildBillPrintPayload` L1882–2011 | CONFIRMED | orderTransform.js L1954 (collect) vs L1964-2011 (manual: no SC GST line) |
| H2 | Dashboard OrderCard passes `serviceChargeTaxPct` but it's unused | Code trace OrderCard.jsx L253-254 | CONFIRMED | `serviceChargeTaxPct` in overrides; no `orderItemTotal` → manual path ignores it |
| H3 | QSR collect bill path correct | Code trace CartPanel.jsx L443-445 + L530 | CONFIRMED | `printGstTax = sgst+cgst` includes `scGst`; passed as `gstTax` override → collect bill path |
| H4 | `PrintBillButton` (Order Taking page header) has same gap | Code trace `RePrintButton.jsx` L115-118 | CONFIRMED | Same pattern as OrderCard — passes `serviceChargeTaxPct` but no `orderItemTotal` |

---

## 3. Data Flow Trace

**Manual Print path (broken) — Dashboard + Order Taking page:**
```
OrderCard / PrintBillButton calls printOrder(..., {
  serviceChargeTaxPct: N,        ← passed but UNUSED in manual path
  deliveryChargeGstPct: N        ← passed but UNUSED
})
  → hasFinancialOverrides = false  (orderItemTotal absent)
  → Manual path L1969: serviceChargeAmount = order.serviceTax
  → L1975-2009: item-level GST accumulated → gst_tax
  → NO: gst_tax += serviceChargeAmount * scTaxRate   ← THE MISSING LINE
  → finalGstTax = gst_tax = items only               ← SC GST absent ✗
```

**Collect Bill path (working) — CPP + QSR auto-print:**
```
CollectPaymentPanel: sgst/cgst computed including scGst → passes gstTax override
CartPanel QSR:       sgst/cgst computed including scGst → passes gstTax via printGstTax
  → hasFinancialOverrides = true  (orderItemTotal present)
  → finalGstTax = overrides.gstTax  ← pre-computed, includes SC GST ✓
```

**BREAK POINT:** `buildBillPrintPayload` manual path — missing `gst_tax += serviceChargeAmount * scTaxRate` after item GST accumulation (~L2010).

---

## 4. Full Caller Audit

| Caller | `orderItemTotal` in overrides? | `serviceChargeTaxPct` in overrides? | Path | SC GST correct? |
|---|:---:|:---:|---|:---:|
| `CollectPaymentPanel.handlePrintBill` | ✅ | N/A (passes `gstTax` directly) | Collect Bill | ✓ |
| `CartPanel.handleCollectBill` (QSR auto-print) | ✅ | N/A (passes `gstTax=printGstTax`) | Collect Bill | ✓ |
| QSR PlaceAndPay auto-print (OrderEntry) | ✅ | N/A (passes `gstTax=printGstTax`) | Collect Bill | ✓ |
| `OrderCard.jsx` (Dashboard) | ❌ | ✅ | Manual | ✗ |
| `PrintBillButton` `RePrintButton.jsx` (Order Taking page) | ❌ | ✅ | Manual | ✗ |
| `FolioCheckoutPanel.printBill` | ❌ | ❌ | Manual | ✗ (SC=0 on folio anyway) |
| `AllOrdersReportPage` reprint | ❌ | ❌ | Manual | ✗ |
| `OrderReportBetaPage` reprint | ❌ | ❌ | Manual | ✗ |

---

## 5. Fix Scope

**File:** `src/api/transforms/orderTransform.js` (R5 hotspot)
**Location:** `buildBillPrintPayload` manual path, after item-level GST accumulation (~L2010)
**Change:** +2 lines

```javascript
// ADD after: gst_tax = Math.round(gst_tax * 100) / 100;
const scTaxRateManual = (overrides.serviceChargeTaxPct || 0) / 100;
gst_tax = Math.round((gst_tax + serviceChargeAmount * scTaxRateManual) * 100) / 100;
```

**Why this works for all broken callers:**
- `OrderCard` already passes `serviceChargeTaxPct` → fix reads it, SC GST added ✓
- `PrintBillButton` already passes `serviceChargeTaxPct` → same ✓
- `FolioCheckoutPanel`, report pages: pass `serviceChargeTaxPct=0` (or nothing) → `scTaxRateManual=0` → `+0`, no regression ✓

**Risk:** CRITICAL (R5 hotspot + financial calculation)
**Planning skip eligible:** NO (R5 hotspot)

---

## 6. Evidence Artifacts

All saved to: `/app/memory/evidence/INV-SC-GST-PRINT/`
- `investigation_findings.json` — caller audit + fix spec

---

## 7. Recommendations

- **Classification:** FE_BUG (financial)
- **Severity:** P1 — every manual reprint from Dashboard or Order Taking page shows wrong GST when SC is active
- **Fix route:** INTAKE → Gate 2 → Gate 3 → Gate 4 GO → Implementation (1 file, 2 lines)
- **Retroactive candidates:** None

---

## 8. QSR-Specific Finding

QSR collect bill auto-print (the primary QSR pay flow) is **CORRECT** — `CartPanel` computes `sgst+cgst` including SC GST at L443–445 and passes it as `printGstTax`. The broken paths are the same as non-QSR: Dashboard reprint (OrderCard) and Order Taking page header print (PrintBillButton).
