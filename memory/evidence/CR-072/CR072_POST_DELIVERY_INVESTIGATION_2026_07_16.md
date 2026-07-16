# Investigation Report — CR-072 Inventory Module Post-Delivery Issues

**ID:** BUG-197 (batch: 6 issues from CR-072 Inventory Module)
**Date:** 2026-07-16
**Role:** INVESTIGATION
**Sprint:** POS 5.0
**Scope:** CR-072 Inventory Management — Phase 1 CRUD (IMPLEMENTED 2026-07-15, 21/21 tests passed)
**Confidence:** HIGH — all 6 issues reproduced and root-caused via curl probes against preprod

---

## Context

CR-072 was marked IMPLEMENTED with 21/21 tests passed on 2026-07-15. Owner smoke testing on 2026-07-16 revealed 6 functional issues across the inventory module. All issues are **post-delivery defects** — the CR passed QA but the test coverage missed these API contract mismatches and UI gaps.

---

## Issue 1: Add Ingredient — No UI Option

**Severity:** P1 (feature broken — core CRUD missing)
**Root Cause:** CODE_GAP (FE)
**Steps used:** 2/10

The `IngredientsTab` in `InventorySetupPanel.jsx` has **Add Category** button + form (works correctly) but **no Add Ingredient button, form, or dialog anywhere in the UI**. 

**API status:** `inventoryService.addIngredient()` function exists in service layer. `POST /inventory/add-inventory` works — validated required fields: `category_id` (int), `stock_title` (string), `unit` (string).

**Evidence:**
```bash
grep -n "addIngredient\|Add Ingredient\|add-ingredient" InventorySetupPanel.jsx
# Result: 0 hits — no add ingredient UI exists
```

**Fix required:** Add "Add Ingredient" button + inline form or dialog in IngredientsTab. Service function already wired.

---

## Issue 2: Add Vendor — Nothing Happens

**Severity:** P1 (feature broken — save is a no-op)
**Root Cause:** CODE_ERROR (FE) — `handleSave` never calls any API
**Steps used:** 2/10

`VendorsTab.handleSave()` in `InventorySetupPanel.jsx` line 209:
```js
const handleSave = async (data) => {
    toast.success(`Vendor "${data.name}" saved`);  // ← FAKE success toast!
    setEditVendor(undefined);
    await fetchData();
};
```
Shows success toast and refetches — **but never calls any API to persist the vendor**.

**API status:** Backend endpoint `POST /inventory/add-vendor` exists and works:
```json
// Request: {"vendor_name":"Test","email":"test@test.com","address":"Test St"}
// Response: {"data":{"id":271,"vendor_name":"Test Vendor Probe",...}}
```

**Missing in FE:**
1. No `ADD_VENDOR` endpoint in `constants.js` (`INVENTORY_ENDPOINTS`)
2. No `addVendor()` function in `inventoryService.js`
3. No `toAPI.addVendor()` in `inventoryTransform.js`
4. `handleSave` doesn't call any service function

**Fix required:** Add endpoint constant + service function + transform + wire `handleSave`.

---

## Issue 3: Wastage Reasons — No CRUD

**Severity:** P2 (read-only works, but no add/edit/delete)
**Root Cause:** BACKEND_LIMITATION + FE_GAP
**Steps used:** 1/10

- **GET works** — `GET /inventory/wastage-reasons` returns 4 reasons (Spillage, Pilferage, Expired, Others)
- **No POST/PUT/DELETE endpoints** — tested `wastage-reasons/store`, `add-wastage-reason`, `wastage-reason/store` — all return 404
- FE `WastageTab` is **read-only** — no Add/Edit/Delete buttons in UI

**Fix required:** **BACKEND-BLOCKED.** Backend team must add CRUD endpoints. FE can add UI after.

---

## Issue 4: Recipe Create — Nothing Happens

**Severity:** P1 (feature broken — cannot create new recipes)
**Root Cause:** CONTRACT_MISMATCH (FE transform sends wrong field types)
**Steps used:** 3/10

FE `toAPI.storeRecipe()` in `recipeTransform.js` line 102 sends:
```json
{"name": "Recipe Name Text", "serve_people": 1, "ingredients": [{"ingredient_id": 8874, "quantity": 10, "unit": "ml"}]}
```

Backend expects:
```json
{"name": 62118, "serves_people": 1, "ingredients": [{"ingredient_id": 8874, "quantity": 10, "unit": "ml"}]}
```

| Field | FE sends | Backend expects | Error |
|---|---|---|---|
| `name` | `"Recipe Name"` (string) | `food_id` (integer) | "The selected name is invalid" |
| `serve_people` | value | `serves_people` (with **s**) | "serves_people field is required" |

**Evidence:** Without `Accept: application/json` header, backend returns HTML redirect (no error visible in FE). With header + correct `name` as food_id integer → "This recipe already exists" (success path confirmed).

