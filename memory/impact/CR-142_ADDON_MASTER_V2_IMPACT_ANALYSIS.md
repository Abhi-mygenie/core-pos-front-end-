# CR-142 — Impact Analysis: Addon Master V2 Full CRUD Upgrade

**Code Reality:** NONE — all 5 gaps unimplemented  
**Conflict Pre-Check:** CLEAR — BUG-147/BUG-288 are at Gate 6 (no code changes), CR-140/141 already IMPLEMENTED and not re-touching addon path  
**Gate:** 2 ✅  
**Date:** 2026-08-14  
**Risk:** HIGH (touches menu write path + transform + service)  

---

## OD Defaults Adopted (proceeding with reasonable defaults)

| OD | Question | Default |
|---|---|---|
| OQ-1 | Addon panel location | **A** — New button in MenuManagementPanel header (same panel, separate view mode) |
| OQ-2 | Addon edit pattern | **A** — Inline row edit (BulkEditor pattern, consistent UX) |
| OQ-3 | Register SQL error | **YES** — Backend brief already filed at `backend_briefs/BACKEND_BRIEF_BUG-ADDON-SQL_2026_08_14.md` |

---

## 1. Data Flow Trace

### 1A. Current broken path (all 4 code gaps)
```
GET /addon-list
  → fromAPI.addonList(): maps only {id, name, price}
  BREAK: weight/veg/status/has_inventory/recipe_id/has_recipe/is_pushed_managed all DROPPED
  → ProductForm checkbox: shows only name + price (no veg dot, no weight, no status)
  → Quick-create: addAddon(name, price) sends {name, price} only
  BREAK: weight/veg/status/has_inventory never sent
  → updateAddon(id, name, price): POST /addon-update/{id} {name, price}
  BREAK: Should be PUT, sends only name+price
  → No status toggle exists
  BREAK: POST /status-change/{id} never called
```

### 1B. Required flow after CR-142
```
GET /addon-list
  → fromAPI.addonList(): maps all 9 fields including weight/veg/status/has_inventory/has_recipe
  → ProductForm checkbox: shows veg dot + weight badge + inactive dimming + inventory badge
  → Quick-create: addAddon({name,price,veg}) sends {name, price, weight:0, veg, status:1, has_inventory:"No"}
  → updateAddon(id, payload): PUT /addon-update/{id} {name, price, weight, veg, status, has_inventory}
  → toggleAddonStatus(id, status): POST /status-change/{id} {status: 0|1}
  → AddonManagementPanel: full CRUD (inline row edit + delete + status toggle)
```

---

## 2. Exact Edit Points

### E1 — `api/transforms/menuManagementTransform.js` L214-222

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
addonList: (data) => {
  const addons = data.addons || data.data || data || [];
  if (!Array.isArray(addons)) return [];
  return addons.map((a) => ({
    id:              a.id,
    name:            a.name,
    price:           parseFloat(a.price) || 0,
    // CR-142 GAP-A: V2 new fields
    status:          a.status ?? 1,
    weight:          a.weight || 0,
    veg:             a.veg ?? null,          // 1=Veg 2=NonVeg 3=Egg 4=Other null=unset
    hasInventory:    a.has_inventory === 'Yes',
    recipeId:        a.recipe_id || null,
    hasRecipe:       a.has_recipe === true,
    isPushedManaged: a.is_pushed_managed === true,
  }));
},
```

**Risk:** LOW — additive. Existing consumers only use `id/name/price` — new fields ignored until code uses them.

---

### E2 — `api/services/menuManagementService.js` L148-163

**Current (L153-162):**
```js
export const addAddon = (name, price) =>
  api.post(`${BASE_V2}/add-addon`, { name, price: Number(price) });

export const updateAddon = (addonId, name, price) =>
  api.post(`${BASE_V2}/addon-update/${addonId}`, { name, price: Number(price) });

export const deleteAddon = (addonId) =>
  api.delete(`${BASE_V2}/delete-addon/${addonId}`, {...});
```

**Replace with:**
```js
/** CR-142 GAP-B: Add addon — V2 full payload */
export const addAddon = ({ name, price, weight = 0, veg = 1, status = 1, has_inventory = 'No' }) =>
  api.post(`${BASE_V2}/add-addon`, { name, price: Number(price), weight, veg, status, has_inventory }); // CR-142

