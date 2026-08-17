# BUG-168 — Audit of Wrong FE Computations in Print Path

**Date:** 2026-07-08
**Purpose:** Identify ALL frontend code that locally computes/manipulates subtotal, item total, tax, and service charge for the manual print path — code that should NOT exist because the backend provides correct values.

**Principle:** For the manual print path (OrderCard / TableCard / RePrintButton), the backend already has correct `order_sub_total_amount`, `order_sub_total_without_tax`, `total_service_tax_amount`, etc. The FE should pass these through, not recompute them.

---

## FILE: `orderTransform.js` — `buildBillPrintPayload` (L1712-2161)

### ❌ WRONG #1: The entire `computedSubtotal` loop (L1802-1844)

```js
// L1802-1843
let gst_tax = 0, vat_tax = 0, computedSubtotal = 0;
billFoodList.forEach(item => {
    // ... iterates items, computes lineTotal from unit_price + addons
    const addonPerUnit = (item.add_ons || []).reduce(...);     // BUG-168 v2 addon fix
    const lineTotal = (price * qty) + (addonPerUnit * qty);
    computedSubtotal += lineTotal;
    
    // ... computes tax from food_details.tax percentage
    let taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
    if (!taxAmt && item.food_details) { /* recompute from percentage */ }
});
computedSubtotal = Math.round(computedSubtotal * 100) / 100;
```

**Why it's wrong:** This loop recomputes `computedSubtotal` (item total) and `gst_tax`/`vat_tax` from scratch using item-level data. The backend already provides:
- `order.subtotalAmount` (= `order_sub_total_amount` = 219) — correct item total
- `order.subtotalBeforeTax` (= `order_sub_total_without_tax` = 240.9) — correct subtotal with SC
- The tax amounts are also derivable from backend fields

**What should happen:** For the non-override path (manual print), just use `order.subtotalAmount` directly. No item-level computation needed.

**BUG IDs involved:** BUG-246, BUG-018 Part 3, BUG-168 v2

---

### ❌ WRONG #2: BUG-168 v2 addon computation (L1808-1826)

```js
// L1821-1825
const addonPerUnit = (item.add_ons || []).reduce(
    (s, a) => s + ((parseFloat(a.price) || 0) * (parseFloat(a.quantity) || 1)),
    0
);
const lineTotal = (price * qty) + (addonPerUnit * qty);
```

**Why it's wrong:** This was added in a previous session to fix addon prices not appearing in the computed subtotal. But the fix is itself wrong — it's FE computing what the backend already knows. The `order_sub_total_amount: 219` from socket/backend ALREADY includes addons correctly. This fix only exists because the code was falling through to the FE computation path.

---

### ❌ WRONG #3: FE service charge computation (L1863-1887)

```js
// L1863
const postDiscountSubtotal = Math.max(0, computedSubtotal - overrideDiscount);

// L1881-1887
const serviceChargeAmount = overrides.serviceChargeAmount !== undefined
    ? overrides.serviceChargeAmount
    : (scApplicable
        ? (serviceChargePercentage > 0
            ? Math.round(postDiscountSubtotal * serviceChargePercentage / 100 * 100) / 100
            : (order.serviceTax || 0))
        : 0);
```

**Why it's wrong (for manual print):** It recomputes SC from `postDiscountSubtotal` (which comes from the wrong `computedSubtotal`). The backend already provides `total_service_tax_amount: 21.90`. For manual print, just use `order.serviceTax` directly.

**Note:** The `(order.serviceTax || 0)` fallback on L1886 IS correct — but it only fires when `serviceChargePercentage` is 0. When the restaurant has auto SC enabled, the L1885 computation fires using the wrong `postDiscountSubtotal`.

**BUG IDs involved:** BUG-006, BUG-023

---

### ❌ WRONG #4: FE tax recomputation with discount ratio (L1898-1907)

```js
// L1898-1907
if (overrides.serviceChargeAmount === undefined && computedSubtotal > 0) {
    const discountRatio = overrideDiscount / computedSubtotal;
    const scTaxRate = (overrides.serviceChargeTaxPct || 0) / 100;
    const delTaxRate = (overrides.deliveryChargeGstPct || 0) / 100;
    gst_tax = gst_tax * (1 - discountRatio)
            + serviceChargeAmount * scTaxRate
            + overrideTip * scTaxRate
            + overrideDelivery * delTaxRate;
}
```

**Why it's wrong:** This recalculates GST from scratch using the FE-computed values. For manual print, the backend knows the correct tax. This should not fire for the non-override path.

**BUG IDs involved:** CR-013

---

### ❌ WRONG #5: `finalOrderItemTotal` fallback to `computedSubtotal` (L1938-1940)

```js
const finalOrderItemTotal = overrides.orderItemTotal !== undefined
    ? overrides.orderItemTotal
    : (order.subtotalAmount || computedSubtotal || 0);
//                              ^^^^^^^^^^^^^^^^
//                              THIS fallback is the problem
```

