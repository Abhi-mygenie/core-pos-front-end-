# CR-086 — Current Stock & Ingredients UX Overhaul: Card Filters, Proper Export, PDF, Bulk Editor

**ID:** CR-086
**Type:** CR (Change Request)
**Created:** 2026-07-20
**Severity:** P2 (MEDIUM)
**Risk:** HIGH
**Module:** Inventory — Current Stock + Ingredients
**Duplicate Check:** RELATED to CR-075 (S1 export — PARTIALLY SHIPPED), CR-081 (HALTED — design alignment), CR-085 (consolidation). DISTINCT new scope from owner feedback.
**Code Reality:** NONE
**Source:** OWNER-REPORTED (this session)
**Confidence:** CONFIRMED

---

## Description

Enhancement package for Current Stock and Ingredients screens based on owner feedback. Separated from BUG-211/BUG-212 (quick fixes) — this CR covers larger UX improvements.

### Feature 1: Current Stock — Card-Based Filter UX
- Replace KPI cards + separate status chips with unified card filters
- Click KPI card → filters table + highlights card with ring/active state
- Remove separate status chip row (redundant once cards are clickable)
- Cards become the ONLY filter mechanism (cleaner, less visual noise)

### Feature 2: Current Stock — Export Field Fix
- Current export (`Purchase_List.xlsx`) has purchase-oriented columns — WRONG for stock view
- **Current fields:** Ingredient_id, PurchaseDate, Title, CurrentStock, Unit, Quantity, Amount, Payment_Type, Batch, Brand, Expiry, Expiry Date, Converion Factor
- **Suggested fields:** Ingredient Name, Category, Base Unit, Current Stock, Status (In Stock/Low/Out), Days Left, Vendor, Min Alert Threshold, Small Unit, Last Purchase Date, Last Purchase Rate, Conversion Factor
- Either fix backend export endpoint OR generate client-side Excel from table data

### Feature 3: Current Stock — PDF Export
- Add PDF download alongside Excel
- PDF report with: title, date, restaurant name, table with all stock items, KPI summary at top
- Suggested library: jsPDF + jsPDF-AutoTable (client-side) or backend PDF endpoint

### Feature 4: Ingredient Bulk Editor
- Spreadsheet-style editor matching RecipeBulkEditor and Menu BulkEditor patterns
- Columns: Name, Category (dropdown), Base Unit (dropdown), Small Unit, Conversion Factor, Min Qty Alert, Min Unit Alert
- Features: inline edit all rows, batch save, add new rows, delete rows
- Wire the existing Import endpoint (`/import-inventory`) for Excel upload
- Estimated: ~400-500 lines new component (`IngredientBulkEditor.jsx`)

### Feature 5: Ingredient Import Wiring
- Import button currently disabled ("Coming soon")
- Service function `importIngredients(formData)` already exists
- Wire file input → upload → refresh list

---

## Open Questions (Owner Decisions)

| # | Question |
|---|----------|
| Q1 | Export fix: should we fix the backend endpoint to return correct fields, or generate Excel client-side from the displayed table data? |
| Q2 | PDF: client-side generation (jsPDF) or request a backend PDF endpoint? |
| Q3 | Bulk Editor: should it support category CRUD inline (add new category from within the editor) or just select from existing? |
| Q4 | Import: what template format does the backend expect? Need sample file. |

## Blast Radius
- 5+ files: CurrentStockPanel.jsx, InventorySetupPanel.jsx, NEW IngredientBulkEditor.jsx, inventoryService.js, inventoryTransform.js
- ~400-600 lines new/modified
- Hotspot: NO
- Scope: LARGE (6+ files)

## Next
Planning Gate 2 → Gate 3 → Owner Gate 4 GO → Implementation
