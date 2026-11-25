# BUG-698: Audit Report — FY preset does not share range and returns previous completed FY

**ID:** BUG-698
**Type:** BUG
**Area:** Reports / Analytics
**Priority:** P3
**Risk:** LOW (range not synced across Insights pages; possible wrong FY)
**Severity:** P3 — LOW
**QA Severity:** MINOR
**Client:** ALL
**Assignee:** Abhishek (FE, not backend-blocked)
**Source:** QA-FOUND (CR-528/CR-546 QA, 2026-11-18)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
Two issues on the FY preset of the Audit Report:
1. `handlePreset('FY')` does NOT call `setSharedFrom`/`setSharedTo` (unlike the other presets), so the FY range is not shared across Insights pages.
2. `computePresetRange('FY')` returns the previous completed FY (2025-04-01 → 2026-03-31 in Nov 2026), not the current FY. **Confirm intended.**

## Root Cause
`frontend/src/pages/reports-module/AuditLogMockup.jsx` — FY branch of `handlePreset` (~L192) sets local + applied dates but omits the shared setters; FY window comes from `computePresetRange('FY')` (datePresets util).

## Evidence
- `test_reports/iteration_1.json` → frontend_issues.ui_bugs (FY preset, LOW).
- QA report: `memory/test_reports/CR-528_CR-546_QA_REPORT_2026-11-18.md` (Minor observations).

## Open Questions
- OD-698-01: Should FY mean the current FY (in progress) or the previous completed FY? (QA observed previous FY.)

## Proposed Fix (NOT YET APPROVED)
Add `setSharedFrom`/`setSharedTo` to the FY branch for parity with other presets; confirm FY definition with owner before changing `computePresetRange`.

## Duplicate Check
- No existing item. DISTINCT. RELATED: CR-528/CR-546 (same page).
