# BUG-160 — Gate 3: Implementation Plan

**ID:** BUG-160
**Gate:** 3 — Implementation Plan
**Date:** 2026-07-10
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Depends on:** Discover audit 2026-07-10 — `PUT /expense/category/{id}` and `DELETE /expense/category/{id}` confirmed live
**Risk:** LOW
**Effort:** FAST LANE (3 files, ~15 lines total)

---

## Root Cause (confirmed 2026-07-10)

`renameCategory(catId, name)` in `ExpenseSetupPanel.jsx` calls `updateCategory(catId, name, items)`.
That calls `PUT /expense/expenses/{catId}` with `{ category_name, stock_title }`.
Backend looks up by `category_name` string in the body (not by the `catId` in the URL) → returns "Category not found."
No working rename endpoint existed before 2026-07-10.

**Backend fix shipped (2026-07-10):**
- `PUT /expense/category/{id}` with `{ category_name: "..." }` → `{ message: "Category updated successfully.", category: { id, name } }`
- `DELETE /expense/category/{id}` → `{ message: "Category deleted successfully.", moved_items_count: N }`

**Also covered in this plan:**
`deleteCategory()` currently deletes each stock item one-by-one and has no direct category delete call.
The new `DELETE /expense/category/{id}` endpoint handles this atomically (backend moves orphaned items to misc automatically).

---

## Scope Lock

### Files WILL change (existing — additive only)

| File | Change | Lines delta |
|------|--------|------------|
| `api/constants.js` | `CATEGORY` constant — **shared with BUG-159**. If BUG-159 ships first, this is already done. | 0 if BUG-159 already merged, else +2 |
| `api/services/expenseService.js` | Add 2 functions: `renameExpenseCategory()`, `deleteExpenseCategory()` | +9 lines |
| `components/expense/ExpenseSetupPanel.jsx` | Swap call in `renameCategory()` + replace body of `deleteCategory()` | 3 lines changed |

### Files OUT OF SCOPE — DO NOT TOUCH
- `expenseTransform.js` — not involved
- Any order / billing / menu files

---

## Execution Sequence

---

### Step 1 — `api/constants.js` — CATEGORY constant (skip if BUG-159 already merged)

**File:** `/app/frontend/src/api/constants.js`

**Check first:**
```bash
grep "CATEGORY:" src/api/constants.js
```
If `CATEGORY:` key already exists (from BUG-159 fix), **skip this step entirely.**

If not present — insert after `UPDATE_CATEGORY` line:
```javascript
  CATEGORY: '/api/v2/vendoremployee/expense/category',              // POST (create empty), PUT /{id} (rename), DELETE /{id}
```

---

### Step 2 — `api/services/expenseService.js` — Add renameExpenseCategory() and deleteExpenseCategory()

**File:** `/app/frontend/src/api/services/expenseService.js`

**Locate block** (verify before editing — currently near line 47):
```javascript
export const updateCategory = (categoryId, categoryName, items = []) =>
  api.put(`${EXPENSE_ENDPOINTS.UPDATE_CATEGORY}/${categoryId}`, {
```

**Insert AFTER the closing of `updateCategory` function:**
```javascript

/**
 * PUT /expense/category/{id} — rename category by ID
 * BUG-160: replaces updateCategory() which returned "Category not found"
 * Response: { message: "Category updated successfully.", category: { id, name } }
 */
export const renameExpenseCategory = (id, name) =>
  api.put(`${EXPENSE_ENDPOINTS.CATEGORY}/${id}`, { category_name: name });

/**
 * DELETE /expense/category/{id} — delete category atomically
 * BUG-160: replaces per-item delete loop; backend moves items to misc automatically
 * Response: { message: "Category deleted successfully.", moved_items_count: N }
 */
export const deleteExpenseCategory = (id) =>
  api.delete(`${EXPENSE_ENDPOINTS.CATEGORY}/${id}`);

```

---

### Step 3 — `components/expense/ExpenseSetupPanel.jsx`

