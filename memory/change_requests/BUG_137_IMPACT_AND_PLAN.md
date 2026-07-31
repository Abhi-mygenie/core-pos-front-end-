# BUG-137 — Impact Analysis & Implementation Plan

**Item:** BUG-137 — KOT Re-Print from Inside View (CartPanel) Fails
**Gate:** 2+3 (Impact Analysis + Implementation Plan)
**Date:** 2026-06-18
**Risk:** MEDIUM
**Code Reality:** PARTIAL (station picker wired, `getOrderById` missing)
**Conflict Pre-Check:** CLEAR — no other open item touches `RePrintButton.jsx`

---

## Gate 2: Impact Analysis

### Data Flow Trace
```
CartPanel.jsx:1182 → <RePrintOnlyButton orderId={orderId} cartItems={cartItems} />
  ↓
RePrintButton.jsx:20 handlePrintKot()
  → L24: filter placed items
  → L27: getStationsFromOrderItems(placedItems, getProductById)
  → L35-42: single station → executePrintKot() / multi → StationPickerModal
  ↓
RePrintButton.jsx:46 executePrintKot(selectedStations)
  → L51: stationKot = selectedStations.join(',')
  → L53: const order = getOrderById(orderId)  ← ⛔ UNDEFINED — ReferenceError
  → L54: printOrder(orderId, 'kot', stationKot, order, ...)  ← never reached
  → L55-57: catch → toast error
```

### Affected Files
| File | Lines | Impact |
|------|-------|--------|
| `components/order-entry/RePrintButton.jsx` | L11-60 (`RePrintOnlyButton`) | **FIX TARGET** — add `useOrders()` destructure |

### Files WILL NOT Touch
- `OrderCard.jsx` — uses `order` prop directly, unaffected
- `TableCard.jsx` — uses `order` prop directly, unaffected
- `StationPickerModal.jsx` — presentational only, unaffected
- `CartPanel.jsx` — passes correct props already, unaffected
- `orderService.js` — `printOrder` function is correct, unaffected

### Downstream Consumers
- None. `RePrintOnlyButton` is a leaf component with no children that depend on its state.

### Owner Decisions Needed
- None

---

## Gate 3: Implementation Plan

### Edit 1: Add `useOrders()` destructure

**File:** `src/components/order-entry/RePrintButton.jsx`
**Line:** After line 18 (after `const { printerAgents } = useRestaurant();`)

**Current (L16-18):**
```js
  const { getProductById } = useMenu();
  // CR-POS2-003 (May-2026): printer agents threaded into Re-Print KOT call.
  const { printerAgents } = useRestaurant();
```

**After:**
```js
  const { getProductById } = useMenu();
  // CR-POS2-003 (May-2026): printer agents threaded into Re-Print KOT call.
  const { printerAgents } = useRestaurant();
  // BUG-137: getOrderById needed for KOT print payload (waiterName, tablename, orderNote, items)
  const { getOrderById } = useOrders();
```

**Rationale:** `useOrders` is already imported at line 3. `PrintBillButton` (line 101 in the same file) already uses this exact pattern. The fix adds 1 line.

### Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1 | RePrintButton.jsx:19 | Add `const { getOrderById } = useOrders()` | Unit test: mock useOrders, verify printOrder receives order data | YES |
| 1 | RePrintButton.jsx:19 | Same | Browser: open order detail → click Re-Print → KOT prints | NO |
| 1 | RePrintButton.jsx:19 | Same | Browser: order with 2+ stations → Re-Print → station picker appears → select → prints | NO |

### Post-Code Registry Checklist
- [ ] registry.json: BUG-137 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add `RePrintButton.jsx` row
- [ ] Code markers: `// BUG-137` comment on the new line

### Scope Lock
- **Files WILL change:** `src/components/order-entry/RePrintButton.jsx` (1 line added after L18)
- **Files WILL NOT touch:** OrderCard, TableCard, CartPanel, StationPickerModal, orderService, stationService
