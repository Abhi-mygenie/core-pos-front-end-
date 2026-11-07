# CR-473 — Recipe Mapping by Menu Master (food_for)

**Registered:** 2026-10-26
**Type:** CR
**Priority:** P2
**Risk:** MEDIUM
**Area:** Inventory / Stock
**Sprint:** nov_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE
**Source:** OWNER-PROVIDED (spec document `menumaster.md`)
**Confidence:** CONFIRMED (menu-master endpoint live) / PARTIAL (food_for on mapping endpoints NOT yet active on preprod)

---

## Description

Enhance the existing recipe mapping feature (CR-119, `AggregatorInventoryTab`) to support **per-menu recipe mapping**. Currently, recipe mapping only supports `type: aggregator` with optional `client_id`. This CR adds:

1. **New data source:** `GET /api/v2/vendoremployee/product/menu-master` — returns the restaurant's custom menu list (e.g., Normal, Party, Premium).
2. **Existing endpoints enhanced with `food_for` parameter:**
   - `GET /recipe/food-recipe-mapping?food_for={menu_name}` — returns `foods[]` for that menu + `foods_total`/`foods_mapped` stats
   - `POST /recipe/update-recipe-mapping-batch` — accepts `food_for` in body (do NOT send `type`)
   - `POST /recipe/unlink-recipe-mapping` — accepts `food_for` in body (do NOT send `type`)
   - `GET /recipe/export-recipe-mapping?food_for={menu_name}` — downloads xlsx for that menu

**Key rules from spec:**
- `food_for` is a dynamic `menu_name` from menu-master — not a fixed list
- When using `food_for`, never send `type`; when using `type`, don't send `food_for`
- Old behavior (`type: aggregator` / `type: normal`) is 100% unchanged
- `food_for=Normal` includes items whose menu field is blank
- Unknown menu name returns 200 with empty `foods[]` (no error)

---

## Probe Evidence (2026-10-26, preprod, owner@palmhouse.com, RID 541)

| Probe | Result |
|---|---|
| `GET /product/menu-master` | ✅ LIVE — `[{id:1624, menu_name:"Normal"}, {id:1623, menu_name:"Party"}, {id:1622, menu_name:"Premium"}]` |
| `GET /food-recipe-mapping` (no params) | ✅ Works — 108 recipes, 5 aggregator foods, stats correct |
| `GET /food-recipe-mapping?food_for=Normal` | ⚠️ **NOT ACTIVE** — no `foods[]` field, no `food_for` in response. Backend ignored param. |
| `GET /food-recipe-mapping?food_for=Party` | ⚠️ **NOT ACTIVE** — same, `foods: None`, identical to no-param call |

**Conclusion:** `menu-master` endpoint is deployed and working. The `food_for` enhancement on all 4 recipe mapping endpoints is **NOT yet deployed on preprod**. Backend brief filed: `BACKEND_BRIEF_CR-473_FOOD_FOR_NOT_ACTIVE_2026_10_26.md`.

---

## Duplicate Check

**RELATED to CR-437** (New Settings Keys Including Menu Master, GATE_1_INTAKE, sprint: backlog).
- CR-437 OD-437-03 asks "What is Menu Master?" — this CR answers that and provides the full implementation scope.
- CR-437 is about settings key *audit*; this CR is about *recipe mapping UI enhancement*. Separate scopes, no conflict.
- BUG-301 (aggregator food_for toggle): RELATED but different — BUG-301 fixed menu status toggle `food_for` payload. This CR is about recipe *mapping* by menu.

**NOT DUPLICATE.** CR-437 remains valid as a separate settings audit. This CR is the recipe mapping feature.

---

## Code Reality

**PARTIAL.**

| Component | Exists? | Details |
|---|---|---|
| `menuManagementTransform.menuMaster()` | ✅ YES | L174 — transforms `{menus: [{id, menu_name}]}` → `[{id, name}]` |
| `food_for` in product/recipe transforms | ✅ YES | `recipeTransform.fromAPI.activeFoods` maps `foodFor`, `productTransform` maps `food_for` |
| `GET /product/menu-master` service call | ❌ NO | No service function calls this endpoint |
| `MENU_MASTER` constant in constants.js | ❌ NO | Endpoint not registered |
| `recipeService.getFoodRecipeMapping()` | ⚠️ PARTIAL | Exists but hardcoded to `client` param only. No `food_for` support. |
| `recipeService.batchUpdateRecipeMapping()` | ⚠️ PARTIAL | Hardcoded `type: 'aggregator'` in every update row |
| `recipeService.unlinkRecipeMapping()` | ⚠️ PARTIAL | Hardcoded `type: 'aggregator'` |
| `recipeService.exportRecipeMapping()` | ⚠️ PARTIAL | Hardcoded `type: 'aggregator'` |
| Recipe Mapping UI (`AggregatorInventoryTab`) | ⚠️ PARTIAL | Only shows aggregator tab. No menu selector. |

---

## Blast Radius

**MEDIUM — mostly modifications to existing files, 1 new service function:**
- `constants.js` — +1 `MENU_MASTER` endpoint (additive)
- `recipeService.js` — +1 new function (`getMenuMaster`) + modify 4 existing functions to accept optional `foodFor` param
- `recipeTransform.js` — potentially new fromAPI for `foods[]` response shape
- `AggregatorInventoryTab.jsx` or `RecipeManagementPanel.jsx` — menu selector dropdown + per-menu food list
- Estimated: ~4-5 modified files, 0-1 new files

---

## Backend Gap — BLOCKING

**The `food_for` parameter on recipe mapping endpoints is NOT active on preprod.** Until backend deploys this enhancement:
- The menu-master dropdown UI can be built (data source is live)
- The `food_for` integration for mapping/unlinking/export cannot be end-to-end tested
- Backend brief filed: `BACKEND_BRIEF_CR-473_FOOD_FOR_NOT_ACTIVE_2026_10_26.md`

---

## Open Decisions

- **OD-473-01:** UI layout — separate tab per menu in RecipeManagementPanel (alongside Standard/Sub/Addon/Aggregator)? Or a dropdown selector within the existing Aggregator tab that switches between menus?
- **OD-473-02:** Should the "Normal" menu mapping be shown alongside existing `type: normal` mapping, or replace it? (Spec says `food_for=Normal` includes items whose menu is blank — same as old `type: normal`.)
- **OD-473-03:** Start frontend scaffolding now (menu dropdown + UI) while backend deploys `food_for`? Or wait for backend confirmation?
- **OD-473-04:** Export — one download per menu, or a combined "All Menus" export option?

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: **BLOCKED** on backend deployment of `food_for` on mapping endpoints + owner answers to OD-473-01…04
