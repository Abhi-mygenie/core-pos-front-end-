# CR-142 + CR-144 Combined — Implementation Plan

**Items:** CR-142 (Addon Master V2 CRUD) + CR-144 (Addon Master Unified All Menu Types)
**Gate:** 3 ✅
**Date:** 2026-08-15
**Risk:** MEDIUM (service signature change + new component; no financial/hotspot files)
**Batched:** YES — E1 + E2 shared, implement once with markers `// CR-142/CR-144`

---

## Curl Probe Results (R11 — all confirmed before planning)

| # | Endpoint | Method | Result | Key Finding |
|---|---|---|---|---|
| P1 | /product/addon-list | GET | ✅ 200 | Returns `{addons:[{id,name,price,status,weight,veg,has_inventory,recipe_id,has_recipe,is_pushed_managed}]}` |
| P2 | /product/add-addon | POST | ✅ 200 | `{name,price,weight,veg,status,has_inventory}` → `{id,name,price,status,weight,veg,has_inventory,recipe_id,has_recipe}` |
| P3 | /product/addon-update/{id} | PUT | ✅ 200 | `{"message":"Addon updated successfully","data":{...}}` — PUT confirmed ✅ (R25 compliant) |
| P4 | /product/status-change/{id} | POST | ✅ 200 | `{"message":"Addon status updated locally. No items to push."}` |
| P5 | /product/delete-addon/{id} | DELETE | ✅ 200 | `{"message":"Addon deleted successfully!"}` |

Evidence: `/app/memory/evidence/CR-142-145/probe1_addon_list.txt` through `probe4_delete_addon.txt`

---

## Execution Sequence

```
E1 → E2 → compile-check → E3 → E4 → compile-check → E5 → compile-check → self-test
```

**Checkpoint rule:** compile after every 2 edits. Stop if webpack error before proceeding.

---

## E1 — `api/transforms/menuManagementTransform.js` — Expand `addonList()`

**File:** `/app/frontend/src/api/transforms/menuManagementTransform.js`
**Line:** 214 (confirmed via grep)
**Current:**
```js
addonList: (data) => {
  const addons = data.addons || data.data || data || [];
  if (!Array.isArray(addons)) return [];
  return addons.map((a) => ({
    id: a.id,
    name: a.name,
    price: parseFloat(a.price) || 0,
  }));
},
```
**Replace with:**
```js
addonList: (data) => {  // CR-142/CR-144
  const addons = data.addons || data.data || data || [];
  if (!Array.isArray(addons)) return [];
  return addons.map((a) => ({
    id:              a.id,
    name:            a.name,
    price:           parseFloat(a.price) || 0,
    status:          a.status ?? 1,           // 1=active 0=inactive (P1 confirmed)
    weight:          a.weight || 0,           // grams
    veg:             a.veg ?? null,           // 1=Veg 2=NonVeg 3=Egg 4=Other null=unset (P1: null observed)
    hasInventory:    a.has_inventory === 'Yes',
    recipeId:        a.recipe_id || null,
    hasRecipe:       a.has_recipe === true,
    isPushedManaged: a.is_pushed_managed === true,
  }));
},
```
**Risk:** LOW — additive. Existing consumers (ProductForm, ItemCustomizationModal) only read `id/name/price`.
**Self-test V1:** `grep -n "addonList" src/api/transforms/menuManagementTransform.js` → confirm 9 fields present.

---

## E2 — `api/services/menuManagementService.js` — Fix addon CRUD functions

**File:** `/app/frontend/src/api/services/menuManagementService.js`
**Lines:** 153–163 (confirmed via grep)

