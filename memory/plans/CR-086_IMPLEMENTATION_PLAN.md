# CR-086 — Implementation Plan (Gate 3)

**ID:** CR-086
**Stage:** Implementation Plan (Gate 3)
**Date:** 2026-07-21
**Risk:** HIGH
**Owner Decisions Resolved:**
- Q1: Client-side Excel (frontend now) ✅
- Q2: Client-side jsPDF (frontend now) ✅
- Q3: Bulk Editor follows module patterns (add in bulk) ✅
- Q4: Import DEFERRED ✅
- Q5: F1 CLOSED (BUG-211) ✅

---

## Scope Lock

**In scope:** F2 (Excel export), F3 (PDF export), F4 (Ingredient Bulk Editor)
**Out of scope:** F1 (done), F5 (deferred)

**Files WILL change:**
1. `CurrentStockPanel.jsx` — F2 (Excel handler) + F3 (PDF handler + button)
2. `InventorySetupPanel.jsx` — F4 (Bulk Edit toggle wiring)
3. NEW `IngredientBulkEditor.jsx` — F4 (new component)

**Files will NOT touch:** inventoryService.js, inventoryTransform.js, constants.js, all other files

**Dependencies to install:** `xlsx` (SheetJS), `jspdf`, `jspdf-autotable`

---

## Edit Sequence

### Pre-step: Install Dependencies

```bash
cd /app/frontend && yarn add xlsx jspdf jspdf-autotable
```

### Edit F2: Client-Side Excel Export (CurrentStockPanel.jsx)

**Current:** `handleExport` calls `inventoryService.exportStock()` → backend returns wrong fields.

**New:** Replace with client-side Excel generation from `filtered` array:
```js
import * as XLSX from 'xlsx';

const handleExport = () => {
  const rows = filtered.map(item => ({
    'Ingredient Name': item.name,
    'Category': item.categoryName,
    'Base Unit': item.unit,
    'Current Stock': item.displayQty || item.quantity,
    'Status': Number(item.quantity) <= 0 ? 'Out of Stock' : item.isLowStock ? 'Low Stock' : 'In Stock',
    'Days Left': daysLeftMap.get(String(item.id)) === Infinity ? '∞' : `~${Math.round(daysLeftMap.get(String(item.id)) || 0)}`,
    'Vendor': item.vendorName || '',
    'Min Alert': item.minQtyAlert > 0 ? `${item.minQtyAlert} ${item.unit}` : '',
    'Small Unit': item.smallUnit || '',
    'Conversion Factor': item.conversionFactor || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Current Stock');
  XLSX.writeFile(wb, `Stock_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast.success('Stock exported');
};
```

~20 lines replacing existing handler. Remove `exporting` state + `inventoryService.exportStock` call (now synchronous).

### Edit F3: PDF Export (CurrentStockPanel.jsx)

**New:** Add PDF handler + button next to existing Export button:
```js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const handlePdfExport = () => {
  const doc = new jsPDF('landscape');
  doc.setFontSize(16);
  doc.text('Current Stock Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 22);
  doc.text(`Total: ${kpis.total} | Low: ${kpis.lowStock} | Out: ${kpis.outOfStock}`, 14, 28);
  doc.autoTable({
    startY: 34,
    head: [['Ingredient', 'Category', 'Stock', 'Unit', 'Status', 'Days Left', 'Vendor']],
    body: filtered.map(item => [
      item.name, item.categoryName,
      item.displayQty || item.quantity, item.displayUnit || item.unit,
      Number(item.quantity) <= 0 ? 'Out' : item.isLowStock ? 'Low' : 'OK',
      daysLeftMap.get(String(item.id)) === Infinity ? '—' : `~${Math.round(daysLeftMap.get(String(item.id)) || 0)}d`,
      item.vendorName || '—',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 65, 85] },
  });
  doc.save(`Stock_${new Date().toISOString().slice(0,10)}.pdf`);
  toast.success('PDF exported');
};
```

~25 lines new handler + ~5 lines button JSX.

### Edit F4: Ingredient Bulk Editor (NEW IngredientBulkEditor.jsx + wiring)

**Pattern:** Follow `ExpenseBulkEditor.jsx` structure:
- Props: `allItems`, `categories`, `units`, `onRefresh`, `onClose`
- Category-grouped rows with headers
- Inline edit: Name (text), Category (dropdown), Base Unit (dropdown), Small Unit (dropdown), Conversion Factor (number), Min Qty Alert (number), Min Unit Alert (number)
- New row: pinned to top of category group, auto-focus
- Dirty tracking: amber border on changed rows
- Save: batch — new items → `addIngredient()`, changed items → `updateIngredient()`, deleted → `deleteIngredient()`
- Toolbar: Search, + Add Item, Save N Changes, Excel export, Close
- ~450-550 lines

**Wiring in InventorySetupPanel.jsx:**
- Add `viewMode` state ('list' | 'bulk')
- Enable the existing disabled "Bulk Edit" button → toggles to bulk editor
- Import + render `<IngredientBulkEditor>` when viewMode === 'bulk'
- ~15 lines

---

## Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| F2 | CurrentStockPanel.jsx | Client-side Excel export | Click Export → .xlsx downloads with correct columns | NO |
| F3 | CurrentStockPanel.jsx | PDF export button + handler | Click PDF → .pdf downloads with table + KPIs | NO |
| F4a | IngredientBulkEditor.jsx | New bulk editor component | Click Bulk Edit → spreadsheet view loads | NO |
| F4b | IngredientBulkEditor.jsx | Add row in bulk | Click + Add → new row appears, fill + save | NO |
| F4c | IngredientBulkEditor.jsx | Edit row in bulk | Change a field → amber highlight, save | NO |
| F4d | IngredientBulkEditor.jsx | Delete in bulk | Select rows → delete → confirm → removed | NO |
| F4e | InventorySetupPanel.jsx | Bulk Edit toggle | Click Bulk Edit button → switches view | NO |

## Post-Code Registry Checklist

- [ ] registry.json: CR-086 → IMPLEMENTED
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: 3 files (CurrentStockPanel, IngredientBulkEditor, InventorySetupPanel)
- [ ] Code markers: // CR-086 in every modified file
