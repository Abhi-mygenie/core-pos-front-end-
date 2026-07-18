# BUG-117 — Pre-Implementation Code Gate (Gate 4)

**Bug:** BUG-117 — Audit side-sheet GST renders negative on VAT/mixed-tax orders
**Date:** 2026-06-08
**Agent:** E1 (Emergent)
**Sprint:** POS 4.0
**Owner GO:** 2026-06-08 (verbatim: "go")

---

## Scope Lock

**WILL change:** `src/api/transforms/reportTransform.js` — L957-963 (single VAT-FIX block)
**Will NOT change:** All other files (downstream consumers auto-correct via field names)

## Exact Diff

```diff
   // === Bill Breakdown (strictly from orders_table — always pass numbers) ===
-  // VAT-FIX (2026-06-06): Backend stores total tax (GST+VAT) in total_gst_tax_amount.
-  // total_vat_tax_amount holds the VAT-only subset. Derive pure GST by subtracting.
+  // CORRECTED 2026-06-08 (BUG-117): total_gst_tax_amount is PURE GST, total_vat_tax_amount is PURE VAT.
+  // total_tax_amount = total_gst_tax_amount + total_vat_tax_amount. Verified live on Lafetta
+  // orders 012553 / 012554 / 012555 (rid=78, 2026-06-08): subtotal + GST + VAT + service + round = order_amount.
+  // Prior "VAT-FIX (2026-06-06)" assumed combined storage — false; subtraction produced negative GST on VAT-only orders.
+  // rawGstAmount kept (= raw api.total_gst_tax_amount) for FE-88 audit-engine compatibility — numerically unchanged.
   const itemTotal = toNum(api.order_sub_total_amount);
   const subtotal = toNum(api.order_sub_total_without_tax);
-  const rawGstAmount = toNum(api.total_gst_tax_amount);   // Actually total tax (GST+VAT combined)
-  const vatAmount = toNum(api.total_vat_tax_amount);       // Pure VAT
-  const gstAmount = rawGstAmount - vatAmount;              // Pure GST
+  const gstAmount = toNum(api.total_gst_tax_amount);       // Pure GST (backend field semantics)
+  const vatAmount = toNum(api.total_vat_tax_amount);       // Pure VAT (backend field semantics)
+  const rawGstAmount = gstAmount;                           // FE-88 compat: same raw numeric value
```

## Invariants Held

| Invariant | Before | After |
|---|---|---|
| `gstAmount` numeric value | `total_gst_tax_amount − total_vat_tax_amount` | `total_gst_tax_amount` |
| `vatAmount` numeric value | `total_vat_tax_amount` | `total_vat_tax_amount` (unchanged) |
| `rawGstAmount` numeric value | `total_gst_tax_amount` | `total_gst_tax_amount` (unchanged) |
| Field names in output object | `gstAmount`, `vatAmount`, `rawGstAmount` | identical |
| Field types | Number | Number (unchanged) |

**FE-88 audit:** `expected = subTotal + rawGst + vat + roundOff`. Since `rawGst` is numerically unchanged and `vat` is unchanged, **FE-88 behaviour is identical**. ✓

**FE-86 audit:** `headerTax = gst + vat`. Was `(rawGst - vat) + vat = rawGst`. Now `gst + vat = rawGst + vat`. Numeric value of header tax changes to match the actual backend-reported total tax (which is also Σ items.tax_amount), so false-positive flags clear. ✓
