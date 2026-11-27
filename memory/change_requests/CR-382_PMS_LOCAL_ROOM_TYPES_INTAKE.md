# CR-382 — PMS Local Room Types: Settings CRUD + Room Assignment + Rate Pre-fill

**ID:** CR-382
**Registered:** 2026-09-15
**Role:** INTAKE (ALPHA v0.7)
**Status:** GATE 1 — INTAKE COMPLETE

---

## Classification

| Field | Value |
|---|---|
| Type | CR — New Feature |
| Priority | P2 |
| Risk | MEDIUM |
| Risk reason | Pre-fill only (editable default in input field) — no financial formula, not R6. No money sent to backend from this feature. Staff can always override. |
| Fast Lane eligible | NO — MEDIUM risk, 6-8 files |
| Sprint | pos_pms_1 |
| Duplicate check | **DISTINCT** — no existing CR for `/room-types` endpoint. CR-361 is about room *assignment on tape chart* (a different PUT endpoint). Not related. |
| Code reality | **NONE** — grep confirms `/room-types` endpoint not in `API_ENDPOINTS`, not in any service file, zero FE integration. |
| Blast radius | **MEDIUM** — ~6-8 files (constants.js, pmsService.js ×2 fns, NEW RoomTypesPage.jsx, CheckInPage.jsx, NewBookingPage.jsx, App.js, optionally Sidebar.jsx) |
| Hotspot files touched | YES — `CheckInPage.jsx` (R5-adjacent, but only adding 1 pre-fill useEffect; no formula change) |
| Source | AGENT-DISCOVERED — investigation report `INV_LOCAL_ROOM_TYPES_2026_09_15.md` |
| Confidence | HIGH — endpoint live (200) + code traced + screenshots confirmed |

---

## Plain English Summary

The backend has shipped 4 new API endpoints for managing **local room types** — e.g. "Deluxe = ₹3,500/night", "Suite = ₹5,000/night" — and assigning physical rooms to those types.

**Today:** Hotels without Aiosell (Channel Manager) see every room as "Room" with ₹0 as the default rate. There is no way to configure room categories or default prices.

**What this CR adds:**
1. A **Room Types settings page** — staff can create/edit/delete room types, give each a name and a default nightly rate, and assign rooms to types.
2. When a staff member picks a room in **New Booking** or **Check-In**, the Room Amount field can auto-fill with that room's configured default rate (editable — staff can still change it).

**Hotels with Aiosell are completely unaffected.** The existing Channel Manager flow is additive — local type name/rate is a fallback only.

---

## Backend Endpoints (all confirmed live via probe 2026-09-15)

| Endpoint | Method | Purpose |
|---|---|---|
| `/room-types` | GET | Fetch all defined types + room assignments |
| `/room-types` | PUT | Create or update room types |
| `/room-types/assign` | PUT | Assign rooms to a type |
| `/room-types/{id}` | DELETE | Delete a type (clears room assignments) |

**Evidence:** `evidence/CR-364/probe_room_types_2026_09_15.json`

---

## Gap Analysis — What FE Needs to Build

| # | Gap | Scope | Files |
|---|---|---|---|
| G1 | No `API_ENDPOINTS.LOCAL_ROOM_TYPES` constant | +1 line | `constants.js` |
| G2 | No `getLocalRoomTypes()`, `saveRoomTypes()`, `assignRoomTypes()` service fns | +3 fns | `pmsService.js` |
| G3 | `getBookableRooms()` / `getTapeChartData()` don't merge local type + rate | Modify 2 fns | `pmsService.js` |
| G4 | No Room Types settings page (CRUD types + room assignment) | NEW page | `pages/pms/RoomTypesPage.jsx` |
| G5 | `CheckInPage.jsx` Room Amount doesn't pre-fill from `default_sell_rate` | +1 useEffect | `CheckInPage.jsx` |
| G6 | `NewBookingPage.jsx` Room Amount defaults to ₹0 | +1 useState | `NewBookingPage.jsx` |
| G7 | No route `/pms/room-types` | +1 route | `App.js` |
| G8 | No Sidebar entry (depends on OD-382-02) | +1 line | `Sidebar.jsx` (conditional) |

**WILL NOT change:** `CollectPaymentPanel.jsx`, `PmsCheckoutDrawer.jsx`, `orderTransform.js` — per backend brief, the rate pre-fill is a UI suggestion only, not wired into payment flow.

---

## Design Rules (from backend brief)

| Rule | FE implication |
|---|---|
| BE does not inject the type rate | FE pre-fills Room Amount as editable default — staff can override |
| CM hotels (Aiosell) unchanged | `getBookableRooms()` priority: local type → Aiosell type → null. Never drop Aiosell. |
| One rate per type, no per-room override | RoomTypesPage has 1 rate input per type, not per room |
| `local_room_type_id: null` clears assignment | Unassign = send null in PUT /room-types/assign |

---

## Evidence

| Field | Value |
|---|---|
| Screenshot | Not provided (investigation screenshots in `investigations/INV_LOCAL_ROOM_TYPES_2026_09_15.md` §4) |
| Steps to reproduce | Open New Booking → select room → Room Amount shows ₹0 (no default). Room type shows "(Room)" — null fallback. |
| Curl output | `evidence/CR-364/probe_room_types_2026_09_15.json` — GET /room-types returns 200, `types: []`, 5 rooms with `local_room_type_id: null` |
| Source | AGENT-DISCOVERED |
| Confidence | HIGH |

---

## Open Decisions (ALL OPEN — owner must answer before Gate 2)

| OD | Question | Options |
|---|---|---|
| **OD-382-01** | Build now or park? Goan Kitchen has Aiosell CM (rooms already have type names). This feature mainly benefits hotels WITHOUT Aiosell. Do you want to build it now (for future hotels or platform clients), or park it? | **BUILD NOW** / **PARK** |
| **OD-382-02** | Where in the sidebar should the Room Types settings page appear? | **A)** Under "Rooms & Reservations" (next to Channel Manager) · **B)** Under "Settings" section |
| **OD-382-03** | When staff select a room in New Booking or Check-In, should Room Amount auto-fill from the configured default rate (editable)? | **YES — auto-fill (editable)** / **NO — keep blank** |

**Rule:** Gate 2 (Impact Analysis) CANNOT start until OD-382-01 is answered YES.
If OD-382-01 = PARK → log as parked investigation, status = PARKED, no further gates.

---

## Handover Note

Investigation complete at `investigations/INV_LOCAL_ROOM_TYPES_2026_09_15.md`.
CR registered. All 3 ODs captured above and in session handover.
Owner to answer ODs in next session. Planning (Gate 2) cannot start until OD-382-01 = BUILD NOW.

---

*Intake written 2026-09-15 · INTAKE agent (ALPHA v0.7)*
