# BUG-168 — Exact Changes Required (Backend fields now available)

**Date:** 2026-07-08
**Context:** Backend has added `order_sub_total_amount` and `order_sub_total_without_tax` to `employee-orders-list`. Now ALL three data sources (socket, list API, single-order API) provide correct financial fields. FE computation must be removed.

---

## CHANGE 1: `useOrderPollingReconciliation.js` — NO CODE CHANGE NEEDED

**File:** `frontend/src/hooks/useOrderPollingReconciliation.js`
**Line:** 68

```js
(Number(o.subtotalAmount) || 0).toFixed(2),
```

**Status:** ✅ Self-resolves. Now that `employee-orders-list` returns `order_sub_total_amount`, both socket and list API will have `subtotalAmount = 219`. Fingerprints match → no destructive overwrite.

**No change required.**

---

## CHANGE 2: `fromAPI.order` mapping — NO CODE CHANGE NEEDED

**File:** `frontend/src/api/transforms/orderTransform.js`
**Lines:** 220-222

```js
subtotalBeforeTax: parseFloat(api.order_sub_total_without_tax) || 0,
subtotalAmount: parseFloat(api.order_sub_total_amount) || 0,
serviceTax: parseFloat(api.total_service_tax_amount) || 0,
```

**Status:** ✅ Already correctly maps the backend fields. Now that the list API returns them, `order.subtotalAmount` and `order.subtotalBeforeTax` will be populated correctly in context.

**No change required.**

---

## CHANGE 3: `buildBillPrintPayload` — `finalOrderItemTotal` (L1938-1940)

**File:** `frontend/src/api/transforms/orderTransform.js`
**Lines:** 1938-1940

**CURRENT (wrong fallback):**
```js
const finalOrderItemTotal = overrides.orderItemTotal !== undefined
    ? overrides.orderItemTotal
    : (order.subtotalAmount || computedSubtotal || 0);
```

**SHOULD BE:**
```js
const finalOrderItemTotal = overrides.orderItemTotal !== undefined
    ? overrides.orderItemTotal
    : order.subtotalAmount;
```

**Why:** `computedSubtotal` fallback is no longer needed. `order.subtotalAmount` is always populated from backend (socket/list API/single-order API all provide it now). If it's 0, it genuinely means 0 — not "field missing."

---

## CHANGE 4: `buildBillPrintPayload` — `finalOrderSubtotal` (L1946-1960)

**File:** `frontend/src/api/transforms/orderTransform.js`
**Lines:** 1946-1960

**CURRENT (wrong computation + double-counts SC):**
```js
const finalOrderSubtotal = overrides.orderSubtotal !== undefined
    ? overrides.orderSubtotal
    : (() => {
        const itemBase = order.subtotalBeforeTax || order.subtotalAmount || computedSubtotal || 0;
        const tipAmt = overrides.tip !== undefined ? overrides.tip : (parseFloat(order.tipAmount) || 0);
        const delAmt = ...;
        return Math.round((itemBase + serviceChargeAmount + tipAmt + delAmt) * 100) / 100;
    })();
```

**SHOULD BE:**
```js
const finalOrderSubtotal = overrides.orderSubtotal !== undefined
    ? overrides.orderSubtotal
    : order.subtotalBeforeTax;
```

**Why:** `order.subtotalBeforeTax` (= `order_sub_total_without_tax = 240.9`) already includes items + SC + tip + delivery (everything before tax). No need to recompute. The current code double-counts SC because `subtotalBeforeTax` already contains it, then adds `serviceChargeAmount` again.

---

## CHANGE 5: `buildBillPrintPayload` — `serviceChargeAmount` (L1881-1887)

**File:** `frontend/src/api/transforms/orderTransform.js`
**Lines:** 1881-1887

**CURRENT (recomputes from FE-computed postDiscountSubtotal):**
```js
const serviceChargeAmount = overrides.serviceChargeAmount !== undefined
    ? overrides.serviceChargeAmount
    : (scApplicable
        ? (serviceChargePercentage > 0
            ? Math.round(postDiscountSubtotal * serviceChargePercentage / 100 * 100) / 100
            : (order.serviceTax || 0))
        : 0);
```

**SHOULD BE:**
```js
const serviceChargeAmount = overrides.serviceChargeAmount !== undefined
    ? overrides.serviceChargeAmount
    : (order.serviceTax || 0);
```

**Why:** Backend provides `total_service_tax_amount` (mapped to `order.serviceTax`). Just use it directly. No need to recompute from percentage × subtotal. The SC-applicability check is also unnecessary — if backend says SC is 0 for takeaway/delivery, `order.serviceTax` will be 0.

---

## CHANGE 6: `buildBillPrintPayload` — `finalGstTax` / `finalVatTax` (L1964-1965)

**File:** `frontend/src/api/transforms/orderTransform.js`
**Lines:** 1964-1965

