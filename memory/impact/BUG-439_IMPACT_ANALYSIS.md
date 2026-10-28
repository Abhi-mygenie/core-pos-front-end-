# BUG-439 — Impact Analysis (Gate 2)

**ID:** BUG-439 · **Date:** 2026-09-21 · **Planning agent (Role 2), owner-requested "impact analysis and planning"**
**Title:** CR-385 Front Desk (Beta) — duplicate `data-testid` for row action buttons while a guest row is expanded
**Risk:** **LOW** — non-financial UI test-id naming; no data flow, no API, no hotspot (R5) file, no money/date logic (R6). Fast Lane eligible.
**Code Reality:** **FULL (defect)** — the defect lives in shipped CR-385 Phase 0 code (`GuestTable.jsx` `RowExpansionStub` + the three guest panels). Nothing of the fix exists yet → plan the fix (this is a bug, not a feature; CLOSURE Phase B not applicable).
**Conflict Pre-Check:** see §2 — **CONFLICT with CR-385 Phase 1 on `ArrivalsPanel.jsx` L41–46** (M2 will wire the kebab there). Execution order: **BUG-439 BEFORE Phase 1 GO** (or folded into the first Phase 1 batch — owner's call). Parallel-safe with everything else.

---

## 1 · Symptom → root cause (traced)

| Layer | File · line | What happens |
|---|---|---|
| Row cell | `GuestTable.jsx` L123 `commonColumns` → `{ key: 'actions', render: (r) => actions(r) }` | renders the panel's action factory once per row → `fd-row-<id>-checkin-btn`, `-kebab` (Arrivals) / `-bill-btn`, `-hk-btn`, `-extend-btn` (Departures, In-House) |
| Expansion drawer | `GuestTable.jsx` L156–176 `RowExpansionStub` → L176 `<div className="mt-3 flex justify-end">{actions}</div>` | renders the **same element** again for the expanded row |
| Callers | `ArrivalsPanel.jsx` L47–50 (`actions` into `commonColumns`) **and** L57 `actions={actions(row)}` · `DeparturesPanel.jsx` L31 + L35 `stayActions(row)` · `InHousePanel.jsx` L14 + L20 `stayActions(row)` | every panel passes the identical factory to both places |
| Result | DOM while row *n* is expanded | each `fd-row-<n>-<action>` id exists **twice** → violates the CR-385 frozen rule "unique data-testid" (X-10) and can make automation click the collapsed-row copy when it meant the drawer copy (or vice-versa) |

Not affected: Rooms tab (`RoomDetail` has its own ids), `fd-row-<id>-expansion` / `-detail` / `-close` / `-total` / `-paid` / `-due` (single-rendered), legacy PMS pages (own id families `arr-*`, `dep-*`, `inhse-*`, `rs-*`, `fd-checkin-btn-*` on the old FrontDeskPage — different prefix shape, no collision).

Why P0 QA missed it: X-10 "no duplicate data-testid" was executed with all rows collapsed (iteration_5/6, it.8 R12). Round-2 REG-1 expanded a row first (`/app/test_reports/iteration_9.json`).

## 2 · Conflict Pre-Check

| File | Last modifier (FILE_OWNERSHIP) | Open items touching it (registry.json) | Verdict |
|---|---|---|---|
| `components/pms/frontdesk/ArrivalsPanel.jsx` | CR-385 P0.5 BUG-437 (2026-09-21) | CR-385 (open; Phase 1 M2 wires the **kebab** → edits L41–46 `actions`) | **CONFLICT** — same lines. Order: BUG-439 first, or fold into the first P1 batch |
| `components/pms/frontdesk/DeparturesPanel.jsx` | CR-385 P0.5 BUG-437 (2026-09-21) | CR-385 (Phase 3/4 wire Bill/HK/Extend — later) | parallel-safe now |
| `components/pms/frontdesk/InHousePanel.jsx` | CR-385 M0 P0 (2026-09-21) | CR-385 (Phase 3+) | parallel-safe now |
| `components/pms/frontdesk/GuestTable.jsx` | CR-385 M0 P0 (2026-09-21) | CR-385 (M1/M2 replace `RowExpansionStub`) | **not touched by the recommended option** |
| Hotspots (R5) | — | — | none touched |

## 3 · Options (owner decision — Rule R3: not guessing the design intent)

| Option | Change | Visual change | Files | Notes |
|---|---|---|---|---|
| **A — suffix the drawer copy (RECOMMENDED)** | action factories take `variant` (`''` for the row cell, `'exp-'` for the drawer) → drawer ids become `fd-row-<id>-exp-checkin-btn`, `-exp-kebab`, `-exp-bill-btn`, `-exp-hk-btn`, `-exp-extend-btn` | **none** | 3 panels (~8 lines) + 1 new test | row-level ids unchanged → no QA doc / brief breaks; pure hygiene; Fast Lane-safe |
| B — drop the action row from the P0 drawer | remove `{actions}` from `RowExpansionStub` (and the `actions` prop at the 3 call sites) | **yes** — drawer footer disappears (row buttons remain) | `GuestTable.jsx` + 3 panels | matches the mockup, where the expansion *is* the action (D1: "Row button opens the expansion"); the footer was a P0 stand-in that M1/M5 replace anyway. Changes what the owner smoke shows → needs owner OK |
| C — render actions only in one place depending on expanded state | hide the row-cell buttons when that row is expanded | yes (buttons move) | `GuestTable.jsx` | more logic for a stand-in; not recommended |

Downstream consumers of the ids: `GuestTable.cr385.test.jsx` / `phase05.cr385.test.jsx` (do not reference action ids) · QA handovers/briefs reference row-level ids only · mockup HTML uses its own ids. **Option A breaks nothing.**

## 4 · Risk register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | Phase 1 (M2) edits the same `actions` block and re-introduces a duplicate | medium | X-10 rule now = collapsed **and** expanded (D72); the new RTL test fails on any duplicate |
| R2 | Renaming a row-level id by mistake breaks QA briefs | low | Option A keeps row ids byte-identical (`variant=''` default); test asserts `fd-row-15-checkin-btn` count === 1 |
| R3 | Touching `GuestTable.jsx` (shared by 3 tabs) | n/a in A | Option A does not touch it |

## 5 · Owner decisions — RESOLVED 2026-09-21: **Option A locked (D73)**, Bug Fix before Phase 1 GO
1. **Option A (ids only, no visual change) vs Option B (remove the drawer action footer)?** Recommendation: A.
2. **Route/timing:** Fast Lane Bug Fix now (before Phase 1 GO) vs fold into the first Phase 1 batch. Recommendation: Fast Lane now — it is a frozen-rule violation the owner smoke and Phase 1 QA would otherwise carry.

Impact Analysis complete for 1 item. Awaiting owner review → Gate 3 plan is drafted alongside (`plans/BUG-439_IMPLEMENTATION_PLAN.md`) on Option A; it will be re-cut if the owner picks B.
