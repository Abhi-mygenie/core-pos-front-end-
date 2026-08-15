# QA Handover — Inventory Batch 2026-07-21

**Date:** 2026-07-21
**From:** QA Agent (pre-test)
**Scope:** BUG-211, BUG-212, CR-086 (F1-F4), CR-085 Phase 1, BUG-213
**Pod:** pos-front-deploy-7.preview.emergentagent.com
**Auth note:** Login takes 25-30s. Use 40s timeout. Use in-app navigation only.

---

## Credentials
| Tenant | Email | Password |
|--------|-------|----------|
| Kunafa Mahal (main) | owner@kunafamahal.com | Qplazm@10 |

---

## Test Cases

### GROUP 1 — BUG-211: Current Stock Sort + KPI Click Filters

| ID | Screen | Action | Expected | data-testid |
|----|--------|--------|----------|-------------|
| T1-1 | Current Stock | Load page | Rows sorted: Out of Stock first, then Low Stock, then In Stock | `stock-table`, `status-out`, `status-low`, `status-ok` |
| T1-2 | Current Stock | Click kpi-out card | Table filters to Out of Stock rows only. Card gets ring/highlight | `kpi-out`, `status-out` |
| T1-3 | Current Stock | Click kpi-out again | Filter clears — all rows show again | `kpi-out` |
| T1-4 | Current Stock | Click kpi-low card | Table filters to Low Stock only | `kpi-low`, `status-low` |
| T1-5 | Current Stock | Verify no chip row | No status chip strip below KPI cards (chips removed — Option A) | absence of chip row |

### GROUP 2 — BUG-212: Ingredients Edit + Add Form + Export

| ID | Screen | Action | Expected | data-testid |
|----|--------|--------|----------|-------------|
| T2-1 | Ingredients | Load page | Ingredient list visible with rows | `ingredient-table`, `ingredients-tab` |
| T2-2 | Ingredients | Click pencil icon on any ingredient | Blue-bordered inline edit row appears with pre-filled data | `ingredient-edit-{id}`, `ingredient-edit-row-{id}` |
| T2-3 | Ingredients | In edit row: change name, click Save | Success toast OR row updates. No page refresh required. | `save-edit-ingredient` |
| T2-4 | Ingredients | Click Add Ingredient | Add form row appears with 7 fields: name, unit, small unit, conversion, min qty, min unit, category | `add-ingredient-btn`, `new-ingredient-name`, `new-ingredient-unit`, `new-ingredient-small-unit`, `new-ingredient-conversion`, `new-ingredient-min-qty`, `new-ingredient-min-unit`, `new-ingredient-category` |
| T2-5 | Ingredients | Click Export button | API call triggered (NOT a toast saying "coming soon") — file downloads or success indicator | `ingredient-export-btn` |

### GROUP 3 — CR-086: Current Stock Exports + IngredientBulkEditor

| ID | Screen | Action | Expected | data-testid |
|----|--------|--------|----------|-------------|
| T3-1 | Current Stock | Click Excel export button | File download triggered (xlsx/csv) OR success toast — NOT an error | `stock-export-btn` |
| T3-2 | Current Stock | Click PDF export button | PDF download or new window opened — NOT an error | `stock-pdf-btn` |
| T3-3 | Ingredients | Click "Bulk Edit" button | Transitions to IngredientBulkEditor view (replaces ingredient list) | `ingredient-bulk-edit-btn`, `ingredient-bulk-editor` |
| T3-4 | BulkEditor | Inspect toolbar | Title "Bulk Edit Ingredients" visible as first toolbar element | `bulk-editor-title` |
| T3-5 | BulkEditor | Inspect table | Ingredients grouped by category, column headers: Ingredient Name, Category, Base Unit, Small Unit, Conversion, Min Qty, Min Unit, Status | `bulk-table`, `bulk-cat-header-{id}` |
| T3-6 | BulkEditor | Edit a cell (e.g. name field) | Row turns amber highlight + left amber border | `bulk-row-{key}`, `bulk-name-{key}` |
| T3-7 | BulkEditor | After editing a cell | Save button enabled (not disabled) | `bulk-save` |
| T3-8 | BulkEditor | Click Add Item button | New row added at top with green highlight | `bulk-add-item`, `bulk-row-new-*` |
| T3-9 | BulkEditor | Click Excel export button | File downloads — NOT an error | `bulk-excel` |
| T3-10 | BulkEditor | Click Close button | Returns to Ingredients list view | `bulk-close`, `ingredient-table` |

### GROUP 4 — CR-085 Phase 1: Dashboard Design

| ID | Screen | Action | Expected | data-testid |
|----|--------|--------|----------|-------------|
| T4-1 | Inventory Dashboard | Load page | Reorder Forecast table has visible grid borders on rows/columns | `reorder-forecast-table` |
| T4-2 | Dashboard | Inspect Recipe Cost & Margin widget | Table renders with 5 columns: Recipe, Cost/Serve, Sale ₹, Margin badge (colored), Δ vs Prev | `recipe-margin-table` |
| T4-3 | Dashboard | Inspect Recipe margin values | Cost and Sale price NOT showing ₹0 for all rows (real values from prior BUG-207 fix) | `recipe-margin-table` |
| T4-4 | Dashboard | Inspect KPI cards | 4 cards visible with numbers (not all "0" or blank) | `kpi-cards-row` |
| T4-5 | Recipes | Open Recipe Bulk Editor | Column visibility toggle button present in toolbar | `bulk-col-toggle` |

### GROUP 5 — BUG-213: BulkEditor Page Title

| ID | Screen | Action | Expected | data-testid |
|----|--------|--------|----------|-------------|
| T5-1 | BulkEditor toolbar | Navigate to Ingredients → Bulk Edit | Element with data-testid="bulk-editor-title" exists and contains text "Bulk Edit Ingredients" | `bulk-editor-title` |

---

## Navigation Path
1. Login: owner@kunafamahal.com / Qplazm@10
2. Sidebar → Inventory icon
3. Current Stock pill → GROUP 1 tests
4. Ingredients pill (SETUP group) → GROUP 2 + GROUP 3 + GROUP 5 tests
5. Dashboard pill → GROUP 4 tests
6. Sidebar → Inventory → Recipes pill → RecipeBulkEditor → GROUP 4 T4-5

## Files Reference
| Component | File |
|-----------|------|
| Current Stock | `components/inventory/CurrentStockPanel.jsx` |
| Ingredients Setup | `components/inventory/InventorySetupPanel.jsx` |
| Ingredient Bulk Editor | `components/inventory/IngredientBulkEditor.jsx` |
| Dashboard | `components/inventory/InventoryIntelligencePanel.jsx` |
| Recipe Bulk Editor | `components/inventory/RecipeBulkEditor.jsx` |
