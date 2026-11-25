# BACKEND_BRIEF_BUG-696_2026-11-18

## Summary
- Issue: The Audit Report (and Insights Dashboard) `insights-dashboard` endpoint is too slow — ~43s for a 1–7 day range, and it exceeds the 60s client limit for wider ranges (30D / FY), so the report aborts and shows an error.
- Classification: BACKEND_BUG (latency / performance)
- Frontend impact: Audit Report fails to load on 30D and FY presets; user sees the error shield. Insights Dashboard is also at risk since it uses the same endpoint.
- Priority/Risk: P1 / MEDIUM
- Owner decision: OD-696-01 — brief requested by owner 2026-11-18.

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/report/insights-dashboard`
- Auth/context: Bearer token (masked ***), restaurant RID in payload
- Caller (FE): `frontend/src/api/services/insightsService.js` → `fetchInsightsDashboard(from, to)` (L600-606), on the shared axios instance (`frontend/src/api/axios.js` L18, `timeout: 60000`).

## Reproduction
1. Log in to POS, open Reports → Audit Report (v3).
2. Select the **30D** or **FY** date preset (wide range).
3. Observe: request to `insights-dashboard` runs ~43s+ and, on wide ranges, exceeds 60s → request aborts → error shield.

## Payload / Response
- Request: `{ from: <YYYY-MM-DD>, to: <YYYY-MM-DD>, ... }` (date range drives cost)
- Observed: ~43s response for 1–7 days; wider ranges exceed the 60s client timeout.
- Expected: response well under the client timeout (target to be set by backend; FE can cap per OD-696-01, e.g. 90s interim) for all supported ranges.

## Ask (backend / Gyan)
- Profile and optimise `insights-dashboard` for wide date ranges (indexing, aggregation, pagination, or pre-aggregated rollups).
- Confirm a realistic worst-case response time per range so the FE per-request timeout can be set correctly.
- Flag if any range should be server-side capped or chunked.

## Frontend Workaround
- Available: PARTIAL (secondary mitigation only — does NOT fix root cause)
- Details: Pass a per-request `{ timeout: <N> }` as the 3rd arg to `api.post` inside `fetchInsightsDashboard` ONLY (pending OD-696-01 value, e.g. 90s). Do NOT raise the global `axios.js:60000` (shared by every endpoint — R1). Also clear stale data on error (BUG-699).

## Related
- BUG-699 (stale data under error shield — FE), BUG-696 is its trigger.
- Shared consumer: Insights Dashboard (`transformDashboardResponse`, CR-049).
