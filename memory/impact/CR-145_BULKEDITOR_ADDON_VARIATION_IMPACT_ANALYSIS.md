# CR-145 — Impact Analysis: BulkEditor Addon & Variation Columns

**Code Reality:** NONE — no addon/variation columns, no expandedRowId state, no expand sub-row in BulkEditor, no food image column
**Conflict Pre-Check:** BulkEditor.jsx last touched by BUG-301 (menuType pass), BUG-248 (isDirty+portionSize), CR-140 (aggregator columns). CR-145 adds new columns + sub-row — ADDITIVE, no overlap.
**Gate:** 2 ✅
**Date:** 2026-08-15
**Risk:** HIGH (1123-line hotspot file; nested array architecture change; isDirty + buildPayload extension + food image column)
**Design Approved:** 2026-08-15 — confirmed via `/cr145-final-design.html` (OQ-1=A sub-row inline, OQ-2=A no dimming, OQ-3=A read-only variations, OQ-4=A existing prop, OQ-5=A JSON.stringify). Food image column added to scope 2026-08-15 per owner direction.

---

## ODs Resolved (all owner-approved 2026-08-15)

| OQ | Decision | Choice |
|---|---|---|
| OQ-1 | Expand pattern | **A — Sub-row inline** (opens directly below food row) |
| OQ-2 | Row dimming | **A — No dimming** (other rows stay fully visible) |
| OQ-3 | Variation depth | **A — Read-only summary** (group names + values, no edit) |
| OQ-4 | Addon fetch | **A — Use existing `addons` prop** from MenuManagementPanel (no new API call) |
| OQ-5 | Dirty tracking | **A — Sorted JSON.stringify comparison** |
| OQ-6 (new) | Food image | **Show food thumbnail in BulkEditor row** — upfront visibility before clicking any chip |

---

## Food Image — Investigation Finding (2026-08-15)

**Owner direction:** "in CR-145 we should want food image upfront"

**Code reality check:**
```
fromAPI.food() L38:
  productImage: api.image?.includes('food-default-image') ? null : api.image || null
  → Already mapped. null if no image or API returns placeholder. URL string if real image.

buildRow(f) in BulkEditor:
  → Does NOT capture productImage. Dropped at row build time.

ProductCard.jsx:
  → Does NOT currently render the image in card view either.

ProductForm.jsx:
  → Uses imagePreview for upload flow only.
```

**Conclusion:**
- ✅ `productImage` is already in the food data model — **zero new API or transform work**
- ✅ `buildRow` just needs `productImage: f.productImage || null` added
- ✅ No separate endpoint needed
- ⚠ **Performance risk:** 97+ images loading simultaneously on BulkEditor open. Mitigated with `loading="lazy"` on `<img>` + CSS `object-fit: cover` on a fixed 36×36 container

**Display design:**
```
Thumbnail column (Tier 1, always visible, width: 52px):

┌──────┐  ← 36×36 rounded container
│  🍕  │  ← real image via productImage URL
└──────┘

If productImage is null → grey placeholder square with food icon
```
Sits between row-number column and Name column.

---

## 1. Data Flow Trace

### 1A. Current state (broken path)
```
fromAPI.food(api) → maps addOns[] + variations[] ✅
buildRow(f) → DROPS addOns + variations — NOT captured in row object ✗
BulkEditor table → no addon/variation columns ✗
buildPayload(row) → no addon_ids in payload ✗
isDirty(row, field) → no case for addons/variations ✗
```

