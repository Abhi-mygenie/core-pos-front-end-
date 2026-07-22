# BUG-200 — Expense Report: Category Filter Returns 0 Results

**ID:** BUG-200
**Date:** 2026-07-16
**Source:** OWNER-REPORTED + AGENT-INVESTIGATED
**Classification:** BUG
**Severity:** P1 (report filter broken)
**Risk:** MEDIUM (read-only, no data mutation)
**Duplicate Check:** DISTINCT
**Sprint:** POS 5.0

---

## Summary

Selecting a category (e.g., "Staff Salary") from the filter dropdown in the Expense Report page returns 0 transactions, ₹0 total, 0 active days — even when expenses exist for that category in the date range.

## Root Cause

**Classification:** CONTRACT_MISMATCH (needs curl verification)
**Confidence:** MEDIUM

### Data Flow
```
UI: select "Staff Salary" → categoryFilter = c.id (numeric, e.g. 5)
Service: GET /expenses-report?from=...&to=...&category_id=5
Backend: returns 0 results
```

### Hypotheses (ordered by likelihood)

1. **Backend expects different param name** — e.g., `category` or `category_name` instead of `category_id`
2. **Backend expects category name, not ID** — e.g., `category_id=Staff Salary` instead of `category_id=5`
3. **Backend doesn't support category filtering at all** on this endpoint — the `category_id` param is ignored, and some other issue causes 0 results
4. **Category IDs from `/category-list` don't match IDs in report data** — different tables on backend

## Evidence

- Screenshot: owner provided — "Staff Salary" selected, all KPIs show 0
- Code trace: `ExpenseReportPage.jsx` L111: `categoryId: categoryFilter || null`
- Service: `expenseService.js` → `getExpenseReport()` sends `params.category_id = categoryId`
- Could not curl-verify (token expired during session)

## Blast Radius

- **Files:** 1-2 (`expenseReportService.js` or `ExpenseReportPage.jsx`)
- **Scope:** SMALL (~2 lines — param name change)
- **Hotspots:** NONE
- **Financial:** NO (read-only report)

## Fix (pending curl verification)

Once correct param name is confirmed via curl:
- Update `expenseService.js` `getExpenseReport()` — change `category_id` to correct param name

## Open Questions

- **OQ-1:** What query parameter does the backend `/expenses-report` endpoint accept for category filtering? (curl with fresh auth token needed)

## Next

Planning Gate 2 — requires curl verification before implementation
