# BUG-579 — Intake (Gate 1)
## Cancellation report — cancelled item/order values (₹) not displaying

**ID:** BUG-579 · **Type:** BUG · **Date:** 2026-10-16
**Severity:** P1 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Reports / Analytics
**Duplicate check:** DISTINCT
**Source:** OWNER-REPORTED (smoke test 2026-10-16)
**Test account:** owner@palmhouse.com / Qplazm@10

## Description
In the cancellation report summary page, the cancelled item/order values (₹ amounts) are not showing. The report shows counts/entries but the monetary values are missing or zero.

## Code Reality: LOW CONFIDENCE
`CancellationsMockup.jsx` is a live-data report page fetching from `INSIGHTS_CANCELLATIONS` endpoint. Issue is likely either: (1) API response doesn't include monetary value fields, (2) FE transform doesn't map them, or (3) API returns null/zero values. Frontend code needs backend probe to confirm.

## Blast Radius: SMALL
- `CancellationsMockup.jsx` — possibly display mapping
- Backend API may need to return cancellation value fields

## Open Decisions
**OD-579-01:** Backend probe — does `INSIGHTS_CANCELLATIONS` API return cancellation amount/value fields? What field names?
