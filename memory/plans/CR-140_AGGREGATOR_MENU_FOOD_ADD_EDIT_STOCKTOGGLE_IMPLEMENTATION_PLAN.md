# CR-140 — Implementation Plan: Aggregator Menu — Food Add/Edit/StockToggle

**Gate:** 3 ✅  
**Date:** 2026-08-14  
**Risk:** HIGH  
**Starting state verified:** YES — all file lines match Impact Analysis  

---

## OD Defaults Adopted (no owner response — reasonable defaults applied)

| OD | Decision | Default Used |
|---|---|---|
| OD-1 | QuickEdit for aggregator | **A** — show compact swiggy/zomato/brand row |
| OD-2 | BulkEditor new row | **A** — use add-food-aggregator endpoint |
| OD-3 | Stock toggle scope | **A** — per-row only |

Owner can override at Gate 4.

---

## Scope Lock

**Files WILL change:**
1. `src/api/constants.js`
2. `src/api/services/menuManagementService.js`
3. `src/api/transforms/menuManagementTransform.js`
4. `src/components/panels/menu/ProductForm.jsx`
5. `src/components/panels/menu/ProductCard.jsx`
6. `src/components/panels/menu/ProductList.jsx`
7. `src/components/panels/menu/BulkEditor.jsx`
8. `src/components/panels/MenuManagementPanel.jsx`

**Files WILL NOT touch:**
`orderTransform.js`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx`, `OrderEntry.jsx`,
`aggregatorService.js`, `aggregatorTransform.js`, `AggregatorSetupView.jsx`,
`ConfigTab.jsx`, `OperationalTab.jsx`

**New files:**
- `src/components/panels/menu/AggregatorStockToggle.jsx`

---

## Execution Sequence

```
E1 → constants.js          (additive — no risk)
E2 → menuManagementService (additive — no risk)
E3 → menuManagementTransform (small additions)
E4 → AggregatorStockToggle.jsx (NEW — isolated)
E5 → ProductCard.jsx        (uses E4)
E6 → ProductForm.jsx        (uses E2/E3)
E7 → ProductList.jsx        (passes clients through)
E8 → BulkEditor.jsx         (uses E2/E3)
E9 → MenuManagementPanel.jsx (uses E2, passes to E7/E8)
COMPILE CHECK after E9
```

---

## E1 — `src/api/constants.js`

**After line 514** (end of file, after AGGREGATOR_CANCEL_REASONS closing `];`):

```js
// CR-140 + CR-141: Aggregator Sync Operations endpoints
export const AGGREGATOR_SYNC_ENDPOINTS = {
  STOCK_TOGGLE:          '/api/v2/vendoremployee/aggregator-sync/stock-toggle',        // CR-140
  SYNC_CATALOG:          '/api/v2/vendoremployee/aggregator-sync/sync-catalog',        // CR-141
  CLEAR_CATALOG:         '/api/v2/vendoremployee/aggregator-sync/clear-catalog',       // CR-141
  CLEAR_MODIFIERS:       '/api/v2/vendoremployee/aggregator-sync/clear-modifiers',     // CR-141
  CATEGORY_TIMINGS:      '/api/v2/vendoremployee/aggregator-sync/category-timings',    // CR-141
  CATEGORY_TIMINGS_PUSH: '/api/v2/vendoremployee/aggregator-sync/category-timings/push', // CR-141
  RESTAURANT_CLIENTS:    '/api/v2/vendoremployee/product/restaurant-clients',          // CR-140
};
```

**Verify:** `grep -n "AGGREGATOR_SYNC_ENDPOINTS" src/api/constants.js` → 1 hit

---

## E2 — `src/api/services/menuManagementService.js`

**Import addition** — top of file, add to existing import:
```js
import { AGGREGATOR_SYNC_ENDPOINTS } from '../constants'; // CR-140
```

**After line 33** (after `addFood` closing `};`):

```js
/** CR-140 GAP-1: Add aggregator food — dedicated endpoint, JSON body (not multipart) */
export const addFoodAggregator = (payload) =>
  api.post(`${BASE_V2}/add-food-aggregator`, payload); // CR-140

