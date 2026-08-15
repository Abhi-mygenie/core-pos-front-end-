# Print Payload Mini-CR — Exact Code Diff Preview — 2026-05-17

## 1. Purpose

Literal before/after code blocks for the 3-file change approved at Gate 6.

**No source files modified yet.**

---

## 2. File 1 — `frontend/src/components/order-entry/CollectPaymentPanel.jsx`

### Change 2.1 — `handlePrintBill` sends `effectiveTotal` (full payable) instead of food-only `finalTotal`

#### Current (L765-788)

```javascript
  const handlePrintBill = async () => {
    if (!onPrintBill || !hasPlacedItems || isPrintingBill) return;
    setIsPrintingBill(true);
    try {
      // discount_amount groups non-loyalty/non-wallet discounts (manual + preset + coupon)
      const discountAmount = Math.round((manualDiscount + presetDiscount + couponDiscount) * 100) / 100;
      const overrides = {
        orderItemTotal:      itemTotal,
        orderSubtotal:       subtotal,               // BUG-281: pre-tax complete
        paymentAmount:       finalTotal,
        discountAmount,
        couponCode:          selectedCoupon?.code || '',
        loyaltyAmount:       loyaltyDiscount,
        walletAmount:        walletDiscount,
        serviceChargeAmount: serviceCharge,
        deliveryCharge,
        gstTax:              Math.round((sgst + cgst) * 100) / 100, // BUG-006: UI tax value
        vatTax:              Math.round(vat * 100) / 100,           // CR-VAT-COLLECT: item-level VAT
        tip,                                                        // BUG-281: was hardcoded 0
        ...
```

#### Proposed

```javascript
  const handlePrintBill = async () => {
    if (!onPrintBill || !hasPlacedItems || isPrintingBill) return;
    setIsPrintingBill(true);
    try {
      // discount_amount groups non-loyalty/non-wallet discounts (manual + preset + coupon)
      const discountAmount = Math.round((manualDiscount + presetDiscount + couponDiscount) * 100) / 100;
      const overrides = {
        orderItemTotal:      itemTotal,
        orderSubtotal:       subtotal,               // BUG-281: pre-tax complete
        // PRINT-MINI-CR (May-2026): pass the full payable amount, NOT food-only
        // `finalTotal`. For room orders `effectiveTotal` = food + associated
        // transfers + room balance (same value the cashier sees as Grand Total
        // and the same value collectBillExisting sends as `grant_amount`).
        // For non-room orders `effectiveTotal === finalTotal`, so on-the-wire
        // behavior is bit-identical. This is the single source of truth for
        // "amount payable now" across print and payment payloads.
        paymentAmount:       effectiveTotal,
        discountAmount,
        couponCode:          selectedCoupon?.code || '',
        loyaltyAmount:       loyaltyDiscount,
        walletAmount:        walletDiscount,
        serviceChargeAmount: serviceCharge,
        deliveryCharge,
        gstTax:              Math.round((sgst + cgst) * 100) / 100, // BUG-006: UI tax value
        vatTax:              Math.round(vat * 100) / 100,           // CR-VAT-COLLECT: item-level VAT
        tip,                                                        // BUG-281: was hardcoded 0
        ...
```

#### Diff

```diff
        orderSubtotal:       subtotal,               // BUG-281: pre-tax complete
-        paymentAmount:       finalTotal,
+        // PRINT-MINI-CR (May-2026): pass the full payable amount, NOT food-only
+        // `finalTotal`. For room orders `effectiveTotal` = food + associated
+        // transfers + room balance (same value the cashier sees as Grand Total
+        // and the same value collectBillExisting sends as `grant_amount`).
+        // For non-room orders `effectiveTotal === finalTotal`, so on-the-wire
+        // behavior is bit-identical. This is the single source of truth for
+        // "amount payable now" across print and payment payloads.
+        paymentAmount:       effectiveTotal,
         discountAmount,
```

`effectiveTotal` is already declared at L614-617 of the same file (top-level scope of the component) — no new variable needed.

---

## 3. File 2 — `frontend/src/api/transforms/orderTransform.js`

### Change 3.1 — Update REQ3 comment block (lines 1630-1643)

