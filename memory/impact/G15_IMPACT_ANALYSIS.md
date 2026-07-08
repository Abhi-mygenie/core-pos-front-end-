# G15 — Impact Analysis

**ID:** G15
**Gate:** 2 — Impact Analysis
**Date:** 2026-07-10
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Source:** Discover audit 2026-07-10 (10 live curl probes)

---

## What G15 Is

`PUT /api/v2/vendoremployee/expense/expenses/{catId}` silently ignores the `stock_title` array.
The endpoint accepts the request, returns HTTP 200, but does NOT persist any item changes.
Only `category_name` field appears to update (partially, unreliably).

**Constant:** `EXPENSE_ENDPOINTS.UPDATE_CATEGORY = '/api/v2/vendoremployee/expense/expenses'`
**Service function:** `expenseService.updateCategory(categoryId, categoryName, items)`

---

## Four FE Flows That Were Broken by G15

| Flow | Was broken by | FE Fix Applied | Status |
|------|--------------|----------------|--------|
| **Add Item** to existing category | `addItem()` called `updateCategory(catId, name, [newItem])` → silently ignored | BUG-158 (2026-07-08): replaced with `createCategoryWithItems(cat.name, [newItemName])` → `POST /store_expense` | ✅ FIXED |
| **Bulk Save** new items | `handleBulkSave()` called `updateCategory()` per row | BUG-161 (2026-07-08): replaced with `createCategoryWithItems` per row | ✅ FIXED |
| **Cross-category Drag-and-Drop** | `updateCategory()` called on source+target | BUG-DND-CR059: replaced with `deleteExpenseItem(itemId)` + `createCategoryWithItems(newCat, [item])` | ✅ FIXED |
| **Rename Category** | `renameCategory()` called `updateCategory(catId, name, items)` → "Category not found" (also a G3 gap) | BUG-160 plan (2026-07-10): replace with `renameExpenseCategory(catId, name)` → `PUT /expense/category/{id}` | ✅ PLANNED — GATE 4 GO |

---

## Current State of G15 in the Codebase

### `expenseService.updateCategory()` — caller audit

```bash
grep -rn "updateCategory" /app/frontend/src/
```

Expected callers after BUG-158 and BUG-161 fixes:
| Caller | File | Line | Post-BUG-160 status |
|--------|------|------|---------------------|
| `renameCategory()` | `ExpenseSetupPanel.jsx` | ~170 | **REMOVED by BUG-160 fix** |

After BUG-160 ships: `updateCategory()` has **zero callers**.

---

## What Is Resolved vs What Remains

### ✅ Resolved (FE perspective)

All 4 user-facing flows that depended on G15 now have working implementations:
- Add Item → `POST /store_expense` (BUG-158)
- Bulk Save → `POST /store_expense` (BUG-161)
- Cross-cat DnD → `DELETE /expenses/{itemId}` + `POST /store_expense` (BUG-DND-CR059)
- Rename → `PUT /expense/category/{id}` (BUG-160, pending ship)

### 🔴 Still Broken (backend only)

The endpoint `PUT /expense/expenses/{catId}` itself still ignores `stock_title`.
However, **this is now FE-IRRELEVANT** because no FE flow calls it anymore (after BUG-160).

---

## Verdict: FE-IRRELEVANT After BUG-160

**G15 does NOT require a new Gate 3 plan.**

After BUG-160 ships:
- `expenseService.updateCategory()` → dead code (0 callers)
- `EXPENSE_ENDPOINTS.UPDATE_CATEGORY` → dead code (only reference is `updateCategory()`)
- The broken backend endpoint is still broken but nothing calls it

**Recommendation:** Close G15 from FE perspective. Tag it as BACKEND-ONLY in BACKEND_GAPS_BRIEF.html.

**If backend fixes G15 anyway** (they may do so for completeness): No FE work needed. The fix would not be consumed by any FE code.

---

## Cleanup Task (Non-Blocking)

After BUG-160 ships, a separate cleanup step can remove dead code:

| Action | File | Priority |
|--------|------|----------|
| Delete or `@deprecated` `updateCategory()` | `api/services/expenseService.js` | P3 — cosmetic |
| Delete or comment `UPDATE_CATEGORY` constant | `api/constants.js` | P3 — cosmetic |
| Verify `grep -rn "updateCategory"` returns 0 results | Any | P3 — verification |

This cleanup is **not required** for any feature to work correctly.

---

## Summary

```
G15 Impact Analysis: COMPLETE
Backend status: Endpoint still broken (PUT /expense/expenses/{id} ignores stock_title)
FE status: FE-IRRELEVANT after BUG-160 — all 4 affected flows have working replacements
Gate 3 plan: NOT NEEDED
Action required: None (optional dead-code cleanup after BUG-160 ships)
BACKEND_GAPS_BRIEF.html: Update G15 status to "FE-IRRELEVANT — no FE callers remain after BUG-160"
```
