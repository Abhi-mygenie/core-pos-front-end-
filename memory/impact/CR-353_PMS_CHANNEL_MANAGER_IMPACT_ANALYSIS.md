# CR-353 — Gate 2: Impact Analysis
## PMS Module + Channel Manager Integration (AIOSELL)

**CR ID:** CR-353 *(was labelled CR-351 — renumbered; see §1 GAP-01)*
**Date:** 2026-08-28 | **Updated:** 2026-08-31 (OD answers + probe results)
**Agent Role:** PLANNING — Gate 2 (Impact Analysis only)
**Gate:** 2 ✅ CLOSED — All 8 ODs answered, all probes run, all designs complete. Gate 3 READY.
**Code Reality:** NONE — no frontend AIOSELL/PMS code exists anywhere in `src/`
**Risk:** HIGH (new module, AIOSELL API integration — DashboardPage + RoomCheckInModal CONFIRMED NOT TOUCHED per OD-01)

---

## §OD — Owner Decisions Log (2026-08-31)

| ID | Question | Answer | Source |
|---|---|---|---|
| OD-01 | PMS check-in page vs RoomCheckInModal.jsx | **(b) CO-EXIST** — full parallel build. RoomCheckInModal.jsx + DashboardPage.jsx NOT touched | Owner confirmed |
| OD-02 | Does ROOM_CHECK_IN auto-link OTA booking? | **No** — FE must pass `booking_id` explicitly in payload | Probe VERIFY-02 (422 confirms field required) |
| OD-03 | Where does AIOSELL setup UI live? | **(a) Inside S8** — "Connect AIOSELL" section at top of Channel Manager panel | Owner confirmed |
| OD-04 | Where does room mapping UI live? | **(a) Inside S8** — new "Room Mapping" tab inside Channel Manager | Owner confirmed |
| OD-05 | Self check-in (S5) — MVP or Phase 2? | **Phase 2** — S5 screen entirely out of CR-353 scope | Owner confirmed |
| OD-06 | "Save as Booking" — which approach? | **(b) Backend builds direct-reservation** — endpoint confirmed in handover_2, has BUG-BE-03 | Probe confirmed endpoint exists |
| OD-07 | HK/OOO room state — FE or backend? | **(b) Backend field** — must persist across devices/sessions | Owner confirmed "should be from backend" |
| OD-08 | Decode meal plan from rateplanCode? | **(a) YES — Meal Plan Badge** — decode suffix: ep→Room Only, cp→Breakfast Incl., map→Half Board, ap→Full Board | ✅ CONFIRMED |

## §NS — New Scope Decisions (2026-08-31)

| ID | Question | Answer |
|---|---|---|
| NS-01 | New S8 endpoints in scope? | **YES** — push-rates, fetch-rates, push-inventory-restrictions, push-rate-restrictions, mark-no-show all in S8 |
| NS-02 | Dashboard KPIs — wait or approximate? | **Wait for backend** — `/aiosell/dashboard-kpis` endpoint to be built by backend |

## §PROBE — Curl Verification Results (2026-08-31, restaurant 69)

| Probe | Endpoint | Result | Status |
|---|---|---|---|
| VERIFY-04 | GET /aiosell/status | `is_running: true`, hotel_code: sandbox-pms | ✅ CLOSED |
| VERIFY-05 | GET /aiosell/rooms | `mapping_complete: true`, `can_push_inventory: true`, 5 rooms | ✅ CLOSED |
| VERIFY-01 | GET /aiosell/local-reservations | **HTTP 500** — RelationNotFoundException [order] on AiosellReservationRoom | 🔴 BUG-BE-01 |
| VERIFY-02 | POST user-group-check-in (Online + booking_id) | **HTTP 422** — same RelationNotFoundException | 🔴 BUG-BE-02 |
| VERIFY-03 | POST /aiosell/fetch-inventory | HTTP 200 — executive=5 available | ✅ CLOSED |
| B-06 | POST /aiosell/direct-reservation | **HTTP 500** — ENUM 'Direct' not in user_id_documents.booking_type | 🔴 BUG-BE-03 |
| B-08 | GET /aiosell/dashboard-kpis | **HTTP 404** — endpoint does not exist yet | ⏳ BACKEND TO BUILD |

## §RE-PROBE — 2026-09-01 (post backend fix, restaurant 69, agent-verified)

Backend reported fixes live on preprod (`reply_2.md`). Re-probed directly with owner credentials — both confirmed.

| Probe | Endpoint | Result | Status |
|---|---|---|---|
| VERIFY-01 (retest) | `GET /aiosell/local-reservations?view=arrivals` | **HTTP 200** — `data.reservations[]` with `operational_status`, per-room `line_status`, `guest{}`, `rooms[]` | ✅ **CLOSED — AGENT VERIFIED 2026-09-01** |
| B-06 (retest) | `POST /aiosell/direct-reservation` | **HTTP 201** — `channel="Direct"`, `booking_id=MG-69-...`, `operational_status="pending"` | ✅ **CLOSED — AGENT VERIFIED 2026-09-01** |

**Still open (backend-confirmed, agent NOT yet re-probed — needs a live OTA `booking_id` / assigned `room_id` to test):**

