# BUG-461 — Sub-Recipes Appear in Bulk Edit Ingredients

**Date:** 2026-09-25 · **Role 1 INTAKE**
**Sprint:** sep_bug_closure (or next sprint)
**Status:** GATE_1_INTAKE

---

## Summary

Sub-recipe items (e.g. "UAT BBQ Mix", "UAT Chicken Handi Mix") appear inside the **Bulk Edit Ingredients** table, grouped under a "SUB RECIPE" category header. Sub-recipes are a distinct entity — they should not be editable as regular ingredients. All other consumers of the ingredients list correctly filter them out via `!isSubRecipe`.

---

## Classification

- **Type:** BUG
- **Severity:** P2 — MEDIUM (cosmetic/data confusion, not a crash; but editing a sub-recipe as an ingredient via bulk edit could corrupt data)
- **Risk:** LOW (display-layer filter, no API contract change, no financial logic, 1-line fix)
- **Fast Lane eligible:** YES (1 file, ≤3 lines, no hotspot, not financial)

---

## Code Reality Check

```bash
grep -n "isSubRecipe" /app/frontend/src/components/inventory/IngredientBulkEditor.jsx
# → 0 results (no filter exists)
```

**Code Reality: NONE** — no sub-recipe filter in IngredientBulkEditor.

Other consumers that correctly filter:
| File | Filter |
|------|--------|
| `AutoShoppingList.jsx:20` | `!i.isSubRecipe` |
| `PurchaseEntryPanel.jsx:195` | `!i.isSubRecipe` |
| `ReorderForecastWidget.jsx:23` | `!item.isSubRecipe` |
| `IngredientBulkEditor.jsx` | **MISSING** |

---

## Duplicate Check

- No existing BUG or CR for "sub-recipe in bulk edit ingredient filter"
- Related: CR-139 Phase B2 (sub-recipes not purchasable in AutoShoppingList) — DISTINCT, different screen
- **Duplicate check: DISTINCT**

---

## Evidence

- **Source:** OWNER-REPORTED (screenshot provided)
- **Screenshot:** Owner screenshot — Bulk Edit Ingredients showing "SUB RECIPE 2" group with UAT BBQ Mix + UAT Chicken Handi Mix
- **Steps to reproduce:** Inventory → Setup → Ingredients → Bulk Edit → observe SUB RECIPE group header with sub-recipe rows
- **Confidence:** CONFIRMED (owner reproduced, code verified)

---

## Blast Radius

- **Files WILL change:** `src/components/inventory/IngredientBulkEditor.jsx` (1 file, 1 line)
- **Hotspot files:** NO
- **Blast radius: SMALL (1 file, ~1 line)**

---

## Proposed Fix (Fast Lane eligible)

`IngredientBulkEditor.jsx` — `filtered` useMemo (current L80-82):

**Current:**
```js
return rows.filter(r => !r._deleted && r.name.toLowerCase().includes(q));
```
**Proposed:**
```js
return rows.filter(r => !r._deleted && !r.isSubRecipe && r.name.toLowerCase().includes(q)); // BUG-461
```

---

## Open Questions

None — owner has clearly stated the expected behaviour (remove sub-recipes from bulk edit).

---

## Next

Fast Lane eligible (owner must say "FAST LANE APPROVED") → 1 line fix → self-test → QA spot-check.
OR full gate: Gate 2 → Gate 3 → Implementation.
