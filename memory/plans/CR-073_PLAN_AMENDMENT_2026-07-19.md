# Plan Amendment · CR-073 Recipe Bulk Editor — Ambiguity Rulings

**Date:** 2026-07-19
**Author role:** PLANNING (AGENT_PROMPT_ALPHA v0.7 §Role 2 · post-verification amendment)
**Amends:** `/app/memory/plans/CR-073_IMPLEMENTATION_PLAN.md` (dated 2026-07-16)
**Trigger:** §Stage Dispatch line 504 plan-staleness check surfaced 5 ambiguities requiring locked rulings before Implementation
**Owner ruling:** "write the amendment + proceed · follow gates and rules" (2026-07-19)

---

## 1. Plan-vs-reality verification result

**ZERO drift.** All target files, endpoints, transforms, mocks match plan assumptions.

- `RecipeManagementPanel.jsx` · 198 lines · header structure line 162 · state hooks 111-114 as expected
- `RecipeBulkEditor.jsx` · absent (clean create · correct)
- Design mock intact (19,409 bytes)
- 14 recipe service exports present · unchanged
- No partial CR-073 traces in codebase

## 2. Locked rulings (5 ambiguities · pattern-reuse defaults · no scope expansion)

### A1 · Cost/margin column — REUSE Phase D pattern
- **Original plan §4:** "price not available — show margin as placeholder '...%' until linked"
- **Ruling:** Reuse `RecipeCostMarginWidget` name-match pattern via `menuManagementService.getFoodsList()`
- **Bands (FB-7-Q2 locked):** green ≥50% · amber 30-49% · red <30%
- **When no menu match found:** show cost only, margin cell displays "—"

### A2 · `currentRecipes` derivation — implementation detail
- **Ruling:** `currentRecipes = {standard: standardRecipes, sub: subRecipes, addon: addonRecipes}[activeTab]`
- Passed to `<RecipeBulkEditor recipes={currentRecipes} recipeType={activeTab} onRefresh={fetchData} />`

### A3 · Batch save failure semantics — REUSE CR-078 pattern
- **Original plan §Batch Save:** "Toast success/error" (silent on partial failure)
- **Ruling:** Partial-success banner listing succeeded + failed rows · no auto-revert of successful saves · user can retry failed rows individually
- Matches `SmartPurchasePanel.jsx` `submitResults` state pattern

### A5 · Add-Recipe store function dispatch
- **Ruling:** `{standard: storeRecipe, sub: storeSubRecipe, addon: storeAddonRecipe}[recipeType]`
- Same tab-aware dispatch for update/delete

### A6 · Excel export/import cross-tab
- **Ruling:** Restrict Excel/Import buttons to `standard` tab in v1 · grey out (disabled) for sub/addon with tooltip "Available for Standard Recipes only"
- Follow-up CR can extend backend to support cross-tab if needed

## 3. Additional implementation-time defaults (no owner ruling needed)

- **A7 · `#` column:** sequential position (Excel-style row number), not recipe ID
- **A8 · Field-shape check:** implementation agent should sanity-check first render for sub/addon tabs · if `recipeTransform.js` produces different shapes, add tab-aware normalization

## 4. Files affected (unchanged from plan §Scope Lock)

| File | Action |
|---|---|
| `components/inventory/RecipeBulkEditor.jsx` | NEW (~450-550 lines · unchanged estimate) |
| `components/inventory/RecipeManagementPanel.jsx` | MODIFY (~30 lines) |

Files WILL NOT touch: `recipeService.js`, `recipeTransform.js`, `RecipeFormPanel.jsx`, `RecipeManagementPage.jsx`, `App.js`, `api/constants.js`

## 5. Additional dependency (from A1 ruling)

- `menuManagementService.getFoodsList()` — imported for recipe-name→food-price matching
- Same pattern as `InventoryIntelligencePanel.jsx` (shipped 2026-07-19)

## 6. Verification Matrix — additions (14 → 18 checks)

Beyond plan §Verification Matrix rows 1-14:

| # | Test | Auto? |
|---|---|---|
| 15 | Recipe with menu-food name match shows real margin % + band | NO |
| 16 | Recipe without match shows cost only, margin "—" | NO |
| 17 | Partial save (1 of 3 fails) shows banner listing succeeded + failed | NO |
| 18 | Excel/Import buttons disabled with tooltip on sub/addon tabs | NO |

## 7. Registry sync (executed with this amendment)

CR-073 `status_history` gets:
```
{
  from: "PLANNED (gate=3)",
  to:   "PLANNED (gate=3 · amended · rulings A1-A6 locked)",
  date: "2026-07-19",
  reason: "Plan-staleness check (§Stage Dispatch line 504) surfaced 5 ambiguities. All resolved via pattern reuse (Phase D margin bands · CR-078 partial-success UX). No file scope expansion. Amendment: /app/memory/plans/CR-073_PLAN_AMENDMENT_2026-07-19.md. Owner Gate 4 GO received: 'write the amendment + proceed'."
}
```

## 8. Gate 4 status

**GO received via owner message 2026-07-19 "write the amendment + proceed · follow gates and rules".**

Implementation may begin. Phase checkpoints preserved per prior owner preference (Option C · pause after every phase).

## §Planning final response

```
CR-073 amendment complete
Ambiguities: 5 locked · 0 requiring owner input · all pattern-reuse defaults
Files affected: unchanged (2)
Verification Matrix: 14 → 18 checks
Registry: gate=3 · status="PLANNED (gate=3 · amended · rulings A1-A6 locked)"
Gate 4 GO: RECEIVED
Next: IMPLEMENTATION role · Phase 1 (Card/Bulk toggle) with owner checkpoint
```