**CURRENT:**
```js
const finalGstTax = overrides.gstTax !== undefined ? overrides.gstTax : gst_tax;
const finalVatTax = overrides.vatTax !== undefined ? overrides.vatTax : vat_tax;
```

Where `gst_tax` and `vat_tax` come from the FE computation loop (L1802-1843) + the GST recomputation (L1898-1907).

**SHOULD BE:**
```js
const finalGstTax = overrides.gstTax !== undefined
    ? overrides.gstTax
    : (() => {
        // Derive tax from backend values: order_amount - order_sub_total_without_tax
        // order_amount includes tax; order_sub_total_without_tax excludes tax
        const totalTax = (order.amount || 0) - (order.subtotalBeforeTax || 0);
        return Math.max(0, Math.round(totalTax * 100) / 100);
    })();
const finalVatTax = overrides.vatTax !== undefined ? overrides.vatTax : 0;
```

**NOTE:** This one needs owner input. The backend doesn't provide a separate `gst_tax` or `vat_tax` field on the order level. The tax can be derived as `order_amount - order_sub_total_without_tax` (= 250 - 240.9 = 9.1). But we don't know the GST vs VAT split without item-level data. Two options:
- **Option A:** Derive total tax = `order.amount - order.subtotalBeforeTax`, assign it all to the item's tax type (GST or VAT based on first item's `food_details.tax_type`)
- **Option B:** Keep the item-level tax loop (L1828-1843) ONLY for GST/VAT split — but use backend subtotal for everything else
- **Option C:** Ask backend to add `gst_tax_total` and `vat_tax_total` to the API

---

## CHANGE 7: Remove dead computation code (L1802-1907)

**File:** `frontend/src/api/transforms/orderTransform.js`

Once Changes 3-6 are applied, the following become dead code for the non-override (manual print) path:

| Lines | What | Status after changes |
|-------|------|---------------------|
| L1802-1844 | `computedSubtotal` loop | **Dead code** — no longer referenced by Changes 3, 4 |
| L1846-1863 | `overrideDiscount`, `postDiscountSubtotal` | **Dead code** — SC no longer uses postDiscountSubtotal (Change 5) |
| L1865-1887 | SC-applicability + SC recomputation | **Dead code** — replaced by direct `order.serviceTax` (Change 5) |
| L1898-1907 | GST recomputation with discount ratio | **Dead code** — replaced by backend-derived tax (Change 6) |

**However:** The `overrides.*` paths (Collect Bill flow) STILL use some of these. The computation code should be **kept but guarded** — only execute when overrides are present (Collect Bill path), never for the manual print path.

**Recommended approach:**
```js
// Only compute locally when Collect Bill sends overrides
const hasFinancialOverrides = overrides.orderItemTotal !== undefined;

if (hasFinancialOverrides) {
    // EXISTING Collect Bill path — keep as-is
    // ... L1802-1907 computation code ...
} else {
    // Manual print path — pure backend passthrough
    // No computation needed
}
```

---

## SUMMARY OF ALL CHANGES

| # | File | Lines | Change | Risk |
|---|------|-------|--------|------|
| 1 | useOrderPollingReconciliation.js | L68 | **No change** — self-resolves | — |
| 2 | orderTransform.js (fromAPI.order) | L220-222 | **No change** — already maps correctly | — |
| 3 | orderTransform.js (buildBillPrintPayload) | L1938-1940 | Remove `computedSubtotal` fallback | LOW |
| 4 | orderTransform.js (buildBillPrintPayload) | L1946-1960 | Replace recomputation with `order.subtotalBeforeTax` | LOW |
| 5 | orderTransform.js (buildBillPrintPayload) | L1881-1887 | Replace SC recomputation with `order.serviceTax` | LOW |
| 6 | orderTransform.js (buildBillPrintPayload) | L1964-1965 | Derive tax from backend values (needs owner input on GST/VAT split) | MEDIUM |
| 7 | orderTransform.js (buildBillPrintPayload) | L1802-1907 | Guard computation behind `hasFinancialOverrides` check | MEDIUM |

**Total files changing:** 1 (`orderTransform.js`)
**Total lines affected:** ~100 lines (L1802-1907 guarded, L1938-1965 simplified)
**Collect Bill path:** Untouched — overrides still flow through existing code
**Manual print path:** Simplified to pure backend passthrough

---

## OWNER DECISION NEEDED

**Tax split (Change 6):** Backend provides `order_amount` and `order_sub_total_without_tax` but NOT separate GST/VAT totals. How should we handle the tax line on the print?

- **A:** Derive total tax = `order_amount - subtotalBeforeTax`, assign based on predominant tax type
- **B:** Keep item-level tax loop only for GST/VAT split
- **C:** Ask backend to add `gst_tax_total` / `vat_tax_total` fields
