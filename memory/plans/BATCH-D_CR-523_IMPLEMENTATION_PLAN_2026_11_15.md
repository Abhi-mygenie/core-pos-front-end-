# BATCH-D · CR-523 (Link/change customer on placed order without Update) — Implementation Plan (Gate 3) — 2026-11-15

> Status: GATE_3_PLAN_DRAFT
> HEAD commit: 66ffe518
> Risk: MEDIUM (R5 hotspot file — OrderEntry.jsx; order write per save)
> Conflicts: OrderEntry.jsx — BUG-673 (this batch, implement first). BUG-656 (L2919, isEditLocked customer gate — keep behaviour). CR-492/493/515 (Batch A, different lines). CartPanel.jsx — BUG-656 (L988 onCustomerChange disabled when locked — keep).
> Scope: **Save/change ONLY.** Remove customer (unlink) = BLOCKED pending Gyan's BD-06 reply — skipped.
> API Contract: `contracts/BATCH-D_CR-523_API_CONTRACT_2026_11_15.md` — customer-only `update-place-order` with empty cart confirmed.

## 1. What changes
When a customer is linked or changed on a **placed** order via the CustomerModal or CartPanel inline search, immediately save to the server via `update-place-order` (empty cart). Today the customer only lives in local state until the next cart update. Blocked when `isEditLocked` (BUG-656 behavior preserved).

## 2. Files changed

| # | File | Line at HEAD | What changes |
|---|------|-------------|--------------|
| E1 | `src/components/order-entry/OrderEntry.jsx` | L3152 (`CustomerModal onSave`) | After `setCustomer`, call server save if order is placed and not locked |
| E2 | same | ~L2919 (`onCustomerChange` prop to CartPanel) | Wrap with server save for placed orders |
| E3 | same | New helper (~after L100 imports area) | `saveCustomerToServer(customer, effectiveTable, options)` function |

## 3. Exact edits

### E3 — OrderEntry.jsx: new helper function (add after existing helper functions, before component return)

Find a suitable location after the existing handler functions (e.g., after `handleAddCustomItem` or similar). Add:

```js
  // CR-523: Save customer to server immediately on placed orders
  const saveCustomerToServer = useCallback(async (customerData) => {
    const orderId = effectiveTable?.orderId;
    if (!orderId) return; // not placed yet — save happens with place-order
    if (isEditLocked) return; // BUG-656: locked orders can't change customer
    try {
      await orderService.updateOrder(
        { ...effectiveTable, customer: customerData },
        [], // empty cart — customer only
        customerData,
        orderType,
        { printAllKOT: false, printerAgents: printerAgents || [] }
      );
      toast({ title: 'Customer saved', description: customerData?.name || 'Customer linked to order' });
    } catch (err) {
      console.error('CR-523: customer save failed', err);
      toast({ title: 'Save failed', description: 'Customer change not saved to server. Try again.', variant: 'destructive' });
    }
  }, [effectiveTable, isEditLocked, orderType, printerAgents, toast]);
```

**Implementation note:** The exact API call must match the existing `orderToAPI.updateOrder` pattern. Verify at implementation time that `orderService.updateOrder` (or whatever the existing update function is) accepts an empty `newItems` array and sends the customer fields. Probe P3 confirmed the backend accepts this. The function name and import may vary — use the existing codebase pattern.

### E1 — OrderEntry.jsx L3152 (CustomerModal onSave)

**Before:**
```jsx
          onSave={(customerData) => setCustomer(customerData)}
```
**After:**
```jsx
          onSave={(customerData) => { setCustomer(customerData); saveCustomerToServer(customerData); }} // CR-523
```

### E2 — OrderEntry.jsx L2919 (CartPanel onCustomerChange)

**Before:**
```jsx
                onCustomerChange={isEditLocked ? undefined : setCustomer} // BUG-656: disable customer edit when locked
```
**After:**
```jsx
                onCustomerChange={isEditLocked ? undefined : (customerData) => { setCustomer(customerData); saveCustomerToServer(customerData); }} // BUG-656 + CR-523
```

## 4. Test steps
| # | Steps | Expected |
|---|-------|----------|
| V1 | Placed order, no new items → link customer via header modal | Toast "Customer saved". Reopen on another device → customer shown |
| V2 | Change existing customer to a different one | New customer saved, old replaced |
| V3 | New (unplaced) order → link customer | No server call (unchanged — saved with place-order) |
| V4 | Printed + lock OFF → change customer | Allowed, no reprint triggered |
| V5 | Printed + lock ON + no `order_edit_access` → try to change | Blocked (both CustomerModal button and CartPanel disabled) |
| V6 | Printed + lock ON + `order_edit_access` → change customer | Allowed |
| V7 | Offline/error → save customer | Error toast, local state kept |
| V8 | CartPanel inline search → select customer | Same server save |
| V9 | Regression: BUG-270 cust_mobile, CR-479 country code, BUG-656 lock, loyalty on collect | All still work |
| V10 | Webpack compile | 0 new warnings |

## 5. Rebase note
**BUG-673 must be implemented FIRST in the same branch.** BUG-673 changes L121 (highlightIndex init), L639-647 (effect), L768 (Enter guard), L795 (arrow guard), L2085 (onClick). None of these overlap with CR-523 lines (L2919, L3152, new helper). Line numbers stable after BUG-673.

## 6. Scope lock
**WILL change:** OrderEntry.jsx (L3152, L2919, new helper function ~20 lines)
**WILL NOT touch:** CartPanel.jsx (CR-523 change is in the prop, not inside CartPanel), CustomerModal.jsx, orderTransform.js (uses existing update pathway), CollectPaymentPanel, any billing/payment logic
**BLOCKED (skipped):** Remove/unlink customer — backend ignores empty name/mobile (BD-06 pending)
