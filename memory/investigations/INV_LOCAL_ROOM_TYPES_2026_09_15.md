# Investigation Report — Local Room Types API (Backend Brief 2026-09-15)

**Date:** 2026-09-15
**Role:** INVESTIGATION (ALPHA v0.7)
**Steps used:** 6/10
**Confidence:** HIGH

---

## 1. Summary

| Field | Value |
|---|---|
| Root question | Backend shipped new `/room-types` endpoints — what does FE need to do? |
| Classification | NEW FEATURE — not a bug |
| Confidence | HIGH — endpoint live + code traced + data flow confirmed |
| Recommendation | Register as new CR. INTAKE role next. |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Result | Evidence |
|---|---|---|---|---|
| H1 | `/room-types` endpoint is live on preprod | curl GET | **CONFIRMED** — 200, 5 rooms returned | `evidence/CR-364/probe_room_types_2026_09_15.json` |
| H2 | FE currently calls `/room-types` | grep codebase | **ELIMINATED** — 0 hits. Not in `API_ENDPOINTS`. | Code search result |
| H3 | Non-CM hotels show "Room" everywhere (null roomType) | Code trace | **CONFIRMED** — `roomType: typeById[r.id] ?? null` → null when no Aiosell mapping | `pmsService.js:L94` |
| H4 | Brief conflicts with existing CM (Aiosell) flow | Code + brief | **ELIMINATED** — Brief explicitly says CM hotels unchanged. Local types are additive. | Brief §Why |

---

## 3. Data Flow Trace

### Current FE flow (all hotels today)

```
getBookableRooms() / getTapeChartData()
    ↓
getAiosellRooms()  →  aiosellTransform.fromAPI.rooms()
    ↓
mappings[] = [{ restaurantTableId, aiosellRoomCode }]
typeById = { tableId → aiosellRoomCode }
    ↓
rooms.map(r => ({
  roomType: typeById[r.id] ?? null   ← null for unMapped / non-CM hotels
}))
    ↓
UI: r.roomType ?? 'Room'   ← shows "Room" when null
```

**Goan Kitchen probe confirms:** 5 rooms (r1–r5), `local_room_type_id: null`, `default_sell_rate: null` on all. `types: []` — no local types created. Rooms show "Room" as fallback.

### New flow the brief enables

```
GET /room-types
    → data.types[]:  [ { id, name, default_sell_rate } ]
    → data.rooms[]:  [ { restaurant_table_id, local_room_type_name, default_sell_rate } ]

localTypeById = { restaurant_table_id → local_room_type_name }
rateById      = { restaurant_table_id → default_sell_rate }

rooms.map(r => ({
  roomType:    localTypeById[r.id] ?? typeById[r.id] ?? null,
  defaultRate: rateById[r.id] ?? null
}))
    ↓
UI: r.roomType ?? 'Room'   ← now shows "Deluxe" / "Suite"
CheckInPage: Room Amount pre-fills with defaultRate (editable)
NewBookingPage: same
```

---

## 4. Screenshot Analysis

**Screenshot 1 — New Booking (`pos-uat.mygenie.online`):**
- Rooms show as "R-2 (Room)" and "aZ (Room)" — `roomType = null` fallback confirmed
- "R-2 (Room)" in right summary panel = same null path
- Room Amount shows ₹0 — no `default_sell_rate` available (local types not set up)
- **This is the exact problem the brief solves.** Once local types are configured and rooms assigned, "R-2 (Room)" becomes "R-2 (Deluxe)" and Rate Amount pre-fills ₹3,500.

**Screenshot 2 — Channel Manager Inventory Restrictions:**
- Shows "Executive Room" and "Suite" — these are **Aiosell room type codes** (from CM mapping)
- Unrelated to local room types. CM flow unchanged per brief.

