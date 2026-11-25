# CR-480 — Hourly Cancellation Trend Widget on Cancellations Report

**ID:** CR-480  **Type:** CR  **Registered:** 2026-11-02  **Sprint:** nov_cr_batch
**Severity:** P2  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-REPORTED (verbal request, 2026-11-02)
**Related:** CR-011 S12 (HourlySalesMockup — pattern to follow), CR-049 (cancellation insights backend)

## Description
Owner requested a time-wise/hourly cancellation trend widget on the Cancellations report page. Currently the page has:
- Daily Cancellation Trend (bar chart by date) ✅
- Top Cancellation Reasons (horizontal bar) ✅
- Revenue Loss By Stage (donut) ✅
- By Employee table ✅
- **Hourly Cancellation Trend** ❌ — does not exist

The owner wants to see which hours of the day have the most cancellations, similar to how HourlySalesMockup (CR-011 S12) shows hourly sales distribution.

## Evidence
- Owner screenshot: Cancellations page showing Daily Trend + By Reason + By Stage — no hourly widget
- Investigation: `investigations/INVESTIGATION_HOURLY_CANCELLATION_TREND_2026_11_02.md`
- Data feasibility CONFIRMED: every item has `cancel_time` (e.g., "21:20") — can compute hourly buckets in FE
- Confidence: CONFIRMED

## Duplicate Check
**DISTINCT.** CR-011 S12 is HourlySalesMockup (sales, not cancellations). No existing CR covers hourly cancellation trend.

## Code Reality
**NONE** — no hourly computation or chart exists in CancellationsMockup.jsx.

## Data Source
- Backend does NOT provide pre-computed `by_hour` for cancellations
- Each item in `cancelBackend.items[]` has `cancel_time` field (e.g., "21:20")
- FE computes 24-hour buckets by parsing `cancel_time` hour — same approach as HourlySalesMockup

## Affected Files & Lines
| # | File | Change |
|---|------|--------|
| 1 | `CancellationsMockup.jsx` | Add `byHour` computation in `analytics` useMemo (~15 lines) |
| 2 | `CancellationsMockup.jsx` | Add Hourly Cancellation Trend bar chart widget (~25 lines) |

## Blast Radius
**SMALL** — 1 file, ~40 lines, additive widget. No existing logic modified.

## Widget Specification
- **Chart type:** Stacked bar chart (same as Daily Trend)
- **X-axis:** Hour labels (00:00 – 23:00), only show hours with cancellations
- **Y-axis:** Cancellation count
- **Bars:** Orders (red #EF4444) + Items (orange #FB923C) stacked
- **Tooltip:** Hour, order cancel count, item cancel count, total loss
- **Position:** New row after Daily Trend + By Reason, or replace the grid to include 3 charts

## Open Decisions
- **OD-480-01:** Widget placement — (a) new row below Daily Trend + By Reason, or (b) make a 3-column grid with Daily + Hourly + By Reason?
  - **Recommended:** (a) New row — keeps existing layout intact
- **OD-480-02:** Show peak cancellation hour as KPI insight? (e.g., "Peak: 21:00 — 34 cancellations")
  - **Recommended:** YES — small text badge above the chart, same as HourlySalesMockup peak hour

## Risk Classification
- **Risk:** LOW — 1 file, additive widget, no logic change, no API change
- **Fast Lane eligible:** NO (>10 lines, new feature widget)
