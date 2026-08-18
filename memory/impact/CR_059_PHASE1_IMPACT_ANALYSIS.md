# CR-059 Phase 1 — Impact Analysis (Gate 2)

**ID:** CR-059
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-06
**Code Reality:** NONE — zero expense references in codebase
**Conflict Pre-Check:** CLEAN — Sidebar.jsx + App.js changes are additive only (new entries/routes)
**Risk:** HIGH (money-adjacent module, new API integration, 19 endpoints)
**Priority:** P1

---

## 1. Scope

Phase 1 delivers two new full-page routes for the Expense Module:
- **`/expenses`** — Daily Expense Entry (cashier/manager daily workhorse)
- **`/expense-setup`** — Expense Master Setup (owner/manager, Menu Management-style)

Phase 2 (reporting — Daily Report + Insights) is **PARKED**.

---

## 2. Data Flow

```
                     ┌──────────────────┐
                     │  preprod.mygenie  │
                     │  .online (Laravel)│
                     └────────┬─────────┘
                              │ 19 endpoints under /api/v2/vendoremployee/expense/*
                              │
                     ┌────────▼─────────┐
                     │ expenseService.js │  ← NEW: API call layer
                     └────────┬─────────┘
                              │
                    ┌─────────▼──────────┐
                    │expenseTransform.js  │  ← NEW: fromAPI / toAPI mappings
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │                               │
     ┌────────▼────────┐            ┌─────────▼──────────┐
     │ ExpenseEntryPage │            │ ExpenseSetupPage    │
     │   /expenses      │            │   /expense-setup    │
     └────────┬────────┘            └─────────┬──────────┘
              │                               │
     ┌────────▼────────┐            ┌─────────▼──────────┐
     │ExpenseEntryPanel │            │ExpenseSetupPanel    │
     │ • KPI strip      │            │ • CategoryManager   │
     │ • Quick-add form │            │ • Items table       │
     │ • Today's log    │            │ • BulkEditor mode   │
     │ • Edit/Delete    │            │ • Unit Prices       │
     └─────────────────┘            │ • Excel Import/Exp  │
                                    └────────────────────┘
```

---

## 3. Files WILL Change (EXISTING — 3 files, additive only)

| File | Lines Changed | Change Description | Risk |
|------|--------------|-------------------|------|
| `components/layout/Sidebar.jsx` | +12 lines | Add "Expenses" parent with 2 children in `sidebarMenuItems[]` + icon import | LOW — additive array entry, no reorder |
| `App.js` | +6 lines | 2 imports + 2 `<Route>` entries for `/expenses` and `/expense-setup` | LOW — additive routes at end of Routes block |
| `api/constants.js` | +25 lines | Add `EXPENSE_ENDPOINTS` object with all endpoint URLs | LOW — additive constant block |

**Conflict check:** `Sidebar.jsx` last touched by CR-052 (2026-06-18, flyout). `App.js` last touched by CR-041 (2026-06-17, route migrations). Both changes are additive — no conflict.

---

## 4. Files WILL Create (NEW — 8 files)

| File | Est. Lines | Purpose | Pattern Reference |
|------|-----------|---------|-------------------|
| `pages/ExpenseEntryPage.jsx` | ~20 | Page wrapper (Sidebar + EntryPanel) | `MenuManagementPage.jsx` |
| `pages/ExpenseSetupPage.jsx` | ~20 | Page wrapper (Sidebar + SetupPanel) | `MenuManagementPage.jsx` |
| `components/expense/ExpenseEntryPanel.jsx` | ~400 | Daily expense form + today's log table | `SettlementPanel.jsx` (KPI strip + table + form) |
| `components/expense/ExpenseSetupPanel.jsx` | ~350 | Category + items management, bulk toggle | `MenuManagementPanel.jsx` (category list + product list + bulk toggle) |
| `components/expense/ExpenseBulkEditor.jsx` | ~300 | Spreadsheet-style bulk editor for stock items | `BulkEditor.jsx` (inline edit, batch save) |
| `api/services/expenseService.js` | ~180 | 19 API functions (CRUD + bulk + reports) | `settlementService.js` / `menuManagementService.js` |
| `api/transforms/expenseTransform.js` | ~150 | fromAPI/toAPI field mappings + date format helpers | `settlementTransform.js` |
| `pages/index.js` | +2 lines | Export new pages | existing pattern |

**Total new code:** ~1,420 lines across 8 files

---

## 5. Files WILL NOT Touch

