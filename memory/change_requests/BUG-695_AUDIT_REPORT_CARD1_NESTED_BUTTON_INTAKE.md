# BUG-695: Audit Report Card 1 — nested `<button>` (link inside toggle) causes invalid HTML + console error

**ID:** BUG-695
**Type:** BUG
**Area:** Reports / Analytics
**Priority:** P3
**Risk:** LOW (DOM validity / console noise; no functional break observed)
**Severity:** P3 — LOW
**QA Severity:** MINOR
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Source:** QA-FOUND (CR-528/CR-546 QA, 2026-11-18)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
On the Audit Report (`/reports-module/audit-log`), React logs `<button> cannot be a descendant of <button>` on every load. The "Cancellation Report" link button (`audit-card1-link`) is rendered inside the Card 1 header toggle button (`audit-card1-toggle`).

## Root Cause
`frontend/src/pages/reports-module/AuditLogMockup.jsx` — Card 1 header: the outer toggle is a `<button data-testid="audit-card1-toggle">` (~L347) and the inner `<button data-testid="audit-card1-link">` (~L362) is nested inside it. Invalid HTML.

## Evidence
- `test_reports/iteration_1.json` → frontend_issues.ui_bugs (MEDIUM).
- QA report: `memory/test_reports/CR-528_CR-546_QA_REPORT_2026-11-18.md`.

## Proposed Fix (NOT YET APPROVED)
Make the outer toggle a `div role="button"`, or move the link outside the toggle button.

## Duplicate Check
- RELATED: CR-543 (Card 1 High Risk Cancellations introduced this header). DISTINCT defect.
