# BUG-456 — Impact Analysis (Gate 2)
**Ingredient edit: Unit + Conversion fields freely editable while stock > 0; backend rejects with 422 after Save**

**Planning agent:** 2026-09-24 · **Code Reality:** NONE · **Conflict Pre-Check:** CLEAN
**Risk:** MEDIUM · **OD-456-01 LOCKED: (b) hard-lock** · **OD-456-02 LOCKED: include IngredientBulkEditor**

---

## Header

| Field | Value |
|---|---|
| Code Reality | **NONE** — `grep ZERO_STOCK\|zeroStock\|stockQty\|originalUnit src/` = 0 hits (2026-09-24) |
| Conflict Pre-Check | **CLEAN** — `InventorySetupPanel.jsx` + `IngredientBulkEditor.jsx` not touched by any active sprint item |
| Hotspot files (R5) | **NONE** |
| Financial logic (R6) | **NO** — validation UI, no payment/order logic |
| Owner decisions | OD-456-01 LOCKED = (b) hard-lock · OD-456-02 LOCKED = include BulkEditor if ≤10 lines · **OD-456-03 LOCKED = NO (full Gate 3). Gate 2 CLOSED 2026-09-24.** |

---

## §1 · OD-456-01 — Decision Impact

**Choice (b) hard-lock** (owner 2026-09-24):
- When an ingredient has `stockQty > 0`: the Unit `<select>` and Conversion Factor `<Input>` are `disabled` (greyed, cursor not-allowed, `opacity-50`).
- No amber warning, no Save-disabled logic — the fields simply cannot be changed.
- Zero-stock ingredients: fields remain freely editable, identical to today.
- No tooltip/message required unless owner asks; behaviour is self-explanatory (greyed field = locked).

---

## §2 · Data Flow Trace — InventorySetupPanel.jsx

```
startEdit(ing)  L183–192:
  setEditIng({ name, categoryId, unit, smallUnit, conversionFactor, minQtyAlert, minUnitAlert })
  ← does NOT capture ing.displayQty / ing.quantity
  ← BREAK POINT A: no stockQty stored in edit state

Edit row L421–427 (unit select):
  <select value={editIng.unit} onChange={...}>   ← freely editable regardless of stock
  ← BREAK POINT B: no disabled gate

Edit row L428–431 (conversion input):
  <Input value={editIng.conversionFactor} onChange={...}>   ← freely editable
  ← BREAK POINT C: no disabled gate

saveEdit() L194–206 → updateIngredient() → API PUT
  ← 422 UNIT_CHANGE_REQUIRES_ZERO_STOCK (user sees red toast, too late)
```

---

## §3 · Affected Files — Exact Edit Sites

### E1 — `src/components/inventory/InventorySetupPanel.jsx`

| Sub | Lines | Change |
|---|---|---|
| E1a | L183–192 `startEdit()` | Add `stockQty: Number(ing.displayQty \|\| ing.calQuantity \|\| ing.quantity) \|\| 0` to `setEditIng({...})` call |
| E1b | L421 unit `<select>` | Add `disabled={!!editIng.stockQty}` + `className` guard: `${editIng.stockQty ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}` |
| E1c | L428 conversion `<Input>` | Add `disabled={!!editIng.stockQty}` + same opacity class |

**Estimated lines added/changed: ~6**. No financial logic. No hotspot. No API payload change.

> Note: `AUTO_CONV_UNITS` / `NO_CONV_UNITS` branches still gate whether conversion is shown at all. E1c only applies when the input is rendered (i.e. unit has a conversion — the existing branch logic is untouched).

---

### E2 — `src/components/inventory/IngredientBulkEditor.jsx` (OD-456-02 LOCKED)

**Scope check:** `allItems` prop feeds `buildRow()` which reads from `inventoryTransform.ingredients()`. That transform already maps `displayQty`, `calQuantity`, `quantity` on every row (L22–32 of transform). → stock quantity is already available in `allItems`.

