# CR-066 — Implementation Plan (Gate 3)

**ID:** CR-066
**Title:** Unit Price Management — Tab in Expense Setup
**Date:** 2026-07-11
**Agent:** PLANNING (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 3 — Implementation Plan
**Code Reality:** PARTIAL (service layer ready, transform partial, no UI)
**Impact Analysis:** `/app/memory/impact/CR_066_IMPACT_ANALYSIS.md` (Gate 2 — verified current)
**Conflict Pre-Check:** NONE — CR-067 completed, no other active CR touches target files.

---

## 0. Owner Decisions (All Locked — inherited from Gate 2 + session clarifications)

| # | Decision | Answer | Source |
|---|----------|--------|--------|
| Q1 | Route location | Tab inside `/expense-setup` (no new route/page) | Gate 2 |
| Q2 | Cashier restriction | No restriction now — deferred to separate CR | Gate 2 |
| Q3 | `quantity` + `price` → unit_price | unit_price = price ÷ quantity. Default qty=1 | Gate 2 |
| Q4 | Display | Two sections — "Not Priced Yet" (top) + "Priced" (bottom) | Gate 2 |
| Q5 | "Bulk Edit" button visibility | **Hide** when Unit Prices tab is active | Owner 2026-07-11 |
| Q6 | Search in Unit Prices tab | **Yes** — search filter for both sections | Owner 2026-07-11 |
| Q7 | Currency symbol | **Hardcode `₹`** | Owner 2026-07-11 |

---

## 1. Scope Lock

### Files WILL change

| # | File | Change type | Lines estimate |
|---|------|-------------|----------------|
| 1 | `api/transforms/expenseTransform.js` | Additive — `fromAPI.itemsWithoutPrices()` | +10 lines |
| 2 | `components/expense/ExpenseSetupPanel.jsx` | Additive — imports, state, functions, tab strip, unit price tab JSX, confirmation modal | +160 lines |

### Files will NOT touch
- `pages/ExpenseSetupPage.jsx` — shell unchanged
- `App.js` — no new route (tab, not page)
- `components/layout/Sidebar.jsx` — no new nav entry
- `api/services/expenseService.js` — all 5 functions ready, zero changes
- `components/expense/ExpenseBulkEditor.jsx` — CR-067 territory, no changes
- Any R5 hotspot files

---

## 2. Execution Sequence (12 edits, ordered by dependency)

### EDIT 1 — `expenseTransform.js`: Add `fromAPI.itemsWithoutPrices()`

**File:** `api/transforms/expenseTransform.js`
**Location:** After line 181 (closing `},` of `unitPrices`), before line 183 (`exportResponse` JSDoc)
**Type:** INSERT

**Current (lines 181–183):**
```javascript
  },

  /**
   * POST /bulk-export-expense → {message, downloadUrl}
```

**New (insert between line 181 and 183):**
```javascript
  },

  // CR-066: GET /expenses-without-unit-prices → [{id, title}]
  itemsWithoutPrices: (res) => {
    const data = res?.data?.data ?? res?.data ?? [];
    return Array.isArray(data)
      ? data.filter((i) => (i.stock_title ?? '').trim() !== '')
            .map((i) => ({ id: i.id, title: i.stock_title ?? '' }))
      : [];
  },

  /**
   * POST /bulk-export-expense → {message, downloadUrl}
```

**Rationale:** Filters out blank `stock_title` items (confirmed in curl: some items have `""` title). Returns minimal `{id, title}` shape for the "Not Priced Yet" section.

---

### EDIT 2 — `ExpenseSetupPanel.jsx`: Add imports

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Location:** Line 5–6 (lucide-react imports)
**Type:** REPLACE

**Current (lines 4–7):**
```javascript
import {
  Settings2, Plus, Pencil, Trash2, Check, X,
  Loader2, RefreshCw, List, TableProperties
} from "lucide-react";
```

**New:**
```javascript
import {
  Settings2, Plus, Pencil, Trash2, Check, X,
  Loader2, RefreshCw, List, TableProperties, Search
} from "lucide-react";
```

**Rationale:** `Search` icon needed for unit price tab search bar. No other new icons needed — currency symbol is text (`₹`).

---

### EDIT 3 — `ExpenseSetupPanel.jsx`: Add CR-066 state variables

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Location:** After line 95 (`const [deletingItemId, setDeletingItemId] = useState(null);`)
**Type:** INSERT after line 95

**New block to insert:**
```javascript

  // CR-066: Tab + Unit Price management state
  const [activeTab, setActiveTab] = useState('stock-master');
  const [unpricedItems, setUnpricedItems] = useState([]);
  const [pricedItems, setPricedItems] = useState([]);
  const [upLoading, setUpLoading] = useState(false);
  const [upSearch, setUpSearch] = useState('');
  const [settingPriceId, setSettingPriceId] = useState(null);
  const [newPriceQty, setNewPriceQty] = useState('1');
  const [newPriceAmount, setNewPriceAmount] = useState('');
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editPriceAmount, setEditPriceAmount] = useState('');
  const [deletingPriceId, setDeletingPriceId] = useState(null);
```

**State purpose:**
- `activeTab` — controls which tab content renders (`'stock-master'` | `'unit-prices'`)
- `unpricedItems` / `pricedItems` — local data for the two sections
- `upLoading` — loading spinner for unit price tab data fetch
- `upSearch` — search filter text shared by both sections
- `settingPriceId` — which unpriced row is in "set price" mode (inline form)
- `newPriceQty` / `newPriceAmount` — input values for the "set price" inline form
- `editingPriceId` / `editPriceAmount` — which priced row is in "edit" mode
- `deletingPriceId` — triggers the delete confirmation modal

---

### EDIT 4 — `ExpenseSetupPanel.jsx`: Add `fetchUnitPriceData` function

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Location:** After line 128 (`useEffect(() => { fetchAll(); }, []);`)
**Type:** INSERT after line 128

**New block to insert:**
```javascript

  // CR-066: Load unit price tab data
  const fetchUnitPriceData = useCallback(async () => {
    setUpLoading(true);
    try {
      const [pricesRes, withoutRes] = await Promise.all([
        expenseService.getUnitPrices(),
        expenseService.getItemsWithoutPrices(),
      ]);
      setPricedItems(fromAPI.unitPrices(pricesRes));
      setUnpricedItems(fromAPI.itemsWithoutPrices(withoutRes));
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to load unit prices", variant: "destructive" });
    } finally {
      setUpLoading(false);
    }
  }, [toast]);

  // CR-066: Fetch unit price data when tab switches to 'unit-prices'
  useEffect(() => {
    if (activeTab === 'unit-prices') fetchUnitPriceData();
  }, [activeTab, fetchUnitPriceData]);
```

**Rationale:** Lazy-load — only fetches when user clicks the "Unit Prices" tab. `Promise.all` for parallel fetch. Re-fetches each time tab is selected (fresh data guarantee).

---

### EDIT 5 — `ExpenseSetupPanel.jsx`: Add derived filtered state for search

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Location:** After the existing `itemCountFor` function (currently line 137). After Edit 4, this line will have shifted — insert after `itemCountFor`.
**Type:** INSERT after `itemCountFor`

**New block to insert:**
```javascript

  // CR-066: Filtered unit price items (search)
  const filteredUnpriced = unpricedItems.filter(
    (i) => !upSearch || i.title.toLowerCase().includes(upSearch.toLowerCase())
  );
  const filteredPriced = pricedItems.filter(
    (i) => !upSearch || i.stockTitle.toLowerCase().includes(upSearch.toLowerCase())
  );
```

---

### EDIT 6 — `ExpenseSetupPanel.jsx`: Add handler functions (Set / Edit / Delete price)

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Location:** After `handleDragEnd` (currently ends at line 270, `}, [allItems, categories, toast, fetchAll]);`). After preceding edits, insert after `handleDragEnd`.
**Type:** INSERT after `handleDragEnd`

**New block to insert:**
```javascript

  // CR-066: Set price on unpriced item
  const handleSetPrice = async (stockId) => {
    const qty = parseFloat(newPriceQty) || 1;
    const price = parseFloat(newPriceAmount);
    if (!price || price <= 0) return;
    try {
      await expenseService.addUnitPrice(stockId, qty, price);
      // Optimistic: move item from unpriced → priced
      const item = unpricedItems.find((i) => i.id === stockId);
      if (item) {
        setUnpricedItems((prev) => prev.filter((i) => i.id !== stockId));
        setPricedItems((prev) => [
          ...prev,
          { id: Date.now(), stockId, stockTitle: item.title, quantity: qty, price },
        ]);
      }
      setSettingPriceId(null);
      setNewPriceQty('1');
      setNewPriceAmount('');
      toast({ title: "Price set", description: `₹${(price / qty).toFixed(2)}/unit` });
      fetchUnitPriceData(); // Refresh to get real backend ID
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to set price", variant: "destructive" });
    }
  };

  // CR-066: Edit existing price (qty is read-only — API only accepts price)
  const handleEditPrice = async (priceId) => {
    const price = parseFloat(editPriceAmount);
    if (!price || price <= 0) return;
    try {
      await expenseService.editUnitPrice(priceId, price);
      setPricedItems((prev) =>
        prev.map((p) => (p.id === priceId ? { ...p, price } : p))
      );
      setEditingPriceId(null);
      setEditPriceAmount('');
      toast({ title: "Price updated" });
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to update price", variant: "destructive" });
    }
  };

  // CR-066: Delete price → item moves back to "Not Priced Yet"
  const handleDeletePrice = async () => {
    if (!deletingPriceId) return;
    try {
      const item = pricedItems.find((p) => p.id === deletingPriceId);
      await expenseService.deleteUnitPrice(deletingPriceId);
      setPricedItems((prev) => prev.filter((p) => p.id !== deletingPriceId));
      if (item) {
        setUnpricedItems((prev) => [...prev, { id: item.stockId, title: item.stockTitle }]);
      }
      setDeletingPriceId(null);
      toast({ title: "Price removed" });
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to delete price", variant: "destructive" });
      setDeletingPriceId(null);
    }
  };
```

**Design notes:**
- `handleSetPrice`: Optimistic update (instant UI feedback) + background refetch for real backend ID.
- `handleEditPrice`: Only `price` field editable per API contract (`PUT /stock-unit-price/{id}` accepts only `price`). Quantity change requires delete + re-add.
- `handleDeletePrice`: Moves item back to "Not Priced Yet" section optimistically.

---

### EDIT 7 — `ExpenseSetupPanel.jsx`: Conditionally hide "Bulk Edit" button

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Location:** Lines 307–312 (the "Bulk Edit" button in header)
**Type:** REPLACE

**Current (lines 307–312):**
```javascript
          <button onClick={() => setBulkMode(true)}
            className={btnBase}
            style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
            data-testid="setup-bulk-btn">
            <TableProperties className="w-3.5 h-3.5" /> Bulk Edit
          </button>
```

**New:**
```javascript
          {activeTab === 'stock-master' && (
            <button onClick={() => setBulkMode(true)}
              className={btnBase}
              style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
              data-testid="setup-bulk-btn">
              <TableProperties className="w-3.5 h-3.5" /> Bulk Edit
            </button>
          )}
```

**Rationale:** Owner decision Q5 — "Bulk Edit" only relevant for Stock Master tab.

---

### EDIT 8 — `ExpenseSetupPanel.jsx`: Refresh button aware of active tab

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Location:** Line 313 (the Refresh button `onClick`)
**Type:** REPLACE

**Current (line 313):**
```javascript
          <button onClick={fetchAll} className="p-1.5 rounded-lg border hover:bg-gray-50"
```

**New:**
```javascript
          <button onClick={activeTab === 'unit-prices' ? fetchUnitPriceData : fetchAll} className="p-1.5 rounded-lg border hover:bg-gray-50"
```

**Rationale:** Refresh should reload the active tab's data, not always the Stock Master data.

---

### EDIT 9 — `ExpenseSetupPanel.jsx`: Add tab strip after header

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Location:** After the closing `</div>` of the header section (line 318), before the DragDropContext comment (line 320).
**Type:** INSERT between line 318 and line 320

**New block:**
```jsx
      {/* CR-066: Tab strip — Stock Master | Unit Prices */}
      <div className="flex gap-0 mb-4 border-b" style={{ borderColor: COLORS.borderGray }}
        data-testid="setup-tab-strip">
        <button
          onClick={() => setActiveTab('stock-master')}
          className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: activeTab === 'stock-master' ? COLORS.primaryOrange : 'transparent',
            color: activeTab === 'stock-master' ? COLORS.primaryOrange : COLORS.grayText,
          }}
          data-testid="tab-stock-master">
          Stock Master
        </button>
        <button
          onClick={() => setActiveTab('unit-prices')}
          className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: activeTab === 'unit-prices' ? COLORS.primaryOrange : 'transparent',
            color: activeTab === 'unit-prices' ? COLORS.primaryOrange : COLORS.grayText,
          }}
          data-testid="tab-unit-prices">
          Unit Prices
        </button>
      </div>
```

---

### EDIT 10 — `ExpenseSetupPanel.jsx`: Wrap DragDropContext in tab conditional

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Location:** Line 320–322 (DragDropContext opening) and line 535 (DragDropContext closing)
**Type:** WRAP

**Current opening (lines 320–322):**
```javascript
      {/* ── Two-column layout with DnD context ─────────────────── */}
      {/* CR-059: DragDropContext wraps both columns — drag items (right) onto categories (left) */}
      <DragDropContext onDragEnd={handleDragEnd}>
```

**New opening:**
```javascript
      {/* ── Two-column layout with DnD context ─────────────────── */}
      {activeTab === 'stock-master' && (
      <>
      {/* CR-059: DragDropContext wraps both columns — drag items (right) onto categories (left) */}
      <DragDropContext onDragEnd={handleDragEnd}>
```

**Current closing (line 535):**
```javascript
      </DragDropContext>
```

**New closing:**
```javascript
      </DragDropContext>
      </>
      )}
```

---

### EDIT 11 — `ExpenseSetupPanel.jsx`: Add Unit Prices tab content

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Location:** After the DragDropContext conditional close (Edit 10's closing `)}`) and before the Delete Category Confirm modal (currently line 537).
**Type:** INSERT

**New block (Unit Prices tab — ~95 lines):**
```jsx
      {/* CR-066: Unit Prices Tab */}
      {activeTab === 'unit-prices' && (
        <div className="h-[calc(100vh-210px)] flex flex-col" data-testid="unit-prices-tab">
          {/* Search */}
          <div className="mb-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.grayText }} />
              <input
                value={upSearch} onChange={(e) => setUpSearch(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none focus:ring-1 focus:ring-orange-200"
                style={{ borderColor: COLORS.borderGray, maxWidth: 320 }}
                data-testid="up-search-input"
              />
            </div>
          </div>

          {upLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* ── Section A: Not Priced Yet ─────────────────────── */}
              <div className="bg-white rounded-xl border" style={{ borderColor: COLORS.borderGray }}
                data-testid="up-section-unpriced">
                <div className="px-4 py-3 border-b" style={{ borderColor: COLORS.borderGray }}>
                  <span className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
                    Not Priced Yet
                    <span className="text-xs font-normal ml-1.5" style={{ color: COLORS.grayText }}>
                      ({filteredUnpriced.length})
                    </span>
                  </span>
                </div>
                {filteredUnpriced.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm" style={{ color: COLORS.grayText }}>
                    {upSearch ? "No items match your search" : "All items have prices set"}
                  </div>
                ) : (
                  <div className="max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: COLORS.borderGray, background: COLORS.sectionBg }}>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Item</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 80 }}>Qty</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 100 }}>Price (₹)</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 90 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUnpriced.map((item) => (
                          <tr key={item.id} className="border-b last:border-0" style={{ borderColor: COLORS.borderGray }}
                            data-testid={`up-unpriced-row-${item.id}`}>
                            <td className="px-4 py-2.5 font-medium" style={{ color: COLORS.darkText }}>{item.title}</td>
                            {settingPriceId === item.id ? (
                              <>
                                <td className="px-2 py-1.5 text-center">
                                  <input type="number" min="1" step="1"
                                    value={newPriceQty} onChange={(e) => setNewPriceQty(e.target.value)}
                                    className="w-16 px-2 py-1 text-sm text-center rounded border outline-none focus:ring-1 focus:ring-orange-200"
                                    style={{ borderColor: COLORS.borderGray }}
                                    data-testid={`up-qty-input-${item.id}`} />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <input type="number" min="0.01" step="0.01" autoFocus
                                    value={newPriceAmount} onChange={(e) => setNewPriceAmount(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSetPrice(item.id); if (e.key === 'Escape') { setSettingPriceId(null); setNewPriceQty('1'); setNewPriceAmount(''); } }}
                                    placeholder="0.00"
                                    className="w-20 px-2 py-1 text-sm text-center rounded border outline-none focus:ring-1 focus:ring-orange-200"
                                    style={{ borderColor: COLORS.borderGray }}
                                    data-testid={`up-price-input-${item.id}`} />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => handleSetPrice(item.id)}
                                      disabled={!newPriceAmount || parseFloat(newPriceAmount) <= 0}
                                      className="p-1 rounded hover:bg-green-50 disabled:opacity-40"
                                      data-testid={`up-confirm-price-${item.id}`}>
                                      <Check className="w-3.5 h-3.5" style={{ color: COLORS.primaryGreen }} />
                                    </button>
                                    <button onClick={() => { setSettingPriceId(null); setNewPriceQty('1'); setNewPriceAmount(''); }}
                                      className="p-1 rounded hover:bg-gray-100">
                                      <X className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-2.5 text-center" style={{ color: COLORS.grayText }}>—</td>
                                <td className="px-4 py-2.5 text-center" style={{ color: COLORS.grayText }}>—</td>
                                <td className="px-4 py-2.5 text-center">
                                  <button onClick={() => { setSettingPriceId(item.id); setNewPriceQty('1'); setNewPriceAmount(''); }}
                                    className="px-2.5 py-1 text-xs font-medium rounded-lg border hover:opacity-90"
                                    style={{ borderColor: COLORS.primaryGreen, color: COLORS.primaryGreen }}
                                    data-testid={`up-set-price-btn-${item.id}`}>
                                    Set Price
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Section B: Priced ─────────────────────────────── */}
              <div className="bg-white rounded-xl border" style={{ borderColor: COLORS.borderGray }}
                data-testid="up-section-priced">
                <div className="px-4 py-3 border-b" style={{ borderColor: COLORS.borderGray }}>
                  <span className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
                    Priced
                    <span className="text-xs font-normal ml-1.5" style={{ color: COLORS.grayText }}>
                      ({filteredPriced.length})
                    </span>
                  </span>
                </div>
                {filteredPriced.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm" style={{ color: COLORS.grayText }}>
                    {upSearch ? "No priced items match your search" : "No unit prices set yet"}
                  </div>
                ) : (
                  <div className="max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: COLORS.borderGray, background: COLORS.sectionBg }}>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>Item</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 70 }}>Qty</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 100 }}>Price (₹)</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 110 }}>Unit Price</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText, width: 90 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPriced.map((item) => (
                          <tr key={item.id} className="border-b last:border-0" style={{ borderColor: COLORS.borderGray }}
                            data-testid={`up-priced-row-${item.id}`}>
                            <td className="px-4 py-2.5 font-medium" style={{ color: COLORS.darkText }}>{item.stockTitle}</td>
                            <td className="px-4 py-2.5 text-center" style={{ color: COLORS.grayText }}>
                              {item.quantity}
                            </td>
                            {editingPriceId === item.id ? (
                              <td className="px-2 py-1.5 text-center">
                                <input type="number" min="0.01" step="0.01" autoFocus
                                  value={editPriceAmount}
                                  onChange={(e) => setEditPriceAmount(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditPrice(item.id); if (e.key === 'Escape') { setEditingPriceId(null); setEditPriceAmount(''); } }}
                                  className="w-20 px-2 py-1 text-sm text-center rounded border outline-none focus:ring-1 focus:ring-orange-200"
                                  style={{ borderColor: COLORS.borderGray }}
                                  data-testid={`up-edit-price-input-${item.id}`} />
                              </td>
                            ) : (
                              <td className="px-4 py-2.5 text-center font-medium" style={{ color: COLORS.darkText }}>
                                ₹{item.price.toFixed(2)}
                              </td>
                            )}
                            <td className="px-4 py-2.5 text-center text-xs font-semibold" style={{ color: COLORS.primaryGreen }}>
                              ₹{(item.price / item.quantity).toFixed(2)}/unit
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-center gap-0.5">
                                {editingPriceId === item.id ? (
                                  <>
                                    <button onClick={() => handleEditPrice(item.id)}
                                      disabled={!editPriceAmount || parseFloat(editPriceAmount) <= 0}
                                      className="p-1 rounded hover:bg-green-50 disabled:opacity-40"
                                      data-testid={`up-edit-confirm-${item.id}`}>
                                      <Check className="w-3.5 h-3.5" style={{ color: COLORS.primaryGreen }} />
                                    </button>
                                    <button onClick={() => { setEditingPriceId(null); setEditPriceAmount(''); }}
                                      className="p-1 rounded hover:bg-gray-100">
                                      <X className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => { setEditingPriceId(item.id); setEditPriceAmount(String(item.price)); }}
                                      className="p-1 rounded hover:bg-orange-50"
                                      data-testid={`up-edit-btn-${item.id}`}>
                                      <Pencil className="w-3 h-3" style={{ color: COLORS.primaryOrange }} />
                                    </button>
                                    <button onClick={() => setDeletingPriceId(item.id)}
                                      className="p-1 rounded hover:bg-red-50"
                                      data-testid={`up-delete-btn-${item.id}`}>
                                      <Trash2 className="w-3 h-3" style={{ color: COLORS.errorText }} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
```

---

### EDIT 12 — `ExpenseSetupPanel.jsx`: Add Delete Price confirmation modal

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Location:** After the Delete Item Confirm modal (currently ends at line 577), before the closing `</div>` (line 578).
**Type:** INSERT

**New block:**
```jsx
      {/* CR-066: Delete Price Confirm */}
      {deletingPriceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 border" style={{ borderColor: COLORS.borderGray }}
            data-testid="delete-price-confirm">
            <h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>Remove Unit Price?</h3>
            <p className="text-sm mb-5" style={{ color: COLORS.grayText }}>
              This item will move back to "Not Priced Yet." You can set a new price later.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingPriceId(null)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}>Cancel</button>
              <button onClick={handleDeletePrice}
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ background: COLORS.errorText }}
                data-testid="delete-price-confirm-btn">Remove</button>
            </div>
          </div>
        </div>
      )}
```

---

## 3. Verification Matrix (seeds QA handover)

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1 | `expenseTransform.js` | `itemsWithoutPrices()` transform | Unit: returns `[{id, title}]`, filters blanks | YES |
| 2 | `ExpenseSetupPanel.jsx` | `Search` import added | Compile check — no unused/missing import warning | YES |
| 3 | `ExpenseSetupPanel.jsx` | 12 new state variables | Compile: no undefined references | YES |
| 4 | `ExpenseSetupPanel.jsx` | `fetchUnitPriceData()` + useEffect | Browser: switch to Unit Prices tab → Network shows 2 API calls | NO |
| 5 | `ExpenseSetupPanel.jsx` | `filteredUnpriced` / `filteredPriced` | Browser: type in search → both sections filter | NO |
| 6a | `ExpenseSetupPanel.jsx` | `handleSetPrice` | Browser: set qty=1, price=50 → item moves to Priced section, shows ₹50.00/unit | NO |
| 6b | `ExpenseSetupPanel.jsx` | `handleSetPrice` (qty>1) | Browser: set qty=30, price=180 → shows ₹6.00/unit | NO |
| 6c | `ExpenseSetupPanel.jsx` | `handleEditPrice` | Browser: edit price → updates inline, unit price recalculates | NO |
| 6d | `ExpenseSetupPanel.jsx` | `handleDeletePrice` | Browser: delete → item moves back to Not Priced Yet | NO |
| 7 | `ExpenseSetupPanel.jsx` | Bulk Edit hidden on Unit Prices tab | Browser: switch tabs → Bulk Edit disappears/appears | NO |
| 8 | `ExpenseSetupPanel.jsx` | Refresh context-aware | Browser: refresh on Unit Prices tab → reloads prices, not stock master | NO |
| 9 | `ExpenseSetupPanel.jsx` | Tab strip renders | Browser: `/expense-setup` shows 2 tabs, default=Stock Master | NO |
| 10 | `ExpenseSetupPanel.jsx` | DragDropContext hidden on Unit Prices tab | Browser: switch to Unit Prices → no DnD layout visible | NO |
| 11 | `ExpenseSetupPanel.jsx` | Unit Prices tab content | Browser: two sections render with correct data | NO |
| 12 | `ExpenseSetupPanel.jsx` | Delete Price modal | Browser: click delete → modal appears → confirm → item moves | NO |

---

## 4. Risk Register

| Risk | Level | Mitigation |
|------|-------|------------|
| `editUnitPrice(id, price)` only accepts `price` — can't update `quantity` | LOW | Qty shown as read-only on edit. User must delete + re-add to change qty. Acceptable UX per Q3 lock. |
| `getItemsWithoutPrices()` returns items with blank `stock_title` | LOW | Edit 1 filters `(stock_title ?? '').trim() !== ''` |
| Optimistic update uses `Date.now()` as temp ID before refetch | LOW | `fetchUnitPriceData()` fires immediately after set/delete — real ID replaces temp within ~500ms. No user-visible issue. |
| Tab switch triggers full refetch each time | LOW | Acceptable for now (only 2 API calls, small payload). Cache can be added later if perf is a concern. |
| No financial/billing impact | NONE | Unit prices = cost tracking, not customer-facing. R6 does not apply. |
| No hotspot files touched | NONE | R5 does not apply. |

---

## 5. Post-Code Registry Checklist

The Implementation agent MUST execute this after coding:

- [ ] `registry.json`: CR-066 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `CR_REGISTRY.md`: row updated with IMPLEMENTED status
- [ ] `FILE_OWNERSHIP.md`: `ExpenseSetupPanel.jsx` + `expenseTransform.js` listed with CR-066 + date
- [ ] Code markers: `// CR-066` comment in every modified file
- [ ] Compile check: webpack compiles with 0 new warnings from CR-066 changes

---

## 6. Execution Dependencies

| Dependency | Status |
|------------|--------|
| CR-067 (bulk editor redesign) must be done first | ✅ IMPLEMENTED (confirmed in code) |
| Service layer (5 functions) ready | ✅ No changes needed |
| `fromAPI.unitPrices()` transform ready | ✅ Already exists (line 170) |
| `fromAPI.itemsWithoutPrices()` | ❌ Edit 1 creates this |

---

## Summary

```
Planning complete: CR-066
Stage: Implementation Plan (Gate 3)
Code reality: PARTIAL (service layer + unitPrices transform ready, UI + itemsWithoutPrices transform missing)
Risk: LOW–MEDIUM (no R5/R6, no hotspot, additive only)
Files WILL change: ExpenseSetupPanel.jsx (+160 lines), expenseTransform.js (+10 lines)
Files WILL NOT touch: ExpenseSetupPage.jsx, App.js, Sidebar.jsx, expenseService.js, ExpenseBulkEditor.jsx, all R5 hotspots
Owner decisions: ALL LOCKED (Q1–Q7)
Verification matrix: 14 checks (3 automated compile, 11 manual browser)
Docs: /app/memory/plans/CR_066_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
```
