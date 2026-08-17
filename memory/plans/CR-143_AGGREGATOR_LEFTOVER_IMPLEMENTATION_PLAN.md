# CR-143 — Implementation Plan: Aggregator Leftover (Force-Swiggy + Addon Stock + Variation Stock)

**Gate:** 3 ✅
**Date:** 2026-08-15
**Risk:** MEDIUM (new tabs in existing view, new isolated service functions, no hotspot files)

---

## Curl Probe Results (R11)

| # | Endpoint | Method | Status | Finding |
|---|---|---|---|---|
| P7 | /product/restaurant-clients | GET | ✅ 200 | `{clients:[{id,name,phone,email,address,status}]}` client_id=109 for Goan Kitchen |
| P8a | /aggregator-sync/bulk-actions/addons?client_id=N | GET | ✅ 200 | `{status,client_id,addons:[{id,name,price,status,status_text}]}` |
| P8b | /aggregator-sync/variations?client_id=N | GET | ✅ 200 | `{status,client_id,items:[]}` — 0 items for test account (shape confirmed) |
| P8c | /aggregator-sync/force-swiggy-enable | POST | ⚠ 502 | CF upstream error for test account — handle as graceful error (network issue, not FE bug) |
| P8d | /aggregator-sync/bulk-actions/toggle-addon | POST | ⚠ 404 | When no items match: `{status:false,errors:[{code:"no_items",message:"..."}]}` |
| P8e | /aggregator-sync/bulk-actions/apply | POST | ✅ 200 | `{status,message,data:{addon_id,addon_name,status,restaurant_wide:true,client_id}}` — `restaurant_wide:true` CONFIRMED |

**Key findings:**
- `force-swiggy-enable` → 502 on this account (no Swiggy config). Must handle gracefully — show error toast, not crash.
- `toggle-addon` → 404 means no UrbanPiper items exist for that addon. Must treat 404 + `errors[0].code==="no_items"` as a user-facing warning not a fatal crash.
- `bulk-actions/apply` → `restaurant_wide:true` in response confirms confirm dialog is mandatory.
- `SyncCatalogTab.run()` currently takes `(key, fn, successMsg)` as **string** — CR-143 needs dynamic msg from response data. Solution: extend `run()` to also accept a **function** for `successMsg`.

Evidence: `/app/memory/evidence/CR-142-145/probe8a_bulk_addons.txt`, `probe8c_force_swiggy.txt`, `probe8e_bulk_apply.txt`

---

## Execution Sequence

```
E1 → E2 → compile-check → E3 → E4 → compile-check → E5 → compile-check → E6 → compile-check → self-test
```

---

## E1 — `api/constants.js` — Add 6 entries to AGGREGATOR_SYNC_ENDPOINTS

**File:** `/app/frontend/src/api/constants.js`
**Line:** 524 (after `RESTAURANT_CLIENTS` entry in AGGREGATOR_SYNC_ENDPOINTS block)

Find the closing `};` of `AGGREGATOR_SYNC_ENDPOINTS` and add before it:
```js
  // CR-143: Aggregator Leftover endpoints
  FORCE_SWIGGY_ENABLE: '/api/v2/vendoremployee/aggregator-sync/force-swiggy-enable',
  BULK_ACTIONS_ADDONS: '/api/v2/vendoremployee/aggregator-sync/bulk-actions/addons',
  BULK_ACTIONS_ITEMS:  '/api/v2/vendoremployee/aggregator-sync/bulk-actions/items',
  BULK_ACTIONS_APPLY:  '/api/v2/vendoremployee/aggregator-sync/bulk-actions/apply',
  TOGGLE_ADDON:        '/api/v2/vendoremployee/aggregator-sync/bulk-actions/toggle-addon',
  VARIATIONS:          '/api/v2/vendoremployee/aggregator-sync/variations',
  TOGGLE_VARIATION:    '/api/v2/vendoremployee/aggregator-sync/toggle-variation',
```
**Risk:** LOW — additive constants.

---

## E2 — `api/services/aggregatorConfigService.js` — Add 7 functions after `pushCategoryTimings`

**File:** `/app/frontend/src/api/services/aggregatorConfigService.js`
**Position:** After line 132 (`pushCategoryTimings` function, confirmed as last export)