### 1B. Required flow after CR-145
```
fromAPI.food(api) → maps addOns[] + variations[] (unchanged)
buildRow(f) → + addonIds: f.addOns.map(a=>a.id), + variations: f.variations
BulkEditor table → Tier-2 "Add-ons" chip + Tier-3 "Variations" chip

User clicks "3 add-ons" chip on row N:
  → setExpandedRowId(row._id), setExpandedRowType('addon')
  → sub-row renders below row N with AddonExpandPanel
  → User ticks/unticks from full addons[] prop
  → Apply → updateCell(row._id, 'addonIds', newIds)
  → isDirty(row,'addons') → JSON.stringify sort comparison → true
  → row amber dirty indicator (existing system picks this up)
  → Bulk Save → buildPayload includes addon_ids: row.addonIds
  → menuService.editFood(id, payload) → PUT /product/food-info/{id}

User clicks "2 groups" chip:
  → VariationExpandPanel renders read-only (OQ-3=A)
  → No dirty change, no API call
```

---

## 2. Exact Edit Points

### E1 — `BulkEditor.jsx` — Add 2 columns to BASE_COLUMNS (after L49 taxCalc, before `// Tier 3`)
```js
// CR-145: nested array columns
{ key: "addons",     label: "Add-ons",    type: "addon_expand", width: 110, tier: 2 },
{ key: "variations", label: "Variations", type: "var_expand",   width: 110, tier: 3 },
```
**Risk:** LOW — additive.

---

### E2 — `BulkEditor.jsx` — `buildRow`: capture addonIds + variations (after L140 `clientId`)
```js
  // CR-145: nested arrays for expand panel + dirty tracking
  addonIds:   (f.addOns || []).map(a => (typeof a === 'object' ? a.id : a)),
  variations: f.variations || [],
```
**Risk:** LOW — additive row fields, ignored by all existing code paths.

---

### E3 — `BulkEditor.jsx` — Add expand state inside component (after `useRestaurant` ~L196)
```js
// CR-145: expand sub-row state
const [expandedRowId,   setExpandedRowId]   = useState(null);
const [expandedRowType, setExpandedRowType] = useState(null); // 'addon'|'variation'

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

### E4 — `BulkEditor.jsx` — `isDirty`: add `addons` + `variations` cases (inside `checks` object, after `clientId` entry ~L337)
```js
// CR-145: array dirty — sorted JSON.stringify (OQ-5=A)
addons: () => {
  const orig = JSON.stringify(
    [...(row._original.addOns || []).map(a => typeof a === 'object' ? a.id : a)].sort((a,b)=>a-b)
  );
  const curr = JSON.stringify([...(row.addonIds || [])].sort((a,b)=>a-b));
  return orig !== curr;
},
variations: () => false,  // read-only (OQ-3=A) — never dirty
```
**Risk:** LOW — additive case, all other dirty checks unaffected.

---

### E5 — `BulkEditor.jsx` — `buildPayload`: add `addon_ids` (after `portion_size` ~L190)
```js
  // CR-145: include addon_ids only when field was loaded (guards against accidental clear)
  ...(row.addonIds !== undefined ? { addon_ids: row.addonIds } : {}),
