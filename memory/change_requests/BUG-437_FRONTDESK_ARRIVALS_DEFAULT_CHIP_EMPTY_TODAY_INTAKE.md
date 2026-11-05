# BUG-437 — Arrivals tab lands on an empty "Today 0" table while "Late N" has rows — default chip UX gap

**ID:** BUG-437 · **Date:** 2026-09-21 · **Status:** INTAKE · **Phase 0.5** (fix before Phase 1 — owner hard rule 2026-09-21)
**Source:** QA-FOUND — CR-385 Phase 0 QA (Role 4) `test_reports/QA_REPORT_2026_09_21_CR385_P0.md`
**Confidence:** CONFIRMED
**Duplicate check:** DISTINCT — RELATED to CR-385, UXQ-385-01 (defect lives in CR-385 P0 code; no prior BUG/CR on this symptom — grep of BUG_TRACKER / CR_REGISTRY / registry.json 2026-09-21)
**Code reality:** code EXISTS (CR-385 M0 shipped 2026-09-21) — this is a defect/gap in it, not a feature to build
**Priority:** P2 (agent-classified by rubric — owner to confirm/override) · **Risk:** LOW · **Fast Lane eligible:** YES (owner approval needed)

## Description
`DEFAULT_CHIP.arrivals = 'today'` (mockup `S.chip`). On a day with 0 arrivals today and 10 late arrivals (sandbox 2026-09-21) the desk opens on "No today arrivals" with the red "Late 10" chip one click away. Same pattern for Departures ("Today"). Expected (proposal): open on Today when it has rows, otherwise on the first non-empty chip in display order (Late → Today → Tomorrow → Upcoming); or keep Today but render the late rows below a divider. Owner decision — UXQ-385-01 said "show ALL buckets, today first".

## Evidence
- Screenshot / logs: `memory/evidence/BUG-437/README.md` → `memory/evidence/CR-385/qa_2026_09_21_p0/`
- Steps to reproduce: Open /pms/front-desk-v2 on the sandbox → Arrivals shows "Today 0" active and an empty table (screenshot in evidence).
- Curl output: not applicable (frontend behaviour)
- Source: QA-FOUND · Confidence: CONFIRMED

## Blast radius
- Files: `frontend/src/pages/pms/FrontDeskWorkstationPage.jsx`, `frontend/src/components/pms/frontdesk/ArrivalsPanel.jsx`
- Hotspot files touched: NO
- Estimated scope: SMALL

## Open questions
- **RESOLVED (D70):** option (a) first non-empty chip.
- ~~Which behaviour: (a) first non-empty chip, (b) keep Today + show late rows under a divider, (c) keep as mockup?
