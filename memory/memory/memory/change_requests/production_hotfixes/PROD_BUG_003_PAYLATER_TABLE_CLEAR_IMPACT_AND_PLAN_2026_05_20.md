# PROD-BUG-003 — PayLater Table Clear Impact + Plan — 2026-05-20

## 1. Purpose

Focused impact analysis + planning for PROD-BUG-003 only: PayLater prepaid order served but table/order not cleared.

No code was changed. No implementation performed. No QA executed. No `/app/memory/final/` updated. No baseline docs modified.

---

## 2. Scope

**In scope:**
- PayLater/prepaid served/settled table/order clearing
- Socket handler removal guards
- OrderContext removal + TableContext clearing
- Frontend-safe fix evaluation

**Out of scope:**
- Auto Settle (PROD-BUG-001 — closed, passed)
- Settle Print Guard (PROD-BUG-002)
- Code changes / QA / deployment / baseline updates

---

## 3. Inputs Read

### Baseline Docs Read
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` — READ (key: SM-07 table status from order socket, MC-02 socket sync, FA-05 code is truth)
- `/app/memory/final/MODULE_DECISIONS_FINAL.md` — READ (key: Module 7 Socket, Module 13 Tables/Orders Runtime)
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` — READ (key: OQ-02 table status = order socket f_order_status)
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` — READ
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` — READ

### Overlay Docs
- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` — **NOT_FOUND**
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` — **NOT_FOUND**
- `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` — **NOT_FOUND**
- `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` — **NOT_FOUND**
- `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` — **NOT_FOUND**

### Hotfix Docs Read
- `PROD_HOTFIX_001_PREPAID_AUTO_SETTLE_PRINT_GUARD_IMPACT_ANALYSIS_2026_05_20.md` — READ (Section 7b PayLater analysis, 505 lines)

### Code Files Inspected
1. `api/services/orderService.js` — `completePrepaidOrder` payload (PayLater sends `payment_status:'sucess'`)
2. `api/socket/socketHandlers.js` — `handleOrderDataEvent` L306-335 (primary PayLater removal), `handleUpdateOrderStatus` L484-502 (defensive), `handleUpdateFoodStatus` L370-437 (terminal-only check, no PayLater guard), `syncTableStatus` L131-140
3. `api/socket/useSocketEvents.js` — subscription mapping (update-order-paid → handleOrderDataEvent, update-food-status → handleUpdateFoodStatus, update-order-status → handleUpdateOrderStatus)
4. `api/socket/socketEvents.js` — event names
5. `api/transforms/orderTransform.js` L220-222 — paymentStatus/paymentType/paymentMethod mapping
6. `api/constants.js` — F_ORDER_STATUS, ORDER_TO_TABLE_STATUS
7. `contexts/OrderContext.jsx` L155-170 — removeOrder
8. `contexts/TableContext.jsx` L94-136 — updateTableStatus, 'available' clearing
9. `pages/DashboardPage.jsx` L1392-1401 (handlePrepaidSettleSuccess), L1473-1496 (handleMarkServed)

---

## 4. Plain-English Bug Summary

**Issue:** When a prepaid PayLater order is served/settled via `completePrepaidOrder()`, the table remains occupied on the dashboard with stale "NA" content. The order card does not disappear. The table cannot be reused.

**Expected:** After successful settle API call, backend emits a socket event, frontend socket handler matches the event, calls `removeOrder()` + `syncTableStatus(... 'available')`, order disappears, table frees.

**Current:** The socket handler's PayLater removal guard fails to match, so the order stays in OrderContext and the table stays occupied. `handlePrepaidSettleSuccess` only clears the order-entry UI selection — it does NOT remove the order or free the table.

**Operational impact:** HIGH — tables blocked, staff confusion, requires manual page refresh to recover.

---

## 5. Current PayLater / Prepaid Flow Map

