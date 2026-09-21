# CR-385 · MASTER HANDOVER — Phase 0 done, Phase 0.5 (bug-fix) next (2026-09-21)

```
Item:        CR-385 PMS Front Desk — Unified Tabbed Workstation · sprint_key pos_pms_2 · Risk HIGH (modules MEDIUM→CRITICAL)
Owner:       English. Sandbox-pms (RID 69, The Goan Kitchen) · preprod. Credentials by alias only: OWNER_TGK → memory/test_credentials.md
Where we are: Gate 4 GO given (2026-09-21) · PHASE 0 (M0 shell) CODED + QA PASSED 35/35 · owner smoke NOT run yet
Next role:   PLANNING-lite (½ page plan note) → owner "Phase 0.5 GO" → BUG FIX (Role 5) → QA (Role 4) → owner Phase 0 smoke → "Phase 0 smoke OK" → Phase 1
Hard rule (owner, 2026-09-21): every phase N has an N.5 — ALL bugs found in phase N are fixed and re-QA'd before N+1 unless the intake proves a
             dependency on a later phase; then the bug is tagged DEFERRED-TO-P<k>, becomes an ENTRY CONDITION of P<k>, and the owner approves the deferral.
This file is the single entry point for ANY next agent (Planning, Bug Fix, QA, Smoke, Implementation). Read it fully, then §0.
```

---

## 0. BOOT ORDER (do exactly this, in this order)

| # | Read | Why |
|---|------|-----|
| 1 | `memory/control/AGENT_PROMPT_ALPHA.md` (v0.7) | Roles, gates, risk table, Fast Lane, approval matrix, R0–R24, EXIT GATE. Pick ONE role via the decision tree. |
| 2 | **this file** | State + Phase 0.5 brief + routing of every open bug |
| 3 | `memory/handover/SESSION_HANDOVER_2026_09_21_CR385_GATE3_CLOSED.md` | The Planning agent's original Implementation handover: §2 do-not-touch list, §3 Entry Verification commands, §4 frozen decisions, §5 contract, §6 sandbox rules, §10 smoke notes. Still binding. |
| 4 | `memory/plans/CR-385_IMPLEMENTATION_PLAN_PHASED.md` | **The plan.** §0 gating rule (+ new §0-bis N.5 rule), Phase 0 §0.1–0.6, **Phase 0.5 §0.7 (new)**, Phases 1–5. Read only the phase you are in + §0 + cross-phase checklist. |
| 5 | `memory/plans/CR-385_IMPLEMENTATION_PLAN.md` (companion) | §1 scope lock, §3 data contract (C1–C9), §4 module detail + testids, §5 gap/AC map, §6 verification matrix, §7 registry checklist, §8 risks |
| 6 | `memory/plans/CR-385_DESIGN_DECISIONS.md` **D1–D71 in full** | Every decision is binding. D70 (BUG-437 option a) and D71 (BUG-435 5 s debounce) added 2026-09-21. |
| 7 | `frontend/public/cr385-frontdesk-mockup.html` (open in browser) + `frontend/public/cr385-master-checklist.html` | Visual truth (sha `12fd0f4a…1168b86`, do not edit) · the tick-list you update with evidence |
| 8 | `memory/impact/CR-385_IMPACT_ANALYSIS_REV4_GATE_2_6_FINAL.md` | Gaps G-xx, OD-385-xx owner decisions, IA answers |
| 9 | Blueprints (only for P1+): `plans/CR-385_UX_FLOW_GATE_2_4.md`, `CR-385_BOOKING_V2_17_BLUEPRINT.md`, `CR-385_EXTEND_STAY_V2_19_BLUEPRINT.md`, `CR-385_NOSHOW_CANCEL_V2_22_BLUEPRINT.md` | Form-level behaviour for M1/M4/M2 |
| 10 | `memory/backend_briefs/BACKEND_BRIEF_CR-385_MASTER.md` + `…_2026-09-20_FINAL_PACK.md` | Payload shapes, BQ answers (BQ-16 server pricing, BQ-21…) |
| 11 | Fixtures `memory/evidence/CR-385/probes_2026_09_20_g4_09/` (LR view=all, board, kpis) — copies in `frontend/src/__fixtures__/cr385/` | Real payloads every `*.cr385.test.js` runs on |
| 12 | `memory/test_credentials.md` | OWNER_TGK values (never paste in chat/reports) |
| 13 | `memory/control/FILE_OWNERSHIP.md` (CR-385 sections), `control/registry.json` (CR-385 + BUG-431…438), `control/OPEN_GAPS_REGISTER.md` (OG-PMS-028/029) | Ownership, status, open gaps |
| 14 | Phase 0 artefacts: `handover/SESSION_HANDOVER_2026_09_21_CR385_P0.md`, `handover/QA_HANDOVER_2026_09_21_CR385_P0.md`, `test_reports/QA_REPORT_2026_09_21_CR385_P0.md`, `test_reports/iteration_5.json`, `iteration_6.json`, `evidence/CR-385/qa_2026_09_21_p0/` | What was built, how it was tested, what QA found |
| 15 | Intake docs `change_requests/BUG-43{1..8}_*_INTAKE.md` + `control/BUG_TRACKER.md` (2026-09-21 blocks) | The eight open bugs |

