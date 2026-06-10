# POS2.0 Wave 4 Code Diff Preview — BUG-050 Bucket — 2026-05-17

## 1. Purpose

This is the **exact code-change preview** for **BUG-050 only** (owner chose bucket-by-bucket execution at Gate 7).

**No source files have been modified yet.** This document shows the literal before/after diff that will be applied to `frontend/src/api/transforms/orderTransform.js` once Gate 7 approval is recorded.

---

## 2. Approved Bug In This Bucket

| Bug | Owner Approval (Gate 7) | Approach |
|---|---|---|
| BUG-050 | Approved as part of bucket-by-bucket (Option C) | Cascade stored `order.discount` into `buildBillPrintPayload` default branch + expose `discount` on `fromAPI.order` |

BUG-057 and BUG-059 are **NOT** in this diff. They will be handled in subsequent buckets after BUG-050 lands and smokes clean.

---

## 3. BUG-050 — Manual Bill Reprint Source-of-Truth (Option A: Collect Bill parity)

### File

`frontend/src/api/transforms/orderTransform.js`

### Component / Function / Constant

1. `fromAPI.order` — add `discount` field to the projection (~L211).
2. `buildBillPrintPayload` — replace literal `0` fallback with `order.discount` cascade at two locations:
   - L1507-1508 (`overrideDiscount` consumed by SC + GST recompute)
   - L1671 (`discount_amount` emitted to the print payload)

---

### Change 3.1 — `fromAPI.order`: expose `discount`

#### Current Code Snippet (L205-216)

```javascript
      // Financials (Phase 1: Enhanced with new API fields)
      // No fallback — if socket doesn't send subtotal, keep as 0 (GET single order will fill it)
      amount: parseFloat(api.order_amount) || 0,
      subtotalBeforeTax: parseFloat(api.order_sub_total_without_tax) || 0,
      subtotalAmount: parseFloat(api.order_sub_total_amount) || 0,
      serviceTax: parseFloat(api.total_service_tax_amount) || 0,
      tipAmount: parseFloat(api.tip_amount) || 0,
      tipTaxAmount: parseFloat(api.tip_tax_amount) || 0,
      paymentStatus: api.payment_status || 'unpaid',
      paymentType: api.payment_type || '',
      paymentMethod: api.payment_method || '',
```

#### Proposed Code Snippet (L205-217)

```javascript
      // Financials (Phase 1: Enhanced with new API fields)
      // No fallback — if socket doesn't send subtotal, keep as 0 (GET single order will fill it)
      amount: parseFloat(api.order_amount) || 0,
      subtotalBeforeTax: parseFloat(api.order_sub_total_without_tax) || 0,
      subtotalAmount: parseFloat(api.order_sub_total_amount) || 0,
      serviceTax: parseFloat(api.total_service_tax_amount) || 0,
      tipAmount: parseFloat(api.tip_amount) || 0,
      tipTaxAmount: parseFloat(api.tip_tax_amount) || 0,
      // BUG-050 (Wave 4, May-2026): expose backend-stored order-level discount
      // so the dashboard re-print default branch of buildBillPrintPayload can
      // cascade it (mirroring how tipAmount + deliveryCharge already cascade).
      // Source field mirrors reportTransform.js (`restaurant_discount_amount`
      // with `discount_value` as legacy fallback). Missing field → 0 (no
      // regression vs current behavior).
      discount: parseFloat(api.restaurant_discount_amount || api.discount_value || 0) || 0,
      paymentStatus: api.payment_status || 'unpaid',
      paymentType: api.payment_type || '',
      paymentMethod: api.payment_method || '',
```

#### Diff

```diff
       tipAmount: parseFloat(api.tip_amount) || 0,
       tipTaxAmount: parseFloat(api.tip_tax_amount) || 0,
+      // BUG-050 (Wave 4, May-2026): expose backend-stored order-level discount
+      // so the dashboard re-print default branch of buildBillPrintPayload can
+      // cascade it (mirroring how tipAmount + deliveryCharge already cascade).
+      // Source field mirrors reportTransform.js (`restaurant_discount_amount`
+      // with `discount_value` as legacy fallback). Missing field → 0 (no
+      // regression vs current behavior).
+      discount: parseFloat(api.restaurant_discount_amount || api.discount_value || 0) || 0,
       paymentStatus: api.payment_status || 'unpaid',
```

---

### Change 3.2 — `buildBillPrintPayload`: cascade `order.discount` into `overrideDiscount`

#### Current Code Snippet (L1505-1513)

```javascript
    // BUG-006 (AD-101): Service charge on POST-discount subtotal.
    // Caller override still wins (CollectPaymentPanel sends the live UI value).
    const overrideDiscount = overrides.discountAmount !== undefined
      ? parseFloat(overrides.discountAmount) || 0 : 0;
    const overrideTip = overrides.tip !== undefined
      ? parseFloat(overrides.tip) || 0 : 0;
    const overrideDelivery = overrides.deliveryCharge !== undefined
      ? parseFloat(overrides.deliveryCharge) || 0 : 0;
    const postDiscountSubtotal = Math.max(0, computedSubtotal - overrideDiscount);
```