| # | Endpoint | Status | Blocks |
|---|---|---|---|
| BUG-BE-02 | `POST user-group-check-in` (`booking_type=Online` + `booking_id`) | Backend claims fixed (was 422) — **UNVERIFIED**, needs OTA booking_id | S4 OTA check-in |
| BUG-BE-04 (NEW) | `POST user-group-check-in` (`booking_type=Direct` + `booking_id`) | Backend claims fixed (was 403) — **UNVERIFIED** | S3/S4 Direct check-in |
| — | `POST /aiosell/mark-no-show` | Only 200 for `booking.com`/`gommt` pending — **UNVERIFIED** | S8-D No-Show |

## §BUGS — Backend Blockers (must fix before FE implementation)

**BUG-BE-01 + BUG-BE-02 (same root cause)** — ✅ **BUG-BE-01 RESOLVED 2026-09-01 (agent-verified 200)**. BUG-BE-02 (OTA check-in) still needs re-probe with a real `booking_id`.
- Root cause: Migration `2026_08_31_160000_aiosell_reservation_room_assignments.php` NOT run on preprod. `AiosellReservationRoom` model missing `order` HasOne relationship.
- Fix: Run migration on preprod + confirm model relationship added.
- Blocks: S1 Front Desk, S2 Tape Chart, S4 Check-In (OTA), S9 Arrivals, S10 Departures

**BUG-BE-03** — ✅ **RESOLVED 2026-09-01 (agent-verified 201 on `direct-reservation`)**. Note: Direct *check-in* (BUG-BE-04, was 403) still needs re-probe.
- Root cause: `user_id_documents.booking_type` ENUM only has WalkIn, Online. Value "Direct" missing.
- Fix: `ALTER TABLE user_id_documents MODIFY booking_type ENUM('WalkIn','Online','Direct')`
- Blocks: S3 New Booking "Save as Booking" (UNBLOCKED) + Direct check-in (§6.4, still BUG-BE-04)

**MISSING — /aiosell/dashboard-kpis**
- Endpoint does not exist. Backend to build: occupancy_pct, arrivals_today, departures_today, in_house_count.
- Blocks: S1 KPI strip

---

## Boot Sequence Completed

```
✅ CONTROL_DASHBOARD.md — read
✅ Intake doc — CR-351_PMS_CHANNEL_MANAGER_CHECKIN_REDESIGN_INTAKE.md — read
✅ Design Spec — plans/CR-351_DESIGN_SPEC_2026_08_27.md — read (709 lines)
✅ FILE_OWNERSHIP.md — read (983 lines)
✅ OPEN_GAPS_REGISTER.md — read
✅ roomService.js — read (source code reality check)
✅ roomListTransform.js — read (response shape confirmed)
✅ DashboardPage.jsx — room trigger logic traced
✅ RoomCheckInModal.jsx — field signatures + flags confirmed
✅ CollectPaymentPanel.jsx — AIOSELL inventory call grep (NONE found)
✅ registry.json — CR-351 conflict confirmed
✅ API handover doc (handover_1.md) — full AIOSELL API spec read
```

---

## §0 — Step 0: Code Reality Check

```bash
grep -rn "aiosell|AIOSELL|pmsService|channelManager|frontDesk|tapeChart|selfCheck" \
  /app/frontend/src/ --include="*.js" --include="*.jsx"
# → ZERO RESULTS
```

**Code Reality: NONE**

No AIOSELL integration, PMS module, channel manager panel, tape chart, self check-in, front desk dashboard, arrivals page, or departures page exists in `src/`.

**Existing room-related code (NOT PMS — must not be confused):**

| File | What it does | Relation to PMS |
|---|---|---|
| `roomService.js` | `checkIn()` → `ROOM_CHECK_IN`, `getRoomList()` → `GET_ROOM_LIST`, `splitRoomOrder()`, `recordPartialPayment()` | REUSE `checkIn()` for PMS check-in flow |
| `roomListTransform.js` | Normalises `/get-room-list` (in-house rooms only) | REUSE for In-House Guests list (S6) |
| `RoomCheckInModal.jsx` | Existing 1362-line check-in modal triggered from Dashboard room cards | CONFLICT — see §1 |
| `RoomOrdersReportPage.jsx` | Read-only room orders report | NOT TOUCHED |
| `DashboardPage.jsx` | Mounts `RoomCheckInModal`, manages `checkInRoom` state | CONFLICT — see §1 |

---

## §1 — Step 1: Conflict Pre-Check

### CONFLICT-01 — CR-353 ID RENUMBER (CRITICAL)

**Registry shows:** `CR-351: status=IMPLEMENTED, title="Local Printer Setup: Bill Content + Bill Style Tabs"`

The PMS design was erroneously assigned CR-351. This is a **registry collision**. The PMS CR must be renumbered.

Next available ID: **CR-353** (CR-352 = Printer Routing Gate, QA PASS).

**Files requiring rename:**
- `/app/memory/change_requests/CR-351_PMS_CHANNEL_MANAGER_CHECKIN_REDESIGN_INTAKE.md` → `CR-353_...`
- `/app/memory/plans/CR-351_DESIGN_SPEC_2026_08_27.md` → `CR-353_...`
- `/app/memory/impact/CR-351_IMPACT_ANALYSIS.md` → `CR-353_...` (previous placeholder)
- All design mockup HTML files (the cr-351 references in comments)

