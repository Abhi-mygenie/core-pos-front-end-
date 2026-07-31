# CR-059 Phase 1 — Implementation Plan (Gate 3)

**ID:** CR-059
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-06
**Based on:** Impact Analysis (Gate 2) + Screen Freeze (Gate 2.5)
**Code Reality:** NONE — verified via grep, zero expense code exists
**Conflict Pre-Check:** CLEAN — Sidebar.jsx L65, App.js L148, constants.js L321 all stable

---

## SCOPE LOCK

**Files WILL change (3 existing — additive only):**
1. `components/layout/Sidebar.jsx`
2. `App.js`
3. `api/constants.js`

**Files WILL create (8 new):**
1. `api/services/expenseService.js`
2. `api/transforms/expenseTransform.js`
3. `components/expense/ExpenseEntryPanel.jsx`
4. `components/expense/ExpenseSetupPanel.jsx`
5. `components/expense/ExpenseBulkEditor.jsx`
6. `pages/ExpenseEntryPage.jsx`
7. `pages/ExpenseSetupPage.jsx`
8. `pages/index.js` (append 2 exports)

**Files WILL NOT touch:**
- All order/payment/settlement/menu/report/socket/context files
- No provider order changes, no localStorage key changes
- No financial logic files, no existing transforms

---

## EXECUTION SEQUENCE

### Step 1: `api/constants.js` — Add Expense Endpoints

**File:** `/app/frontend/src/api/constants.js`
**Action:** Insert new constant block after line 321 (end of STORAGE_KEYS)
**Lines added:** ~30

```javascript
// =============================================================================
// CR-059: EXPENSE MODULE ENDPOINTS
// =============================================================================
export const EXPENSE_ENDPOINTS = {
  // Master — Categories
  CATEGORY_LIST: '/api/v2/vendoremployee/expense/category-list',
  // Master — Stock Items
  EXPENSES_LIST: '/api/v2/vendoremployee/expense/expenses-list',
  STORE_EXPENSE: '/api/v2/vendoremployee/expense/store_expense',
  UPDATE_CATEGORY: '/api/v2/vendoremployee/expense/expenses',       // PUT /{category_id}
  DELETE_ITEM: '/api/v2/vendoremployee/expense/expenses',           // DELETE /{item_id}
  BULK_EXPORT: '/api/v2/vendoremployee/expense/bulk-export-expense',
  BULK_IMPORT: '/api/v2/vendoremployee/expense/bulk-import-expense',
  STOCK_SAMPLE: '/bulk_upload_sample/expense/expense_stock_sample.xlsx',
  // Transactions
  EXPENSES_REPORT: '/api/v2/vendoremployee/expense/expenses-report',
  STORE_EXPENSE_DETAILS: '/api/v2/vendoremployee/expense/store-expense-details',
  EDIT_EXPENSE: '/api/v2/vendoremployee/expense/edit-expense',      // PUT /{id}
  EXPORT_REPORT: '/api/v2/vendoremployee/expense/expenses-export-report',
  DOWNLOAD_SAMPLE: '/api/v2/vendoremployee/expense/download-semple',
  IMPORT_EXPENSE: '/api/v2/vendoremployee/expense/import-expense',
  // Unit Prices
  STOCK_UNIT_PRICES: '/api/v2/vendoremployee/expense/stock-unit-prices',
  WITHOUT_UNIT_PRICES: '/api/v2/vendoremployee/expense/expenses-without-unit-prices',
  UNIT_PRICE: '/api/v2/vendoremployee/expense/stock-unit-price',    // POST, PUT /{id}, DELETE /{id}
  // Reference Data
  PAYMENT_METHOD: '/api/v2/vendoremployee/expense/payment-method',
  GET_UNIT: '/api/v2/vendoremployee/expense/get-unit',
};
```

**Verify:** `grep -n "EXPENSE_ENDPOINTS" /app/frontend/src/api/constants.js` returns the block.

---

### Step 2: `api/services/expenseService.js` — NEW (~180 lines)

**File:** `/app/frontend/src/api/services/expenseService.js` (NEW)
**Pattern:** Follows `settlementService.js` + `menuManagementService.js`

