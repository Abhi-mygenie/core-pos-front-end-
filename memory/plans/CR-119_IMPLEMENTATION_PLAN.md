# CR-119 — Gate 3 Implementation Plan

**ID:** CR-119
**Title:** Aggregator Food → Recipe Mapping (Aggregator Inventory Tab)
**Date:** 2026-08-01
**Written by:** PLANNING AGENT
**Risk:** MEDIUM
**Gate:** 3 — Implementation Plan (awaiting Gate 4 GO)

**Source docs:**
- Intake: `/app/memory/change_requests/CR-119_AGGREGATOR_FOOD_MAPPING_INTAKE.md`
- Impact Analysis: `/app/memory/impact/CR-119_IMPACT_ANALYSIS.md`
- API Spec: `agg_recipe_mapping.md` (owner-provided)
- Design: `/app/design_guidelines.json`
- Mockup: `https://pos-react-deploy-6.preview.emergentagent.com/cr119-mockup.html`

---

## 0. Starting State Verification

Each edit below was verified against the live file on 2026-08-01.

| File | Verified at line(s) | Reality |
|---|---|---|
| `constants.js` | L204-230 — `RECIPE_ENDPOINTS` block ends at L230 with `};` | ✅ MATCHES |
| `recipeService.js` | L1-4 — imports `api`, `RECIPE_ENDPOINTS`, transforms. 98 lines total | ✅ MATCHES |
| `RecipeManagementPanel.jsx` | L494-498 — 4th tab "By Ingredient". L479 — `<Tabs>` opens. L595 — `</Tabs>`. 599 lines total | ✅ MATCHES |
| `AggregatorInventoryTab.jsx` | Does not exist | ✅ MATCHES (Code Reality: NONE) |

---

## 1. Scope Lock

**Files WILL change:**
1. `src/api/constants.js` — +1 new endpoint block (~10 lines)
2. `src/api/services/recipeService.js` — +6 new export functions (~50 lines)
3. `src/components/inventory/RecipeManagementPanel.jsx` — +1 import, +1 TabsTrigger, +1 conditional render
4. `src/components/inventory/AggregatorInventoryTab.jsx` — **NEW** (~350 lines)

**Files will NOT touch:**
- `App.js` (no new route — tab within /recipes)
- `Sidebar.jsx` (no new nav item)
- `aggregatorTransform.js` (live orders, not config)
- `aggregatorService.js` (live order actions)
- `recipeTransform.js` (standard recipe transforms)
- `RecipeFormPanel.jsx`, `RecipeBulkEditor.jsx` (existing recipe editors)
- Any test files

---

## 2. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `clients: 0` (number, not array) when no brands | CONFIRMED | Guard: `Array.isArray(data.clients) ? data.clients : []` |
| Combobox z-index cut off by table overflow | MEDIUM | Popover `side="bottom"` + `sideOffset={4}` + `className="z-50"` |
| 100 recipes in combobox — perf concern | LOW | Command component uses virtual list pattern; search filters reduce render count |
| Batch save partial failure (some items fail) | LOW | Read `success_count`/`failed_count` from response; show in toast |
| Export returns binary, not JSON | EXPECTED | Use `window.open()` or `api.get(..., { responseType: 'blob' })` + download anchor |

---

## 3. Execution Sequence

```
Edit 1 → constants.js       (add endpoint constants — no runtime effect alone)
Edit 2 → recipeService.js   (add service functions — consumed by new component)
Edit 3 → AggregatorInventoryTab.jsx  (NEW component — not rendered until Edit 4)
Edit 4 → RecipeManagementPanel.jsx   (import + tab + render — activates the feature)
```

Hot-reload handles each edit. No supervisor restart needed.

---

## 4. Edit-by-Edit Detail

---

### Edit 1 — `src/api/constants.js`

**Change:** Add `RECIPE_MAPPING_ENDPOINTS` block after `RECIPE_ENDPOINTS` (after L230). +10 lines.

**Insert after line 230 (`};` closing RECIPE_ENDPOINTS):**

