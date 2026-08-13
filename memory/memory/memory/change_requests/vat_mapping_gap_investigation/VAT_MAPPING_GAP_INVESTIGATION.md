# VAT Mapping Gap Investigation

> SCOPE: Investigation only. No code changed. No backend touched.
> SOURCE OF TRUTH: current code in `/app/frontend` (branch `main`).
> Investigated generically — covers all VAT-enabled items, not one example.

---

## 1. Summary

VAT data **IS preserved end-to-end through Product API → cart → place-order payload → backend → order load-back**. The mapping is correct everywhere up to the dashboard cart.

The break is **entirely on the cashier's "Collect Payment" screen**. `CollectPaymentPanel.jsx` was written as a GST-only calculator: it computes per-item tax for VAT items but **silently discards it** because the accumulator only has SGST/CGST buckets (no VAT bucket). As a consequence:

- Bill Summary rows on the cashier screen do not show any VAT line.
- `rawFinalTotal` (Grand Total the cashier sees and the customer pays) under-collects by the full VAT amount.
- The `BILL_PAYMENT` request sends order-level `vat_tax: 0` (even though per-item `vat_amount` is still correct on each `food_detail` row → backend gets an internally inconsistent payload).
- The Print Bill / order-temp-store path receives `vatTax: 0` as an override and prints `vat_tax: 0`.

For a 100% VAT-only order, the cashier collects only the pre-tax total and the printed bill / payload claims zero VAT was collected.

VAT items that arrive **only** through the place-order path (no collect-bill round-trip) are fine: `calcOrderTotals` in `orderTransform.js` (L585–L680) correctly splits `gstTax` and `vatTax` and folds both into `order_amount`.

---

## 2. Product API Tax Fields

### Endpoint / service
- Service: `frontend/src/api/services/productService.js` → `getProducts` / `getAllProducts` / `getPopularFood`.
- Endpoint constant: `API_ENDPOINTS.PRODUCTS` and `API_ENDPOINTS.POPULAR_FOOD` (declared in `frontend/src/api/constants.js`).
- Transform: `frontend/src/api/transforms/productTransform.js` → `fromAPI.product` (L54–L130).

### Tax fields received from API (raw) and how they map to the frontend product
Source: `productTransform.js` L70–L76:
```js
tax: {
  percentage:   parseFloat(api.tax)        || 0,
  type:         api.tax_type               || 'GST',
  calculation:  api.tax_calc               || TAX_CALC_TYPES.EXCLUSIVE,
  isInclusive:  api.tax_calc === TAX_CALC_TYPES.INCLUSIVE,
},
```

| Backend field | Frontend field | Notes |
|---|---|---|
| `tax`         | `tax.percentage` | numeric percentage (e.g. 5, 12, 18) |
| `tax_type`    | `tax.type`       | string — **`'GST'` or `'VAT'`** (default `'GST'` when missing) |
| `tax_calc`    | `tax.calculation` + `tax.isInclusive` | `'Inclusive'` / `'Exclusive'` |

### Coverage of the three tax cases at Product API stage
| Item | `tax.percentage` | `tax.type` |
|---|---|---|
| GST item | > 0 | `'GST'` |
| VAT item | > 0 | `'VAT'` |
| No-tax item | 0 | any (falls through because `percentage === 0` short-circuits all downstream calcs) |

### Verdict
**VAT is present and correctly preserved at the Product API → frontend product mapping.** No gap here.

Cross-checked: the same `tax_type` shape is echoed on the order detail (`food_details.tax_type`) and used by `fromAPI.orderItem` and the print-side calculator (`buildOrderTempStorePayload` at L1470–L1473).

---

## 3. Product-to-Cart Mapping

### Path A — fresh product added to cart from menu
`product.tax` (with `type` field) is the canonical shape used by every downstream calc in `orderTransform.js`. There is no second transform between "product object" and "cart item" for the in-memory cart — the cart simply carries `item.tax` from the product.

### Path B — order loaded back from backend (re-engage, hold, dashboard reopen)
File: `frontend/src/api/transforms/orderTransform.js`, `fromAPI.orderItem` L106–L148:
```js
tax: {
  percentage:  parseFloat(foodDetails.tax) || 0,
  type:        foodDetails.tax_type || 'GST',
  calculation: foodDetails.tax_calc || 'Exclusive',
  isInclusive: foodDetails.tax_calc === 'Inclusive',
},
```
The order item also carries `tax.type` and `tax.percentage` correctly.

