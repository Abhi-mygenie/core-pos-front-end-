# CR-145 — Implementation Plan: BulkEditor Addon & Variation Columns + Food Image

**Gate:** 3 ✅
**Date:** 2026-08-15
**Risk:** HIGH (1123-line hotspot; nested array architecture; isDirty + payload extension)

---

## Curl Probe Results (R11 — critical gaps resolved)

| # | Endpoint | Method | Result | Key Finding |
|---|---|---|---|---|
| P6a | POST /product/foods/{id} with addon_ids:[13194] | POST FormData | ✅ 200 | "food updated successfully" — addons assigned |
| P6b | POST /product/foods/{id} with addon_ids:[] | POST FormData | ✅ 200 | **CLEARS all addons** — confirmed intentional |
| P6c | POST /product/foods/{id} without addon_ids key | POST FormData | ✅ 200 | **Leaves addons unchanged** — guard confirmed |

**CRITICAL FINDING:** `editFood` uses `api.post(BASE_V2/foods/{id}, FormData)` with `food_info` JSON string.
It is NOT a PUT. The `buildPayload()` result is passed to `editFood()` which wraps it in FormData automatically.
Therefore `addon_ids` just needs to be in `buildPayload()` output — the existing `editFood()` handles the rest.

**CRITICAL FINDING 2:** BulkEditor currently receives NO `addons` prop.
MenuManagementPanel passes: `foods, categories, menuType, clients, isLoading, onRefresh, onClose`.
Must add `addons` prop to BulkEditor signature AND pass it from MenuManagementPanel.

**CRITICAL FINDING 3:** `currencySymbol` — BulkEditor already calls `useRestaurant()` internally.
Just add `currencySymbol` to the destructure at L194. No prop change needed from MenuManagementPanel.

Evidence: `/app/memory/evidence/CR-142-145/probe6a_foodinfo_addon_ids.txt` through `probe6c_no_addon_ids_key.txt`

---

## Execution Sequence

```
E1 → E2 → compile-check
→ E3 → E4 → compile-check
→ E5 → compile-check
→ E6 → E7 → compile-check
→ E8 (MenuManagementPanel) → compile-check
→ E9 (AddonExpandPanel NEW) → E10 (VariationExpandPanel NEW) → compile-check
→ self-test
```

**Checkpoint rule:** compile after every group. If webpack error — STOP and fix before next group.

---

## E1 — `BulkEditor.jsx` — Add 3 columns to BASE_COLUMNS

**File:** `/app/frontend/src/components/panels/menu/BulkEditor.jsx`

### E1a — Add image column (BEFORE `productName` entry, at the start of BASE_COLUMNS L19):
```js
// CR-145: food thumbnail — always visible, read-only
{ key: "productImage", label: "Img", type: "image", width: 52, tier: 1, alwaysVisible: true, readOnly: true },
```

### E1b — Add addon + variation columns (after `taxCalc` Tier-2 entry, L49, before `// Tier 3` comment):
```js
// CR-145: nested array columns — rendered as chips + expand sub-row
{ key: "addons",     label: "Add-ons",    type: "addon_expand", width: 110, tier: 2 },
{ key: "variations", label: "Variations", type: "var_expand",   width: 110, tier: 3 },
```

**Risk:** LOW — additive entries.
**Self-test:** `grep -c "key:" BulkEditor.jsx` should increase by 3.

---

## E2 — `BulkEditor.jsx` — Update `buildRow` to capture productImage, addonIds, variations

**File:** L140 — add inside `buildRow` after `clientId: f.clientId ?? 0,` (current last field):
```js
  // CR-145: nested arrays and image — not scalar fields
  addonIds:     (f.addOns || []).map(a => (typeof a === 'object' ? a.id : a)),
  variations:   f.variations || [],
  productImage: f.productImage || null,
```

**Risk:** LOW — additive row fields. No existing code path reads these keys.

---

## E3 — `BulkEditor.jsx` — Add `addons` prop to component signature + destructure `currencySymbol`

**File:** L192 — component declaration.

**Current:**
```js
const BulkEditor = ({ foods = [], categories = [], menuType = "Normal", clients = [], isLoading = false, onRefresh, onClose }) => {
```
**Replace with:**
```js
const BulkEditor = ({ foods = [], categories = [], menuType = "Normal", clients = [], addons = [], isLoading = false, onRefresh, onClose }) => { // CR-145: +addons prop
```

**File:** L194 — `useRestaurant()` destructure.

**Current:**
```js
const { restaurant } = useRestaurant();
```
**Replace with:**
```js
const { restaurant, currencySymbol } = useRestaurant(); // CR-145: +currencySymbol
```

**Risk:** LOW — additive prop with default `[]`. No callers break.

---

