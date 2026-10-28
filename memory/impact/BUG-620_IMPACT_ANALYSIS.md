# BUG-620 — Impact Analysis

**Item:** BUG-620 — List View Shows Stale Order Ordering After Socket Update  
**Stage:** Gate 2 — Impact Analysis  
**Code Reality:** FULL — `allTablesList.filter(...).map(...)` in list view has no `sortByActiveFirst`; card view has it at L1916  
**Risk:** LOW — non-hotspot, additive wrapper, same utility already used in card view  
**Conflict Pre-Check:** DashboardPage has open items (BUG-527 F1-F4 GATE_5A, BUG-532 GATE_3, CR-411 GATE_5A). BUG-620 fix is in list view render blocks (L1966-2050) — different sections from all open items. **Parallel-safe.**

---

## Owner Decisions — LOCKED

| OD | Decision |
|---|---|
| **OD-620-01** | Secondary sort within same status: by table/order number ascending (same as card view — already handled by `sortByActiveFirst` secondary sort at `statusHelpers.js L158-162`) |

---

## Data Flow Trace

```
Socket fires updateOrder(orderId, updatedOrder)
  → OrderContext.orders array updated (new reference)
  → tables useMemo (DashboardPage L545) recalculates:
      getOrdersByTableId(t.tableId) returns updated orders
      adaptTable() returns entries with updated status, fOrderStatus
  → allTablesList (L679) recalculates: new entries with updated status values

Card view (L1916):
  sortByActiveFirst(filteredGridItems, TABLE_STATUS_PRIORITY)
  → re-sorts on every render → billReady moves to top ✅

List view (L1966):
  allTablesList.filter(...).map(...)
  → NO sort → uses allTablesList INSERTION ORDER (from apiTables iteration)
  → billReady table stays in its original position ← WRONG
  → Only a full API refresh (setOrders(fresh)) rebuilds allTablesList order
```

---

## Affected Files

### Files WILL change (1 file)

| # | File | Change | Lines | Risk |
|---|---|---|---|---|
| **E1** | `src/pages/DashboardPage.jsx` | Wrap list view dine-in `allTablesList` render block with `sortByActiveFirst(..., TABLE_STATUS_PRIORITY)` | ~L1966-1969: wrap filter chain with sort | LOW |
| **E2** | `src/pages/DashboardPage.jsx` | Same sort wrapper for list view delivery orders block | ~L2010-2020: wrap filter chain | LOW |
| **E3** | `src/pages/DashboardPage.jsx` | Same sort wrapper for list view takeAway orders block | ~L2030-2040: wrap filter chain | LOW |

*E2 and E3 are optional but recommended for consistency. Core fix is E1 (dine-in is the primary use case).*

### Files WILL NOT change
- `utils/statusHelpers.js` — `sortByActiveFirst` already works correctly; no change
- `OrderContext.jsx` — `updateOrder` already updates correctly
- `TableContext.jsx` — `apiTables` unchanged
- Any component file

---

## E1: List View Dine-In Sort (BUG-620)

**Current L1966-1969:**
```js
{activeChannels.includes("dineIn") && allTablesList
  .filter(t => !["available", "reserved"].includes(t.status))
  .filter(t => matchingTableIds === null || matchingTableIds.has(t.id))
  .map((table) => { ... })}
```

**After E1:**
```js
{activeChannels.includes("dineIn") && sortByActiveFirst(
  allTablesList
    .filter(t => !["available", "reserved"].includes(t.status))
    .filter(t => matchingTableIds === null || matchingTableIds.has(t.id)),
  TABLE_STATUS_PRIORITY   // BUG-620: apply same sort as card view
).map((table) => { ... })}
```

**E2 + E3:** Same pattern for delivery and takeAway order blocks in list view (exact lines to be confirmed in Implementation Plan after verifying current line numbers).

**Why safe:** `sortByActiveFirst` is already used in card view (L1916) with the same `TABLE_STATUS_PRIORITY` map. It's a pure sort function (no side effects, no state mutation). Adding it to list view makes both views consistent.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sort changes visual layout users are accustomed to | LOW | LOW | Card view already sorts this way; list view should be consistent |
| Performance on large lists | LOW | LOW | `sortByActiveFirst` creates a shallow copy then sorts — O(n log n), same as card view |
| Delivery/TA sort mismatch | LOW | LOW | Same `TABLE_STATUS_PRIORITY` map; delivery/TA have `tableStatus` from order context |
| Regression on card view | NONE | — | Card view render unchanged; only list view blocks modified |

---

## Downstream Consumers

None — sort is applied inline during render. No state mutation, no context change.

---

## Verification Matrix

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|---|
| V1 | E1 | DashboardPage L1966 | Code: `sortByActiveFirst(allTablesList.filter(...), TABLE_STATUS_PRIORITY)` present | YES (grep) |
| V2 | E1 | DashboardPage | Browser: socket updates order status → switch to list view → order appears in correct priority position (not original API position) | NO |
| V3 | E1 | DashboardPage | Browser: billReady order → switch list view → appears at/near top (not buried at original API insertion position) | NO |
| V4 | E1 | DashboardPage | Browser: card view ordering matches list view ordering for same active orders | NO |
| V5 | E2+E3 | DashboardPage | Browser: delivery and takeAway orders in list view also sorted by status | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-620 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: DashboardPage entry updated with BUG-620 date
- [ ] Code marker: // BUG-620 in each modified sort block
- [ ] Compile: webpack 0 new warnings
```

## Gate Status
- Gate 1: COMPLETE (Intake)
- Gate 2: **COMPLETE** (this document)
- Gate 3: Awaiting Implementation Plan → Gate 4 GO (Fast Lane eligible — owner approve)