Stale comment now misrepresents the contract — caller passes the full amount, transform writes through.

#### Current (L1630-1643)

```javascript
    // ==========================================================================
    // REQ3 (Apr-2026): Room order bill print enrichment.
    // - Replaces the hardcoded 0s for `roomRemainingPay` / `roomAdvancePay`
    //   with real values from `order.roomInfo` when isRoom.
    // - Emits `associated_orders[]` matching the backend schema (sourced from
    //   `_raw` preserved in fromAPI.order).
    // - Rolls associatedTotal + roomBalance into `payment_amount` / `grant_amount`
    //   when the override path supplies a food-only `paymentAmount`, so the
    //   printed bill total matches the cashier-visible total
    //   (CollectPaymentPanel.jsx:543 / 555 / 1986).
    // - Architectural rule preserved: SC / discount / tip / GST apply ONLY to
    //   food-subtotal — NOT to roomBalance, NOT to associatedTotal.
    // - `roomGst` stays 0 per Q-3E.
    // ==========================================================================
```

#### Proposed

```javascript
    // ==========================================================================
    // REQ3 (Apr-2026): Room order bill print enrichment.
    // - Replaces the hardcoded 0s for `roomRemainingPay` / `roomAdvancePay`
    //   with real values from `order.roomInfo` when isRoom.
    // - Emits `associated_orders[]` matching the backend schema (sourced from
    //   `_raw` preserved in fromAPI.order).
    // - Architectural rule preserved: SC / discount / tip / GST apply ONLY to
    //   food-subtotal — NOT to roomBalance, NOT to associatedTotal.
    // - `roomGst` stays 0 per Q-3E.
    //
    // PRINT-MINI-CR (May-2026): single-source-of-truth for "amount payable
    // now". Caller (CollectPaymentPanel.handlePrintBill) now passes the full
    // `effectiveTotal` as `overrides.paymentAmount` — same value
    // `collectBillExisting` sends as `grant_amount` on the payment endpoint.
    // The transform writes that through unchanged. Default branch (dashboard
    // re-print, no override) continues to trust `order.amount`, which is
    // already room-inclusive per Task 4 (`computeRoomCardAmount` in
    // DashboardPage.jsx). The earlier in-transform recompute
    // (`finalPaymentAmount + associatedTotal + roomBalance`) was removed
    // because it could collapse to food-only when `order.associatedOrders`
    // or `order.roomInfo.balancePayment` arrived stale/late.
    // ==========================================================================
```

### Change 3.2 — Remove the room-add-back recompute (L1671-1677)

#### Current

```javascript
    // Roll room-side amounts into the final payable when the override path
    // supplied a food-only `paymentAmount`. Default branch (no override)
    // already trusts `order.amount`, which is room-inclusive per Task 4
    // (computeRoomCardAmount in DashboardPage.jsx).
    const roomFinalPaymentAmount = (isRoomPrint && overrides.paymentAmount !== undefined)
      ? Math.round((Number(finalPaymentAmount) + associatedTotalForPrint + roomBalanceForPrint) * 100) / 100
      : finalPaymentAmount;
```

#### Proposed

**Delete the entire block.** No replacement.

Reason: `finalPaymentAmount` (already computed at L1624-1626) is now the single source of truth for both override (caller sends `effectiveTotal`) and default (falls back to `order.amount`) paths.

#### Diff

```diff
-    // Roll room-side amounts into the final payable when the override path
-    // supplied a food-only `paymentAmount`. Default branch (no override)
-    // already trusts `order.amount`, which is room-inclusive per Task 4
-    // (computeRoomCardAmount in DashboardPage.jsx).
-    const roomFinalPaymentAmount = (isRoomPrint && overrides.paymentAmount !== undefined)
-      ? Math.round((Number(finalPaymentAmount) + associatedTotalForPrint + roomBalanceForPrint) * 100) / 100
-      : finalPaymentAmount;
```

### Change 3.3 — Use `finalPaymentAmount` directly for `payment_amount` / `grant_amount` (L1683-1684)

#### Current

```javascript
    return {
      order_id: order.orderId,
      restaurant_order_id: order.orderNumber || '',
      print_type: 'bill',
      payment_amount: roomFinalPaymentAmount,
      grant_amount: roomFinalPaymentAmount,
      order_item_total: finalOrderItemTotal,
```

