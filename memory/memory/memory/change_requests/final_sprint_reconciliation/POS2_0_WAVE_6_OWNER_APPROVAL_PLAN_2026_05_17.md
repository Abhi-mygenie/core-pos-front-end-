# POS2.0 Wave 6 — Owner Approval Plan — 2026-05-17

## 1. Purpose

This document is created **before implementation** and requires **owner approval before any code changes** are made.

---

## 2. Repo / Commit

| Item | Value |
|---|---|
| Repo URL | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `17-may` |
| Commit hash | `9126c46e7724d803ae3bc0f4d740e0bfdd60f591` |
| Working tree status | Clean |

---

## 3. Inputs Read

| Doc | Path |
|---|---|
| Master Implementation Plan | `POS2_0_MASTER_IMPLEMENTATION_PLAN_2026_05_17.md` |
| Master Plan Audit & Correction | `POS2_0_MASTER_PLAN_AUDIT_AND_CORRECTION_2026_05_17.md` |
| Phase 1 Clean Safe Plan | `POS2_0_CLEAN_SAFE_BUG_IMPLEMENTATION_PLAN_2026_05_17.md` |
| Phase 3 Backend Source of Truth Plan | `POS2_0_BACKEND_SOURCE_OF_TRUTH_BUG_PLANNING_2026_05_17.md` |
| Phase 3 Backend Owner Question Capture | `POS2_0_PHASE_3_BACKEND_OWNER_QUESTION_CAPTURE_2026_05_17.md` |
| Phase 3 Open Question Addendum | `POS2_0_PHASE_3_OPEN_QUESTION_COMPLETION_ADDENDUM_2026_05_17.md` |
| Phase 2 Owner Decision Capture | `POS2_0_PHASE_2_OWNER_DECISION_CAPTURE_2026_05_17.md` |
| Owner Decision Bug Planning | `POS2_0_OWNER_DECISION_BUG_PLANNING_2026_05_17.md` |
| Remaining Blocked Bug Planning | `POS2_0_REMAINING_BLOCKED_BUG_PLANNING_2026_05_17.md` |
| Bug Impact Analysis | `/app/memory/bugs/POS2_0_BUG_IMPACT_ANALYSIS.md` (BUG-068 §, BUG-082 §) |
| Business Rules Baseline | `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` |
| Implementation Agent Rules | `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` |
| Wave 4 Closure Report | `POS2_0_WAVE_4_CLOSURE_REPORT_2026_05_17.md` |
| Wave 5 Closure Report | `POS2_0_WAVE_5_CLOSURE_REPORT_2026_05_17.md` |

---

## 4. Bugs Proposed For Implementation

| Bug | Plain English Issue | Proposed Fix | Files To Modify | Risk | Approval Status |
|---|---|---|---|---|---|
| BUG-068 | Socket reconnect does not re-fetch missed orders; Scan & Order popup lost until page refresh | On RECONNECTING→CONNECTED transition, call `getRunningOrders` + dedupe-merge into OrderContext; add debounce for micro-blips | `socketService.js`, `useSocketEvents.js`, `OrderContext.jsx` | MEDIUM | `pending_owner_approval` |
| BUG-082 | `scan-new-order` index 4 treated as full payload object, but backend now sends primitive `'web'` string; channel-based fallback should be retired | Read index 4 as primitive string for scan-new-order only; set orderFrom from it; retire L508-511 fallback | `socketHandlers.js`, `socketEvents.js` | MEDIUM | `pending_owner_approval` |

---

## 5. Per-Bug Approval Details

### BUG-068 — Socket Reconnect Rehydration

#### What is wrong in plain English
When the socket disconnects (WiFi drop, server blip) and then reconnects, any Scan & Order events that arrived during the disconnection are lost. The YTC popup doesn't appear. The cashier has to manually refresh the page to see missed web orders.

#### What I will change

1. **`socketService.js` — `_setStatus` method (L286-300):** Extend the status-change notification to pass `oldStatus` to listeners.
   - Current: `listener(newStatus, this.reconnectAttempts)`
   - Proposed: `listener(newStatus, this.reconnectAttempts, oldStatus)`
   - This allows external code to detect specifically RECONNECTING → CONNECTED transitions.

