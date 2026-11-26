# CR-547: Selective KOT in ScanOrderPopOut — IMPLEMENTATION PLAN

## Gate 3: Blocker Resolution

### Curl Probe Results (2026-11-19, thegoankitchen, Order #1578881)

| Probe | billFoodList sent | bill_food_list stored | station_kot | Conclusion |
|-------|-------------------|----------------------|-------------|------------|
| A | ALL 14 items | 14 items (temp id 222755) | "" | Backend stores what FE sends |
| B | 2 items only | 2 items (temp id 222755, overwritten) | "" | Partial billFoodList = partial KOT |
| C | 2 items | 2 items | "BAR" | Station header works independently |

**Verdict**: Backend `order-temp-store` is a **pass-through**. It stores the
`billFoodList` array as-is in the temp table (keyed by order_id, overwritten on
each call). The printer agent reads from this temp table to render the KOT slip.

**CR-547 is 100% frontend-only. No backend change required.**

---

## ID Mapping (transform reference)

```
item.id       = rawOrderDetails[].id              = order_details row ID (UNIQUE per line)
item.foodId   = rawOrderDetails[].food_details.id = catalog food ID (NOT unique)
```

Match key for filtering rawOrderDetails: **`item.id` ↔ `rawOrderDetails[].id`**

---

## Files to Change

| # | File | Type | Lines touched |
|---|------|------|---------------|
| 1 | `src/components/dashboard/ScanOrderPopOut.jsx` | Selection UI + state | ~40 net lines |
| 2 | `src/pages/DashboardPage.jsx` | Filtered print call | ~8 net lines |

---

## Line-by-Line Changes

### FILE 1: ScanOrderPopOut.jsx (811 lines)

#### E-1: State — `selectedItemIds` (after L213)

Insert after `const [isAccepting, setIsAccepting] = useState(false);` (L213):

```jsx
// CR-547: Selective KOT — set of item.id values for items user wants on KOT
const [selectedItemIds, setSelectedItemIds] = useState(new Set());
```

#### E-2: Derived `_kotOrderId` + reset effect (after E-1)

We need to compute the active order ID BEFORE the early returns at L289-290
so we can use it in a useEffect. `activeOrder` itself is defined at L292 (after
early returns), so we re-derive the identity from queue + currentIndex:

```jsx
// CR-547: Derive active order ID for selection reset
const _kotOrderId = queue[Math.min(currentIndex, Math.max(0, queue.length - 1))]?.orderId;

useEffect(() => {
  if (!_kotOrderId || queue.length === 0) {
    setSelectedItemIds(new Set());
    return;
  }
  const order = queue[Math.min(currentIndex, Math.max(0, queue.length - 1))];
  if (!order) { setSelectedItemIds(new Set()); return; }
  const items = order.items || [];
  const editMode = hasUnconfirmedWebEditItems(order);
  // Edit mode: default-select only NEW unconfirmed items (prev items already KOT'd)
  // Normal mode: default-select all non-cancelled items
  const selectable = editMode
    ? items.filter(it => it.isNotConfirmed && it.status !== 'cancelled')
    : items.filter(it =>
        it.status !== 'cancelled' && Number(it.foodStatus ?? it.food_status) !== 3);
  setSelectedItemIds(new Set(selectable.map(it => it.id).filter(Boolean)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [_kotOrderId]);
```

**Why eslint-disable**: We intentionally trigger only on order switch
(`_kotOrderId`), not on every item/queue change. Within the effect, we read
the latest queue/currentIndex from the closure (safe — effects run after render).

#### E-3: Toggle handler — `toggleKotItem` (after E-2)

```jsx
const toggleKotItem = useCallback((itemId) => {
  setSelectedItemIds(prev => {
    const next = new Set(prev);
    if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
    return next;
  });
}, []);
```

No dependency needed — pure functional update.

#### E-4: Select-all row in EDIT MODE (before L491 `<ul>`)

Inside the `isEditMode` branch, BEFORE the existing `<ul className="divide-y">` at L491:

```jsx
{/* CR-547: Select-all header for KOT selection */}
{onPrintKOT && newItems.length > 0 && (
  <label
    data-testid="popout-kot-select-all"
    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b"
    style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
  >
    <input
      type="checkbox"
      className="accent-[#2E7D32]"
      checked={newItems.length > 0 && newItems.every(it => selectedItemIds.has(it.id))}
      onChange={() => {
        const allIds = newItems.map(it => it.id).filter(Boolean);
        setSelectedItemIds(prev =>
          allIds.every(id => prev.has(id))
            ? new Set([...prev].filter(id => !allIds.includes(id)))
            : new Set([...prev, ...allIds])
        );
      }}
    />
    <span className="text-xs font-semibold" style={{ color: COLORS.grayText }}>
      {newItems.every(it => selectedItemIds.has(it.id)) ? 'Deselect all' : 'Select all'}
      {' '}({newItems.length})
    </span>
  </label>
)}
```