#### Proposed Code Snippet (L1505-1517)

```javascript
    // BUG-006 (AD-101): Service charge on POST-discount subtotal.
    // Caller override still wins (CollectPaymentPanel sends the live UI value).
    //
    // BUG-050 (Wave 4, May-2026): when caller did NOT pass an override (e.g.
    // dashboard re-print from OrderCard/TableCard/PrintBillButton), fall back
    // to the stored backend discount carried on `order.discount` (added in
    // fromAPI.order). This mirrors how `overrideTip` / `overrideDelivery`
    // already fall back to `order.tipAmount` / `order.deliveryCharge` (see
    // L1597 / L1603-L1605 below), restoring print parity with Collect Bill
    // for orders that had a stored discount.
    const overrideDiscount = overrides.discountAmount !== undefined
      ? parseFloat(overrides.discountAmount) || 0
      : (parseFloat(order.discount) || 0);
    const overrideTip = overrides.tip !== undefined
      ? parseFloat(overrides.tip) || 0 : 0;
    const overrideDelivery = overrides.deliveryCharge !== undefined
      ? parseFloat(overrides.deliveryCharge) || 0 : 0;
    const postDiscountSubtotal = Math.max(0, computedSubtotal - overrideDiscount);
```

#### Diff

```diff
     // BUG-006 (AD-101): Service charge on POST-discount subtotal.
     // Caller override still wins (CollectPaymentPanel sends the live UI value).
+    //
+    // BUG-050 (Wave 4, May-2026): when caller did NOT pass an override (e.g.
+    // dashboard re-print from OrderCard/TableCard/PrintBillButton), fall back
+    // to the stored backend discount carried on `order.discount` (added in
+    // fromAPI.order). This mirrors how `overrideTip` / `overrideDelivery`
+    // already fall back to `order.tipAmount` / `order.deliveryCharge` (see
+    // L1597 / L1603-L1605 below), restoring print parity with Collect Bill
+    // for orders that had a stored discount.
     const overrideDiscount = overrides.discountAmount !== undefined
-      ? parseFloat(overrides.discountAmount) || 0 : 0;
+      ? parseFloat(overrides.discountAmount) || 0
+      : (parseFloat(order.discount) || 0);
```

---

### Change 3.3 — `buildBillPrintPayload`: cascade `order.discount` into emitted `discount_amount`

#### Current Code Snippet (L1669-1675)

```javascript
      payment_amount: roomFinalPaymentAmount,
      grant_amount: roomFinalPaymentAmount,
      order_item_total: finalOrderItemTotal,
      order_subtotal: finalOrderSubtotal,
      discount_amount: overrides.discountAmount !== undefined ? overrides.discountAmount : 0,
      coupon_code: overrides.couponCode !== undefined ? overrides.couponCode : '',
      loyalty_dicount_amount: overrides.loyaltyAmount !== undefined ? overrides.loyaltyAmount : 0,
```

#### Proposed Code Snippet (L1669-1675)

```javascript
      payment_amount: roomFinalPaymentAmount,
      grant_amount: roomFinalPaymentAmount,
      order_item_total: finalOrderItemTotal,
      order_subtotal: finalOrderSubtotal,
      // BUG-050 (Wave 4, May-2026): default-branch fallback now reads stored
      // `order.discount` instead of hardcoded 0, so dashboard re-print matches
      // Collect Bill discount_amount when the order was paid with a discount.
      discount_amount: overrides.discountAmount !== undefined ? overrides.discountAmount : (parseFloat(order.discount) || 0),
      coupon_code: overrides.couponCode !== undefined ? overrides.couponCode : '',
      loyalty_dicount_amount: overrides.loyaltyAmount !== undefined ? overrides.loyaltyAmount : 0,
```

#### Diff

```diff
       order_item_total: finalOrderItemTotal,
       order_subtotal: finalOrderSubtotal,
-      discount_amount: overrides.discountAmount !== undefined ? overrides.discountAmount : 0,
+      // BUG-050 (Wave 4, May-2026): default-branch fallback now reads stored
+      // `order.discount` instead of hardcoded 0, so dashboard re-print matches
+      // Collect Bill discount_amount when the order was paid with a discount.
+      discount_amount: overrides.discountAmount !== undefined ? overrides.discountAmount : (parseFloat(order.discount) || 0),
       coupon_code: overrides.couponCode !== undefined ? overrides.couponCode : '',
```

---

## 4. Why These Three Changes Are Sufficient

