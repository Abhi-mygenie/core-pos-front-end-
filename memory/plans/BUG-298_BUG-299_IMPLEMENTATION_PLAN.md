# BUG-298 + BUG-299 — Implementation Plan (Gate 3) [BATCHED]

**IDs:** BUG-298 (dine-in) + BUG-299 (QSR)  
**Title:** Item-Level Complementary — Qty-Aware Modal (Dine-in + QSR)  
**Date:** 2026-08-05  
**Role:** PLANNING AGENT (Gate 3)  
**Risk:** CRITICAL (R5 hotspots, financial payload R6)  
**Owner approval MANDATORY at Gate 4**

---

## Entry Verification ✅

| Plan says | Actual (verified) |
|---|---|
| PlacedItemRow L61: no comp button | CONFIRMED — only cancel + transfer buttons |
| Cancel button: `setCancelItem(item)` pattern | CONFIRMED — L81 |
| buildCartItem L692: `isRuntimeComp = item.isComplementaryRuntime === true` | CONFIRMED |
| collectBillExisting L1490: same `isRuntimeComp` pattern | CONFIRMED |
| placeOrder L974: `unplacedItems.map(buildCartItem)` | CONFIRMED |
| compItem NOT in CartPanel today | CONFIRMED — cancelItem pattern is in OrderEntry, not CartPanel |

---

## Owner Decisions Applied (Recommended — confirm at Gate 4)

| OD | Recommended approach |
|---|---|
| OD-1 (partial comp payload) | 2-line split via `expandCompItems()` helper BEFORE `buildCartItem` calls |
| OD-2 (remove existing checkbox) | **KEEP** existing CollectPaymentPanel checkbox — no change to CPP |
| OD-3 (button placement) | Gift icon button next to Cancel button in PlacedItemRow |
| OD-4 (undo comp) | Modal opens with current `compQty` pre-filled; cashier sets to 0 to undo |
| OD-5 (QSR total) | Comp reduces total automatically (orderTransform zeros comp amounts) |

---

## Scope Lock

**Files WILL change:**
1. `components/order-entry/MarkCompModal.jsx` — **NEW**
2. `components/order-entry/OrderEntry.jsx` — R5 hotspot
3. `components/order-entry/CartPanel.jsx` — R5 hotspot  
4. `api/transforms/orderTransform.js` — R5 hotspot, R6 financial

**Files will NOT touch:** `CollectPaymentPanel.jsx`, `DashboardPage.jsx`, `LoadingPage.jsx`, `socketHandlers.js`, any inventory/expense/settings file

---

## Architecture Decision (OD-1)

**Approach: `compQty` on cart item + `expandCompItems()` helper at payload build time**

- `compItem` state and `handleMarkComp()` live in `OrderEntry.jsx` (mirrors cancelItem pattern)
- Cart item gets `compQty: N` field set by `handleMarkComp()`
- `MarkCompModal` is rendered in `OrderEntry.jsx` (mirrors CancelFoodModal)
- `CartPanel.jsx` receives `setCompItem` prop; `PlacedItemRow` calls `setCompItem(item)` on button click
- At payload build time in `orderTransform.js`, `expandCompItems(items)` splits `compQty` items into 2 lines before `buildCartItem` is called
- `collectBillExisting` receives the same split via the same helper
- Result: backend sees 2 valid cart lines; existing `isComplementaryRuntime` logic handles each

---

## Exact Edits

### Edit 1 — NEW `MarkCompModal.jsx`

**File:** `components/order-entry/MarkCompModal.jsx` (new file, ~90 lines)  
**Pattern:** Direct mirror of `CancelFoodModal.jsx` without the reason dropdown

