# BUG-159 — Gate 3: Implementation Plan

**ID:** BUG-159
**Gate:** 3 — Implementation Plan
**Date:** 2026-07-10
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Depends on:** Discover audit 2026-07-10 — `POST /expense/category` confirmed live
**Risk:** LOW
**Effort:** FAST LANE (3 files, ~10 lines total)

---

## Root Cause (confirmed 2026-07-10)

`addCategory()` in `ExpenseSetupPanel.jsx` calls `createCategoryWithItems(name, [])`.
That calls `POST /store_expense` with `stock_title: []` (empty array).
Backend returned an HTML redirect when `stock_title` is empty — Axios mis-read as HTTP 200 success.
Toast fires "Category added" but nothing is created.

**Backend fix shipped (2026-07-10):**
New endpoint `POST /expense/category` accepts `{ category_name: "..." }` and returns `{ category: { id: N, name: "..." } }`.
No `stock_title` required. UX decision no longer needed.

---

## Scope Lock

### Files WILL change (existing — additive only)

| File | Change | Lines delta |
|------|--------|------------|
| `api/constants.js` | Add 1 constant: `CATEGORY` | +2 lines |
| `api/services/expenseService.js` | Add 1 function: `createEmptyCategory()` | +4 lines |
| `components/expense/ExpenseSetupPanel.jsx` | Swap call in `addCategory()` | 1 line changed |

### Files OUT OF SCOPE — DO NOT TOUCH
- `expenseTransform.js` — not involved
- `ExpenseSetupPage.jsx` — not involved
- All order / billing / settlement / menu files

---

## Execution Sequence

---

### Step 1 — `api/constants.js` — Add CATEGORY constant

**File:** `/app/frontend/src/api/constants.js`

**Locate block** (verify before editing — currently near line 332):
```javascript
  UPDATE_CATEGORY: '/api/v2/vendoremployee/expense/expenses',       // PUT /{category_id}
```

**Insert after that line:**
```javascript
  CATEGORY: '/api/v2/vendoremployee/expense/category',              // POST (create empty), PUT /{id} (rename), DELETE /{id}
```

---

### Step 2 — `api/services/expenseService.js` — Add createEmptyCategory()

**File:** `/app/frontend/src/api/services/expenseService.js`

**Locate block** (verify before editing — currently near line 34):
```javascript
export const createCategoryWithItems = (categoryName, itemNames = []) =>
  api.post(EXPENSE_ENDPOINTS.STORE_EXPENSE, {
```

**Insert ABOVE that block:**
```javascript
/**
 * POST /expense/category — create empty category (no items required)
 * BUG-159: replaces createCategoryWithItems(name, []) which silently failed
 * Response: { category: { id: N, name: "..." } }
 */
export const createEmptyCategory = (categoryName) =>
  api.post(EXPENSE_ENDPOINTS.CATEGORY, { category_name: categoryName });

```

---

### Step 3 — `components/expense/ExpenseSetupPanel.jsx` — Swap call in addCategory()

**File:** `/app/frontend/src/components/expense/ExpenseSetupPanel.jsx`

**Verify before editing — currently line ~154:**
```javascript
      await expenseService.createCategoryWithItems(newCatName.trim(), []);
```

**Replace with:**
```javascript
      await expenseService.createEmptyCategory(newCatName.trim());
```

**No other changes needed in this function** — toast, setNewCatName, fetchAll() all stay the same.

---

## Verification Matrix

| # | Check | How |
|---|-------|-----|
| 1 | constants.js compiles | webpack 0 new errors |
| 2 | expenseService.js compiles | webpack 0 new errors |
| 3 | Type category name → click Add Category | Network tab: `POST /expense/category` fires with `{"category_name":"..."}` |
| 4 | Response shape | `{"category":{"id":N,"name":"..."}}` returned |
| 5 | Category list refreshes | `GET /category-list` fires after add; new category appears in left panel |
| 6 | Toast | "Category added" toast fires |
| 7 | Empty name guard | Button disabled when input is blank (existing guard, no change) |

**Total: 7 checks (2 automated, 5 browser)**

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | `createCategoryWithItems(name, [])` is still used by other callers | LOW | grep confirms it's only called from `addCategory()` — no other callers in codebase |
| R2 | Backend returns error for duplicate category name | LOW | Existing `catch` block handles it — "Failed to add category" toast fires |
| R3 | `CATEGORY` constant name conflicts with existing constants | LOW | Verify no duplicate key before saving |

---

## Summary

```
Gate 3 complete: BUG-159
Files changed: 3 (api/constants.js, expenseService.js, ExpenseSetupPanel.jsx)
Lines delta: +6 lines added, 1 line changed
Backend blocker: RESOLVED (2026-07-10)
STATUS: GATE 4 GO — ready for Bug Fix agent
```
