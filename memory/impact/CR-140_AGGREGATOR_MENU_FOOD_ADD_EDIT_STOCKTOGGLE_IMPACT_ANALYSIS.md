# CR-140 — Impact Analysis: Aggregator Menu — Food Add/Edit/StockToggle Fix

**Code Reality:** NONE — all 7 gaps unimplemented  
**Conflict Pre-Check:** CLEAR — no other open CR touches target files  
**Gate:** 2 ✅  
**Date:** 2026-08-14  
**Risk:** HIGH  

---

## 1. Data Flow Traces

### 1A. Add Aggregator Food (current broken)
```
User: Add Product in Aggregator tab
  → ProductForm.jsx:521  toAPI.foodInfo({...form, foodFor:'Aggregator'})  [MISSING swiggy/zomato/client]
  → ProductForm.jsx:523  menuService.addFood(foodInfo, image)             [WRONG ENDPOINT]
  → menuManagementService.js:30  POST /product/add-food  (multipart)
  BREAK: food created with food_for=Aggregator but NOT in aggregator system
         swiggy/zomato never set. food invisible in aggregator foods-list.
         False success toast fires.
```

### 1B. Add Aggregator Food (required)
```
User: Add Product in Aggregator tab
  → ProductForm.jsx:521  toAPI.foodInfo({...form, foodFor:'Aggregator', swiggy, zomato, client})
  → NEW conditional: if (isNew && menuType==='Aggregator')
      → menuService.addFoodAggregator(payload)         [NEW SERVICE FN]
      → POST /product/add-food-aggregator  (JSON body)
    else if (!isNew)
      → menuService.editFood(productId, foodInfo)      [existing, payload now includes swiggy/zomato]
```

### 1C. Edit Aggregator Food (current — silent gap)
```
User: Full Edit existing aggregator food
  → fromAPI.food():  swiggy/zomato/clientId/foodStock/turnOnAt NEVER mapped
  → ProductForm init: form.swiggy = undefined, form.zomato = undefined
  → Save: toAPI.foodInfo() omits swiggy/zomato/client fields
  → editFood(): multipart POST /foods/{id} — fields missing but backend preserves existing
  RESULT: edit works for normal fields; platform sync settings unchangeable via UI
```

### 1D. Stock Toggle (required new flow)
```
User: clicks Disable on food card
  → AggregatorStockToggle.jsx: picks timing mode (indefinite/relative/custom)
  → NEW: menuService.aggregatorStockToggle(payload)
      → POST /aggregator-sync/stock-toggle
         { action, item_ids:[food.productId], [client_id], [turn_on_preset|turn_on_at] }
  → ProductCard re-renders: food_stock=0, turn_on_at from response
  [Note: requires fromAPI.food() to map food_stock + turn_on_at]
```

---

## 2. Exact Edit Points

### E1 — `api/constants.js` (+1 constant block)
**Current** (L513-514): `AGGREGATOR_CONFIG_ENDPOINTS` ends, file ends  
**Add after L514:**
```js
// CR-140 + CR-141: Aggregator Sync Operations
export const AGGREGATOR_SYNC_ENDPOINTS = {
  STOCK_TOGGLE:       '/api/v2/vendoremployee/aggregator-sync/stock-toggle',       // CR-140
  SYNC_CATALOG:       '/api/v2/vendoremployee/aggregator-sync/sync-catalog',       // CR-141
  CLEAR_CATALOG:      '/api/v2/vendoremployee/aggregator-sync/clear-catalog',      // CR-141
  CLEAR_MODIFIERS:    '/api/v2/vendoremployee/aggregator-sync/clear-modifiers',    // CR-141
  CATEGORY_TIMINGS:   '/api/v2/vendoremployee/aggregator-sync/category-timings',   // CR-141
  CATEGORY_TIMINGS_PUSH: '/api/v2/vendoremployee/aggregator-sync/category-timings/push', // CR-141
  RESTAURANT_CLIENTS: '/api/v2/vendoremployee/product/restaurant-clients',         // CR-140
};
```
**Risk:** LOW — additive only, zero existing references changed.

