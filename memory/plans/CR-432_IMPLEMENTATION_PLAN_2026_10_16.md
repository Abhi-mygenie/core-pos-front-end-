# Implementation Plan — CR-432
## Order View: CSS column-count masonry (removes height-alignment gaps)

**Role:** PLANNING (Gate 3 — Implementation Plan)
**Date:** 2026-10-16
**Based on:** `impact/CR-432_IMPACT_ANALYSIS_2026_10_16.md` (Gate 2 CLOSED, OD-432-01 = Option A)
**Code Reality:** NONE — ChannelColumn.jsx grid unchanged at HEAD
**Conflict Pre-Check:** BUG-571 (L260) — CLEAN. CR-414 (L286-287 tablet) — CLEAN.
**Risk:** MEDIUM · 1 file · ~10 lines · not R5 · not financial

---

## Scope Lock

**WILL change:**
- `src/components/dashboard/ChannelColumn.jsx` — 3 targeted edits

**WILL NOT touch:**
- `ChannelColumnsLayout.jsx` — `actualColumns` prop unchanged
- `DashboardPage.jsx` — no impact
- Any table view, tablet path, sorting logic, or card components

---

## Step 0 — Entry Verification

```bash
# E-1 anchor
sed -n '190,195p' /app/frontend/src/components/dashboard/ChannelColumn.jsx
# Expected: cardWidth / columnWidth calc lines — isOrderDesktop NOT yet present

# E-2 anchor
sed -n '283,292p' /app/frontend/src/components/dashboard/ChannelColumn.jsx
# Expected: <div className="grid gap-2" style={{ gridTemplateColumns: ...

# E-3 anchor
sed -n '323,354p' /app/frontend/src/components/dashboard/ChannelColumn.jsx
# Expected: // List View - render OrderCard ... return (<OrderCard key={key} ...

# No existing CR-432 markers
grep -c "CR-432" /app/frontend/src/components/dashboard/ChannelColumn.jsx
# Expected: 0
```

---

## Edit E-1 — Add `isOrderDesktop` const

**File:** `src/components/dashboard/ChannelColumn.jsx`
**Location:** After the `columnWidth` calculation (~L193), before `return (`

```jsx
// BEFORE (L192-194):
  const cardWidth = viewType === 'table' ? TABLE_CARD_WIDTH : ORDER_CARD_WIDTH;
  const columnWidth = (actualColumns * cardWidth) + ((actualColumns - 1) * GAP) + PADDING;

  return (

// AFTER:
  const cardWidth = viewType === 'table' ? TABLE_CARD_WIDTH : ORDER_CARD_WIDTH;
  const columnWidth = (actualColumns * cardWidth) + ((actualColumns - 1) * GAP) + PADDING;
  // CR-432: true when desktop order view — drives column-count masonry layout
  const isOrderDesktop = viewType === 'order' && !isTablet;

  return (
```

---

## Edit E-2 — Change grid container to conditional layout

**File:** `src/components/dashboard/ChannelColumn.jsx`
**Location:** L283-292 (the grid container div)

```jsx
// BEFORE:
                <div 
                  className="grid gap-2"
                  style={{ 
                    gridTemplateColumns: isTablet // CR-414: fluid auto-fill on tablet (OD-537-03)
                      ? (viewType === 'table' ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))')
                      : viewType === 'table' 
                        ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` 
                        : `repeat(${actualColumns}, 1fr)`,
                  }}
                >

