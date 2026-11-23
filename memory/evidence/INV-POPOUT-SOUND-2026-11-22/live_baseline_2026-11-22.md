# Live baseline — employee-orders-list (acct pms@macha.com, role Owner, rest 69)
Captured 2026-11-22 via authenticated GET /api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager
(token NOT stored here; held in /tmp only for this session)

14 running orders. Per-order order_from / f_order_status / items with food_status=7:

| id | bill | order_from | f_order_status | order_in | items | food7 | cust |
|----|------|-----------|----------------|----------|-------|-------|------|
| 1579105 | 000048 | web  | 1 | – | 1 | 0 | '' |
| 1579104 | 000047 | web  | 1 | – | 1 | 0 | '' |
| 1579103 | 000046 | web  | 2 | – | 1 | 0 | '' |
| 1579101 | 000045 | web  | 1 | – | 8 | 0 | '' |
| 1579085 | 000035 | pos  | 1 | – | 25 | 0 | '' |
| 1579078 | 000030 | pos  | 1 | – | 1 | 0 | saurav |
| 1579076 | 000028 | pos  | 5 | – | 1 | 0 | saurav |
| 1579075 | 000027 | pos  | 5 | – | 2 | 0 | koji |
| 1579074 | 000026 | pos  | 5 | – | 1 | 0 | saurav |
| 1579072 | 000024 | pos  | 5 | – | 2 | 0 | koji |
| 1579050 | 000020 | pos  | 1 | – | 1 | 0 | saurav |
| 1579042 | 000012 | **None** | 1 | **RM** | 2 | 0 | abishek |
| 1579041 | 000011 | **None** | 1 | **RM** | 2 | 0 | macha |
| 1578881 | 000004 | **None** | 1 | **RM** | 49 | 0 | abhishek |

## Findings vs hypotheses
1. **Non-room web orders DO carry `order_from='web'`** on the boot GET → `isWebOrder` resolves true for them. So the cold-boot pop-out failure is NOT universal to all web orders.
2. **Room orders return `order_from=None`** (`order_in='RM'`) → `isWebOrder=false` on GET. This is the BUG-701 gap; a room web-EDIT would fail both pop-out predicates after reload. Strong candidate for the owner's "edit order" case.
3. No order currently at `f_order_status=7` and no item `food_status=7` → nothing pending; pop-out correctly shows nothing now. Need the owner's live EDIT order to capture a real `food_status=7` appended line.

## Next capture (on owner's live first-edit order)
- Re-GET employee-orders-list; find the edited order; record: order_from, f_order_status, each appended item food_status (expect 7 for the web-edit line).
- Cross-check POST single-order-new {order_id} (socket path) for the same order → compare order_from + item food_status vs the list GET.
- Confirm whether the edited order is a room (order_in='RM' → order_from=None) or table web order.
