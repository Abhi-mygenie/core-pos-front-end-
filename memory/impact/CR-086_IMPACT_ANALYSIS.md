# CR-086 — Impact Analysis (Gate 2)

**ID:** CR-086
**Stage:** Impact Analysis (Gate 2)
**Date:** 2026-07-21
**Code Reality:** PARTIAL — Feature 1 FULL (done by BUG-211), Features 2-5 NONE
**Risk:** HIGH (new component + API wiring + client-side file generation)
**Conflict Pre-Check:** BUG-211/BUG-212 just modified CurrentStockPanel + InventorySetupPanel today. No conflict — CR-086 builds ON TOP of those changes. CR-081 (HALTED) absorbed into CR-085 — no conflict.

---

## Feature-by-Feature Analysis

### Feature 1: Card-Based Filter UX — ⚠️ ALREADY IMPLEMENTED (BUG-211)

**Code Reality: FULL**

BUG-211 (implemented 2026-07-21) delivered exactly this:
- KPI cards are clickable toggle filters with ring highlight
- Status chip row removed (Option A per owner decision)
- Default sort: Out of Stock → Low Stock → In Stock

**Recommendation:** Close F1 from CR-086 scope. Already shipped.

---

### Feature 2: Current Stock — Export Field Fix

**Code Reality: NONE**

**Data Flow Trace:**
```
UI: handleExport() → inventoryService.exportStock()
→ GET /api/v2/vendoremployee/inventory/export-stock
→ Backend returns Purchase_List.xlsx (purchase-oriented columns)
→ User gets wrong fields for stock view
```

**Current export fields (from backend):** Ingredient_id, PurchaseDate, Title, CurrentStock, Unit, Quantity, Amount, Payment_Type, Batch, Brand, Expiry, Expiry Date, Converion Factor

**Desired fields (per intake):** Ingredient Name, Category, Base Unit, Current Stock, Status (In/Low/Out), Days Left, Vendor, Min Alert Threshold, Small Unit, Last Purchase Date, Last Purchase Rate, Conversion Factor

**Two approaches:**
- **A (Backend fix):** Request backend to add a new endpoint or query param returning stock-oriented columns. FE change: 0 lines.
- **B (Client-side):** Generate Excel from `filtered` array using a library (e.g., `xlsx` / `SheetJS`). FE change: ~40-60 lines in CurrentStockPanel.jsx + `yarn add xlsx`.

**Dependency:** If approach B — `xlsx` library (~200KB gzipped) needs to be added to package.json.

**Owner Decision Required: OD-086-Q1**

---

### Feature 3: Current Stock — PDF Export

**Code Reality: NONE**

No PDF generation anywhere in the codebase. `jspdf` not in package.json.

**Two approaches:**
- **A (Client-side jsPDF):** `yarn add jspdf jspdf-autotable`. Generate PDF from `filtered` array + KPI summary. ~60-80 lines handler in CurrentStockPanel.jsx.
- **B (Backend endpoint):** Request backend PDF endpoint. FE change: ~10 lines (just call API + download).

**Dependency:** If approach A — `jspdf` + `jspdf-autotable` (~280KB gzipped) added to package.json.

**Owner Decision Required: OD-086-Q2**

---

### Feature 4: Ingredient Bulk Editor

**Code Reality: NONE**

No `IngredientBulkEditor.jsx` exists. But 4 existing BulkEditor patterns are established:
- `BulkEditor.jsx` (Menu) — 1066 lines (most mature, 33 columns)
- `ExpenseBulkEditor.jsx` — 979 lines (selection banner, bulk ops)
- `RecipeBulkEditor.jsx` — 607 lines (expandable ingredient rows)
- `TableBulkEditor.jsx` — simplest pattern

**Recommended pattern:** Follow `ExpenseBulkEditor.jsx` structure (closest match):
- Category-grouped rows (like expense categories)
- Inline edit all fields
- Checkbox select for bulk delete/move
- Dirty tracking (amber rows)
- Save bar with batch PUT/POST

**Columns:** Name, Category (dropdown), Base Unit (dropdown), Small Unit (dropdown), Conversion Factor (number), Min Qty Alert (number), Min Unit Alert (number)

**Estimated scope:** ~450-550 lines new file + ~15 lines wiring in InventorySetupPanel.jsx

**API endpoints needed:**
- Read: `getIngredients()` ✅ exists
- Add: `addIngredient()` ✅ exists
- Update: `updateIngredient()` ✅ exists (just added by BUG-212)
- Delete: `deleteIngredient()` ✅ exists
- Categories: `getCategories()` ✅ exists
- Units: `getUnits()` ✅ exists

All CRUD endpoints available — no API blocker.

**Owner Decision Required: OD-086-Q3** — Category CRUD inline (add new category from within editor)?

---

### Feature 5: Ingredient Import Wiring

**Code Reality: PARTIAL**

- Service function `importIngredients(formData)` ✅ EXISTS at inventoryService.js:32
- Endpoint `IMPORT_INVENTORY` ✅ EXISTS at constants.js:153
- UI button exists but disabled ("Coming soon") at InventorySetupPanel.jsx line 158

**What's needed:**
- File input dialog (hidden `<input type="file">`)
- Upload handler calling `inventoryService.importIngredients()`
- Enable the Import button
- ~20-30 lines change in InventorySetupPanel.jsx

**Owner Decision Required: OD-086-Q4** — What template format does backend expect? Need sample file to validate.

---

## Affected Files Summary

| Feature | Files | Change Type | Est. Lines |
|---------|-------|-------------|------------|
| F1 | — | ALREADY DONE (BUG-211) | 0 |
| F2 | CurrentStockPanel.jsx + (yarn add xlsx?) | Export handler rewrite | 40-60 |
| F3 | CurrentStockPanel.jsx + (yarn add jspdf?) | New PDF handler | 60-80 |
| F4 | NEW IngredientBulkEditor.jsx + InventorySetupPanel.jsx | New component + toggle wiring | 450-570 |
| F5 | InventorySetupPanel.jsx | Import handler + enable button | 20-30 |

**Total estimated: ~570-740 lines across 3-4 files (excluding F1)**

---

## Owner Decision Queue

| # | Question | Options | Impact |
|---|----------|---------|--------|
| **OD-086-Q1** | Export field fix approach? | **A:** Backend endpoint fix (0 FE lines, needs backend work) / **B:** Client-side Excel from table data (40-60 lines, +xlsx dep) | Blocks F2 |
| **OD-086-Q2** | PDF generation approach? | **A:** Client-side jsPDF (+jspdf dep, 60-80 lines) / **B:** Backend PDF endpoint (10 lines FE, needs backend) | Blocks F3 |
| **OD-086-Q3** | Bulk Editor: inline category CRUD? | **A:** Select from existing categories only (simpler, ~450 lines) / **B:** Add new category inline (+50 lines, needs `storeCategory()` wiring) | Scope of F4 |
| **OD-086-Q4** | Import template format? | Need sample file or backend docs to validate columns. Does backend accept same format as export? | Blocks F5 |
| **OD-086-Q5** | Should F1 be closed from CR-086 scope? | Already shipped as BUG-211. Recommend closing. | Scope cleanup |

---

## Next
Impact Analysis complete. Awaiting owner decisions on OD-086-Q1 through Q5 before Gate 3 (Implementation Plan).
