# BUG-117 — Implementation Summary + QA (Gate 5)

**Bug:** BUG-117 — Audit side-sheet GST renders negative on VAT/mixed-tax orders
**Date:** 2026-06-08
**Agent:** E1 (Emergent)
**Sprint:** POS 4.0

---

## Changes Made

**File:** `src/api/transforms/reportTransform.js` — block at L956-967 (8 working lines, 5 of which changed)

| Line | Before | After |
|------|--------|-------|
| 957-958 (comment) | `VAT-FIX (2026-06-06): Backend stores total tax (GST+VAT) in total_gst_tax_amount. ...` | `CORRECTED 2026-06-08 (BUG-117): total_gst_tax_amount is PURE GST, total_vat_tax_amount is PURE VAT. ...` |
| 961 | `const rawGstAmount = toNum(api.total_gst_tax_amount);` | `const gstAmount = toNum(api.total_gst_tax_amount);` |
| 962 | `const vatAmount = toNum(api.total_vat_tax_amount);` | `const vatAmount = toNum(api.total_vat_tax_amount);` (unchanged) |
| 963 | `const gstAmount = rawGstAmount - vatAmount;` | `const rawGstAmount = gstAmount;` |

Net change: subtraction removed; per-tax fields now used as-is.

## Numeric Invariants (verified)

| Field | Before formula | After formula | Same numeric output? |
|---|---|---|---|
| `gstAmount` | `api.total_gst_tax_amount − api.total_vat_tax_amount` | `api.total_gst_tax_amount` | **NO** — corrected (was negative on VAT orders) |
| `vatAmount` | `api.total_vat_tax_amount` | `api.total_vat_tax_amount` | YES |
| `rawGstAmount` | `api.total_gst_tax_amount` | `api.total_gst_tax_amount` (alias `gstAmount`) | **YES — identical** |

## Downstream Verification (no edits needed)

- `OrderDetailSheet.jsx` L817-823 — receives corrected `gstAmount`
- `orderLedgerService.js` L51-53, L98-99 — passes corrected values to ledger row
- `OrderLedgerMockup.jsx` L157-159 — columns auto-correct
- `orderLedgerAuditEngine.js` FE-88 — `subTotal + rawGst + vat + roundOff` numerically unchanged (rawGst is identical raw value) ✓
- `orderLedgerAuditEngine.js` FE-86 — `gst + vat` now equals real total tax → false-positive RED flags clear on VAT-only orders
- `SalesMockup.jsx`, `FoodCourtMockup.jsx`, `insightsService.js` — aggregate `Σ(gst + vat)` now matches backend `total_tax_amount`

## QA

- ESLint: no new advisory or blocking findings
- Webpack: compiled with 1 warning (pre-existing `react-hooks/exhaustive-deps` in unrelated files; no new warnings or errors)
- Scope held: only `reportTransform.js` modified; only the VAT-FIX block (L957-963) touched; nothing else changed
- Frontend service: hot-reloaded clean

## Predicted Outcome (to be confirmed in Gate 6 smoke)

| Order | Pre-fix UI GST | Post-fix UI GST | Order Ledger orange row |
|---|---|---|---|
| 012553 | ₹-44 | ₹0 | clears (was RED FE-86) |
| 012554 | ₹0 | ₹0 | no change (always clean) |
| 012555 | ₹-26 | ₹0 | clears (was RED FE-86) |

## Awaiting

- Gate 6: Owner smoke sign-off on preprod
