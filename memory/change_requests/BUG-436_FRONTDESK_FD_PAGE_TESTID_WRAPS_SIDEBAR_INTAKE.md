# BUG-436 — `data-testid="fd-page"` wraps the app Sidebar — "no Channel Manager on the Front Desk screen" assertions catch nav chrome

**ID:** BUG-436 · **Date:** 2026-09-21 · **Status:** INTAKE · **Phase 0.5** (fix before Phase 1 — owner hard rule 2026-09-21)
**Source:** QA-FOUND — CR-385 Phase 0 QA (Role 4) `test_reports/QA_REPORT_2026_09_21_CR385_P0.md`
**Confidence:** CONFIRMED
**Duplicate check:** DISTINCT — RELATED to CR-385 (defect lives in CR-385 P0 code; no prior BUG/CR on this symptom — grep of BUG_TRACKER / CR_REGISTRY / registry.json 2026-09-21)
**Code reality:** code EXISTS (CR-385 M0 shipped 2026-09-21) — this is a defect/gap in it, not a feature to build
**Priority:** P3 (agent-classified by rubric — owner to confirm/override) · **Risk:** LOW · **Fast Lane eligible:** YES (owner approval needed)

## Description
The outer `<div data-testid="fd-page">` contains `<Sidebar/>` plus `<main>`. The sidebar legitimately shows the "Channel Manager" nav item, so any automated check scoped to `fd-page` fails (runner iteration_6 MINOR) even though the workstation `<main>` has no such wording. Expected: move `fd-page` to `<main>` or add `data-testid="fd-workstation-body"` on `<main>` and update the QA brief / grep guard to that scope.

## Evidence
- Screenshot / logs: `memory/evidence/BUG-436/README.md` → `memory/evidence/CR-385/qa_2026_09_21_p0/`
- Steps to reproduce: document.querySelector('[data-testid=fd-page]').innerText.includes('Channel Manager') → true; …querySelector('[data-testid=fd-page] main').innerText… → false.
- Curl output: not applicable (frontend behaviour)
- Source: QA-FOUND · Confidence: CONFIRMED

## Blast radius
- Files: `frontend/src/pages/pms/FrontDeskWorkstationPage.jsx`
- Hotspot files touched: NO
- Estimated scope: SMALL

## Open questions
- None — testability only; fold into P1.
