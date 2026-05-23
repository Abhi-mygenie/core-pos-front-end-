# Investigation Report — `order_sub_total_amount` and `order_sub_total_without_tax`

> Scope: investigation only — no code changes. All findings sourced from the codebase, not assumed.

---

## 1. Summary Verdict

- **Both keys are currently mapped to the SAME source value in every outbound payload that emits them.**
- There are **only two writer sites in the entire frontend** where these two keys are populated, and at both sites they receive identical values.
- This is a **frontend mapping issue**, not a backend issue: the inbound (response) transform maps the same two keys into **two different** frontend variables (`subtotalBeforeTax` vs `subtotalAmount`) and consumers downstream branch on them as if they were distinct concepts (see §4, `buildBillPrintPayload:1552`). The backend contract therefore treats them as semantically different, but the frontend outbound builder collapses them to one value.
- Affected outbound flows: **Place Order (postpaid), Place Order + Payment (prepaid), Update/Edit Order, Collect Bill (order-bill-payment / settlement).**
- Unaffected flows: **Bill-print / order-temp-store** (uses different keys: `order_item_total` + `order_subtotal`), **Transfer-to-Room** (these keys are not emitted), **Cancel / Status / Add-custom-item** (not financial flows).
- The two keys are NOT the same as the UI "Subtotal" line. They both currently equal the UI **"Item Total"** line in every flow.

Verdict: **Not mapped correctly relative to their distinct semantic appearance in the inbound contract and downstream consumers — both keys carry the items-only pre-discount value at every emit site.**

---

## 2. Key Meaning Found in Code

| Payload Key | Meaning Found in Code | Source Variable | Formula / Derivation | Notes |
|---|---|---|---|---|
| `order_sub_total_amount` | Items-only, pre-discount, pre-SC, pre-tip, pre-delivery, pre-tax line total (verbatim from inline comment `// items-only (pre-discount) — backend contract unchanged`). | `subtotal` (in `calcOrderTotals`) **and** `itemTotal` (in `collectBillExisting`) | `Σ ((item._fullUnitPrice ?? item.price) × quantity)` for non-complementary cart items, rounded to 2dp. Complementary lines (`is_complementary === 'Yes'`) are excluded. | Comment is the **only** in-code statement of intent. No equivalent comment exists for the second key. |
| `order_sub_total_without_tax` | No explicit comment. In code it receives the **same** value as `order_sub_total_amount`. Name suggests "subtotal excluding tax", but the value emitted is items-only and pre-discount/pre-SC/pre-tip (which is also pre-tax, so it is *technically* "without tax", but it is not the post-discount + SC + tip pre-tax subtotal that the UI shows). | Same as above (`subtotal` / `itemTotal`) | Same formula as `order_sub_total_amount`. | Inbound (`fromAPI.order`) maps this back to `subtotalBeforeTax`, a *different* frontend variable than `subtotalAmount` — indicating the backend response distinguishes them. |

Evidence:
- `src/api/transforms/orderTransform.js:657-659` (calcOrderTotals returns both keys = `subtotal`).
- `src/api/transforms/orderTransform.js:1229-1230` (collectBillExisting payload, both = `itemTotal`).
- `src/api/transforms/orderTransform.js:208-209` (inbound mapping splits them into two distinct frontend fields).

---

## 3. UI Mapping

| UI Label / Display Area | UI Variable / Calculation | Related Payload Key | Mapping Status |
|---|---|---|---|
| **"Item Total"** row (Bill Summary; CollectPaymentPanel.jsx:1190-1191, 1456-1458) | `itemTotal = billableItems.reduce((s, i) => s + getItemLinePrice(i), 0)` — pre-discount, pre-SC, pre-tip, pre-tax | `order_sub_total_amount` **and** `order_sub_total_without_tax` (both currently equal this) | Direct map — both keys equal Item Total. |
| **"Subtotal"** row (Bill Summary; CollectPaymentPanel.jsx:1561-1567) | `subtotal = Math.round((subtotalAfterDiscount + serviceCharge + tip) × 100) / 100` (BUG-281 semantic: pre-tax complete = items − discount + SC + tip) | **NEITHER backend key** | No mapping. The UI "Subtotal" is *not* sent under either of these two keys. It is only forwarded via `paymentData.subtotal` for the bill-print payload's `order_subtotal` (a different key). |
| **"Total Discount" / "Post-discount"** rows | `totalDiscount`, `subtotalAfterDiscount = max(0, itemTotal − totalDiscount)` | Neither key | Post-discount value is *not* what either payload key carries. |
| **"Grand Total" / "Payment Amount"** | `finalTotal = round(subtotal + sgst + cgst + deliveryCharge)` with BUG-009 round | `order_amount`, `payment_amount`, `grant_amount` | Different keys; out of scope. |
| **Tax / SC / Delivery / Tip rows** | individual variables | Different keys (`gst_tax`, `vat_tax`, `service_tax`, `service_gst_tax_amount`, `tip_amount`, `tip_tax_amount`, `delivery_charge`) | Out of scope. |