Import `AGGREGATOR_SYNC_ENDPOINTS` is already imported at top of file. Add:
```js
// CR-143: Aggregator Leftover service functions

/**
 * CR-143 GAP-G: Force-enable all active Swiggy items for this brand.
 * ⚠ Returns 502 if no Swiggy config for this restaurant — handle in UI.
 */
export const forceSwiggyEnable = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.FORCE_SWIGGY_ENABLE, body);
  return res.data;
};

/** CR-143 GAP-H: List addons with aggregator status for a brand */
export const getBulkAddons = async (clientId = null) => {
  const params = clientId ? { client_id: clientId } : {};
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.BULK_ACTIONS_ADDONS, { params });
  return res.data;  // shape: { status, client_id, addons:[{id,name,price,status,status_text}] }
};

/** CR-143 GAP-H: Foods using a specific addon on this brand */
export const getBulkAddonItems = async (addonId, clientId = null) => {
  const params = { addon_id: addonId, ...(clientId ? { client_id: clientId } : {}) };
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.BULK_ACTIONS_ITEMS, { params });
  return res.data;
};

/**
 * CR-143 GAP-H: Apply catalog status change (restaurant-WIDE — confirmed by probe P8e).
 * action: 'enable' | 'out_of_stock'
 * ⚠ Writes add_ons.status for ALL brands — UI must warn with confirm dialog.
 * Response: { status, message, data: { addon_id, addon_name, status, restaurant_wide: true } }
 */
export const applyBulkAddon = async (addonId, action, clientId = null) => {
  const body = { addon_id: addonId, action, ...(clientId ? { client_id: clientId } : {}) };
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.BULK_ACTIONS_APPLY, body);
  return res.data;
};

/**
 * CR-143 GAP-H: Toggle addon on UrbanPiper for this brand (per-brand).
 * ⚠ Returns 404 {errors:[{code:"no_items"}]} when addon not on aggregator — treat as warning.
 */
export const toggleAddonStock = async (addonId, action, clientId = null) => {
  const body = { addon_id: addonId, action, ...(clientId ? { client_id: clientId } : {}) };
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.TOGGLE_ADDON, body);
  return res.data;
};

/** CR-143 GAP-I: List items with variations for this brand */
export const getVariations = async (clientId = null) => {
  const params = clientId ? { client_id: clientId } : {};
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.VARIATIONS, { params });
  return res.data;  // shape: { status, client_id, items:[{id,name,category_id,status,variations:[...]}] }
};

/**
 * CR-143 GAP-I: Toggle a specific variation value on UrbanPiper.
 * OPT ref: OPT-VAR-{foodId}-{varIdx}-{valIdx}
 */
export const toggleVariation = async ({ food_id, variation_index, variation_value_index, action, clientId = null }) => {
  const body = { food_id, variation_index, variation_value_index, action,
                 ...(clientId ? { client_id: clientId } : {}) };
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.TOGGLE_VARIATION, body);
  return res.data;
};
```
**Risk:** LOW — additive new functions, no existing function changes.

---

## E3 — `components/settings/aggregatorSetup/SyncCatalogTab.jsx` — Extend `run()` + add Force-Swiggy card

**File:** `/app/frontend/src/components/settings/aggregatorSetup/SyncCatalogTab.jsx`

### E3a — Add `forceSwiggyEnable` import (alongside existing imports at L3):
```js
import { syncCatalog, clearCatalog, clearModifiers, forceSwiggyEnable } from '../../../api/services/aggregatorConfigService'; // CR-143
```

### E3b — Extend `run()` to support dynamic successMsg from response (L52):

**Current:**
```js
const run = async (key, fn, successMsg) => {
  setLoading(p => ({ ...p, [key]: true }));
  try {
    await fn();
    toast({ title: 'Done', description: successMsg });
```
**Replace with:**
```js
const run = async (key, fn, successMsg) => {  // CR-143: successMsg can be string or fn(data)=>string
  setLoading(p => ({ ...p, [key]: true }));
  try {
    const data = await fn();
    const msg = typeof successMsg === 'function' ? successMsg(data) : successMsg;
    toast({ title: 'Done', description: msg });
```
**Risk:** LOW — backward compatible. All existing callers pass string → `typeof string === 'function'` is false → same behaviour.

