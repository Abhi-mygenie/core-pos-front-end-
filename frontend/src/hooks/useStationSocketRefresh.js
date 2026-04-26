// useStationSocketRefresh
// ----------------------------------------------------------------------------
// Subscribes to the order-channel socket events and triggers a debounced
// refetch of station data when a relevant event arrives.
//
// LOCKED RULES (per /app/memory/STATION_PANEL_REALTIME_HANDOVER.md §2.2):
//   ALWAYS REFRESH:
//     - new-order
//     - scan-new-order
//     - update-order-status
//   REFRESH ONLY WHEN status === 2 (Ready) or 3 (Cancelled):
//     - update-order
//     - update-food-status
//     - update-item-status
//   ALL OTHER EVENTS ARE IGNORED.
//
// IMPORTANT: order events are multiplexed onto ONE channel
// `new_order_${restaurantId}`; messages arrive as variadic args:
//   args[0] = eventName    args[1] = orderId
//   args[2] = restaurantId  args[3] = fOrderStatus
//   args[4] = payload (when EVENTS_WITH_PAYLOAD)
// We subscribe ONCE to the channel and route inside this hook.
//
// No optimistic local mutation (Option 3) — owner-rejected. Always refetch.
// ----------------------------------------------------------------------------

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useSocket, useRestaurant, useStations, useMenu } from '../contexts';
import { fetchStationData } from '../api/services/stationService';
import {
  SOCKET_EVENTS,
  getOrderChannel,
} from '../api/socket/socketEvents';
import socketService from '../api/socket/socketService';

// ---------------------------------------------------------------------------
// Constants — locked per handover §2.2
// ---------------------------------------------------------------------------
const DEBOUNCE_MS = 500;
const READY = 2;
const CANCELLED = 3;

const REFRESH_ALWAYS = [
  SOCKET_EVENTS.NEW_ORDER,           // 'new-order'
  SOCKET_EVENTS.SCAN_NEW_ORDER,      // 'scan-new-order'
  SOCKET_EVENTS.UPDATE_ORDER_STATUS, // 'update-order-status'
];

const REFRESH_ON_READY_OR_CANCEL = [
  SOCKET_EVENTS.UPDATE_ORDER,        // 'update-order'
  SOCKET_EVENTS.UPDATE_FOOD_STATUS,  // 'update-food-status'
  SOCKET_EVENTS.UPDATE_ITEM_STATUS,  // 'update-item-status'
];

// ---------------------------------------------------------------------------
// Debug logger — opt-in via localStorage.STATION_DEBUG = 'true'
// ---------------------------------------------------------------------------
const debugLog = (...args) => {
  try {
    if (localStorage.getItem('STATION_DEBUG') === 'true') {
      console.log('[StationRefresh]', ...args);
    }
  } catch (e) { /* localStorage unavailable */ }
};

// ---------------------------------------------------------------------------
// Pure helper — pulls affected station names from the message payload.
// Falls back to all enabledStations when payload is missing or carries no
// station fields (e.g. update-food-status, update-order-status, scan-new-order
// have no payload at args[4]).
// ---------------------------------------------------------------------------
export const extractAffectedStations = (args, enabledStations) => {
  const affected = new Set();
  const payload = args?.[4];
  const orders = payload?.orders || [];

  orders.forEach((order) => {
    const items = order?.order_details_food || [];
    items.forEach((food) => {
      if (food?.station && enabledStations.includes(food.station)) {
        affected.add(food.station);
      }
    });
  });

  // Fallback: refresh all enabled stations if we couldn't determine targets.
  return affected.size > 0 ? [...affected] : [...enabledStations];
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useStationSocketRefresh = () => {
  const { isConnected } = useSocket();
  const { restaurant } = useRestaurant();
  const { enabledStations, stationViewEnabled, updateStationData } = useStations();
  const { categories } = useMenu();

  const restaurantId = restaurant?.id;

  // Categories map — same shape as LoadingPage.loadStationData uses
  const categoriesMap = useMemo(() => {
    const map = {};
    if (Array.isArray(categories)) {
      categories.forEach((cat) => {
        if (cat?.categoryId) {
          const name = cat.categoryName || cat.name;
          map[cat.categoryId] = name;
          map[String(cat.categoryId)] = name;
        }
      });
    }
    return map;
  }, [categories]);

  // Per-station dirty set + single debounce timer
  const dirtyRef = useRef(new Set());
  const timerRef = useRef(null);

  // -------------------------------------------------------------------------
  // flush — drains the dirty set, refetches in parallel, updates context
  // -------------------------------------------------------------------------
  const flush = useCallback(async () => {
    const stations = [...dirtyRef.current];
    dirtyRef.current.clear();
    timerRef.current = null;

    if (stations.length === 0) return;

    debugLog('flush →', stations);

    try {
      const results = await Promise.all(
        stations.map((s) => fetchStationData(s, categoriesMap))
      );
      stations.forEach((s, i) => {
        updateStationData(s, results[i]);
      });
      debugLog('flush done', stations);
    } catch (err) {
      // fetchStationData already swallows individual errors and returns an
      // error-shaped object, so this is defensive only.
      console.error('[StationRefresh] flush error', err);
    }
  }, [categoriesMap, updateStationData]);

  // -------------------------------------------------------------------------
  // scheduleFlush — debounce. Multiple events within 500ms = 1 fetch per dirty station.
  // -------------------------------------------------------------------------
  const scheduleFlush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      flush();
    }, DEBOUNCE_MS);
  }, [flush]);

  // -------------------------------------------------------------------------
  // handleOrderChannelEvent — routes channel messages, applies filter rules,
  // marks affected stations dirty, schedules a debounced flush.
  // -------------------------------------------------------------------------
  const handleOrderChannelEvent = useCallback((...args) => {
    const eventName = args?.[0];
    const fOrderStatus = args?.[3];

    const isAlways = REFRESH_ALWAYS.includes(eventName);
    const isReadyOrCancelEvent = REFRESH_ON_READY_OR_CANCEL.includes(eventName);

    if (!isAlways && !isReadyOrCancelEvent) {
      // Ignored event (split-order, update-order-paid, target/source, etc.)
      debugLog('ignore (not in refresh set)', eventName);
      return;
    }

    if (isReadyOrCancelEvent && fOrderStatus !== READY && fOrderStatus !== CANCELLED) {
      debugLog('skip (status filter)', eventName, 'status=', fOrderStatus);
      return;
    }

    const affected = extractAffectedStations(args, enabledStations);
    if (affected.length === 0) {
      debugLog('skip (no affected stations)', eventName);
      return;
    }

    affected.forEach((s) => dirtyRef.current.add(s));
    debugLog('mark dirty', eventName, 'status=', fOrderStatus, 'stations=', affected);
    scheduleFlush();
  }, [enabledStations, scheduleFlush]);

  // -------------------------------------------------------------------------
  // STEP 5 (next checkpoint) — channel subscription will be wired here.
  // STEP 6 (next checkpoint) — reconnect-driven full refresh will be wired here.
  // For now, these dependencies are touched only to keep the hook future-proof.
  // -------------------------------------------------------------------------
  // eslint-disable-next-line no-unused-expressions
  void [isConnected, restaurantId, stationViewEnabled, handleOrderChannelEvent];

  // Cleanup any pending timer on unmount even before subscription wiring lands.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
};

export default useStationSocketRefresh;

// ---------------------------------------------------------------------------
// Test surface — these helpers are exported above (`extractAffectedStations`)
// for unit tests in a follow-up PR. The hook itself is tested via the
// integration smoke test described in the handover §5.2.
// ---------------------------------------------------------------------------