```
**Risk:** MEDIUM — affects PUT payload. Curl probe required (R11) before implementation to confirm:
- `addon_ids: [1,2]` assigns those addons ✓
- `addon_ids: []` clears all addons (intentional when user removes all) ✓
- If backend IGNORES addon_ids → flag before implementation

---

### E6 — `BulkEditor.jsx` — Sub-row render in table body (after each `<tr key={row._id}>` in foods map ~L860)
```jsx
{/* CR-145: expand sub-row (OQ-1=A inline, OQ-2=A no dimming) */}
{expandedRowId === row._id && (
  <tr key={row._id + '-exp'}>
    <td colSpan={visibleCols.length + 2}
      style={{ padding:0, background: expandedRowType==='addon' ? '#f0fdf4' : '#fdf4ff',
               borderBottom: `1px solid ${expandedRowType==='addon' ? '#86efac' : '#e9d5ff'}` }}>
      {expandedRowType === 'addon' && (
        <AddonExpandPanel
          foodName={row.productName}
          allAddons={addons}
          currentAddonIds={row.addonIds || []}
          currencySymbol={currencySymbol}
          onApply={(newIds) => { updateCell(row._id, 'addonIds', newIds); closeExpand(); }}
          onClose={closeExpand}
        />
      )}
      {expandedRowType === 'variation' && (
        <VariationExpandPanel
          foodName={row.productName}
          variations={row.variations || []}
          onClose={closeExpand}
        />
      )}
    </td>
  </tr>
)}
```
**Risk:** MEDIUM — colSpan must match actual visible column count (verify at implementation).

---

### E7 — `BulkEditor.jsx` — `CellRenderer`: handle addon_expand + var_expand (before final `return null` in CellRenderer ~L1115)
```jsx
// CR-145
if (col.type === 'addon_expand') {
  const count = (row.addonIds || []).length;
  return (
    <span data-testid={`addon-chip-${row._id}`}
      onClick={() => col.onToggleExpand(row._id, 'addon')}
      style={{ display:'inline-flex', alignItems:'center', cursor:'pointer', gap:4,
               background: count>0 ? '#eff6ff':'#f8fafc', color: count>0 ? '#3b82f6':'#94a3b8',
               border:`1px solid ${count>0?'#bfdbfe':'#e2e8f0'}`,
               borderRadius:12, padding:'3px 10px', fontSize:11.5, whiteSpace:'nowrap' }}>
      {count > 0 ? `${count} add-on${count!==1?'s':''} ▾` : 'None'}
    </span>
  );
}
if (col.type === 'var_expand') {
  const count = (row.variations || []).length;
  return (
    <span data-testid={`var-chip-${row._id}`}
      onClick={() => count > 0 && col.onToggleExpand(row._id, 'variation')}
      style={{ display:'inline-flex', alignItems:'center', gap:4,
               cursor: count>0 ? 'pointer':'default',
               background: count>0 ? '#fdf4ff':'#f8fafc', color: count>0 ? '#9333ea':'#94a3b8',
               border:`1px solid ${count>0?'#e9d5ff':'#e2e8f0'}`,
               borderRadius:12, padding:'3px 10px', fontSize:11.5, whiteSpace:'nowrap' }}>
      {count > 0 ? `${count} group${count!==1?'s':''} ▾` : 'None'}
    </span>
  );
}
```
**Note:** `col.onToggleExpand` must be injected when building visibleCols (pass `toggleExpand` function).
**Risk:** LOW — additive render path.

---

### E8 — NEW `components/panels/menu/AddonExpandPanel.jsx` (~80 lines)

Props: `{ foodName, allAddons, currentAddonIds, currencySymbol, onApply, onClose }`

Layout:
```
[Add-ons for Paneer Tikka]  Check/uncheck to assign · 6 available
                                                [● Unsaved changes]  ← appears when selection changes

[✓] Extra Cheese ₹40   [✓] Garlic Sauce ₹25   [✓] Extra Masala ₹15
[ ] Dark Choco ₹10     [ ] Butter Naan ₹35     [ ] Mint Chutney ₹20

[Apply Changes]  [Cancel]
Note: Use Bulk Save toolbar to push changes to API
```

State: `selected` (Set initialised from currentAddonIds)
onApply: calls `onApply([...selected])`

**Risk:** LOW — new isolated file.

---

### E9 — NEW `components/panels/menu/VariationExpandPanel.jsx` (~60 lines)

Props: `{ foodName, variations, onClose }`

Layout:
```
[Variations for Paneer Tikka]  Read-only — edit in Product Form for changes

  SIZE
  ● Half · ₹180   ● Full · ₹280

  SPICE LEVEL
  ● Mild · ₹0   ● Medium · ₹0   ● Hot · ₹0

