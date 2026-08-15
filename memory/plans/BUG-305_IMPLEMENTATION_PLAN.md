# BUG-305 — Gate 3 Implementation Plan
**Date:** 2026-08-11
**Based on:** `impact/BUG-305_IMPACT_ANALYSIS.md` (Gate 2 complete, all ODs resolved)
**Owner Gate 4 GO:** All owner decisions resolved by analysis — awaiting owner GO confirmation
**Risk:** CRITICAL (R5 `orderTransform.js` hotspot + R6 financial — GST on backend payload + printed bill)

---

## Scope Lock

**WILL change:**
- `src/api/transforms/orderTransform.js` — 3 internal edits (E1 `buildCartItem`, E2 `calcOrderTotals`, E3 `buildBillPrintPayload`)

**WILL NOT touch:**
- Any other file — no caller changes, no service changes, no component changes
- `CollectPaymentPanel.jsx`, `CartPanel.jsx`, `OrderEntry.jsx`, `orderService.js` — unchanged

---

## Entry Verification (confirmed 2026-08-11)

| File | Location | Expected state | Verified |
|---|---|---|---|
| `orderTransform.js:747` | `buildCartItem` last field | `_fullUnitPrice: fullUnitPrice,` | ✅ |
| `orderTransform.js:749` | `buildCartItem` closing brace | `};` (function end) | ✅ |
| `orderTransform.js:783-785` | `calcOrderTotals` variable declarations | `let subtotal = 0; let gstTax = 0; let vatTax = 0;` | ✅ |
| `orderTransform.js:823` | `calcOrderTotals` discountRatio | `const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;` | ✅ |
| `orderTransform.js:837` | `calcOrderTotals` itemGstPostDiscount | `const itemGstPostDiscount = gstTax * (1 - discountRatio);` | ✅ |
| `orderTransform.js:841` | `calcOrderTotals` vatTaxPostDiscount | `const vatTaxPostDiscount = vatTax * (1 - discountRatio);` | ✅ |
| `orderTransform.js:1896` | `buildBillPrintPayload` discountRatio | `const discountRatio = overrideDiscount / computedSubtotal;` | ✅ |

---

## Execution Sequence

### E1 — `buildCartItem` (line 747): Add `_giveDiscount` private marker

