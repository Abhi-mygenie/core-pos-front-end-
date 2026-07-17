# BUG-182 — Expense Report: Wrong Employee Name ("Added By") from Backend

**ID:** BUG-182
**Type:** BUG
**Created:** 2026-07-11
**Created by:** INTAKE AGENT (from INVESTIGATION session deep-dive)
**Sprint:** pos_5_0
**Status:** INTAKE — BACKEND-BLOCKED

---

## 1. Description
The "Added By" column in the Expense Report shows incorrect/random employee names. Deep investigation revealed the backend returns inconsistent `employee_name` values across endpoints for the same logged-in user:

| Endpoint | employee_id | employee_name |
|----------|-------------|---------------|
| GET /profile | 667 | Pranav Dogra (correct) |
| POST /store-expense-details (create) | 3063 | "Owner" |
| POST /expenses-export-report (read) | 3063 | "rowan" |
| User screenshot | ? | "Sharon teacher" |

Three different names for the same person. The profile ID (667) doesn't match the expense employee_id (3063).

## 2. Evidence
- **Source:** OWNER-REPORTED (screenshot showing "Sharon teacher") + INVESTIGATION deep curl-probe
- **Confidence:** HIGH — reproduced via curl for owner@cafe103.com on restaurant 644
- **FE code trace:** `ExpenseReportPage.jsx` line 410 renders `t.employeeName` directly from `employee_name` API field. FE does no transformation — just displays what backend returns.
- **Root cause is BACKEND** — employee_id assignment + name resolution is inconsistent.

## 3. Classification
| Field | Value |
|-------|-------|
| **Priority** | P1 (HIGH) — data integrity issue, incorrect attribution of who added expenses |
| **Risk** | N/A (backend fix required) |
| **Fast Lane eligible** | NO — backend-blocked |
| **Blocker** | BACKEND — employee_id→name mapping must be fixed server-side |

## 4. Blast Radius
- **FE:** Zero changes needed — FE correctly displays `t.employee_name` as-is.
- **Backend:** employee_id assignment in `POST /store-expense-details` + name resolution in `GET /expenses-report` and `POST /expenses-export-report`.

## 5. Duplicate Check
**DISTINCT**

## 6. Backend Brief
Filed at: `/app/memory/backend_briefs/BACKEND_BRIEF_EXPENSE_MODULE_2026_07_11_B.md` (Brief 1)

## 7. Related
- BUG-181 (Added By column missing) — once backend fixes names, the column will show correct data
- Investigation: `/app/memory/impact/EXPENSE_6_ISSUES_INVESTIGATION_2026_07_11.md` (Issue 6)
