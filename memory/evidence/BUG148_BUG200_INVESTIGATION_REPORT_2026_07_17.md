# Investigation Report — BUG-148 + BUG-200

**Date:** 2026-07-17
**Agent Role:** INVESTIGATION
**Steps Used:** 10/10
**Items:** BUG-148 (Table Management), BUG-200 (Expense Report Category Filter)

---

## BUG-148 — Table Management: Cannot Add New Table

### 1. Summary
Root cause: **CANNOT REPRODUCE — backend and FE code both work correctly.**
Classification: ENVIRONMENT / INTERMITTENT
Confidence: HIGH (curl-verified CRUD on preprod with cafe103 credentials)
Steps used: 4/10

### 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Backend rejects POST store-table | Curl: POST store-table with test payload | 1 | **ELIMINATED** — 200 OK "Table added successfully" | evidence/BUG-148/store_table_response.json |
| H2 | FE storeTable() sends wrong payload format | Code trace: tableTransform.js + tableService.js | 0 (code review) | **ELIMINATED** — payload matches curl format | L216-222: { title, table_no, vendorName, rtype } |
| H3 | Table created but not visible in list | Curl: GET table-config after store | 1 | **ELIMINATED** — TEST-999 found (id=8234) | evidence/BUG-148/get_table_config.json |
| H4 | Cleanup works | Curl: DELETE table-config/8234 | 1 | **CONFIRMED** — deleted successfully | Step 4 output |

### 3. Data Flow Trace
```
UI: "Add Table/Room" button → Dialog (tableNo, title, rtype, waiterId) 
  → handleDialogSave() → storeTable(dialogData) 
  → configToAPI.storeTable() → { title, table_no, vendorName, rtype }
  → api.post(TABLE_CONFIG_STORE, payload) 
  → POST /api/v2/vendoremployee/restaurant-settings/table-config/store
  → 200 OK "Table added successfully"
BREAK POINT: NONE — full chain works via curl
```

### 4. Evidence Artifacts
- `/app/memory/evidence/BUG-148/get_table_config.json` — 84 tables returned
- `/app/memory/evidence/BUG-148/store_table_response.json` — "Table added successfully"

### 5. Recommendations
Classification: **CANNOT_REPRODUCE**
- Backend CRUD fully operational on cafe103 (preprod)
- FE code fully wired: button, dialog, validation, API call, toast, refresh
- Original report was "cannot add" — may have been:
  - Temporary backend downtime
  - Restaurant-specific config/permissions
  - Already fixed in 17-july branch
- **Recommend: CLOSE as CANNOT REPRODUCE. Owner re-verify on current deployment. If still broken, capture: which restaurant, exact error/behavior, console/network screenshot.**

---

## BUG-200 — Expense Report: Category Filter Returns 0 Results

### 1. Summary
Root cause: **CANNOT REPRODUCE — backend filter works, FE code is correctly wired.**
Classification: ENVIRONMENT / DATA_EDGE
Confidence: HIGH (curl-verified with category_id=255 on preprod)
Steps used: 6/10

### 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Backend expects different param name | Curl: GET expenses-report?category_id=255 | 1 | **ELIMINATED** — `category_id` works, returned 69 filtered items | evidence/BUG-200/expense_report_with_catid_255.json |
| H2 | Backend expects category name not ID | N/A (H1 eliminated this) | 0 | **ELIMINATED** — numeric ID works | — |
| H3 | Backend doesn't support filtering | Curl comparison: no filter (823 items) vs filter (69 items) | 1 | **ELIMINATED** — filter changes results | Steps 7 vs 8 |
| H4 | Date format wrong | Curl: YYYY-MM-DD → error; DD/MM/YYYY → works | 2 | **CONFIRMED then fixed** — backend requires DD/MM/YYYY, FE sends DD/MM/YYYY via formatDateDDMMYYYY() | Step 6 error, Step 7 success |

### 3. Data Flow Trace
```
UI: Category dropdown → setCategoryFilter(id) → categoryFilter = "255"
  → getExpenseReport(formatDateDDMMYYYY(from), formatDateDDMMYYYY(to), { categoryId: "255" })
  → params.category_id = "255"
  → GET /expense/expenses-report?from=DD/MM/YYYY&to=DD/MM/YYYY&category_id=255
  → 200 OK, total_count=69, total_amount=7015 (filtered to "To Owner" only)
BREAK POINT: NONE — full chain works via curl
```

### 4. Evidence Artifacts
- `/app/memory/evidence/BUG-200/expense_report_no_filter_v2.json` — 823 items unfiltered
- `/app/memory/evidence/BUG-200/expense_report_correct_date.json` — full response
- `/app/memory/evidence/BUG-200/expense_report_with_catid_255.json` — 69 items filtered

### 5. Recommendations
Classification: **CANNOT_REPRODUCE**
- Backend accepts `category_id` param and correctly filters results
- FE code sends `category_id` correctly in `getExpenseReport()` L121
- FE date format is correct (DD/MM/YYYY via `formatDateDDMMYYYY`)
- Original report may have been:
  - Category dropdown sending wrong value (now fixed?)
  - Specific category with 0 expenses in selected date range
  - Date range mismatch
- **Recommend: CLOSE as CANNOT REPRODUCE. Owner re-verify. If still broken, capture: Network tab showing the exact request URL + response.**

---

## 6. Retroactive Candidates
NONE

## Combined Summary
| Bug | Verdict | Steps | Confidence | Action |
|---|---|---|---|---|
| BUG-148 | CANNOT REPRODUCE | 4 | HIGH | Close or re-verify with owner |
| BUG-200 | CANNOT REPRODUCE | 6 | HIGH | Close or re-verify with owner |
