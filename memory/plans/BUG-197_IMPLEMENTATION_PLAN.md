# Implementation Plan — BUG-197 (CR-072 Post-Delivery FE Fixes)

**ID:** BUG-197
**Date:** 2026-07-16
**Gate:** 3 — Implementation Plan
**Risk:** HIGH
**Code Reality:** PARTIAL
**Prerequisite:** Impact Analysis at `/app/memory/impact/BUG-197_IMPACT_ANALYSIS.md`

---

## Execution Sequence

Execute in this order (simplest/safest first, compound changes last):

1. **Edit 6** — Purchase `amount→Amount` (trivial, unblocks purchase entry)
2. **Edit 4** — Recipe store field fix (unblocks recipe create)
3. **Edit 5a** — Recipe update transform (add `toAPI.updateRecipe`)
4. **Edit 5b** — Recipe update service (POST→PUT + use new transform)
5. **Edit 2a-2c** — Vendor plumbing (constant + service + transform)
6. **Edit 2d** — Vendor save wiring (InventorySetupPanel)
7. **Edit 1** — Add Ingredient UI (largest change, additive)

---

## Edit 6 — Fix `amount` → `Amount` in Purchase Transform

**File:** `api/transforms/inventoryTransform.js`
**Line:** ~129
**Current:**
```js
        amount: item.amount,
```
**New:**
```js
        Amount: item.amount,           // BUG-197 #6: capital A per backend contract
```
**Verify:** `grep -n "Amount:" inventoryTransform.js` → line ~129 shows capital A

---

## Edit 4 — Fix `storeRecipe` Field Names

**File:** `api/transforms/recipeTransform.js`
**Lines:** 102-116
**Current:**
```js
  storeRecipe(data) {
    return {
      food_id: data.foodId,
      name: data.name,
      qty: data.qty,
      unit: data.unit,
      preparation_time: data.preparationTime || '',
      serve_time: data.serveTime || '',
      serve_people: data.servePeople || 1,
      ingredients: (data.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
```
**New:**
```js
  // BUG-197 #4: name = food_id (integer), serves_people (with 's')
  storeRecipe(data) {
    return {
      name: data.foodId,                    // Backend expects food_id as integer in 'name' field
      qty: data.qty,
      unit: data.unit,
      preparation_time: data.preparationTime || '',
      serve_time: data.serveTime || '',
      serves_people: data.servePeople || 1, // 'serves' not 'serve'
      ingredients: (data.ingredients || []).map(ing => ({
        ingredient_id: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
  },
```
**Changes:**
- Removed `food_id: data.foodId` (redundant — backend uses `name`)
- Changed `name: data.name` → `name: data.foodId` (integer)
- Changed `serve_people` → `serves_people`
- Ingredient fields unchanged (store uses `ingredient_id`/`quantity` — correct)

**Verify:** `grep -n "serves_people\|name: data.foodId" recipeTransform.js`

---

## Edit 5a — Add `updateRecipe` Transform

**File:** `api/transforms/recipeTransform.js`
**Location:** After `storeRecipe` function (after line ~117), before `storeSubRecipe`
**Add:**
```js
  // BUG-197 #5: update-recipe uses different ingredient field names than store
  updateRecipe(data) {
    return {
      name: data.foodId,                    // food_id as integer (same as store)
      qty: data.qty,
      unit: data.unit,
      preparation_time: data.preparationTime || '',
      serve_time: data.serveTime || '',
      serves_people: data.servePeople || 1, // with 's' (same as store)
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,               // 'id' not 'ingredient_id' (update contract)
        qty: ing.quantity,                   // 'qty' not 'quantity' (update contract)
        unit: ing.unit,
      })),
    };
  },
```
**Verify:** `grep -n "updateRecipe" recipeTransform.js` → function exists

---

## Edit 5b — Fix `updateRecipe` Service (POST→PUT + new transform)

**File:** `api/services/recipeService.js`
**Lines:** 17-19
**Current:**
```js
export async function updateRecipe(id, data) {
  const payload = toAPI.storeRecipe(data);
  return api.post(`${RECIPE_ENDPOINTS.UPDATE_RECIPE}/${id}`, payload);
}
```
**New:**
```js
export async function updateRecipe(id, data) {
  const payload = toAPI.updateRecipe(data); // BUG-197 #5: separate transform for update
  return api.put(`${RECIPE_ENDPOINTS.UPDATE_RECIPE}/${id}`, payload); // BUG-197 #5: PUT not POST
}
```
**Verify:** `grep -n "api.put\|toAPI.updateRecipe" recipeService.js`

---

## Edit 2a — Add `ADD_VENDOR` Endpoint Constant

**File:** `api/constants.js`
**Location:** Inside `INVENTORY_ENDPOINTS` block, after `VENDOR_TYPE` line (~166)
**Current:**
```js
  // Vendors
  VENDOR_TYPE: '/api/v2/vendoremployee/inventory/vendor-type',
```
**New:**
```js
  // Vendors
  VENDOR_TYPE: '/api/v2/vendoremployee/inventory/vendor-type',
  ADD_VENDOR: '/api/v2/vendoremployee/inventory/add-vendor', // BUG-197 #2
```
**Verify:** `grep -n "ADD_VENDOR" constants.js`

---

## Edit 2b — Add `addVendor` Service Function

**File:** `api/services/inventoryService.js`
**Location:** After `getVendorTypes()` function (after line ~82), before wastage section
**Add:**
```js
export async function addVendor(data) {
  const payload = toAPI.addVendor(data);
  return api.post(INVENTORY_ENDPOINTS.ADD_VENDOR, payload); // BUG-197 #2
}
```
**Verify:** `grep -n "addVendor" inventoryService.js`

