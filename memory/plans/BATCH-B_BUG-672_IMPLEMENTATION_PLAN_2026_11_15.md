# BATCH-B · BUG-672 (Credit/TAB payment broken on prepaid orders) — Implementation Plan (Gate 3) — 2026-11-15

> Status: GATE_3_PLAN_DRAFT
> HEAD commit: 66ffe518
> Risk: CRITICAL (money path — credit ledger not created for prepaid TAB orders)
> Conflicts: `orderTransform.js` — Batch A CR-492 (expandCompItems, different area). `CollectPaymentPanel.jsx` — Batch A CR-492/CR-494 (comp/PIN, different blocks ~L2102-L2542 and ~L3502). `profileTransform.js` — no open edits.
> Rebase: Execute BUG-672 in its own commit. If Batch A Gate 3 plans for CR-492/CR-494 are implemented first, verify CPP and orderTransform lines haven't shifted.
> API Contract: `contracts/BATCH-B_BUG-672_API_CONTRACT_2026_11_15.md`

## 1. What changes
Three fixes:
1. **profileTransform** — keep `prepaid`/`postpaid` flags on payment types (currently dropped)
2. **CollectPaymentPanel** — hide Credit button when order is prepaid AND the TAB payment type has `prepaid: 0`
3. **orderTransform `placeOrderWithPayment`** — add TAB handling (mirror `collectBillExisting`): `credit→TAB` mapping, `payment_status: 'success'`, TAB contact fields (`name`, `mobile`, `crm_customer_id`)

## 2. Files changed

| # | File | Line at HEAD | What changes |
|---|------|-------------|--------------|
| E1 | `src/api/transforms/profileTransform.js` | L276-283 (`paymentTypes`) | Keep `prepaid` and `postpaid` flags in the mapped object |
| E2 | `src/components/order-entry/CollectPaymentPanel.jsx` | ~L106-113 (payment method filter area) | Use `isPrepaid` + type's `prepaid` flag to hide Credit when `prepaid: 0` |
| E3 | `src/api/transforms/orderTransform.js` | L1294-1296, L1391-1396 (`placeOrderWithPayment`) | Add TAB detection, `payment_status: 'success'`, TAB contact fields |

## 3. Exact edits

### E1 — profileTransform.js L276-283

**Before:**
```js
  paymentTypes: (apiTypes) => {
    if (!Array.isArray(apiTypes)) return [];
    return apiTypes.map((type) => ({
      id: type.id,
      name: type.name,
      displayName: type.display_name,
    }));
  },
```
**After:**
```js
  paymentTypes: (apiTypes) => {
    if (!Array.isArray(apiTypes)) return [];
    return apiTypes.map((type) => ({
      id: type.id,
      name: type.name,
      displayName: type.display_name,
      prepaid: type.prepaid ?? 1,   // BUG-672: keep prepaid flag (1=allowed, 0=hidden for prepaid orders)
      postpaid: type.postpaid ?? 1, // BUG-672: keep postpaid flag
    }));
  },
```

### E2 — CollectPaymentPanel.jsx (payment method filter)

Locate where payment methods are filtered for display (the layout/grid that shows Cash, Card, UPI, Credit buttons). This is the `filterLayoutByApiTypes` function or equivalent — grep for where `paymentTypes` meets the button grid.

Add a filter: when the order `isPrepaid` (prop already exists at CPP ~L53), hide any payment type whose `prepaid` flag is `0` (falsy).

**Conceptual edit:**
```js
// BUG-672: Hide payment methods not allowed for prepaid orders (e.g., Credit/TAB with prepaid:0)
const filteredMethods = isPrepaid
  ? availableMethods.filter(m => m.prepaid !== 0)
  : availableMethods;
```

**Implementation note:** The exact location depends on how `availableMethods` / `paymentLayout` is built. The implementer must:
1. Find where payment buttons are derived from `paymentTypes` (from profile)
2. Add the `isPrepaid` check against each type's `prepaid` flag
3. This hides Credit entirely when `TAB.prepaid === 0` on prepaid orders (OD-672-C: HIDDEN, not greyed)

