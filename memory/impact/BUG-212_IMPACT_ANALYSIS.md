# BUG-212 — Impact Analysis + Implementation Plan

**ID:** BUG-212
**Stage:** Impact Analysis + Implementation Plan (Gate 2+3)
**Code Reality:** NONE (edit), PARTIAL (add)
**Risk:** HIGH (new API wiring)
**Conflict Pre-Check:** No other items touching target files

---

## Impact Analysis (Gate 2)

### Bug A — Edit (BLOCKER)
- UI: No edit icon in Actions column (L230-236, only `<Trash2>`)
- Service: No `updateIngredient()` function
- Transform: No `toAPI.updateIngredient()`
- Constants: No `UPDATE_INVENTORY` endpoint
- Backend: `PUT /update-inventory/{id}` LIVE (422 = expects fields)

### Bug B — Add Form Incomplete
- `newIng` state = `{ name, categoryId, unit }` — missing `smallUnit`, `conversionFactor`, `minQtyAlert`, `minUnitAlert`
- `toAPI.addIngredient()` maps those fields but receives `undefined`

### Bug C — Export Fake
- Export onClick runs `toast.info()` — never calls `inventoryService.exportIngredients()`
- Service function exists and is wired to correct endpoint

---

## Implementation Plan (Gate 3)

### Edit A1: Add endpoint constant (`constants.js`)
```js
UPDATE_INVENTORY: '/api/v2/vendoremployee/inventory/update-inventory',  // PUT /{id} — BUG-212
```

### Edit A2: Add service function (`inventoryService.js`)
```js
export async function updateIngredient(id, data) {
  const payload = toAPI.updateIngredient(data);
  return api.put(`${INVENTORY_ENDPOINTS.UPDATE_INVENTORY}/${id}`, payload);
}
```

### Edit A3: Add transform (`inventoryTransform.js`)
```js
updateIngredient(data) {
  return {
    stock_title: data.name || '',
    category_id: data.categoryId,
    unit: data.unit || '',
    small_unit: data.smallUnit || '',
    converion_factor: String(data.conversionFactor || 1),
    minimun_stock_alert: String(data.minQtyAlert || 0),
    min_unit_alert: String(data.minUnitAlert || 0),
    reason: 'update',
  };
},
```

### Edit A4: Add edit UI (`InventorySetupPanel.jsx`)
- Add `editingId` + `editIng` state
- Add `<Pencil>` icon in Actions column next to `<Trash2>`
- Add inline edit row (same pattern as VendorFormRow — blue-bordered)
- Add `saveEdit()` handler calling `inventoryService.updateIngredient()`

### Edit B1-B2: Expand add form (`InventorySetupPanel.jsx`)
- Expand `newIng` state to 7 fields
- Add 4 input fields to add row: Small Unit (dropdown), Conversion Factor (number), Min Qty Alert (number), Min Unit Alert (number)

### Edit C1: Wire export (`InventorySetupPanel.jsx`)
- Replace `toast.info(...)` with `handleExport()` function
- Pattern: same as CurrentStockPanel's dual-response export

### Scope Lock
**Files WILL change:** `constants.js`, `inventoryService.js`, `inventoryTransform.js`, `InventorySetupPanel.jsx`
**Files will NOT touch:** Everything else

### Verification Matrix

| # | File | Change | How to Verify |
|---|------|--------|---------------|
| A1 | constants.js | UPDATE_INVENTORY added | grep confirms |
| A2 | inventoryService.js | updateIngredient() added | grep confirms |
| A3 | inventoryTransform.js | toAPI.updateIngredient() added | grep confirms |
| A4 | InventorySetupPanel.jsx | Pencil icon + inline edit row | Browser: click pencil → edit form appears |
| B1 | InventorySetupPanel.jsx | newIng has 7 fields | Browser: add form shows all fields |
| C1 | InventorySetupPanel.jsx | Export calls API | Browser: click Export → file downloads |

### Post-Code Registry Checklist
- [ ] registry.json: BUG-212 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: 4 files
- [ ] Code markers: // BUG-212
