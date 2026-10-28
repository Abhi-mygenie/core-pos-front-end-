# CR-449 — Implementation Plan (Gate 3)

**ID:** CR-449
**Date:** 2026-10-24
**Stage:** Gate 3 — Implementation Plan
**IA:** `impact/CR-449_IMPACT_ANALYSIS_2026_10_24.md`
**IA Anchors Verified:** YES — all target files unchanged since IA
**Code Reality:** PARTIAL (category station works; per-item override not wired)
**Risk:** MEDIUM
**Scope:** Normal menu only — NO changes to Aggregator menu per owner

---

## 1. Execution Sequence

```
Step 1: productTransform.js          — Add 3 new fields to product mapping
Step 2: menuManagementTransform.js   — Add 3 fields to fromAPI.food + restaurant_printer_id to toAPI.foodInfo
Step 3: BulkEditor.jsx               — Column def + buildRow + buildPayload + isDirty + cell renderer
Step 4: MenuManagementPanel.jsx      — Pass stations to BulkEditor + ProductList
Step 5: ProductList.jsx              — Receive stations, pass to ProductCard + ProductForm
Step 6: ProductCard.jsx              — Station dropdown in QuickEditForm
Step 7: ProductForm.jsx              — Station & Routing section
Step 8: Verify compile
```

---

## 2. Exact Edits

### E-1: productTransform.js L106

**Current (L105-107):**
```js
    // Station routing (for KOT) - null if not set (no KOT for items without station)
    station: api.station_name || null,
```

**New:**
```js
    // Station routing (for KOT) - null if not set (no KOT for items without station)
    station: api.station_name || null,
    restaurantPrinterId: api.restaurant_printer_id || null,                     // CR-449: item-level station override
    effectiveRestaurantPrinterId: api.effective_restaurant_printer_id || null,   // CR-449: resolved printer ID
    stationSource: api.station_source || 'category',                            // CR-449: "item" | "category" | "none"
```

---

### E-2a: menuManagementTransform.js — fromAPI.food (L79-81)

**Current (L79-81):**
```js
    // Station — managed at category level, not food level

    // Menu type
```

**New:**
```js
    // Station — CR-449: item-level override with category fallback
    restaurantPrinterId: api.restaurant_printer_id || null,                     // CR-449: saved item override (null = category)
    stationName: api.station_name || null,                                      // CR-449: effective station display name
    effectiveRestaurantPrinterId: api.effective_restaurant_printer_id || null,   // CR-449: resolved printer ID
    stationSource: api.station_source || 'category',                            // CR-449: "item" | "category" | "none"

    // Menu type
```

### E-2b: menuManagementTransform.js — toAPI.foodInfo (after L290)

**Current (L289-290):**
```js
    item_unit_price: ['Kg','gm','L','ml'].includes(form.itemUnit) ? String(Number(form.basePrice) || 0) : '',
  }),
```

**New:**
```js
    item_unit_price: ['Kg','gm','L','ml'].includes(form.itemUnit) ? String(Number(form.basePrice) || 0) : '',
    // CR-449: item-level station override — only for Normal menu. null clears override.
    ...(form.foodFor !== 'Aggregator' && form.restaurantPrinterId !== undefined
      ? { restaurant_printer_id: form.restaurantPrinterId || null }
      : {}),
  }),
```

---

### E-3a: BulkEditor.jsx — Column definition (after L25 categoryId, before L26 basePrice)

**Insert after:**
```js
  { key: "categoryId",       label: "Category",        type: "dropdown", width: 170, tier: 1, required: true },
```

**New line:**
```js
  { key: "categoryId",       label: "Category",        type: "dropdown", width: 170, tier: 1, required: true },
  { key: "stationId",        label: "Station",          type: "dropdown", width: 150, tier: 1 },   // CR-449: item station override
```

### E-3b: BulkEditor.jsx — buildRow (after line ~108 categoryName)

**Current (L107-108):**
```js
  categoryId: f.categoryId,
  categoryName: f.categoryName || "Uncategorized",
```

**New:**
```js
  categoryId: f.categoryId,
  categoryName: f.categoryName || "Uncategorized",
  stationId: f.restaurantPrinterId || null,            // CR-449: null = category default
  stationName: f.stationName || null,                  // CR-449: effective station display name
  stationSource: f.stationSource || 'category',        // CR-449: "item" | "category" | "none"
```

### E-3c: BulkEditor.jsx — buildPayload (after L200 portion_size)

**Current (around L200):**
```js
  portion_size: row.portionSize || '', // BUG-248: was missing from payload
```

**New:**
```js
  portion_size: row.portionSize || '', // BUG-248: was missing from payload
  // CR-449: item-level station override. null clears override → category fallback.
  ...(row.foodFor !== 'Aggregator' ? { restaurant_printer_id: row.stationId || null } : {}),
```