### E3c — Add Force-Swiggy card (after Sync Catalog card, before Clear Store card):
```jsx
{/* CR-143 GAP-G: Force-enable all active Swiggy items */}
<ActionCard
  title="Force Enable All Items on Swiggy"
  desc={`Re-enables all currently-active Swiggy items for ${brandLabel} on UrbanPiper. Use after a store outage or reset.`}
>
  <ActionBtn
    id="forceSwiggy"
    label="Force Enable Swiggy →"
    loading={loading.forceSwiggy}
    onClick={() => run(
      'forceSwiggy',
      () => forceSwiggyEnable(activeClientId),
      (data) => `${data?.data?.total_items ?? 'All'} items enabled on Swiggy` // OQ-3=A: show count
    )}
  />
</ActionCard>
```

**Risk:** LOW — additive card using existing ActionCard/ActionBtn pattern.

---

## E4 — `components/settings/aggregatorSetup/AggregatorSetupView.jsx` — Add 2 tabs

**File:** `/app/frontend/src/components/settings/aggregatorSetup/AggregatorSetupView.jsx`

### E4a — Add imports (after `CategoryTimingsTab` import, L8):
```js
import AddonStockTab     from './AddonStockTab';    // CR-143
import VariationStockTab from './VariationStockTab'; // CR-143
```

### E4b — Add tab bar buttons (after `tab-timings` button, L78):
```jsx
<button data-testid="tab-addon-stock"
  style={tabStyle('addon-stock')} onClick={() => setActiveTab('addon-stock')}>
  Addon Stock
</button>
<button data-testid="tab-variation-stock"
  style={tabStyle('variation-stock')} onClick={() => setActiveTab('variation-stock')}>
  Variation Stock
</button>
```

### E4c — Add tab renders (after `CategoryTimingsTab` block, L121):
```jsx
{activeTab === 'addon-stock' && (     // CR-143
  <AddonStockTab
    activeClientId={activeClientId}
    subBrands={subBrands}
  />
)}
{activeTab === 'variation-stock' && ( // CR-143
  <VariationStockTab
    activeClientId={activeClientId}
    subBrands={subBrands}
  />
)}
```
**Risk:** LOW — additive tabs, existing tabs 1-4 unaffected.

---

## E5 — NEW `AddonStockTab.jsx` (~220 lines)

**File:** `components/settings/aggregatorSetup/AddonStockTab.jsx` (NEW)
**Props:** `{ activeClientId, subBrands }`

**Component outline:**
```
State:
  addons[]        — from getBulkAddons()
  loading         — bool
  expandedId      — null | addon.id (accordion row)
  addonItems{}    — { [addonId]: foods[] } lazy-loaded
  confirmOOS      — null | { addonId, addonName } (confirm before catalog change)
  opLoading{}     — { [addonId_action]: bool }

On mount / activeClientId change:
  getBulkAddons(activeClientId) → setAddons(res.addons)

Warning banner (always visible):
  "⚠ Catalog status changes apply to ALL brands restaurant-wide.
   UrbanPiper toggle is per-brand only."

Brand selector: subBrands dropdown (same as other tabs)

Table columns: ADDON | PRICE | CATALOG STATUS (all brands) | URBANPIPER STATUS (this brand)

CATALOG STATUS column:
  status=1 (Available): green "● Available" + [OOS] button
  status=0 (Out of Stock): red "○ OOS" + [Enable] button
  On [OOS] click: setConfirmOOS({addonId, addonName})
  Confirm dialog:
    "Mark '{name}' as Out of Stock? This changes catalog status for ALL brands
     restaurant-wide and cannot be limited to a single brand."
    On confirm: applyBulkAddon(id, 'out_of_stock', activeClientId) → reload
  On [Enable] click: applyBulkAddon(id, 'enable', activeClientId) → reload (no confirm needed for enable)

URBANPIPER STATUS column:
  [Enable] → toggleAddonStock(id, 'enable', activeClientId)
  [Disable] → toggleAddonStock(id, 'disable', activeClientId)
  ⚠ Handle 404 + errors[0].code==='no_items' as WARNING toast (not error):
    toast({ title: 'Not on UrbanPiper', description: 'This addon has no items on this brand.', variant: 'default' })

Row expand (click addon name):
  getBulkAddonItems(id, activeClientId) → addonItems[id] = res.items
  Shows list: "Used in: [food names]"
```

