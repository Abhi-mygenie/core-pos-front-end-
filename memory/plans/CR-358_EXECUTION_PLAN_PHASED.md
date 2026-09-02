# CR-358 — Phased Execution Plan (Master Roadmap)
## PMS Module + Channel Manager (AIOSELL)

**Doc:** CR-358_EXECUTION_PLAN_PHASED.md
**Date:** 2026-06 (session) | **Agent Role:** PLANNING (Gate 3 — phasing strategy)
**Inputs:** Gate 2 Impact Analysis (CLOSED), SESSION_HANDOVER_2026_09_01, v2 mockups, preprod probe results, backend reply_2.md (2026-09-01)
**Status:** ✅ **APPROVED BY OWNER (2026-09-01)** — 5-phase breakdown confirmed, no merges/splits requested. Per-phase Gate 3 plan (Phase 1) is next.

**Update 2026-09-01:** Backend fixed BUG-BE-01 and BUG-BE-03. Agent re-probed both directly on preprod (restaurant 69, `owner@thegoankitchen.com`) — **both CONFIRMED RESOLVED**:
- `GET /aiosell/local-reservations?view=arrivals` → **200** (was 500)
- `POST /aiosell/direct-reservation` → **201**, `channel=Direct` (was 500)

This unblocks Phase 3's hard entry gate early and clears Phase 2's "Save as Booking" deferral. See §1 and §Immediate Next Actions for updated status. BUG-BE-02 (OTA check-in) and the newly-reported BUG-BE-04 (Direct check-in, was 403) are backend-claimed-fixed but **NOT YET agent-verified** — need a live OTA `booking_id` / assigned `room_id`, which only exists once Phase 1/2 scaffolding can generate one. Re-probe these at Phase 2/3 entry.

---

## 0. Why this CR must be phased

- **Scope size:** 9 new pages, 4 new services/transforms, 3 modified hotspot-adjacent files (~4,500–6,000 new lines estimated). A single-CR implementation would produce an untestable, unreviewable change set.
- **Backend readiness is uneven:** 8 AIOSELL endpoints verified working; 3 backend bugs (BUG-BE-01/02/03) and 2 missing endpoints block 6 of 9 screens. Phasing lets FE ship value on working endpoints while backend catches up — no idle waiting.
- **Risk isolation:** Sidebar.jsx (BUG-361 sweep) and App.js are touched exactly once, in Phase 1, then frozen. Each later phase only ADDS files under `pages/pms/` — regression surface per phase stays small.
- **QA/smoke per phase:** Owner can verify each phase on preprod independently. A failure in the Tape Chart (hardest UI) cannot hold back the Channel Manager (already unblocked).

**Registry model:** CR-358 stays the parent. Each phase registers as `CR-358-P1` … `CR-358-P5`, each with its own Gate 3 plan → Gate 4 GO → Implementation → QA → Owner smoke. Parent closes when all phases close.

---

## 1. Backend Dependency Matrix (drives the sequencing)

**Updated 2026-09-01 post backend fix + agent re-probe.**

| Backend item | Status today | Blocks | Needed by |
|---|---|---|---|
| `GET /aiosell/status`, `POST /aiosell/property`, `start`, `stop` | ✅ Working (probed) | — | Phase 1 |
| `GET /aiosell/rooms`, `POST /aiosell/room-mapping` | ✅ Working (probed) | — | Phase 1 |
| `POST /aiosell/push-inventory`, `fetch-inventory`, `fetch-reservations` | ✅ Working (probed) | — | Phase 1 |
| `GET_ROOM_LIST` (existing, reused) | ✅ Working | — | Phase 1 |
| `ROOM_CHECK_IN` with `booking_type=WalkIn` | ✅ Working | — | Phase 2 |
| **BUG-BE-03** — `direct-reservation` 500 (ENUM missing `Direct`) | ✅ **FIXED — agent-verified 201 (2026-09-01)** | S3 Save-as-Booking | Phase 2 — **UNBLOCKED, no longer late-gated** |
| **BUG-BE-01** — `local-reservations` 500 (migration/relation) | ✅ **FIXED — agent-verified 200 (2026-09-01)** | S1, S2, S9, S10 | Phase 3 — **HARD GATE CLEARED, can start now** |
| **BUG-BE-02** — OTA check-in 422 (`booking_type=Online`+`booking_id`) | ✅ **FIXED — agent-verified 200 (2026-09-01)**, booking `BDC8899464` reached `in_house`/`checked_in` | S4 OTA check-in | Phase 2 — **UNBLOCKED** |
| **BUG-BE-04 (NEW)** — Direct check-in 403 (`booking_type=Direct`+`booking_id`) | ✅ **FIXED — agent-verified 200 (2026-09-01)**, booking `MG-69-69BCC4D3-...` reached `in_house`/`checked_in` | S3/S4 Direct check-in | Phase 2 — **UNBLOCKED** |
| **MISSING-01** — `GET /aiosell/dashboard-kpis` (404) | ⏳ Still not built | S1 KPI strip | Phase 3 (non-blocking skeleton per NS-02) |
| **MISSING-02** — `PATCH /aiosell/room-status/{table_id}` | ⏳ To build | S7 HK/OOO toggle | Phase 4 |
| **NS-01 endpoints** — push-rates, fetch-rates, push-inventory-restrictions, push-rate-restrictions | ⚠ NEVER PROBED | S8-C | Phase 5 (probe first) |
| `POST /aiosell/mark-no-show` | ⚠ Backend documented rule: 200 only for `booking.com`/`gommt` pending; else 422 by design | S8-D | Phase 5 (probe first) |

