# BUG-203 — Implementation Plan (Gate 3)

**Date:** 2026-07-17
**Role:** PLANNING
**Gate:** 3 (Implementation Plan)
**Sprint:** POS 5.0
**Preceding doc:** `impact/BUG-203_IMPACT_ANALYSIS.md` (Gate 2 — all OQs locked)

---

## 0. Preconditions

| Precondition | Status |
|---|---|
| Impact Analysis (Gate 2) closed | ✅ |
| OQ-1 locked: (c) VALIDATE — price required, show error if empty | ✅ |
| OQ-2 locked: (a) YES — Bulk Editor price column included | ✅ |
| Backend 2-call workaround validated (editUnitPrice/addUnitPrice exist) | ✅ |
| Backend brief for §3.4 filed for future | ✅ |

---

## 1. Scope-Lock

### Files WILL change

| File | Purpose |
|---|---|
| `src/components/expense/ExpenseSetupPanel.jsx` | Add price input to inline edit row + 2-call save logic + eagerly load pricedItems lookup |
| `src/components/expense/ExpenseBulkEditor.jsx` | Add price column + 2-call save logic for price changes |

### Files WILL NOT touch
- `expenseService.js` — `editUnitPrice`, `addUnitPrice`, `deleteUnitPrice` already exist
- `expenseTransform.js` — `unitPrices` transform already exists
- `api/constants.js` — endpoints already registered
- `ExpenseEntryPanel.jsx` — separate scope (BUG-204)

**2 files, ~80-100 lines total.**

---

## 2. Phase-by-Phase Execution

### Phase A — Stock Master Inline Edit: Add Unit Price Field

**File:** `ExpenseSetupPanel.jsx`

#### Edit A1 — New state: `editItemPrice`

**Insert after L119** (existing edit state block):
```js
const [editItemPrice, setEditItemPrice] = useState("");  // BUG-203: unit price in inline edit
```

#### Edit A2 — `startEditItem`: initialize price from item

**Current (L521-526):**
```js
const startEditItem = (item) => {
  setEditingItemId(item.id);
  setEditItemName(item.title || "");
  setEditItemCategoryId(String(item.categoryId ?? ""));
  setEditError("");
};
```

**New:**
```js
const startEditItem = (item) => {
  setEditingItemId(item.id);
  setEditItemName(item.title || "");
  setEditItemCategoryId(String(item.categoryId ?? ""));
  // BUG-203: pre-fill unit price from item (null/0 = no price set)
  setEditItemPrice(item.unitPriceAmount ? String(item.unitPriceAmount) : "");
  setEditError("");
};
```
**Lines changed:** +1

#### Edit A3 — `cancelEditItem`: clear price state

**Current (L527-533):**
```js
const cancelEditItem = () => {
  setEditingItemId(null);
  setEditItemName("");
  setEditItemCategoryId("");
  setEditError("");
  setEditSaving(false);
};
```

**New — add 1 line:**
```js
  setEditItemPrice("");  // BUG-203
```

#### Edit A4 — Eagerly load `pricedItems` on Stock Master mount

**Current:** `pricedItems` only loads when `activeTab === 'unit-prices'` (L194).

**Add to `fetchAll` callback (after L165, alongside items+categories fetch):**
```js
// BUG-203: eagerly load unit prices for stockId→unitPriceRowId lookup in inline edit
const pricesRes = await expenseService.getUnitPrices();
setPricedItems(fromAPI.unitPrices(pricesRes));
```

**Or alternative:** Add `fetchUnitPriceData()` call to the initial mount `useEffect` at L173.

**Risk note:** 1 extra API call on mount. Acceptable — unit prices endpoint is fast (3 items on cafe103). Keeps pricedItems always in sync.

#### Edit A5 — `saveEditItem`: 2-call logic for price

**Insert after** existing PUT call succeeds (after L585 `toast` call), before `cancelEditItem()`:

