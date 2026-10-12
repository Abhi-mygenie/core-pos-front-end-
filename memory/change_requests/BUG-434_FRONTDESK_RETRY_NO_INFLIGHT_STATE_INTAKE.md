# BUG-434 — Front Desk (Beta) Retry buttons give no in-flight feedback — error panel stays static during the 2–3 s re-fetch

**ID:** BUG-434 · **Date:** 2026-09-21 · **Status:** INTAKE · **Phase 0.5** (fix before Phase 1 — owner hard rule 2026-09-21)
**Source:** QA-FOUND — CR-385 Phase 0 QA (Role 4) `test_reports/QA_REPORT_2026_09_21_CR385_P0.md`
**Confidence:** CONFIRMED
**Duplicate check:** DISTINCT — RELATED to CR-385 (defect lives in CR-385 P0 code; no prior BUG/CR on this symptom — grep of BUG_TRACKER / CR_REGISTRY / registry.json 2026-09-21)
**Code reality:** code EXISTS (CR-385 M0 shipped 2026-09-21) — this is a defect/gap in it, not a feature to build
**Priority:** P2 (agent-classified by rubric — owner to confirm/override) · **Risk:** LOW · **Fast Lane eligible:** YES (owner approval needed)

## Description
After a failed load, `fd-retry-btn` (page error) and `fd-rooms-retry-btn` (Rooms panel) call `refresh()` correctly, but neither the button nor the panel shows a busy state — the red error card stays unchanged until the snapshot arrives (1.8 s LR / 3.3 s board on preprod). Users double-click and the automated runner recorded a false "does not recover" MAJOR. Expected: button disabled + spinner + "Retrying…" text while `refreshing` is true, mirroring the header ↻ pill.

## Evidence
- Screenshot / logs: `memory/evidence/BUG-434/README.md` → `memory/evidence/CR-385/qa_2026_09_21_p0/`
- Steps to reproduce: 1) Open /pms/front-desk-v2. 2) DevTools → block */local-reservations* → click ↻ → red "Reservations could not be loaded". 3) Unblock → click Retry → nothing changes for ~2 s, then the page pops in.
- Curl output: not applicable (frontend behaviour)
- Source: QA-FOUND · Confidence: CONFIRMED

## Blast radius
- Files: `frontend/src/pages/pms/FrontDeskWorkstationPage.jsx`, `frontend/src/components/pms/frontdesk/RoomsPanel.jsx`
- Hotspot files touched: NO
- Estimated scope: SMALL

## Open questions
- Fix in P1 (same files are edited for P1 anyway) or as a stand-alone Fast Lane (LOW risk)?
