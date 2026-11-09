# BUG-656 — Implementation Plan (Gate 3)

**Gate:** 3 — Implementation Plan
**Role:** PLANNING (stage = implementation_plan)
**Date:** 2026-11-06
**IA verified:** All 6 target lines confirmed against current HEAD.
**Parent:** CR-489

---

## Scope Lock

**Files WILL change (2):**
1. `src/components/order-entry/OrderEntry.jsx` — G-1, G-4, G-5 + pass `isEditLocked` prop
2. `src/components/order-entry/CartPanel.jsx` — G-2, G-3 + receive `isEditLocked` prop

**Files will NOT touch:** OrderCard, TableCard, transforms, constants, services — all already done by CR-489

---

## Execution Sequence

```
E-1 (OrderEntry.jsx L805)    — addToCart guard
E-2 (OrderEntry.jsx L2889)   — customer edit guard
E-3 (OrderEntry.jsx L2918)   — food transfer guard
E-4 (OrderEntry.jsx ~L2870)  — pass isEditLocked to CartPanel
E-5 (CartPanel.jsx L838)     — receive isEditLocked prop
E-6 (CartPanel.jsx L65)      — PlacedItemRow: receive + use isEditLocked
E-7 (CartPanel.jsx L1302)    — thread isEditLocked to PlacedItemRow
E-8 (CartPanel.jsx L1634)    — place-order-btn disabled
── webpack compile check ──
```

---

## E-1 — Block `addToCart()` when locked

**File:** `OrderEntry.jsx` L805
**Current:**
```javascript
  const addToCart = (item) => {
    // CR-010: Weight item intercept
```
**After:**
```javascript
  const addToCart = (item) => {
    if (isEditLocked) { toast({ title: "Order Locked", description: "Bill printed — editing requires permission.", variant: "destructive" }); return; } // BUG-656
    // CR-010: Weight item intercept
```

---

## E-2 — Disable customer edit when locked

**File:** `OrderEntry.jsx` L2889
**Current:**
```javascript
                onCustomerChange={setCustomer}
```
**After:**
```javascript
                onCustomerChange={isEditLocked ? undefined : setCustomer} // BUG-656: disable customer edit when locked
```

---

## E-3 — Block food transfer when locked

**File:** `OrderEntry.jsx` L2918
**Current:**
```javascript
                canFoodTransfer={canFoodTransfer}
```
**After:**
```javascript
                canFoodTransfer={canFoodTransfer && !isEditLocked} // BUG-656
```

---

## E-4 — Pass `isEditLocked` to CartPanel

**File:** `OrderEntry.jsx` — add new prop near L2919 (after canFoodTransfer)
**Add:**
```javascript
                isEditLocked={isEditLocked} // BUG-656
```

---

## E-5 — Receive `isEditLocked` prop in CartPanel

**File:** `CartPanel.jsx` — function signature, after L838 (`qsrMode`)
**Current (L838):**
```javascript
  qsrMode = false,
```
**After:**
```javascript
  qsrMode = false,
  isEditLocked = false, // BUG-656: block mutations when bill-printed + no permission
```

---

## E-6 — PlacedItemRow: receive `isEditLocked` + hide qty pencil

**File:** `CartPanel.jsx` L65

**Current:**
```javascript
const PlacedItemRow = ({ item, displayQty, setCancelItem, setTransferItem, editingQtyItemId, setEditingQtyItemId, updateQuantity, canCancelItem = true, canFoodTransfer = true, isItemCancelAllowed, kbdRowProps = {} }) => {
```
**After:**
```javascript
const PlacedItemRow = ({ item, displayQty, setCancelItem, setTransferItem, editingQtyItemId, setEditingQtyItemId, updateQuantity, canCancelItem = true, canFoodTransfer = true, isItemCancelAllowed, isEditLocked = false, kbdRowProps = {} }) => {
```

Then at L188 (pencil button), add guard:
**Current (L186-191):**
```javascript
          ) : (
            <>
              <span ...>{shownQty}</span>
              <button onClick={() => setEditingQtyItemId(item.id)} ...>
                <Pencil ... />
              </button>
            </>
```
**After:**
```javascript
          ) : (
            <>
              <span ...>{shownQty}</span>
              {!isEditLocked && (
              <button onClick={() => setEditingQtyItemId(item.id)} ...>
                <Pencil ... />
              </button>
              )}
            </>
```

---

## E-7 — Thread `isEditLocked` from CartPanel to PlacedItemRow

**File:** `CartPanel.jsx` L1302-1312
**Current (L1311):**
```javascript
                    canFoodTransfer={canFoodTransfer && orderType !== 'takeAway' && orderType !== 'delivery' && !isPrepaid}
```
**After (add line after L1311):**
```javascript
                    canFoodTransfer={canFoodTransfer && orderType !== 'takeAway' && orderType !== 'delivery' && !isPrepaid}
                    isEditLocked={isEditLocked} // BUG-656
```

---

## E-8 — Disable `place-order-btn` when locked

**File:** `CartPanel.jsx` L1634
**Current:**
```javascript
          disabled={newItemCount === 0 || isPlacingOrder || hasValidationErrors || (isScheduled && (!scheduleAt?.trim() || !scheduleAt?.includes(':')))}
```
**After:**
```javascript
          disabled={isEditLocked || newItemCount === 0 || isPlacingOrder || hasValidationErrors || (isScheduled && (!scheduleAt?.trim() || !scheduleAt?.includes(':')))}
```

---

## Verification Matrix

| # | Check | File | How to Verify | Auto? |
|---|-------|------|---------------|:---:|
| V-1 | `addToCart` has `isEditLocked` guard | OrderEntry.jsx | grep | YES |
| V-2 | `onCustomerChange` disabled when locked | OrderEntry.jsx | grep `isEditLocked ? undefined` | YES |
| V-3 | `canFoodTransfer && !isEditLocked` | OrderEntry.jsx | grep | YES |
| V-4 | `isEditLocked` prop passed to CartPanel | OrderEntry.jsx | grep | YES |
| V-5 | CartPanel receives `isEditLocked` prop | CartPanel.jsx | grep signature | YES |
| V-6 | PlacedItemRow receives `isEditLocked` | CartPanel.jsx L65 | grep | YES |
| V-7 | Qty pencil hidden when locked | CartPanel.jsx L188 | grep `!isEditLocked` | YES |
| V-8 | `place-order-btn` disabled when locked | CartPanel.jsx L1634 | grep `isEditLocked` | YES |
| V-9 | `isEditLocked` threaded to PlacedItemRow | CartPanel.jsx L1312 | grep | YES |
| V-10 | BUG-656 markers in both files | Both | grep | YES |
| V-11 | Compile clean | — | webpack | YES |
| V-12 | Browser: printed order → click menu item → toast "Order Locked" | Browser | NO |
| V-13 | Browser: printed order → no qty pencil on items | Browser | NO |
| V-14 | Browser: printed order → Update Order disabled | Browser | NO |
| V-15 | Browser: unprinted order → full edit works | Browser | NO |

---

## Handover

```
Plan ready at /app/memory/plans/BUG-656_IMPLEMENTATION_PLAN_2026_11_06.md
8 edits across 2 files.
Code reality: PARTIAL (isEditLocked exists; 5 gaps to wire).
Scope: OrderEntry.jsx (R5) + CartPanel.jsx
       / will NOT touch: OrderCard, TableCard, transforms, constants
Verification matrix: 15 checks (11 automated, 4 browser).
Awaiting Gate 4 GO.
```