```js
// BUG-203: 2-call workaround — update unit price if changed
const originalPrice = allItems.find(i => i.id === editingItemId)?.unitPriceAmount;
const newPrice = editItemPrice ? parseFloat(editItemPrice) : null;
const priceChanged = (originalPrice ?? null) !== newPrice;

if (priceChanged && newPrice != null && newPrice > 0) {
  try {
    // Find the unitPriceRowId from pricedItems lookup
    const priceRow = pricedItems.find(p => String(p.stockId) === String(editingItemId));
    if (priceRow) {
      // Edit existing price
      await expenseService.editUnitPrice(priceRow.id, newPrice);
    } else {
      // Add new price (item didn't have one before)
      await expenseService.addUnitPrice(editingItemId, 1, newPrice);
    }
    // Optimistic update: reflect new price in allItems
    setAllItems(prev => prev.map(i => i.id === editingItemId
      ? { ...i, unitPrice: true, unitPriceAmount: newPrice }
      : i));
    // Refresh pricedItems to keep lookup fresh
    const pricesRes = await expenseService.getUnitPrices();
    setPricedItems(fromAPI.unitPrices(pricesRes));
  } catch (priceErr) {
    // Name+cat saved but price failed — toast warning, don't revert name
    toast({ title: "Warning", description: "Item saved but price update failed: " + (priceErr.readableMessage || ""), variant: "destructive" });
  }
}
```

**Lines added:** ~20

#### Edit A6 — Validation: price required if item already has a unit price

**Insert in `saveEditItem` validation block (after L544):**
```js
// BUG-203: validate price if item is priced (OQ-1: price required, cannot clear via inline edit)
const originalItem = allItems.find(i => i.id === editingItemId);
if (originalItem?.unitPrice && (!editItemPrice || parseFloat(editItemPrice) <= 0)) {
  setEditError("Unit price is required. To remove price, use the Unit Prices tab.");
  return;
}
```

**Lines added:** ~5

#### Edit A7 — Inline edit row UI: add price input

**In the inline edit row rendering** (inside the `editingItemId === item.id` block), add a price input after the category dropdown:

```jsx
{/* BUG-203: unit price input in inline edit */}
<td className="px-2 py-2" style={{ width: 110 }}>
  {item.unitPrice || editItemPrice ? (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium"
        style={{ color: COLORS.grayText }}>₹</span>
      <input
        type="number" min="0" step="0.01"
        value={editItemPrice}
        onChange={e => setEditItemPrice(e.target.value)}
        placeholder="Price"
        className="w-full pl-5 pr-2 py-1 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200"
        style={{ borderColor: COLORS.borderGray }}
        data-testid={`item-edit-price-input-${item.id}`}
      />
    </div>
  ) : (
    <span className="text-xs" style={{ color: COLORS.grayText }}>No price</span>
  )}
</td>
```

**Lines added:** ~15

---

### Phase B — Bulk Editor: Add Price Column

**File:** `ExpenseBulkEditor.jsx`

#### Edit B1 — `buildRow`: track `unitPriceRowId` + `_originalPrice`

**Current (L14-28):** `buildRow` already has `unitPriceAmount`.

**Add:**
```js
_originalPrice: item.unitPriceAmount ?? null,  // BUG-203: track original for dirty detection
```

#### Edit B2 — Column header: add "PRICE" column

In the table header row, add after CATEGORY:
```jsx
<th className="px-3 py-2 text-left text-xs font-medium uppercase" style={{ color: COLORS.grayText, width: 110 }}>
  Price
</th>
```

#### Edit B3 — Row rendering: add price input cell

After the category `<td>`, add:
```jsx
<td className="px-3 py-2" style={{ width: 110 }}>
  {!row._isNew && (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: COLORS.grayText }}>₹</span>
      <input
        type="number" min="0" step="0.01"
        value={row.unitPriceAmount ?? ""}
        onChange={e => {
          const val = e.target.value;
          setRows(prev => prev.map(r => r._id === row._id
            ? { ...r, unitPriceAmount: val === "" ? null : parseFloat(val), _saveStatus: null }
            : r));
        }}
        placeholder="—"
        className="w-full pl-5 pr-2 py-1 text-sm rounded border outline-none focus:ring-1 focus:ring-orange-200"
        style={{ borderColor: COLORS.borderGray }}
        data-testid={`bulk-price-input-${row._id}`}
      />
    </div>
  )}
</td>
```

#### Edit B4 — Save handler: 2-call for price changes on existing rows

