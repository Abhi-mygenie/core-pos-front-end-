# Planning Report — Split `order_sub_total_amount` vs `order_sub_total_without_tax` on Outbound Payloads

> Scope: investigation re-verification + implementation **plan only**. No code change.
> Builds on: `/app/memory/INVESTIGATION_order_sub_total_keys.md`.

---

## 0. Re-verification of the Bill/Print Payload (claimed-correct path)

**Re-verified directly from code — bill/print payload is correct, no change needed.**

Evidence:
- `src/api/transforms/orderTransform.js:1617-1618` emits:
  ```js
  order_item_total: finalOrderItemTotal,
  order_subtotal:   finalOrderSubtotal,
  ```
- `finalOrderItemTotal` resolves to `overrides.orderItemTotal` (L1541-1543)
- `finalOrderSubtotal` resolves to `overrides.orderSubtotal` (L1549-1555)
- The caller (`CollectPaymentPanel.handlePrintBill`, L617-619) supplies:
  ```js
  orderItemTotal: itemTotal,                 // ← "Item Total" UI row
  orderSubtotal:  subtotal,                  // BUG-281: pre-tax complete
  ```
- `subtotal` is defined at L446 of the same file as `Math.round((subtotalAfterDiscount + serviceCharge + tip) * 100) / 100`.

Mapping confirmed:

| UI Row | Payload Key (bill/print) | Source | Matches Screenshot |
|---|---|---|---|
| Item Total ₹120 | `order_item_total` | `itemTotal` | ✓ |
| Subtotal ₹126 | `order_subtotal` | `subtotalAfterDiscount + SC + tip` (= 120 + 6 + 0) | ✓ |

Fallback path (no overrides — dashboard manual reprint) at L1549-1555 also computes `itemBase + serviceChargeAmount + tipAmt`, which is the same semantic. No gap.

**Bill/print path: leave untouched.**

---

## 1. Target Mapping (post-fix contract)

| UI Field | Order Payload Key | Bill/Print Payload Key | Required Semantic |
|---|---|---|---|
| **Item Total** | `order_sub_total_amount` | `order_item_total` (already correct) | Items-only sum: `Σ ((_fullUnitPrice ?? price) × qty)` over non-complementary lines; pre-discount, pre-SC, pre-tip, pre-delivery, pre-tax |
| **Subtotal** | `order_sub_total_without_tax` | `order_subtotal` (already correct) | Pre-tax complete: `max(0, items − discount) + serviceCharge + tip`. Excludes delivery, GST, VAT, round-off |

Existing `calcOrderTotals` already computes every term needed. No new arithmetic concept is introduced; only a reassignment.

---

## 2. Current State Recap (re-verified)

Outbound writer #1 — `calcOrderTotals` returns object (orderTransform.js:657-672, used by placeOrder / updateOrder / placeOrderWithPayment):

```js
order_sub_total_amount:      subtotal,        // items-only pre-discount
order_sub_total_without_tax: subtotal,        // <<<< SAME VALUE >>>>
```

Outbound writer #2 — `collectBillExisting` payload (orderTransform.js:1229-1230, used by `order-bill-payment` / settlement):

```js
order_sub_total_amount:       itemTotal || 0,
order_sub_total_without_tax:  itemTotal || 0,   // <<<< SAME VALUE >>>>
```

These are the only two outbound writers in the entire frontend. No other emit site exists (confirmed by repo-wide grep in prior investigation).

---

## 3. Implementation Plan

### 3.1 Writer #1 — `calcOrderTotals` (placeOrder / updateOrder / placeOrderWithPayment)

**File**: `src/api/transforms/orderTransform.js`
**Function**: `calcOrderTotals` (L585-673)

The helper already computes:
- `subtotal` (L612) — items-only pre-discount.
- `postDiscount = Math.max(0, subtotal − discountAmount)` (L613).
- `serviceCharge` on `postDiscount` (L616-618).
- `tipAmount` (taken from `extras`; defaults to 0).

A new local needs to be derived **inside the helper**, after `serviceCharge` is computed and before `return` (no change to ordering of any tax/SC/round-off math):

```js
// PROPOSED (not yet written) — pre-tax complete subtotal mirroring
// CollectPaymentPanel "Subtotal" (BUG-281 semantic).
const subtotalWithoutTax =
  Math.round((postDiscount + serviceCharge + tipAmount) * 100) / 100;
```

Then change the return so the two keys diverge:

```js
return {
  order_sub_total_amount:      subtotal,            // unchanged — Item Total semantic
  order_sub_total_without_tax: subtotalWithoutTax,  // <<<< NEW: Subtotal semantic
  // …rest unchanged…
};
```

