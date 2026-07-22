# CR-067 — Implementation Plan (Gate 3)

**ID:** CR-067
**Title:** Expense Bulk Editor — Full Parity Redesign with Menu Management Pattern
**Date:** 2026-07-11
**Agent:** PLANNING (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 3 — Implementation Plan
**Risk:** MEDIUM
**Sprint:** pos_5_0

---

## Owner Decisions — All Locked

| # | Question | Answer |
|---|---|---|
| OQ-1 | Name edit on existing items | **B** — editable in UI, save blocked with inline error "Rename not available — backend support pending (CR-065)" |
| OQ-2 | Category change + unit price loss | **B** — block category change for items that have `unitPriceAmount` set. Show inline error: "Cannot move — unit price is set. Remove unit price first." |
| D2 | UNIT column | Remove |
| D3 | UNIT PRICE column | Remove |

---

## Scope Lock

**Files WILL change:**
1. `components/expense/ExpenseBulkEditor.jsx` — full rewrite (~400 lines)
2. `components/expense/ExpenseSetupPanel.jsx` — remove `handleBulkSave`, remove `units` state/fetch, update `<ExpenseBulkEditor>` props (~-30 lines)

**Files will NOT touch:**
- `api/services/expenseService.js`
- `api/transforms/expenseTransform.js`
- `api/constants.js`
- `pages/ExpenseSetupPage.jsx`
- Any R5 hotspot files

---

## Edit 1 — `ExpenseBulkEditor.jsx` — Full Rewrite

**Current:** 148-line simplified component. 4 columns (Name, Category, Unit Price, Unit). `+ Add Row` at bottom. `onSave` callback to parent. No dirty tracking. No search. No Excel/Import.

**Target:** Full parity with menu `BulkEditor.jsx` pattern, adapted for expense items (2 columns only).

### Structure

```
Toolbar:
  [Table2 icon] Bulk Editor [N items badge]
  | Search bar (left) |
  | Excel btn | Import btn | + Add Item (green) | Save N Changes (orange/disabled) | X close |

Column headers: # | ITEM NAME | CATEGORY | (actions col)

Rows (category-grouped):
  CATEGORY HEADER ROW (orange left bar + name + count badge)
  DATA ROW: [row#/status] [name input] [category select] [undo/delete btn]

New rows: prepended above grouped rows, no category header, green background tint

Footer (when dirtyCount > 0):
  "N items modified" | Reset All | Save N Changes
```

### Key logic

**Row model:**
```js
const buildRow = (item, isNew = false) => ({
  _id: isNew ? `new-${Date.now()}-${Math.random().toString(36).slice(2,6)}` : String(item.id),
  _original: isNew ? {} : { ...item },
  _isNew: isNew,
  _saveStatus: null,   // null | "saving" | "saved" | "error"
  _saveError: null,
  _orderIndex: 0,
  title: item.title || "",
  categoryId: item.categoryId ? String(item.categoryId) : "",
  categoryName: item.categoryName || "",
});
```

**Dirty detection:**
```js
const isDirty = (row) => {
  if (row._isNew) return row.title.trim().length > 0;
  return row.title !== (row._original.title || "") ||
         String(row.categoryId) !== String(row._original.categoryId || "");
};
```

**Add Item (toolbar button):**
```js
const addNewRow = () => {
  const row = buildRow({}, true);
  row._orderIndex = Date.now();
  setRows(prev => [row, ...prev]);
  scrollContainerRef.current?.scrollTop = 0;
  setPendingFocusRowId(row._id);
};
```

**Save logic — processOne(row):**
```js
// NEW ROW
if (row._isNew) {
  if (!row.title.trim() || !row.categoryId) {
    → set _saveStatus: "error", _saveError: "Item name and category are required"
    return;
  }
  const cat = categories.find(c => String(c.id) === String(row.categoryId));
  await expenseService.createCategoryWithItems(cat.name, [row.title.trim()]);
  → set _saveStatus: "saved"
}

// EXISTING ROW
const titleChanged = row.title !== (row._original.title || "");
const catChanged = String(row.categoryId) !== String(row._original.categoryId || "");

if (titleChanged) {
  // OQ-1 = B: block, show error
  → set _saveStatus: "error", _saveError: "Rename not available — backend support pending"
  return;
}
if (catChanged && row._original.unitPriceAmount) {
  // OQ-2 = B: block, show error
  → set _saveStatus: "error", _saveError: "Cannot move — unit price is set. Remove unit price first."
  return;
}
if (catChanged) {
  // DELETE old + POST in new category
  const newCat = categories.find(c => String(c.id) === String(row.categoryId));
  await expenseService.deleteExpenseItem(row._id);
  await expenseService.createCategoryWithItems(newCat.name, [row.title.trim()]);
  → set _saveStatus: "saved"
}
```

**Excel Export (calls existing BUG-163-fixed function):**
```js
const handleExport = async () => {
  const res = await expenseService.exportStockMaster();
  const data = fromAPI.exportResponse(res);
  if (data.downloadUrl) window.open(data.downloadUrl, "_blank");
};
```

**Import:**
```js
const handleImport = async (e) => {
  const file = e.target.files?.[0];
  await expenseService.importStockMaster(file);
  if (onRefresh) setTimeout(() => onRefresh(), 500);
};
```

**Props interface (new):**
```js
const ExpenseBulkEditor = ({ items, categories, onRefresh, onClose }) => { ... }
// Removed: units, onSave, onCancel, saving
// Added: onRefresh (calls parent fetchAll), onClose (sets bulkMode=false)
```

**Imports needed:**
```js
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { X, Search, Save, Plus, RotateCcw, Check, AlertCircle,
         Download, Upload, Loader2, Trash2, Table2 } from "lucide-react";
import { COLORS } from "../../constants";
import { useToast } from "../../hooks/use-toast";
import * as expenseService from "../../api/services/expenseService";
import { fromAPI } from "../../api/transforms/expenseTransform";
```

**Code marker:** Add `// CR-067` comment on line 1.

---

## Edit 2 — `ExpenseSetupPanel.jsx` — Remove bulk save logic, update props

### 2a — Remove `units` state and fetch

**Find:**
```js
const [units, setUnits] = useState([]);
```
**Remove this line.**

**Find in `fetchAll`:**
```js
const [catRes, itemRes, unitRes] = await Promise.all([
  expenseService.getCategories(),
  expenseService.getExpenseItems(),
  expenseService.getUnits(),
]);
```
**Replace with:**
```js
const [catRes, itemRes] = await Promise.all([
  expenseService.getCategories(),
  expenseService.getExpenseItems(),
]);
```
**Remove:** `setUnits(fromAPI.units(unitRes));`

### 2b — Remove `handleBulkSave` function

**Remove entire function** (lines ~275–295 — `const handleBulkSave = async (rows) => { ... }`).

### 2c — Update `<ExpenseBulkEditor>` props

**Find:**
```jsx
<ExpenseBulkEditor
  items={selectedCategoryId
    ? allItems.filter(i => String(i.categoryId) === String(selectedCategoryId))
    : allItems}
  categories={categories}
  units={units}
  onSave={handleBulkSave}
  onCancel={() => setBulkMode(false)}
  saving={bulkSaving}
/>
```
**Replace with:**
```jsx
<ExpenseBulkEditor
  items={allItems}
  categories={categories}
  onRefresh={fetchAll}
  onClose={() => setBulkMode(false)}
/>
```
Note: pass `allItems` (all items) — the bulk editor handles its own search/filter.

### 2d — Remove `bulkSaving` state

**Find:** `const [bulkSaving, setBulkSaving] = useState(false);`
**Remove this line.**

**Code marker:** Add `// CR-067` comment near the bulk editor render block.

---

## Verification Matrix

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| 1 | `ExpenseBulkEditor.jsx` | Toolbar renders: Search + Add Item + Save N + Excel + Import + X | Browser `/expense-setup` → Bulk Edit → all 5 toolbar elements visible |
| 2 | `ExpenseBulkEditor.jsx` | `+ Add Item` prepends row to top, auto-focuses name | Click Add Item → new row at top with cursor in name field |
| 3 | `ExpenseBulkEditor.jsx` | Save N Changes disabled when no changes | Open bulk editor → button shows "No Changes" + disabled |
| 4 | `ExpenseBulkEditor.jsx` | Dirty row gets amber tint | Edit category on any row → row turns amber |
| 5 | `ExpenseBulkEditor.jsx` | Save new row → POST /store_expense | Add item + category → Save → row shows ✓, item in list after refresh |
| 6 | `ExpenseBulkEditor.jsx` | Rename existing item → inline error | Edit name of existing row → Save → red error "Rename not available…" |
| 7 | `ExpenseBulkEditor.jsx` | Category move on priced item → inline error | Move priced item to new category → Save → red error "Cannot move — unit price set…" |
| 8 | `ExpenseBulkEditor.jsx` | Category move on unpriced item → DELETE+POST | Move unpriced item → Save → item appears in new category |
| 9 | `ExpenseBulkEditor.jsx` | UNIT column absent | No unit column in header or rows |
| 10 | `ExpenseBulkEditor.jsx` | UNIT PRICE column absent | No price column in header or rows |
| 11 | `ExpenseBulkEditor.jsx` | Excel export works | Click Excel → download triggered |
| 12 | `ExpenseBulkEditor.jsx` | Import works | Upload xlsx → toast + items refresh |
| 13 | `ExpenseSetupPanel.jsx` | No errors after handleBulkSave removal | Open bulk edit → no console errors |
| 14 | `ExpenseSetupPanel.jsx` | units no longer fetched | Network tab: no GET /get-unit call from /expense-setup |

---

## Post-Code Registry Checklist

- [ ] `registry.json`: CR-067 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `CR_REGISTRY.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: both files listed with CR-067 + date
- [ ] Code markers: `// CR-067` in every modified file

---

## Execution Order

**CR-067 MUST run before CR-066.**
CR-066 adds a tab strip to `ExpenseSetupPanel.jsx`. CR-067 removes `handleBulkSave` and `units` from the same file. Do CR-067 first so CR-066 agent works on the cleaner post-067 version.

**After CR-067:** When backend delivers `PUT /expense/expenses/{id}` (BACKEND_BRIEF_EXPENSE_MODULE brief 1), add ~15 lines to the save logic to call `renameExpenseItem(id, title)` instead of showing the block error. This is a fast-lane eligible follow-up.
