# Impact Analysis — BUG-270: Update Order Missing Customer Fields

**ID:** BUG-270
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-28
**Code Reality:** NONE (fix not started)
**Conflict Pre-Check:** BUG-138, BUG-144, CR-098 also touch `orderTransform.js` but different sections (discount/token/shortcode). No line conflict.
**Risk:** LOW

---

## Data Flow Trace

```
CollectPaymentPanel → customer object (name, phone, id)
  → orderService.updatePlaceOrder(payload)
    → toAPI.updateOrder() at orderTransform.js:1128
      → payload.cust_name = customer?.name     ← ONLY THIS
      → MISSING: cust_mobile, cust_membership_id
  → POST /api/v2/vendoremployee/order/update-place-order
```

Compare `placeOrder` (L995-1005): sends `cust_name`, `cust_mobile`, `cust_email`, `cust_dob`, `cust_anniversary`, `cust_membership_id`.

Compare `cancelAndUpdateOrder` (L1286-1291): sends `cust_name`, `cust_mobile`, `cust_membership_id` — already correct.

## Affected Files
- `orderTransform.js` L1131 — add 2 keys after `cust_name`

## Downstream Consumers
- Backend `update-place-order` endpoint — now requires these fields
- CRM integration may depend on `cust_membership_id` for customer tracking

## OWNER QUESTIONS

1. Should `cust_email`, `cust_dob`, `cust_anniversary` also be sent on update (matching placeOrder parity)? Or strictly only the 3 requested keys?
2. Is the `customer` object always available during update-order? (It comes from OrderEntry state — need to confirm it persists after initial place.)
3. The existing test `updateOrderPayload.test.js:334` asserts `expect(payload).not.toHaveProperty('cust_mobile')` — this test will BREAK. Confirm we should update the test to expect the new fields?

---
