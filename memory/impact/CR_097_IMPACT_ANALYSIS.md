# CR-097 — Impact Analysis (Gate 2) — 2026-07-23

**Item:** CR-097 — Auto-Settle Throttle/Stagger Concurrent Settle Calls on Dashboard Load
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE (no throttle/stagger logic exists)
**Conflict Pre-Check:** NO CONFLICT — auto-settle useEffect (L1424-1458) is isolated from all active items
**Risk:** CRITICAL (settlement + hotspot file + duplicate financial entry risk)

---

## 1. Current Code — Exact Behavior

**File:** `pages/DashboardPage.jsx` L1424-1458

```javascript
const autoSettleInFlight = useRef(new Set());       // L1423
useEffect(() => {                                     // L1424
  let autoSettleOn = false;
  try { autoSettleOn = localStorage.getItem('mygenie_auto_settle_enabled') === 'true'; } catch (_) {}
  if (!autoSettleOn) return;

  const candidates = orders.filter((o) =>              // L1431
    o.fOrderStatus === 5 &&
    o.paymentType === 'prepaid' &&
    o.paymentMethod?.toLowerCase() !== 'paylater' &&
    !autoSettleInFlight.current.has(o.orderId)
  );

  candidates.forEach((o) => {                          // L1439 — THE PROBLEM
    autoSettleInFlight.current.add(o.orderId);
    completePrepaidOrder(o.orderId, o.serviceTax||0, o.tipAmount||0, false)
      .then(() => handlePrepaidSettleSuccess(o.orderId))
      .catch((err) => console.error('[AutoSettle] Failed:', o.orderId, err?.message))
      .finally(() => {
        setTimeout(() => autoSettleInFlight.current.delete(o.orderId), 10000);
      });
  });
}, [orders, handlePrepaidSettleSuccess]);              // L1459
```

**Problem:** `.forEach()` at L1439 fires ALL N `completePrepaidOrder()` calls in the same JS tick. No `await`, no delay, no batching.

---

## 2. Data Flow Trace (Burst Scenario)

```
TRIGGER: User re-logs in with Auto Settle ON
         → LoadingPage fetches running orders → OrderContext.setOrders(N orders)
         → DashboardPage mounts → useEffect fires (dependency: [orders])

TICK 0:  useEffect evaluates
         → candidates = orders.filter(...) → finds N eligible orders
         → .forEach() fires N completePrepaidOrder() calls SIMULTANEOUSLY
         → N concurrent POST /api/v2/vendoremployee/order/paid-prepaid-order

TICK 0+RTT: Backend processes N requests (potentially simultaneously)
            → Emits N socket events on 'update-order-paid' channel

TICK 0+RTT+latency: N socket events arrive at frontend
         → handleOrderDataEvent fires N times
         → isTerminal (status='paid') → true for each
         → removeOrder(orderId) × N → setOrdersState × N
         → syncTableStatus('available') × N

TICK 0+RTT+latency+render: React batches state updates (React 19)
         → 1-2 re-renders (React 19 auto-batching helps here)
         → useEffect re-triggers on [orders] change
         → candidates.filter() finds 0 new (in-flight Set blocks re-fires)
         → No additional API calls (CORRECT — guard works)
```

---

## 3. Identified Risks

| # | Risk | Severity | Detail |
|---|---|---|---|
| R1 | **Backend burst overload** | CRITICAL | N simultaneous POST calls to `paid-prepaid-order`. If N=20 (plausible in high-volume QSR end-of-shift), backend receives 20 concurrent financial mutation requests. |
| R2 | **Rate limiting / 429 errors** | HIGH | Backend may reject burst; `.catch()` only logs. Failed orders retry after 10s cooldown indefinitely. No max retry limit → infinite retry loop for rate-limited orders. |
| R3 | **Duplicate financial entries** | CRITICAL | Backend idempotency for `paid-prepaid-order` was NEVER confirmed (BQ-001 from PROD-001 still open). If backend processes duplicates, financial records could double-count. |
| R4 | **Socket event flood** | MEDIUM | N simultaneous settles → N socket events → N `removeOrder` calls. React 19 auto-batching mitigates but doesn't eliminate render churn. |
| R5 | **No max retry limit** | HIGH | In-flight Set clears after 10s. If order is still in `orders` (socket failed), useEffect re-fires and retries. No counter → infinite retry for permanently stuck orders. |
| R6 | **No useEffect cleanup** | LOW | No cleanup function returned from useEffect. If component unmounts during burst, `.then()` callbacks fire on unmounted component. React 19 is tolerant but it's sloppy. |
| R7 | **Error swallowing** | MEDIUM | `.catch()` only `console.error`s. No toast, no user feedback. If 15/20 settle calls fail, user sees 5 orders vanish and 15 stay — with no explanation. |

