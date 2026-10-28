// NotificationContext - Manages incoming notifications, sound playback, and toast display
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { onForegroundMessage } from '../config/firebase';
import soundManager from '../utils/soundManager';
import { mapConfirmOrderTone, mapAggregatorOrderTone } from '../utils/toneMapper'; // BUG-600
import { getRestaurantRef } from '../utils/restaurantRef';

const NotificationContext = createContext(null);

// Infer sound from notification title/body when no explicit sound key
const inferSoundFromContent = (title = '', body = '') => {
  const text = `${title} ${body}`.toLowerCase();
  if (text.includes('new order')) return 'new_order';
  if (text.includes('swiggy')) return 'swiggy_new_order';
  if (text.includes('confirm')) return 'confirm_order';
  if (text.includes('accepted')) return 'order_accepted';
  if (text.includes('rejected') || text.includes('cancelled')) return 'order_rejected';
  if (text.includes('ready')) return 'order_ready';
  if (text.includes('served') || text.includes('attend')) return 'attend_table';
  if (text.includes('bill') || text.includes('payment') || text.includes('settle')) return 'settle_bill';
  if (text.includes('item') && text.includes('added')) return 'item_added';
  return 'new_order'; // default fallback
};

// POS2-007 Phase 1 — detect whether a notification is a confirm-order /
// Yet-to-Confirm event. We're conservative: we trigger the override only for
// notifications that look unambiguously confirm-order. Aggregator / new-order
// / settle-bill / etc. notifications keep their existing FCM/inference path.
//
// Detection priority (any one match → confirm-order):
//   1. data.type === 'confirm_order' / 'confirmOrder' / 'yet_to_confirm' / 'ytc'
//   2. data.notification_type matches the same set
//   3. resolvedSound === 'confirm_order' (i.e. either FCM stamped a confirm-order
//      sound key, or content-inference matched 'confirm' in title/body)
//
// Owner directive 2026-05-09: override applies ONLY to confirm-order; do NOT
// touch any other notification type.
const CONFIRM_ORDER_TYPES = new Set([
  'confirm_order', 'confirmorder', 'yet_to_confirm', 'yettoconfirm', 'ytc',
]);

const isConfirmOrderNotification = (data, resolvedSound) => {
  const type = (data?.type || '').toString().toLowerCase().replace(/[\s-]+/g, '_');
  const notifType = (data?.notification_type || '').toString().toLowerCase().replace(/[\s-]+/g, '_');
  if (CONFIRM_ORDER_TYPES.has(type) || CONFIRM_ORDER_TYPES.has(notifType)) return true;
  if (resolvedSound === 'confirm_order') return true;
  return false;
};

// BUG-600 — detect aggregator order notifications.
// Checks aggregator-specific fields that POS orders never carry.
// Must run BEFORE isConfirmOrderNotification to prevent aggregator orders
// from being caught by the confirm-order override.
const AGGREGATOR_INDICATORS = ['aggregator', 'aggrigator', 'swiggy', 'zomato', 'urbanpiper'];