### E-3d: BulkEditor.jsx — isDirty checks (after clientId check ~L391)

**Insert after the `swiggyPackingChrg` check:**
```js
      // CR-449: station override dirty check
      stationId: () => (o.restaurantPrinterId || null) !== (row.stationId || null),
```

### E-3e: BulkEditor.jsx — Cell renderer (inside `if (col.type === "dropdown")`, after clientId block ~L1473)

**Insert after the clientId dropdown block:**
```js
    // CR-449: Station dropdown — shows category default + station options
    if (col.key === "stationId") {
      const catStation = row.stationSource === 'category' ? row.stationName : null;
      const isOverridden = row.stationId != null;
      return <select value={row.stationId ?? ""} onChange={e => updateCell(row._id, "stationId", e.target.value ? Number(e.target.value) : null)}
        className={`${base} ${isOverridden ? 'font-semibold' : 'italic'}`}
        style={{ color: isOverridden ? '#1D4ED8' : COLORS.grayText, borderColor: isOverridden ? '#BFDBFE' : bc, backgroundColor: isOverridden ? '#EFF6FF' : 'transparent' }}
        data-testid={`station-select-${row._id}`}>
        <option value="">Default{catStation ? ` (${catStation})` : ''}</option>
        {(stations || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>;
    }
```

### E-3f: BulkEditor.jsx — Receive stations prop

**Current component signature (~L231):** needs `stations` prop added.

**In MenuManagementPanel.jsx (E-4):** pass `stations={stations}` to BulkEditor.

---

### E-4: MenuManagementPanel.jsx — Pass stations to BulkEditor + ProductList

**BulkEditor (L333-342):**
```js
          <BulkEditor
            foods={filteredFoods}
            categories={categoriesWithCounts}
            menuType={menuType}
            clients={clients}
            addons={addons}
            isLoading={loading}
            onRefresh={fetchFoods}
            onClose={() => setBulkEditMode(false)}
            deleteReasons={deleteReasons}
          />
```

**New:**
```js
          <BulkEditor
            foods={filteredFoods}
            categories={categoriesWithCounts}
            stations={stations}
            menuType={menuType}
            clients={clients}
            addons={addons}
            isLoading={loading}
            onRefresh={fetchFoods}
            onClose={() => setBulkEditMode(false)}
            deleteReasons={deleteReasons}
          />
```

**ProductList (around L363):** Add `stations={stations}` prop.

---

### E-5: ProductList.jsx — Receive stations, pass to children

**Destructure `stations` from props.** Pass to:
- `<ProductCard>` QuickEditForm via `stations` prop
- `<ProductForm>` via `stations` prop

---

### E-6: ProductCard.jsx — QuickEditForm station dropdown

**Add to QuickEditForm component props:** `stations`

**Add to form initial state (after clientId ~L64):**
```js
    restaurantPrinterId: product.restaurantPrinterId || null,
```

**Add station dropdown in Row 2 (after Tax % field, before qe-actions), only for Normal menu:**
```jsx
{menuType !== 'Aggregator' && (
  <div className="qe-field" data-testid="quick-edit-station-select">
    <label style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Station</label>
    <select
      value={form.restaurantPrinterId ?? ""}
      onChange={e => update("restaurantPrinterId", e.target.value ? Number(e.target.value) : null)}
      style={{
        width: '100%', padding: '7px 10px', border: '1px solid', borderRadius: 8, fontSize: 13,
        borderColor: form.restaurantPrinterId ? '#BFDBFE' : '#E2E8F0',
        backgroundColor: form.restaurantPrinterId ? '#EFF6FF' : '#fff',
        fontWeight: form.restaurantPrinterId ? 600 : 400,
        color: form.restaurantPrinterId ? '#1D4ED8' : '#0F172A',
      }}
    >
      <option value="">Category Default{product.stationName ? ` (${product.stationName})` : ''}</option>
      {(stations || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <span style={{
        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
        background: form.restaurantPrinterId ? '#EFF6FF' : '#F1F5F9',
        color: form.restaurantPrinterId ? '#1D4ED8' : '#475569',
      }}>
        {form.restaurantPrinterId ? 'OVERRIDDEN' : 'DEFAULT'}
      </span>
    </div>
  </div>
)}
```

---

### E-7: ProductForm.jsx — Station & Routing section

**Add to form initial state (after swiggyPackingChrg ~L275):**
```js
        restaurantPrinterId: product.restaurantPrinterId || null,
```

