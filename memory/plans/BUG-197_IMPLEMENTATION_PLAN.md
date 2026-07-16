# Implementation Plan — BUG-197 (CR-072 Post-Delivery FE Fixes)

**ID:** BUG-197
**Date:** 2026-07-16 (revised — Issue #3 wastage CRUD now included)
**Gate:** 3 — Implementation Plan
**Risk:** HIGH
**Code Reality:** PARTIAL
**Prerequisite:** Impact Analysis at `/app/memory/impact/BUG-197_IMPACT_ANALYSIS.md`

---

## Execution Sequence

Execute in dependency order (transforms first, then services, then UI):

1. **Edit 6** — Purchase `amount→Amount` (trivial, 1 char)
2. **Edit 4** — Recipe store field fix
3. **Edit 5a** — Recipe update transform (new function)
4. **Edit 5b** — Recipe update service (POST→PUT)
5. **Edit 2a + 3a** — Constants: ADD_VENDOR + wastage CRUD endpoints
6. **Edit 2c + 3b** — Transforms: addVendor + wastage CRUD transforms + wastageReasons status field
7. **Edit 2b + 3c** — Services: addVendor + wastage CRUD functions
8. **Edit 2d** — Wire vendor save in InventorySetupPanel
9. **Edit 3d** — Wastage CRUD UI in InventorySetupPanel (WastageTab rewrite)
10. **Edit 1** — Add Ingredient UI in InventorySetupPanel

**Checkpoint after each group:** Verify webpack compiles.

---

## Edit 6 — Fix `amount` → `Amount` in Purchase Transform

**File:** `api/transforms/inventoryTransform.js`
**Line:** 129
**Current:**
```js
        amount: item.amount,
```
**New:**
```js
        Amount: item.amount,           // BUG-197 #6: capital A per backend contract
```

---

## Edit 4 — Fix `storeRecipe` Field Names

**File:** `api/transforms/recipeTransform.js`
**Lines:** 100-117
**Current:**
```js
  // C2: store-recipe
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
  // C2: store-recipe — BUG-197 #4: name = food_id (integer), serves_people (with 's')
  storeRecipe(data) {
    return {
      name: data.foodId,                    // Backend expects food_id integer in 'name' field
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
**Changes:** Remove `food_id` (redundant). `name: data.foodId` (int). `serves_people` (add 's'). Store ingredient fields unchanged.

---

## Edit 5a — Add `updateRecipe` Transform

**File:** `api/transforms/recipeTransform.js`
**Location:** After `storeRecipe` (after the closing `},`), before `storeSubRecipe`
**Insert:**
```js
  // C3: update-recipe — BUG-197 #5: PUT, different ingredient field names than store
  updateRecipe(data) {
    return {
      name: data.foodId,
      qty: data.qty,
      unit: data.unit,
      preparation_time: data.preparationTime || '',
      serve_time: data.serveTime || '',
      serves_people: data.servePeople || 1,
      ingredients: (data.ingredients || []).map(ing => ({
        id: ing.ingredientId,               // 'id' not 'ingredient_id' (update contract)
        qty: ing.quantity,                   // 'qty' not 'quantity' (update contract)
        unit: ing.unit,
      })),
    };
  },
```

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
  const payload = toAPI.updateRecipe(data); // BUG-197 #5: separate transform
  return api.put(`${RECIPE_ENDPOINTS.UPDATE_RECIPE}/${id}`, payload); // BUG-197 #5: PUT not POST
}
```

---

## Edit 2a + 3a — Add Constants (Vendor + Wastage CRUD)

**File:** `api/constants.js`

**After line 166 (`VENDOR_TYPE`):**
```js
  ADD_VENDOR: '/api/v2/vendoremployee/inventory/add-vendor', // BUG-197 #2
```

**After line 168 (`WASTAGE_REASONS`):**
```js
  // BUG-197 #3: Wastage CRUD endpoints (different base path from legacy GET)
  WASTAGE_LIST: '/api/v2/vendoremployee/wastage-reasons/list',
  ADD_WASTAGE_REASON: '/api/v2/vendoremployee/wastage-reasons/add',
  UPDATE_WASTAGE_REASON: '/api/v2/vendoremployee/wastage-reasons/update',
  WASTAGE_REASON_STATUS: '/api/v2/vendoremployee/wastage-reasons/status',
  DELETE_WASTAGE_REASON: '/api/v2/vendoremployee/wastage-reasons/delete',
```

