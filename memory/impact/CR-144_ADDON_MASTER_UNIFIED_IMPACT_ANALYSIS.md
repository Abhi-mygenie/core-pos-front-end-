# CR-144 — Impact Analysis: Addon Master Unified in Menu Management Panel (All Menu Types)

**Code Reality:** NONE — `AddonManagementPanel.jsx` does not exist; `addonPanelMode` state does not exist in `MenuManagementPanel.jsx`
**Conflict Pre-Check:** OVERLAPS CR-142 — E1 and E2 are IDENTICAL to CR-142 E1/E2. CR-142 is at Gate 2 (not implemented). **Must batch CR-142 + CR-144 together in one implementation.**
**Gate:** 2 ✅
**Date:** 2026-08-15
**Risk:** MEDIUM (component state + new panel + service signature change; no financial logic; no hotspot files)
**Design Approved:** 2026-08-15 — confirmed via `/cr144-design.html`. All layout, column order, veg dots, inactive opacity, inventory gate, and button placement locked.

---

## OD Defaults Adopted

| OD | Question | Default | Rationale |
|---|---|---|---|
| OQ-1 | Menu type dropdown hidden/disabled when in Addon Master view? | **Keep visible but do nothing** — addons are restaurant-wide; changing menuType while in addon view has no effect, so no action needed | Low UX risk; simpler than adding a disabled state |
| OQ-2 | "Add-ons" button show item count badge? | **NO badge** — badge adds lifecycle complexity (re-fetch on add/delete); plain label is clean | Can be added later if owner wants it |

---

## 1. Data Flow Trace

### 1A. Current State
```
MenuManagementPanel mounts
  → fetchAddons() → GET /product/addon-list
  → fromAPI.addonList(data): maps { id, name, price } ONLY
  → setAddons([])
  → addons passed to BulkEditor only (no CRUD panel)

No "Manage Add-ons" UI exists anywhere.
addAddon(name, price) → POST (2 fields only)
updateAddon(addonId, name, price) → POST (wrong verb, 2 fields)
No toggleAddonStatus() exists.
```

### 1B. Required Flow After CR-144 (+ CR-142 E1/E2)
```
MenuManagementPanel mounts
  → fetchAddons() → GET /product/addon-list
  → fromAPI.addonList(): maps 9 fields including weight/veg/status/hasInventory/hasRecipe
  → setAddons([...9-field objects])

Header toolbar always shows: [Bulk Edit] [Add-ons] (regardless of menuType)
  → User clicks "Add-ons" → setAddonPanelMode(true)
  → AddonManagementPanel renders with full CRUD:
      List → inline edit → PUT /product/addon-update/{id}
      Status toggle → POST /product/status-change/{id}
      Delete → DELETE /product/delete-addon/{id}
      Add new → POST /product/add-addon (full payload)
```

---

## 2. Exact Edit Points

### E1 — `api/transforms/menuManagementTransform.js` (SHARED WITH CR-142 E1)

**Current `addonList()` (approx. L214-222):**
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
    // CR-142/CR-144: V2 full fields
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

**Risk:** LOW — additive. Existing consumers only use id/name/price; new fields ignored until used.

---

### E2 — `api/services/menuManagementService.js` (SHARED WITH CR-142 E2)

**Current (approx. L153-162):**
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
/** CR-142/CR-144: Add addon — V2 full payload */
export const addAddon = ({ name, price, weight = 0, veg = 1, status = 1, has_inventory = 'No' }) =>
  api.post(`${BASE_V2}/add-addon`, { name, price: Number(price), weight, veg, status, has_inventory });

/** CR-142/CR-144: Update addon — PUT (R25: Laravel uses PUT for updates) */
export const updateAddon = (addonId, { name, price, weight, veg, status, has_inventory }) =>
  api.put(`${BASE_V2}/addon-update/${addonId}`, {
    name, price: Number(price),
    ...(weight !== undefined ? { weight } : {}),
    ...(veg    !== undefined ? { veg }   : {}),
    ...(status !== undefined ? { status } : {}),
    ...(has_inventory !== undefined ? { has_inventory } : {}),
  });

/** CR-142/CR-144: Toggle addon catalog status */
export const toggleAddonStatus = (addonId, status) =>
  api.post(`${BASE_V2}/status-change/${addonId}`, { status });

/** API #20 — Delete addon (unchanged) */
export const deleteAddon = (addonId) =>
  api.delete(`${BASE_V2}/delete-addon/${addonId}`, {...});
