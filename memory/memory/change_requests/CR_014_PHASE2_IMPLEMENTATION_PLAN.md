# CR-014 Phase 2 — Implementation Plan (Gate 3)

**Status:** COMPLETE
**Date:** 2026-06-08
**Author:** Agent
**Prerequisite:** Gate 2 Impact Analysis + Mockup approved by owner

---

## 1. Scope Lock

### Files to CREATE (1 new)

| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/components/panels/menu/BulkEditor.jsx` | Production bulk editor (replaces BulkEditorMockup.jsx) | ~550 |

### Files to MODIFY (2 existing)

| File | Change | Lines Changed |
|------|--------|---------------|
| `MenuManagementPanel.jsx` | Already wired — swap `BulkEditorMockup` import → `BulkEditor` | 1 line (import) |
| `menuManagementTransform.js` | Add `toAPI.bulkFoodInfo()` — lightweight version of `toAPI.foodInfo()` that only includes changed fields | ~30 lines appended |

### Files NOT Touched

| File | Reason |
|------|--------|
| `menuManagementService.js` | All APIs already wired (`editFood`, `addFood`, `getFoodsList`) — zero changes |
| `ProductList.jsx` | Card view — untouched |
| `ProductCard.jsx` | Card view — untouched |
| `ProductForm.jsx` | Full edit form — untouched |
| `CategoryList.jsx` | Category sidebar — untouched |
| ALL order-taking files | Zero touch — independent data flow |
| ALL report files | Zero touch |

---

## 2. Component Architecture — `BulkEditor.jsx`

### Props (from MenuManagementPanel)
```
foods: Array          — transformed food items from getFoodsList
categories: Array     — from getCategories API
menuType: string      — current menu type (Normal/Party/Premium)
onRefresh: Function   — callback to re-fetch foods after save
onClose: Function     — exit bulk edit mode
```

### Internal State
```
rows: Array           — editable copy of foods (each row has _id, _original, _isNew, _saveStatus)
visibleCols: Object   — { columnKey: boolean } — Tier 1 = true by default
search: string        — filter rows by name/category/code
sortCol: string|null  — active sort column
sortDir: 'asc'|'desc'
showColPicker: boolean
collapsedTiers: Object — { tierNum: boolean } — Tier 2/3/4 collapsed by default
saveProgress: Object  — { total, done, failed, inFlight } — live progress during batch save
```

### Derived State (useMemo)
```
groupedRows        — rows grouped by category (A→Z), items sorted A→Z within groups
dirtyCount         — count of rows with at least one changed field
dirtyRows          — array of rows that need saving
activeColumns      — ALL_COLUMNS filtered by visibleCols
```

---

## 3. Column Definitions (ALL_COLUMNS)

### Tier 1 — Default ON (10 columns)

| # | Key | Label | Cell Type | Width | Notes |
|---|-----|-------|-----------|-------|-------|
| 1 | productName | Name | text input | 200px | alwaysVisible, required |
| 2 | categoryId | Category | dropdown | 170px | options from categories API |
| 3 | basePrice | Price | number input | 90px | required, right-aligned, mono |
| 4 | status | Status | toggle pill | 85px | Active (green) / Off (grey) |
| 5 | itemType | Type | dropdown + dot | 100px | NV/Veg/Egg/Jain with color dot |
| 6 | taxPercent | Tax % | number input | 75px | step=0.01 |
| 7 | taxType | Tax Type | dropdown | 95px | GST / VAT |
| 8 | description | Description | text input | 180px | placeholder |
| 9 | packedFood | Packaged Item | Yes/No pill | 105px | blue=Yes, grey=No |
| 10 | isInventory | Inventory | Yes/No pill | 90px | blue=Yes, grey=No |

### Tier 2 — Pricing & Availability (9 columns, OFF by default)

| Key | Label | Cell Type |
|-----|-------|-----------|
| discount | Discount | number |
| discountType | Discount Type | dropdown (percent/amount) |
| giveDiscount | Give Discount | Yes/No |
| liveWeb | Live Web | Yes/No |
| dineIn | Dine-in | Yes/No |
| delivery | Delivery | Yes/No |
| takeaway | Takeaway | Yes/No |
| complementary | Complementary | Yes/No |
| complementaryPrice | Comp. Price | number |

### Tier 3 — Operations (9 columns, OFF by default)

| Key | Label | Cell Type |
|-----|-------|-----------|
| prepTimeMin | Prep Time | number |
| serveTimeMin | Serve Time | number |
| packCharges | Pack Charges | number |
| takeawayCharge | Takeaway Charge | number |
| deliveryCharge | Delivery Charge | number |
| availableTimeStart | Avail. Start | time |
| availableTimeEnd | Avail. End | time |
| itemCode | Item Code | text |
| sortOrder | Sort Order | number |

### Tier 4 — Info (5 columns, OFF by default)

| Key | Label | Cell Type |
|-----|-------|-----------|
| allergen | Allergens | text |
| kcal | Kcal | number |
| portionSize | Portion Size | text |
| itemUnit | Item Unit | text |
| itemUnitPrice | Unit Price | number |

---

## 4. Category Grouping Logic

```
Input: rows[] (flat array)
Output: groupedRows[] (mixed array of headers + data rows)

