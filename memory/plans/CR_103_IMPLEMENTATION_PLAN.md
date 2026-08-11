# CR-103 — Implementation Plan (Gate 3)

**Date:** 2026-07-24
**Impact Analysis:** `impact/CR_103_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Code Reality:** PARTIAL (× button exists; select-all: NONE)
**Risk:** MEDIUM (SmartPurchasePanel is stateful, but changes are additive)
**Scope Lock:** 2 files WILL change, all others WILL NOT touch

---

## Verification Matrix

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `SmartPurchasePanel.jsx:18` | Add `selectedRows` state | Code inspection | NO |
| 2 | `SmartPurchasePanel.jsx:113-115` | Add toggle/bulkRemove handlers | Code inspection | NO |
| 3 | `SmartPurchasePanel.jsx:102-109` | Filter activeRows (rate > 0) for grouping + validate | Browser: submit with unfilled rows → succeeds | NO |
| 4 | `SmartPurchasePanel.jsx:210-216` | Pass new props to AutoShoppingList | Code inspection | NO |
| 5 | `AutoShoppingList.jsx:90-93` | Add checkbox column header + Select All | Browser: checkbox in header toggles all rows | NO |
| 6 | `AutoShoppingList.jsx:103` | Add checkbox per row | Browser: individual checkboxes work | NO |
| 7 | `AutoShoppingList.jsx:143-146` | Make × button prominent | Browser: × is visually clear, red tinted | NO |
| 8 | `AutoShoppingList.jsx:85` | Add "Remove Selected" toolbar button | Browser: button appears with count, removes checked rows | NO |

---

## Edits (Execution Sequence)

### Edit 1: `SmartPurchasePanel.jsx` — Add selection state + handlers

**File:** `components/inventory/SmartPurchasePanel.jsx`
**Line:** After L18 (`const [rows, setRows] = useState([]);`)
**New:**
```js
  const [selectedRows, setSelectedRows] = useState(new Set()); // CR-103: bulk selection
```

**Line:** After L115 (`const onAddAdHoc = ...`)
**New:**
```js
  // CR-103: Selection handlers for bulk remove
  const onToggleRow = (ix) => setSelectedRows(prev => {
    const next = new Set(prev);
    next.has(ix) ? next.delete(ix) : next.add(ix);
    return next;
  });
  const onToggleAll = () => setSelectedRows(prev =>
    prev.size === rows.length ? new Set() : new Set(rows.map((_, i) => i))
  );
  const onBulkRemove = () => {
    setRows(prev => prev.filter((_, i) => !selectedRows.has(i)));
    setSelectedRows(new Set());
  };
```

### Edit 2: `SmartPurchasePanel.jsx` — Filter active rows for validate + grouping

**File:** `components/inventory/SmartPurchasePanel.jsx`
**Line:** L102-109 (groupedByVendor useMemo)
**Current:**
```js
  const groupedByVendor = useMemo(() => {
    const g = {};
    rows.forEach(r => {
      const key = String(r.vendor_id ?? 'null');
      if (!g[key]) g[key] = [];
      g[key].push(r);
    });
    return g;
  }, [rows]);
```
**New:**
```js
  // CR-103 Sub-A: Only include rows where user intends to buy (rate > 0)
  const activeRows = useMemo(() => rows.filter(r => Number(r.rate) > 0), [rows]);
  const groupedByVendor = useMemo(() => {
    const g = {};
    activeRows.forEach(r => {
      const key = String(r.vendor_id ?? 'null');
      if (!g[key]) g[key] = [];
      g[key].push(r);
    });
    return g;
  }, [activeRows]);
```

**Line:** L118-131 (validate)
**Current:**
```js
  const validate = () => {
    const badRate = rows.find(r => !(Number(r.rate) > 0));
    if (badRate) return `Rate must be > 0 for ${badRate.name}`;
    const badQty = rows.find(r => !(Number(r.qty ?? r.suggest_qty) > 0));
    if (badQty) return `Quantity must be > 0 for ${badQty.name}`;
    ...
  };
```
**New:**
```js
  // CR-103 Sub-A: Validate only active rows (rate > 0); skip untouched rows
  const validate = () => {
    if (activeRows.length === 0) return 'No items to purchase — enter rate for at least one item';
    const badQty = activeRows.find(r => !(Number(r.qty ?? r.suggest_qty) > 0));
    if (badQty) return `Quantity must be > 0 for ${badQty.name}`;
    const missingPm = Object.keys(groupedByVendor).find(vid => !pmByVendor[vid]);
    if (missingPm) return `Payment method required for ${vendorNamesById[missingPm] || 'vendor #' + missingPm}`;
    return null;
  };
```

**Line:** L173 (canSubmit)
**Current:** `const canSubmit = rows.length > 0 && !submitting;`
**New:** `const canSubmit = activeRows.length > 0 && !submitting; // CR-103: only active rows count`

### Edit 3: `SmartPurchasePanel.jsx` — Pass new props

