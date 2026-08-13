# BUG-297 Code Trace Evidence

## File: CategoryList.jsx

### Add Category form (lines ~229-265)
- State: `formName`, `formStation` — NO `formPrinterId`
- `handleAdd()` L47: `menuService.addCategory({ name: formName.trim(), stationName: formStation, catOrder: cats.length })` — **printerId omitted**
- Edit form: `handleSaveEdit()` L72: same — `menuService.editCategory(editingId, { name, stationName, catOrder })` — **printerId omitted**

## File: menuManagementService.js
- `addCategory` signature: `({ name, image, catType='food', vendorType='restaurant', stationName='KDS', printerId='', catOrder=0 })`
- L92: `formData.append('restaurant_printer_id', String(printerId))` — sends `String('')` = empty string

## Root cause chain:
`CategoryList.jsx` form has no printer dropdown → `printerId` never set → `addCategory()` called without `printerId` → defaults to `''` → `restaurant_printer_id = ''` sent to backend → NULL stored → station not mapped → KOT printing broken
