# CR-141 — Impact Analysis: Aggregator Sync Operations + Category Timings

**Code Reality:** NONE — all 4 gaps unimplemented  
**Conflict Pre-Check:** CLEAR — no other open CR touches target files  
**Gate:** 2 ✅  
**Date:** 2026-08-14  
**Risk:** MEDIUM  

---

## 1. Data Flow Traces

### 1A. Sync Catalog (absent)
```
User: clicks "Sync Catalog" for selected brand
  → NEW SyncCatalogTab.jsx: calls syncCatalog(activeClientId)
  → NEW aggregatorConfigService.syncCatalog(clientId)
      → POST /aggregator-sync/sync-catalog  body: { [client_id] }
  Response: { data: { store_pending: true, store_id: 'STORE_POS_ID_69' } }
  UI: show "Sync queued — store pass in progress"
  Note: ASYNC — master pass done, store pass fires 6s later on backend.
        FE does NOT poll. Just shows queued message.
```

### 1B. Clear Catalog (absent)
```
User: clicks "Clear Store" (full_master_reset: false)
  → Confirm dialog: "This will clear [Brand]'s catalog from UrbanPiper. Continue?"
  → NEW aggregatorConfigService.clearCatalog(clientId, false)
      → POST /aggregator-sync/clear-catalog  { full_master_reset: false, [client_id] }

User: clicks "Full Master Reset" (full_master_reset: true)
  → DANGER confirm dialog: "⛔ This wipes ALL brands' shared catalog. Type RESET to confirm."
  → NEW aggregatorConfigService.clearCatalog(null, true)
      → POST /aggregator-sync/clear-catalog  { full_master_reset: true }
  Note: No client_id on full reset — wipes everything.
```

### 1C. Clear Modifiers (absent)
```
User: clicks "Clear Modifiers"
  → Confirm dialog: "Remove all option groups for [Brand]?"
  → NEW aggregatorConfigService.clearModifiers(clientId)
      → POST /aggregator-sync/clear-modifiers  { [client_id] }
```

### 1D. Category Timings (absent)
```
Fetch:
  CategoryTimingsTab mounts
  → NEW aggregatorConfigService.getCategoryTimings()
      → GET /aggregator-sync/category-timings
  Response: { timing_groups: [{ title, category_ids[], day_slots: [...] }] }

Save + Push:
  User: edits/adds timing group → clicks "Save & Push"
  → NEW aggregatorConfigService.saveCategoryTimings(groups, clientId)
      → POST /aggregator-sync/category-timings
         { timing_groups: [...], [client_id] }
  Note: saves RESTAURANT-WIDE regardless of client_id.
        client_id only selects which store creds to use for UrbanPiper push.

Push Only:
  User: clicks "Push Only"
  → NEW aggregatorConfigService.pushCategoryTimings(clientId)
      → POST /aggregator-sync/category-timings/push  { [client_id] }
```

---

## 2. Exact Edit Points

### E1 — `api/constants.js`
Already covered by CR-140 E1 — AGGREGATOR_SYNC_ENDPOINTS includes all CR-141 paths.  
**Dependency:** CR-140 E1 must land first, or both land in same implementation batch.

---

### E2 — `api/services/aggregatorConfigService.js` (+6 functions)
Add after existing `updateOperationalSettings()` (L67):

```js
// CR-141: Aggregator Sync Operations

export const syncCatalog = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.SYNC_CATALOG, body);
  return res.data;
};

export const clearCatalog = async (clientId = null, fullMasterReset = false) => {
  const body = { full_master_reset: fullMasterReset };
  if (clientId && !fullMasterReset) body.client_id = clientId;
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CLEAR_CATALOG, body);
  return res.data;
};

export const clearModifiers = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CLEAR_MODIFIERS, body);
  return res.data;
};

export const getCategoryTimings = async () => {
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.CATEGORY_TIMINGS);
  return res.data;
};

export const saveCategoryTimings = async (timingGroups, clientId = null) => {
  const body = { timing_groups: timingGroups };
  if (clientId) body.client_id = clientId;
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CATEGORY_TIMINGS, body);
  return res.data;
};

export const pushCategoryTimings = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.CATEGORY_TIMINGS_PUSH, body);
  return res.data;
};
```
**Risk:** LOW — additive, no existing functions touched.

---

### E3 — `components/settings/aggregatorSetup/AggregatorSetupView.jsx`

#### E3a — Imports: add 2 new tab components
```js
import SyncCatalogTab from './SyncCatalogTab';
import CategoryTimingsTab from './CategoryTimingsTab';
```

#### E3b — Tab bar (L72-75): add 2 buttons
```jsx
<button style={tabStyle('sync')} onClick={() => setActiveTab('sync')}>Sync & Catalog</button>
<button style={tabStyle('timings')} onClick={() => setActiveTab('timings')}>Category Timings</button>
```

#### E3c — Tab render area (L77-108): add conditionals
```jsx
{activeTab === 'sync' && (
  <SyncCatalogTab
    activeClientId={activeClientId}
    subBrands={subBrands}
    onBrandChange={handleBrandChange}
  />
)}
{activeTab === 'timings' && (
  <CategoryTimingsTab
    activeClientId={activeClientId}
    subBrands={subBrands}
  />
)}
```