**Net:** Both investigated keys currently mirror the **Item Total** UI label, not the **Subtotal** UI label. There is no UI-level row that distinguishes `order_sub_total_amount` from `order_sub_total_without_tax`.

---

## 4. Code Trace

| File | Function / Area | Key Used | Current Mapping (RHS) | Endpoint / Consumer |
|---|---|---|---|---|
| `src/api/transforms/orderTransform.js:657` | `calcOrderTotals()` returned object | `order_sub_total_amount` | `subtotal` (items-only pre-discount, computed L596-612) | Spread (`...totals` / `...combinedTotals`) into `placeOrder` (L796/829), `placeOrderWithPayment` (L1001/1064), `updateOrder` (L917/942). |
| `src/api/transforms/orderTransform.js:659` | `calcOrderTotals()` returned object | `order_sub_total_without_tax` | `subtotal` (same variable as above) | Same three callers as above. |
| `src/api/transforms/orderTransform.js:1229` | `collectBillExisting()` payload (order-bill-payment / settlement) | `order_sub_total_amount` | `itemTotal \|\| 0` (passed in from CollectPaymentPanel) | `POST /api/v2/vendoremployee/order/order-bill-payment` (header comment L1118). |
| `src/api/transforms/orderTransform.js:1230` | `collectBillExisting()` payload | `order_sub_total_without_tax` | `itemTotal \|\| 0` (same variable) | Same endpoint as above. |
| `src/api/transforms/orderTransform.js:208` | `fromAPI.order()` (INBOUND) | `order_sub_total_without_tax` | → `subtotalBeforeTax` (frontend field) | Consumed by `OrderEntry.jsx` (rows 140, 308, 344, 406, 422, 2122), `CollectBillPanelDrawer.jsx:282`. |
| `src/api/transforms/orderTransform.js:209` | `fromAPI.order()` (INBOUND) | `order_sub_total_amount` | → `subtotalAmount` (frontend field) | Consumed by same callers (different field). Print fallback `buildBillPrintPayload` (L1543, L1552) uses `order.subtotalBeforeTax \|\| order.subtotalAmount \|\| computedSubtotal` — i.e., treats them as distinct, ordered fallbacks. |
| `src/api/transforms/reportTransform.js:411` | `subtotal` field in report row | `order_sub_total_amount` (read-only) | Backend echoed value, fallback chain `order.sub_total \|\| order.order_sub_total_amount` | Reports module. Read-only. |

Other emit sites: none. `transferToRoom` (L1293-1320), `buildBillPrintPayload` (L1345-1673), `cancelItem`, `cancelOrder`, `updateOrderStatus`, `addCustomItem`, `loginRequest`, customer/address builders — **none** of these include either key.

---

## 5. Flow Impact Matrix