#### Proposed

```javascript
    return {
      order_id: order.orderId,
      restaurant_order_id: order.orderNumber || '',
      print_type: 'bill',
      // PRINT-MINI-CR (May-2026): both fields now use `finalPaymentAmount`
      // directly (override caller passes `effectiveTotal`; default branch
      // falls back to `order.amount`). See REQ3 comment block above.
      payment_amount: finalPaymentAmount,
      grant_amount: finalPaymentAmount,
      order_item_total: finalOrderItemTotal,
```

#### Diff

```diff
       print_type: 'bill',
-      payment_amount: roomFinalPaymentAmount,
-      grant_amount: roomFinalPaymentAmount,
+      // PRINT-MINI-CR (May-2026): both fields now use `finalPaymentAmount`
+      // directly (override caller passes `effectiveTotal`; default branch
+      // falls back to `order.amount`). See REQ3 comment block above.
+      payment_amount: finalPaymentAmount,
+      grant_amount: finalPaymentAmount,
       order_item_total: finalOrderItemTotal,
```

### Change 3.4 — Emit `rtype` on the print payload (insert near L1730 `order_type`)

#### Current (L1729-1731)

```javascript
      station_kot: '',
      order_type: order.rawOrderType || 'dinein',
      gst_tax: finalGstTax,
```

#### Proposed

```javascript
      station_kot: '',
      order_type: order.rawOrderType || 'dinein',
      // PRINT-MINI-CR (May-2026): backend-added field. Binary:
      // - "RM" when order is a room order (`order.isRoom === true`)
      // - "TB" for every other channel (dine-in, takeaway, walk-in, delivery, etc.)
      // Emitted only on the temp-store print payload (Q2a=(i)). Not added
      // to `collectBillExisting` or any other payload.
      rtype: order.isRoom ? 'RM' : 'TB',
      gst_tax: finalGstTax,
```

#### Diff

```diff
       station_kot: '',
       order_type: order.rawOrderType || 'dinein',
+      // PRINT-MINI-CR (May-2026): backend-added field. Binary:
+      // - "RM" when order is a room order (`order.isRoom === true`)
+      // - "TB" for every other channel (dine-in, takeaway, walk-in, delivery, etc.)
+      // Emitted only on the temp-store print payload (Q2a=(i)). Not added
+      // to `collectBillExisting` or any other payload.
+      rtype: order.isRoom ? 'RM' : 'TB',
       gst_tax: finalGstTax,
```

---

## 4. File 3 — `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js`

### Change 4.1 — Update file-level docstring (L1-9)

#### Current

```javascript
/**
 * REQ3 unit tests — room order bill print payload enrichment.
 * Verifies:
 *   - Non-room orders unaffected (regression)
 *   - Room orders populate roomRemainingPay/roomAdvancePay
 *   - associated_orders[] emitted with backend snake_case schema
 *   - payment_amount rolls in associatedTotal + roomBalance for override path
 */
```

#### Proposed

```javascript
/**
 * REQ3 unit tests — room order bill print payload enrichment.
 * Verifies:
 *   - Non-room orders unaffected (regression)
 *   - Room orders populate roomRemainingPay/roomAdvancePay
 *   - associated_orders[] emitted with backend snake_case schema
 *   - payment_amount mirrors caller-supplied paymentAmount (PRINT-MINI-CR,
 *     May-2026): caller (CollectPaymentPanel) passes the full effectiveTotal;
 *     transform no longer recomputes by re-adding assoc + balance.
 *   - rtype is emitted: "RM" for room orders, "TB" otherwise.
 */
```

### Change 4.2 — Re-baseline "override branch" test (L93-116)

#### Current

