# Socket v2 Architecture — Feature Spec & Test Plan

**Created:** April 13, 2026
**Status:** PLANNING — Console log verification phase
**Goal:** Handle all v2 socket events, remove BUG-216 workaround, unified handler architecture

---

## 1. Background

### Current State
- 6 flows upgraded to v2 endpoints (New Order, Update Order, Switch Table, Merge Table, Transfer Food, Collect Bill)
- 3 NEW socket events discovered: `update-order-target`, `update-order-source`, `update-order-paid`
- All 3 are currently **silently dropped** ("Unknown order event")
- BUG-216 workaround (`free→engage`) still active — causes stuck tables
- Cancel Food Item remains on v1

### Target State
- All v2 socket events handled via unified handler
- BUG-216 workaround removed
- Zero GET API calls for v2 flows
- All walk-in/takeaway/delivery edge cases covered

---

## 2. New Socket Events (Verified)

| Event | Flows | Payload? | Action |
|-------|-------|----------|--------|
| `update-order-target` | Switch Table, Merge, Transfer Food | ✅ Yes | `updateOrder()` + detect table change |
| `update-order-source` | Merge, Transfer Food | ✅ Yes | `removeOrder()` if cancelled, else `updateOrder()` |
| `update-order-paid` | Collect Bill | ✅ Yes | `removeOrder()` + free table |

---

## 3. Identified Risks

| # | Risk | Level | Status |
|---|------|-------|--------|
| R1 | Double fire: `update-order-paid` + `update-order-status` for collect bill | LOW | ❓ UNVERIFIED |
| R2 | `update-table free` also fires for collect bill (conflicts with BUG-216 removal) | UNKNOWN | ❓ UNVERIFIED |
| R3 | BUG-216 removal breaks cancel food (table briefly shows available) | MEDIUM | ❓ UNVERIFIED |
| R4 | Collect bill local `setTableEngaged` → permanent table lock | HIGH | ❓ UNVERIFIED |
| R5 | Transfer food last item → source cancelled? | LOW | ❓ UNVERIFIED |
| R6 | Walk-in collect bill — any table events for tableId=0? | LOW | ❓ UNVERIFIED |

---

## 4. Console Log Test Plan

### How to test
1. Open browser console (F12 → Console tab)
2. Clear console before each test
3. Perform the action described
4. Copy ALL console logs from the moment of action until dashboard fully updates
5. Share logs here for analysis

### Filter tip
In console, filter by `[Socket]` or `[SocketHandler]` to see only socket events.

---

### TEST 1: Collect Bill — Dine-in (Cash)

**Purpose:** Verify Risk R1 (double fire) + Risk R2 (update-table free)

**Setup:** Have a dine-in order on any table (unpaid, with items)

**Action:** Open order → Collect Bill → Select Cash → Confirm payment

**What we're looking for in logs:**
1. Does `order-engage` fire? (Expected: YES)
2. Does `update-order-paid` fire? (Expected: YES — already verified)
3. Does `update-order-status` ALSO fire? (Risk R1 — double fire?)
4. Does `update-table {tableId} free` fire? (Risk R2 — table free event?)
5. What is the COMPLETE sequence of socket events?

**Expected (best case):**
```
order-engage {orderId} engage
update-order-paid {orderId} {payload}
— nothing else —
```

**Worst case (double fire + table free):**
```
order-engage {orderId} engage
update-order-paid {orderId} {payload}
update-order-status {orderId} 6
update-table {tableId} free
```

**Outcome:**
- If only `order-engage` + `update-order-paid`: R1 eliminated, R2 eliminated
- If `update-order-status` also fires: R1 confirmed — need guard
- If `update-table free` also fires: R2 confirmed — need careful handling

---

### TEST 2: Collect Bill — Walk-in (Cash)

**Purpose:** Verify Risk R6 (walk-in table events)

**Setup:** Have a walk-in order (unpaid)

**Action:** Open order → Collect Bill → Select Cash → Confirm

**What we're looking for:**
1. Same events as Test 1?
2. Any `update-table 0 free` or similar?
3. Does `order-engage` fire for walk-in orders?

**Outcome:**
- If identical to Test 1 (minus table events): R6 eliminated
- If `update-table 0` events appear: need to verify `tableId=0` guard works

---

### TEST 3: Cancel Food Item — Partial Cancel (Dine-in)

**Purpose:** Verify Risk R3 (BUG-216 removal impact)

**Setup:** Dine-in order with 2+ items on a table

**Action:** Open order → Cancel ONE item (not all) → Select reason → Confirm

**What we're looking for:**
1. Does `update-table {tableId} free` fire?
2. Does `update-order-status` fire? With what `f_order_status`?
3. Does `order-engage` fire? (v2 behavior?)
4. Any new events like `update-order-source`?
5. Time gap between `update-table free` and `update-order-status`

