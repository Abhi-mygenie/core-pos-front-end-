# BUG-117 — Implementation Plan (Gate 3)

**Bug:** BUG-117 — Audit side-sheet GST renders negative on VAT/mixed-tax orders
**Date:** 2026-06-08
**Agent:** E1 (Emergent)
**Sprint:** POS 4.0

---

## 1. Objective

Correct the per-tax field interpretation in `reportTransform.js` so that `gstAmount` carries pure GST and `vatAmount` carries pure VAT (matching backend semantics), while keeping `rawGstAmount` numerically unchanged for FE-88 audit-engine compatibility.

---

## 2. Changes (3 lines, 1 file)

### File: `src/api/transforms/reportTransform.js` (L957-963)

**BEFORE (8 lines including comment):**
```js
  // === Bill Breakdown (strictly from orders_table — always pass numbers) ===
  // VAT-FIX (2026-06-06): Backend stores total tax (GST+VAT) in total_gst_tax_amount.
  // total_vat_tax_amount holds the VAT-only subset. Derive pure GST by subtracting.
  const itemTotal = toNum(api.order_sub_total_amount);
  const subtotal = toNum(api.order_sub_total_without_tax);
  const rawGstAmount = toNum(api.total_gst_tax_amount);   // Actually total tax (GST+VAT combined)
  const vatAmount = toNum(api.total_vat_tax_amount);       // Pure VAT
  const gstAmount = rawGstAmount - vatAmount;              // Pure GST
```

**AFTER:**
```js
  // === Bill Breakdown (strictly from orders_table — always pass numbers) ===
  // CORRECTED 2026-06-08 (BUG-117): total_gst_tax_amount is PURE GST, total_vat_tax_amount is PURE VAT.
  // total_tax_amount = total_gst_tax_amount + total_vat_tax_amount. Verified live on Lafetta
  // orders 012553 / 012554 / 012555 (rid=78, 2026-06-08): subtotal + GST + VAT + service + round = order_amount.
  // Prior "VAT-FIX (2026-06-06)" assumed combined storage — false; subtraction produced negative GST on VAT-only orders.
  // rawGstAmount kept (= raw api.total_gst_tax_amount) for FE-88 audit-engine compatibility — numerically unchanged.
  const itemTotal = toNum(api.order_sub_total_amount);
  const subtotal = toNum(api.order_sub_total_without_tax);
  const gstAmount = toNum(api.total_gst_tax_amount);       // Pure GST (backend field semantics)
  const vatAmount = toNum(api.total_vat_tax_amount);       // Pure VAT (backend field semantics)
  const rawGstAmount = gstAmount;                           // FE-88 compat: same raw numeric value
```

**Net code change:** 3 working lines (gstAmount / vatAmount / rawGstAmount) re-ordered + recomputed; comment replaced.

---

## 3. Files NOT Changed

- `OrderDetailSheet.jsx` (Audit side-sheet) — reads `gstAmount` / `vatAmount` by name
- `OrderLedgerMockup.jsx` — reads same fields via columns
- `orderLedgerService.js` — passes fields through to ledger row
- `orderLedgerAuditEngine.js` — uses `gstAmount`, `vatAmount`, `rawGstAmount`; numerics correct after fix
- `SalesMockup.jsx`, `FoodCourtMockup.jsx`, `insightsService.js` — aggregate consumers
- All other transform branches, services, components — no change

---

## 4. Test Strategy

1. Webpack compiles clean (no new warnings/errors)
2. Visual verification on preprod (owner smoke):
   a. **Order 012553** (VAT-only, ₹44): Audit side-sheet GST line shows ₹0 (was ₹-44); VAT shows ₹44; Grand Total ₹1,494
   b. **Order 012555** (VAT-only, ₹26.40): GST shows ₹0 (was ₹-26); VAT shows ₹26; Grand Total ₹1,546
   c. **Order 012554** (no tax): unchanged — GST ₹0, VAT ₹0, Grand Total ₹1,400
   d. **Order Ledger** for same orders: "GST" and "GST (excl. VAT)" columns show ₹0 (were negative); orange row highlight clears on 012553 / 012555 (FE-86 false-positive resolved)
3. Spot-check daily tax aggregate in Sales report — should match Σ items.tax_amount across orders

---

## 5. Rollback

Revert the 3-line block to original (restore subtraction). Zero side effects — no data migration, no schema change, no state mutation.
