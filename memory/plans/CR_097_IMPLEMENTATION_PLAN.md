# CR-097 — Implementation Plan (Gate 3) — 2026-07-23

**Item:** CR-097 — Auto-Settle Throttle/Stagger Concurrent Settle Calls on Dashboard Load
**Stage:** Gate 3 — Implementation Plan
**Approach:** Option B — Ref-Based Sequential Queue (OWNER APPROVED 2026-07-23)
**Config:** 800ms delay, max 2 retries, silent failure handling
**Impact Analysis:** `/app/memory/impact/CR_097_IMPACT_ANALYSIS.md` (Gate 2 COMPLETE)

---

## 1. Scope Lock

### Files WILL Change
| # | File | Lines | Change |
|---|---|---|---|
| 1 | `pages/DashboardPage.jsx` | L1418-1459 | Replace `.forEach()` burst with ref-based sequential queue |

### Files Will NOT Touch
| File | Reason |
|---|---|
| `StatusConfigPage.jsx` | Toggle UI unchanged |
| `OrderCard.jsx` | Button hide logic unchanged |
| `TableCard.jsx` | Button hide logic unchanged |
| `autoSettlePrefs.js` | Prefs utility unchanged |
| `orderService.js` | `completePrepaidOrder()` API unchanged |
| `socketHandlers.js` | Socket removal logic unchanged |
| `OrderContext.jsx` | `removeOrder`/`getOrderById` unchanged |

---

## 2. Execution Sequence

### Edit 1: Replace auto-settle block (DashboardPage.jsx L1418-1459)

**CURRENT CODE (L1418-1459) — REMOVE ENTIRELY:**
```javascript
  // PROD-BUG-001 (2026-05-20): Auto Settle — when enabled, automatically
  // settle prepaid (non-PayLater) orders at fOrderStatus=5 without requiring
  // a manual Settle click. Uses the same completePrepaidOrder() API as the
  // manual Settle button. In-flight Set prevents duplicate calls across
  // re-renders. PayLater orders are explicitly excluded.
  const autoSettleInFlight = useRef(new Set());
  useEffect(() => {
    let autoSettleOn = false;
    try {
      autoSettleOn = localStorage.getItem('mygenie_auto_settle_enabled') === 'true';
    } catch (_) {}
    if (!autoSettleOn) return;

    const candidates = orders.filter(
      (o) =>
        o.fOrderStatus === 5 &&
        o.paymentType === 'prepaid' &&
        o.paymentMethod?.toLowerCase() !== 'paylater' &&
        !autoSettleInFlight.current.has(o.orderId)
    );

    candidates.forEach((o) => {
      autoSettleInFlight.current.add(o.orderId);
      console.log('[AutoSettle] Settling prepaid order:', o.orderId);
      completePrepaidOrder(
        o.orderId,
        o.serviceTax || 0,
        o.tipAmount || 0,
        false // not PayLater
      )
        .then(() => {
          handlePrepaidSettleSuccess(o.orderId);
        })
        .catch((err) => {
          console.error('[AutoSettle] Failed for order:', o.orderId, err?.message);
        })
        .finally(() => {
          // Remove from in-flight after 10s to allow retry if socket didn't clear
          setTimeout(() => autoSettleInFlight.current.delete(o.orderId), 10000);
        });
    });
  }, [orders, handlePrepaidSettleSuccess]);
```