const isAggregatorOrderNotification = (data, resolvedSound) => {
  const type = (data?.type || '').toString().toLowerCase();
  const notifType = (data?.notification_type || '').toString().toLowerCase();
  const platform = (data?.order_plateform || data?.order_platform || data?.platform || '').toString().toLowerCase();
  const source = (data?.source || '').toString().toLowerCase();
  if (AGGREGATOR_INDICATORS.some(k => type.includes(k) || notifType.includes(k) || platform.includes(k) || source.includes(k))) return true;
  if (resolvedSound === 'swiggy_new_order') return true;
  return false;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // CR-440: FCM notification banner kill switch — per-device localStorage, default ON
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try { return localStorage.getItem('mygenie_notifications_enabled') !== 'false'; }
    catch { return true; }
  });
  const initializedRef = useRef(false);
  const foregroundUnsubRef = useRef(null);
  const processNotificationRef = useRef(null);
  // BUG-034 (Apr-2026): dedupe guard — stores the last-processed notification key
  // (messageId or title+body fingerprint) with a timestamp so the same notification
  // arriving from both the foreground listener AND the service-worker forwarder
  // within a short window only plays sound once.
  const lastNotifKeyRef = useRef(null);
  const lastNotifTimeRef = useRef(0);
  const [swUpdatePending, setSwUpdatePending] = useState(false); // BUG-597: true when a new SW version is waiting to activate
  const regRef = useRef(null); // BUG-621: stores SW registration so triggerSwUpdate can postMessage to reg.waiting
  // 2-second window: same key arriving within 2 s is treated as duplicate
  const DEDUP_WINDOW_MS = 2000;

  // =========================================================================
  // PROCESS NOTIFICATION — play sound + show toast + add to list
  // =========================================================================
  const processNotification = useCallback((payload) => {
    console.log('[Notification] ====== INCOMING NOTIFICATION ======');
    console.log('[Notification] Full payload:', JSON.stringify(payload, null, 2));
    console.log('[Notification] payload.notification:', payload.notification);
    console.log('[Notification] payload.data:', payload.data);
    
    // Merge data from both payload.notification and payload.data
    const notif = payload.notification || {};
    const data = payload.data || {};
    const title = data.title || notif.title || 'Notification';
    const body = data.body || notif.body || '';

    // BUG-034 (Apr-2026): deduplicate notifications that arrive via both the
    // foreground FCM listener and the service-worker forwarder within the same
    // short window. Use message_id (FCM canonical) → order_id → title+body
    // fingerprint as the identity key.
    const notifKey = data.message_id || payload.messageId || data.order_id || `${title}:${body}`;
    const now = Date.now();
    if (notifKey && notifKey === lastNotifKeyRef.current && (now - lastNotifTimeRef.current) < DEDUP_WINDOW_MS) {
      console.log('[Notification] Duplicate suppressed (key:', notifKey, ', elapsed:', now - lastNotifTimeRef.current, 'ms)');
      return;
    }
    lastNotifKeyRef.current = notifKey;
    lastNotifTimeRef.current = now;

    // Determine sound: explicit key > inferred from content
    const soundKey = data.sound || data.notification_sound || '';
    let resolvedSound = soundKey || inferSoundFromContent(title, body);

    // BUG-600 — Aggregator order tone override.
    // Runs BEFORE confirm-order check so aggregator orders don't get caught
    // by isConfirmOrderNotification. Reads aggregatorOrderTone from profile.
    // Same override pattern as POS2-007 (confirm-order).
    if (isAggregatorOrderNotification(data, resolvedSound)) {
      const restaurant = getRestaurantRef();
      const profileTone = restaurant?.settings?.aggregatorOrderTone;
      if (profileTone !== undefined) {
        const overriddenSound = mapAggregatorOrderTone(profileTone);
        if (overriddenSound !== resolvedSound) {
          console.log('[Notification] BUG-600 aggregator tone override:',
            'profile=', profileTone, '| from=', resolvedSound, '→ to=', overriddenSound);
        }
        resolvedSound = overriddenSound;
      }
    }

    // POS2-007 Phase 1 — confirm-order tone override.
    // Only activates when the notification is unambiguously a confirm-order /
    // Yet-to-Confirm event (see isConfirmOrderNotification above). Reads the
    // per-restaurant `confirm_order_tone` profile setting via the
    // RestaurantContext bridge (utils/restaurantRef.js) and re-maps the
    // sound key. Sidebar Silent Mode continues to win — soundManager.play
    // early-returns when soundEnabled is false, regardless of any override.
    //
    // Mapping (utils/toneMapper.js):
    //   silent  → 'silent'
    //   default → 'confirm_order'
    //   buzzer  → 'five_sec_buzzer'
    //   missing/null/unknown → 'confirm_order'
    //
    // Phase 2 (POS2-008) plan: backend takes ownership; this block + the
    // toneMapper utility + the restaurantRef bridge are deleted together.
    if (isConfirmOrderNotification(data, resolvedSound)) {
      const restaurant = getRestaurantRef();
      const profileTone = restaurant?.settings?.confirmOrderTone;
      if (profileTone !== undefined) {
        const overriddenSound = mapConfirmOrderTone(profileTone);
        if (overriddenSound !== resolvedSound) {
          console.log('[Notification] POS2-007 confirm-order tone override:',
            'profile=', profileTone, '| from=', resolvedSound, '→ to=', overriddenSound);
          resolvedSound = overriddenSound;
        }
      }
    }

    console.log('[Notification] Extracted - title:', title, '| body:', body);
    console.log('[Notification] Sound - from payload:', soundKey, '| resolved:', resolvedSound);

    // BUG-453 Fix B (OD-453-04): muted order → no sound, no banner/list entry.
    // Placed AFTER BUG-034 dedup so dedup refs still update. Real FCM key is data.orderid (B0 evidence 2026-02).
    const notifOrderId = String(data.orderid || data.order_id || data.orderId || '');
    if (notifOrderId && soundManager.isOrderMuted(notifOrderId)) {
      console.log('[Notification] BUG-453 muted order', notifOrderId, '— sound + toast suppressed');
      return;
    }

    // Play sound (SoundManager handles silent, unknown keys, etc.)
    if (resolvedSound) {
      console.log('[Notification] Playing sound:', resolvedSound);
      soundManager.play(resolvedSound);
    }

    // Silent notification: stop sound, don't show anything
    if (resolvedSound === 'silent') return;

    // CR-440: banner kill switch — sound already played above; skip banner entry when disabled on this device
    if (!notificationsEnabled) return;

    const notification = {
      id: Date.now().toString(),
      title,
      body,
      type: data.type || data.notification_type || '',
      sound: resolvedSound,
      orderId: data.order_id || data.orderId || '',
      tableId: data.table_id || data.tableId || '',
      channel: data.channel || data.order_type || '',
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 50));
  }, [DEDUP_WINDOW_MS, notificationsEnabled]); // CR-440: notificationsEnabled read inside callback

  // Keep ref in sync
  processNotificationRef.current = processNotification;

  // =========================================================================
  // INITIALIZE ON AUTH — preload sounds + listen for messages
  // =========================================================================
  useEffect(() => {
    if (!isAuthenticated || initializedRef.current) return;
    initializedRef.current = true;

    // Preload sounds
    soundManager.preload();

    // Listen for foreground messages — pass full payload
    foregroundUnsubRef.current = onForegroundMessage((payload) => {
      console.log('[Notification] Foreground message:', payload);
      processNotificationRef.current?.(payload);
    });

    // Listen for background messages forwarded by service worker
    const handleSWMessage = (event) => {
      if (event.data?.type === 'BACKGROUND_NOTIFICATION') {
        console.log('[Notification] SW forwarded message:', event.data.payload);
        // Wrap SW data into same shape as foreground payload
        processNotificationRef.current?.({ data: event.data.payload });
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // BUG-621 OD-621-02: visibilitychange handler defined here so cleanup return() can reference it.
    // Covers iOS Safari PWA where the SW may update while app is backgrounded/frozen —
    // when user brings app to foreground, re-check reg.waiting.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker?.ready.then((reg) => {
          if (reg.waiting) { regRef.current = reg; setSwUpdatePending(true); }
        });
      }
    };

    // BUG-621: detect SW waiting reliably via statechange on the installing worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((reg) => {
        regRef.current = reg; // BUG-621: store for triggerSwUpdate postMessage
        // Check on load — covers app reopened after a background SW update
        if (reg.waiting) setSwUpdatePending(true);
        // Watch for new SW installing and transitioning to 'installed/waiting'
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && reg.waiting) {
              setSwUpdatePending(true);
            }
          });
        });
      });
      // BUG-597 (kept): when new SW takes over after skipWaiting, reload the page
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      // BUG-621 OD-621-02: visibilitychange fallback for iOS Safari PWA
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (foregroundUnsubRef.current) foregroundUnsubRef.current();
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      document.removeEventListener('visibilitychange', handleVisibilityChange); // BUG-621
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Reset on logout
  useEffect(() => {
    if (!isAuthenticated && initializedRef.current) {
      initializedRef.current = false;
      soundManager.stop(); soundManager.clearMutes(); // BUG-453: fresh mute state on next login
      setNotifications([]);
    }
  }, [isAuthenticated]);

  // Sync sound enabled state
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // CR-440: sync notification banner preference to localStorage immediately on toggle
  useEffect(() => {
    try { localStorage.setItem('mygenie_notifications_enabled', String(notificationsEnabled)); }
    catch { /* localStorage unavailable */ }
  }, [notificationsEnabled]);

  // =========================================================================
  // PUBLIC METHODS
  // =========================================================================
  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const triggerSwUpdate = useCallback(() => {
    // BUG-621: signal the waiting SW to skipWaiting → triggers controllerchange → reload
    if (regRef.current?.waiting) {
      regRef.current.waiting.postMessage({ action: 'skipWaiting' });
    }
  }, []); // regRef is a ref — reads .current at call time, no deps needed

  // =========================================================================
  // CONTEXT VALUE
  // =========================================================================
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,       // CR-440
    setNotificationsEnabled,    // CR-440
    dismissNotification,
    clearAll,
    markRead,
    simulateNotification: processNotification,
    swUpdatePending,            // BUG-597
    triggerSwUpdate,            // BUG-621
  }), [
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
    dismissNotification,
    clearAll,
    markRead,
    processNotification,
    swUpdatePending,            // BUG-597
    triggerSwUpdate,            // BUG-621
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;
