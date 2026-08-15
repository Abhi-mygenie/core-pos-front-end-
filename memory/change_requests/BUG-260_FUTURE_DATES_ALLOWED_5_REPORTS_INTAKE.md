# BUG-260 — Future Dates Allowed in 5 Report Calendars

**ID:** BUG-260
**Type:** BUG
**Severity:** P1
**Risk:** LOW
**Source:** OWNER-REPORTED (2026-07-27)
**Duplicate Check:** DISTINCT
**Related:** BUG-258 (P&L calendar)

## Description
5 reports allow selecting future dates in their calendar date inputs. All other 28 reports correctly block future dates with `max={fmtISO(today)}`.

## Evidence
- Code sweep (all reports scanned):

| File | Has `max`? | Status |
|------|:-:|--------|
| PLReportPage.jsx | NO | BUG |
| ConsumptionReportPage.jsx | NO | BUG |
| EdgeStatesMockup.jsx | NO | BUG |
| ItemSalesHybridMockup.jsx | NO | BUG |
| DashboardMockup.jsx | NO | BUG |
| 28 other reports | YES | CORRECT |

## Steps to Reproduce
1. Navigate to any of the 5 affected reports
2. Click date input → select a future date (e.g., next month)
3. Date is accepted — should be blocked

## Blast Radius
- 5 files, ~2 lines each (add `max` to From + To inputs)
- Scope: SMALL

## Root Cause
These 5 reports were built without the `max` restriction on `<input type="date">`.

## Fix Recommendation
Add `max={today}` (or equivalent) to all date inputs in the 5 affected files. Planning skip eligible (LOW risk, mechanical fix).

## Next
Planning Gate 2 (or FAST LANE if owner approves)
