# Impact Analysis — CR-358-P4: Tape Chart + Room Status Board

**ID:** CR-358-P4
**Gate:** 2 (Impact Analysis)
**Date:** 2026-09-03
**Design:** APPROVED (mockup at `cr358-p4-pms-mockup.html`)
**Code Reality:** NONE — 0 P4 components exist. 2 placeholder routes ready for re-point.
**Conflict Pre-Check:** CLEAR — no open items on target files. pmsService.js last modified by BUG-380 (QA PASS same session).

---

## Owner Decisions (Locked)

| ID | Question | Decision | Date |
|---|---|---|---|
| OD-P4-01 | PATCH body format | `{ "status": "hk" | "ooo" | "available" }` | 2026-09-03 |
| OD-P4-02 | Tape Chart data source | (a) Reuse `getReservationOps()` — client-side filter to visible window. 0 new API calls for S2. | 2026-09-03 |
| OD-P4-03 | Occupied room toggle | (b) Disable buttons + tooltip "Cannot change while occupied". Client-side guard before PATCH. | 2026-09-03 |
| OD-P4-04 | Block click action | (c) Popover + "Check In" for booked (`/pms/check-in?booking_id=X`), "View Folio" for occupied (`/reports/room-orders`), info-only if no order. | 2026-09-03 |

**All 4 open questions resolved. 0 open questions remain.**

---

## 2. Data Flow Trace

### S2 — Tape Chart (ReservationsPage)

**Data source:** Reuse `getReservationOps()` (OD-P4-02). This already fetches `local-reservations` with 60-day back / 30-day ahead window and transforms via `fromReservationOps`. The Tape Chart filters this list client-side to the visible date window (7/14/30 days).

**Room list:** Reuse `getAiosellRooms()` → `aiosellTransform.fromAPI.rooms()` for room catalog (id, tableNo, roomType). Already used by `getBookableRooms()`.

```
ReservationsPage mount
  → getReservationOps()          → reservations with dates, status, rooms, guest
  → getAiosellRooms()            → room catalog (r1-r5 with types)
  → client-side: map reservations onto room rows by restaurant_table_id / table_no
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

## 8. Verification Preview

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
