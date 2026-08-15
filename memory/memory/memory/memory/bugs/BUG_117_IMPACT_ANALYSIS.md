# BUG-117 — Impact Analysis (Gate 2)

**Bug:** BUG-117 — Audit Report side-sheet GST line renders negative on VAT-only / mixed-tax orders
**Date:** 2026-06-08
**Agent:** E1 (Emergent)
**Sprint:** POS 4.0

---

## 1. Problem (corrected scope)

Original intake (2026-06-07) framed BUG-117 as a "discount text rendering" issue. Runtime validation on 2026-06-08 with live preprod data (Lafetta, rid=78) revealed the real defect:

**Audit Report side-sheet renders `GST` as a NEGATIVE value** on every order that carries VAT (or carries both GST + VAT). Also surfaces in Order Ledger "GST" and "GST (excl. VAT)" columns, and triggers a false-positive FE-86 RED audit flag (orange row).

Live evidence (3 orders pulled from `/order-logs-report` on 2026-06-08):

| Order | API `total_gst_tax_amount` | API `total_vat_tax_amount` | API `total_tax_amount` | UI GST shown | UI VAT shown |
|---|---|---|---|---|---|
| 012553 | "0.00" | "44.00" | 44 | **₹-44** ❌ | ₹44 ✅ |
| 012554 | "0.00" | "0.00" | 0 | ₹0 ✅ | ₹0 ✅ |
| 012555 | "0.00" | "26.40" | 26.4 | **₹-26** ❌ | ₹26 ✅ |
| 939440 (prior) | "44.00" | "44.00" | 88 | ₹0 ❌ (under) | ₹44 |
| 001148 (screenshot) | (inferred 0) | (inferred 168) | 168 | **₹-168** ❌ | ₹168 |

---

## 2. Root Cause — Incorrect VAT-FIX Formula

`/app/frontend/src/api/transforms/reportTransform.js` L957-963 was patched on 2026-06-06 under the assumption that `total_gst_tax_amount` from the backend stores the **combined** (GST + VAT) total tax. That assumption is **false**.

```js
// CURRENT (buggy)
const rawGstAmount = toNum(api.total_gst_tax_amount);   // Comment: "Actually total tax (GST+VAT combined)"
const vatAmount    = toNum(api.total_vat_tax_amount);   // Pure VAT
const gstAmount    = rawGstAmount - vatAmount;          // Pure GST  ← yields NEGATIVE
```

### Verified backend contract (live preprod data, Lafetta order 012555)

```
order_amount (1546)
  = order_sub_total_without_tax (1520)
  + total_gst_tax_amount         (   0)   ← pure GST
  + total_vat_tax_amount         (  26.4) ← pure VAT
  + total_service_tax_amount     (   0)
  + round_up                     (  -0.4)
```

Cross-checked: `total_tax_amount (26.4) === total_gst_tax_amount (0) + total_vat_tax_amount (26.4)` ✓

Backend fields are **per-tax**, not combined. Subtracting VAT from GST yields a spurious negative value whenever VAT > GST.

---

## 3. Affected File

| File | Lines | Change Type |
|------|-------|-------------|
| `src/api/transforms/reportTransform.js` | L957-963 | Replace VAT-FIX block — remove subtraction |

**No other files affected.** All downstream consumers (UI components, audit engine, aggregate reports) read `gstAmount`, `vatAmount`, `rawGstAmount` by name from the transform's output and require no changes — they receive corrected values automatically once the transform is fixed.

---

## 4. Downstream Auto-Correction (no edits required)

| File | What it reads | Behaviour after fix |
|------|---------------|---------------------|
| `OrderDetailSheet.jsx` (Audit side-sheet) L817-823 | `displayData.gstAmount`, `displayData.vatAmount` | GST line will display ₹0 / pure GST instead of negative |
| `orderLedgerService.js` L51-53, L98-99 | `o.gstAmount`, `o.vatAmount`, `o.rawGstAmount` | Ledger row built with correct values |
| `OrderLedgerMockup.jsx` L157-159 | columns `gstAmount`, `vatAmount`, `gstAmountOnly` | "GST" and "GST (excl. VAT)" columns render correctly |
| `orderLedgerAuditEngine.js` FE-81/83/86/88/89 | `o.gstAmount`, `o.vatAmount`, `o.rawGstAmount` | False-positive FE-86 flags clear; FE-88 expected total unchanged (numerically identical) |
| `SalesMockup.jsx` L169/180 | `Σ(gstAmount + vatAmount)` | Daily tax totals correct (was under-reporting on bar restaurants) |
| `FoodCourtMockup.jsx` L199/214/325/338-339 | `Σ(gstAmount + vatAmount)` | Per-station tax totals correct |

---

## 5. FE-88 Audit Engine Compatibility Check

The audit engine's FE-88 rule uses `rawGstAmount`:
```js
const expected = subTotal + rawGst + vat + roundOff;
```

Currently: `rawGst = raw API total_gst_tax_amount`, plus separately `vat`. Numerically:
- Old interpretation: rawGst = "total tax", + vat → over-counts (but compensated because the buggy `gstAmount` was negative; downstream sums of `gstAmount + vatAmount` actually under-counted)
- New interpretation: rawGst = pure GST (numerically the SAME raw API value), + vat = pure GST + pure VAT = total tax ✓

By setting `rawGstAmount = gstAmount` (the toNum'd `api.total_gst_tax_amount`), the numeric value passed to the audit engine is **identical** to before. FE-88's `subTotal + rawGst + vat + roundOff` continues to equal the backend `order_amount`. **No change in FE-88 behaviour.**

FE-86 (header tax vs items tax) currently computes `headerTax = gst + vat`. Before fix that equals `(rawGst - vat) + vat = rawGst` (= total tax from one bucket). After fix `gst + vat` = pure GST + pure VAT = total tax. Numerically identical headerTax — **but** the false-positive flag only fires today because items have non-zero tax while header rolls to a different number due to the negative gst undermining downstream rules. With this fix, FE-86 stays self-consistent and stops false-flagging VAT-only orders.

---

## 6. Regression Risk: LOW

- Single 3-line change in one file
- No signature change to the transform's output object (same field names, same types)
- No state, no service-call, no API contract change
- Numeric value of `rawGstAmount` is **identical** to before — FE-88 unchanged
- `gstAmount` value changes from `(GST - VAT)` to `GST` — corrects a defect that only ever produced ≤ 0 values on VAT-bearing orders
- No-tax orders (control case 012554): both old and new formulas produce 0 — verified

---

## 7. Related Items

- **Original intake:** `/app/memory/memory/bugs/BUG_117_AUDIT_SIDESHEET_DISCOUNT_TEXT_INTAKE.md` (scope being revised — original "discount text" framing was incorrect)
- **Prior session handover:** `/app/memory/control/NEXT_AGENT_HANDOVER_2026_06_08_BUG_SESSION_2.md` — flagged this exact issue, owner blocked on clarification of tax key semantics
- **Owner clarification:** Live API data (this session) is the clarification — `total_gst_tax_amount` is pure GST, `total_vat_tax_amount` is pure VAT, `total_tax_amount = GST + VAT`
- **VAT-FIX history:** `reportTransform.js:957` comment dated "VAT-FIX (2026-06-06)" — that prior fix was based on incorrect assumption about backend key semantics
- **OG-FE related:** No OPEN_GAPS_REGISTER item to close (FE-86 false-positive may need de-listing if previously tracked)
