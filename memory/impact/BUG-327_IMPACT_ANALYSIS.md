# BUG-327 — Impact Analysis (Gate 2)

**Date:** 2026-08-17
**Role:** PLANNING (Gate 2)
**Code Reality:** NONE — no `swiggyImage`, `addFoodAggregatorMultipart`, or `editFoodAggregator` exists anywhere in src/
**Conflict Pre-Check:**
- `menuManagementTransform.js` — last: BUG-326 (2026-08-17). No other open item touches it. CLEAR.
- `menuManagementService.js` — last: CR-140 (2026-08-14). CLEAR.
- `ProductForm.jsx` — last: BUG-326 (2026-08-17). CLEAR.
- `ProductList.jsx` — last: BUG-301 (2026-08). CLEAR.
- `BulkEditor.jsx` — last: BUG-326 (2026-08-17). CLEAR.
**Risk:** MEDIUM
**Prerequisite:** BACKEND must first fix orphaned `aggregator_food` records 13312–13315 (P0 blocker) to restore `foods-list?food_for=Aggregator` endpoint before FE can be verified.

---

## 1. Problem Statement

Aggregator food image handling has 5 gaps:

| Gap | Effect |
|---|---|
| G1 | `swiggy_image` URL from API never stored in frontend model |
| G2 | `addFoodAggregator()` sends JSON → cannot upload images; both images silently default to `1.png` |
| G3 | `editFood()` wraps payload in `food_info` key — wrong format for aggregator update (needs flat fields) |
| G4 | `editFood()` never sends `swiggy_image` file — Swiggy image can never be updated |
| G5 | ProductForm has one image upload slot → no UI to upload or preview Swiggy-specific image |

---

## 2. API Contract (confirmed 2026-08-17)

### GET `/foods-list?food_for=Aggregator`
- `image` → full URL or default placeholder (never null)
- `swiggy_image` → full URL when uploaded, `null` otherwise
- `zomato_image` → always `null` (unused by backend)

### POST `/add-food-aggregator`
- Accepts **JSON body** (works, no images → both default to `1.png`)
- Accepts **multipart** (required for image upload)
- Files: `image` (main/Zomato), `swiggy_image` (Swiggy-specific, optional)
- ⚠️ `variations` and `addon_ids` MUST be OMITTED in multipart (sending as string `"[]"` causes DB corruption)
- No `food_info` wrapper

### POST `/foods/{id}` (aggregator update)
- Flat multipart fields — NO `food_info` wrapper (confirmed by investigation)
- `image` / `swiggy_image` optional — omit = keep existing file

---

## 3. Affected Files + Line-level Analysis

### 3a. `api/transforms/menuManagementTransform.js`

**`fromAPI.food()` L38 — add `swiggyImage` field:**
```js
// CURRENT L38:
productImage: api.image?.includes('food-default-image') ? null : api.image || null,

// ADD after L38:
swiggyImage: api.swiggy_image || null,  // BUG-327: Swiggy image URL; null when not uploaded
```

**`toAPI.foodInfo()` — NO CHANGE needed.** Image files are handled at the service layer (FormData), not in the payload object.

---

### 3b. `api/services/menuManagementService.js`

**Current `addFoodAggregator()` (L36-38) — KEEP as-is (JSON path still valid when no images).**

**ADD new function after L38:**
```js
/** BUG-327: Add aggregator food with image upload — flat multipart (no food_info wrapper)
 *  ⚠ SKIP variations/addon_ids — sending as multipart strings corrupts DB (whereIn TypeError) */
export const addFoodAggregatorMultipart = (foodInfo, imageFile = null, swiggyImageFile = null) => {
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

**ADD new function after `editFood()` (L61):**
```js
/** BUG-327: Edit aggregator food — flat multipart fields (no food_info wrapper)
 *  Only files provided are updated; omit = backend keeps existing file */
