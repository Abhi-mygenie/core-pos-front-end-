# Investigation Report — CR-059 Post-Implementation Bug Audit
**ID:** BUG-150 / BUG-151 / BUG-152 / BUG-153
**Date:** 2026-07-07
**Role:** INVESTIGATION (Role 6)
**Steps used:** 6/10
**Triggered by:** Owner-reported issues during CR-059 smoke

---

## 1. Summary

| ID | Summary | Classification | Confidence | Steps |
|---|---|---|---|---|
| BUG-150 | DnD item bounces back to original category | FE_BUG | HIGH | 2 (curl + code trace) |
| BUG-151 | Edit transaction fails silently | FE_BUG | HIGH | 2 (curl confirms 422/redirect with wrong key) |
| BUG-152 | Delete transaction fails (405) | FE_BUG + BACKEND_CONTRACT | HIGH | 1 (curl confirms 405) |
| BUG-153 | Add expense: category required, no cross-category search | FE_BUG (design gap) | HIGH | code trace |

---

## 2. Hypotheses Tested

### BUG-150 — DnD bounce

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | `item.categoryId` is null (API returns no category_id field) | curl `expenses-list` response | **CONFIRMED** | `/app/memory/evidence/BUG-CR059-DND/api_response_items.json` |
| H2 | Hidden placeholder breaks Droppable hit area | code trace `ExpenseSetupPanel.jsx` | **CONFIRMED** | `display:none` wrapper on `{provided.placeholder}` |

### BUG-151 — Edit fails

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | `startEdit` sets `editRow.expense` but service reads `data.exp_name` | code trace + curl probe | **CONFIRMED** | `/app/memory/evidence/BUG-CR059-EDIT/api_response_edit.json` |

### BUG-152 — Delete fails

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | `/edit-expense/{id}` does not support DELETE | curl DELETE probe | **CONFIRMED** | HTTP 405 — "Supported methods: PUT" |
| H2 | A dedicated delete endpoint exists elsewhere | curl scan of likely paths | **CONFIRMED** | `DELETE /delete-expense/{id}` → HTTP 200 |

### BUG-153 — Add UX

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Category is required in validator; items filtered by categoryId | code trace `EntryLine` L177, L413 | **CONFIRMED** | `!l.categoryId` in hasErrors check; `filteredItems(line.categoryId)` |

---

## 3. Data Flow Trace

### BUG-150
```
API: GET /expenses-list
  → Response: { id, stock_title, category_name }  ← NO category_id
  → Transform fromAPI.expenseItems: item.categoryId = t.category_id ?? null  ← always null
  → handleDragEnd: oldCatId = item.categoryId  ← always null
  → categories.find(c => c.id === null)  ← never found → oldCat = undefined
  → allItems.filter(i => i.categoryId === newCatId)  ← always empty (all null)
  → PUT new category with only 1 item (destroys others) + old category never updated
BREAK POINT: expenseTransform.js — item has no category_id from API
SECONDARY: ExpenseSetupPanel.jsx — placeholder hidden with display:none
```

### BUG-151
```
UI: edit pencil click → startEdit(tx)
  → editRow = { expense: tx.expense, ... }   ← key "expense"
  → saveEdit() → editExpenseEntry(id, editRow)
  → expenseService.editExpenseEntry: PUT { exp_name: data.exp_name, ... }   ← reads "exp_name" (undefined!)
  → API PUT with exp_name: undefined → validation error → HTML redirect
BREAK POINT: expenseService.js L128 — reads wrong key
```

### BUG-152
```
UI: delete confirm → confirmDelete(id)
  → deleteExpenseEntry(id)
  → expenseService: DELETE /edit-expense/{id}   ← wrong path
  → Backend: HTTP 405 "DELETE not supported, Supported: PUT"
BREAK POINT: constants.js — DELETE_EXPENSE missing; deleteExpenseEntry reuses EDIT_EXPENSE
CORRECT PATH: DELETE /delete-expense/{id} → HTTP 200 confirmed
```

### BUG-153
```
UI: EntryLine — Category select rendered first, required
  → validator: hasErrors includes !l.categoryId
  → ItemCombobox items: filteredItems(line.categoryId) → empty when categoryId = null
BREAK POINT: EntryLine design — category-first, required, items dependent on category
```

---

## 4. Evidence Artifacts

| Bug | Evidence path |
|---|---|
| BUG-150 | `/app/memory/evidence/BUG-CR059-DND/api_response_items.json` |
| BUG-151 | `/app/memory/evidence/BUG-CR059-EDIT/api_response_edit.json` |
| BUG-152 | `/app/memory/evidence/BUG-CR059-DEL/api_response_delete_405.json` |
| BUG-153 | code trace only — no curl needed |

---

## 5. Recommendations

| ID | Classification | Planning Skip? | Reason |
|---|---|---|---|
| BUG-150 | FE_FIX | NO — >10 lines, 1 file | ~20 lines: `handleDragEnd` rewrite (categoryName lookup) + placeholder fix + hover UX improvement |
| BUG-151 | FE_FIX | **YES eligible** — 1 file, ~1 line, not hotspot, not financial | `expenseService.js:128` — change `data.exp_name` → `data.expense ?? data.exp_name` |
| BUG-152 | FE_FIX | NO — 2 files | `constants.js` (add `DELETE_EXPENSE`) + `expenseService.js` (update endpoint) |
| BUG-153 | FE_FIX | NO — >10 lines, 1 file | ~30 lines in `ExpenseEntryPanel.jsx`: remove required, show all items with category hints, auto-fill category |

**Proposed grouping:**
> BUG-150 + BUG-151 + BUG-152 + BUG-153 → single Planning session (all in expense module, no hotspots, no financial logic). Impact Analysis + Implementation Plan as a batch, then single Implementation session.

**BUG-151 special case:**
> Planning skip eligible. 1 line, 1 file, no hotspot, no financial. Owner approval required per OWNER APPROVAL MATRIX: "Planning-skip/direct bug-fix path after Investigation."

---

## 6. Retroactive Candidates

None — all 4 bugs are NEW findings not previously registered.

---

## Owner Approval Required (per OWNER APPROVAL MATRIX)

```
OWNER APPROVAL REQUIRED
Reason: Planning-skip/direct bug-fix path after Investigation (for BUG-151 only)
        Full gate cycle choice needed for BUG-150, BUG-152, BUG-153
Risk: BUG-150: MEDIUM | BUG-151: HIGH (API contract) | BUG-152: HIGH | BUG-153: MEDIUM
Proposed options:
  A) BUG-151 planning skip → Bug Fix directly (owner approves). Others → Planning (Gate 2-3).
  B) All 4 → single Planning batch → single Implementation session (safest).
  C) All 4 → planning skip as a group (requires explicit owner approval).
I will not proceed until owner approves.
```
