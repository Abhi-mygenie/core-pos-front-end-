# BACKEND_BRIEF_CR-543_2026_11_17

## Summary
- Issue: No time-based cancellation risk classification exists in audit
- Classification: CONTRACT_MISMATCH (feature gap)
- Frontend impact: Order Edit Audit page cannot show late-cancel risk tiers
- Priority/Risk: P0 / HIGH

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/report/insights-dashboard`
- Auth/context: Bearer token / RID (any restaurant)

## Owner Decision (LOCKED 2026-11-17)

Fixed 4-tier risk classification — NO configurable threshold, NO settings API needed:

| Tier | Duration (punch → cancel) | `risk_level` |
|------|--------------------------|-------------|
| 1 | 0–5 min | `"ok"` |
| 2 | 5–15 min | `"doubt"` |
| 3 | 15–30 min | `"risk"` |
| 4 | 30+ min | `"high_risk"` |

## What Backend Needs to Do

For every cancelled item in the date range:
1. Compute `duration_minutes = cancel_time − punch_time`
2. Assign `risk_level` based on tiers above
3. Emit `late_cancel` event with all fields
4. Return 5 KPI counts (total + per tier)

## Event Type: `late_cancel`

```json
{
  "type": "late_cancel",
  "order_id": "021544",
  "food_name": "Paneer Tikka",
  "amount": 350.00,
  "by": "Counter",
  "punch_time": "2026-11-16T14:10:00",
  "cancel_time": "2026-11-16T14:45:00",
  "duration_minutes": 35,
  "risk_level": "high_risk",
  "scope": "item"
}
```

## KPI Counts

| Field | Type |
|-------|------|
| `late_cancel_count` | integer |
| `late_cancel_ok_count` | integer |
| `late_cancel_doubt_count` | integer |
| `late_cancel_risk_count` | integer |
| `late_cancel_high_risk_count` | integer |

## Dependency
Requires `punched_at` (ASK 1 / CR-524 — ✅ DONE).

## Backward Compatibility
- Additive only
- No settings API changes (removed threshold setting requirement from v1)
- Same endpoint, same response structure

## Evidence
- Owner directive 2026-11-17
- Intake: `change_requests/35_CR-543_LATE_CANCELLATION_AUDIT_THRESHOLD_INTAKE.md`
- Contract: `briefs/BATCH-C_CR-543_API_CONTRACT_2026_11_17_v2.md`