**Key question:** Is the gap between events sub-millisecond (same socket batch) or seconds (async)?

**Expected (v1 behavior):**
```
update-table {tableId} free
update-order-status {orderId} {f_order_status}
```

**Best case (v2 behavior):**
```
order-engage {orderId} engage
update-order-{something} {orderId} {payload}
```

**Outcome:**
- If v1 pattern: BUG-216 removal needs careful mitigation (R3 confirmed)
- If v2 pattern with payload: R3 eliminated — cancel food may have been upgraded too
- Time gap data tells us if "brief flash" is a real UX problem

---

### TEST 4: Cancel Food Item — Last Item (Dine-in)

**Purpose:** Verify cancel behavior when order dies (all items cancelled)

**Setup:** Dine-in order with exactly 1 item

**Action:** Open order → Cancel the only item → Select reason → Confirm

**What we're looking for:**
1. Same events as Test 3?
2. Does order get removed from context?
3. Does table become available?
4. Any different events vs partial cancel?

**Outcome:** Confirms whether full-cancel-via-item follows same pattern as partial cancel

---

### TEST 5: Cancel Full Order (Order-level)

**Purpose:** Verify cancel order socket pattern

**Setup:** Dine-in order with items

**Action:** Open order → Cancel Order (trash icon) → Select reason → Confirm

**What we're looking for:**
1. What events fire? `update-table free`? `update-order-status`?
2. Any new v2 events?
3. Does `order-engage` fire?
4. Same pattern as cancel food or different?

**Outcome:** Tells us if order-level cancel has same risks as item-level cancel

---

### TEST 6: Transfer Food — Last Item

**Purpose:** Verify Risk R5 (source order cancelled when last item transferred)

**Setup:** 
- Table A: order with exactly 1 item
- Table B: order with any items

**Action:** Open Table A → Transfer the only item to Table B

**What we're looking for:**
1. `update-order-source` for Table A's order — what `f_order_status`?
2. If `f_order_status=3` (cancelled): source order should be removed
3. If `f_order_status=1` (still active): source order stays with 0 items
4. Does Table A become available?

**Outcome:**
- If `f_order_status=3`: R5 confirmed but already handled by `auto` logic
- If `f_order_status=1` with 0 items: need to decide if we should remove anyway

---

### TEST 7: Collect Bill — Dine-in (UPI/Card)

**Purpose:** Verify non-cash payment follows same socket pattern

**Setup:** Dine-in order with items

**Action:** Open order → Collect Bill → Select UPI or Card → Enter transaction ID → Confirm

**What we're looking for:**
1. Same events as Test 1 (cash)?
2. Any difference in socket payload?

**Outcome:** Confirms payment method doesn't affect socket behavior

---

### TEST 8: Cancel Food — Walk-in

**Purpose:** Verify cancel on walk-in (no physical table)

**Setup:** Walk-in order with 2+ items

**Action:** Cancel one item from walk-in order

**What we're looking for:**
1. Any `update-table 0` events?
2. Does `order-engage` fire?
3. Same pattern as dine-in cancel?

**Outcome:** Confirms walk-in cancel is safe

---

## 5. Test Execution Tracker

| # | Test | Date | Logs Shared? | Result | Risks Resolved |
|---|------|------|-------------|--------|---------------|
| 1 | Collect Bill dine-in (cash) | Apr 13 | ✅ | CLEAN — only `order-engage` + `update-order-paid`. No `update-order-status`, no `update-table free` | R1 eliminated, R2 eliminated, R4 confirmed (local engage = permanent lock) |
| 2 | Collect Bill walk-in (cash) | Apr 13 | ✅ | CLEAN — identical to dine-in. `order-engage` + `update-order-paid` only. No table events. | R6 eliminated |
| 2b | Collect Bill delivery (cash) | Apr 13 | ✅ | CLEAN — identical pattern. 2 sec gap between HTTP response and `update-order-paid` (not a problem). | R6 eliminated |
| 3 | Cancel food partial (walk-in) | Apr 13 | ✅ | v1 pattern: `update-table 0 free` (skipped) + `update-order-status` (f_order_status=6, wrong) + GET API (2 sec). No v2 events. Walk-in safe. | R3 partial — walk-in safe, dine-in NOT YET TESTED |
| 3b | Cancel food full (walk-in) | Apr 13 | ✅ | Same v1 pattern. GET returns "paid" → removeOrder. 3 sec GET. | R3 partial |
| 3c | Cancel food partial (DINE-IN) | Apr 13 | ✅ | v1 pattern: `update-table 3239 free` + `update-order-status` (6). GET takes 1 sec. BUG-216 workaround currently saves it. Without workaround: 1 sec window where table shows "available". Mitigation: re-engage in handleUpdateOrderStatus before GET. | R3 CONFIRMED — 1 sec window, mitigatable |
| 3d | Cancel food last item (DINE-IN) | | ❌ NEEDED | — | R3 critical test |
| 5 | Cancel full order (dine-in) | | ❌ | — | R3 |
| 6 | Transfer food last item | | ❌ | — | R5 |
| 7 | Collect bill dine-in (UPI) | | ❌ | — | R1 |
| 8 | Cancel food (walk-in) | | ❌ | — | R3, R6 |

