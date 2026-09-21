# BUG-439 — Implementation Plan (Gate 3) — Option A (suffix the drawer copy of the row actions)

**ID:** BUG-439 · **Date:** 2026-09-21 · **Risk:** LOW · **Fast Lane eligible** (owner approval) · **Gate 4 GO required before coding**
**Impact Analysis:** `memory/impact/BUG-439_IMPACT_ANALYSIS.md` (Option A recommended; re-cut this plan if the owner picks Option B)
**Execution order:** BEFORE CR-385 Phase 1 GO (conflict on `ArrivalsPanel.jsx` L41–46), or as the first edit of the first Phase 1 batch.
**Marker:** `// BUG-439` on every edited line.

---

## Scope lock

**Files WILL change (3 + 1 test):**
1. `frontend/src/components/pms/frontdesk/ArrivalsPanel.jsx` (L41–46, L57)
2. `frontend/src/components/pms/frontdesk/DeparturesPanel.jsx` (L7–12, L35)
3. `frontend/src/components/pms/frontdesk/InHousePanel.jsx` (L20)
4. `frontend/src/components/pms/frontdesk/__tests__/bug439.cr385.test.jsx` (NEW)

**Files will NOT touch:** `GuestTable.jsx` (`commonColumns` L123 keeps calling `actions(r)` → row ids unchanged; `RowExpansionStub` unchanged) · `FrontDeskWorkstationPage.jsx` · `RoomsPanel.jsx` / `RoomDetail.jsx` · transforms / services · hotspots (R5) · legacy PMS pages · `public/cr385-frontdesk-mockup.html` · `.env`.

## Edit 1 — `ArrivalsPanel.jsx`

Current L41–46:
```jsx
  const actions = (r) => (
    <>
      <PhaseButton testId={`fd-row-${r.id}-checkin-btn`} label="Check In" phase={2} />
      <PhaseButton testId={`fd-row-${r.id}-kebab`} label="⋮" phase={1} />
    </>
  );
```
New:
```jsx
  const actions = (r, variant = '') => ( // BUG-439 variant '' = row cell, 'exp-' = expansion drawer (unique testids)
    <>
      <PhaseButton testId={`fd-row-${r.id}-${variant}checkin-btn`} label="Check In" phase={2} /> {/* BUG-439 */}
      <PhaseButton testId={`fd-row-${r.id}-${variant}kebab`} label="⋮" phase={1} /> {/* BUG-439 */}
    </>
  );
```
Current L57 `… actions={actions(row)} />} />` → New `… actions={actions(row, 'exp-')} />} /> // BUG-439`
(`commonColumns` L47–50 still receives `actions` → called as `actions(r)` → `variant=''` → row ids byte-identical.)

## Edit 2 — `DeparturesPanel.jsx`

Current L7–12 `export const stayActions = (r) => ( … fd-row-${r.id}-bill-btn / -hk-btn / -extend-btn … )`
New: `export const stayActions = (r, variant = '') => (` and `fd-row-${r.id}-${variant}bill-btn`, `-${variant}hk-btn`, `-${variant}extend-btn` (marker on each of the 4 lines).
Current L35 `actions={stayActions(row)}` → New `actions={stayActions(row, 'exp-')}` `// BUG-439`

## Edit 3 — `InHousePanel.jsx`

Current L20 `actions={stayActions(row)}` → New `actions={stayActions(row, 'exp-')}` `// BUG-439`
(L14 `commonColumns({ …, actions: stayActions, … })` unchanged → row ids unchanged.)

## Edit 4 — NEW `__tests__/bug439.cr385.test.jsx`

Render each panel on the real fixture (`local_reservations_view_all.json` via `fromFrontDeskSnapshot`, pattern of `phase05.cr385.test.jsx`) with `expandedId` = first visible row:
- collect `document.querySelectorAll('[data-testid]')` → **no duplicate values** (Arrivals `chip={null}`, Departures `chip={null}`, In-House `chip="all"`);
- `fd-row-<id>-checkin-btn` count === 1 **and** `fd-row-<id>-exp-checkin-btn` present (Arrivals); `-bill-btn` / `-exp-bill-btn` (Departures, In-House);
- collapsed (`expandedId={null}`) → no `-exp-` ids at all;
- both copies are `disabled` with `title="Available in Phase N"` (phase gating unchanged).

