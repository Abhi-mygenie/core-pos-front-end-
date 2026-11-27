# BUG-697: Audit Report — active preset highlight ("7D") does not match the applied/shared range on first load

**ID:** BUG-697
**Type:** BUG
**Area:** Reports / Analytics
**Priority:** P3
**Risk:** LOW (cosmetic/UX — wrong preset highlighted)
**Severity:** P3 — LOW
**QA Severity:** MINOR
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Source:** QA-FOUND (CR-528/CR-546 QA, 2026-11-18)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
On first load of the Audit Report, the `7D` preset is highlighted, but the applied range is actually the shared range (e.g. Today 2026-11-18 → 2026-11-18). The highlighted chip does not reflect the real applied range.

## Root Cause
`frontend/src/pages/reports-module/AuditLogMockup.jsx` — `activePreset` is initialised to a hard-coded `'7D'` (~L171) instead of being derived from `sharedFrom`/`sharedTo` / the applied range.

## Evidence
- `test_reports/iteration_1.json` → frontend_issues.ui_bugs (Date presets, LOW).
- QA report: `memory/test_reports/CR-528_CR-546_QA_REPORT_2026-11-18.md` (Minor observations).

## Proposed Fix (NOT YET APPROVED)
Initialise `activePreset` from the actual shared/applied range (or clear it when the range doesn't match a known preset).

## Duplicate Check
- No existing item. DISTINCT. RELATED: CR-528/CR-546 (same page).