**Screenshot 3 — Channel Manager Room Mapping:**
- 10 rooms (101–206) mapped to Aiosell types (Non-view Room / Road View Room / View Room)
- This is a different hotel on UAT — shows how CM hotels work (existing flow)
- Confirms CM hotels already have `roomType` populated from Aiosell — local types would be additive, not replacing

---

## 5. Gap Analysis — What FE Needs to Build

| # | Gap | Scope | Files affected |
|---|---|---|---|
| G1 | No `API_ENDPOINTS.LOCAL_ROOM_TYPES` constant | +1 line | `constants.js` |
| G2 | No `getLocalRoomTypes()` / `saveRoomTypes()` / `assignRoomTypes()` service functions | +3 fns | `pmsService.js` |
| G3 | `getBookableRooms()` / `getTapeChartData()` don't merge local type name + rate | Modify 2 fns | `pmsService.js` |
| G4 | No Room Types settings UI (CRUD types + assign rooms) | NEW page | `pages/pms/RoomTypesPage.jsx` |
| G5 | `CheckInPage.jsx` doesn't pre-fill Room Amount from `default_sell_rate` | +1 useEffect | `CheckInPage.jsx` |
| G6 | `NewBookingPage.jsx` Room Amount defaults to 0 — should pre-fill from `default_sell_rate` | +1 useState | `NewBookingPage.jsx` |
| G7 | No route `/pms/room-types` | +1 route | `App.js` |
| G8 | No Sidebar entry (optional — depends on owner decision) | +1 line | `Sidebar.jsx` |

**WILL NOT change:** CollectPaymentPanel, PmsCheckoutDrawer, orderTransform — per brief "BE does not auto-fill check-in price". FE only pre-fills as editable suggestion; staff can override. R6 is not triggered (no formula, just default value in an input field).

---

## 6. Key Design Rules from the Brief

| Rule | What it means for FE |
|---|---|
| "BE does not inject the type rate" | FE pre-fills Room Amount as editable default, not a locked value |
| "CM hotels: Aiosell flow unchanged" | `getBookableRooms()` priority: local type → Aiosell type → null. Never drop Aiosell. |
| "One rate per type — no per-room override" | RoomTypesPage has 1 rate input per type, not per room |
| "local_room_type_id: null clears assignment" | Unassign = send null in PUT /room-types/assign |
| "`total_adult/children` = guest counts only" | Check-in form: adults/children are already handled, no rate change needed |

---

## 7. Pending Owner Decisions (needed at INTAKE)

| OD | Question |
|---|---|
| OD-NEW-01 | Does Goan Kitchen need this? They have Aiosell CM — local types are optional for them. Do you want to build the Room Types settings page now or park for non-CM hotels only? |
| OD-NEW-02 | Where should the Room Types settings page live in the sidebar? Under "Rooms & Reservations" alongside Channel Manager, or under "Settings"? |
| OD-NEW-03 | When staff open New Booking or Check-In and a room has a `default_sell_rate`, should the Room Amount field auto-fill that rate (editable), or stay blank as it is today? |

---

## 8. Recommendations

| Action | Role | Priority |
|---|---|---|
| Register as new CR (INTAKE) | INTAKE agent | Next |
| Severity: P2 (new feature, not broken flow) | — | — |
| Risk: MEDIUM (no financial formula — FE only pre-fills editable default) | — | — |
| Sprint: pos_pms_1 | — | — |
| Gate 2 not started — OD-NEW-01/02/03 must be answered first | — | — |

**Evidence:** `evidence/CR-364/probe_room_types_2026_09_15.json`

---

```
Root cause: NEW FEATURE — endpoint shipped, FE has no integration yet
Classification: FE_FEATURE (not FE_BUG or BACKEND_BUG)
Confidence: HIGH
Steps used: 6/10
Next: INTAKE agent to register new CR. Owner answers OD-NEW-01/02/03 first.
```

*Investigation written 2026-09-15 · Investigation agent (ALPHA v0.7)*