Before ANY edit: run the **Entry Verification** for the lines you will touch (§4 below), report drift by content, then edit.

---

## 1. THE PLAN THE PLANNING AGENT GAVE US (condensed; the files above are authoritative)

**Goal.** Replace six legacy PMS pages with one tabbed Front Desk workstation at `/pms/front-desk-v2` ("Front Desk (Beta)" in the sidebar), built beside the old pages (OD-385-12: nothing existing changes until FU-385-C retires them). Modules: **M0** shell · **M7** Front Desk Rules tab (on Channel Manager, 5th tab) · **M2** Cancel / No-Show / Modify · **M1** New Booking · **M3** Check-In · **M4** Extend Stay · **M5** balances & row actions · **M6** Bill/Checkout.

**Phases (each ends with owner smoke + the sentence "Phase N smoke OK"):**
| Phase | Modules | Risk | Existing files touched | Status |
|---|---|---|---|---|
| **P0** | M0 shell (read-only) | MEDIUM | `App.js`, `Sidebar.jsx`, `roomStatusTransform.js` (+test) | **CODED · QA 35/35 · smoke pending** |
| **P0.5** (new) | Fix BUG-434/435/436/437/438 | LOW | `FrontDeskWorkstationPage.jsx`, `RoomsPanel.jsx`, `ArrivalsPanel.jsx`, `DeparturesPanel.jsx` + tests | **NEXT** |
| P1 | M7 Rules tab · M2 cancel/no-show/modify | HIGH (inventory) | `ChannelManagerPage.jsx`, `restaurantSettingsService.js`, `CancelBookingDialog.jsx`, `NoShowDialog.jsx` | not started — do not read §1 of the phased plan before "Phase 0 smoke OK" |
| P2 | M1 New Booking · M3 Check-In | CRITICAL (money in) | none | entry conditions: **BUG-431, BUG-432** fixed inside P2 |
| P3 | M4 Extend · M5 balances | CRITICAL (money) | none | entry condition: **BUG-433** rounding rule fixed inside P3 |
| P4 | M6 Bill/Checkout (Layout B, real `CollectPaymentPanel`) | CRITICAL (settlement) | none (import only) | — |
| P5 | closure, full regression, FU-385-C decision | — | — | — |