/** CR-142 GAP-C: Update addon — V2: PUT method + full payload */
export const updateAddon = (addonId, { name, price, weight, veg, status, has_inventory }) =>
  api.put(`${BASE_V2}/addon-update/${addonId}`, { // CR-142: POST → PUT
    name, price: Number(price),
    ...(weight !== undefined ? { weight } : {}),
    ...(veg    !== undefined ? { veg }   : {}),
    ...(status !== undefined ? { status } : {}),
    ...(has_inventory !== undefined ? { has_inventory } : {}),
  });

/** CR-142 GAP-D: Toggle addon catalog status (active/inactive) */
export const toggleAddonStatus = (addonId, status) =>
  api.post(`${BASE_V2}/status-change/${addonId}`, { status }); // CR-142

/** API #20 — Delete addon (unchanged) */
export const deleteAddon = (addonId) =>
  api.delete(`${BASE_V2}/delete-addon/${addonId}`, {...});
```

**Breaking change on `addAddon`:** signature changes from `(name, price)` to `(payload)`.  
**Callers to update:**
- `ProductForm.jsx` L488: `addAddon(name, price)` → `addAddon({ name, price, veg })`  
- Any other callers? Search confirms only ProductForm uses this.

**Breaking change on `updateAddon`:** adds params.  
**Callers:** None currently (no edit UI exists).

---

### E3 — `components/panels/menu/ProductForm.jsx` — 2 sub-edits

#### E3a — Addon checkbox row (L460-470): add veg dot + weight + inactive dimming

**Current (L463-470):**
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
  style={{ opacity: a.status === 0 ? 0.45 : 1 }}  // CR-142: dim inactive
>
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
  {a.weight > 0 && <span className="text-xs px-1 rounded" style={{ background:'#f1f5f9', color:'#64748b' }}>{a.weight}g</span>}
  {a.hasInventory && <span className="text-xs px-1 rounded" style={{ background:'#eff6ff', color:'#3b82f6' }}>INV</span>}
  <span className="text-xs" style={{ color: COLORS.grayText }}>{currencySymbol}{a.price}</span>
</label>
```

#### E3b — Quick-create (L478-491): update addAddon call + add veg select

**Add veg select before price input, update addAddon call:**
```jsx
// Add veg state at component level:
const [newAddonVeg, setNewAddonVeg] = useState(1);

// In quick-create JSX, add veg select:
<select value={newAddonVeg} onChange={e => setNewAddonVeg(Number(e.target.value))}
  className="px-2 py-1.5 text-xs rounded border outline-none"
  style={{ borderColor: COLORS.borderGray, width: 70 }}>
  <option value={1}>Veg</option>
  <option value={2}>Non-V</option>
  <option value={3}>Egg</option>
</select>

// Update addAddon call (L488):
await menuService.addAddon({ name: newAddonName.trim(), price: newAddonPrice, veg: newAddonVeg });
```

---

### E4 — `components/panels/MenuManagementPanel.jsx` — add Manage Add-ons view mode

#### E4a — State (after `bulkEditMode` state L22)
```js
const [addonPanelMode, setAddonPanelMode] = useState(false); // CR-142
```

#### E4b — Header toolbar (after bulk-edit button, L177-188)
```jsx
{/* CR-142: Manage Add-ons button */}
<button
  data-testid="manage-addons-btn"
  onClick={() => setAddonPanelMode(v => !v)}
  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors"
  style={{
    borderColor: addonPanelMode ? COLORS.primaryGreen : COLORS.borderGray,
    color: addonPanelMode ? COLORS.primaryGreen : COLORS.grayText,
    backgroundColor: addonPanelMode ? '#F0FDF4' : 'transparent',
  }}
>
  <Settings className="w-4 h-4" /> Add-ons
</button>
```

#### E4c — Content area: add addon panel branch
```jsx
{addonPanelMode ? (
  <div className="flex-1 overflow-hidden">
    <AddonManagementPanel
      addons={addons}
      currencySymbol={currencySymbol}
      onRefresh={fetchAddons}
      onClose={() => setAddonPanelMode(false)}
    />
  </div>
) : bulkEditMode ? (
  <BulkEditor ... />
) : (
  // existing card view ...
)}
```

---

### E5 — NEW `components/panels/menu/AddonManagementPanel.jsx`