**No other line in `calcOrderTotals` changes.** All other keys (`tax_amount`, `gst_tax`, `vat_tax`, `order_amount`, `round_up`, `service_tax`, `service_gst_tax_amount`, `tip_tax_amount`) keep their current formulas — this is purely a payload-shape adjustment.

**Caller-side impact**:
- `placeOrder` (L784) — calls `calcOrderTotals(items, scPct, { deliveryCharge })` for delivery-gated flows. `discountAmount`/`tipAmount` default to 0 in helper → `subtotalWithoutTax = subtotal + serviceCharge` (or `= subtotal` when SC=0). Matches user screenshot semantics for a postpaid place-order with SC applied.
- `updateOrder` (L888) — same as above.
- `placeOrderWithPayment` (L993) — already passes `discountAmount`, `tipAmount`, `deliveryCharge` → full Subtotal semantic carried through.

**Zero changes required at the three call sites**; the helper change propagates via the existing `...totals` / `...combinedTotals` spreads.

### 3.2 Writer #2 — `collectBillExisting` (order-bill-payment / settlement)

**File**: `src/api/transforms/orderTransform.js`
**Function**: `collectBillExisting` (L1122-1284)

`paymentData` already carries both values from `CollectPaymentPanel.handlePayment` (L578-595):
- `paymentData.itemTotal` → Item Total UI row
- `paymentData.subtotal` → Subtotal UI row (= `subtotalAfterDiscount + SC + tip`)

**Step A** — destructure `subtotal` from `paymentData` (the function currently destructures `itemTotal` but not `subtotal`):

```js
// PROPOSED (not yet written) — add `subtotal` to the destructure at L1124-1136.
const {
  method = 'cash', transactionId = '',
  splitPayments = [], tip = 0,
  finalTotal = 0, sgst = 0, cgst = 0, vatAmount = 0,
  itemTotal = 0, subtotal = 0,           // ← add `subtotal`
  serviceCharge = 0, deliveryCharge = 0,
  tabContact = null, discounts = {},
  roomBalance = 0,
  serviceGstTaxAmount = 0,
  tipTaxAmount = 0,
} = paymentData;
```

**Step B** — split the two keys at L1229-1230:

```js
// PROPOSED (not yet written) — diverge the two keys.
order_sub_total_amount:       itemTotal || 0,    // unchanged — Item Total
order_sub_total_without_tax:  subtotal  || 0,    // <<<< NEW: Subtotal
```

No other line in `collectBillExisting` changes. Upstream caller (`CollectPaymentPanel`) is already passing `subtotal` — no caller-side change required.

### 3.3 Files / Functions Touched (count)

| File | Function | Lines (approx.) | Change Nature |
|---|---|---|---|
| `src/api/transforms/orderTransform.js` | `calcOrderTotals` | L612-672 (helper body) | Add 1 local var; change RHS of 1 returned key |
| `src/api/transforms/orderTransform.js` | `collectBillExisting` | L1124-1136 (destructure) + L1229-1230 (payload) | Add 1 destructure entry; change RHS of 1 payload key |

**Total: 1 file, 2 functions, ≤ 6 net code lines.**