**Frozen rules (every phase, grep-guarded):** money from `charge.*` only (never `balance_payment`, top-level `advance_payment`, `amount_after_tax/before_tax`, folio `remaining_room_balance`); "today" = `meta.business_date` only (browser clock only builds the first request window); Area = normalised room `title`; one expansion open at a time; sticky `<th>` in a zero-top-padding scroll container; no Split tile at advance points (OD-385-18a); Extend/Modify = new forms (OD-385-16a); Rules tab lives on Channel Manager (OD-385-17); no "Channel Manager" wording on the Front Desk `<main>`; SGST → CGST two lines; en-IN money; `// CR-385 M<n>` marker on every new file and edited line; unique kebab-case `data-testid` on every interactive element; LR always requested with `start_date`/`end_date`/`view=all` (C2); `dashboard-kpis` range ≤ 31 days → single-day window (learned P0).

**Do-not-touch (handover §2):** `CollectPaymentPanel.jsx`, `orderTransform.js`, `pmsService.js` (call, never edit), `PmsCheckoutDrawer.jsx`, `ExtendStayDialog.jsx`, `ModifyBookingDialog.jsx`, `RestaurantSettingsPage.jsx`, `AppProviders.jsx`, `.env`, the mockup HTML, all legacy PMS pages (until FU-385-C).

**Sandbox rules (§6):** OWNER_TGK only; rooms r4/8525, r5/8527, r1/8528; **never** 8524 (r3) / 8526 (r2); settle every stay you create; restore settings (`allow_early_checkin=false`, `extend_rate_mode=calendar`, `auto_print_checkin_receipt=false`); restore room statuses you toggle. Preprod PATCH ≈ 5 s; single-session token (re-login on 401); login page is `/` (`login-email`, `login-password`, LOG IN); first load may take 40 s; app boots via `/loading`.

**Per-phase loop (phased plan §0 + cross-phase checklist):** Entry Verification → code only the listed files → `*.cr385.test.js` on real fixtures → grep guards empty → `yarn build` exit 0 (note: `CI=true yarn build` fails on **pre-existing** exhaustive-deps warnings — not ours) → one smoke screenshot → testing_agent at 1920×800 + 1366×768 → fix everything → EXIT GATE 5/5 → tick checklist with evidence → sync registry.json / CR_REGISTRY / CONTROL_DASHBOARD / PRD / FILE_OWNERSHIP → QA handover (template v0.7) → QA role report → owner smoke script → stop.

---

## 2. PHASE 0 — WHAT EXISTS (actual line numbers)

| File | Lines |
|---|---|
| `App.js` | L110 import · **L272** route `/pms/front-desk-v2` |
| `components/layout/Sidebar.jsx` | L245 `{ id: 'pms-front-desk-v2', label: 'Front Desk (Beta)' }` |
| `api/transforms/roomStatusTransform.js` | L18 `hkAssignee` · L19 `isOccupied` · L20 `guest.phone/email` · L38 `meta` |
| `api/transforms/__tests__/roomStatusTransform.cr358p4.test.js` | `testCr385Additive()` (plain-node script — run with `node`, not jest) |
| NEW `pages/pms/FrontDeskWorkstationPage.jsx` | page; `useFrontDeskSnapshot` (L26–46: `refresh`, focus listener L44), `useTabParam`, `DEFAULT_CHIP` L23, `expanded {rowId, roomId}`, `handlePatch`, error card + `fd-retry-btn` (~L118–124), `<div data-testid="fd-page">` L104 wrapping `<Sidebar/>` + `<main>` |
| NEW `api/services/frontDeskService.js` | `getSnapshot({start,end,today})` — LR ‖ board ‖ kpis via `Promise.allSettled`; LR reject → throw; re-exports `patchRoomStatus`/`bulkMarkClean` |
| NEW `api/transforms/frontDeskTransform.js` | `fromReservation`, `bucketArrival/Departure/InHouse`, `plusDays/dayDiff`, `normaliseTitle`, `nsOrCancel`, `isCleared`, `badgeFor`, `groupRooms`, `isTurn`, `roomChipKey`, `fromFrontDeskSnapshot` |
| NEW `components/pms/frontdesk/` | `WorkstationHeader` (greeting, business date, sync pill, ↻ `fd-refresh-btn`, disabled New Booking) · `KpiTabStrip` (tiles = tabs) · `AlertBar` (`deriveAlerts`) · `GlobalSearch` (`searchSnapshot`, `/` focus) · `GuestTable` (sticky th, ↑↓ Enter Esc, `commonColumns`, `Badge`, `StatusPill`, `PhaseButton`, `RowExpansionStub`, `sortRows`) · `ArrivalsPanel` (exports `Chips`, `CHIP_ORDER`, `useChipCounts`) · `DeparturesPanel` (exports `stayActions`, `stayStatus`) · `InHousePanel` · `RoomsPanel` (group-by persisted `mygenie_frontdesk_groupby`, chips, `fd-rooms-error` + `fd-rooms-retry-btn`) · `RoomTile` (copy of `RoomStatusPage.jsx @8c7745f L25–27/L198–266`, mirror rule) · `RoomDetail` (6 states; live Mark Clean / Request HK / Set OOO / Back in service) · `money.js` · `frontdesk.css` |
| NEW tests | `api/transforms/__tests__/frontDeskTransform.cr385.test.js` (13) · `api/services/__tests__/frontDeskService.cr385.test.js` (4) · `components/pms/frontdesk/__tests__/money.cr385.test.js` (3) — run `CI=true yarn test --watchAll=false --testPathPattern=cr385` |
| NEW fixtures | `src/__fixtures__/cr385/{local_reservations_view_all,room_status_board,dashboard_kpis}.json` |

