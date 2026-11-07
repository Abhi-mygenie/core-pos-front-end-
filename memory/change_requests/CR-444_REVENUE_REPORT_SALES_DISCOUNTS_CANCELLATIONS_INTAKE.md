# CR-444 — Revenue Report: Sales, Discounts, Cancellations, Actual Revenue

**ID:** CR-444  **Type:** CR  **Registered:** 2026-10-22  **Sprint:** oct_cr_batch  
**Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE  
**TT source:** TT-004

## Description
New report module: a combined revenue view showing sales, all types of discounts, all types of cancellations, and actual revenue. Owner will define the full column/metric spec after intake. Scope to be discussed further before Gate 2.

## Owner input (verbatim)
"in Need another report where we show sales, discounts, cancellations, actual revenue, and shd be all types of discount and cancellation will discuss more after intake"

## Evidence
- Source: OWNER-REPORTED via TT-004
- Confidence: CONFIRMED (owner reported, detail TBD)
- Screenshot: not provided

## Duplicate check
DISTINCT. Existing reports: SalesMockup (sales only), CancellationsMockup (cancellations only), PaymentsMockup (payments). No combined revenue report with all discount + cancellation types exists.

## Code Reality
NONE — no combined revenue report page exists. 4 hits found are individual existing reports.

## Blast radius
MEDIUM — new report page + reportService endpoint + Sidebar entry. ~4–5 files.

## Open decisions (owner to answer before Gate 2)
- OD-444-01: Exact metrics/columns — gross sales, discount breakdown by type, cancellation breakdown by type, net revenue?
- OD-444-02: Date range granularity — daily rows, hourly, summary only?
- OD-444-03: Discount types to include — role-based, coupon, complimentary, manual, promotional?
- OD-444-04: Cancellation types — full cancel, partial, void, or by reason?
- OD-444-05: Backend endpoint — new dedicated endpoint or can be derived from existing ORDER_REPORT_BETA_COMBINED?

## Note
Owner explicitly said "will discuss more after intake" — Gate 2 GO should follow that discussion.
