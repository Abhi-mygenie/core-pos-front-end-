# Implementation Plan — BUG-197 (CR-072 Post-Delivery — Complete Inventory Module Fix)

**ID:** BUG-197
**Date:** 2026-07-16 (v3 — 10 gaps, 8 files)
**Gate:** 3 — Implementation Plan
**Risk:** HIGH
**Prerequisites:**
- Impact Analysis: `/app/memory/impact/BUG-197_IMPACT_ANALYSIS.md`
- Investigation: `/app/memory/evidence/CR-072/CR072_POST_DELIVERY_INVESTIGATION_2026_07_16.md`

---

## Pre-Implementation Curl Verification (MANDATORY — do before coding)

These verifications resolve unknowns. Record responses in `/app/memory/evidence/CR-072/`.

### V1 — GET /recipe/get-recipe response shape
```bash
curl -s -X GET "https://preprod.mygenie.online/api/v2/vendoremployee/recipe/get-recipe" \
  -H "Authorization: Bearer <token>" -H "Accept: application/json" | python3 -c "
import sys, json; d = json.load(sys.stdin)
r = d.get('recipes', d.get('data', []))
if r: print(json.dumps(r[0], indent=2))
"
```
**Find:** What field contains the raw food_id integer? (`food_id`? `name` as int? something else?)
**Action:** Map it as `foodId` in `fromAPI.recipes()`

### V2 — PUT /recipe/update-sub-recipe
```bash
curl -s -X PUT "https://preprod.mygenie.online/api/v2/vendoremployee/recipe/update-sub-recipe/<ID>" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"name":"test","ingredients":[{"id":1,"qty":1,"unit":"kg"}]}'
```
**Find:** Does sub-recipe update require PUT? Does it use `id`/`qty` or `ingredient_id`/`quantity`?

### V3 — PUT /product/update-addon-recipe
```bash
curl -s -X PUT "https://preprod.mygenie.online/api/v2/vendoremployee/product/update-addon-recipe/<ID>" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"addon_id":1,"name":"test","ingredients":[{"id":1,"qty":1,"unit":"kg"}]}'
```
**Find:** Does addon recipe update require PUT? Field names?

### V4 — GET /wastage-reasons/list response shape
```bash
curl -s -X GET "https://preprod.mygenie.online/api/v2/vendoremployee/wastage-reasons/list" \
  -H "Authorization: Bearer <token>" -H "Accept: application/json"
```
**Find:** Response shape — `{ reasons: [...] }` or `{ data: [...] }`? Does each reason have `status` field?

---

## Execution Sequence

### Phase 1 — Trivial Contract Fixes (safe, atomic, no dependencies)

#### Edit 6 — Purchase `amount` → `Amount`

**File:** `api/transforms/inventoryTransform.js` L129
```
CURRENT:  amount: item.amount,
NEW:      Amount: item.amount,           // BUG-197 #6
```

---

### Phase 2 — Recipe Transform Fixes (depends on V1 curl result)

#### Edit 4 — Fix `storeRecipe` fields

**File:** `api/transforms/recipeTransform.js` L100-117

Replace entire `storeRecipe` function:
```js
  // C2: store-recipe — BUG-197 #4
  storeRecipe(data) {
    return {
      name: data.foodId,                    // food_id integer in 'name' field
      qty: data.qty,
      unit: data.unit,
      preparation_time: data.preparationTime || '',
      serve_time: data.serveTime || '',
      serves_people: data.servePeople || 1, // 'serves' with s
      ingredients: (data.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
```

#### Edit 5a — Add `updateRecipe` transform

**File:** `api/transforms/recipeTransform.js`
**Location:** After `storeRecipe`, before `storeSubRecipe`

```js
  // C3: update-recipe — BUG-197 #5: PUT, different ingredient fields
  updateRecipe(data) {
    return {
      name: data.foodId,
      qty: data.qty,
      unit: data.unit,
      preparation_time: data.preparationTime || '',
      serve_time: data.serveTime || '',
      serves_people: data.servePeople || 1,
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,               // 'id' not 'ingredient_id'
        qty: ing.quantity,                   // 'qty' not 'quantity'
        unit: ing.unit,
      })),
    };
  },
```

#### Edit 7 — Map `foodId` in `fromAPI.recipes()`

**File:** `api/transforms/recipeTransform.js` L4-28
**Add to the mapped object** (after `id: r.recipe_id`):

```js
      foodId: r.food_id || null,            // BUG-197 #7: needed for edit mode
```

