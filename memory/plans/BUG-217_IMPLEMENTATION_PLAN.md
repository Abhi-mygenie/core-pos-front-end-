# BUG-217 — Require Unit on Recipe Save — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session D)
**Impact Analysis:** `/app/memory/impact/BUG-217_IMPACT_ANALYSIS.md` (OWNER APPROVED — re-scope: Unit required, Serves stays optional)
**Risk:** MEDIUM | **Entry verification:** PASS 2026-07-23 — lines 90-96, 168, 186-187 match Impact Analysis

## DEPENDENCY — READ FIRST
**Implement AFTER BUG-215** (same `handleSave` guards, lines 91-96). BUG-215 converts toast-only guards to inline error states. Two variants below:
- **Variant A (BUG-215 already landed):** write the Unit guard in BUG-215's error-state pattern (setError + inline message + toast, matching whatever pattern 215 established).
- **Variant B (BUG-215 not yet landed):** use the toast-only edit below; BUG-215 will then convert it along with the other guards.
The implementing agent MUST check BUG-215's status in registry.json at entry and pick the variant. If BUG-215 is IMPLEMENTED, re-verify line numbers first (they will have shifted).

## Scope Lock
- WILL change: `frontend/src/components/inventory/RecipeFormPanel.jsx` ONLY
- WILL NOT touch: `recipeTransform.js`, `recipeService.js`, `axios.js`, Serves field behavior, any payload keys (R9 typos stay: `prepration_time`, `thershold_*`)

## Edits (Variant B baseline — exact)

### Edit 1 — Unit guard in handleSave
File: `RecipeFormPanel.jsx` — after line 94 (addon guard), before `const validIngs` (line 95).
Current (line 94-95):
```js
    if (recipeType === 'addon' && !addonId) { toast.error('Select an addon item for this recipe'); return; }
    const validIngs = ingRows.filter(r => r.ingredientId && Number(r.quantity) > 0);
```
New:
```js
    if (recipeType === 'addon' && !addonId) { toast.error('Select an addon item for this recipe'); return; }
    if (!unit) { toast.error('Unit is required'); return; } // BUG-217: blank subunit → backend 500
    const validIngs = ingRows.filter(r => r.ingredientId && Number(r.quantity) > 0);
```
Applies to ALL recipe types (standard `recipe_unit`, addon, sub `subunit` all read `data.unit`).

### Edit 2 — Required marker on Unit label
File: `RecipeFormPanel.jsx` line 168.
Current:
```jsx
              <Label className="text-xs text-slate-500">Unit</Label>
```
New:
```jsx
              <Label className="text-xs text-slate-500">Unit <span className="text-red-500">*</span></Label> {/* BUG-217 */}
```

Total: 1 file, 2 edits, ~3 lines.

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|---|---|---|---|---|
| 1 | RecipeFormPanel.jsx:95 | Unit guard | Browser: sub-recipe, fill all except Unit → Save → toast "Unit is required", Network tab shows NO POST | NO |
| 2 | RecipeFormPanel.jsx:168 | `*` on Unit label | Browser: red asterisk visible on all 3 recipe-type forms | NO |
| R1 | — | Regression: valid save | Sub-recipe with Unit selected + Serves blank → saves 200, serve_people=1 (curl-verify then DELETE test row via `/recipe/delete-sub-recipe/{recipe_id}`) | NO |
| R2 | — | Regression: standard recipe | Standard recipe valid save unaffected | NO |

## Risk Register
- Guard placement before `validIngs` keeps existing guard order (name → food/addon → unit → ingredients). No state/provider/localStorage changes.
- Interaction with BUG-215 (see DEPENDENCY). Interaction with BUG-214/216: different lines, parallel-safe.

## Post-Code Registry Checklist (Implementation agent MUST execute)
- [ ] registry.json: BUG-217 → status IMPLEMENTED, sprint_key pos_5_0
- [ ] BUG_TRACKER.md row updated
- [ ] FILE_OWNERSHIP.md: RecipeFormPanel.jsx + BUG-217 + date
- [ ] Code marker `// BUG-217` present (Edit 1 & 2)
- [ ] Compile: webpack 0 new warnings

*Gate 3 complete. Awaiting Gate 4 GO.*
