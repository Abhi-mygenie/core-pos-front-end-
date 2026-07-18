# BUG-172 — Impact Analysis + Implementation Plan

**Date:** 2026-07-08
**Agent role:** PLANNING (Alpha v0.7 Role 2) — Gate 2 + Gate 3
**Item:** BUG-172 — Print Tax Wrong (Interim FE Fix)
**Risk:** CRITICAL — financial/tax, hotspot file
**Code Reality:** NONE
**Conflict Pre-Check:** No conflict — BUG-168 v3 is already implemented in this file; BUG-172 modifies only the `else` branch that BUG-168 v3 created.

---

# GATE 2: IMPACT ANALYSIS

## Data Flow

```
Backend provides (on socket / list API):
  order.amount           = 333   (order_amount — total with tax)
  order.subtotalBeforeTax = 321.2 (order_sub_total_without_tax — subtotal before tax)

  Total tax = 333 - 321.2 = 11.8 ← derived from 2 backend values

Item-level data provides:
  food_details.tax_type = "VAT" or "GST" ← determines which bucket gets the tax

Current (WRONG):
  Tax loop computes: base_price × qty × tax_rate = 23 × 4 × 4% = 3.68
  Missing: addon amounts not included in base → wrong tax

Proposed (CORRECT):
  totalTax = order.amount - order.subtotalBeforeTax = 11.8
  All items are VAT → vat_tax = 11.8
```

## Affected Code

**Single file:** `frontend/src/api/transforms/orderTransform.js`
**Single location:** `buildBillPrintPayload` → `else` branch (manual print path) → L1875-1896

## Three Tax Scenarios

| Scenario | Items | Tax Assignment |
|----------|-------|---------------|
| All VAT (e.g., 18March restaurant) | All items have `tax_type: "VAT"` | `vat_tax = totalTax`, `gst_tax = 0` |
| All GST | All items have `tax_type: "GST"` | `gst_tax = totalTax`, `vat_tax = 0` |
| Mixed (rare) | Some VAT, some GST | Split proportionally by item base price ratio |

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Collect Bill path affected | ZERO | — | Change is inside `else` branch; Collect Bill takes `if (hasFinancialOverrides)` branch |
| Mixed GST+VAT split inaccurate | LOW | LOW | Proportional split by base price is approximate but reasonable; exact split comes when backend adds fields |
| `order.amount` or `order.subtotalBeforeTax` is 0 | LOW | LOW | `Math.max(0, ...)` guard prevents negative tax; 0 amount = no tax = correct |
| Temporary code becomes permanent | LOW | LOW | Clearly marked `// BUG-172 INTERIM` + handover doc references backend ask |

---

# GATE 3: IMPLEMENTATION PLAN

## Single Edit

**File:** `frontend/src/api/transforms/orderTransform.js`
**Lines:** L1875-1896 (inside `else` branch)

**CURRENT CODE (L1875-1896):**
```js
      billFoodList.forEach(item => {
        if (isDetailComplimentary(item)) return;
        let taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
        if (!taxAmt && item.food_details) {
          const qty = parseFloat(item.quantity) || 1;
          const unitPrice = parseFloat(item.unit_price) || parseFloat(item.food_details?.price) || 0;
          const price = unitPrice > 0 ? unitPrice : (parseFloat(item.price) || 0);
          const lineTotal = price * qty;
          const taxPct = parseFloat(item.food_details.tax) || 0;
          if (taxPct > 0) {
            const isInclusive = (item.food_details.tax_calc || '').toLowerCase() === 'inclusive';
            taxAmt = isInclusive
              ? lineTotal * taxPct / (100 + taxPct)
              : lineTotal * taxPct / 100;
          }
        }
        const taxType = (item.food_details?.tax_type || 'GST').toUpperCase();
        if (taxType === 'VAT') vat_tax += taxAmt;
        else gst_tax += taxAmt;
      });
      gst_tax = Math.round(gst_tax * 100) / 100;
      vat_tax = Math.round(vat_tax * 100) / 100;
```

