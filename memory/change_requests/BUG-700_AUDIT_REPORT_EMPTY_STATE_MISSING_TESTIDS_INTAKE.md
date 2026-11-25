# BUG-700: Audit Report — empty-state RiskBar and DrillDownTable lack their data-testids

**ID:** BUG-700
**Type:** BUG
**Area:** Reports / Analytics
**Priority:** P3
**Risk:** LOW (testability only; no user-facing break)
**Severity:** P3 — LOW
**QA Severity:** MINOR
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Source:** QA-FOUND (CR-528/CR-546 QA, 2026-11-18)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
When there are 0 events, the empty-state renderings lose their testids: `RiskBar` returns "No high-risk cancellations" without `data-testid="audit-card1-risk-bar"`, and `DrillDownTable` returns "No events" without its table testid (e.g. `audit-card3-table`). Automated QA cannot locate these regions in the empty state.

## Root Cause
`frontend/src/pages/reports-module/AuditLogMockup.jsx` — `RiskBar` early-return (~L93) and `DrillDownTable` early-return (~L123) render plain text without the wrapper `data-testid`.

## Evidence
- `test_reports/iteration_1.json` → frontend_issues.design_issues (empty state).
- QA report: `memory/test_reports/CR-528_CR-546_QA_REPORT_2026-11-18.md` (Minor observations).

## Proposed Fix (NOT YET APPROVED)
Add the respective `data-testid` to the empty-state wrappers of `RiskBar` and `DrillDownTable`.

## Duplicate Check
- No existing item. DISTINCT. RELATED: CR-528/CR-546 (same page).
