> **SUPERSEDED 2026-09-19 — tracked in `BACKEND_BRIEF_CR-385_MASTER.md`. Kept as history; do not update.**

# BACKEND_BRIEF_CR-385 — Addendum 2026-09-18 (BQ-385-06 room availability by date range)

## Summary
- Issue: the New Booking form (moving into the Front Desk workstation, CR-385 scope change 2026-09-18) needs to know **which rooms are free for a chosen date range**. Today the FE can only see which rooms are free **right now**.
- Classification: **FEATURE_ASK** (new read endpoint) — P1 for CR-385 Gate 3 (blocks correct future bookings).
- Frontend impact: without it a receptionist booking a room for next week may pick a room already reserved for those nights → **double booking**. FE can only partially guard client-side (see workaround).
- Priority/Risk: **P1 / HIGH** (money + guest experience).
- Account used for probes: alias `goankitchen_owner_rid69` (RID 69, `sandbox-pms`). Token masked `***`.

## How the FE builds the room list today (facts)
`pmsService.getBookableRooms()` = 3 parallel calls → `GET aiosell/rooms` (mappings) + `GET_ROOM_LIST` (occupied table ids, BUG-380) + `GET aiosell/room-status-board` (OOO/HK, BUG-387). Result = rooms minus *currently* occupied minus OOO. **No date parameter anywhere.** `POST aiosell/local-reservations` (create) is then called with `restaurant_table_id`, `checkin`, `checkout` — does the backend reject an overlapping stay? **Unknown → Q2 below.**

## Questions
| # | Question | Why |
|---|---|---|
| **Q1** | Can the backend expose **`GET /api/v2/vendoremployee/aiosell/room-availability?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD`** → `{ rooms: [{ restaurant_table_id, table_no, aiosell_room_code, available: bool, blocked_by: 'reservation'|'in_house'|'ooo'|null, booking_id? }] }` considering pending + in-house local reservations, OTA reservations already synced, and OOO periods? | Correct room picker for any date range |
| **Q2** | Does `POST aiosell/local-reservations` **reject overlapping** `restaurant_table_id` + date range today (409/422)? If not, can it? | Server-side guard regardless of FE |
| **Q3** | Is **rate by room type / date** available (`aiosell/rates` or rate plans from CR-358-P5) so the amount field can be prefilled instead of typed? | Fewer typing errors; optional |
| **Q4** | Does creating a local reservation **push inventory** to OTAs and return `inventory_push_warning` (as room-status PATCH does)? | FE shows the warning in the toast |

## Frontend Workaround (until Q1/Q2 answered)
- Available: **PARTIAL.** The workstation already holds every reservation in a −60/+30-day window (`local-reservations`). FE can mark a room "reserved 20–22 Sep" when a pending/in-house stay overlaps the chosen dates and grey it out. Blind spots: bookings beyond +30 days, OTA bookings not yet synced, OOO periods with end dates. Gate 3 will implement this client-side filter as a stop-gap and switch to Q1 when available.

## Evidence
- `evidence/CR-385/CR-385_local_reservations.json` (rows have `rooms[].restaurant_table_id`, `checkin`, `checkout`, `operational_status`) — enough for the client-side overlap check.
- Related: BQ-385-02 A5 (cancelled rows in window), BQ-385-04 (No-Show for all channels — raised by owner directly).
