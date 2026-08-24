# Backend Brief — Aggregator Timed Enable: status Not Reset by Webhook

## Summary
- Issue: When UrbanPiper fires the timed auto-enable webhook (at `turn_on_at` time), it restores `food_stock=1` but does NOT restore `food.status=1`. Food remains Inactive in the POS even though it is live on UrbanPiper.
- Classification: BACKEND_BUG
- Frontend impact: Food card shows "Inactive" badge + greyed out after timed re-enable
- Priority/Risk: P1 / MEDIUM

## Endpoint
- Method: UrbanPiper webhook (inbound, not outbound)
- Triggered by: UrbanPiper timed re-enable at `turn_on_at` timestamp

## Reproduction
1. Set aggregator food offline for 2h: `POST /aggregator-sync/stock-toggle {action:"disable", turn_on_preset:"2h"}`
2. Observe: `status=0` set immediately, `food_stock=0` async
3. Wait 2h (or observe past `turn_on_at` data)
4. UrbanPiper webhook fires → `food_stock=1` is updated
5. Check foods-list: `status=0` (NOT reset), `food_stock=1`

## Evidence
- API probe: food_id=13303 "69 special", `turn_on_at='2026-08-16 18:05:17'` (past), `food_stock=1`, `status=0`
- disable: `items[0].status=0` (set by backend immediately) ✅
- manual enable: `items[0].status=1` (reset by backend immediately) ✅
- timed auto-enable: `status` stays 0, only `food_stock` updated ❌

## Fix Required
When the UrbanPiper timed-enable webhook handler processes a re-enable event, also set `food.status = 1` (Active) for the affected food items — same as what the manual enable endpoint already does.

## Frontend Workaround
None available. User must manually click "Enable Now" to reset status=1 if food was timed-disabled.
