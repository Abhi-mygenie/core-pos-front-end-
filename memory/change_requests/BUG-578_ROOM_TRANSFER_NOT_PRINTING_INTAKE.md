# BUG-578 — Intake (Gate 1)
## Room bill print — transferred dine-in/walk-in orders not appearing

**ID:** BUG-578 · **Type:** BUG · **Date:** 2026-10-16
**Severity:** P1 · **Risk:** MEDIUM · **Sprint:** nov_cr_batch
**Area:** Printing / Printer Agent
**Duplicate check:** DISTINCT
**Source:** OWNER-REPORTED (smoke test 2026-10-16)

## Description
When printing the bill for a room order that has dine-in/walk-in orders transferred into it ("Transfer to Room" feature), the transferred orders are NOT appearing on the printed bill. Only the room's own charges show.

## Code Reality: PARTIAL
`orderTransform.js:L2091-2178` — frontend builds `associatedOrdersForPrint` from `order.associatedOrders` and includes it as `associated_orders[]` in the bill print payload. This field is sourced from `api.associated_order_list` (L347-350).

**Possible gaps:**
1. Backend doesn't return `associated_order_list` on the running-orders API response
2. Printer agent template doesn't render `associated_orders[]` entries
3. `isRoomPrint` flag not set, causing the block to be skipped

## Blast Radius: MEDIUM (may be backend + printer template)
- `orderTransform.js` — check `isRoomPrint` logic
- Backend may need to return `associated_order_list`
- Printer agent template may need to handle `associated_orders[]`

## Open Decisions
**OD-578-01:** Is `associated_order_list` populated in the running-orders API response for room orders with transfers? Backend probe needed.