/** CR-140 GAP-3: Fetch restaurant clients (sub-brands) for brand selector */
export const getRestaurantClients = () =>
  api.get(AGGREGATOR_SYNC_ENDPOINTS.RESTAURANT_CLIENTS); // CR-140

/** CR-140 GAP-5: Aggregator stock toggle via UrbanPiper */
export const aggregatorStockToggle = ({ action, item_ids, client_id, turn_on_preset, turn_on_at }) => {
  const payload = { action, item_ids };
  if (client_id)       payload.client_id       = client_id;
  if (turn_on_preset)  payload.turn_on_preset   = turn_on_preset;
  if (turn_on_at)      payload.turn_on_at       = turn_on_at;
  return api.post(AGGREGATOR_SYNC_ENDPOINTS.STOCK_TOGGLE, payload); // CR-140
};
```

**Verify:** 3 new exports visible in file.

---

## E3 — `src/api/transforms/menuManagementTransform.js`

### E3a — `fromAPI.food()` — after line 82

Current line 82: `foodFor: api.food_for || 'Normal',`

**Insert after line 82:**
```js
    // CR-140 GAP-4: Aggregator platform fields
    swiggy:     api.swiggy === 'YES',
    zomato:     api.zomato === 'YES',
    clientId:   api.client_id ?? 0,
    foodStock:  api.food_stock ?? 1,   // 1 = live on UrbanPiper, 0 = disabled
    turnOnAt:   api.turn_on_at || null,
```

### E3b — `toAPI.foodInfo()` — after line 232

Current line 232: `food_for: form.foodFor || 'Normal',`

**Insert after line 232:**
```js
    // CR-140 GAP-2: Aggregator platform fields — conditional spread
    ...(form.foodFor === 'Aggregator' ? {
      swiggy: form.swiggy !== false ? 'YES' : 'NO',
      zomato: form.zomato !== false ? 'YES' : 'NO',
      client: form.clientId ?? 0,
    } : {}), // CR-140
```

**Verify:** `grep -n "swiggy\|zomato\|clientId\|foodStock\|turnOnAt" src/api/transforms/menuManagementTransform.js` → 10 hits

---

## E4 — NEW `src/components/panels/menu/AggregatorStockToggle.jsx`

Full new file (~120 lines):

```jsx
// CR-140 GAP-5: Per-row aggregator stock toggle with timing picker
import { useState, useRef, useEffect } from 'react';
import { COLORS } from '../../../constants';
import { useToast } from '../../../hooks/use-toast';
import * as menuService from '../../../api/services/menuManagementService';

const PRESETS = [
  { label: 'Indefinitely', value: null },
  { label: '30 minutes',   value: '30m' },
  { label: '1 hour',       value: '1h' },
  { label: '2 hours',      value: '2h' },
  { label: '6 hours',      value: '6h' },
  { label: '12 hours',     value: '12h' },
  { label: '1 day',        value: '1d' },
  { label: '7 days',       value: '7d' },
];

const formatTurnOnAt = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return iso; }
};

