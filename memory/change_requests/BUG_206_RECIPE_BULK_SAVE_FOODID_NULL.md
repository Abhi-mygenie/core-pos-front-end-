# BUG-206: RecipeBulkEditor Batch Save Fails — foodId Null Payload

**ID:** BUG-206
**Type:** BUG (CODE_ERROR in CR-073 implementation)
**Priority:** P0 (CRITICAL — core feature broken, cannot save ANY recipe via Bulk Editor)
**Risk:** HIGH (touches recipe save flow, API contract)
**Sprint:** POS 5.0
**Source:** QA-FOUND (CR-073 QA session 2026-07-19)
**Related:** BUG-197 #7 (same root, Card View already fixed)
**Parent:** CR-073

---

## Description

RecipeBulkEditor Batch Save sends `name: null` for ALL existing standard recipes, causing backend to return 422 "The name field is required". The Bulk Editor cannot save any changes to existing recipes.

The Card View (RecipeFormPanel.jsx) does NOT have this bug — it has a BUG-197 #7 workaround that reverse-lookups `foodId` from `foodName` against `foodsMaster` before building the save payload.

---

## Code Reality: PARTIAL

The fix pattern exists in `RecipeFormPanel.jsx` L50-53 but was not ported to `RecipeBulkEditor.jsx` during CR-073 implementation.

---

## Duplicate Check: RELATED to BUG-197 #7

BUG-197 is IMPLEMENTED — but only for the Card View path. The Bulk Editor (CR-073) is a separate code path that was built after BUG-197. The fix was not carried over. Registering as new BUG because it's a distinct code location.

---

## Evidence

- **QA Report:** `/app/memory/test_reports/CR-073_QA_REPORT_2026_07_19.md` (V9 FAIL, RT-1 FAIL)
- **Testing Agent:** `/app/test_reports/iteration_4.json` (network capture of PUT payload with `name: null`)
- **Steps to reproduce:**
  1. Login → `/recipes` → Click "Bulk" toggle
  2. Edit any field (e.g. prep time) on any existing standard recipe
  3. Click "Save Changes"
  4. Observe: submit results banner shows "✗ <recipe> · The name field is required"
- **Control test:** Same recipe saved via Card View → PUT with `name: 168408` (food_id) → 200 OK
- **Curl evidence:** PUT payload `{"name":null,"recipe_qty":1,...}` → 422

---

## Root Cause

```
RecipeBulkEditor.jsx L34-58 normaliseRecipe()
  → foodId: r.foodId ?? null
  → get-recipe API does NOT return food_id field
  → fromAPI.recipes() sets foodId: r.food_id || null → null
  → foodId stays null for ALL existing standard recipes
  → handleSave L190: payload builds with foodId: null
  → toAPI.updateRecipe: name: data.foodId → null
  → PUT → 422 "name required"

RecipeFormPanel.jsx (Card View) — HAS THE FIX:
  L50-53: reverse-lookups foodId from foodName against foodsMaster
  → foodId = matching food.id → correct integer
  → PUT payload: name: 168408 → 200 OK
```

---

## Blast Radius

- **Files to change:** 1 (`RecipeBulkEditor.jsx`)
- **Lines:** ~10-15 (add foodId enrichment in useEffect or handleSave)
- **Hotspot files:** NO
- **Estimated scope:** SMALL
- **Risk:** LOW (porting existing proven pattern)

---

## Proposed Fix (for Planning/BugFix agent)

In `RecipeBulkEditor.jsx`, after `foodsMaster` loads and when hydrating rows from `recipes` prop, enrich each row:
```
const food = foodsMaster.find(f =>
  (f.name || f.food_name || '').trim().toLowerCase() === (r.name || r.foodName || '').trim().toLowerCase()
);
row.foodId = r.foodId || food?.id || null;
```

Also add client-side validation in `handleSave`: if `recipeType === 'standard' && !row.foodId && !row.isNew` → fail-fast with "Menu food link missing" instead of server 422.

---

## Planning Skip Eligibility

✅ ≤10 lines · ✅ 1 file · ✅ not hotspot · ✅ not financial
**ELIGIBLE for DIRECT_BUG_FIX** — owner approval required.

---

## Next: Owner approves Direct Bug Fix → BUG FIX role