**Action:** Register CR-353 in `registry.json`. Rename files. Owner to confirm renumber.

---

### CONFLICT-02 — `RoomCheckInModal.jsx` (HIGH RISK)

**Recent modifications:** CR-350 (2026-08-26), BUG-351 (2026-08-26), BUG-360 (2026-08-26), CR-129 (2026-08-05), BUG-092 (2026-06-15)

**Conflict:** The new PMS check-in page (S4) calls the **same endpoint** (`ROOM_CHECK_IN = /api/v1/vendoremployee/pos/user-group-check-in`) as `RoomCheckInModal.jsx`. Two UI paths will call the same backend.

**Architectural decision needed (OD-01):** See §6 Owner Decision Queue.

**Execution order:** CR-353 must execute AFTER confirming no in-flight changes to `RoomCheckInModal.jsx` (CR-350 is IMPLEMENTED, no active CRs queued on it).

---

### CONFLICT-03 — `Sidebar.jsx` BUG-361 localStorage sweep

BUG-361 swept 68 files (2026-08-26) to add localStorage persistence for sidebar state using key `mygenie_sidebar_expanded`. Any new PMS section added to `Sidebar.jsx` must follow the **same BUG-361 pattern**:
- Each new Sidebar entry must use the existing `isExpanded` state driven by localStorage
- The "Rooms & Reservations" section collapse/expand state must persist via the same mechanism

**Execution:** CR-353 Sidebar work must grep BUG-361 pattern before writing code.

---

### CONFLICT-04 — `DashboardPage.jsx` hotspot (MEDIUM)

**Last touched:** BUG-358 (sidebar persistence). Room cards are shown as columns on Dashboard. `checkInRoom` state triggers `RoomCheckInModal`.

**Risk:** If CR-353 routes room check-in through the new PMS check-in page (`/pms/check-in`), the `checkInRoom` state + `RoomCheckInModal` mount in `DashboardPage.jsx` becomes redundant. The two systems must not both exist or the user experience forks.

**Decision needed (OD-01)** — see §6.

---

## §2 — Risk Classification

**Risk: HIGH**

| Trigger | Risk Level |
|---|---|
| Touches `DashboardPage.jsx` (hotspot R5) | HIGH |
| Touches `RoomCheckInModal.jsx` (recent, complex) | HIGH |
| Touches `Sidebar.jsx` (BUG-361 sweep) | HIGH |
| New AIOSELL API integration (unproven in FE) | HIGH |
| New public-facing route (self check-in — auth bypass risk) | HIGH |
| New `App.js` routes (8+) | MEDIUM |

**Fast Lane:** NOT eligible. HIGH risk, touches multiple hotspot files, API integration.

---

## §3 — API-to-Design Full Mapping

### A. Existing APIs (already wired, REUSE for PMS)

| Endpoint constant | URL | Used in PMS screen | Notes |
|---|---|---|---|
| `ROOM_CHECK_IN` | `/api/v1/vendoremployee/pos/user-group-check-in` | S4 Staff Check-In, S5 Self Check-In (indirectly) | Accepts `booking_type: "WalkIn"` or `"Online"`. Sends `room_id[]`, `total_adult`, `booking_for`, `checkin_date`, `checkout_date`, `room_price`, `advance_payment`, `order_note` |
| `GET_ROOM_LIST` | `/api/v2/vendoremployee/get-room-list` | S6 In-House Guests, S7 Room Status Board (occupied rooms) | Returns ONLY currently-occupied rooms. Includes: `table.id`, `table.table_no`, `order_id`, `user.f_name`, `user.l_name`, `user.phone` |
| `ROOM_RECORD_PAYMENT` | `/api/v2/vendoremployee/pos/room-payment` | S10 Departures → existing CollectPaymentPanel | Unchanged (D3 decision) |

### B. New AIOSELL APIs (from handover — NOT yet wired in FE)