---

### E2 — `api/services/menuManagementService.js` (+2 functions)
**Add after existing `addFood()` (L26-33):**

```js
/** CR-140 GAP-1: Add aggregator food — dedicated endpoint, raw JSON body */
export const addFoodAggregator = (payload) =>
  api.post(`${BASE_V2}/add-food-aggregator`, payload);

/** CR-140 GAP-3: Get restaurant clients (sub-brands) for brand selector */
export const getRestaurantClients = () =>
  api.get(AGGREGATOR_SYNC_ENDPOINTS.RESTAURANT_CLIENTS);

/** CR-140 GAP-5: Aggregator stock toggle (enable/disable on UrbanPiper) */
export const aggregatorStockToggle = ({ action, item_ids, client_id, turn_on_preset, turn_on_at }) => {
  const payload = { action, item_ids };
  if (client_id) payload.client_id = client_id;
  if (turn_on_preset) payload.turn_on_preset = turn_on_preset;
  if (turn_on_at) payload.turn_on_at = turn_on_at;
  return api.post(AGGREGATOR_SYNC_ENDPOINTS.STOCK_TOGGLE, payload);
};
```
**Risk:** LOW — additive only.

---

### E3 — `api/transforms/menuManagementTransform.js`

#### E3a — `fromAPI.food()` (L34-118) — add 5 missing fields
After existing `foodFor: api.food_for || 'Normal'` (L82):
```js
// CR-140 GAP-4: Aggregator platform fields
swiggy:     api.swiggy === 'YES',
zomato:     api.zomato === 'YES',
clientId:   api.client_id ?? 0,
foodStock:  api.food_stock ?? 1,  // 1=live on UP, 0=disabled
turnOnAt:   api.turn_on_at || null,
```
**Risk:** LOW — additive fields, no existing consumers depend on these being absent.

#### E3b — `toAPI.foodInfo()` (L225-264) — add 3 aggregator fields
After existing `food_for` line (L232):
```js
// CR-140 GAP-2: Aggregator platform fields — only sent when Aggregator menu type
...(form.foodFor === 'Aggregator' ? {
  swiggy: form.swiggy ? 'YES' : 'NO',
  zomato: form.zomato ? 'YES' : 'NO',
  client: form.clientId ?? 0,
} : {}),
```
**Risk:** LOW — conditional spread. Normal foods path unchanged (no extra fields sent).

---

### E4 — `components/panels/menu/ProductForm.jsx`

#### E4a — State init: add swiggy/zomato/clientId to `useEffect` (L213-280)
**When editing (product exists), add:**
```js
swiggy:   product.swiggy ?? true,
zomato:   product.zomato ?? true,
clientId: product.clientId ?? 0,
```
**When new, add:**
```js
swiggy: true,
zomato: true,
clientId: 0,
```

#### E4b — New "Platform Sync" section in JSX (before Basic Info, L302)
*Rendered only when `menuType === 'Aggregator'`*
```jsx
{menuType === 'Aggregator' && (
  <Section title="Platform Sync" defaultOpen={true}>
    <div className="pt-2">
      <ToggleField label="Swiggy" checked={form.swiggy} onChange={v => update('swiggy', v)} />
      <ToggleField label="Zomato" checked={form.zomato} onChange={v => update('zomato', v)} />
      {/* Brand selector — populated from clients prop */}
      <SelectField label="Brand" value={form.clientId} onChange={v => update('clientId', Number(v))}
        options={[{value:0, label:'Main Brand'}, ...(clients||[]).map(c=>({value:c.id,label:c.name}))]} />
    </div>
  </Section>
)}
```

#### E4c — Save path: conditional endpoint dispatch (L519-526)
```js
const foodInfo = toAPI.foodInfo({ ...form, foodFor: menuType || 'Normal', ... });
if (isNew) {
  if (menuType === 'Aggregator') {
    await menuService.addFoodAggregator(foodInfo);  // CR-140 GAP-1
  } else {
    await menuService.addFood(foodInfo, form.imageFile);
  }
} else {
  await menuService.editFood(product.productId, foodInfo, form.imageFile);
}
```