- **Order/Payment:** `orderTransform.js`, `CollectPaymentPanel.jsx`, `CartPanel.jsx`, `OrderEntry.jsx`
- **Settlement:** `SettlementPanel.jsx`, `settlementService.js`
- **Menu:** `MenuManagementPanel.jsx`, `BulkEditor.jsx`, `menuManagementService.js`
- **Reports:** All `reports-module/*.jsx`, `insightsService.js`, `reportTransform.js`
- **Contexts:** `AppProviders.jsx`, `AuthContext.jsx`, `OrderContext.jsx`, `MenuContext.jsx`
- **Sockets:** `socketHandlers.js`, `useSocketEvents.js`, `socketEvents.js`
- **No provider order changes** (R7)
- **No localStorage key changes** (R8)

---

## 6. Screen Freeze Reference

**Full screen freeze document:** `memory/evidence/CR-059/SCREEN_FREEZE_CR059_PHASE1.md`
**Backend gaps brief (HTML):** `memory/evidence/CR-059/BACKEND_GAPS_BRIEF.html` (also at `/BACKEND_GAPS_BRIEF.html` on preview URL)

### Mockup Images (FROZEN)
- **Entry page:** https://static.prod-images.emergentagent.com/jobs/ccc78091-2b03-47a2-98d6-0a465e2009b3/images/3ce641af4736a98ea844a1f1851a524b5b7248fdc0232aea062216d341a03368.png
- **Setup page:** https://static.prod-images.emergentagent.com/jobs/ccc78091-2b03-47a2-98d6-0a465e2009b3/images/173b35c94332c4928070be25038ffa466d6d0c7f9884acd4129521b8ba327999.png

### Design Tokens: Uses existing POS palette (Poppins + #F26B33 Orange / #329937 Green / #F4A11A Amber). NO new fonts or colors introduced.

## 6a. Mock Screen Freeze — `/expenses` (Daily Expense Entry)

