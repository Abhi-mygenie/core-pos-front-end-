# BACKEND_BRIEF_CR-358-P3_2026_09_03 — local-reservations list parameters (deferred, non-blocking)

## Summary
- Issue: `GET /aiosell/local-reservations` returns the full window as one flat array; `page`, `per_page`, `checkin_date` are silently ignored.
- Classification: CONTRACT_MISMATCH (mockup assumed server paging/date filter; backend declined for this sprint in `ques3_reply` r3)
- Frontend impact: Phase 3 (S1/S9/S10) implements Today/Late/Upcoming bucketing and 20-row pagination client-side. Works, but payload grows with real hotel volume (60-day window × all lines).
- Priority/Risk: P3 / LOW now — becomes P2 once a property exceeds ~300 reservations in window.

## Endpoint
- Method: GET
- URL: `/api/v2/vendoremployee/aiosell/local-reservations`
- Auth/context: Bearer *** (OWNER_PREPROD alias), restaurant 69

## Reproduction
1. `?start_date=today-60&end_date=today+7&page=1&per_page=2` → 200, 7 rows (params ignored)
2. `?start_date=…&end_date=…&checkin_date=today` → 200, 7 rows (param ignored)

## Payload / Response
- Evidence: `/app/memory/evidence/CR-358-P3/probe_05_lr_checkin_date.json`, `probe_06_lr_paginate.json`
- Expected (future): `data.meta{ page, per_page, total, last_page }` + optional `checkin_date` / `checkout_date` exact-match filters
- Actual: `data.reservations[]` only, no meta

## Frontend Workaround
- Available: YES — client-side buckets + pagination (CR-358-P3 OD-P3-02/07/10). No FE change needed when backend adds meta if FE keeps reading `data.reservations`; pagination can be switched to server in a follow-up CR.

## Ask (when scheduled)
1. Add `page`/`per_page` with `meta` block (default: unpaged for backward compatibility).
2. Add `checkin_date=` / `checkout_date=` exact-day filters.
3. Keep `view=arrivals|departures|in_house|all` semantics unchanged.
