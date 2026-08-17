# CR-143 — Impact Analysis: Aggregator Leftover — Force-Swiggy + Addon Stock + Variation Stock

**Code Reality:** NONE — all 3 gaps unimplemented  
**Conflict Pre-Check:** CLEAR — CR-141 IMPLEMENTED (adds Tabs 3-4), this CR adds Tabs 5-6 + 1 card in Tab 3. No overlap.  
**Gate:** 2 ✅  
**Date:** 2026-08-14  
**Risk:** MEDIUM (new isolated tabs, no hotspot files)  

---

## OD Defaults Adopted

| OD | Question | Default |
|---|---|---|
| OQ-1 | Catalog status change confirm | **A** — Confirm dialog (clearly communicates restaurant-wide impact) |
| OQ-2 | Variation group toggle | **A** — Group-level enable/disable button + per-value toggles |
| OQ-3 | Force-Swiggy toast | **A** — Show triggered item count (API returns it, useful feedback) |

---

## 1. Data Flow Traces

### 1A. Force Swiggy Enable
```
User clicks "Force Enable on Swiggy" in SyncCatalogTab
  → NEW: aggregatorConfigService.forceSwiggyEnable(activeClientId)
      → POST /aggregator-sync/force-swiggy-enable { [client_id] }
  Response: { message: "Swiggy force stock-in triggered for N items",
              data: { total_items: N, total_batches: N } }
  UI: toast "X items enabled on Swiggy"
```

### 1B. Addon Stock Management
```
User opens "Addon Stock" tab (Tab 5)
  → NEW: aggregatorConfigService.getBulkAddons(activeClientId)
      → GET /aggregator-sync/bulk-actions/addons?[client_id=N]
  Response: { addons: [{ id, name, price, status, status_text }] }

User clicks OOS (catalog out of stock):
  → Confirm dialog: "This changes catalog status for ALL brands"
  → NEW: aggregatorConfigService.applyBulkAddon(addonId, 'out_of_stock', clientId)
      → POST /aggregator-sync/bulk-actions/apply { addon_id, action, [client_id] }
  ⚠ Writes add_ons.status RESTAURANT-WIDE

User clicks Disable on UrbanPiper:
  → NEW: aggregatorConfigService.toggleAddonStock(addonId, 'disable', clientId)
      → POST /aggregator-sync/bulk-actions/toggle-addon { addon_id, action, [client_id] }
  → Per-brand. Hits OPT-ADDON-SHARED-{addon_id} on selected store.

User expands addon row:
  → NEW: aggregatorConfigService.getBulkAddonItems(addonId, clientId)
      → GET /aggregator-sync/bulk-actions/items?addon_id=X&[client_id=N]
  Response: foods using this addon
```

### 1C. Variation Stock Management
```
User opens "Variation Stock" tab (Tab 6)
  → NEW: aggregatorConfigService.getVariations(activeClientId)
      → GET /aggregator-sync/variations?[client_id=N]
  Response: { items: [{ id, name, category_id, status, variations: [{name, values[{label,optionPrice}]}] }] }

User clicks Disable on a variation value:
  → NEW: aggregatorConfigService.toggleVariation({ food_id, variation_index, variation_value_index, action, client_id })
      → POST /aggregator-sync/toggle-variation { food_id, variation_index, variation_value_index, action, [client_id] }
  → Per-brand. Option ref: OPT-VAR-{foodId}-{varIdx}-{valIdx}
```

---

## 2. Exact Edit Points

### E1 — `api/constants.js` (after line 523, inside AGGREGATOR_SYNC_ENDPOINTS)

**Add 6 entries to existing AGGREGATOR_SYNC_ENDPOINTS block:**
```js
export const AGGREGATOR_SYNC_ENDPOINTS = {
  STOCK_TOGGLE:          '...', // existing CR-140
  SYNC_CATALOG:          '...', // existing CR-141
  CLEAR_CATALOG:         '...', // existing CR-141
  CLEAR_MODIFIERS:       '...', // existing CR-141
  CATEGORY_TIMINGS:      '...', // existing CR-141
  CATEGORY_TIMINGS_PUSH: '...', // existing CR-141
  RESTAURANT_CLIENTS:    '...', // existing CR-140
  // CR-143 additions:
  FORCE_SWIGGY_ENABLE:   '/api/v2/vendoremployee/aggregator-sync/force-swiggy-enable',
  BULK_ACTIONS_ADDONS:   '/api/v2/vendoremployee/aggregator-sync/bulk-actions/addons',
  BULK_ACTIONS_ITEMS:    '/api/v2/vendoremployee/aggregator-sync/bulk-actions/items',
  BULK_ACTIONS_APPLY:    '/api/v2/vendoremployee/aggregator-sync/bulk-actions/apply',
  TOGGLE_ADDON:          '/api/v2/vendoremployee/aggregator-sync/bulk-actions/toggle-addon',
  VARIATIONS:            '/api/v2/vendoremployee/aggregator-sync/variations',
  TOGGLE_VARIATION:      '/api/v2/vendoremployee/aggregator-sync/toggle-variation',
};
```