## E4 — `BulkEditor.jsx` — Add expand state (after `useRestaurant` block, inside component ~L196)

Insert after `const gstRequired = restaurant?.tax?.gstStatus === true;`:
```js
// CR-145: expand sub-row state
const [expandedRowId,   setExpandedRowId]   = useState(null); // row._id | null
const [expandedRowType, setExpandedRowType] = useState(null); // 'addon' | 'variation' | null

const toggleExpand = useCallback((rowId, type) => {
  if (expandedRowId === rowId && expandedRowType === type) {
    setExpandedRowId(null); setExpandedRowType(null);
  } else {
    setExpandedRowId(rowId); setExpandedRowType(type);
  }
}, [expandedRowId, expandedRowType]);

const closeExpand = useCallback(() => {
  setExpandedRowId(null); setExpandedRowType(null);
}, []);
```

**Risk:** LOW — isolated state.

---

## E5 — `BulkEditor.jsx` — Extend `isDirty` + `buildPayload`

**File:** L290 (`isDirty` checks object)

### E5a — Add `addons`, `variations`, `productImage` cases inside `checks` object (after `clientId` entry ~L337):
```js
// CR-145: array dirty — sorted numeric JSON.stringify (OQ-5=A)
addons: () => {
  const orig = JSON.stringify(
    [...(row._original.addOns || []).map(a => typeof a === 'object' ? a.id : a)].sort((a,b) => a - b)
  );
  const curr = JSON.stringify([...(row.addonIds || [])].sort((a, b) => a - b));
  return orig !== curr;
},
variations:   () => false, // CR-145: read-only — never dirty
productImage: () => false, // CR-145: read-only — never dirty
```

### E5b — Add `addon_ids` to `buildPayload` (after `portion_size` field ~L190):
```js
  // CR-145: addon_ids only when row has loaded addons (P6c: omitting key leaves addons unchanged)
  // P6b confirmed: addon_ids:[] CLEARS all addons — intentional when user removes all
  ...(row.addonIds !== undefined ? { addon_ids: row.addonIds } : {}),
```

**Risk:** MEDIUM — buildPayload affects PUT payload. Guard `row.addonIds !== undefined` ensures clean rows (where addonIds was never set) don't send empty array and accidentally clear addons.

---

## E6 — `BulkEditor.jsx` — CellRenderer: handle image, addon_expand, var_expand types

**File:** L1032 (`CellRenderer` function) — add before the final `return null;` in CellRenderer.

```jsx
// CR-145: food thumbnail
if (col.type === 'image') {
  return row.productImage ? (
    <img src={row.productImage} alt="" loading="lazy"
      style={{ width:36, height:36, borderRadius:6, objectFit:'cover',
               border:'1px solid #e2e8f0', display:'block' }}
      onError={e => {
        e.currentTarget.style.display = 'none';
        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
      }}
    />
  ) : null;
  // If productImage null: return nothing (cell stays empty — no placeholder needed in dense table)
}

// CR-145: addon chip
if (col.type === 'addon_expand') {
  const count = (row.addonIds || []).length;
  const isDirtyAddon = dirty; // passed from parent via col isDirty check
  return (
    <span
      data-testid={`addon-chip-${row._id}`}
      onClick={() => toggleExpand(row._id, 'addon')}
      style={{
        display:'inline-flex', alignItems:'center', cursor:'pointer', gap:4,
        background: isDirtyAddon ? '#fef9c3' : count > 0 ? '#eff6ff' : '#f8fafc',
        color:      isDirtyAddon ? '#a16207' : count > 0 ? '#3b82f6' : '#94a3b8',
        border:`1px solid ${isDirtyAddon ? '#fde047' : count > 0 ? '#bfdbfe' : '#e2e8f0'}`,
        borderRadius:12, padding:'3px 10px', fontSize:11.5, whiteSpace:'nowrap',
      }}>
      {count > 0 ? `${count} add-on${count !== 1 ? 's' : ''} ▾` : 'None'}
    </span>
  );
}

// CR-145: variation chip
if (col.type === 'var_expand') {
  const count = (row.variations || []).length;
  return (
    <span
      data-testid={`var-chip-${row._id}`}
      onClick={() => count > 0 && toggleExpand(row._id, 'variation')}
      style={{
        display:'inline-flex', alignItems:'center', gap:4,
        cursor: count > 0 ? 'pointer' : 'default',
        background: count > 0 ? '#fdf4ff' : '#f8fafc',
        color:      count > 0 ? '#9333ea' : '#94a3b8',
        border:`1px solid ${count > 0 ? '#e9d5ff' : '#e2e8f0'}`,
        borderRadius:12, padding:'3px 10px', fontSize:11.5, whiteSpace:'nowrap',
      }}>
      {count > 0 ? `${count} group${count !== 1 ? 's' : ''} ▾` : 'None'}
    </span>
  );
}
```

