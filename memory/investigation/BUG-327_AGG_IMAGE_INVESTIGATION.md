# Investigation Report — BUG-327: Aggregator Food Image Handling Gaps

**Date:** 2026-08-17
**Role:** INVESTIGATION
**Steps used:** 9/10
**Triggered by:** Owner — `foods-list?food_for=Aggregator` has two image fields (`image`, `swiggy_image`); frontend doesn't handle either correctly for add/edit

---

## 1. Summary

| Track | Finding | Root Cause | Confidence |
|---|---|---|---|
| T1 | `swiggy_image` never read from API | `fromAPI.food()` only maps `api.image` → `productImage`; `api.swiggy_image` is silently dropped | HIGH (code trace) |
| T2 | Add aggregator food cannot upload images | `addFoodAggregator()` sends JSON body — images cannot be sent via JSON | HIGH (API confirmed) |
| T3 | Edit aggregator food uses wrong format | `editFood()` wraps payload in `food_info` key; aggregator update needs flat multipart fields | HIGH (API confirmed) |
| T4 | No `swiggy_image` upload UI in ProductForm | ProductForm has one image slot (`imageFile`/`imagePreview`); no second slot for Swiggy image | HIGH (code trace) |
| T5 | Preprod `foods-list?food_for=Aggregator` BROKEN | Multipart investigation probes stored `variations`/`addon_ids` as strings in DB, triggering `cleanBindings` backend error on orphaned records | HIGH (confirmed) |

---

## 2. API Contract (confirmed 2026-08-17 before corruption)

### GET `/foods-list?food_for=Aggregator`
```json
{
  "id": 13303,
  "name": "echhi spcl",
  "image": "https://preprod.../storage/restaurant_panel/aggregater_img/2026-08-17-xxx.png",
  "swiggy_image": "https://preprod.../storage/restaurant_panel/aggregater_img/2026-08-17-yyy.png",
  "zomato_image": null
}
```
- `image` → full URL (stored under `restaurant_panel/aggregater_img/`) OR default placeholder `food-default-image.png`
- `swiggy_image` → full URL when file uploaded, else `null`
- `zomato_image` → always `null` (backend column exists but not populated)
- Default when no file provided: `"1.png"` (on creation), placeholder URL (on list)

### POST `/add-food-aggregator`
- Accepts **JSON body** (works, no images) → `image: "1.png"`, `swiggy_image: "1.png"` in response
- Accepts **multipart** form data (required for image upload)
- Files: `image` (main), `swiggy_image` (optional)
- ⚠️ **CRITICAL**: `variations` and `addon_ids` MUST be omitted or sent as proper arrays in multipart. Sending them as `-F "variations=[]"` (string) stores them as string "[]" in DB and corrupts the `whereIn` query on the list endpoint
- Stores under `restaurant_panel/aggregater_img/`

### POST `/foods/{id}` (aggregator update)
- Accepts **flat multipart fields** (no `food_info` wrapper)
- `image` and `swiggy_image` are optional; omit = keep existing
- Confirmed working: `{"message":"food updated successfully"}`
- ⚠️ Must NOT include `variations`/`addon_ids` via multipart string values

---

## 3. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | `swiggy_image` returned by API | `GET /foods-list?food_for=Aggregator` | 1 | ✅ CONFIRMED | `swiggy_image: "https://...2026-08-17-xxx.png"` for 13303 |
| H2 | `swiggy_image` read by frontend | Code trace `fromAPI.food()` L38 | 1 | ❌ ELIMINATED | Only `api.image` mapped; `api.swiggy_image` not present in transform |
| H3 | JSON add accepts no images | `POST /add-food-aggregator` JSON | 1 | ✅ CONFIRMED | Returns `image:"1.png"`, `swiggy_image:"1.png"` |
| H4 | Multipart add accepts image files | `POST /add-food-aggregator` multipart | 2 | ✅ CONFIRMED | Works when `variations`/`addon_ids` excluded |
| H5 | `editFood()` format works for aggregator | Code trace L54-61 + API spec | 1 | ❌ ELIMINATED | `editFood` wraps in `food_info` key; aggregator update uses flat fields |
| H6 | Multipart update accepts `swiggy_image` | `POST /foods/13303` flat multipart | 1 | ✅ CONFIRMED | `{"message":"food updated successfully"}` |
| H7 | Multipart `variations=[]` safe | `POST /add-food-aggregator` with `-F "variations=[]"` | 1 | ❌ ELIMINATED — causes backend corruption | `cleanBindings` TypeError; foods-list broken |

---

## 4. Data Flow Trace — All Gaps

### GAP 1 — Read side: `swiggy_image` never stored in frontend state
```
API: GET /foods-list?food_for=Aggregator
  → food.image = "https://...xxx.png"      ← full URL
  → food.swiggy_image = "https://...yyy.png" ← full URL when present

Transform: fromAPI.food() L38:
  productImage: api.image?.includes('food-default-image') ? null : api.image || null
  ← swiggy_image NEVER READ → BREAK POINT

State: food.swiggyImage = undefined (field doesn't exist in frontend model)
Component: No swiggy image displayed anywhere
```

### GAP 2 — Add: JSON body cannot carry image files
```
ProductForm save path (L569-570):
  if (menuType === 'Aggregator') {
    await menuService.addFoodAggregator(foodInfo);  ← JSON body, no FormData
  }

addFoodAggregator() (service L37-38):
  api.post('/add-food-aggregator', payload)  ← payload is plain object
  ← Cannot attach File objects → BREAK POINT

Result: aggregator food created with image="1.png" always. User's uploaded image file silently ignored.
```