**Note:** `activeClientId` + `subBrands` already in parent state — zero new state needed.
**Risk:** LOW — additive only. Config and Operational tabs unchanged.

---

### E4 — NEW `components/settings/aggregatorSetup/SyncCatalogTab.jsx`

Props: `activeClientId`, `subBrands`, `onBrandChange`  
State: `loading` (per action), `lastResult` (per action)  

Layout: 4 action cards (vertical stack):
1. **Sync Catalog** — calls `syncCatalog(activeClientId)`. Shows `store_pending` result.
2. **Clear Store Catalog** — calls `clearCatalog(activeClientId, false)`. Standard confirm.
3. **Clear Modifiers** — calls `clearModifiers(activeClientId)`. Standard confirm.
4. **Full Master Reset** — calls `clearCatalog(null, true)`. Danger dialog with text-input confirm ("RESET").

Each card: title, description, action button, loading spinner, result toast.  
~150 lines.

---

### E5 — NEW `components/settings/aggregatorSetup/CategoryTimingsTab.jsx`

Props: `activeClientId` (for push target), `subBrands`  
State: `timingGroups[]`, `editingGroup` (null|{...}), `loading`, `saving`  

**Fetch on mount:** `getCategoryTimings()`  
**Local model per group:**
```js
{ id: uuid, title: '', category_ids: [], day_slots: [{ day: 'all', slots: [{start_time:'',end_time:''}] }] }
```

**Layout:**
- Warning banner: "Timings apply to all brands. Last save overwrites all stores."
- Action bar: "+ New Group" | "Save & Push" dropdown (pick brand) | "Push Only" dropdown
- List of timing group cards (title, categories, day schedule, Edit/Delete)
- Inline add/edit form (title input, category multi-select, day picker, slot rows)

**Push target:** user picks from dropdown (Main Brand / sub-brands). Passes `client_id` to `saveCategoryTimings`.

~250 lines.

---

## 3. Owner Decisions (Open Questions from Intake)

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| **OQ-1 → OD-1** | Category timings: single global view or per-brand tab? | A: single view with push-to dropdown; B: per-brand tabs (data is same, push differs) | Tab structure in CategoryTimingsTab |
| **OQ-2 → OD-2** | Sync Catalog: show progress indicator while store_pending, or just toast? | A: "Sync queued" toast only; B: show pending badge with refresh button | SyncCatalogTab UX complexity |
| **OQ-3 → OD-3** | Full Master Reset confirmation: type "RESET" or standard confirm dialog? | A: type RESET (stronger guard); B: standard confirm dialog | SyncCatalogTab danger card |

**Resolved from developer doc (no owner decision needed):**
- `full_master_reset: false` is always safe (store-only)
- `full_master_reset: true` wipes all brands — must never be default
- Category timings are restaurant-wide — must show shared warning

---

## 4. Downstream Consumers (no changes needed)

| Consumer | Why Not Affected |
|----------|------------------|
| `ConfigTab.jsx` | Credentials/brand config only |
| `OperationalTab.jsx` | Operational flags only |
| `aggregatorConfigTransform.js` | Config transforms only |
| Menu management | Separate module |

---

## 5. Verification Matrix

| Edit | File | Change | How to Verify |
|------|------|--------|---------------|
| E2 | aggregatorConfigService.js | syncCatalog fn | Network tab: POST sync-catalog |
| E2 | aggregatorConfigService.js | clearCatalog fn | Network tab: POST clear-catalog |
| E2 | aggregatorConfigService.js | clearModifiers fn | Network tab: POST clear-modifiers |
| E2 | aggregatorConfigService.js | getCategoryTimings fn | Network tab: GET category-timings |
| E2 | aggregatorConfigService.js | saveCategoryTimings fn | Network tab: POST category-timings |
| E2 | aggregatorConfigService.js | pushCategoryTimings fn | Network tab: POST category-timings/push |
| E3b | AggregatorSetupView.jsx | "Sync & Catalog" tab visible | Browser |
| E3b | AggregatorSetupView.jsx | "Category Timings" tab visible | Browser |
| E4 | SyncCatalogTab.jsx | Sync button fires | Network tab |
| E4 | SyncCatalogTab.jsx | Clear store confirm | Browser dialog |
| E4 | SyncCatalogTab.jsx | Full reset requires RESET text | Browser |
| E5 | CategoryTimingsTab.jsx | Timing groups listed | Browser fetch |
| E5 | CategoryTimingsTab.jsx | Save & Push fires POST + client_id | Network tab |
| E5 | CategoryTimingsTab.jsx | Shared-data warning visible | Browser |

---

## 6. Post-Code Registry Checklist
```
- [ ] registry.json: CR-141 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: +5 files listed
- [ ] Code markers: // CR-141 in every modified file
```

**Code Reality:** NONE  
**Conflict Pre-Check:** CLEAR  
**Risk:** MEDIUM (new isolated tabs, no hotspot files)  
**Owner Decisions needed:** OD-1, OD-2, OD-3  
