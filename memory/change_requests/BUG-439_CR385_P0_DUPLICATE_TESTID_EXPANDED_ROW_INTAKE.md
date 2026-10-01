# BUG-439 — CR-385 P0 duplicate `data-testid` when a guest row is expanded — row actions re-rendered inside `RowExpansionStub` with the same ids

**ID:** BUG-439 · **Date:** 2026-09-21 · **Status:** PLANNED — LOCKED Option A (D73, 2026-09-21) · Bug Fix before Phase 1 GO · awaiting Gate 4 GO · found in P0.5 re-test round 2; Gate 5B (P0+P0.5) closed with it registered (D72)
**Source:** QA-FOUND — CR-385 Phase 0.5 QA re-test round 2 (Role 4) `/app/test_reports/iteration_9.json` REG-1_no_duplicate_data_testids
**Confidence:** CONFIRMED (code read: `ArrivalsPanel.jsx` L47–57, `DeparturesPanel.jsx` L35, `InHousePanel.jsx` L20 pass `actions(row)` both to `commonColumns` (row cell) and to `RowExpansionStub` (`GuestTable.jsx` L156–176) → every `fd-row-<id>-*-btn` / `-kebab` appears twice while that row is expanded)
**Duplicate check:** DISTINCT — RELATED to CR-385 (grep BUG_TRACKER / CR_REGISTRY / registry.json 2026-09-21: no prior item). Not introduced by P0.5 (BUG-434…438 did not touch these lines); missed by P0 QA because the X-10 duplicate-testid check ran with all rows collapsed.
**Code reality:** code EXISTS (CR-385 M0 shipped 2026-09-21) — defect in it
**QA severity:** MINOR (test-id hygiene; no functional or visual impact; violates the "unique data-testid" frozen rule and can make Phase 1+ automation click the wrong button) · **Priority:** P3 (rubric — owner to confirm) · **Risk:** LOW · **Fast Lane eligible:** YES

## Description
With an Arrivals row expanded, `fd-row-17-checkin-btn` and `fd-row-17-kebab` exist twice in the DOM (collapsed row action cell + expansion drawer). Same pattern for Departures / In-House (`-bill-btn`, `-hk-btn`, `-extend-btn`). Expected: every `data-testid` unique — e.g. expansion copies suffixed (`fd-row-<id>-exp-checkin-btn`) or the expansion stub reusing the row cell without re-rendering actions.

## Evidence
- `/app/test_reports/iteration_9.json` → `REG-1_no_duplicate_data_testids: FAIL (MINOR)`; Rooms tab + RoomDetail open: 0 duplicates.
- Repro: /pms/front-desk-v2 → Arrivals → click a row → `document.querySelectorAll('[data-testid="fd-row-17-checkin-btn"]').length === 2`.
- Screenshot: `evidence/CR-385/qa_2026_09_21_p0_5/round2_*.jpg` (runner) · this folder README.

## Blast radius
- Files: `frontend/src/components/pms/frontdesk/GuestTable.jsx` (RowExpansionStub) **or** `ArrivalsPanel.jsx` / `DeparturesPanel.jsx` / `InHousePanel.jsx` (actions factory with a suffix) — `GuestTable.jsx` and `InHousePanel.jsx` are OUTSIDE the P0.5 §4.3 file list → Bug Fix needs owner scope approval.
- Hotspot files touched: NO · Estimated scope: MEDIUM (3–4 files, ~8 lines) · Tests: extend `GuestTable.cr385.test.jsx` (no duplicate testids with an expansion open).

## Open questions
- Route (owner decides): **Intake recommendation = Fast Lane Bug Fix** — risk LOW, no hotspots, non-financial UI, ~8 lines in 3–4 files (suffix the expansion copy of the action testids, e.g. `fd-row-<id>-exp-checkin-btn`, or pass a `variant` to the actions factory), test = extend `GuestTable.cr385.test.jsx` (no duplicate testids with an expansion open) + QA X-10 with a row expanded. **Planning (Gates 2–3) only if** the owner prefers batching it into Phase 1 where M1/M2 replace `RowExpansionStub` (then it becomes a Phase 1 entry item). Not a Phase 0.5 reopen (owner).
