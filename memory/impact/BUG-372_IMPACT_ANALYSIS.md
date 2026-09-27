# BUG-372 IMPACT ANALYSIS — Transfer and Merge Buttons Not Working From Order Card
**Date:** 2026-09-01 | **Stage:** Gate 2 — Impact Analysis
**Code Reality:** PARTIAL (Transfer handler exists; Merge is console.log placeholder)
**Conflict Pre-Check:** DashboardPage.jsx — last modified by multiple CRs. OrderEntry.jsx — adding 1 prop only. No active conflicts.
**Risk:** HIGH (order management core flow)

---

## Root Cause — HIGH Confidence

### Merge (confirmed broken)
```
DashboardPage.jsx:1956:
  onMergeOrder={(o) => console.log('[OrderCard] Merge order:', o.orderId)}
                        ↑ console.log only — no merge action  ← BREAK POINT

OrderEntry.jsx already has full Merge implementation:
  - MergeTableModal imported (line 33)
  - showMergeModal state (line 148)
  - handleMerge (line 1209) calls tableToAPI.mergeTable(...)
  - Renders <MergeTableModal> when showMergeModal=true (line 2755)
  → Merge works INSIDE OrderEntry but cannot be triggered from OUTSIDE
```

### Transfer (to be confirmed)
```
DashboardPage.jsx:1552:
  handleFoodTransfer(order, item, tableEntry) {
    handleTableClick(tableEntry);    → opens OrderEntry
    setInitialTransferItem(item);    → signals OrderEntry to open transfer modal
  }

OrderEntry.jsx:55: initialTransferItem prop exists and is consumed.
→ Code path exists. Owner reports not working. Likely a timing/state issue
  (handleTableClick is async navigation; setInitialTransferItem may fire
   before OrderEntry mounts and reads the prop).
```

---

## Fix Approach

### Merge fix
Add `initialShowMerge` prop to `OrderEntry.jsx` (same pattern as `initialTransferItem`). On DashboardPage, replace `console.log` with:
1. `handleTableClick(table)` — open OrderEntry for that table
2. `setInitialShowMerge(true)` — signal to open merge modal on mount

`OrderEntry.jsx` reads `initialShowMerge` prop and calls `setShowMergeModal(true)` in a `useEffect`.

### Transfer fix
Investigate the timing issue. The `handleTableClick` likely navigates (async) while `setInitialTransferItem` sets state immediately. When OrderEntry mounts, it may not see the prop.

Fix options:
A. Use a ref (not state) for `initialTransferItem` in DashboardPage so it's readable synchronously
B. Pass `initialTransferItem` as a route state or URL param alongside the navigation

---

## Affected Files

| File | Change | Risk |
|---|---|---|
| `DashboardPage.jsx` | Replace `console.log` in `onMergeOrder` with real handler; add `initialShowMerge` state; pass as prop to OrderEntry component render | MEDIUM |
| `OrderEntry.jsx` | Add `initialShowMerge = false` prop; add `useEffect` to open merge modal if prop is true on mount | MEDIUM (additive, near-hotspot) |

## Scope Lock
**Files WILL change:** `DashboardPage.jsx`, `OrderEntry.jsx`
**Files will NOT touch:** `MergeTableModal.jsx`, `TransferFoodModal.jsx`, `OrderCard.jsx`, `TableCard.jsx`

## Owner Decision: NONE
## Blast Radius: MEDIUM (2 files — DashboardPage + OrderEntry)
## Note: OrderEntry.jsx is near-hotspot — scope is strictly additive (1 new prop + 1 useEffect)
## Next: Gate 3 Implementation Plan → Gate 4 GO