### E3 — orderTransform.js `placeOrderWithPayment` L1294-1396

The `method` parameter can be `'credit'` (internal TAB ID). Currently the function sends:
- `payment_method: 'credit'` (L1391 area)
- `payment_status: 'paid'` (L1393)
- No TAB contact fields

**Add after L1296 (destructure paymentData):**
```js
    const { method = 'cash', transactionId = '', splitPayments = [], tip = 0, deliveryCharge = 0, discounts = {}, tabContact } = paymentData; // BUG-672: add tabContact
```

**Add TAB detection (after the existing destructure, before payload build):**
```js
    // BUG-672: Detect TAB payment (mirrors collectBillExisting L1539)
    const isTab = method === 'credit' || (typeof method === 'string' && method.toLowerCase() === 'tab');
```

**In the payload object (~L1391-1396 area), change:**

**Before:**
```js
      payment_method:             splitPayments?.length > 0 ? 'partial' : method,
      payment_status:             (typeof method === 'string' && method.toLowerCase() === 'paylater') ? 'sucess' : 'paid',
```

**After:**
```js
      payment_method:             splitPayments?.length > 0 ? 'partial' : (isTab ? 'TAB' : method), // BUG-672: credit→TAB
      payment_status:             (typeof method === 'string' && method.toLowerCase() === 'paylater') ? 'sucess' : (isTab ? 'success' : 'paid'), // BUG-672: TAB = 'success'
```

**Add TAB contact fields at the end of the payload (before the closing `}`):**
```js
      // BUG-672: TAB customer fields for credit ledger (mirrors collectBillExisting L1754-1757)
      ...(isTab ? {
        name:            tabContact?.name  || '',
        mobile:          tabContact?.phone || '',
        crm_customer_id: tabContact?.crmId || '',
      } : {}),
```

## 4. Test steps
| # | Steps | Expected |
|---|-------|----------|
| V1 | Restaurant with TAB `prepaid:0` → prepaid order → Collect Bill | Credit button HIDDEN |
| V2 | Restaurant with TAB `prepaid:1` → prepaid order → Collect Bill | Credit button visible |
| V3 | Postpaid order → Collect Bill | Credit button visible (unchanged) |
| V4 | QSR Place+Pay → select Credit → pay | Order saved with `payment_method: TAB`, `payment_status: success`, credit ledger entry created |
| V5 | Place+Pay Credit → check Credit Management | Customer appears with the correct amount |
| V6 | Place+Pay with cash/card/UPI | Unchanged behavior |
| V7 | Collect Bill (existing order) → TAB | Still works (collectBillExisting path untouched) |
| V8 | Regression: all payment methods on collect, settlement TAB bucket, Order Beta payment column | Correct |
| V9 | Webpack compile | 0 new warnings |

## 5. Rebase note
- **Batch A CR-492** edits CPP ~L2102-L2542 (comp checkboxes) and ~L3502 (Pay disabled). BUG-672 edits the payment method filter area (~L100-200 region or wherever `filterLayoutByApiTypes` is). No line overlap expected, but verify at implementation time.
- **Batch A CR-494** edits CPP (PIN verification). Same: different area, verify at implementation time.
- **profileTransform.js** — no other edits. Safe.
- **orderTransform.js** — CR-492 edits `expandCompItems` (~L636). BUG-672 edits `placeOrderWithPayment` (~L1294-1400). No overlap.

## 6. Scope lock
**WILL change:** profileTransform.js (L276-283), CollectPaymentPanel.jsx (payment filter area), orderTransform.js `placeOrderWithPayment` (L1296, L1391-1396, payload end)
**WILL NOT touch:** `collectBillExisting` (already works), credit services, reports transforms, MarkUnpaidConfirmDialog, any UI outside CPP payment buttons