**Net effect on phasing (updated 2026-09-01, all 4 confirmed):** ALL FOUR backend blockers (BUG-BE-01/02/03/04) are closed and agent-verified end-to-end, including full check-in flows for both Direct and OTA channels reaching `operational_status=in_house` / `line_status=checked_in` with a real `order_id`. Phase 2 and Phase 3 have **zero remaining hard backend blockers**. Phase 2 ships S3 (Save as Booking + Direct check-in) and S4 (Direct + OTA check-in) fully wired, no disabled/deferred rows. Phase 3's entry gate is cleared. Remaining backend items (dashboard-kpis, room-status PATCH, NS-01, mark-no-show) only affect Phase 3 (non-blocking skeleton), Phase 4, and Phase 5 respectively — none block Phase 1-3 core flows.

**Ask of backend team, in priority order (updated 2026-09-01):**
1. ~~Run migration + add `order` HasOne (BUG-BE-01)~~ — ✅ DONE, verified.
2. ~~ALTER TABLE booking_type ENUM (BUG-BE-03)~~ — ✅ DONE, verified.
3. ~~Confirm BUG-BE-02 (OTA check-in) and BUG-BE-04 (Direct check-in)~~ — ✅ DONE, both agent-verified end-to-end 2026-09-01.
4. **Before Phase 3 QA:** Build `dashboard-kpis`.
5. **Before Phase 4 QA:** Build `PATCH room-status` + `room_status` column.
6. **Before Phase 5:** Confirm NS-01 rate/restriction endpoints + mark-no-show rule on preprod (FE will curl-probe per R11).

---

## 2. Phase Breakdown (5 phases)

### PHASE 1 — Foundation + Channel Manager Core + In-House
**Theme:** Everything that is 100% unblocked today. Establishes the module skeleton every later phase plugs into.
**Risk:** MEDIUM-HIGH (only phase touching Sidebar.jsx / App.js hotspots)

**Scope:**
| Item | Detail |
|---|---|
| `api/constants.js` | ADD all AIOSELL endpoint constants (including Phase 3–5 ones, added once, inert until used) |
| `api/services/aiosellService.js` | NEW — status, property, start/stop, rooms, room-mapping, push/fetch-inventory, fetch-reservations |
| `api/services/pmsService.js` | NEW — skeleton + In-House aggregation (wraps existing `roomService.getRoomList`) |
| `api/transforms/aiosellTransform.js` | NEW — rooms/mappings/status transforms + **rateplanCode meal-plan decoder** (OD-08: ep/cp/map/ap → labels; unit-testable pure function) |
| `App.js` | ADD all 9 `/pms/*` routes at once (unbuilt pages render a shared "Coming in Phase N" placeholder) — App.js touched ONCE |
| `Sidebar.jsx` | ADD "Rooms & Reservations" section with all entries at once (BUG-361 localStorage pattern; grep pattern before writing; **section gated on `features.room` — OD-P1-01 CONFIRMED 2026-09-01: hotel-only for now; owner will provide a separate dedicated key later — 1-line swap in profileTransform + Sidebar filter when ready**) — Sidebar touched ONCE |
| S8 Channel Manager (`ChannelManagerPage.jsx`) | Tabs A (Connect AIOSELL setup — OD-03), B (Room Mapping — OD-04), OTA/Sync tab (status card, Sync Now, inventory bars via fetch-inventory, push-inventory). Tabs C/D render "Phase 5" placeholder |
| S6 In-House (`InHouseGuestsPage.jsx`) | GET_ROOM_LIST + existing `roomListTransform` reuse |

