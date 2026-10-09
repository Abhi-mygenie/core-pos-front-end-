# Impact Analysis — BUG-380: Occupied Rooms Shown in Booking Picker

**ID:** BUG-380
**Gate:** 2 (Impact Analysis)
**Date:** 2026-09-03
**Code Reality:** NONE — no occupancy filtering exists in PMS room picker
**Conflict Pre-Check:** No open conflicts. pmsService.js last modified by CR-358-P3 (Gate 4 DONE same day). All prior items (CR-358-P1, P2, P3, BUG-378) are IMPLEMENTED. Safe to proceed.

---

## 1. Owner Decision (Locked)

| ID | Decision | Value | Date |
|---|---|---|---|
| OQ-380-01 | Hide vs grey out | **(b) Greyed out with "Occupied" badge** | 2026-09-03 |

---

## 2. Data Flow Trace

### Current Flow (broken)
```
NewBookingPage.jsx L54    → getBookableRooms()
  pmsService.js L79-84    → getAiosellRooms()                → GET /aiosell/rooms
                           → aiosellTransform.fromAPI.rooms()  → extracts localRooms[]
                           → return localRooms.map(...)         → ALL rooms, no filter
                                                                → { id, tableNo, roomType }
```
Same data feeds CheckInPage.jsx L46 room dropdown.

### What knows occupancy?

| Source | Endpoint | Occupancy Signal | Notes |
|---|---|---|---|
| `getRoomList()` | `GET /get-room-list` | Returns ONLY occupied rooms (with `order_id`). Checked-out rooms excluded. (Verified in roomListTransform.js L20-22 comment: "Backend already filters to currently-in-house rooms") | **Best source — already in codebase, no new API** |
| `TableContext.fetchTables()` | `GET /table-list` | `engage` boolean → `isOccupied` | Requires TableContext provider (PMS pages don't use it) |
| `local-reservations?view=in_house` | AIOSELL | `rooms[].table_no` | Heavier call, misses walk-ins (BUG-381) |

**Recommended source:** `getRoomList()` — lightest call, already imported in pmsService.js, returns only occupied rooms, includes walk-ins (addresses edge case BUG-381 partially).

### Fixed Flow (proposed)
```
getBookableRooms()
  1. getAiosellRooms()       → all rooms (catalog)
  2. getRoomList()            → occupied rooms (in-house)
  3. occupiedTableIds = Set( step2.map(r => r.table.id) )
  4. return rooms.map(r => ({ ...r, isOccupied: occupiedTableIds.has(r.id) }))
```

Pages render occupied rooms greyed out with badge, non-selectable.

---

## 3. Affected Files

| # | File | Current Lines | Change Type | Risk |
|---|---|---|---|---|
| F1 | `api/services/pmsService.js` | L79-84 (`getBookableRooms`) | MODIFY — add `getRoomList()` cross-reference, return `isOccupied` flag | MEDIUM |
| F2 | `pages/pms/NewBookingPage.jsx` | L182-189 (room grid `.map()`) | MODIFY — grey out + badge for `r.isOccupied`, disable click | LOW |
| F3 | `pages/pms/CheckInPage.jsx` | L331-333 (room `<select>`) | MODIFY — disable + label occupied rooms in dropdown | LOW |

### Files NOT Touched
- `aiosellTransform.js` — no transform change needed
- `aiosellService.js` — `getAiosellRooms()` unchanged
- `roomListTransform.js` — not used (we only need table IDs, not full rows)
- `roomService.js` — `getRoomList()` already exported, called as-is
- `App.js` — no route changes
- `CollectPaymentPanel.jsx` — not related
- `DashboardPage.jsx` — not related
- `InHouseGuestsPage.jsx` — not related (uses separate flow)

---

## 4. Downstream Consumers

| Consumer | How it uses `getBookableRooms()` | Impact of adding `isOccupied` |
|---|---|---|
| `NewBookingPage.jsx` L54 | Populates room grid | Must handle `isOccupied` for grey-out UI |
| `CheckInPage.jsx` L46 | Populates room dropdown | Must handle `isOccupied` for disabled option |

No other consumers exist (confirmed via grep: 5 refs total, 2 are the function definition + import).

---

## 5. Risk Assessment

| Risk Factor | Level | Rationale |
|---|---|---|
| API call addition | MEDIUM | `getRoomList()` is an existing call, well-tested (used by InHouseGuestsPage since CR-358-P1). Adds ~100ms to room load. |
| Data contract | LOW | `getRoomList()` returns `[{ table: { id }, order_id, user }]` — stable since CR-004. Only `table.id` needed. |
| UI regression (NewBooking) | LOW | Additive change — existing rooms still render, occupied ones get visual overlay. No layout shift. |
| UI regression (CheckIn) | LOW | Dropdown option disabled + label suffix. Existing selection logic unaffected (can't select disabled). |
| Walk-in edge case | NOTE | `getRoomList()` includes walk-in occupied rooms (returns any room with active `order_id`). This means BUG-380 fix will correctly grey out walk-in occupied rooms too — partial mitigation for BUG-381. |
| Race condition | LOW | Room could be checked in between `getBookableRooms()` load and user clicking "Save". This is pre-existing (the fix reduces the window, doesn't eliminate it). Backend should reject double-booking regardless. |

**Overall Risk: MEDIUM** (API call addition in hotspot file, but well-tested existing endpoint)

---

## 6. Verification Preview

| # | Check | Method |
|---|---|---|
| V1 | `getBookableRooms()` returns `isOccupied: true` for r1/r2 (currently in-house) | curl + unit |
| V2 | NewBookingPage room grid shows r1/r2 greyed out with "Occupied" badge | Browser |
| V3 | Clicking greyed-out room does NOT select it | Browser |
| V4 | Available rooms (r3/r4/r5) still selectable and work normally | Browser |
| V5 | CheckInPage dropdown shows occupied rooms as disabled with "(Occupied)" label | Browser |
| V6 | After checkout of r1, refreshing NewBookingPage shows r1 as available again | Browser (requires in-house room) |
| V7 | Webpack compiles after all edits | CLI |
| V8 | No forbidden colors in new/modified lines | grep |

---

## 7. Estimated Scope

- **Edits:** 3 (1 service + 2 page files)
- **Lines changed:** ~25-30
- **New files:** 0
- **Hotspot files touched:** 1 (pmsService.js)
- **Fast Lane eligible:** NO (3 files, API call added, hotspot)
