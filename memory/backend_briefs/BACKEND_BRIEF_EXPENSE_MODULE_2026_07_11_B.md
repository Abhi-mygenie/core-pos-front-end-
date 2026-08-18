# BACKEND_BRIEF — Expense Module (2 Items)

**Date:** 2026-07-11
**Restaurant:** CAFE 103 (id=644)
**Account:** owner@cafe103.com
**Filed by:** INVESTIGATION agent

---

## Brief 1: employee_name inconsistency across expense endpoints

**Classification:** BACKEND_DATA_ISSUE
**Priority:** P1 (data integrity — incorrect attribution)

**Problem:**
When owner@cafe103.com creates an expense, the employee name returned varies across endpoints:

| Endpoint | employee_id | employee_name |
|----------|-------------|---------------|
| GET /profile | 667 | Pranav Dogra |
| POST /store-expense-details (create) | 3063 | "Owner" |
| POST /expenses-export-report (read) | 3063 | "rowan" |
| User-reported screenshot | ? | "Sharon teacher" |

**Questions for backend:**
1. Profile returns vendor id=667, but expense creation assigns employee_id=3063. Why the mismatch?
2. Same employee_id=3063 resolves to "Owner" on create but "rowan" on export-report read. Which name mapping table is used?
3. Can employee_name be standardized across all expense endpoints to use the same resolution as profile (f_name + l_name)?

**Endpoints:**
- POST /api/v2/vendoremployee/expense/store-expense-details
- GET /api/v2/vendoremployee/expense/expenses-report
- POST /api/v2/vendoremployee/expense/expenses-export-report

---

## Brief 2: PUT /edit-expense should reject item name changes

**Classification:** CONTRACT_MISMATCH
**Priority:** P2

**Problem:**
`PUT /api/v2/vendoremployee/expense/edit-expense/{id}` accepts `exp_name` in the payload, allowing the expense item name to be changed after creation. Owner directive: item name should be immutable after creation.

**Request:**
Either (a) ignore `exp_name` field in PUT payload, or (b) return 422 if `exp_name` differs from stored value.

**Frontend impact:**
FE will stop sending `exp_name` in edit payload and render item name as read-only text. Backend protection still recommended as a safety net.