```js
// CR-119: Aggregator Food → Recipe Mapping
export const RECIPE_MAPPING_ENDPOINTS = {
  RESTAURANT_CLIENTS: '/api/v2/vendoremployee/product/restaurant-clients',
  FOOD_RECIPE_MAPPING: '/api/v2/vendoremployee/recipe/food-recipe-mapping',
  UPDATE_RECIPE_MAPPING: '/api/v2/vendoremployee/recipe/update-recipe-mapping',
  UNLINK_RECIPE_MAPPING: '/api/v2/vendoremployee/recipe/unlink-recipe-mapping',
  BATCH_RECIPE_MAPPING: '/api/v2/vendoremployee/recipe/update-recipe-mapping-batch',
  EXPORT_RECIPE_MAPPING: '/api/v2/vendoremployee/recipe/export-recipe-mapping',
};
```

**Location:** After RECIPE_ENDPOINTS `};` on L230, before the `// STATUS MAPPINGS` section on L232.

---

### Edit 2 — `src/api/services/recipeService.js`

**Change:** Add 6 new export functions at the bottom of the file. Import `RECIPE_MAPPING_ENDPOINTS` in the existing import line (L3). +50 lines.

**Modify import (L3):**
```js
// Current:
import { RECIPE_ENDPOINTS } from '../constants';
// New:
import { RECIPE_ENDPOINTS, RECIPE_MAPPING_ENDPOINTS } from '../constants';
```

**Append after last function (after L98):**

```js
// ── CR-119: Aggregator Food → Recipe Mapping ─────────────────────
export async function getRestaurantClients() {
  const res = await api.get(RECIPE_MAPPING_ENDPOINTS.RESTAURANT_CLIENTS);
  const data = res.data;
  return {
    clientsFound: data.clients_found,
    clients: Array.isArray(data.clients) ? data.clients : [],
  };
}

export async function getFoodRecipeMapping(clientId = 0) {
  const res = await api.get(RECIPE_MAPPING_ENDPOINTS.FOOD_RECIPE_MAPPING, {
    params: { client: clientId },
  });
  const data = res.data;
  return {
    recipes: data.recipes || [],
    foods: (data.aggregator_foods || []).map(f => ({
      id: f.id,
      foodName: f.food_name,
      recipeId: f.recipe_id,
      recipeName: f.recipe_name,
    })),
    stats: data.stats || {},
    clients: Array.isArray(data.clients) ? data.clients : [],
  };
}

export async function updateRecipeMapping({ itemId, recipeId, clientId = 0 }) {
  const res = await api.post(RECIPE_MAPPING_ENDPOINTS.UPDATE_RECIPE_MAPPING, {
    type: 'aggregator',
    item_id: itemId,
    recipe_id: recipeId,
    client_id: clientId,
  });
  return res.data;
}

export async function unlinkRecipeMapping({ itemId, clientId = 0 }) {
  const res = await api.post(RECIPE_MAPPING_ENDPOINTS.UNLINK_RECIPE_MAPPING, {
    type: 'aggregator',
    item_id: itemId,
    client_id: clientId,
  });
  return res.data;
}

export async function batchUpdateRecipeMapping({ updates, clientId = 0 }) {
  const res = await api.post(RECIPE_MAPPING_ENDPOINTS.BATCH_RECIPE_MAPPING, {
    client_id: clientId,
    updates: updates.map(u => ({
      type: 'aggregator',
      item_id: u.itemId,
      recipe_id: u.recipeId,
    })),
  });
  return res.data;
}

export async function exportRecipeMapping() {
  const res = await api.get(RECIPE_MAPPING_ENDPOINTS.EXPORT_RECIPE_MAPPING, {
    params: { type: 'aggregator' },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'aggregator_recipe_mapping.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
```

---

### Edit 3 — `src/components/inventory/AggregatorInventoryTab.jsx` (NEW FILE)

**Change:** Create new component. ~350 lines.