#### E4d — Props signature: add `clients` prop
```js
const ProductForm = ({ product, categories, addons, currencySymbol, menuType, clients, onBack, onSave, onRefreshAddons })
```
**Risk:** MEDIUM — ProductForm is used in multiple places. Prop is optional (defaults gracefully to empty).

---

### E5 — `components/panels/menu/ProductCard.jsx`

#### E5a — ChannelChip row (L290-299): conditional for aggregator
```jsx
{menuType === 'Aggregator' ? (
  // Aggregator: show platform pills instead of channel chips
  <>
    <ChannelChip label="Swiggy" active={product.swiggy} />
    <ChannelChip label="Zomato" active={product.zomato} />
    {product.foodStock === 0 && (
      <span className="text-xs px-1.5 py-0.5 rounded" style={{...amber badge...}}>
        Offline{product.turnOnAt ? ` · ${formatTurnOnAt(product.turnOnAt)}` : ''}
      </span>
    )}
  </>
) : (
  // Normal: existing channel chips
  <>
    <ChannelChip label="Dine-In" active={product.availability?.dineIn} />
    ...
  </>
)}
```

#### E5b — Action buttons (L307-341): add stock toggle button for aggregator
```jsx
{menuType === 'Aggregator' && (
  <AggregatorStockToggle
    product={product}
    onToggle={(payload) => onStockToggle(payload)}
  />
)}
```

#### E5c — Props: add `menuType` + `onStockToggle`
**Risk:** MEDIUM — ProductCard is widely used. All new props optional with defaults.

---

### E6 — `components/panels/menu/BulkEditor.jsx`

#### E6a — `buildRow()` (L83): add aggregator fields
```js
swiggy:   f.swiggy ? 'Yes' : 'No',
zomato:   f.zomato ? 'Yes' : 'No',
clientId: f.clientId ?? 0,
```

#### E6b — `buildPayload()` (L130): add conditional fields
```js
...(row.foodFor === 'Aggregator' ? {
  swiggy: row.swiggy === 'Yes' ? 'YES' : 'NO',
  zomato: row.zomato === 'Yes' ? 'YES' : 'NO',
  client: row.clientId ?? 0,
} : {}),
```

#### E6c — `ALL_COLUMNS` (L18): inject aggregator columns when `menuType==='Aggregator'`
`ALL_COLUMNS` is currently a static array. Change to a function/computed:
```js
const getColumns = (menuType) => [
  ...BASE_COLUMNS,
  ...(menuType === 'Aggregator' ? [
    { key: 'swiggy',   label: 'Swiggy',  type: 'yesno',    width: 80, tier: 1 },
    { key: 'zomato',   label: 'Zomato',  type: 'yesno',    width: 80, tier: 1 },
    { key: 'clientId', label: 'Brand',   type: 'dropdown', width: 120, tier: 1 },
  ] : []),
];
```
**Risk:** MEDIUM — `ALL_COLUMNS` referenced in ~8 places inside BulkEditor. All switch to `getColumns(menuType)`. No external consumers.

---

### E7 — `components/panels/MenuManagementPanel.jsx` (+clients fetch)
```js
const [clients, setClients] = useState([]);

// Fetch clients when aggregator tab selected
useEffect(() => {
  if (menuType === 'Aggregator') {
    menuService.getRestaurantClients()
      .then(res => setClients(res.data?.clients || []))
      .catch(() => setClients([]));
  } else {
    setClients([]);
  }
}, [menuType]);

// Pass clients to ProductList and BulkEditor
<ProductList ... clients={clients} />
<BulkEditor ... clients={clients} />
```

---

