# BUG-445 — In-House "Leaving today" chip counts overdue guests (chip 2 vs tile "0 leaving today")

**Registered:** 2026-09-22 (owner smoke, validated by agent — no code) · **Type:** BUG · **Priority:** P3 · **Risk:** LOW (display/filter only) · **QA severity:** MINOR
**Duplicate check:** DISTINCT — RELATED CR-385 P0 (`bucketInHouse`), plan §3 M5 wiring rule ("Leaving today = `checkout === bd` and not overdue")
**Source:** OWNER-SMOKE 2026-09-22 (screenshot: Departures tile "2 overdue · 0 leaving today"; In-House chips "Leaving today 2") · **Confidence:** CONFIRMED (code read + live)
**Code reality:** EXISTS — `api/transforms/frontDeskTransform.js` L87 `if (row?.checkout && row.checkout <= bd) return 'leaving';` — `<=` folds overdue (`<`) into "leaving". Tile uses backend `counts.leaving_today` (= `checkout === bd`) → the two disagree whenever an in-house guest is overdue.

## Expected (plan §3 / F6)
In-House chips: Arrived today · **Leaving today (`checkout === bd`)** · Stayover; overdue in-house rows show the "Overdue N d" pill and belong to Departures › Overdue. Fix = one comparison (`===`) + unit test on the fixture (2 overdue rows → Leaving today 0, Stayover 2).

## Routing (owner decision)
Plan §3 already schedules this rule with M5 panel wiring (Phase 3). Options: (a) fold into Phase 3 as planned (no action now); (b) Phase 1.5c one-liner + test before the Phase 2 GO. Fast Lane eligible (1 file, 1 line, no money, no hotspot).