```
┌──────────────────────────────────────────────────────────────────┐
│ [Sidebar]  │  Expenses                                    [date] │
│            │                                                      │
│            │  ┌──────────┬──────────┬──────────┬──────────┐      │
│            │  │Today     │ Cash     │ UPI      │ Cash Draw│      │
│            │  │₹4,230    │ ₹2,800   │ ₹430     │ ₹1,000  │      │
│            │  └──────────┴──────────┴──────────┴──────────┘      │
│            │                                                      │
│            │  ┌─ Quick Add ────────────────────────────────────┐ │
│            │  │ [Date: Today ▼]                                │ │
│            │  │                                                │ │
│            │  │ [Category ▼] [Item Name (search) ▼]           │ │
│            │  │                                                │ │
│            │  │ [Amount ₹___]  [Payment Method ▼]             │ │
│            │  │                                                │ │
│            │  │ ▸ More fields (qty, unit)    [+ Add Line]     │ │
│            │  │                                                │ │
│            │  │              [Reset]  [Save Expense]           │ │
│            │  └────────────────────────────────────────────────┘ │
│            │                                                      │
│            │  Today's Expenses (12 entries)           [Export ⬇]  │
│            │  ┌────────────────────────────────────────────────┐ │
│            │  │ Time  │ Item        │ Category│ ₹    │Pay│ Act│ │
│            │  │───────┼─────────────┼─────────┼──────┼───┼────│ │
│            │  │ 14:30 │ Dal         │ Pulses  │  400 │💵 │ ✏🗑│ │
│            │  │ 13:15 │ Milk (10L)  │ Dairy   │  600 │💵 │ ✏🗑│ │
│            │  │ 11:00 │ Gas Cylinder│ Kitchen │3,000 │🏦 │ ✏🗑│ │
│            │  │ ...   │             │         │      │   │    │ │
│            │  ├────────────────────────────────┼──────┼───┼────┤ │
│            │  │                        TOTAL   │4,230 │   │    │ │
│            │  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Key UX Decisions:
- **Date defaults to today** — changeable for backdated entries
- **Category filters item dropdown** — select "Pulses" → only see dal, rajma, etc.
- **Amount auto-fills** if item has unit price set (qty × unit_price)
- **"More fields" collapsed by default** — qty/unit only shown when expanded (since only 2% use it)
- **Multi-line entry** — "Add Line" adds another item row before save (matches API `details[]` array)
- **Today's log shows inline** — no separate page, edit/delete in-place
- **KPI strip** — running totals by payment method, updates on save

---

## 6b. Mock Screen Freeze — `/expense-setup` (Expense Master Setup)

```
┌──────────────────────────────────────────────────────────────────┐
│ [Sidebar]  │  Expense Setup                       [⬇ ⬆] [Grid] │
│            │                                    Export Import Bulk│
│            │                                                      │
│            │  ┌─ Categories ───────┬─ Items ───────────────────┐ │
│            │  │                    │                            │ │
│            │  │ + Add Category     │  Search: [___________]    │ │
│            │  │                    │                            │ │
│            │  │ ▶ Pulses (12)     │  Showing: Pulses           │ │
│            │  │   Dairy (8)       │  ┌─────────────────────┐   │ │
│            │  │   Kitchen (15)    │  │Name    │UnitPr│ Act │   │ │
│            │  │   Salary (3)      │  │────────┼──────┼─────│   │ │
│            │  │   Packaging (5)   │  │Dal     │ ₹120 │ ✏ 🗑│   │ │
│            │  │   Misc (45)       │  │Rajma   │  —   │ ✏ 🗑│   │ │
│            │  │                    │  │Soybean │ ₹85  │ ✏ 🗑│   │ │
│            │  │                    │  │Moong   │  —   │ ✏ 🗑│   │ │
│            │  │ [✏ Edit] [🗑 Del] │  │        │      │     │   │ │
│            │  │                    │  └─────────────────────┘   │ │
│            │  │                    │                            │ │
│            │  │                    │  + Add Item                │ │
│            │  └────────────────────┴────────────────────────────┘ │
│            │                                                      │
│            │  ── Bulk Editor Mode (toggle) ──                     │
│            │  ┌────────────────────────────────────────────────┐ │
│            │  │ # │ Name     │ Category │ Unit Price │ Unit   │ │
│            │  │───┼──────────┼──────────┼────────────┼────────│ │
│            │  │ 1 │ [Dal   ] │ [Pulses▼]│ [120     ] │ [kg ▼]│ │
│            │  │ 2 │ [Rajma ] │ [Pulses▼]│ [       ] │ [kg ▼]│ │
│            │  │ 3 │ [Milk  ] │ [Dairy ▼]│ [55      ] │ [ltr▼]│ │
│            │  │ + Add Row                                      │ │
│            │  │                           [Cancel] [Save All]  │ │
│            │  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Key UX Decisions:
- **Two-column layout** — categories left, items right (master-detail)
- **Category count** shows item count badge
- **Unit Price column inline** with items — not a separate page
- **Bulk Editor toggle** — switches to spreadsheet mode (same pattern as Menu Mgmt BulkEditor)
- **Excel Import/Export** buttons in toolbar header
- **Search** filters items across all categories or within selected
- **Inline "Set price"** — click the "—" in Unit Price column to set price directly

---

## 7. API Integration Map

| UI Action | API Endpoint | Method | Service Function |
|-----------|-------------|--------|------------------|
| Load categories | `/expense/category-list` | GET | `getCategories()` |
| Load all items | `/expense/expenses-list` | GET | `getExpenseItems()` |
| Create category + items | `/expense/store_expense` | POST | `createCategoryWithItems()` |
| Update category + items | `/expense/expenses/{id}` | PUT | `updateCategory()` |
| Delete item | `/expense/expenses/{id}` | DELETE | `deleteExpenseItem()` |
| Load today's expenses | `/expense/expenses-report?from=&to=&payment_method=All` | GET | `getExpenseReport()` |
| Add expense entry | `/expense/store-expense-details` | POST | `addExpenseEntry()` |
| Edit expense entry | `/expense/edit-expense/{id}` | PUT | `editExpenseEntry()` |
| Get payment methods | `/expense/payment-method` | GET | `getPaymentMethods()` |
| Get units | `/expense/get-unit` | GET | `getUnits()` |
| Get items with unit prices | `/expense/stock-unit-prices` | GET | `getUnitPrices()` |
| Get items without unit prices | `/expense/expenses-without-unit-prices` | GET | `getItemsWithoutPrices()` |
| Add unit price | `/expense/stock-unit-price` | POST | `addUnitPrice()` |
| Edit unit price | `/expense/stock-unit-price/{id}` | PUT | `editUnitPrice()` |
| Delete unit price | `/expense/stock-unit-price/{id}` | DELETE | `deleteUnitPrice()` |
| Export stock master | `/expense/bulk-export-expense` | POST | `exportStockMaster()` |
| Import stock master | `/expense/bulk-import-expense` | POST (multipart) | `importStockMaster()` |
| Export transactions | `/expense/expenses-export-report` | POST | `exportExpenseReport()` |
| Import transactions | `/expense/import-expense` | POST (multipart) | `importExpenses()` |

