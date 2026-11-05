# CR-476 — Implementation Plan

**Item:** CR-476 — Batch Reorder Save: "Save Order" button for ProductList + CategoryList  
**Stage:** Gate 3 — Implementation Plan  
**Based on:** `/app/memory/impact/CR-476_IMPACT_ANALYSIS.md`  
**OD-476-06 (from Gate 3):** Save payload uses `cats` (all categories), not `filtered` — confirmed  
**Risk:** LOW · 2 files · non-hotspot · no API/service/route change  
**Entry verified:** All plan line numbers confirmed against current file state.

---

## Starting State Verification (run before touching any file)

```bash
# ProductList — confirm no CR-476 markers, confirm exact targets
grep -n "CR-476\|handleSaveOrder\|Save Order\|Check" \
  /app/frontend/src/components/panels/menu/ProductList.jsx | head -10
# Expected: 0 hits on CR-476 / handleSaveOrder / Save Order
# Check may already be in imports — verify separately:
grep -n "^import.*lucide" /app/frontend/src/components/panels/menu/ProductList.jsx

# CategoryList — same
grep -n "CR-476\|handleSaveOrder\|Save Order\|Check" \
  /app/frontend/src/components/panels/menu/CategoryList.jsx | head -10
```

---

## Execution Sequence

```
ProductList.jsx:
  E1 → Replace handleDragEnd (strip async + API call, keep local update)
  E2 → Add handleSaveOrder useCallback after handleDragEnd
  E3 → Add Check to lucide-react import
  E4 → Add Save Order + Discard buttons in toolbar header

CategoryList.jsx:
  E5 → Replace handleDragEnd (strip async + API call, keep local update)
  E6 → Add handleSaveOrder function after handleDragEnd
  E7 → Add Save Order + Discard buttons below search bar
```

E1+E2+E3+E4 target non-overlapping sections in ProductList → can be applied in parallel.  
E5+E6+E7 target non-overlapping sections in CategoryList → can be applied in parallel.  
Both files are independent → all 7 edits can be applied in one parallel batch.

Checkpoint after all edits: webpack must compile with 0 new warnings.

---

## E1 — ProductList: Replace `handleDragEnd` (strip API call, remove async)

**Current L68-92:**
```js
  // Drag-and-drop reorder — calls API #11
  const handleDragEnd = useCallback(async (result) => {
    if (!result.destination) return;
    const items = Array.from(filteredProducts);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    // Update local state optimistically
    const allItems = Array.from(products);
    const sourceIdx = allItems.findIndex((p) => p.productId === moved.productId);
    allItems.splice(sourceIdx, 1);
    const destItem = items[result.destination.index + 1];
    const destIdx = destItem ? allItems.findIndex((p) => p.productId === destItem.productId) : allItems.length;
    allItems.splice(destIdx, 0, moved);
    setLocalProducts(allItems);
    try {
      const payload = toAPI.reorderPayload('food', items);
      await menuService.quickReorder(payload.type, payload.items);
      toast({ title: "Reordered", description: "Product order saved." });
      onRefresh(); // BUG-620: refresh parent foods state so BulkEditor + card view both get updated order
    } catch (err) {
      console.error('[ProductList] Reorder failed:', err);
      toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
      setLocalProducts(null);
    }
  }, [filteredProducts, products, toast, onRefresh]); // BUG-620: added onRefresh to deps
```

**After E1:**
```js
  // CR-476: drag only updates local state — no API call per drag. Use Save Order button to persist.
  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;
    const items = Array.from(filteredProducts);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    const allItems = Array.from(products);
    const sourceIdx = allItems.findIndex((p) => p.productId === moved.productId);
    allItems.splice(sourceIdx, 1);
    const destItem = items[result.destination.index + 1];
    const destIdx = destItem ? allItems.findIndex((p) => p.productId === destItem.productId) : allItems.length;
    allItems.splice(destIdx, 0, moved);
    setLocalProducts(allItems);
  }, [filteredProducts, products]); // CR-476: removed async, toast, onRefresh
```

Key changes: `async` removed · entire `try/catch` block removed · `toast` and `onRefresh` removed from deps.

---

