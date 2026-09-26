# Session Handover — CR-358-P4 Gate 2 Probes Complete (2026-09-04)

## Session Summary
Executed T1–T11 for CR-358-P4 Gate 2 completion (owner-directed, as per GATE 2 COMPLIANCE AUDIT in SESSION_HANDOVER_2026_09_03_CR358P4_GATE2.md). No code written. Role: PLANNING (Gate 2 — complete the IA).

---

## Tasks Completed

| Task | Status | Output |
|------|--------|--------|
| T1 | ✅ | `memory/evidence/CR-358-P4/` folder created |
| T2 | ✅ | `P4_probe_01_board_baseline.json` — fresh board with hk+ooo+occupied+booked states |
| T3 | ✅ | `P4_probe_02..05` — PATCH hk→available (200), board after, revert available→hk (200), board after |
| T4 | ✅ | `P4_probe_06..08` — occupied→hk (422), bogus status (422), bad ID (422) |
| T5 | ✅ | `P4_probe_T5a..T5c` — OOO probe: hk→ooo (200, inventory_push_warning=null), board after, revert ooo→hk |
| T6 | ✅ | `P4_probe_09_rooms.json`, `P4_probe_10_lr.json` — join key verified |
| T7 | ✅ | OD-P4-05..10 added to IA §Owner Decisions |
| T8 | ✅ | §8 Presentation Assumptions A-P4-01..10 added to IA |
| T9 | ✅ | IA header: Risk line updated, conflict pre-check expanded (App.js CR-117), gate status updated |
| T10 | ✅ | Migration confirmed in IA §2 via T3 200 response |
| T11 | ✅ | CR_REGISTRY.md P4 row updated + CONTROL_DASHBOARD.md "Last Updated" updated |
| T12 | ⏳ | **PENDING** — owner must say "Gate 2 re-closed" |

---

## Key Findings (for next agent)

### PATCH `/aiosell/room-status/{id}` — confirmed shapes
- **200**: `{status:true, message:"Room marked...", data:{room:{restaurant_table_id, table_no, title, manual_status, room_operational_status_at}, inventory_push_warning:null}}`
- **Response does NOT include `display_status`** — must refetch board after every PATCH
- `manual_status`: `"hk"|"ooo"` when set, `null` when cleared to available
- `room_operational_status_at`: `"YYYY-MM-DD HH:MM:SS"` when set, `null` when cleared
- **inventory_push_warning**: `null` on sandbox (no AIOSELL push observed for hk OR ooo)

### PATCH 422 shapes
| Case | Message field |
|------|--------------|
| Occupied room | `message: "Cannot set HK/OOO while the room is occupied."` |
| Invalid status | `errors: {status: ["The selected status is invalid."]}` |
| Bad room ID | `message: "Room not found for this restaurant (must be rtype=RM)."` (NOT 404 — 422) |

> **Transform implication**: error handler must check both `data.message` and `data.errors.status[0]`

### Board `display_status` precedence (server-side)
`occupied > ooo > hk > booked > available` — confirmed by observing r2 (`display=occupied`, `manual=hk`)

### S2 Join Key (CORRECTED)
- **Correct**: `reservations[].rooms[].restaurant_table_id` ↔ `localRooms[].id`
- **IA was wrong**: originally said `roomLines[].restaurantTableId` — that field/array name does not exist
- All 5 rooms confirmed `rtype=RM` — `getAiosellRooms()` returns RM-only for this restaurant

### Migration
- `2026_09_02_140000_add_room_operational_status.php` **confirmed running on preprod** (PATCH returned 200 + `room_operational_status_at` populated)

---

## All Owner Decisions Locked (OD-P4-01..10)

| OD | Decision |
|----|---------|
| OD-P4-01 | PATCH body: `{status:"hk"|"ooo"|"available"}` |
| OD-P4-02 | Tape Chart reuses `getReservationOps()` |
| OD-P4-03 | Occupied buttons disabled + tooltip |
| OD-P4-04 | Booked→Check In, occupied→View Folio, info-only popover |
| OD-P4-05 | Assign Room → **disabled, "Phase 5" tooltip** |
| OD-P4-06 | + Book Room → `/pms/new-booking` |
| OD-P4-07 | View Booking → `/pms/check-in?booking_id=X` |
| OD-P4-08 | Booked tile toggles → **hidden** |
| OD-P4-09 | Bulk Clean partial failure → **continue + summary toast** |
| OD-P4-10 | OOO probe approved + executed (inventory_push_warning=null) |

---

## Registry State
- `registry.json` CR-358-P4: gate 2, status "GATE 2 PROBES COMPLETE — awaiting owner re-close"
- `CR_REGISTRY.md`: P4 row updated
- `CONTROL_DASHBOARD.md`: Last Updated updated

---

## INSTRUCTION TO NEXT AGENT
**Role = PLANNING (Gate 3 — Implementation Plan)**
**Precondition: owner must first say "Gate 2 re-closed"**

Once owner re-closes Gate 2:
1. Read this handover + `memory/impact/CR-358-P4_IMPACT_ANALYSIS.md` (fully updated)
2. Read `memory/plans/CR-358_EXECUTION_PLAN_PHASED.md` §P4
3. Write Implementation Plan at `memory/plans/CR-358-P4_IMPLEMENTATION_PLAN.md`
4. Key implementation notes:
   - Join key is `rooms[].restaurant_table_id` (NOT `roomLines[].restaurantTableId`)
   - After PATCH, must refetch board (no display_status in response)
   - Error handler needs to check both `message` and `errors.status[0]` shapes
   - Bad ID = 422 not 404
   - `display_status` is server-computed — rely on board refetch not PATCH response
5. Scope: N1 roomStatusTransform.js, N2 pmsService.js (append), N3 ReservationsPage.jsx, N4 RoomStatusPage.jsx, N5 App.js (2-line re-point)
6. Await Gate 4 GO before code. Do NOT write code.