**Fix required:** `toAPI.storeRecipe()` must send `name: data.foodId` (integer) and `serves_people` (not `serve_people`).

---

## Issue 5: Recipe Update/Save — Not Working

**Severity:** P1 (feature broken — cannot save recipe edits)
**Root Cause:** CONTRACT_MISMATCH (wrong HTTP method + wrong ingredient field names)
**Steps used:** 3/10

**Problem 1 — HTTP method:** FE `recipeService.updateRecipe()` uses `api.post()` but backend requires **`PUT`**:
```
MethodNotAllowedHttpException: The POST method is not supported for this route. Supported methods: PUT.
```

**Problem 2 — Ingredient field names:** FE sends `ingredient_id` + `quantity` but backend update expects `id` + `qty`:

| Field | FE sends | Backend expects |
|---|---|---|
| HTTP method | `POST` | `PUT` |
| `name` | `"recipe text"` (string) | `food_id` (integer) |
| `serve_people` | value | `serves_people` |
| `ingredients[].ingredient_id` | ingredient ID | `id` |
| `ingredients[].quantity` | amount | `qty` |

**Evidence:** Verified fix with curl:
```json
// PUT /recipe/update-recipe/2505 with {name: 62118, serves_people: 1, ingredients: [{id: 3107, qty: 0.3, unit: "kg"}]}
// Response: {"message":"Recipe updated successfully.","recipe_id":2505}
```

**Fix required:** 
1. `recipeService.js`: change `api.post()` → `api.put()` for `updateRecipe()`
2. `recipeTransform.js`: fix `toAPI.storeRecipe()` field names for both store and update

**Note:** Store vs Update have DIFFERENT ingredient field name contracts:
- Store: `ingredient_id` + `quantity` (FE is correct for store)
- Update: `id` + `qty` (FE is wrong)
May need separate `toAPI.updateRecipe()` transform.

---

## Issue 6: Purchase Entry — Not Working

**Severity:** P1 (feature broken — cannot save purchases)
**Root Cause:** CONTRACT_MISMATCH (FE transform sends lowercase field name)
**Steps used:** 1/10

FE `toAPI.addPurchase()` in `inventoryTransform.js` line 124 sends:
```json
{"purchase_items": [{"Ingredient": 8874, "Unit": "ml", "quantity": 5, "rate": 100, "amount": 500, "converion_factor": 1}]}
```

Backend expects `Amount` (capital A), not `amount` (lowercase):
```
Error: "Undefined array key \"Amount\""
```

**Evidence:** Verified fix with curl — capital `Amount` → purchase created (ID 7088).

**Fix required:** `inventoryTransform.js` line ~130: change `amount:` → `Amount:` in purchase_items mapping.

---

## Summary

| # | Issue | Classification | Severity | Fix | Blocked? |
|---|---|---|---|---|---|
| 1 | Add Ingredient — no UI | CODE_GAP | P1 | FE: add button + form in IngredientsTab | No |
| 2 | Add Vendor — no-op save | CODE_ERROR | P1 | FE: add endpoint + service + wire handleSave | No |
| 3 | Wastage CRUD — no backend | BACKEND_LIMITATION | P2 | Backend must add endpoints first | **YES** |
| 4 | Recipe Create — wrong fields | CONTRACT_MISMATCH | P1 | FE: fix toAPI.storeRecipe() — name=foodId(int), serves_people | No |
| 5 | Recipe Update — wrong method + fields | CONTRACT_MISMATCH | P1 | FE: POST→PUT, fix ingredient field names (id/qty) | No |
| 6 | Purchase — lowercase Amount | CONTRACT_MISMATCH | P1 | FE: amount → Amount in transform | No |

**5 of 6 FE-fixable. 1 backend-blocked.**

---

## Files Requiring Changes

| File | Issues | Changes Needed |
|---|---|---|
| `components/inventory/InventorySetupPanel.jsx` | #1, #2 | Add ingredient form + wire vendor save to API |
| `api/constants.js` | #2 | Add `ADD_VENDOR` endpoint |
| `api/services/inventoryService.js` | #2 | Add `addVendor()` function |
| `api/transforms/inventoryTransform.js` | #2, #6 | Add `toAPI.addVendor()` + fix `amount` → `Amount` |
| `api/services/recipeService.js` | #5 | `api.post()` → `api.put()` for updateRecipe |
| `api/transforms/recipeTransform.js` | #4, #5 | Fix store (name=foodId, serves_people) + update (id/qty) ingredient fields |

---

## Evidence Artifacts

All curl outputs documented inline. Key findings:
- `POST /inventory/add-vendor` — works (vendor ID 271 created)
- `PUT /recipe/update-recipe/2505` — works with correct payload
- `POST /inventory/add-purchase` — works with capital `Amount`
- `POST /recipe/store-recipe` — works with `name` as food_id integer
- Wastage CRUD endpoints — confirmed 404 on all attempted paths