| Flow | Is Key Present? | `order_sub_total_amount` Source | `order_sub_total_without_tax` Source | Same/Different Value? | Notes |
|---|---|---|---|---|---|
| **Dine-in place order** | Yes (both) | `calcOrderTotals.subtotal` (items-only, pre-discount) | `calcOrderTotals.subtotal` (same) | **Same** | `placeOrder` (L784). Spread via `...totals`. |
| **Dine-in update/edit order** | Yes (both) | `calcOrderTotals.subtotal` over **all** active items (placed + unplaced) | Same | **Same** | `updateOrder` (L888). Spread via `...combinedTotals`. |
| **Takeaway place order** | Yes (both) | Same as dine-in (`calcOrderTotals.subtotal`) | Same | **Same** | Same `placeOrder` function — `orderType` only changes SC applicability + delivery gate. Subtotal computation is `orderType`-agnostic. |
| **Takeaway update/edit order** | Yes (both) | Same as dine-in update | Same | **Same** | Same `updateOrder`. |
| **Delivery place order** | Yes (both) | `calcOrderTotals.subtotal` (delivery charge is NOT added to subtotal; it only feeds `order_amount`/`tax_amount`/`round_up`) | Same | **Same** | `placeOrder` with `deliveryCharge` extra. |
| **Delivery update/edit order** | Yes (both) | Same | Same | **Same** | `updateOrder` with `deliveryCharge` extra. |
| **Place order + payment (prepaid; any orderType)** | Yes (both) | `calcOrderTotals.subtotal` (over unplaced items; discount/tip/delivery passed as `extras` affect SC/GST/order_amount but **not** `subtotal`) | Same | **Same** | `placeOrderWithPayment` (L993). |
| **Room order** | Yes (both, treated identically to dine-in path) | Same `calcOrderTotals.subtotal` | Same | **Same** | No room-specific code path mutates these keys. `roomBalance` only affects `order_amount`/`payment_amount` (collect-bill, L1241). |
| **Payment / Settlement (postpaid → paid)** | Yes (both) | `itemTotal` (from CollectPaymentPanel, billable items only, pre-discount) | `itemTotal` (same) | **Same** | `collectBillExisting` (L1122) → order-bill-payment. |
| **Transfer to Room** | **Not present** | n/a | n/a | n/a | `transferToRoom` (L1293-1320) does not emit either key. |
| **Bill print / order-temp-store** | **Not present** | n/a | n/a | n/a | `buildBillPrintPayload` (L1345-1673) uses `order_item_total` (L1617) and `order_subtotal` (L1618) — different keys. Both keys appear only as *inputs* via `order.subtotalBeforeTax`/`order.subtotalAmount` for the fallback path (L1552). |
| **Cancel item / cancel order / status update** | Not present | n/a | n/a | n/a | Non-financial payloads. |

---

## 6. Payload Evidence

### 6a. `calcOrderTotals` — shared by Place / Place+Pay / Update

```js
// src/api/transforms/orderTransform.js:657-672
return {
  order_sub_total_amount:      subtotal,        // items-only (pre-discount) — backend contract unchanged
  order_sub_total_without_tax: subtotal,
  tax_amount:                  totalTax,
  gst_tax:                     Math.round(gstTax * 100) / 100,
  vat_tax:                     Math.round(vatTax * 100) / 100,
  order_amount:                orderAmount,
  round_up:                    String(roundUpAbs.toFixed(2)),
  service_tax:                 serviceCharge,
  service_gst_tax_amount:      Math.round(scGstAmt  * 100) / 100,
  tip_tax_amount:              Math.round(tipGstAmt * 100) / 100,
};
```

Where `subtotal` (L596-612):
```js
let subtotal = 0;
cart.forEach(item => {
  if (item.is_complementary === 'Yes') return;
  const lineTotal = (item._fullUnitPrice || item.price || 0) * (item.quantity || 1);
  subtotal += lineTotal;
  // ... gst/vat accumulators, NOT added to subtotal
});
subtotal = Math.round(subtotal * 100) / 100;
```

### 6b. `collectBillExisting` — order-bill-payment / settlement payload

```js
// src/api/transforms/orderTransform.js:1228-1234
// Financial totals
order_sub_total_amount:       itemTotal || 0,
order_sub_total_without_tax:  itemTotal || 0,
total_gst_tax_amount:         gstTax,
gst_tax:                      gstTax,
vat_tax:                      vatAmount || 0,
grant_amount:                 finalTotal || 0,
```

Where `itemTotal` (CollectPaymentPanel.jsx:347):
```js
const itemTotal = billableItems.reduce((sum, item) => sum + getItemLinePrice(item), 0);
```

### 6c. Inbound (response) mapping — `fromAPI.order`

```js
// src/api/transforms/orderTransform.js:208-209
subtotalBeforeTax: parseFloat(api.order_sub_total_without_tax) || 0,
subtotalAmount:    parseFloat(api.order_sub_total_amount)      || 0,
```

### 6d. Downstream consumer treating them as distinct (print fallback)

```js
// src/api/transforms/orderTransform.js:1543, 1552
const finalOrderItemTotal = overrides.orderItemTotal !== undefined
  ? overrides.orderItemTotal
  : (order.subtotalAmount || computedSubtotal || 0);
...
const itemBase = order.subtotalBeforeTax || order.subtotalAmount || computedSubtotal || 0;
```

This proves the print-payload builder treats `subtotalAmount` and `subtotalBeforeTax` as **two different, prioritised sources** — confirming the inbound contract distinguishes them. The outbound builders flattening both to the same value contradicts this distinction.

---

## 7. Cross-check Observations