**Risk:** LOW — additive only.

---

### E2 — `api/services/aggregatorConfigService.js` (+7 functions after pushCategoryTimings)

```js
// CR-143: Aggregator Leftover endpoints

/** CR-143 GAP-G: Force-enable all active Swiggy items for this brand */
export const forceSwiggyEnable = async (clientId = null) => {
  const body = clientId ? { client_id: clientId } : {};
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.FORCE_SWIGGY_ENABLE, body);
  return res.data;
};

/** CR-143 GAP-H: List addons with aggregator status */
export const getBulkAddons = async (clientId = null) => {
  const params = clientId ? { client_id: clientId } : {};
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.BULK_ACTIONS_ADDONS, { params });
  return res.data;
};

/** CR-143 GAP-H: Foods using a specific addon on this brand */
export const getBulkAddonItems = async (addonId, clientId = null) => {
  const params = { addon_id: addonId, ...(clientId ? { client_id: clientId } : {}) };
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.BULK_ACTIONS_ITEMS, { params });
  return res.data;
};

/**
 * CR-143 GAP-H: Apply catalog status change
 * ⚠ action: 'enable' | 'out_of_stock'
 * ⚠ Writes add_ons.status RESTAURANT-WIDE regardless of client_id
 */
export const applyBulkAddon = async (addonId, action, clientId = null) => {
  const body = { addon_id: addonId, action };
  if (clientId) body.client_id = clientId;
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.BULK_ACTIONS_APPLY, body);
  return res.data;
};

/** CR-143 GAP-H: Toggle addon on UrbanPiper for this brand */
export const toggleAddonStock = async (addonId, action, clientId = null) => {
  const body = { addon_id: addonId, action };
  if (clientId) body.client_id = clientId;
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.TOGGLE_ADDON, body);
  return res.data;
};

/** CR-143 GAP-I: List items with variations for this brand */
export const getVariations = async (clientId = null) => {
  const params = clientId ? { client_id: clientId } : {};
  const res = await api.get(AGGREGATOR_SYNC_ENDPOINTS.VARIATIONS, { params });
  return res.data;
};

/**
 * CR-143 GAP-I: Toggle a specific variation value on UrbanPiper for this brand
 * OPT-VAR-{foodId}-{varIdx}-{valIdx}
 */
export const toggleVariation = async ({ food_id, variation_index, variation_value_index, action, clientId = null }) => {
  const body = { food_id, variation_index, variation_value_index, action };
  if (clientId) body.client_id = clientId;
  const res = await api.post(AGGREGATOR_SYNC_ENDPOINTS.TOGGLE_VARIATION, body);
  return res.data;
};
```

**Risk:** LOW — additive only.

---

### E3 — `components/settings/aggregatorSetup/SyncCatalogTab.jsx`

Add "Force Enable on Swiggy" ActionCard **between** "Sync Menu to UrbanPiper" and "Clear Store Catalog":

```jsx
{/* CR-143 GAP-G: Force-enable all active Swiggy items */}
<ActionCard
  title="Force Enable All Items on Swiggy"
  desc={`Re-enables all active Swiggy items for ${brandLabel} on UrbanPiper. Use after a store outage or reset.`}
>
  <ActionBtn id="forceSwiggy" label="Force Enable Swiggy →" loading={loading.forceSwiggy}
    onClick={() => run('forceSwiggy',
      () => forceSwiggyEnable(activeClientId),
      (data) => `${data?.data?.total_items ?? 'All'} items enabled on Swiggy`  // OQ-3=A: show count
    )}
  />
</ActionCard>
```

Note: `run()` helper needs signature extension to support dynamic success message from response:  
`run(key, fn, successMsgFn)` where `successMsgFn` receives response data.

**Risk:** LOW — additive card in existing pattern.

---

### E4 — `components/settings/aggregatorSetup/AggregatorSetupView.jsx`

#### E4a — Add 2 imports (after L8 `import CategoryTimingsTab`)
```js
import AddonStockTab    from './AddonStockTab';    // CR-143
import VariationStockTab from './VariationStockTab'; // CR-143
```

#### E4b — Tab bar (after L78 `tab-timings` button)
```jsx
<button data-testid="tab-addon-stock"    style={tabStyle('addon-stock')}    onClick={() => setActiveTab('addon-stock')}>Addon Stock</button>
<button data-testid="tab-variation-stock" style={tabStyle('variation-stock')} onClick={() => setActiveTab('variation-stock')}>Variation Stock</button>
```

#### E4c — Tab renders (after L123 `CategoryTimingsTab` block)
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

---

### E5 — NEW `AddonStockTab.jsx` (~200 lines)

Props: `{ activeClientId, subBrands }`  
State: `addons[]`, `expandedId` (null|id), `addonItems{}`, `loading`