| Step | File | Function/Handler | Current Behavior | Expected Behavior | Risk |
|---|---|---|---|---|---|
| 1. Order placed as prepaid+PayLater | `orderTransform.js` / backend | Order arrives via socket | `paymentType='prepaid'`, `paymentMethod='paylater'`, `paymentStatus='unpaid'` | Correct | None |
| 2. Order progresses fOS=1→2 | Dashboard cards | Normal Ready/Serve flow | Cards update via socket | Correct | None |
| 3. Serve/Settle clicked | `DashboardPage.jsx` L1473-1496 | `handleMarkServed` | Detects `paymentType='prepaid'` → calls `completePrepaidOrder()` with `isPayLater=true` → sends `payment_status:'sucess'` | Correct — uses prepaid settle endpoint | **Skips normal updateOrderStatus('serve')** |
| 4. API response | `orderService.js` | `completePrepaidOrder` returns | HTTP 200 from backend | Correct | None |
| 5. UI selection cleared | `DashboardPage.jsx` L1392-1401 | `handlePrepaidSettleSuccess` | Clears `orderEntryTable` selection only | **DOES NOT remove order or free table** | **GAP — no fallback if socket fails** |
| 6. Backend emits socket event | Backend | Unknown handler | Should emit `update-order-paid` with order payload | **UNKNOWN — may emit wrong event or wrong payload** | **PRIMARY RISK** |
| 7. Socket handler processes | `socketHandlers.js` | `handleOrderDataEvent` | Checks `isTerminal`, `isPayLaterSettle`, `isPayLaterComplete`, `isHoldClear` | Must match at least one removal condition | **FRAGILE — 4-condition AND gate** |
| 8. Order removed from context | `OrderContext.jsx` L155-170 | `removeOrder(orderId)` | Only called if step 7 matches | Order disappears from dashboard | **BLOCKED if step 7 fails** |
| 9. Table freed | `socketHandlers.js` → `TableContext.jsx` | `syncTableStatus(order, updateTableStatus, 'available')` | Only called if step 7 matches AND `order.tableId !== 0` | Table becomes available | **BLOCKED if step 7 fails; SKIPPED for walk-in (tableId=0)** |

---

## 6. Socket / Context Clearing Map

| Event/Action | Handler | Removes Order? | Frees Table? | Guard Conditions | Risk |
|---|---|---|---|---|---|
| `update-order-paid` with fOS=6 (paid) | `handleOrderDataEvent` | YES via `isTerminal` | YES (`'available'` override) | `order.status === 'paid'` | LOW — if backend sends fOS=6 |
| `update-order-paid` with fOS=9 | `handleOrderDataEvent` | YES via `isPayLaterSettle` | YES (`'available'` override) | `order.fOrderStatus === 9 && eventName === 'update-order-paid'` | MEDIUM — relies on correct event channel |
| `update-order-paid` with prepaid+paylater+sucess/success | `handleOrderDataEvent` | YES via `isPayLaterComplete` | YES (`'available'` override) | 4-condition AND: event type + paymentType + paymentMethod + paymentStatus | **HIGH — fragile, primary suspect** |
| `update-order-paid` with fOS=9, NOT update-order-paid channel | `handleOrderDataEvent` | YES via `isHoldClear` | **NO — table stays 'occupied'** | `fOrderStatus === 9 && !isPayLaterSettle` | **HIGH — table stays blocked** |
| `update-order-status` with fOS=6 (paid) | `handleUpdateOrderStatus` | YES via `isTerminalStatus` | YES | `order.status === 'paid'` | LOW — if backend sends fOS=6 |
| `update-order-status` with prepaid+paylater+sucess/success, fOS>=5 | `handleUpdateOrderStatus` | YES via defensive `isPayLaterComplete` | YES | paymentType+method+status+fOS>=5 | MEDIUM — defensive, post Bucket-B fix |
| `update-food-status` with fOS=6 (paid) | `handleUpdateFoodStatus` | YES via `isTerminal` | YES | `order.status === 'paid'` (from API fetch) | LOW — requires API fetch to get current state |
| `update-food-status` with PayLater NOT paid | `handleUpdateFoodStatus` | **NO** | **NO** | Only checks `isTerminal`; no PayLater-specific guard | **MEDIUM — PayLater orders not removed via this handler unless fOS=6** |
| No socket event at all | None | **NO** | **NO** | — | **CRITICAL — order stuck until page refresh** |