## Verification matrix (seeds the QA handover)

| Edit # | File | Change | How to verify | Automated? |
|---|---|---|---|:---:|
| 1 | ArrivalsPanel.jsx L41–46, L57 | `variant` suffix on drawer copy | `bug439.cr385.test.jsx` (Arrivals block) | YES |
| 2 | DeparturesPanel.jsx L7–12, L35 | same for `stayActions` | `bug439.cr385.test.jsx` (Departures block) | YES |
| 3 | InHousePanel.jsx L20 | drawer call passes `'exp-'` | `bug439.cr385.test.jsx` (In-House block) | YES |
| 4 | all | row-level ids unchanged | existing `GuestTable.cr385.test.jsx`, `phase05.cr385.test.jsx` still green (38/38 → 42+/42+) | YES |
| 5 | all | live: expand a row on each of the 3 guest tabs → `[...document.querySelectorAll('[data-testid]')].map(e=>e.dataset.testid)` has no duplicates; drawer buttons still greyed with the Phase tooltip; no visual change vs P0 screenshots | testing_agent 1920×800 (X-10 **expanded** rule, D72) | NO |
| 6 | guards | `grep -rn "BUG-439" frontend/src | wc -l` ≥ 9 · `yarn build` exit 0 · hotspots clean | shell | YES |

## Execution sequence
1. Entry check: lines above still match (`grep -n "const actions = (r)" ArrivalsPanel.jsx`, `grep -n "export const stayActions" DeparturesPanel.jsx`, `grep -n "stayActions(row)" InHousePanel.jsx DeparturesPanel.jsx`); `grep -rn "BUG-439" src` = 0.
2. Write the test first → run → **must FAIL** on duplicates (repro).
3. Edits 1–3 → test green → full cr385 suite green → `yarn build`.
4. Registry checklist (below) → QA handover (X-10 expanded on 3 tabs + smoke of row/drawer buttons) → QA → owner.

## Risk register
| # | Risk | Mitigation |
|---|---|---|
| R1 | Phase 1 M2 re-edits `actions` and drops the suffix | test 4 fails on any duplicate; X-10 rule (D72) in the Phase 1 QA brief |
| R2 | A brief/test references a drawer button by the old id | none found (grep `checkin-btn|kebab|bill-btn|hk-btn|extend-btn` in `src/**/__tests__`, `memory/handover`, `test_reports` → row-level only) |
| R3 | Visual regression | none — ids only; verify with one screenshot per tab |

## Post-code registry checklist (Implementation/Bug Fix agent MUST execute)
- [ ] `registry.json`: BUG-439 → `FIXED — awaiting QA`, `sprint_key: pos_pms_2`, `fixed_in`, `files_affected` = the 4 files above
- [ ] `BUG_TRACKER.md`: BUG-439 row → FIXED (date, files, marker, test)
- [ ] `FILE_OWNERSHIP.md`: BUG-439 section with the 4 files + lines
- [ ] Code markers: `// BUG-439` on every modified line (≥ 9)
- [ ] `frontend/public/cr385-master-checklist.html` X-10 evidence → "collapsed + expanded (BUG-439)"
- [ ] QA handover `handover/QA_HANDOVER_<date>_BUG439.md` (Registry synced: YES · EXIT GATE 5/5)

---
**Handover:** "Plan ready at `memory/plans/BUG-439_IMPLEMENTATION_PLAN.md`. 3 code edits across 3 files + 1 new test file. Code reality: FULL (defect in shipped P0 code; fix NONE). Scope: WILL change `ArrivalsPanel.jsx`, `DeparturesPanel.jsx`, `InHousePanel.jsx`, `__tests__/bug439.cr385.test.jsx` / will NOT touch `GuestTable.jsx`, page, Rooms, transforms, services, hotspots, legacy pages, mockup. Verification matrix: 6 checks (5 automated, 1 manual). Owner decisions needed: (1) Option A vs B, (2) Fast Lane now vs first Phase 1 batch. Awaiting Gate 4 GO."
