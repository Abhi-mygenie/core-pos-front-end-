# BUG-601 — Implementation Plan (Gate 3)

**ID:** BUG-601
**Date:** 2026-10-22
**Stage:** Gate 3 — Implementation Plan
**IA:** `impact/BUG-601_IMPACT_ANALYSIS_2026_10_22.md`
**Code Reality:** PARTIAL (bug is in shipped code)
**Risk:** HIGH
**Conflict Pre-Check:** CLEAR

---

## 1. Execution Sequence

One file, two edit locations (add + edit functions). Both must land together.

---

## 2. Edit 1 — `src/api/services/menuManagementService.js` L44-57

**Target:** `addFoodAggregatorMultipart` function

**Current (L44-58):**
```js
/** BUG-327: Add aggregator food with image upload — flat multipart (no food_info wrapper).
 *  ⚠ SKIP variations + addon_ids: multipart string value corrupts DB (cleanBindings TypeError). */
export const addFoodAggregatorMultipart = (foodInfo, imageFile = null, swiggyImageFile = null) => { // BUG-327
  const formData = new FormData();
  const SKIP = new Set(['variations', 'addon_ids']);
  Object.entries(foodInfo).forEach(([key, val]) => {
    if (SKIP.has(key) || val === undefined || val === null) return;
    formData.append(key, val);
  });
  if (imageFile)       formData.append('image',        imageFile);
  if (swiggyImageFile) formData.append('swiggy_image', swiggyImageFile);
  return api.post(`${BASE_V2}/add-food-aggregator`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

**Replace with:**
```js
/** BUG-327 + BUG-601: Add aggregator food with image upload — flat multipart for scalars,
 *  food_info JSON wrapper for arrays (variations, addon_ids).
 *  BUG-601: variations/addon_ids were silently dropped by SKIP set. API probe confirms
 *  food_info wrapper is accepted by backend (evidence/BUG-601/API_PROBE_OD601_02_2026_10_22.md). */
export const addFoodAggregatorMultipart = (foodInfo, imageFile = null, swiggyImageFile = null) => { // BUG-327, BUG-601
  const formData = new FormData();
  const FOOD_INFO_KEYS = new Set(['variations', 'addon_ids']); // BUG-601: route arrays through food_info wrapper
  const foodInfoPayload = {};
  Object.entries(foodInfo).forEach(([key, val]) => {
    if (val === undefined || val === null) return;
    if (FOOD_INFO_KEYS.has(key)) {
      foodInfoPayload[key] = val; // BUG-601: collect for food_info JSON wrapper
      return;
    }
    formData.append(key, val);
  });
  if (Object.keys(foodInfoPayload).length > 0) {
    formData.append('food_info', JSON.stringify(foodInfoPayload)); // BUG-601: arrays via food_info
  }
  if (imageFile)       formData.append('image',        imageFile);
  if (swiggyImageFile) formData.append('swiggy_image', swiggyImageFile);
  return api.post(`${BASE_V2}/add-food-aggregator`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

---

## 3. Edit 2 — `src/api/services/menuManagementService.js` L83-98

**Target:** `editFoodAggregator` function

**Current (L83-98):**
```js
/** BUG-327: Edit aggregator food — flat multipart fields (no food_info wrapper).
 *  Files optional: omit = backend keeps existing file.
 *  ⚠ SKIP variations + addon_ids: multipart string value corrupts DB. */
export const editFoodAggregator = (foodId, foodInfo, imageFile = null, swiggyImageFile = null) => { // BUG-327
  const formData = new FormData();
  const SKIP = new Set(['variations', 'addon_ids']);
  Object.entries(foodInfo).forEach(([key, val]) => {
    if (SKIP.has(key) || val === undefined || val === null) return;
    formData.append(key, val);
  });
  if (imageFile)       formData.append('image',        imageFile);
  if (swiggyImageFile) formData.append('swiggy_image', swiggyImageFile);
  return api.post(`${BASE_V2}/foods/${foodId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

**Replace with:**
```js
/** BUG-327 + BUG-601: Edit aggregator food — flat multipart for scalars,
 *  food_info JSON wrapper for arrays (variations, addon_ids).
 *  Files optional: omit = backend keeps existing file.
 *  BUG-601: API probe confirmed food_info wrapper persists variations correctly. */
export const editFoodAggregator = (foodId, foodInfo, imageFile = null, swiggyImageFile = null) => { // BUG-327, BUG-601
  const formData = new FormData();
  const FOOD_INFO_KEYS = new Set(['variations', 'addon_ids']); // BUG-601: route arrays through food_info wrapper
  const foodInfoPayload = {};
  Object.entries(foodInfo).forEach(([key, val]) => {
    if (val === undefined || val === null) return;
    if (FOOD_INFO_KEYS.has(key)) {
      foodInfoPayload[key] = val; // BUG-601: collect for food_info JSON wrapper
      return;
    }
    formData.append(key, val);
  });
  if (Object.keys(foodInfoPayload).length > 0) {
    formData.append('food_info', JSON.stringify(foodInfoPayload)); // BUG-601: arrays via food_info
  }
  if (imageFile)       formData.append('image',        imageFile);
  if (swiggyImageFile) formData.append('swiggy_image', swiggyImageFile);
  return api.post(`${BASE_V2}/foods/${foodId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

---

## 4. Verification Matrix

| # | What to Verify | Method | Auto? |
|---|---------------|--------|:---:|
| V-1 | `SKIP` set removed from both functions | `grep "SKIP" menuManagementService.js` → 0 hits | YES |
| V-2 | `FOOD_INFO_KEYS` set present in both functions | `grep "FOOD_INFO_KEYS" menuManagementService.js` → 2 hits | YES |
| V-3 | `food_info` JSON wrapper appended when arrays present | `grep "food_info.*JSON.stringify" menuManagementService.js` → 2 hits | YES |
| V-4 | Compile check: webpack 0 new warnings | Dev server log | YES |
| V-5 | Edit aggregator item with variations → save → refresh → variations persist | Browser test (preprod) | NO |
| V-6 | Add aggregator item with variations → save → refresh → item has variations | Browser test (preprod) | NO |
| V-7 | Edit aggregator item WITHOUT variations (omit key) → existing variations kept | Browser test | NO |
| V-8 | Normal menu (non-aggregator) add/edit unaffected | Browser test | NO |
| V-9 | No "cleanBindings TypeError" in backend response (BUG-327 regression) | Network tab: response 200 | NO |

---

## 5. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-601 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: menuManagementService.js listed with BUG-601 + date
- [ ] Code markers: // BUG-601 comment in every modified section
- [ ] Compile check: webpack 0 new warnings from this change
```

---

## 6. Scope Lock

**Files WILL change:**
- `src/api/services/menuManagementService.js` — 2 edit locations (~12 lines net change per function)

**Files WILL NOT touch:**
`ProductForm.jsx` · `BulkEditor.jsx` · `ProductList.jsx` · all order/payment/report files · any `.env`

**Owner decisions:** OD-601-01 LOCKED (Option A-revised — food_info wrapper), OD-601-02 RESOLVED (probe confirmed)
**Blockers:** NONE