| Endpoint | Method | URL | PMS Screen | Fields |
|---|---|---|---|---|
| Get AIOSELL status | GET | `/api/v2/vendoremployee/aiosell/status` | S8 Channel Manager | `service_status`, `is_running`, `is_active`, `hotel_code`, `pms_slug` |
| Save property | POST | `/api/v2/vendoremployee/aiosell/property` | AIOSELL Setup UI (GAP-04) | `hotel_code`, `pms_slug`, `api_base_url`, `api_key`, `webhook_secret`, `is_active` |
| Start service | POST | `/api/v2/vendoremployee/aiosell/start` | S8 Channel Manager `[Sync Now]` | — |
| Stop service | POST | `/api/v2/vendoremployee/aiosell/stop` | S8 Channel Manager | — |
| Get rooms + mapping | GET | `/api/v2/vendoremployee/aiosell/rooms` | Room Mapping UI (GAP-05) + S7 Available rooms | `local_rooms[]`, `aiosell.body.rooms[]`, `mappings[]`, `availability{}`, `mapping.can_push_inventory` |
| Save room mapping | POST | `/api/v2/vendoremployee/aiosell/room-mapping` | Room Mapping UI (GAP-05) | `mappings[{restaurant_table_id, aiosell_room_code, aiosell_rateplan_code}]` |
| Push inventory | POST | `/api/v2/vendoremployee/aiosell/push-inventory` | S8 Channel Manager `[Sync All Now]` | `start_date`, `end_date` |
| Fetch inventory | POST | `/api/v2/vendoremployee/aiosell/fetch-inventory` | S8 Channel Manager (inventory bars) | `start_date`, `end_date` → `updates[].rooms[].roomCode`, `available` |
| Fetch reservations from AIOSELL CM | POST | `/api/v2/vendoremployee/aiosell/fetch-reservations` | S8 sync log | `start_date`, `end_date`, `import: bool` |
| Inbound webhook (Aiosell → MyGenie) | POST | `/api/v2/aiosell/reservations` (PUBLIC) | NOT a FE call — backend receives this | Creates `aiosell_reservations`, `aiosell_guests`, `aiosell_reservation_rooms`, `user_id_documents` |
| WalkIn check-in (existing) | POST | `/api/v1/vendoremployee/pos/user-group-check-in` | S4 Check-In, S3 New Booking | `room_id[]`, `booking_type`, `total_adult`, `total_children`, `booking_for`, `checkin_date`, `checkout_date`, `order_amount`, `advance_payment`, `balance_payment`, `id_type`, `name`, `phone`, `firm_name`, `firm_gst` |

### C. AIOSELL Reservation Webhook → PMS UI Field Mapping

| AIOSELL Webhook Field | PMS Screen | UI Element | Status |
|---|---|---|---|
| `action` (book/modify/cancel) | All screens | Reservation status | ✅ Mapped |
| `channel` (Booking.com etc.) | S1 Front Desk, S2 Tape Chart, S4 Check-In, S9 Arrivals | Source pill (favicon + name) | ✅ Mapped |
| `bookingId` | S4 Check-In header | "BK-88213" reference | ✅ Mapped |
| `cmBookingId` | S4 Check-In header | "CM: AAABBB123" | ✅ Mapped |
| `bookedOn` | — | NOT shown | ⚠ Design omits booked-on date — low priority |
| `checkin` | S1, S2, S4, S9, S10 | Check-in date field | ✅ Mapped |
| `checkout` | S1, S2, S4, S9, S10 | Check-out date field | ✅ Mapped |
| `specialRequests` | S1 SR badge, S4 pre-filled amber box, S9 SR dot | Orange SR badge when non-empty | ✅ Mapped |
| `pah` | S1 Balance column, S4 PAH badge | `false`→"Prepaid" badge; `true`→"PAY AT HOTEL" | ✅ Mapped |
| `guest.firstName + lastName` | S1, S4, S9 | Guest name | ✅ Mapped |
| `guest.phone` | S1, S4, S9 | Phone (read-only pre-fill) | ✅ Mapped |
| `guest.email` | S4 | Email (read-only pre-fill) | ✅ Mapped |
| `guest.address` | S4 | Collapsible section | ⚠ Design notes "collapsible" but no screen shows it — GAP-13 |
| `rooms[].roomCode` | S2 tape chart rows, S4 Room Type | Group header + booked type field | ✅ Mapped |
| `rooms[].rateplanCode` | S4 Rate Plan badge | Grey pill next to rate | ✅ Mapped (format will be AIOSELL native e.g., `executive-s-ep`) |
| `rooms[].occupancy.adults` | S4 Adults field, S1/S9 "2A" in GUESTS column | Pre-filled from webhook | ✅ Mapped |
| `rooms[].occupancy.children` | S4 Children field, S9 "1C" | Pre-filled from webhook | ✅ Mapped |
| `rooms[].prices[].sellRate` | S4 Rate field (locked with AIOSELL badge) | Locked, per-night rate | ✅ Mapped |
| `amount.amountAfterTax` | S1 Balance, S9 Balance | Balance due column | ✅ Mapped |
| `amount.commission` | S8 Channel Manager | Revenue after commission | ⚠ NOT shown in any screen currently — GAP noted |
| `amount.tcs`, `amount.tds` | — | NOT shown | Low priority |
| Meal plan (from rateplanCode suffix: ep/cp/map/ap) | — | NOT decoded/shown | ⚠ GAP-11 |
| `rooms[].prices[]` (per-night breakdown) | — | NOT shown in any screen | ⚠ Design shows single rate, not per-night breakdown |

---

## §4 — All Gaps Identified (17 total)

### P0 — BLOCKERS (must resolve before Gate 3 can start)

**GAP-01: CR-351 ID collision — must renumber to CR-353**
- **Type:** Registry/Admin
- **Detail:** `registry.json` CR-351 = "Local Printer Setup" (IMPLEMENTED). PMS design uses same ID. Collision in registry, change_requests folder, plans folder, impact folder, mockups.
- **Resolution:** Rename all files to CR-353. Register in registry.json as new CR-353.
- **Owner decision needed:** Confirm renumber is acceptable.

---

### P1 — BLOCKERS (cannot implement without resolving)

