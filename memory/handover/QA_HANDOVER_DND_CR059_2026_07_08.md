# QA Handover — BUG-DND-CR059 + BUG-P2

**Date:** 2026-07-08
**Role:** BUG FIX → QA
**Items:** BUG-DND-CR059 (cross-category DnD), BUG-P2 (within-list drag handles removed)
**Files changed:** `ExpenseSetupPanel.jsx`
**Credentials:** `owner@cafe103.com` / see `/app/memory/test_credentials.md`
**URL:** `https://core-pos-preview-7.preview.emergentagent.com/expense-setup`

---

## 1. Implementation Summary

### BUG-DND-CR059 — Root Cause
`PUT /expense/expenses/{catId}` silently ignores `stock_title` in the request body (backend no-op). Confirmed via 8 curl probes on preprod.

### Fix Applied
`handleDragEnd` in `ExpenseSetupPanel.jsx` rewritten:
- **Before:** `updateCategory(oldCatId, ...)` + `updateCategory(newCatId, ...)` → both returned 200 but changed nothing
- **After:** `deleteExpenseItem(itemId)` + `createCategoryWithItems(newCat.name, [item.title])` → DELETE removes item, POST re-creates in new category

### BUG-P2 — Fix Applied
`GripVertical` column (header `<th>` + body `<td>`) removed from items table. Hidden `<span {...dragHandleProps}>` retained to satisfy `@hello-pangea/dnd` API. `GripVertical` import cleaned up.

---

## 2. Test Cases

| # | Test | Steps | Expected | Priority |
|---|------|-------|----------|----------|
| T1 | Cross-category move — happy path | 1. Open `/expense-setup`. 2. Select a category in left panel with ≥2 items. 3. Drag an item row → drop onto a DIFFERENT category pill (left panel). | Item disappears from source category. Item appears in target category. Toast: "Item moved" | P0 |
| T2 | Cross-category move — item count updates | After T1, click source category pill (left). | Item count and items list reflect moved item is gone. Target category count + 1. | P0 |
| T3 | Move persists after page refresh | After T1, refresh page. | Item is in new category (backend persisted). NOT in old category. | P0 |
| T4 | No drag handle icons visible in items table | Open `/expense-setup`. Look at items table (right panel). | No ⠿ grip icons visible in any row. Rows are NOT draggable by any visible handle. | P2 |
| T5 | Drop onto same category pill — no-op | Drag item from a category → drop onto the SAME category pill. | Nothing happens. No toast. Item stays in place. | P1 |
| T6 | Error fallback — if move fails | (Simulate by disconnecting or using non-existent category) | Toast "Move failed". Items list refreshes to pre-move state (fetchAll called). | P1 |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | Inline item DELETE still works (trash icon) | `deleteExpenseItem` is now also used in handleDragEnd — verify no shared state conflict |
| R2 | Category rename still works | `updateCategory` is still used for rename — not affected by DnD rewrite |
| R3 | Add new category + items still works | `createCategoryWithItems` is now also used by handleDragEnd — verify no conflict |
| R4 | `/expenses` (Daily Entry panel) unaffected | No changes to entry panel files |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES (CR-059 IMPLEMENTED, pos_5_0)
BUG_TRACKER.md: BUG-DND-CR059 row added (IMPLEMENTED + SELF-TEST PASS)
FILE_OWNERSHIP.md: ExpenseSetupPanel.jsx updated
Code markers: BUG-DND-CR059 in ExpenseSetupPanel.jsx (line 287)
Compile: webpack 1 warning (pre-existing, unchanged)
EXIT GATE: ALL 5 PASSED
```

---

## 5. API Self-Test Results (curl verification on preprod)

```
Step 1: POST store_expense → item created in "Others" (id=4269)  ✅
Step 2: DELETE /expenses/4269 → {"message":"Expense deleted."}    ✅
Step 3: POST store_expense → item created in "Milk" (id=4270)     ✅
Step 4: GET expenses-list → item in "Milk" category               ✅
Step 5: Cleanup DELETE /expenses/4270                              ✅
```

---

## 6. Notes for QA Agent

- The DnD feature requires dragging items from the **right panel** (items table) and dropping onto **category pills on the left panel**. Dropping anywhere else (background, other rows in same table) is a no-op.
- After a successful move, the item gets a **new database ID** (DELETE removes old, POST creates new). This is by design — `fetchAll()` refreshes all state after each move.
- The `cafe103` test account has multiple categories (Others, Milk, Delivery, Kitchen, etc.) for testing moves.
- Category pills with `isDraggingOver` state show an orange dashed border as a visual drop target indicator (existing BUG-150 fix).
