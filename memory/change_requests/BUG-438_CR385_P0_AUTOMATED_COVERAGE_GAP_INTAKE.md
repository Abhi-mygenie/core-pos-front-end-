# BUG-438 — CR-385 P0 automated QA coverage gap — keyboard ↑↓/Enter/Esc, phone-suffix search (A6), Turns cross-check (A5), focus-refresh (A4) not asserted by any test

**ID:** BUG-438 · **Date:** 2026-09-21 · **Status:** INTAKE · **Phase 0.5** (fix before Phase 1 — owner hard rule 2026-09-21)
**Source:** QA-FOUND — CR-385 Phase 0 QA (Role 4) `test_reports/QA_REPORT_2026_09_21_CR385_P0.md`
**Confidence:** CONFIRMED
**Duplicate check:** DISTINCT — RELATED to CR-385 (defect lives in CR-385 P0 code; no prior BUG/CR on this symptom — grep of BUG_TRACKER / CR_REGISTRY / registry.json 2026-09-21)
**Code reality:** code EXISTS (CR-385 M0 shipped 2026-09-21) — this is a defect/gap in it, not a feature to build
**Priority:** P3 (agent-classified by rubric — owner to confirm/override) · **Risk:** LOW · **Fast Lane eligible:** YES (owner approval needed)

## Description
The runner (iteration_6) deferred these cases; they passed only via the implementation self-test (2026-09-21 09:08) and code review. No `*.cr385.test.js` covers `GuestTable.onKeyDown`, `GlobalSearch.searchSnapshot` phone suffix, `isTurn` on a live-shaped snapshot, or the focus-refresh path. Expected: add RTL tests for GuestTable keyboard + searchSnapshot phone suffix; add A4/A5/A6 to the P1 QA brief so the runner executes them.

## Evidence
- Screenshot / logs: `memory/evidence/BUG-438/README.md` → `memory/evidence/CR-385/qa_2026_09_21_p0/`
- Steps to reproduce: grep -rn "ArrowDown\|endsWith" frontend/src/components/pms/frontdesk/__tests__/ → 0 hits.
- Curl output: not applicable (frontend behaviour)
- Source: QA-FOUND · Confidence: CONFIRMED

## Blast radius
- Files: `frontend/src/components/pms/frontdesk/__tests__/`, `frontend/src/components/pms/frontdesk/GuestTable.jsx`, `frontend/src/components/pms/frontdesk/GlobalSearch.jsx`
- Hotspot files touched: NO
- Estimated scope: SMALL

## Open questions
- None — test debt; schedule with P1.
