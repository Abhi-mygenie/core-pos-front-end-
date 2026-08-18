# BUG-261 — Missing Preset Pills in P&L + Consumption Reports

**ID:** BUG-261
**Type:** BUG
**Severity:** P1
**Risk:** MEDIUM
**Source:** OWNER-REPORTED (2026-07-27)
**Duplicate Check:** DISTINCT
**Related:** BUG-258 (P&L calendar), CR-094 (P&L), CR-093 (Consumption)

## Description
P&L and Consumption reports lack the `[Today, 7D, 30D, MTD]` preset pill bar that all other Insights reports have (ExpenseReport, DailySales, Settlement, etc.). Consistency is broken.

## Evidence
- `PLReportPage.jsx`: NO preset pills — just raw date inputs + Apply
- `ConsumptionReportPage.jsx`: NO preset pills — just raw date inputs + Apply
- `ExpenseReportPage.jsx` line 319-322: HAS `[Today, 7D, 30D, MTD]` pills ✅
- `DailySalesMockup.jsx` line 226-227: HAS pills ✅
- `SettlementReportMockup.jsx` line 378-380: HAS pills ✅

## Owner Ruling
Standard pattern: `[Today, 7D, 30D, MTD]` — no 14D needed.

## Blast Radius
- 2 files (`PLReportPage.jsx`, `ConsumptionReportPage.jsx`), ~50 lines each
- Scope: MEDIUM

## Root Cause
CR-093 and CR-094 were implemented without adopting the established preset pill pattern.

## Fix Recommendation
Add preset pill bar to both reports following ExpenseReportPage pattern. Default = 7D. Needs planning (UI layout work).

## Next
Planning Gate 2
