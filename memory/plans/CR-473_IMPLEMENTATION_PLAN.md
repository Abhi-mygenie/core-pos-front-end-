# CR-473 — Implementation Plan

**Item:** CR-473 — Recipe Mapping by Menu Master (food_for)
**Stage:** Gate 3 — Implementation Plan
**Code Reality:** PARTIAL (menuMaster transform exists, service hardcoded to aggregator)
**Risk:** MEDIUM
**Prerequisite:** Gate 2 Impact Analysis complete. Blocker RESOLVED. ODs 473-01/03 locked.
**Scope Lock:** Files WILL change: `constants.js`, `recipeService.js`, `AggregatorInventoryTab.jsx`, `RecipeManagementPanel.jsx`. Files WILL NOT touch: `recipeTransform.js`, `menuManagementTransform.js`, `RecipeFormPanel.jsx`, `RecipeBulkEditor.jsx`, any order-entry/dashboard/PMS/report file.

---

## Execution Sequence

**Order: E1 → E2 → E3 → E4 → compile check**

E1+E2 are backend wiring (constants + service). E3 is the main UI change (depends on E1+E2). E4 is a label rename (independent). E1+E2+E4 can be batched in parallel; E3 after.

---

## E1: constants.js — Add MENU_MASTER endpoint

**File:** `src/api/constants.js`
**Action:** Insert 1 line inside `RECIPE_MAPPING_ENDPOINTS` block, after L278
**Current L278:**
```js
  EXPORT_RECIPE_MAPPING: '/api/v2/vendoremployee/recipe/export-recipe-mapping',
```
**Insert after L278 (before closing `}`):**
```js
  MENU_MASTER: '/api/v2/vendoremployee/product/menu-master', // CR-473
```
**Lines changed:** +1
**Risk:** LOW — additive inside existing object

---

## E2: recipeService.js — Add 5 new menu-aware functions

**File:** `src/api/services/recipeService.js`
**Action:** Append 5 new functions after existing `exportRecipeMapping()` (end of file, after L170)
**Existing functions UNTOUCHED** — zero risk to CR-119 aggregator flow.

```js
// ── CR-473: Menu Master → Per-Menu Recipe Mapping ────────────────

export async function getMenuMaster() {
  const res = await api.get(RECIPE_MAPPING_ENDPOINTS.MENU_MASTER);
  return (res.data.menus || []).map(m => ({ id: m.id, name: m.menu_name }));
}

export async function getFoodRecipeMappingByMenu(foodFor) {
  const res = await api.get(RECIPE_MAPPING_ENDPOINTS.FOOD_RECIPE_MAPPING, {
    params: { food_for: foodFor },
  });
  const data = res.data;
  return {
    recipes: data.recipes || [],
    foods: (data.foods || []).map(f => ({
      id: f.id,
      foodName: f.food_name,
      recipeId: f.recipe_id,
      recipeName: f.recipe_name,
      foodFor: f.food_for,
    })),
    stats: data.stats || {},
  };
}

export async function batchUpdateRecipeMappingByMenu({ foodFor, updates }) {
  const res = await api.post(RECIPE_MAPPING_ENDPOINTS.BATCH_RECIPE_MAPPING, {
    food_for: foodFor,
    updates: updates.map(u => ({
      item_id: u.itemId,
      recipe_id: u.recipeId,
    })),
  });
  return res.data;
}

export async function unlinkRecipeMappingByMenu({ foodFor, itemId }) {
  const res = await api.post(RECIPE_MAPPING_ENDPOINTS.UNLINK_RECIPE_MAPPING, {
    food_for: foodFor,
    item_id: itemId,
  });
  return res.data;
}

export async function exportRecipeMappingByMenu(foodFor) {
  const res = await api.get(RECIPE_MAPPING_ENDPOINTS.EXPORT_RECIPE_MAPPING, {
    params: { food_for: foodFor },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `recipe_mapping_${foodFor.toLowerCase().replace(/\s+/g,'_')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
```

**Lines changed:** +~60 (5 new functions)
**Risk:** LOW — all additive, no existing function signatures changed

**Critical contract rule enforced:**
- `getFoodRecipeMappingByMenu` sends `food_for` param, never `type` or `client`
- `batchUpdateRecipeMappingByMenu` sends `food_for` in body, never `type`
- `unlinkRecipeMappingByMenu` sends `food_for` in body, never `type`
- Existing aggregator functions still send `type: 'aggregator'` — untouched

---

## E3: AggregatorInventoryTab.jsx — Add mode switching

**File:** `src/components/inventory/AggregatorInventoryTab.jsx` (341 lines → ~420 lines)
**This is the primary UI change.**

### E3-a: New state (insert after L65, inside component)

```js
  // CR-473: Menu mode state
  const [menus, setMenus] = useState([]);           // from getMenuMaster()
  const [activeMode, setActiveMode] = useState('aggregator'); // 'aggregator' | menu_name
  const isAggregatorMode = activeMode === 'aggregator';
```
**+3 lines after L65** (`pendingChanges` state)

### E3-b: Fetch menus on mount (insert after L72, after the clients useEffect)

```js
  // CR-473: Fetch menus on mount
  useEffect(() => {
    recipeService.getMenuMaster()
      .then(data => setMenus(data))
      .catch(() => {}); // menu-master optional — silent fail
  }, []);
```
**+5 lines after L72** (after closing `}, []);` of clients useEffect)

### E3-c: New fetchMappingByMenu callback (insert after L89, after fetchMapping)

```js
  // CR-473: Fetch per-menu mapping
  const fetchMenuMapping = useCallback(async (foodFor) => {
    setLoading(true);
    try {
      const data = await recipeService.getFoodRecipeMappingByMenu(foodFor);
      setFoods(data.foods);
      setRecipes(data.recipes);
      setStats(data.stats);
      setPendingChanges({});
    } catch (err) {
      toast.error(`Failed to load ${foodFor} foods`);
    } finally {
      setLoading(false);
    }
  }, []);
