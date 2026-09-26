# Impact Analysis — CR-388
## Editable Min Alert Unit Field

**Date:** 2026-09-25
**Agent Role:** PLANNING (Gate 2 — Impact Analysis)
**Sprint:** TBD (next sprint after sep_bug_closure)
**Intake doc:** `change_requests/CR-388_EDITABLE_MIN_ALERT_UNIT_INTAKE.md`
**Risk:** MEDIUM

---

## Header

| Field | Value |
|---|---|
| **Code Reality** | NONE — `grep -rn "CR-388" src/` → 0 hits. No editable min unit field exists. Min unit is a read-only span in all 3 locations. |
| **Conflict Pre-Check** | PARALLEL-SAFE. BUG-461 (2026-09-25) touched BulkEditor L39/L79/L81. CR-388 touches L478. BUG-456 (2026-09-24) touched InventorySetupPanel L190. CR-388 touches L189/L379/L459. All disjoint. |
| **Risk** | MEDIUM — 2 files, modifies form state in hotspot-adjacent inventory panel, API contract already wired. |
| **Fast Lane** | NO — 2 files, multiple form sites. |

---

## 1. Root Cause (confirmed in code)

Min alert unit is locked to `smallUnit` by design (BUG-269-C / BUG-309). The field exists in all transforms and API payloads but the UI never lets the user change it independently.

**Three locked locations:**
- `InventorySetupPanel.jsx:379-383` — add form `<span>` showing `newIng.smallUnit || newIng.unit`
- `InventorySetupPanel.jsx:459-463` — edit form `<span>` showing `editIng.smallUnit || editIng.unit`
- `IngredientBulkEditor.jsx:478-481` — bulk edit `<span>` showing `row.minUnitAlert || row.smallUnit || row.unit`

---

## 2. Data Flow Trace

```
GET /inventory/master
  → inventoryTransform.fromAPI → minUnitAlert: item.min_unit_alert || ''  (BUG-219)
  ↓
InventorySetupPanel state: newIng.minUnitAlert / editIng.minUnitAlert
IngredientBulkEditor: buildRow() L38 → row.minUnitAlert = ing.minUnitAlert  (already copied)

  ↓ UI (CURRENT) ↓

Read-only <span> locked to smallUnit || unit  (BUG-269-C / BUG-309)

  ↓ UI (CR-388) ↓

IF ingredient has smallUnit:
  Dropdown with exactly 2 options: [unit, smallUnit]
  → e.g. base=tin, small=gm → dropdown shows "tin | gm"
  → e.g. base=kg, small=gm  → dropdown shows "kg | gm"
  Default = smallUnit (auto-fill); user can override to base unit.

IF ingredient has NO smallUnit:
  Read-only span showing unit (same as today — no choice to offer)

  ↓ Save (UNCHANGED) ↓

inventoryTransform.toAPI.addIngredient   → min_unit_alert: data.minUnitAlert  ✅ already wired
inventoryTransform.toAPI.updateIngredient → min_unit_alert: data.minUnitAlert  ✅ already wired
```

**Key: The entire API path already exists. CR-388 is a pure UI change — 4 spans conditionally become 2-option dropdowns.**

---

## 3. Files WILL Change

| # | File | Sites | Risk |
|---|---|---|---|
| E1 | `src/components/inventory/InventorySetupPanel.jsx` | L379-383 (add form) | LOW |
| E2 | `src/components/inventory/InventorySetupPanel.jsx` | L459-463 (edit form) | LOW |
| E3 | `src/components/inventory/InventorySetupPanel.jsx` | L189 in `startEdit()` | LOW |
| E4 | `src/components/inventory/IngredientBulkEditor.jsx` | L478-481 (bulk edit column) | LOW |

**Files will NOT touch:** `inventoryTransform.js` · `inventoryService.js` · BulkEditor `handleSave` · `recipeTransform.js` · any other file.

---

## 4. OD-388-01 Decision Applied — Dropdown Options

**LOCKED (updated 2026-09-25):** Unit options are NOT the global unit list. They are only the ingredient's own base and small unit.

```js
// Options derivation (at most 2):
const minUnitOptions = [unit, smallUnit].filter(Boolean);
// e.g. unit='tin', smallUnit='gm'  → ['tin', 'gm']
// e.g. unit='kg',  smallUnit='gm'  → ['kg', 'gm']
// e.g. unit='pieces', smallUnit='' → ['pieces']  → no dropdown (read-only span)
```

**Rule:** If `smallUnit` is empty/absent → keep read-only span (1 option = no real choice). If `smallUnit` exists → show 2-option `<select>`.

**`units` prop in BulkEditor:** NOT needed for this feature. Each row already carries `row.unit` and `row.smallUnit`. The global `units` array is irrelevant.

---

## 5. Owner Decisions — ALL LOCKED

| OD | Decision |
|---|---|
| OD-388-01 | **Options = [baseUnit, smallUnit] only. Max 2. NOT global list. Read-only if no smallUnit.** Updated 2026-09-25. |
| OD-388-02 | **(a)** Auto-default to smallUnit; user can override independently |
| OD-388-03 | **(a)** All 3 locations: add form + edit form + bulk edit |

---

## 6. Conflict Pre-Check

| File | Recent modifier | Verdict |
|---|---|---|
| `InventorySetupPanel.jsx` | BUG-456 (2026-09-24) L190 stockQty | PARALLEL-SAFE — E1-E3 on L189/L379/L459 |
| `IngredientBulkEditor.jsx` | BUG-461 (2026-09-25) L39/L79/L81 | PARALLEL-SAFE — E4 on L478 |

---

## 7. Downstream Consumers

| Consumer | Impact |
|---|---|
| Ingredient list display `L497` — `${ing.minQtyAlert} ${ing.minUnitAlert \|\| ing.unit}` | Automatically shows whatever is now saved. ✅ No change needed. |
| `inventoryTransform.toAPI` — all 3 save paths already send `min_unit_alert: data.minUnitAlert` | ✅ No change needed. |
| `AutoShoppingList`, `PurchaseEntryPanel`, `ReorderForecastWidget` | Read `ing.minUnitAlert` for their own filters — not affected. ✅ |

---

**Planning complete: CR-388**
Stage: Impact Analysis (Gate 2)
Code reality: NONE
Risk: MEDIUM
Files WILL change: `InventorySetupPanel.jsx` (E1–E3) · `IngredientBulkEditor.jsx` (E4)
Owner decisions: ALL LOCKED
Next: Gate 3 Implementation Plan
