# BUG-368 INTAKE — Split Bill Reprint Fails After Settlement
**Date:** 2026-09-01 | **Priority:** P1 | **Risk:** HIGH | **Severity:** MAJOR | **Status:** INTAKE

## Description
After a bill is settled via Split Bill by Payment, the Reprint button in the Order Report (Beta) shows for the settled row but fails — either showing "Order details unavailable" toast or silently failing.

## Code Reality: PARTIAL
`handleReprint` exists at `OrderReportBetaPage.jsx:299`. It calls `SINGLE_ORDER_NEW` with `order_id` and tries multiple response paths:
```js
response.data.orders.order_details_order   // path 1
response.data.order_details_order           // path 2
response.data.orders[0]                     // path 3 — split bill may return array of sub-orders
response.data.orders                        // path 4
```
If none produce `rawOrderDetails`, toast fires: "Order details unavailable".

**HYPOTHESIS:** Split-settled orders return a different API response shape where the split sub-order IDs don't map to the main order detail path. **Needs API probe before planning.**

## Duplicate Check: DISTINCT
## Blast Radius: SMALL (1 file — OrderReportBetaPage.jsx)
## Next: PENDING — owner providing a split-settled order ID for API probe. Will curl-probe SINGLE_ORDER_NEW once received.
