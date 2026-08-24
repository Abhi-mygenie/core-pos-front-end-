# BUG-271 Implementation Plan — Gate 3

**ID:** BUG-271  
**Title:** GST/VAT Wrong on Print — Manual Print Path Missing food_details.tax Fallback  
**Risk:** CRITICAL  
**Sprint:** pos_5_0  
**Date:** 2026-07-30  
**Precondition:** Impact Analysis at `/app/memory/impact/BUG-271_IMPACT_ANALYSIS.md`  
**Status:** Awaiting Gate 4 GO

---

## Scope Lock

**Files WILL change:**
- `src/api/transforms/orderTransform.js` (lines 1882-1893 only)

**Files will NOT touch:**
- `CollectPaymentPanel.jsx`
- `OrderEntry.jsx`
- `orderService.js`
- `TableCard.jsx`, `OrderCard.jsx`, `RePrintButton.jsx`, `DashboardPage.jsx`, `AllOrdersReportPage.jsx`
- Any `.env`, `package.json`

---

## Entry Verification (Step 0)

Before writing any code, confirm L1882 still matches:

```bash
sed -n '1879,1895p' /app/frontend/src/api/transforms/orderTransform.js
```

Expected at L1882:
```javascript
      billFoodList.forEach(item => {
        if (isDetailComplimentary(item)) return;
        const taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
```

If different → **STOP. Return to Planning agent.** "Plan stale."

---

## Edit 1 — Add food_details.tax fallback to manual print path

**File:** `src/api/transforms/orderTransform.js`  
**Lines:** 1882-1893 (12 lines → ~21 lines)  
**Method:** `search_replace` only — do not recreate file

### REMOVE (current lines 1882-1893):
```javascript
      billFoodList.forEach(item => {
        if (isDetailComplimentary(item)) return;
        const taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
        const taxType = (item.food_details?.tax_type || 'GST').toUpperCase();
        if (taxType === 'VAT') {
          vat_tax += taxAmt;
        } else {
          gst_tax += taxAmt;
        }
      });
      gst_tax = Math.round(gst_tax * 100) / 100;
      vat_tax = Math.round(vat_tax * 100) / 100;
```

### REPLACE WITH:
```javascript
      // BUG-271 FIX-COMPLETE (2026-07-30): add food_details.tax fallback.
      // Backend returns gst_tax_amount: null on all order_detail rows.
      // Without a fallback, per-item accumulation always produces gst_tax=0, vat_tax=0.
      // Mirror the Collect Bill path (L1821-1830) which has the same fallback.
      billFoodList.forEach(item => {
        if (isDetailComplimentary(item)) return;
        const qty        = parseFloat(item.quantity)  || 1;
        const unitPrice  = parseFloat(item.unit_price) || parseFloat(item.food_details?.price) || 0;
        const price      = unitPrice > 0 ? unitPrice : (parseFloat(item.price) || 0);
        const addonPerUnit = (item.add_ons || []).reduce(
          (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
          0
        );
        const lineTotal = (price * qty) + (addonPerUnit * qty);
        let taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
        if (!taxAmt && item.food_details) {
          const taxPct = parseFloat(item.food_details.tax) || 0;
          if (taxPct > 0) {
            const isInclusive = (item.food_details.tax_calc || '').toLowerCase() === 'inclusive';
            taxAmt = isInclusive
              ? lineTotal * taxPct / (100 + taxPct)
              : lineTotal * taxPct / 100;
          }
        }
        const taxType = (item.food_details?.tax_type || 'GST').toUpperCase();
        if (taxType === 'VAT') {
          vat_tax += taxAmt;
        } else {
          gst_tax += taxAmt;
        }
      });
      gst_tax = Math.round(gst_tax * 100) / 100;
      vat_tax = Math.round(vat_tax * 100) / 100;
```

---

## Execution Sequence

```
1. Entry verify → confirm L1882 state
2. search_replace edit 1
3. Compile check: tail frontend log
4. EXIT GATE (5 items)
5. Write QA Handover
```

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1a | `orderTransform.js:1882` | Fallback added | Print from TableCard → Network tab → `order-temp-store` payload → `gst_tax` non-zero | NO |
| 1b | Regression | Collect Bill path unchanged | Print from CollectPaymentPanel → same payload check | NO |
| 1c | Regression | GST vs VAT routing correct | Mixed GST+VAT order → values in correct fields | NO |
| 1d | Regression | Exclusive vs inclusive tax_calc | Exclusive: `lineTotal × pct/100`; Inclusive: `lineTotal × pct/(100+pct)` | NO |
| 1e | Regression | Complimentary items = 0 contribution | Comp item in order → contributes 0 to either field | NO |
| 1f | Compile | No new warnings | `tail -5 frontend.out.log` → "Compiled successfully" | YES |

---

## Risk Register

| Risk | Probability | Mitigation |
|------|-------------|-----------|
| Collect Bill path accidentally changed | LOW | Edit is isolated to `else` branch; search_replace is precise |
| lineTotal computed differently from Collect Bill | LOW | Identical declarations copied from L1811-1818 |
| Complimentary items get non-zero tax | LOW | Skip guard preserved at first line of forEach |
| Addon counted twice | LOW | Formula is `addonPerUnit × qty` (not squared) — same as BUG-168 v2 |

---

## Post-Code Registry Checklist

```
[ ] registry.json: BUG-271 → status: "QA PENDING", gate: "0-5"
[ ] BUG_TRACKER.md: BUG-271 row → status updated
[ ] FILE_OWNERSHIP.md: orderTransform.js → note BUG-271 FIX-COMPLETE (2026-07-30)
[ ] Code marker: "// BUG-271 FIX-COMPLETE" in modified block
[ ] Compile check: webpack 0 new warnings
```

---

## Regression Checklist (R5 hotspot + R6 financial)

```
[ ] Place order → Collect Bill → auto-print → gst_tax non-zero in order-temp-store payload
[ ] Place order → manual Print from TableCard → gst_tax non-zero
[ ] Reprint from AllOrdersReportPage → gst_tax non-zero
[ ] DashboardPage reprint → gst_tax non-zero
[ ] Mixed GST+VAT order → correct field routing
[ ] Complimentary item → contributes 0 to both fields
```
