// useOrderPollingReconciliation — Order Polling Reconciliation Hook
// CR: ORDER_POLLING_RECONCILIATION (May-2026)
// Scope: silent background reconciliation against employee-orders-list every
// 60 s. Socket remains primary; this hook is a safety net for missed-event
// drift (browser sleep, transient socket disconnect, server-side dispatch loss).
//
// Anti-rules (locked owner direction):
//   - NO new UI / banner / toast / sound / overlay / popup type
//   - Only visible side-effect: existing ScanOrderPopOut for newly discovered
//     Web/Scan YTC orders (purely derived from OrderContext.orders[])
//   - Routes through addOrder/updateOrder/removeOrder ONLY
//   - Skips engaged orders; never removes fOrderStatus === 9 (Hold/Park)
//   - One missing poll required before removal (BUG-079: owner accepted trade-off)
//
// See planning docs:
//   /app/memory/change_requests/order_polling_reconciliation_investigation/
//     ORDER_POLLING_RECONCILIATION_IMPLEMENTATION_PLAN.md
//     ORDER_POLLING_RECONCILIATION_SCRUTINY_AND_FIX_PLAN.md

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import { useTables } from '../contexts/TableContext';
import { useRestaurant } from '../contexts/RestaurantContext';
import { useSocketStatus } from '../contexts/SocketContext';
import * as orderService from '../api/services/orderService';

// --- Constants (exported for unit testability) -----------------------------
export const POLL_INTERVAL_MS = 60_000;           // base 60 s cycle
export const POLL_TIMEOUT_MS = 15_000;            // per-call abort
export const POLL_RECONNECT_DELAY_MS = 1_000;     // 1 s after socket reconnect
export const POLL_VISIBLE_DEBOUNCE_MS = 500;      // visibility-flip debounce
export const POLL_BACKOFF_MAX_MS = 300_000;       // 5 min cap on backoff
export const REMOVAL_MISS_THRESHOLD = 1;          // one miss (BUG-079: owner accepted faster removal)

// Skip-on-add gate (mirrors handleNewOrder L185-188 and
// handleScanNewOrder L494-497 in socketHandlers.js).
const HOLD_STATUSES = new Set([8, 9]);

// --- Fingerprint -----------------------------------------------------------
// Captures every socket-observable mutation on running orders.
// Numeric fields are toFixed(2) to neutralise float drift. Items are
// sorted so backend reordering does not trip false updates. Variation
// and add-on COUNTS (not contents) are sufficient — full payload is
// already coming from server, so a counter delta is enough to trigger
// updateOrder which then replaces the row.
const fingerprint = (o) => {
  if (!o) return '';
  const items = Array.isArray(o.items) ? o.items : [];
  const itemHash = items
    .map((it) => {
      const id = it?.id ?? it?.foodId ?? '';
      const qty = Number(it?.qty ?? it?.quantity) || 0;
      const unit = Number(it?.unitPrice ?? it?.price) || 0;
      const vCt = Array.isArray(it?.variation) ? it.variation.length : 0;
      const aCt = Array.isArray(it?.addOns) ? it.addOns.length : 0;
      return `${id}|${qty}|${unit.toFixed(2)}|${vCt}|${aCt}`;
    })
    .sort()
    .join(';');

  return [
    o.fOrderStatus ?? '',
    o.status ?? '',
    o.paymentStatus ?? '',
    o.paymentMethod ?? '',
    (Number(o.amount) || 0).toFixed(2),
    (Number(o.subtotalAmount) || 0).toFixed(2),
    (Number(o.serviceTax) || 0).toFixed(2),
    (Number(o.tipAmount) || 0).toFixed(2),
    (Number(o.deliveryCharge) || 0).toFixed(2),
    items.length,
    itemHash,
    o.orderNote || '',
  ].join('||');
};

