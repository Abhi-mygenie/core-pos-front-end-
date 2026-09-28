# Investigation Report — Smoke Failures 2026-09-02
**Date:** 2026-09-02 | **Role:** INVESTIGATION | **Steps:** 10/10

---

## Executive Summary

| # | Bug | Classification | Confidence | Fix Applied |
|---|-----|---------------|-----------|-------------|
| A | BUG-371 Variation price not saving | FE_BUG — CODE_ERROR | HIGH | ✅ DIRECT_BUG_FIX — BulkEditor.jsx buildPayload |
| B | BUG-372 Transfer Table | FE_BUG — PLAN_GAP | HIGH | ✅ DIRECT_BUG_FIX — OrderEntry + DashboardPage |
| C | BUG-372 Merge Table | Likely working — needs live test | MEDIUM | No code change |
| D | Order Beta error | FE_BUG — TDZ (already fixed by testing agent) | MEDIUM | Already fixed |
| E | Advance Payment display | OWNER DECISION NEEDED | N/A | Not a bug |

---

## A — BUG-371 Variation Price Save

### Data Flow Trace
```
BulkEditor → handleVariationPriceChange(rowId, gIdx, vIdx, 8)
  → setRows: row.variations[gIdx].values[vIdx].price = 8  ✅
  → isDirty('variations'): JSON.stringify diff  ✅

handleSave → buildPayload(row) → editFood(id, payload)
  BREAK POINT: buildPayload sent:
    variation: [{ name: g.name, values: [{ name: v.name, optionPrice }] }]
                ↑ WRONG KEY                ↑ WRONG FIELD

  Backend expects:
    variations: [{ name: g.name, ..., values: [{ label: v.name, optionPrice }] }]
    ↑ plural                                  ↑ label not name

  Backend ignores unrecognised 'variation' key → prices unchanged → refresh shows 0
```

### Root Cause
`buildPayload` in `BulkEditor.jsx` used `variation` (singular) and `name:` for option labels.
Backend API and `ProductForm.toAPI.foodInfo()` both use `variations` (plural) and `label:`.

### Fix Applied
`BulkEditor.jsx` lines 203-210: Changed `variation` → `variations`, `name:` → `label:`, added full structure `{type, required, min, max}` to match ProductForm's `toAPI.foodInfo()` output.

---

## B — BUG-372 Transfer Table

### Data Flow Trace
```
DashboardPage OrderCard
  onTableShift={(o) => console.log('[OrderCard] Shift table:', o.orderId)}
                ↑ PLAN_GAP: still a placeholder — ShiftTableModal never opens
```

`ShiftTableModal` and `OrderEntry.handleShift` are fully implemented and correct.
`initialShowMerge` prop pattern (for Merge) was implemented correctly in BUG-372.
`initialShowShift` equivalent was NOT implemented.

### Fix Applied
- `OrderEntry.jsx`: Added `initialShowShift = false` prop + `useEffect(() => { if (initialShowShift) setShowShiftModal(true); }, [initialShowShift])`
- `DashboardPage.jsx`: Added `initialShowShift` state + reset in `handleCloseOrderEntry` + wired `onTableShift` to set `initialShowShift=true` + `handleTableClick`
- `DashboardPage.jsx`: Passed `initialShowShift={initialShowShift}` to `<OrderEntry />`

---

## C — BUG-372 Merge Table

Code at `DashboardPage.jsx:1956-1959`:
```js
onMergeOrder={(order) => {
  const tableEntry = tables?.find(t => t.orderId === order.orderId);
  if (tableEntry) { setInitialShowMerge(true); handleTableClick(tableEntry); }
}}
```
Logic is correct — `tables.find` locates the current order's table, opens OrderEntry with merge modal.
Needs live testing to confirm. May fail if `order.orderId` vs `t.orderId` type mismatch (string vs number).

---

## D — Order Beta Error

Testing agent already fixed: moved `fetchData` declaration from line ~349 to line 254 (before `handleChange` and `handleUnpaidConfirm` which depend on it — TDZ). Compilation now clean.

---

## E — Advance Payment Display (OWNER DECISION)

Owner's question: advance payments taken during room operations, final balance, deposit behavior.
This requires owner to define:
1. Should advance payment be shown on the room card/order card?
2. Is advance a "deposit" that reduces final bill or is tracked separately?
3. Can multiple advances be taken while order is running?
4. What should the UI show when advance > bill amount?

**No code change possible without owner decisions on these business rules.**

---

## Files Changed

| File | Change | Bug |
|---|---|---|
| `components/panels/menu/BulkEditor.jsx` | `buildPayload`: `variation`→`variations`, `name:`→`label:`, full structure | BUG-371 |
| `components/order-entry/OrderEntry.jsx` | +`initialShowShift` prop + useEffect | BUG-372 |
| `pages/DashboardPage.jsx` | +`initialShowShift` state + onTableShift wire + prop pass | BUG-372 |