### E8 — NEW `components/panels/menu/AggregatorStockToggle.jsx`
Self-contained popover component:
- Props: `product` (needs `productId`, `clientId`, `foodStock`, `turnOnAt`), `onToggle(payload)`
- State: `open` (popover), `selectedMode` ('indefinite'|'30m'|'1h'|'2h'|'6h'|'12h'|'1d'|'7d'|'custom'), `customDate`
- Renders: trigger button + timing picker popover
- No external dependencies beyond lucide-react and existing UI primitives

---

## 3. Owner Decisions

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| **OD-1** | QuickEditForm for aggregator: show platform fields or hide quick edit entirely? | A: show compact swiggy/zomato/brand row in QuickEdit; B: disable QuickEdit for aggregator items | Affects QuickEditForm JSX complexity |
| **OD-2** | BulkEditor + addFoodAggregator: when adding new row in BulkEditor in Aggregator mode, use add-food-aggregator endpoint? | A: yes (consistent); B: no (add-food-aggregator not needed for bulk) | Affects BulkEditor save path |
| **OD-3** | Stock toggle: should it work on multiple selected items at once (bulk toggle)? | A: per-row only; B: add multi-select + bulk toggle | Scope impact significant |

---

## 4. Downstream Consumers (no changes needed)

| Consumer | Why Not Affected |
|----------|------------------|
| `orderTransform.js` | No aggregator food data |
| `CollectPaymentPanel.jsx` | No aggregator food data |
| `DashboardPage.jsx` | Aggregator orders, not menu management |
| `aggregatorService.js` | Order lifecycle, separate |
| `ConfigTab.jsx` / `OperationalTab.jsx` | Different aggregator namespace |

---

## 5. Verification Matrix (seeds QA handover)

| Edit | File | Change | How to Verify |
|------|------|--------|---------------|
| E1 | constants.js | AGGREGATOR_SYNC_ENDPOINTS | grep/code check |
| E2 | menuManagementService.js | addFoodAggregator | Network tab: POST add-food-aggregator |
| E2 | menuManagementService.js | getRestaurantClients | Network tab: GET restaurant-clients |
| E2 | menuManagementService.js | aggregatorStockToggle | Network tab: POST stock-toggle |
| E3a | menuManagementTransform.js | fromAPI.food +5 fields | Console: log product after fetch |
| E3b | menuManagementTransform.js | toAPI.foodInfo +3 fields | Network tab: add-food-aggregator payload |
| E4b | ProductForm.jsx | Platform Sync section visible | Browser: add product in Aggregator tab |
| E4b | ProductForm.jsx | Platform Sync section hidden | Browser: add product in Normal tab |
| E4c | ProductForm.jsx | addFoodAggregator called | Network tab: add in Aggregator mode |
| E4c | ProductForm.jsx | addFood called | Network tab: add in Normal mode |
| E5a | ProductCard.jsx | Swiggy/Zomato chips in Aggregator | Browser: aggregator food list |
| E5a | ProductCard.jsx | Dine-In/Delivery chips in Normal | Browser: normal food list |
| E5b | ProductCard.jsx | Stock toggle button visible | Browser: aggregator food card |
| E6 | BulkEditor.jsx | swiggy/zomato/brand columns visible | Browser: bulk edit in Aggregator mode |
| E7 | MenuManagementPanel.jsx | clients fetched | Network tab: GET restaurant-clients |
| E8 | AggregatorStockToggle.jsx | Disable popover opens | Browser: click disable |
| E8 | AggregatorStockToggle.jsx | 2h preset sends turn_on_preset | Network tab: stock-toggle payload |
| E8 | AggregatorStockToggle.jsx | Enable sends action:enable | Network tab: stock-toggle payload |

---

## 6. Post-Code Registry Checklist
```
- [ ] registry.json: CR-140 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: +8 files listed
- [ ] Code markers: // CR-140 in every modified file
```

**Code Reality:** NONE  
**Conflict Pre-Check:** CLEAR  
**Risk:** HIGH (menu write path, platform sync)  
**Owner Decisions needed:** OD-1, OD-2, OD-3  
