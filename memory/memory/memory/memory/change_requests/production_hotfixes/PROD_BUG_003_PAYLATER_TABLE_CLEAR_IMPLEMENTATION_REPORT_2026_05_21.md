# PROD-BUG-003 — PayLater Table Clear — Implementation Report — 2026-05-21

## 1. Bug Identity

| Field | Value |
|---|---|
| Bug ID | PROD-BUG-003 |
| Title | PayLater prepaid order served/settled but table/order not cleared |
| Severity | HIGH — tables blocked, operational disruption |
| Branch | `21-may-phase-2` |
| Fix scope | Frontend only — `socketHandlers.js`, ~7 lines |
| Status | `prod_bug_003_frontend_hotfix_owner_verified_backend_followup_open` |

---

## 2. Root Cause

Backend emits the PayLater settle socket event on `update-order` channel, not `update-order-paid`.

The frontend socket handler `handleOrderDataEvent` receives the event with `f_order_status: 9` and `eventName: 'update-order'`. Because the event is not on `update-order-paid`:

- `isPayLaterSettle` = false (requires `update-order-paid`)
- `isPayLaterComplete` = false (requires `update-order-paid`)
- `isHoldClear` = true (fOS=9 + not isPayLaterSettle)

The `isHoldClear` path removed the order from OrderContext but set the table to `'occupied'` (via `ORDER_TO_TABLE_STATUS` mapping of fOS=9 → `pendingPayment` → `'occupied'`). It could not distinguish a real Hold/Park from a PayLater settle because both arrive as fOS=9.

Result: order removed, table stuck as occupied with "NA" display. Table unusable until page refresh.

---

## 3. Evidence

| Evidence | Source |
|---|---|
| Socket event channel | Owner console capture: `['update-order', 868809, 478, 9, {orders: Array(1)...}]` |
| Socket payload | `payment_status: "success"`, `payment_type: "prepaid"`, `payment_method: "PayLater"`, `f_order_status: 9`, `order_status: "delivered"` |
| Bucket B already applied | `socketHandlers.js` L319: accepts `'sucess' \|\| 'success'` — necessary but not sufficient |
| Table stuck as occupied | Owner screenshot: tables showing "NA" after PayLater settle on fresh orders |
| Fix verified | Owner confirmed table clears correctly after hotfix applied |

---

## 4. Fix Implemented

### File changed
`/app/frontend/src/api/socket/socketHandlers.js`

### Location
Inside `handleOrderDataEvent`, within the `shouldRemove` → `isHoldClear` branch (L326–337).

### What was added
A new check `isPayLaterViaHold` that detects when the `isHoldClear` path is actually handling a PayLater settle:

```
isPayLaterViaHold = isHoldClear &&
  order.paymentType === 'prepaid' &&
  order.paymentMethod?.toLowerCase() === 'paylater' &&
  (order.paymentStatus === 'sucess' || order.paymentStatus === 'success')
```

### Branching logic

| Condition | Table action | Order action |
|---|---|---|
| `isHoldClear` AND NOT `isPayLaterViaHold` | `syncTableStatus(order, updateTableStatus)` → stays `'occupied'` | `removeOrder(orderId)` |
| `isHoldClear` AND `isPayLaterViaHold` | `syncTableStatus(order, updateTableStatus, 'available')` → freed | `removeOrder(orderId)` |
| `isTerminal` or `isPayLaterSettle` or `isPayLaterComplete` | `syncTableStatus(order, updateTableStatus, 'available')` → freed | `removeOrder(orderId)` |

### What was NOT changed
- Hold/Park behavior (fOS=9 without PayLater fields) — unchanged
- `isPayLaterSettle` path (fOS=9 on `update-order-paid`) — unchanged
- `isPayLaterComplete` path (4-condition guard on `update-order-paid`) — unchanged
- `handleUpdateOrderStatus` defensive guard — unchanged
- `handleUpdateFoodStatus` — unchanged
- Polling reconciliation (`useOrderPollingReconciliation.js`) — unchanged
- No other files changed
- No `/app/memory/final/` updated
- No baseline docs modified

---

## 5. Baseline Alignment

| Baseline Rule | Alignment |
|---|---|
| PAY-004 (PayLater = `'sucess'`) | Fix checks `'sucess' \|\| 'success'` — accepts the frozen baseline value plus correct spelling |
| PAY-007 (backend requires `'sucess'` typo) | No typo fix attempted — frontend accepts both spellings defensively |
| SM-07 (table status from order socket) | Fix still derives table status from socket event — adds 'available' override for PayLater within the existing socket handler |
| OQ-02 (table status = order socket f_order_status) | Preserved — override only for confirmed PayLater settle |
| MC-02 (realtime flows sync via socket) | Preserved — fix operates within the socket handler, not outside it |
| FA-03 (do not expand hotspot files casually) | `socketHandlers.js` is a listed hotspot — change is surgical (~7 lines) within the existing `isHoldClear` branch, justified by HIGH severity |
| DASH-002 (socket status-9 clears from dashboard) | Preserved — order is still removed. Fix corrects the TABLE status only |

### Option B1 (accept `'paid'`) — WITHDRAWN
PAY-004 frozen baseline defines PayLater status as `'sucess'`, not `'paid'`. Adding `'paid'` to the PayLater-specific guard would conflate PayLater with normal prepaid semantics. Bucket B (`'sucess' || 'success'`) is the correct, baseline-aligned widening.

---

## 6. Verification

| Verification | Result |
|---|---|
| Compilation | Clean — only pre-existing `OrderEntry.jsx` lint warning |
| Owner live test | PASSED — new PayLater order created, settled, table cleared correctly |
| Hold/Park regression | Not affected — `isPayLaterViaHold` only matches `prepaid + paylater + sucess/success` |
| Non-PayLater prepaid regression | Not affected — non-PayLater prepaid has `payment_status: 'paid'` and does not match `isPayLaterViaHold` |

---

## 7. Open Items

| Item | Type | Priority | Owner |
|---|---|---|---|
| Backend should emit PayLater settle on `update-order-paid` channel | Backend follow-up | P1 | Backend team |
| Polling `useOrderPollingReconciliation.js` fOS=9 skip needs PayLater distinction | Frontend follow-up | P2 | Frontend — future sprint |
| Backend action items doc | Reference | — | `/app/memory/change_requests/production_hotfixes/PROD_BUG_003_BACKEND_ACTION_ITEMS_2026_05_21.md` |

---

## 8. Related Documents

| Document | Path |
|---|---|
| Initial impact analysis | `PROD_HOTFIX_001_PREPAID_AUTO_SETTLE_PRINT_GUARD_IMPACT_ANALYSIS_2026_05_20.md` |
| Focused analysis | `PROD_BUG_003_PAYLATER_TABLE_CLEAR_IMPACT_AND_PLAN_2026_05_20.md` |
| Baseline re-analysis | `PROD_BUG_003_PAYLATER_TABLE_CLEAR_BASELINE_REANALYSIS_2026_05_20.md` |
| Consolidated planning | `PROD_HOTFIX_001_CONSOLIDATED_PLANNING_AND_QUESTION_CLEARANCE_2026_05_20.md` |
| Backend action items | `PROD_BUG_003_BACKEND_ACTION_ITEMS_2026_05_21.md` |

---

## 9. Final Status

**`prod_bug_003_frontend_hotfix_owner_verified_backend_followup_open`**