**Backend dependency:** NONE. Fully testable e2e today.
**Verification:** V5, V7, V8 from Gate 2 matrix + mapping save round-trip + meal-plan decoder unit tests.
**Exit criteria:** Webpack clean, sidebar regression on 3 existing pages (BUG-361 key untouched), owner smoke of S8 setup→mapping→push flow on preprod (restaurant 69, sandbox-pms).

---

### PHASE 2 — Booking Creation + Check-In (Walk-in first)
**Theme:** Revenue-path screens on the proven `ROOM_CHECK_IN` endpoint. OTA/Direct variants coded but flagged pending backend fixes.
**Risk:** HIGH (S4 shares `ROOM_CHECK_IN` with RoomCheckInModal — CO-EXIST per OD-01; `roomService.checkIn()` signature must NOT change — CR-350 depends on it)

**Scope:**
| Item | Detail |
|---|---|
| S3 New Booking (`NewBookingPage.jsx`) | Walk-in immediate check-in (works today); "Save as Booking" → `POST /aiosell/direct-reservation` (OD-06) — **UNBLOCKED (BUG-BE-03 verified 201 on 2026-09-01), ships fully wired, not disabled** |
| S4 Check-In (`CheckInPage.jsx`) | v2 mockup (check-in-v2.html). WalkIn flow fully testable now. Direct flow (re-probe BUG-BE-04) + OTA flow with explicit `booking_id` + `booking_type=Online` (OD-02, re-probe BUG-BE-02) coded fully; QA re-probes both variants using a real `booking_id` before marking those rows closed |
| Meal plan badge | Wire Phase 1 decoder into S4 (Variant A, owner-approved) |
| `pmsService.js` | Extend: booking payload builders (reuse `roomService.checkIn()` untouched) |

**Backend dependency:** NONE. All check-in variants (WalkIn, Direct, OTA) and Save-as-Booking are fully unblocked and agent-verified end-to-end on preprod (2026-09-01).
**Verification:** V3 (curl WalkIn 200), V4 full (curl Direct + OTA check-in — both agent-verified reaching `operational_status=in_house`/`line_status=checked_in` with real `order_id`), room appears in GET_ROOM_LIST + RoomOrdersReportPage, checkout via existing CollectPaymentPanel still works (downstream check §8 of IA).
**Exit criteria:** WalkIn + Save-as-Booking + Direct check-in + OTA check-in e2e PASS incl. checkout. No deferred rows — all 4 backend blockers closed before Phase 2 coding starts.

---

### PHASE 3 — Reservation Operations (Front Desk, Arrivals, Departures)
**Theme:** All screens fed by `GET /aiosell/local-reservations`. First phase with a HARD backend gate.
**Risk:** MEDIUM (additive pages only; data-layer risk concentrated in one new transform)

**Entry gate (hard):** ✅ **CLEARED 2026-09-01** — BUG-BE-01 fixed, `GET /aiosell/local-reservations?view=arrivals` re-probed by agent and confirmed **200** with `data.reservations[{id, booking_id, channel, checkin, checkout, operational_status, guest{}, rooms[{room_code, rateplan_code, line_status, adults, children}], amount_after_tax}]`. **Freeze this shape into `aiosellTransform.js` when Phase 3 coding starts** (confirm field names still match at implementation-plan time — response captured 2026-09-01, re-verify if plan is written >7 days later per R12).

**Scope:**
| Item | Detail |
|---|---|
| `aiosellTransform.js` | Extend: local-reservation → UI model (guest, rooms, PAH/Prepaid, SR badge, channel pill, occupancy 2A·1C) |
| S1 Front Desk (`FrontDeskPage.jsx`) | Arrivals-today list + SR badges + KPI strip (`dashboard-kpis`; if MISSING-01 not ready → KPI cards render "—" skeleton, non-blocking per NS-02 "wait for backend") |
| S9 Arrivals (`ArrivalsPage.jsx`) | Paginated `view=arrivals` list |
| S10 Departures (`DeparturesPage.jsx`) | `view=departures` list → deep-link to existing CollectPaymentPanel checkout (NOT touched) |
| S4 OTA re-test | Complete Phase 2's deferred OTA check-in (booking_id linkage) — verify reservation flips to "Checked In" |

**Verification:** V1, V2 (data part), V4 full, V9 + KPI curl.
**Exit criteria:** OTA booking → webhook → arrivals list → check-in → in-house → departure → checkout, full lifecycle e2e on preprod.

---

