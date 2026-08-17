# BUG-326 — Implementation Plan (Gate 3)

**Date:** 2026-08-17
**Role:** PLANNING (Gate 3)
**Risk:** MEDIUM
**Planning skip:** NOT eligible — 4 files, API contract change

---

## Scope Lock

**Files WILL change (4):**
1. `src/api/transforms/menuManagementTransform.js`
2. `src/components/panels/menu/BulkEditor.jsx`
3. `src/components/panels/menu/ProductForm.jsx`
4. `src/components/panels/menu/ProductCard.jsx`

**Files will NOT touch:**
- `menuManagementService.js` — service layer already correct (passes payload through)
- `aggregatorConfigService.js` — no change
- `AggregatorSetupView.jsx` — no change
- Any other file

**Execution order:** 1 → 2 → 3 → 4 (transform first, then consumers)

---

## Edit 1 — `menuManagementTransform.js`: Fix read + add write for new keys

### 1a. `fromAPI.food()` — fix `packedFood` read + add `swiggyPackingChrg`

**Locate:** Lines 114–120 (BUG-120-D block)

**Current L116:**
```js
packedFood: toBoolean(api.packed_food),
```

**New L116 (BUG-326: read is_packaged_good with packed_food fallback):**
```js
packedFood: toBoolean(api.is_packaged_good ?? api.packed_food), // BUG-326: is_packaged_good replaces packed_food for aggregator
```

**Add after L116 (new line):**
```js
swiggyPackingChrg: api.swiggy_packing_chrg === 'YES', // BUG-326: new aggregator-only field
```

### 1b. `toAPI.foodInfo()` — add new keys to Aggregator spread

**Locate:** Lines 247–252 (Aggregator-only spread block)

**Current:**
```js
// CR-140 GAP-2: Aggregator platform fields — only sent for Aggregator menu type
...(form.foodFor === 'Aggregator' ? {
  swiggy: form.swiggy !== false ? 'YES' : 'NO',
  zomato: form.zomato !== false ? 'YES' : 'NO',
  client: form.clientId ?? 0,
} : {}), // CR-140
```

**New (BUG-326: add is_packaged_good + swiggy_packing_chrg to aggregator spread):**
```js
// CR-140 GAP-2: Aggregator platform fields — only sent for Aggregator menu type
...(form.foodFor === 'Aggregator' ? {
  swiggy: form.swiggy !== false ? 'YES' : 'NO',
  zomato: form.zomato !== false ? 'YES' : 'NO',
  client: form.clientId ?? 0,
  is_packaged_good:    form.packedFood        ? 1     : 0,    // BUG-326
  swiggy_packing_chrg: form.swiggyPackingChrg ? 'YES' : 'NO', // BUG-326
} : {}), // CR-140
```

**Line 275 `packed_food` — NO CHANGE.** Normal food still uses this key; aggregator send is harmless.

---

## Edit 2 — `BulkEditor.jsx`: AGGR_COLUMNS + buildRow + buildPayload + isDirty

### 2a. `AGGR_COLUMNS` — add `swiggyPackingChrg` column

**Locate:** Lines 76–80

**Current:**
```js
const AGGR_COLUMNS = [
  { key: 'swiggy',   label: 'Swiggy', type: 'yesno',    width: 80,  tier: 1 },
  { key: 'zomato',   label: 'Zomato', type: 'yesno',    width: 80,  tier: 1 },
  { key: 'clientId', label: 'Brand',  type: 'dropdown', width: 120, tier: 1 },
];
```

**New (BUG-326: +swiggyPackingChrg column):**
```js
const AGGR_COLUMNS = [
  { key: 'swiggy',           label: 'Swiggy',           type: 'yesno',    width: 80,  tier: 1 },
  { key: 'zomato',           label: 'Zomato',           type: 'yesno',    width: 80,  tier: 1 },
  { key: 'clientId',         label: 'Brand',            type: 'dropdown', width: 120, tier: 1 },
  { key: 'swiggyPackingChrg', label: 'Swiggy Pack Chrg', type: 'yesno',   width: 130, tier: 1 }, // BUG-326
];
```

### 2b. `buildRow()` — add `swiggyPackingChrg`

**Locate:** Lines 145–152 (CR-140 GAP-6 aggregator block, after `clientId`)

**Current (L148):**
```js
clientId: f.clientId ?? 0,
```

**New — add immediately after L148:**
```js
clientId: f.clientId ?? 0,
swiggyPackingChrg: f.swiggyPackingChrg ? 'Yes' : 'No', // BUG-326
```