**Add new Section after "Classification" section (~L503), only for Normal menu:**
```jsx
{menuType !== 'Aggregator' && (
  <Section title="Station & Routing" defaultOpen={!!form.restaurantPrinterId}>
    {form.restaurantPrinterId && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 500, flex: 1 }}>
          Item-level station override active. Category default: {product.stationName || 'KDS'}
        </span>
        <button onClick={() => setForm(p => ({ ...p, restaurantPrinterId: null }))}
          style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '3px 10px', borderRadius: 5, cursor: 'pointer' }}
          data-testid="reset-station-button">
          Reset to Default
        </button>
      </div>
    )}
    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Kitchen Station</div>
    <select
      value={form.restaurantPrinterId ?? ""}
      onChange={e => setForm(p => ({ ...p, restaurantPrinterId: e.target.value ? Number(e.target.value) : null }))}
      style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#fff' }}
      data-testid="product-form-station-select">
      <option value="">Category Default{product.stationName ? ` (${product.stationName})` : ''}</option>
      {(stations || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
    <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
      {form.restaurantPrinterId ? 'KOTs will route to the selected station instead of the category default.' : 'KOTs route to the station assigned to this item\'s category.'}
    </div>
  </Section>
)}
```

**ProductForm also needs `stations` prop** — add to component signature (L216).

---

## 3. Scope Lock

### Files WILL change

| # | File | Edit Count | Net Lines |
|---|------|:---:|:---:|
| 1 | `productTransform.js` | 1 | +3 |
| 2 | `menuManagementTransform.js` | 2 | +7 |
| 3 | `BulkEditor.jsx` | 6 | +20 |
| 4 | `MenuManagementPanel.jsx` | 2 | +2 |
| 5 | `ProductList.jsx` | 3 | +5 |
| 6 | `ProductCard.jsx` | 2 | +25 |
| 7 | `ProductForm.jsx` | 3 | +28 |

### Files WILL NOT touch

`OrderEntry.jsx` · `OrderCard.jsx` · `TableCard.jsx` · `stationService.js` · `LoadingPage.jsx` · `printerAgentSelector.js` · `orderTransform.js` · `CollectPaymentPanel.jsx` · `CartPanel.jsx` · `CategoryList.jsx` · `menuManagementService.js` (addFood/editFood already sends food_info JSON which includes the field from toAPI) · Aggregator functions (`addFoodAggregatorMultipart`, `editFoodAggregator`) · any `.env`

---

## 4. Verification Matrix

| # | Edit | What to Verify | Method | Auto? |
|---|------|---------------|--------|:---:|
| V-1 | E-1 | productTransform maps 3 new fields | `grep restaurantPrinterId productTransform.js` | YES |
| V-2 | E-2a | menuManagementTransform.fromAPI.food has 4 new fields | grep | YES |
| V-3 | E-2b | toAPI.foodInfo includes restaurant_printer_id for Normal menu | grep | YES |
| V-4 | E-3a | BASE_COLUMNS has stationId entry | grep | YES |
| V-5 | E-3b | buildRow maps stationId, stationName, stationSource | grep | YES |
| V-6 | E-3c | buildPayload includes restaurant_printer_id | grep | YES |
| V-7 | E-3d | isDirty has stationId check | grep | YES |
| V-8 | E-3e | Cell renderer has stationId dropdown | grep | YES |
| V-9 | E-4 | MenuManagementPanel passes stations to BulkEditor + ProductList | grep | YES |
| V-10 | E-6 | QuickEditForm has station dropdown | grep | YES |
| V-11 | E-7 | ProductForm has Station & Routing section | grep | YES |
| V-12 | ALL | webpack compiles with 0 new warnings | dev server log | YES |
| V-13 | ALL | BulkEditor shows Station column between Category and Price | Browser (palmhouse) | NO |
| V-14 | ALL | Station dropdown shows category default + 4 stations | Browser | NO |
| V-15 | ALL | Selecting BAR → save → refresh → station shows BAR (overridden) | Browser | NO |
| V-16 | ALL | Selecting "Default" → save → refresh → station shows category default | Browser | NO |
| V-17 | ALL | QuickEdit shows station dropdown with correct default | Browser | NO |
| V-18 | ALL | Full Edit shows Station & Routing section | Browser | NO |
| V-19 | ALL | Aggregator menu does NOT show station column/field | Browser | NO |

---

## 5. Risk Register

| # | Risk | Level | Mitigation |
|---|------|-------|------------|
| R-1 | Accidentally turning category default into permanent item override | ELIMINATED | UI sends null for "Category Default"; toAPI sends null; backend clears override |
| R-2 | Aggregator menu accidentally affected | ELIMINATED | Scope lock: Aggregator functions not touched; toAPI guards with `foodFor !== 'Aggregator'`; UI hides field for Aggregator |
| R-3 | BulkEditor stations prop undefined | LOW | `(stations \|\| []).map(...)` — empty array renders just "Default" option |
| R-4 | isDirty false positive on null vs undefined | LOW | Both sides coerce to null with `\|\| null` |

---

## 6. Post-Code Registry Checklist

```
- [ ] registry.json: CR-449 → status: GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add all 7 files with CR-449 + date
- [ ] Code markers: // CR-449 on every modified line/block
- [ ] Compile check: webpack 0 new warnings
```
