# BUG-435 — Front Desk (Beta) fires a duplicate snapshot fetch on ↻ — window focus listener + click both call refresh()

**ID:** BUG-435 · **Date:** 2026-09-21 · **Status:** INTAKE
**Source:** QA-FOUND — CR-385 Phase 0 QA (Role 4) `test_reports/QA_REPORT_2026_09_21_CR385_P0.md`
**Confidence:** CONFIRMED
**Duplicate check:** DISTINCT — RELATED to CR-385 (defect lives in CR-385 P0 code; no prior BUG/CR on this symptom — grep of BUG_TRACKER / CR_REGISTRY / registry.json 2026-09-21)
**Code reality:** code EXISTS (CR-385 M0 shipped 2026-09-21) — this is a defect/gap in it, not a feature to build
**Priority:** P2 (agent-classified by rubric — owner to confirm/override) · **Risk:** LOW · **Fast Lane eligible:** YES (owner approval needed)

## Description
`useFrontDeskSnapshot` registers `window.addEventListener('focus', refresh)`. Clicking ↻ (or a Retry button) after the window regained focus produces two full batches (LR + board + kpis ×2) within ~1 s. Harmless for correctness (identical data, last response wins) but doubles preprod load per refresh and opens a last-writer race if the first batch resolves later than the second. Expected: ignore focus-refresh within ~5 s of the last fetch and skip while `refreshing` is already true.

## Evidence
- Screenshot / logs: `memory/evidence/BUG-435/README.md` → `memory/evidence/CR-385/qa_2026_09_21_p0/`
- Steps to reproduce: 1) Open /pms/front-desk-v2 with DevTools Network filtered to "aiosell". 2) Click another window, come back, click ↻ once. 3) Six requests appear (two batches of three).
- Curl output: not applicable (frontend behaviour)
- Source: QA-FOUND · Confidence: CONFIRMED

## Blast radius
- Files: `frontend/src/pages/pms/FrontDeskWorkstationPage.jsx`
- Hotspot files touched: NO
- Estimated scope: SMALL

## Open questions
- Debounce window (5 s?) and whether focus-refresh should be kept at all in P1.
