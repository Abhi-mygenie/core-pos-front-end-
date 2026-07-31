# BUG-258 — P&L Report Calendar Broken / Different UI

**ID:** BUG-258
**Type:** BUG
**Severity:** P1
**Risk:** MEDIUM
**Source:** OWNER-REPORTED (2026-07-27)
**Duplicate Check:** DISTINCT (CR-094 registered as IMPLEMENTED but doesn't cover calendar UX)
**Related:** CR-094 (P&L Report implementation)

## Description
P&L Report (`PLReportPage.jsx`) uses raw `<Input type="date">` (native browser picker) instead of the established date-range pattern used by ExpenseReport, DailySales, Settlement, etc. Calendar UI looks different from all other reports. No `max` attribute — allows future dates. No preset pills.

## Evidence
- Screenshot: Owner-provided (P&L date bar with plain date inputs + orange Apply button)
- Code: `PLReportPage.jsx` lines 150-158 — raw `<Input type="date">` with no `max`, no presets
- Comparison: `ExpenseReportPage.jsx` lines 312-322 — CalendarIcon + From/To with `max={fmtISO(today)}` + preset bar

## Steps to Reproduce
1. Login → Navigate to P&L Report
2. Observe date picker UI — plain native browser picker, not matching other reports
3. Try selecting a future date — allowed (should be blocked)

## Blast Radius
- ~1 file (`PLReportPage.jsx`), ~60 lines to rewrite date bar
- Hotspot: NO
- Scope: SMALL

## Root Cause
PLReportPage (CR-094) was built without following the established date-range pattern.

## Fix Recommendation
Rewrite P&L header date bar to match ExpenseReportPage pattern: CalendarIcon + From/To with `max`, Apply button, preset pill bar `[Today, 7D, 30D, MTD]` with default 7D.

## Open Questions
None — owner confirmed preset pattern `[Today, 7D, 30D, MTD]`.

## Next
Planning Gate 2
