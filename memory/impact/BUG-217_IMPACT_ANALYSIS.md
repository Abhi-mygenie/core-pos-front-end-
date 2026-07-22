# BUG-217 — Sub-Recipe "Serves" Field Blocks Save — IMPACT ANALYSIS (Gate 2)

**Date:** 2026-07-23 (Session C — Batch 7)
**Role:** PLANNING (Gate 2 only)
**Intake:** `/app/memory/change_requests/BUG-217_SUB_RECIPE_SERVES_BLOCKS_SAVE_INTAKE.md`
**Severity:** P2 | **Risk:** MEDIUM (validation logic, non-financial; API contract verified — no upgrade needed)

| Header | Result |
|---|---|
| Code Reality | **PARTIAL — intake mechanism DISPROVEN by curl.** Serves can never block save. Real blocker = blank Unit (subunit) → backend 500. |
| Conflict Pre-Check | **CONFLICT with BUG-215** (same `handleSave` guards, lines 91-96 — BUG-215 converts toasts to inline error states). Execution order: **BUG-217 AFTER or WITH BUG-215** so new guard uses the inline-error pattern. BUG-214 (lines 51, 150) and BUG-216 (line ~84 autofill) — different sections, parallel-safe. |

---

## 1. Curl Verification (MANDATORY — intake was REPORTED/unverified)

Evidence: `/app/memory/evidence/BUG-217/`

| Probe | Payload | Result |
|---|---|---|
| 1 | `serve_people: 0` + invalid ingredient id 999999 | **HTTP 200** — backend ACCEPTS, coerces serve_people → 1, silently accepts junk ingredient id, CREATES sub-recipe (recipe_id 225; deleted after probe — cleanup verified `probe1_cleanup_delete.json`) |
| 2 | `subunit: ""` (blank Unit) | **HTTP 500** — `SQLSTATE[23000] Column 'unit' cannot be null` raw Laravel QueryException (`RecipeController.php:669 sub_recipes_store`). NO validation layer; `ConvertEmptyStringsToNull` middleware nulls the empty string before insert. |

**Conclusion — intake hypothesis ELIMINATED, real root cause CONFIRMED:**
- "Serves" NEVER blocks save: FE transform sends `serve_people: data.servePeople || 1` (`recipeTransform.js:155`) and backend coerces 0 → 1 anyway.
- The actual save blocker is the **Unit field left unselected**: form has no validation and no `*` on Unit; blank `subunit` hits a backend 500; `axios.js:86` fallback picks `data.message` → toast shows raw SQL text (or perceived generic failure). Owner mis-attributed the block to the adjacent "Serves" field.

## 2. Data Flow Trace

```
Unit select (RecipeFormPanel.jsx:169, no validation, no *) → handleSave():90-96 (no unit guard)
→ data.unit ('') :102 → toAPI.storeSubRecipe → subunit: '' (recipeTransform.js:152)
→ POST /api/v2/vendoremployee/recipe/store-sub-recipe
→ Laravel ConvertEmptyStringsToNull → subunit=null → INSERT sub_recipes.unit=null
→ HTTP 500 SQLSTATE[23000] → axios.js:86 readableMessage = raw SQL message
→ RecipeFormPanel.jsx:116 toast.error(raw SQL / generic)
BREAK POINT: missing FE guard at handleSave (and missing backend validation)
```

## 3. Affected Files (proposed scope — final at Gate 3)

| File | Lines | Change |
|---|---|---|
| `components/inventory/RecipeFormPanel.jsx` | 90-96 | Add guard: unit required (all recipe types — storeRecipe/addon paths send `recipe_unit`/`subunit` from same field) |
| `components/inventory/RecipeFormPanel.jsx` | 167-172 | Add `*` to Unit label |

WILL NOT touch: `recipeTransform.js`, `recipeService.js`, `axios.js`, any backend-payload field names (R9: `prepration_time`, `thershold_*` typos stay).

~4 lines, 1 file. Not a hotspot (R5). Non-financial.

## 4. Downstream Consumers
- `storeSubRecipe` / `updateSubRecipe` / `storeRecipe` / `updateRecipe` / addon variants all read `data.unit` — adding an FE guard changes no payload shape.
- BUG-216 (approved) changes WHICH unit is autofilled into ingredient rows — independent of the recipe-level Unit field here.

## 5. Backend Brief Candidate (NEW)
`store-sub-recipe` has **no validation layer**: accepts `serve_people: 0`, silently accepts non-existent ingredient ids (999999 → created recipe with junk row), and 500s with raw SQL + full stack trace (debugbar enabled) on blank `subunit`. Recommend brief card `#bug-217` in BACKEND_BLOCKERS_BRIEF (matches lax-validation pattern of #bug-221).

## 6. Owner Decisions Needed
1. **Re-scope confirmation:** fix = require Unit (guard + `*`), NOT Serves. Serves stays optional (defaults 1). Approve re-scope?
2. **Serves label:** leave as-is, or add helper text "defaults to 1"? (cosmetic, optional)
3. **Backend brief card #bug-217** (no validation + stack-trace leak) — file it?

## 7. Verification Seed (for Gate 3 matrix)
- Sub-recipe save with Unit blank → inline error/toast "Unit is required", no API call.
- Sub-recipe save with Unit selected, Serves blank → saves OK (serve_people=1).
- Standard + addon recipe with Unit blank → same guard fires.

---
*Gate 2 complete. STOP — no Implementation Plan, no code. Awaiting owner approval.*