**GAP-02: No GET endpoint for local `aiosell_reservations`**
- **Type:** Missing backend API
- **Affects:** S2 Tape Chart, S9 Arrivals, S10 Departures, S1 Front Desk
- **Current state:** `fetch-reservations` reads AIOSELL CM (not local DB). Sandbox returns empty. No `GET /aiosell/local-reservations` exists.
- **Why it matters:** The tape chart must show bookings from `aiosell_reservations` (local DB). The arrivals list must show today's check-ins (OTA + walk-in) from local records. Without this, S1/S2/S9/S10 cannot be populated.
- **Required backend endpoint:** `GET /api/v2/vendoremployee/aiosell/local-reservations?start_date=X&end_date=Y` returning: `[{ id, bookingId, cmBookingId, channel, checkin, checkout, status, specialRequests, pah, guest: {firstName, lastName, phone, email}, rooms: [{roomCode, rateplanCode, occupancy, prices}], amount }]`
- **Alternative:** Does `fetch-reservations` with `import: true` backfill local DB AND return local records? **Must curl-probe before Gate 3.**

**GAP-03: OTA guest check-in → physical room assignment API unclear**
- **Type:** API contract gap
- **Affects:** S4 Staff Check-In (OTA flow)
- **Current state:** `ROOM_CHECK_IN` (`/api/v1/vendoremployee/pos/user-group-check-in`) accepts `booking_type: "WalkIn" | "Online"`. But when `booking_type="Online"`, does it link the check-in to `aiosell_reservations.id`? No `aiosell_reservation_id` field is in the current `roomService.checkIn()` FormData.
- **Why it matters:** When staff checks in an OTA guest, the `user_id_documents` record must be linked to the AIOSELL reservation so the reservation shows as "Checked In" on the tape chart.
- **Owner decision needed (OD-02):** Does `ROOM_CHECK_IN` already handle Online booking linkage? Or does it need a new field?

**GAP-04: No AIOSELL setup/configuration UI designed**
- **Type:** Design gap + missing screen
- **Affects:** Phase A of AIOSELL integration (prerequisite for everything)
- **Current state:** Channel Manager panel (S8) shows status/sync only. The Phase A config (`hotel_code`, `pms_slug`, `api_base_url`, `api_key`, `webhook_secret`) must be entered BEFORE inventory push, room mapping, or webhook works.
- **Why it matters:** Without setup, `GET /aiosell/status` returns no config, service can't start. Room mapping page can't load AIOSELL room types.
- **Owner decision needed (OD-03):** Where does AIOSELL setup live? Options:
  - (a) New "Connect AIOSELL" section within S8 Channel Manager panel (top, before OTA list)
  - (b) New step in Restaurant Settings wizard (Step 9 — Channel Manager)
  - (c) Separate admin-only setup screen

**GAP-05: No room mapping UI designed**
- **Type:** Design gap + missing screen
- **Affects:** Inventory push prerequisite
- **Current state:** `GET /aiosell/rooms` returns local `restaurant_table` rooms (rtype=RM) + AIOSELL room types + existing mappings. Until mappings exist, `can_push_inventory = false` and inventory push returns 422.
- **Why it matters:** Staff must map physical rooms (e.g., Room 101, 102, 103 → `executive`) before AIOSELL inventory works. Without this, the Channel Manager panel's inventory bars cannot be populated and OTA availability will be wrong.
- **Owner decision needed (OD-04):** Where does room mapping UI live? Options:
  - (a) Within S8 Channel Manager panel (new "Room Mapping" tab/section)
  - (b) Within Room Status Board (S7) — map rooms to AIOSELL types from there
  - (c) Separate setup wizard step

**GAP-06: Self check-in (S5) has NO backend support**
- **Type:** Missing backend APIs (multiple)
- **Affects:** S5 Self Check-In (entire screen)
- **Current state:** The self check-in flow needs:
  1. `GET /api/v2/public/reservation/{token}` — retrieve booking WITHOUT auth token
  2. `POST /api/v2/public/reservation/{token}/checkin` — mark checked-in WITHOUT auth token
  3. Token generation when "Send link" is triggered
  4. WhatsApp/SMS dispatch with the link
- **Neither endpoint exists.** The existing `ROOM_CHECK_IN` requires Bearer token.
- **Why it matters:** Self check-in (S5) CANNOT be implemented until backend builds public endpoints.
- **Owner decision needed (OD-05):** Should self check-in backend be scoped to Phase 2? Or is it in MVP?

**GAP-07: "Save as Booking (Check-in later)" has no API**
- **Type:** Missing backend API + design decision
- **Affects:** S3 New Booking → "Save as Booking" button
- **Current state:** `ROOM_CHECK_IN` creates an immediate check-in (`user_id_documents` + occupies room order). There is NO "pending reservation" state for direct advance bookings. OTA advance bookings come via webhook → `aiosell_reservations` (not immediately checked-in). But a staff-created phone/direct advance booking has no API.
- **Why it matters:** The "Save as Booking (Check-in later)" button on S3 has nothing to call. If we use `ROOM_CHECK_IN` with a future `checkin_date`, the room will appear "occupied" immediately even though the guest hasn't arrived.
- **Owner decision needed (OD-06):** Options:
  - (a) Remove "Save as Booking" from S3 for direct bookings — walk-in only = immediate check-in. Advance direct bookings are manual (staff note elsewhere).
  - (b) Backend builds `POST /api/v2/vendoremployee/aiosell/direct-reservation` to create a pending `aiosell_reservations` record for direct bookings (same table, `channel: "direct"`)
  - (c) Staff creates advance bookings via AIOSELL dashboard UI directly (not via MyGenie FE)