```
Functions to implement (19):
── Master ──
  getCategories()                        → GET  CATEGORY_LIST
  getExpenseItems()                      → GET  EXPENSES_LIST
  createCategoryWithItems(name, items[]) → POST STORE_EXPENSE
  updateCategory(catId, name, items[])   → PUT  UPDATE_CATEGORY/{catId}
  deleteExpenseItem(itemId)              → DELETE DELETE_ITEM/{itemId}
  exportStockMaster()                    → POST BULK_EXPORT
  importStockMaster(file)               → POST BULK_IMPORT (multipart)
── Transactions ──
  getExpenseReport(from, to, payMethod)  → GET  EXPENSES_REPORT?from=&to=&payment_method=
  addExpenseEntry(date, totalAmt, lines[]) → POST STORE_EXPENSE_DETAILS
  editExpenseEntry(id, data)             → PUT  EDIT_EXPENSE/{id}
  deleteExpenseEntry(id)                 → DELETE EDIT_EXPENSE/{id} (probe — may 404)
  exportExpenseReport(from, to)          → POST EXPORT_REPORT
  importExpenses(file)                   → POST IMPORT_EXPENSE (multipart)
── Unit Prices ──
  getUnitPrices()                        → GET  STOCK_UNIT_PRICES
  getItemsWithoutPrices()                → GET  WITHOUT_UNIT_PRICES
  addUnitPrice(stockId, qty, price)      → POST UNIT_PRICE
  editUnitPrice(id, price)              → PUT  UNIT_PRICE/{id}
  deleteUnitPrice(id)                   → DELETE UNIT_PRICE/{id}
── Reference ──
  getPaymentMethods()                    → GET  PAYMENT_METHOD
  getUnits()                             → GET  GET_UNIT
```

**Verify:** Each function callable via `import * as expenseService from '...'`. Curl-testable.

---

### Step 3: `api/transforms/expenseTransform.js` — NEW (~150 lines)

**File:** `/app/frontend/src/api/transforms/expenseTransform.js` (NEW)
**Pattern:** Follows `settlementTransform.js`

```
Exports:
  formatDateDDMMYYYY(date)    → "DD/MM/YYYY"
  formatDateISO(date)         → "YYYY-MM-DD"
  parseDateDDMMYYYY(str)      → Date object

  fromAPI.categories(res)     → [{id, name}]
  fromAPI.expenseItems(res)   → [{id, title, categoryName, createdAt, unitPrice, unitPriceAmount}]
  fromAPI.expenseReport(res)  → {totalAmount, transactions: [{id, date, expense, category, categoryId, amount, paymentMethod, quantity, unit}]}
  fromAPI.paymentMethods(res) → string[]
  fromAPI.units(res)          → [{value, label}]  (converts {0:"kg",1:"ltr"} → array)
  fromAPI.unitPrices(res)     → [{id, stockId, stockTitle, quantity, price}]
  fromAPI.exportResponse(res) → {message, downloadUrl}

  toAPI.createCategory(name, itemNames[])       → {category_name, stock_title: ["a","b"]}
  toAPI.updateCategory(name, items[])           → {category_name, stock_title: [{title:"a"}]}
  toAPI.addExpenseEntry(date, totalAmt, lines[])→ {e_date, total_amount, details: [{expense, amount, payment_method, quantity, unit, physical_quantity: 0}]}
  toAPI.editExpenseEntry(data)                  → {exp_name, e_dates, d_amount, payment_method, quantity, unit, physical_quantity: 0}
  toAPI.addUnitPrice(stockId, qty, price)       → {stock_id, quantity, price}
```

**Key quirks handled:**
- Create stock_title = flat strings; Update stock_title = objects
- Create fields ≠ Update fields (expense/exp_name, amount/d_amount, etc.)
- Date format DD/MM/YYYY for most, YYYY-MM-DD for export
- Amounts are strings in responses → parseFloat
- Units response is object → convert to array
- physical_quantity always sent as 0 (deprecated field)

**Verify:** Unit-testable transform functions.

---

### Step 4: `pages/ExpenseEntryPage.jsx` — NEW (~20 lines)

**File:** `/app/frontend/src/pages/ExpenseEntryPage.jsx` (NEW)
**Pattern:** Exact clone of `MenuManagementPage.jsx` structure

```jsx
import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import ExpenseEntryPanel from "../components/expense/ExpenseEntryPanel";

// CR-059: Daily Expense Entry page
const ExpenseEntryPage = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex h-screen" data-testid="expense-entry-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
      <main className="flex-1 overflow-auto bg-[#F7F7F7]" style={{ marginLeft: isSidebarExpanded ? 280 : 70 }}>
        <ExpenseEntryPanel />
      </main>
    </div>
  );
};
export default ExpenseEntryPage;
```