| Sub | Lines | Change |
|---|---|---|
| E2a | `buildRow(ing)` L24–35 | Add `stockQty: Number(ing.displayQty \|\| ing.calQuantity \|\| ing.quantity) \|\| 0` to the returned object |
| E2b | Unit `<select>` L446–450 | Add `disabled={!row._isNew && row.stockQty > 0}` + opacity class |
| E2c | Conversion `<input>` L462–463 | Add `disabled={!row._isNew && row.stockQty > 0}` + opacity class |

**New rows (`_isNew = true`) always editable** — a brand-new ingredient has zero stock by definition.

**Estimated lines added/changed: ~5–6**. Total for OD-456-02 ≤ 10 lines — **within threshold.** ✅

---

## §4 · Scope Lock

**Files WILL change:** `InventorySetupPanel.jsx` · `IngredientBulkEditor.jsx`
**Files will NOT touch:** `inventoryService.js` (no API call change) · `inventoryTransform.js` (no transform change needed — stockQty read directly from prop) · any hotspot file · any test file (low priority; behaviour is simple disabled prop)

**Total estimated lines:** ~11–12 lines across 2 files.

---

## §5 · OD-456-03 — Planning Skip

| Option | Tradeoff |
|---|---|
| YES (skip to direct fix) | 2 files, ~12 lines, no hotspot, no API change — technically qualifies except for 2-file rule |
| NO (full Gate 2–3) | Standard flow; this IA already covers Gate 2; Gate 3 plan is trivial |

**OD-456-03 LOCKED — NO skip. Full Gate 3 Implementation Plan required. Gate 2 CLOSED 2026-09-24.**

---

## §6 · Risk Register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | `displayQty` / `quantity` may be 0 on newly-added but unsaved rows in BulkEditor | LOW — `_isNew` guard in E2b/E2c already handles this | `!row._isNew &&` guard |
| R2 | Backend may add other fields that require zero-stock in future | OUT OF SCOPE — backend doc rule R3 only covers unit + converion_factor | Document in notes |
| R3 | InventorySetupPanel `editIng` reset on `cancelEdit()` — no cleanup needed | N/A — no new state keys that persist post-cancel | `setEditingId(null)` already wipes the form |

---

## §7 · Verification Matrix

| # | Edit | How to verify | Automated? |
|---|---|---|---|
| V1 | E1a: `editIng.stockQty` populated on startEdit | Browser: pencil on ingredient with stock > 0 → inspect React state `editIng.stockQty` > 0 | NO (DevTools) |
| V2 | E1b: Unit `<select>` disabled for stock > 0 ingredient | Browser: pencil → unit dropdown is greyed, unclickable | NO |
| V3 | E1c: Conversion `<Input>` disabled for stock > 0 ingredient | Browser: same row, conversion field greyed | NO |
| V4 | E1b/E1c: both editable when stock = 0 | Browser: new ingredient with 0 stock → fields editable | NO |
| V5 | E2a: `buildRow` includes `stockQty` | Code review: `buildRow(ing)` contains `stockQty` key | YES (grep) |
| V6 | E2b/E2c: disabled in BulkEditor for existing row with stock > 0 | Browser: open Ingredient Bulk Edit → find stocked ingredient → unit/conv greyed | NO |
| V7 | E2b/E2c: new rows editable | Browser: add new row → unit + conversion cells editable | NO |
| V8 | No API payload change | grep `ZERO_STOCK` or `stockQty` in `inventoryTransform.toAPI` → 0 hits | YES |

---

## §8 · Post-Code Registry Checklist

```
- [ ] registry.json: BUG-456 → status: IMPLEMENTED, sprint_key: sep_bug_closure
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: InventorySetupPanel.jsx, IngredientBulkEditor.jsx
- [ ] Code markers: // BUG-456 on every modified line
```
