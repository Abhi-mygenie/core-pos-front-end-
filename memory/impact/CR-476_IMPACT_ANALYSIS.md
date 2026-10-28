# CR-476 — Impact Analysis

**Item:** CR-476 — Batch Reorder Save: "Save Order" button for ProductList + CategoryList  
**Stage:** Gate 2 — Impact Analysis  
**Code Reality:** NONE — no `handleSaveOrder`, no "Save Order" button, no dirty indicator exists  
**Risk:** LOW — 2 non-hotspot files; no API, service, route, or context change  
**Conflict Pre-Check:** BUG-288 (AWAITING OWNER SMOKE) + BUG-301 (QA_PASS) touched these files but are past implementation — no active edits in flight. **Parallel-safe.**

---

## Owner Decisions — LOCKED (from intake)

| OD | Decision |
|---|---|
| **OD-476-01** | "Save Order" button sits in the existing toolbar row (same row as Search + Filters + Add Product), visible only when `localProducts !== null` |
| **OD-476-02** | "Discard" button appears alongside "Save Order" (grey secondary button) |
| **OD-476-03** | Button label: "Save Order" (no item count) |
| **OD-476-04** | Same Save/Discard pattern for CategoryList (YES) |
| **OD-476-05** | Navigating away with unsaved order = silent discard (no confirmation dialog) |

---

## Data Flow Trace

```
CURRENT (BUG-620 state):
  drag → setLocalProducts(allItems)              ← local update ✅
       → quickReorder(payload) API call          ← fires every drag ❌
       → toast("Product order saved.")           ← fires every drag ❌
       → onRefresh()                             ← re-fetches on every drag ❌

AFTER CR-476:
  drag → setLocalProducts(allItems)              ← local update ✅
       → [no API call, no toast, no refresh]

  "Save Order" click → handleSaveOrder():
       → quickReorder(products, 'food')          ← single API call ✅
       → toast("Product order saved.")           ← fires once ✅
       → onRefresh()                             ← fires once ✅
       → setLocalProducts(null)                  ← clears dirty state ✅

  "Discard" click → setLocalProducts(null)       ← reverts to server order ✅
```

**Dirty indicator:** `localProducts !== null` (ProductList) / `localCategories !== null` (CategoryList).  
Zero new state variables needed — this already exists.

---

## Affected Files

### Files WILL change (2 files)

| # | File | Change | Lines | Risk |
|---|---|---|---|---|
| **E1** | `src/components/panels/menu/ProductList.jsx` | Strip API/refresh/toast from `handleDragEnd` (lines 82-91 — keep only L81 `setLocalProducts`) | Remove ~9 lines from handleDragEnd | LOW |
| **E2** | `src/components/panels/menu/ProductList.jsx` | Add `handleSaveOrder` useCallback after existing `handleDragEnd` | +~8 lines | LOW |
| **E3** | `src/components/panels/menu/ProductList.jsx` | Add "Save Order" + "Discard" buttons in header toolbar (after "Add Product" button at ~L197) | +~15 lines in JSX | LOW |
| **E4** | `src/components/panels/menu/ProductList.jsx` | Add `Save` or `Check` icon to lucide-react imports (if needed for button icon) | L3 — minor import addition | LOW |
| **E5** | `src/components/panels/menu/CategoryList.jsx` | Strip API/refresh/toast from `handleDragEnd` (lines 43-52 — keep only L42 `setLocalCategories`) | Remove ~8 lines from handleDragEnd | LOW |
| **E6** | `src/components/panels/menu/CategoryList.jsx` | Add `handleSaveOrder` function after existing `handleDragEnd` (not useCallback — CategoryList uses plain async fn) | +~8 lines | LOW |
| **E7** | `src/components/panels/menu/CategoryList.jsx` | Add "Save Order" + "Discard" buttons near the search bar header area | +~15 lines in JSX | LOW |

### Files WILL NOT change