---

### Step 5: `pages/ExpenseSetupPage.jsx` — NEW (~20 lines)

**File:** `/app/frontend/src/pages/ExpenseSetupPage.jsx` (NEW)
**Pattern:** Same as Step 4

```jsx
// CR-059: Expense Master Setup page
// Same wrapper pattern, uses ExpenseSetupPanel
```

---

### Step 6: `components/expense/ExpenseEntryPanel.jsx` — NEW (~400 lines)

**File:** `/app/frontend/src/components/expense/ExpenseEntryPanel.jsx` (NEW)
**Pattern:** Follows `SettlementPanel.jsx` (KPI strip + table + form)
**Screen Freeze:** `/expenses` mockup

```
Structure:
  ── State ──
  selectedDate (default: today)
  expenses[] (today's transactions from API)
  categories[] (from category-list)
  expenseItems[] (from expenses-list)
  paymentMethods[] (from payment-method)
  units[] (from get-unit)
  unitPrices[] (from stock-unit-prices)
  formState: {category, item, amount, paymentMethod, quantity, unit, showMore}
  multiLines: [{...formState}] (for multi-line entry)
  editingId: null | transactionId (inline edit mode)
  loading, saving

  ── Lifecycle ──
  useEffect: fetch categories, items, payment methods, units, unit prices (parallel)
  useEffect[selectedDate]: fetch expenses report for that date

  ── Components ──
  1. Header: "Expenses" title + DatePicker (right aligned)
  2. KPIStrip: 5 cards computed from expenses[]
     - Today's Total (sum all)
     - Cash (filter payment_method=Cash)
     - UPI (filter payment_method=UPI)
     - Bank Transfer
     - Cash Draw
  3. QuickAddForm:
     - Category Select → filters itemOptions
     - Item Combobox (searchable)
     - Amount Input (auto-fill from unit price if qty > 0)
     - Payment Method Select
     - Collapsible "More": Qty + Unit
     - "+ Add Another Line" → push to multiLines[]
     - Save button → POST store-expense-details
     - Reset button → clear form
  4. ExpenseTable:
     - Columns: Time, Item, Category, Amount, Payment, Actions
     - Rows from expenses[] sorted by time desc
     - Inline edit: click edit → row inputs, save/cancel
     - Delete: confirmation → DELETE → refresh
     - Footer: running total
```

**data-testid attributes:**
- `expense-entry-panel`
- `expense-kpi-total`, `expense-kpi-cash`, `expense-kpi-upi`, `expense-kpi-bank`, `expense-kpi-cashdraw`
- `expense-date-picker`
- `expense-category-select`, `expense-item-select`, `expense-amount-input`
- `expense-payment-select`, `expense-qty-input`, `expense-unit-select`
- `expense-add-line-btn`, `expense-save-btn`, `expense-reset-btn`
- `expense-table`, `expense-table-row-{id}`, `expense-edit-btn-{id}`, `expense-delete-btn-{id}`
- `expense-total-amount`

---

### Step 7: `components/expense/ExpenseSetupPanel.jsx` — NEW (~350 lines)

**File:** `/app/frontend/src/components/expense/ExpenseSetupPanel.jsx` (NEW)
**Pattern:** Follows `MenuManagementPanel.jsx` (category list + product list + bulk toggle)
**Screen Freeze:** `/expense-setup` mockup

```
Structure:
  ── State ──
  categories[] (from category-list)
  expenseItems[] (from expenses-list, filtered by selectedCategory)
  unitPrices[] (from stock-unit-prices)
  units[] (from get-unit)
  selectedCategoryId: null | id
  searchQuery: ""
  bulkEditMode: false
  loading, saving
  editingCategory: null | {id, name}
  addingCategory: false
  editingItem: null | id
  addingItem: false

  ── Lifecycle ──
  useEffect: fetch categories, items, unit prices, units (parallel)

  ── Layout ──
  Two-column grid: md:grid-cols-12

  ── Left Panel (md:col-span-3) ──
  1. "+ Add Category" button
  2. Category list:
     - Each: name + count badge + edit/delete on hover
     - Click → setSelectedCategoryId → filter right panel
     - Selected: green left border (#329937)
     - Inline add: text input + confirm/cancel
     - Inline edit: text input replacing name
     - Delete: confirmation dialog

  ── Right Panel (md:col-span-9) ──
  1. Toolbar:
     - Search input (filters items by title)
     - Bulk Edit toggle button
     - Export button (→ exportStockMaster)
     - Import button (→ file picker → importStockMaster)
     - Download sample button
  2. Standard Mode (bulkEditMode=false):
     - Table: Name, Unit Price, Unit, Actions
     - Unit Price cell: shows "₹120/kg" or "—" (click to set inline)
     - "+ Add Item" row at bottom
     - Inline edit on row click
  3. Bulk Editor Mode (bulkEditMode=true):
     - Renders <ExpenseBulkEditor />
```

