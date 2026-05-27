# Print Payload Mini-CR — Addendum Code Diff Preview — 2026-05-17

## 1. Purpose

Adds two backend-requested keys (`payment_status`, `payment_method`) to the temp-store print payload, sourced from order context as confirmed by owner (Q1=Y).

**This is an addendum to the already-landed Print Payload Mini-CR.** Same scope, same file, same review process. No source edits yet.

---

## 2. Owner-Confirmed Spec

| Decision | Answer |
|---|---|
| Source of `payment_status` / `payment_method` | Order context (`order.paymentStatus`, `order.paymentMethod`) |
| Override-branch (Collect Bill panel selected method) | **No** — do not override; emit order-context value as-is. Collect Bill preview prints `payment_status: 'unpaid'`, `payment_method: ''` — owner accepts ("no change in collect bill"). |
| Audit report (BUG-059) special handling | Owner will specify during BUG-059 — not in this addendum. |
| Delivery | Fold into the existing Mini-CR — single file edit + test assertions. |

---

## 3. File 1 — `frontend/src/api/transforms/orderTransform.js`

### Change 3.1 — Emit `payment_status` and `payment_method` next to the Mini-CR's `rtype` line

#### Current (post-Mini-CR state, around the `rtype` insertion)

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
      // PRINT-MINI-CR Addendum (May-2026): backend-requested keys. Sourced
      // straight from order context (`fromAPI.order` L220 / L222) — no
      // override-branch handling. Collect Bill panel preview prints
      // 'unpaid' / '' (truthful state at preview time); dashboard / order-
      // entry / audit reprint of a paid order prints the real stored values
      // (e.g. 'paid' / 'cash'). PayLater backend typo 'sucess' passes
      // through unchanged per L1184 backend contract.
      payment_status: order.paymentStatus || '',
      payment_method: order.paymentMethod || '',
      gst_tax: finalGstTax,
```

#### Diff

```diff
       rtype: order.isRoom ? 'RM' : 'TB',
+      // PRINT-MINI-CR Addendum (May-2026): backend-requested keys. Sourced
+      // straight from order context (`fromAPI.order` L220 / L222) — no
+      // override-branch handling. Collect Bill panel preview prints
+      // 'unpaid' / '' (truthful state at preview time); dashboard / order-
+      // entry / audit reprint of a paid order prints the real stored values
+      // (e.g. 'paid' / 'cash'). PayLater backend typo 'sucess' passes
+      // through unchanged per L1184 backend contract.
+      payment_status: order.paymentStatus || '',
+      payment_method: order.paymentMethod || '',
       gst_tax: finalGstTax,
```

---

## 4. File 2 — `frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js`

### Change 4.1 — Update file-level docstring

#### Current

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
 *   - payment_status / payment_method are emitted from order context
 *     (PRINT-MINI-CR Addendum, May-2026).
 */
```

### Change 4.2 — Add `payment_status` / `payment_method` assertions to all 4 print-payload tests

For each of the four `test(...)` blocks, append two assertions. The base fixture has no `paymentStatus`/`paymentMethod` set, so default test expectations are `''` (matches the `|| ''` fallback).

#### Test 1 — "non-room order: roomRemainingPay…" (L52 area)

Append:
```javascript
    expect(payload.payment_status).toBe('');
    expect(payload.payment_method).toBe('');
```

#### Test 2 — "room order with no transfers/balance" (L63 area)

Append:
```javascript
    expect(payload.payment_status).toBe('');
    expect(payload.payment_method).toBe('');
```

#### Test 3 — "room order with transfers + balance + advance — default branch" (L91 area)

Append:
```javascript
    expect(payload.payment_status).toBe('');
    expect(payload.payment_method).toBe('');
```

#### Test 4 — "room order — override branch writes caller-supplied paymentAmount" (L116 area)

Append:
```javascript
    expect(payload.payment_status).toBe('');
    expect(payload.payment_method).toBe('');
```

#### Test 5 — "non-room override branch: payment_amount NOT inflated" (L128 area)

Append:
```javascript
    expect(payload.payment_status).toBe('');
    expect(payload.payment_method).toBe('');
```

### Change 4.3 — Add one new positive test (paid order pass-through)

Insert a new test just before the closing `});` of the first `describe(...)` block (after the non-room override test, around L131):

```javascript
  test('paid order: payment_status / payment_method pass through from order context (Addendum)', () => {
    const order = buildBaseOrder({
      paymentStatus: 'paid',
      paymentMethod: 'cash',
    });
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {});
    expect(payload.payment_status).toBe('paid');
    expect(payload.payment_method).toBe('cash');
    expect(payload.rtype).toBe('TB');
  });
```

This locks in the pass-through contract (positive case) on top of the four default-empty regressions.

---

## 5. Summary Of Net Change

| File | Insertions | Deletions |
|------|-----------:|----------:|
| `orderTransform.js` | +10 | 0 |
| `req3-room-bill-print.test.js` | +14 (10 assertion lines + new test 4 lines) | 0 |
| **Total** | **+24** | **0** |

---

## 6. Files NOT Touched

- `CollectPaymentPanel.jsx` — owner explicit "no change in collect bill". The Mini-CR's earlier `paymentAmount: effectiveTotal` change stays. No live-UI override added for payment status/method.
- All other `orderTransform.js` payload builders (`collectBillExisting` etc.) — addendum strictly scoped to the print payload.
- All other files in the codebase.

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Backend rejects empty string `''` for `payment_method` on unpaid bill print | LOW | Owner confirmed "use order context, no change to Collect Bill". Backend has presumably accommodated this since owner asked for it. If preprod rejects, we can switch to `'pending'` (same default that placeOrder uses at L851) on a follow-up. |
| Paid-order reprint emits stale payment method | None | `order.paymentMethod` is sourced from `api.payment_method` via fromAPI.order — always reflects the current backend record. |
| PayLater stores `'sucess'` (6-letter typo) | None — by design | Comment at orderTransform L1184 confirms the backend convention. Pass-through is faithful to "order context". |
| Audit report flow (BUG-059) differs | Deferred | Owner will give specific spec during BUG-059. This addendum behaves correctly for the default-branch path BUG-059 uses (handler calls `printOrder(orderId, 'bill', null, order, …)` with no overrides). |

---

## 8. Validation Plan (Post-Implementation)

1. ESLint — clean.
2. `yarn test` — 34/34 suites, 496 → 497 tests (added 1 positive test).
3. Webpack compile — green.
4. Owner smoke (using existing live order):
   - Collect Bill panel → Print Bill → DevTools Network → `POST /order-temp-store` body should contain:
     - `payment_status: "unpaid"`, `payment_method: ""` (preview state).
   - Dashboard reprint of a previously paid order → payload should contain real values:
     - `payment_status: "paid"`, `payment_method: "cash"` (or whatever was used).

---

## 9. Approval Required

- **A.** Approve this exact addendum diff → apply both file edits, run `yarn test`, smoke, report back.
- **B.** Modify (e.g., default to `'pending'` instead of `''` for missing method; gate emission on `isRoom`; etc.).
- **C.** Stop / skip this addendum.

Reply A / B / C.

---

*— End of Print Payload Mini-CR Addendum Code Diff Preview —*
