# Print Path Unification Corrective Patch — Exact Code Diff Preview — 2026-05-17

## 1. Purpose

Exact literal before/after diffs for the corrective patch approved by owner (Option A on the 4-block question). Tightened scope:

- IN: split `payment_amount` (food-only) vs `grant_amount` (full payable); default-branch room rollup for `grant_amount`; CollectPaymentPanel sends BOTH values; test re-baseline.
- OUT: Item Total / SC / Sub Total / CGST / SGST drift (owner deferred until proved + approved).

**No source files modified yet.**

---

## 2. File 1 — `frontend/src/api/transforms/orderTransform.js`

### Change 2.1 — Add `finalGrantAmount` computation and refresh REQ3 comment block (replaces L1624-1651)

#### Current (L1624-1651)

```javascript
    const finalPaymentAmount = overrides.paymentAmount !== undefined
      ? overrides.paymentAmount
      : (order.amount || 0);
    const finalGstTax = overrides.gstTax !== undefined ? overrides.gstTax : gst_tax;
    const finalVatTax = overrides.vatTax !== undefined ? overrides.vatTax : vat_tax;

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

#### Proposed

```javascript
    const finalPaymentAmount = overrides.paymentAmount !== undefined
      ? overrides.paymentAmount
      : (order.amount || 0);
    const finalGstTax = overrides.gstTax !== undefined ? overrides.gstTax : gst_tax;
    const finalVatTax = overrides.vatTax !== undefined ? overrides.vatTax : vat_tax;

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
    // PRINT-CORRECTIVE (May-2026): print payload now emits TWO distinct money
    // fields with different semantics (PRINT-002 business rule):
    //   - `payment_amount` = food-only bill ("Total" line on the printed bill)
    //     = finalPaymentAmount (override caller passes food-only `finalTotal`;
    //     default branch falls back to `order.amount`)
    //   - `grant_amount`   = full amount payable now ("Grand Total" line)
    //     = finalPaymentAmount + associatedTotal + roomBalance (for room orders)
    //     = finalPaymentAmount                                   (for non-room)
    //
    // The previous (Mini-CR) approach conflated both fields to `effectiveTotal`,
    // which made the printed "Total" line equal the Grand Total on the override
    // path, and left the default path collapsing both fields to food-only on
    // room orders (receipts #1/#2 in owner's 2026-05-17 evidence). The earlier
    // comment claiming `order.amount` is "room-inclusive per Task 4" was wrong:
    // `computeRoomCardAmount` in DashboardPage.jsx only mutates the dashboard
    // CARD display value — the `order` object passed to this function still
    // carries the raw food-only `order.amount`.
    //
    // Item Total / Service Charge / Sub Total / CGST / SGST drift between the
    // override and default branches is acknowledged but DEFERRED per owner
    // directive 2026-05-17 (pending separate proof + approval).
    // ==========================================================================
```

#### Diff

```diff
     // - `roomGst` stays 0 per Q-3E.
     //
-    // PRINT-MINI-CR (May-2026): single-source-of-truth for "amount payable
-    // now". Caller (CollectPaymentPanel.handlePrintBill) now passes the full
-    // `effectiveTotal` as `overrides.paymentAmount` — same value
-    // `collectBillExisting` sends as `grant_amount` on the payment endpoint.
-    // The transform writes that through unchanged. Default branch (dashboard
-    // re-print, no override) continues to trust `order.amount`, which is
-    // already room-inclusive per Task 4 (`computeRoomCardAmount` in
-    // DashboardPage.jsx). The earlier in-transform recompute
-    // (`finalPaymentAmount + associatedTotal + roomBalance`) was removed
-    // because it could collapse to food-only when `order.associatedOrders`
-    // or `order.roomInfo.balancePayment` arrived stale/late.
+    // PRINT-CORRECTIVE (May-2026): print payload now emits TWO distinct money
+    // fields with different semantics (PRINT-002 business rule):
+    //   - `payment_amount` = food-only bill ("Total" line on the printed bill)
+    //     = finalPaymentAmount (override caller passes food-only `finalTotal`;
+    //     default branch falls back to `order.amount`)
+    //   - `grant_amount`   = full amount payable now ("Grand Total" line)
+    //     = finalPaymentAmount + associatedTotal + roomBalance (for room orders)
+    //     = finalPaymentAmount                                   (for non-room)
+    //
+    // The previous (Mini-CR) approach conflated both fields to `effectiveTotal`,
+    // which made the printed "Total" line equal the Grand Total on the override
+    // path, and left the default path collapsing both fields to food-only on
+    // room orders (receipts #1/#2 in owner's 2026-05-17 evidence). The earlier
+    // comment claiming `order.amount` is "room-inclusive per Task 4" was wrong:
+    // `computeRoomCardAmount` in DashboardPage.jsx only mutates the dashboard
+    // CARD display value — the `order` object passed to this function still
+    // carries the raw food-only `order.amount`.
+    //
+    // Item Total / Service Charge / Sub Total / CGST / SGST drift between the
+    // override and default branches is acknowledged but DEFERRED per owner
+    // directive 2026-05-17 (pending separate proof + approval).
     // ==========================================================================