// AFTER:
                <div 
                  className={isOrderDesktop ? '' : 'grid gap-2'} // CR-432: column-count masonry for desktop order view
                  style={isOrderDesktop
                    ? { columnCount: actualColumns, columnGap: '8px' } // CR-432: masonry — no height-alignment gaps
                    : {
                        gridTemplateColumns: isTablet // CR-414: fluid auto-fill on tablet (OD-537-03)
                          ? (viewType === 'table' ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))')
                          : viewType === 'table' 
                            ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` 
                            : `repeat(${actualColumns}, 1fr)`,
                      }
                  }
                >
```

---

## Edit E-3 — Wrap OrderCard in `break-inside: avoid` div when `isOrderDesktop`

**File:** `src/components/dashboard/ChannelColumn.jsx`
**Location:** L323-353 (the OrderCard return block)

```jsx
// BEFORE:
                    // List View - render OrderCard
                    const order = item.order || item;
                    return (
                      <OrderCard
                        key={key}
                        order={order}
                        orderType={item.orderType || channel.id}
                        tableLabel={item.label || item.tableNumber}
                        isSnoozed={snoozedOrders?.has(item.id)}
                        isEngaged={isOrderEngaged?.(order.orderId) || isTableEngaged?.(item.tableId)}
                        canCancelOrder={hasPermission?.('order_cancel')}
                        canMergeOrder={channel.id === 'dineIn' && hasPermission?.('merge_table')}
                        canShiftTable={channel.id === 'dineIn' && hasPermission?.('transfer_table')}
                        canFoodTransfer={channel.id === 'dineIn' && hasPermission?.('food_transfer')}
                        onTableShift={channel.id === 'dineIn' ? onTableShift : undefined}
                        onMergeOrder={channel.id === 'dineIn' ? onMergeOrder : undefined}
                        canPrintBill={hasPermission?.('print_icon')}
                        canBill={hasPermission?.('bill')}
                        onToggleSnooze={onToggleSnooze}
                        onEdit={() => onItemClick?.(item)}
                        onMarkReady={() => onMarkReady?.(item)}
                        onMarkServed={() => onMarkServed?.(item)}
                        onBillClick={() => onBillClick?.(item)}
                        onAccept={(order) => onConfirmOrder?.(item)}
                        onCancelOrder={onCancelOrder}
                        onItemStatusChange={onItemStatusChange}
                        onFoodTransfer={onFoodTransfer ? (order, foodItem) => onFoodTransfer(order, foodItem, item) : undefined}
                        onAggregatorReady={onAggregatorReady}
                        onAggregatorDispatch={onAggregatorDispatch}
                      />
                    );

// AFTER:
                    // List View - render OrderCard
                    const order = item.order || item;
                    const orderCard = (
                      <OrderCard
                        order={order}
                        orderType={item.orderType || channel.id}
                        tableLabel={item.label || item.tableNumber}
                        isSnoozed={snoozedOrders?.has(item.id)}
                        isEngaged={isOrderEngaged?.(order.orderId) || isTableEngaged?.(item.tableId)}
                        canCancelOrder={hasPermission?.('order_cancel')}
                        canMergeOrder={channel.id === 'dineIn' && hasPermission?.('merge_table')}
                        canShiftTable={channel.id === 'dineIn' && hasPermission?.('transfer_table')}
                        canFoodTransfer={channel.id === 'dineIn' && hasPermission?.('food_transfer')}
                        onTableShift={channel.id === 'dineIn' ? onTableShift : undefined}
                        onMergeOrder={channel.id === 'dineIn' ? onMergeOrder : undefined}
                        canPrintBill={hasPermission?.('print_icon')}
                        canBill={hasPermission?.('bill')}
                        onToggleSnooze={onToggleSnooze}
                        onEdit={() => onItemClick?.(item)}
                        onMarkReady={() => onMarkReady?.(item)}
                        onMarkServed={() => onMarkServed?.(item)}
                        onBillClick={() => onBillClick?.(item)}
                        onAccept={(order) => onConfirmOrder?.(item)}
                        onCancelOrder={onCancelOrder}
                        onItemStatusChange={onItemStatusChange}
                        onFoodTransfer={onFoodTransfer ? (order, foodItem) => onFoodTransfer(order, foodItem, item) : undefined}
                        onAggregatorReady={onAggregatorReady}
                        onAggregatorDispatch={onAggregatorDispatch}
                      />
                    );
                    // CR-432: wrap in break-inside:avoid for column-count masonry
                    return isOrderDesktop
                      ? <div key={key} style={{ breakInside: 'avoid', marginBottom: '8px' }}>{orderCard}</div>
                      : <React.Fragment key={key}>{orderCard}</React.Fragment>;
```

---

## Execution Sequence

```
1. Step 0: Entry verification (grep + sed checks)
2. Apply E-1 (add isOrderDesktop const, L193)
3. Apply E-2 (change container div className+style, L283-291)
4. Apply E-3 (wrap OrderCard in break-inside div, L323-353)
5. Compile: webpack compiled successfully (0 warnings/errors)
6. Self-verify: grep -c "CR-432" ChannelColumn.jsx ≥ 3
7. EXIT GATE (5 checkboxes)
```

**Total edits: 3 | File: 1 | Lines changed: ~12**

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Table view regression | None | `isOrderDesktop` false for table view → original grid unchanged |
| Tablet regression | None | `!isTablet` in `isOrderDesktop` → false on tablet → original grid unchanged |
| OrderCard key warning | Very Low | `key` on wrapper div (column-count path) or Fragment (grid path) |
| `React.Fragment` not imported | Low | Check top of file for React import; Fragment is built-in |
| Column count changes card order | Intentional | OD-432-01 locked Option A — column-first order accepted |

---

## Verification Matrix

| # | Edit | Check | Method |
|---|---|---|---|
| V1 | E-1 | `isOrderDesktop` const present | grep |
| V2 | E-2 | Container uses `columnCount` when `viewType=order && !isTablet` | code read |
| V3 | E-3 | OrderCard wrapped in `break-inside:avoid` div | code read |
| V4 | compile | `webpack compiled successfully` | supervisor log |
| V5 (browser) | E-2+E-3 | ORDER VIEW — cards in same column attach directly (no height gap) | browser |
| V6 (browser) | regression | TABLE VIEW — card grid unchanged | browser |
| V7 (browser) | regression | TABLET order view — auto-fill grid unchanged | browser |
| V8 (browser) | regression | `>` arrow increases actualColumns → more columns visible | browser |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-432 → GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: prepend new Last Updated row
- [ ] FILE_OWNERSHIP.md: ChannelColumn.jsx entry — append CR-432 IMPL 2026-10-16
- [ ] Code markers: CR-432 at 3 changed sites
- [ ] Compile: webpack compiled successfully
```