Algorithm:
1. Filter by search (name, category, itemCode)
2. Group into Map<categoryName, row[]>
3. Sort category keys A→Z (localeCompare)
4. Within each group, sort items A→Z by productName
5. If sortCol active, override within-group sort
6. Emit: [{ _type: "header", catName, count }, row, row, ..., { _type: "header" }, row, ...]
```

Category header rows render as a full-width `<tr>` with:
- Orange left-border accent bar
- Category name (uppercase)
- Item count badge

---

## 5. Dirty Detection

### Per-field comparison
Each field has a comparison function: `isDirty(row, fieldKey) → boolean`
- Compares `row[fieldKey]` against `row._original[mappedOriginalKey]`
- Handles type coercion (number vs string, boolean vs "Yes"/"No")
- New rows (`_isNew=true`) are always dirty

### Row-level dirty
`isRowDirty(row)` = any field is dirty (used for count + highlighting)

### Cell highlighting
Dirty cells get `bg-amber-100/60` background. Dirty rows get `bg-amber-50/40`.

---

## 6. Save Strategy

### Batch parallel with concurrency limit

```
User clicks "Save N Changes"
  → Collect dirtyRows
  → Set all to _saveStatus: "saving"
  → Process in batches of 5 concurrent requests:
      - Existing row → editFood(id, toAPI.bulkFoodInfo(row, row._original))
      - New row → addFood(toAPI.bulkFoodInfo(row))
  → Per-row callback:
      - Success → _saveStatus: "saved", update _original to new values
      - Error → _saveStatus: "error", show error in toast
  → After all complete:
      - Show summary toast: "✓ 11 saved, ✗ 1 failed"
      - Call onRefresh() to re-fetch fresh data from API
      - Failed rows remain editable for retry