**Note:** Keep existing `WASTAGE_REASONS` (used by stock adjustment `addStock` flow). New `WASTAGE_LIST` is for the setup panel CRUD view.

---

## Edit 2c + 3b — Add Transforms (Vendor + Wastage CRUD + wastageReasons status field)

**File:** `api/transforms/inventoryTransform.js`

### Update `fromAPI.wastageReasons` (L88-93) — add `status` field:
**Current:**
```js
  wastageReasons(response) {
    const items = response?.reasons || [];
    return items.map(r => ({
      id: r.id,
      reason: r.reason || '',
    }));
  },
```
**New:**
```js
  // BUG-197 #3: add status field + support both response shapes (legacy + new list)
  wastageReasons(response) {
    const items = response?.reasons || response?.data || [];
    return items.map(r => ({
      id: r.id,
      reason: r.reason || '',
      status: r.status !== undefined ? Number(r.status) : 1, // 1=active, 0=inactive
    }));
  },
```

### Add to `toAPI` object (after `storeCategory`, before closing `};`):

```js
  // BUG-197 #2: add-vendor
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

  // BUG-197 #3: wastage CRUD transforms
  addWastageReason(data) {
    return { reason: data.reason };
  },

  updateWastageReason(data) {
    return { reason: data.reason };
  },

  toggleWastageStatus(status) {
    return { status: status };
  },
```

---

## Edit 2b + 3c — Add Service Functions (Vendor + Wastage CRUD)

**File:** `api/services/inventoryService.js`

### Add after `getVendorTypes()` (after L82):
```js
export async function addVendor(data) {
  const payload = toAPI.addVendor(data);
  return api.post(INVENTORY_ENDPOINTS.ADD_VENDOR, payload); // BUG-197 #2
}
```

### Replace existing `getWastageReasons()` (L85-88) and add CRUD:
```js
// ── Wastage ──────────────────────────────────────────────────────
export async function getWastageReasons() {
  const res = await api.get(INVENTORY_ENDPOINTS.WASTAGE_LIST); // BUG-197 #3: use new list endpoint
  return fromAPI.wastageReasons(res.data);
}

export async function addWastageReason(data) {
  const payload = toAPI.addWastageReason(data);
  return api.post(INVENTORY_ENDPOINTS.ADD_WASTAGE_REASON, payload); // BUG-197 #3
}

export async function updateWastageReason(id, data) {
  const payload = toAPI.updateWastageReason(data);
  return api.post(`${INVENTORY_ENDPOINTS.UPDATE_WASTAGE_REASON}/${id}`, payload); // BUG-197 #3
}

export async function toggleWastageStatus(id, status) {
  const payload = toAPI.toggleWastageStatus(status);
  return api.post(`${INVENTORY_ENDPOINTS.WASTAGE_REASON_STATUS}/${id}`, payload); // BUG-197 #3
}

export async function deleteWastageReason(id) {
  return api.delete(`${INVENTORY_ENDPOINTS.DELETE_WASTAGE_REASON}/${id}`); // BUG-197 #3
}
```

**Note:** `getWastageReasons()` switches from `WASTAGE_REASONS` (old) to `WASTAGE_LIST` (new). The old `WASTAGE_REASONS` constant stays for `addStock()` flow which uses it as a dropdown source.

**Implementation note:** If the `/wastage-reasons/list` response shape differs from the old endpoint, the `fromAPI.wastageReasons` has been updated to handle both (`response?.reasons || response?.data`). Agent should curl-verify at implementation time.

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

---

## Edit 3d — Wastage CRUD UI (WastageTab Rewrite)

**File:** `components/inventory/InventorySetupPanel.jsx`
**Lines:** 262-301 (entire `WastageTab` function)

Replace read-only WastageTab with full CRUD version:

### New WastageTab features:
- "Add Reason" button + inline input row
- Edit button per row → inline editing
- Status toggle (active/inactive) per row
- Delete button per row with confirmation
- Visual status indicator (active=green, inactive=gray)

