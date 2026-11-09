# BACKEND_BRIEF_BUG-659_2026-11-08

## Summary
- **Issue:** Bill reprint from dashboard/order-entry omits `discount_percentage`, `roundoff`, and `discount_amount` — printed bill shows ₹0 discount on orders that had 50% off
- **Classification:** CONTRACT_MISMATCH
- **Frontend impact:** Manual "Print Bill" button on dashboard OrderCard, TableCard, and order-entry RePrintButton produces incorrect printed bills — discount and roundoff missing/zeroed
- **Priority/Risk:** P0 / CRITICAL (money wrong on customer-facing printed bills)

---

## Context

The FE bill-reprint payload is built by `buildBillPrintPayload()` in `orderTransform.js`. It has two paths:

1. **Auto-print (at payment time):** Uses live in-memory data from CollectPaymentPanel — discount, roundoff, percentage are all computed FE-side and passed as overrides. **Works correctly.**

2. **Manual reprint (from dashboard/order-entry):** Has no live payment data. Reads stored order fields from the order object in memory. This object comes from two backend data sources:
   - **`employee-orders-list`** API (initial dashboard load)
   - **Socket event payloads** (`update-order`, `update-order-paid`, etc.)

The FE (BUG-659, implemented 2026-11-08) already maps `discount_type`, `round_up`, and `discount_value` from the API response into the order object and uses them as fallbacks in the print payload builder. **But these fields are null in both `employee-orders-list` and socket payloads**, so the fallbacks never fire.

The same fields ARE correctly returned by `get-single-order-new` (after the backend fix on 2026-11-07). Report-page reprints call that endpoint and work. Dashboard reprints use the running-orders data and don't.

---

## Endpoint

### Source 1: Running Orders List
- **Method:** GET
- **URL:** `/api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager`
- **Auth:** Bearer token (vendor employee)

### Source 2: Socket Events
- **Channel:** `new_order_{restaurantId}`
- **Events:** `update-order`, `update-order-target`, `update-order-source`, `update-order-paid`
- **Payload format:** `[eventName, orderId, restaurantId, fOrderStatus, { orders: [...] }]`

---

## What's Missing

### Fields needed in `employee-orders-list` response (per order):

| Field | Currently | Needed | Already in `get-single-order-new`? |
|-------|-----------|--------|:---:|
| `discount_type` | `null` | `"Percent"` or `"Amount"` or `null` | ✅ Yes (post-fix) |
| `round_up` | `null` | `"0.49"` (string, same as get-single-order-new) | ✅ Yes (post-fix) |
| `restaurant_discount_amount` | ✅ Already present for settled orders | Confirm present on `update-order-paid` socket | ✅ Yes |

### Fields needed in socket event payloads (`orders[0]` object):

Same 3 fields. The socket `update-order-paid` event fires after payment — this is the moment discount and roundoff are finalized. If the payload includes these fields, the FE order context updates immediately and the next reprint will have correct data.

---

## Reproduction

1. Login as `owner@ruby.com` on Ruby ZAP (RID 672) at `preprod.mygenie.online`
2. Place a dine-in order with 2+ items (e.g. food 1 ₹123.81 + food 2 ₹114.29 + packed ccc ₹34)
3. Open Collect Bill → apply 50% discount → Pay with Cash
4. Auto-print fires → **bill is correct** (discount ₹136.05, 50%, roundoff 0.70)
5. Click "Re-Print" or "Print Bill" on the dashboard OrderCard
6. Manual reprint fires → **bill is wrong** (discount ₹0, no percentage, no roundoff)

**Order reference:** #000660 (order_id 1537880), Restaurant Ruby ZAP (RID 672)

---

## Payload / Response

### `employee-orders-list` response for order 1537857 (probe 2026-11-07):

```json
{
  "restaurant_discount_amount": 119.05,
  "discount_value": "50.00",
  "discount_type": null,          ← MISSING — need "Percent"
  "round_up": null,               ← MISSING — need "0.49"
  "order_discount": "119.05",
  "order_amount": 138.01,
  "gst_tax": 5.96
}
```

### `get-single-order-new` response for same order (post-fix):

```json
{
  "restaurant_discount_amount": 119.05,
  "discount_value": "50.00",
  "discount_type": "Percent",     ← PRESENT ✅
  "order_discount_type": "Percent",
  "round_up": "0.49",            ← PRESENT ✅
  "order_discount": "119.05",
  "order_amount": 138.01,
  "gst_tax": "6.56"
}
```

### Evidence files:
- Request/response probe: `/app/memory/evidence/BUG-659/employee_orders_list_vs_get_single_order_probe.json`
- Post-fix verification: `/app/memory/evidence/BUG-659/post_fix_verification_2026_11_07.json`
- Owner payload comparison: `/app/memory/evidence/BUG-659/owner_payload_comparison_1537880.json`

---

## Expected vs Actual

### `employee-orders-list` per-order object:

| Field | Expected | Actual |
|-------|----------|--------|
| `discount_type` | `"Percent"` or `"Amount"` or `null` (same as `get-single-order-new`) | `null` always |
| `round_up` | `"0.49"` (string, the backend-stored round-up value) | `null` always |
| `restaurant_discount_amount` | `119.05` (already works for settled orders) | ✅ Present |

### Socket `update-order-paid` payload `orders[0]`:

| Field | Expected | Actual (suspected) |
|-------|----------|--------------------|
| `discount_type` | `"Percent"` or `"Amount"` | `null` or absent |
| `round_up` | `"0.49"` | `null` or absent |
| `restaurant_discount_amount` | `119.05` | Possibly `null` (owner's order 1537880 shows `discount_amount: 0` on immediate reprint after payment) |

---

## Frontend Workaround
- **Available:** PARTIAL
- **Details:** FE (BUG-659) already maps these 3 fields in `fromAPI.order` and uses them as fallbacks in the print payload builder. The mapping works correctly when data comes from `get-single-order-new` (report reprints). Once backend adds these fields to `employee-orders-list` + socket payloads, dashboard reprints will work automatically with **zero additional FE changes**.

---

## Questions for Backend

| # | Question |
|---|----------|
| Q1 | Can `discount_type` and `round_up` be added to the `employee-orders-list` response? These are already computed and stored — they just need to be included in the SELECT/serialization. |
| Q2 | Can `discount_type`, `round_up`, and `restaurant_discount_amount` be included in the socket `update-order-paid` event payload? This is the event that fires after payment finalizes the discount. |
| Q3 | Is `restaurant_discount_amount` currently included in socket `update-order-paid` payloads? (Owner evidence suggests it may be 0/null immediately after payment — need confirmation.) |
| Q4 | The field `order_discount_type` is returned by `get-single-order-new` alongside `discount_type` — are they the same? Should both be in `employee-orders-list` or just one? FE reads `discount_type || order_discount_type` so either works. |
