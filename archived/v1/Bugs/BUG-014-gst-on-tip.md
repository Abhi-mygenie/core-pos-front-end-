## BUG-014 — GST Not Applied on Tip Amount

**Module:** Billing / Tax Calculation / Tip  
**Status:** Closed — confirmed working by user  
**Severity:** Medium  
**Priority:** P2  

### Expected Behavior
GST should be applied on the tip amount as part of the billing calculation.

### Actual Behavior (Code Inspection)
GST IS applied to tip in all primary code paths:
- **UI**: `tipGst = tip * avgGstRate` (CollectPaymentPanel line 234) → included in `totalGst` → split into `sgst/cgst`.
- **Place-order API**: `+ (tipAmount * avgGstRate)` (orderTransform.js calcOrderTotals line 392).
- **Manual print**: `overrides.gstTax` from UI values which include tipGst.
- **Collect-bill API**: `paymentData.sgst/cgst` from UI values.

### Resolution
Code inspection showed tip GST was already implemented as part of BUG-006 fix (Apr-2026). User confirmed working at runtime on Apr-2026. Closed with no code change.

### Note
The only path where tip GST is NOT applied is the auto-print-without-overrides path (BUG-001 scope), which was fixed separately.
