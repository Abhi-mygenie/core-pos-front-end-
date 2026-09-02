# SESSION HANDOVER — CR-358 PMS Module: Probe Results + OD Answers
**Date:** 2026-08-31
**Role used:** INTAKE (handover_2 triage) + probe verification
**For:** Design Agent (next session)
**Status:** Gate 2 COMPLETE — ODs answered, probes run, design review required for new scope before Gate 3

---

## 1. What This Session Covered

1. **Memory sync** — pulled full `/app/memory/` from PMS branch. 81 files synced.
2. **handover_2.md read** — new backend ops handbook. Cross-referenced against all open CR-358 gaps.
3. **All curl probes run** — restaurant 69 / preprod.mygenie.online. Token from owner@thegoankitchen.com.
4. **6 of 8 ODs answered** by owner. OD-08 pending design review.
5. **3 backend bugs found** (BUG-BE-01/02/03). 1 missing endpoint (dashboard-kpis).
6. **Impact analysis updated** — §OD, §NS, §PROBE, §BUGS sections added.
7. **Registry updated** — CR-358 status advanced.

---

## 2. The Only CR This Session

**CR-358** — PMS Module + Channel Manager Integration (AIOSELL)

| Artifact | Path |
|---|---|
| Impact Analysis (updated) | `impact/CR-358_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md` |
| Backend Brief | `backend_briefs/BACKEND_BRIEF_CR358_2026_08_28.md` |
| Design Spec (original 10 screens) | `plans/CR-358_DESIGN_SPEC_2026_08_27.md` |
| Probe evidence | `evidence/CR-358/` (verify01–05 json files, probe_summary.json) |
| Existing HTML mockups | `/app/frontend/public/pms/` (10 files — see §4) |

---

## 3. All Confirmed Decisions (do NOT re-ask these)

| Decision | Answer |
|---|---|
| OD-01: PMS vs RoomCheckInModal | **CO-EXIST** — full parallel build, modal + DashboardPage untouched |
| OD-02: OTA check-in linkage | FE passes `booking_id` explicitly in ROOM_CHECK_IN payload |
| OD-03: AIOSELL setup UI | Inside S8 Channel Manager — "Connect AIOSELL" section at top |
| OD-04: Room mapping UI | Inside S8 Channel Manager — "Room Mapping" tab |
| OD-05: Self check-in | **Phase 2** — S5 screen dropped from CR-358 |
| OD-06: Direct reservation | `POST /aiosell/direct-reservation` endpoint confirmed (has BUG-BE-03) |
| OD-07: HK/OOO state | **Backend field** — needs `PATCH /aiosell/room-status/{table_id}` |
| NS-01: New S8 endpoints | **In scope** — push-rates, fetch-rates, push/rate-restrictions, mark-no-show |
| NS-02: Dashboard KPIs | **Wait for backend** — `/aiosell/dashboard-kpis` to be built, not approximated |

---

## 4. Existing HTML Mockups (Design Source of Truth)

All at: `https://dc436f6f-1984-48c3-9b04-50f82a21d1ee.preview.emergentagent.com/pms/`

| File | Screen | Status |
|---|---|---|
| `front-desk.html` | S1 Front Desk | Exists — review for KPI strip + OD-08 meal plan |
| `reservations.html` | S2 Tape Chart | Exists |
| `new-booking.html` | S3 New Booking + Direct | Exists |
| `check-in.html` | S4 Staff Check-In | Exists — review for OD-08 meal plan badge |
| `self-checkin.html` | S5 Self Check-In | **DROPPED** — Phase 2 |
| `in-house.html` | S6 In-House Guests | Exists |
| `room-status.html` | S7 Room Status Board | Exists — HK/OOO states need backend-persisted toggle |
| `channel-manager.html` | S8 Channel Manager | Exists — **NEEDS MAJOR EXPANSION** (see §5) |
| `arrivals.html` | S9 Arrivals | Exists |
| `departures.html` | S10 Departures | Exists |

---

## 5. What Design Agent Must Add (missing designs)

The original 10 screens only cover the basic flows. New scope confirmed by owner requires additional design work:

### S8 Channel Manager — needs 3 new sub-sections designed:

