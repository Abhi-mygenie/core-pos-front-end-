# BUG-656 — Impact Analysis (Gate 2)

**Gate:** 2 — Impact Analysis
**Role:** PLANNING
**Date:** 2026-11-06
**Code Reality:** PARTIAL — `isEditLocked` exists in OrderEntry L365 but gates only 4/9 paths
**Parent:** CR-489

---

## Conflict Pre-Check

| File | Last modifier | Conflict? |
|------|--------------|-----------|
| `OrderEntry.jsx` (R5) | CR-489 (2026-11-06, L365/373/377/2008/2020) | **SAFE — same feature, extending existing `isEditLocked`** |
| `CartPanel.jsx` | CR-482 (P10, kbd props) | **SAFE — different lines, additive props** |

**No conflicts.**

---

## Data Flow

`isEditLocked` is already computed at OrderEntry L365:
```javascript
const isEditLocked = !!(restaurant?.settings?.orderEditAccess)
                  && !!(orderData?.billPrinted)
                  && !canEditAfterPrint;
```

This value just needs to be:
1. Checked in `addToCart()` (L805) — blocks adding items
2. Passed to CartPanel as a prop → CartPanel uses it to disable qty edit, place-order btn, transfer
3. Applied to customer input fields in OrderEntry header

---

## Risk Classification: HIGH
- Order mutation paths, R5 hotspot, security-sensitive
- Fast Lane: NO

---

## 5 Gaps — Exact Edit Sites

### G-1: Block adding items from menu

**File:** `OrderEntry.jsx` L805
**Current:**
```javascript
const addToCart = (item) => {
    // CR-010: Weight item intercept
    if (item.isWeightItem) {
```
**Fix:** Add `isEditLocked` guard at top of function:
```javascript
const addToCart = (item) => {
    if (isEditLocked) { toast({ title: "Order Locked", description: "Bill is printed. Editing requires permission.", variant: "destructive" }); return; } // BUG-656
    // CR-010: Weight item intercept
    if (item.isWeightItem) {
```

### G-2: Disable qty edit on placed items

**File:** `CartPanel.jsx` — `PlacedItemRow` component L65 + qty pencil L179
**Approach:** Thread `isEditLocked` prop from CartPanel → PlacedItemRow. When true, hide the pencil icon that opens qty edit mode.

CartPanel receives `isEditLocked` as new prop (G-3 wires it). PlacedItemRow gets it via:
```javascript
<PlacedItemRow ... isEditLocked={isEditLocked} />
```

Inside PlacedItemRow, hide the pencil:
```javascript
// L179 area — only show pencil when not locked
) : !isEditLocked && editingQtyItemId === item.id ? (
```
And hide the pencil trigger button that sets `editingQtyItemId`.

### G-3: Disable Update Order button

**File:** `CartPanel.jsx` L1632-1634
**Current:**
```javascript
<button
  data-testid="place-order-btn"
  onClick={handlePlaceOrder}
  disabled={newItemCount === 0 || isPlacingOrder || hasValidationErrors || ...}
```
**Fix:** Add `isEditLocked` to disabled condition:
```javascript
  disabled={isEditLocked || newItemCount === 0 || isPlacingOrder || hasValidationErrors || ...}
```

**New prop needed:** `isEditLocked` on CartPanel. Add to function signature L779.

### G-4: Block food transfer

**File:** `OrderEntry.jsx` L2918
**Current:**
```javascript
canFoodTransfer={canFoodTransfer}
```
**Fix:**
```javascript
canFoodTransfer={canFoodTransfer && !isEditLocked}
```
This propagates to CartPanel → PlacedItemRow → hides Transfer button.

### G-5: Disable customer name/phone inputs

**File:** `OrderEntry.jsx` — `onCustomerChange` prop at L2889
**Approach:** Pass `isEditLocked` to CartPanel. CartPanel already receives `onCustomerChange`. When locked, set `readOnly` on customer inputs.

Alternatively, in OrderEntry where `setCustomer` is passed to CartPanel (L2889):
```javascript
onCustomerChange={isEditLocked ? undefined : setCustomer}
```
This makes the customer fields non-editable when locked (no onChange handler).

---

## Prop Threading Summary

```
OrderEntry.jsx
  └── isEditLocked (already exists at L365)
       ├── G-1: addToCart() guard (same file)
       ├── G-4: canFoodTransfer={canFoodTransfer && !isEditLocked} (L2918)
       ├── G-5: onCustomerChange={isEditLocked ? undefined : setCustomer} (L2889)
       └── Pass to CartPanel as prop:
            <CartPanel isEditLocked={isEditLocked} ... />
            └── CartPanel.jsx
                 ├── G-2: PlacedItemRow → hide qty pencil
                 └── G-3: place-order-btn disabled={isEditLocked || ...}
```

---

## Scope Lock

**Files WILL change (2):**
1. `src/components/order-entry/OrderEntry.jsx` — G-1 (addToCart guard), G-4 (canFoodTransfer), G-5 (onCustomerChange), + pass `isEditLocked` prop to CartPanel
2. `src/components/order-entry/CartPanel.jsx` — G-2 (qty edit), G-3 (Update Order btn), + receive `isEditLocked` prop

**Files will NOT touch:**
- OrderCard.jsx, TableCard.jsx (already gated by CR-489)
- restaurantSettingsTransform.js, profileTransform.js (already mapped by CR-489)
- No new files, no API changes, no transform changes

---

## Verification Matrix

| # | Check | File | How to Verify | Auto? |
|---|-------|------|---------------|:---:|
| V-1 | `addToCart` has `isEditLocked` guard | OrderEntry.jsx | `grep isEditLocked.*addToCart` or code inspect | YES |
| V-2 | CartPanel receives `isEditLocked` prop | CartPanel.jsx | grep prop in signature | YES |
| V-3 | `place-order-btn` disabled when locked | CartPanel.jsx | grep `isEditLocked` in disabled attr | YES |
| V-4 | PlacedItemRow qty pencil hidden when locked | CartPanel.jsx | code inspect | YES |
| V-5 | `canFoodTransfer && !isEditLocked` | OrderEntry.jsx | grep at L2918 | YES |
| V-6 | Customer input disabled when locked | OrderEntry.jsx/CartPanel | code inspect | YES |
| V-7 | CR-489/BUG-656 markers in both files | Both | `grep BUG-656` | YES |
| V-8 | Compile clean | — | webpack | YES |
| V-9 | Browser: printed order → add item BLOCKED | Browser | Click menu item → toast "Order Locked" | NO |
| V-10 | Browser: printed order → Update Order disabled | Browser | Button greyed out | NO |
| V-11 | Browser: printed order → qty pencil hidden | Browser | No pencil icon on placed items | NO |
| V-12 | Browser: printed order → Collect Bill still works | Browser | Button active | NO |
| V-13 | Browser: unprinted order → full edit works | Browser | Normal behaviour | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-656 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: BUG-656 row updated
- [ ] Code markers: // BUG-656 in both files
```