- `src/api/services/menuManagementService.js` — `quickReorder` unchanged
- `src/api/transforms/menuManagementTransform.js` — `reorderPayload` unchanged
- `src/components/panels/MenuManagementPanel.jsx` — `onRefresh`/`fetchFoods` unchanged
- `src/components/panels/menu/BulkEditor.jsx` — unrelated
- Any service, context, route, or other component file

---

## E1: ProductList `handleDragEnd` — strip API call (keep only local update)

**Current L68-92:**
```js
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
  try {                                           ← REMOVE from here
    const payload = toAPI.reorderPayload('food', items);
    await menuService.quickReorder(payload.type, payload.items);
    toast({ title: "Reordered", description: "Product order saved." });
    onRefresh(); // BUG-620
  } catch (err) {
    console.error('[ProductList] Reorder failed:', err);
    toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
    setLocalProducts(null);
  }                                               ← REMOVE to here
}, [filteredProducts, products, toast, onRefresh]); // BUG-620
```

**After E1:**
```js
// CR-476: drag only updates local state — API call deferred to handleSaveOrder
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
}, [filteredProducts, products]); // CR-476: removed toast + onRefresh from deps
```

Key changes: removed `async`, removed try/catch block, removed `toast`+`onRefresh` from deps.

---

## E2: ProductList — add `handleSaveOrder`

**Insert after `handleDragEnd` (after L92):**
```js
// CR-476: batch save — single API call for all pending reorder changes
const handleSaveOrder = useCallback(async () => {
  if (!localProducts) return;
  try {
    const payload = toAPI.reorderPayload('food', filteredProducts);
    await menuService.quickReorder(payload.type, payload.items);
    toast({ title: "Order saved", description: "Product order updated." });
    onRefresh(); // refresh parent so BulkEditor picks up new order
    setLocalProducts(null); // clear dirty state
  } catch (err) {
    console.error('[ProductList] Save order failed:', err);
    toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
  }
}, [localProducts, filteredProducts, toast, onRefresh]); // CR-476
```

**Note:** `filteredProducts` is used (not `products`) so the save respects any active category/search filter context — same as the original `handleDragEnd` which also used `filteredProducts`.

---

## E3: ProductList — "Save Order" + "Discard" buttons in toolbar

**Current header toolbar (L166-198):**
```jsx
{/* Header: Search + Filters + Add */}
<div className="flex items-center gap-3 mb-3">
  ...search input...
  ...Filters button...
  <button onClick={() => setEditingProduct("new")} ... data-testid="add-product-btn">
    <Plus className="w-4 h-4" /> Add Product
  </button>
</div>
```

**After E3 — append Save Order + Discard after "Add Product" button:**
```jsx
{/* CR-476: Save Order / Discard — visible only when drag reorder has unsaved changes */}
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
```

**E4 — Import `Check` icon** (already imported in some files; verify `ProductList.jsx` imports):  
Add `Check` to the lucide-react import line at L3 if not already present.

---

## E5: CategoryList `handleDragEnd` — strip API call (keep only local update)

**Current L37-53:**
```js
const handleDragEnd = async (result) => {
  if (!result.destination) return;
  const items = Array.from(cats);
  const [moved] = items.splice(result.source.index, 1);
  items.splice(result.destination.index, 0, moved);
  setLocalCategories(items);
  try {                                    ← REMOVE from here
    const payload = toAPI.reorderPayload('category', items);
    await menuService.quickReorder(payload.type, payload.items);
    toast({ title: "Reordered", description: "Category order saved." });
    onRefresh(); // BUG-620
  } catch (err) {
    console.error('[CategoryList] Reorder failed:', err);
    toast({ title: "Error", description: err.readableMessage, variant: "destructive" });
    setLocalCategories(null);
  }                                        ← REMOVE to here
};
```

**After E5:**
```js
// CR-476: drag only updates local state — API call deferred to handleSaveOrder
const handleDragEnd = (result) => {
  if (!result.destination) return;
  const items = Array.from(cats);
  const [moved] = items.splice(result.source.index, 1);
  items.splice(result.destination.index, 0, moved);
  setLocalCategories(items);
};
```