```

**Breaking change:** `addAddon` signature changes from `(name, price)` to `(payload)`.
**Callers to update:** `ProductForm.jsx` L488 — `addAddon(name, price)` → `addAddon({ name, price, veg })` (CR-142 E3b handles this).

**R25 compliance:** `updateAddon` uses `api.put()` — confirmed by INV-ADDON-SCOPE Probe 11b (PUT → "Addon updated successfully"; POST → empty/404).

---

### E3 — `components/panels/MenuManagementPanel.jsx`

#### E3a — Add state (after `bulkEditMode` state, approx. L22):
```js
const [addonPanelMode, setAddonPanelMode] = useState(false); // CR-144
```

#### E3b — Add import (top of file):
```js
import AddonManagementPanel from './menu/AddonManagementPanel'; // CR-144
```

#### E3c — Header toolbar (after Bulk Edit button, approx. L184-188):
```jsx
{/* CR-144: Manage Add-ons button — always visible regardless of menuType */}
<button
  data-testid="manage-addons-btn"
  onClick={() => { setAddonPanelMode(v => !v); if (bulkEditMode) setBulkEditMode(false); }}
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

**Note:** Import `Settings` from `lucide-react` (check if already imported; if not, add).
**Design confirmed:** Button sits between the menu-type dropdown and the existing Bulk Edit button. No "NEW" badge needed — keep label clean.

#### E3d — Content area: add addon panel branch (before `bulkEditMode ? ... : ...`):
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
  // existing card view
)}
```

**Key rule (CR-144 scope):** The `addonPanelMode` button and branch have **NO `menuType` guard** — visible and active for Normal, Party, Premium, Aggregator equally. This is the critical distinction of CR-144 vs CR-142 E4 which might add a guard by accident.

**Risk:** LOW — additive state + button + conditional branch. BulkEditor and card view unaffected.

---

### E4 — NEW `components/panels/menu/AddonManagementPanel.jsx`

**Props:** `{ addons, currencySymbol, onRefresh, onClose }`
**~200 lines**

**Design approved (2026-08-15 via `/cr144-design.html`):**

```
Toolbar:
  [+ Add Addon]   [Search add-ons...]                         6 add-ons

Table columns (exact order confirmed):
  TYPE  | NAME             | PRICE | WEIGHT | STOCK     | INVENTORY | ACTIONS
  ──────┼──────────────────┼───────┼────────┼───────────┼───────────┼─────────────
  ●Veg  | Extra Cheese     | ₹40   |  50g   | ● Active  |   No      | [Edit] [Del]
  ●N-V  | Garlic Sauce     | ₹25   |   0g   | ● Active  |   Yes     | [Edit] [Del]
  ●Egg  | Butter Naan      | ₹35   |   0g   | ● Active  |   No      | [Edit] [Del]
  ○grey | Dark Choco       | ₹10   |   0g   | ○ Inactive|   No      | [Edit] [Del]
        ↑ 50% opacity on inactive row

Edit row expands inline (click Edit button):
  Name:[Extra Cheese____] ₹[45] Weight:[55]g  Veg:[Veg▾]
  Inventory toggle — DISABLED if has_recipe=false, tooltip "Attach a recipe first"
                   — ENABLED  if has_recipe=true
  [Save]  [Cancel]

Add form at top of table (click "+ Add Addon"):
  Name:[_______] ₹[__] Weight:[__]g  Veg:[Veg▾]
  [Save]  [Cancel]
```

**Veg dot colours (confirmed from design):**
- `veg === 1` → `#22c55e` (green)
- `veg === 2` → `#EF4444` (red)
- `veg === 3` → `#F59E0B` (amber)
- `veg === null` / unset → `#D1D5DB` (grey)

**Inactive row:** `opacity: 0.50` on the entire `<tr>` — name also shows `(inactive)` suffix in grey

**Delete:** confirm dialog before calling `deleteAddon(id)` + `onRefresh()`

**Business rules enforced:**
- Inventory toggle disabled when `a.hasRecipe === false` — tooltip: "Attach a recipe first"
- All mutations call `onRefresh()` after success to resync parent `addons[]` state

**State inside panel:**
```js
const [editingId, setEditingId]   = useState(null);
const [editForm, setEditForm]     = useState({});
const [addForm, setAddForm]       = useState({ name:'', price:'', weight:0, veg:1 });
const [addMode, setAddMode]       = useState(false);
const [saving, setSaving]         = useState(false);
const [search, setSearch]         = useState('');
const [confirmDeleteId, setConfirmDeleteId] = useState(null);
```

**Service calls used:**
- `menuService.addAddon(payload)` → POST /add-addon
- `menuService.updateAddon(id, payload)` → PUT /addon-update/{id} (R25 confirmed)
- `menuService.toggleAddonStatus(id, status)` → POST /status-change/{id}
- `menuService.deleteAddon(id)` → DELETE /delete-addon/{id}
- `onRefresh()` called after every mutation

**Risk:** LOW — new file, no existing deps.

---

## 3. Downstream Consumers (no changes needed)

