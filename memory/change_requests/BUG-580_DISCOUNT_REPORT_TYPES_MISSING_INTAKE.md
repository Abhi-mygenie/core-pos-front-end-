# BUG-580 — Intake (Gate 1)
## Discount report — restaurant-specific discount types not appearing

**ID:** BUG-580 · **Type:** BUG · **Date:** 2026-10-16
**Severity:** P1 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** Reports / Analytics
**Duplicate check:** DISTINCT
**Source:** OWNER-REPORTED (smoke test 2026-10-16)
**Test account:** owner@palmhouse.com / Qplazm@10

## Description
The discount report shows Manual, Coupon, Loyalty, and Comp categories. However, some discounts applied at Palmhouse (specifically a "thrice discount") are not appearing in any column. Owner wants all discount types that have been applied in the last 1 month to be visible.

## Code Reality: LOW CONFIDENCE
`DiscountReportMockup.jsx:L82-85` — KPIs: manual_discount, coupon_discount, loyalty_discount, comp_total. "Thrice discount" might be a specific named manual discount that should appear under `manual_discount` bucket but isn't being counted there, or it's a separate discount type not mapped.

## Blast Radius: SMALL/MEDIUM (depends on API)
- `DiscountReportMockup.jsx` — possibly add new discount type column
- Backend — may need to return additional discount type breakdowns

## Open Decisions
**OD-580-01:** Backend probe — does `INSIGHTS_DISCOUNTS` API return a "thrice" or custom discount type field? Is it a sub-type of manual discount?
**OD-580-02:** Is "thrice discount" a named manual discount configured in restaurant settings? If so, should the report show individual named discount types?
