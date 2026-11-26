# SESSION HANDOVER — 2026-10-12 — INV-SC-GST-PRINT CLOSED

## 1. Session Summary

**Role:** INVESTIGATION
**Item:** SC GST Missing from Manual Bill Print
**Outcome:** CLOSED — Root cause confirmed HIGH confidence. Ready for INTAKE as BUG.

---

## 2. Root Cause (One Line)

`buildBillPrintPayload` manual path in `orderTransform.js` (~L2010) accumulates item-level GST but **never adds `serviceChargeAmount × scTaxRate`** to `gst_tax`. The Collect Bill path (L1954) does. Two lines fix it.

---

## 3. Broken vs Working Callers

| Broken ✗ | Working ✓ |
|---|---|
| OrderCard.jsx (Dashboard print) | CollectPaymentPanel.handlePrintBill |
| PrintBillButton RePrintButton.jsx (Order Taking page) | CartPanel QSR collect bill auto-print |
| FolioCheckoutPanel.printBill | QSR PlaceAndPay auto-print |
| AllOrdersReportPage / OrderReportBetaPage reprints | |

**QSR collect bill (primary pay flow): CORRECT** — `CartPanel` already includes `scGst` in `printGstTax`.

---

## 4. Fix (when owner asks to implement)

**File:** `src/api/transforms/orderTransform.js` (R5 hotspot)
**Location:** after `gst_tax = Math.round(gst_tax * 100) / 100;` in manual path (~L2010)
**Change:**
```javascript
const scTaxRateManual = (overrides.serviceChargeTaxPct || 0) / 100;
gst_tax = Math.round((gst_tax + serviceChargeAmount * scTaxRateManual) * 100) / 100;
```

---

## 5. Artifacts

- Investigation report: `INV-SC-GST-PRINT_INVESTIGATION_REPORT.md`
- Evidence: `evidence/INV-SC-GST-PRINT/investigation_findings.json`
- Registry: `INV-SC-GST-PRINT` logged (824 items)

---

## 6. Next Agent Entry Point

Owner will say **register** → INTAKE role → BUG-536 → P1/CRITICAL → planning + fix.
Or owner may give **Gate 2 GO directly** → Planning (Impact Analysis, 1 file, 2 lines).
