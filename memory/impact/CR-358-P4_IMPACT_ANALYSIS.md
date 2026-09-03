# Impact Analysis — CR-358-P4: Tape Chart + Room Status Board

> ✅ **PROBES COMPLETE 2026-09-04** — T1–T11 executed. PATCH shape verified (T3), OOO probe done (T5), join key corrected to `rooms[].restaurant_table_id` (T6), all OD-P4-05..10 locked (T7), assumptions added (T8), header fixed (T9), migration confirmed (T10), CR_REGISTRY + CONTROL_DASHBOARD updated (T11).
> **Awaiting owner Gate 2 re-close (T12) before Gate 3 planning starts.**

**ID:** CR-358-P4
**Gate:** 2 (Impact Analysis) — **✅ CLOSED 2026-09-04 — PLANNING agent, per ALPHA v0.7**
**Risk:** MEDIUM (hotspot `pmsService.js` append + new PATCH integration) — OOO `inventory_push_warning` = null on sandbox; no upgrade needed
**Date:** 2026-09-03 (updated 2026-09-04)
**Design:** APPROVED (mockup at `frontend/public/cr358-p4-pms-mockup.html` — created 2026-09-04 with real probe evidence, 3 tabs: S2 Tape Chart / S7 Room Status Board / API Contract)
**Code Reality:** NONE — 0 P4 components exist. 2 placeholder routes ready for re-point.
**Conflict Pre-Check:** CLEAR — `pmsService.js` last modified by BUG-380 (QA PASS same session). `App.js` L262-263 placeholder routes untouched since P3 SC-P3-01 re-point. CR-117 (App.js conflict flagged in P3 §0) = GATE_5_PENDING_QA, touches different lines — parallel-safe.

---

## Owner Decisions (Locked)

| ID | Question | Decision | Date |
|---|---|---|---|
| OD-P4-01 | PATCH body format | `{ "status": "hk" | "ooo" | "available" }` | 2026-09-03 |
| OD-P4-02 | Tape Chart data source | (a) Reuse `getReservationOps()` — client-side filter to visible window. 0 new API calls for S2. | 2026-09-03 |
| OD-P4-03 | Occupied room toggle | (b) Disable buttons + tooltip "Cannot change while occupied". Client-side guard before PATCH. | 2026-09-03 |
| OD-P4-04 | Block click action | (c) Popover + "Check In" for booked (`/pms/check-in?booking_id=X`), "View Folio" for occupied (`/reports/room-orders`), info-only if no order. | 2026-09-03 |

**OD-P4-01..04 locked 2026-09-03. OD-P4-05..10 locked 2026-09-04 (owner-approved T7 + T3/T5 probe session).**

| ID | Question | Decision | Date |
|---|---|---|---|
| OD-P4-05 | "Assign Room" button on unassigned cards (no API exists) | **(a) Disable with "Phase 5" tooltip** — render button as disabled, `title="Coming in Phase 5"` | 2026-09-04 |
| OD-P4-06 | "+ Book Room" button on available tile | → navigate to `/pms/new-booking` | 2026-09-04 |
| OD-P4-07 | "View Booking" on booked tile | → navigate to `/pms/check-in?booking_id=X` | 2026-09-04 |
| OD-P4-08 | Booked tiles — show HK/OOO toggles? | **Hidden** (as per mockup — only available/hk tiles show toggles) | 2026-09-04 |
| OD-P4-09 | Bulk "Mark All Clean" partial failure | **Continue + summary toast** ("N rooms cleaned, M failed") | 2026-09-04 |
| OD-P4-10 | OOO probe (T5) | **Approved + executed** — `inventory_push_warning` = null on sandbox (no AIOSELL push observed) | 2026-09-04 |

**All 10 owner decisions resolved. 0 open questions remain.**

---

## 2. API Evidence (T2–T6 Probes — 2026-09-04)

