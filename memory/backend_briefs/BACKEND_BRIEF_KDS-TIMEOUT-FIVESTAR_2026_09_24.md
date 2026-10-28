# BACKEND_BRIEF_KDS-TIMEOUT-FIVESTAR_2026_09_24

## Summary
- Issue: `POST /api/v1/vendoremployee/station-order-list` (role_name=KDS) takes ≥90 s for restaurant **fivestar** (account alias FIVESTAR_OWNER), exceeding the POS 60 s axios timeout; LoadingPage "Setting up kitchen stations" fails on all 3 retries and the POS never reaches `/dashboard`.
- Classification: **BACKEND_BUG** (latency) — possibly DATA_ISSUE (large backlog of `def_order_status=1` KDS orders for this restaurant)
- Frontend impact: boot blocked for this account; all dashboard features unreachable. Blocks sep_bug_closure Wave 1 authenticated QA (VB-3..9, VC-6, R-1).
- Priority/Risk: P1 / HIGH (environmental, not a frontend regression — `stationService.js` untouched by Wave 1 commit `3783ee8`)

## Endpoint
- Method: POST (multipart form: `role_name=KDS`, `def_order_status=1`)
- URL: `https://preprod.mygenie.online/api/v1/vendoremployee/station-order-list`
- Auth/context: Bearer *** (FIVESTAR_OWNER, restaurant id 739)

## Reproduction
1. Login via `/api/v1/auth/vendoremployee/common-login` as FIVESTAR_OWNER → token.
2. `curl --max-time 90 -X POST .../station-order-list -F role_name=KDS -F def_order_status=1 -H "Authorization: Bearer ***"`
3. Attempt 1: HTTP 000 (client timeout at 90.0 s). Attempt 2: HTTP 200 at 90.0 s (body begins `{"orders":[{"order_details_order":{"id":845172,...`).
4. Control: `GET /get-products-list?limit=2000&offset=1&type=all` → HTTP 200 in 9.9 s (healthy).

## Payload / Response
- Expected: response < 10 s (other boot stations complete in < 15 s)
- Actual: 90 s+ ; POS axios timeout 60 s → `[StationService] Error details: timeout of 60000ms exceeded`

## Evidence
- Agent curl timings (above), 2026-09-24
- testing_agent report `/app/test_reports/iteration_2.json` §R-3 + screenshots `/app/test_reports/screenshots_iter2/loading_stuck.png`

## Frontend Workaround
- Available: NO (within Wave 1 scope). Possible later CR: make KDS station non-blocking at boot or raise/segment timeout — needs owner intake, not part of sep_bug_closure.