### 2c. `buildPayload()` — add new keys to Aggregator spread

**Locate:** Lines 164–169 (Aggregator spread)

**Current:**
```js
// CR-140 GAP-6: aggregator platform fields
...(row.foodFor === 'Aggregator' ? {
  swiggy: row.swiggy === 'Yes' ? 'YES' : 'NO',
  zomato: row.zomato === 'Yes' ? 'YES' : 'NO',
  client: row.clientId ?? 0,
} : {}),
```

**New (BUG-326: +is_packaged_good + swiggy_packing_chrg):**
```js
// CR-140 GAP-6: aggregator platform fields
...(row.foodFor === 'Aggregator' ? {
  swiggy: row.swiggy === 'Yes' ? 'YES' : 'NO',
  zomato: row.zomato === 'Yes' ? 'YES' : 'NO',
  client: row.clientId ?? 0,
  is_packaged_good:    row.packedFood         === 'Yes' ? 1     : 0,    // BUG-326
  swiggy_packing_chrg: row.swiggyPackingChrg  === 'Yes' ? 'YES' : 'NO', // BUG-326
} : {}),
```

### 2d. `isDirty` checks — add `swiggyPackingChrg`

**Locate:** Lines 357–360 (CR-140 GAP-6 dirty checks block)

**Current (L358–360):**
```js
swiggy:   () => (o.swiggy   ? 'Yes' : 'No') !== row.swiggy,
zomato:   () => (o.zomato   ? 'Yes' : 'No') !== row.zomato,
clientId: () => (o.clientId ?? 0)            !== row.clientId,
```

**New — add after `clientId` line:**
```js
swiggy:            () => (o.swiggy            ? 'Yes' : 'No') !== row.swiggy,
zomato:            () => (o.zomato            ? 'Yes' : 'No') !== row.zomato,
clientId:          () => (o.clientId ?? 0)                    !== row.clientId,
swiggyPackingChrg: () => (o.swiggyPackingChrg ? 'Yes' : 'No') !== row.swiggyPackingChrg, // BUG-326
```

---

## Edit 3 — `ProductForm.jsx`: state init + Platform Sync UI toggle

### 3a. State init — edit mode

**Locate:** Lines 254–257 (CR-140 GAP-3/7 Aggregator fields block)

**Current (L255–257):**
```js
swiggy:   product.swiggy !== false,
zomato:   product.zomato !== false,
clientId: product.clientId ?? 0,
```

**New — add after `clientId`:**
```js
swiggy:            product.swiggy !== false,
zomato:            product.zomato !== false,
clientId:          product.clientId ?? 0,
swiggyPackingChrg: product.swiggyPackingChrg || false, // BUG-326
```

### 3b. State init — new mode

**Locate:** Lines 282–283 (CR-140 GAP-2 Aggregator defaults block)

**Current:**
```js
swiggy: true, zomato: true, clientId: 0,
```

**New:**
```js
swiggy: true, zomato: true, clientId: 0, swiggyPackingChrg: false, // BUG-326
```

### 3c. Platform Sync section — add Swiggy Packing Charge toggle

**Locate:** Lines 358–367 (Platform Sync section, inside `menuType === 'Aggregator'` guard)

**Current:**
```jsx
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
```

**New — add one ToggleField after Zomato:**
```jsx
<Section title="Platform Sync" defaultOpen={true}>
  <div className="pt-2">
    <ToggleField label="Swiggy" checked={form.swiggy} onChange={v => update('swiggy', v)}
      description="Show on Swiggy" />
    <ToggleField label="Zomato" checked={form.zomato} onChange={v => update('zomato', v)}
      description="Show on Zomato" />
    {/* BUG-326: Swiggy packing charge — aggregator only */}
    <ToggleField label="Swiggy Packing Charge" checked={form.swiggyPackingChrg}
      onChange={v => update('swiggyPackingChrg', v)}
      description="Apply Swiggy packing charge (aggregator only)" />
    <SelectField label="Brand" value={form.clientId} onChange={v => update('clientId', Number(v))}
      options={[{ value: 0, label: 'Main Brand' }, ...(clients || []).map(c => ({ value: c.id, label: c.name }))]} />
  </div>
</Section>
```

---

## Edit 4 — `ProductCard.jsx`: state init + quick-edit UI

### 4a. State init

**Locate:** Lines 58–61 (CR-140 aggregator block)

**Current:**
```js
swiggy:   product.swiggy !== false,
zomato:   product.zomato !== false,
clientId: product.clientId ?? 0,
```

