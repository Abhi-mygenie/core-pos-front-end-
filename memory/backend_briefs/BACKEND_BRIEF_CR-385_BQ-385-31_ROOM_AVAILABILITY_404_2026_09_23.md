# BACKEND BRIEF — CR-385 · BQ-385-31 — `GET /api/v2/vendoremployee/aiosell/room-availability` returns 404 on preprod (2026-09-23)

```
Filed:       2026-09-23 by the CR-385 Phase 5 (Closure) continuation agent — owner relays to backend
Severity:    BLOCKER for Front Desk (Beta) › New Booking (M1 rate grid) and therefore for P5 Session A rows 11/12/15 and the Session B UI setup (matrix 17/18/21/23/24/27/28 cannot be reached from the UI). Other Front Desk paths (LR, board, check-in of existing bookings, extend, bill) unaffected.
Environment: preprod, RID 69 `sandbox-pms`, account QA_TGK (credentials in memory only)
Evidence:    test_reports/iteration_30_CR385_P5_sessionA_rerun_2026_09_23.json (testing_agent it.30 — booking-rate-grid empty, browser console "blocked by CORS policy … preflight … does not have HTTP ok status")
             evidence/CR-385/probes_2026_09_23_release/bq_385_31_room_availability_404_diag.json (API diag, QA_TGK Bearer)
             evidence/CR-385/probes_2026_09_22_p2_entry/s3_room_availability.json (same GET → HTTP 200 on 2026-09-22)
```

## Summary
The route `GET /api/v2/vendoremployee/aiosell/room-availability?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD` (contract BQ-385-06, P2 Entry Verification E16) answers **404 `NotFoundHttpException`** on preprod since at least 2026-09-23 ~14:00 UTC. It answered 200 on 2026-09-22 (s3 sample). `OPTIONS` on the same path is also 404, so the browser reports it as a failed CORS preflight; the root cause is the missing route, not CORS (sibling `aiosell/fetch-rates`, `room-status-board`, `rooms`, `local-reservations` are fine; `direct-reservation` still exists → 405 on GET as expected).

## Endpoint
- `GET /api/v2/vendoremployee/aiosell/room-availability` (with or without params, with valid Bearer) → 404 `Symfony\Component\HttpKernel\Exception\NotFoundHttpException`.
- Expected (2026-09-22): 200 `{"status":true,"message":"Room availability fetched successfully","data":{"checkin","checkout","rooms":[{restaurant_table_id, table_no, title, aiosell_room_code, …}]}}`.

## Reproduction
1. Login QA_TGK (`common-login`), header `X-localization: en`.
2. `GET /api/v2/vendoremployee/aiosell/room-availability?checkin=<bd>&checkout=<bd+1>` → 404.
3. Compare `GET /api/v2/vendoremployee/aiosell/room-status-board` → 200.

## Impact (FE, no code change possible under D50 / Phase 5 rules)
- `NewBookingForm.jsx` (`frontDeskService.getRoomAvailability`) receives the 404 → `booking-rate-grid` renders with no `booking-cell-*` → no booking can be saved from Front Desk (Beta). Legacy `/pms/new-booking` is not affected (it does not call this route) but is FU-385-C / BUG-432 territory and must not be used for QA.
- P5 Session A re-run (it.30) BLOCKED at row A2; A3/A5 NOT-RUN; toggle cycle (A4 rules part) PASS; cleanup clean.
- Likely the same preprod deploy that produced BQ-385-30 (settings-list keys; `auto_print_checkin_receipt` still missing on 2026-09-23 13:42Z).

## Ask
1. Restore the `room-availability` route on preprod (same contract as BQ-385-06). Confirm the deploy id.
2. While there: `settings-list` / `update-settings` echo still omit `auto_print_checkin_receipt` + `pms.auto_print_checkin_receipt` (BQ-385-30 residual).
3. Reply in `backend_replies/bq_385_31_reply_<date>.md`; the FE agent re-runs Session A the same day.

## Frontend workaround
None for the UI (D50: the grid is server-priced). For P5 QA only: Session B/C stay setup can be done via API (`direct-reservation` → `user-group-check-in`, the D17 runner pattern) so extend/shorten/Bill/TAB rows can still be evidenced while the route is down; New Booking UI rows (11/12/15) stay BLOCKED — backend until the route returns.