---

### P2 — Significant gaps (implementation risks if unresolved)

**GAP-08: `GET_ROOM_LIST` returns ONLY occupied rooms — Room Status Board (S7) needs ALL rooms**
- **Type:** API limitation
- **Detail:** `roomListTransform.js` comment: *"Backend already filters this endpoint to currently-in-house rooms"*. S7 Room Status Board needs: available rooms, HK rooms, OOO rooms too.
- **Resolution needed:** `GET /aiosell/rooms` returns `local_rooms[]` (ALL physical RM tables). This could be combined with `GET_ROOM_LIST` to derive full status: rooms in `local_rooms` but NOT in `GET_ROOM_LIST` = Available. BUT: HK and OOO states are FE-side only (no backend persists them). **Must confirm with owner: is room HK/OOO state stored in backend or FE-only localStorage?**
- **Owner decision needed (OD-07):** HK and OOO room state — FE localStorage or backend field?

**GAP-09: Inventory release after checkout — not confirmed**
- **Type:** Unknown backend behaviour
- **Detail:** Handover doc: WalkIn check-in triggers inventory push (outbound, non-blocking). When a guest checks out via `CollectPaymentPanel.jsx`, does inventory release get pushed to AIOSELL? `CollectPaymentPanel.jsx` has ZERO AIOSELL inventory call (grep confirmed nothing). If checkout doesn't trigger push, AIOSELL availability will show rooms as occupied after guest leaves.
- **Resolution:** Must curl-probe: check `aiosell_sync_logs` after a checkout to see if an outbound inventory log appears. **Cannot assume this works without verification.**

**GAP-10: No real-time socket event for new AIOSELL reservations**
- **Type:** Missing real-time update
- **Detail:** When AIOSELL webhook fires (new OTA booking), S1 Front Desk arrivals list and S2 Tape Chart won't update until user manually refreshes. Existing socket system (`useSocketEvents.js`) handles order events but not reservation events.
- **Resolution:** Backend adds a socket event (e.g., `new_reservation`) when webhook processes successfully. FE adds a subscription in `useSocketEvents.js`.
- **Deferrable to Phase 2** if owner accepts manual refresh for MVP.

**GAP-11: Meal plan not shown in design**
- **Type:** Design gap (UX)
- **Detail:** AIOSELL `rateplanCode` format: `executive-s-ep` = European Plan (room only), `executive-d-cp` = Continental Plan (breakfast). Hotel guests need to know if breakfast is included. Current design shows rateplanCode as a raw grey pill (e.g., "BK-STANDARD-NR-101" in mockup — actual will be AIOSELL format).
- **Owner decision needed (OD-08):** Decode meal plan from rateplanCode and show badge (e.g., "Room Only" / "Breakfast Included")? Or show raw rateplanCode only?

**GAP-12: `booking_type` for direct/phone advance bookings is undefined**
- **Type:** API contract gap
- **Detail:** `ROOM_CHECK_IN` accepts `booking_type: "WalkIn" | "Online"`. The design shows "Direct" and "Phone" as source types. A same-day direct booking → `booking_type: "WalkIn"` ✅. An advance phone booking (see GAP-07) → no API path currently.
- **Resolution:** Tied to GAP-07 resolution.

---

### P3 — Minor gaps (low priority, can be noted in Phase 2)

**GAP-13: `guest.address` from AIOSELL not shown in any screen**
- Design spec says "shown in guest info (collapsible)" but no screen has this UI. Low priority — guests rarely need address displayed at front desk.

**GAP-14: Rate override reason not stored in `ROOM_CHECK_IN`**
- Design says "logged locally, not pushed back to AIOSELL." The `order_note` field of `ROOM_CHECK_IN` can carry this. Needs confirmation.

**GAP-15: Multi-room bookings not handled**
- AIOSELL webhook `rooms[]` can have multiple entries. WalkIn API supports `room_id[]`. No multi-room UI designed. Low priority for MVP (most bookings are single-room).

**GAP-16: `bookedOn` timestamp not shown**
- AIOSELL webhook sends `bookedOn` (booking creation time). Not shown in any screen. Useful for disputes but not critical.

**GAP-17: `amount.commission` / TCS / TDS not shown**
- AIOSELL sends OTA commission, TCS, TDS fields. Design spec lists them under Channel Manager but no screen UI for reconciliation. Low priority for MVP.

---

## §5 — Scope Lock

### Files WILL change (estimated)