## E2 — ProductList: Add `handleSaveOrder` after `handleDragEnd`

**Insert immediately after the closing `}, [filteredProducts, products]);` of `handleDragEnd` (after the new E1 block), before `// Delete — calls API #4`:**

```js
  // CR-476: batch save — single API call for all pending drag reorder changes
  const handleSaveOrder = useCallback(async () => {
    if (!localProducts) return;
    try {
      const payload = toAPI.reorderPayload('food', filteredProducts);
      await menuService.quickReorder(payload.type, payload.items);
      toast({ title: "Order saved", description: "Product order updated." });
      onRefresh(); // refresh parent so BulkEditor picks up new order
      setLocalProducts(null); // CR-476: clear dirty state
    } catch (err) {
      console.error('[ProductList] Save order failed:', err);
      toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
    }
  }, [localProducts, filteredProducts, toast, onRefresh]); // CR-476
```

---

## E3 — ProductList: Add `Check` to lucide-react import

**Current L3:**
```js
import { Search, Plus, SlidersHorizontal } from "lucide-react";
```

**After E3:**
```js
import { Search, Plus, SlidersHorizontal, Check } from "lucide-react"; // CR-476: +Check for Save Order button
```

---

## E4 — ProductList: Add Save Order + Discard buttons in toolbar

**Current L190-198 (last two elements inside the header `<div>`):**
```jsx
        <button
          onClick={() => setEditingProduct("new")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: COLORS.primaryOrange }}
          data-testid="add-product-btn"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>
```

**After E4 — insert Save Order + Discard before closing `</div>`:**
```jsx
        <button
          onClick={() => setEditingProduct("new")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: COLORS.primaryOrange }}
          data-testid="add-product-btn"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
        {/* CR-476: Save Order + Discard — visible only when drag reorder has unsaved changes */}
        {localProducts && (
          <>
            <button
              onClick={handleSaveOrder}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
              style={{ backgroundColor: COLORS.primaryGreen }}
              data-testid="save-order-btn"
            >
              <Check className="w-4 h-4" /> Save Order
            </button>
            <button
              onClick={() => setLocalProducts(null)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
              data-testid="discard-order-btn"
            >
              Discard
            </button>
          </>
        )}
      </div>
```

---

## E5 — CategoryList: Replace `handleDragEnd` (strip API call, remove async)

**Current L37-53:**
```js
  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(cats);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setLocalCategories(items);
    try {
      const payload = toAPI.reorderPayload('category', items);
      await menuService.quickReorder(payload.type, payload.items);
      toast({ title: "Reordered", description: "Category order saved." });
      onRefresh(); // BUG-620: refresh parent categories state so BulkEditor + other views get updated order
    } catch (err) {
      console.error('[CategoryList] Reorder failed:', err);
      toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
      setLocalCategories(null);
    }
  };
```

**After E5:**
```js
  // CR-476: drag only updates local state — no API call per drag. Use Save Order button to persist.
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(cats);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setLocalCategories(items);
  };
```

Key changes: `async` removed · entire `try/catch` block removed.

---

## E6 — CategoryList: Add `handleSaveOrder` after `handleDragEnd`

**Insert immediately after the closing `};` of `handleDragEnd` (after new E5 block), before `const handleAdd = async () => {` at L55:**

```js
  // CR-476: batch save — single API call for all pending drag reorder changes (OD-476-06: send cats = full list)
  const handleSaveOrder = async () => {
    if (!localCategories) return;
    try {
      const payload = toAPI.reorderPayload('category', cats); // CR-476: OD-476-06 — cats (all), not filtered
      await menuService.quickReorder(payload.type, payload.items);
      toast({ title: "Order saved", description: "Category order updated." });
      onRefresh();
      setLocalCategories(null); // CR-476: clear dirty state
    } catch (err) {
      console.error('[CategoryList] Save order failed:', err);
      toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
    }
  };
```

---

## E7 — CategoryList: Add Save Order + Discard buttons below search bar

**Current L112-123 (search block in render):**
```jsx
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayText }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="category-search"
        />
      </div>
```