**File:** `/app/frontend/src/components/expense/ExpenseSetupPanel.jsx`

#### 3a — Swap renameCategory() call

**Verify before editing (currently line ~168–170):**
```javascript
  const renameCategory = async (catId, name) => {
    const items = allItems.filter(i => String(i.categoryId) === String(catId));
    try {
      await expenseService.updateCategory(catId, name, items);
```

**Replace the function body with:**
```javascript
  const renameCategory = async (catId, name) => {
    try {
      await expenseService.renameExpenseCategory(catId, name);
```

**Lines removed:** the `items` filter (line 168) and old service call.
**Toast, catch, fetchAll() remain unchanged.**

#### 3b — Replace deleteCategory() body

**Verify before editing (currently line ~179–194):**
```javascript
  const deleteCategory = async () => {
    if (!deletingCatId) return;
    // Delete all items in category first
    const catItems = allItems.filter(i => String(i.categoryId) === String(deletingCatId));
    try {
      await Promise.all(catItems.map(i => expenseService.deleteExpenseItem(i.id)));
      toast({ title: "Category removed" });
```

**Replace with:**
```javascript
  const deleteCategory = async () => {
    if (!deletingCatId) return;
    try {
      await expenseService.deleteExpenseCategory(deletingCatId);
      toast({ title: "Category removed" });
```

**Lines removed:** the `catItems` filter, the `Promise.all` per-item loop.
**Remaining lines** (`setDeletingCatId(null)`, `selectedCategoryId` guard, `fetchAll()`, `catch`) remain unchanged.

---

## Verification Matrix

| # | Check | How |
|---|-------|-----|
| 1 | constants.js compiles | webpack 0 new errors |
| 2 | expenseService.js compiles | webpack 0 new errors |
| 3 | Click rename icon → type new name → save | Network tab: `PUT /expense/category/{id}` fires with `{"category_name":"..."}` |
| 4 | Rename response | `{"message":"Category updated successfully.","category":{"id":N,...}}` |
| 5 | Category name updates in sidebar | `GET /category-list` fires; new name visible |
| 6 | Toast on rename | "Renamed" toast fires |
| 7 | Click delete icon → confirm | Network tab: `DELETE /expense/category/{id}` fires |
| 8 | Delete response | `{"message":"Category deleted successfully.","moved_items_count":N}` |
| 9 | Category removed from sidebar | `GET /category-list` fires; deleted category gone |
| 10 | Toast on delete | "Category removed" toast fires |

**Total: 10 checks (2 automated, 8 browser)**

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | `updateCategory()` still used by other callers after this fix | LOW | After BUG-160 fix, `updateCategory()` in expenseService has ZERO callers. Can be marked `@deprecated` or removed in a follow-up cleanup. |
| R2 | Backend `DELETE /category/{id}` moves items to "misc" silently | LOW | Backend returns `moved_items_count` in response. FE does not need to surface this — fetchAll() will re-sync state correctly. |
| R3 | `CATEGORY` constant not yet present if BUG-159 didn't ship | LOW | Step 1 has explicit grep check. |
| R4 | Optimistic state: user sees old category name until fetchAll() completes | LOW | Pattern matches all other CR-059 operations. Spinner is shown via `addingCat` state (already in place). |

---

## Post-Fix Dead Code Note

After BUG-160 is fixed:
- `expenseService.updateCategory()` → 0 callers. Mark `@deprecated // G15 — now dead code` or delete.
- `EXPENSE_ENDPOINTS.UPDATE_CATEGORY` → 0 callers. Same treatment.

This is non-blocking — can be done in a separate cleanup PR.

---

## Summary

```
Gate 3 complete: BUG-160
Files changed: 3 (api/constants.js, expenseService.js, ExpenseSetupPanel.jsx)
Lines delta: +9 lines added, 3 lines changed
Backend blocker: RESOLVED (2026-07-10)
Also covers: deleteCategory() atomic fix (was deleting items one-by-one)
STATUS: GATE 4 GO — ready for Bug Fix agent
```
