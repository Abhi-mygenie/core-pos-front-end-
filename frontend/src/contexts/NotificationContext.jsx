// NotificationContext - Manages incoming notifications, sound playback, and toast display
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { onForegroundMessage } from '../config/firebase';
import soundManager from '../utils/soundManager';
import { mapConfirmOrderTone } from '../utils/toneMapper';
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

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const initializedRef = useRef(false);
  const foregroundUnsubRef = useRef(null);
  const processNotificationRef = useRef(null);
  // BUG-034 (Apr-2026): dedupe guard — stores the last-processed notification key
  // (messageId or title+body fingerprint) with a timestamp so the same notification
  // arriving from both the foreground listener AND the service-worker forwarder
  // within a short window only plays sound once.
  const lastNotifKeyRef = useRef(null);
  const lastNotifTimeRef = useRef(0);
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

    // Play sound (SoundManager handles silent, unknown keys, etc.)
    if (resolvedSound) {
      console.log('[Notification] Playing sound:', resolvedSound);
      soundManager.play(resolvedSound);
    }

    // Silent notification: stop sound, don't show anything
    if (resolvedSound === 'silent') return;

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
  }, [DEDUP_WINDOW_MS]);

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

    return () => {
      if (foregroundUnsubRef.current) foregroundUnsubRef.current();
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Reset on logout
  useEffect(() => {
    if (!isAuthenticated && initializedRef.current) {
      initializedRef.current = false;
      soundManager.stop();
      setNotifications([]);
    }
  }, [isAuthenticated]);

  // Sync sound enabled state
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

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

  // =========================================================================
  // CONTEXT VALUE
  // =========================================================================
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    dismissNotification,
    clearAll,
    markRead,
    simulateNotification: processNotification,
  }), [
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    dismissNotification,
    clearAll,
    markRead,
    processNotification,
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