**Note:** Field name `food_id` is the expected API key. Confirm via V1 curl. If the API returns a different field name, adjust accordingly.

#### Edit 9a — Add sub-recipe + addon-recipe update transforms (conditional on V2/V3)

**File:** `api/transforms/recipeTransform.js`

**IF V2 confirms sub-recipe update uses `id`/`qty`:**
Add after `storeSubRecipe`:
```js
  // C7: update-sub-recipe — BUG-197 #9
  updateSubRecipe(data) {
    return {
      name: data.name,
      qty: data.qty,
      unit: data.unit,
      preparation_time: data.preparationTime || '',
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,
        qty: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
```

**IF V3 confirms addon recipe update uses `id`/`qty`:**
Add after `storeAddonRecipe`:
```js
  // D3: update-addon-recipe — BUG-197 #9
  updateAddonRecipe(data) {
    return {
      addon_id: data.addonId,
      name: data.name,
      qty: data.qty,
      unit: data.unit,
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,
        qty: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
```

**IF V2/V3 show sub/addon updates use SAME fields as store** → skip these new transforms, keep reusing store transforms.

---

### Phase 3 — Recipe Service Fixes

#### Edit 5b — Standard recipe: POST → PUT + new transform

**File:** `api/services/recipeService.js` L17-19
```
CURRENT:
  const payload = toAPI.storeRecipe(data);
  return api.post(`${RECIPE_ENDPOINTS.UPDATE_RECIPE}/${id}`, payload);

NEW:
  const payload = toAPI.updateRecipe(data);  // BUG-197 #5
  return api.put(`${RECIPE_ENDPOINTS.UPDATE_RECIPE}/${id}`, payload);  // BUG-197 #5
```

#### Edit 9b — Sub-recipe update: POST → PUT (conditional on V2)

**File:** `api/services/recipeService.js` L47-49

**IF V2 confirms PUT required:**
```
CURRENT:
  const payload = toAPI.storeSubRecipe(data);
  return api.post(`${RECIPE_ENDPOINTS.UPDATE_SUB_RECIPE}/${id}`, payload);

NEW:
  const payload = toAPI.updateSubRecipe(data);  // BUG-197 #9 (or keep storeSubRecipe if fields match)
  return api.put(`${RECIPE_ENDPOINTS.UPDATE_SUB_RECIPE}/${id}`, payload);  // BUG-197 #9
```

#### Edit 9c — Addon recipe update: POST → PUT (conditional on V3)

**File:** `api/services/recipeService.js` L67-69

**IF V3 confirms PUT required:**
```
CURRENT:
  const payload = toAPI.storeAddonRecipe(data);
  return api.post(`${RECIPE_ENDPOINTS.UPDATE_ADDON_RECIPE}/${id}`, payload);

NEW:
  const payload = toAPI.updateAddonRecipe(data);  // BUG-197 #9 (or keep storeAddonRecipe if fields match)
  return api.put(`${RECIPE_ENDPOINTS.UPDATE_ADDON_RECIPE}/${id}`, payload);  // BUG-197 #9
```

---

### Phase 4 — RecipeFormPanel UI Fixes

#### Edit 8 — Add `foodId` / `addonId` validation

**File:** `components/inventory/RecipeFormPanel.jsx` L70-72

Insert after `if (!name.trim()) { ... }`:
```js
    // BUG-197 #8: validate food/addon selection
    if (recipeType === 'standard' && !foodId) {
      toast.error('Select a menu item for this recipe');
      return;
    }
    if (recipeType === 'addon' && !addonId) {
      toast.error('Select an addon item for this recipe');
      return;
    }
```

#### Edit 10 — Fix addon dropdown to set `addonId`

**File:** `components/inventory/RecipeFormPanel.jsx` L119-127

Replace the food/addon dropdown block:

```jsx
          {recipeType === 'addon' ? (
            <div>
              <Label className="text-xs text-slate-500">Addon Item</Label>
              <select className={`mt-1 ${selectCls}`} value={addonId}
                onChange={e => setAddonId(e.target.value)} data-testid="recipe-addon">
                <option value="">Select addon...</option>
                {foods.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          ) : recipeType !== 'sub' && (
            <div>
              <Label className="text-xs text-slate-500">Menu Item</Label>
              <select className={`mt-1 ${selectCls}`} value={foodId}
                onChange={e => setFoodId(e.target.value)} data-testid="recipe-food">
                <option value="">Select item...</option>
                {foods.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
```