Phase-gated slots for later phases: `PhaseButton` (disabled, "Available in Phase N") in every row/tile; `RowExpansionStub` is the P1/P2/P4 expansion body placeholder; `navigateTo({tab, chip, rowId, roomId, kind})` already receives `kind: nsOrCancel(row)` from alerts (P1 wiring).

**Live state observed 2026-09-21:** business date 2026-09-21 · Arrivals 0 today / 10 late / 4 upcoming · Departures 2 today · In-House 2 (r3, r2 — other testers) · Rooms 0 free, r4/r5/r1 HK · occupancy 20 %.

---

## 3. OPEN BUGS — ROUTING (owner-approved 2026-09-21)

| ID | Title (short) | Sev | Risk | Found | **Phase** | Why there |
|---|---|---|---|---|---|---|
| **BUG-434** | Retry buttons (`fd-retry-btn`, `fd-rooms-retry-btn`) show no in-flight state | P2 | LOW | P0 QA | **P0.5** | P0 file; CODE_ERROR vs plan F14 "mirror the header pill" |
| **BUG-435** | ↻ fires a duplicate snapshot batch (focus listener + click) | P2 | LOW | P0 QA | **P0.5** | P0 file; PLAN_GAP → **D71: 5 s debounce** |
| **BUG-436** | `data-testid="fd-page"` wraps the Sidebar | P3 | LOW | P0 QA | **P0.5** | P0 file; add `fd-workstation-body` on `<main>` |
| **BUG-437** | Arrivals lands on empty "Today 0" while Late has rows | P2 | LOW | P0 QA | **P0.5** | P0 files; PLAN_GAP vs UXQ-385-01 → **D70: option (a) first non-empty chip** |
| **BUG-438** | No automated tests for keyboard ↑↓/Enter/Esc, phone-suffix search, Turns, focus-refresh | P3 | LOW | P0 QA | **P0.5** | tests only |
| **BUG-431** | Legacy `CheckInPage` pre-fills Room Amount with base+GST and re-applies GST | P2 | CRITICAL | P0 B-7 smoke | **DEFERRED-TO-P2** (entry condition) | Legacy page; M3 Check-In replaces it in P2 — fix (or retire with FU-385-C decision) **inside P2**, not after |
| **BUG-432** | Legacy `NewBookingPage` FE rate honoured over CM rate (BQ-385-16) | P2 | CRITICAL | P0 B-7 smoke | **DEFERRED-TO-P2** (entry condition) | Legacy page; M1 New Booking omits the rate — decide FE omit / backend ignore / retire **inside P2** |
| **BUG-433** | ₹1 rounding divergence In-House / Folio / POS | P3 | HIGH | P0 B-7 smoke | **DEFERRED-TO-P3** (entry condition) | M5 balances (`getRowBalance`) must adopt one rounding rule; needs backend confirmation of the authoritative figure → BACKEND_BRIEF early in P3 |

