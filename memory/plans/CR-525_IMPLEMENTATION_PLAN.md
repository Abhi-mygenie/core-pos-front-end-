# CR-525 — Implementation Plan (Gate 3)

**Date:** 2026-11-19
**Agent:** PLANNING (Gate 3 — line-by-line implementation plan)
**Risk:** HIGH (money-path entry, R5 cards)
**Files WILL change:** `TableCard.jsx`, `OrderCard.jsx`
**Files WILL NOT touch:** `DashboardPage.jsx` (plumbing already present), any transform, any backend
**Total edits:** 4 edits, 2 files
**Execution sequence:** E1-E2 (TableCard) → E3-E4 (OrderCard) → compile check

---

## API / Transform Verification (curl probe cafe103)

| Field | API location | Transform | Card access | cafe103 value |
|-------|-------------|-----------|-------------|---------------|
| `order_edit_access` | `restaurants[0].settings.order_edit_access` | `profileTransform L430` → `restaurant.settings.orderEditAccess` | `useRestaurant()` | `"No"` (false) |
| `bill_print` | order response `bill_print` | `orderTransform L316` → `order.billPrinted` (boolean) | `table.billPrinted` / `order.billPrinted` | — |
| `order_type` | order response `order_type` | `orderTransform L176` → `order.orderType` | `table.orderType` / `orderType` | — |
| `payment_type` | order response `payment_type` | `orderTransform L251` → `order.paymentType` | `table.paymentType` / `order.paymentType` | — |
| `isRoom` | `table.rtype === 'RM'` | `orderTransform L174` → `order.isRoom` | `table.isRoom` / `isRoom` | — |
| `isAggregator` | `order.isAggregator` | `orderTransform` via source | TableCard L66 / OrderCard L116 | — |
| `isDelivery` | `orderType === 'delivery'` | derived | TableCard L79 / OrderCard L118 | — |

**All fields already flow to both cards. No transform changes needed.**

---

## Derived Flag (both cards)

```javascript
// CR-525: after bill print → single Collect Bill button (HIDE-ONLY, no reverse)
const showCollect = !!(restaurant?.settings?.orderEditAccess)
  && !!TABLE_OR_ORDER.billPrinted
  && !isRoom
  && TABLE_OR_ORDER.paymentType !== 'prepaid'
  && !isDelivery
  && !isAggregator;
```

---

## Edit 1 — TableCard.jsx: showCollect flag + card tap/Enter redirect

### E1a — After L147: Add showCollect flag

```
FILE: src/components/cards/TableCard.jsx
LINE: 147 (after isEditLocked)

CURRENT:
  const isEditLocked = !!(restaurant?.settings?.orderEditAccess) && !!(table?.billPrinted) && !hasPermission('order_edit_access');

NEW:
  const isEditLocked = !!(restaurant?.settings?.orderEditAccess) && !!(table?.billPrinted) && !hasPermission('order_edit_access');
  // CR-525: after bill print → single Collect Bill (HIDE-ONLY, no reverse)
  const showCollect = !!(restaurant?.settings?.orderEditAccess) && !!(table?.billPrinted) && !table?.isRoom && table?.paymentType !== 'prepaid' && !isDelivery && !isAggregator;
```

### E1b — L301-306: handleCardClick → onBillClick when showCollect

```
LINE: 301-306

CURRENT:
  const handleCardClick = () => {
    if (hasOrders || isYetToConfirm) {
      onOpenModal(table);
    } else {
      onClick(table);
    }
  };

NEW:
  const handleCardClick = () => {
    // CR-525: Collect Bill tap → open Collect Payment directly
    if (showCollect) { onBillClick?.(table); return; }
    if (hasOrders || isYetToConfirm) {
      onOpenModal(table);
    } else {
      onClick(table);
    }
  };
```

**Self-test:** Card tap on a printed non-room non-prepaid non-delivery dine-in order with orderEditAccess ON → opens Collect Payment.

---

## Edit 2 — TableCard.jsx: fOS 5 button replacement

### E2 — L658-757: When showCollect, replace entire fOS 5 button block with single Collect Bill

```
FILE: src/components/cards/TableCard.jsx
LINE: 658

CURRENT:
                {!isAggregator && table.fOrderStatus === 5 && (
                  <>
                    {/* KOT button (L661-673) */}
                    ...
                    {/* Delivery rider buttons (L678-695) */}
                    ...
                    {/* Bill/C-Out/Settle/On The Way (L700-756) */}
                    ...
                  </>
                )}

NEW:
                {!isAggregator && table.fOrderStatus === 5 && (
                  showCollect ? (
                    /* CR-525: single Collect Bill replaces KOT + Bill at Served */
                    <TextButton
                      onClick={(e) => { e?.stopPropagation?.(); onBillClick?.(table); }}
                      testId={`collect-bill-btn-${table.id}`}
                      ariaLabel={`Collect Bill for table ${table.id}`}
                      fullWidth
                      className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                      disabled={isActionInProgress}
                    >
                      Collect Bill
                    </TextButton>
                  ) : (
                    <>
                      {/* existing KOT + Bill/Settle/rider buttons — UNCHANGED */}
                      ... (all existing L661-757 stays as-is inside this else branch)
                    </>
                  )
                )}
```

**Exact implementation:** Wrap the existing `<>...</>` fragment at L659-757 in a ternary: `showCollect ? <CollectBillButton> : <existing>`.