### PHASE 4 — Tape Chart + Room Status Board
**Theme:** The two hardest/most stateful UIs, isolated last among core screens so data layer is already battle-tested.
**Risk:** HIGH for S2 (custom Gantt grid — date math, spanning blocks, unassigned lane, drag-target semantics per mockup); MEDIUM for S7

**Entry gate:** Phase 3 closed (local-reservations stable). MISSING-02 (`PATCH room-status`) needed before S7 QA.

**Scope:**
| Item | Detail |
|---|---|
| S2 Tape Chart (`ReservationsPage.jsx`) | Gantt grid per reservations.html mockup; rows from `aiosell/rooms` mappings, blocks from local-reservations; unassigned section |
| `api/transforms/roomStatusTransform.js` | NEW — derive 5 states: Occupied (GET_ROOM_LIST) / Available (aiosell/rooms minus occupied) / HK / OOO (backend `room_status` field per OD-07) |
| S7 Room Status (`RoomStatusPage.jsx`) | v2 mockup; HK/OOO toggle → `PATCH /aiosell/room-status/{table_id}` |

**Verification:** V2 (grid rendering), V6 + PATCH round-trip + cross-device persistence check (OD-07 rationale).
**Exit criteria:** Tape chart matches mockup against ≥3 real reservations spanning dates; S7 state persists across logout/login.

---### PHASE 5 — Rates & Restrictions, No-Show, Hardening & Regression
**Theme:** NS-01 expanded scope + close the loop on the whole module.
**Risk:** MEDIUM (endpoints never probed — discovery built into the phase)

**Entry gate:** Curl-probe all 5 NS-01 endpoints FIRST (R11). Any 404/500 → BACKEND_BRIEF and that sub-item defers without blocking the rest.

**Scope:**
| Item | Detail |
|---|---|
| S8-C Rates & Restrictions tab | push-rates, fetch-rates, push-inventory-restrictions, push-rate-restrictions |
| S8-D Mark No-Show | booking.com + gommt only, per mockup |
| GAP-09 verification | Probe: checkout → does `aiosell_sync_logs` show inventory release? If NO → BACKEND_BRIEF (availability drift is a real OTA overbooking risk) |
| Module regression | Full cross-phase pass: S8 setup → mapping → OTA booking → arrivals → check-in → tape chart → in-house → departure → checkout → inventory release. Plus OLD-flow regression: Dashboard room card → RoomCheckInModal still works untouched (OD-01 co-exist proof) |
| Registry closure prep | Code markers audit, FILE_OWNERSHIP, CR-358 parent status roll-up |

**Exit criteria:** V10 + full regression matrix PASS → CR-358 parent ready for owner smoke + sprint closure.

---

## 3. Recommended Implementation Order & Parallelism

```
        FE TRACK                              BACKEND TRACK (parallel)
  ┌─────────────────────┐
  │ PHASE 1 (unblocked) │      ← backend fixes BUG-BE-01/02 + BUG-BE-03 NOW
  └────────┬────────────┘
  ┌────────▼────────────┐
  │ PHASE 2 (WalkIn OK) │      ← backend builds dashboard-kpis
  └────────┬────────────┘
     HARD GATE: local-reservations 200
  ┌────────▼────────────┐
  │ PHASE 3             │      ← backend builds PATCH room-status
  └────────┬────────────┘
  ┌────────▼────────────┐
  │ PHASE 4             │      ← backend confirms NS-01 endpoints
  └────────┬────────────┘
  ┌────────▼────────────┐
  │ PHASE 5 + regression│
  └─────────────────────┘
```

- Phases 1→2 can start **immediately** — zero backend wait.
- If backend fixes land early, Phase 3 entry probe can run mid-Phase-2; phases never overlap in implementation (one Gate 4 GO at a time) but backend work is fully parallel.
- Worst case (backend slips): Phases 1–2 still deliver a working Channel Manager + Walk-in booking flow = standalone shippable value.

---

## 4. Cross-Phase Dependencies

| Dependency | Provider → Consumer | Type |
|---|---|---|
| Routes/Sidebar/constants skeleton | P1 → P2–P5 | Code (touched once, frozen after P1) |
| `aiosellService.js` core calls | P1 → P3, P4, P5 | Code |
| Meal-plan decoder | P1 → P2 (S4 badge), P3 (lists) | Code |
| Room mapping completed (data state) | P1 → P4 tape chart rows, P1 inventory push | Data |
| local-reservations transform | P3 → P4 (tape chart blocks) | Code |
| WalkIn check-in proven | P2 → P3 (OTA variant reuses same payload path) | Code |
| GET_ROOM_LIST reuse | P1 (S6) → P4 (S7 occupied state) | Code |