### GAP 3 — Edit: `food_info` wrapper vs flat fields
```
ProductForm save path (L575):
  await menuService.editFood(product.productId, foodInfo, form.imageFile);

editFood() (service L54-61):
  formData.append('food_info', JSON.stringify(foodInfo));  ← WRAPPED
  formData.append('image', image);

Aggregator update endpoint expects:
  name=... price=... food_for=Aggregator swiggy=YES ...  ← FLAT FIELDS (no food_info key)

BREAK POINT: Backend receives food_info="{...}" as a string field, NOT flat fields
→ Unknown behavior — likely backend silently ignores food_info for aggregator update
   and only updates fields it recognizes from the flat part (image file only gets updated)
```

### GAP 4 — Edit: `swiggy_image` never sent
```
editFood(foodId, foodInfo, image):
  formData.append('image', image);           ← only main image
  // swiggy_image field NEVER appended → BREAK POINT

BulkEditor save (L585):
  await menuService.editFood(row._id, payload);  ← same gap

Result: swiggy_image can never be updated from frontend
```

### GAP 5 — UI: ProductForm has no Swiggy image upload slot
```
ProductForm state:
  imageFile: null, imagePreview: product.productImage || null
  // NO: swiggyImageFile, swiggyImagePreview

ProductForm UI (L336-350):
  One <input type="file"> for imageFile
  // NO second upload for swiggy_image

Result: Owner cannot upload or preview swiggy_image for aggregator food
```

---

## 5. Backend Bug — BLOCKER (Preprod Currently Broken)

**Classification:** BACKEND_BUG — DATA_INTEGRITY  
**ID assigned:** BUG-327  
**Priority:** P0 — Preprod `foods-list?food_for=Aggregator` is returning TypeError HTML (not JSON)

### Root Cause
When `variations=[]` or `addon_ids=[]` is sent as a multipart string value (e.g., `-F "variations=[]"`), the backend's `store_aggregator_food` stores them as a literal string `"[]"` in the `aggregator_food` table instead of a proper array/NULL.

The `foods-list` query subsequently calls `->whereIn(column, $food->variations)` where `$food->variations = "[]"` (string) → `cleanBindings(): Argument #1 must be array, string given`.

### Cascade issue
The DELETE endpoint (`/product/delete/{id}`) only soft-deletes from the `food` table but does NOT cascade to the `aggregator_food` table. Orphaned `aggregator_food` records with `food_status=0` (active) remain and are included in the `foods-list` query → the broken records keep causing the error.

**Affected orphaned food IDs:** 13312, 13313, 13314, 13315

**Fix needed (backend):**
1. Hard-delete or correct the `aggregator_food` records for 13312-13315 (set `food_status=1` or remove rows)
2. Validate `variations`/`addon_ids` in `store_aggregator_food` — parse as JSON array or reject non-array values
3. Cascade food deletion to `aggregator_food` table

---

## 6. Frontend Fix Scope — BUG-327 (after backend fix restores preprod)

### Files affected
| File | Change needed | Risk |
|---|---|---|
| `api/transforms/menuManagementTransform.js` | fromAPI: +`swiggyImage: api.swiggy_image \|\| null`; toAPI: no change (image files handled at service level) | LOW |
| `api/services/menuManagementService.js` | New `addFoodAggregatorMultipart(formData)` function; new `editFoodAggregator(foodId, formData)` function with flat fields | MEDIUM |
| `components/panels/menu/ProductForm.jsx` | +`swiggyImageFile`/`swiggyImagePreview` state; +second image upload UI (aggregator only); update save path to use new services | MEDIUM |
| `components/panels/menu/ProductCard.jsx` | +`swiggyImage` display (read-only thumbnail) for aggregator food | LOW |
| `components/panels/menu/BulkEditor.jsx` | Update editFood call for aggregator rows to use `editFoodAggregator()`; productImage thumbnail already read-only — no swiggyImage column needed (out of scope for BulkEditor) | LOW |

**Planning skip:** NOT eligible — 5 files, new services, form state changes, API contract change

---

## 7. Evidence Artifacts
- `/app/memory/evidence/BUG-327/api_probe_results.json` — all API probe results
- Token: `/app/memory/inv_goan_token.txt` (refreshed 2026-08-17)
- Probe confirmed: 2026-08-17 pre-corruption run successfully (7 foods visible, images confirmed)

---

## 8. Recommendations

### Immediate (BACKEND — P0)
Fix the preprod DB directly: set `food_status=1` (or equivalent) for `aggregator_food` records 13312-13315.

### Frontend (after preprod restored)
BUG-327 FE fix — full Gate 2-3 planning needed:
1. Read `swiggy_image` from API (transform)
2. New `addFoodAggregatorMultipart()` and `editFoodAggregator()` service functions
3. ProductForm: second image upload UI for Swiggy image (aggregator only)
4. ProductForm save path: use new services, pass both image files

### Multipart encoding rule (for future investigation probes)
When sending `variations` or `addon_ids` in multipart for aggregator endpoints:
- **DO NOT** send as: `-F "variations=[]"` (stored as string)
- **DO** omit the field entirely if empty, OR send as JSON-encoded value that backend explicitly parses
