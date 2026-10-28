# Gate 3 — Implementation Plan: BUG-392
## Scroll Wheel Changes Number Input Values

**Date:** 2026-09-10
**Agent Role:** PLANNING (Role 2 — Gate 3)
**Protocol:** AGENT_PROMPT_ALPHA v0.7
**IA verified:** Line drift found — corrected below.
**Batch:** A — item 3. Safe to implement alongside BUG-390 + CR-373 (different lines).

---

## Entry Verification — Line Drift Corrections

| IA said | Live code | Corrected |
|---|---|---|
| ProductForm InputField line 15 | `<input` starts at line 15 (component def at line 10) | Add after `{...props}` spread (line 24) |
| VariationExpandPanel line 49 | `type="number"` at line 50 | **Line 50** |
| All other lines | Confirmed exact | ✅ no drift |

---

## Pattern applied in all edits

```js
onWheel={e => e.target.blur()}  // BUG-392
```
Added as a prop on each `<input type="number">`. Pure browser-event handler — no state, no API impact.

---

## Edits

### FILE 1: `src/components/panels/menu/ProductForm.jsx`

#### E1 — InputField component: add onWheel AFTER `{...props}`
**Location:** Line 24 area — the `{...props}` spread on the InputField `<input>`

```jsx
FROM:
      {...props}
    />
TO:
      {...props}
      onWheel={type === 'number' ? (e => e.target.blur()) : undefined} // BUG-392
    />
```
> This fixes all 10 InputField number fields (Price, Tax%, Discount, Kcal, Prep Time, Serve Time, Pack Charges, Takeaway Charge, Delivery Charge, Comp. Price) in one touch.

#### E2 — Line 168: Variation Min raw input
```jsx
FROM: <input type="number" value={variation.min || 0} min={0} onChange={...}
TO:   <input type="number" value={variation.min || 0} min={0} onWheel={e => e.target.blur()} onChange={...}  // BUG-392
```

#### E3 — Line 173: Variation Max raw input
```jsx
FROM: <input type="number" value={variation.max || 0} min={0} onChange={...}
TO:   <input type="number" value={variation.max || 0} min={0} onWheel={e => e.target.blur()} onChange={...}  // BUG-392
```

#### E4 — Line 539: New Addon Price raw input
```jsx
FROM: <input type="number" value={newAddonPrice} onChange={...} placeholder="Price"
TO:   <input type="number" value={newAddonPrice} onWheel={e => e.target.blur()} onChange={...} placeholder="Price"  // BUG-392
```

---

### FILE 2: `src/components/panels/menu/ProductCard.jsx`

#### E5 — Line 154 area: Price input (add before data-testid)
```jsx
FROM: data-testid="quick-edit-price"
TO:   onWheel={e => e.target.blur()}  // BUG-392
      data-testid="quick-edit-price"
```

#### E6 — Line ~211 area: Tax% input
```jsx
// Add onWheel prop to the Tax% number input in ProductCard
onWheel={e => e.target.blur()}  // BUG-392
```

---

### FILE 3: `src/components/panels/menu/BulkEditor.jsx`

#### E7 — Line 1319: Grid number input in renderCell
```jsx
FROM: return <input type="number" value={row[col.key] ?? 0} onChange={e => updateCell(...)}
TO:   return <input type="number" value={row[col.key] ?? 0} onWheel={e => e.target.blur()} onChange={e => updateCell(...)}  // BUG-392
```
> Covers ALL numeric columns (Price, Tax%, Discount, Comp.Price, Pack/Takeaway/Delivery Charge, Prep/Serve Time) across ALL rows.

---

### FILE 4: `src/components/panels/menu/AddonManagementPanel.jsx`

#### E8 — Line 156: Add addon Price
```jsx
FROM: <input type="number" value={addForm.price} onChange={...}
TO:   <input type="number" value={addForm.price} onWheel={e => e.target.blur()} onChange={...}  // BUG-392
```

#### E9 — Line 158: Add addon Weight
```jsx
FROM: <input type="number" value={addForm.weight} onChange={...}
TO:   <input type="number" value={addForm.weight} onWheel={e => e.target.blur()} onChange={...}  // BUG-392
```

#### E10 — Line 237: Edit addon Price
```jsx
FROM: <input type="number" value={editForm.price} onChange={...}
TO:   <input type="number" value={editForm.price} onWheel={e => e.target.blur()} onChange={...}  // BUG-392
```

#### E11 — Line 239: Edit addon Weight
```jsx
FROM: <input type="number" value={editForm.weight} onChange={...}
TO:   <input type="number" value={editForm.weight} onWheel={e => e.target.blur()} onChange={...}  // BUG-392
```

---

### FILE 5: `src/components/panels/menu/VariationExpandPanel.jsx`

#### E12 — Line 50: Variation option price (drift: IA said 49, actual is 50)
```jsx
// Add after type="number" line (line 50):
onWheel={e => e.target.blur()}  // BUG-392
```

---

## Summary

| File | Edits | Inputs fixed |
|---|---|---|
| `ProductForm.jsx` | E1–E4 | 10 (via InputField) + 3 raw = 13 |
| `ProductCard.jsx` | E5–E6 | 2 |
| `BulkEditor.jsx` | E7 | 11 cols × N rows |
| `AddonManagementPanel.jsx` | E8–E11 | 4 |
| `VariationExpandPanel.jsx` | E12 | 1 |
| **Total** | **12 edits, 5 files** | **31 inputs** |

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| V1 | Price field in ProductForm — scroll | Value unchanged |
| V2 | BulkEditor price cell — scroll grid | Price unchanged |
| V3 | ProductCard quick-edit price — scroll | Value unchanged |
| V4 | Addon add-form price — scroll | Value unchanged |
| V5 | Variation price — scroll | Value unchanged |
| V6 | Keyboard ↑↓ still works | Value increments |
| V7 | Page still scrolls after blur | Grid scrolls normally |

---

## Post-Code Registry Checklist

```
□ registry.json: BUG-392 → status: IMPLEMENTED, gate: 5, sprint_key: pos_7_0
□ BUG_TRACKER.md: row → IMPLEMENTED
□ FILE_OWNERSHIP.md: all 5 files → BUG-392 E1–E12 (date)
□ Code markers: // BUG-392 on each touched line
□ Compile: 0 new warnings
```

---

*Gate 3 complete. 5 files, 12 edits. Safe to implement in same session as BUG-390 + CR-373.*