| File | Change Type | Risk |
|---|---|---|
| `App.js` | ADD 8+ PMS routes + imports | MEDIUM |
| `components/layout/Sidebar.jsx` | ADD "Rooms & Reservations" section (5 sub-items) | HIGH (BUG-361 pattern must be preserved) |
| `api/constants.js` | ADD AIOSELL endpoint constants (7 new) | LOW |
| `api/services/aiosellService.js` | **NEW** — AIOSELL API calls (all Phase A–D endpoints) | MEDIUM |
| `api/services/pmsService.js` | **NEW** — PMS data aggregation (arrivals, departures, room status) | MEDIUM |
| `api/transforms/aiosellTransform.js` | **NEW** — webhook payload → UI model + room mapping transforms | MEDIUM |
| `api/transforms/roomStatusTransform.js` | **NEW** — room status derivation (occupied from GET_ROOM_LIST + available from aiosell/rooms) | LOW |
| `pages/pms/FrontDeskPage.jsx` | **NEW** (S1) | MEDIUM |
| `pages/pms/ReservationsPage.jsx` | **NEW** (S2 Tape Chart) | HIGH (complex Gantt grid) |
| `pages/pms/NewBookingPage.jsx` | **NEW** (S3) | MEDIUM |
| `pages/pms/CheckInPage.jsx` | **NEW** (S4) | HIGH (calls ROOM_CHECK_IN — shares logic with RoomCheckInModal) |
| `pages/pms/InHouseGuestsPage.jsx` | **NEW** (S6) | LOW |
| `pages/pms/RoomStatusPage.jsx` | **NEW** (S7) | MEDIUM |
| `pages/pms/ChannelManagerPage.jsx` | **NEW** (S8) | MEDIUM |
| `pages/pms/ArrivalsPage.jsx` | **NEW** (S9) | LOW |
| `pages/pms/DeparturesPage.jsx` | **NEW** (S10) | LOW |
| `pages/DashboardPage.jsx` | CONDITIONAL — depends on OD-01 resolution | HIGH (hotspot) |
| `components/modals/RoomCheckInModal.jsx` | CONDITIONAL — depends on OD-01 | HIGH (recently modified) |

**Self check-in (S5) is blocked — excluded from scope until GAP-06/OD-05 is resolved.**

---

### Files WILL NOT be touched (scope lock — CONFIRMED 2026-08-31)

| File | Reason |
|---|---|
| `components/order-entry/CollectPaymentPanel.jsx` | D3 decision: checkout unchanged. Links from PMS → existing CollectPaymentPanel. |
| `components/order-entry/OrderEntry.jsx` | No interaction with PMS module |
| `api/transforms/orderTransform.js` | Financial logic untouched |
| `api/socket/socketHandlers.js` | No new socket events in MVP (GAP-10 deferred) |
| `api/socket/useSocketEvents.js` | No new subscriptions in MVP |
| `components/modals/RoomCheckInModal.jsx` | **CONFIRMED NOT TOUCHED** — OD-01 = CO-EXIST. PMS is parallel build. |
| `pages/DashboardPage.jsx` | **CONFIRMED NOT TOUCHED** — OD-01 = CO-EXIST. No routing changes to existing dashboard. |
| All report pages (`pages/reports-module/*`) | Unrelated |
| All Insights services | Unrelated |
| All expense/inventory files | Unrelated |

---

## §6 — Owner Decision Queue (OD) — ANSWERED 2026-08-31

| ID | Question | **ANSWER** | Status |
|---|---|---|---|
| OD-01 | PMS check-in vs RoomCheckInModal? | **(b) CO-EXIST** — parallel build, existing modal untouched | ✅ CONFIRMED |
| OD-02 | ROOM_CHECK_IN auto-link OTA? | **No** — FE passes `booking_id` explicitly | ✅ CONFIRMED (probe) |
| OD-03 | AIOSELL setup UI location? | **(a) Inside S8** — Connect AIOSELL section at top | ✅ CONFIRMED |
| OD-04 | Room mapping UI location? | **(a) Inside S8** — Room Mapping tab | ✅ CONFIRMED |
| OD-05 | Self check-in (S5) scope? | **Phase 2** — S5 out of CR-353 entirely | ✅ CONFIRMED |
| OD-06 | Save as Booking approach? | **(b) direct-reservation endpoint** — exists in handover_2 | ✅ CONFIRMED |
| OD-07 | HK/OOO state storage? | **(b) Backend field** — persists across devices/sessions | ✅ CONFIRMED |
| OD-08 | Decode meal plan from rateplanCode? | **(a) YES — Meal Plan Badge** — ep/cp/map/ap decoded to human labels | ✅ CONFIRMED |

---

## §7 — New Backend Endpoints Required

These endpoints do NOT exist per the handover doc. Gate 3 is BLOCKED until backend confirms/builds them.

| # | Endpoint | Method | Priority | Required For | Notes |
|---|---|---|---|---|---|
| 1 | `/api/v2/vendoremployee/aiosell/local-reservations` | GET | P1 — BLOCKER | S1, S2, S9, S10 | Query params: `start_date`, `end_date`, optional `checkin_date=today`. Returns local `aiosell_reservations` with guest + rooms data |
| 2 | `/api/v2/public/reservation/{token}` | GET | P1 — if OD-05=YES | S5 Self Check-In | Public (no Bearer). Returns booking details for guest. Token = HMAC-signed `{bookingId, restaurantId, timestamp}` |
| 3 | `/api/v2/public/reservation/{token}/checkin` | POST | P1 — if OD-05=YES | S5 Self Check-In | Public (no Bearer). Marks checked-in + sends front-desk notification |
| 4 | `/api/v2/vendoremployee/aiosell/direct-reservation` | POST | P1 — if OD-06=YES | S3 "Save as Booking" | Creates advance direct booking in `aiosell_reservations` with `channel="direct"`, `action="book"`, `booking_type="Direct"` |
| 5 | `/api/v2/vendoremployee/aiosell/dashboard-kpis` | GET | P2 | S1 KPI strip | Returns: `occupancy_pct`, `arrivals_today_count`, `departures_today_count`, `in_house_count`. Could be computed from existing data. |

