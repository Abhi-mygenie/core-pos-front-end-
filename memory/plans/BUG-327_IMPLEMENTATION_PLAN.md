# BUG-327 — Implementation Plan (Gate 3)

**Date:** 2026-08-17
**Role:** PLANNING (Gate 3)
**Risk:** MEDIUM
**Prerequisite:** BACKEND must fix orphaned `aggregator_food` records 13312–13315 first (preprod broken)
**Planning skip:** NOT eligible — 5 files, API contract change, new service functions

---

## Scope Lock

**Files WILL change (5):**
1. `src/api/transforms/menuManagementTransform.js`
2. `src/api/services/menuManagementService.js`
3. `src/components/panels/menu/ProductForm.jsx`
4. `src/components/panels/menu/ProductList.jsx`
5. `src/components/panels/menu/BulkEditor.jsx`

**Files will NOT touch:**
- `ProductCard.jsx` — save logic is in ProductList; no image upload in quick-edit; no change needed
- `menuManagementTransform.js toAPI.foodInfo()` — image files handled at service layer, not in payload
- Any other file

**Execution order:** 1 (transform) → 2 (service) → 3 (ProductForm) → 4 (ProductList) → 5 (BulkEditor)

---

## Edit 1 — `menuManagementTransform.js`: Add `swiggyImage` to `fromAPI.food()`

**Locate:** Line 38 (after `productImage` line)

**Current:**
```js
productImage: api.image?.includes('food-default-image') ? null : api.image || null,
```

**New (add immediately after L38):**
```js
productImage: api.image?.includes('food-default-image') ? null : api.image || null,
swiggyImage: api.swiggy_image || null, // BUG-327: Swiggy image URL; null when not uploaded
```

**Verification:** `grep -n "swiggyImage" menuManagementTransform.js` → 1 hit at L39

---

## Edit 2 — `menuManagementService.js`: Two new service functions

### Edit 2a — `addFoodAggregatorMultipart()` — add AFTER line 38

**Current (L36-38):**
```js
/** CR-140 GAP-1: Add aggregator food — dedicated endpoint, JSON body (not multipart) */
export const addFoodAggregator = (payload) =>
  api.post(`${BASE_V2}/add-food-aggregator`, payload); // CR-140
```