| Consumer | Why Not Affected |
|---|---|
| `ProductForm.jsx` addon checkbox row | CR-142 E3a handles this — opacity + veg dot additions (CR-142's scope) |
| `ProductForm.jsx` quick-create | CR-142 E3b handles this — `addAddon` caller update (CR-142's scope) |
| `ItemCustomizationModal.jsx` | Uses addons for ordering only — reads id/name/price. Additive fields ignored. |
| `BulkEditor.jsx` | Addons in payload as `addon_ids[]` only — not affected by this CR |
| `OrderEntry.jsx` | No connection to addon management |

---

## 4. Conflict Map

| File | Other Item | Status | Resolution |
|---|---|---|---|
| `menuManagementTransform.js` (E1) | CR-142 E1 | GATE 2, not implemented | **BATCH: implement E1 once for both CRs** |
| `menuManagementService.js` (E2) | CR-142 E2 | GATE 2, not implemented | **BATCH: implement E2 once for both CRs** |
| `MenuManagementPanel.jsx` (E3) | CR-142 E4 | GATE 2, not implemented | Overlapping but additive — CR-144 adds no-menuType-guard rule |
| `AddonManagementPanel.jsx` (E4) | CR-142 E5 | GATE 2, not implemented | Identical file — **implement once** |

**Recommendation:** Implement CR-142 + CR-144 together as a single batch. The combined scope is:
- E1 (transform) — once
- E2 (service) — once
- E3 (ProductForm addon row + quick-create) — CR-142's E3 only
- E4 (MenuManagementPanel button + panel branch) — CR-144's E3 (adds no-menuType-guard rule)
- E5 (AddonManagementPanel) — once (new file)

---

## 5. Risk Register

| Risk | Level | Mitigation |
|---|---|---|
| `addAddon()` signature change breaks ProductForm | HIGH | CR-142 E3b must update L488 in same batch |
| `updateAddon()` POST→PUT wrong verb | HIGH (R25) | E2 explicitly uses `api.put()` |
| `addonPanelMode` button without menuType guard | LOW | Intentional per CR-144 — document clearly in code comment |
| Settings icon not imported in MenuManagementPanel | LOW | Check imports before coding |

---

## 6. Verification Matrix

| # | Edit | File | Verification | Method |
|---|------|------|-------------|--------|
| V1 | E1 | menuManagementTransform.js | addonList maps 9 fields (weight/veg/status/hasInventory/hasRecipe) | grep/code review |
| V2 | E2 | menuManagementService.js | addAddon() accepts object payload | code review |
| V3 | E2 | menuManagementService.js | updateAddon() uses api.put() (not api.post) | grep for api.put |
| V4 | E2 | menuManagementService.js | toggleAddonStatus() exists | grep |
| V5 | E3 | MenuManagementPanel.jsx | "Add-ons" button visible in header for Normal menu type | Browser |
| V6 | E3 | MenuManagementPanel.jsx | "Add-ons" button visible in header for Aggregator menu type | Browser |
| V7 | E3 | MenuManagementPanel.jsx | Clicking "Add-ons" hides BulkEditor/card view and shows AddonManagementPanel | Browser |
| V8 | E3 | MenuManagementPanel.jsx | Clicking "Add-ons" again (toggle) closes the addon panel | Browser |
| V9 | E4 | AddonManagementPanel.jsx | Full addon list renders with Type/Name/Price/Weight/Stock/Inventory | Browser |
| V10 | E4 | AddonManagementPanel.jsx | Edit row expands inline | Browser |
| V11 | E4 | AddonManagementPanel.jsx | Inventory toggle disabled when has_recipe=false | Browser |
| V12 | E4 | AddonManagementPanel.jsx | Status toggle fires POST /status-change/{id} | Network tab |
| V13 | E4 | AddonManagementPanel.jsx | Update fires PUT /addon-update/{id} | Network tab |
| V14 | E4 | AddonManagementPanel.jsx | Delete fires DELETE /delete-addon/{id} with confirm | Network tab |
| V15 | Regression | ProductForm.jsx | Normal food add/edit unaffected | Browser |
| V16 | Regression | BulkEditor.jsx | Bulk edit unaffected | Browser |

---

## 7. Post-Code Registry Checklist
```
- [ ] registry.json: CR-144 → IMPLEMENTED, pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: +3 files (MenuManagementPanel.jsx, menuManagementTransform.js, menuManagementService.js) + 1 new (AddonManagementPanel.jsx)
- [ ] Code markers: // CR-144 in every modified file (note: E1+E2 shared with CR-142 — mark // CR-142/CR-144)
```

---

**Code Reality:** NONE
**Conflict:** OVERLAPS CR-142 (E1+E2 shared) — batch together
**Risk:** MEDIUM
**ODs resolved:** OQ-1=keep visible, OQ-2=no badge
**Owner decisions at Gate 4:** NONE — all defaults adopted
**Scope lock:**
- Files WILL change: `menuManagementTransform.js`, `menuManagementService.js`, `MenuManagementPanel.jsx`
- Files WILL be created: `AddonManagementPanel.jsx`
- Files WILL NOT touch: `ProductForm.jsx` (CR-142 scope), `BulkEditor.jsx`, all R5 hotspots
