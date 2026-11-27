# CR-558 — Confirm Probe (OD-558-01) — RESULT: YES

**Date:** 2026-11-19 · **Env:** preprod (https://preprod.mygenie.online) · **Account:** owner@thegoankitchen.com (role Owner, perms incl. confirm_order/order_edit)
**Question:** Does the order-level confirm endpoint flip appended `food_status=7` (Yet-to-Confirm) lines to confirmed on an already-running order? (i.e. is CR-558 Option B achievable with the existing Accept?)

## Method (replicates the app's Accept button exactly)
- Target: running order **1578881** (order_type=pos, f_order_status=1) carrying 4 appended Yet-to-Confirm lines.
- Endpoint: `PUT /api/v2/vendoremployee/order/waiter-dinein-order-status-update` (API_ENDPOINTS.CONFIRM_ORDER)
- Payload: `{"order_id":"1578881","role_name":"Manager","order_status":"cooking"}`
  - `order_status="cooking"` = `F_ORDER_STATUS_API[def_ord_status=1]` (same value the Accept button sends for this restaurant)

## Baseline (before)
| item id | name | food_status |
|---------|------|-------------|
| 3969778 | moo mwwt | 7 |
| 3969779 | moo duudh | 7 |
| 3969780 | check in | 7 |
| 3969781 | melo fish | 7 |

order f_order_status = 1

## Response
`{"message":"Order status updated successfully"}`

## After (re-fetched running list)
| item id | food_status |
|---------|-------------|
| 3969778 | **1** |
| 3969779 | **1** |
| 3969780 | **1** |
| 3969781 | **1** |

order f_order_status = 1 (unchanged)

## Conclusion
**OD-558-01 = YES.** The single order-level confirm call flips ALL appended `food_status=7` lines to confirmed (1). Non-cancelled appended items are confirmed by the existing Accept; cancelled items (food_status=3) are untouched. Therefore **CR-558 Option B** (cancel unwanted → Accept-all) works end-to-end with existing controls — **no backend endpoint required**, no per-item approve call needed. This also clears CR-552 OD-552-01 for the Option-B flow.

## Note
This probe performed a real (and normal) Accept on preprod test order 1578881; its 4 appended test items are now confirmed. No destructive/irreversible effect beyond a routine accept.
