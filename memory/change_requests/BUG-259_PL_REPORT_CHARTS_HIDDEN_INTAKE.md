# BUG-259 — P&L Report Charts Hidden When ≤1 Data Point

**ID:** BUG-259
**Type:** BUG
**Severity:** P2
**Risk:** LOW
**Source:** OWNER-REPORTED (2026-07-27)
**Duplicate Check:** DISTINCT
**Related:** CR-094 (P&L Report), BUG-258

## Description
P&L Report charts (BarChart + PieChart) are coded but hidden behind condition `chartData.length > 1`. If API returns only 1 day of data, no charts render. Other reports (ExpenseReport) always render charts even with 1 data point.

## Evidence
- Code: `PLReportPage.jsx` line 182: `{chartData.length > 1 && (`
- Comparison: ExpenseReport chart section renders regardless of data count

## Steps to Reproduce
1. Login → P&L Report
2. Select a single-day date range (e.g., today to today)
3. Charts section completely hidden — only KPI strip + table visible

## Blast Radius
- 1 file (`PLReportPage.jsx`), 1 line change
- Scope: SMALL

## Root Cause
Conditional `chartData.length > 1` too strict — should be `>= 1`.

## Fix Recommendation
Change line 182: `chartData.length > 1` → `chartData.length >= 1`. Planning skip eligible (1 line, LOW risk).

## Next
Planning Gate 2 (or FAST LANE if owner approves)