**Line:** L210-216 (AutoShoppingList props)
**Current:**
```jsx
            onRowChange={onRowChange}
            onRowRemove={onRowRemove}
            onAddAdHoc={onAddAdHoc}
```
**New:**
```jsx
            onRowChange={onRowChange}
            onRowRemove={onRowRemove}
            onAddAdHoc={onAddAdHoc}
            selectedRows={selectedRows}
            onToggleRow={onToggleRow}
            onToggleAll={onToggleAll}
            onBulkRemove={onBulkRemove}
```

### Edit 4: `AutoShoppingList.jsx` — Add props + checkbox column header

**File:** `components/inventory/smart/AutoShoppingList.jsx`
**Line:** Component props (at function declaration, ~L17-20 area)
**Add to props:** `selectedRows, onToggleRow, onToggleAll, onBulkRemove`

**Line:** L85 area (before the table, inside the card)
**New:** Add toolbar with "Remove Selected" button:
```jsx
        {/* CR-103 Sub-C: Bulk remove toolbar */}
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-b border-red-100">
            <span className="text-sm font-medium text-red-700">{selectedRows.size} selected</span>
            <Button size="sm" variant="destructive" onClick={onBulkRemove} className="h-7 text-xs"
              data-testid="bulk-remove-btn">
              Remove Selected
            </Button>
          </div>
        )}
```

**Line:** L90-93 (header columns)
**Current:**
```jsx
{['Ingredient', 'On-Hand', 'Status', 'Projected Need · 7D', 'Gap', 'Qty to Buy *', 'Rate', 'Vendor * (suggested)', ''].map((h, i) => (
  <th key={i} className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
))}
```
**New:**
```jsx
<th className="py-2.5 px-3 border-b border-slate-200 w-10">
  <input type="checkbox" checked={rows.length > 0 && selectedRows.size === rows.length}
    onChange={onToggleAll} className="w-4 h-4 rounded border-slate-300 accent-red-500 cursor-pointer"
    data-testid="select-all-checkbox" />
</th>
{['Ingredient', 'On-Hand', 'Status', 'Projected Need · 7D', 'Gap', 'Qty to Buy *', 'Rate', 'Vendor * (suggested)', ''].map((h, i) => (
  <th key={i} className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
))}
```

### Edit 5: `AutoShoppingList.jsx` — Add checkbox per row

**Line:** Inside row `<tr>`, before the first `<td>` (Ingredient name)
**New:**
```jsx
                  <td className="py-2 px-3">
                    <input type="checkbox" checked={selectedRows.has(ix)}
                      onChange={() => onToggleRow(ix)} className="w-4 h-4 rounded border-slate-300 accent-red-500 cursor-pointer"
                      data-testid={`row-select-${r.ingredient_id}`} />
                  </td>
```

**Also:** Update the empty-state `colSpan` from `9` to `10` (new checkbox column).

### Edit 6: `AutoShoppingList.jsx` — Prominent × button (Sub-B)

**Line:** L143-146
**Current:**
```jsx
<button type="button" onClick={() => onRowRemove(ix)}
  className="text-slate-400 hover:text-red-500" data-testid={`row-remove-${r.ingredient_id}`}>
  <X className="w-4 h-4" />
</button>
```
**New:**
```jsx
{/* CR-103 Sub-B: Prominent cross button */}
<button type="button" onClick={() => onRowRemove(ix)}
  className="p-1 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors" data-testid={`row-remove-${r.ingredient_id}`}>
  <X className="w-5 h-5" />
</button>
```

---

## Design Decisions (Locked)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Active rows filter | `rate > 0` | User intent: if they entered a rate, they want to buy it. No rate = skip. |
| 2 | Checkbox color | `accent-red-500` | Red for destructive selection (remove action). Matches the remove button. |
| 3 | Bulk remove bar | Conditional red banner at top | Only shows when ≥1 selected. Clear count + action button. |
| 4 | × button size | `w-5 h-5` with `p-1 rounded-full hover:bg-red-50` | Bigger icon + visible hover target. Not obtrusive at rest. |
| 5 | validate() empty check | `activeRows.length === 0` error | Prevents submitting with zero items when all rows are skipped. |

---

## Scope Lock

**Files WILL change:**
- `components/inventory/SmartPurchasePanel.jsx` (~20 lines: state + handlers + validate + props)
- `components/inventory/smart/AutoShoppingList.jsx` (~20 lines: checkbox column + toolbar + × styling)

**Files WILL NOT touch:**
- purchasePlanner.js, inventoryService.js, inventoryTransform.js, VendorSuggestionCell.jsx, AdHocTypeahead.jsx, InventorySetupPanel.jsx

## Post-Code Registry Checklist

- [ ] registry.json: CR-103 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add SmartPurchasePanel.jsx + AutoShoppingList.jsx with CR-103
- [ ] Code markers: // CR-103 comment in every modified section

---

**Next:** Gate 4 GO → Implementation