**Component structure:**
```
AggregatorInventoryTab
├── State: foods, recipes, clients, stats, loading, search, selectedClient, pendingChanges
├── useEffect: fetch clients on mount → fetch mapping on client change
├── Brand/Client Select (if clients exist)
├── Stats Bar (3 cards: total / mapped / unmapped)
├── Filters Row (search input + export btn + save all btn)
└── Data Table
    └── Per row: food name | status badge | RecipeCombobox | unlink button
        └── RecipeCombobox (inline sub-component)
            ├── Popover + Command (shadcn)
            ├── CommandInput for search typeahead
            └── CommandList → CommandItems (filtered recipes)
```

**Key implementation details:**
- Uses `useState` for `pendingChanges` map (`foodId → recipeId`) to track dirty rows
- "Save All" sends `batchUpdateRecipeMapping` with all pending changes
- Unlink calls `unlinkRecipeMapping` immediately (single item, no batch)
- RecipeCombobox uses shadcn `Popover` + `Command` pattern with `CommandInput` for auto-search
- Unmapped rows get amber border on combobox trigger; mapped rows get default border
- Search filters `foods` by `foodName` (client-side filter)
- Export calls `exportRecipeMapping` → blob download
- All interactive elements have `data-testid` attributes

**data-testid inventory:**
- `aggregator-inventory-tab` — root container
- `aggregator-client-select` — brand dropdown
- `aggregator-stats-total` / `aggregator-stats-mapped` / `aggregator-stats-unmapped` — stat cards
- `aggregator-food-search` — search input
- `aggregator-export-btn` — export button
- `aggregator-save-btn` — batch save button
- `aggregator-food-row-{foodId}` — each table row
- `aggregator-recipe-combobox-{foodId}` — recipe combobox trigger per row
- `aggregator-unlink-btn-{foodId}` — unlink button per row

---

### Edit 4 — `src/components/inventory/RecipeManagementPanel.jsx`

**Change A — Add import (near L16, after existing component imports):**
```js
import AggregatorInventoryTab from './AggregatorInventoryTab'; // CR-119
```

**Change B — Add 5th TabsTrigger (after L498, after "By Ingredient" trigger, before `</TabsList>`):**
```jsx
{/* CR-119: 5th tab — Aggregator Food → Recipe Mapping */}
<TabsTrigger value="aggregator-inventory" data-testid="recipe-tab-aggregator-trigger"
  className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 data-[state=active]:shadow-none px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700">
  Aggregator Inventory
</TabsTrigger>
```

**Change C — Add conditional render for aggregator tab (L546, in the activeTab render logic):**

Currently L546 reads: `{activeTab === 'by-ingredient' ? (`

Change to: `{activeTab === 'aggregator-inventory' ? (<AggregatorInventoryTab />) : activeTab === 'by-ingredient' ? (`

**Change D — Hide Create/Sort/ViewToggle for aggregator tab (update conditionals):**

Currently lines 505, 514, 530 hide controls for `by-ingredient`. Update each to also hide for `aggregator-inventory`:

```js
// L505: {activeTab !== 'by-ingredient' && (
// →
{activeTab !== 'by-ingredient' && activeTab !== 'aggregator-inventory' && (

// L514: {activeTab !== 'by-ingredient' && (
// →
{activeTab !== 'by-ingredient' && activeTab !== 'aggregator-inventory' && (

// L530: {activeTab !== 'by-ingredient' && (
// →
{activeTab !== 'by-ingredient' && activeTab !== 'aggregator-inventory' && (
```

---