```jsx
// BUG-298 / BUG-299
import { useState } from "react";
import { X, Minus, Plus, Gift } from "lucide-react";
import { COLORS } from "../../constants";

const MarkCompModal = ({ item, onClose, onMark }) => {
  const itemQty = item?.qty || 1;
  const existing = item?.compQty || 0;
  const [compQty, setCompQty] = useState(existing || itemQty);

  const decrease = () => { if (compQty > 0) setCompQty(q => q - 1); };
  const increase = () => { if (compQty < itemQty) setCompQty(q => q + 1); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>Mark Complementary</h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>{item?.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Qty selector (only when qty > 1) */}
        <div className="p-5">
          {itemQty > 1 && (
            <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium" style={{ color: COLORS.grayText }}>Current Qty:</span>
                  <span className="ml-2 font-bold" style={{ color: COLORS.darkText }}>{itemQty}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: COLORS.grayText }}>Comp Qty:</span>
                  <div className="flex items-center gap-1">
                    <button onClick={decrease} disabled={compQty <= 0}
                      className="w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-40"
                      style={{ backgroundColor: COLORS.borderGray }}>
                      <Minus className="w-4 h-4" style={{ color: COLORS.darkText }} />
                    </button>
                    <span className="min-w-[2rem] text-center font-bold text-lg" style={{ color: COLORS.primaryGreen }}>
                      {compQty}
                    </span>
                    <button onClick={increase} disabled={compQty >= itemQty}
                      className="w-9 h-9 rounded-lg flex items-center justify-center disabled:opacity-40"
                      style={{ backgroundColor: COLORS.borderGray }}>
                      <Plus className="w-4 h-4" style={{ color: COLORS.darkText }} />
                    </button>
                  </div>
                </div>
              </div>
              {compQty > 0 && compQty < itemQty && (
                <p className="text-xs mt-2" style={{ color: COLORS.grayText }}>
                  {compQty} complimentary · {itemQty - compQty} remain charged
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => { onMark({ item, compQty }); onClose(); }}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors"
            style={{ backgroundColor: compQty === 0 ? '#9CA3AF' : COLORS.primaryGreen }}
            data-testid="mark-comp-confirm-btn"
          >
            {compQty === 0 ? 'Remove Complementary' : `Mark ${compQty} Complementary`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkCompModal;
```

---

### Edit 2 — `OrderEntry.jsx`: add compItem state + import + handler

**File:** `OrderEntry.jsx`  
**Location A:** After `const [cancelItem, setCancelItem] = useState(null);` (~L140)

**Current:**
```js
const [cancelItem, setCancelItem] = useState(null);
```
**New (insert after):**
```js
const [cancelItem, setCancelItem] = useState(null);
const [compItem, setCompItem] = useState(null); // BUG-298 / BUG-299
```

**Location B:** Add `handleMarkComp` after `toggleItemComplimentary` (~L795)

**Current (after toggleItemComplimentary):**
```js
// Cart total: final payable amount...
```
**New (insert before the comment):**
```js
// BUG-298 / BUG-299: qty-aware comp handler — mirrors handleCancelFood pattern
const handleMarkComp = useCallback(({ item, compQty }) => {
  setCartItems(prev => prev.map(i => {
    if (i.id !== item.id) return i;
    if (i.isComplementary === true) return i; // catalog lock
    return {
      ...i,
      compQty,
      isComplementaryRuntime: compQty > 0 && compQty >= (i.qty || 1),
    };
  }));
}, []);
```

**Location C:** Add import for MarkCompModal at top of OrderEntry.jsx imports
```js
import MarkCompModal from "./MarkCompModal"; // BUG-298 / BUG-299
```

---

### Edit 3 — `OrderEntry.jsx`: pass setCompItem to CartPanel + render MarkCompModal

**Location A:** In CartPanel props block (near line where `setCancelItem={setCancelItem}` is passed ~L2469)  
**Current:**
```jsx
setCancelItem={setCancelItem}
```
**New (add after):**
```jsx
setCancelItem={setCancelItem}
setCompItem={setCompItem}   {/* BUG-298 / BUG-299 */}
```

