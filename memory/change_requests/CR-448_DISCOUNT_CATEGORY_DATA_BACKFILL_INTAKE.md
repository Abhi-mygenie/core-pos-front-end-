# CR-448 — Discount Category Data Backfill (Pre-12th June Historical Orders)

**ID:** CR-448  **Type:** CR  **Registered:** 2026-10-22  **Sprint:** oct_cr_batch
**Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE
**TT source:** TT-031

## Description
The discount category field (`discount_category`) was introduced on the backend at some point around 12th June. All orders placed before that date have no `discount_category` value. The Discount Report (DiscountReportMockup) now shows the category breakdown, but historical data appears missing/blank for months before the feature was live. Backfilling historical orders with their correct discount category is needed so the report shows accurate data across all months.

## Owner input (verbatim)
"no this is another CR where discount category is coming from 12th june, we will need to back fill data"

## Evidence
- Source: OWNER-REPORTED via TT-031
- Confidence: CONFIRMED
- Related implementation: BUG-580 (GATE_5A_IMPLEMENTED 2026-10-21) — FE now reads + displays `discount_category` and `by_category[]`

## Duplicate check
DISTINCT from BUG-580 (FE display fix, already shipped). This is a backend data backfill task — historical orders need `discount_category` populated retroactively.

## Code Reality
NONE (FE scope) — FE already handles `discount_category` correctly via BUG-580. The gap is backend data, not FE code.

## Classification
Primarily BACKEND-OWNED. FE may need: date range indicator showing "data available from [date]" as a UX note until backfill is complete.

## Blast radius
SMALL (FE) — possibly 1 line in DiscountReportMockup.jsx for a "data from [date]" note. Backend: full historical order table update.

## Open decisions for Gate 2
- OD-448-01: What is the exact cutoff date — 12th June or another date? (Confirm with backend)
- OD-448-02: Should FE show a notice "Discount category data available from [date]" for dates before backfill?
- OD-448-03: Backend team to confirm feasibility and timeline of backfill
- OD-448-04: Which restaurants are affected — all, or specific ones?