---

## Edit 2c — Add `toAPI.addVendor` Transform

**File:** `api/transforms/inventoryTransform.js`
**Location:** Inside `toAPI` object, after `storeCategory` (after line ~158)
**Add:**
```js
  // BUG-197 #2: add-vendor — maps VendorFormDialog fields to backend contract
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
```
**Verify:** `grep -n "addVendor" inventoryTransform.js`

---

## Edit 2d — Wire Vendor `handleSave` to API

**File:** `components/inventory/InventorySetupPanel.jsx`
**Lines:** 209-213
**Current:**
```js
  const handleSave = async (data) => {
    toast.success(`Vendor "${data.name}" saved`);
    setEditVendor(undefined);
    await fetchData();
  };
```
**New:**
```js
  // BUG-197 #2: Wire to actual API
  const handleSave = async (data) => {
    try {
      await inventoryService.addVendor(data);
      toast.success(`Vendor "${data.name}" saved`);
      setEditVendor(undefined);
      await fetchData();
    } catch (err) {
      toast.error(err?.readableMessage || 'Failed to save vendor');
    }
  };
```
**Verify:** Open Inventory Setup → Vendors → Add Vendor → fill form → Save → toast + vendor appears in list after refresh

---

## Edit 1 — Add Ingredient UI in IngredientsTab

**File:** `components/inventory/InventorySetupPanel.jsx`
**Location:** IngredientsTab, toolbar area (after search input, line ~128)
**Add:** "Add Ingredient" button + inline form row at top of table

### Add Button (in toolbar, after search input div)
```jsx
<Button onClick={() => setShowAddForm(true)} className="ml-auto bg-green-600 hover:bg-green-700 text-white gap-1.5" data-testid="add-ingredient-btn">
  <Plus className="w-4 h-4" /> Add Ingredient
</Button>
```

### State additions (inside IngredientsTab, after existing state declarations ~L18)
```js
const [showAddForm, setShowAddForm] = useState(false);
const [newIng, setNewIng] = useState({ name: '', categoryId: '', unit: '' });
```

### Add handler (after deleteIngredient function ~L84)
```js
const addIngredient = async () => {
  if (!newIng.name.trim() || !newIng.categoryId || !newIng.unit) {
    toast.error('Name, category, and unit are required');
    return;
  }
  try {
    await inventoryService.addIngredient(newIng);
    toast.success(`"${newIng.name}" added`);
    setNewIng({ name: '', categoryId: '', unit: '' });
    setShowAddForm(false);
    await fetchData();
  } catch (err) {
    toast.error(err?.readableMessage || 'Failed to add ingredient');
  }
};
```

### Inline form row (at top of table tbody, before loading/empty/data rows)
Adds a new row with: category dropdown, name input, unit dropdown, save/cancel buttons.
Appears only when `showAddForm` is true.

**Verify:** Open Inventory Setup → Ingredients → "Add Ingredient" button → form appears → fill category + name + unit → Save → ingredient appears in list

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 6 | inventoryTransform.js:129 | `amount` → `Amount` | curl POST /add-purchase with test data → 200 | YES (curl) |
| 4 | recipeTransform.js:102-116 | name=foodId(int), serves_people | grep + curl POST /store-recipe | YES (curl) |
| 5a | recipeTransform.js (new fn) | Add `updateRecipe` transform | grep `updateRecipe` → function exists | YES (grep) |
| 5b | recipeService.js:17-19 | POST→PUT + new transform | grep `api.put` + `toAPI.updateRecipe` | YES (grep) |
| 2a | constants.js:~167 | Add ADD_VENDOR constant | grep `ADD_VENDOR` → present | YES (grep) |
| 2b | inventoryService.js:~83 | Add addVendor() function | grep `addVendor` → function exists | YES (grep) |
| 2c | inventoryTransform.js (~159) | Add toAPI.addVendor() | grep `addVendor` in transform → exists | YES (grep) |
| 2d | InventorySetupPanel.jsx:209 | Wire handleSave to API | Browser: add vendor → check Network tab for POST | NO (browser) |
| 1 | InventorySetupPanel.jsx (additive) | Add Ingredient button + form | Browser: click Add Ingredient → fill → save → ingredient appears | NO (browser) |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-197 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: BUG-197 row updated
- [ ] FILE_OWNERSHIP.md: add 6 files with BUG-197 + date
- [ ] Code markers: // BUG-197 comment in every modified file
```

---

## Scope Lock

### Files WILL change (6 files):
1. `api/transforms/inventoryTransform.js` — Issues #2, #6
2. `api/transforms/recipeTransform.js` — Issues #4, #5
3. `api/services/recipeService.js` — Issue #5
4. `api/constants.js` — Issue #2
5. `api/services/inventoryService.js` — Issue #2
6. `components/inventory/InventorySetupPanel.jsx` — Issues #1, #2

### Files WILL NOT touch:
- `VendorFormDialog.jsx` — already correct
- `RecipeManagementPanel.jsx` — calls service, no changes needed
- Any order/settlement/report/financial file
- Any socket/context/provider file
- Any page wrapper file

---

## Estimated Size
- ~15 lines modified (edits 2d, 4, 5b, 6)
- ~25 lines added (edits 2a, 2b, 2c, 5a)
- ~40 lines added (edit 1 — add ingredient UI)
- **Total: ~80 lines across 6 files**
