# BACKEND BRIEF — insights-dashboard latency timeout (BUG-722 / BUG-719 / BUG-696)

**Date:** 2026-11-19
**Owner decision:** Fix the server so the data loads faster (NOT a frontend timeout bump, NOT chunking). Server-side query/perf fix is the chosen path.
**Priority:** P1
**Risk:** MEDIUM
**Area:** Reports / Analytics — Audit Report
**Assignee:** backend (Gyan)

## Problem
The Audit Report calls the backend `insights-dashboard` endpoint. For wide date ranges
(30D / Last Month / Financial Year / full ~50-day range) the endpoint takes **~43s to ~78s**,
which exceeds the frontend's **60s axios timeout**, so the request fails and the report never loads.

Three registered IDs are the SAME root cause (backend latency > 60s) and should be consolidated during Impact Analysis:
- **BUG-696** — 30D/FY ranges, ~43s observed.
- **BUG-719** — full 50-day range, ~78s observed. Pre-existing; NOT caused by the getRiskTier refactor.
- **BUG-722** — 30D/LM/FY, 65–77s observed; also carries a frontend-side defect (see below).

## Goal
Bring `insights-dashboard` response time for the widest supported range (FY / ~50 days)
**comfortably under the 60s axios timeout** — target well below (e.g. under ~15–20s) so there is headroom.

## Backend investigation asks
1. Profile the `insights-dashboard` aggregation for a wide range — identify the slow stage(s).
2. Check for missing MongoDB indexes on the fields used to filter/group (date range, store/tenant, status).
3. Review whether the aggregation scans full collections instead of a date-bounded subset.
4. Consider pre-aggregation / caching of daily rollups so wide ranges sum pre-computed days instead of re-scanning raw orders.
5. Confirm the fix holds for the largest real tenant data volume, not just a small sample.

## Related frontend defect (BUG-722, handled separately on FE — not this brief)
On timeout the previous range's KPIs stay on screen and the **Download button remains enabled**,
so the user can export stale data under the new range label. FE must clear KPIs and disable Download on error.

## Done when
- Wide-range `insights-dashboard` returns successfully within the 60s window (with headroom) on production-scale data.
- All three IDs (696/719/722-backend-part) verified against the same fix.