**Note on `toggleExpand`:** CellRenderer is a `React.memo` component — it does NOT have access to `toggleExpand` from the parent scope. Two options:
- **Option A (recommended):** Pass `toggleExpand` as a prop to CellRenderer: `<CellRenderer ... toggleExpand={toggleExpand} />`
- Add `toggleExpand` to CellRenderer prop destructure

Update CellRenderer signature:
```js
const CellRenderer = React.memo(function CellRenderer({ col, row, updateCell, catOptions, clientOptions, dirty, toggleExpand }) {
```

Update CellRenderer call site (~L894):
```jsx
<CellRenderer col={col} row={row} updateCell={updateCell} catOptions={catOptions} clientOptions={clientOptions} dirty={isDirty(row, col.key)} toggleExpand={toggleExpand} />
```

**Risk:** MEDIUM — modifying CellRenderer signature. All existing callers pass props by name — additive prop is safe.

---

## E7 — `BulkEditor.jsx` — Sub-row render in table body

**File:** Table body foods map (around L860-880).

Find the pattern where each food row `<tr key={...}>` is rendered. After each `</tr>` for a food row, add:

```jsx
{/* CR-145: expand sub-row */}
{expandedRowId === row._id && (
  <tr key={`${row._id}-expand`}>
    <td
      colSpan={Object.values(visibleCols).filter(Boolean).length + 2}
      style={{
        padding: 0,
        background: expandedRowType === 'addon' ? '#f0fdf4' : '#fdf4ff',
        borderBottom: `1px solid ${expandedRowType === 'addon' ? '#bbf7d0' : '#e9d5ff'}`,
      }}
    >
      {expandedRowType === 'addon' && (
        <AddonExpandPanel
          foodName={row.productName}
          foodImage={row.productImage || null}
          allAddons={addons}
          currentAddonIds={row.addonIds || []}
          currencySymbol={currencySymbol}
          onApply={(newIds) => {
            updateCell(row._id, 'addonIds', newIds);
            closeExpand();
          }}
          onClose={closeExpand}
        />
      )}
      {expandedRowType === 'variation' && (
        <VariationExpandPanel
          foodName={row.productName}
          foodImage={row.productImage || null}
          variations={row.variations || []}
          onClose={closeExpand}
        />
      )}
    </td>
  </tr>
)}
```

**Note on colSpan:** `Object.values(visibleCols).filter(Boolean).length` counts visible columns. Add 2 for the row-number column and the fixed left column. Verify exact count at implementation time.

**Add imports at top of BulkEditor.jsx:**
```js
import AddonExpandPanel    from './AddonExpandPanel';    // CR-145
import VariationExpandPanel from './VariationExpandPanel'; // CR-145
```

**Risk:** MEDIUM — table body modification. colSpan must be verified to avoid layout shift.

---

## E8 — `MenuManagementPanel.jsx` — Pass `addons` prop to BulkEditor

**File:** `/app/frontend/src/components/panels/MenuManagementPanel.jsx`
**Line:** ~L202 (BulkEditor call in bulkEditMode branch)

**Current:**
```jsx
<BulkEditor
  foods={foods}
  categories={categoriesWithCounts}
  menuType={menuType}
  clients={clients}
  isLoading={loading}
  onRefresh={fetchFoods}
  onClose={() => setBulkEditMode(false)}
/>
```
**Replace with:**
```jsx
<BulkEditor
  foods={foods}
  categories={categoriesWithCounts}
  menuType={menuType}
  clients={clients}
  addons={addons}
  isLoading={loading}
  onRefresh={fetchFoods}
  onClose={() => setBulkEditMode(false)}
/>
```
**Risk:** LOW — additive prop.
**Note:** `addons` state already exists in MenuManagementPanel (L19) and is fetched on panel open.

---

## E9 — NEW `AddonExpandPanel.jsx` (~100 lines)

**File:** `components/panels/menu/AddonExpandPanel.jsx` (NEW)
**Props:** `{ foodName, foodImage, allAddons, currentAddonIds, currencySymbol, onApply, onClose }`