---

## 4. Approach Analysis

### Option A — Sequential with Staggered setTimeout

```
candidates.forEach((o, idx) => {
  setTimeout(() => {
    // guard: check if order still exists (socket may have removed it)
    if (!getOrderById(o.orderId)) return;
    autoSettleInFlight.current.add(o.orderId);
    completePrepaidOrder(...)...
  }, idx * DELAY_MS);
});
// + useEffect cleanup: clearTimeout for all pending timers
```

| Aspect | Rating |
|---|---|
| Burst mitigation | ✅ Full — 1 call per DELAY_MS interval |
| Complexity | LOW — minimal change to existing forEach |
| Cleanup on unmount | ✅ Easy — clear timeouts in useEffect return |
| Handles new orders mid-processing | ⚠️ PARTIAL — new orders from socket trigger new useEffect run, which starts new staggered chain. In-flight Set prevents duplicates but timing overlaps. |
| Pre-call guard | ✅ Can check `getOrderById()` before firing (order may have been removed by socket during wait) |
| Max retry limit | ❌ Not inherent — needs separate counter |

**Verdict: GOOD for small N (≤10). Timing overlaps possible for large N with frequent socket updates.**

---

### Option B — Ref-Based Sequential Queue (Single Processor)

```
const autoSettleQueue = useRef([]);
const isProcessing = useRef(false);

useEffect(() => {
  if (!autoSettleOn) return;
  // Enqueue new candidates (dedup against queue + in-flight)
  candidates.forEach(o => {
    if (!autoSettleQueue.current.some(q => q.orderId === o.orderId) &&
        !autoSettleInFlight.current.has(o.orderId)) {
      autoSettleQueue.current.push(o);
    }
  });
  processQueue(); // non-blocking, returns immediately if already running
}, [orders]);

const processQueue = useCallback(async () => {
  if (isProcessing.current) return; // single processor guarantee
  isProcessing.current = true;
  while (autoSettleQueue.current.length > 0) {
    const o = autoSettleQueue.current.shift();
    if (!getOrderById(o.orderId)) continue; // already settled via socket
    autoSettleInFlight.current.add(o.orderId);
    try {
      await completePrepaidOrder(...);
      handlePrepaidSettleSuccess(o.orderId);
    } catch (err) {
      // track failure count per order
    }
    await new Promise(r => setTimeout(r, DELAY_MS)); // breathe between calls
  }
  isProcessing.current = false;
}, []);

// Cleanup: on unmount, clear queue + set isProcessing false
useEffect(() => () => { autoSettleQueue.current = []; isProcessing.current = false; }, []);
```