```

### toAPI.bulkFoodInfo(row, original)

A new transform function that builds the `food_info` JSON for the edit API. Key difference from `toAPI.foodInfo`: it reads from the flat row state (not from a form object).

```js
// Added to menuManagementTransform.js
bulkFoodInfo: (row) => ({
    name: row.productName,
    description: row.description || '',
    category_id: Number(row.categoryId),
    price: Number(row.basePrice),
    discount: Number(row.discount) || 0,
    discount_type: row.discountType || 'amount',
    food_for: row.foodFor || 'Normal',
    dinein: row.dineIn === 'Yes' ? 'Yes' : 'No',
    delivery: row.delivery === 'Yes' ? 'Yes' : 'No',
    takeaway: row.takeaway === 'Yes' ? 'Yes' : 'No',
    live_web: row.liveWeb === 'Yes' ? 'Y' : 'N',
    available_time_starts: row.availableTimeStart || '00:00:00',
    available_time_ends: row.availableTimeEnd || '23:59:59',
    prepration_time_min: Number(row.prepTimeMin) || 0,
    serve_time_in_min: Number(row.serveTimeMin) || 0,
    pack_charges: String(parseFloat(row.packCharges) || '0.00'),
    takeaway_charge: String(parseFloat(row.takeawayCharge) || '0.00'),
    delivery_charge: String(parseFloat(row.deliveryCharge) || '0.00'),
    tax_type: row.taxType || 'GST',
    tax: String(Number(row.taxPercent) || 0),
    complementary: row.complementary === 'Yes' ? 'Yes' : 'No',
    give_discount: row.giveDiscount === 'Yes' ? 'Yes' : 'No',
    item_code: row.itemCode || '',
    kcal: Number(row.kcal) || 0,
    allergens: row.allergen || '',
    item_type: row.itemType,
    // packed_food and is_inventory — pending backend adding to API
    // packed_food: row.packedFood || 'No',
    // is_inventory: row.isInventory || 'No',
}),
```

---

## 7. Toolbar Layout

```
[🔲 Bulk Editor] [411 items]     [🔍 Search...] [📊 Columns 10 ▼] [⬇ Excel] [⬆ Import] | [+ Add Item] [💾 Save N Changes] [✕]
```

| Element | Behavior |
|---------|----------|
| Search | Filters rows by name, category, item code — across all groups |
| Columns (10) | Opens tiered picker. Badge shows active column count |
| Excel | **Disabled placeholder** — tooltip "Coming soon" |
| Import | **Disabled placeholder** — tooltip "Coming soon" |
| Add Item | Appends new row at bottom with defaults |
| Save N Changes | Disabled when N=0. Orange when N>0. Triggers batch save |
| ✕ | Closes bulk editor, returns to card view |

---

## 8. Column Picker UX

- Dropdown panel (264px wide, max-height 420px, scrollable)
- 4 collapsible tier sections
- Each tier header has:
  - Chevron (expand/collapse)
  - Tier label: "Tier 1 — Default"
  - Bulk toggle pill: "All ON" (orange) / "Some" (amber) / "All OFF" (grey)
- Each column row has:
  - Eye icon (green=visible, grey=hidden)
  - Column label
  - "locked" tag for alwaysVisible columns (Name)
- Clicking tier bulk toggle toggles all columns in that tier

---

## 9. Footer Bar

Appears only when `dirtyCount > 0`:
```
[🟠 4 items modified]                    [Reset All] [💾 Save 4 Changes]
```
- Orange gradient background (subtle)
- "Reset All" resets all rows to original state
- "Save" mirrors the toolbar save button

---

## 10. Edge Cases

| Case | Handling |
|------|----------|
| 400+ items performance | No virtual scroll in v1 — HTML table handles 400 rows fine. Monitor. Add virtualization if >1000 items. |
| Save partial failure | Failed rows keep `_saveStatus: "error"`, remain editable. Toast shows count. User can retry. |
| New row missing required fields | Validate before save: Name + Price + Category required. Show inline red border on empty required cells. |
| Category dropdown empty | Show "—" option at top. Prevent save without category. |
| Concurrent edits (another user) | Not handled in v1. onRefresh() after save re-syncs. |
| Browser tab close with unsaved changes | Add `beforeunload` listener when dirtyCount > 0. |
| packedFood / isInventory API support | Fields included in UI now. Transform includes them commented out. Uncomment when backend ships. |

---

## 11. Implementation Sequence (Atomic)

| Step | Action | Verify |
|------|--------|--------|
| 1 | Create `BulkEditor.jsx` — copy from mockup, add real save logic | Compiles clean |
| 2 | Add `toAPI.bulkFoodInfo()` to `menuManagementTransform.js` | Unit: output matches editFood expected shape |
| 3 | Swap import in `MenuManagementPanel.jsx`: Mockup → BulkEditor | Toggle works |
| 4 | Test: edit 3 items, save, verify API calls succeed | curl + browser |
| 5 | Test: add new item, save, verify addFood API call | curl + browser |
| 6 | Test: search filter across groups | Browser |
| 7 | Test: column picker toggle Tier 2 on, edit discount field, save | Browser |
| 8 | Test: 20+ concurrent edits, save batch | Browser + network tab |
| 9 | Remove BulkEditorMockup.jsx (cleanup) | Compiles clean |
| 10 | Run testing agent | Full QA |

---

## 12. Regression Checklist

| Area | Test | Expected |
|------|------|----------|
| Card view (toggle back) | Click "Card View" after bulk edits | Card view shows original data (unsaved edits discarded) |
| Individual edit (ProductForm) | Open full form from card view, edit, save | Works as before |
| Order-taking | Place an order on dashboard | MenuContext untouched, works as before |
| Socket food_update | Receive food update via socket | Dashboard updates, bulk editor unaffected |
| Other panels (Credit, Settings) | Open other panels | Work as before |
| Category CRUD (from card view) | Add/edit/delete category | Works as before |

---

## 13. Time Estimate

| Step | Estimate |
|------|----------|
| BulkEditor.jsx (production version from mockup) | 30 min |
| toAPI.bulkFoodInfo transform | 10 min |
| Wiring + cleanup | 5 min |
| Testing (manual + testing agent) | 20 min |
| **Total** | **~65 min** |

---

## 14. Open Items (deferred)

| Item | When |
|------|------|
| `packed_food` / `is_inventory` in edit API payload | When backend adds fields to foods-list response |
| Excel download (API #9) | Phase 2B — wire to `POST /product/bulk-export` |
| Excel upload (API #8) | Phase 2B — wire to `POST /product/bulk-import` |
| Sample template (API #10) | Phase 2B — wire to `GET /product/export-sample` |
| Virtual scrolling | If restaurant has >1000 items |
| Undo/redo stack | v2 enhancement |

---

*End of Implementation Plan — Gate 3 Complete. Ready for Gate 4 (Code Gate) + Gate 5 (Implementation) on owner GO.*