**New — add after `clientId`:**
```js
swiggy:            product.swiggy !== false,
zomato:            product.zomato !== false,
clientId:          product.clientId ?? 0,
swiggyPackingChrg: product.swiggyPackingChrg || false, // BUG-326
```

### 4b. Quick-edit form — Swiggy Pack Chrg select (aggregator only)

**Locate:** Lines 238–244 (existing "Packaged" `<select>` inside the 2-column grid)

**Current (2-column grid with Inventory + Packaged):**
```jsx
<div className="grid grid-cols-2 gap-3 mb-3">
  <div>
    <label ...>Inventory</label>
    <select value={form.isInventory ? "yes" : "no"} ...>...</select>
  </div>
  <div>
    <label ...>Packaged</label>
    <select value={form.packedFood ? "yes" : "no"} ...>...</select>
  </div>
</div>
```

**New — add a conditional third cell AFTER the closing `</div>` of the grid:**
```jsx
<div className="grid grid-cols-2 gap-3 mb-3">
  <div>
    <label ...>Inventory</label>
    <select value={form.isInventory ? "yes" : "no"} ...>...</select>
  </div>
  <div>
    <label ...>Packaged</label>
    <select value={form.packedFood ? "yes" : "no"} ...>...</select>
  </div>
</div>
{/* BUG-326: Swiggy packing charge — aggregator food only */}
{product.foodFor === 'Aggregator' && (
  <div className="grid grid-cols-2 gap-3 mb-3">
    <div>
      <label className="text-xs mb-1 block" style={{ color: COLORS.grayText }}>Swiggy Pack Chrg</label>
      <select value={form.swiggyPackingChrg ? "yes" : "no"}
              onChange={(e) => update("swiggyPackingChrg", e.target.value === "yes")}
              className="w-full px-3 py-2 text-sm rounded-lg border outline-none bg-white"
              style={{ borderColor: COLORS.borderGray }}>
        <option value="no">No</option>
        <option value="yes">Yes</option>
      </select>
    </div>
  </div>
)}
```

---

## Verification Matrix

| Edit | File | Change | How to Verify | Auto? |
|---|---|---|---|---|
| 1a | `menuManagementTransform.js` L116 | `is_packaged_good` read | Load aggregator food in BulkEditor/ProductForm — `packedFood` no longer always false | NO — browser |
| 1b | `menuManagementTransform.js` L116+1 | `swiggyPackingChrg` read | Load food with `swiggy_packing_chrg:"YES"` — ProductForm Platform Sync toggle ON | NO |
| 1c | `menuManagementTransform.js` L248 | `is_packaged_good`/`swiggy_packing_chrg` in payload | Save aggregator food → Network tab → request body contains both keys | NO |
| 2a | `BulkEditor.jsx` AGGR_COLUMNS | `swiggyPackingChrg` column | Open BulkEditor Aggregator mode — "Swiggy Pack Chrg" column visible in Editing bar | NO |
| 2b | `BulkEditor.jsx` buildRow | `swiggyPackingChrg` in row | Same as above — cell shows Yes/No | NO |
| 2c | `BulkEditor.jsx` buildPayload | New keys in payload | Save row in BulkEditor Aggregator → Network tab → `is_packaged_good` + `swiggy_packing_chrg` present | NO |
| 2d | `BulkEditor.jsx` isDirty | `swiggyPackingChrg` tracked | Toggle Swiggy Pack Chrg in BulkEditor → row marked dirty (highlighted) | NO |
| 3a/3b | `ProductForm.jsx` state | New defaults | Open new Aggregator food form — no JS error | NO |
| 3c | `ProductForm.jsx` Platform Sync | New toggle visible | Add/edit Aggregator food — Platform Sync section has "Swiggy Packing Charge" toggle | NO |
| 4a | `ProductCard.jsx` state | New default | Open quick-edit for aggregator food — no JS error | NO |
| 4b | `ProductCard.jsx` UI | Conditional select | Quick-edit aggregator food → shows "Swiggy Pack Chrg" select; normal food → hidden | NO |
| V5 | `menuManagementTransform.js` | Normal food unaffected | Save normal food → Network tab → `packed_food` present, `is_packaged_good` NOT sent | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-326 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: all 4 files — BUG-326 2026-08-17
- [ ] Code markers: // BUG-326 in every modified block (already shown above)
- [ ] Compile check: webpack 0 new warnings
```

---

## Awaiting Gate 4 GO
