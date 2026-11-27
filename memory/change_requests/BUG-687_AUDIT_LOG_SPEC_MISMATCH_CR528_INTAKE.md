# BUG-687: Audit Log report doesn't match CR-528 spec (renders CR-546 design)

**ID:** BUG-687
**Type:** BUG
**Area:** Reports / Analytics
**Priority:** P2
**Risk:** MEDIUM (report layout / spec compliance, not financial)
**Severity:** P2 — MEDIUM (feature present but not to CR-528 spec)
**QA Severity:** MAJOR (functional/spec; was tracked as SPEC-CR528 in QA Nov Sprint)
**Client:** ALL
**Assignee:** Abhishek (FE; pending spec decision)
**Routing reason:** FE report page; needs owner spec reconciliation before any code
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
The Audit Log page renders the newer CR-546 design (4 KPI cards + 3 collapsible cards) instead of the CR-528 spec's 3 event *tabs*. "Leakage After Print" shows 11 events across 7 columns versus the spec's 10-column table.

## Classification
- **Bug / Spec mismatch** — implementation diverges from CR-528 handover spec
- **Source:** QA-FOUND (QA Nov Sprint, 2026-11-18)
- **Confidence:** CONFIRMED (observed in browser)

## Root Cause
Likely INTERACTION — CR-546 redesign of the Audit Log superseded/overrode the CR-528 layout. Needs spec reconciliation (CR-528 vs CR-546) before deciding whether this is a defect or the intended current design.

## Evidence
- Source: `memory/test_reports/QA_REPORT_NOV_SPRINT_2026_11_18.md` §Batch 5 (CR-528)
- Handover: `memory/handover/HANDOVER_QA_NOV_SPRINT_2026_11_18.md` §B (SPEC-CR528)
- File reference: `AuditLogMockup.jsx`.

## Blast Radius
- 1 report page (AuditLogMockup.jsx). Scope unknown until spec is reconciled.

## Proposed Fix (NOT YET APPROVED)
**Blocked on owner decision:** reconcile CR-528 spec vs CR-546 redesign. No code change until the target design is confirmed.

## Open Questions
- OD-687-01: Is the current CR-546 design the intended Audit Log, or must it match the original CR-528 3-tab / 10-column spec?

## Duplicate Check
- **CR-528:** RELATED — this is the QA finding against CR-528's implementation.
- **CR-546:** RELATED — the redesign that is currently rendering.
- **Verdict:** DISTINCT — registered as the trackable spec-mismatch defect.
