# CR-140 — Plan Amendments (Audit Pass)

**Date:** 2026-08-14  
**Source plan:** `plans/CR-140_AGGREGATOR_MENU_FOOD_ADD_EDIT_STOCKTOGGLE_IMPLEMENTATION_PLAN.md`  
**Audit result:** 5 gaps found. This file amends the base plan. Implementer must apply BOTH files.

---

## AMENDMENT A — ProductCard missing `clients` prop + QuickEditForm render (fixes GAP-A)

**Problem:** E5 adds `clients` to `QuickEditForm`'s props signature and uses it inside the form JSX, but:
1. `ProductCard` itself never declares `clients` in its own props
2. The QuickEditForm render call (L241-248) never passes `clients`

Result: `clients` is always `undefined` in QuickEditForm → brand dropdown shows only "Main".

### A1 — ProductCard props (replaces E5b in base plan)

**Current (L229-234):**
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
  menuType, clients, onStockToggleDone, // CR-140
}) => {
```

### A2 — QuickEditForm render call (L238-248) — pass menuType + clients

**Current:**
```jsx
  if (isQuickEditing) {
    return (
      <QuickEditForm
        product={product}
        categories={categories}
        currencySymbol={currencySymbol}
        onSave={onQuickSave}
        onCancel={onQuickCancel}
      />
    );
  }
```

**Replace with:**
```jsx
  if (isQuickEditing) {
    return (
      <QuickEditForm
        product={product}
        categories={categories}
        currencySymbol={currencySymbol}
        onSave={onQuickSave}
        onCancel={onQuickCancel}
        menuType={menuType}   // CR-140 A2
        clients={clients}     // CR-140 A2
      />
    );
  }
```

---

## AMENDMENT B — MenuManagementPanel separate useEffect (fixes GAP-B)

**Problem:** E9c in base plan says "add to existing useEffect at line 94" — but `fetchFoods` already re-runs on menuType change automatically (its `useCallback` dep array includes `menuType` at L38). Modifying L94-96 would double-trigger fetchFoods and break its existing behavior.

**Correct approach:** Keep L94-96 unchanged. Add a **separate** useEffect for clients.

### B1 — Keep E9c from base plan but as a NEW separate effect (do NOT modify L94-96)

**Leave L94-96 exactly as-is:**
```js
  useEffect(() => {
    if (isOpen) fetchFoods();
  }, [isOpen, fetchFoods]);  // ← DO NOT TOUCH
```

**Add NEW effect immediately after L96:**
```js
  // CR-140 GAP-3: Fetch clients when Aggregator tab is active
  useEffect(() => {
    if (!isOpen) return;
    if (menuType === 'Aggregator') {
      fetchClients();
    } else {
      setClients([]);
    }
  }, [isOpen, menuType, fetchClients]); // CR-140 B1
```

---

## AMENDMENT C — BulkEditor isDirty missing 3 field checks (fixes GAP-C)

**Problem:** `isDirty` (L258-302) has an explicit `checks` object. New fields not in `checks` always return `false` → user edits swiggy/zomato/clientId column but `isRowDirty` returns false → row not included in save batch → changes silently lost.

### C1 — Add to `checks` object inside isDirty (after last existing check `portionSize`)

**After** `portionSize: () => (o.portionSize || "") !== (row.portionSize || ""),` **add:**
```js
      // CR-140 GAP-6: Aggregator platform fields dirty detection
      swiggy:   () => (o.swiggy   ? 'Yes' : 'No') !== row.swiggy,
      zomato:   () => (o.zomato   ? 'Yes' : 'No') !== row.zomato,
      clientId: () => (o.clientId ?? 0)            !== row.clientId,
```

---

## AMENDMENT D — BulkEditor CellRenderer clientId dropdown (fixes GAP-D)

**Problem:** CellRenderer has explicit `if (col.key === "...")` branches for every dropdown. `clientId` column type is `"dropdown"` but has no branch → falls through to `return <span>—</span>` → cell renders as dash, not editable.

Additionally, CellRenderer receives only `catOptions`. It needs `clientOptions` for the brand dropdown.

### D1 — Pass `clientOptions` to CellRenderer

CellRenderer is called at L855:
```jsx
<CellRenderer col={col} row={row} updateCell={updateCell} catOptions={catOptions} dirty={isDirty(row, col.key)} />
```

**Replace with:**
```jsx
<CellRenderer col={col} row={row} updateCell={updateCell} catOptions={catOptions}
  clientOptions={clientOptions} dirty={isDirty(row, col.key)} />  // CR-140 D1
```

Compute `clientOptions` near `catOptions` (L253-256):
```js
  const clientOptions = useMemo(() =>
    [{ value: 0, label: 'Main Brand' }, ...(clients || []).map(c => ({ value: c.id, label: c.name }))],
    [clients]
  ); // CR-140 D1
```

### D2 — CellRenderer props signature: add `clientOptions`

**Current (L993):**
```js
const CellRenderer = React.memo(function CellRenderer({ col, row, updateCell, catOptions, dirty }) {
```

**Replace with:**
```js
const CellRenderer = React.memo(function CellRenderer({ col, row, updateCell, catOptions, clientOptions, dirty }) { // CR-140 D2
```

### D3 — Add `clientId` branch inside CellRenderer dropdown block

**After** the `itemUnit` branch (L1066-1073) and **before** the closing `}` of `if (col.type === "dropdown")`, **add:**
```jsx
    // CR-140 GAP-6: Brand dropdown for aggregator items
    if (col.key === "clientId") {
      return <select value={row.clientId ?? 0} onChange={e => updateCell(row._id, "clientId", Number(e.target.value))}
        className={base} style={{ color: COLORS.darkText, borderColor: bc }} data-testid={`cell-clientId-${row._id}`}>
        {(clientOptions || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>;
    }
```

---

## AMENDMENT E — BulkEditor ALL_COLUMNS: 8 refs, not 4 (fixes GAP-E)

**Problem:** Base plan says "Replace all 4 internal ALL_COLUMNS references". Actual count is **8**.

### E1 — Complete list of ALL_COLUMNS references to replace with `getColumns(menuType)`

| Line | Current | Replace with |
|------|---------|-------------|
| L178 | `ALL_COLUMNS.reduce(...)` | `getColumns(menuType).reduce(...)` |
| L303 | `ALL_COLUMNS.some(...)` | `getColumns(menuType).some(...)` |
| L560 | `ALL_COLUMNS.find(c => c.key === key)` | `getColumns(menuType).find(c => c.key === key)` |
| L638 | `ALL_COLUMNS.filter(c => c.tier === tier)` | `getColumns(menuType).filter(c => c.tier === tier)` |
| L647 | `ALL_COLUMNS.filter(c => visibleCols[c.key])` | `getColumns(menuType).filter(c => visibleCols[c.key])` |
| L648 | `ALL_COLUMNS.filter(c => visibleCols[c.key] && c.tier === 1)` | `getColumns(menuType).filter(c => visibleCols[c.key] && c.tier === 1)` |
| L700 | `ALL_COLUMNS.filter(c => c.tier === tier)` | `getColumns(menuType).filter(c => c.tier === tier)` |

**Note:** L178 is inside `useState` initializer. Since `menuType` is not yet available at useState init time (it's a prop), use `"Normal"` as the default at init — columns will re-derive when menuType prop changes via a separate `useEffect` that calls `setVisibleCols`:

```js
// L178 — initial state with Normal columns (default)
const [visibleCols, setVisibleCols] = useState(() =>
  getColumns("Normal").reduce((acc, c) => ({ ...acc, [c.key]: c.tier === 1 }), {})
);

// Add after L178 — sync visibleCols when menuType switches to/from Aggregator
useEffect(() => {
  setVisibleCols(getColumns(menuType).reduce((acc, c) => ({ ...acc, [c.key]: c.tier === 1 }), {}));
}, [menuType]); // CR-140 E1
```

This ensures aggregator columns start visible (tier 1) when switching to Aggregator mode.

---

## Amended Verification Matrix (additions to base plan)

| # | Amendment | File | Verification | Method |
|---|-----------|------|-------------|--------|
| VA1 | A2 | ProductCard.jsx | QuickEditForm shows brand dropdown in aggregator quick edit | browser |
| VB1 | B1 | MenuManagementPanel.jsx | L94-96 effect unchanged | grep |
| VB2 | B1 | MenuManagementPanel.jsx | New separate clients effect present | grep |
| VC1 | C1 | BulkEditor.jsx | isDirty detects swiggy change → row marked dirty | browser |
| VD1 | D1-D3 | BulkEditor.jsx | Brand dropdown renders in clientId cell | browser |
| VD2 | D1 | BulkEditor.jsx | clientOptions passed to CellRenderer | grep |
| VE1 | E1 | BulkEditor.jsx | All 7 ALL_COLUMNS refs replaced | grep |
| VE2 | E1 | BulkEditor.jsx | Switching Normal→Aggregator shows new columns | browser |
| VE3 | E1 | BulkEditor.jsx | Switching Aggregator→Normal hides new columns | browser |

---

## Amended Registry Checklist (addendum)

```
- [ ] ALL 5 amendments (A-E) verified before QA handover
- [ ] BulkEditor isDirty: swiggy/zomato/clientId entries present
- [ ] CellRenderer: clientId branch present + clientOptions prop wired
- [ ] ProductCard: clients prop in signature + passed to QuickEditForm
- [ ] MenuManagementPanel: L94-96 unchanged, separate clients effect added
```