| Aspect | Rating |
|---|---|
| Burst mitigation | ✅ Full — strictly 1 call at a time, DELAY_MS between each |
| Complexity | MEDIUM — queue + processor + cleanup |
| Cleanup on unmount | ✅ Clear queue + flag |
| Handles new orders mid-processing | ✅ FULL — useEffect enqueues new arrivals, processor picks them up naturally |
| Pre-call guard | ✅ `getOrderById()` check before each call |
| Max retry limit | ✅ Easy to add per-order failure counter in queue objects |
| Single processor guarantee | ✅ `isProcessing` ref prevents parallel processing |
| Handles re-renders gracefully | ✅ useEffect re-triggers add to queue (dedup'd), processor continues uninterrupted |

**Verdict: SAFEST. Handles all edge cases. Slightly more code but zero timing overlap.**

---

### Option C — Batched (Promise.allSettled in groups)

```
const BATCH_SIZE = 3;
for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
  const batch = candidates.slice(i, i + BATCH_SIZE);
  await Promise.allSettled(batch.map(o => settle(o)));
  await sleep(DELAY_MS);
}
```

| Aspect | Rating |
|---|---|
| Burst mitigation | ⚠️ PARTIAL — still sends BATCH_SIZE concurrent calls |
| Complexity | LOW-MEDIUM |
| Backend load | 3 concurrent instead of N — better but not zero burst |
| Max retry limit | ❌ Not inherent |

**Verdict: COMPROMISE — faster than sequential but still sends mini-bursts. Less safe than Option B.**

---

## 5. Recommendation: Option B — Ref-Based Sequential Queue

**Rationale:**
1. **Zero burst** — strictly 1 API call at a time with configurable delay
2. **Graceful under re-renders** — useEffect re-triggers just enqueue; processor is singleton
3. **Pre-call staleness check** — `getOrderById()` skips orders already removed by socket
4. **Max retry limit** — easy to add per-order failure count
5. **Cleanup on unmount** — clear queue in useEffect return
6. **Matches codebase patterns** — `useRef` + `useCallback` used extensively in DashboardPage already

**Suggested configuration:**
- `DELAY_MS = 800` — safe interval for backend (configurable)
- `MAX_RETRIES = 2` — per order, after which it's skipped (user can manually settle)
- `QUEUE_LOG = true` — console log queue depth for debugging

---

## 6. Files WILL Change

| # | File | Change | Risk |
|---|---|---|---|
| 1 | `pages/DashboardPage.jsx` L1418-1458 | Replace `.forEach()` burst with ref-based sequential queue | HIGH (hotspot, R5) |

## 7. Files Will NOT Touch

| File | Reason |
|---|---|
| `StatusConfigPage.jsx` | Toggle UI unchanged |
| `OrderCard.jsx` | Button hide logic unchanged |
| `TableCard.jsx` | Button hide logic unchanged |
| `autoSettlePrefs.js` | Prefs utility unchanged |
| `orderService.js` | `completePrepaidOrder()` API unchanged |
| `socketHandlers.js` | Socket removal logic unchanged |
| `OrderContext.jsx` | `removeOrder` unchanged |

**Scope: 1 file, ~40-50 lines replaced/rewritten (the useEffect block + new queue processor)**

---

## 8. Downstream Consumers

| Consumer | Impact |
|---|---|
| `completePrepaidOrder()` (orderService.js) | Called same way, just less frequently. No change needed. |
| `handlePrepaidSettleSuccess()` (DashboardPage.jsx) | Called same way per order. No change needed. |
| Socket handlers (socketHandlers.js) | Receive settle events sequentially instead of burst. Actually BETTER — fewer concurrent socket events. |
| OrderContext.removeOrder() | Called sequentially. Fewer concurrent `setOrdersState` updates. BETTER for React batching. |
| Manual Settle button (OrderCard/TableCard) | Unaffected — button already hidden when auto-settle ON. Manual path doesn't use the queue. |

---

## 9. Owner Decisions Needed

| # | Question | Options | Owner Decision | Date |
|---|---|---|---|---|
| OQ-01 | Delay between auto-settle calls? | A) 500ms B) 800ms C) 1000ms | **B) 800ms** | 2026-07-23 |
| OQ-02 | Max retry limit per order? | A) 1 B) 2 C) 3 D) Unlimited | **B) 2 retries** | 2026-07-23 |
| OQ-03 | User feedback on failures? | A) Silent (current) B) Toast notification C) Console only | **A) Silent** (default — owner did not override) | 2026-07-23 |
| OQ-04 | Approve approach? | A) Option B (Sequential Queue) B) Option A (Staggered setTimeout) C) Option C (Batched) | **A) Option B — Sequential Queue** | 2026-07-23 |

**All decisions resolved. No blockers remain. Ready for Gate 3.**

---

## 10. Verification Matrix (seeds QA)

| # | What to Verify | How | Automated? |
|---|---|---|---|
| V1 | Single order auto-settles correctly | Enable toggle, 1 prepaid order at fOS=5, observe settle | NO (browser) |
| V2 | Multiple orders settle sequentially (not burst) | Enable toggle, 5+ prepaid orders, observe Network tab — calls spaced ~800ms apart | NO (browser) |
| V3 | Queue handles new order arriving mid-processing | While queue processes, push new prepaid order via socket → should enqueue and settle after current | NO (browser) |
| V4 | Max retry respects limit | Mock API failure → order should be attempted MAX_RETRIES times then skipped | YES (unit test) |
| V5 | Pre-call staleness check | Start queue with 5 orders → socket-remove order #3 before its turn → queue skips it | NO (browser) |
| V6 | Cleanup on unmount | Navigate away from dashboard during processing → no console errors | NO (browser) |
| V7 | PayLater exclusion preserved | PayLater orders at fOS=5 → NOT in queue, Settle button visible | YES (unit test) |
| V8 | Toggle OFF → no queue processing | Toggle OFF, prepaid orders at fOS=5 → no API calls | YES (unit test) |
| V9 | In-flight Set still prevents useEffect re-trigger duplicates | Verify order in queue is not re-enqueued on [orders] change | YES (code review) |

---

## 11. Status

```
Planning complete: CR-097
Stage: Impact Analysis (Gate 2) — OWNER APPROVED
Code reality: NONE
Risk: CRITICAL
Approved approach: Option B — Ref-Based Sequential Queue (800ms delay, max 2 retries)
Files WILL change: DashboardPage.jsx (L1418-1458)
Files WILL NOT touch: StatusConfigPage, OrderCard, TableCard, autoSettlePrefs, orderService, socketHandlers, OrderContext
Owner decisions: ALL RESOLVED (OQ-01→04 answered 2026-07-23)
Docs: /app/memory/impact/CR_097_IMPACT_ANALYSIS.md
Next: Gate 3 (Implementation Plan) → Gate 4 GO
```