| Concern | Already Cascading? | Source |
|---|---|---|
| Tip | ✅ Yes (`order.tipAmount`) | L1597 (subtotal compute), L1709 (emitted `Tip`) |
| Delivery | ✅ Yes (`order.deliveryCharge`) | L1603-1605 (subtotal compute), L1723 (emitted `delivery_charge`) |
| Service charge | ✅ Yes (recomputed from `serviceChargePercentage` + applicability gate) | L1528-1537 |
| Delivery GST (BUG-083) | ✅ Yes (additive; absent for non-delivery) | L1725 |
| GST recompute | ✅ Yes (uses `overrideDiscount` ratio at L1550) — **fixed automatically** by Change 3.2 | L1548-1557 |
| VAT recompute | ✅ Already prorated by discount in calcOrderTotals (Wave 2 BUG-054); print uses item-level VAT cap which is independent | L1612 |
| Cancelled-item filtering | ✅ Already correct | L1440-1444 |
| Complimentary items | ✅ Already correct | L1408-1418 |
| **Discount** | ❌ Missing — **fixed by Changes 3.1 + 3.2 + 3.3** | — |

After Change 3.2, the existing GST proration block at L1548-1557 will automatically use the cascaded discount because `overrideDiscount` is now correct. No additional change needed there.

---

## 5. Files NOT Touched

- `components/cards/OrderCard.jsx` — no call-site change.
- `components/cards/TableCard.jsx` — no call-site change.
- `components/order-entry/RePrintButton.jsx` — no call-site change.
- `components/order-entry/CollectPaymentPanel.jsx` — already uses override branch (wins).
- `components/order-entry/OrderEntry.jsx` — already uses override branch (wins).
- `api/services/orderService.js` — service signature unchanged.
- `api/services/reportService.js` — single-order endpoint not consumed by BUG-050.
- Test files — see §7.

---

## 6. Business Rules Verification (post-change)

| Rule | Status | How verified |
|---|---|---|
| PAY-001/002/004/007/008 (payload contracts) | ✅ Preserved | Print payload schema unchanged; only the value of an existing field (`discount_amount`) gets a corrected fallback. |
| TAX-001/002/003/005/008 (GST/VAT) | ✅ Preserved | Item-level GST/VAT math untouched; discount-proration ratio formula at L1550 unchanged (just receives a non-zero value when there's a stored discount). |
| SC-001/002/003/006 | ✅ Preserved | SC applicability gate (L1528-1529, BUG-023) untouched. |
| TIP-001/002 | ✅ Preserved | Tip cascade unchanged. |
| ROUND-002 | ✅ Preserved | Round-off occurs only in `calcOrderTotals`; print payload does not re-round grand total. |
| TOTALS-001/002 | ✅ Preserved | Item Total / Subtotal formulas untouched. |
| DEL-004/005 | ✅ Preserved | Delivery handling unchanged. |
| AD-101 (BUG-006) | ✅ Preserved | SC on post-discount subtotal — now correctly post-discount even on dashboard reprint. |
| REQ3 (room print) | ✅ Preserved | Room enrichment logic at L1614-1661 untouched. |
| BUG-018/021 (complimentary) | ✅ Preserved | Complimentary detection untouched. |

---

## 7. Tests Impact

| Test File | Will It Break? | Why / Action |
|---|---|---|
| `api/transforms/__tests__/req3-room-bill-print.test.js` | **No** | Test inputs construct `order` objects WITHOUT a `discount` field. `order.discount` is undefined → `parseFloat(undefined) \|\| 0` → 0. Output unchanged for these fixtures. |
| `__tests__/api/transforms/qa_subtotal_delivery_validation.test.js` | **Potentially yes** for default-branch (no-override) cases if test fixtures include a discount. Will inspect when Gate 8 implementation runs the test suite. | Will re-baseline if and only if a fixture genuinely tests the old `discount_amount = 0` behavior on a discounted order. New behavior is the correct one. |
| Other test files | **No** | Touch unrelated transforms. |

I will run `yarn test` after implementation to confirm.

---

## 8. Validation Plan (After Implementation)

1. `yarn build` — webpack compile success.
2. ESLint — clean.
3. `yarn test` — full suite. Any baseline-shift failures will be inspected and the test re-baselined ONLY if the new assertion is the correct one (discounted orders should have non-zero `discount_amount` in the default branch).
4. Manual smoke (owner can re-do): place dine-in order → apply ₹50 discount → pay → printed bill from Collect Bill captured. Then open same order via dashboard → printer icon → printed bill compared field-by-field. Expected: identical `discount_amount`, `order_subtotal`, `gst_tax`, `cgst_amount`, `sgst_amount`, `payment_amount`.

---

## 9. Approval Required Before Implementation

- **A.** Approve this exact diff — proceed to Gate 8 (apply changes).
- **B.** Modify the diff (tell me what to change).
- **C.** Stop / abandon BUG-050.

Reply A / B / C.

---

*— End of Wave 4 Code Diff Preview — BUG-050 Bucket —*
