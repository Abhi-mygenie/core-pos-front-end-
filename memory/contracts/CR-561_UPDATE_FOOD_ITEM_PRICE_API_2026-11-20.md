# CR-561 — Update Food Item Price API (TBD / APS ₹1 items)

Backend DELIVERED 2026-11-20. Unblocks CR-561 (APS ₹1 price not enterable from Accept pop-up / web-order edit). Sets the final price of items ordered at placeholder price **1** ("TBD" / APS). One call updates one or more items of the same order; order total is recalculated (tax, discount, service charge, round-off).

## Endpoint
```
PUT /api/v2/vendoremployee/order/update-food-item-price
```
Auth: vendor employee token (same as other `vendoremployee/order/*` APIs).

## IDs — from GET /api/v1/vendoremployee/pos/employee-orders-list
| Request field | Take from |
|---|---|
| `order_id` | `orders[].id` (e.g. 1579050) |
| `items[].item_id` | `orders[].orderDetails[].id` (e.g. 3969979) — the per-line id |

## Request body
```json
{
  "order_id": 1579050,
  "items": [
    { "item_id": 3969979, "unit_price": 450 },
    { "item_id": 3969985, "unit_price": 380 }
  ]
}
```
| Field | Type | Req | Description |
|---|---|---|---|
| order_id | int | Yes | Order ID |
| items[].item_id | int | Yes | `orderDetails[].id` of the row (no duplicates). Always row id, never food_id |
| items[].unit_price | number | Yes | Final price for 1 unit (>0). Line total = unit_price × quantity |

Same food in several rows → send each row's `orderDetails[].id` with its own `unit_price`; rows priced independently.

## Success response
```json
{ "success": true, "message": "Item price updated successfully",
  "data": { "order_amount": 830, "subtotal": 830, "tax": 0,
    "items": [
      { "id": 3969979, "food_id": 248252, "name": "melo fish", "quantity": 1, "unit_price": 450, "price": 450, "tax_amount": 0 },
      { "id": 3969985, "food_id": 248252, "name": "melo fish", "quantity": 1, "unit_price": 380, "price": 380, "tax_amount": 0 }
    ] } }
```
`items[].price` = line total. Use `data.order_amount` as the new bill total.

## Errors (all-or-nothing — if any item fails, none are updated)
| Message | Cause |
|---|---|
| Price can be changed only for TBD (price 1) items: <name> | food's menu price is not 1 |
| Item <id> not found in this order | item_id not in order_id |
| Item <name> is already cancelled | line cancelled |
| Order is already paid | payment status = paid |
| Order is cancelled | whole order cancelled |
| No query results for model ... | order_id not found for restaurant |
| Validation message | missing/invalid field (e.g. unit_price ≤ 0) |

## Notes
- Re-calling on the same item overwrites its price (use to correct mistakes).
- POS/KDS refresh via socket `update-order-status`. **No KOT printed.**

## FE wiring (CR-561)
- `PopoutItemRow.jsx` L118: replace the "Price TBD" display with a price input for APS/TBD rows (pre-bill only).
- `ScanOrderPopOut.jsx`: collect edited prices, submit on Accept/update.
- `OrderEntry.jsx` L850 / L880-928 / L3038-3101: same for the OE edit path.
- Add a service method in `api/` (constants `UPDATE_FOOD_ITEM_PRICE = '/api/v2/vendoremployee/order/update-food-item-price'`), map response `data.order_amount` into the bill total.
- Guard entry to unpaid, non-cancelled orders (endpoint enforces too). OD-561-B interim pre-bill guard is SUPERSEDED — full edit on placed lines is now supported.
