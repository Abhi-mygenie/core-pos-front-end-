# BUG-219 — Ingredient Form: Min Unit Input & Unclear Labels — IMPACT ANALYSIS (Gate 2)

**Date:** 2026-07-23 (Session C — Batch 8)
**Role:** PLANNING (Gate 2 only)
**Intake:** `/app/memory/change_requests/BUG-219_INGREDIENT_FORM_MIN_UNIT_LABELS_UNCLEAR_INTAKE.md`
**Severity:** P2 | **Risk:** **LOW → HIGH (UPGRADED)** — live data-corruption path confirmed (customer inventory config written wrong on every edit save)

| Header | Result |
|---|---|
| Code Reality | **CONFIRMED + WORSE than intake.** Not only is `minUnitAlert` a number input — the whole FE pipeline mis-types the field. Backend stores a UNIT STRING; FE coerces to number (→ 0) and writes numeric strings back. |
| Conflict Pre-Check | **CONFLICT with BUG-226 (approved)** — both touch `inventoryTransform.js` (226: ADD path `converion_factor`; 219: fromAPI lines 26-27/71-72 + toAPI 134-135/147-148 min alert fields). Execution order: BUG-219 AFTER or WITH BUG-226. `InventorySetupPanel.jsx` also shared with BUG-218 (deleteIngredient, lines 86-95) and BUG-220 (addCategory, 74-84) — different functions, parallel-safe. |

---

## 1. Data Evidence (curl, 2026-07-23)

`GET /inventory/get-inventory-master` — 106 rows (evidence: `/app/memory/evidence/BUG-219_inventory_master_sample.json`):
- `min_unit_alert` values: `gm` ×49, `piece` ×31, `kg` ×11, `pkt` ×6, `ml` ×4, `pieces` ×3, `ltr` ×2 — **100% unit strings, zero numbers**
- `min_qty_alert` values: numeric strings (`5.00`, `50.00`, …)

**Semantics established:** the pair means "alert when stock < `min_qty_alert` `min_unit_alert`" — ONE threshold = quantity + its unit. Intake sub-issue C's reading ("Min Alert (Base)" vs "(Small)" as two quantities) is **incorrect**.

## 2. Defect Chain (confirmed in code)

```
Backend min_unit_alert='gm' → fromAPI.ingredients (inventoryTransform.js:26-27, 71-72)
  minUnitAlert: Number('gm') || 0 → 0            ← type corruption on read
→ startEdit (InventorySetupPanel.jsx:120) loads 0 into <Input type="number"> (:336)
→ save → toAPI.updateIngredient (:148) min_unit_alert: String(0) = '0'
→ PUT update-inventory writes '0' where a unit string belongs   ← DATA CORRUPTION on write
```
Same for ADD path (`toAPI.addIngredient:134-135`, form :284). Every ingredient edit-save silently destroys that row's alert unit.

## 3. Affected Files (proposed scope — final at Gate 3)

| File | Lines | Change |
|---|---|---|
| `api/transforms/inventoryTransform.js` | 26-27, 71-72 | `minUnitAlert: item.min_unit_alert || ''` (keep string); `minQtyAlert` stays numeric |
| `api/transforms/inventoryTransform.js` | 134-135, 147-148 | `min_unit_alert: data.minUnitAlert || ''` (pass unit string; keep `minimun_stock_alert` R9 typo untouched) |
| `components/inventory/InventorySetupPanel.jsx` | 282-285 (add), 334-337 (edit) | `minUnitAlert` number Input → unit `<select>` (same options as smallUnit); relabel pair "Min Alert Qty" / "Alert Unit" |
| `components/inventory/InventorySetupPanel.jsx` | 270-271, 322-323 | Conversion factor: add dynamic label/placeholder "1 [unit] = ? [smallUnit]" |
| `components/inventory/InventorySetupPanel.jsx` | 250 | Header "Min Alert" → "Min Alert (Qty · Unit)" (final wording = owner decision) |

WILL NOT touch: `addCategory`, `deleteIngredient`, any endpoint/payload keys, R9 typos (`minimun_stock_alert`, `converion_factor`).

2 files, ~20 lines. Not hotspots (R5). Non-financial, but customer-data write path → HIGH process rigor.

## 4. Downstream Consumers
- **BUG-224 (approved)**: Smart Purchase threshold uses `minQtyAlert × conversionFactor` (owner decision: minQtyAlert only) — unaffected by minUnitAlert retyping, but verify at QA since both read the same transform.
- Export/import template columns ("Min Qty Alert · Min Unit Alert") — display only, unaffected.

## 5. Owner Decisions Needed
1. Confirm corrected semantics: minUnitAlert = **unit dropdown** (default = smallUnit), NOT a quantity. (Data-proven.)
2. Final label wording: "Min Alert Qty" + "Alert Unit"? Or intake's suggestion?
3. Default when a row has no alert unit: blank or auto-set to smallUnit?

## 6. Verification Seed (Gate 3 matrix)
- Load ingredients → edit a row → minUnitAlert select pre-shows the stored unit (e.g. 'gm'), not 0.
- Save edit WITHOUT touching alert fields → curl the row → `min_unit_alert` unchanged ('gm', not '0').
- Add new ingredient with alert qty 5 + unit gm → row stores `5.00`/`gm`.

---
*Gate 2 complete. **OWNER APPROVED 2026-07-23** — approach + HIGH risk confirmed. → Gate 3.*