1. **Single writer for placeOrder / updateOrder / placeOrderWithPayment**: All three share `calcOrderTotals`; you cannot have them diverge without touching that helper. Any fix would propagate uniformly to all three.
2. **CollectBill (`collectBillExisting`) is the one outlier writer**: It does *not* go through `calcOrderTotals`; the keys are hand-mapped at L1229-1230 from `itemTotal` passed in `paymentData`. A fix must therefore touch both `calcOrderTotals` and `collectBillExisting` (and the upstream `CollectPaymentPanel.jsx` if a post-discount or pre-tax complete value is desired for the "without tax" key).
3. **Comment on L658** (`// items-only (pre-discount) — backend contract unchanged`) implies prior intentional decision to keep `order_sub_total_amount` as items-only. No equivalent comment exists for `order_sub_total_without_tax`, so its current value appears to be an inherited duplicate rather than an explicit decision.
4. **Existing test asserts both-equal-by-design** (`src/__tests__/api/transforms/updateOrderPayload.test.js:250-258`): `should set order_sub_total_amount equal to order_amount (no discount)` — note this test asserts equality with `order_amount`, not between the two keys, and would only pass when items have no tax. This test does *not* lock the two investigated keys to the same value.
5. **`orderTransform.orderFrom.test.js:29-30`** seeds a fixture where the two API fields are intentionally different (`order_sub_total_without_tax: 200`, `order_sub_total_amount: 220`) — i.e. tests assume the backend can and does return distinct values, but no outbound test validates the *send* side keeps them distinct.
6. **No legacy vs current divergence found.** A single helper (`calcOrderTotals`) plus a single hand-mapped site (`collectBillExisting`) cover every outbound payload that carries these keys; there is no parallel legacy builder in the frontend code that would behave differently.

---

## 8. Answers To Core Questions (recap)

1. **Exact frontend meaning of `order_sub_total_amount`**: Items-only pre-discount, pre-SC, pre-tip, pre-delivery, pre-tax sum across non-complementary cart lines (per the L658 inline contract comment).
2. **Exact frontend meaning of `order_sub_total_without_tax`**: No explicit code-level definition. De facto same value as `order_sub_total_amount`. Inbound side maps it to a different frontend variable (`subtotalBeforeTax`), suggesting the backend treats it as a distinct concept.
3. **Where calculated**: `calcOrderTotals` (L585-673) and `CollectPaymentPanel.itemTotal` (L347).
4. **Variables mapped into these keys**: `subtotal` (in calcOrderTotals) and `itemTotal` (in collectBillExisting). Both reduce to the same algebraic value: `Σ (fullUnitPrice × qty)` over non-complementary items.
5. **Both receive same value?** Yes, at all four emit sites.
6. **Should they receive the same value?** Inconclusive from code alone. Inbound contract + print fallback (§6d) imply they are intended to be distinct. Outbound builders treat them as identical.
7. **UI labels**: Both keys map to **"Item Total"** UI row (CollectPaymentPanel L1191/L1458). Neither maps to the **"Subtotal"** UI row (L1565) — that row is `subtotalAfterDiscount + SC + tip` and is sent via a different payload key (`order_subtotal`) only on the bill-print payload.
8. **Effect of SC / Discount / Delivery / Packing / GST / VAT / Round-off / Tip on these keys**:
   - SC, Discount, Delivery, GST, VAT, Round-off, Tip → **NO effect** on either key. The subtotal is computed before any of these are applied (L596-612, L347).
   - Packing charge → not found as a separate concept in this codebase.
   - Complementary items → **excluded** from both keys (L605, L347 via `billableItems`).
9. **Consistency across flows**: Consistent within each writer (both keys always equal). Consistent across writers in *intent* (both = items-only pre-discount). Inconsistent with the *inbound* contract which splits them.
10. **Final value sent**:
    - In Place / Update / Place+Pay: `Math.round(Σ ((_fullUnitPrice || price) × qty) × 100) / 100` over non-complementary cart items.
    - In Collect Bill: `Σ getItemLinePrice(item)` over `billableItems` (non-complementary placed items).
    Both reduce to the same algebraic quantity — the "Item Total" displayed in the UI.

---

## 9. Out of Scope (Confirmed Untouched by These Two Keys)

- Bill print / `order-temp-store` payload — uses `order_item_total` + `order_subtotal` (different keys).
- Transfer-to-Room (`order-shifted-room`) — does not emit either key.
- Cancel / status / add-custom / customer / address / auth payloads — non-financial.
- `reportTransform.js` — reads `order_sub_total_amount` only (read path, not write path).

---

*End of report. No code modified. No documentation updated. No tests run.*
