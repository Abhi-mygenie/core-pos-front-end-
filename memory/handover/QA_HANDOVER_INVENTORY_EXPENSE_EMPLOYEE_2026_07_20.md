# QA Handover — Inventory + Expense + Employee Modules

**Date:** 2026-07-20
**From:** Implementation Agent (CR-081 / BUG-210 / CR-084 session)
**To:** QA Agent
**Scope:** 23 IMPLEMENTED items without formal QA across 3 modules
**Priority Order:** Inventory (today's work first) → Expense → Employee

---

## 1. Environment & Credentials

| Key | Value |
|---|---|
| **Frontend URL** | `https://core-pos-dev-2.preview.emergentagent.com` |
| **Backend API** | `https://preprod.mygenie.online` (external Laravel backend) |
| **Login endpoint** | `POST /api/v1/auth/vendoremployee/login` |
| **Auth note** | Pod restarts clear auth. Use in-app sidebar navigation, NOT direct URL navigation. Login takes 25+ seconds to complete. |

### Test Accounts

| Tenant | Email | Password | RID | Type | Best For |
|---|---|---|---|---|---|
| **Kunafa Mahal** | owner@kunafamahal.com | Qplazm@10 | 689 | normal | Inventory (116 items, 12 vendors, 50 OOS), Expense, Employee |
| **Palm India** | owner@palmindia.com | Qplazm@10 | 816 | franchise | Inventory (franchise features: Receive tab, transfer) |
| **Cafe103** | owner@cafe103.com | Qplazm@10 | 644 | normal | Alternative for expense/employee |

---

## 2. Navigation Guide

**Sidebar:** Left icon bar → hover to expand → click module.

**Inventory screens** (all have top pill tab bar with OPERATIONS + SETUP groups):
- Dashboard: Sidebar → Inventory → Dashboard pill
- Current Stock: Sidebar → Inventory → Current Stock pill
- Smart Purchase: Sidebar → Inventory → Smart Purchase pill
- Stock Audit: Sidebar → Inventory → Stock Audit pill
- Ingredients: Sidebar → Inventory → Ingredients pill (SETUP group)
- Vendors: Sidebar → Inventory → Vendors pill (SETUP group)
- Wastage Reasons: Sidebar → Inventory → Wastage Reasons pill (SETUP group)
- Recipes: Sidebar → Inventory → Recipes pill (SETUP group)

**Expense screens:**
- Sidebar → Expense icon → Expense Setup (categories + items)
- Sidebar → Expense icon → Expense Entry (daily transactions)
- Sidebar → Expense icon → Expense Report

**Employee screens:**
- Sidebar → Employee icon → Employee Management

---

## 3. QA Batches (Priority Order)

### BATCH A: Today's Implementation (P0 — test first)

#### A1: CR-081 — Inventory V5 Design Alignment (7 work units)

| Test | Screen | What to Verify | data-testid |
|---|---|---|---|
| A1-1 | ALL inventory | Top pill tab bar: OPERATIONS (Dashboard · Current Stock · Smart Purchase · Stock Audit) + SETUP (Ingredients · Recipes · Vendors · Wastage Reasons). Click each → correct page. Active = dark pill. | `inventory-tab-bar`, `nav-dashboard`, `nav-current-stock`, `nav-smart-purchase`, `nav-audit`, `nav-ingredients`, `nav-recipes`, `nav-vendors`, `nav-wastage` |
| A1-2 | Dashboard | 4 KPI cards rendered with numbers: Reorder Alerts, Wastage Value (P2 badge), Cost Change %, Recipes at Risk | `kpi-reorder-alerts`, `kpi-wastage-value`, `kpi-cost-change`, `kpi-recipes-at-risk` |
| A1-3 | Dashboard | Low-Stock Alerts strip visible below KPIs (≤5 items with "Out of stock" or "~Xd left") | `low-stock-alerts` |
| A1-4 | Dashboard | Time range chips (7d/14d/30d) clickable + Export button | `time-range-7d`, `time-range-14d`, `time-range-30d`, `dashboard-export-btn` |
| A1-5 | Dashboard | Reorder Forecast: proper `<table>` with 5 columns (Ingredient, Current, Days Left, Suggest Reorder, Preferred Vendor). Grid borders visible. Header bg-slate-50. | `reorder-forecast-table` |
| A1-6 | Dashboard | Consumption Trends: line chart renders with ingredient dropdown, AVG/DAY + TOTAL + Δ VS PREV stats below chart | `widget-consumption-trends`, `consumption-chart`, `consumption-ingredient-select` |
| A1-7 | Dashboard | Cost Trend per Ingredient: proper `<table>` with 4 columns (Ingredient, Current Rate, Trend sparkline, Δ vs Prev). Title says "Cost Trend per Ingredient". | `cost-trend-table` |
| A1-8 | Dashboard | Recipe Cost & Margin: proper `<table>` with 5 columns (Recipe, Cost/Serve, Sale ₹, Margin badge, Δ vs Prev). Legend dots (green/amber/red) in header row. | `recipe-margin-table` |
| A1-9 | Current Stock | 6 column headers: INGREDIENT, CATEGORY, CURRENT STOCK, STATUS, DAYS LEFT, VENDOR. Grid borders. | `stock-table` |
| A1-10 | Current Stock | Row status icons: ⚠ (amber) for Low Stock, ⊗ (red) for Out of Stock before ingredient name | `stock-row-*` |
| A1-11 | Current Stock | DAYS LEFT column: colored badges (red ≤3d, amber ≤7d, green >7d, — for no data) | `stock-row-*` |
| A1-12 | Smart Purchase | Section header: "AUTO SHOPPING LIST · 7-DAY HORIZON" (reflects selected chip, not item count) | `auto-shopping-list` |
| A1-13 | Smart Purchase | "Review & Submit" green button top-right. "24 items suggested" badge. "+ Add Ad-hoc Item" link. | `smart-purchase-review-submit`, `add-adhoc-header` |
| A1-14 | Stock Audit | Save Adjustments button always visible in header (disabled when no entries). Drift shows colored icons (TrendingDown red, Check green, TrendingUp green). Reason dropdown disabled = "N/A" when no drift. | `audit-save-btn`, `audit-row-*` |
| A1-15 | Ingredients | Toolbar: Export + Import (disabled) + Bulk Edit (disabled) + Add Ingredient. Category sidebar: orange left border + orange count badge on selected. | `ingredient-export-btn`, `ingredient-import-btn`, `ingredient-bulk-edit-btn`, `cat-*` |
| A1-16 | Wastage Reasons | Card-style layout (NOT table). Add form has orange border (border-orange-300). Edit/delete icons on each card. | `wastage-cards`, `wastage-add-row` |
| A1-17 | Tab routing | No internal sub-tabs (Ingredients/Vendors/Wastage) inside the page. Top pill bar is the ONLY navigation. Click Vendors pill → vendor content shows directly. | Absence of `setup-tab-ingredients` etc. |

#### A2: BUG-210 — Dashboard Widget Calculation Fixes

| Test | What to Verify | Expected for Kunafa Mahal |
|---|---|---|
| A2-1 | Reorder Forecast table has data rows (NOT "Not enough consumption data") | 8 rows including Butter, cake gel, Caramel Paste with "0d" red badge |
| A2-2 | Cost Trend table has data rows (NOT "No purchase history") | 6 rows with rates like "₹35 / gm", sparkline trends |
| A2-3 | KPI "Reorder Alerts" > 0 | Should be ~49 (counts out-of-stock items) |
| A2-4 | Low-Stock Alerts strip visible | 5 items showing "Out of stock" |
| A2-5 | Cost Trend footer text | "Last 30 days vs prior 30 days · rate change per unit" |

#### A3: CR-084 — Vendor Management CRUD

| Test | What to Verify | data-testid |
|---|---|---|
| A3-1 | Vendors tab shows actual vendor names (Kunafabake, Rahul Grocery, etc.) NOT vendor types | `vendor-table`, `vendor-row-*` |
| A3-2 | Table columns: VENDOR NAME, CONTACT PERSON, PHONE, TYPE, GST, ACTIONS | header row |
| A3-3 | Type badges: colored pills (Online Vendor=sky, Wholesale=blue, Retail=green, Grocery=purple, Restaurant=orange) | `vendor-row-*` |
| A3-4 | "Add Vendor" → orange-bordered inline form row at top with 8 fields (Name*, Contact, Phone, Type dropdown, GST, Email, Address, Save) | `vendor-add-row`, `vendor-form-name`, `vendor-form-save` |
| A3-5 | Click edit pencil → blue-bordered inline edit row with pre-filled data | `vendor-edit-row-*`, `vendor-edit-*` |
| A3-6 | Cancel on add/edit → form row disappears | — |
| A3-7 | Search filters by vendor name | `vendor-search` |
| A3-8 | Vendor count in toolbar (e.g. "12 vendors") | — |
| A3-9 | **WRITE TEST (careful):** Add a test vendor "QA Test Vendor" → appears in list → Edit it → Update name → Delete it → Confirm list restored | `vendor-form-save`, `vendor-delete-*` |

---

### BATCH B: Inventory Legacy (from prior sessions)

#### B1: BUG-196 — Sidebar on Inventory/Employee Pages

| Test | What to Verify |
|---|---|
| B1-1 | All 6 inventory pages have the left sidebar visible |
| B1-2 | Employee Management page has the left sidebar visible |

#### B2: BUG-197 — CR-072 Inventory Post-Delivery (10 gaps)

| Test | What to Verify | data-testid |
|---|---|---|
| B2-1 | Recipes: standard recipe create (store-recipe API) | `recipe-form-*` |
| B2-2 | Recipes: standard recipe edit (update-recipe API) | `recipe-card-*` |
| B2-3 | Recipes: sub-recipe create/edit | |
| B2-4 | Recipes: addon-recipe create/edit | |
| B2-5 | Ingredients: Add Ingredient with name, category, unit → appears in list | `add-ingredient-btn`, `new-ingredient-name` |
| B2-6 | Wastage Reasons: Add, Edit, Toggle Status, Delete | `add-wastage-btn`, `wastage-edit-*`, `wastage-toggle-*`, `wastage-delete-*` |
| B2-7 | Smart Purchase: Submit purchase → success toast (if data available) | `smart-purchase-submit` |

---

### BATCH C: Employee

#### C1: BUG-198 — Employee Post-Delivery

| Test | What to Verify |
|---|---|
| C1-1 | Employee list loads with names | |
| C1-2 | Add Employee: form fields, save (POST), appears in list | |
| C1-3 | Edit Employee: click edit → form pre-filled, update (PUT) | |
| C1-4 | Password field has eye toggle for visibility | |
| C1-5 | Status toggle: enable/disable employee | |
| C1-6 | Email field can be empty (omit-if-empty rule) | |

---

### BATCH D: Expense (17 items — largest batch)

#### D1: Expense Setup (BUG-150, 158, 159, 160, 161, 162, 163, 164, 165, 202, 203)

| Test | What to Verify | Bug |
|---|---|---|
| D1-1 | Categories load in left sidebar | BUG-162 |
| D1-2 | Add Category: type name → save → appears in sidebar | BUG-159 |
| D1-3 | Rename Category: click → edit name → save | BUG-160 |
| D1-4 | Add Item to category: type name → save → appears in list | BUG-158 |
| D1-5 | Duplicate category name shows error (not success) | BUG-164 |
| D1-6 | Duplicate item name shows error/warning | BUG-165 |
| D1-7 | Bulk Save: add multiple items → save all | BUG-161 |
| D1-8 | Drag & Drop: move item between categories (may have limitations) | BUG-150 |
| D1-9 | Export button works (no "type field required" error) | BUG-163 |
| D1-10 | Inline edit item: click item → name editable + unit price field shows | BUG-202, BUG-203 |
| D1-11 | No flicker on add/edit/delete mutations | BUG-162 |

#### D2: Expense Entry (BUG-151, 152, 153, 175, 176, 177, 178, 181, 204, 205)

| Test | What to Verify | Bug |
|---|---|---|
| D2-1 | Add expense: select category → item → enter amount → save | BUG-153 |
| D2-2 | Edit transaction: click edit → row becomes editable → save | BUG-151 |
| D2-3 | Delete transaction: click delete → confirm → removed | BUG-152 |
| D2-4 | Priced item (Case A): qty input visible, amount = unitPrice × qty auto-calc | BUG-175, BUG-204 |
| D2-5 | Non-priced item (Case B): optional qty/unit/physical_qty fields visible | BUG-176 |
| D2-6 | Notes field present in add form | BUG-177 |
| D2-7 | Item name NOT editable in edit mode (read-only) | BUG-178 |
| D2-8 | "Added By" column visible in transaction table | BUG-181 |
| D2-9 | Qty + Unit columns visible in transaction table | BUG-205 |

#### D3: Expense Report (BUG-179, 180)

| Test | What to Verify | Bug |
|---|---|---|
| D3-1 | Excel export downloads file with transaction data | BUG-179 |
| D3-2 | PDF export opens report window (no error) | BUG-180 |

---

## 4. Regression Tests (cross-module)

| Test | What to Verify |
|---|---|
| R1 | Login → Dashboard loads → navigate to Inventory Dashboard → back to main Dashboard → no errors |
| R2 | Inventory: navigate all 8 pills (Dashboard → Current Stock → Smart Purchase → Stock Audit → Ingredients → Recipes → Vendors → Wastage) → each loads, no blank screens |
| R3 | Expense: Setup → Entry → Report → back to Setup → no flicker/data loss |
| R4 | Logout → Login as different restaurant → verify no data leak from previous session |

---

## 5. Known Limitations (NOT bugs)

| Item | Explanation |
|---|---|
| Import/Bulk Edit buttons disabled on Ingredients | Placeholder — no backend endpoint yet |
| Wastage Value KPI shows "—" with P2 badge | Backend wastage endpoint not deployed (Phase 2) |
| Consumption Trends chart flat for some restaurants | Restaurant-specific: no consumption data logged |
| Cost Trend empty for Palm India | No purchase history in 60-day window for that restaurant |
| Receive tab hidden for normal restaurants | Franchise-only feature (visible for Palm India) |

---

## 6. Files Reference (for tracing failures)

### Inventory
| Component | File |
|---|---|
| Tab Bar | `components/inventory/InventoryTabBar.jsx` |
| Dashboard | `components/inventory/InventoryIntelligencePanel.jsx` |
| Dashboard Widgets | `components/inventory/widgets/*.jsx` (6 files) |
| Current Stock | `components/inventory/CurrentStockPanel.jsx` |
| Smart Purchase | `components/inventory/SmartPurchasePanel.jsx` + `smart/*.jsx` (4 files) |
| Stock Audit | `components/inventory/StockAuditPanel.jsx` |
| Setup (Ingredients/Vendors/Wastage) | `components/inventory/InventorySetupPanel.jsx` |
| Recipes | `components/inventory/RecipeManagementPanel.jsx` + `RecipeFormPanel.jsx` + `RecipeBulkEditor.jsx` |
| API/Transforms | `api/services/inventoryService.js`, `api/transforms/inventoryTransform.js` |

### Expense
| Component | File |
|---|---|
| Setup | `components/expense/ExpenseSetupPanel.jsx` |
| Entry | `components/expense/ExpenseEntryPanel.jsx` |
| API | `api/services/expenseService.js`, `api/transforms/expenseTransform.js` |

### Employee
| Component | File |
|---|---|
| Management | `pages/EmployeeManagementPage.jsx` |

---

## 7. Registry Sync Note

All 23 items are in `registry.json` with status IMPLEMENTED. QA agent should update status to QA PASS or QA FAIL per item after testing. Use standard QA report format at `/app/memory/test_reports/QA_REPORT_<DATE>.md`.