**Self-test:** fOS 5 + billPrinted + orderEditAccess ON + dine-in → shows "Collect Bill" only. Same order but orderEditAccess OFF → shows normal KOT + Bill.

---

## Edit 3 — OrderCard.jsx: showCollect flag + card tap/Enter redirect

### E3a — After L122: Add showCollect flag

```
FILE: src/components/cards/OrderCard.jsx
LINE: 122 (after isEditLocked)

CURRENT:
  const isEditLocked = !!(restaurant?.settings?.orderEditAccess) && !!(order?.billPrinted) && !hasPermission('order_edit_access');

NEW:
  const isEditLocked = !!(restaurant?.settings?.orderEditAccess) && !!(order?.billPrinted) && !hasPermission('order_edit_access');
  // CR-525: after bill print → single Collect Bill (HIDE-ONLY, no reverse)
  const showCollect = !!(restaurant?.settings?.orderEditAccess) && !!(order?.billPrinted) && !isRoom && order?.paymentType !== 'prepaid' && !isDelivery && !isAggregator;
```

### E3b — L461-462: onClick + onKeyDown → onBillClick when showCollect

```
LINE: 461-462

CURRENT:
      onClick={isEngaged || isAggregator ? undefined : () => onEdit?.()} // CR-106: no-op for aggregator
      onKeyDown={kbdEnabled && !isEngaged && !isAggregator ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit?.(); } } : undefined}

NEW:
      onClick={isEngaged || isAggregator ? undefined : () => (showCollect ? onBillClick?.() : onEdit?.())} // CR-106 + CR-525
      onKeyDown={kbdEnabled && !isEngaged && !isAggregator ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showCollect ? onBillClick?.() : onEdit?.(); } } : undefined}
```

**Self-test:** Order card tap on printed dine-in order with setting ON → Collect Payment.

---

## Edit 4 — OrderCard.jsx: KOT hide + fOS 5 button replacement

### E4a — L1057: Hide KOT when showCollect

```
LINE: 1057

CURRENT:
              {(isAggregator || canPrintBill) && !isEditLocked && (isAggregator ? (fOrderStatus === 1) : !(isDelivery && (fOrderStatus === 2 || fOrderStatus === 5))) && (

NEW:
              {(isAggregator || canPrintBill) && !isEditLocked && !showCollect && (isAggregator ? (fOrderStatus === 1) : !(isDelivery && (fOrderStatus === 2 || fOrderStatus === 5))) && (
```

### E4b — L1237-1287: When showCollect, replace Bill block with Collect Bill

```
LINE: 1237

CURRENT:
            {!isAggregator && fOrderStatus === 5 && canBill && (!isDelivery || hasRiderAssigned || order.riderStatus === 'dispatched') && (
              ... delivery/prepaid/bill ternary ...
            )}

NEW:
            {!isAggregator && fOrderStatus === 5 && canBill && (!isDelivery || hasRiderAssigned || order.riderStatus === 'dispatched') && (
              showCollect ? (
                /* CR-525: single Collect Bill replaces Bill at Served */
                <button
                  data-testid={`collect-bill-btn-${orderId}`}
                  className="min-h-[44px] flex-1 min-w-0 px-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2"
                  style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                  onClick={(e) => { e?.stopPropagation?.(); onBillClick?.(); }}
                  disabled={isActionInProgress}
                >
                  Collect Bill
                </button>
              ) : (
                ... existing delivery/prepaid/bill ternary UNCHANGED ...
              )
            )}
```

**Self-test:** OrderCard fOS 5 + billPrinted + setting ON + dine-in → "Collect Bill" only. No KOT icon.

---

## Verification Matrix

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V1 | Setting ON + dine-in + bill printed | Print bill on cafe103 (need setting ON first) → check card | Single "Collect Bill" button, no KOT |
| V2 | Setting OFF | Same order but setting OFF | Normal KOT + Bill (unchanged) |
| V3 | Card tap/Enter | Tap or Enter on printed card (setting ON) | Opens Collect Payment panel |
| V4 | Room order | Print bill on room order | C/Out unchanged (excluded) |
| V5 | Prepaid order | Prepaid at Served | Settle unchanged (excluded) |
| V6 | Delivery order | Delivery at Served | Rider buttons unchanged (excluded) |
| V7 | Aggregator order | Aggregator at any stage | Unchanged (excluded) |
| V8 | Walk-in / Takeaway | Bill printed, setting ON | Shows Collect Bill (included) |
| V9 | fOS 1-2 (Preparing/Ready) | Before bill print | KOT + Ready/Serve unchanged |
| V10 | Regression: BUG-583 colour | Bill printed → card green bg | Still green |
| V11 | Regression: CR-512 print confirm | Print bill flow | Confirm dialog unchanged |
| V12 | Regression: CR-489 lock | Edit attempt on locked order | Edit blocked (unchanged) |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-525 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: add TableCard.jsx + OrderCard.jsx with CR-525 marker
- [ ] Code markers: // CR-525 comment in both modified files
```

---

## Scope Lock

**IN SCOPE:** E1-E4 as described. 2 files, ~20 lines changed.
**OUT OF SCOPE:** DashboardPage.jsx (already wired). Any transform. Any backend. No restore-after-edit logic (HIDE-ONLY).
