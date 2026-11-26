# BUG-353 — OrderReportBetaPage: Date Range Capped at 1 Month

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (INVESTIGATION_REPORT_BATCH_2026_08_26.md, Issue 4a)
**Sprint:** POS 5.1 backlog

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | P2 |
| Risk | MEDIUM |
| Side | Backend (FE has no limit) |
| Root cause | BACKEND_ASK |
| Duplicate check | DISTINCT |
| Code reality | NONE (no FE date-limit code found) |
| Blast radius | SMALL (backend endpoint change) |
| Fast Lane eligible | NO (backend-blocked) |

## Description

The Beta Order Report (`/reports-module/order-report-beta`) cannot fetch data for date ranges exceeding 1 month. The frontend has no date-limit enforcement — the cap is enforced server-side on the `ORDER_REPORT_BETA_COMBINED` endpoint.

## Investigation Findings

- No FE date range limit found in `OrderReportBetaPage.jsx`
- Hypothesis: backend enforces a 1-month cap on that endpoint
- Status: BACKEND_ASK — needs backend team confirmation

## Backend Action Required

Confirm whether `ORDER_REPORT_BETA_COMBINED` enforces a date cap:
- If YES: extend or paginate server-side
- If NO: investigate what else prevents multi-month queries

## Evidence

- File: `src/pages/reports-module/OrderReportBetaPage.jsx`
- Steps: Set date range > 31 days on Beta Report → empty or partial results
- Confidence: MEDIUM (no FE code found, hypothesis only)

## Owner Decisions Needed

OD-1: Should the Beta Report support multi-month ranges? If yes, confirm with backend team.