2. **`useSocketEvents.js` — New reconnect rehydration logic:** Add a `socketService.onStatusChange` listener that:
   - Detects `oldStatus === 'reconnecting' && newStatus === 'connected'`
   - Applies a debounce/minimum-disconnect-duration (1500ms) to avoid refetch on micro-blips
   - Calls `orderService.getRunningOrders()` (same endpoint used at boot)
   - Passes the result to `OrderContext.mergeRunningOrders()`

3. **`OrderContext.jsx` — New `mergeRunningOrders` helper:** Add a function that:
   - Maps fetched orders by `orderId`
   - Updates existing orders in-place (no duplicates)
   - Adds new orders not currently in context
   - **Explicitly skips** engage-lock mutations
   - Removes orders no longer in the running list (backend removed during disconnect)

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/api/socket/socketService.js` | `_setStatus` emits `oldStatus` as 3rd arg to listeners | Allows useSocketEvents to detect reconnect transitions |
| `frontend/src/api/socket/useSocketEvents.js` | New reconnect-rehydration useEffect with debounce + getRunningOrders + mergeRunningOrders | Owns the rehydration trigger logic |
| `frontend/src/contexts/OrderContext.jsx` | New `mergeRunningOrders(orders)` helper, exposed via context | Centralizes dedupe-merge semantics |

#### Code area / function / component
- `socketService._setStatus` (L286-300)
- `useSocketEvents` hook body (new useEffect)
- `OrderProvider` component (new `mergeRunningOrders` callback + add to context value)

#### What I will NOT touch
- `socketHandlers.js` — event handlers stay unchanged
- `orderService.js` — `getRunningOrders` reused as-is (no change)
- `ScanOrderPopOut.jsx` — popup predicate re-evaluates automatically once OrderContext updates
- `useOrderPollingReconciliation.js` — POLL-001 / POLL-004 unchanged
- Engage locks are NOT cleared/re-set during reconnect merge

#### Business rule protected
- **POLL-001** (60s silent poll) — unchanged
- **POLL-004** (open-order skip) — unchanged
- **BOOT-001** (profile loads first) — `getRunningOrders` is additive; boot sequence untouched
- **DASH-001** (Hold orders on Hold tab only) — status-8/9 orders excluded from merge (same filter as boot)

#### Risk
**MEDIUM** — Socket subsystem; dedupe must be airtight to avoid duplicate orders. Debounce prevents flooding on flapping connections. The `mergeRunningOrders` helper is the critical new piece.

Mitigations:
- Dedupe by `orderId` (existing `addOrder` already has this, but `mergeRunningOrders` will do a full set-replace for safety)
- Debounce prevents refetch on micro-blips (< 1500ms)
- Engage locks explicitly preserved (not cleared by merge)
- Status-8/9 orders filtered out (same as boot)

#### QA check after implementation
1. Disconnect socket → simulate `scan-new-order` arrival → reconnect → popup appears without page refresh
2. Disconnect for < 1.5s (micro-blip) → no refetch (or single refetch, no duplicates)
3. Order already in context gets updated from refetch → no duplicate row
4. Engage lock state preserved across reconnect
5. Hold (status-8) orders NOT surfaced on running dashboard after reconnect
6. POLL-001 still runs every 60s after reconnect
7. BOOT-001 first-login sequence unchanged

#### Approval needed

Owner approval required before implementation.

Options:
- A. Approve this bug for code-diff preview
- B. Do not implement this bug
- C. Modify the approach
- D. Need clarification first

---

### BUG-082 — scan-new-order Index 4 = Primitive 'web'

#### What is wrong in plain English
The `scan-new-order` socket event now sends a primitive string `'web'` at message index 4, not a full payload object. The current code at `parseMessage` reads index 4 as a full payload object. Additionally, there's a channel-based fallback at `socketHandlers.js:508-511` that sets `orderFrom='web'` when the backend omits it — this fallback should be retired because:
- `scan-new-order` channel itself confirms web origin (index 4 = `'web'`)
- `order_from` is reliable in other socket events (`new-order`, `update-order`)

#### What I will change

1. **`socketHandlers.js` — `handleScanNewOrder` (L470-518):**
   - Read `message[MSG_INDEX.PAYLOAD]` as the primitive `orderFrom` value (e.g., `'web'`), NOT as a full payload object
   - `handleScanNewOrder` already calls `fetchOrderWithRetry(orderId)` to get the order data via API, so the missing payload at index 4 is not a problem
   - After the fetch, set `order.orderFrom` from the index-4 primitive value, and `order.isWebOrder = (orderFrom === 'web')`
   - **RETIRE** (remove) the channel-based fallback at L508-511 entirely — confirmed by owner (Q-082-4: "Retire")
   - Preserve the status-8/9 Hold guard (L483-496) unchanged

2. **`socketEvents.js` — `MSG_INDEX` comment (L148-154):**
   - Add a clarifying comment that for `scan-new-order`, index 4 is a primitive string (`'web'`), not a full payload.
   - `new-order` and other events: index 4 remains the full payload object (unchanged).

#### Files I expect to modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/api/socket/socketHandlers.js` | `handleScanNewOrder` — read index 4 as primitive string, set orderFrom, retire fallback | Handler for scan-new-order event |
| `frontend/src/api/socket/socketEvents.js` | Comment on `MSG_INDEX.PAYLOAD` clarifying the scan-new-order exception | Central event constant definitions |

