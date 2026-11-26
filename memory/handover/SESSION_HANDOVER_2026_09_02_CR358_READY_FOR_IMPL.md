# SESSION HANDOVER — CR-358 PMS Module
**Date:** 2026-09-02 | **Written by:** Current agent for incoming agent
**Purpose:** Next agent picks this up, presents the full plan to owner, gets GO, then starts Phase 1 implementation.

---

## WHAT IS CR-358?

A brand-new **Property Management System (PMS) module** that integrates with the **AIOSELL channel manager** to bring OTA bookings (Booking.com, Expedia, Airbnb etc.) directly into the POS. It also redesigns the room check-in experience with a full front desk workflow.

**In plain terms:** Instead of managing room bookings on a separate system, hotel staff will manage everything from MyGenie — they'll see OTA reservations automatically, do check-ins, manage rooms, and push availability back to all booking platforms.

---

## CURRENT STATUS

| Gate | Status |
|---|---|
| Gate 1 — Intake | ✅ COMPLETE |
| Gate 2 — Impact Analysis (parent) | ✅ COMPLETE (all 8 owner decisions answered) |
| Gate 2 — Phase 1 Impact Analysis | ✅ COMPLETE |
| Gate 3 — Phased Plan (5 phases) | ✅ COMPLETE + **OWNER APPROVED 2026-09-01** |
| Gate 3 — Phase 1 Implementation Plan | ✅ COMPLETE |
| Gate 4 — Gate 4 GO for Phase 1 | ⏳ **NEXT — owner must say GO** |
| Gate 5 — Implementation Phase 1 | Not started |

**All 4 backend blockers are fixed and agent-verified** (2026-09-01). Zero backend blockers for Phases 1 and 2.

---

## THE BIG PICTURE — WHAT WILL BE BUILT

### New Sidebar Section: "Rooms & Reservations" (9 screens total across 5 phases)

| Screen | Route | Phase | What it does |
|---|---|---|---|
| Channel Manager | `/pms/channel-manager` | **P1** | AIOSELL connect, room mapping, inventory sync to OTAs |
| In-House Guests | `/pms/in-house` | **P1** | Live list of all currently checked-in guests |
| New Booking | `/pms/new-booking` | P2 | Walk-in booking or advance booking; calls check-in API |
| Check-In | `/pms/check-in` | P2 | Staff-led check-in for OTA, Direct, Walk-in guests |
| Front Desk | `/pms/front-desk` | P3 | Today's arrivals + departures + KPI strip |
| Arrivals | `/pms/arrivals` | P3 | Full arrivals list for the day |
| Departures | `/pms/departures` | P3 | Full departures list, deep-links to Collect Bill |
| Tape Chart | `/pms/reservations` | P4 | Gantt calendar — room × date grid with colour-coded blocks |
| Room Status | `/pms/room-status` | P4 | Room board — Available / Occupied / Housekeeping / OOO |

**Sections visible only to hotel-type restaurants** (`features.room = true`).

---

## PHASE-BY-PHASE BREAKDOWN

### PHASE 1 — Foundation + Channel Manager + In-House ← **THIS IS NEXT**
**Theme:** Everything unblocked today. Establishes the skeleton all later phases plug into.
**Backend dependency:** NONE — fully testable end-to-end now.

**9 files:** `api/constants.js` (edit) · `aiosellService.js` (new) · `pmsService.js` (new) · `aiosellTransform.js` (new) · `App.js` (edit) · `Sidebar.jsx` (edit) · `ChannelManagerPage.jsx` (new) · `InHouseGuestsPage.jsx` (new) · `PmsPlaceholderPage.jsx` (new)

**Delivers:**
- Sidebar "Rooms & Reservations" section wired with all 9 links (P2–P5 links show "Coming in Phase N" placeholder)
- S8 Channel Manager: AIOSELL connection status, start/stop, room mapping (local table ↔ AIOSELL room type), inventory push/pull, fetch reservations
- S6 In-House Guests: live table of all guests currently checked-in (existing `GET_ROOM_LIST` reused)
- Meal plan decoder built in (rateplanCode suffix → Room Only / Breakfast Included / Half Board / Full Board)
- **App.js and Sidebar.jsx are touched ONCE and frozen — never touched again in P2–P5**

**Estimated ~1,600 new lines.**

---

