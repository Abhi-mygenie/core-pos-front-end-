# QA Handover — CR-388
## Editable Min Alert Unit

**Date:** 2026-09-25 · **Sprint:** sep_bug_closure · **Risk:** MEDIUM

---

## 1. Verification Matrix Results

| V# | Edit | File | Verification | Self-Test |
|---|---|---|---|---|
| V1 | E1 | `InventorySetupPanel.jsx` | Add form: ingredient with smallUnit → MIN UNIT shows 2-option dropdown (base + small) | ✅ grep: CR-388 L379, conditional on `newIng.smallUnit` |
| V2 | E1 | `InventorySetupPanel.jsx` | Add form: no smallUnit yet → MIN UNIT read-only span | ✅ else branch confirmed |
| V3 | E2 | `InventorySetupPanel.jsx` | Edit form: ingredient with smallUnit → MIN UNIT 2-option dropdown | ✅ grep: CR-388 L470 |
| V4 | E3 | `InventorySetupPanel.jsx` | startEdit(): `ing.minUnitAlert \|\| ing.smallUnit` (stored wins) | ✅ L189 confirmed |
| V5 | E1–E2 | `InventorySetupPanel.jsx` | Save → API `min_unit_alert` = chosen value (already wired in transform) | Manual browser |
| V6 | E4 | `IngredientBulkEditor.jsx` | Bulk Edit: row with smallUnit → 2-option dropdown | ✅ grep: CR-388 L478 |
| V7 | E4 | `IngredientBulkEditor.jsx` | Bulk Edit: row without smallUnit → read-only span | ✅ else branch confirmed |
| V8 | E4 | `IngredientBulkEditor.jsx` | Changing MIN UNIT in bulk marks row "edited" (amber badge) | Manual browser |
| V9 | ALL | Both | OD-388-02: changing smallUnit auto-updates minUnit (existing onChange wired) | Manual browser |
| V10 | ALL | Both | webpack 0 new warnings | ✅ pre-existing warning only |

---

## 2. Browser Test Cases

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Add form — dropdown visible | Inventory → Ingredients → Add → set unit=kg, smallUnit=gm | MIN UNIT shows dropdown with "kg" and "gm" |
| T2 | Add form — no dropdown yet | Add form with only unit set (no smallUnit) | MIN UNIT shows grey span with unit value |
| T3 | Edit form — dropdown | Click pencil on ingredient with base+small unit | MIN UNIT shows dropdown with 2 options |
| T4 | Edit form — stored value preserved | Ingredient previously saved with minUnitAlert=base unit → open edit | MIN UNIT dropdown shows base unit (not smallUnit) |
| T5 | Save — API payload | Edit ingredient → change MIN UNIT → Save → check Network tab | `min_unit_alert` = chosen value sent to backend |
| T6 | Bulk Edit — dropdown visible | Inventory → Bulk Edit → row with smallUnit | MIN UNIT column shows dropdown |
| T7 | Bulk Edit — no dropdown | Bulk Edit → row without smallUnit | MIN UNIT column shows read-only span |
| T8 | Bulk Edit — marks row dirty | Change MIN UNIT dropdown in bulk edit | Row shows amber "edited" badge |
| T9 | Auto-default still works | Edit form → change smallUnit dropdown | MIN UNIT dropdown auto-updates to new smallUnit (existing behaviour intact) |

---

## 3. Regression Tests

| # | What | Why |
|---|---|---|
| R1 | Add ingredient end-to-end (name/unit/category/minQty) and save | E1 added JSX around existing form — must not break save flow |
| R2 | Edit ingredient — all other fields (name, unit, category, conversion) unaffected | E2 + E3 touched same row in edit form |
| R3 | Bulk Edit — save changes to name, unit, minQty (not minUnit) | E4 is additive — should not affect other column saves |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-388
Status: GATE_5A_IMPLEMENTED (2026-09-25)
Sprint: sep_bug_closure
EXIT GATE: ALL 5 PASSED
  □1 Registry: UPDATED ✅
  □2 CR_REGISTRY.md: UPDATED ✅
  □3 FILE_OWNERSHIP.md: UPDATED ✅
  □4 Code markers: 3 hits InventorySetupPanel + 1 hit BulkEditor ✅
  □5 Compile: webpack 1 warning (pre-existing isScheduled — not CR-388) ✅
```

---

## 5. Credentials + Environment

| | Value |
|---|---|
| Preview URL | https://react-pos-frontend-34.preview.emergentagent.com |
| Account needed | Any account with inventory ingredients (base + small unit configured) |
| Credentials | See `/app/memory/test_credentials.md` — QA_INV account if available |