**Current:**
```js
export const addAddon = (name, price) =>
  api.post(`${BASE_V2}/add-addon`, { name, price: Number(price) });

export const updateAddon = (addonId, name, price) =>
  api.post(`${BASE_V2}/addon-update/${addonId}`, { name, price: Number(price) });

export const deleteAddon = (addonId) =>
  api.delete(`${BASE_V2}/delete-addon/${addonId}`);
```
**Replace with:**
```js
/** CR-142/CR-144 GAP-B: Add addon — V2 full payload (P2 confirmed shape) */
export const addAddon = ({ name, price, weight = 0, veg = 1, status = 1, has_inventory = 'No' }) =>
  api.post(`${BASE_V2}/add-addon`, { name, price: Number(price), weight, veg, status, has_inventory });

/** CR-142/CR-144 GAP-C: Update addon — PUT not POST (R25; P3 confirmed PUT works) */
export const updateAddon = (addonId, { name, price, weight, veg, status, has_inventory }) =>
  api.put(`${BASE_V2}/addon-update/${addonId}`, {  // CR-142/CR-144: POST→PUT (R25)
    name,
    price: Number(price),
    ...(weight       !== undefined ? { weight }       : {}),
    ...(veg          !== undefined ? { veg }          : {}),
    ...(status       !== undefined ? { status }       : {}),
    ...(has_inventory !== undefined ? { has_inventory } : {}),
  });

/** CR-142/CR-144 GAP-D: Toggle addon active/inactive (P4 confirmed) */
export const toggleAddonStatus = (addonId, status) =>
  api.post(`${BASE_V2}/status-change/${addonId}`, { status });

/** API #20 — Delete addon (unchanged; P5 confirmed) */
export const deleteAddon = (addonId) =>
  api.delete(`${BASE_V2}/delete-addon/${addonId}`);
```
**Breaking change:** `addAddon` signature changes from `(name, price)` to `({...payload})`.
**Callers to update in this same edit batch:** → E3b below (ProductForm L488).
**Risk:** HIGH on caller if missed — must update ProductForm in same compile unit.
**Self-test V2:** `grep "api\.put.*addon-update"` must return 1 hit.
**Self-test V3:** `grep "addAddon\(" src/components/panels/menu/ProductForm.jsx` → should show updated call after E3b.

---

## E3 — `components/panels/menu/ProductForm.jsx` — Fix addAddon caller + addon row display

**File:** `/app/frontend/src/components/panels/menu/ProductForm.jsx`

### E3a — Add state for veg type in quick-create (near existing `newAddonName` state)

Find line with `const [newAddonName` and add after it:
```js
const [newAddonVeg, setNewAddonVeg] = useState(1); // CR-142: veg type for quick-create
```

### E3b — Update `addAddon` call (L488 confirmed):

**Current (L488):**
```js
await menuService.addAddon(newAddonName.trim(), newAddonPrice);
```
**Replace with:**
```js
await menuService.addAddon({ name: newAddonName.trim(), price: newAddonPrice, veg: newAddonVeg }); // CR-142
```

### E3c — Add veg select in quick-create UI (before the price input in the addon quick-create row):

Find the quick-create row JSX that has `newAddonName` input and `newAddonPrice` input. Add a veg select between them:
```jsx
{/* CR-142: veg type select */}
<select
  value={newAddonVeg}
  onChange={e => setNewAddonVeg(Number(e.target.value))}
  style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6,
           border: `1px solid ${COLORS.borderGray}`, width: 72 }}>
  <option value={1}>Veg</option>
  <option value={2}>Non-V</option>
  <option value={3}>Egg</option>
</select>
```

### E3d — Addon checkbox row: add veg dot + weight badge + inactive dimming

Find addon checkbox loop (approx. L460-470). Current pattern:
```jsx
<label key={a.id} className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-50">
  <input type="checkbox" ... />
  <span className="text-sm flex-1" style={{ color: COLORS.darkText }}>{a.name}</span>
  <span className="text-xs" style={{ color: COLORS.grayText }}>{currencySymbol}{a.price}</span>
</label>
```
**Replace with:**
```jsx
<label key={a.id}
  className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-50"
  style={{ opacity: a.status === 0 ? 0.45 : 1 }}>  {/* CR-142: dim inactive */}
  <input type="checkbox" ... />
  {/* CR-142: veg dot */}
  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background:
    a.veg === 1 ? COLORS.primaryGreen :
    a.veg === 2 ? '#EF4444' :
    a.veg === 3 ? '#F59E0B' : '#9CA3AF' }} />
  <span className="text-sm flex-1" style={{ color: COLORS.darkText }}>
    {a.name}
    {a.status === 0 && <span className="text-xs ml-1.5 text-gray-400">(inactive)</span>}
  </span>
  {a.weight > 0 && (
    <span className="text-xs px-1 rounded"
      style={{ background:'#f1f5f9', color:'#64748b' }}>{a.weight}g</span>
  )}
  {a.hasInventory && (
    <span className="text-xs px-1 rounded"
      style={{ background:'#eff6ff', color:'#3b82f6' }}>INV</span>
  )}
  <span className="text-xs" style={{ color: COLORS.grayText }}>{currencySymbol}{a.price}</span>
</label>
```
**Risk:** LOW — visual change only, no state/API impact.

