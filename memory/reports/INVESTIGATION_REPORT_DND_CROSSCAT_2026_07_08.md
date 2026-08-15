# Investigation Report — Cross-Category DnD Backend Failure

**ID:** BUG-DND-CR059 (open item from BUG-150 post-fix)
**Date:** 2026-07-08
**Role:** INVESTIGATION (Role 6)
**Steps used:** 8/10
**Triggered by:** Owner-reported: items dragged to new category bounce back (no persistence)

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause | `PUT /expense/expenses/{category_id}` silently ignores the `stock_title` array |
| Classification | BACKEND_CONTRACT_MISMATCH |
| Confidence | HIGH (reproduced in 7 consecutive curl probes) |
| Frontend workaround | YES — DELETE + POST workflow achieves same result |
| Steps used | 8/10 |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Backend ignores `stock_title` in PUT (object array format) | PUT with new item in obj array → check expenses-list after | **CONFIRMED** | api_probe_results.json probe 1 |
| H2 | Flat string array format works for PUT | PUT with flat string array | **ELIMINATED** — HTML redirect (Laravel validation error) | api_probe_results.json probe 2 |
| H3 | PUT renames category_name only; stock_title ignored entirely | PUT with different category_name → "Category not found" | **CONFIRMED** — name must match existing; items list unchanged | api_probe_results.json probe 3 |
| H4 | DELETE `/expenses/{item_id}` works for stock items | DELETE item 4268 → verify removed | **CONFIRMED** — item removed | api_probe_results.json probe 4 |
| H5 | POST `store_expense` can add item to named category → returns new ID | POST with category_name + stock_title | **CONFIRMED** — item created, new ID returned | api_probe_results.json probe 5 |

---

## 3. Data Flow Trace

```
UI: drag item → drop on category pill
  → handleDragEnd: destination.droppableId = newCatId
  → expenseService.updateCategory(oldCatId, oldCat.name, oldItems)
      → PUT /expense/expenses/{oldCatId} { category_name: "Milk", stock_title: [{title:"396"}] }
      ← Response: {"message":"Update successful."}  ← NO actual change in DB
  → expenseService.updateCategory(newCatId, newCat.name, [...newItems, {title: item.title}])
      → PUT /expense/expenses/{newCatId} { category_name: "Others", stock_title: [{title:...}] }
      ← Response: {"message":"Update successful."}  ← NO actual change in DB
  → fetchAll() → expenses-list shows item STILL in old category
  → UI reverts (optimistic update undone) → item appears to "bounce back"

BREAK POINT: PUT /expense/expenses/{id} backend silently ignores stock_title array.
             It validates category_name matches existing name for that ID, then returns 200 with no-op.
```

---

## 4. Evidence Artifacts

All saved to: `/app/memory/reports/evidence/BUG-DND-CR059/`

| Probe | Description | Result |
|---|---|---|
| 1 | PUT obj-array with new item | 200 "Update successful" — item NOT added |
| 2 | PUT flat-string-array | HTML redirect (Laravel validation error) |
| 3 | PUT with different category_name | `{"errors":[{"code":"not_found","message":"Category not found."}]}` |
| 4 | DELETE `/expenses/{item_id}` | 200 "Expense deleted." — item removed ✅ |
| 5 | POST `store_expense` with category + items | 200 — item created with new ID ✅ |

---

## 5. Root Cause Analysis

The `PUT /expense/expenses/{category_id}` endpoint has the following actual behavior:
1. Validates `category_name` exists and matches `category_id`
2. If no match → returns `{"errors":[{"code":"not_found","message":"Category not found."}]}`
3. If match → returns `{"message":"Update successful."}` — **no DB write of items**

The `stock_title` field in the PUT body is **completely ignored** by the backend. This is a backend contract gap — the API discovery documented it as "Update category + items" but the actual implementation only validates the category name.

---

## 6. Frontend Workaround (AVAILABLE)

**The correct API pathway to "move" a stock item from category A → category B:**

```
Step 1: DELETE /api/v2/vendoremployee/expense/expenses/{item.id}
        → removes item from current category (returns {"message":"Expense deleted."})

Step 2: POST /api/v2/vendoremployee/expense/store_expense
        → body: { category_name: newCategoryName, stock_title: [item.title] }
        → creates item in new category (returns { category: {...}, stock_items: [{id: newId, ...}] })
```

**Side effects of this approach:**
- The item gets a NEW database ID after the move (old ID is deleted, new ID created)
- This is acceptable since `fetchAll()` is called after the move to refresh state
- Item title must be unique enough to avoid creating duplicates if called twice

---

## 7. Recommendations

| Classification | BACKEND_CONTRACT_MISMATCH + FE_FIX available |
|---|---|
| **Backend Brief needed?** | YES — document that PUT ignores stock_title (backend team should fix if they want update API to work) |
| **FE Workaround** | YES — rewrite `handleDragEnd` to use DELETE + POST |
| **Planning Skip eligible?** | NO — >10 lines, 2 service calls, refactoring `handleDragEnd` + `expenseService` |
| **Recommended path** | Full gate cycle (Gate 2 Impact Analysis → Gate 3 Plan → Gate 4 GO → Bug Fix) |

### Files that WILL change
- `expenseService.js` — add `deleteExpenseItem(itemId)` + `addItemToCategory(catName, itemTitle)` functions
- `ExpenseSetupPanel.jsx` — rewrite `handleDragEnd` to use DELETE + POST flow

### Files that WILL NOT touch
- `expenseTransform.js` — no transform changes needed
- `constants.js` — DELETE_EXPENSE endpoint already exists; may need to verify path for stock-item delete vs transaction delete
- All order/payment files — not in scope

---

## 8. Backend Brief

```markdown
# BACKEND_BRIEF_DND_CR059_2026_07_08

## Summary
- Issue: PUT /expense/expenses/{category_id} silently ignores stock_title array
- Classification: CONTRACT_MISMATCH
- Frontend impact: Cannot move stock items between expense categories via DnD
- Priority/Risk: P1 / MEDIUM

## Endpoint
- Method: PUT
- URL: /api/v2/vendoremployee/expense/expenses/{category_id}
- Auth: Bearer token (vendor employee role)

## Reproduction
1. GET /expense/expenses-list → confirm item X is in category A
2. PUT /expense/expenses/{catA_id} { category_name: "CatA", stock_title: [{title:"X"}, {title:"NEW_ITEM"}] }
3. GET /expense/expenses-list → NEW_ITEM is NOT present; only original items remain

## Payload / Response
- Request: { "category_name": "Milk", "stock_title": [{"title":"396"}, {"title":"Milk 260"}, {"title":"NEW"}] }
- Actual response: {"message":"Update successful."}
- Expected: NEW item should appear in Milk category in subsequent GET

## Evidence
- Curl probes: /app/memory/reports/evidence/BUG-DND-CR059/api_probe_results.json

## Frontend Workaround
- Available: YES
- Details: DELETE /expense/expenses/{item_id} + POST /expense/store_expense with new category
```

---

## 9. Retroactive Candidates

None.

---

## Owner Approval Required (per OWNER APPROVAL MATRIX)

```
OWNER APPROVAL REQUIRED
Reason: Full gate cycle needed before Bug Fix implementation (>10 lines, 2 API calls)
Risk: MEDIUM (DnD category reassignment — expense module only, non-financial)
Proposed options:
  A) Proceed to Planning (Gate 2 Impact Analysis) in the next session
  B) Planning skip — implement FE workaround directly this session (owner must approve)
     (scope: 2 files, ~20 lines, all within expense module, non-financial)
I will not proceed until owner approves.
```
