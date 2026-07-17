# BUG-197 — Impact Analysis ADDENDUM (QA-Discovered Contract Mismatches)

**ID:** BUG-197
**Date:** 2026-07-17 (Addendum to v3 dated 2026-07-16)
**Agent Role:** PLANNING
**Trigger:** QA session discovered that all recipe write endpoints return 302 → root cause: missing `X-localization: en` header + field name mismatches confirmed via owner's working curls
**Risk:** HIGH (unchanged)

---

## QA Root Cause Summary

The 302 redirects on recipe endpoints were caused by **missing `Accept: application/json` + `X-localization: en` headers** in curl tests. Once added, endpoints return proper JSON — revealing **field name mismatches** between FE transforms and backend contract.

Owner provided 4 working curls (2026-07-17) that confirmed the exact backend field names.

---

## NEW GAP: Global — Missing `X-localization: en` Header

**File:** `api/axios.js` L12-16
**Current:**
```js
headers: {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
},
```
**Missing:** `'X-localization': 'en'`
**Impact:** Recipe endpoints (and potentially others) return 302 redirect without this header. Backend Laravel middleware requires it.
**Fix:** Add `'X-localization': 'en'` to default headers.
**Scope:** GLOBAL — affects all API calls. Low risk (additive header, no behavioral change for endpoints that don't check it).

---

## GAP 4 REVISED: Recipe Store — Field Name Mismatches

**File:** `recipeTransform.js` → `toAPI.storeRecipe()`

| # | FE Currently Sends | Backend Expects (from owner curl) | Fix |
|---|---|---|---|
| 1 | `qty: data.qty` | `recipe_qty: data.qty` | Rename field |
| 2 | `unit: data.unit` | `recipe_unit: data.unit` | Rename field |

Fields already correct: `name` (food_id int) ✅, `preparation_time` ✅, `serve_time` ✅, `serves_people` ✅, `ingredients[].ingredient_id` ✅, `ingredients[].quantity` ✅, `ingredients[].unit` ✅

---

## GAP 5 REVISED: Recipe Update — Field Name Mismatches

**File:** `recipeTransform.js` → `toAPI.updateRecipe()`

| # | FE Currently Sends | Backend Expects | Fix |
|---|---|---|---|
| 1 | `qty: data.qty` | `recipe_qty: data.qty` | Rename field |
| 2 | `unit: data.unit` | `recipe_unit: data.unit` | Rename field |

Method is correct: `api.put()` ✅ (confirmed working via QA curl)
Ingredient fields correct for update: `id` ✅, `qty` ✅, `unit` ✅

---

## GAP 9a REVISED: Sub-Recipe Update — Multiple Field Mismatches

**File:** `recipeTransform.js` → `toAPI.updateSubRecipe()`

| # | FE Currently Sends | Backend Expects (from owner curl) | Fix |
|---|---|---|---|
| 1 | `name: data.name` | `sub_recipe_name: data.name` | Rename field |
| 2 | `unit: data.unit` | `subunit: data.unit` | Rename field |
| 3 | `preparation_time: data.preparationTime` | `prepration_time: data.preparationTime` | Fix typo to match backend (R9: backend typos are contract) |
| 4 | (not sent) | `serve_time: data.serveTime \|\| 0` | Add missing field |
| 5 | (not sent) | `serve_people: data.servePeople \|\| 1` | Add missing field |
| 6 | (not sent) | `thershold_qty: data.thresholdQty \|\| 0` | Add missing field (R9: backend typo "thershold") |
| 7 | (not sent) | `thershold_unit: data.thresholdUnit \|\| ''` | Add missing field |

Ingredient fields correct for update: `id` ✅, `qty` ✅, `unit` ✅
Method correct: `api.put()` ✅

**Note:** `storeSubRecipe()` likely needs the same field renames. Owner didn't provide a store curl, but the pattern is consistent.

---

## GAP 9b REVISED: Addon Recipe Update — Field Mismatches

**File:** `recipeTransform.js` → `toAPI.updateAddonRecipe()`

| # | FE Currently Sends | Backend Expects (from owner curl) | Fix |
|---|---|---|---|
| 1 | `qty: data.qty` | `recipe_qty: data.qty` | Rename field |
| 2 | `unit: data.unit` | `recipe_unit: data.unit` | Rename field |
| 3 | (not sent) | `preparation_time: data.preparationTime \|\| 0` | Add missing field |
| 4 | (not sent) | `serves_people: data.servePeople \|\| 1` | Add missing field |
| 5 | (not sent) | `serve_time: data.serveTime \|\| 0` | Add missing field |

`addon_id` correct ✅, ingredient fields correct for update: `id` ✅, `qty` ✅, `unit` ✅

**Note:** `storeAddonRecipe()` likely needs same renames. Owner didn't provide store curl but pattern consistent.

---

## Consolidated FE Edits for BUG-197 Addendum

### Edit A1: `api/axios.js` — Add X-localization header

**Current (L12-16):**
```js
headers: {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
},
```
**New:**
```js
headers: {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-localization': 'en',
},
```

### Edit A2: `recipeTransform.js` → `storeRecipe()` — `qty` → `recipe_qty`, `unit` → `recipe_unit`

### Edit A3: `recipeTransform.js` → `updateRecipe()` — same renames

### Edit A4: `recipeTransform.js` → `storeSubRecipe()` — `name` → `sub_recipe_name`, `unit` → `subunit`, `preparation_time` → `prepration_time`, add missing fields

### Edit A5: `recipeTransform.js` → `updateSubRecipe()` — same as A4

### Edit A6: `recipeTransform.js` → `storeAddonRecipe()` — `qty` → `recipe_qty`, `unit` → `recipe_unit`, add missing fields

### Edit A7: `recipeTransform.js` → `updateAddonRecipe()` — same as A6

### Edit A8: `recipeService.js` L49 — sub-recipe update: verify `api.put()` (already fixed in v3, confirm)

### Edit A9: `recipeService.js` L69 — addon-recipe update: verify `api.put()` (already fixed in v3, confirm)

---

## Files WILL change (addendum):

| File | Edits | Risk |
|---|---|---|
| `api/axios.js` | A1 (add header) | LOW — additive, no behavioral change for existing working endpoints |
| `api/transforms/recipeTransform.js` | A2-A7 (field renames + missing fields) | MEDIUM — 6 transform functions updated |

## Files WILL NOT touch (no new additions):

All other files from original BUG-197 plan — no scope change beyond transforms + axios.

---

## Verification Matrix (Addendum)

| # | Edit | Verification | Method |
|---|---|---|---|
| VA1 | axios.js header | `grep 'X-localization' axios.js` | grep |
| VA2 | storeRecipe fields | curl: POST store-recipe with X-localization → not 302 | curl |
| VA3 | updateRecipe fields | curl: PUT update-recipe/{id} → not 302, proper JSON | curl |
| VA4 | updateSubRecipe fields | curl: PUT update-sub-recipe/{id} → proper JSON | curl |
| VA5 | updateAddonRecipe fields | curl: PUT update-addon-recipe/{id} → proper JSON | curl |
| VA6 | Existing working endpoints | Wastage/Vendor/Purchase/Ingredient still work | curl regression |

---

## Next

Impact Analysis addendum complete. Needs Gate 3 (Implementation Plan update) → Gate 4 GO → Implementation.