export const editFoodAggregator = (foodId, foodInfo, imageFile = null, swiggyImageFile = null) => {
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

---

### 3c. `components/panels/menu/ProductForm.jsx`

**State init — edit mode (L252-253 area):** Add two new slots:
```js
imageFile: null,
imagePreview: product.productImage || null,
// BUG-327: Swiggy image slots (aggregator only)
swiggyImageFile:    null,
swiggyImagePreview: product.swiggyImage || null,
```

**State init — new mode (L282 area):** Add:
```js
imageFile: null, imagePreview: null,
swiggyImageFile: null, swiggyImagePreview: null, // BUG-327
```

**Image upload UI section (L333-354 area):** Currently one upload block. Add a second upload block for `swiggyImageFile`, visible only when `menuType === 'Aggregator'`:
```jsx
{/* BUG-327: Swiggy image — aggregator food only */}
{menuType === 'Aggregator' && (
  <div className="py-1.5">
    <label className="block text-xs font-medium mb-1" style={{ color: COLORS.grayText }}>
      Swiggy Image
    </label>
    <div className="flex items-center gap-3">
      {form.swiggyImagePreview && (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden border" style={{ borderColor: COLORS.borderGray }}>
          <img src={form.swiggyImagePreview} alt="Swiggy preview" className="w-full h-full object-cover" />
          <button onClick={() => { update("swiggyImageFile", null); update("swiggyImagePreview", null); }}
            className="absolute top-0 right-0 p-0.5 bg-white/80 rounded-bl">
            <XIcon className="w-3 h-3" style={{ color: "#EF4444" }} />
          </button>
        </div>
      )}
      <label className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
        data-testid="swiggy-image-upload-btn">
        <Upload className="w-4 h-4" />
        {form.swiggyImagePreview ? "Change" : "Upload"}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { update("swiggyImageFile", file); update("swiggyImagePreview", URL.createObjectURL(file)); }
        }} />
      </label>
    </div>
  </div>
)}
```

**Save path (L568-576):** Update aggregator branches to use new services + pass both image files:
```js
if (isNew) {
  if (menuType === 'Aggregator') {
    // BUG-327: Use multipart service to support image upload
    await menuService.addFoodAggregatorMultipart(foodInfo, form.imageFile, form.swiggyImageFile);
  } else {
    await menuService.addFood(foodInfo, form.imageFile);
  }
} else {
  if (menuType === 'Aggregator') {
    // BUG-327: Flat multipart (no food_info wrapper) + both image files
    await menuService.editFoodAggregator(product.productId, foodInfo, form.imageFile, form.swiggyImageFile);
  } else {
    await menuService.editFood(product.productId, foodInfo, form.imageFile);
  }
}
```

---

### 3d. `components/panels/menu/ProductList.jsx`

**`handleQuickSave()` (L118-130):** Detect aggregator and use correct service:
```js
// CURRENT L122:
await menuService.editFood(product.productId, foodInfo);

// NEW (BUG-327: aggregator uses flat multipart, no images in quick-edit):
if (menuType === 'Aggregator') {
  await menuService.editFoodAggregator(product.productId, foodInfo, null, null);
} else {
  await menuService.editFood(product.productId, foodInfo);
}
```
Note: Quick-edit never uploads images (no file input in QuickEditForm), so both image params are `null`.

---

### 3e. `components/panels/menu/BulkEditor.jsx`

**`processOne()` (L575-600):** Update aggregator paths:

```js
// CURRENT (L578-585):
if (row._isNew) {
  if (menuType === 'Aggregator') {
    await menuService.addFoodAggregator(payload); // CR-140 OD-2=A
  } else {
    await menuService.addFood(payload);
  }
} else {
  await menuService.editFood(row._id, payload);
  ...
}

// NEW (BUG-327):
if (row._isNew) {
  if (menuType === 'Aggregator') {
    // BUG-327: flat multipart — no images from BulkEditor
    await menuService.addFoodAggregatorMultipart(payload, null, null);
  } else {
    await menuService.addFood(payload);
  }
} else {
  if (menuType === 'Aggregator') {
    // BUG-327: flat multipart for aggregator update
    await menuService.editFoodAggregator(row._id, payload, null, null);
  } else {
    await menuService.editFood(row._id, payload);
  }
  ...
}
```

---

## 4. Downstream Impact

| Path | Impact |
|---|---|
| Normal food add/edit | NOT affected — `addFood` and `editFood` unchanged |
| `addFoodAggregator()` (JSON) | KEPT — still valid for no-image case, but replaced at call sites |
| Aggregator BulkEditor new rows | Now uses `addFoodAggregatorMultipart(payload, null, null)` — flat multipart, no image files |
| Aggregator BulkEditor edit rows | Now uses `editFoodAggregator(id, payload, null, null)` — flat multipart, no image files |
| ProductCard QuickEdit | Save handled by ProductList — no change to ProductCard component needed |

---

## 5. Risk Classification

| Dimension | Assessment |
|---|---|
| API contract change | YES — new multipart format for aggregator add/edit |
| Financial logic | NONE |
| Hotspot file (R5) | NONE |
| Files changed | 5 |
| Normal food regression | NONE — `addFood` and `editFood` untouched for normal paths |
| Aggregator BulkEditor regression | LOW — same data, just different transport format (JSON → multipart) |
| Overall | **MEDIUM** |

---

## 6. Owner Decisions Needed

None — API contract fully confirmed by investigation probes. Key design choices:
- `variations`/`addon_ids` SKIPPED in multipart (confirmed safe by investigation)
- `addFoodAggregator()` JSON function KEPT (backward-compatible, replace at call sites)
- Image upload NOT added to BulkEditor (out of scope — BulkEditor is batch metadata editor)

---

## 7. Verification Plan (seeds Gate 3)

| # | Check | Method |
|---|---|---|
| V1 | `swiggyImage` readable after food load | ProductForm: open aggregator food 13303 → Swiggy image preview shows existing image | NO — browser |
| V2 | Add aggregator food with both images | ProductForm: add new aggregator food → upload both images → save → reload → check both images in list | NO — Network tab |
| V3 | Edit aggregator food — only main image | Update main image, leave swiggy → omit `swiggy_image` from payload → backend keeps existing | NO — Network tab |
| V4 | Edit aggregator food — both images | Upload both → Network tab → `image` + `swiggy_image` files both present | NO |
| V5 | Normal food unaffected | Add/edit normal food → `food_info=JSON.stringify(...)` still sent | NO — Network tab |
| V6 | BulkEditor aggregator save — no food_info wrapper | Save row in Aggregator BulkEditor → Network tab → flat fields, no `food_info` key | NO |
| V7 | QuickEdit aggregator save — no food_info wrapper | Quick-save aggregator food → Network tab → flat fields | NO |
| V8 | `variations`/`addon_ids` absent from multipart | Any aggregator save → Network tab → neither key present in multipart body | NO |
