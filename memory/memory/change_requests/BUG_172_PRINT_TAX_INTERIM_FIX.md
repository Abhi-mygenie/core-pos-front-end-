# BUG-172 INTAKE — Print Tax Wrong (Interim FE Fix While Backend Adds gst_tax/vat_tax)

**ID:** BUG-172
**Date:** 2026-07-08
**Classification:** BUG
**Severity:** P1 — HIGH (money amounts wrong on printed receipt)
**Risk:** CRITICAL — financial/tax semantics, hotspot file (`orderTransform.js`)
**Related:** BUG-168 (same root cause — backend doesn't return stored financial fields)
**Source:** QA-FOUND (during BUG-168 v3 validation)
**Confidence:** CONFIRMED (owner validated print payload — vat_tax=3.68 should be 11.68)

---

## Description

After BUG-168 v3 fix, the manual print path correctly passes through `order_item_total`, `order_subtotal`, `serviceChargeAmount`, and `payment_amount` from backend. However, `gst_tax` and `vat_tax` are still wrong because the backend doesn't return these fields on any read endpoint (socket, list API, single-order API).

The backend stores `gst_tax` and `vat_tax` (FE sends them on every place/edit/collect bill call) but doesn't return them. A backend fix is requested but until it's deployed, an interim FE fix is needed.

**Interim fix approach:** Derive total tax from two backend fields that ARE available:
```
totalTax = order.amount - order.subtotalBeforeTax
         = 333 - 321.2 = 11.8
```
Then assign to GST or VAT based on item `food_details.tax_type`.

This is NOT local computation of tax rates — it's subtraction of two backend-provided values. Once backend adds `gst_tax`/`vat_tax` to read endpoints, this interim code gets replaced with direct passthrough (2 lines).

---

## Evidence

- **Steps to reproduce:** Place order with taxable items + addons → Print from OrderCard → check payload in Network tab
- **Specific example:** Order #002388 (sahi paneer x4 + extra cheese slice, VAT 4%)
  - FE sent on place-order: `vat_tax = 11.68`
  - Backend returns: `vat_tax = ❌ NOT RETURNED`
  - Print payload: `vat_tax = 3.68` (WRONG — FE computes on base 92 instead of full 292)
  - Correct: `vat_tax = 11.8` (= order_amount 333 - subtotalBeforeTax 321.2)
- **Curl evidence:** `/app/memory/evidence/BUG-168-reinvestigation/` (all API responses saved)
- **Owner validated:** Owner shared print payload confirming the wrong value
- **Backend brief:** `/app/memory/evidence/BUG-168-reinvestigation/BACKEND_BRIEF_TAX_GAP.md`
- **Visual doc:** `/app/frontend/public/bug168-brief.html`

---

## Duplicate Check

**RELATED to BUG-168.** Same root cause (backend missing fields), different scope:
- BUG-168 v3 (IMPLEMENTED): Fixed subtotal, item_total, SC → backend passthrough ✅
- BUG-172 (THIS): Fixes tax (gst_tax, vat_tax) → interim derivation until backend fix

Not duplicate — BUG-168 is closed for its scope. This is the remaining tax piece.

---

## Blast Radius

- **Files:** 1 (`orderTransform.js`)
- **Lines:** ~20 (replace existing tax loop in `else` branch with derivation)
- **Hotspot:** YES — `orderTransform.js` is a hotspot (R5)
- **Scope:** SMALL (1 file, 1 function, 1 branch)

---

## Proposed Fix (Exact)

**File:** `orderTransform.js` → `buildBillPrintPayload` → `else` branch (manual print path)

**Current** (wrong — computes tax on base price without addons):
```js
billFoodList.forEach(item => {
    if (isDetailComplimentary(item)) return;
    let taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
    if (!taxAmt && item.food_details) {
        const qty = parseFloat(item.quantity) || 1;
        const unitPrice = ...;
        const price = ...;
        const lineTotal = price * qty;  // ← base only, no addons!
        const taxPct = parseFloat(item.food_details.tax) || 0;
        if (taxPct > 0) {
            taxAmt = isInclusive ? lineTotal * taxPct / (100 + taxPct) : lineTotal * taxPct / 100;
        }
    }
    if (taxType === 'VAT') vat_tax += taxAmt;
    else gst_tax += taxAmt;
});
```

**Proposed** (derive from backend values):
```js
// BUG-172: Interim tax derivation from backend values.
// order.amount (333) and order.subtotalBeforeTax (321.2) are both from backend.
// Total tax = difference. Assign to GST/VAT based on item tax types.
// Replace with direct order.gstTax / order.vatTax when backend adds these fields.
const totalTax = Math.max(0, Math.round(((order.amount || 0) - (order.subtotalBeforeTax || 0)) * 100) / 100);

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
    gst_tax = 0;
} else if (hasGst && !hasVat) {
    gst_tax = totalTax;
    vat_tax = 0;
} else if (hasGst && hasVat) {
    // Mixed tax types — split proportionally by item base prices
    let vatBase = 0, gstBase = 0;
    billFoodList.forEach(item => {
        if (isDetailComplimentary(item)) return;
        const qty = parseFloat(item.quantity) || 1;
        const unitPrice = parseFloat(item.unit_price) || parseFloat(item.food_details?.price) || 0;
        const base = (unitPrice > 0 ? unitPrice : (parseFloat(item.price) || 0)) * qty;
        if ((item.food_details?.tax_type || 'GST').toUpperCase() === 'VAT') vatBase += base;
        else gstBase += base;
    });
    const total = vatBase + gstBase;
    if (total > 0) {
        vat_tax = Math.round(totalTax * (vatBase / total) * 100) / 100;
        gst_tax = Math.round((totalTax - vat_tax) * 100) / 100;
    }
}
```

---

## Open Questions

None — approach is clear:
1. Derive total tax from `order.amount - order.subtotalBeforeTax` (both backend values)
2. Split by item tax type
3. Replace with backend passthrough when backend adds `gst_tax`/`vat_tax`

---

## FAST LANE Eligible?

**NO.** Risk is CRITICAL (financial/tax, hotspot file). Full gate flow required.

---

**Intake complete: BUG-172**
Classification: BUG, Severity: P1, Risk: CRITICAL
Duplicate check: RELATED to BUG-168
Evidence: captured (owner-validated payload + curl + investigation report)
Blast radius: SMALL (~1 file, ~20 lines, hotspot: YES orderTransform.js)
Code reality: NONE
Owner decisions needed: NONE
Next: Planning Gate 2-3