---

## §8 — Downstream Consumer Check

| Changed area | Downstream consumers to verify |
|---|---|
| `Sidebar.jsx` — new section | `DashboardPage.jsx` (mounts Sidebar), all 68 BUG-361-swept pages (sidebar state key unchanged, no impact) |
| `App.js` — new routes | `ProtectedRoute` HOC (all PMS routes must be protected), `LoadingPage.jsx` (bootstrap must complete before PMS renders) |
| `ROOM_CHECK_IN` endpoint reuse | `RoomOrdersReportPage.jsx` (reads same data — verify room appears in report after PMS check-in), `CollectPaymentPanel.jsx` (checkout path — verify works for PMS-checked-in rooms) |
| `GET_ROOM_LIST` reuse | `roomListTransform.js` already normalises — reuse transform for In-House list |
| `roomService.checkIn()` reuse | New `CheckInPage.jsx` will call same function. Must not change its signature (CR-350 depends on it) |

---

## §9 — Verification Matrix (seeds Gate 5 QA)

| # | Screen | API call | Expected result | Automated? |
|---|---|---|---|---|
| V1 | S1 Front Desk | `GET /aiosell/local-reservations?checkin_date=today` | Arrivals list shows OTA + walk-in bookings for today | NO |
| V2 | S2 Tape Chart | `GET /aiosell/local-reservations?start_date=X&end_date=Y` | Blocks appear in UNASSIGNED section for bookings without room assigned | NO |
| V3 | S3 New Booking | `POST /api/v1/vendoremployee/pos/user-group-check-in` with `booking_type=WalkIn` | Response: `{ message: "Group check-in completed successfully", user_id: N }` | YES (curl) |
| V4 | S4 Check-In (OTA) | `POST ROOM_CHECK_IN` with `booking_type=Online` | Check-in completes; room appears occupied in `GET_ROOM_LIST` | YES (curl) |
| V5 | S6 In-House | `GET /api/v2/vendoremployee/get-room-list` | Table shows all currently-in-house guests | YES (curl) |
| V6 | S7 Room Status | `GET /aiosell/rooms` + `GET_ROOM_LIST` combined | Board shows occupied rooms (from GET_ROOM_LIST) + available rooms (from aiosell/rooms) | NO |
| V7 | S8 Channel Manager | `GET /aiosell/status` | AIOSELL connection card shows `is_running: true`, last sync timestamp | YES (curl) |
| V8 | S8 Push Inventory | `POST /aiosell/push-inventory` | 200 OK + `aiosell_sync_logs` shows outbound inventory success | YES (curl) |
| V9 | S9 Arrivals | `GET /aiosell/local-reservations?checkin_date=today&page=1` | Paginated table with correct SR badge, Prepaid badge, 2A·1C counts | NO |
| V10 | Checkout → Inventory | After `CollectPaymentPanel` checkout | `aiosell_sync_logs` shows outbound inventory push (room type available +1) | YES (curl) |
| V11 | GAP-06 blocker | `GET /public/reservation/{token}` | 200 with booking data if token valid, 401 if invalid | YES (curl) — only if OD-05=YES |

---

## §10 — Post-Code Registry Checklist (for Implementation agent)

```
□ 1. registry.json: CR-353 status → IMPLEMENTED, sprint_key: pos_5_2
□ 2. CR_REGISTRY.md: CR-353 row updated to IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: all new + modified files listed with CR-353 + date
□ 4. Code markers: // CR-353 comment in every modified file
□ 5. COMPILE CHECK: webpack 0 new warnings
```

---

## §11 — Impact Analysis Summary

```
Planning complete: CR-353
Stage: Impact Analysis (Gate 2 only)
Code reality: NONE — greenfield PMS module
Risk: HIGH (AIOSELL API, DashboardPage hotspot, RoomCheckInModal conflict, Sidebar sweep)

Files WILL change: App.js, Sidebar.jsx, api/constants.js, 7 new service/transform files, 9 new PMS pages,
                   DashboardPage.jsx (conditional on OD-01), RoomCheckInModal.jsx (conditional on OD-01)
Files WILL NOT touch: CollectPaymentPanel.jsx, OrderEntry.jsx, orderTransform.js, all financial/report files

Gaps found: 17 total (1 P0, 6 P1, 6 P2, 4 P3)
New backend endpoints required: 5 (2 mandatory, 3 conditional on OD answers)

Owner decisions: ALL 8 ANSWERED (OD-01 through OD-08). Gate 3 READY.
Docs: plans/CR-353_DESIGN_SPEC_2026_08_27.md (design), impact/CR-353_PMS_CHANNEL_MANAGER_IMPACT_ANALYSIS.md (this doc)
Next: Gate 3 Implementation Plan — READY TO WRITE. Backend must fix BUG-BE-01/02/03 + build 2 missing endpoints in parallel.
```

---

*Impact Analysis: 2026-08-28 | Planning agent | Gate 2 complete | Gate 3 BLOCKED pending 8 owner decisions*
