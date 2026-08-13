# Gate 2 — Impact Analysis: BUG-150 / BUG-151 / BUG-152 / BUG-153
**Date:** 2026-07-07
**Sprint:** pos_5_0
**Batch:** CR-059 Post-Implementation Bug Sprint
**Stage:** Gate 2 (Impact Analysis)

---

## Scope Declaration

### Files WILL change (3 files)

| File | Bug(s) | Nature |
|---|---|---|
| `components/expense/ExpenseSetupPanel.jsx` | BUG-150 | Remove `display:none` from placeholder; improve category hover style |
| `api/services/expenseService.js` | BUG-151, BUG-152 | Fix `exp_name` key; add `DELETE_EXPENSE` endpoint usage |
| `api/constants.js` | BUG-152 | Add `DELETE_EXPENSE` constant |
| `components/expense/ExpenseEntryPanel.jsx` | BUG-153 | Remove category required; add auto-fill + hints |

*Total: 4 files, all CR-059 owned, no hotspots*

### Files WILL NOT touch

- `OrderEntry.jsx` (R5 hotspot)
- `CollectPaymentPanel.jsx` (R5 hotspot)
- `orderTransform.js` (R5 hotspot)
- All order / payment / settlement / menu / socket files
- No financial logic, no provider order, no localStorage keys

---

## BUG-150 — DnD Bounce

### Root Cause (corrected after Step 0 code reality check)

**Original diagnosis:** `item.categoryId` always null.
**Correction:** `fetchAll()` already does `catByName` cross-reference (line 118-125 in `ExpenseSetupPanel.jsx`). `item.categoryId` IS correctly populated. The `handleDragEnd` logic is structurally sound.

**Actual root cause:** `display:none` on `{provided.placeholder}` inside each category `<Droppable>`.

`@hello-pangea/dnd` uses the placeholder to calculate the valid drop area within a Droppable. When placeholder has `display:none`, the Droppable's interior is 0-height. The library cannot find a valid drop position within the category — `destination` becomes `null` when released. Line 289 (`if (!destination) return;`) fires and the item animates back.

**Secondary:** No strong visual feedback on hover so user cannot tell which category will receive the drop.

### Risk Assessment

| Dimension | Level | Reason |
|---|---|---|
| Data risk | LOW | No data writes — drop was already failing silently |
| Regression risk | LOW | Only changing `display:none` → remove + `isDraggingOver` style |
| Financial | NO | — |
| Hotspot | NO | — |

---

## BUG-151 — Edit Transaction Fails

### Root Cause (confirmed Step 0)

```
startEdit(tx):
  setEditRow({ expense: tx.expense, ... })   ← key: "expense"

editExpenseEntry(id, editRow):
  PUT body = { exp_name: data.exp_name, ... }  ← reads "exp_name" → undefined
```

API receives `exp_name: undefined` → validation failure → HTML redirect.

**Curl proof:** PUT with `exp_name: "100 delivery"` → 200 OK. PUT with `expense: "100 delivery"` → HTML redirect.

### Risk Assessment

| Dimension | Level | Reason |
|---|---|---|
| Data risk | LOW | Was already failing — no data was being written |
| Regression risk | LOW | 1 line, aligned with existing field name |
| Financial | NO | — |
| Hotspot | NO | — |

---

## BUG-152 — Delete Transaction Fails (405)

### Root Cause (confirmed Step 0)

```js
// constants.js — missing DELETE_EXPENSE constant
EDIT_EXPENSE: '/api/v2/vendoremployee/expense/edit-expense'  // PUT /{id} only

// expenseService.js
deleteExpenseEntry = (id) => api.delete(`${EXPENSE_ENDPOINTS.EDIT_EXPENSE}/${id}`)
// → DELETE /edit-expense/{id} → HTTP 405 "DELETE not supported, only PUT"
```

Correct endpoint (curl-confirmed): `DELETE /delete-expense/{id}` → HTTP 200.

### Risk Assessment

| Dimension | Level | Reason |
|---|---|---|
| Data risk | MEDIUM | Delete will now actually remove records — new behaviour |
| Regression risk | LOW | Currently fully broken — can only get better |
| Financial | NO | — |
| Hotspot | NO | — |

---

## BUG-153 — Add Expense UX: Category Required + No Hints

### Root Cause (confirmed Step 0)

Three problems in `ExpenseEntryPanel.jsx`:

**A)** `handleItemSelect` (line 159-166) does NOT auto-fill `categoryId` when item selected:
```js
const handleItemSelect = (title, item) => {
  onChange(idx, "itemName", title);
  // ← categoryId never set here!
  if (item?.unitPriceAmount) { ... }
};
```

**B)** Validation (line 413) forces category: `!l.categoryId || !l.itemName || ...`

**C)** `ItemCombobox` receives `categoryName` prop but shows items with no category context in dropdown.

Note: `filteredItems(null)` ALREADY returns all items — the items list IS available without a category selected (line 323). Only the validation and placeholder text block the UX.

### Risk Assessment

| Dimension | Level | Reason |
|---|---|---|
| Data risk | LOW | `store-expense-details` API accepts null category_id |
| Regression risk | LOW | Only removing a validation constraint |
| Financial | NO | — |
| Hotspot | NO | — |

---

## Owner Decision Queue

| # | Decision | Options | Default if not answered |
|---|---|---|---|
| D1 | What to show when item is not in any category in edit combobox? | a) Show all items b) Show "Uncategorized" items | Default: show all items |
| D2 | Should delete ask for confirmation dialog first? | a) Yes — confirm modal b) No — direct delete with undo toast | Default: keep existing confirm modal |

No owner decisions are blockers — defaults cover both.
