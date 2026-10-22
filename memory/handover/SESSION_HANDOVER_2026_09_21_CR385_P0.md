# CR-385 · SESSION HANDOVER — Phase 0 (M0 shell) IMPLEMENTED · awaiting owner "Phase 0 smoke OK" (2026-09-21)

```
Item:        CR-385 PMS Front Desk — Unified Tabbed Workstation (route /pms/front-desk-v2, sidebar "Front Desk (Beta)")
Role:        IMPLEMENTATION (AGENT_PROMPT_ALPHA v0.7 Role 3) · Risk HIGH (P0 module MEDIUM) · sprint_key pos_pms_2
Gate 4 GO:   given 2026-09-21 — owner: "Gate 4 GO. Correct on all five." (G4-10 ticked)
Phase 0:     CODE COMPLETE · unit 20/20 · guards empty · yarn build exit 0 · QA test_reports/iteration_5.json (~92%, 1 fix applied) · self-test 1366×768 zero console errors
Registry:    CR-385 → GATE_5A_IMPLEMENTED (P0) · BUG-431/432/433 → INTAKE
STOP:        Phase 1 (M7 Rules tab · M2 cancel/no-show/modify) must NOT start until the owner says "Phase 0 smoke OK". Phase 1 section of the phased plan not to be read before that.
Entry point: this file → plans/CR-385_IMPLEMENTATION_PLAN_PHASED.md (§1 only after the owner's sentence) → previous handover SESSION_HANDOVER_2026_09_21_CR385_GATE3_CLOSED.md (still valid for boot order, frozen decisions, contract, sandbox rules)
Language:    English.
```

## 1. What landed (Phase 0)
| Existing file | Actual lines (Entry Verification: no drift; plan numbers off by one after the import) |
|---|---|
| `App.js` | L110 import · **L272** route (plan said L271) |
| `components/layout/Sidebar.jsx` | L245 item `pms-front-desk-v2` |
| `api/transforms/roomStatusTransform.js` | L18 `hkAssignee` · L19 `isOccupied` · L20 `guest.phone/email` · L38 `meta` |
| `api/transforms/__tests__/roomStatusTransform.cr358p4.test.js` | `testCr385Additive()` (file is a plain-node script — `process.exit` at the end — so real-module assertions live in `frontDeskTransform.cr385.test.js`) |

New: `pages/pms/FrontDeskWorkstationPage.jsx` · `api/services/frontDeskService.js` · `api/transforms/frontDeskTransform.js` · `components/pms/frontdesk/{WorkstationHeader,KpiTabStrip,AlertBar,GlobalSearch,GuestTable,ArrivalsPanel,DeparturesPanel,InHousePanel,RoomsPanel,RoomTile,RoomDetail}.jsx` · `money.js` · `frontdesk.css` · `src/__fixtures__/cr385/*.json` · 3 `*.cr385.test.js`. Marker `// CR-385 M0` on every new file header and every edited line. `RoomTile.jsx` header cites `RoomStatusPage.jsx @8c7745f L25–27, L198–266`.

Shared helpers live in `GuestTable.jsx` (`commonColumns`, `sortRows`, `toggleSort`, `Badge`, `StatusPill`, `PhaseButton`, `RowExpansionStub`) and `ArrivalsPanel.jsx` (`Chips`, `CHIP_ORDER`, `useChipCounts`); `DeparturesPanel.jsx` exports `stayActions`/`stayStatus` for In-House. Later phases replace `RowExpansionStub` / `PhaseButton` slots with the real forms — do not add new files outside the plan list.

## 2. Contract learnings (add to plan §3 at P5)
- **C4 `dashboard-kpis`: 422 "Date range cannot exceed 31 days."** for the −30/+60 window → `getSnapshot({start,end,today})` sends `start_date = end_date = business_date` (only `today.*` is read). Found by QA iteration_5.
- Default chips = mockup `S.chip` (`arrivals:'today', departures:'today', inhouse:'all', rooms:'all'`). With 0 arrivals today the owner lands on an empty "Today" table while "Late 10" is one click away — flag if the owner wants a different default.
- Room-status PATCH is slow on preprod (≈5 s); the button spinner covers it; `refresh()` after 200.

## 3. Verification evidence
- Unit: `yarn test --watchAll=false --testPathPattern=cr385` → 3 suites / 20 tests PASS. Node script `roomStatusTransform.cr358p4.test.js` 5/5.
- Guards: forbidden-field grep empty on `components/pms/frontdesk`, `frontDeskService.js`, `frontDeskTransform.js`, page; "Channel Manager" grep empty; hotspots unchanged (`git status`); mockup sha `12fd0f4a343fc89d506478db999092d7ca564545b5cb2fc82118ca14c1168b86` unchanged.
- Build: `yarn build` exit 0 (only pre-existing exhaustive-deps warnings; `CI=true` build fails on those pre-existing warnings — not CR-385).
- QA agent: `test_reports/iteration_5.json` (+ screenshots) — all mandatory M0 behaviours PASS at 1920×800, sanity 1366×768; deferred Rooms write / 500 intercepts / arrow keys → self-tested 2026-09-21 09:08 (ArrowDown→`fd-row-155`, Enter opens 1, Esc closes 0; sticky th 315 vs container 314, padding 0; r4 Mark Clean → `available` → restored to `hk`).
- Sandbox at hand-off: r3/r2 occupied (other testers), r4/r5/r1 `hk` (as at start). No settings touched.