**S8-A: Connect AIOSELL (setup)**
Currently S8 shows status/sync only. Need design for:
- Empty state: "AIOSELL not connected" with Connect button
- Connect form: hotel_code, pms_slug, api_base_url, api_key fields
- Connected state: shows hotel_code, is_running status, last_sync_at
- Start / Stop service buttons

**S8-B: Room Mapping tab**
New tab inside S8. Need design for:
- Table: local room (table_no) ↔ AIOSELL room type (aiosell_room_code) ↔ rate plan
- Mapping complete badge / incomplete warning
- Save mappings button
- Uses: `GET /aiosell/rooms` → `local_rooms[]`, `aiosell.body.rooms[]`, `mappings[]`

**S8-C: Rates & Restrictions section**
New section inside S8. Need design for:
- Date range picker
- Rate grid: roomCode × rateplan × rate (editable cells)
- Push rates button
- Inventory restrictions: stopSell toggle, minimumStay input per room per date
- Rate restrictions: same
- Channel selector (booking.com, agoda etc.)

**S8-D: Mark No-Show**
From S9 Arrivals or S8 — button/action to mark a pending booking as no-show.
Only for booking.com / gommt channels. Shows 422 error for other channels.

### S7 Room Status Board — HK/OOO toggle:
How does staff manually mark a room as Housekeeping or Out of Order?
- Click on room card → status dropdown → HK / OOO / Available
- This must call `PATCH /aiosell/room-status/{table_id}` (backend to build)
- Design needs to show this interaction

### OD-08 (PENDING — design to decide):
S4 Check-In: should rateplanCode suffix be decoded to meal plan badge?
- e.g. `executive-s-ep` → show "Room Only" badge
- e.g. `executive-d-cp` → show "Breakfast Included" badge
- Design agent: include both variants in S4 mockup, owner will choose

---

## 6. Backend Blockers (for backend team — NOT for design agent)

Must be fixed BEFORE FE implementation can start on check-in and reservation screens:

| Bug | Root Cause | Fix |
|---|---|---|
| **BUG-BE-01/02** | Migration `2026_08_31_160000_aiosell_reservation_room_assignments.php` not run on preprod. `AiosellReservationRoom` missing `order` HasOne relationship. | Run migration + add model relationship |
| **BUG-BE-03** | `user_id_documents.booking_type` ENUM missing `Direct` value | `ALTER TABLE user_id_documents MODIFY booking_type ENUM('WalkIn','Online','Direct')` |
| **MISSING** | `GET /aiosell/dashboard-kpis` returns 404 | Backend to build endpoint |
| **MISSING** | `PATCH /aiosell/room-status/{table_id}` (OD-07) | Backend to build endpoint + add room_status field |

---

## 7. Confirmed Scope of CR-358 (locked)

**9 new screens** (S5 dropped):
S1 Front Desk · S2 Tape Chart · S3 New Booking · S4 Check-In (Staff OTA + Direct) · S6 In-House Guests · S7 Room Status Board · S8 Channel Manager (expanded) · S9 Arrivals · S10 Departures

**S8 now has 4 sub-sections** (was 1):
S8-A: Connect AIOSELL · S8-B: Room Mapping · S8-C: Rates & Restrictions · S8-D: Sync / No-Show

**4 new services/transforms (unchanged from original plan):**
`aiosellService.js` · `pmsService.js` · `aiosellTransform.js` · `roomStatusTransform.js`

**Files confirmed NOT touched:**
`RoomCheckInModal.jsx` · `DashboardPage.jsx` · `CollectPaymentPanel.jsx` · `OrderEntry.jsx` · `orderTransform.js`

---

## 8. Next Agent Instructions

**Role:** PLANNING (design agent — Gate 2 addendum)

**First action:** Read this handover in full. Then open the 10 existing HTML mockups (§4 URLs). Then design the 4 missing sub-sections (§5) as new HTML mockups in `/app/frontend/public/pms/`.

**Do NOT:**
- Re-ask OD-01 through OD-07 (already answered — see §3)
- Touch any existing source files in `src/`
- Write Gate 3 implementation plan yet — owner reviews new designs first

**Only then:** owner reviews all designs → confirms OD-08 → Gate 3 Implementation Plan written.

---

*Session: 2026-08-31 | Role: INTAKE + probe verification*
*Next role: PLANNING (design agent for S8-A, S8-B, S8-C, S8-D, S7 HK/OOO, OD-08 variants)*
