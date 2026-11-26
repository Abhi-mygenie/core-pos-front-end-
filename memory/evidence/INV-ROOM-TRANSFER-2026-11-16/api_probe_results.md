# API Probe Results — order-shifted-room v1 vs v2

**Date:** 2026-11-16
**Auth:** owner@ruby.com (regular login token, RID 672 Ruby ZAP)

---

## V1 — POST /api/v1/vendoremployee/order/order-shifted-room
**Payload sent:** `{"source_order_id":"999999","target_order_id":"999998","transfer_note":"Yes"}`
**HTTP Status:** 404
**Response:** `{"message":"Target order not found"}`
**Analysis:** Auth PASSED. V1 accepts the {source_order_id, target_order_id, transfer_note} contract.
It validated the payload and looked up target_order_id=999998 (didn't exist → 404).
This is the CURRENT FE contract (CR-405-B).

## V2 — POST /api/v2/vendoremployee/order/order-shifted-room

### Probe A: V1-shaped payload
**Payload sent:** `{"source_order_id":"999999","target_order_id":"999998","transfer_note":"Yes"}`
**HTTP Status:** 403
**Response:** `{"error":[{"code":"order_id","message":"The order id field is required."},{"code":"payment_mode","message":"The payment mode field is required."},{"code":"payment_amount","message":"The payment amount field is required."},{"code":"payment_status","message":"The payment status field is required."},{"code":"room_id","message":"The room id field is required."}]}`
**Analysis:** V2 REJECTS the v1 contract. Requires completely different fields.

### Probe B: V2 contract (order_id + payment_mode + room_id, missing amount/status)
**Payload sent:** `{"order_id":"999999","payment_mode":"ROOM","room_id":"1"}`
**HTTP Status:** 403
**Response:** `{"error":[{"code":"payment_amount","message":"The payment amount field is required."},{"code":"payment_status","message":"The payment status field is required."}]}`
**Analysis:** V2 accepted order_id + payment_mode + room_id, only asks for payment_amount + payment_status.

## V2 Full Required Contract (derived from validation errors):
```json
{
  "order_id": "<dine-in/walkin order ID>",
  "payment_mode": "ROOM",
  "payment_amount": "<order total>",
  "payment_status": "<unpaid/paid?>",
  "room_id": "<destination room ID>"
}
```

## V1 Contract (current FE):
```json
{
  "source_order_id": "<room order ID that receives items>",
  "target_order_id": "<dine-in order ID that loses items>",
  "transfer_note": "Yes"
}
```