**Location B:** Near CancelFoodModal render (~L2665–2666), add MarkCompModal:  
**Current:**
```jsx
{cancelItem && (
  <CancelFoodModal ... />
)}
```
**New (insert after CancelFoodModal block):**
```jsx
{compItem && (
  <MarkCompModal
    item={compItem}
    onClose={() => setCompItem(null)}
    onMark={handleMarkComp}
  />
)}
```

---

### Edit 4 — `CartPanel.jsx`: add setCompItem prop to PlacedItemRow + comp button

**Location A:** `PlacedItemRow` function signature (L61)  
**Current:**
```js
const PlacedItemRow = ({ item, displayQty, setCancelItem, setTransferItem, editingQtyItemId, setEditingQtyItemId, updateQuantity, canCancelItem = true, canFoodTransfer = true, isItemCancelAllowed }) => {
```
**New:**
```js
const PlacedItemRow = ({ item, displayQty, setCancelItem, setCompItem, setTransferItem, editingQtyItemId, setEditingQtyItemId, updateQuantity, canCancelItem = true, canFoodTransfer = true, isItemCancelAllowed }) => {
```

**Location B:** After cancel button JSX (~L82–84), add comp button  
**Current (after cancel button):**
```jsx
      <div className="flex-1 min-w-0">
```
**New (insert comp button before flex-1 div):**
```jsx
      {/* BUG-298 / BUG-299: complementary button — mirrors cancel pattern */}
      {!isCancelled && !item.isComplementary && setCompItem && (
        <button
          onClick={() => setCompItem(item)}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 hover:bg-green-50 transition-colors"
          style={{
            backgroundColor: item.compQty > 0 ? 'rgba(46,125,50,0.12)' : COLORS.sectionBg,
          }}
          data-testid={`comp-item-btn-${item.id}`}
          title={item.compQty > 0 ? 'Edit complementary' : 'Mark as complementary'}
        >
          <Gift className="w-4 h-4" style={{ color: item.compQty > 0 ? COLORS.primaryGreen : COLORS.grayText }} />
        </button>
      )}
      <div className="flex-1 min-w-0">
```

**Location C:** Add `Gift` to imports (L2 area)  
**Current:**
```js
import { Utensils, XCircle, Pencil, CookingPot, UtensilsCrossed, Check, User, Phone, Trash2, ArrowLeftRight, RefreshCw, ChevronDown, ChevronUp, LayoutGrid, MapPin, FileText, Banknote, CreditCard, Smartphone, Clock } from "lucide-react";
```
**New:** add `Gift` to the import

**Location D:** PlacedItemRow call site (L1216–1227)  
**Current:**
```jsx
<PlacedItemRow
  item={item}
  displayQty={...}
  setCancelItem={setCancelItem}
  setTransferItem={setTransferItem}
```
**New (add setCompItem):**
```jsx
<PlacedItemRow
  item={item}
  displayQty={...}
  setCancelItem={setCancelItem}
  setCompItem={setCompItem}   {/* BUG-298 / BUG-299 */}
  setTransferItem={setTransferItem}
```

**Location E:** CartPanel function props (~L728)  
**Current:**
```js
setCancelItem,
setTransferItem,
```
**New:**
```js
setCancelItem,
setCompItem,   // BUG-298 / BUG-299
setTransferItem,
```

---

### Edit 5 — `orderTransform.js`: add `expandCompItems` helper + apply at 3 call sites

**Location A:** Add helper function BEFORE `buildCartItem` (~L583)  

```js
/**
 * BUG-298 / BUG-299: expand partial-comp items into 2 lines before buildCartItem.
 * IF item.compQty > 0 AND < item.qty: split into [comp-line, normal-line].
 * Full comp (compQty >= qty) and no-comp (compQty=0) pass through unchanged.
 */
function expandCompItems(items) {
  return items.flatMap(item => {
    const cq = item.compQty || 0;
    const qty = item.qty || 1;
    if (cq > 0 && cq < qty) {
      return [
        { ...item, qty: cq,       isComplementaryRuntime: true,  compQty: 0 },
        { ...item, qty: qty - cq, isComplementaryRuntime: false, compQty: 0 },
      ];
    }
    return [item];
  });
}
```