---

## 5. Risks, Gaps & Discovery Items

| # | Risk / Gap | Phase | Mitigation |
|---|---|---|---|
| R1 | Sidebar.jsx BUG-361 pattern break (68-file sweep) | P1 | Grep pattern first; regression 3 existing pages; Sidebar touched only in P1 |
| R2 | `local-reservations` response shape unknown until BE fix (probed only as 500) | P3 | HARD entry gate: re-probe + freeze contract in transform before any view code |
| R3 | S2 Gantt complexity underestimated | P4 | Isolated phase; static-data render milestone before wiring; mockup is contract |
| R4 | NS-01 endpoints never probed — may not exist | P5 | Probe-first entry gate; per-endpoint defer without blocking phase |
| R5 | GAP-09 inventory release on checkout unverified → OTA overbooking risk | P5 (probe), latent from P2 | Explicit probe in P5; if broken → P0 BACKEND_BRIEF |
| R6 | Dual check-in paths drift (RoomCheckInModal vs S4) | P2, P5 | OD-01 co-exist; payload builders reuse `roomService.checkIn()` unchanged; P5 regression tests OLD flow explicitly |
| R7 | No socket for new reservations (GAP-10, deferred) | P3 | Manual refresh + polling-on-focus acceptable for MVP; note for CR-358 Phase-2-of-product |
| R8 | KPI endpoint late (MISSING-01) | P3 | Non-blocking skeleton state per NS-02 |
| R9 | Multi-room OTA bookings (GAP-15) | P3/P4 | MVP: render first room + "+N rooms" chip; full multi-room UI = backlog |

**Needs further discovery (before the relevant phase, not now):**
- P3: exact `local-reservations` pagination/filter params (`view=arrivals|departures`? `checkin_date`?) — confirm with backend when unblocked.
- P4: does backend add `room_status` to `GET /aiosell/rooms` response or a separate endpoint? (feeds roomStatusTransform).
- P5: NS-01 endpoint payload shapes.

---

## 6. Estimated Size per Phase (for owner planning)

| Phase | New files | Modified files | Est. new LOC | Screens delivered | Backend gate |
|---|---|---|---|---|---|
| P1 | 4 services/transforms + 2 pages + placeholder | App.js, Sidebar.jsx, constants.js | ~1,600 | S8 (A/B/OTA), S6 | None |
| P2 | 2 pages | pmsService.js ext | ~1,100 | S3, S4 | BUG-BE-03 (partial) |
| P3 | 3 pages | aiosellTransform ext | ~1,200 | S1, S9, S10 | BUG-BE-01/02 (hard) |
| P4 | 2 pages + 1 transform | — | ~1,300 | S2, S7 | MISSING-02 |
| P5 | 0 pages (S8 tabs C/D) | ChannelManagerPage ext | ~700 | S8-C, S8-D | NS-01 probe |

---

## 7. Per-Phase Process (applies to every phase)

1. PLANNING writes `CR-358-P<N>_IMPLEMENTATION_PLAN.md` (exact edits, verification matrix, registry checklist)
2. Owner Gate 4 GO
3. IMPLEMENTATION (entry verification, code markers `// CR-358-P<N>`, EXIT GATE 5/5)
4. QA per phase verification matrix
5. Owner smoke on preprod (restaurant 69) → phase CLOSED in registry

---

## 8. Immediate Next Actions

| # | Who | Action |
|---|---|---|
| 1 | Owner | ✅ DONE (2026-09-01) — Approved 5-phase breakdown, no merges/splits requested |
| 2 | Backend | ✅ DONE — ALL 4 backend blockers (BUG-BE-01/02/03/04) fixed and agent-verified live on preprod (2026-09-01), including full Direct + OTA check-in flows reaching `in_house`/`checked_in` |
| 3 | Owner | 🔲 NEXT — Review the phased plan (re-presented in detail by next agent) |
| 4 | Planning agent | 🔲 NEXT — Gate 2 (Impact Analysis) for CR-358-P1 (Phase 1) ONLY — NOT Gate 3 Implementation Plan yet, per owner instruction |
| 5 | Registry | 🔲 NEXT — Register CR-358-P1 in registry.json once Gate 2 starts |

---

*Planning agent | CR-358 phasing strategy | Owner APPROVED 2026-09-01 | ALL 4 backend blockers (BUG-BE-01/02/03/04) agent-verified FIXED end-to-end | Next: present plan -> Gate 2 for CR-358-P1*