```
State:
  selected — Set<number>  initialised from currentAddonIds
  (no API calls — pure UI state + onApply callback)

Derived:
  isDirty — JSON.stringify([...selected].sort()) !== JSON.stringify([...currentAddonIds].sort())

Layout:
  Header (flex row):
    Left: {foodImage ? <img 44×44 rounded lazy> : <div 44×44 grey placeholder>}
    Right:
      "Add-ons" (blue, bold 12px)
      {foodName} (dark, bold 14px)
      "Check/uncheck to assign · {allAddons.length} available" (grey 11px)
    Right-most: {isDirty ? <span amber "● Unsaved"> : null}

  Addon grid (flex wrap):
    For each addon in allAddons:
      <div
        onClick={() => toggle addon in selected Set}
        className checked/unchecked styles>
        <input type="checkbox" checked={selected.has(a.id)} readOnly />
        <label>{a.name}</label>
        <span>{currencySymbol}{a.price}</span>
      </div>

  Footer:
    <button onClick={() => onApply([...selected])}>Apply Changes</button>
    <button onClick={onClose}>Cancel</button>
    <span grey>"Use Bulk Save toolbar to push changes to API"</span>
```

**Risk:** LOW — pure UI component, no API calls, no context.

---

## E10 — NEW `VariationExpandPanel.jsx` (~70 lines)

**File:** `components/panels/menu/VariationExpandPanel.jsx` (NEW)
**Props:** `{ foodName, foodImage, variations, onClose }`

```
No state, no API calls.

Layout:
  Header (same image pattern as AddonExpandPanel):
    Image 44×44 + "Variations" (purple) + foodName + "Read-only" hint

  For each variation in variations:
    Group label (VARIATION.name, uppercase)
    Values row:
      For each value in variation.values:
        <span>{value.label} · {currencySymbol}{value.optionPrice || 0}</span>

  Footer:
    <button onClick={onClose}>Close</button>
    <span grey>"Full variation editing → open Product Form for this item"</span>
```

**Note on variation shape:** `fromAPI.variations()` maps to `[{name, values:[{label, optionPrice}]}]` (confirm at L130 of menuManagementTransform.js).

**Risk:** LOW — pure display.

---

## Verification Matrix

| # | Edit | File | Verification | Method |
|---|------|------|-------------|--------|
| V1 | E1a | BulkEditor.jsx | "Img" column visible in table | Browser |
| V2 | E1b | BulkEditor.jsx | "Add-ons" in Tier-2 picker | Browser |
| V3 | E1b | BulkEditor.jsx | "Variations" in Tier-3 picker | Browser |
| V4 | E2 | BulkEditor.jsx | buildRow row has addonIds array | code review |
| V5 | E2 | BulkEditor.jsx | buildRow row has productImage (null or URL) | code review |
| V6 | E3 | BulkEditor.jsx | addons prop accepted with default [] | code review |
| V7 | E4 | BulkEditor.jsx | Clicking addon chip opens sub-row | Browser |
| V8 | E4 | BulkEditor.jsx | Clicking same chip again closes sub-row | Browser |
| V9 | E5a | BulkEditor.jsx | Unchecking addon marks row amber dirty | Browser |
| V10 | E5a | BulkEditor.jsx | Re-checking original addons removes dirty | Browser |
| V11 | E5b | BulkEditor.jsx | Bulk Save payload includes addon_ids for dirty rows | Network tab |
| V12 | E5b | BulkEditor.jsx | Payload has NO addon_ids for clean rows | Network tab |
| V13 | E5b | BulkEditor.jsx | addon_ids:[] sent when user removes ALL addons | Network tab |
| V14 | E6 | BulkEditor.jsx | addon chip shows count OR "None" | Browser |
| V15 | E6 | BulkEditor.jsx | variation chip non-clickable when count=0 | Browser |
| V16 | E7 | BulkEditor.jsx | Sub-row spans full table width — no layout shift | Browser |
| V17 | E8 | MenuManagementPanel.jsx | addons prop passed to BulkEditor | code review |
| V18 | E9 | AddonExpandPanel.jsx | All restaurant addons listed | Browser |
| V19 | E9 | AddonExpandPanel.jsx | Food's current addons pre-checked | Browser |
| V20 | E9 | AddonExpandPanel.jsx | Food image shown in panel header | Browser |
| V21 | E9 | AddonExpandPanel.jsx | Apply closes panel, row turns amber | Browser |
| V22 | E10 | VariationExpandPanel.jsx | Group names + values shown | Browser |
| V23 | E10 | VariationExpandPanel.jsx | No edit controls visible | Browser |
| V24 | E10 | VariationExpandPanel.jsx | Food image shown in panel header | Browser |
| V25 | Regression | BulkEditor.jsx | All Tier-1 scalar columns still editable | Browser |
| V26 | Regression | BulkEditor.jsx | CR-140 swiggy/zomato columns unaffected | Browser |
| V27 | Regression | MenuManagementPanel.jsx | Card view and AddonManagementPanel (CR-144) unaffected | Browser |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: CR-145 → IMPLEMENTED, pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: BulkEditor.jsx, MenuManagementPanel.jsx +
                          NEW AddonExpandPanel.jsx + NEW VariationExpandPanel.jsx
- [ ] Code markers: // CR-145 in every modified/created file
```
