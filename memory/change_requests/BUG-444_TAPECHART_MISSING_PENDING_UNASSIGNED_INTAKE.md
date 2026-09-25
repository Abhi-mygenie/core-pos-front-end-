# BUG-444 — Legacy `/pms/reservations` tape chart does not show pending Direct bookings created via direct-reservation (no block, no "Unassigned" row)

**Registered:** 2026-09-22 (QA Role 4, CR-385 P1.5 `iteration_15.json` P15-04 / P15-04b) · **Type:** BUG · **Priority:** P2 · **Risk:** LOW (display only; Front Desk (Beta) shows the booking) · **QA severity:** MINOR (MAJOR for staff who only use the old page)
**Duplicate check:** DISTINCT — RELATED CR-362 (tape chart Cancel/Modify popover), CR-358 (tape chart), FU-385-C (legacy retirement)
**Source:** QA-FOUND, reproduced twice (bookings 231 and 233, Suite, check-in 23 Sep, in the default 7-day window) · **Confidence:** CONFIRMED (symptom) / root cause SUSPECTED
**Code reality:** EXISTS — `pmsService.buildTapeChart` L396–404: a reservation whose `roomLines` carry a `restaurantTableId` is placed only if `byRoom[restaurantTableId]` exists, otherwise silently dropped (`if (!byRoom[l.restaurantTableId]) return;`); rows with no table id go to `unassigned`. Suspect: direct-reservation rows have a room line with a table id not present in the chart's room list (or the 7-day window/`endExclusive` maths), so the booking is neither a block nor unassigned.

## Consequence for CR-385
Legacy Reservations Cancel (BUG-441 fix path L377) could not be exercised live — the numeric-id fix is verified by unit test (`phase1_5.cr385.test.jsx` source guard) and by the identical Arrivals path (live 200). Smoke step S-22 must be marked "blocked by BUG-444" until fixed or the page retires.

## Fix proposal (not applied)
Debug with the LR GET for such a booking (`rooms[0].restaurant_table_id`, `room_code`) vs `chart.byRoom` keys; either map by room code or push to `unassigned` when the table id is unknown. 1 file (`pmsService.js` — **hotspot**, owner approval + impact analysis required).