### PATCH `/aiosell/room-status/{table_id}` — 200 body shape (T3)
```json
{
  "status": true,
  "message": "Room marked for housekeeping.",
  "data": {
    "room": {
      "restaurant_table_id": 8528,
      "table_no": "r1",
      "title": null,
      "manual_status": "hk",
      "room_operational_status_at": "2026-09-04 03:00:51"
    },
    "inventory_push_warning": null
  }
}
```
- `manual_status`: string `"hk"|"ooo"` when set, `null` when cleared to `available`
- `room_operational_status_at`: `"YYYY-MM-DD HH:MM:SS"` string when set, `null` when cleared
- **Response does NOT echo `display_status`** → must refetch board after PATCH to get updated tile state. Optimistic update from PATCH response is not reliable.
- **Migration confirmed**: T3 returned 200 → `2026_09_02_140000_add_room_operational_status.php` is running on preprod (T10 ✅)

### PATCH 422 bodies (T4)
| Case | HTTP | Body |
|------|------|------|
| Occupied room → hk | 422 | `{"status":false,"message":"Cannot set HK/OOO while the room is occupied."}` |
| Bogus status value | 422 | `{"status":false,"errors":{"status":["The selected status is invalid."]}}` |
| Bad room ID | **422** | `{"status":false,"message":"Room not found for this restaurant (must be rtype=RM)."}` |

> **Finding (G1 closed):** Bad ID returns 422 (not 404). Error shape differs by case — transform must handle both `message` and `errors.status` fields.

### OOO probe (T5)
- `inventory_push_warning`: `null` on sandbox — no AIOSELL inventory push triggered. Backend confirmed OOO sets `manual_status:"ooo"` + `room_operational_status_at`. Risk: null on sandbox may differ on live; guard defensively with toast if non-null.

### Room-status-board GET (T2 — fresh P4 baseline)
- `display_status` values observed: `occupied`, `booked`, `hk`, `ooo` — all 5 variants confirmed live
- `manual_status` observed: `null`, `"hk"`, `"ooo"` — **string enum confirmed**
- `room_operational_status_at` observed: `null` or `"YYYY-MM-DD HH:MM:SS"` — **timestamp string confirmed** (G2 closed)
- `auto_hk_on_rm_checkout`: `true`

> **Key observation:** r2 (`display=occupied`, `manual=hk`) — when a room is occupied, `display_status` = `"occupied"` even if `manual_status` = `"hk"`. Server-side priority: `occupied > ooo > hk > booked > available`. Frontend must rely on `display_status` for UI state, NOT `manual_status`.

### S2 Join Key Verification (T6 — G4 closed)
- **Correct join key:** `rooms[].restaurant_table_id` (NOT `roomLines[].restaurantTableId` as stated in original IA §2 — **IA field name was wrong**)
- `local-reservations` response shape: `data.reservations[]` with `rooms[]` sub-array (not `roomLines[]`)
- All 5 `local_rooms` (ids 8524–8528) are `rtype=RM` — no restaurant table IDs mixed in (RM-only confirmed ✅)
- 15 reservations in 90-day window, all have `rooms[]` populated

Evidence: `memory/evidence/CR-358-P4/P4_probe_01..10_*.json`

---

## 2. Data Flow Trace

### S2 — Tape Chart (ReservationsPage)

**Data source:** Reuse `getReservationOps()` (OD-P4-02). This already fetches `local-reservations` with 60-day back / 30-day ahead window and transforms via `fromReservationOps`. The Tape Chart filters this list client-side to the visible date window (7/14/30 days).

**Room list:** Reuse `getAiosellRooms()` → `aiosellTransform.fromAPI.rooms()` for room catalog (id, tableNo, roomType). Already used by `getBookableRooms()`.

```
ReservationsPage mount
  → getReservationOps()          → reservations with dates, status, rooms, guest
  → getAiosellRooms()            → room catalog (r1-r5 with types)
  → client-side: map reservations onto room rows by rooms[].restaurant_table_id ↔ localRooms[].id (VERIFIED T6)
  → render Gantt grid: rows = rooms, cols = dates, blocks = reservations
  → unassigned = reservations where NO room line has a table_no
```