[Close]   Full variation editing → open Product Form for this item
```

No state, no API calls.
**Risk:** LOW — read-only display.

---

## 3. Downstream Consumers (no changes needed)

| Consumer | Why Not Affected |
|---|---|
| `MenuManagementPanel.jsx` | Already passes `addons` prop to BulkEditor — no change needed |
| `menuManagementTransform.js` | `fromAPI.food()` already maps addOns (L65) + variations (L63) |
| `menuManagementService.js` | `editFood()` already accepts addon_ids in payload |
| `ProductForm.jsx` | Separate single-food path |
| All R5 hotspots | Not touched |

---

## 4. Risk Register

| Risk | Level | Mitigation |
|---|---|---|
| `addon_ids: []` clears all addons if buildRow runs on food with no addons loaded | HIGH | Guard in E5: `row.addonIds !== undefined` + curl probe before implementation |
| colSpan mismatch in sub-row → table layout break | MEDIUM | Calculate from `visibleCols.length + fixedCols` at render time |
| `onToggleExpand` prop threading into CellRenderer | LOW | Inject via column definition at visibleCols build site |
| 1123-line file — must checkpoint each edit | MEDIUM | IMPLEMENTATION role: compile-check after every 2 edits |

---

## 5. Curl Probe Required Before E5 (R11)

```bash
# Verify addon_ids in PUT food-info
PUT https://preprod.mygenie.online/api/v2/vendoremployee/product/food-info/{id}
Body: { ...normal_fields..., "addon_ids": [1, 2] }
Expected: addons assigned

