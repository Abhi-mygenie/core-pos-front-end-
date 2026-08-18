# CR-103 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** PARTIAL — × button exists (functionality works, visibility is the issue). Select-all: NONE.
**Conflict Pre-Check:** BUG-236 targets `AutoShoppingList.jsx` L67/L85/L164 (overflow-hidden for dropdown). Different area (container overflow vs table body). Low conflict — parallel-safe because checkbox changes are in `<thead>` + new column, BUG-236 is in container `className`.
**Risk:** MEDIUM (SmartPurchasePanel is complex stateful component, but changes are additive)

---

## Data Flow Trace

```
SmartPurchasePanel.jsx:
  const [rows, setRows] = useState([])          ← L18: source of truth
  const onRowRemove = (ix) => setRows(...)       ← L114: removes single row
  const validate = () => { ... }                  ← L118-131: checks ALL rows
  const canSubmit = rows.length > 0 && !submitting ← L173
  
    ↓ passes to AutoShoppingList

AutoShoppingList.jsx:
  props: { rows, onRowChange, onRowRemove, onAddAdHoc, ... }
  Table header: 9 columns (no checkbox column)
  Row render: ...inputs... + <X className="w-4 h-4" /> (tiny × button)
  
PROBLEMS:
  1. validate() requires rate > 0 for EVERY row — can't skip unwanted items
  2. × button is 16px + text-slate-400 — barely visible
  3. No checkbox column → no bulk selection → no bulk remove
```

## Sub-A: Validate Blocks Without All Rows Filled

**File:** `SmartPurchasePanel.jsx` L118-131
**Current:**
```js
const badRate = rows.find(r => !(Number(r.rate) > 0));
if (badRate) return `Rate must be > 0 for ${badRate.name}`;
```
**Issue:** Scans ALL rows. If user only wants 5 of 50 items, the other 45 without rates block submission.
**Fix options:**
- Option A: Only validate rows where user has entered qty OR rate (skip untouched rows)
- Option B: Auto-remove rows with qty=0 and rate=0 before validation
- Option C: Filter out rows with no rate/qty at submit time (treat as "skipped")
**Recommendation:** Option A — validate only rows where `r.rate > 0 OR r.qty > 0` (user intent = "I want to buy this"). Rows with neither are auto-skipped.

## Sub-B: Cross Button Too Subtle

**File:** `AutoShoppingList.jsx` L143-146
**Current:**
```jsx
<button type="button" onClick={() => onRowRemove(ix)}
  className="text-slate-400 hover:text-red-500">
  <X className="w-4 h-4" />
</button>
```
**Issue:** 16px icon, `text-slate-400` (light gray) on white. Invisible at a glance with 50 rows.
**Fix:** Increase size to `w-5 h-5`, use `text-slate-500` base color, add `hover:bg-red-50 rounded-full p-1` for visible click target. ~2 lines changed.

## Sub-C: No Select All / Bulk Remove

**File:** `AutoShoppingList.jsx` (header + row) + `SmartPurchasePanel.jsx` (state + handler)
**Current:** No checkbox column. No selection state. No bulk action.
**Fix:**
1. Add `selectedRows` state in `SmartPurchasePanel.jsx` (Set of indices)
2. Pass `selectedRows`, `onToggleRow`, `onToggleAll`, `onBulkRemove` to AutoShoppingList
3. Add checkbox column in `<thead>` (select all) + `<tbody>` (per row)
4. Add "Remove Selected (N)" button near header
**Estimated:** ~25-35 lines across 2 files

## Affected Files

| # | File | Line(s) | Change | Risk |
|---|------|---------|--------|------|
| 1 | `SmartPurchasePanel.jsx` | L18 area | Add `selectedRows` state (Set) | LOW |
| 2 | `SmartPurchasePanel.jsx` | L113-115 area | Add `onToggleRow`, `onToggleAll`, `onBulkRemove` handlers | LOW |
| 3 | `SmartPurchasePanel.jsx` | L118-131 | Adjust validate: skip rows with no rate AND no qty | LOW |
| 4 | `SmartPurchasePanel.jsx` | L213-214 | Pass new props to AutoShoppingList | LOW |
| 5 | `AutoShoppingList.jsx` | L91 (header) | Add checkbox column header + Select All toggle | LOW |
| 6 | `AutoShoppingList.jsx` | L103 (row) | Add checkbox per row | LOW |
| 7 | `AutoShoppingList.jsx` | L143-146 | Make × button more prominent (size + color) | LOW |
| 8 | `AutoShoppingList.jsx` | L85 area | Add "Remove Selected (N)" button in toolbar | LOW |

**Files WILL NOT touch:** purchasePlanner.js, inventoryService.js, inventoryTransform.js, VendorSuggestionCell.jsx, AdHocTypeahead.jsx

## Owner Decisions

None outstanding — owner intent is clear from screenshot + description.

## Scope Lock

- **2 files, ~35-45 lines**
- No API change, no transform change, no financial logic
- Additive state (selection) + validation tweak + styling fix

---

**Next:** Gate 3 (Implementation Plan)