**data-testid attributes:**
- `expense-setup-panel`
- `expense-add-category-btn`, `expense-category-list`, `expense-category-item-{id}`
- `expense-search-input`, `expense-bulk-toggle`, `expense-export-btn`, `expense-import-btn`
- `expense-items-table`, `expense-item-row-{id}`, `expense-add-item-btn`
- `expense-item-edit-btn-{id}`, `expense-item-delete-btn-{id}`

---

### Step 8: `components/expense/ExpenseBulkEditor.jsx` — NEW (~300 lines)

**File:** `/app/frontend/src/components/expense/ExpenseBulkEditor.jsx` (NEW)
**Pattern:** Simplified version of `BulkEditor.jsx` (Menu Management)
**Fewer columns, no variations/addons complexity**

```
Structure:
  ── Props ──
  items[] (all expense items)
  categories[] (for dropdown)
  units[] (for dropdown)
  unitPrices[] (current prices)
  onSave(dirtyRows[]) → batch save callback
  onCancel() → exit bulk edit

  ── State ──
  rows[] (editable copy of items with dirty tracking)
  dirtyIds: Set

  ── Columns ──
  1. # (row number)
  2. Name (text input — LocalTextInput pattern from BulkEditor.jsx)
  3. Category (select dropdown)
  4. Unit Price (number input)
  5. Unit (select dropdown)

  ── Features ──
  - Click cell to edit
  - Dirty cell highlight (subtle yellow bg)
  - "+ Add Row" at bottom (new item)
  - Trash icon on _isNew rows
  - "Save All" button → batch save dirty rows
  - "Cancel" → discard changes, exit bulk mode
  - Validation: Name required. Toast on save errors.
```

**data-testid attributes:**
- `expense-bulk-editor`
- `expense-bulk-row-{index}`, `expense-bulk-name-{index}`, `expense-bulk-category-{index}`
- `expense-bulk-price-{index}`, `expense-bulk-unit-{index}`
- `expense-bulk-save-btn`, `expense-bulk-cancel-btn`, `expense-bulk-add-row-btn`

---

### Step 9: `components/layout/Sidebar.jsx` — MODIFY (additive, ~12 lines)

**File:** `/app/frontend/src/components/layout/Sidebar.jsx`

**Edit 9a:** Add `Receipt` to icon imports (line 6)
```
Current (L6): PanelLeftClose, PanelLeft, RefreshCw, Bell, BellOff, Eye,
New:          PanelLeftClose, PanelLeft, RefreshCw, Bell, BellOff, Eye, Receipt,
```

**Edit 9b:** Add `expenses` to SIDEBAR_PERMISSIONS (after line 41)
```javascript
  'expenses': 'pos',
```

**Edit 9c:** Add expense menu entry in `sidebarMenuItems[]` after day-closure block (after line 65)
```javascript
  // CR-059: Expense Module
  {
    id: "expenses",
    label: "Expenses",
    icon: Receipt,
    children: [
      { id: "add-expenses", label: "Add Expenses", path: "/expenses" },
      { id: "expense-setup", label: "Expense Setup", path: "/expense-setup" },
    ],
  },
```

**Edit 9d:** Add `'expenses'` to VISIBLE_SECTIONS Set (line 259)
```
Current: new Set(['dashboard', 'day-closure', 'menu-management', 'credit', 'reports', 'settings', 'insights']);
New:     new Set(['dashboard', 'day-closure', 'expenses', 'menu-management', 'credit', 'reports', 'settings', 'insights']);
```

**Verify:** Sidebar renders "Expenses" with Receipt icon between Day Closure and Menu Management. Both children navigate correctly.

---

### Step 10: `App.js` — MODIFY (additive, ~6 lines)

**Edit 10a:** Add imports after line 51 (SettingsPage import)
```javascript
import ExpenseEntryPage from "./pages/ExpenseEntryPage";         // CR-059
import ExpenseSetupPage from "./pages/ExpenseSetupPage";         // CR-059
```