---

## 8. Transform Quirks (must handle in expenseTransform.js)

| Quirk | Where | Handling |
|-------|-------|----------|
| Create `stock_title` = flat strings `["a","b"]` | `store_expense` | `toAPI.createCategory()` |
| Update `stock_title` = objects `[{title:"a"}]` | `expenses/{id}` | `toAPI.updateCategory()` |
| Create uses `expense`/`amount`/`e_date` | `store-expense-details` | `toAPI.addEntry()` |
| Update uses `exp_name`/`d_amount`/`e_dates` | `edit-expense/{id}` | `toAPI.editEntry()` |
| Date format `DD/MM/YYYY` (most endpoints) | Query params + body | `formatDateDDMMYYYY()` |
| Date format `YYYY-MM-DD` (export report) | `expenses-export-report` | `formatDateISO()` |
| Amounts are strings in responses | All report responses | `parseFloat()` in `fromAPI` |
| Units are object `{0:"kg", 1:"ltr"...}` | `get-unit` | `fromAPI.unitList()` → array |

---

## 9. Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Sidebar.jsx is a hotspot (7 CRs touched it) | LOW | Additive change only — new array entry, no reorder |
| R2 | App.js is a hotspot (many route additions) | LOW | Additive — 2 new Route entries at end |
| R3 | API field name inconsistency between create/update | MEDIUM | Transform layer normalizes — unit tested |
| R4 | Date format inconsistency across endpoints | MEDIUM | Transform helpers for each format |
| R5 | Money-adjacent module — expense amounts must be accurate | HIGH | parseFloat + 2-decimal display + R6 regression on settlement if Phase 2 wires tie-in |
| R6 | New module with 19 endpoints — integration surface area | MEDIUM | Phased: master CRUD first, then transactions, then bulk. Each testable independently |
| R7 | BulkEditor complexity (reference: BulkEditor.jsx is 650 lines, had 5 FU CRs) | MEDIUM | Simpler schema than menu (fewer columns, no variations/addons). Start with basic table, add bulk edit incrementally |

---

## 10. Owner Decisions Needed

| # | Question | Options | Impact |
|---|----------|---------|--------|
| OQ-1 | **Delete transaction endpoint** — DELETE to `/expense/edit-expense/{id}` or different path? | Owner to provide curl | Blocks delete functionality on entry page |
| OQ-2 | **Sidebar icon** — which Lucide icon for Expenses? | `Receipt`, `Coins`, `HandCoins`, `Wallet2`, `CircleDollarSign` | Visual only |
| OQ-3 | **Sidebar position** — where in the sidebar order? | After Credit / Before Settings / After Day Closure | Navigation flow |

---

## 11. Downstream Consumers (Phase 2 — not built now)

- **Settlement / Day Closure** — will need to call `getExpenseReport(today, today)` to show "Expenses: ₹X"
- **Daily Report** — will add expense summary row
- **Insights → Expense Report** — full reporting page under Insights sidebar
- **P&L calculation** — Revenue (from orders) − Expenses

These are **Phase 2 scope only** — no changes to settlement or reports in Phase 1.

---

## 12. Execution Sequence (recommended)

```
Step 1: expenseService.js + expenseTransform.js (API layer — testable via curl)
Step 2: ExpenseSetupPanel.jsx + ExpenseSetupPage.jsx (master management — needs Step 1)
Step 3: ExpenseBulkEditor.jsx (bulk editor within setup — needs Step 2)
Step 4: ExpenseEntryPanel.jsx + ExpenseEntryPage.jsx (daily entry — needs Step 1)
Step 5: Sidebar.jsx + App.js (wire routes — needs Steps 2+4)
Step 6: constants.js (endpoint constants — can be Step 1)
```

---

```
Planning complete: CR-059 Phase 1
Stage: Impact Analysis (Gate 2)
Code reality: NONE
Risk: HIGH
Files WILL change: Sidebar.jsx, App.js, constants.js (3 existing, additive only)
Files WILL create: 8 new files (~1,420 lines)
Files WILL NOT touch: All order/payment/settlement/menu/report/socket/context files
Owner decisions: OQ-1 (delete curl), OQ-2 (icon), OQ-3 (sidebar position)
Docs: memory/impact/CR_059_PHASE1_IMPACT_ANALYSIS.md
Next: Owner review → Gate 3 (Implementation Plan)
```