**NEW CODE:**
```js
      // BUG-172 INTERIM (2026-07-08): Derive total tax from backend values.
      // order.amount and order.subtotalBeforeTax are both from backend.
      // Replace with direct order.gstTax / order.vatTax passthrough when
      // backend adds gst_tax and vat_tax to read endpoints.
      const totalTax = Math.max(0, Math.round(((order.amount || 0) - (order.subtotalBeforeTax || 0)) * 100) / 100);

      // Determine tax type split from item-level food_details.tax_type
      const hasVat = billFoodList.some(item =>
        !isDetailComplimentary(item) &&
        (item.food_details?.tax_type || 'GST').toUpperCase() === 'VAT'
      );
      const hasGst = billFoodList.some(item =>
        !isDetailComplimentary(item) &&
        (item.food_details?.tax_type || 'GST').toUpperCase() !== 'VAT'
      );

      if (hasVat && !hasGst) {
        vat_tax = totalTax;
      } else if (!hasVat || (hasGst && !hasVat)) {
        gst_tax = totalTax;
      } else {
        // Mixed GST + VAT — split proportionally by item base price
        let vatBase = 0, gstBase = 0;
        billFoodList.forEach(item => {
          if (isDetailComplimentary(item)) return;
          const qty = parseFloat(item.quantity) || 1;
          const unitPrice = parseFloat(item.unit_price) || parseFloat(item.food_details?.price) || 0;
          const base = (unitPrice > 0 ? unitPrice : (parseFloat(item.price) || 0)) * qty;
          if ((item.food_details?.tax_type || 'GST').toUpperCase() === 'VAT') vatBase += base;
          else gstBase += base;
        });
        const totalBase = vatBase + gstBase;
        if (totalBase > 0) {
          vat_tax = Math.round(totalTax * (vatBase / totalBase) * 100) / 100;
          gst_tax = Math.round((totalTax - vat_tax) * 100) / 100;
        } else {
          gst_tax = totalTax;
        }
      }
```

## Scope Lock

**Files WILL change:**
- `frontend/src/api/transforms/orderTransform.js` (L1875-1896 only)

**Files will NOT touch:**
- Everything else — zero caller changes, zero mapping changes, zero other branches

## Verification Matrix

| # | Test | Steps | Expected | Automated? |
|---|------|-------|----------|:---:|
| 1 | VAT-only order with addons | Order #002388 (sahi paneer x4 + addon, VAT 4%) → Print from OrderCard → check Network `/order-temp-store` | `vat_tax = 11.8` (= 333 - 321.2), `gst_tax = 0` | NO |
| 2 | GST-only order | Order with GST items → Print → check payload | `gst_tax = totalTax`, `vat_tax = 0` | NO |
| 3 | No-addon order | Plain item, no addons → Print | Tax derived correctly (same formula works regardless of addons) | NO |
| 4 | Zero-tax order | Order where items have 0% tax | `gst_tax = 0`, `vat_tax = 0` (333 - 333 = 0 if no tax) | NO |
| 5 | Collect Bill regression | Place → Collect Bill → auto-print | Values come from overrides (unchanged path), not from this fix | NO |
| 6 | Complimentary item | Order with comp item → Print | Comp items excluded from tax type check (`isDetailComplimentary` guard) | NO |

## Post-Code Registry Checklist

- [ ] Code markers: `// BUG-172 INTERIM` in the modified block
- [ ] Webpack: 0 new warnings
- [ ] Lint: 0 new errors

---

```
Plan ready at /app/memory/plans/BUG_172_IMPLEMENTATION_PLAN.md
1 edit across 1 file (orderTransform.js L1875-1896).
Code reality: NONE.
Scope: orderTransform.js else branch WILL change / everything else will NOT touch.
Verification matrix: 6 checks (0 automated, 6 manual).
Owner decisions needed: NONE.
Awaiting Gate 4 GO.
```