**Edit 10b:** Add routes after line 148 (before `</Routes>`)
```jsx
              {/* CR-059: Expense Module */}
              <Route path="/expenses" element={<ProtectedRoute><ExpenseEntryPage /></ProtectedRoute>} />
              <Route path="/expense-setup" element={<ProtectedRoute><ExpenseSetupPage /></ProtectedRoute>} />
```

**Verify:** Navigate to `/expenses` and `/expense-setup` — both render their respective pages within ProtectedRoute.

---

### Step 11: `pages/index.js` — MODIFY (additive, ~2 lines)

**Edit:** Append at end of file
```javascript
export { default as ExpenseEntryPage } from './ExpenseEntryPage';     // CR-059
export { default as ExpenseSetupPage } from './ExpenseSetupPage';     // CR-059
```

---

## VERIFICATION MATRIX

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | constants.js | EXPENSE_ENDPOINTS block | grep + import test | YES |
| 2 | expenseService.js | 19 API functions | curl each endpoint via service calls | YES |
| 3 | expenseTransform.js | fromAPI/toAPI transforms | Unit test: input→output | YES |
| 4 | ExpenseEntryPage.jsx | Page wrapper renders | Navigate /expenses → page loads | NO (browser) |
| 5 | ExpenseSetupPage.jsx | Page wrapper renders | Navigate /expense-setup → page loads | NO (browser) |
| 6 | ExpenseEntryPanel.jsx | KPI + form + table | Browser: KPIs show, form submits, table populates | NO (browser) |
| 7 | ExpenseSetupPanel.jsx | Category + items + bulk | Browser: categories load, items filter, CRUD works | NO (browser) |
| 8 | ExpenseBulkEditor.jsx | Spreadsheet grid | Browser: toggle bulk edit, edit cells, save all | NO (browser) |
| 9a | Sidebar.jsx (icon) | Receipt import | Sidebar renders expense icon | NO (browser) |
| 9b | Sidebar.jsx (perm) | expenses permission | Sidebar shows/hides based on role | NO (browser) |
| 9c | Sidebar.jsx (menu) | Expense children | Click Expenses → see Add Expenses + Setup | NO (browser) |
| 9d | Sidebar.jsx (visible) | VISIBLE_SECTIONS | Expenses section visible | NO (browser) |
| 10a | App.js (imports) | 2 page imports | Webpack compiles without error | YES |
| 10b | App.js (routes) | 2 Route entries | Navigate to both URLs → correct page | NO (browser) |
| 11 | pages/index.js | 2 exports | Import from barrel works | YES |

---

## POST-CODE REGISTRY CHECKLIST

After implementation, the agent MUST execute:

```
- [ ] registry.json: CR-059 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated with IMPLEMENTED status + file list
- [ ] FILE_OWNERSHIP.md: add all 8 new files + 3 modified files with CR-059 + date
- [ ] Code markers: // CR-059 comment in every new/modified file
- [ ] Compile check: webpack compiles with 0 NEW warnings
```

---

## RISK REGISTER (updated)

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Sidebar.jsx is hotspot (7 CRs) | LOW | Additive only — 1 new array entry + 1 Set addition |
| R2 | App.js is hotspot | LOW | Additive — 2 imports + 2 routes |
| R3 | API field inconsistency create/update | MEDIUM | Transform layer normalizes all quirks |
| R4 | Date format inconsistency | MEDIUM | Transform helpers per format |
| R5 | DELETE transaction unconfirmed | MEDIUM | FE probes DELETE on /edit-expense/{id}. If 404, disable delete UI + flag |
| R6 | BulkEditor complexity | MEDIUM | Simplified vs Menu BulkEditor (5 cols vs 33). No variations/addons |
| R7 | 19 endpoints = large integration surface | MEDIUM | Phased: service → transforms → setup → entry → wire routes |

---

```
Planning complete: CR-059 Phase 1
Stage: Implementation Plan (Gate 3)
Code reality: NONE
Risk: HIGH
Files WILL change: Sidebar.jsx (L6,41,65,259), App.js (L51,148), constants.js (L321), pages/index.js (L11)
Files WILL create: 8 new files (~1,420 lines)
Files WILL NOT touch: All order/payment/settlement/menu/report/socket/context files
Verification matrix: 15 checks (5 automated, 10 browser)
Owner decisions: OQ-1 still open (delete transaction curl)
Docs: memory/plans/CR_059_PHASE1_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
```