Full CRUD panel. Props: `{ addons, currencySymbol, onRefresh, onClose }`  
~200 lines. Inline row editing.

Layout:
```
[+ Add Addon]  [Search...]

┌───────┬───────────────┬──────┬────────┬──────┬────────┬──────────┐
│ Type  │ Name          │ Price│ Weight │ Stock│ Inventory│ Actions  │
├───────┼───────────────┼──────┼────────┼──────┼────────┼──────────┤
│ ● Veg │ Extra Cheese  │ ₹40  │   50g  │  On  │    No    │ Edit Del  │
│ ● N-V │ Garlic Sauce  │ ₹25  │    0g  │  On  │    No    │ Edit Del  │
└───────┴───────────────┴──────┴────────┴──────┴────────┴──────────┘

[Edit row expands inline]:
  Name: [Extra Cheese__] Price: [45] Weight: [50] Veg: [Veg▾] [Save] [Cancel]
```

**Inventory toggle rule (must enforce):**
- `has_recipe: false` → inventory toggle **disabled** with tooltip "Attach a recipe first"
- `has_recipe: true` → inventory toggle enabled

---

## 3. Downstream Consumers (no changes needed)

| Consumer | Why Not Affected |
|---|---|
| `ItemCustomizationModal.jsx` | Uses addons for ordering display only — reads `a.name/price`. Additive fields ignored. |
| `orderTransform.js` | addon_ids sent as array of ints. No field-level change. |
| `RecipeFormPanel.jsx` | Uses addon-list for recipe dropdown, reads `id/name`. New fields ignored. |
| `BulkEditor.jsx` | Addons in payload as `addon_ids[]` only. |

---

## 4. Risk Register

| Risk | Level | Mitigation |
|------|-------|------------|
| `addAddon()` signature change breaks ProductForm | HIGH | Update L488 in same PR |
| `updateAddon()` no callers yet — safe | LOW | — |
| `toggleAddonStatus` — new, isolated | LOW | — |
| AddonManagementPanel — new file, no existing deps | LOW | — |
| Inventory toggle rule — UI must enforce `has_recipe` gate | MEDIUM | Disable toggle in panel UI |

---

## 5. Verification Matrix (seeds QA)

| # | Edit | File | Verification | Method |
|---|------|------|-------------|--------|
| V1 | E1 | menuManagementTransform.js | addonList maps weight/veg/status/has_inventory/has_recipe | grep/unit test |
| V2 | E2 | menuManagementService.js | addAddon() sends PUT with all fields | Network tab |
| V3 | E2 | menuManagementService.js | updateAddon() uses PUT not POST | Network tab |
| V4 | E2 | menuManagementService.js | toggleAddonStatus() fires POST /status-change/{id} | Network tab |
| V5 | E3a | ProductForm.jsx | Veg dot visible on addon checkboxes | Browser |
| V6 | E3a | ProductForm.jsx | Weight badge visible when weight > 0 | Browser |
| V7 | E3a | ProductForm.jsx | Inactive addon dimmed (opacity 0.45) | Browser |
| V8 | E3b | ProductForm.jsx | Veg select in quick-create | Browser |
| V9 | E4 | MenuManagementPanel.jsx | "Add-ons" button visible in header | Browser |
| V10 | E4 | MenuManagementPanel.jsx | Clicking opens AddonManagementPanel | Browser |
| V11 | E5 | AddonManagementPanel.jsx | Full list with Type/Name/Price/Weight/Stock/Inventory | Browser |
| V12 | E5 | AddonManagementPanel.jsx | Edit row expands inline | Browser |
| V13 | E5 | AddonManagementPanel.jsx | Inventory toggle disabled when has_recipe=false | Browser |
| V14 | E5 | AddonManagementPanel.jsx | Status toggle fires POST /status-change/{id} | Network tab |
| V15 | Regression | ProductForm.jsx | Normal food add/edit unaffected | Browser |

---

## 6. Post-Code Registry Checklist
```
- [ ] registry.json: CR-142 → IMPLEMENTED, pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: +5 files
- [ ] Code markers: // CR-142 in every modified file
```

**Code Reality:** NONE  
**Conflict:** CLEAR  
**Risk:** HIGH  
**ODs resolved:** OQ-1=A, OQ-2=A, OQ-3=filed  
**Owner decisions still needed at Gate 4:** none (ODs adopted)