## 5. Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `constants.js` | `RECIPE_MAPPING_ENDPOINTS` block added | `grep -n "RECIPE_MAPPING_ENDPOINTS" src/api/constants.js` → 6 endpoints | YES (grep) |
| 2 | `recipeService.js:L3` | Import includes `RECIPE_MAPPING_ENDPOINTS` | `grep "RECIPE_MAPPING_ENDPOINTS" src/api/services/recipeService.js` | YES (grep) |
| 2 | `recipeService.js` | 6 new functions exported | `grep -c "export async function" src/api/services/recipeService.js` → was 15, now 21 | YES (grep) |
| 3 | `AggregatorInventoryTab.jsx` | File exists, exports component | `ls src/components/inventory/AggregatorInventoryTab.jsx` | YES |
| 3 | `AggregatorInventoryTab.jsx` | Has CR-119 code marker | `grep "CR-119" src/components/inventory/AggregatorInventoryTab.jsx` | YES (grep) |
| 3 | `AggregatorInventoryTab.jsx` | Has required data-testids | `grep "data-testid" src/components/inventory/AggregatorInventoryTab.jsx \| wc -l` → ≥9 | YES (grep) |
| 4 | `RecipeManagementPanel.jsx` | Import added | `grep "AggregatorInventoryTab" src/components/inventory/RecipeManagementPanel.jsx` | YES (grep) |
| 4 | `RecipeManagementPanel.jsx` | 5th TabsTrigger added | `grep "aggregator-inventory" src/components/inventory/RecipeManagementPanel.jsx` | YES (grep) |
| ALL | webpack | `Compiled successfully!` — 0 new warnings from CR-119 | `tail -5 /var/log/supervisor/frontend.out.log` | YES |
| ALL | Browser | Click "Aggregator Inventory" tab → data table loads with real foods | Screenshot | NO (manual) |
| ALL | Browser | Type in recipe search box → recipes filter in real-time | Screenshot | NO (manual) |
| ALL | Browser | Click "Export" → xlsx file downloads | Browser DevTools | NO (manual) |

---

## 6. Post-Code Registry Checklist

The Implementation agent MUST execute ALL 5 checkboxes before writing QA handover:

```
□ 1. registry.json:
     CR-119 → status: "GATE 5a — IMPLEMENTED"
     sprint_key: "pos_5_0"
     completeness: "5/7"

□ 2. CR_REGISTRY.md or BUG_TRACKER.md:
     CR-119 row updated with IMPLEMENTED status

□ 3. FILE_OWNERSHIP.md:
     Add these 4 files with CR-119 + implementation date:
     - src/api/constants.js                                  (CR-119, date)
     - src/api/services/recipeService.js                     (CR-119, date)
     - src/components/inventory/RecipeManagementPanel.jsx     (CR-119, date)
     - src/components/inventory/AggregatorInventoryTab.jsx    (CR-119, date — NEW)

□ 4. Code markers:
     Every modified/created file must have at least one // CR-119 comment.

□ 5. Compile check:
     tail -5 /var/log/supervisor/frontend.out.log → "Compiled successfully"
     0 new warnings from webpack.
```

---

## 7. Net Change Summary

| File | Lines Added | Lines Removed | Net |
|---|---|---|---|
| `constants.js` | +10 | 0 | +10 |
| `recipeService.js` | +50 | −1 (import edit) | +49 |
| `AggregatorInventoryTab.jsx` | +350 | 0 (NEW) | +350 |
| `RecipeManagementPanel.jsx` | +8 | −3 (conditional edits) | +5 |
| **TOTAL** | **+418** | **−4** | **+414** |

---

## 8. Completeness Checklist

- [x] Art 1 — Intake (`change_requests/CR-119_AGGREGATOR_FOOD_MAPPING_INTAKE.md`)
- [x] Art 2 — Impact Analysis (`impact/CR-119_IMPACT_ANALYSIS.md`)
- [x] Art 3 — Implementation Plan (this doc)
- [ ] Art 4 — Gate 4 GO (owner approval)
- [ ] Art 5a — Implementation + Self-Test
- [ ] Art 5b — QA Report
- [ ] Art 7 — Owner Smoke

---

## 9. Gate 4 GO Block

```
OWNER APPROVAL REQUIRED
Reason: Implementation plan complete — Gate 4 GO required before coding begins (R4)
Risk: MEDIUM
Proposed next step: Owner reviews this plan and issues "Gate 4 GO" to authorise
                    the Implementation agent to apply the 4 edits above.
I will not proceed until owner approves.
```
