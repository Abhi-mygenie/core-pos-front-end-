# BACKEND_BRIEF_ROOM_DISCOUNT_CONSTRAINT_2026-10-05

## Summary
- Issue: ANY settlement attempt on room orders returns HTTP 500 with DB constraint violation on `restaurant_discount_amount`
- Classification: BACKEND_BUG / DATA_ISSUE
- Frontend impact: Room checkout settle will fail — FE cannot settle room orders until backend fixes the NOT NULL constraint on `restaurant_discount_amount`
- Priority/Risk: P0 / CRITICAL (blocks entire room checkout feature)

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/order/order-bill-payment`
- Auth/context: Bearer token (owner@thegoankitchen.com, RID 69 test orders)

## Reproduction

### Case A — Minimal settle (no discount fields)
```bash
curl -X POST https://preprod.mygenie.online/api/v2/vendoremployee/order/order-bill-payment \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "1232917",
    "payment_mode": "cash",
    "payment_amount": 0,
    "payment_status": "paid"
  }'
```
→ HTTP 500: `SQLSTATE[23000]: Integrity constraint violation: 1048 Column 'restaurant_discount_amount' cannot be null`

### Case B — apply_to=food + room_discount=100
```bash
curl -X POST https://preprod.mygenie.online/api/v2/vendoremployee/order/order-bill-payment \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "1232917",
    "payment_mode": "cash",
    "payment_amount": 228,
    "payment_status": "paid",
    "paid_room": "yes",
    "room_discount": 100,
    "room_discount_apply_to": "food"
  }'
```
→ HTTP 500: Same constraint error (422 validation skipped correctly for `apply_to=food`)

## Payload / Response
- Actual response: `{"error": "SQLSTATE[23000]: Integrity constraint violation: 1048 Column 'restaurant_discount_amount' cannot be null (SQL: update orders set employee_id = 5117, order_status = delivered, ..."}`
- Expected: HTTP 200 (settle succeeds, UID balance updated)

## Evidence
- Curl output: inline above (INV_ROOM_DISCOUNT_CHECKIN_CHECKOUT_PARTIAL_2026_10_05.md probes P-11, P-13)
- Reference proof: handover_5 §10 shows order 1232913 settled with no room-discount fields → 200 (pre-constraint migration state)
- Order 1232917 verified intact after failed probes (balance_payment: 750.00, status: unpaid/queue)

## Context
- handover_5 §2 says FE should omit room discount fields when no discount → BE should treat as zero/null
- The `orders` table `restaurant_discount_amount` column appears to have a NOT NULL constraint that was not enforced on earlier test orders (1232913)
- The `apply_to=food` path passes FE validation correctly (no 422) but the BE handler doesn't set `restaurant_discount_amount` before the DB update

## Ask for Backend
1. Make `restaurant_discount_amount` nullable OR add a `DEFAULT 0` so missing discount fields don't violate the constraint
2. For `apply_to=food` path: ensure `restaurant_discount_amount` is populated (= food discount ₹ or 0)
3. Confirm the fix is deployed on preprod before FE implementation begins

## Frontend Workaround
- Available: NO (cannot workaround a DB constraint from FE side)
- Note: FE could always send `order_discount=0` explicitly but that may not satisfy the `restaurant_discount_amount` column (different DB field)
