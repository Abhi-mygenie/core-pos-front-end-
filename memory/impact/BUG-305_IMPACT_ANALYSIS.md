# BUG-305 Impact Analysis — orderTransform discountRatio wrong denominator (backend payload + print)
**Gate:** 2 — Impact Analysis
**Date:** 2026-08-11
**Planning Agent:** Role 2
**Based on:** Intake `change_requests/BUG-305_ORDERTRANSFORM_DISCOUNT_RATIO_BACKEND_PAYLOAD_PRINT_INTAKE.md`
**Code Reality:** FULL — confirmed at lines 823 + 1896
**Conflict Pre-Check:** No open items touching `orderTransform.js` lines 606-650 or 1840-1910. Last modifier: multiple (CR-025, BUG-270/271, BUG-168). No parallel work conflicts.

---

## 1. Summary

Same mathematical bug as BUG-304 (FIXED in UI layer) exists in `orderTransform.js` — the **backend payload builder** and **bill print payload builder**. GST/VAT sent to the server and printed on customer receipts is incorrect when a discounted order has non-discountable items (`give_discount = 'No'`).

**Risk:** HIGH/CRITICAL — R5 (`orderTransform.js` is an explicitly listed hotspot, 1916 lines) + R6 (financial — GST stored in backend DB and on printed receipts)

---

## 2. Key Discovery: Fix Is Entirely Self-Contained in `orderTransform.js`

**The intake estimated 5-file blast radius. This analysis confirms the fix needs only 1 file.**

### Why:

**Site 1 (`calcOrderTotals:823`):**
- Only **one of three callers** passes `discountAmount` — `collectBillExisting` (Caller 3, line ~1264)
- The other two callers (`placeOrder` ~1003, `updatePlaceOrder` ~1136) pass **no discount** → `discountAmount = 0` → `discountRatio = 0` → **no bug, no fix needed**
- Fix approach: Modify `buildCartItem` (line 606) to preserve a `_giveDiscount` marker on each item. `calcOrderTotals` then splits GST internally from items — **no caller changes, no extras parameter changes**

**Site 2 (`buildBillPrintPayload:1896`):**
- `item.food_details?.give_discount` is **already available** on every `billFoodList` item (parsed in `fromAPI.order` at line 158-159 via CR-028)
- Fix is **self-contained** — compute `discountableSubtotal` + `discountableGst` inside the existing `billFoodList.forEach` loop — **no caller changes**

---

## 3. Affected Callers — Precise Scope

### `calcOrderTotals` — 3 callers (only Caller 3 affected)

| Caller | Line | Passes discountAmount? | Bug? | Fix needed? |
|---|---|---|---|---|
| `placeOrder` | ~1003 | ❌ No (`discountAmount = 0`) | ❌ No | ❌ No |
| `updatePlaceOrder` | ~1136 | ❌ No (`discountAmount = 0`) | ❌ No | ❌ No |
| **`collectBillExisting`** | **~1264** | **✅ Yes (`discounts.total`)** | **✅ YES** | **✅ YES** |

### `buildBillPrintPayload` — 6 external callers

All callers are unaffected at the call site — fix is inside the function. No changes to `OrderEntry.jsx`, `orderService.js`, `RePrintButton.jsx`, `OrderCard.jsx`, `TableCard.jsx`, `AllOrdersReportPage.jsx`.

---

## 4. Data Flow Trace

### Site 1 — `calcOrderTotals` (collect-bill path)

```
CollectPaymentPanel → paymentData.discounts.total → 
  toAPI.collectBillExisting(table, cartItems, ..., paymentData) →
    Caller 3: calcOrderTotals(unplacedItems.map(buildCartItem), scPct, {
      discountAmount: discounts.total   ← total discount (all types)
    }) →
      subtotal = sum of ALL items (incl. non-discountable)
      gstTax   = sum of ALL items' gst_amount
      discountRatio = discountAmount / subtotal   ← BUG: full subtotal
      itemGstPostDiscount = gstTax * (1-discountRatio)  ← BUG: non-discountable GST also reduced
      
→ BREAK POINT: gst_tax in backend payload is wrong
```

### Site 2 — `buildBillPrintPayload` (auto-print after collect-bill)

```
CollectPaymentPanel → orderService → buildBillPrintPayload(order, scPct, overrides) →
  billFoodList.forEach(item) →
    item.food_details.give_discount available here  ← KEY FACT
    computedSubtotal += ALL items' lineTotal
    gst_tax += ALL items' gst_tax_amount
  discountRatio = overrideDiscount / computedSubtotal  ← BUG: full subtotal
  gst_tax = gst_tax * (1-discountRatio)  ← BUG: non-discountable GST also reduced

→ BREAK POINT: gst_tax on printed bill is wrong
```

