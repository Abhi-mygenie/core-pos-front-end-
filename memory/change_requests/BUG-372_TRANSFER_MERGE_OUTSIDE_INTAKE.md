# BUG-372 INTAKE — Transfer and Merge Buttons Not Working From Order Card (Outside Order Entry)
**Date:** 2026-09-01 | **Priority:** P1 | **Risk:** HIGH | **Severity:** MAJOR | **Status:** INTAKE

## Description
On the Dashboard, the Transfer Item and Merge Table buttons visible on order cards do not work when clicked from outside the full Order Entry view. Clicking Merge does nothing. Transfer either does not open the flow or fails silently.

## Code Reality: PARTIAL

**Merge — confirmed broken:**
`DashboardPage.jsx:1956`:
```jsx
onMergeOrder={(o) => console.log('[OrderCard] Merge order:', o.orderId)}
```
The merge handler is a `console.log` placeholder. `MergeTableModal` is imported in `OrderEntry.jsx` but not wired up in `DashboardPage.jsx`. Clicking Merge from an order card logs to console and does nothing.

**Transfer — partially implemented:**
`DashboardPage.jsx:1552` has `handleFoodTransfer` which sets state to open OrderEntry with transfer pre-filled. Owner reports this also not working — needs live testing to confirm root cause (possible state conflict when opening OrderEntry from card).

## Duplicate Check: DISTINCT
## Blast Radius: MEDIUM — DashboardPage.jsx (Merge implementation + Transfer fix) + possibly MergeTableModal integration
## Planning Skip: NO — Merge is a full implementation gap; Transfer needs live investigation
## Next: Gate 2 Impact Analysis
