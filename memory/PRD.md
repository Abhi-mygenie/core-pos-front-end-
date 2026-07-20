# Core POS Frontend — PRD

## What's Been Implemented

### 2026-07-19: Deployment + CR-082 Socket Room-Join (QA PASS)
### 2026-07-20: BUG-208 Expense Module Fixes (3 bugs)

## BUG-208 Details
| Fix | File | Lines Changed | Description |
|---|---|---|---|
| Fix 1 | ExpenseSetupPanel.jsx | ~6 lines | Cross-join pricedItems onto allItems in fetchAll() — unit prices now survive page refresh |
| Fix 1b | ExpenseBulkEditor.jsx | ~30 lines | Price CLEARING now calls deleteUnitPrice (2 code paths: price-only + title/cat changed) |
| Fix 2 | ExpenseSetupPanel.jsx | ~4 lines | "Use 🗑 to remove" hint appears when Unit Prices edit field is empty |
| Fix 3 | ExpenseSetupPanel.jsx | ~1 line | Error message now says "click the delete (trash) icon" instead of just "use the Unit Prices tab" |

## Open Items
| # | Item | Priority | Status |
|---|---|---|---|
| 1 | CR-082 Owner Smoke | P0 | QA PASS — ready for Gate 6 |
| 2 | BUG-208 QA | P1 | IMPLEMENTED — needs QA |
| 3 | Expense Split Payment | P1 | New CR needed (backend ready) |
| 4 | Expense Optional Fields | P1 | Backend brief sent — awaiting confirmation |
| 5 | CR-081 Inventory V5 Design | P1 | INTAKE |