### PHASE 2 — Booking Creation + Check-In
**Theme:** Revenue-path screens. Uses existing `ROOM_CHECK_IN` endpoint + new `direct-reservation` endpoint.
**Backend dependency:** NONE (all 4 blockers confirmed fixed 2026-09-01).

**Delivers:**
- S3 New Booking: walk-in immediate check-in + "Save as Booking" → `POST /aiosell/direct-reservation` (advance bookings)
- S4 Check-In: redesigned check-in screen for Walk-in, Direct, and OTA (`booking_type=Online` with `booking_id`)
- Meal plan badge wired into S4
- Does NOT touch RoomCheckInModal.jsx or DashboardPage.jsx (co-exist per OD-01)

**Estimated ~1,100 new lines.**

---

### PHASE 3 — Front Desk, Arrivals, Departures
**Theme:** All screens fed by `GET /aiosell/local-reservations`.
**Backend dependency:** ✅ CLEARED — `local-reservations` confirmed 200 (agent-verified 2026-09-01).

**Delivers:**
- S1 Front Desk: today's arrivals, KPI strip (occupancy %, arrivals, departures, in-house)
- S9 Arrivals: paginated arrivals list with OTA badges, special requests, prepaid flag
- S10 Departures: departures list linked to existing CollectPaymentPanel checkout
- **KPI endpoint** (`/aiosell/dashboard-kpis`) not built yet — KPI strip shows "—" skeleton until backend builds it (non-blocking per NS-02)

**Estimated ~1,200 new lines.**

---

### PHASE 4 — Tape Chart + Room Status Board
**Theme:** Hardest UIs — isolated last so data layer is battle-tested.
**Backend dependency:** `PATCH /aiosell/room-status/{table_id}` needed for S7 HK/OOO toggle (backend to build).

**Delivers:**
- S2 Tape Chart: Gantt grid — rows = rooms grouped by type, columns = dates, colour-coded blocks by OTA source
- S7 Room Status Board: 5 states (Available/Booked/Occupied/Housekeeping/OOO), staff can toggle HK/OOO

**Estimated ~1,300 new lines.**

---

### PHASE 5 — Rates, Restrictions, No-Show + Full Regression
**Theme:** NS-01 AIOSELL rate endpoints + close the full module loop.
**Backend dependency:** NS-01 endpoints to be curl-probed first (never probed yet).

**Delivers:**
- S8 Tabs C+D: push/fetch rates, push inventory restrictions, mark-no-show
- GAP-09 verification: does checkout trigger inventory release to AIOSELL?
- Full regression: OTA booking → webhook → arrivals → check-in → tape chart → in-house → checkout → inventory release

**Estimated ~700 new lines.**

---

## KEY ARCHITECTURAL DECISIONS (ALL LOCKED)

| ID | Decision |
|---|---|
| OD-01 | **CO-EXIST** — RoomCheckInModal.jsx and DashboardPage.jsx NOT touched. PMS is a parallel build. |
| OD-02 | `ROOM_CHECK_IN` with `booking_type=Online` requires explicit `booking_id` from FE |
| OD-03 | AIOSELL setup lives **inside S8** Channel Manager (top section) |
| OD-04 | Room mapping lives **inside S8** (dedicated tab) |
| OD-05 | Self check-in (WhatsApp/SMS flow) → **Phase 2 of product** (out of CR-358 scope entirely) |
| OD-06 | "Save as Booking" → `POST /aiosell/direct-reservation` endpoint (confirmed working) |
| OD-07 | HK/OOO room state stored by **backend** (persists across devices) |
| OD-08 | Meal plan badge YES — decode rateplanCode suffix: ep/cp/map/ap → labels |
| OD-P1-01 | PMS sidebar gated on `features.room` — hotel-only. Owner will provide a dedicated key later (1-line swap) |

---

## WHAT NEXT AGENT MUST DO

**Step 1 — Present this plan to owner (now)**

Present the 5-phase breakdown. Ask:
> "Phase 1 is fully planned and ready to implement. It delivers Channel Manager (AIOSELL setup, room mapping, inventory sync) and In-House Guests list. Shall I start Phase 1 implementation now?"

**Step 2 — On Gate 4 GO from owner, start Phase 1 implementation**

The Gate 3 Implementation Plan is at:
`/app/memory/plans/CR-358-P1_IMPLEMENTATION_PLAN.md`