---

## E4 — `components/panels/MenuManagementPanel.jsx` — Add addonPanelMode + "Add-ons" button

**File:** `/app/frontend/src/components/panels/MenuManagementPanel.jsx`

### E4a — Add import for AddonManagementPanel (after BulkEditor import, L7):
```js
import AddonManagementPanel from './menu/AddonManagementPanel'; // CR-144
```

### E4b — Check Settings icon import (L2 has `X, Table2, LayoutGrid`):
Add `Settings` to that import:
```js
import { X, Table2, LayoutGrid, Settings } from "lucide-react";
```

### E4c — Add addonPanelMode state (after `bulkEditMode` state, L22):
```js
const [addonPanelMode, setAddonPanelMode] = useState(false); // CR-144
```

### E4d — Add "Add-ons" button in header toolbar (after Bulk Edit button, approx L178-188):
```jsx
{/* CR-144: Add-ons button — always visible, no menuType guard */}
<button
  data-testid="manage-addons-btn"
  onClick={() => { setAddonPanelMode(v => !v); if (bulkEditMode) setBulkEditMode(false); }}
  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors"
  style={{
    borderColor: addonPanelMode ? COLORS.primaryGreen : COLORS.borderGray,
    color:       addonPanelMode ? COLORS.primaryGreen : COLORS.grayText,
    background:  addonPanelMode ? '#F0FDF4' : 'transparent',
  }}
>
  <Settings className="w-4 h-4" />
  Add-ons
</button>
```

### E4e — Content area: add addon panel branch (L200 — before `bulkEditMode ? ...`):
Replace:
```jsx
{bulkEditMode ? (
  <div className="flex-1 overflow-hidden">
    <BulkEditor
```
With:
```jsx
{addonPanelMode ? (           {/* CR-144 */}
  <div className="flex-1 overflow-hidden">
    <AddonManagementPanel
      addons={addons}
      currencySymbol={currencySymbol}
      onRefresh={fetchAddons}
      onClose={() => setAddonPanelMode(false)}
    />
  </div>
) : bulkEditMode ? (
  <div className="flex-1 overflow-hidden">
    <BulkEditor
```

**Note:** MenuManagementPanel has no `useRestaurant()` call. Add it:
After `const { toast } = useToast();` at L12, add:
```js
const { currencySymbol } = useRestaurant(); // CR-144
```
And import `useRestaurant` at top: `import { useRestaurant } from "../../contexts/RestaurantContext";`
(Check if already imported — if yes, just add `currencySymbol` to destructure.)

**Risk:** LOW — additive state + button + conditional branch.

---

## E5 — NEW `components/panels/menu/AddonManagementPanel.jsx`

**File:** NEW (create)
**~200 lines**
**Props:** `{ addons, currencySymbol, onRefresh, onClose }`

**Component outline:**
```
State:
  editingId       — null | addon.id (which row is in edit mode)
  editForm        — { name, price, weight, veg, has_inventory }
  addMode         — bool (add form visible)
  addForm         — { name:'', price:'', weight:0, veg:1 }
  saving          — bool (loading state for PUT/POST)
  search          — string (filter)
  confirmDeleteId — null | addon.id (confirm dialog)

Filtered list: addons.filter(a => a.name.toLowerCase().includes(search))

Veg dot colour helper:
  veg === 1 → '#22c55e' (green)
  veg === 2 → '#EF4444' (red)
  veg === 3 → '#F59E0B' (amber)
  else      → '#D1D5DB' (grey)

Toolbar:
  [+ Add Addon]  [search input]  [{count} add-ons]

Add form row (when addMode=true, at top of table):
  Name:[___] Price:[___] Weight:[___]g Veg:[select] [Save] [Cancel]
  On Save: menuService.addAddon({name,price,weight,veg}) then onRefresh() then setAddMode(false)
  On error: toast with err.readableMessage

Table columns: TYPE | NAME | PRICE | WEIGHT | STOCK | INVENTORY | ACTIONS
  TYPE:      veg dot (10×10 rounded square)
  NAME:      bold; if status===0 append (inactive) in grey; row opacity 0.5 if inactive
  PRICE:     {currencySymbol}{a.price}
  WEIGHT:    {a.weight > 0 ? a.weight + 'g' : '0g'}
  STOCK:     toggle button — "● Active" (green) | "○ Inactive" (red)
             On click: menuService.toggleAddonStatus(a.id, a.status===1 ? 0 : 1) then onRefresh()
  INVENTORY: if hasInventory → "Yes" badge (blue); else "No" (grey)
             Display-only (editing controlled by hasRecipe gate)
  ACTIONS:   [Edit] [Del] buttons

Edit row (when editingId === a.id, expands inline below the row):
  Name:[{editForm.name}__] Price:[{editForm.price}] Weight:[{editForm.weight}]g Veg:[select]
  Inventory toggle:
    hasRecipe=true  → enabled toggle; on change set editForm.has_inventory
    hasRecipe=false → disabled, tooltip "Attach a recipe first"
  [Save]: menuService.updateAddon(a.id, {name,price,weight,veg,status:a.status,
                                          has_inventory: editForm.hasInventory ? 'Yes' : 'No'})
          then onRefresh(), setEditingId(null)
  [Cancel]: setEditingId(null)

Delete:
  On [Del] click: setConfirmDeleteId(a.id)
  Confirm dialog (shadcn AlertDialog):
    "Delete {name}? This cannot be undone."
    On confirm: menuService.deleteAddon(a.id) then onRefresh()
```