**NEW CODE — REPLACE WITH:**
```javascript
  // CR-097 (2026-07-23): Auto Settle — Sequential Queue.
  // Replaces PROD-BUG-001 burst .forEach() with a ref-based single-processor
  // queue. Settles one order at a time with DELAY_MS between calls.
  // Config: 800ms delay, max 2 retries per order, PayLater excluded.
  const AUTO_SETTLE_DELAY_MS = 800;
  const AUTO_SETTLE_MAX_RETRIES = 2;
  const autoSettleQueue = useRef([]);         // [{orderId, serviceTax, tipAmount, retries}]
  const autoSettleProcessing = useRef(false);
  const autoSettleKnown = useRef(new Set());  // orderIds already queued or settled — prevents re-enqueue

  const processAutoSettleQueue = useCallback(async () => {
    if (autoSettleProcessing.current) return; // single processor guarantee
    autoSettleProcessing.current = true;

    while (autoSettleQueue.current.length > 0) {
      const item = autoSettleQueue.current[0]; // peek (don't shift yet — keep for retry accounting)

      // Pre-call staleness check: order may have been removed by socket during wait
      if (!getOrderById(item.orderId)) {
        autoSettleQueue.current.shift();
        console.log('[AutoSettle] Skipped (already removed):', item.orderId);
        continue;
      }

      try {
        console.log(`[AutoSettle] Settling order ${item.orderId} (attempt ${item.retries + 1}/${AUTO_SETTLE_MAX_RETRIES})`);
        await completePrepaidOrder(item.orderId, item.serviceTax, item.tipAmount, false);
        handlePrepaidSettleSuccess(item.orderId);
        autoSettleQueue.current.shift(); // success — remove from queue
        console.log('[AutoSettle] Settled:', item.orderId);
      } catch (err) {
        item.retries += 1;
        if (item.retries >= AUTO_SETTLE_MAX_RETRIES) {
          autoSettleQueue.current.shift(); // max retries — give up
          console.error(`[AutoSettle] Gave up on order ${item.orderId} after ${AUTO_SETTLE_MAX_RETRIES} attempts:`, err?.message);
        } else {
          console.warn(`[AutoSettle] Retry queued for order ${item.orderId} (attempt ${item.retries}/${AUTO_SETTLE_MAX_RETRIES}):`, err?.message);
        }
      }

      // Breathe between calls — prevents backend burst
      if (autoSettleQueue.current.length > 0) {
        await new Promise(r => setTimeout(r, AUTO_SETTLE_DELAY_MS));
      }
    }

    autoSettleProcessing.current = false;
  }, [getOrderById, handlePrepaidSettleSuccess]);

  // Enqueue effect: watches orders array, enqueues new auto-settle candidates
  useEffect(() => {
    let autoSettleOn = false;
    try {
      autoSettleOn = localStorage.getItem('mygenie_auto_settle_enabled') === 'true';
    } catch (_) {}
    if (!autoSettleOn) return;

    const candidates = orders.filter(
      (o) =>
        o.fOrderStatus === 5 &&
        o.paymentType === 'prepaid' &&
        o.paymentMethod?.toLowerCase() !== 'paylater' &&
        !autoSettleKnown.current.has(o.orderId)
    );

    if (candidates.length === 0) return;

    candidates.forEach((o) => {
      autoSettleKnown.current.add(o.orderId);
      autoSettleQueue.current.push({
        orderId: o.orderId,
        serviceTax: o.serviceTax || 0,
        tipAmount: o.tipAmount || 0,
        retries: 0,
      });
    });

    console.log(`[AutoSettle] Enqueued ${candidates.length} orders. Queue depth: ${autoSettleQueue.current.length}`);
    processAutoSettleQueue(); // kicks off processing (no-op if already running)
  }, [orders, processAutoSettleQueue]);

  // Cleanup: clear queue on unmount to prevent stale callbacks
  useEffect(() => {
    return () => {
      autoSettleQueue.current = [];
      autoSettleProcessing.current = false;
    };
  }, []);
```

### Verification After Edit 1
- `yarn start` compiles with 0 new errors
- Auto-settle block at approximately L1418-1500 (expanded by ~30 lines)
- No other code in the file changed

---

## 3. Exact search_replace Specification

**old_str** — match exactly from L1418 to L1459 (including the blank line after):
```
  // PROD-BUG-001 (2026-05-20): Auto Settle — when enabled, automatically
  // settle prepaid (non-PayLater) orders at fOrderStatus=5 without requiring
  // a manual Settle click. Uses the same completePrepaidOrder() API as the
  // manual Settle button. In-flight Set prevents duplicate calls across
  // re-renders. PayLater orders are explicitly excluded.
  const autoSettleInFlight = useRef(new Set());
  useEffect(() => {
    let autoSettleOn = false;
    try {
      autoSettleOn = localStorage.getItem('mygenie_auto_settle_enabled') === 'true';
    } catch (_) {}
    if (!autoSettleOn) return;

    const candidates = orders.filter(
      (o) =>
        o.fOrderStatus === 5 &&
        o.paymentType === 'prepaid' &&
        o.paymentMethod?.toLowerCase() !== 'paylater' &&
        !autoSettleInFlight.current.has(o.orderId)
    );

    candidates.forEach((o) => {
      autoSettleInFlight.current.add(o.orderId);
      console.log('[AutoSettle] Settling prepaid order:', o.orderId);
      completePrepaidOrder(
        o.orderId,
        o.serviceTax || 0,
        o.tipAmount || 0,
        false // not PayLater
      )
        .then(() => {
          handlePrepaidSettleSuccess(o.orderId);
        })
        .catch((err) => {
          console.error('[AutoSettle] Failed for order:', o.orderId, err?.message);
        })
        .finally(() => {
          // Remove from in-flight after 10s to allow retry if socket didn't clear
          setTimeout(() => autoSettleInFlight.current.delete(o.orderId), 10000);
        });
    });
  }, [orders, handlePrepaidSettleSuccess]);
```