const AggregatorStockToggle = ({ product, onToggleDone }) => {
  const { toast } = useToast();
  const [open, setOpen]         = useState(false);
  const [mode, setMode]         = useState(null);       // null = indefinite
  const [customDt, setCustomDt] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef(null);

  const isLive = (product.foodStock ?? 1) === 1;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDisable = async () => {
    if (mode === 'custom' && !customDt) return;
    setLoading(true);
    try {
      const payload = {
        action: 'disable',
        item_ids: [product.productId],
        ...(product.clientId ? { client_id: product.clientId } : {}),
        ...(mode === 'custom'
          ? { turn_on_at: new Date(customDt).getTime() }
          : mode ? { turn_on_preset: mode } : {}),
      };
      await menuService.aggregatorStockToggle(payload);
      toast({ title: 'Disabled', description: mode ? `Item back online in ${PRESETS.find(p=>p.value===mode)?.label || 'custom time'}` : 'Item disabled indefinitely' });
      setOpen(false);
      if (onToggleDone) onToggleDone();
    } catch (err) {
      toast({ title: 'Error', description: err.readableMessage || 'Toggle failed', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      await menuService.aggregatorStockToggle({
        action: 'enable',
        item_ids: [product.productId],
        ...(product.clientId ? { client_id: product.clientId } : {}),
      });
      toast({ title: 'Enabled', description: 'Item is live on Swiggy/Zomato' });
      setOpen(false);
      if (onToggleDone) onToggleDone();
    } catch (err) {
      toast({ title: 'Error', description: err.readableMessage || 'Toggle failed', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        data-testid={`stock-toggle-${product.productId}`}
        style={{
          padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          background: isLive ? 'rgba(22,163,74,.1)' : 'rgba(245,158,11,.1)',
          color: isLive ? '#15803d' : '#92400e',
          border: `1px solid ${isLive ? 'rgba(22,163,74,.25)' : 'rgba(245,158,11,.3)'}`,
        }}
      >
        {isLive ? '● Live ▾' : `○ Offline ▾`}
      </button>

      {open && isLive && (
        <div style={{ position: 'absolute', right: 0, top: 26, zIndex: 999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, width: 210, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>Disable on UrbanPiper</div>
          {PRESETS.map(p => (
            <label key={p.value ?? 'indef'} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 12, color: '#334155' }}>
              <input type="radio" name={`mode-${product.productId}`} checked={mode === p.value && !showCustom} onChange={() => { setMode(p.value); setShowCustom(false); }} style={{ accentColor: COLORS.primaryOrange }} />
              {p.label}
            </label>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 12, color: '#334155' }}>
            <input type="radio" name={`mode-${product.productId}`} checked={showCustom} onChange={() => { setShowCustom(true); setMode('custom'); }} style={{ accentColor: COLORS.primaryOrange }} />
            Custom date/time →
          </label>
          {showCustom && (
            <input type="datetime-local" value={customDt} onChange={e => setCustomDt(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11, marginTop: 6 }} />
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, cursor: 'pointer', background: '#fff', color: '#64748b' }}>Cancel</button>
            <button onClick={handleDisable} disabled={loading} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#dc2626', color: '#fff', opacity: loading ? .6 : 1 }}>
              {loading ? '…' : 'Disable'}
            </button>
          </div>
        </div>
      )}

      {open && !isLive && (
        <div style={{ position: 'absolute', right: 0, top: 26, zIndex: 999, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, width: 190, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Item is offline</div>
          {product.turnOnAt && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>Back at: {formatTurnOnAt(product.turnOnAt)}</div>}
          <button onClick={handleEnable} disabled={loading} style={{ width: '100%', padding: '8px 0', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: COLORS.primaryGreen, color: '#fff' }}>
            {loading ? '…' : 'Enable Now'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AggregatorStockToggle;
```

---

## E5 — `src/components/panels/menu/ProductCard.jsx`

### E5a — Import AggregatorStockToggle (after existing imports, before `const getFoodDot`)

```js
import AggregatorStockToggle from './AggregatorStockToggle'; // CR-140
```

### E5b — Props signature (line 229-234)

**Current:**
```js
const ProductCard = ({
  product, categoryName, currencySymbol, categories, deleteReasons,
  isDragging, dragHandleProps,
  isQuickEditing, onQuickEdit, onFullEdit, onDelete, onStatusToggle,
  onQuickSave, onQuickCancel,
}) => {
```

**Replace with:**
```js
const ProductCard = ({
  product, categoryName, currencySymbol, categories, deleteReasons,
  isDragging, dragHandleProps,
  isQuickEditing, onQuickEdit, onFullEdit, onDelete, onStatusToggle,
  onQuickSave, onQuickCancel,
  menuType, onStockToggleDone, // CR-140
}) => {
```

### E5c — Chip row (lines 290-299)

**Current:**
```jsx
          <div className="flex flex-wrap gap-1">
            <ChannelChip label="Dine-In" active={product.availability?.dineIn} />
            <ChannelChip label="Delivery" active={product.availability?.delivery} />
            <ChannelChip label="Takeaway" active={product.availability?.takeaway} />
            {product.isInventory && ...}
            {product.packedFood && ...}
            {product.isOutOfStock && ...}
            {product.isDisabled && ...}
            {product.taxCalc === 'Inclusive' && ...}
          </div>
```

**Replace with:**
```jsx
          <div className="flex flex-wrap gap-1">
            {menuType === 'Aggregator' ? ( // CR-140
              <>
                <ChannelChip label="Swiggy" active={product.swiggy} />
                <ChannelChip label="Zomato" active={product.zomato} />
                {product.foodStock === 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(245,158,11,.08)', color: '#d97706', border: '1px solid rgba(245,158,11,.2)' }}>
                    Offline{product.turnOnAt ? ` · Back at ${new Date(product.turnOnAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}` : ''}
                  </span>
                )}
              </>
            ) : (
              <>
                <ChannelChip label="Dine-In" active={product.availability?.dineIn} />
                <ChannelChip label="Delivery" active={product.availability?.delivery} />
                <ChannelChip label="Takeaway" active={product.availability?.takeaway} />
              </>
            )}
            {product.isInventory && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}>Inventory</span>}
            {product.packedFood && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}>Packaged</span>}
            {product.isOutOfStock && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>Out of Stock</span>}
            {product.isDisabled && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(148,163,184,0.15)", color: "#64748B", border: "1px solid rgba(148,163,184,0.2)" }}>Hidden</span>}
            {product.taxCalc === 'Inclusive' && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(148,163,184,0.08)", color: "#94A3B8", border: "1px solid rgba(148,163,184,0.15)" }}>Tax Incl.</span>}
          </div>
```

### E5d — Action buttons: add stock toggle before price (line 303 right-side div)

**Current** (line 303-306):
```jsx
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-bold min-w-[60px] text-right" style={{ color: product.isActive ? COLORS.darkText : "#94A3B8" }}>
            {currencySymbol}{product.basePrice}
          </span>
```

**Replace with:**
```jsx
        <div className="flex items-center gap-3 flex-shrink-0">
          {menuType === 'Aggregator' && ( // CR-140
            <AggregatorStockToggle product={product} onToggleDone={onStockToggleDone} />
          )}
          <span className="text-sm font-bold min-w-[60px] text-right" style={{ color: product.isActive ? COLORS.darkText : "#94A3B8" }}>
            {currencySymbol}{product.basePrice}
          </span>
```

### E5e — QuickEditForm (OD-1=A): add platform row when aggregator

After line 57 (end of QuickEditForm state init), add compact platform row before Row 1:

Inside `QuickEditForm`, the form state init (line 27-57) — **add to initial state:**
```js
    swiggy:   product.swiggy !== false,
    zomato:   product.zomato !== false,
    clientId: product.clientId ?? 0,
```

Before `{/* Row 1: Name + Sold By */}` in JSX, **add:**
```jsx
      {/* Aggregator: Platform Sync row — CR-140 OD-1=A */}
      {menuType === 'Aggregator' && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Swiggy</label>
            <select value={form.swiggy ? 'yes' : 'no'} onChange={e => update('swiggy', e.target.value === 'yes')}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white" style={{ borderColor: COLORS.borderGray }}>
              <option value="yes">Yes</option><option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Zomato</label>
            <select value={form.zomato ? 'yes' : 'no'} onChange={e => update('zomato', e.target.value === 'yes')}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white" style={{ borderColor: COLORS.borderGray }}>
              <option value="yes">Yes</option><option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Brand</label>
            <select value={form.clientId ?? 0} onChange={e => update('clientId', Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white" style={{ borderColor: COLORS.borderGray }}>
              <option value={0}>Main</option>
              {(clients||[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}
```

Also add `menuType` + `clients` to QuickEditForm props:
```js
const QuickEditForm = ({ product, categories, currencySymbol, onSave, onCancel, menuType, clients })
```

---

## E6 — `src/components/panels/menu/ProductForm.jsx`

### E6a — Props (line 203)

**Current:** `const ProductForm = ({ product, categories, addons: allAddons, currencySymbol, menuType, onBack, onSave, onRefreshAddons }) =>`

**Replace with:**
```js
const ProductForm = ({ product, categories, addons: allAddons, currencySymbol, menuType, clients, onBack, onSave, onRefreshAddons }) => // CR-140
```

### E6b — State init EDIT (line 216 block, inside `if (product)`)

After existing `imagePreview: product.productImage || null,` line, **add before `});`:**
```js
        // CR-140 GAP-3/7: Aggregator platform fields
        swiggy:   product.swiggy !== false,
        zomato:   product.zomato !== false,
        clientId: product.clientId ?? 0,
```

### E6c — State init NEW (line 263, inside `} else {`)

After existing `imageFile: null, imagePreview: null,` line, **add before `});`:**
```js
        // CR-140 GAP-2: Aggregator defaults for new items
        swiggy: true, zomato: true, clientId: 0,
```

### E6d — Platform Sync section in JSX

**Before** `{/* ── Pricing & Tax */}` (line 350), **add:**
```jsx
        {/* ── Aggregator: Platform Sync ─────────────────────── CR-140 */}
        {menuType === 'Aggregator' && (
          <Section title="Platform Sync" defaultOpen={true}>
            <div className="pt-2">
              <ToggleField label="Swiggy" checked={form.swiggy} onChange={v => update('swiggy', v)}
                description="Show on Swiggy" />
              <ToggleField label="Zomato" checked={form.zomato} onChange={v => update('zomato', v)}
                description="Show on Zomato" />
              <SelectField label="Brand" value={form.clientId} onChange={v => update('clientId', Number(v))}
                options={[{ value: 0, label: 'Main Brand' }, ...(clients || []).map(c => ({ value: c.id, label: c.name }))]} />
            </div>
          </Section>
        )}
```

### E6e — Save path (lines 521-526)

**Current:**
```js
              const foodInfo = toAPI.foodInfo({ ...form, foodFor: menuType || 'Normal', addonIds: selectedAddonIds, variations: variations });
              if (isNew) {
                await menuService.addFood(foodInfo, form.imageFile);
              } else {
                await menuService.editFood(product.productId, foodInfo, form.imageFile);
              }
```

**Replace with:**
```js
              const foodInfo = toAPI.foodInfo({ ...form, foodFor: menuType || 'Normal', addonIds: selectedAddonIds, variations: variations });
              if (isNew) {
                if (menuType === 'Aggregator') {
                  await menuService.addFoodAggregator(foodInfo); // CR-140 GAP-1
                } else {
                  await menuService.addFood(foodInfo, form.imageFile);
                }
              } else {
                await menuService.editFood(product.productId, foodInfo, form.imageFile);
              }
```

---

## E7 — `src/components/panels/menu/ProductList.jsx`

### E7a — Props (line 26)

**Current:** `const ProductList = ({ foods, categories, addons, selectedCategoryId, deleteReasons, menuType, onRefresh, onRefreshAddons }) =>`

**Replace with:**
```js
const ProductList = ({ foods, categories, addons, selectedCategoryId, deleteReasons, menuType, clients, onRefresh, onRefreshAddons }) => // CR-140
```

### E7b — Pass `clients` + `menuType` to ProductForm (line 140-153)

**Current:**
```jsx
      <ProductForm
        product={editingProduct === "new" ? null : editingProduct}
        categories={categories}
        addons={addons}
        currencySymbol={currencySymbol}
        menuType={menuType}
        onBack={() => setEditingProduct(null)}
        onSave={() => { ... }}
        onRefreshAddons={onRefreshAddons}
      />
```

**Add `clients` prop:**
```jsx
      <ProductForm
        product={editingProduct === "new" ? null : editingProduct}
        categories={categories}
        addons={addons}
        currencySymbol={currencySymbol}
        menuType={menuType}
        clients={clients}  {/* CR-140 */}
        onBack={() => setEditingProduct(null)}
        onSave={() => { setEditingProduct(null); setTimeout(() => onRefresh(), 500); }}
        onRefreshAddons={onRefreshAddons}
      />
```

### E7c — Pass `menuType` + `onStockToggleDone` + `clients` to ProductCard (line 249-265)

**Add to existing ProductCard props:**
```jsx
                          menuType={menuType}           {/* CR-140 */}
                          clients={clients}             {/* CR-140 */}
                          onStockToggleDone={onRefresh} {/* CR-140 */}
```

### E7d — Pass `clients` to QuickEditForm via handleQuickSave

QuickEditForm is called in ProductCard — it needs `menuType` and `clients`. Add to ProductCard call:
```jsx
                          menuType={menuType}  {/* already added above */}
```

Also update `handleQuickSave` to pass swiggy/zomato/clientId through `formData`:
```js
  const handleQuickSave = useCallback(async (product, formData) => {
    try {
      const foodInfo = toAPI.foodInfo({ ...formData, foodFor: menuType });
      await menuService.editFood(product.productId, foodInfo);
      // existing code...
```
*(No change needed — `formData` now includes swiggy/zomato/clientId from QuickEditForm state)*

---

## E8 — `src/components/panels/menu/BulkEditor.jsx`

### E8a — Convert `ALL_COLUMNS` static array to function (line 18)

**Current:** `const ALL_COLUMNS = [`

**Strategy:** Keep static `BASE_COLUMNS` for all non-aggregator columns. Add `getColumns(menuType)` that appends aggregator columns. Replace all `ALL_COLUMNS` references with `getColumns(menuType)` inside the component.

**Replace** `const ALL_COLUMNS = [` ... `];` with:

```js
const BASE_COLUMNS = [
  // (exact same content as current ALL_COLUMNS — no changes)
  ...
];

// CR-140 GAP-6: Aggregator-specific columns injected when menuType==='Aggregator'
const AGGR_COLUMNS = [
  { key: 'swiggy',    label: 'Swiggy',  type: 'yesno',    width: 80,  tier: 1 },
  { key: 'zomato',    label: 'Zomato',  type: 'yesno',    width: 80,  tier: 1 },
  { key: 'clientId',  label: 'Brand',   type: 'dropdown', width: 120, tier: 1 },
];

const getColumns = (menuType) =>
  menuType === 'Aggregator' ? [...BASE_COLUMNS, ...AGGR_COLUMNS] : BASE_COLUMNS;
```

**Replace all 4 internal `ALL_COLUMNS` references** in BulkEditor with `getColumns(menuType)`:
- Line 178: `const [visibleCols, setVisibleCols] = useState(() => getColumns(menuType).reduce(...))`
- Line 303: `const isRowDirty = useCallback((row) => getColumns(menuType).some(...))`
- Line 638: `const tierCols = getColumns(menuType).filter(...)`
- Line 647: `const activeColumns = getColumns(menuType).filter(...)`

### E8b — `buildRow()` (line 83): add aggregator fields after `foodFor: f.foodFor || "Normal"`

```js
  // CR-140 GAP-6
  swiggy:    f.swiggy    ? 'Yes' : 'No',
  zomato:    f.zomato    ? 'Yes' : 'No',
  clientId:  f.clientId  ?? 0,
```

### E8c — `buildPayload()` (line 130): add conditional after `food_for: row.foodFor || "Normal"`

```js
  // CR-140 GAP-6: aggregator platform fields
  ...(row.foodFor === 'Aggregator' ? {
    swiggy:  row.swiggy  === 'Yes' ? 'YES' : 'NO',
    zomato:  row.zomato  === 'Yes' ? 'YES' : 'NO',
    client:  row.clientId ?? 0,
  } : {}),
```

### E8d — Column renderer: handle 'dropdown' type for clientId

In the cell renderer (where `col.type === 'dropdown'`), add clientId options:
```js
// In dropdown cell render — add clientId handling:
const dropdownOptions = col.key === 'clientId'
  ? [{ value: 0, label: 'Main Brand' }, ...(clients||[]).map(c => ({ value: c.id, label: c.name }))]
  : col.key === 'categoryId' ? catOptions
  : col.key === 'itemType'   ? ITEM_TYPE_OPTIONS
  : col.key === 'itemUnit'   ? UNIT_OPTIONS
  : [];
```

### E8e — BulkEditor component + save path (OD-2=A)

Props add `clients`:
```js
const BulkEditor = ({ foods = [], categories = [], menuType = "Normal", clients = [], isLoading = false, onRefresh, onClose }) => // CR-140
```

Save path — when `row._isNew && menuType === 'Aggregator'`:
```js
// In handleSaveRow (around line 500-510):
if (row._isNew && menuType === 'Aggregator') {
  await menuService.addFoodAggregator(payload); // CR-140 OD-2=A
} else if (row._isNew) {
  await menuService.addFood(payload);
} else {
  await menuService.editFood(row._id, payload);
}
```

---

## E9 — `src/components/panels/MenuManagementPanel.jsx`

### E9a — Add clients state (after line 22 `const [addons, setAddons] = useState([]);`)

```js
  const [clients, setClients] = useState([]); // CR-140
```

### E9b — fetchClients (after fetchAddons, before useEffect)

```js
  // CR-140: Fetch restaurant clients (sub-brands) when Aggregator tab selected
  const fetchClients = useCallback(async () => {
    try {
      const res = await menuService.getRestaurantClients();
      setClients(res.data?.clients || []);
    } catch {
      setClients([]);
    }
  }, []);
```

### E9c — Trigger fetchClients on menuType change (add to existing useEffect at line 94)

```js
  useEffect(() => {
    if (isOpen) {
      fetchFoods();
      if (menuType === 'Aggregator') fetchClients(); // CR-140
      else setClients([]);
    }
  }, [isOpen, fetchFoods, fetchClients, menuType]);
```

### E9d — Pass clients to BulkEditor (line 181-189)

```jsx
          <BulkEditor
            foods={foods}
            categories={categoriesWithCounts}
            menuType={menuType}
            clients={clients}   {/* CR-140 */}
            isLoading={loading}
            onRefresh={fetchFoods}
            onClose={() => setBulkEditMode(false)}
          />
```

### E9e — Pass clients to ProductList (line 208-218)

```jsx
            <ProductList
              foods={foods}
              categories={categoriesWithCounts}
              addons={addons}
              selectedCategoryId={selectedCategoryId}
              deleteReasons={deleteReasons}
              menuType={menuType}
              clients={clients}   {/* CR-140 */}
              onRefresh={fetchFoods}
              onRefreshAddons={fetchAddons}
            />
```

---

## Verification Matrix

| # | Edit | File | Verification | Method |
|---|------|------|-------------|--------|
| V1 | E1 | constants.js | AGGREGATOR_SYNC_ENDPOINTS exported | grep |
| V2 | E2 | menuManagementService.js | addFoodAggregator exists | grep |
| V3 | E2 | menuManagementService.js | getRestaurantClients exists | grep |
| V4 | E2 | menuManagementService.js | aggregatorStockToggle exists | grep |
| V5 | E3a | menuManagementTransform.js | swiggy/zomato/clientId/foodStock/turnOnAt in fromAPI | grep |
| V6 | E3b | menuManagementTransform.js | conditional spread in toAPI.foodInfo | grep |
| V7 | E4 | AggregatorStockToggle.jsx | file exists | ls |
| V8 | E5c | ProductCard.jsx | Swiggy/Zomato chips when menuType=Aggregator | browser |
| V9 | E5d | ProductCard.jsx | Stock toggle button visible on aggregator cards | browser |
| V10 | E6d | ProductForm.jsx | Platform Sync section visible in Aggregator mode | browser |
| V11 | E6d | ProductForm.jsx | Platform Sync section absent in Normal mode | browser |
| V12 | E6e | ProductForm.jsx | Network: add-food-aggregator called in Aggregator mode | devtools |
| V13 | E6e | ProductForm.jsx | Network: add-food called in Normal mode | devtools |
| V14 | E6e | ProductForm.jsx | Payload includes swiggy/zomato/client | devtools |
| V15 | E8 | BulkEditor.jsx | Swiggy/Zomato/Brand columns visible in Aggregator mode | browser |
| V16 | E8 | BulkEditor.jsx | Columns absent in Normal mode | browser |
| V17 | E9 | MenuManagementPanel.jsx | Network: GET restaurant-clients when Aggregator tab | devtools |
| V18 | E4 | AggregatorStockToggle.jsx | Disable popover opens | browser |
| V19 | E4 | AggregatorStockToggle.jsx | Network: stock-toggle payload has turn_on_preset for 2h | devtools |
| V20 | E4 | AggregatorStockToggle.jsx | Network: stock-toggle payload action=enable | devtools |
| V21 | E5c | ProductCard.jsx | Dine-In/Delivery/Takeaway chips intact in Normal mode | browser |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-140 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: +9 files listed (8 edit + 1 new)
- [ ] Code markers: // CR-140 in every modified file
- [ ] Compile: webpack 0 new warnings
```
