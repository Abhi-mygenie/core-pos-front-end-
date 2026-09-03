# Session Handover — CR-358-P4 Gate 3 Implementation Plan WRITTEN (2026-09-04)

## Session Summary
PLANNING agent (Role 2, ALPHA v0.7), stage = Implementation Plan (Gate 3) only. Plan written at `memory/plans/CR-358-P4_IMPLEMENTATION_PLAN.md`. **No code written.** Local checkout drift vs `origin/PMS1` found and fixed (owner-approved). Awaiting explicit **Gate 4 GO** + SC-P4-01 ack.

---

## 1. Drift finding + fix (owner option (b): sync 9 files, keep `.p4_token`)

- Local `/app/frontend` git had **no remote**; `/app/frontend/src` was **9 files behind `origin/PMS1` @ `0c3d3c0`** (P3 pages + `PmsCheckoutDrawer.jsx` + P3 blocks in `pmsService.js`/`aiosellTransform.js` + App.js P3 routes + BUG-380 edits in CheckIn/NewBooking). Memory docs were in sync; only src drifted (previous session synced docs only, per owner's "no other action").
- Fix: `git remote add origin …`, `git fetch origin PMS1`, `git checkout origin/PMS1 -- <9 files>`. Result: `git diff origin/PMS1 -- frontend/src` **empty**; webpack compiled; `/pms/front-desk` renders real P3 page (live KPIs); `/pms/room-status` still Phase-4 placeholder.
- Local-only content preserved (Gate-2 P4 docs + 13 probes). Logged: OG-PMS-012 (RESOLVED, process gap), OG-PMS-011 (P3 comparison HTML skin drift — closure item, untouched).
- Platform junk on remote (`frontend/plugins/plugins/…`, `test_reports/iteration_*.json`, `.gitconfig`) intentionally not pulled.

## 2. Gate 3 entry re-verification (R11/R12)
- Code reality **NONE** (post-sync grep). App.js placeholder routes now **L262-263** (IA said L259-260 pre-sync). `pmsService.js` EOF L223. `constants` ROOM_STATUS L586 / ROOM_STATUS_BOARD L587.
- Probes G3-01..03 (`evidence/CR-358-P4/P4_probe_G3_*.json`, masked): board (5 rooms, r2 occupied+manual hk), local-reservations (15: 7 departed/6 pending/2 in_house; `WalkIn` channel present; 5 pending with no table), rooms catalog — **contracts unchanged**.
- **New risk:** CORS preflight for PATCH returns duplicated `allow-methods` (`*` and `GET, POST, OPTIONS, PUT, DELETE` — PATCH not explicit). Wildcard should apply (no `withCredentials`), but `api.patch` has no precedent in src → plan makes **V-B0 (browser PATCH smoke)** the first Gate-4 milestone with BACKEND_BRIEF fallback.
- Join-key clarification: raw `rooms[].restaurant_table_id` ⇒ transformed `roomLines[].restaurantTableId` (IA's "not roomLines" note was about the raw payload).
- S2/S7 semantic: unassigned bookings in `local-reservations` appear as Booked tiles on the board (server assigns by room code) — matches mockup; documented A-P4-12.

## 3. Plan highlights
- **Files WILL change (5 app + 3 test):** `api/transforms/roomStatusTransform.js` (NEW), `api/services/pmsService.js` (append: `getRoomStatusBoard, patchRoomStatus, bulkMarkClean, buildTapeChart, getTapeChartData`), `pages/pms/ReservationsPage.jsx` (NEW), `pages/pms/RoomStatusPage.jsx` (NEW), `App.js` (6 lines — SC-P4-01 incl. removal of now-unused `PmsPlaceholderPage` import), tests T1/T2 + fixture T3.
- **Files will NOT touch:** aiosellTransform.js, aiosellService.js, constants.js, axios.js, all P1-P3 pages, PmsCheckoutDrawer, Sidebar, DashboardPage, AppProviders, localStorage keys, mockups.
- Scope corrections: SC-P4-01 (App.js 6 lines), SC-P4-02 (unit tests, owner-chosen), SC-P4-03 (`buildTapeChart` in pmsService, not a 4th file).
- New assumptions A-P4-11..20 (view labels 7d/14d/30d; unassigned rule; nights span; S2 badges derived — HK/OOO S7-only; token-compliant colours replacing mockup's `#003580`/`#6366F1`; auto-HK pill info-only; refresh/visibilitychange; grouping; filter chips; busy states).
- Verification matrix: **43 checks (18 auto / 25 manual, 0 financial)**; covers IA V1-V19.
- Risk: MEDIUM. Register R1-R11 (CORS, optimistic drift, bulk, S2/S7 mismatch, today TZ, 30d density, hotspot stacking, OG-PMS-010, unknown status, App.js, drift recurrence).

## 4. Registry state
| Doc | Status |
|---|---|
| `registry.json` CR-358-P4 | gate 3, status GATE 3 PLAN WRITTEN, artifact_refs + Implementation Plan ✅ |
| `CR_REGISTRY.md` | row + Last Updated ✅ |
| `CONTROL_DASHBOARD.md` | header ✅ |
| `CR-358-P4_IMPACT_ANALYSIS.md` | banner → Gate 3 written + line-ref correction ✅ |
| `OPEN_GAPS_REGISTER.md` | OG-PMS-011 (OPEN), OG-PMS-012 (RESOLVED) ✅ |
| `evidence/CR-358-P4/` | +3 G3 probes (16 files) ✅ |

## 4b. Correction logged this session
CR-358-P3 **Gate 5b QA is NOT done** (registry gate 4, 'Awaiting Gate 5'). The 2026-09-03 full regression only smoke-checked 8 P3 screens; no P3 QA handover/report exists; V-M1..M6 money tests on `PmsCheckoutDrawer` and V-U1..U6 unit tests were never executed. PRD.md corrected (earlier line 'Complete (QA Regression PASS)' was wrong).

## 5. INSTRUCTION TO NEXT AGENT
**Do NOT code until owner writes "Gate 4 GO" (and acks SC-P4-01).** Then Role = IMPLEMENTATION:
1. Read plan §0-§6; run Step 0 entry verification (line refs + `git diff origin/PMS1 -- frontend/src` must be empty; re-probe if >7 days).
2. Execute §6 in order — **V-B0 CORS PATCH smoke first**; stop + BACKEND_BRIEF if blocked.
3. Restore r1 to `hk` after toggle tests (QA baseline = mockup).
4. EXIT GATE 5/5 → QA handover inherits §7.

Credentials: alias OWNER_PREPROD (see `test_credentials.md` policy — no raw secrets in docs). A live bearer token for probes exists at `evidence/CR-358-P4/.p4_token` (owner chose to keep it; never print it).

---
```
Planning complete: CR-358-P4
Stage: Implementation Plan (Gate 3)
Code reality: NONE
Risk: MEDIUM
Files WILL change: roomStatusTransform.js (NEW), ReservationsPage.jsx (NEW), RoomStatusPage.jsx (NEW),
                   pmsService.js (append 5 exports), App.js (6 lines SC-P4-01) + 2 tests + 1 fixture
Files WILL NOT touch: aiosellTransform.js, aiosellService.js, constants.js, axios.js, PmsCheckoutDrawer.jsx,
                      all P1-P3 pages, Sidebar.jsx, DashboardPage.jsx, AppProviders.jsx, localStorage keys
Owner decisions: Gate 4 GO (blocking); SC-P4-01 ack (blocking); A-P4-11..20 defaults (override optional)
Docs: memory/plans/CR-358-P4_IMPLEMENTATION_PLAN.md
      memory/handover/SESSION_HANDOVER_2026_09_04_CR358P4_GATE3.md
      memory/evidence/CR-358-P4/P4_probe_G3_01..03
Next: Gate 4 GO / Implementation
```