**Risk:** MEDIUM — new component, async ops with confirm dialog.

---

## E6 — NEW `VariationStockTab.jsx` (~240 lines)

**File:** `components/settings/aggregatorSetup/VariationStockTab.jsx` (NEW)
**Props:** `{ activeClientId, subBrands }`

**Component outline:**
```
State:
  items[]       — from getVariations(activeClientId)
  loading       — bool
  expanded{}    — { [foodId]: bool } (accordion)
  opLoading{}   — { [foodId_varIdx_valIdx_action]: bool }

On mount / activeClientId change:
  getVariations(activeClientId) → setItems(res.items)

Brand selector: subBrands dropdown

If items.length === 0:
  "No foods with variations found on this brand."

For each food item (accordion):
  Header: food name + category + [Enable All] [Disable All]  (OQ-2=A: group toggle)
    Enable All / Disable All: forEach variation.values[] → toggleVariation(...)

  Body (when expanded):
    For each variation group:
      Group name label
      For each value: "{label} · {optionPrice}"  [Enable] [Disable]
        On [Enable|Disable]: toggleVariation({
          food_id: item.id,
          variation_index: varIdx,
          variation_value_index: valIdx,
          action: 'enable'|'disable',
          clientId: activeClientId
        })

Group Enable All / Disable All:
  Fires toggleVariation for every value in that variation's values[] array
  Uses Promise.allSettled to avoid one failure blocking others
  Shows summary toast: "N/M values updated"
```

**Risk:** MEDIUM — nested async ops, Promise.allSettled pattern.

---

## Verification Matrix

| # | Edit | File | Verification | Method |
|---|------|------|-------------|--------|
| V1 | E1 | constants.js | 7 new AGGREGATOR_SYNC_ENDPOINTS entries present | grep |
| V2 | E2 | aggregatorConfigService.js | forceSwiggyEnable fn | grep |
| V3 | E2 | aggregatorConfigService.js | getBulkAddons fn | grep |
| V4 | E2 | aggregatorConfigService.js | applyBulkAddon fn with restaurant_wide comment | grep |
| V5 | E2 | aggregatorConfigService.js | toggleAddonStock fn | grep |
| V6 | E2 | aggregatorConfigService.js | getVariations fn | grep |
| V7 | E2 | aggregatorConfigService.js | toggleVariation fn | grep |
| V8 | E3b | SyncCatalogTab.jsx | run() accepts fn as successMsg | code review |
| V9 | E3c | SyncCatalogTab.jsx | "Force Enable All Items on Swiggy" card visible | Browser |
| V10 | E3c | SyncCatalogTab.jsx | Click fires POST force-swiggy-enable (or shows error toast on 502) | devtools |
| V11 | E4 | AggregatorSetupView.jsx | "Addon Stock" tab visible (Tab 5) | Browser |
| V12 | E4 | AggregatorSetupView.jsx | "Variation Stock" tab visible (Tab 6) | Browser |
| V13 | E4 | AggregatorSetupView.jsx | Tabs 1-4 still work | Browser |
| V14 | E5 | AddonStockTab.jsx | Addon list loads from GET bulk-actions/addons | devtools |
| V15 | E5 | AddonStockTab.jsx | OOS confirm dialog appears with restaurant-wide warning | Browser |
| V16 | E5 | AddonStockTab.jsx | OOS fires POST bulk-actions/apply | devtools |
| V17 | E5 | AddonStockTab.jsx | 404 from toggle-addon shows warning toast (not crash) | devtools |
| V18 | E6 | VariationStockTab.jsx | Variation items load from GET variations | devtools |
| V19 | E6 | VariationStockTab.jsx | [Enable] fires POST toggle-variation | devtools |
| V20 | E6 | VariationStockTab.jsx | Group Disable All fires for each value | devtools |
| V21 | Regression | AggregatorSetupView | Config / Operational / Sync / Timings tabs unchanged | Browser |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: CR-143 → IMPLEMENTED, pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: constants.js, aggregatorConfigService.js, SyncCatalogTab.jsx,
                          AggregatorSetupView.jsx + NEW AddonStockTab.jsx + VariationStockTab.jsx
- [ ] Code markers: // CR-143 in every modified/created file
```
