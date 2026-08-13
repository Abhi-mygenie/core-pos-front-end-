# Implementation Plan — CR-114 + CR-115 (Smart Purchase UX Overhaul)

**IDs:** CR-114, CR-115
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-27
**Owner Decisions:** OD-7 (Expanded) ✅, OD-8 ([+ Add] button) ✅, OD-9 (Both: dropdown + category headers) ✅
**Mockup Approved:** `design-mockups/smart-purchase-comparison.html`

---

## Scope Lock
**Files WILL change:** `SmartPurchasePanel.jsx`, `AutoShoppingList.jsx`, `purchasePlanner.js`
**Files will NOT touch:** `VendorSuggestionCell.jsx`, `HorizonPicker.jsx`, `GroupedVendorPreview.jsx`, `inventoryService.js`, `inventoryTransform.js`

---

## Edit 1: purchasePlanner.js — Add categoryName to Output Rows

**Why:** The planner output rows don't include category info. We need it for category headers + dropdown filter.

**Where:** After the `return { ingredient_id, name, unit, ... }` blocks (around line 136 and line 168).

**Change:** Add `categoryName` field to each row by looking up from `stockInventory`:
```js
// In computePlan(), before returning rows:
// Build category lookup from stock inventory
const catLookup = new Map();
stockInventory.forEach(item => {
  if (item.id) catLookup.set(String(item.id), item.categoryName || item.category_name || 'Uncategorized');
});

// Add to each row in velocityRows, inStockRows, alertRows:
return { ...r, categoryName: catLookup.get(String(r.ingredient_id)) || 'Uncategorized' };
```

**Lines affected:** ~8 lines added.

---

## Edit 2: SmartPurchasePanel.jsx — Add Selection State + Category Lookup

**Add state (after line 20):**
```js
const [selectedForPurchase, setSelectedForPurchase] = useState(new Set()); // CR-114
const [searchQuery, setSearchQuery] = useState('');    // CR-115
const [categoryFilter, setCategoryFilter] = useState(''); // CR-115
```

**Add category list derivation (after ingredientsMaster is set):**
```js
const allCategories = useMemo(() => {
  const cats = new Set();
  rows.forEach(r => { if (r.categoryName) cats.add(r.categoryName); });
  return [...cats].sort();
}, [rows]);
```

**Modify `activeRows` (line 107):**
```js
// CR-114: Only include rows that are selected AND have rate > 0
const activeRows = useMemo(() =>
  rows.filter(r => selectedForPurchase.has(r.ingredient_id) && Number(r.rate) > 0),
  [rows, selectedForPurchase]
);
```

**Add selection handlers:**
```js
const onAddToPurchase = (ingredientId) => {
  setSelectedForPurchase(prev => new Set(prev).add(ingredientId));
};
const onRemoveFromPurchase = (ingredientId) => {
  setSelectedForPurchase(prev => { const next = new Set(prev); next.delete(ingredientId); return next; });
};
```

**Pass new props to AutoShoppingList:**
```jsx
<AutoShoppingList
  rows={rows}
  selectedForPurchase={selectedForPurchase}
  onAddToPurchase={onAddToPurchase}
  onRemoveFromPurchase={onRemoveFromPurchase}
  searchQuery={searchQuery}
  setSearchQuery={setSearchQuery}
  categoryFilter={categoryFilter}
  setCategoryFilter={setCategoryFilter}
  allCategories={allCategories}
  // ... existing props
/>
```

---

## Edit 3: AutoShoppingList.jsx — Two-Section Layout + Filter Bar

This is the largest edit. Restructure the component into:

### A. Props Update
Add new props: `selectedForPurchase`, `onAddToPurchase`, `onRemoveFromPurchase`, `searchQuery`, `setSearchQuery`, `categoryFilter`, `setCategoryFilter`, `allCategories`

### B. Derived Data
```js
const purchaseRows = rows.filter(r => selectedForPurchase.has(r.ingredient_id));
const availableRows = useMemo(() => {
  let available = rows.filter(r => !selectedForPurchase.has(r.ingredient_id));
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    available = available.filter(r => r.name.toLowerCase().includes(q));
  }
  if (categoryFilter) {
    available = available.filter(r => r.categoryName === categoryFilter);
  }
  return available;
}, [rows, selectedForPurchase, searchQuery, categoryFilter]);

// Group by category for headers
const groupedAvailable = useMemo(() => {
  const groups = {};
  availableRows.forEach(r => {
    const cat = r.categoryName || 'Uncategorized';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(r);
  });
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}, [availableRows]);
```

### C. JSX Structure
```jsx
{/* SECTION 1: Purchase List */}
<div className="section-purchase">
  <div className="section-header">🛒 Purchase List ({purchaseRows.length})</div>
  {purchaseRows.length === 0 ? (
    <EmptyState>Click [+ Add] below to start your purchase list</EmptyState>
  ) : (
    <table>/* existing table format with rate/qty/vendor columns */</table>
  )}
</div>

{/* SECTION 2: All Ingredients */}
<div className="section-available">
  <div className="section-header">📦 All Ingredients ({availableRows.length})</div>
  <div className="filter-bar">
    <SearchInput value={searchQuery} onChange={setSearchQuery} />
    <CategoryDropdown value={categoryFilter} onChange={setCategoryFilter} options={allCategories} />
    <span>{availableRows.length} of {rows.length - purchaseRows.length} items</span>
  </div>
  <table>
    {groupedAvailable.map(([cat, items]) => (
      <>
        <tr className="cat-header"><td colSpan={7}>{cat} ({items.length})</td></tr>
        {items.map(row => (
          <tr>
            <td>{row.name}</td>
            <td>{fmtQty(row.on_hand, row.unit)}</td>
            <td><StockBadge .../></td>
            <td>{row.velocity_per_day}/day</td>
            <td>{fmtQty(row.projected_need, row.unit)}</td>
            <td>{row.suggest_qty || '—'}</td>
            <td><button onClick={() => onAddToPurchase(row.ingredient_id)}>+ Add</button></td>
          </tr>
        ))}
      </>
    ))}
  </table>
</div>
```

**Estimated lines:** ~80 lines restructured, ~40 lines new.

---

## Execution Sequence

1. **purchasePlanner.js** — Add categoryName (no UI impact yet)
2. **SmartPurchasePanel.jsx** — Add state + handlers + pass props
3. **AutoShoppingList.jsx** — Restructure into two sections + filter bar

---

## Verification Matrix

| Edit # | File | Change | How to Verify |
|:---:|------|--------|---------------|
| 1 | purchasePlanner.js | categoryName field | `console.log(rows[0])` shows `categoryName` |
| 2 | SmartPurchasePanel.jsx | Selection state + handlers | Click [+ Add] → item moves to Purchase List |
| 3a | AutoShoppingList.jsx | Two-section layout | Browser: see "Purchase List" (empty) + "All Ingredients" (expanded) |
| 3b | AutoShoppingList.jsx | Search filter | Type in search → list filters in real-time |
| 3c | AutoShoppingList.jsx | Category dropdown | Select "Vegetables" → only vegetables shown |
| 3d | AutoShoppingList.jsx | Category headers | Items grouped under category names in Available section |
| 3e | AutoShoppingList.jsx | [+ Add] button | Click → item appears in Purchase List with pre-filled qty |

## Post-Code Registry Checklist
- [ ] registry.json: CR-114, CR-115 → IMPLEMENTED
- [ ] CR_REGISTRY.md: rows updated
- [ ] FILE_OWNERSHIP.md: 3 files listed
- [ ] Code markers: `// CR-114` + `// CR-115` in every modified file