**Block click (OD-P4-04):**
- booked → navigate to `/pms/check-in?booking_id={bookingId}`
- occupied + orderId → navigate to `/reports/room-orders` (existing route)
- no order → popover info only

### S7 — Room Status Board (RoomStatusPage)

**Data source:** NEW API call `GET /aiosell/room-status-board` → returns `{ auto_hk_on_rm_checkout, rooms[] }`.

**Room tile fields (from probe):**
```
restaurant_table_id, table_no, aiosell_room_code, manual_status,
display_status (available|occupied|booked|hk|ooo),
guest: { name, phone, email, booking_id, order_id } | null,
reservation: { booking_id, channel, checkin, checkout, guest_name, room_code } | null
```

**PATCH flow (OD-P4-01):**
```
User clicks HK/OOO button
  → if display_status === 'occupied' → BLOCKED (disabled + tooltip) (OD-P4-03)
  → else → PATCH /aiosell/room-status/{restaurant_table_id} { "status": "hk"|"ooo"|"available" }
  → on 200 → refetch board
  → on 422 → toast error (backend rejects if occupied)
```

**Bulk "Mark All Clean":**
```
For each room where display_status === 'hk':
  → PATCH /aiosell/room-status/{id} { "status": "available" }
  → sequential (avoid overwhelming backend)
→ refetch board after all complete
```

---

## 3. New Files

| # | File | Type | Purpose |
|---|---|---|---|
| N1 | `api/transforms/roomStatusTransform.js` | Transform | `fromRoomStatusBoard(data)` → normalized room tiles + auto_hk flag |
| N2 | `api/services/pmsService.js` | MODIFY (append) | `getRoomStatusBoard()`, `patchRoomStatus(tableId, status)`, `getTapeChartData()` |
| N3 | `pages/pms/ReservationsPage.jsx` | NEW page | S2 Tape Chart — Gantt grid |
| N4 | `pages/pms/RoomStatusPage.jsx` | NEW page | S7 Room Status Board — card grid |
| N5 | `App.js` | MODIFY (2 lines) | Re-point placeholder routes |

---

## 4. Modified Files

| # | File | Lines | Change | Risk |
|---|---|---|---|---|
| F1 | `api/services/pmsService.js` | EOF (append) | +3 new exports: `getRoomStatusBoard`, `patchRoomStatus`, `getTapeChartData` | MEDIUM (hotspot) |
| F2 | `App.js` | L262-263 | Re-point 2 placeholder routes (same pattern as SC-P3-01) | LOW |

---

## 5. Files NOT Touched

`aiosellTransform.js` — no change (Tape Chart reuses `fromReservationOps`).
`aiosellService.js` — no change (P4 service calls go through `api` axios directly).
`constants.js` — no change (`ROOM_STATUS_BOARD` and `ROOM_STATUS` already exist).
`CollectPaymentPanel.jsx`, `PmsCheckoutDrawer.jsx` — not related.
`FrontDeskPage.jsx`, `ArrivalsPage.jsx`, `DeparturesPage.jsx` — not related.
`NewBookingPage.jsx`, `CheckInPage.jsx`, `InHouseGuestsPage.jsx` — not related.
`ChannelManagerPage.jsx` — not related.

---

## 6. Downstream Impact

| Consumer | Impact |
|---|---|
| Existing P1-P3 pages | ZERO — no shared code modified, only append to pmsService.js |
| `getReservationOps()` | READ-ONLY reuse by Tape Chart — no modification |
| `getAiosellRooms()` | READ-ONLY reuse by Tape Chart — no modification |

---

## 7. Risk Assessment