---

## 5. Fix Design

### Fix 1 — `buildCartItem` (line 606): Add `_giveDiscount` marker

`buildCartItem` is an internal helper. Cart items in `unplacedItems` carry `giveDiscount` (set by `adaptProduct` in OrderEntry). We forward it as a private marker that `calcOrderTotals` can read.

```javascript
// CURRENT (end of buildCartItem return, after buildItemPayload)
return buildItemPayload(item, addonIds, addonQtys, variationAmount, variations);

// AFTER — BUG-305: forward giveDiscount as private marker for calcOrderTotals
const payload = buildItemPayload(item, addonIds, addonQtys, variationAmount, variations);
return { ...payload, _giveDiscount: item.giveDiscount !== false }; // BUG-305
```

> **Note:** The `_fullUnitPrice` private field already follows this same pattern (already stripped where needed).

---

### Fix 2 — `calcOrderTotals` (line 788 forEach, line 823): Split GST buckets + fix ratio

```javascript
// CURRENT
let subtotal = 0;
let gstTax = 0;
let vatTax = 0;

cart.forEach(item => {
  if (item.is_complementary === 'Yes') return;
  const lineTotal = (item._fullUnitPrice || item.price || 0) * (item.quantity || 1);
  subtotal += lineTotal;
  gstTax += parseFloat(item.gst_amount) || 0;
  vatTax += parseFloat(item.vat_amount) || 0;
});
subtotal = Math.round(subtotal * 100) / 100;
// ...
const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;
// ...
const itemGstPostDiscount = gstTax * (1 - discountRatio);
const vatTaxPostDiscount  = vatTax * (1 - discountRatio);

// AFTER — BUG-305: split discountable vs non-discountable GST/VAT
let subtotal = 0;
let gstTax = 0, vatTax = 0;
let discountableSubtotal = 0, discountableGst = 0, discountableVat = 0; // BUG-305

cart.forEach(item => {
  if (item.is_complementary === 'Yes') return;
  const lineTotal = (item._fullUnitPrice || item.price || 0) * (item.quantity || 1);
  const isDiscountable = item._giveDiscount !== false; // BUG-305: from buildCartItem marker
  subtotal += lineTotal;
  const itemGst = parseFloat(item.gst_amount) || 0;
  const itemVat = parseFloat(item.vat_amount) || 0;
  gstTax += itemGst;
  vatTax += itemVat;
  if (isDiscountable) { // BUG-305
    discountableSubtotal += lineTotal;
    discountableGst += itemGst;
    discountableVat += itemVat;
  }
});
subtotal = Math.round(subtotal * 100) / 100;
discountableSubtotal = Math.round(discountableSubtotal * 100) / 100; // BUG-305
// ...
// BUG-305: use discountableSubtotal as denominator; only discount-eligible items' GST reduced
const discountableRatio = discountableSubtotal > 0 ? discountAmount / discountableSubtotal : 0;
// ...
const itemGstPostDiscount =
  discountableGst * (1 - discountableRatio)                // discountable GST ↓ BUG-305
  + (gstTax - discountableGst);                             // non-discountable GST unchanged
const vatTaxPostDiscount =
  discountableVat * (1 - discountableRatio)                // discountable VAT ↓ BUG-305
  + (vatTax - discountableVat);                             // non-discountable VAT unchanged
```

---

### Fix 3 — `buildBillPrintPayload` (line ~1843 forEach + line 1896): Split + fix ratio

```javascript
// CURRENT — forEach accumulates ALL items together
billFoodList.forEach(item => {
  if (isDetailComplimentary(item)) return;
  // ... lineTotal, taxAmt computation ...
  computedSubtotal += lineTotal;
  if (taxType === 'VAT') vat_tax += taxAmt;
  else gst_tax += taxAmt;
});
// ...
const discountRatio = overrideDiscount / computedSubtotal;
gst_tax = gst_tax * (1 - discountRatio) + SC + tip + delivery GST;

// AFTER — BUG-305: split by food_details.give_discount (available on all billFoodList items)
let discountableSubtotal = 0, discountableGst = 0, discountableVat = 0; // BUG-305
billFoodList.forEach(item => {
  if (isDetailComplimentary(item)) return;
  // ... lineTotal, taxAmt computation (unchanged) ...
  computedSubtotal += lineTotal;
  // BUG-305: food_details.give_discount available from CR-028 fromAPI.order
  const isDiscountable = (item.food_details?.give_discount || 'Yes') !== 'No';
  if (taxType === 'VAT') {
    vat_tax += taxAmt;
    if (isDiscountable) { discountableSubtotal += lineTotal; discountableVat += taxAmt; }
  } else {
    gst_tax += taxAmt;
    if (isDiscountable) { discountableSubtotal += lineTotal; discountableGst += taxAmt; }
  }
});
// ...
// BUG-305: use discountableSubtotal; only discount-eligible items' GST reduced
const discountableRatio = discountableSubtotal > 0 ? overrideDiscount / discountableSubtotal : 0;
gst_tax = discountableGst * (1 - discountableRatio)     // discountable GST ↓
        + (gst_tax - discountableGst)                    // non-discountable unchanged
        + serviceChargeAmount * scTaxRate
        + overrideTip * scTaxRate
        + overrideDelivery * delTaxRate;
vat_tax = discountableVat * (1 - discountableRatio)     // discountable VAT ↓
        + (vat_tax - discountableVat);                   // non-discountable unchanged
```

