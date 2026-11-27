# BACKEND_BRIEF_CR-410_LOYALTY_KEY_2026_10_11

## Summary
- **Issue:** POS cannot pre-initialize the loyalty discount in Collect Payment for scan & order (web/QR) orders where the customer redeemed loyalty points during self-ordering
- **Classification:** CONTRACT_MISMATCH / DATA_ISSUE
- **Frontend impact:** Loyalty discount applied by the customer in scan & order is invisible to the POS cashier. CPP opens with `useLoyalty=false`, `loyaltyDiscount=0`. Cashier either overcharges the customer or has to manually reconcile.
- **Priority/Risk:** P1 / CRITICAL
- **FE CR:** CR-410

---

## Current State

The `employee-orders-list` API returns a `loyalty_info` object on orders:

```json
"loyalty_info": {
  "earned": true,
  "redeemed": false,
  "redeemed_amount": 0,
  "applied_at": "2026-10-11 13:52:11",
  "order_sub_total": 1379
}
```

This field is **not sufficient** for the POS to pre-initialize the loyalty state in Collect Payment. Specifically:
1. `redeemed_amount` is present but is not exposed in the socket payload (`scan-new-order` full payload or `update-order`)
2. There is no `loyalty_redemption_id` — without this, the CRM cannot reconcile the redemption if the cashier removes and re-applies loyalty at POS

---

## What Frontend Needs

A dedicated loyalty redemption field on the order payload — available in **both**:
- `employee-orders-list` response (`orders[]` items)
- `scan-new-order` socket full payload (`rawPayload.orders[0]`)

**Requested fields (one of the following approaches):**

### Option A — Flat fields on order root:
```json
{
  "loyalty_redeemed_amount": 108,
  "loyalty_redemption_id": "CRM-TXN-XXXXX",
  "loyalty_points_redeemed": 1080
}
```

### Option B — Extend existing `loyalty_info`:
```json
"loyalty_info": {
  "earned": true,
  "redeemed": true,
  "redeemed_amount": 108,
  "redemption_id": "CRM-TXN-XXXXX",
  "points_redeemed": 1080,
  "applied_at": "...",
  "order_sub_total": 1379
}
```

**Minimum viable:** `redeemed_amount` (₹ value) in the socket payload. `redemption_id` and `points_redeemed` are needed for full reconciliation but can come in a follow-up if needed.

---

## Endpoint

- **List:** `GET /api/v1/vendoremployee/pos/employee-orders-list`
- **Socket:** `scan-new-order` event full payload (`orders[0]`)
- **Auth/context:** Bearer token, RID 689 tested

---

## Reproduction

1. Customer places scan & order (web/QR) and redeems loyalty at checkout
2. Order arrives at POS cashier via socket
3. Cashier opens Collect Payment → Loyalty section shows "0 pts" / unchecked
4. Actual order total is lower (customer already redeemed loyalty) but POS shows full amount

**Live example:** Order 1233112 (Kunafa Mahal, RID 689, 2026-10-11) — `loyalty_info.earned=true, redeemed=false, redeemed_amount=0` (this order had no redemption; need a test order with `redeemed=true` to fully validate)

---

## Evidence
- `/app/memory/evidence/BUG-SCAN-COUPON-INV-OCT11/order_1233112_raw.json`
- `/app/memory/evidence/BUG-SCAN-COUPON-INV-OCT11/step1_findings.json`

---

## Frontend Workaround
- **Available:** NO — CPP has no path to initialize loyalty from existing order; the field is missing entirely from the socket/transform chain
- CR-410 implementation is **BLOCKED** until backend ships the new field
