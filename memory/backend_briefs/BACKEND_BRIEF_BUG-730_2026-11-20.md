# BACKEND_BRIEF_BUG-730_2026-11-20

## Summary
- Issue: The Audit Report drill-down (Card 1 "High Risk Cancellations") cannot show a real per-row **Risk tier** or **Duration** because `insights-dashboard` returns these only as *summary counts*, never per event.
- Classification: CONTRACT_MISMATCH / DATA_ISSUE (missing per-event fields)
- Frontend impact: every late-cancel row is forced to a single label; the Excel export's declared `risk_level` + `duration_minutes` columns render blank. Owner approved adding the columns (OD-730=yes) but FE is blocked without the data.
- Priority/Risk: P2 / LOW (UI correctness); pairs with P1 latency item BUG-722.

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/report/insights-dashboard`
- Auth/context: Bearer token (masked ***), restaurant RID.

## Reproduction (live 2026-11-20, owner@cafe103.com)
1. POST insights-dashboard for a 7-day range.
2. Inspect `data.audits.orders[]`.
3. Observe each event has: `order_id, type, amount, by` (+ `prev_method/curr_method` for make_unpaid). **No `risk_level`. No `duration_minutes`. No `created_at`/`cancel_time_full`.**
4. `data.audits` DOES carry summary tier counts: `late_cancel_doubt_count`, `late_cancel_risk_count`, `late_cancel_high_risk_count`, `late_cancel_ok_count`, `late_cancel_unknown_count`, `total`.

## Ask (backend / Gyan)
For each **late-cancel** event in `audits.orders[]`, add EITHER:
- **Option A (preferred):** `risk_level` (enum `doubt|risk|high_risk|ok`) **and** `duration_minutes` (integer), consistent with the existing summary-count tiers and the FE thresholds 5/15/30 min; OR
- **Option B:** raw `created_at` (order punch) **and** `cancel_time_full` (cancel timestamp) so the FE derives duration + tier via `utils/riskTier.js` (`durationMins` + `getRiskTier`).

Also useful (time-ordering, OD-730): ensure each event has a sortable timestamp (`cancel_time_full` or similar) for multi-day ranges.

## Payload / Response
- Request: `{ from_date, to_date }`
- Expected (Option A) per event:
  `{ order_id, type:"late_cancel", amount, by, risk_level:"high_risk", duration_minutes: 42, cancel_time_full:"YYYY-MM-DD HH:MM:SS" }`
- Evidence: `evidence/B2-AUDIT-UI/insights_audits_7d_cafe103.json`, `evidence/B2-AUDIT-UI/PROBE_NOTES_2026_11_20.md`

## Frontend Workaround
- Available: NO (cannot invent a per-row tier/duration without the data). FE ships only the de-mislabel (plan E2) until fields arrive; columns (E5) + Excel risk label (E6) gated on this brief.

## Related
- BUG-722 / BUG-696 / BUG-719 (same endpoint latency — consolidate; `BACKEND_BRIEF_2026_11_19_INSIGHTS_DASHBOARD_TIMEOUT.md`).
- BUG-739 (Excel Risk raw label) depends on `risk_level` from this brief.