```
**+14 lines after L89**

### E3-d: Mode change handler (insert after E3-c)

```js
  // CR-473: Mode change handler
  const handleModeChange = useCallback((mode) => {
    setActiveMode(mode);
    setSearch('');
    setPendingChanges({});
    setExpandedRows && setExpandedRows({});
    if (mode === 'aggregator') {
      fetchMapping(selectedClient);
    } else {
      fetchMenuMapping(mode);
    }
  }, [fetchMapping, fetchMenuMapping, selectedClient]);
```
**+11 lines**

### E3-e: Modify initial fetch useEffect (L90)

**Current L90:**
```js
  useEffect(() => { fetchMapping(selectedClient); }, [selectedClient, fetchMapping]);
```
**New L90:**
```js
  // CR-473: Initial fetch based on active mode
  useEffect(() => {
    if (isAggregatorMode) fetchMapping(selectedClient);
    else fetchMenuMapping(activeMode);
  }, [selectedClient, isAggregatorMode, activeMode, fetchMapping, fetchMenuMapping]);
```
**Replace 1 line with 4 lines**

### E3-f: Modify handleUnlink (L101) — conditional API call

**Current L101-116:** `handleUnlink` always calls `recipeService.unlinkRecipeMapping({ itemId, clientId })`
**New:** Add conditional:
```js
  const handleUnlink = useCallback(async (foodId) => {
    try {
      if (isAggregatorMode) {
        await recipeService.unlinkRecipeMapping({ itemId: foodId, clientId: selectedClient });
      } else {
        await recipeService.unlinkRecipeMappingByMenu({ foodFor: activeMode, itemId: foodId });
      }
      setFoods(prev => prev.map(f =>
        f.id === foodId ? { ...f, recipeId: null, recipeName: null } : f
      ));
      setPendingChanges(prev => { const n = { ...prev }; delete n[foodId]; return n; });
      toast.success('Recipe unlinked');
      // Refresh stats
      if (isAggregatorMode) {
        const data = await recipeService.getFoodRecipeMapping(selectedClient);
        setStats(data.stats);
      } else {
        const data = await recipeService.getFoodRecipeMappingByMenu(activeMode);
        setStats(data.stats);
      }
    } catch (err) {
      toast.error('Failed to unlink recipe');
    }
  }, [selectedClient, isAggregatorMode, activeMode]);
```
**Replace L101-116 (~15 lines with ~24 lines)**

### E3-g: Modify handleBatchSave (L118) — conditional API call

**Current L118-147:** Always calls `recipeService.batchUpdateRecipeMapping({ updates, clientId })`
**New:** Add conditional:
```js
  const handleBatchSave = useCallback(async () => {
    const updates = Object.entries(pendingChanges).map(([foodId, recipeId]) => ({
      itemId: Number(foodId), recipeId,
    }));
    if (!updates.length) { toast.info('No changes to save'); return; }
    setSaving(true);
    try {
      if (isAggregatorMode) {
        await recipeService.batchUpdateRecipeMapping({ updates, clientId: selectedClient });
      } else {
        await recipeService.batchUpdateRecipeMappingByMenu({ foodFor: activeMode, updates });
      }
      setPendingChanges({});
      toast.success(`${updates.length} mapping(s) saved`);
      // Refresh
      if (isAggregatorMode) {
        const data = await recipeService.getFoodRecipeMapping(selectedClient);
        setStats(data.stats);
      } else {
        const data = await recipeService.getFoodRecipeMappingByMenu(activeMode);
        setStats(data.stats);
      }
    } catch (err) {
      toast.error('Failed to save mappings');
    } finally {
      setSaving(false);
    }
  }, [pendingChanges, selectedClient, isAggregatorMode, activeMode]);