---

## 7. Root Cause / Likely Cause

**Root cause is a combination of:**

### Primary: Fragile payment_status guard (PARTIALLY FIXED by Bucket B)
The `isPayLaterComplete` check in `handleOrderDataEvent` requires `order.paymentStatus` to exactly equal `'sucess'` OR `'success'` (post Bucket-B). If backend sends any other value (`'paid'`, `'completed'`, `''`, `null`), the condition fails.

**Bucket B already widened this from 1 to 2 accepted values.** But the fundamental fragility remains — we only accept 2 specific strings. If backend sends a third value, it still fails.

### Secondary: Event channel assumption
The `isPayLaterComplete` check REQUIRES `eventName === 'update-order-paid'`. If backend emits the PayLater settle response on `update-order`, `update-order-status`, or `update-food-status` instead, the primary guard does not fire. The defensive guard in `handleUpdateOrderStatus` covers one fallback, but `handleUpdateFoodStatus` has NO PayLater-specific guard at all.

### Tertiary: handlePrepaidSettleSuccess does NOT remove order
`handlePrepaidSettleSuccess` (DashboardPage L1392-1401) only clears the order-entry UI selection (`setOrderEntryTable(null)`). It does NOT call `removeOrder()` or `updateTableStatus('available')`. If the socket chain fails, there is ZERO frontend fallback — the order is stuck until page refresh.

### Relationship to existing bugs
- **BUG-087:** Changed PayLater to use `paid-prepaid-order` endpoint instead of normal serve flow. This is when the PayLater socket path became a separate concern.
- **BUG-049:** Documented that fOS=9 is overloaded (Hold vs PayLater settle). Socket channel (`update-order-paid` vs others) is the discriminator.
- **BUG-042-C:** Introduced the Hold/Park removal via `isHoldClear` with table staying 'occupied'.
- **BUG-060:** Added terminal-status check in `handleUpdateFoodStatus` for room transfer.

### Does this need runtime validation?
**YES** — We cannot confirm without backend logs which exact socket event and payload values are emitted after `paid-prepaid-order` with PayLater `payment_status:'sucess'`. Static code analysis shows multiple failure paths; only runtime logging or backend code inspection can confirm which one is hit.

---

## 8. Recommended Fix Strategy

### Option A — Broaden `isPayLaterComplete` payment_status acceptance (ALREADY DONE — Bucket B)
- **Status:** IMPLEMENTED. Now accepts `'sucess'` OR `'success'`.
- **Benefit:** Protects against backend spelling normalization.
- **Residual risk:** Fails if backend sends `'paid'`, `''`, or `null` as payment_status.
- **Recommendation:** Consider further broadening to accept `'paid'` as well (Option B below).

### Option B — Broaden payment_status acceptance to include `'paid'`
- **Benefit:** Covers the case where backend normalizes PayLater settle to `payment_status:'paid'` (same as regular prepaid). If backend sets fOS=6, `isTerminal` already catches it. But if backend sends fOS=5 or fOS=9 with `payment_status:'paid'`, only this broadening catches it.
- **Risk:** LOW — adding `'paid'` to the OR condition is strictly additive. `'paid'` already means the order IS paid.
- **Affected files:** `socketHandlers.js` (2 locations, same as Bucket B)
- **Frontend-only:** YES