Deferral approved by the owner in chat 2026-09-21 ("Agree"). Record in each intake doc header `Deferred to: P2/P3 (owner-approved 2026-09-21)` — done by this handover's sync.

---

## 4. PHASE 0.5 — EXACT BRIEF FOR THE NEXT AGENT

### 4.1 Order of work
1. **Present the owner the full bug table (§3) first**, one line each, and the two recorded decisions (D70 option a, D71 5 s). Ask for the words **"Phase 0.5 GO"**. Do not edit `frontend/src/` before that.
2. **Plan note** (Planning-lite, LOW risk minimum): `plans/CR-385_PHASE_0_5_BUGFIX_PLAN.md` — per bug: file, line, change, test, QA row. Half a page. The skeleton is §4.3 below — copy, verify lines, fill in.
3. **Bug Fix role (Role 5)** on all five in one batch: Step 0 reproduce each (repro in the intake docs), Step 1 RCA one line each (MINOR-level depth), Step 2 fix only the failing case, Step 3 verify (`yarn test … cr385`, adjacent cases), Step 4 EXIT GATE 5/5. Marker `// CR-385 M0.5 BUG-43x` on every edited line.
4. **QA role (Role 4)** re-test protocol: the 5 bugs + the full Phase 0 matrix (QA handover §1–§3, 35 cases) + the newly automated A4/A5/A6/keyboard cases; both viewports; report `test_reports/QA_REPORT_<date>_CR385_P0_5.md`; any new bug → intake → stays in P0.5.
5. Sync registry (`GATE_5B_QA_PASSED (P0+P0.5)`), CR_REGISTRY, CONTROL_DASHBOARD, PRD, FILE_OWNERSHIP, checklist rows M0-01/02/03/10, X-10/X-12 re-evidenced; write `handover/SESSION_HANDOVER_<date>_CR385_P0_5.md`; hand the owner the **combined Phase 0 smoke script** (phased plan §0.5 + the P0.5 checks in §4.4). Stop. Phase 1 only after **"Phase 0 smoke OK"**.

### 4.2 Entry Verification (run before the first edit; re-anchor by content if drifted)
```
cd /app/frontend/src
grep -rn "CR-385 M0.5" . | wc -l                                   # expect 0
grep -n "DEFAULT_CHIP\|addEventListener('focus'\|fd-retry-btn\|data-testid=\"fd-page\"\|const refresh = useCallback" pages/pms/FrontDeskWorkstationPage.jsx
grep -n "fd-rooms-retry-btn\|onRetry" components/pms/frontdesk/RoomsPanel.jsx
grep -n "export const Chips\|export const useChipCounts\|CHIP_ORDER = " components/pms/frontdesk/ArrivalsPanel.jsx
grep -n "onKeyDown\|ArrowDown" components/pms/frontdesk/GuestTable.jsx
grep -n "endsWith\|export const searchSnapshot" components/pms/frontdesk/GlobalSearch.jsx
git -C /app status --short frontend/src | grep -E "CollectPaymentPanel|orderTransform|pmsService|CheckInPage|NewBookingPage|RoomStatusPage" && echo HOTSPOT-TOUCHED || echo hotspots-clean
```