**Service calls used (P1-P5 all confirmed):**
- `addAddon({name,price,weight,veg,status:1,has_inventory:'No'})` → POST /add-addon
- `updateAddon(id, payload)` → PUT /addon-update/{id}
- `toggleAddonStatus(id, newStatus)` → POST /status-change/{id}
- `deleteAddon(id)` → DELETE /delete-addon/{id}

**Risk:** LOW — new isolated file.

---

## Verification Matrix

| # | Edit | File | Verification | Method |
|---|------|------|-------------|--------|
| V1 | E1 | menuManagementTransform.js | addonList maps 9 fields | grep/code review |
| V2 | E2 | menuManagementService.js | addAddon takes object payload | code review |
| V3 | E2 | menuManagementService.js | updateAddon uses api.put() | grep api.put |
| V4 | E2 | menuManagementService.js | toggleAddonStatus exists | grep |
| V5 | E3b | ProductForm.jsx | addAddon called with {name,price,veg} | code review L488 |
| V6 | E3c | ProductForm.jsx | Veg select in quick-create | Browser |
| V7 | E3d | ProductForm.jsx | Veg dot visible on addon checkboxes | Browser |
| V8 | E3d | ProductForm.jsx | Inactive addon dimmed | Browser |
| V9 | E4 | MenuManagementPanel.jsx | "Add-ons" button visible for Normal menu type | Browser |
| V10 | E4 | MenuManagementPanel.jsx | "Add-ons" button visible for Aggregator menu type | Browser |
| V11 | E4 | MenuManagementPanel.jsx | Clicking "Add-ons" shows AddonManagementPanel | Browser |
| V12 | E4 | MenuManagementPanel.jsx | Mutual exclusion: Add-ons closes Bulk Edit and vice versa | Browser |
| V13 | E5 | AddonManagementPanel.jsx | Full list renders: Type/Name/Price/Weight/Stock/Inventory | Browser |
| V14 | E5 | AddonManagementPanel.jsx | Edit row expands inline | Browser |
| V15 | E5 | AddonManagementPanel.jsx | Inventory toggle disabled when has_recipe=false | Browser |
| V16 | E5 | AddonManagementPanel.jsx | Network: PUT /addon-update/{id} on Save | devtools |
| V17 | E5 | AddonManagementPanel.jsx | Network: POST /status-change/{id} on toggle | devtools |
| V18 | E5 | AddonManagementPanel.jsx | Network: DELETE /delete-addon/{id} after confirm | devtools |
| V19 | Regression | ProductForm.jsx | Normal food add/edit unaffected | Browser |
| V20 | Regression | BulkEditor.jsx | Bulk edit unaffected | Browser |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: CR-142 → IMPLEMENTED, pos_5_1
- [ ] registry.json: CR-144 → IMPLEMENTED, pos_5_1
- [ ] CR_REGISTRY.md: both rows updated
- [ ] FILE_OWNERSHIP.md: menuManagementTransform.js, menuManagementService.js,
                          ProductForm.jsx, MenuManagementPanel.jsx + NEW AddonManagementPanel.jsx
- [ ] Code markers: // CR-142/CR-144 in shared edits; // CR-144 in MenuManagementPanel/AddonManagementPanel
```