### Option C — Post-`completePrepaidOrder()` safety-net with confirmed check
- **Benefit:** Catches ALL socket failure scenarios — wrong event, wrong payload, no event at all.
- **Risk:** MEDIUM — must confirm the order is truly settled before removing. The API returned 2xx (success), which is strong evidence the backend accepted the settle. After timeout, re-check via `getOrderById` — if order still exists, force-remove + free table.
- **Affected files:** `DashboardPage.jsx` (handleMarkServed + handleSettlePrepaid paths), `OrderCard.jsx`, `TableCard.jsx`
- **Frontend-only:** YES
- **Safety guarantee:** The safety-net ONLY fires when:
  1. `completePrepaidOrder()` API returned 2xx (settle accepted by backend)
  2. Timeout elapsed (3-5 seconds for socket delivery)
  3. Order is STILL in OrderContext (socket handler didn't already handle it)

### Option D — Require backend socket contract alignment
- **Benefit:** Permanent fix — backend guarantees `update-order-paid` with stable payload.
- **Risk:** Requires backend team coordination, longer timeline.
- **Frontend-only:** NO

### Option E — Runtime validation before any further changes
- **Benefit:** Confirms exact root cause before implementing.
- **Risk:** Delays fix.

### Recommended Strategy: B + C (frontend-safe), then D (backend alignment)

1. **Option B first** — Broaden `isPayLaterComplete` to also accept `'paid'` (1 minute change, zero risk).
2. **Option C second** — Add post-settle safety-net with 4-second timeout + `getOrderById` check. This is the belt-and-suspenders approach that handles ALL socket failure scenarios.
3. **Option D later** — Request backend to confirm and stabilize the socket contract for `paid-prepaid-order` PayLater path.

---

## 9. Proposed Implementation Scope

### Change 1 — Broaden payment_status (Option B)
- **File:** `api/socket/socketHandlers.js`
- **Location 1 (L319):** Change `(order.paymentStatus === 'sucess' || order.paymentStatus === 'success')` → `(order.paymentStatus === 'sucess' || order.paymentStatus === 'success' || order.paymentStatus === 'paid')`
- **Location 2 (L492):** Same change
- **Explicit non-changes:** No other files. No behavior change for non-PayLater orders. No payload changes.

### Change 2 — Post-settle safety-net (Option C)
- **File:** `pages/DashboardPage.jsx` — in `handleMarkServed` prepaid path (after `completePrepaidOrder` succeeds) and `handlePrepaidSettleSuccess` callback
- **File:** `components/cards/OrderCard.jsx` — in `handleSettlePrepaid` (after `completePrepaidOrder` succeeds)
- **File:** `components/cards/TableCard.jsx` — in `handleSettlePrepaid` (after `completePrepaidOrder` succeeds)
- **Behavior:** After `completePrepaidOrder()` returns 2xx, start a 4-second timeout. After timeout, check `getOrderById(orderId)`. If order still exists, call `removeOrder(orderId)` + `updateTableStatus(tableId, 'available')` (only if `tableId > 0`). Log clearly: `[PROD-BUG-003 safety-net] Order {orderId} still in context 4s after successful settle — force-removing`.
- **Explicit non-changes:** Safety-net is a no-op if socket handler already removed the order. Non-prepaid orders unaffected. PayLater orders that were NOT settled (no API call) are unaffected. Only fires after confirmed API success.

### Validation
- `yarn build` — must compile cleanly (existing lint warning acceptable)

---

## 10. Owner Questions

| Question ID | Question | Options | Recommendation | Blocks |
|---|---|---|---|---|
| OQ-P3-01 | Should frontend treat `'paid'` as a valid settlement status for PayLater removal (in addition to `'sucess'`/`'success'`)? | A) Yes — accept all three B) No — only 'sucess'/'success' | A — `'paid'` means paid; safe to accept | No |
| OQ-P3-02 | Is a 4-second safety-net removal acceptable after successful `completePrepaidOrder()` if the order is still in context? | A) Yes B) No — wait for socket only C) Yes with re-fetch verification | A — API 2xx is strong confirmation; 4s is generous for socket delivery | No — can proceed with safe default |
| OQ-P3-03 | Should PayLater prepaid served orders always clear the table after successful settlement API response? | A) Yes B) Only if socket confirms | A — API success = backend accepted the settle | No |
| OQ-P3-04 | Should unpaid PayLater/credit/hold orders remain on dashboard until explicit payment/settlement? | A) Yes — only clear after settlement B) No | A — unpaid orders must stay visible | No — safety-net is gated on API success |

