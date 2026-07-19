# CR-014 Phase 2B — Excel Import/Export Impact Analysis (Gate 2)

**Status:** COMPLETE
**Date:** 2026-06-09

---

## 1. API Verification (Live — cafe103, 2026-06-09)

### API #9: Bulk Export (`POST /product/bulk-export`)

**Request:** `{ "type": "all" }` (JSON)
**Response:** JSON with download URL (NOT direct blob)
```json
{
  "message": "Data exported successfully (Normal: 417, Aggregator: 0)",
  "download_url": "https://preprod.mygenie.online/storage/All_Foods_2026-06-09_19-29-12.xlsx"
}
```
**Response time:** 2.7s
**File:** 59,773 bytes (.xlsx), 2 sheets:
- **Sheet "AllFoods":** 418 rows (1 header + 417 items) × 47 columns
- **Sheet "Lists":** 31 rows × 13 columns (dropdown validation lists: FoodType, Status, Yes/No, Categories, etc.)

**47 export columns:**
`Id, Name, Price, CategoryId, Variations, Addons, Description, Image, SubCategoryId, RestaurantId, Discount, DiscountType, ItemCode, AvailableTimeStarts, AvailableTimeEnds, FoodFor, IsInventory, FoodType, PackCharges, Recommended, DineIn, TakeAway, Delivery, TakeawayCharges, DeliveryCharges, Status, FoodOrder, Complementary, ComplementaryPrice, IsDisabled, StockOut, LiveWeb, TaxType, Tax, GiveDiscount, Swiggy, Zomato, SwiggyPackingChrg, PreparationTimeMin, PackedFood, Allergens, PortionSize, Kcal, WebAvailableTimeStarts, WebAvailableTimeEnds, AddonRecipes, ClientId`

### API #10: Export Sample Template (`GET /product/export-sample`)

**Response:** JSON with download URL
```json
{
  "message": "Sample file generated successfully.",
  "download_url": "https://preprod.mygenie.online/storage/sample_food_import.xlsx"
}
```
**File:** 4,302 bytes (.xlsx), 1 sheet:
- **Sheet "Sheet1":** 1 row (header only) × 3 columns: `Name, Price, CategoryId`
- Minimal template — only required fields

### API #8: Bulk Import (`POST /product/bulk-import`)

**Request:** `multipart/form-data` with `products_file` (.xlsx)
**Response:**
```json
{
  "normal_food": { "imported": 0, "updated": 0 },
  "aggregator_food": { "imported": 0, "updated": 0 },
  "total": 0,
  "message": "Data processed successfully"
}
```
**Behavior:** If row has `Id` → update existing item. If no `Id` → create new item. Returns count of imported + updated items split by Normal/Aggregator.

---

## 2. Key Design Decision: Download URL Pattern

APIs return **JSON with `download_url`**, NOT direct file blobs. The FE must:
1. Call API → get `download_url` from response
2. Open `download_url` in new tab or trigger `<a download>` click

This is simpler than blob handling — no `responseType: 'blob'` needed.

---

## 3. Current UI State

**BulkEditor.jsx lines 464-471:** Two buttons exist but are disabled:
- "Excel" button (data-testid: `download-excel-btn`) — `disabled`, `opacity-60`, `cursor-not-allowed`, tooltip "Coming soon"
- "Import" button (data-testid: `upload-excel-btn`) — same disabled state

No file picker, no download logic, no template button.

---

## 4. Files to Change

| File | Change | Lines |
|------|--------|-------|
| `menuManagementService.js` | Add 3 functions: `bulkExport`, `bulkImport`, `exportSample` | ~15 |
| `BulkEditor.jsx` | Enable 2 buttons, add download/import logic, add hidden file input, add "Download Template" sub-option | ~40 |

### Files NOT Touched
- `menuManagementTransform.js` — no transform needed (file operations)
- `ProductForm.jsx`, `ProductCard.jsx`, `CategoryList.jsx` — unrelated
- All order-taking, reports, settlement files — zero touch

---

## 5. Service Functions (to add in `menuManagementService.js`)

```js
/** API #9 — Bulk export all foods → returns { message, download_url } */
export const bulkExport = (type = 'all') =>
  api.post(`${BASE_V2}/bulk-export`, { type });

/** API #8 — Bulk import from xlsx file → returns { normal_food, aggregator_food, total, message } */
export const bulkImport = (file) => {
  const formData = new FormData();
  formData.append('products_file', file);
  return api.post(`${BASE_V2}/bulk-import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** API #10 — Export sample template → returns { message, download_url } */
export const exportSample = () =>
  api.get(`${BASE_V2}/export-sample`);
```

---

## 6. UI Changes (BulkEditor.jsx)

### Excel Button → Dropdown with 2 options
```
[Excel ▼]
  ├── Export All Items (.xlsx)     → bulkExport('all') → open download_url
  └── Download Template (.xlsx)   → exportSample() → open download_url
```

### Import Button → File picker trigger
```
[Import] → opens file picker (.xlsx only) → bulkImport(file) → show results toast → onRefresh()
```

### Import feedback
```
Success: "Imported 5 new, updated 12 existing items"
Error: "Import failed: {error message}"
```

---

## 7. Edge Cases

| Case | Handling |
|------|---------|
| Export with 0 items | API returns message with count=0, download_url still valid (empty sheet) |
| Import with empty file | API returns `total: 0`, show "No items found in file" |
| Import with invalid file | API returns error → show in toast |
| Import with existing IDs | API updates existing items (upsert behavior) |
| Large file (1000+ items) | API handles server-side; FE just waits for response |
| Download URL expired | URLs are timestamped, should work immediately. No caching needed. |

---

## 8. Regression Risk

| Area | Risk |
|------|------|
| Existing BulkEditor grid | **ZERO** — only adding button handlers, not touching grid logic |
| Card view / ProductForm | **ZERO** — independent |
| Order-taking | **ZERO** — independent |
| Other panels | **ZERO** — independent |

---

## 9. Estimated Effort

| Step | Estimate |
|------|----------|
| Service functions | 10 min |
| BulkEditor UI wiring | 20 min |
| Testing | 15 min |
| **Total** | **~45 min** |

---

*End of Impact Analysis — Gate 2 Complete. Next: Gate 3 (Implementation Plan) on owner GO.*