**Insert after L38:**
```js

/** BUG-327: Add aggregator food with image upload — flat multipart (no food_info wrapper).
 *  ⚠ SKIP variations + addon_ids: sending as multipart strings corrupts DB (cleanBindings TypeError). */
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

### Edit 2b — `editFoodAggregator()` — add AFTER `editFood()` (currently ends at L61)

**Current (L53-61):**
```js
/** API #2 — Edit food item */
export const editFood = (foodId, foodInfo, image = null) => {
  const formData = new FormData();
  formData.append('food_info', JSON.stringify(foodInfo));
  if (image) formData.append('image', image);
  return api.post(`${BASE_V2}/foods/${foodId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

**Insert after L61:**
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

---

## Edit 3 — `ProductForm.jsx`: state init + Swiggy image UI + save path

### Edit 3a — State init: edit mode — add `swiggyImageFile` + `swiggyImagePreview`

**Locate:** Line 252-253 (the `imageFile`/`imagePreview` lines in edit mode state init)

**Current:**
```js
imageFile: null,
imagePreview: product.productImage || null,
```

**New:**
```js
imageFile: null,
imagePreview: product.productImage || null,
swiggyImageFile:    null,                          // BUG-327
swiggyImagePreview: product.swiggyImage || null,   // BUG-327: load existing Swiggy image
```

### Edit 3b — State init: new mode — add defaults

**Locate:** Line 282 (the `imageFile: null, imagePreview: null,` line)

**Current:**
```js
imageFile: null, imagePreview: null,
```

**New:**
```js
imageFile: null, imagePreview: null,
swiggyImageFile: null, swiggyImagePreview: null, // BUG-327
```

### Edit 3c — Image upload UI: add Swiggy image block after existing Product Image block

**Locate:** Lines 333-354 (the `<div className="py-1.5">` block for "Product Image").

The existing Product Image block ends at L354 (`</div>`). Insert the new Swiggy Image block **immediately after** the closing `</div>` of the Product Image block, **before** the next `</div>` that closes the parent container.

**Current anchor (unique — end of Product Image block):**
```jsx
              </label>
            </div>
          </div>
        </div>
```

**New (insert the Swiggy block before the final closing `</div>`):**
```jsx
              </label>
            </div>
          </div>
          {/* BUG-327: Swiggy image upload — aggregator food only */}
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
        </div>
```

### Edit 3d — Save path: split aggregator vs normal for both add and edit

**Locate:** Lines 568-576 (the `if (isNew)` block in save handler)

**Current:**
```js
if (isNew) {
  if (menuType === 'Aggregator') {
    await menuService.addFoodAggregator(foodInfo); // CR-140 GAP-1
  } else {
    await menuService.addFood(foodInfo, form.imageFile);
  }
} else {
  await menuService.editFood(product.productId, foodInfo, form.imageFile);
}
```

**New:**
```js
if (isNew) {
  if (menuType === 'Aggregator') {
    // BUG-327: flat multipart to support image upload
    await menuService.addFoodAggregatorMultipart(foodInfo, form.imageFile, form.swiggyImageFile);
  } else {
    await menuService.addFood(foodInfo, form.imageFile);
  }
} else {
  if (menuType === 'Aggregator') {
    // BUG-327: flat multipart, no food_info wrapper
    await menuService.editFoodAggregator(product.productId, foodInfo, form.imageFile, form.swiggyImageFile);
  } else {
    await menuService.editFood(product.productId, foodInfo, form.imageFile);
  }
}
```

---

## Edit 4 — `ProductList.jsx`: `handleQuickSave()` — aggregator branch

**Locate:** Lines 118-130 (`handleQuickSave` useCallback)

**Current (L122):**
```js
await menuService.editFood(product.productId, foodInfo);
```

**New:**
```js
// BUG-327: aggregator quick-edit uses flat multipart (no food_info wrapper); no images in quick-edit
if (menuType === 'Aggregator') {
  await menuService.editFoodAggregator(product.productId, foodInfo, null, null);
} else {
  await menuService.editFood(product.productId, foodInfo);
}
```

Ensure `menuService` import includes `editFoodAggregator`:
```js
import * as menuService from "../../../api/services/menuManagementService";
```
This is a namespace import — the new function is automatically available. No import change needed.

---

## Edit 5 — `BulkEditor.jsx`: `processOne()` — aggregator save paths

**Locate:** Lines 578-590 (`if (row._isNew)` block inside `processOne`)

**Current:**
```js
if (row._isNew) {
  if (menuType === 'Aggregator') {
    await menuService.addFoodAggregator(payload); // CR-140 OD-2=A
  } else {
    await menuService.addFood(payload);
  }
} else {
  await menuService.editFood(row._id, payload);
  // Also update status if it changed
  const origActive = row._original.isActive ? 1 : 0;
  if (origActive !== row.status) {
    await menuService.toggleFoodStatus(row._id, row.status, menuType); // BUG-301
  }
}
```

**New:**
```js
if (row._isNew) {
  if (menuType === 'Aggregator') {
    await menuService.addFoodAggregatorMultipart(payload, null, null); // BUG-327: flat multipart
  } else {
    await menuService.addFood(payload);
  }
} else {
  if (menuType === 'Aggregator') {
    await menuService.editFoodAggregator(row._id, payload, null, null); // BUG-327: flat multipart
  } else {
    await menuService.editFood(row._id, payload);
  }
  // Also update status if it changed
  const origActive = row._original.isActive ? 1 : 0;
  if (origActive !== row.status) {
    await menuService.toggleFoodStatus(row._id, row.status, menuType); // BUG-301
  }
}
```

---

## Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | `Object.entries(foodInfo)` appends `false` as string "false" | For `swiggy`/`zomato`/`swiggy_packing_chrg` the values are already strings 'YES'/'NO'/'Yes'/'No' from `toAPI.foodInfo()` — no boolean values in the object. Safe. |
| R2 | Skipping `variations`/`addon_ids` breaks aggregator with variations | Aggregator food variations are managed via UrbanPiper (Variation Stock tab), not via the add/edit API. Confirmed by investigation: owner's curl example also omits these. Safe to skip. |
| R3 | `swiggyImagePreview` shows URL.createObjectURL() blob after cancel | Pattern matches existing `imageFile`/`imagePreview` — no new issue |
| R4 | Normal food `editFood()` passes `undefined` for image | `editFood(id, foodInfo, form.imageFile)` — `form.imageFile` is `null` when no file selected; `editFood` already guards: `if (image) formData.append('image', image)`. Safe. |
| R5 | Backend prerequisite: preprod broken | BACKEND MUST fix `aggregator_food` records 13312-13315 first. FE changes can be coded but not verified until backend fix applied. |

---

## Verification Matrix

| Edit | File | Change | How to Verify | Auto? |
|---|---|---|---|---|
| 1 | `menuManagementTransform.js` L39 | `swiggyImage` added | Open ProductForm for food 13303 → `swiggyImagePreview` not null, shows existing URL | NO |
| 2a | `menuManagementService.js` | `addFoodAggregatorMultipart()` | Add aggregator food + both images → Network: multipart, flat fields, `image`+`swiggy_image` files present | NO |
| 2b | `menuManagementService.js` | `editFoodAggregator()` | Edit aggregator food → Network: flat fields, no `food_info` key | NO |
| 3a/3b | `ProductForm.jsx` | State slots | Open new aggregator form → no JS error | NO |
| 3c | `ProductForm.jsx` | Swiggy image UI | Aggregator form → "Swiggy Image" upload block visible; Normal form → hidden | NO |
| 3d | `ProductForm.jsx` | Save path | Add aggregator food → calls `addFoodAggregatorMultipart`; Edit → calls `editFoodAggregator` | NO |
| 4 | `ProductList.jsx` | Quick-save aggregator | Quick-edit aggregator food → Network: flat multipart, no `food_info` | NO |
| 5 | `BulkEditor.jsx` | processOne | New aggregator row → `addFoodAggregatorMultipart`; edit → `editFoodAggregator` | NO |
| V5 | All | Normal food unaffected | Add/edit normal food → `food_info=JSON.stringify(...)` still present | NO |
| V8 | All | `variations`/`addon_ids` absent | Any aggregator multipart save → Network tab body → neither key present | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-327 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: all 5 files listed with BUG-327 2026-08-17
- [ ] Code markers: // BUG-327 in every modified block (already shown above)
- [ ] Compile check: webpack 0 new warnings
```

---

## Awaiting Gate 4 GO
*(Also awaiting backend fix to restore preprod before verification is possible)*