No changes required in: `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `orderService.js`, `buildBillPrintPayload`, `transferToRoom`, any UI component, any `.env`, or `package.json`.

### 3.4 What Stays Untouched (explicit guard-rail)

- All tax math (`gst_tax`, `vat_tax`, item GST proration, SC GST, tip GST, delivery GST under CR-013).
- All round-off math (`round_up`, BUG-009 ceil/floor rule).
- All discount/coupon/loyalty/wallet logic.
- All SC applicability gates (orderType, isRoom).
- All printer-agent / KOT logic.
- Bill print payload (`buildBillPrintPayload`).
- `transferToRoom` payload.
- Inbound `fromAPI.order` mapping (response-side).
- `reportTransform.js` (read path).

---

## 4. Verification Strategy (for the implementing agent — not run here)

### 4.1 Unit-test signals already in repo

| Test file | Current assertion | Expected behaviour after fix |
|---|---|---|
| `src/__tests__/api/transforms/updateOrderPayload.test.js:250-258` | `payload.order_sub_total_amount === payload.order_amount` (no discount) | Still passes only if items have 0% tax and no SC. Re-evaluate post-fix; this test was already loose. |
| `src/__tests__/api/transforms/orderTransformFinancials.test.js:90-110` | Inbound fields map to `subtotalBeforeTax` / `subtotalAmount` | Unaffected (response-side). |
| `src/__tests__/api/transforms/orderTransform.orderFrom.test.js:29-30` | Fixture has distinct values for the two API keys | Unaffected (response-side). |

No existing test pins outbound `order_sub_total_without_tax` to equal `order_sub_total_amount`, so the fix does not break a locked contract.

### 4.2 Manual / runtime probes the implementing agent should perform

Pick **one cart per flow** with: 1 item × ₹120, SC enabled @ 5%, no discount, no tip → expected `order_sub_total_amount=120`, `order_sub_total_without_tax=126` (mirrors the screenshot).

1. **Place Order (postpaid, dine-in)** — DevTools → Network → `place-order` payload → both keys distinct: 120 vs 126.
2. **Update/Edit Order** — `update-place-order` payload → both keys distinct.
3. **Place Order + Payment (prepaid)** — add discount ₹10 and tip ₹5 → expected `order_sub_total_amount=120`, `order_sub_total_without_tax = max(0,120−10) + 110×5% + 5 = 110 + 5.5 + 5 = 120.5` (rounded 2dp). Confirms post-discount + SC + tip semantic.
4. **Collect Bill (settlement)** — `order-bill-payment` payload → both keys distinct (= UI Item Total and UI Subtotal exactly).
5. **Takeaway / Delivery** — SC=0 (gated upstream). Both keys equal `subtotal`. ✓ Correct (degenerate case — no SC/tip/discount → both equal).
6. **Room order with associated transfers / room balance** — confirm room balance and associated totals still feed `order_amount` only, not subtotal keys (untouched behavior).

### 4.3 Regression sweep

- Bill print payload (`order_item_total` / `order_subtotal`) unchanged — same values as before, since `buildBillPrintPayload` is untouched.
- `order_amount`, `tax_amount`, `gst_tax`, `vat_tax`, `service_tax`, `round_up`, `tip_tax_amount`, `service_gst_tax_amount` all unchanged because the new local `subtotalWithoutTax` is computed *after* and is *not used by* any of those formulas.

---

## 5. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backend has been silently relying on the two keys being equal (e.g., dedup, idempotency, audit hash). | Low — backend response distinguishes them and the codebase comment on L658 says "backend contract unchanged" for `order_sub_total_amount` only. | Medium — could surface as audit/reports drift. | Verify on preprod by emitting one place-order with distinct values and inspecting `restaurant-orders/{id}` GET response + report row before broad rollout. |
| Postpaid place/update flows currently default discount/tip to 0; if upstream caller starts passing them later, semantic stays correct (helper formula is consistent). | n/a | n/a | None needed — math is internally consistent. |
| `placeOrder` for **takeaway/delivery** may pass `serviceChargePercentage > 0` from a misconfigured profile, producing a non-zero SC. | Low — upstream `CollectPaymentPanel.scApplicable` (L391) gates SC to dineIn/walkIn/isRoom only. But `placeOrder` does **not** re-gate on `orderType`; it trusts the caller. | Low — would emit `subtotal + SC` for takeaway/delivery if a caller passed scPct. | Out of scope for this fix; pre-existing condition (same comment applies to `service_tax` key today). |
| Test `updateOrderPayload.test.js:250-258` may continue to pass but the assertion `order_sub_total_amount === order_amount` is misleading — not a failure mode but worth noting. | Low | None | Out of scope; investigation-only. |
| BUG-281 semantic (pre-tax complete = items − discount + SC + tip) may not match what the backend "without tax" key was designed for (e.g., backend might want post-discount items only, excluding SC). | Low–Medium | Medium | **OPEN QUESTION** — confirm with backend owner before merge. Acceptance criterion from this thread's screenshot resolves to `items + SC + tip − discount`, which matches CollectPaymentPanel.subtotal. Aligning with that is the safest mapping; if backend wants a different definition, only the new local's formula needs to change — the structural plumbing stays identical. |

---

## 6. Plan Summary (one-screen)

1. **Bill/print payload** — re-verified, leave as-is.
2. **One file** changes: `src/api/transforms/orderTransform.js`.
3. **`calcOrderTotals`** — add local `subtotalWithoutTax = round((postDiscount + serviceCharge + tipAmount) × 100) / 100`; assign it to `order_sub_total_without_tax` in the returned object (keep `order_sub_total_amount = subtotal`).
4. **`collectBillExisting`** — destructure `subtotal` from `paymentData`; assign it to `order_sub_total_without_tax` in the payload (keep `order_sub_total_amount = itemTotal`).
5. **Zero changes** to CollectPaymentPanel, OrderEntry, services, print payload, transferToRoom, response transform, reports, tests.
6. **Open question for backend owner** — confirm "without tax" semantic before merge: is it `items + SC + tip − discount` (matches UI Subtotal) or post-discount items only? Plan accommodates either; only one local-var formula moves.
7. **Net code delta**: ≤ 6 lines, 1 file, 2 functions.

---

*End of plan. No code modified. No tests run. No docs updated beyond this report.*
