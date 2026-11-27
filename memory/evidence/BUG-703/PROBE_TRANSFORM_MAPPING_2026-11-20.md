# BUG-703 / BUG-742 / CR-561 — Live read-only probe (transform mapping) — 2026-11-20

**Account:** owner@thegoankitchen.com (preprod) · **Role:** Owner · token masked (***)
**Endpoints (GET, read-only):** `/api/v1/auth/.../common-login` (200), `pos/employee-orders-list?role_name=Owner` (200, 0 running orders), `urbanpiper/get-order-list` (200, 1 aggregator order)
**Order:** restaurant_order_id `69/000007` · urban_order_id `2742935` · aggrator_ref_id `535678589` (matches dashboard `#IXAV2…` card)

## Aggregator transform mapping — VERIFIED against live response (`aggregatorTransform.fromAPI.order`)
| Live API field | value | → transform field | code |
|---|---|---|---|
| order_details_order (obj) | present | `od` | :17 ✓ |
| order_details_food (list) | 1 item | `foods` | :18 ✓ |
| customer_details.name | "Test Customer" | `customerName` | :19 ✓ |
| brand_name (top-level) | None | `brandName` | :34 ✓ |
| od.restaurant_order_id | 69/000007 | `orderNumber` | :35 ✓ |
| od.order_amount | 115.5 | `amount` Number() | :54 ✓ |
| od.order_type | delivery | order type | ✓ |
| od.f_order_status | 2 | status | ✓ |
| food.unit_price | 100.00 | `unitPrice` (||price) | :108 ✓ |
| food.station | KDS | `station` (||null) | :133 ✓ |
| food.item_type | KDS | item type | ✓ |
| food.food_status | 2 | food status | ✓ |
| rider_info | present | `rider` | :20 ✓ |

## Findings relevant to the batch
- **BUG-703:** aggregator order data maps correctly end-to-end → the no-op is purely the missing `onAggregatorView` wiring in the channel layout, NOT a data/transform problem. IA confirmed.
- **BUG-742:** backend food/product records DO carry `station` (="KDS") and `item_type` (="KDS"). This raises confidence the backend assigns a station — BUT the decisive check (does the `add-single-product` RESPONSE include `station`) is a WRITE call and was NOT performed in this read-only probe. Still a Gate-3 verification / possible BACKEND_BRIEF.
- **CR-561:** no ₹1 APS item present on this account's live orders, so APS-on-loaded-order (Gap B) not live-verified; `isAps = unit===1` logic is deterministic in code.
- Customer PII (phone/address) intentionally omitted/masked per v0.7 security rule.