### Modifier / addon / variation
`addOns` and `variation` are persisted on the item but they do **not** carry their own tax block. They contribute to `fullUnitPrice` and are taxed at the parent item's rate (`item.tax.percentage`, `item.tax.type`). This matches the place-order builder.

### Verdict
**No drop, no rename, no overwrite.** Cart items keep `tax.type === 'VAT'` for VAT items.

---

## 4. Cart-to-Order Payload Mapping

Files / functions inspected:
- `orderTransform.js` L389–L566 — `buildCartItem` (per-item payload row).
- `orderTransform.js` L585–L681 — `calcOrderTotals` (order-level aggregator).
- `orderTransform.js` L792 onwards — `toAPI.placeOrder`, `toAPI.updateOrder`, `toAPI.placeOrderWithPayment`.

### Per-item row (`buildCartItem`)
```js
const taxType = (item.tax?.type || 'GST').toUpperCase();
const isGst   = taxType === 'GST';
...
gst_amount: isRuntimeComp ? '0.00' : String((isGst ? taxAmount : 0).toFixed(2)),
vat_amount: isRuntimeComp ? '0.00' : String((!isGst ? taxAmount : 0).toFixed(2)),
```
For a VAT item: `gst_amount = '0.00'` and `vat_amount = <computed>`. **Correct.**

### Order-level aggregation (`calcOrderTotals`)
```js
let gstTax = 0;
let vatTax = 0;
cart.forEach(item => {
  ...
  gstTax += parseFloat(item.gst_amount) || 0;
  vatTax += parseFloat(item.vat_amount) || 0;
});
...
return {
  ...
  tax_amount: totalTax,                // gstTax + vatTax
  gst_tax:    Math.round(gstTax * 100) / 100,
  vat_tax:    Math.round(vatTax * 100) / 100,
  order_amount: orderAmount,           // postDiscount + SC + tip + delivery + totalTax → rounded
  ...
};
```
**VAT is properly aggregated and folded into `order_amount`.** Place-order, place-order-with-payment, and update-place-order all spread `...totals` into their payloads (`orderTransform.js` L1072 for `placeOrderWithPayment`, similar in `placeOrder` and `updateOrder`).

### Verdict
**Order placement / update payloads correctly include VAT.** No gap at this layer.

---

## 5. Backend Order Detail / Billing Data

After place-order or hold, the order is loaded back via `getRunningOrders` / `getSingleOrderNew` and transformed by `fromAPI.order` + `fromAPI.orderItem`.

- `fromAPI.orderItem` (L106–L148) restores `item.tax.type` from `foodDetails.tax_type`. ✅
- The order-level financials are echoed by the backend in fields like `sub_total`, `tax_amount`, `gst_tax`, `vat_tax`, `order_amount` (consumed elsewhere in `fromAPI.order`).

### Verdict
**VAT survives the backend round-trip — both at order-level totals and per-item `food_details.tax_type`.** The frontend has everything it needs to recompute or trust VAT after loading an order back.

---

## 6. Bill Summary Calculation

This is where the gap lives.