**Location B:** `placeOrder` L974 — apply expandCompItems  
**Current:**
```js
const cart = unplacedItems.map(buildCartItem).map(({ _fullUnitPrice, ...item }) => item);
const totals = calcOrderTotals(unplacedItems.map(buildCartItem), serviceChargePercentage, {
```
**New:**
```js
const cart = expandCompItems(unplacedItems).map(buildCartItem).map(({ _fullUnitPrice, ...item }) => item); // BUG-298/299
const totals = calcOrderTotals(expandCompItems(unplacedItems).map(buildCartItem), serviceChargePercentage, {
```

**Location C:** `placeOrderWithPayment` L1207 — apply expandCompItems  
**Current:**
```js
const builtItems = unplacedItems.map(buildCartItem);
```
**New:**
```js
const builtItems = expandCompItems(unplacedItems).map(buildCartItem); // BUG-298/299
```

**Location D:** `collectBillExisting` items map — wrap with expandCompItems  
Find the line in `collectBillExisting` where `placedItems` (or equivalent) are mapped for the payment cart. Apply `expandCompItems()` before the map call.

> **Implementation agent must locate the exact line in collectBillExisting where placed items are built into the payment cart array and apply `expandCompItems()` there.** (Approx L1460–1480 area — verify at implementation time.)

---

## Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1 | MarkCompModal.jsx | New file compiles | webpack 0 errors | YES |
| 2a | OrderEntry.jsx | `compItem` state declared | Code grep | YES |
| 2b | OrderEntry.jsx | `handleMarkComp()` function | Code grep | YES |
| 3a | OrderEntry.jsx | `setCompItem` passed to CartPanel | Code grep | YES |
| 3b | OrderEntry.jsx | MarkCompModal renders on compItem | Browser: click Comp button → modal appears | NO |
| 4a | CartPanel.jsx | Gift button in PlacedItemRow | Browser: placed item row shows Gift icon | NO |
| 4b | CartPanel.jsx | setCompItem prop drill | Code grep | YES |
| 5a | orderTransform.js | expandCompItems helper | Code grep | YES |
| 5b | orderTransform.js | placeOrder uses expandCompItems | Network tab: payload has 2 lines for partial comp | NO |
| 5c | orderTransform.js | collectBillExisting uses expandCompItems | Network tab: collect bill payload has 2 lines | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-298 + BUG-299 → status: IMPLEMENTED, sprint_key: pos_5_1
- [ ] BUG_TRACKER.md: both rows updated
- [ ] FILE_OWNERSHIP.md: MarkCompModal.jsx (NEW), OrderEntry.jsx, CartPanel.jsx, orderTransform.js → BUG-298/299 + 2026-08-05
- [ ] Code markers: // BUG-298 / BUG-299 on every modified file
- [ ] Compile: webpack 0 new warnings
```

---

## Regression Checklist (for QA)

1. Dine-in: item qty=3 → click Comp button → modal opens → set compQty=1 → confirm → Network: payload has 2 lines (qty=1 comp, qty=2 normal)
2. Dine-in: item qty=3 → mark all 3 comp → Network: 1 line, all amounts=0
3. Dine-in: item qty=1 → click Comp → no modal, direct toggle
4. Undo: click Comp again → modal opens with existing compQty prefilled → set to 0 → comp removed
5. Catalog-complementary items (`isComplementary=true`): Comp button NOT shown (guard in PlacedItemRow)
6. QSR: same as tests 1–5 via QSR billing path
7. Collect bill: amounts correct (comp lines = ₹0, normal lines = full price)
8. Existing CollectPaymentPanel checkbox: still functions as before (no regression)

---

## Awaiting Gate 4 GO

**OWNER APPROVAL MANDATORY** — CRITICAL risk, 3 R5 hotspot files, financial payload (R6).

Owner must confirm OD-1 through OD-5 before implementation proceeds.
