# BUG-699: Audit Report — stale data remains under the error shield after a timeout

**ID:** BUG-699
**Type:** BUG
**Area:** Reports / Analytics
**Priority:** P3
**Risk:** LOW (potentially misleading, no data corruption)
**Severity:** P3 — LOW
**QA Severity:** MINOR
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Source:** QA-FOUND (CR-528/CR-546 QA, 2026-11-18)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
After a request timeout (e.g. selecting 30D/FY — see BUG-696), the error banner appears but the previous range's KPI/card data (zeros) stays visible underneath, while the date inputs already show the new range. This can mislead the user into reading stale numbers as current.

## Root Cause
`frontend/src/pages/reports-module/AuditLogMockup.jsx` — on fetch error (`fetchData` catch, ~L202), `rawData`/`analytics` from the previous successful range is not cleared, and `ReportLoadingShield` renders the error over the retained content.

## Evidence
- `test_reports/iteration_1.json` → frontend_issues.ui_bugs (Error shield, LOW).
- QA report: `memory/test_reports/CR-528_CR-546_QA_REPORT_2026-11-18.md` (Minor observations).

## Proposed Fix (NOT YET APPROVED)
On error, either clear stale `rawData` or clearly mark the displayed data as belonging to the previously loaded range.

## Duplicate Check
- RELATED: BUG-696 (the timeout that surfaces this). DISTINCT (this is the stale-display behaviour).