---

## 6. Implementation Plan (After All Tests Pass)

### Phase 1: Socket Handlers (Steps 1-4)
- Add 3 event constants to `socketEvents.js`
- Create unified `handleOrderDataEvent()` in `socketHandlers.js`
- Fix `handleUpdateTable` (BUG-216) based on test results
- Wire events in `useSocketEvents.js`

### Phase 2: OrderEntry Wait Logic (Steps 5-7)
- Add `waitForOrderEngaged()` to `OrderContext.jsx`
- Update OrderEntry.jsx handlers (shift, merge, transfer, collect bill, cancel)
- Add guard to `handleUpdateOrderStatus`

### Phase 3: Walk-in Edge Cases
- Verify all tableId=0 guards
- Test all walk-in combinations

---

## 7. Files to Change

| File | Phase | Changes |
|------|-------|---------|
| `socketEvents.js` | 1 | Add `UPDATE_ORDER_TARGET`, `UPDATE_ORDER_SOURCE`, `UPDATE_ORDER_PAID` |
| `socketHandlers.js` | 1 | New unified handler + BUG-216 fix + guard in `handleUpdateOrderStatus` |
| `useSocketEvents.js` | 1 | Wire 4 events to unified handler |
| `OrderContext.jsx` | 2 | Add `waitForOrderEngaged()` |
| `OrderEntry.jsx` | 2 | Update wait/engage patterns in 6 handlers |

---

## 8. Rollback Plan

- Each phase is independently deployable
- Phase 1 can be rolled back by removing new event handlers (old events still work)
- Phase 2 can be rolled back by reverting wait logic (fire & close still works)
- BUG-216 fix can be rolled back independently by restoring the `free→engage` line

---

## 9. Endpoints Reference

| Flow | Endpoint | Version | Method |
|------|----------|---------|--------|
| Place Order | `/api/v2/vendoremployee/order/place-order` | v2 | POST |
| Update Order | `/api/v2/vendoremployee/order/update-place-order` | v2 | PUT |
| Switch Table | `/api/v2/vendoremployee/order/order-table-room-switch` | v2 | POST |
| Merge Table | `/api/v2/vendoremployee/order/transfer-order` | v2 | POST |
| Transfer Food | `/api/v2/vendoremployee/order/transfer-food-item` | v2 | POST |
| Collect Bill | `/api/v2/vendoremployee/order/order-bill-payment` | v2 | POST |
| Cancel Food | `/api/v1/vendoremployee/order/cancel-food-item` | **v1** | PUT |
| Cancel Order | `/api/v2/vendoremployee/order-status-update` | v2 | PUT |
| Food Status | `/api/v2/vendoremployee/food-status-update` | v2 | PUT |
| Get Single Order | `/api/v2/vendoremployee/get-single-order-new` | v2 | POST |

---

## 10. GET Single Order Callers (Current)

| # | Caller | File | Trigger | Needed After v2? |
|---|--------|------|---------|-----------------|
| 1 | `handleUpdateOrder` (fallback) | `socketHandlers.js` | `update-order` no payload | Keep (backwards compat) |
| 2 | `handleUpdateFoodStatus` | `socketHandlers.js` | `update-food-status` | Keep (v1, no payload) |
| 3 | `handleUpdateOrderStatus` | `socketHandlers.js` | `update-order-status` | Keep (cancel flows, v1) |
| 4 | `handleScanNewOrder` | `socketHandlers.js` | `scan-new-order` | Keep (v1, no payload) |
| 5 | `handleDeliveryAssignOrder` | `socketHandlers.js` | `delivery-assign-order` | Keep (v1, no payload) |
| 6 | OrderEntry (Split Bill) | `OrderEntry.jsx` | After split API response | Keep (deliberate fetch) |
| 7 | Report Detail Sheet | `reportService.js` | UI detail view | Keep (not socket) |

### Backend Changes Needed for Full Zero-GET

| Event | Current | Backend Action Needed |
|-------|---------|----------------------|
| `update-food-status` | No payload | Add payload to socket |
| `update-order-status` (cancel) | No payload | Add payload or new event with payload |
| `scan-new-order` | No payload | Add payload to socket |
| `delivery-assign-order` | No payload | Add payload to socket |
