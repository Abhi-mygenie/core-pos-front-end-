# BUG-297 Investigation Report

**ID:** BUG-297  
**Date:** 2026-08-05  
**Investigator:** INVESTIGATION AGENT  
**Steps used:** 5/10

---

## 1. Summary

**Root cause:** `CategoryList.jsx` Add Category (and Edit Category) form has **no printer ID selector UI**. `handleAdd()` calls `menuService.addCategory()` without `printerId` — defaults to `''` — sending `restaurant_printer_id: ''` (empty string) to backend. Backend stores NULL. Station not mapped → KOT printing broken for all items under new categories.

- **Classification:** FE_BUG (UI gap)
- **Confidence:** HIGH — root cause traced end-to-end in code
- **Steps used:** 5/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Add Category form has no printer dropdown → `printerId` never set | Code trace: CategoryList.jsx form state + handleAdd() | **CONFIRMED** | Form state: `formName`, `formStation` only. No `formPrinterId`. |
| H2 | `menuManagementService.addCategory()` strips or ignores printerId | Code trace: menuManagementService.js L85-92 | **ELIMINATED** | Service DOES send it: `formData.append('restaurant_printer_id', String(printerId))` — root cause is upstream |
| H3 | MenuManagementPanel doesn't pass stationPrinterList to CategoryList | Code trace: MenuManagementPanel.jsx | **ELIMINATED** | L199: `stations={stations}` IS passed to CategoryList. stationPrinterList fetched on mount. |

---

## 3. Data Flow Trace

```
User opens Add Category → CategoryList.jsx form
  → formName, formStation set by user
  → formPrinterId: NEVER EXISTS (no state, no input, no dropdown)
  → handleAdd() calls menuService.addCategory({ name, stationName, catOrder })
                                               ↑
                                     printerId omitted → defaults to ''
  → menuManagementService.addCategory L92: formData.append('restaurant_printer_id', String('')) = ''
  → Backend receives restaurant_printer_id = '' (empty)
  → Backend stores NULL for printer_id
BREAK POINT: CategoryList.jsx — form has no printer ID selector

Same issue in Edit mode:
  handleSaveEdit() L72: menuService.editCategory(id, { name, stationName, catOrder })
                                                        ↑ no printerId → edit also loses printer
```

---

## 4. Evidence Artifacts

- Code trace: `/app/memory/evidence/BUG-297/code_trace.md`

---

## 5. Recommendations

**Classification:** FE_FIX

**Scope:** `CategoryList.jsx`
- Add `formPrinterId` state (initial value from `stationOptions[0]?.id || ''`)
- Add printer dropdown in Add Category form (after station select)
- Add printer dropdown in Edit Category form (after station select)
- Wire `printerId: formPrinterId` to both `menuService.addCategory()` and `menuService.editCategory()` calls
- Also fix `handleSaveEdit()` to read the category's current `printerId` for initial value

**Planning skip eligibility:** NO
- 1 file but changes are in 3 places (Add form state, Add form JSX, Edit form JSX + both service calls)
- ~25 lines
- Requires understanding of stationPrinterList data shape for printer dropdown
- Non-hotspot file — but needs Planning to document the dropdown binding correctly

**Recommended next step:** PLANNING (Gate 2 Impact Analysis)

---

## 6. Retroactive Candidates

NONE — no drift found.