This plan has **exact code** for all 9 files — copy-paste ready. Follow the 9-step execution order precisely:
1. `PmsPlaceholderPage.jsx` (NEW)
2. `api/constants.js` (ADD AIOSELL_ENDPOINTS block at EOF)
3. `api/transforms/aiosellTransform.js` (NEW)
4. `api/services/aiosellService.js` (NEW)
5. `api/services/pmsService.js` (NEW)
6. `pages/pms/ChannelManagerPage.jsx` (NEW)
7. `pages/pms/InHouseGuestsPage.jsx` (NEW)
8. `components/layout/Sidebar.jsx` (5 targeted edits — READ FILE FIRST)
9. `App.js` (2 targeted edits — imports + routes)

**Step 3 — Compile check**
After Steps 1–7 (new files only), then after Steps 8–9 (hotspot edits). Target: `webpack compiled with N warnings` — same pre-existing warnings, no new errors.

**Step 4 — Self-verify (V1–V20 from the plan)**
Key checks:
- `decodeMealPlan("deluxe-ep")` → `"Room Only"` (unit test the transform)
- Navigate `/pms/channel-manager` → S8 loads with AIOSELL status
- Navigate `/pms/in-house` → In-House table renders
- Navigate `/pms/new-booking` → "Coming in Phase 2" placeholder
- Existing sidebar sections (Dashboard, Reports, Inventory) still visible

**Step 5 — EXIT GATE (5 checkboxes)**
- `registry.json`: CR-358-P1 → IMPLEMENTED, sprint_key: pos_pms_1
- `CR_REGISTRY.md`: row added
- `FILE_OWNERSHIP.md`: all 9 files listed
- Code markers: `// CR-358-P1` in every file
- Compile: 0 new warnings

**Step 6 — QA handover + owner smoke (restaurant 69 on preprod)**

---

## CRITICAL RULES FOR NEXT AGENT

1. **DO NOT touch** `RoomCheckInModal.jsx`, `DashboardPage.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js` (OD-01 co-exist)
2. **Sidebar.jsx** — READ the file before every edit. Verify line numbers match the plan (plan was verified at Sidebar.jsx = 836 lines). If line numbers drifted, adapt the search string.
3. **App.js** — Add imports after the last existing import. Add routes before the closing `</Routes>`. Plan verified at App.js = 253 lines / 101 routes.
4. **BUG-361 pattern** — Every new PMS page must use: `useState(() => localStorage.getItem('mygenie_sidebar_expanded') === 'true')` for sidebar state. The plan's code already does this — do not remove it.
5. **aiosellTransform defensive guards** — Every `fromAPI.*` function uses `data ?? {}` to guard null responses. Do not skip this.
6. **Test credentials** — Restaurant 69 on preprod. Account: `owner@thegoankitchen.com`. Password in test_credentials.md.

---

## FILES IN /app/memory RELEVANT TO CR-358

| File | Purpose |
|---|---|
| `change_requests/CR-358_PMS_CHANNEL_MANAGER_CHECKIN_REDESIGN_INTAKE.md` | Full intake — 5 flows, 6 screens, all owner decisions |
| `impact/CR-358_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md` | Parent Gate 2 — API mapping, all 17 gaps, scope lock |
| `impact/CR-358-P1_IMPACT_ANALYSIS.md` | Phase 1 Gate 2 — 9 files, data flow traces, risks |
| `plans/CR-358_EXECUTION_PLAN_PHASED.md` | 5-phase roadmap (OWNER APPROVED 2026-09-01) |
| `plans/CR-358-P1_IMPLEMENTATION_PLAN.md` | Phase 1 Gate 3 — **exact code, step-by-step, ready to implement** |
| `backend_briefs/BACKEND_BRIEF_CR358_2026_08_28.md` | Backend API spec + what's been fixed |

---

## DESIGN MOCKUPS (in /app/frontend/public/)

The owner-approved design mockups are in the frontend public folder:
- `cr133-printer-mockup.html` — printer agent (not PMS, ignore)
- Look for `pms*` HTML files (check with: `ls /app/frontend/public/ | grep pms`)

---

*Handover written: 2026-09-02 | Status: Phase 1 Gate 3 complete, awaiting Gate 4 GO | All docs in /app/memory/plans/ and /app/memory/impact/*
