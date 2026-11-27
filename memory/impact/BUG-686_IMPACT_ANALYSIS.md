# BUG-686 — Impact Analysis (Gate 2)

**ID:** BUG-686 · **Type:** BUG · **Area:** Aggregator / Sockets
**Priority:** P1 · **Risk:** HIGH · **QA Severity:** MAJOR
**Stage:** Gate 2 — Impact Analysis only (no plan, no code)
**Author:** PLANNING agent · **Date:** 2026-11-18

## Code Reality
**FULL (defective)**. Confirmed at `frontend/src/hooks/useOrderPollingReconciliation.js` L275-281:
```
const [posResult, aggResult] = await Promise.allSettled([
  orderService.getRunningOrders(roleParam, { signal: ac.signal }),
  getAggregatorOrderList().catch(() => []),
]);
const serverOrders = posResult.status === 'fulfilled' ? (posResult.value || []) : [];
reconcile(serverOrders, trigger, Date.now() - t0);
```
When the POS fetch is **rejected** (timeout/abort/network), `serverOrders` falls back to `[]` and `reconcile([])` is still called → reconciliation removes every local running order (observed: `server=0, local=53 → 53 removals`). Regression from the BUG-677 F4 change.

## Conflict Pre-Check
- Hook touched by BUG-677 (F4). FILE_OWNERSHIP lists `useOrderPollingReconciliation.js` as "NOT touched" by recent CR-482/aggregator work → no competing open edit.
- RELATED: BUG-250 (aggregator removal ~60s), BUG-677 (origin). Not the same branch of logic.
- **Parallel-safe** with the other 9 bugs.

## Data-flow trace
poll tick → `Promise.allSettled([getRunningOrders, getAggregatorOrderList])` → `posResult` rejected → `serverOrders=[]` → `reconcile([])` → OrderContext removes all orders not in server list → dashboard renders POS 0. Break point: treating a *rejected* fetch as an authoritative empty server set.

## Affected files / lines
| File | Lines | Nature |
|------|-------|--------|
| `hooks/useOrderPollingReconciliation.js` | L280-281 | guard: skip `reconcile()` when `posResult.status === 'rejected'` |

## Downstream consumers / blast radius
- Dashboard running-orders view; any order-entry flow reading running orders.
- 1 file, ~2-4 lines. No API/transform change.

## Risk
HIGH (order visibility, polling/reconcile). Full gate. Not Fast-Lane (order flow + hotspot family).

## Owner decisions
None — root cause confirmed. (Owner previously chose HOLD.)

## Verification matrix seeds
1. Simulate POS fetch rejection (offline/throttle) → local running orders are **retained** (not wiped).
2. ~10 consecutive logins → running-order count stable, no POS 0 flash.
3. Aggregator add path still works (fulfilled branch unchanged).
4. Normal success poll still reconciles correctly.