// --- Hook ------------------------------------------------------------------
export const useOrderPollingReconciliation = () => {
  // Context consumption — all public surfaces, no internal-ref exposure.
  const { isAuthenticated, permissions } = useAuth();
  const { isLoaded: restaurantLoaded } = useRestaurant();
  const { isConnected } = useSocketStatus();
  const {
    orders,
    addOrder,
    updateOrder,
    removeOrder,
    engagedOrders,
  } = useOrders();
  const { updateTableStatus } = useTables();

  // Single-flight + lifecycle refs.
  const isPollingRef = useRef(false);
  const intervalIdRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const visibleTimerRef = useRef(null);
  const abortRef = useRef(null);
  const lastAttemptAtRef = useRef(0);
  const failureCountRef = useRef(0);
  const prevConnectedRef = useRef(false);

  // Removal-confirmation map (Map<orderId, missCount>).
  const missCountRef = useRef(new Map());

  // Live mirrors of OrderContext state — closure-safe reads inside pollOnce
  // without forcing OrderContext to expose internal refs.
  const ordersSnapshotRef = useRef([]);
  const engagedSnapshotRef = useRef(new Set());
  useEffect(() => { ordersSnapshotRef.current = orders; }, [orders]);
  useEffect(() => { engagedSnapshotRef.current = engagedOrders; }, [engagedOrders]);

  // --- Reconciliation pure function --------------------------------------
  const reconcile = useCallback((serverOrders, trigger, durationMs) => {
    const localOrders = ordersSnapshotRef.current || [];
    const engagedSet = engagedSnapshotRef.current || new Set();

    const serverMap = new Map();
    for (const s of serverOrders) {
      if (!s) continue;
      serverMap.set(s.orderId, s);
    }

    const localMap = new Map();
    for (const l of localOrders) {
      if (!l) continue;
      localMap.set(l.orderId, l);
    }

    let added = 0;
    let updated = 0;
    let removed = 0;
    let pendingRemove = 0;

    // ADD: server-only rows.
    for (const [orderId, s] of serverMap) {
      if (localMap.has(orderId)) continue;
      if (HOLD_STATUSES.has(s.fOrderStatus)) {
        // eslint-disable-next-line no-console
        console.log(`[OrderPolling] skip add ${orderId}: fOrderStatus=${s.fOrderStatus} (Hold)`);
        continue;
      }
      addOrder(s);
      added += 1;
    }

    // UPDATE: rows present on both sides.
    for (const [orderId, s] of serverMap) {
      const l = localMap.get(orderId);
      if (!l) continue;

      if (engagedSet.has(Number(orderId))) {
        continue; // engaged-row skip
      }
      if (HOLD_STATUSES.has(s.fOrderStatus)) {
        continue; // defensive — Hold-classified rows should not flow through update
      }

      const fpLocal = fingerprint(l);
      const fpServer = fingerprint(s);
      if (fpLocal === fpServer) continue;

      if (l.updatedAt && s.updatedAt && l.updatedAt > s.updatedAt) {
        // Stale poll — local is newer than what server returned.
        continue;
      }

      // BUG-082 (Wave 6): preserve scan-new-order web origin.
      // The running-order-list API may omit `order_from` for YTC orders,
      // but the local minimal order set by handleScanNewOrder has the
      // authoritative `orderFrom: 'web'` from the socket primitive.
      if (!s.orderFrom && l.orderFrom) {
        s.orderFrom = l.orderFrom;
        s.isWebOrder = l.isWebOrder;
      }

      updateOrder(orderId, s);
      updated += 1;
    }

    // REMOVE: local-only rows, with two-miss confirmation + Hold retention.
    for (const [orderId, l] of localMap) {
      if (serverMap.has(orderId)) {
        if (missCountRef.current.has(orderId)) {
          missCountRef.current.delete(orderId);
        }
        continue;
      }

      if (engagedSet.has(Number(orderId))) {
        // engaged-row skip — do NOT increment miss count
        continue;
      }
      if (l.fOrderStatus === 9) {
        // Hold/Park retention — never removed by polling.
        // PROD-BUG-003: Settled PayLater orders also have fOS=9. Distinguish
        // by checking PayLater fields — if settled PayLater, allow removal.
        const isSettledPayLater = (l.paymentType === 'prepaid') &&
          (l.paymentMethod?.toLowerCase() === 'paylater') &&
          (l.paymentStatus === 'sucess' || l.paymentStatus === 'success');
        if (!isSettledPayLater) continue;
      }

      const prevMisses = missCountRef.current.get(orderId) || 0;
      const nextMisses = prevMisses + 1;
      if (nextMisses >= REMOVAL_MISS_THRESHOLD) {
        // Confirmed orphan after one missing poll (BUG-079).
        // Free table for dine-in non-Hold rows (mirrors socket parity at
        // handleUpdateOrderStatus L437-447 / handleOrderDataEvent L289-302).
        if (l.tableId && l.tableId !== 0) {
          try {
            updateTableStatus(l.tableId, 'available');
          } catch (e) {
            // Defensive — updateTableStatus is a pure setter; should not throw.
            // eslint-disable-next-line no-console
            console.warn('[OrderPolling] updateTableStatus failed', e);
          }
        }
        removeOrder(orderId);
        missCountRef.current.delete(orderId);
        removed += 1;
      } else {
        missCountRef.current.set(orderId, nextMisses);
        pendingRemove += 1;
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `[OrderPolling] ok (${trigger}, ${durationMs}ms): +${added}/~${updated}/-${removed} ` +
      `(pending-remove=${pendingRemove}, server=${serverMap.size}, local=${localMap.size})`
    );
  }, [addOrder, updateOrder, removeOrder, updateTableStatus]);

  // --- Single poll cycle -------------------------------------------------
  const pollOnce = useCallback(async (trigger) => {
    // Backoff gate — interval ticks honour exponential backoff after
    // failures; visibility/reconnect/mount kicks bypass this gate.
    if (trigger === 'interval') {
      const requiredGap = Math.min(
        POLL_INTERVAL_MS * Math.pow(2, failureCountRef.current),
        POLL_BACKOFF_MAX_MS
      );
      if (Date.now() - lastAttemptAtRef.current < requiredGap) {
        return; // still in backoff window
      }
    }

    if (isPollingRef.current) {
      // eslint-disable-next-line no-console
      console.log(`[OrderPolling] skip (${trigger}): in-flight`);
      return;
    }
    if (!isAuthenticated || !restaurantLoaded) return;

    isPollingRef.current = true;
    lastAttemptAtRef.current = Date.now();

    const ac = new AbortController();
    abortRef.current = ac;
    const timeoutHandle = setTimeout(() => ac.abort(), POLL_TIMEOUT_MS);

    const t0 = Date.now();
    try {
      const roleParam = permissions?.[0] || 'Manager';
      const serverOrders = await orderService.getRunningOrders(roleParam, {
        signal: ac.signal,
      });
      reconcile(serverOrders || [], trigger, Date.now() - t0);
      failureCountRef.current = 0;
    } catch (err) {
      if (ac.signal.aborted) {
        // eslint-disable-next-line no-console
        console.warn(`[OrderPolling] aborted (${trigger}, ${POLL_TIMEOUT_MS}ms)`);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[OrderPolling] failed (${trigger})`, err?.message || err);
      }
      failureCountRef.current = Math.min(failureCountRef.current + 1, 4);
    } finally {
      clearTimeout(timeoutHandle);
      isPollingRef.current = false;
      abortRef.current = null;
    }
  }, [isAuthenticated, restaurantLoaded, permissions, reconcile]);

  // --- Periodic interval (auth + restaurant gated) -----------------------
  useEffect(() => {
    if (!isAuthenticated || !restaurantLoaded) return undefined;

    // Kick once immediately under fresh auth/restaurant.
    pollOnce('mount-or-auth');

    intervalIdRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return; // skip hidden ticks
      }
      pollOnce('interval');
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [isAuthenticated, restaurantLoaded, pollOnce]);

  // --- Visibility listener (resume kick) ---------------------------------
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const onVisChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (visibleTimerRef.current) clearTimeout(visibleTimerRef.current);
      visibleTimerRef.current = setTimeout(() => {
        pollOnce('visibility');
        visibleTimerRef.current = null;
      }, POLL_VISIBLE_DEBOUNCE_MS);
    };

    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      if (visibleTimerRef.current) {
        clearTimeout(visibleTimerRef.current);
        visibleTimerRef.current = null;
      }
    };
  }, [pollOnce]);

  // --- Socket-reconnect edge kick ---------------------------------------
  useEffect(() => {
    const wasConnected = prevConnectedRef.current;
    prevConnectedRef.current = isConnected;

    if (!wasConnected && isConnected && isAuthenticated && restaurantLoaded) {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        pollOnce('socket-reconnect');
        reconnectTimerRef.current = null;
      }, POLL_RECONNECT_DELAY_MS);
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [isConnected, isAuthenticated, restaurantLoaded, pollOnce]);
};

export default useOrderPollingReconciliation;