**Logic:**
- `standard` → dropdown sets `foodId` (used by `toAPI.storeRecipe` as `name: data.foodId`)
- `addon` → dropdown sets `addonId` (used by `toAPI.storeAddonRecipe` as `addon_id: data.addonId`)
- `sub` → no dropdown (name is free-text, used by `toAPI.storeSubRecipe` as `name: data.name`)

---

### Phase 5 — Vendor + Wastage Plumbing (constants, services, transforms)

#### Edit 2a + 3a — Add endpoint constants

**File:** `api/constants.js`

After `VENDOR_TYPE` (L166):
```js
  ADD_VENDOR: '/api/v2/vendoremployee/inventory/add-vendor', // BUG-197 #2
```

After `WASTAGE_REASONS` (L168):
```js
  // BUG-197 #3: Wastage CRUD
  WASTAGE_LIST: '/api/v2/vendoremployee/wastage-reasons/list',
  ADD_WASTAGE_REASON: '/api/v2/vendoremployee/wastage-reasons/add',
  UPDATE_WASTAGE_REASON: '/api/v2/vendoremployee/wastage-reasons/update',
  WASTAGE_REASON_STATUS: '/api/v2/vendoremployee/wastage-reasons/status',
  DELETE_WASTAGE_REASON: '/api/v2/vendoremployee/wastage-reasons/delete',
```

#### Edit 2c + 3b — Add transforms

**File:** `api/transforms/inventoryTransform.js`

Update `fromAPI.wastageReasons` (L88-93) — add `status` field + dual response shape:
```js
  wastageReasons(response) {
    const items = response?.reasons || response?.data || [];
    return items.map(r => ({
      id: r.id,
      reason: r.reason || '',
      status: r.status !== undefined ? Number(r.status) : 1,
    }));
  },
```

Add to `toAPI` (after `storeCategory`, before closing `}`):
```js
  // BUG-197 #2
  addVendor(data) {
    return {
      vendor_name: data.name,
      contact_person: data.contactPerson || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      vendor_type_id: data.typeId || null,
      gst_number: data.gst || '',
    };
  },

  // BUG-197 #3
  addWastageReason(data) { return { reason: data.reason }; },
  updateWastageReason(data) { return { reason: data.reason }; },
  toggleWastageStatus(status) { return { status }; },
```

#### Edit 2b + 3c — Add service functions

**File:** `api/services/inventoryService.js`

After `getVendorTypes()`:
```js
export async function addVendor(data) {
  const payload = toAPI.addVendor(data);
  return api.post(INVENTORY_ENDPOINTS.ADD_VENDOR, payload); // BUG-197 #2
}
```

Replace + expand wastage section:
```js
// ── Wastage ─────────────────────────────────────────────────────
export async function getWastageReasons() {
  const res = await api.get(INVENTORY_ENDPOINTS.WASTAGE_LIST); // BUG-197 #3
  return fromAPI.wastageReasons(res.data);
}

export async function addWastageReason(data) {
  return api.post(INVENTORY_ENDPOINTS.ADD_WASTAGE_REASON, toAPI.addWastageReason(data));
}

export async function updateWastageReason(id, data) {
  return api.post(`${INVENTORY_ENDPOINTS.UPDATE_WASTAGE_REASON}/${id}`, toAPI.updateWastageReason(data));
}

export async function toggleWastageStatus(id, status) {
  return api.post(`${INVENTORY_ENDPOINTS.WASTAGE_REASON_STATUS}/${id}`, toAPI.toggleWastageStatus(status));
}

export async function deleteWastageReason(id) {
  return api.delete(`${INVENTORY_ENDPOINTS.DELETE_WASTAGE_REASON}/${id}`);
}
```

**Note:** Keep old `WASTAGE_REASONS` constant (used by `addStock` in PhysicalCountPanel). New `WASTAGE_LIST` is for the CRUD view. If V4 curl confirms same response shape, we can optionally unify later.

---

### Phase 6 — InventorySetupPanel UI (vendor wiring + wastage CRUD + add ingredient)

#### Edit 2d — Wire vendor `handleSave`

**File:** `components/inventory/InventorySetupPanel.jsx` L209-213

```
CURRENT:
  const handleSave = async (data) => {
    toast.success(`Vendor "${data.name}" saved`);
    setEditVendor(undefined);
    await fetchData();
  };

NEW:
  const handleSave = async (data) => {
    try {
      await inventoryService.addVendor(data); // BUG-197 #2
      toast.success(`Vendor "${data.name}" saved`);
      setEditVendor(undefined);
      await fetchData();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to save vendor');
    }
  };
```