**After E7 — insert Save Order + Discard immediately after the search `</div>` at L123:**
```jsx
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayText }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="category-search"
        />
      </div>
      {/* CR-476: Save Order + Discard — visible only when drag reorder has unsaved changes */}
      {localCategories && (
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={handleSaveOrder}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white flex-1"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="save-category-order-btn"
          >
            Save Order
          </button>
          <button
            onClick={() => setLocalCategories(null)}
            className="px-3 py-1.5 text-xs rounded-lg border"
            style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
            data-testid="discard-category-order-btn"
          >
            Discard
          </button>
        </div>
      )}
```

---

## Scope Lock

### Files WILL change
| File | Edits | Lines changed |
|---|---|---|
| `src/components/panels/menu/ProductList.jsx` | E1 · E2 · E3 · E4 | Remove ~9 lines; add ~24 lines |
| `src/components/panels/menu/CategoryList.jsx` | E5 · E6 · E7 | Remove ~9 lines; add ~22 lines |

### Files WILL NOT touch
- `src/api/services/menuManagementService.js` — `quickReorder` unchanged
- `src/api/transforms/menuManagementTransform.js` — `reorderPayload` unchanged
- `src/components/panels/MenuManagementPanel.jsx` — props + `onRefresh` unchanged
- `src/components/panels/menu/BulkEditor.jsx` — unrelated
- Any other file

---

## Verification Matrix (seeds QA handover)

| # | Edit | File | Current | After | Verify | Automated? |
|---|---|---|---|---|---|---|
| V1 | E1 | ProductList | `handleDragEnd` is async with try/catch | `handleDragEnd` is sync, no try/catch | `grep -n "async\|quickReorder" ProductList.jsx` — 0 hits in handleDragEnd | YES |
| V2 | E2 | ProductList | No `handleSaveOrder` | `handleSaveOrder` useCallback exists | `grep -n "handleSaveOrder"` returns 2 hits (def + toolbar) | YES |
| V3 | E3 | ProductList | imports `Search, Plus, SlidersHorizontal` | imports `..., Check` | grep imports line | YES |
| V4 | E4 | ProductList | No Save/Discard in toolbar | `data-testid="save-order-btn"` + `data-testid="discard-order-btn"` present | grep testids | YES |
| V5 | E4 | ProductList | — | Buttons hidden when no drag done | Browser: open MenuMgmt → no Save/Discard visible initially | NO |
| V6 | E4 | ProductList | — | Buttons appear after first drag | Browser: drag one item → Save Order + Discard appear | NO |
| V7 | E1+E2 | ProductList | — | Single API call on Save click | Browser + Network tab: drag 3 items → click Save → exactly 1 quickReorder POST | NO |
| V8 | E4 | ProductList | — | Discard reverts to original order | Browser: drag item → Discard → item back in original position | NO |
| V9 | E5 | CategoryList | `handleDragEnd` is async with try/catch | sync, no try/catch | grep | YES |
| V10 | E6 | CategoryList | No `handleSaveOrder` | `handleSaveOrder` exists using `cats` | grep | YES |
| V11 | E7 | CategoryList | No Save/Discard near search | `data-testid="save-category-order-btn"` present | grep testids | YES |
| V12 | E6 | CategoryList | — | Save uses `cats` (all) not `filtered` (OD-476-06) | code review: `toAPI.reorderPayload('category', cats)` | YES |
| V13 | ALL | — | — | webpack compiled, 0 new warnings | `tail -3 /var/log/supervisor/frontend.out.log` | YES |
| V14 | ALL | — | BulkEditor update after every drag | BulkEditor updates only after "Save Order" click | Browser: drag → open BulkEditor → old order → Save → BulkEditor refreshes to new order | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-476 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: CR-476 row → GATE_5A_IMPLEMENTED with file list
- [ ] FILE_OWNERSHIP.md: ProductList.jsx + CategoryList.jsx + CR-476 + date
- [ ] Code markers: // CR-476 in every modified block (E1-E7)
- [ ] Compile: webpack compiled with 0 new warnings
```

---

## Gate Status
- Gate 1 (Intake): COMPLETE
- Gate 2 (Impact Analysis): COMPLETE
- Gate 3 (Implementation Plan): **COMPLETE** (this document)
- Gate 4 GO: **Awaiting owner approval before implementation begins**
