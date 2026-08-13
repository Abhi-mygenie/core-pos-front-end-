# BUG-203 Sub-B/C/D — Impact Analysis + Implementation Plan (Gate 2+3)

**Date:** 2026-07-17
**Role:** PLANNING (both gates, owner-requested)
**Sprint:** POS 5.0
**Preceding:** BUG-203 Sub-A SHIPPED. Intake doc updated with Sub-B/C/D scope.

---

## Impact Analysis (Gate 2)

### Code Reality
- Sub-A: FULL (shipped)
- Sub-B: NONE — new row price input + save chain missing
- Sub-C: PARTIAL — price input exists but save logic broken (missing pricedItems lookup)
- Sub-D: NONE — edit row ignores unitPrice, shows plain amount input

### Conflict Pre-Check
No other active item targets these code paths. BUG-204 (Add form qty×price) is shipped and stable.

### API Findings (curl-verified)
- `createCategoryWithItems` response returns `{ stock_items: [{ id, stock_title }] }` — **new item ID available** for chaining `addUnitPrice`
- `addUnitPrice(stockId, 1, price)` — works for new prices
- `editUnitPrice(rowId, price)` — works for existing prices, needs `rowId` from `pricedItems` lookup

---

## Implementation Plan (Gate 3)

### Scope-Lock

| File | Sub | Change |
|---|---|---|
| `ExpenseBulkEditor.jsx` | B | New row price input + save chain |
| `ExpenseBulkEditor.jsx` | C | Use pricedItems prop for edit-vs-add decision |
| `ExpenseSetupPanel.jsx` | C | Pass pricedItems prop to BulkEditor |
| `ExpenseEntryPanel.jsx` | D | Edit row: qty input + auto-calc for priced items |

---

### Edit 1 — Sub-B: Enable price input for new rows

**File:** `ExpenseBulkEditor.jsx`
**Current:** `{!row._isNew ? <input/> : <span>—</span>}`
**New:** Show input for ALL rows (remove `_isNew` guard):
```jsx
<div className="relative">
  <span ...>₹</span>
  <input type="number" value={row.unitPriceAmount ?? ""} onChange={...} placeholder="—" />
</div>
```

### Edit 2 — Sub-B: Chain addUnitPrice after new item creation

**File:** `ExpenseBulkEditor.jsx`, inside `processOne` for `_isNew` rows (after L370)
**Current:** `await createCategoryWithItems(...)` → mark saved
**New:**
```js
const res = await expenseService.createCategoryWithItems(cat.name, [row.title.trim()]);
const newItemId = res?.data?.stock_items?.[0]?.id;
// BUG-203 Sub-B: chain addUnitPrice if user entered a price
if (newItemId && row.unitPriceAmount != null && row.unitPriceAmount > 0) {
  try {
    await expenseService.addUnitPrice(newItemId, 1, row.unitPriceAmount);
  } catch (priceErr) {
    // Item created but price failed — partial success toast
  }
}
saved++;
```

### Edit 3 — Sub-C: Pass pricedItems prop to BulkEditor

**File:** `ExpenseSetupPanel.jsx`
**Current (L902):**
```jsx
<ExpenseBulkEditor items={allItems} categories={categories} onRefresh={fetchAll} onClose={...} />
```
**New:**
```jsx
<ExpenseBulkEditor items={allItems} categories={categories} pricedItems={pricedItems} onRefresh={fetchAll} onClose={...} />
```

### Edit 4 — Sub-C: Accept + use pricedItems in BulkEditor save

**File:** `ExpenseBulkEditor.jsx`
**Current prop destructure (L31):**
```js
const ExpenseBulkEditor = ({ items, categories, onRefresh, onClose }) => {
```
**New:**
```js
const ExpenseBulkEditor = ({ items, categories, pricedItems = [], onRefresh, onClose }) => {
```

**In save handler for existing rows (after the PUT call, ~L445):**
**Current:** Uses `addUnitPrice` blindly, catches error silently
**New:**
```js
if (priceChanged && row.unitPriceAmount != null && row.unitPriceAmount > 0) {
  const priceRow = pricedItems.find(p => String(p.stockId) === String(row._id));
  try {
    if (priceRow) {
      await expenseService.editUnitPrice(priceRow.id, row.unitPriceAmount);
    } else {
      await expenseService.addUnitPrice(parseInt(row._id, 10), 1, row.unitPriceAmount);
    }
  } catch (priceErr) {
    // Name/cat saved, price failed — toast warning
  }
  setRows(prev => prev.map(r => r._id === row._id
    ? { ...r, _originalPrice: row.unitPriceAmount } : r));
}
```

### Edit 5 — Sub-D: Edit expense row — qty + auto-calc for priced items

**File:** `ExpenseEntryPanel.jsx`, edit row rendering (L725-764)
**Current (L733-735):**
```jsx
<td><input type="number" value={editRow.d_amount} onChange={e => setEditRow(r => ({...r, d_amount: e.target.value}))} /></td>
```

**New:** Conditional on `editRow.unitPrice`:
```jsx
<td className="px-4 py-2">
  {editRow.unitPrice > 0 ? (
    <div className="flex items-center gap-1">
      <input type="number" value={editRow.quantity}
        onChange={e => {
          const q = e.target.value;
          const total = Math.round((editRow.unitPrice * (parseFloat(q) || 0)) * 100) / 100;
          setEditRow(r => ({ ...r, quantity: q, d_amount: total > 0 ? String(total) : "" }));
        }}
        placeholder="Qty" className={inputCls + " w-16 text-right"} style={inputStyle} />
      <span className="text-xs whitespace-nowrap" style={{ color: COLORS.grayText }}>
        = ₹{editRow.d_amount || "0"}
      </span>
    </div>
  ) : (
    <input type="number" value={editRow.d_amount}
      onChange={e => setEditRow(r => ({ ...r, d_amount: e.target.value }))}
      className={inputCls + " w-24 text-right"} style={inputStyle} />
  )}
</td>
```

---

## Verification Matrix

| # | Check | Sub | Method |
|---|---|---|---|
| V1 | Bulk Editor: new row has price input (not "—") | B | Browser |
| V2 | Bulk Editor: add new item with price → save → price persists in Unit Prices tab | B | Browser + curl |
| V3 | Bulk Editor: edit existing priced item's price → save → new price persists | C | Browser + curl |
| V4 | Bulk Editor: edit existing unpriced item, add price → save → price created | C | Browser + curl |
| V5 | Edit expense: priced item shows qty input + auto-calc amount | D | Browser |
| V6 | Edit expense: non-priced item shows editable amount (unchanged) | D | Browser |
| V7 | Edit expense: change qty → amount recalculates live | D | Browser |
| V8 | Regression: Add form (BUG-204) still works | — | Browser |
| V9 | Regression: Stock Master inline edit (Sub-A) still works | — | Browser |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-203 → IMPLEMENTED (all sub-issues)
- [ ] BUG_TRACKER.md: BUG-203 row updated
- [ ] FILE_OWNERSHIP.md: 3 files listed
- [ ] Code markers: // BUG-203 Sub-B/C/D
- [ ] testing_agent called
```

---

## Handover → Gate 4

```
Plan ready. 3 files, 5 edits, ~50 lines total.
Sub-A: SHIPPED. Sub-B/C/D: planned.
Verification: 9 checks.
No backend blocker. All services exist.
Awaiting Gate 4 GO.
```