---

## E6: CategoryList — add `handleSaveOrder`

**Insert after `handleDragEnd` (after L53):**
```js
// CR-476: batch save — single API call for all pending reorder changes
const handleSaveOrder = async () => {
  if (!localCategories) return;
  try {
    const payload = toAPI.reorderPayload('category', filtered);
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

**Note:** `filtered` (the search-filtered list) is passed — matching the original `handleDragEnd` which used `cats` (full list). Since reordering affects the full list, `cats` should be used here (not `filtered`) to send all positions. **Owner decision needed: OD-476-06 — if user has a search active and reorders, should the save send all categories or only the filtered visible ones?** Recommendation: send `cats` (all categories) since `localCategories` already holds the full reordered list.

---

## E7: CategoryList — "Save Order" + "Discard" in header

CategoryList header is around L108-125 (search bar area). Add Save/Discard below or alongside search:

```jsx
{/* CR-476: Save / Discard — visible when drag reorder pending */}
{localCategories && (
  <div className="flex items-center gap-2 mb-2">
    <button
      onClick={handleSaveOrder}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white"
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

## New Open Decision

| OD | Question | Recommendation |
|---|---|---|
| **OD-476-06** | When saving category order with a search active (filtered view), send only filtered categories or all? | Send `cats` (all categories) — `localCategories` already holds the full reordered list including off-screen items. Same behaviour as original BUG-620 fix which used `cats`. |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| User navigates away without saving | LOW | LOW | OD-476-05: silent discard by design; panel re-open re-fetches from API |
| User drags while save is in progress | LOW | LOW | `handleSaveOrder` is async; a second drag during save just updates `localProducts` again; next save call picks up the latest order |
| Filters active during save send wrong positions | LOW | MEDIUM | Addressed by OD-476-06: use `localProducts` / `cats` (full list) not `filteredProducts` / `filtered` in the save payload |
| "Discard" accidentally clicked | LOW | LOW | Low-stakes operation; user can simply drag again |
| BulkEditor sees stale order until Save clicked | LOW | LOW | Expected behaviour — BulkEditor only refreshes on `onRefresh()`, which now fires only on explicit save |

---

## Downstream Consumers

`MenuManagementPanel.jsx` calls `fetchFoods()` via `onRefresh`. After CR-476, `fetchFoods` is called once per Save click instead of once per drag. No change to `fetchFoods` itself.

---

## Verification Matrix (seeds QA)

| # | Edit | Verify | Method |
|---|---|---|---|
| V1 | E1 | `handleDragEnd` in ProductList has NO `quickReorder` call and NO `onRefresh` call | grep |
| V2 | E2 | `handleSaveOrder` exists in ProductList, calls `quickReorder` + `onRefresh` + `setLocalProducts(null)` | grep |
| V3 | E3 | "Save Order" + "Discard" buttons visible only when `localProducts !== null` | Browser |
| V4 | E1-E3 | Drag product → NO API call fired → "Save Order" button appears → click → 1 API call + toast | Browser + Network |
| V5 | E3 | "Discard" click → items revert to original server order → buttons disappear | Browser |
| V6 | E5 | `handleDragEnd` in CategoryList has NO `quickReorder` call | grep |
| V7 | E6-E7 | Same Save/Discard flow works for categories | Browser |
| V8 | ALL | webpack compiled, 0 new warnings | Terminal |
| V9 | ALL | BulkEditor shows correct order after "Save Order" clicked (regression from BUG-620) | Browser |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-476 → GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: both files listed with CR-476 + date
- [ ] Code markers: // CR-476 in every modified block
- [ ] Compile: webpack 0 new warnings
```

---

## Gate Status

- Gate 1 (Intake): COMPLETE
- Gate 2 (Impact Analysis): **COMPLETE** (this document)
- Gate 3 (Implementation Plan): Not started — pending OD-476-06 answer
- Gate 4 GO: Pending owner approval
