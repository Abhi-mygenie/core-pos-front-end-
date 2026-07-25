# QA Handover — BUG-197 Addendum A2-A7 (2026-07-17)

**Items:** BUG-197 (addendum field renames)
**Sprint:** POS 5.0
**Risk:** HIGH (item) / MEDIUM (addendum scope)

---

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| A2: storeRecipe | recipeTransform.js | `recipe_qty` + `recipe_unit` present | ✅ PASS (4 hits each) |
| A3: updateRecipe | recipeTransform.js | same renames | ✅ PASS |
| A4: storeSubRecipe | recipeTransform.js | `sub_recipe_name`, `subunit`, `prepration_time`, `thershold_qty/unit`, `serve_time`, `serve_people` | ✅ PASS |
| A5: updateSubRecipe | recipeTransform.js | same as A4 | ✅ PASS |
| A6: storeAddonRecipe | recipeTransform.js | `recipe_qty`, `recipe_unit`, `preparation_time`, `serves_people`, `serve_time` | ✅ PASS |
| A7: updateAddonRecipe | recipeTransform.js | same as A6 | ✅ PASS |
| fromAPI unchanged | recipeTransform.js | `foodId: r.food_id` still present, no read-path changes | ✅ PASS |
| Compile | webpack | `webpack compiled successfully` — 0 new warnings | ✅ PASS |

---

## 2. Test cases for QA

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Store standard recipe | POST /recipe/store-recipe with auth → check payload has `recipe_qty`, `recipe_unit` | 200 OK, recipe created |
| T2 | Update standard recipe | PUT /recipe/update-recipe/{id} → check payload has `recipe_qty`, `recipe_unit` | 200 OK, recipe updated |
| T3 | Store sub-recipe | POST /recipe/store-sub-recipe → check `sub_recipe_name`, `subunit`, `prepration_time`, `thershold_qty`, `thershold_unit`, `serve_time`, `serve_people` | 200 OK |
| T4 | Update sub-recipe | PUT /recipe/update-sub-recipe/{id} → same fields as T3 | 200 OK |
| T5 | Store addon recipe | POST /product/store-addon-recipe → check `recipe_qty`, `recipe_unit`, `preparation_time`, `serves_people`, `serve_time` | 200 OK |
| T6 | Update addon recipe | PUT /product/update-addon-recipe/{id} → same fields as T5 | 200 OK |
| T7 | Regression: vendor add | POST /inventory/add-vendor → still works | 200 OK |
| T8 | Regression: wastage CRUD | GET /wastage-reasons/list → still works | 200 OK |
| T9 | Regression: purchase entry | POST → `Amount` (capital A) still sent | Persists correctly |
| T10 | Regression: recipe list read | GET /recipe/get-recipe → renders correctly | No UI regression |

---

## 3. Regression tests

| # | What to verify | Why |
|---|---------------|-----|
| R1 | Recipe list page renders | fromAPI.recipes() not touched but verify no side effects |
| R2 | Sub-recipe list renders | fromAPI.subRecipes() not touched |
| R3 | Addon recipe list renders | fromAPI.addonRecipes() not touched |
| R4 | Non-recipe inventory features (vendor, wastage, purchase, ingredients) | These share inventoryService/Transform — verify no cross-contamination |

---

## 4. Registry Sync Confirmation

Registry synced: YES
Items: BUG-197
Sprint: pos_5_0
EXIT GATE: ALL 5 PASSED
  ✅ 1. REGISTRY SYNC: BUG-197 status=IMPLEMENTED, sprint=pos_5_0
  ✅ 2. BUG_TRACKER.MD: Row updated with addendum note
  ✅ 3. FILE_OWNERSHIP.MD: recipeTransform.js listed with BUG-197-A2 through A7
  ✅ 4. CODE MARKERS: 31 BUG-197-A* comments across 6 functions
  ✅ 5. COMPILE CHECK: webpack compiled successfully, 0 new warnings

---

## 5. Credentials + Environment

| Field | Value |
|---|---|
| Preview URL | https://pos-frontend-dev-2.preview.emergentagent.com |
| Account (cafe103) | owner@cafe103.com / *** |
| Account (18March) | owner@18march.com / *** |
| Backend | https://preprod.mygenie.online |
| Note | Recipe write endpoints require valid auth token + X-localization: en header (now in axios defaults) |