**Why:** `buildCartItem` converts cart items (which have `giveDiscount`) into built payloads (which don't). Adding a `_giveDiscount` private marker (following the existing `_fullUnitPrice` convention) lets `calcOrderTotals` split discountable/non-discountable GST internally — no caller changes needed.

**Current code (lines 747-749):**
```javascript
    _fullUnitPrice:      fullUnitPrice,
  };
};
```

**New code:**
```javascript
    _fullUnitPrice:      fullUnitPrice,
    _giveDiscount:       item.giveDiscount !== false, // BUG-305: marker for calcOrderTotals GST split
  };
};
```

---

### E2 — `calcOrderTotals` (lines 783-843): Add discountable buckets + fix ratio

**Step E2a — extend variable declarations (line 783-785):**

**Current code:**
```javascript
  let subtotal = 0;
  let gstTax = 0;
  let vatTax = 0;
```

**New code:**
```javascript
  let subtotal = 0;
  let gstTax = 0;
  let vatTax = 0;
  let discountableSubtotal = 0, discountableGst = 0, discountableVat = 0; // BUG-305
```

**Step E2b — extend forEach body to split by `_giveDiscount` (lines ~787-800):**

**Current code:**
```javascript
  cart.forEach(item => {
    // BUG-018 Part 2 (Apr-2026): exclude runtime-marked complimentary lines from
    // billable subtotal and tax aggregation. Catalog-complimentary lines already
    // contribute 0 naturally via price:0 — this guard only affects runtime-marked
    // lines (where price > 0 but is_complementary is flipped to "Yes").
    if (item.is_complementary === 'Yes') return;
    // CR-010: item.quantity may be decimal for weight-based items — do not parseInt/floor
    const lineTotal = (item._fullUnitPrice || item.price || 0) * (item.quantity || 1);
    subtotal += lineTotal;
    gstTax += parseFloat(item.gst_amount) || 0;
    vatTax += parseFloat(item.vat_amount) || 0;
  });
```

**New code:**
```javascript
  cart.forEach(item => {
    // BUG-018 Part 2 (Apr-2026): exclude runtime-marked complimentary lines from
    // billable subtotal and tax aggregation. Catalog-complimentary lines already
    // contribute 0 naturally via price:0 — this guard only affects runtime-marked
    // lines (where price > 0 but is_complementary is flipped to "Yes").
    if (item.is_complementary === 'Yes') return;
    // CR-010: item.quantity may be decimal for weight-based items — do not parseInt/floor
    const lineTotal = (item._fullUnitPrice || item.price || 0) * (item.quantity || 1);
    const itemGst = parseFloat(item.gst_amount) || 0; // BUG-305
    const itemVat = parseFloat(item.vat_amount) || 0; // BUG-305
    subtotal += lineTotal;
    gstTax   += itemGst;
    vatTax   += itemVat;
    if (item._giveDiscount !== false) { // BUG-305: from buildCartItem marker
      discountableSubtotal += lineTotal;
      discountableGst      += itemGst;
      discountableVat      += itemVat;
    }
  });
```

**Step E2c — fix discountRatio + itemGstPostDiscount + vatTaxPostDiscount (lines 823, 837, 841):**

**Current code:**
```javascript
  const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;
```
```javascript
  const itemGstPostDiscount = gstTax * (1 - discountRatio);
```
```javascript
  const vatTaxPostDiscount = vatTax * (1 - discountRatio);
```

**New code:**
```javascript
  // BUG-305: use discountableSubtotal as denominator; non-discountable items' GST unchanged
  const discountableRatio = discountableSubtotal > 0 ? discountAmount / discountableSubtotal : 0;
```
```javascript
  // BUG-305: only discountable items' GST reduced; non-discountable portion unchanged
  const itemGstPostDiscount =
    discountableGst * (1 - discountableRatio) + (gstTax - discountableGst);
```
```javascript
  // BUG-305: same split for VAT (mirrors GST fix above)
  const vatTaxPostDiscount =
    discountableVat * (1 - discountableRatio) + (vatTax - discountableVat);
```

---

### E3 — `buildBillPrintPayload` (lines ~1840-1904): Add split + fix ratio

**Step E3a — add discountable bucket declarations before the forEach (line ~1840):**

**Current code:**
```javascript
    if (hasFinancialOverrides) {
      // ── COLLECT BILL PATH (existing FE computation, unchanged) ────────
      billFoodList.forEach(item => {
```

**New code:**
```javascript
    if (hasFinancialOverrides) {
      // ── COLLECT BILL PATH (existing FE computation, unchanged) ────────
      let discountableSubtotal = 0, discountableGst = 0, discountableVat = 0; // BUG-305
      billFoodList.forEach(item => {
```

**Step E3b — extend forEach to split by `food_details.give_discount` (inside the forEach, after `taxType` split):**

**Current code:**
```javascript
        const taxType = (item.food_details?.tax_type || 'GST').toUpperCase();
        if (taxType === 'VAT') vat_tax += taxAmt;
        else gst_tax += taxAmt;
      });
```

**New code:**
```javascript
        const taxType = (item.food_details?.tax_type || 'GST').toUpperCase();
        // BUG-305: food_details.give_discount available from CR-028 fromAPI.order (line 159)
        const isDiscountable = (item.food_details?.give_discount || 'Yes') !== 'No'; // BUG-305
        if (taxType === 'VAT') {
          vat_tax += taxAmt;
          if (isDiscountable) { discountableSubtotal += lineTotal; discountableVat += taxAmt; } // BUG-305
        } else {
          gst_tax += taxAmt;
          if (isDiscountable) { discountableSubtotal += lineTotal; discountableGst += taxAmt; } // BUG-305
        }
      });
```

**Step E3c — fix discountRatio + gst_tax + vat_tax (inside `if (overrides.serviceChargeAmount === undefined && computedSubtotal > 0)`):**

**Current code:**
```javascript
      if (overrides.serviceChargeAmount === undefined
          && computedSubtotal > 0) {
        const discountRatio = overrideDiscount / computedSubtotal;
        const scTaxRate     = (overrides.serviceChargeTaxPct  || 0) / 100;
        const delTaxRate    = (overrides.deliveryChargeGstPct || 0) / 100;
        gst_tax = gst_tax * (1 - discountRatio)
                + serviceChargeAmount * scTaxRate
                + overrideTip          * scTaxRate
                + overrideDelivery     * delTaxRate;
      }
```

**New code:**
```javascript
      if (overrides.serviceChargeAmount === undefined
          && computedSubtotal > 0) {
        // BUG-305: use discountableSubtotal; non-discountable items' GST/VAT unchanged
        const discountableRatio = discountableSubtotal > 0
          ? overrideDiscount / discountableSubtotal : 0;
        const scTaxRate = (overrides.serviceChargeTaxPct  || 0) / 100;
        const delTaxRate = (overrides.deliveryChargeGstPct || 0) / 100;
        gst_tax = discountableGst * (1 - discountableRatio)   // BUG-305: discountable GST ↓
                + (gst_tax - discountableGst)                  // BUG-305: non-discountable unchanged
                + serviceChargeAmount * scTaxRate
                + overrideTip          * scTaxRate
                + overrideDelivery     * delTaxRate;
        vat_tax = discountableVat * (1 - discountableRatio)   // BUG-305: discountable VAT ↓
                + (vat_tax - discountableVat);                 // BUG-305: non-discountable unchanged
      }
```

> **Note:** `vat_tax` currently has no post-discount adjustment in this block. The `vat_tax = Math.round(vat_tax * 100) / 100` line below it handles the final value. E3c adds the split to `vat_tax` here inside the same `if` block for consistency with `gst_tax`.

---

## Verification Matrix

| # | Edit | What to verify | Method |
|---|---|---|---|
| V1 | E1 | `buildCartItem` return object has `_giveDiscount: item.giveDiscount !== false` after `_fullUnitPrice` | Code inspection |
| V2 | E2a | `let discountableSubtotal = 0, discountableGst = 0, discountableVat = 0;` present before forEach | Code inspection |
| V3 | E2b | forEach uses `itemGst`/`itemVat` variables and has `if (item._giveDiscount !== false)` block | Code inspection |
| V4 | E2c | `discountableRatio` (not `discountRatio`) defined at line ~823 | Code inspection |
| V5 | E2c | `itemGstPostDiscount` uses split formula with `discountableGst * (1-ratio) + (gstTax - discountableGst)` | Code inspection |
| V6 | E2c | `vatTaxPostDiscount` uses same split formula with `discountableVat` | Code inspection |
| V7 | E3a | `let discountableSubtotal...` declared before `billFoodList.forEach` | Code inspection |
| V8 | E3b | `isDiscountable` check present in forEach; VAT/GST split into discountable buckets | Code inspection |
| V9 | E3c | `discountableRatio` used; `gst_tax` and `vat_tax` use split formula | Code inspection |
| V10 | All | Compile: webpack 0 new warnings | `tail frontend.out.log` |
| V11 | Regression | All-discountable cart: `calcOrderTotals` GST identical to pre-fix | Existing unit tests pass |
| V12 | Regression | No discount: GST unchanged | Existing unit tests pass |
| V13 | Fix | Mixed cart + discount: `calcOrderTotals` GST = `discountableGst*(1-ratio) + nonDiscountableGst` | Manual verification |

---

## Regression Risk

| Scenario | Risk |
|---|---|
| All items discountable | **NONE** — `discountableGst = gstTax`, formula = original |
| No discount (`discountAmount = 0`) | **NONE** — `discountableRatio = 0` |
| `placeOrder` / `updatePlaceOrder` callers | **NONE** — not touched |
| Mixed cart + discount | **INTENTIONAL CHANGE** — this is the fix |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-305 → status: IMPLEMENTED — AWAITING QA, sprint_key: pos_5_1
- [ ] BUG_TRACKER.md: row updated to IMPLEMENTED — AWAITING QA
- [ ] FILE_OWNERSHIP.md: orderTransform.js entry added for BUG-305
- [ ] Code markers: // BUG-305 in all changed blocks (already in plan above)
- [ ] Compile: webpack 0 new warnings
```

---

**Gate 3 COMPLETE — 2026-08-11.**
Awaiting Gate 4 GO → Implementation (Role 3).
