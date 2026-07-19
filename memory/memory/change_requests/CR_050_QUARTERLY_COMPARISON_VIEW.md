# CR-050 — Insights Dashboard: Quarterly Comparison View

**ID:** CR-050
**Type:** CR (Feature)
**Status:** INTAKE COMPLETE — backlog
**Priority:** P3
**Area:** Insights / Dashboard
**Sprint:** Backlog (future)
**Created:** 2026-06-15
**Source:** AGENT-SUGGESTED (post CR-049 migration)

---

## Problem Statement

Now that backend aggregation endpoints support 3-month and 1-year date ranges (CR-049), restaurant owners can access long-range data for the first time. A **quarterly comparison card** (Q1 vs Q2 revenue, orders, avg order value) on the Insights Dashboard would give instant business health visibility without manually changing date ranges.

## Suggested Scope

- New card/tile on DashboardMockup: "Quarterly Comparison"
- Shows current quarter vs previous quarter: revenue, order count, avg order value, growth %
- Uses `insights-dashboard` endpoint with two date ranges (2 API calls, both cached)
- Visual: up/down arrow + green/red % change

## Dependencies

- CR-049 (backend aggregation) — IMPLEMENTED ✅
- No backend changes needed — uses existing `insights-dashboard` with different date ranges

## Open Questions

- Q-050-1: Which metrics to compare? (Revenue only, or also orders + AOV + cancellations?)
- Q-050-2: Card placement — top of dashboard or separate "Trends" section?
- Q-050-3: Should it also show month-over-month (MoM) in addition to QoQ?

---

*CR-050 Intake — 2026-06-15. "Give owners the big picture."*