**Key business rule in UI:**
- "Catalog Status" (apply) changes `add_ons.status` restaurant-wide → show warning banner + confirm dialog
- "UrbanPiper Status" (toggle-addon) is per-brand → no warning needed

Layout:
```
⚠ Catalog status changes apply to ALL brands restaurant-wide.
   UrbanPiper toggle is per-brand only.

Brand: [Main ▾]

┌──────────────┬─────┬─────────────────┬───────────────────┐
│ Addon          │ Price│ Catalog (all brands) │ UrbanPiper (this brand)│
├──────────────┼─────┼─────────────────┼───────────────────┤
│ Dark           │ ₹10 │ ● Available  [OOS]  │ [Enable] [Disable]      │
│ extra flesh    │ ₹35 │ ● Available  [OOS]  │ [Enable] [Disable]      │
└──────────────┴─────┴─────────────────┴───────────────────┘

[Expand addon row] → shows which foods use it:
  Used in: Plain Dosa, Masala Dosa, Egg Dosa
```

---

### E6 — NEW `VariationStockTab.jsx` (~220 lines)

Props: `{ activeClientId, subBrands }`  
State: `items[]`, `loading`

Layout:
```
Brand: [Main ▾]

▼ 69 special  (Special)  [Enable All] [Disable All]  ← OQ-2=A: group toggle
  Variation: "choice of"
    ● salsa    ₹0    [Enable] [Disable]
    ● gogo     ₹10   [Enable] [Disable]

▶ Cheese Dosa (Dosa)
```

Group-level buttons call `toggleVariation` for each value in the variation's `values[]` array.

---

## 3. Downstream Consumers (no changes needed)

| Consumer | Why Not Affected |
|---|---|
| `ConfigTab.jsx` | Brand config only |
| `OperationalTab.jsx` | Operational flags only |
| `CategoryTimingsTab.jsx` | Timings only |
| All order/payment flows | No connection to aggregator stock management |

---

## 4. Risk Register

| Risk | Level | Mitigation |
|------|-------|------------|
| `applyBulkAddon` restaurant-wide impact | MEDIUM | Confirm dialog in UI, warning banner |
| SyncCatalogTab `run()` needs dynamic msg | LOW | Update helper signature in same file |
| Tab count grows to 6 — may overflow on small screens | LOW | Tabs scroll horizontally if needed |

---

## 5. Verification Matrix

| # | Edit | File | Verification | Method |
|---|------|------|-------------|--------|
| V1 | E1 | constants.js | 7 new AGGREGATOR_SYNC_ENDPOINTS entries | grep |
| V2 | E2 | aggregatorConfigService.js | forceSwiggyEnable fn | grep |
| V3 | E2 | aggregatorConfigService.js | getBulkAddons fn | grep |
| V4 | E2 | aggregatorConfigService.js | applyBulkAddon fn | grep |
| V5 | E2 | aggregatorConfigService.js | toggleAddonStock fn | grep |
| V6 | E2 | aggregatorConfigService.js | getVariations fn | grep |
| V7 | E2 | aggregatorConfigService.js | toggleVariation fn | grep |
| V8 | E3 | SyncCatalogTab.jsx | Force Enable card visible | Browser |
| V9 | E3 | SyncCatalogTab.jsx | Network: POST force-swiggy-enable | devtools |
| V10 | E3 | SyncCatalogTab.jsx | Toast shows item count | Browser |
| V11 | E4 | AggregatorSetupView.jsx | "Addon Stock" tab visible (Tab 5) | Browser |
| V12 | E4 | AggregatorSetupView.jsx | "Variation Stock" tab visible (Tab 6) | Browser |
| V13 | E5 | AddonStockTab.jsx | Addon list loaded from API | devtools |
| V14 | E5 | AddonStockTab.jsx | OOS confirm dialog appears (restaurant-wide warning) | Browser |
| V15 | E5 | AddonStockTab.jsx | Network: POST bulk-actions/apply for OOS | devtools |
| V16 | E5 | AddonStockTab.jsx | Network: POST bulk-actions/toggle-addon for UP toggle | devtools |
| V17 | E6 | VariationStockTab.jsx | Variation items loaded with values | Browser |
| V18 | E6 | VariationStockTab.jsx | Per-value disable fires POST toggle-variation | devtools |
| V19 | E6 | VariationStockTab.jsx | Group disable fires for each value in group | devtools |
| V20 | Regression | AggregatorSetupView | Tabs 1-4 still work after adding 5-6 | Browser |

---

## 6. Post-Code Registry Checklist
```
- [ ] registry.json: CR-143 → IMPLEMENTED, pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: +6 files
- [ ] Code markers: // CR-143 in every modified file
```

**Code Reality:** NONE  
**Conflict:** CLEAR  
**Risk:** MEDIUM  
**ODs resolved:** OQ-1=A, OQ-2=A, OQ-3=A  
**Owner decisions still needed at Gate 4:** none (ODs adopted)