---

## 11. Backend/API Questions

| Question ID | Backend/API Question | Required Evidence | Blocks |
|---|---|---|---|
| BQ-P3-01 | What exact socket event does backend emit after `POST paid-prepaid-order` with `payment_status:'sucess'` (PayLater)? | Log socket emission on backend | YES for proper fix; NO for safety-net |
| BQ-P3-02 | What `payment_status` value appears in the socket payload? Exactly `'sucess'`, `'success'`, `'paid'`, or other? | Socket payload inspection | YES for proper fix; NO for safety-net |
| BQ-P3-03 | Is `update-order-paid` guaranteed after PayLater prepaid settlement? | Backend event mapping docs or logs | YES for proper fix; NO for safety-net |
| BQ-P3-04 | Can backend normalize the `payment_status` spelling to a stable value for PayLater settlements? | Backend code change feasibility | No — frontend can accept multiple values |
| BQ-P3-05 | Does backend emit a table availability update (e.g., `update-table` event) after settlement? | Backend socket mapping | No — frontend derives table status from order socket (OQ-02 baseline) |
| BQ-P3-06 | Is `paid-prepaid-order` idempotent for the same order_id? | Test: call twice, check DB | No — but useful for auto-settle safety |

---

## 12. Runtime QA Matrix

| # | Test Case | Order Type | Action | Expected Result |
|---|---|---|---|---|
| T1 | Prepaid PayLater order → Serve → socket responds with `payment_status:'sucess'` | Dine-in PayLater | Click Serve | Order removed, table available |
| T2 | Prepaid PayLater order → Serve → socket responds with `payment_status:'success'` | Dine-in PayLater | Click Serve | Order removed, table available (Bucket B) |
| T3 | Prepaid PayLater order → Serve → socket responds with `payment_status:'paid'` | Dine-in PayLater | Click Serve | Order removed, table available (Option B) |
| T4 | Prepaid PayLater order → Settle (from card) → socket delayed >4s | Dine-in PayLater | Click Settle | Safety-net removes order + frees table after 4s |
| T5 | Prepaid PayLater order → Settle → NO socket event | TakeAway PayLater | Click Settle | Safety-net removes order after 4s (no table to free for TA) |
| T6 | Unpaid PayLater order at fOS=1 or fOS=2 | Dine-in PayLater | No settle action | Order stays on dashboard — NOT auto-removed |
| T7 | Regular prepaid (non-PayLater) → Settle | Dine-in prepaid cash | Click Settle | Order removed, table available (existing flow, unchanged) |
| T8 | Non-prepaid order at fOS=5 → Bill | Dine-in postpaid | Click Bill | Bill prints, order stays until Collect Bill (existing flow, unchanged) |
| T9 | PayLater settle → socket fires within 1s | Delivery PayLater | Click Settle | Socket handler removes order; safety-net is no-op (order already gone) |
| T10 | PayLater order with tableId=0 (walk-in/TA/delivery) | Walk-in PayLater | Click Settle | Order removed from context; syncTableStatus skipped (tableId=0 guard); no stale card |

---

## 13. Final Status

**`prod_bug_003_ready_for_hotfix_planning`**

- Root cause confirmed via static code analysis: fragile 4-condition PayLater removal guard in socket handlers + zero fallback when socket chain fails.
- Bucket B (already shipped) partially addresses by accepting `'success'` in addition to `'sucess'`.
- Recommended next: Option B (broaden to also accept `'paid'`) + Option C (post-settle safety-net with 4s timeout + getOrderById confirmation). Both are frontend-safe, zero regression risk.
- Owner questions have safe recommended defaults; none block implementation.
- Backend questions are important for long-term stability but do NOT block the frontend-safe fix.