```javascript
  test('room order — override branch rolls assoc + balance into payment_amount', () => {
    const rawAssoc = {
      id: 3755, room_id: 7486, restaurant_id: 618, user_id: null,
      order_id: 731402, restaurant_order_id: '000125', order_amount: 71,
      order_status: 0, created_at: '', updated_at: '',
    };
    const order = buildBaseOrder({
      isRoom: true,
      roomInfo: { roomPrice: 2000, advancePayment: 1500, balancePayment: 500 },
      associatedOrders: [{ orderId: 3755, orderNumber: '000125', amount: 71, transferredAt: '', _raw: rawAssoc }],
    });
    // CollectPaymentPanel sends food-only finalTotal (e.g., 105) as paymentAmount
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {
      paymentAmount: 105,
      orderItemTotal: 100,
      orderSubtotal: 105,
    });
    // 105 (food) + 71 (assoc) + 500 (balance) = 676
    expect(payload.payment_amount).toBe(676);
    expect(payload.grant_amount).toBe(676);
    expect(payload.roomRemainingPay).toBe(500);
    expect(payload.roomAdvancePay).toBe(1500);
    expect(payload.associated_orders[0].order_id).toBe(731402);
  });
```

#### Proposed

```javascript
  test('room order — override branch writes caller-supplied paymentAmount (PRINT-MINI-CR)', () => {
    const rawAssoc = {
      id: 3755, room_id: 7486, restaurant_id: 618, user_id: null,
      order_id: 731402, restaurant_order_id: '000125', order_amount: 71,
      order_status: 0, created_at: '', updated_at: '',
    };
    const order = buildBaseOrder({
      isRoom: true,
      roomInfo: { roomPrice: 2000, advancePayment: 1500, balancePayment: 500 },
      associatedOrders: [{ orderId: 3755, orderNumber: '000125', amount: 71, transferredAt: '', _raw: rawAssoc }],
    });
    // PRINT-MINI-CR (May-2026): CollectPaymentPanel now passes the FULL
    // effectiveTotal (food + assoc + roomBalance) as paymentAmount —
    // same single source the order-bill-payment payload uses for grant_amount.
    // The transform writes it through unchanged (no in-function recompute).
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {
      paymentAmount: 676, // 105 (food) + 71 (assoc) + 500 (balance)
      orderItemTotal: 100,
      orderSubtotal: 105,
    });
    expect(payload.payment_amount).toBe(676);
    expect(payload.grant_amount).toBe(676);
    expect(payload.roomRemainingPay).toBe(500);
    expect(payload.roomAdvancePay).toBe(1500);
    expect(payload.associated_orders[0].order_id).toBe(731402);
    expect(payload.rtype).toBe('RM');
  });
```

### Change 4.3 — Add `rtype` assertions to existing tests

| Test (line) | Added assertion |
|---|---|
| L52 (non-room base) | `expect(payload.rtype).toBe('TB');` |
| L62 (room no transfers/balance) | `expect(payload.rtype).toBe('RM');` |
| L90 (room default branch, post-existing) | `expect(payload.rtype).toBe('RM');` |
| L125 (non-room override) | `expect(payload.rtype).toBe('TB');` |

Each addition is a single line at the end of its respective `test(...)` block.

---

## 5. Summary Of Net Change

| File | Insertions | Deletions |
|------|-----------:|----------:|
| `CollectPaymentPanel.jsx` | +8 | -1 |
| `orderTransform.js` | +18 | -10 |
| `req3-room-bill-print.test.js` | +14 | -5 |
| **Total** | **+40** | **-16** |

---

## 6. Files NOT Touched

(Per owner directive — re-listed for clarity)
- All other `orderTransform.js` payload builders (`collectBillExisting`, `placeOrder`, etc.) — `rtype` is print-only.
- All other CollectPaymentPanel logic.
- All dashboard / order-entry / report files.
- All BUG-050 / BUG-057 changes already landed in Wave 4.
- Tax / GST / VAT / service charge / item totals / discounts / tip / delivery / printer mapping / room enrichment fields (`roomRemainingPay`, `roomAdvancePay`, `associated_orders`).

---

## 7. Approval Required

- **A.** Approve this exact diff → apply all 3 file edits (Gate 8), run `yarn test`, smoke, report back. Then resume Wave 4 BUG-059.
- **B.** Modify (specify what to change — e.g., move `rtype` to a different position in payload; emit `"DINEIN"` instead of `"TB"`; alternative test-baseline approach).
- **C.** Stop / skip this mini-CR.

Reply A / B / C.

---

*— End of Print Payload Mini-CR Exact Code Diff Preview —*
