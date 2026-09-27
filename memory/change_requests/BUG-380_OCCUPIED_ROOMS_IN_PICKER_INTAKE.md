# INTAKE: BUG-380 — Occupied Rooms Shown in New Booking Room Picker

**ID:** BUG-380
**Type:** BUG
**Reported by:** Owner (2026-09-03)
**Priority:** P1 (HIGH) — double-booking of occupied rooms possible
**Risk:** HIGH — reservation conflict, guest displacement
**Related:** CR-358-P2 (New Booking + Check-In), CR-358-P3 (Front Desk KPIs show occupancy but Room Selection ignores it)
**Duplicate check:** DISTINCT — no prior bug or CR addresses room occupancy filtering in the booking picker.

---

## Description
Rooms r1 and r2 are currently checked in via AIOSELL. When navigating to `/pms/new-booking`, the Room Selection grid shows **all 5 rooms** (r1, r2, r3, r4, r5) as available. A user can select r1 or r2 and create a booking for an already-occupied room.

The same issue exists on `/pms/check-in` — the room assignment dropdown (L331-333) lists all rooms including occupied ones.

## Steps to Reproduce
1. Log in as owner1@thegoankitchen.com
2. Confirm r1 and r2 are checked in (visible on In-House Guests page)
3. Navigate to `/pms/new-booking`
4. Observe Room Selection grid — r1 and r2 appear as selectable

**Expected:** r1 and r2 should be hidden or visually marked as occupied/unavailable.
**Actual:** All 5 rooms appear identically available.

## Evidence
- Screenshot: Owner-provided (2026-09-03) — shows `/pms/new-booking` with all 5 rooms (r1-r5) available including occupied r1, r2
- Source: OWNER-REPORTED
- Confidence: CONFIRMED (owner reproduced on preprod)

## Root Cause (from Investigation)
`getBookableRooms()` (pmsService.js L79-84) calls `getAiosellRooms()` which returns the **room catalog** (static config), not current occupancy. No cross-reference is made against:
- `GET_ROOM_LIST` (rooms with `parent_order_id != null` → occupied), OR
- `local-reservations?view=in_house` (rooms[].table_no → occupied)

## Blast Radius
- ~5 references to `getBookableRooms` across 3 files
- Hotspot files: pmsService.js (CR-358 series), NewBookingPage.jsx, CheckInPage.jsx
- Estimated scope: SMALL (1 service + 2 page files)
- Process required: FAST LANE eligible? NO (multiple files + filter logic + state management)

## Fix Approach
In `getBookableRooms()`, also fetch occupied room IDs (via `getInHouseGuests()` or `getRoomList()`) and mark/filter rooms accordingly. Option: return `{ ...room, isOccupied: boolean }` so pages can show rooms greyed out with "Occupied" badge rather than hiding them entirely (user may need to swap rooms).

## Owner Decisions
- **OQ-380-01:** (b) Greyed out with "Occupied" badge — LOCKED (2026-09-03). Preserves visibility for room-swap scenarios.

## Fast Lane Eligibility Assessment
| Criterion | Result |
|---|---|
| 1 file only? | **FAIL** — 3 files: `pmsService.js` (service), `NewBookingPage.jsx` (grid UI), `CheckInPage.jsx` (dropdown UI) |
| ≤10 lines? | **FAIL** — service change ~5 lines + UI grey-out in 2 page files ~10-15 lines each |
| No API call? | **FAIL** — adds occupancy cross-reference call inside `getBookableRooms()` |
| Not a hotspot? | **FAIL** — `pmsService.js` touched by CR-358-P1, P2, P3, BUG-378 |
| Not financial/order? | **BORDERLINE** — room booking creates orders |

**Verdict: NOT FAST LANE ELIGIBLE (4 of 5 criteria fail). Normal full gate flow required.**
