# BUG-577 — Intake (Gate 1)
## Cancelled items appearing on print bill

**ID:** BUG-577 · **Type:** BUG · **Date:** 2026-10-16
**Severity:** P1 · **Risk:** MEDIUM · **Sprint:** nov_cr_batch
**Area:** Printing / Printer Agent
**Duplicate check:** DISTINCT — `buildBillPrintPayload` cancel filter was added (2026-05-01) but issue persists.
**Source:** OWNER-REPORTED (smoke test 2026-10-16)

## Description
When printing a bill, cancelled order items still appear on the printed bill. They should be excluded. This is confusing for customers who see items they didn't receive/pay for.

## Code Reality: PARTIAL (filter exists but may miss cases)
`orderTransform.js:L1847-1851` — `isDetailCancelled` filter IS applied. Checks:
- `Number(d.food_status) === 3`
- `d.cancel_at != null`  
- `d.cancel_type != null`

**Possible gap:** Some cancelled items (partial cancel, item-level cancel) may not have these markers set by backend. OR: the issue occurs on a different print path (aggregator print, which may bypass `buildBillPrintPayload`).

## Blast Radius: MEDIUM
- `orderTransform.js` — possibly extend isDetailCancelled criteria
- May need backend brief if cancel markers are not reliably set

## Open Decisions
**OD-577-01:** Which print path shows cancelled items — manual dashboard reprint, auto-bill, or aggregator? Need owner to reproduce and identify.
**OD-577-02:** Are cancelled items in `rawOrderDetails` reliably having `food_status=3` or `cancel_at` set?