Body: { ...normal_fields..., "addon_ids": [] }
Expected: all addons cleared (if this is NOT the case → separate assignment endpoint needed)
```

---

## 6. Verification Matrix

| # | Edit | File | Verification | Method |
|---|------|------|-------------|--------|
| V1 | E1 | BulkEditor.jsx | "Add-ons" column in Tier-2 picker | Browser |
| V2 | E1 | BulkEditor.jsx | "Variations" column in Tier-3 picker | Browser |
| V3 | E2 | BulkEditor.jsx | buildRow captures addonIds from f.addOns | code review |
| V4 | E3 | BulkEditor.jsx | Clicking addon chip opens sub-row | Browser |
| V5 | E3 | BulkEditor.jsx | Clicking same chip again closes sub-row | Browser |
| V6 | E4 | BulkEditor.jsx | Unchecking addon marks row amber dirty | Browser |
| V7 | E4 | BulkEditor.jsx | Re-checking original addons removes dirty | Browser |
| V8 | E5 | BulkEditor.jsx | Bulk Save payload includes addon_ids for dirty rows | Network tab |
| V9 | E5 | BulkEditor.jsx | Payload has NO addon_ids for non-dirty rows | Network tab |
| V10 | E6 | BulkEditor.jsx | Sub-row spans full width, no layout break | Browser |
| V11 | E7 | BulkEditor.jsx | Chip shows "None" grey when food has no addons | Browser |
| V12 | E7 | BulkEditor.jsx | Variation chip non-clickable when count=0 | Browser |
| V13 | E8 | AddonExpandPanel.jsx | All restaurant addons listed as checkboxes | Browser |
| V14 | E8 | AddonExpandPanel.jsx | Food's current addons pre-checked | Browser |
| V15 | E9 | VariationExpandPanel.jsx | Group names + values shown, no edit controls | Browser |
| V16 | Regression | BulkEditor.jsx | All Tier-1 columns still editable | Browser |
| V17 | Regression | BulkEditor.jsx | CR-140 swiggy/zomato columns unaffected | Browser |
| V18 | E10 | BulkEditor.jsx | Image column visible in table (between row-num and Name) | Browser |
| V19 | E10 | BulkEditor.jsx | Food with real image shows 36×36 thumbnail | Browser |
| V20 | E10 | BulkEditor.jsx | Food with no image shows grey placeholder | Browser |
| V21 | E11 | AddonExpandPanel.jsx | Food image shown at top of expand panel | Browser |

---

## 7. Scope Lock

**Files WILL change:** `components/panels/menu/BulkEditor.jsx`
**Files WILL be created:** `AddonExpandPanel.jsx`, `VariationExpandPanel.jsx`
**Files WILL NOT touch:** `MenuManagementPanel.jsx`, `menuManagementTransform.js`, `menuManagementService.js`, `ProductForm.jsx`, all R5 hotspots

---

## E10 — NEW SCOPE: Food Image Column in BulkEditor (owner-directed 2026-08-15)

**Source field:** `fromAPI.food()` L38 — `productImage: api.image?.includes('food-default-image') ? null : api.image || null`
**Already mapped:** YES — zero new API or transform work needed.

### E10a — `buildRow`: add productImage (after `variations: f.variations || []`)
```js
productImage: f.productImage || null,  // CR-145: food image for thumbnail column
```

### E10b — `BASE_COLUMNS`: add image column (before `productName` — first visible column after row-num)
```js
// CR-145: food thumbnail — always visible, non-editable, non-sortable
{ key: "productImage", label: "Img", type: "image", width: 52, tier: 1, alwaysVisible: true, readOnly: true },
```

### E10c — `isDirty`: image is never dirty (add to checks object)
```js
productImage: () => false,  // CR-145: read-only
```

### E10d — `CellRenderer`: handle `type === 'image'`
```jsx
// CR-145: food thumbnail
if (col.type === 'image') {
  return row.productImage ? (
    <img
      src={row.productImage}
      alt=""
      loading="lazy"
      style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover',
               border: '1px solid #e2e8f0', display: 'block' }}
      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
    />
  ) : (
    <div style={{ width: 36, height: 36, borderRadius: 6, background: '#f1f5f9',
                  border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#cbd5e1', fontSize: 16 }}>
      ○
    </div>
  );
}
```

**Performance mitigation:** `loading="lazy"` defers off-screen image loads. Container is fixed 36×36 so layout doesn't shift. `onError` swaps to placeholder if image 404s.

**Risk:** LOW — read-only column, no dirty tracking, no payload impact. `loading="lazy"` prevents render blocking for 97+ rows.

---

## E11 — Food Image in AddonExpandPanel (confirmation context)

**Purpose:** When the addon expand panel opens for a food row, show the food's image at the top-left of the panel header so the user can confirm they're editing the right food.

**Change in `AddonExpandPanel.jsx` header:**
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
  {/* CR-145: food image in expand panel header */}
  {foodImage ? (
    <img src={foodImage} alt="" loading="lazy"
      style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover',
               border: '1px solid #e2e8f0', flexShrink: 0 }}
    />
  ) : (
    <div style={{ width: 44, height: 44, borderRadius: 8, background: '#f1f5f9',
                  border: '1px solid #e2e8f0', flexShrink: 0 }} />
  )}
  <div>
    <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: 13 }}>Add-ons</div>
    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>{foodName}</div>
    <div style={{ fontSize: 11, color: '#94a3b8' }}>Check/uncheck to assign · {allAddons.length} available</div>
  </div>
</div>
```

**New prop added to AddonExpandPanel:** `foodImage` (string | null)
**Caller in BulkEditor E6:** pass `foodImage={row.productImage || null}`

**Risk:** LOW — additive prop on new component. VariationExpandPanel gets same treatment for consistency.

---

## 8. Post-Code Registry Checklist
```
- [ ] registry.json: CR-145 → IMPLEMENTED, pos_5_1
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: BulkEditor.jsx + 2 new files
- [ ] Code markers: // CR-145 in every modified/created file
```

**Code Reality:** NONE
**Conflict:** CLEAR
**Risk:** HIGH
**ODs resolved:** All 6 (OQ-1 to OQ-5 approved 2026-08-15; OQ-6 food image owner-directed 2026-08-15)
**Curl probe:** REQUIRED before E5 — verify addon_ids in PUT food-info
**Owner decisions at Gate 4:** NONE
