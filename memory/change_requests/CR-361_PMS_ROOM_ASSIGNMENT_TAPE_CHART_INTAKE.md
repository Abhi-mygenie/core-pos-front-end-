# CR-361 — INTAKE
## PMS — Room Assignment on Tape Chart (pre-arrival mapping of bookings to physical rooms)

**ID:** CR-361
**Date:** 2026-09-04
**Registered by:** Intake agent (ALPHA v0.7)
**Source:** AGENT-DISCOVERED (post-CR-358 enhancement list, `SESSION_HANDOVER_2026_09_04_CR358_P3QA_P4IMPL_REGRESSION.md`) — owner-selected 2026-09-04
**Related:** CR-358-P4 (Tape Chart S2 — hosts the disabled button), CR-358-P2 (CheckInPage room picker), BUG-380 (occupied rooms in picker), OG-PMS-013 (board soft-allocation vs LR — filed this session)
**Type:** CR (new capability)
**Scope decision (owner 2026-09-04):** FULL feature — no v1 workaround (Assign-at-Check-In deep link explicitly NOT in scope)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | PMS → Reservations / Tape Chart (S2) |
| Priority | **P1** (owner-confirmed 2026-09-04, "will review later") |
| Risk | **MEDIUM** — reservation data + new API contract; upgrades to HIGH if assignment triggers inventory push |
| Sprint | pos_pms_1 |
| Fast Lane eligible | NO |
| Duplicate check | **DISTINCT** — no CR/BUG registers pre-arrival assignment; CR-358-P4 intentionally deferred it ("Coming in Phase 5", `ReservationsPage.jsx:195`) |
| Code reality | **PARTIAL** — disabled `Assign Room` button + `tc-assign-room-btn-*` testids exist; `buildTapeChart()` already computes `unassigned[]`; `getBookableRooms()` provides candidate rooms with type + occupied flag. No assign call, no picker |
| Blast radius | MEDIUM — 3 files (ReservationsPage.jsx, pmsService.js, api/constants.js) + 1 new picker component. Hotspots: NO |
| Backend blocked | **YES** — no assign endpoint exists (probed 6 candidate routes → 404) |

---

## Description

OTA bookings (booking.com etc.) arrive with a **room type** only (locked decision Q5). The tape chart lists them under "Unassigned Bookings" with a disabled **Assign Room** button. Front-desk staff need to map each booking to a physical room *before* arrival (day-before planning, upgrades, adjacent rooms for groups), so the block appears on the correct room row and the Check-In form is pre-filled.

### Expected behaviour
1. `Assign Room` enabled for every unassigned pending reservation line.
2. Click → picker listing local rooms **of the booking's room type** (from `getBookableRooms()`), each showing availability for the booking's date range (no overlap with assigned/in-house lines on the tape chart), occupied rooms greyed (BUG-380 pattern).
3. Confirm → backend persists `restaurant_table_id` on the reservation room line → tape chart refetches → block moves from Unassigned to the room row (kind `pending`).
4. Re-assign / Unassign allowed while the line is `pending` (popover actions). Not allowed once `checked_in`.
5. CheckInPage (`?booking_id=`) pre-fills the assigned room (already reads `restaurantTableId` via `fromPendingArrival`).
6. Multi-room bookings: assign per room line.

### Current behaviour
Button disabled; assignment only possible at check-in (`user-group-check-in room_id[]`) or at direct-booking creation (`direct-reservation rooms[].restaurant_table_id`).

---

## Evidence

- Screenshot: not provided (feature request)
- Steps to reproduce: Login → Rooms & Reservations → Reservations → scroll to "Unassigned Bookings (7)" → `Assign Room` is disabled (`title="Coming in Phase 5"`)
- Curl output: `/app/memory/evidence/INV-PMS-ENH/probe_07_discovery_routes.txt` — `assign-room`, `reservation-assign-room`, `local-reservations/{id}/assign-room`, `local-reservations/{id}`, `reservations/{id}`, `reservation/{id}` all **404**
- Data: `probe_01_local_reservations.json` — 7 pending lines with `restaurant_table_id: null` (5 Direct, 2 booking.com)
- Investigation: `/app/memory/PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md` §2 E1
- Source: AGENT-DISCOVERED
- Confidence: CONFIRMED (endpoint absence live-verified; UI state code-verified)

---

## Backend Dependency (blocks Gate 4)

| # | Ask | Type |
|---|---|---|
| B-361-01 | `PATCH /api/v2/vendoremployee/aiosell/local-reservations/{reservation_id}/rooms/{room_line_id}` body `{ restaurant_table_id: int \| null }` → 200 with updated line; **422** if table's mapped room type ≠ line `room_code`, table is OOO, or dates overlap another assigned/in-house line; 409 if line not `pending` | NEW ENDPOINT |
| B-361-02 | Decide authority: `room-status-board` currently **soft-allocates** unassigned bookings to rooms by type (r4→BDC7497606 while LR has null). After CR-361, board must use the explicit assignment and only fall back to type-level "booked" count (OG-PMS-013) | CONTRACT CLARIFICATION |
| B-361-03 | Confirm assignment does **not** push inventory (type-level availability unchanged) | CLARIFICATION |
| B-361-04 | `user-group-check-in` must accept the pre-assigned table and reject a different table without explicit override flag? (or allow change at check-in) | CLARIFICATION |

Backend brief to be written at Planning Gate 2: `backend_briefs/BACKEND_BRIEF_CR-361_<DATE>.md`.

---

## Open Questions (Owner Decisions)

| OD | Question | Options |
|---|---|---|
| OD-361-01 | Should staff be able to override the room type (assign an "executive" booking to a "suite" room = upgrade)? | a) No — same type only · b) Yes with reason text (Q2 pattern) |
| OD-361-02 | Who is authoritative when tape chart and status board disagree until backend fixes soft-allocation? | a) Tape chart (LR) · b) Board |
| OD-361-03 | Show unassigned count badge on Front Desk (S1) as a nudge? | yes / no |
| OD-361-04 | Auto-assign suggestion (first free room of type) — one-click? | yes / no (v2) |

---

## Files (expected — to be confirmed at Gate 2)

| File | Change |
|---|---|
| `api/constants.js` | +1 endpoint `ASSIGN_ROOM` |
| `api/services/pmsService.js` | +`assignRoom(reservationId, lineId, tableId)`, +`getAssignableRooms(res, ops)` (type filter + overlap check, pure/testable) |
| `pages/pms/ReservationsPage.jsx` | enable button, open picker, refetch; popover "Re-assign / Unassign" |
| `components/pms/AssignRoomPicker.jsx` (NEW) | room list dialog |

Files NOT touched: CheckInPage.jsx (already prefills), CollectPaymentPanel.jsx, OrderEntry.jsx, App.js.

---

## Gate status
- [x] Gate 0/1 — Intake (this doc)
- [ ] Gate 2 — Impact Analysis (blocked until B-361-01 delivered or contract agreed)
- [ ] Gate 3 — Plan
- [ ] Gate 4 — Owner GO

*Intake: 2026-09-04 | Intake agent | Code reality: PARTIAL | Duplicate: DISTINCT | Blast radius: MEDIUM | Risk: MEDIUM | BACKEND-BLOCKED*