### State additions:
```js
const [reasons, setReasons] = useState([]);
const [loading, setLoading] = useState(true);
const [newReason, setNewReason] = useState('');
const [showAddRow, setShowAddRow] = useState(false);
const [editingId, setEditingId] = useState(null);
const [editingText, setEditingText] = useState('');
```

### Handlers:
```js
const addReason = async () => { ... inventoryService.addWastageReason({ reason }) ... }
const updateReason = async (id) => { ... inventoryService.updateWastageReason(id, { reason }) ... }
const toggleStatus = async (id, currentStatus) => { ... inventoryService.toggleWastageStatus(id, currentStatus ? 0 : 1) ... }
const deleteReason = async (id) => { ... inventoryService.deleteWastageReason(id) ... }
```

### Table columns: Reason | Status | Actions (Edit / Toggle / Delete)

---

## Edit 1 — Add Ingredient UI

**File:** `components/inventory/InventorySetupPanel.jsx`
**Location:** IngredientsTab — toolbar + table

### State additions (after L18):
```js
const [showAddForm, setShowAddForm] = useState(false);
const [newIng, setNewIng] = useState({ name: '', categoryId: '', unit: '' });
```

### "Add Ingredient" button (in toolbar after search, L128):
```jsx
<Button onClick={() => setShowAddForm(true)} ... data-testid="add-ingredient-btn">
  <Plus /> Add Ingredient
</Button>
```

### Handler (after L84):
```js
const addIngredient = async () => {
  if (!newIng.name.trim() || !newIng.categoryId || !newIng.unit) { toast.error('...'); return; }
  await inventoryService.addIngredient(newIng);
  toast.success(`"${newIng.name}" added`);
  setNewIng({ name: '', categoryId: '', unit: '' });
  setShowAddForm(false);
  await fetchData();
};
```

### Inline form row at top of tbody when `showAddForm` is true:
Category dropdown | Name input | Unit dropdown | Save/Cancel buttons.

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Auto? |
|--------|------|--------|---------------|:---:|
| 6 | inventoryTransform.js:129 | `amount`→`Amount` | grep + curl POST /add-purchase → 200 | YES |
| 4 | recipeTransform.js:102-116 | name=foodId, serves_people | grep + curl POST /store-recipe | YES |
| 5a | recipeTransform.js (new fn) | Add `updateRecipe` | grep `updateRecipe` | YES |
| 5b | recipeService.js:17-19 | POST→PUT + new transform | grep `api.put` | YES |
| 2a+3a | constants.js | ADD_VENDOR + 5 wastage endpoints | grep `ADD_VENDOR\|WASTAGE_LIST` | YES |
| 2c+3b | inventoryTransform.js | addVendor + wastage transforms + status field | grep `addVendor\|addWastageReason` | YES |
| 2b+3c | inventoryService.js | addVendor + 5 wastage functions | grep `addVendor\|addWastageReason\|toggleWastageStatus` | YES |
| 2d | InventorySetupPanel.jsx:209 | Wire vendor save | Browser: add vendor → Network tab POST | NO |
| 3d | InventorySetupPanel.jsx:262-301 | Wastage CRUD UI | Browser: add/edit/toggle/delete reason | NO |
| 1 | InventorySetupPanel.jsx (additive) | Add Ingredient form | Browser: add ingredient → appears in list | NO |

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
1. `api/constants.js` — Issues #2, #3
2. `api/transforms/inventoryTransform.js` — Issues #2, #3, #6
3. `api/transforms/recipeTransform.js` — Issues #4, #5
4. `api/services/inventoryService.js` — Issues #2, #3
5. `api/services/recipeService.js` — Issue #5
6. `components/inventory/InventorySetupPanel.jsx` — Issues #1, #2, #3

### Files WILL NOT touch:
- `VendorFormDialog.jsx` — already correct
- `RecipeManagementPanel.jsx` — calls service, no changes needed
- Any order/settlement/report/financial file
- Any socket/context/provider file

---

## Estimated Size
- ~10 lines modified (edits 4, 5b, 6, wastageReasons transform)
- ~45 lines added (edits 2a-c, 3a-c, 5a — plumbing)
- ~80 lines added (edits 1, 2d, 3d — UI)
- **Total: ~135 lines across 6 files**