# CR-385 · SESSION HANDOVER — Phase 0 (M0 shell) IMPLEMENTED · awaiting owner "Phase 0 smoke OK" (2026-09-21)

```
Item:        CR-385 PMS Front Desk — Unified Tabbed Workstation (route /pms/front-desk-v2, sidebar "Front Desk (Beta)")
Role:        IMPLEMENTATION (AGENT_PROMPT_ALPHA v0.7 Role 3) · Risk HIGH (P0 module MEDIUM) · sprint_key pos_pms_2
Gate 4 GO:   given 2026-09-21 — owner: "Gate 4 GO. Correct on all five." (G4-10 ticked)
Phase 0:     CODE COMPLETE · unit 20/20 · guards empty · yarn build exit 0 · QA test_reports/iteration_5.json (~92%, 1 fix applied) · self-test 1366×768 zero console errors
Registry:    CR-385 → GATE_5A_IMPLEMENTED (P0) · BUG-431/432/433 → INTAKE
STOP:        Phase 1 (M7 Rules tab · M2 cancel/no-show/modify) must NOT start until the owner says "Phase 0 smoke OK". Phase 1 section of the phased plan not to be read before that.
Entry point: this file → plans/CR-385_IMPLEMENTATION_PLAN_PHASED.md (§1 only after the owner's sentence) → previous handover SESSION_HANDOVER_2026_09_21_CR385_GATE3_CLOSED.md (still valid for boot order, frozen decisions, contract, sandbox rules)
Language:    English.
```

## 1. What landed (Phase 0)
| Existing file | Actual lines (Entry Verification: no drift; plan numbers off by one after the import) |
|---|---|
| `App.js` | L110 import · **L272** route (plan said L271) |
| `components/layout/Sidebar.jsx` | L245 item `pms-front-desk-v2` |
| `api/transforms/roomStatusTransform.js` | L18 `hkAssignee` · L19 `isOccupied` · L20 `guest.phone/email` · L38 `meta` |
| `api/transforms/__tests__/roomStatusTransform.cr358p4.test.js` | `testCr385Additive()` (file is a plain-node script — `process.exit` at the end — so real-module assertions live in `frontDeskTransform.cr385.test.js`) |

New: `pages/pms/FrontDeskWorkstationPage.jsx` · `api/services/frontDeskService.js` · `api/transforms/frontDeskTransform.js` · `components/pms/frontdesk/{WorkstationHeader,KpiTabStrip,AlertBar,GlobalSearch,GuestTable,ArrivalsPanel,DeparturesPanel,InHousePanel,RoomsPanel,RoomTile,RoomDetail}.jsx` · `money.js` · `frontdesk.css` · `src/__fixtures__/cr385/*.json` · 3 `*.cr385.test.js`. Marker `// CR-385 M0` on every new file header and every edited line. `RoomTile.jsx` header cites `RoomStatusPage.jsx @8c7745f L25–27, L198–266`.

Shared helpers live in `GuestTable.jsx` (`commonColumns`, `sortRows`, `toggleSort`, `Badge`, `StatusPill`, `PhaseButton`, `RowExpansionStub`) and `ArrivalsPanel.jsx` (`Chips`, `CHIP_ORDER`, `useChipCounts`); `DeparturesPanel.jsx` exports `stayActions`/`stayStatus` for In-House. Later phases replace `RowExpansionStub` / `PhaseButton` slots with the real forms — do not add new files outside the plan list.

## 2. Contract learnings (add to plan §3 at P5)
- **C4 `dashboard-kpis`: 422 "Date range cannot exceed 31 days."** for the −30/+60 window → `getSnapshot({start,end,today})` sends `start_date = end_date = business_date` (only `today.*` is read). Found by QA iteration_5.
- Default chips = mockup `S.chip` (`arrivals:'today', departures:'today', inhouse:'all', rooms:'all'`). With 0 arrivals today the owner lands on an empty "Today" table while "Late 10" is one click away — flag if the owner wants a different default.
- Room-status PATCH is slow on preprod (≈5 s); the button spinner covers it; `refresh()` after 200.