**new_str** — the full replacement block (see Section 2 above for the complete code).

---

## 4. Verification Matrix

| # | What to Verify | How | Expected | Automated? |
|---|---|---|---|---|
| V1 | Compilation | `yarn start` → webpack compiles | 0 new errors, 0 new warnings | YES |
| V2 | Single order auto-settles | Enable toggle, 1 prepaid fOS=5 order | Order settles, card disappears | NO (browser) |
| V3 | Multiple orders settle SEQUENTIALLY | Enable toggle, 5+ prepaid fOS=5 orders, Network tab | API calls spaced ~800ms apart (not burst) | NO (browser) |
| V4 | Queue depth logging | Console: `[AutoSettle] Enqueued N orders. Queue depth: N` | Correct count logged | NO (console) |
| V5 | Pre-call staleness check | Queue has 5 orders → socket removes order #3 before turn | `[AutoSettle] Skipped (already removed): <id>` logged, no API call for it | NO (browser) |
| V6 | Max retry (2 attempts) | Mock API failure (e.g., disconnect backend) | `[AutoSettle] Gave up on order <id> after 2 attempts` logged | NO (console) |
| V7 | PayLater exclusion | PayLater order at fOS=5 with toggle ON | NOT enqueued. Settle button visible. | NO (browser) |
| V8 | Toggle OFF → no processing | Toggle OFF, prepaid fOS=5 orders | No `[AutoSettle]` console logs, no API calls | NO (browser) |
| V9 | Cleanup on unmount | Navigate away during queue processing | No console errors, queue cleared | NO (browser) |
| V10 | Re-render doesn't duplicate queue | Orders array changes mid-processing | `autoSettleKnown` Set prevents re-enqueue of same orderId | YES (code review) |
| V11 | Manual Settle still works for PayLater | PayLater order, click Settle button | `completePrepaidOrder` called, order settles | NO (browser) |
| V12 | New order arriving mid-processing | Socket pushes new prepaid fOS=5 order during queue processing | New order enqueued, processed after current finishes | NO (browser) |

---

## 5. Post-Code Registry Checklist (Implementation Agent MUST execute)

```
- [ ] registry.json: CR-097 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add DashboardPage.jsx entry for CR-097
- [ ] Code markers: // CR-097 comment in DashboardPage.jsx
```

---

## 6. Risk Register

| Risk | Mitigation in Plan | Residual Risk |
|---|---|---|
| Backend burst | Sequential queue — 1 call at a time, 800ms delay | NONE |
| Duplicate financial entries | `autoSettleKnown` Set prevents re-enqueue + `getOrderById` pre-call check | VERY LOW — cross-tab race still possible but mitigated |
| Infinite retry loop | Max 2 retries, then give up | NONE |
| Stale callback on unmount | Cleanup useEffect clears queue + resets processing flag | LOW — async `processQueue` may still be in `await` but no state mutation after unmount |
| Socket removal during queue processing | `getOrderById` check before each API call skips removed orders | NONE |
| Re-render re-enqueue | `autoSettleKnown` Set tracks all ever-enqueued orderIds | NONE |
| Memory leak (Known Set grows) | Orders are removed from `orders` array by socket; Known Set only grows by orderId (number). Even 1000 orders = ~8KB. Negligible. | NONE |

---

## 7. Execution Notes for Implementation Agent

1. **Single edit** — replace L1418-1459 in DashboardPage.jsx
2. **No new imports needed** — `useRef`, `useCallback`, `useEffect` already imported at L1. `getOrderById` already destructured at L180. `completePrepaidOrder` already imported at L24.
3. **No new files** — all changes within existing file
4. **Indentation** — 2 spaces (matches file convention)
5. **Code marker** — first line of new block: `// CR-097 (2026-07-23): Auto Settle — Sequential Queue.`
6. **Compile check** — `yarn start` must show `webpack compiled successfully` with 0 new warnings
7. **Do NOT modify** the `handlePrepaidSettleSuccess` callback above (L1407-1416) — it's consumed as-is

---

## 8. Status

```
Planning complete: CR-097
Stage: Implementation Plan (Gate 3)
Code reality: NONE
Risk: CRITICAL
Files WILL change: DashboardPage.jsx (L1418-1459 → sequential queue)
Files WILL NOT touch: StatusConfigPage, OrderCard, TableCard, autoSettlePrefs, orderService, socketHandlers, OrderContext
Owner decisions: ALL RESOLVED (OQ-01→04)
Verification matrix: 12 checks (1 automated compile, 11 browser/console)
Docs:
  - Impact Analysis: /app/memory/impact/CR_097_IMPACT_ANALYSIS.md
  - Implementation Plan: /app/memory/plans/CR_097_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
```