#### Code area / function / component
- `handleScanNewOrder` function (L470-518 of socketHandlers.js)
- `MSG_INDEX` constant comment (L148-154 of socketEvents.js)

#### What I will NOT touch
- `handleNewOrder` — `new-order` still uses full payload at index 4 (no change)
- `parseMessage` — kept as-is; `handleScanNewOrder` will read index 4 directly instead of using `parsed.payload`
- `ScanOrderPopOut.jsx` — predicate unchanged: `orderFrom === 'web' && fOrderStatus === 7`
- All other socket handlers — only `scan-new-order` has the new message structure

#### Business rule protected
- **SCAN-001** (Web/scan YTC popup queue) — preserved; popup predicate unchanged
- **Frozen SCAN-003 (pending freeze)** — aligning code with the confirmed message structure
- **DASH-001** (Hold orders) — status-8/9 guard preserved

#### Risk
**MEDIUM** — Changing the scan-new-order parser. If the backend hasn't actually changed the message structure, this would break web order detection.

Mitigations:
- Owner confirmed (Q-082-O1, Option A) that the pending freeze wording is correct and backend HAS changed the structure
- Owner recommends runtime revalidation at QA time
- The API fetch (`fetchOrderWithRetry`) still gets the full order data — only the `orderFrom` source changes
- If `order_from` is also available in the API response, it will be set by the transform; the index-4 primitive is a safe override on top

#### QA check after implementation
1. Web order placed via Scan & Order → `scan-new-order` fires → popup appears with correct order data
2. POS orders via `new-order` → full payload at index 4 still works → no regression
3. Web order → `order.orderFrom === 'web'` → popup predicate fires correctly
4. POS order → `order.orderFrom !== 'web'` → no popup
5. No dead fallback code at L508-511 remaining
6. Table engage and order state sync correctly after scan-new-order
7. **Runtime revalidation:** Capture a live `scan-new-order` socket message and verify index 4 is actually `'web'`

#### Approval needed

Owner approval required before implementation.

Options:
- A. Approve this bug for code-diff preview
- B. Do not implement this bug
- C. Modify the approach
- D. Need clarification first

---

## 6. Recommended Implementation Order

1. **BUG-082** first — simpler change (message parser + fallback retirement); independent of BUG-068
2. **BUG-068** second — more complex (new reconnect rehydration logic); independent of BUG-082

Both bugs are independent (socket subsystem isolated from each other). Order is chosen for simplicity → complexity progression.

---

## 7. Approval Summary

| Bug | Approval Needed | Owner Decision |
|---|---|---|
| BUG-068 | Yes — reconnect rehydration approach + debounce design + mergeRunningOrders semantics | `pending` |
| BUG-082 | Yes — index 4 primitive read + fallback retirement | `pending` |

---

## 8. Final Status

`owner_approval_plan_created_pending_approval`

---

*— End of POS2.0 Wave 6 Owner Approval Plan — 2026-05-17 —*
