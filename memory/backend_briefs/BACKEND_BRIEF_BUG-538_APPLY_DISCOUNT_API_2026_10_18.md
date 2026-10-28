# BACKEND_BRIEF_BUG-538_APPLY_DISCOUNT_API_2026_10_18

## Summary
- **Issue:** No API endpoint exists to save a discount to an existing order before payment collection.
- **Classification:** BACKEND_NEW_ENDPOINT
- **Frontend impact:** Apply button in Collect Payment cannot function without this endpoint. Owner cannot apply role-based discount for cashier to collect.
- **Priority/Risk:** P1 / CRITICAL

---

## Context

When `roleBaseDiscount = true` in restaurant settings, only staff with the `discount` permission can apply discounts. The flow is:

1. Owner (has `discount` permission) opens running order on their device
2. Owner selects discount type + value, clicks **Apply**
3. FE calls this endpoint → `order_discount_json` record created on backend
4. Backend broadcasts socket update with new `order_discount_json` on the order
5. Cashier's device receives socket update → bill recalculates with discount
6. Cashier collects payment at post-discount total

The `order_discount_json` field is already returned in `employee-orders-list` and socket payloads (confirmed via API response 2026-10-18). The missing piece is the endpoint to CREATE/UPDATE this record.

---

## Endpoint Needed

```
Method: POST
URL: /api/v1/vendoremployee/pos/apply-order-discount  (confirm exact path)

Request body:
{
  "order_id": 1233285,
  "discount": 23,
  "discount_type": "percent",     // "percent" | "flat"
  "discount_note": null           // optional string
}

Expected success response:
{
  "order_discount_json": {
    "id": 299,
    "order_id": 1233285,
    "discount": 23,
    "discount_type": "percent",
    "discount_note": null,
    "created_at": "...",
    "updated_at": "..."
  }
}

Expected side effect:
  Socket broadcast to all devices subscribed to this order's restaurant
  Updated order payload must include order_discount_json
```

---

## Questions for Backend

**B1:** What is the exact endpoint URL?

**B2:** Is it POST (create) or PUT/PATCH (update if exists)? Can the owner re-apply a different discount on the same order?

**B3:** Does the socket broadcast automatically after this call, or does the FE need to trigger a separate refresh?

**B4:** Is there a remove/cancel discount endpoint (for owner to undo a discount before payment)?

**B5:** Does applying a discount via this endpoint update `order_discount`, `discount_value`, or `restaurant_discount_amount` on the order record itself, or only `order_discount_json`?

---

## Evidence

- `order_discount_json` confirmed present in `employee-orders-list` response (2026-10-18 screenshot, order 1233285)
- `order_discount_json.discount = 23`, `discount_type = "percent"` confirmed shape

---

## Frontend Workaround
- Available: NO — the Apply button cannot save to backend without this endpoint.
- Gate 3 is blocked until B1–B3 are answered.