### 4.3 Fix skeleton (verify lines first — numbers are 2026-09-21)
| Bug | File | Change | Test |
|---|---|---|---|
| 434 | `FrontDeskWorkstationPage.jsx` error card (~L118–124) | pass `refreshing` → `fd-retry-btn` `disabled={refreshing}` + `<Loader2 animate-spin/>` + text "Retrying…" while refreshing; same props to `RoomsPanel` (`retrying`) for `fd-rooms-retry-btn` | RTL: click retry → button disabled + text changes until promise resolves |
| 435 | `FrontDeskWorkstationPage.jsx` `useFrontDeskSnapshot` (~L26–46) | `inFlightRef` (skip if true) + `lastFetchRef`; focus handler: `if (Date.now() - lastFetchRef.current < 5000) return;` manual `refresh()` never skipped except coalesced with in-flight | RTL: two `focus` events within 5 s → 1 `getSnapshot`; click ↻ while in flight → 1 call |
| 436 | `FrontDeskWorkstationPage.jsx` `<main>` (~L106) | add `data-testid="fd-workstation-body"`; update QA brief + grep guard scope to that id (keep `fd-page`) | QA brief row; DOM probe |
| 437 | `FrontDeskWorkstationPage.jsx` `DEFAULT_CHIP` + chip state | initial chip per tab = first non-empty in `CHIP_ORDER` order (arrivals: late→today→tomorrow→upcoming; departures: overdue→today→tomorrow→upcoming); re-evaluate only while the user has not clicked a chip on that tab (`chipTouched[tab]`); In-House/Rooms stay `all` | unit `firstNonEmptyChip(counts, order)`; RTL: fixture (0 today, 10 late) → "Late" active; counts all zero → "today" |
| 438 | `components/pms/frontdesk/__tests__/` | add `GuestTable.cr385.test.jsx` (ArrowDown/Up focus, Enter toggles, Esc closes), `GlobalSearch.cr385.test.js` (`searchSnapshot` phone suffix, room, guest), extend `frontDeskTransform.cr385.test.js` with `isTurn` on a live-shaped snapshot | jest; add A4/A5/A6 + keyboard to the P0.5 QA brief |
Nothing else. If a fix needs another file → STOP and ask the owner (Role 5 scope-expansion protocol).

### 4.4 P0.5 additions to the owner smoke
- Block the network once (DevTools offline) → Retry shows a spinner + "Retrying…" and is not clickable twice.
- Come back to the tab and click ↻ immediately → DevTools shows **one** batch of three `aiosell` calls.
- Arrivals opens on **Late N** when Today is empty (or on Today when it has rows); clicking a chip and refreshing keeps your chip.
- Keyboard: focus a row, ↑↓ moves, Enter opens, Esc closes.

---

## 5. REGISTRY / DOC STATE AT HAND-OFF
- `registry.json`: CR-385 `GATE_5B_QA_PASSED (P0)` (+ `phase_0_5`, `bug_routing`), BUG-434…438 `INTAKE` (phase P0.5), BUG-431/432 `INTAKE · DEFERRED-TO-P2`, BUG-433 `INTAKE · DEFERRED-TO-P3`.
- Phased plan: §0-bis N.5 rule + §0.7 Phase 0.5 added. Design decisions: D70, D71 added.
- Checklist ticked: M0-01…10, X-01/06/07/10/11/12/13/14/15, R-04, R-08, G4-10 (P0 evidence).
- `yarn build` exit 0 · cr385 tests 20/20 · webpack compiled · sandbox restored.

## 6. FORMAL LINES
Implementation → QA (done): "Code done. QA handover at handover/QA_HANDOVER_2026_09_21_CR385_P0.md. Items: CR-385 (P0). Self-test 19/19. Registry synced: YES. EXIT GATE 5/5."
QA → Owner (done): "QA complete. 35/35 passed. Coverage 19/19. Registry SYNCED. 0 BLOCKER/MAJOR/MINOR, 6 NOTE → BUG-434…438 registered. Ready for Gate 6 after P0.5."
Intake → Planning/Bug Fix (this file): "Items BUG-434…438 registered (P0.5); BUG-431/432 DEFERRED-TO-P2, BUG-433 DEFERRED-TO-P3 (owner-approved). Code reality: EXISTS. Duplicate check: DISTINCT/RELATED CR-385. Blast radius SMALL, hotspots NO. Evidence captured. Owner decisions recorded: D70 (437 → a), D71 (435 → 5 s). Next: Phase 0.5 GO → Bug Fix."