In the existing-row save block (after L376 PUT call), add:
```js
// BUG-203: if price changed, 2-call for unit price
const priceChanged = row.unitPriceAmount !== row._originalPrice;
if (priceChanged && row.unitPriceAmount != null && row.unitPriceAmount > 0) {
  // Need pricedItems lookup — passed as prop or fetched
  // Use addUnitPrice for simplicity (backend upserts or we catch dup)
  try {
    await expenseService.addUnitPrice(parseInt(row._id, 10), 1, row.unitPriceAmount);
  } catch {
    // Fallback: try editUnitPrice if add fails (price already exists)
    // This requires knowing the unitPriceRowId — may need prop from parent
  }
}
```

**Note:** The Bulk Editor currently doesn't receive `pricedItems` as a prop. Implementation agent should either:
- (a) Pass `pricedItems` as prop from `ExpenseSetupPanel.jsx`
- (b) Fetch unit prices inside BulkEditor on mount
- (c) Use `addUnitPrice` which the backend may handle as upsert

**Lines added across Phase B:** ~40-50

---

## 3. Verification Matrix

| # | Check | Method | Automated? |
|---|---|---|---|
| V1 | Inline edit: pencil → price input visible for priced items | Browser | Playwright |
| V2 | Inline edit: change price → save → price persists (verify via Unit Prices tab) | Browser + curl | Manual |
| V3 | Inline edit: clear price on priced item → validation error "Unit price required" | Browser | Playwright |
| V4 | Inline edit: unpriced item → "No price" label shown, no input | Browser | Playwright |
| V5 | Inline edit: add price to unpriced item → addUnitPrice called → price appears | Browser + Network | Manual |
| V6 | Inline edit: 2-call race condition — name saves even if price fails → warning toast | Browser | Manual |
| V7 | Bulk Editor: PRICE column visible in header | Browser | Playwright |
| V8 | Bulk Editor: price input per existing row, editable | Browser | Playwright |
| V9 | Bulk Editor: change price + save → persists | Browser + curl | Manual |
| V10 | Bulk Editor: new rows → no price input (only name + category) | Browser | Playwright |
| V11 | pricedItems loaded eagerly on Stock Master mount | Network tab | Manual |
| V12 | Regression: existing inline edit (name+cat) still works | Browser | testing_agent |
| V13 | Regression: Unit Prices tab still works (edit/add/delete) | Browser | testing_agent |
| V14 | Regression: bulk-select delete + move still works | Browser | testing_agent |

---

## 4. Execution Sequence

```
Phase A (Stock Master inline edit — 7 edits)
  ↓
Compile check + self-test
  ↓
Phase B (Bulk Editor price column — 4 edits)
  ↓
Compile check + self-test
  ↓
testing_agent regression
```

---

## 5. Post-Code Registry Checklist (R17)

```
- [ ] registry.json: BUG-203 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: BUG-203 row updated
- [ ] FILE_OWNERSHIP.md: add 2 files under BUG-203 heading
- [ ] Code markers: // BUG-203 in every modified location
- [ ] Verification Matrix: 14 checks executed
- [ ] testing_agent_v3 called with regression scope
- [ ] Session handover written
- [ ] Backend brief for §3.4 verified filed
```

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 2-call race: name saved, price fails | LOW | Partial save — confusing | Toast warning "Name saved, price failed"; don't revert name |
| pricedItems stale after Unit Prices tab edit | LOW | Wrong unitPriceRowId | Eagerly load on mount + refresh after save |
| Bulk Editor addUnitPrice fails if price row already exists | MEDIUM | 409/duplicate error | Catch → fallback to editUnitPrice; or fetch row ID first |
| Extra API call on mount (getUnitPrices) | LOW | ~100ms latency | Parallel with existing fetchAll calls |

---

## 7. Handover to Owner (→ Gate 4)

```
Plan ready at /app/memory/plans/BUG-203_IMPLEMENTATION_PLAN.md.
2 files, 2 phases (A: Stock Master, B: Bulk Editor), ~80-100 lines total.
Verification matrix: 14 checks.
Scope-lock: ExpenseSetupPanel.jsx + ExpenseBulkEditor.jsx ONLY.
Owner decisions: ALL locked (validate price, Bulk Editor included).
Backend: 2-call workaround (§3.4 brief filed for future single-call).
Awaiting Gate 4 GO.
```