#### E-5: Per-item checkbox in EDIT MODE newItems (inside L501 `<li>`)

In the newItems `.map()` at L492-526, add a checkbox at the START of each `<li>`.
Current first child is `<span className="flex-1 text-sm">`.

Insert BEFORE that span:

```jsx
{/* CR-547: Per-item KOT select */}
{onPrintKOT && (
  <input
    type="checkbox"
    className="mt-0.5 flex-shrink-0 accent-[#2E7D32]"
    checked={selectedItemIds.has(it.id)}
    onChange={() => toggleKotItem(it.id)}
    data-testid={`popout-kot-check-new-${idx}`}
  />
)}
```

#### E-6: Select-all row in NORMAL MODE (before L551 `<ul>`)

Inside the else branch (normal mode, starts at L550), BEFORE the `<ul>` at L551:

```jsx
{/* CR-547: Select-all header for KOT selection */}
{onPrintKOT && (activeOrder.items || []).some(it =>
  it.status !== 'cancelled' && Number(it.foodStatus ?? it.food_status) !== 3
) && (
  <label
    data-testid="popout-kot-select-all"
    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b"
    style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
  >
    <input
      type="checkbox"
      className="accent-[#2E7D32]"
      checked={
        (activeOrder.items || [])
          .filter(it => it.status !== 'cancelled' && Number(it.foodStatus ?? it.food_status) !== 3)
          .every(it => selectedItemIds.has(it.id))
      }
      onChange={() => {
        const selectable = (activeOrder.items || [])
          .filter(it => it.status !== 'cancelled' && Number(it.foodStatus ?? it.food_status) !== 3);
        const allIds = selectable.map(it => it.id).filter(Boolean);
        setSelectedItemIds(prev =>
          allIds.every(id => prev.has(id))
            ? new Set()
            : new Set(allIds)
        );
      }}
    />
    <span className="text-xs font-semibold" style={{ color: COLORS.grayText }}>
      {(activeOrder.items || [])
        .filter(it => it.status !== 'cancelled' && Number(it.foodStatus ?? it.food_status) !== 3)
        .every(it => selectedItemIds.has(it.id))
        ? 'Deselect all' : 'Select all'}
      {' '}({(activeOrder.items || [])
        .filter(it => it.status !== 'cancelled' && Number(it.foodStatus ?? it.food_status) !== 3).length})
    </span>
  </label>
)}
```

#### E-7: Per-item checkbox in NORMAL MODE (inside L567 `<li>`)

In the normal-mode `.map()` at L557, inside each `<li>` at L567. The first
child is `<div className="flex items-start justify-between gap-2">` (L574).
Insert a checkbox BEFORE the opening `<div>` of row 1:

BUT — the existing `<li>` layout is not flex, it's block with multiple rows
(row 1: name+price, row 2: variations, row 3: addons, row 4: notes).

The checkbox should go on ROW 1, as the first element in the
`<div className="flex items-start justify-between gap-2">` at L574.

Actually, we need the checkbox aligned at the top-left of the item. The cleanest
approach: wrap the existing `<li>` content in a flex container with the checkbox:

Change L567-569 from:
```jsx
<li
  key={...}
  className="px-3 py-2 text-sm"
  style={{ opacity: isCancelled ? 0.5 : 1 }}
  data-testid={`popout-item-row-${idx}`}
>
```

To:
```jsx
<li
  key={...}
  className="px-3 py-2 text-sm flex items-start gap-2"
  style={{ opacity: isCancelled ? 0.5 : 1 }}
  data-testid={`popout-item-row-${idx}`}
>
  {/* CR-547: Per-item KOT select — skip cancelled */}
  {onPrintKOT && !isCancelled && (
    <input
      type="checkbox"
      className="mt-1 flex-shrink-0 accent-[#2E7D32]"
      checked={selectedItemIds.has(it.id)}
      onChange={() => toggleKotItem(it.id)}
      data-testid={`popout-kot-check-${idx}`}
    />
  )}
  <div className="flex-1 min-w-0">
    {/* ... all existing row 1-4 content stays here ... */}
  </div>
</li>
```

This wraps all existing content in a `<div className="flex-1 min-w-0">` and
adds the checkbox before it.

**IMPORTANT**: The closing `</div>` for this wrapper goes BEFORE the closing
`</li>`, wrapping rows 1-4 (lines 573-699).

#### E-8: KOT button — count badge + disabled + pass selected (L766-778)

Replace the existing KOT button block:

```jsx
{/* CR-545 + CR-547: KOT print button with selection count */}
{onPrintKOT ? (
  <button
    type="button"
    data-testid={`popout-print-kot-${idStr}`}
    onClick={() => {
      // CR-547: Pass only selected items
      const selected = (activeOrder.items || []).filter(it => selectedItemIds.has(it.id));
      onPrintKOT(activeOrder, selected);
    }}
    disabled={isAccepting || selectedItemIds.size === 0}
    className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold bg-white disabled:opacity-40 disabled:cursor-not-allowed"
    style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
    title={selectedItemIds.size === 0 ? 'Select items for KOT' : `Print KOT for ${selectedItemIds.size} item(s)`}
  >
    <Printer className="w-4 h-4" />
    <span>KOT{selectedItemIds.size > 0 ? ` (${selectedItemIds.size})` : ''}</span>
  </button>
) : null}
```

Changes from original:
- `onClick` now filters items by `selectedItemIds` and passes as 2nd arg
- `disabled` adds `|| selectedItemIds.size === 0`
- Button text shows count: "KOT (3)"
- Title changes dynamically

---

### FILE 2: DashboardPage.jsx

#### E-9: `handleScanPrintKOT` signature + filtered rawOrderDetails (L1737-1747)

Replace L1737-1747:

```jsx
// CR-545 + CR-547: KOT print from ScanOrderPopOut — reuses OrderCard pattern
// CR-547: optional `selectedItems` for selective KOT (backward-compat: null = all)
const handleScanPrintKOT = useCallback(async (order, selectedItems = null) => {
  // CR-547: Use selectedItems if provided, else fallback to full order items
  const items = selectedItems && selectedItems.length > 0 ? selectedItems : (order?.items || []);
  const stations = getStationsFromOrderItems(items, getProductById);
  if (stations.length === 0) return;
  try {
    const stationKot = stations.map(s => s.station).join(',');
    // CR-547: Filter rawOrderDetails to match selected items only
    let printOrder$ = order;
    if (selectedItems && selectedItems.length > 0) {
      const selectedIds = new Set(items.map(it => it.id).filter(Boolean));
      printOrder$ = {
        ...order,
        rawOrderDetails: (order.rawOrderDetails || []).filter(d => selectedIds.has(d.id)),
      };
    }
    await printOrder(order.orderId || order.id, 'kot', stationKot, printOrder$, 0, {}, printerAgents || []);
  } catch (err) {
    console.error('[DashboardPage] CR-545: KOT print failed:', err?.message);
  }
}, [getProductById, printerAgents]);
```

Changes:
1. Signature: `(order)` → `(order, selectedItems = null)`
2. Items: `order?.items` → `selectedItems || order?.items`
3. Stations derived from selected items only
4. `rawOrderDetails` filtered to match selected item IDs
5. Shallow-clone order with filtered rawOrderDetails

**E-10: `onPrintKOT` prop (L1909) — NO CHANGE NEEDED**

`onPrintKOT={handleScanPrintKOT}` already points to the updated callback.
The 2nd arg `selectedItems` is passed by ScanOrderPopOut (E-8).

---

## Data Flow Summary

```
User checks items  →  selectedItemIds (Set<number>)
       ↓
KOT button click   →  filter order.items by selectedItemIds
       ↓                      ↓
       ↓             derive stations from filtered items
       ↓                      ↓
       ↓             filter rawOrderDetails by selectedIds
       ↓                      ↓
       ↓             build printOrder$ = { ...order, rawOrderDetails: filtered }
       ↓                      ↓
       ↓             printOrder(orderId, 'kot', stationKot, printOrder$, ...)
       ↓                      ↓
       ↓             order-temp-store API stores filtered billFoodList
       ↓                      ↓
       ↓             printer agent reads temp → prints ONLY selected items
```

## Edge Cases

| Case | Behavior |
|------|----------|
| No items selected | KOT button disabled (grey, unclickable) |
| All items selected | Same as current behavior (full KOT) |
| Cancelled items | Not selectable (no checkbox shown) |
| Edit mode: prevItems | Not checkboxed (already KOT'd) |
| Edit mode: newItems | Default-selected on open |
| Normal mode | All non-cancelled items default-selected |
| Order switch (prev/next) | Selection resets to defaults |
| Items have no stations (product catalog) | KOT prints but station_kot="" (existing behavior) |
| Single item selected | KOT prints 1-item slip |

## Rollback

Both changes are additive with backward-compatible defaults:
- `selectedItems = null` in handleScanPrintKOT → falls back to full order
- Checkboxes only render when `onPrintKOT` prop is present
- If checkbox state breaks, KOT button disables (safe fail — no accidental partial prints)

## Testing

1. **Visual**: Screenshot popout with checkboxes visible
2. **Functional**: Curl probe order-temp-store with filtered billFoodList
3. **Integration**: Testing agent verifies full flow