```

### Change 2.2 — Insert `finalGrantAmount` derivation right after the existing `roomAdvanceForPrint` (after L1678)

#### Insert this block immediately after L1678 and before `return {` at L1680

```javascript
    // PRINT-CORRECTIVE (May-2026): "Grand Total" value emitted as `grant_amount`.
    // - Room orders: food-only finalPaymentAmount + associatedTotal + roomBalance.
    //   Mirrors what CollectPaymentPanel computes as `effectiveTotal` for the
    //   Checkout button (collectBillExisting payload sends the same number as
    //   its own `grant_amount`).
    // - Non-room orders: identical to `payment_amount` (associated=0, balance=0).
    //
    // Override hook: `overrides.grantAmount` allows live-state callers
    // (e.g. CollectPaymentPanel.handlePrintBill) to pass the live effectiveTotal
    // directly when the order context's room/associated data may not yet be
    // fully hydrated.
    const finalGrantAmount = overrides.grantAmount !== undefined
      ? overrides.grantAmount
      : (isRoomPrint
          ? Math.round((Number(finalPaymentAmount) + associatedTotalForPrint + roomBalanceForPrint) * 100) / 100
          : finalPaymentAmount);
```

(Note: `isRoomPrint`, `associatedTotalForPrint`, `roomBalanceForPrint` are already declared at L1652-1675 — no re-declaration needed.)

### Change 2.3 — Emit `grant_amount` from `finalGrantAmount` instead of `finalPaymentAmount` (L1687-1688)

#### Current

```javascript
      print_type: 'bill',
      // PRINT-MINI-CR (May-2026): both fields now use `finalPaymentAmount`
      // directly (override caller passes `effectiveTotal`; default branch
      // falls back to `order.amount`). See REQ3 comment block above.
      payment_amount: finalPaymentAmount,
      grant_amount: finalPaymentAmount,
      order_item_total: finalOrderItemTotal,
```

#### Proposed

```javascript
      print_type: 'bill',
      // PRINT-CORRECTIVE (May-2026, PRINT-002): two distinct semantics:
      //   payment_amount → "Total" line  → food-only (finalPaymentAmount)
      //   grant_amount   → "Grand Total" → full payable (finalGrantAmount;
      //                                    = finalPaymentAmount for non-room)
      payment_amount: finalPaymentAmount,
      grant_amount: finalGrantAmount,
      order_item_total: finalOrderItemTotal,
```

#### Diff

```diff
       print_type: 'bill',
-      // PRINT-MINI-CR (May-2026): both fields now use `finalPaymentAmount`
-      // directly (override caller passes `effectiveTotal`; default branch
-      // falls back to `order.amount`). See REQ3 comment block above.
+      // PRINT-CORRECTIVE (May-2026, PRINT-002): two distinct semantics:
+      //   payment_amount → "Total" line  → food-only (finalPaymentAmount)
+      //   grant_amount   → "Grand Total" → full payable (finalGrantAmount;
+      //                                    = finalPaymentAmount for non-room)
       payment_amount: finalPaymentAmount,
-      grant_amount: finalPaymentAmount,
+      grant_amount: finalGrantAmount,
       order_item_total: finalOrderItemTotal,
```

---

## 3. File 2 — `frontend/src/components/order-entry/CollectPaymentPanel.jsx`

### Change 3.1 — `handlePrintBill` sends `paymentAmount: finalTotal` AND `grantAmount: effectiveTotal` (L770-777)

#### Current

```javascript
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
```

#### Proposed

```javascript
        orderSubtotal:       subtotal,               // BUG-281: pre-tax complete
        // PRINT-CORRECTIVE (May-2026, PRINT-002): pass TWO distinct money
        // values that map to the receipt's two distinct lines:
        //   paymentAmount → "Total" line       → food-only finalTotal
        //   grantAmount   → "Grand Total" line → effectiveTotal (food + assoc
        //                                          + roomBalance for rooms;
        //                                          = finalTotal otherwise)
        // The previous Mini-CR sent only paymentAmount: effectiveTotal which
        // caused the printed "Total" line to equal the Grand Total on room
        // orders (receipt #3 in owner's 2026-05-17 evidence).
        paymentAmount:       finalTotal,
        grantAmount:         effectiveTotal,
        discountAmount,
```

#### Diff

```diff
         orderSubtotal:       subtotal,               // BUG-281: pre-tax complete
-        // PRINT-MINI-CR (May-2026): pass the full payable amount, NOT food-only
-        // `finalTotal`. For room orders `effectiveTotal` = food + associated
-        // transfers + room balance (same value the cashier sees as Grand Total
-        // and the same value collectBillExisting sends as `grant_amount`).
-        // For non-room orders `effectiveTotal === finalTotal`, so on-the-wire
-        // behavior is bit-identical. This is the single source of truth for
-        // "amount payable now" across print and payment payloads.
-        paymentAmount:       effectiveTotal,
+        // PRINT-CORRECTIVE (May-2026, PRINT-002): pass TWO distinct money
+        // values that map to the receipt's two distinct lines:
+        //   paymentAmount → "Total" line       → food-only finalTotal
+        //   grantAmount   → "Grand Total" line → effectiveTotal (food + assoc
+        //                                          + roomBalance for rooms;
+        //                                          = finalTotal otherwise)
+        // The previous Mini-CR sent only paymentAmount: effectiveTotal which
+        // caused the printed "Total" line to equal the Grand Total on room
+        // orders (receipt #3 in owner's 2026-05-17 evidence).
+        paymentAmount:       finalTotal,
+        grantAmount:         effectiveTotal,
         discountAmount,
```

---

## 4. File 3 — `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js`

### Change 4.1 — Re-baseline override-branch test (L93-122)

#### Current

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
    expect(payload.payment_status).toBe('');
    expect(payload.payment_method).toBe('');
  });
```

#### Proposed

```javascript
  test('room order — override branch: paymentAmount=finalTotal, grantAmount=effectiveTotal (PRINT-CORRECTIVE)', () => {
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
    // PRINT-CORRECTIVE (May-2026, PRINT-002): CollectPaymentPanel now passes
    // TWO distinct money values:
    //   - paymentAmount = food-only finalTotal (105) → "Total" line
    //   - grantAmount   = effectiveTotal (676 = 105 + 71 + 500) → "Grand Total"
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {
      paymentAmount: 105,
      grantAmount: 676,
      orderItemTotal: 100,
      orderSubtotal: 105,
    });
    expect(payload.payment_amount).toBe(105); // food-only → Total line
    expect(payload.grant_amount).toBe(676);   // full payable → Grand Total
    expect(payload.roomRemainingPay).toBe(500);
    expect(payload.roomAdvancePay).toBe(1500);
    expect(payload.associated_orders[0].order_id).toBe(731402);
    expect(payload.rtype).toBe('RM');
    expect(payload.payment_status).toBe('');
    expect(payload.payment_method).toBe('');
  });
```

### Change 4.2 — Update room default-branch test (L73-92) to assert the new rollup

#### Current (the test that currently expects `payment_amount=671`)

```javascript
  test('room order with transfers + balance + advance — default branch', () => {
    const rawAssoc = {
      id: 3755, room_id: 7486, restaurant_id: 618, user_id: null,
      order_id: 731402, restaurant_order_id: '000125', order_amount: 71,
      order_status: 0, created_at: '', updated_at: '',
    };
    const order = buildBaseOrder({
      isRoom: true,
      amount: 671, // 100 (food) + 71 (assoc) + 500 (balance) — Task 4 room-inclusive
      roomInfo: { roomPrice: 2000, advancePayment: 1500, balancePayment: 500 },
      associatedOrders: [{ orderId: 3755, orderNumber: '000125', amount: 71, transferredAt: '', _raw: rawAssoc }],
    });
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {});
    expect(payload.roomRemainingPay).toBe(500);
    expect(payload.roomAdvancePay).toBe(1500);
    expect(payload.associated_orders).toHaveLength(1);
    expect(payload.associated_orders[0].order_id).toBe(731402);
    expect(payload.associated_orders[0].order_amount).toBe(71);
    expect(payload.payment_amount).toBe(671); // trusts order.amount default branch
    expect(payload.rtype).toBe('RM');
    expect(payload.payment_status).toBe('');
    expect(payload.payment_method).toBe('');
  });
```

#### Proposed

```javascript
  test('room order — default branch: payment_amount = food-only order.amount; grant_amount adds assoc+balance (PRINT-CORRECTIVE)', () => {
    const rawAssoc = {
      id: 3755, room_id: 7486, restaurant_id: 618, user_id: null,
      order_id: 731402, restaurant_order_id: '000125', order_amount: 71,
      order_status: 0, created_at: '', updated_at: '',
    };
    // PRINT-CORRECTIVE (May-2026): order.amount is food-only (raw api value).
    // The dashboard CARD display rolls in associated+balance via
    // computeRoomCardAmount in DashboardPage.jsx, but the order object passed
    // to buildBillPrintPayload still carries the food-only value.
    const order = buildBaseOrder({
      isRoom: true,
      amount: 100, // food-only — backend's api.order_amount for room orders
      roomInfo: { roomPrice: 2000, advancePayment: 1500, balancePayment: 500 },
      associatedOrders: [{ orderId: 3755, orderNumber: '000125', amount: 71, transferredAt: '', _raw: rawAssoc }],
    });
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {});
    expect(payload.roomRemainingPay).toBe(500);
    expect(payload.roomAdvancePay).toBe(1500);
    expect(payload.associated_orders).toHaveLength(1);
    expect(payload.associated_orders[0].order_id).toBe(731402);
    expect(payload.associated_orders[0].order_amount).toBe(71);
    // PRINT-002: two distinct money fields
    expect(payload.payment_amount).toBe(100);     // food-only → "Total"
    expect(payload.grant_amount).toBe(671);       // 100 + 71 + 500 → "Grand Total"
    expect(payload.rtype).toBe('RM');
    expect(payload.payment_status).toBe('');
    expect(payload.payment_method).toBe('');
  });
```

### Change 4.3 — Add explicit non-room regression assertion for `grant_amount === payment_amount`

Append a tiny new test before the closing `});` of the describe block (~L160 area):

```javascript
  test('non-room order — grant_amount equals payment_amount (PRINT-CORRECTIVE regression)', () => {
    const order = buildBaseOrder(); // non-room, food-only amount=100
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {});
    expect(payload.payment_amount).toBe(payload.grant_amount);
    expect(payload.payment_amount).toBe(100);
    expect(payload.rtype).toBe('TB');
  });
```

### Change 4.4 — Update file-level docstring

Append one line to the existing docstring (after the `rtype` line):

```javascript
 *   - PRINT-CORRECTIVE (May-2026): payment_amount = food-only; grant_amount
 *     = full payable (food + assoc + balance for room orders). Two distinct
 *     fields with distinct semantics (PRINT-002 business rule).
```

---

## 5. Net size

| File | Insertions | Deletions |
|---|---:|---:|
| `orderTransform.js` | +35 | -14 |
| `CollectPaymentPanel.jsx` | +13 | -8 |
| `req3-room-bill-print.test.js` | +25 | -10 |
| **Total** | **+73** | **-32** |

---

## 6. Files NOT touched

Per owner directive 2026-05-17 — deferred until proved + approved:
- `Item Total` / `Service Charge` / `Sub Total` / `CGST` / `SGST` divergence between branches.
- `getItemLinePrice` consolidation.
- New `print-payload-parity.test.js`.
- `collectBillExisting` and every other non-print payload builder.
- All BUG-050, BUG-057, Mini-CR Addendum changes already landed in Wave 4.

---

## 7. Validation plan after applying

1. ESLint clean on both code files.
2. `yarn test` — full suite green (498 tests after +1 new test, +2 re-baselined).
3. Webpack compile green.
4. Owner smoke on Room #102:
   - All 3 surfaces (OrderEntry header pill, Dashboard OrderCard printer, CollectPaymentPanel inside Print Bill) — DevTools Network → `POST /order-temp-store` body should now read:
     - `payment_amount: 2676` (food-only)
     - `grant_amount: 11510` (full payable)
     - `rtype: "RM"`, `payment_status: "unpaid"`, `payment_method: "pending"` (Mini-CR Addendum, unchanged)
   - Printed receipts: "Total" line = 2,676, "Grand Total" line = 11,510. Identical across all 3 surfaces (on these two fields — Item Total / SC / etc. drift remains, parked).
5. Owner smoke on non-room order: bit-identical to today on `payment_amount`; `grant_amount` equals `payment_amount` (non-room).

---

## 8. Business rule recording

After implementation lands and smokes clean, add to `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`:

> **PRINT-002 (May-2026): payment_amount vs grant_amount semantics.**
> - `payment_amount` = the restaurant's own bill total ("Total" line on the printed bill) = food + SC + GST + VAT + tip + delivery − discount.
> - `grant_amount` = the amount the cashier collects right now ("Grand Total" line) = `payment_amount + (isRoom ? associatedTotal + roomBalance : 0)`.
> - For non-room orders, the two are equal.
> - For room orders, `grant_amount` adds previous-orders-transferred-to-room + the room folio pending balance.

**PRINT-001** (all paths identical) is **NOT** recorded yet — deferred until the Item Total / SC drift is addressed in a future ticket.

---

## 9. Approval required

- **A.** Approve this exact diff → apply all 3 file edits, run `yarn test` + webpack, report back.
- **B.** Modify (specify which hunk to change).
- **C.** Stop.

Reply A / B / C.

---

*— End of Print Path Unification Corrective Patch — Exact Code Diff Preview —*
