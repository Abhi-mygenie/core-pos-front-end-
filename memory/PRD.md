# Core POS Frontend — PRD

## What's Been Implemented

### 2026-07-19: Deployment + CR-082 Socket Room-Join (QA PASS)
### 2026-07-20: BUG-208/208b Expense Unit Price Fixes (QA PASS)

## Latest QA Results — BUG-208/208b

| Test | Result |
|---|---|
| Bulk Editor price persistence (change → save → re-open) | **PASS** ✅ |
| Bulk Editor price clearing (empty → save → removed) | **PASS** ✅ |
| Unit Prices tab delete confirmation (empty → ✓ → modal → Remove) | **PASS** ✅ |
| Stock Master inline edit price clearing (empty → save → removed) | **PASS** ✅ |
| Regression: Set Price flow | **PARTIAL** (QTY field may need filling — expected behavior) |
| Regression: Data restoration | **PASS** ✅ |

## Open Items
| # | Item | Priority | Status |
|---|---|---|---|
| 1 | CR-082 Owner Smoke | P0 | QA PASS — ready for Gate 6 |
| 2 | BUG-208/208b Owner Smoke | P1 | QA PASS — ready for Gate 6 |
| 3 | Expense Split Payment | P1 | New CR needed (backend ready) |
| 4 | Expense Optional Fields | P1 | Backend brief sent |
| 5 | CR-081 Inventory V5 Design | P1 | INTAKE |