---

## 6. Regression Risk Assessment

| Scenario | Risk | Why |
|---|---|---|
| All items discountable (most common) | **NONE** — `discountableGst = gstTax`, formula = original | Mathematical identity |
| No discount (`discountAmount = 0`) | **NONE** — `discountableRatio = 0`, formula = original | Zero ratio |
| placeOrder / updatePlaceOrder (Caller 1 + 2) | **NONE** — not touched at all | Out of scope |
| Mixed cart WITH non-discountable + discount | **INTENTIONAL CHANGE** — GST is now correct | This is the fix |
| VAT items | Same fix applies, same regression protection | |

---

## 7. Scope Lock

**WILL change (1 file only):**
- `src/api/transforms/orderTransform.js` — 3 internal functions:
  - `buildCartItem` (~line 606): add `_giveDiscount` marker
  - `calcOrderTotals` (~line 788 forEach + ~line 823): add discountable buckets + fix ratio
  - `buildBillPrintPayload` (~line 1843 forEach + ~line 1896): same split pattern

**WILL NOT touch:**
- `CollectPaymentPanel.jsx` — no changes needed (discountableTotal not needed as extras)
- `CartPanel.jsx` — not involved (only placeOrder path, no discount in calcOrderTotals)
- `OrderEntry.jsx` — not involved
- `orderService.js` — not involved
- Any unit test files — **behavior changes; existing tests need to be checked (see V8-V10)**

---

## 8. Verification Matrix

| # | Verification | Method |
|---|---|---|
| V1 | `buildCartItem` output has `_giveDiscount` field | Code inspection |
| V2 | `calcOrderTotals` forEach tracks `discountableSubtotal`, `discountableGst`, `discountableVat` | Code inspection |
| V3 | `calcOrderTotals` uses `discountableRatio` (not `discountRatio`) | Code inspection |
| V4 | `calcOrderTotals` `itemGstPostDiscount` uses split formula | Code inspection |
| V5 | `buildBillPrintPayload` forEach tracks `isDiscountable` + splits | Code inspection |
| V6 | `buildBillPrintPayload` uses `discountableRatio` + split `gst_tax` + split `vat_tax` | Code inspection |
| V7 | Compile: webpack 0 new warnings | `tail frontend.out.log` |
| V8 | All-discountable cart: `calcOrderTotals` GST unchanged vs pre-fix | Unit test |
| V9 | Mixed cart + discount: `calcOrderTotals` GST correct per formula | Unit test |
| V10 | No discount: `calcOrderTotals` GST unchanged | Unit test |
| V11 | `buildBillPrintPayload` collect-bill path: GST correct for mixed cart | Code trace + unit test |

---

## 9. Unit Tests Note

Existing unit tests for `calcOrderTotals` (`round001`, `cr029`, `qa_subtotal_delivery_validation`) test the **all-discountable** scenario. They should still pass (V8/V10). New test cases for **mixed cart** scenario (V9/V11) needed in QA handover.

---

## 10. Owner Decisions

| OD | Question | Status |
|---|---|---|
| OD-1 ✅ | Fix `buildCartItem` + `calcOrderTotals` + `buildBillPrintPayload` only | **CONFIRMED** — 1 file |
| OD-2 ✅ | Fix VAT same as GST in both functions | **YES — same pattern** |
| OD-3 ✅ | No caller changes needed | **CONFIRMED by analysis** |

**All ODs resolved by analysis — no owner questions pending. Ready for Gate 3.**

---

## 11. Post-Code Registry Checklist (for Implementation Agent)

```
- [ ] registry.json: BUG-305 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: orderTransform.js entry for BUG-305
- [ ] Code markers: // BUG-305 in every changed block
- [ ] Compile: webpack 0 new warnings
```

---

**Gate 2 COMPLETE — 2026-08-11.**
All owner decisions resolved by analysis. Scope: 1 file (orderTransform.js), 3 internal functions.
Ready for Gate 3 Implementation Plan → Gate 4 GO → Implementation.