#### Edit 3d — Rewrite WastageTab with full CRUD

**File:** `components/inventory/InventorySetupPanel.jsx` L262-301

Replace entire `WastageTab` function with:
- State: `reasons`, `loading`, `newReason`, `showAddRow`, `editingId`, `editingText`
- Handlers: `addReason()`, `saveEdit()`, `toggleStatus()`, `deleteReason()` — all call inventoryService
- Table columns: Reason | Status (toggle badge) | Actions (Edit, Toggle, Delete)
- "Add Reason" button in toolbar → inline input row at top

#### Edit 1 — Add Ingredient UI in IngredientsTab

**File:** `components/inventory/InventorySetupPanel.jsx`

- State: `showAddForm`, `newIng { name, categoryId, unit }`
- "Add Ingredient" button in toolbar
- Handler: `addIngredient()` → calls `inventoryService.addIngredient()`
- Inline form row with: category dropdown, name input, unit dropdown, save/cancel

---

## Verification Matrix

| # | Gap | File | Verification | Auto? |
|---|---|---|---|:---:|
| 6 | Amount fix | inventoryTransform.js | grep `Amount:` | YES |
| 4 | storeRecipe fields | recipeTransform.js | grep `name: data.foodId` + `serves_people` | YES |
| 5a | updateRecipe transform | recipeTransform.js | grep `updateRecipe` fn exists | YES |
| 5b | POST→PUT standard | recipeService.js | grep `api.put.*UPDATE_RECIPE` | YES |
| 7 | fromAPI foodId | recipeTransform.js | grep `foodId:` in fromAPI.recipes | YES |
| 8 | foodId validation | RecipeFormPanel.jsx | grep `Select a menu item` | YES |
| 9 | sub/addon PUT | recipeService.js | grep `api.put.*SUB_RECIPE\|api.put.*ADDON_RECIPE` | YES |
| 10 | addon dropdown | RecipeFormPanel.jsx | grep `setAddonId` in select onChange | YES |
| 2a-c | vendor plumbing | 3 files | grep `ADD_VENDOR\|addVendor` | YES |
| 3a-c | wastage plumbing | 3 files | grep `WASTAGE_LIST\|addWastageReason` | YES |
| 2d | vendor save wiring | InventorySetupPanel.jsx | Browser: add vendor → Network POST | NO |
| 3d | wastage CRUD UI | InventorySetupPanel.jsx | Browser: add/edit/toggle/delete reason | NO |
| 1 | add ingredient UI | InventorySetupPanel.jsx | Browser: add ingredient → appears | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-197 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: BUG-197 row updated
- [ ] FILE_OWNERSHIP.md: add 8 files with BUG-197 + date
- [ ] Code markers: // BUG-197 in every modified file
- [ ] Webpack compiles with 0 new warnings
```

---

## Scope Lock

### Files WILL change (8):

| # | File | Gaps |
|---|---|---|
| 1 | `api/transforms/recipeTransform.js` | 4, 5a, 7, 9a |
| 2 | `api/services/recipeService.js` | 5b, 9b, 9c |
| 3 | `api/transforms/inventoryTransform.js` | 2c, 3b, 6 |
| 4 | `api/constants.js` | 2a, 3a |
| 5 | `api/services/inventoryService.js` | 2b, 3c |
| 6 | `components/inventory/InventorySetupPanel.jsx` | 1, 2d, 3d |
| 7 | `components/inventory/RecipeFormPanel.jsx` | 8, 10 |
| 8 | `components/inventory/VendorFormDialog.jsx` | — (no changes) |

### Files WILL NOT touch:
- `RecipeManagementPanel.jsx` — calls services, no changes needed
- `PurchaseEntryPanel.jsx` — vendor free-text is P3, deferred
- `PhysicalCountPanel.jsx` — reads wastage reasons, auto-benefits from CRUD
- `InventoryDashboardPanel.jsx` — read-only, no changes
- Any order, settlement, report, financial, socket, context, or provider file

---

## Estimated Size

| Phase | Lines |
|---|---|
| 1 (Amount fix) | 1 |
| 2 (recipe transforms) | ~50 |
| 3 (recipe services) | ~10 |
| 4 (RecipeFormPanel) | ~25 |
| 5 (vendor + wastage plumbing) | ~60 |
| 6 (InventorySetupPanel UI) | ~120 |
| **Total** | **~265 lines across 7 files** |
