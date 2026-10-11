# BUG-371 IMPLEMENTATION PLAN — Bulk Editor: Variation Price Inline Editing
**Date:** 2026-09-01 | **Gate:** 3 | **Risk:** MEDIUM
**Execution order:** #4

---

## Step 0 — Entry Verification ✅
| Claim | Verified |
|---|---|
| `VariationExpandPanel.jsx` — fully read-only, 65 lines, no price input | ✅ |
| `BulkEditor.jsx:375` — `variations: () => false` | ✅ |
| `BulkEditor.jsx:1075-1082` — `<VariationExpandPanel variations={row.variations} onClose={closeExpand} />` | ✅ |
| `BulkEditor.jsx buildPayload:154` — no `variations` field in payload | ✅ |
| `menuManagementTransform.js toAPI:283` — `...(form.variations ? { variations: form.variations } : {})` — variations included IF present | ✅ (ProductForm only, not BulkEditor) |

---

## Edit 1 — VariationExpandPanel.jsx: add `onPriceChange` prop + price inputs (full rewrite)

Replace static chips with editable price inputs when `onPriceChange` is provided:

```jsx
// BUG-371: Add onPriceChange prop — when provided, renders inline price inputs per variation value
export default function VariationExpandPanel({ foodName, foodImage, variations = [], onClose, onPriceChange }) {
  return (
    <div style={{ padding: '14px 18px', background: '#fdf4ff' }}>
      {/* Header — unchanged */}
      ...
      {/* Variation groups — add price input */}
      {variations.map((group, gIdx) => (
        <div key={gIdx}>
          <div style={{ fontWeight:700, color:'#7c3aed', fontSize:10, textTransform:'uppercase' }}>
            {group.name}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
            {(group.values || []).map((val, vIdx) => (
              <div key={vIdx} style={{ display:'flex', alignItems:'center', gap:6,
                background:'#fdf4ff', border:'1px solid #e9d5ff',
                borderRadius:10, padding:'4px 10px' }}>
                <span style={{ fontSize:12, color:'#6b21a8' }}>{val.name}</span>
                {onPriceChange ? (
                  <>
                    <span style={{ fontSize:11, color:'#9333ea' }}>₹</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={val.price ?? 0}
                      onChange={e => onPriceChange(gIdx, vIdx, parseFloat(e.target.value) || 0)}
                      data-testid={`var-price-${gIdx}-${vIdx}`}
                      style={{ width:60, border:'1px solid #e9d5ff', borderRadius:5,
                               padding:'2px 6px', fontSize:12, color:'#6b21a8',
                               background:'white', outline:'none' }}
                    />
                  </>
                ) : (
                  <span style={{ fontSize:11, color:'#9333ea' }}>
                    {val.price > 0 ? `· ₹${val.price}` : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Footer — remove "Read-only" note when editable */}
      <div style={{ paddingTop:12, borderTop:'1px solid #e9d5ff' }}>
        <button onClick={onClose} style={{ background:'#fff', color:'#64748b',
          border:'1px solid #e2e8f0', padding:'6px 14px', borderRadius:6,
          fontSize:12, cursor:'pointer' }}>Close</button>
        {!onPriceChange && (
          <span style={{ fontSize:11, color:'#94a3b8', marginLeft:10 }}>
            Full variation editing → open Product Form for this item
          </span>
        )}
      </div>
    </div>
  );
}
```

---

## Edit 2 — BulkEditor.jsx: wire `onPriceChange` to track variation price edits

**2a: Handle variation price change in BulkEditor** (near `updateCell` or in a new handler, before `handleSave`):
```js
// BUG-371: update variation price inline in BulkEditor row state
const handleVariationPriceChange = useCallback((rowId, gIdx, vIdx, newPrice) => {
  setRows(prev => prev.map(row => {
    if (row._id !== rowId) return row;
    const vars = (row.variations || []).map((g, gi) =>
      gi !== gIdx ? g : {
        ...g,
        values: (g.values || []).map((v, vi) =>
          vi !== vIdx ? v : { ...v, price: newPrice }
        )
      }
    );
    return { ...row, variations: vars };
  }));
}, []);
```

**2b: Update `isDirty` for variations** (line 375):
```js
// BEFORE:
variations:   () => false, // CR-145: read-only
// AFTER (BUG-371):
variations: (row) => {
  const orig = row._original?.variations;
  if (!orig || !row.variations) return false;
  return JSON.stringify(row.variations) !== JSON.stringify(orig);
},
```

**2c: Pass `onPriceChange` to VariationExpandPanel** (line 1076-1081):
```jsx
// BEFORE:
<VariationExpandPanel
  foodName={row.productName}
  foodImage={row.productImage || null}
  variations={row.variations || []}
  onClose={closeExpand}
/>
// AFTER (BUG-371):
<VariationExpandPanel
  foodName={row.productName}
  foodImage={row.productImage || null}
  variations={row.variations || []}
  onClose={closeExpand}
  onPriceChange={(gIdx, vIdx, price) => handleVariationPriceChange(row._id, gIdx, vIdx, price)}
/>
```

---

## Edit 3 — BulkEditor.jsx `buildPayload`: include updated variations in save
**Location:** `buildPayload` (line 154), after existing fields:
```js
// BUG-371: include variation updates if present (price editing support)
...(row.variations && row.variations.length > 0 ? {
  variation: row.variations.map(g => ({
    name: g.name,
    values: (g.values || []).map(v => ({ name: v.name, price: v.price ?? 0 }))
  }))
} : {}),
```

---

## Verification Matrix

| # | Edit | How to Verify |
|---|---|---|
| E1 | VariationExpandPanel shows price inputs | Open variation expand in BulkEditor → price input visible per variation value |
| E2a | Price change updates row state | Type new price → React DevTools: `row.variations[0].values[0].price` updates |
| E2b | isDirty detects variation change | Change a price → dirty count increases → Save button enables |
| E2c | onPriceChange wired | Change price → no error thrown |
| E3 | Save includes variations | Change price → Save → Network tab: POST payload includes `variation` array with new price |
| V1 | Core flow | Open BulkEditor → expand variations for an item → edit 30ml price → save → reload → price updated |
| V2 | Read-only regression | Variation expand still shows values correctly when opened (no crash) |
| V3 | Non-dirty rows unaffected | Edit variation price on item A → item B rows not affected |

---

## Scope Lock
**Files WILL change:** `VariationExpandPanel.jsx` (full rewrite), `BulkEditor.jsx` (3 edits)
**Files will NOT touch:** `menuManagementTransform.js`, `ProductForm.jsx`, `menuManagementService.js`

---

## Post-Code Registry Checklist
- [ ] registry.json: BUG-371 → IMPLEMENTED, sprint_key: pos_5_1
- [ ] BUG_TRACKER.md row updated
- [ ] FILE_OWNERSHIP.md: VariationExpandPanel.jsx + BulkEditor.jsx listed
- [ ] Code markers: `// BUG-371` in each modified file
- [ ] Compile: webpack 0 new warnings