**Why it's wrong:** When `order.subtotalAmount` is 0 (because polling overwrote socket data with list API data), it falls to `computedSubtotal` — the FE-computed value. If the polling issue is fixed (backend adds field to list API), `order.subtotalAmount` would always be correct and `computedSubtotal` would never be needed.

**What should happen:** `order.subtotalAmount` should be the ONLY source. If it's 0, it means the backend genuinely returned 0 (new order with no items), not that the field is missing.

---

### ❌ WRONG #6: `finalOrderSubtotal` fallback chain (L1946-1960)

```js
const finalOrderSubtotal = overrides.orderSubtotal !== undefined
    ? overrides.orderSubtotal
    : (() => {
        const itemBase = order.subtotalBeforeTax || order.subtotalAmount || computedSubtotal || 0;
        //                                                                  ^^^^^^^^^^^^^^^^
        const tipAmt = overrides.tip !== undefined ? overrides.tip : (parseFloat(order.tipAmount) || 0);
        const delAmt = ...;
        return Math.round((itemBase + serviceChargeAmount + tipAmt + delAmt) * 100) / 100;
        //                           ^^^^^^^^^^^^^^^^^^^
        //                           SC already in subtotalBeforeTax — DOUBLE COUNTING
    })();
```

**Why it's wrong (two issues):**
1. Falls to `computedSubtotal` when backend fields are 0 (same polling issue)
2. **Double-counts SC:** `order.subtotalBeforeTax` (= `order_sub_total_without_tax` = 240.9) ALREADY includes SC (219 + 21.90 = 240.9). Then it ADDS `serviceChargeAmount` again. This would produce `240.9 + 21.90 = 262.80` instead of `240.9`.

**What should happen:** For manual print, just use `order.subtotalBeforeTax` directly as the subtotal. No addition needed.

**BUG IDs involved:** BUG-282, BUG-281

---

## FILE: `useOrderPollingReconciliation.js` — Fingerprint (L47-76)

### ❌ WRONG #7: `subtotalAmount` in fingerprint causes data destruction

```js
// L68
(Number(o.subtotalAmount) || 0).toFixed(2),
```

**Why it's wrong:** When socket provides `subtotalAmount: 219` and list API provides `subtotalAmount: 0` (missing field), the fingerprints differ (`219.00` vs `0.00`). This triggers `updateOrder(orderId, serverOrder)` which REPLACES the correct socket data with the incomplete list API data.

**What should happen (once backend adds field to list API):** This resolves itself. Both sources will have `subtotalAmount: 219` → fingerprints match → no overwrite.

**Interim fix option:** Exclude `subtotalAmount` from the fingerprint, OR merge missing fields from local before overwriting.

---

## SUMMARY OF ALL WRONG FE MANIPULATIONS

| # | File | Lines | What it does | Why it's wrong |
|---|------|-------|-------------|----------------|
| 1 | orderTransform.js | L1802-1844 | Computes `computedSubtotal` from item loop | Backend provides `order_sub_total_amount` — no need to compute |
| 2 | orderTransform.js | L1808-1826 | BUG-168 v2: addon price computation | Workaround for #1 — unnecessary if backend value is used |
| 3 | orderTransform.js | L1863-1887 | Computes SC from `postDiscountSubtotal` | Backend provides `total_service_tax_amount` — just use it |
| 4 | orderTransform.js | L1898-1907 | Recomputes GST with discount ratio | Backend knows correct tax — no FE recomputation needed |
| 5 | orderTransform.js | L1938-1940 | `finalOrderItemTotal` falls to `computedSubtotal` | Should use ONLY `order.subtotalAmount` |
| 6 | orderTransform.js | L1946-1960 | `finalOrderSubtotal` recomputes + double-counts SC | Should use ONLY `order.subtotalBeforeTax` |
| 7 | useOrderPollingReconciliation.js | L68 | `subtotalAmount` in fingerprint | Causes polling to overwrite socket data with incomplete list API data |

---

## WHAT THE CORRECT FLOW SHOULD LOOK LIKE

For the **manual print path** (no overrides):

```js
// CORRECT: just use backend values
const finalOrderItemTotal = order.subtotalAmount;        // order_sub_total_amount from backend
const finalOrderSubtotal = order.subtotalBeforeTax;      // order_sub_total_without_tax from backend
const finalPaymentAmount = order.amount;                  // order_amount from backend
const finalGstTax = ???;                                  // Need backend to provide this too, OR derive from order.amount - order.subtotalBeforeTax
const serviceChargeAmount = order.serviceTax;             // total_service_tax_amount from backend
```

No item-level loops. No addon computation. No SC recomputation. No tax recomputation. Just pass through what the backend provides.

---

## PREREQUISITES (BACKEND)

For the FE to stop computing, the backend must ensure:
1. **`employee-orders-list`** includes `order_sub_total_amount` and `order_sub_total_without_tax` (currently missing — THE blocker)
2. Socket events already include them ✅
3. `get-single-order-new` already includes them ✅

Once the backend adds these 2 fields to the list API, the entire FE computation block (L1802-1907) becomes dead code for the manual print path and can be removed or guarded to only fire for the Collect Bill override path.