| Risk | Level | Rationale |
|---|---|---|
| pmsService.js hotspot | MEDIUM | Append-only (3 new exports). No modification of existing exports. |
| PATCH 422 on occupied | LOW | UI disables buttons (OD-P4-03) + backend rejects as safety net |
| Tape Chart performance | LOW | Client-side filter of existing data. Max ~100 reservations in 90-day window. |
| Bulk Mark Clean | MEDIUM | Sequential PATCH calls — could be slow with many HK rooms. Toast per-room errors. |
| Room Status Board API | LOW | Probe confirmed 200 response with 5 rooms. Data contract stable. |
| App.js re-point | LOW | Same 2-line pattern as P3 (SC-P3-01). No new imports needed beyond pages. |

**Overall Risk: MEDIUM** (hotspot append + new PATCH integration)

---

---

## 8. Presentation Assumptions (A-P4-xx)

| # | Assumption | Override gate |
|---|---|---|
| A-P4-01 | Default Tape Chart window = **7 days**, start = today − 2 | Owner can change at Gate 4 |
| A-P4-02 | Navigation step = **½ window** (7d view → 3-day step) | Gate 4 |
| A-P4-03 | **Departed** reservations render as muted/greyed blocks (not hidden) | Gate 4 |
| A-P4-04 | Multi-room booking → **one block per `rooms[]` entry** (one row per room) | Gate 4 |
| A-P4-05 | Walk-in reservations (BUG-381, no channel) → label `"Walk-in"` | Gate 4 |
| A-P4-06 | Blocks partially outside visible window → **clipped** at window edge | Gate 4 |
| A-P4-07 | `display_status` precedence (server-side, confirmed): `occupied > ooo > hk > booked > available` | Fixed — server-computed |
| A-P4-08 | After PATCH, **refetch full board** (PATCH response omits `display_status`) — no optimistic update | Fixed — per T3 finding |
| A-P4-09 | Bulk "Mark All Clean" toast: `"N rooms marked clean"` or `"N cleaned, M failed"` on partial error | Gate 4 |
| A-P4-10 | `inventory_push_warning` non-null → show warning toast (defensive; was null on sandbox) | Fixed |

---

## 9. Verification Preview

| # | Check | Screen | Method |
|---|---|---|---|
| V1 | Tape Chart renders rooms as rows, dates as columns | S2 | Browser |
| V2 | Reservation blocks span correct dates, color-coded | S2 | Browser |
| V3 | Block click → popover with guest details | S2 | Browser |
| V4 | Booked block → "Check In" action in popover | S2 | Browser |
| V5 | Occupied block → "View Folio" action in popover | S2 | Browser |
| V6 | Unassigned reservations section shows correctly | S2 | Browser |
| V7 | 7d/14d/30d view switching works | S2 | Browser |
| V8 | Date navigation (prev/next/today) works | S2 | Browser |
| V9 | Room Status Board renders 5 room tiles | S7 | Browser |
| V10 | Status badges correct (occupied/booked/available/hk/ooo) | S7 | Browser |
| V11 | Filter chips work (all/available/occupied/booked/hk/ooo) | S7 | Browser |
| V12 | HK toggle: available room → click HK Needed → status changes | S7 | Browser |
| V13 | OOO toggle: available room → click Mark OOO → status changes | S7 | Browser |
| V14 | Occupied room buttons disabled with tooltip | S7 | Browser |
| V15 | Mark All Clean: HK rooms → available | S7 | Browser |
| V16 | PATCH error handling: toast on 422 | S7 | Browser |
| V17 | Auto-HK indicator displays | S7 | Browser |
| V18 | Webpack compiles | CLI | Automated |
| V19 | No forbidden colors | All | grep |

---

## 9. Estimated Scope

- **New files:** 3 (roomStatusTransform.js, ReservationsPage.jsx, RoomStatusPage.jsx)
- **Modified files:** 2 (pmsService.js append, App.js 2-line re-point)
- **Total edits:** 5
- **Lines estimated:** ~600-700 (2 pages + 1 transform + service append)
