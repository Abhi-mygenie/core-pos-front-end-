# BACKEND_BRIEF_BUG-592_CR-513_2026-11-06

## Summary
- **Issue:** `get-single-order-new` returns an order WITHOUT any discount or round-off fields, while `employee-orders-list` and `order-logs-report` return them for the same order. Frontend screens that load an order through `get-single-order-new` therefore see the discount as ₹0.
- **Classification:** CONTRACT_MISMATCH (same order, different field set per endpoint)
- **Frontend impact:** a bill reprinted from Reports (Audit, Order Report Beta, Order Detail) prints **no discount** on a discounted order. The same happens on the dashboard in the few cases listed below.
- **Priority/Risk:** P1 · CRITICAL (customer-facing printed bill amount)
- **Related:** BUG-592, CR-513

## Endpoints
| Endpoint | Method | Used by POS for |
|---|---|---|
| `/api/v2/vendoremployee/get-single-order-new` | POST `{ order_id }` | Reports reprint / view, Collect Bill from report, split-bill new order, legacy `update-food-status` socket fallback, delivery-assign fallback, PMS |
| `/api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager` | GET | Dashboard load (reference — correct) |
| `/api/v2/vendoremployee/report/order-logs-report` | POST | Reports list (reference — correct) |

Auth/context: Bearer *** · restaurant cafe103 (manager login)

## Reproduction
1. Place a prepaid order with a % discount, e.g. **#021113 (id 1537795)**: 30% on ₹2,100.
2. Call `employee-orders-list` (role_name=Manager) → the discount fields are present.
3. Call `get-single-order-new` with `{ "order_id": 1537795 }` → the discount fields are **missing**.

## Payload / Response
Evidence: `/app/memory/evidence/CR-513/CR-513_BUG-592_backend_reprobe_021113_2026_11_06.json` and `/app/memory/evidence/CR-513/CR-513_order_source_field_probe_2026_11_06.json`

| Field | employee-orders-list | order-logs-report | **get-single-order-new** |
|---|---|---|---|
| `restaurant_discount_amount` | 630 | 630 | **missing** |
| `discount_value` | 30.00 | 30.00 | **missing** |
| `order_discount` | 630.00 | 630.00 | **missing** |
| `order_discount_type` | missing | Percent | **missing** |
| `round_up` | missing | 0.50 | **missing** |
| `order_amount` | 1544 | 1544 | 1544 |

Second order, a paid 10% discount: **id 1537042**. It shows the same pattern (`order-logs-report` has `discount_value=10`, `order_discount_type=Percent`, `restaurant_discount_amount=41`, `round_up=0.55`; `get-single-order-new` has none of them).

- **Expected:** `get-single-order-new` returns `restaurant_discount_amount`, `discount_value`, `order_discount`, `order_discount_type`, `round_up`, with the same values as `order-logs-report`.
- **Actual:** none of these five keys are in the response (only `room_discount`).

## Questions for backend
1. Please add the five fields above to `get-single-order-new` (additive; no existing key changes).
2. Please also add `order_discount_type` and `round_up` to `employee-orders-list`. They are missing there today.
3. **Socket payloads:** the dashboard uses the order inside these socket messages directly, with no API call: `new-order`, `update-order`, `update-order-target`, `update-order-source`, `update-order-paid`, `update-item-status`, `update-order-status`, `split-order`, `delivery-assign-order`. Please confirm `payload.orders[0]` in each of them carries `restaurant_discount_amount` (and ideally `discount_value`, `order_discount_type`, `round_up`). The POS replaces the whole order with this payload, so a missing field shows as ₹0.
4. Is the legacy `update-food-status` event (no payload) still emitted? When does it fire without a matching v2 event? Today the POS falls back to `get-single-order-new` for it.

## Evidence
- Curl output: the two evidence files above (token masked)
- Owner-placed test orders: #021113 (30%, prepaid), #021114 (30%, prepaid, id 1537796)

## Frontend Workaround
- Available: PARTIAL. On the dashboard, the POS could keep the last known discount when an update arrives without it. There is no workaround for Reports reprints, because that screen only has `get-single-order-new`.
- Planned: no workaround until the backend replies. The fix is tracked under CR-513 / BUG-592 (Gate 2).