File: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`.

### 6.1 `taxTotals` memo (L204–L226) — VAT silently discarded
```js
const taxTotals = useMemo(() => {
  let sgst = 0, cgst = 0;                               // ← NO `vat` bucket
  billableItems.forEach(item => {
    const tax = item.tax;
    if (!tax || tax.percentage === 0) return;
    const linePrice = getItemLinePrice(item);
    let taxAmt;
    if (tax.isInclusive) {
      taxAmt = linePrice - (linePrice / (1 + tax.percentage / 100));
    } else {
      taxAmt = linePrice * (tax.percentage / 100);
    }
    // Split into SGST + CGST for GST type (India dine-in)
    if ((tax.type || 'GST').toUpperCase() === 'GST') {  // ← `else` is missing
      sgst += taxAmt / 2;
      cgst += taxAmt / 2;
    }
    // VAT branch: taxAmt is computed BUT NEVER STORED ANYWHERE
  });
  return {
    sgst: Math.round(sgst * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    // ← no `vat` key returned
  };
}, [billableItems]);
```
For a VAT item the `taxAmt` is calculated then thrown away. The returned object does not even have a `vat` key.

### 6.2 `rawFinalTotal` (L451) — VAT excluded from Grand Total
```js
const rawFinalTotal = Math.round((subtotal + sgst + cgst) * 100) / 100;
```
`sgst` and `cgst` are derived purely from `taxTotals` (which is GST-only). VAT is **not** added. The cashier-visible Grand Total under-collects by the VAT amount.

### 6.3 Bill summary UI rows (L1586–L1605)
Only `bill-tax-cgst-items` and `bill-tax-sgst-items` rows are rendered, gated by `taxTotals.sgst > 0 || taxTotals.cgst > 0`. **No VAT row exists in the UI at all.**

### 6.4 Self-acknowledgment in the code
The comment at L631 reads literally:
```js
vatTax: 0,   // VAT not aggregated in UI
```
i.e. the gap is known and currently inert.

### Verdict
**Bill summary calculator ignores VAT.** Confirmed by code structure + explicit comment.

---

## 7. Collect Payment Payload

File: `frontend/src/components/order-entry/CollectPaymentPanel.jsx` L549–L598 (build of `paymentData`) and `frontend/src/api/transforms/orderTransform.js` L1130–L1330+ (`toAPI.collectBillExisting`).

### What `CollectPaymentPanel` sends to the payload builder
```js
const paymentData = {
  method:          paymentMethod,
  finalTotal:      effectiveTotal,    // ← derived from rawFinalTotal → excludes VAT
  ...
  sgst,
  cgst,
  vatAmount:       0,                  // ← HARDCODED 0
  ...
  printGstTax:    Math.round((sgst + cgst) * 100) / 100,
  printVatTax:    0,                   // ← HARDCODED 0
  ...
};
```

### What `collectBillExisting` does with that
`orderTransform.js` L1130–L1330+:
- Destructures `vatAmount = 0` from `paymentData`.
- Per-`food_detail` row (L1188–L1215) still discriminates correctly:
  ```js
  const taxType = (item.tax?.type || 'GST').toUpperCase();
  const isGst   = taxType === 'GST';
  gst_amount: isRuntimeComp ? '0.00' : String((isGst ? taxAmount : 0).toFixed(2)),
  vat_amount: isRuntimeComp ? '0.00' : String((!isGst ? taxAmount : 0).toFixed(2)),
  ```
  → per-line `vat_amount` is **correct**.
- Order-level totals (L1245–L1258):
  ```js
  total_gst_tax_amount:  gstTax,           // gstTax = sgst + cgst (UI-supplied)
  gst_tax:               gstTax,
  vat_tax:               vatAmount || 0,   // ← 0 from CollectPaymentPanel
  grant_amount:          finalTotal || 0,  // ← under-collected for VAT
  payment_amount:        finalTotal || 0,  // ← under-collected for VAT
  ```

### Net effect on the wire payload
| Field | What backend receives for a VAT-only order |
|---|---|
| `food_detail[i].gst_amount` | `"0.00"` (correct) |
| `food_detail[i].vat_amount` | `"<correct VAT amount>"` (correct) |
| `gst_tax` (order-level) | `0` (correct) |
| `total_gst_tax_amount` | `0` (correct) |
| `vat_tax` (order-level) | **`0`** ← **WRONG** (should be sum of per-line `vat_amount`) |
| `grant_amount` | **subtotal without VAT** ← **WRONG** |
| `payment_amount` | **subtotal without VAT** ← **WRONG** (cashier collects less than owed) |

**The payload is internally inconsistent**: per-line `vat_amount` rows non-zero but the order-level `vat_tax` claims 0. Backend reconciliation can either trust the per-line sum (then `payment_amount` is short), or trust `vat_tax = 0` (then per-line VAT is dropped). Either way the bill is mis-recorded.

### Verdict
**Collect payment payload sends `vat_tax: 0` and an under-VAT `payment_amount`.** Core gap (I) + a consequence of (H).

---

## 8. Print / Split Bill Impact

### Print Bill (order-temp-store fallback)
Function: `buildOrderTempStorePayload` (referenced via `orderTempStore` in `orderTransform.js` around L1400–L1700). It has TWO paths:

1. **Default path (no override)** — L1442–L1473:
   ```js
   const taxType = (item.food_details?.tax_type || 'GST').toUpperCase();
   if (taxType === 'VAT') vat_tax += taxAmt;
   else gst_tax += taxAmt;
   ```
   This correctly aggregates VAT. So a dashboard "print" icon that doesn't go through `CollectPaymentPanel` (e.g. straight reprint from card) prints VAT correctly.

2. **Override path** — L1582–L1583, L1693:
   ```js
   const finalGstTax = overrides.gstTax !== undefined ? overrides.gstTax : gst_tax;
   const finalVatTax = overrides.vatTax !== undefined ? overrides.vatTax : vat_tax;
   ...
   vat_tax: finalVatTax,
   ```
   When `CollectPaymentPanel.handlePrintBill` (L614–L640) builds the override, it sends `vatTax: 0`. So **the manual Print Bill from the Collect Payment screen prints VAT as 0**.

### Split Bill
Triggered from `CollectPaymentPanel` (`onOpenSplitBill`, L275 reference). Splits use the same `effectiveTotal` / `rawFinalTotal` — which under-collects VAT. Per-split share is computed off the under-collected grand total → split bills also under-collect.

### Held / On-Hold collect
`CollectBillPanelDrawer.jsx` renders the same `CollectPaymentPanel` (verified earlier in `ON_HOLD_PAYMENT_BRANCH_VALIDATION.md`). So **Hold-tab Collect Bill has the identical VAT gap**.

### Verdict
**VAT gap is global across every flow that goes through `CollectPaymentPanel`.** Affected: Bill summary display, Grand Total, Collect Payment payload, Manual Print Bill from Collect Payment screen, Split Bill, Hold-tab Collect Bill, Transfer to Room. **Not affected**: place-order / update-order / place-order-with-payment payloads (those use `calcOrderTotals` which handles VAT correctly), and pure dashboard "reprint" that doesn't pass through `CollectPaymentPanel`.

---

## 9. GST vs VAT vs No-Tax Current Behavior

| Item type | Product API | Cart item | Place-order payload | Backend echo | Bill summary UI | Grand Total | BILL_PAYMENT payload | Print Bill (manual) | Reprint (dashboard) |
|---|---|---|---|---|---|---|---|---|---|
| **GST**     | `tax_type='GST'`, `tax>0` | preserved | `gst_amount` per line + `gst_tax` order-level | preserved | CGST/SGST rows visible | includes GST | `gst_tax` correct, `gst_amount` per line correct | correct | correct |
| **VAT**     | `tax_type='VAT'`, `tax>0` | preserved | `vat_amount` per line + `vat_tax` order-level | preserved | **no VAT row rendered** | **excludes VAT** | per-line `vat_amount` correct **but order-level `vat_tax = 0`**; `payment_amount` short | **`vat_tax = 0` in printed bill** | correct (no override) |
| **No-tax**  | `tax_type` any, `tax=0` | preserved (`percentage=0`) | `gst_amount = '0.00'`, `vat_amount = '0.00'` | preserved | no tax row | only subtotal/SC/tip/delivery | `gst_tax = 0`, `vat_tax = 0`, `payment_amount` correct | correct | correct |

Conclusion: The frontend silently treats VAT items as **"taxed for backend persistence per-line but zero-tax for cashier display, collection, and payment payload"**. The two views are inconsistent for VAT only.

---

## 10. Root Cause

Per the classification grid (A–L):

| Code | Result | Evidence |
|---|---|---|
| **A** Product API does not provide VAT fields | NO | `productTransform.js` L70–L76 reads `api.tax_type`. |
| **B** Product API provides VAT but frontend mapper drops it | NO | `productTransform.js` L73 preserves `tax.type`. |
| **C** Cart state drops VAT | NO | `fromAPI.orderItem` L113–L118 preserves `tax.type`. |
| **D** Order placement payload drops VAT | NO | `calcOrderTotals` L596–L670 returns `vat_tax`; `buildCartItem` L550–L551 emits `vat_amount`. |
| **E** Backend does not save VAT | UNCLEAR FROM CURRENT CODE | Backend code not in scope. |
| **F** Backend saves VAT but does not return it | UNCLEAR FROM CURRENT CODE | But `fromAPI.orderItem` reads `food_details.tax_type` which suggests backend does echo it. |
| **G** Frontend order-detail mapper drops VAT | NO | `fromAPI.orderItem` preserves `tax.type`. |
| **H** **Bill summary calculator ignores VAT** | **YES** | `CollectPaymentPanel.taxTotals` L204–L226: no VAT bucket, no VAT key returned; `rawFinalTotal` L451 does not add VAT; bill summary UI L1586–L1605 only renders CGST/SGST rows. |
| **I** **Collect payment payload ignores VAT** | **YES** | `CollectPaymentPanel.paymentData.vatAmount = 0` L561; `collectBillExisting` then writes `vat_tax: vatAmount || 0 = 0` at L1248; `payment_amount` is taken from `rawFinalTotal` which excluded VAT. |
| **J** **Print/split bill flow ignores VAT** | **YES** | `CollectPaymentPanel.handlePrintBill` L631 forces override `vatTax: 0`; `buildOrderTempStorePayload` L1583 honours override → printed bill shows `vat_tax = 0`. Split bill rides on the same `effectiveTotal`. |
| **K** Tax type detection treats VAT as no-tax/GST | PARTIAL | `taxTotals` L217 correctly detects `tax.type === 'GST'` but has no `else if 'VAT'` branch, so VAT items are computed-then-dropped rather than mis-classified. The downstream consumers see GST-only totals. |
| **L** Unclear from current code | NO | The code is unambiguous. |

### Primary root cause: **H + I + J + (partial K)** — all concentrated in `CollectPaymentPanel.jsx`.

The UI-side bill calculator was authored as a GST-only function (CGST + SGST halves). Every consumer of that calculator (Grand Total, BILL_PAYMENT payload, Print Bill override, Split Bill) therefore inherits the same gap. The per-line `vat_amount` math still works because `buildCartItem` / `collectBillExisting` build food rows from `item.tax.type` directly — but no other downstream UI/payload field consumes those per-line sums.

---

## 11. Recommended Fix Plan (NOT implemented)

> Owner-decision items are marked. The fix is structural — one file is responsible for nearly all the symptoms.

### 11.1 Extend `taxTotals` in `CollectPaymentPanel.jsx` to return a VAT bucket
Today returns `{ sgst, cgst }`. Change to `{ sgst, cgst, vat }` where:
- VAT items add their full `taxAmt` to `vat` (not split into SGST/CGST halves).
- GST items behave exactly as today.
- No-tax items still short-circuit on `percentage === 0`.

This is the single most important hunk. ≈ 5 lines.

### 11.2 Fold VAT into `rawFinalTotal` (L451)
```
rawFinalTotal = subtotal + sgst + cgst + vat
```
The `subtotal` term already excludes tax (BUG-281). Adding a `vat` term is symmetric with `sgst + cgst`. ≈ 1 line.

### 11.3 Compose `paymentData.vatAmount` and `paymentData.printVatTax` from the new `vat` bucket (L561, L591, L631)
Replace the hardcoded `0`s with the rounded VAT value. ≈ 3 line edits.

### 11.4 (Owner-decision) — Render a "VAT" row in the bill summary UI
Mirror the existing CGST/SGST conditional block (L1586–L1605). Visibility gated by `taxTotals.vat > 0`. Adds clarity for cashier and customer. ≈ 8 lines.

### 11.5 (Owner-decision) — VAT and Service Charge / Tip / Delivery interaction
Today, `CollectPaymentPanel.scGst / tipGst / deliveryGst` (L412–L418) are applied at the SC GST / Delivery GST profile rates and folded into GST. The current memo `_cr013ComponentSum` (L427) and `gstTax` aggregator only sums to GST. **Question:** when the items are VAT-region (UAE/etc.), should SC/Tip/Delivery also be taxed at a VAT rate? The profile only has `service_charge_tax` / `deliver_charge_gst` rate fields. Until backend confirms, the safest scope is to compute item-level VAT only and treat SC/Tip/Delivery GST as GST regardless of region. Flag this as **owner-decision**.

### 11.6 (Optional) — Cross-validation log in dev mode
Log a `console.warn` when `sum(food_detail.vat_amount) !== order-level vat_tax` so any future driftis caught immediately. ≈ 4 lines, dev-only.

### Strict guard-rails for the fix (must hold)
- Touch only `CollectPaymentPanel.jsx`. Do not modify `orderTransform.js` per-line builders (`buildCartItem`, `collectBillExisting` food_detail row), which already handle VAT correctly.
- Do not modify the place-order / update-order payload builders.
- Do not modify any backend code, endpoint URL, or persisted field names.
- Do not change the GST math for GST-only orders (regression risk).
- Do not introduce a new tax row for SC/Tip/Delivery on VAT until owner confirms business rules.

---

## 12. Risk Assessment

### Risks if NOT fixed (current state)
- **Customer is under-charged on every VAT order.** Cashier collects subtotal + SC + tip + delivery only; the entire VAT amount is uncollected.
- **Books are inconsistent.** Per-line `vat_amount` shows real VAT but order-level `vat_tax = 0` and `payment_amount = pre-VAT`. Reporting / GSTR-style summaries will not reconcile.
- **Printed bill misrepresents tax collection.** Print shows `vat_tax: 0` even when VAT items are present.
- **Split bill compounds the error.** Each split share is computed off the under-collected grand total → all splits short.
- **Hold-tab Collect Bill (CR-003)** inherits the same gap → PayLater orders settled on this surface under-collect VAT identically.
- **Audit Report → Hold tab** rows will show different totals than the originally-placed order amounts (place-order payload had correct `vat_tax`, settle payload has 0).

### Risks of fixing
- **Regression risk for GST-only orders.** If `taxTotals` change inadvertently double-counts GST or alters CGST/SGST halving, every order regresses. Mitigation: keep the `if (GST)` branch byte-identical; add a parallel `else if (VAT)` branch.
- **Service-charge / tip / delivery × VAT interaction.** Unknown rules; ship without changing SC/Tip/Delivery GST behaviour (Owner-decision §11.5).
- **Inclusive-VAT items.** The current per-item formula `linePrice - linePrice/(1+pct/100)` already handles inclusive. Verify on a VAT-inclusive test item that subtotal display is consistent (Test §13 case 4b).
- **Mixed GST + VAT order.** Bill summary should show both CGST/SGST rows AND a VAT row (or a combined "Tax" row, owner-decision). The `effectiveTotal` arithmetic naturally accommodates a sum, but UI design should be confirmed.
- **Backend tolerance.** Today backend receives `vat_tax = 0` for VAT orders. After fix it will receive a real value. If a downstream backend rule was working around the frontend bug (e.g. recomputing VAT itself when the field is 0), removing the 0 may flip behaviour. Cross-check with backend owner.
- **Print template alignment.** If the print template was authored to omit a VAT row when `vat_tax = 0`, a real value will now show — desired, but worth verifying the print engine handles it.

---

## 13. QA Checklist for Future Fix

### Item-level
1. GST-only item (single line, qty 1).
2. GST-only item with addons + variations (qty > 1).
3. GST-only inclusive-tax item.
4. VAT-only item (single line, qty 1).
   - 4a. VAT exclusive.
   - 4b. VAT inclusive.
5. VAT-only item with addons + variations (qty > 1).
6. No-tax item (`tax = 0`).
7. Runtime-complimentary VAT item — verify per-line `vat_amount = '0.00'` and order-level `vat_tax` does not include it (BUG-018 Part 2 alignment).
8. Catalog-complimentary VAT item — same expectation.

### Order-level
9. Mixed GST + VAT order — bill summary shows both CGST/SGST AND VAT rows (or owner-approved layout).
10. Mixed GST + VAT + no-tax order.
11. VAT order with manual discount (flat).
12. VAT order with percent discount.
13. VAT order with loyalty + wallet redemption.
14. VAT order with coupon discount.
15. VAT order with tip > 0.
16. VAT order with delivery_charge > 0.
17. VAT order with service charge ON (verify SC GST behaviour per owner-decision §11.5).
18. VAT order with service charge OFF.
19. Round-off applied to a VAT order — final `payment_amount` rounds per BUG-009 fractional rule.

### Flow coverage
20. Place-order payload (dashboard `Place Order` button) — `vat_tax` non-zero, `order_amount` includes VAT.
21. Update-order payload (additional items added to existing order).
22. Place-order-with-payment payload — same.
23. Collect-payment (dashboard "Collect Bill" → BILL_PAYMENT) for a running VAT order — `vat_tax` non-zero in payload, `payment_amount` includes VAT.
24. Hold-tab Collect-Bill (Audit Report → Hold → Collect drawer) for a PayLater VAT order — same.
25. Manual Print Bill from CollectPaymentPanel — printed `vat_tax` matches.
26. Reprint from dashboard card (no override path) — already correct, regression check.
27. Split Bill of a VAT order — each share's `payment_amount` proportional to the corrected grand total.
28. Transfer to Room of a VAT order.

### Negative
29. Verify GST-only orders produce byte-identical payloads to pre-fix (regression).
30. Verify no-tax orders produce byte-identical payloads to pre-fix (regression).
31. Verify cashier cannot accept a `payment_amount` that excludes VAT after fix (under-cash guard still works).

---

## 14. Open Questions

1. **Exact VAT field name backend expects.** Frontend writes `vat_tax` and per-line `vat_amount`. Confirm backend reads the same keys for VAT regions (UAE / Africa restaurants).
2. **VAT-inclusive vs VAT-exclusive convention.** Frontend supports both via `tax_calc === 'Inclusive'`. Confirm the displayed Subtotal for an inclusive-VAT item: should it show pre-tax (today's behaviour) or post-tax sticker price?
3. **Should VAT show as a separate row** ("VAT" / "VAT 5%") **or as a single composite "Tax" row** when an order has only VAT items? Owner-decision.
4. **Does VAT contribute to a generic `total_tax_amount`** field, or must it stay separate from `total_gst_tax_amount`? Backend / report-side question.
5. **Service Charge on VAT items** — does the restaurant profile's `service_charge_tax` rate apply on VAT-region orders too, or is SC GST/SC-VAT differentiation needed?
6. **Tip on VAT items** — Tip currently rides SC tax rate. Same VAT-region question.
7. **Delivery on VAT items** — `deliver_charge_gst` rate. Same.
8. **GST + VAT coexisting on a single item** — current code structure (one `tax.type` per item) does not allow it. Confirm business never does this.
9. **Backend or frontend is source of truth** for the final tax amount on a settle? The current contract sends both per-line `vat_amount` and order-level `vat_tax`. If they disagree, which wins? (Today they always disagree for VAT.)
10. **Print template** — is the printed bill template owner-side configurable to render a VAT row, or hard-coded? If hard-coded, a template change is needed once the payload starts carrying real VAT.

---

## 15. Learning Summary

- **VAT appears at the very start of the data flow**, in the Product API response (`tax_type` field). The frontend product transform preserves it as `tax.type === 'VAT'`.
- **VAT survives all the way into the place-order/update-order payloads.** `buildCartItem` correctly writes per-line `vat_amount`, and `calcOrderTotals` correctly aggregates `vat_tax`. Backend receives a correct, fully VAT-aware payload at the point of order creation.
- **VAT survives the backend round-trip.** When the order is loaded back, `fromAPI.orderItem` re-hydrates `item.tax.type` from `food_details.tax_type`.
- **VAT is lost at the cashier "Collect Payment" screen.** `CollectPaymentPanel.taxTotals` (L204–L226) is GST-only — no VAT accumulator. Every downstream consumer (Grand Total, BILL_PAYMENT, Print Bill override, Split Bill, Hold-tab Collect) inherits the gap.
- **Files / functions involved:**
  - GAP IS HERE → `frontend/src/components/order-entry/CollectPaymentPanel.jsx` — `taxTotals` memo, `rawFinalTotal`, `paymentData` (vatAmount, printVatTax), `handlePrintBill` override.
  - These already handle VAT correctly: `frontend/src/api/transforms/productTransform.js` (`fromAPI.product`), `frontend/src/api/transforms/orderTransform.js` (`buildCartItem`, `calcOrderTotals`, `fromAPI.orderItem`, food_detail row in `collectBillExisting`, default-path `vat_tax` aggregation in the print/temp-store builder).
- **Flows impacted:** Bill summary display, Grand Total, BILL_PAYMENT payload (dashboard + Hold-tab), Manual Print Bill from CollectPaymentPanel, Split Bill, Transfer to Room. **Not impacted:** place-order / update-order payloads, dashboard reprint without override.
- **What needs approval before implementation:**
  1. Whether to add a separate "VAT" UI row or fold into a single tax row.
  2. Whether SC / Tip / Delivery should be taxed at a VAT rate for VAT-region restaurants.
  3. Whether backend currently tolerates a non-zero `vat_tax` on the BILL_PAYMENT request (it should, given the place-order payload already sends one — but confirm because backend may have a defensive override).
  4. Confirmation that there is no Owner-locked contract preventing modification of `CollectPaymentPanel.taxTotals` (no header lock-comment was found in this file — verify).

— End of report.