```
**Replace L118-147 (~30 lines with ~30 lines)**

### E3-h: Modify handleExport (L149) — conditional API call

**Current L149-157:** Always calls `recipeService.exportRecipeMapping()`
**New:**
```js
  const handleExport = useCallback(async () => {
    try {
      if (isAggregatorMode) {
        await recipeService.exportRecipeMapping();
      } else {
        await recipeService.exportRecipeMappingByMenu(activeMode);
      }
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  }, [isAggregatorMode, activeMode]);
```
**Replace L149-157 (~8 lines with ~12 lines)**

### E3-i: Modify liveStats label (L166) — adaptive label

**Current L166-171:** `liveStats` computes total/mapped/unmapped from `foods`
**Add after L171:** `modeLabel` computed:
```js
  const modeLabel = isAggregatorMode ? 'Aggregator' : activeMode;
```
**+1 line**

### E3-j: Add mode selector UI (insert at top of `return` JSX, L183)

Insert **mode pills bar** as first child inside the `<div data-testid="aggregator-inventory-tab">`:

```jsx
      {/* CR-473: Mode selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm mb-6" data-testid="food-mapping-mode-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <Link2Off className="w-4 h-4 text-purple-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Food Mapping</h3>
            <p className="text-xs text-slate-500">Map menu items to recipes for inventory tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200" data-testid="mode-dropdown-selector">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2">Mode</span>
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${isAggregatorMode ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500 hover:bg-white/50'}`}
            onClick={() => handleModeChange('aggregator')}
            data-testid="mode-pill-aggregator"
          >Aggregator</button>
          {menus.map(m => (
            <button
              key={m.id}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${activeMode === m.name ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500 hover:bg-white/50'}`}
              onClick={() => handleModeChange(m.name)}
              data-testid={`mode-pill-${m.name.toLowerCase()}`}
            >{m.name}</button>
          ))}
        </div>
      </div>
```
**+~25 lines inserted before existing brand selector**

### E3-k: Conditionally hide brand/client selector

**Current L186-198:** Brand selector always visible when `clients.length > 0`
**New:** Add `isAggregatorMode &&` guard:
```js
      {isAggregatorMode && clients.length > 0 && (
```
**1 line change** (L186)

### E3-l: Update stats card label

**Current L203:** `<p ...>Total Aggregator Foods</p>`
**New:** `<p ...>Total {modeLabel} Foods</p>`

**Current L214:** `<p ...>Mapped</p>` — stays unchanged (generic)
**Current L225:** `<p ...>Unmapped</p>` — stays unchanged (generic)

**1 line change** (L203 — replace static "Aggregator" with `{modeLabel}`)

### E3-m: Update search placeholder

**Current L243:** `placeholder="Search aggregator foods..."`
**New:** `placeholder={`Search ${modeLabel} foods...`}`
**1 line change**

### E3-n: Update loading text

**Current L178:** `Loading aggregator foods...`
**New:** `Loading {isAggregatorMode ? 'aggregator' : activeMode} foods...`
**1 line change**

### E3-o: Update footer text

**Current L333 (approximate):** Static footer text
**This adapts via `liveStats` which already reads from `foods` — no change needed**

---

## E4: RecipeManagementPanel.jsx — Tab label rename

**File:** `src/components/inventory/RecipeManagementPanel.jsx`
**Current L508:**
```js
              Aggregator Inventory
```
**New L508:**
```js
              Food Mapping
```
**1 line change**
**Risk:** LOW — visible label only, `value="aggregator-inventory"` and `data-testid` unchanged

---

## Summary of all changes

| Edit | File | Type | Lines changed | Risk |
|---|---|---|---|---|
| E1 | constants.js L278 | +1 endpoint | +1 | LOW |
| E2 | recipeService.js (EOF) | +5 new functions | +60 | LOW |
| E3-a | AggregatorInventoryTab.jsx L65 | +3 state vars | +3 | LOW |
| E3-b | AggregatorInventoryTab.jsx L72 | +1 useEffect (menus) | +5 | LOW |
| E3-c | AggregatorInventoryTab.jsx L89 | +1 fetchMenuMapping | +14 | LOW |
| E3-d | AggregatorInventoryTab.jsx (after E3-c) | +1 handleModeChange | +11 | LOW |
| E3-e | AggregatorInventoryTab.jsx L90 | Replace initial fetch | Replace 1→4 | LOW |
| E3-f | AggregatorInventoryTab.jsx L101 | Replace handleUnlink | Replace 15→24 | MEDIUM |
| E3-g | AggregatorInventoryTab.jsx L118 | Replace handleBatchSave | Replace 30→30 | MEDIUM |
| E3-h | AggregatorInventoryTab.jsx L149 | Replace handleExport | Replace 8→12 | LOW |
| E3-i | AggregatorInventoryTab.jsx L171 | +modeLabel | +1 | LOW |
| E3-j | AggregatorInventoryTab.jsx L183 | +mode pills UI | +25 | LOW |
| E3-k | AggregatorInventoryTab.jsx L186 | +isAggregatorMode guard | 1 change | LOW |
| E3-l | AggregatorInventoryTab.jsx L203 | Label "Aggregator"→{modeLabel} | 1 change | LOW |
| E3-m | AggregatorInventoryTab.jsx L243 | Search placeholder | 1 change | LOW |
| E3-n | AggregatorInventoryTab.jsx L178 | Loading text | 1 change | LOW |
| E4 | RecipeManagementPanel.jsx L508 | Label rename | 1 change | LOW |

**Total: ~80 new lines + ~10 modified lines across 4 files**

---

## Verification Matrix

| # | Edit | Verification | Method |
|---|---|---|---|
| V1 | E1 | `grep MENU_MASTER src/api/constants.js` | CLI |
| V2 | E2 | `grep getMenuMaster src/api/services/recipeService.js` | CLI |
| V3 | E3-j | Mode pills show: Aggregator + Normal + Party + Premium | Browser |
| V4 | E3 | Click "Normal" → table loads 88 Normal foods (Ruby) | Browser |
| V5 | E3 | Click "Aggregator" → table loads 5 aggregator foods | Browser |
| V6 | E3 | Click "Party" → empty state "No foods in this menu" | Browser |
| V7 | E3-k | Aggregator mode → brand selector visible; Normal mode → hidden | Browser |
| V8 | E3-g | Map a Normal food → Save All → refresh → mapping persists | Browser |
| V9 | E3-f | Unlink a mapped Normal food → refresh → recipe_id null | Browser |
| V10 | E3-h | Export with Normal selected → xlsx downloads | Browser |
| V11 | E4 | Tab reads "Food Mapping" | Browser |
| V12 | ALL | webpack compiles, 0 new warnings | CLI |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-473 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: CR-473 row updated
- [ ] FILE_OWNERSHIP.md: add constants.js (E1), recipeService.js (E2), AggregatorInventoryTab.jsx (E3), RecipeManagementPanel.jsx (E4)
- [ ] Code markers: // CR-473 in every modified file
- [ ] Compile check: webpack 0 new warnings
```

---

## QA Handover Seeds

| # | Test Case | Steps | Expected |
|---|---|---|---|
| T1 | Tab label | Navigate to Recipe Management | "Food Mapping" tab visible (was "Aggregator Inventory") |
| T2 | Mode pills | Click Food Mapping tab | Mode pills show: Aggregator (default) + dynamic menus |
| T3 | Normal mode | Click "Normal" pill | Table loads Normal foods, stats update |
| T4 | Aggregator mode | Click "Aggregator" pill | Table loads aggregator foods, brand selector appears |
| T5 | Party mode empty | Click "Party" pill | Empty state message shown |
| T6 | Brand selector visibility | Switch Aggregator → Normal → Aggregator | Brand selector hides → shows |
| T7 | Search in menu mode | Select Normal, type search term | Filters Normal foods |
| T8 | Map recipe in menu mode | Select Normal, assign recipe to a food, Save All | Mapping saved, stats update |
| T9 | Unlink in menu mode | Unlink a mapped Normal food | Recipe removed, stats update |
| T10 | Export in menu mode | Click Export XLSX with Normal selected | xlsx downloads for Normal menu |
| T11 | Aggregator regression | Switch to Aggregator, map/unlink/export | All existing flows still work |
| T12 | Multiple mode switches | Rapidly switch modes | No stale data, loading states correct |

---

## Gate Status

- Gate 2: COMPLETE (Impact Analysis)
- Gate 3: **COMPLETE** (this document)
- Gate 4: Awaiting owner "Gate 4 GO" → Implementation