## 3. Verification evidence
- Unit: `yarn test --watchAll=false --testPathPattern=cr385` → 3 suites / 20 tests PASS. Node script `roomStatusTransform.cr358p4.test.js` 5/5.
- Guards: forbidden-field grep empty on `components/pms/frontdesk`, `frontDeskService.js`, `frontDeskTransform.js`, page; "Channel Manager" grep empty; hotspots unchanged (`git status`); mockup sha `12fd0f4a343fc89d506478db999092d7ca564545b5cb2fc82118ca14c1168b86` unchanged.
- Build: `yarn build` exit 0 (only pre-existing exhaustive-deps warnings; `CI=true` build fails on those pre-existing warnings — not CR-385).
- QA agent: `test_reports/iteration_5.json` (+ screenshots) — all mandatory M0 behaviours PASS at 1920×800, sanity 1366×768; deferred Rooms write / 500 intercepts / arrow keys → self-tested 2026-09-21 09:08 (ArrowDown→`fd-row-155`, Enter opens 1, Esc closes 0; sticky th 315 vs container 314, padding 0; r4 Mark Clean → `available` → restored to `hk`).
- Sandbox at hand-off: r3/r2 occupied (other testers), r4/r5/r1 `hk` (as at start). No settings touched.

**QA handover:** `handover/QA_HANDOVER_2026_09_21_CR385_P0.md` (template v0.7 — Verification Matrix results, 10 additional cases, 6 regression rows).

## 4. Registry / docs synced (R17)
`control/registry.json` (CR-385 GATE_5A_IMPLEMENTED (P0), `gate_4_go`, `files_p0`, status_history; BUG-431/432/433 INTAKE) · `control/BUG_TRACKER.md` · `control/CR_REGISTRY.md` · `control/CONTROL_DASHBOARD.md` · `PRD.md` · `control/FILE_OWNERSHIP.md` · `public/cr385-master-checklist.html` (M0-01…10, X-01/06/07/10/11/12/13/14/15, R-04, R-08, G4-10 ticked with evidence) · `memory/test_credentials.md` (OWNER_TGK alias populated — never paste into chat).

## 5. Next agent — do exactly this
1. Boot per the previous handover §0 (rows 1–13) + this file. Re-run Entry Verification for **Phase 1 lines only after** the owner says "Phase 0 smoke OK": `sed -n '10p;48p' components/pms/CancelBookingDialog.jsx` · `sed -n '12p;39p' components/pms/NoShowDialog.jsx` · `sed -n '21p;26p;468p' pages/pms/ChannelManagerPage.jsx` · `sed -n '24,33p' api/services/restaurantSettingsService.js`.
2. If the owner reports Phase 0 smoke failures → fix → re-run cr385 tests + testing_agent → re-smoke Phase 0. No Phase 1 until the sentence.
3. Phase 1 wiring points already prepared: Arrivals `PhaseButton` kebab (`fd-row-<id>-kebab`) and `RowExpansionStub` slot; `navigateTo({tab, chip, rowId, kind})` receives `kind: nsOrCancel(row)` from alerts.

## 6. Owner smoke script — Phase 0 (≈10 min, read-only; phased plan §0.5)
See the chat message of 2026-09-21 (identical to plan §0.5). Say **"Phase 0 smoke OK"** or list what is wrong.

`control/registry.json` (CR-385 GATE_5A_IMPLEMENTED (P0), `gate_4_go`, `files_p0`, status_history; BUG-431/432/433 INTAKE) · `control/BUG_TRACKER.md` · `control/CR_REGISTRY.md` · `control/CONTROL_DASHBOARD.md` · `PRD.md` · `control/FILE_OWNERSHIP.md` · `public/cr385-master-checklist.html` (M0-01…10, X-01/06/07/10/11/12/13/14/15, R-04, R-08, G4-10 ticked with evidence) · `memory/test_credentials.md` (OWNER_TGK alias populated — never paste into chat).

## 5. Next agent — do exactly this
1. Boot per the previous handover §0 (rows 1–13) + this file. Re-run Entry Verification for **Phase 1 lines only after** the owner says "Phase 0 smoke OK": `sed -n '10p;48p' components/pms/CancelBookingDialog.jsx` · `sed -n '12p;39p' components/pms/NoShowDialog.jsx` · `sed -n '21p;26p;468p' pages/pms/ChannelManagerPage.jsx` · `sed -n '24,33p' api/services/restaurantSettingsService.js`.
2. If the owner reports Phase 0 smoke failures → fix → re-run cr385 tests + testing_agent → re-smoke Phase 0. No Phase 1 until the sentence.
3. Phase 1 wiring points already prepared: Arrivals `PhaseButton` kebab (`fd-row-<id>-kebab`) and `RowExpansionStub` slot; `navigateTo({tab, chip, rowId, kind})` receives `kind: nsOrCancel(row)` from alerts.

## 6. Owner smoke script — Phase 0 (≈10 min, read-only; phased plan §0.5)
See the chat message of 2026-09-21 (identical to plan §0.5). Say **"Phase 0 smoke OK"** or list what is wrong.
