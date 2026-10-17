# BUG-372 IMPLEMENTATION PLAN — Transfer + Merge from Order Card
**Date:** 2026-09-01 | **Gate:** 3 | **Risk:** HIGH
**Execution order:** #3

---

## Step 0 — Entry Verification ✅
| Claim | Verified |
|---|---|
| `DashboardPage.jsx:1956` — `onMergeOrder` is `console.log` | ✅ |
| `DashboardPage.jsx:449` — `initialTransferItem` state exists | ✅ |
| `DashboardPage.jsx:1552` — `handleFoodTransfer` exists and calls `handleTableClick` then `setInitialTransferItem` | ✅ |
| `OrderEntry.jsx:55` — `initialTransferItem = null` prop exists | ✅ |
| `OrderEntry.jsx:148` — `showMergeModal` state exists | ✅ |
| `OrderEntry.jsx:2755` — `<MergeTableModal>` renders when `showMergeModal=true` | ✅ |
| No `initialShowMerge` prop in OrderEntry | ✅ (does not exist yet) |

---

## Part A — Merge Fix

### Edit A1 — DashboardPage.jsx: add `initialShowMerge` state (near `initialTransferItem` at line 449)
```js
// After line 449:
const [initialShowMerge, setInitialShowMerge] = useState(false); // BUG-372
```

### Edit A2 — DashboardPage.jsx: replace console.log with real merge handler (line 1956)
```js
// BEFORE:
onMergeOrder={(o) => console.log('[OrderCard] Merge order:', o.orderId)}
// AFTER:
onMergeOrder={(order) => { // BUG-372: was console.log placeholder
  const tableEntry = tables.find(t => t.orderId === order.orderId || t.id === order.tableId);
  if (tableEntry) { handleTableClick(tableEntry); setInitialShowMerge(true); }
}} 
```

### Edit A3 — DashboardPage.jsx: pass `initialShowMerge` to OrderEntry render + reset on close

Find where OrderEntry is rendered in DashboardPage and add:
```jsx
// In OrderEntry render props:
initialShowMerge={initialShowMerge}
onClose={() => { setInitialShowMerge(false); /* existing onClose logic */ }}
```

### Edit A4 — OrderEntry.jsx: add `initialShowMerge` prop + useEffect
```js
// Line 55 props: add initialShowMerge = false
const OrderEntry = ({ ..., initialShowMerge = false, ... }) => {

// After line 160 (initialShowPayment useEffect or near showMergeModal state):
useEffect(() => {
  if (initialShowMerge) setShowMergeModal(true); // BUG-372
}, [initialShowMerge]);
```

---

## Part B — Transfer Investigation Fix

`handleFoodTransfer` calls `handleTableClick(tableEntry)` then `setInitialTransferItem(item)`.
`handleTableClick` opens OrderEntry; `OrderEntry` reads `initialTransferItem` prop.

**Timing issue:** `setInitialTransferItem` updates React state asynchronously. By the time OrderEntry mounts and reads `initialTransferItem` from DashboardPage state, the value must already be set.

**Fix:** Swap the order — set `initialTransferItem` BEFORE calling `handleTableClick`:

```js
// BEFORE (line 1552-1556):
const handleFoodTransfer = (order, item, tableEntry) => {
  handleTableClick(tableEntry);
  setInitialTransferItem(item);
};
// AFTER:
const handleFoodTransfer = (order, item, tableEntry) => { // BUG-372: set state before navigation
  setInitialTransferItem(item);
  handleTableClick(tableEntry);
};
```

---

## Verification Matrix

| # | Edit | How to Verify |
|---|---|---|
| A1 | State added | DashboardPage renders without errors |
| A2 | Merge handler fires | Click Merge on order card → console should NOT show `[OrderCard] Merge order` |
| A3 | OrderEntry opens | Click Merge → OrderEntry opens for that table |
| A4 | Merge modal auto-opens | After OrderEntry opens → MergeTableModal is visible immediately |
| B1 | Transfer order fixed | Click Transfer on food item in order card → OrderEntry opens → Transfer modal visible |
| V1 | Merge full flow | Click Merge → select target table → confirm → orders merged |
| V2 | Transfer full flow | Click Transfer icon → select target → item transferred |
| V3 | Normal OrderEntry unaffected | Open order without merge/transfer → no merge modal shown |

---

## Scope Lock
**Files WILL change:** `DashboardPage.jsx` (A1+A2+A3+B1), `OrderEntry.jsx` (A4)
**Files will NOT touch:** `MergeTableModal.jsx`, `TransferFoodModal.jsx`, `OrderCard.jsx`, `TableCard.jsx`

---

## Post-Code Registry Checklist
- [ ] registry.json: BUG-372 → IMPLEMENTED, sprint_key: pos_5_1
- [ ] BUG_TRACKER.md row updated
- [ ] FILE_OWNERSHIP.md: DashboardPage.jsx + OrderEntry.jsx listed
- [ ] Code markers: `// BUG-372` in each modified file
- [ ] Compile: webpack 0 new warnings
