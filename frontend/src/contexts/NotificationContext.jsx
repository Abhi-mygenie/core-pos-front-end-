// NotificationContext - Manages incoming notifications, sound playback, and toast display
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { onForegroundMessage, requestFCMToken } from '../config/firebase';
import { registerDeviceToken } from '../api/services/deviceTokenService'; // BUG-749
import soundManager from '../utils/soundManager';
import fcmDiagLog from '../utils/fcmDiagLog';
import { mapConfirmOrderTone, mapAggregatorOrderTone } from '../utils/toneMapper'; // BUG-600
import { getRestaurantRef } from '../utils/restaurantRef';
import { enqueueYtcFcm } from '../utils/ytcFcmPending';
import SoundUnlockBanner from '../components/notifications/SoundUnlockBanner';

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

  // BUG-747: autoplay-unlock state powering the sidebar "Tap to enable" Ringer
  const [audioUnlocked, setAudioUnlocked] = useState(() => soundManager.getState().isUnlocked);
  const [audioBlockedAt, setAudioBlockedAt] = useState(0);
  const audioUnlockedRef = useRef(audioUnlocked);
  audioUnlockedRef.current = audioUnlocked;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

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

    // Diagnostics: record every inbound notification (source + order) before any
    // dedup/mute gating, so the panel can prove whether an order's payload arrived.
    const diagSource = payload.__source || 'simulate';
    const diagOrderId = String(data.orderid || data.order_id || data.orderId || '');
    try { fcmDiagLog.add('received', { source: diagSource, order_id: diagOrderId, type: data.type || data.notification_type || '', title, body }); } catch { /* ignore */ }

    // BUG-034 (Apr-2026): deduplicate notifications that arrive via both the
    // foreground FCM listener and the service-worker forwarder within the same
    // short window. Use message_id (FCM canonical) → order_id → title+body
    // fingerprint as the identity key.
    const notifKey = data.message_id || payload.messageId || data.order_id || `${title}:${body}`;
    const now = Date.now();
    if (notifKey && notifKey === lastNotifKeyRef.current && (now - lastNotifTimeRef.current) < DEDUP_WINDOW_MS) {
      console.log('[Notification] Duplicate suppressed (key:', notifKey, ', elapsed:', now - lastNotifTimeRef.current, 'ms)');
      try { fcmDiagLog.add('suppressed_dedup', { source: diagSource, order_id: diagOrderId, key: String(notifKey) }); } catch { /* ignore */ }
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

    // After reload, FCM can arrive before/without scan-new-order landing in
    // OrderContext — ask Dashboard to hydrate so ScanOrderPopOut can open.
    // Real payloads often stamp sound=forty_five_sec_buzzer (not confirm_order),
    // so also match title/body "confirm".
    const looksLikeYtcConfirm =
      isConfirmOrderNotification(data, resolvedSound) ||
      /confirm/i.test(title) ||
      /confirm/i.test(body);
    if (diagOrderId && looksLikeYtcConfirm) {
      const queuedId = enqueueYtcFcm(diagOrderId);
      try {
        window.dispatchEvent(new CustomEvent('mygenie:ytc-fcm', { detail: { orderId: queuedId || diagOrderId } }));
      } catch { /* ignore */ }
    }

    console.log('[Notification] Extracted - title:', title, '| body:', body);
    console.log('[Notification] Sound - from payload:', soundKey, '| resolved:', resolvedSound);

    // Play sound only after sidebar Ringer unlock (Tap to enable) and not Silent Mode.
    // Mute/snooze is instance-only (stop current audio) — do not suppress later FCM by orderId.
    if (resolvedSound) {
      if (resolvedSound === 'silent') {
        soundManager.play('silent');
      } else if (!audioUnlockedRef.current) {
        console.log('[Notification] Sound suppressed — Tap to enable ringer first:', resolvedSound);
        setAudioBlockedAt(Date.now()); // show sidebar-directed unlock banner
        try { fcmDiagLog.add('suppressed_needs_unlock', { source: diagSource, order_id: diagOrderId, sound: resolvedSound }); } catch { /* ignore */ }
      } else if (!soundEnabledRef.current) {
        // Intentional Silent Mode — no floating banner (staff chose sidebar Silent).
        console.log('[Notification] Sound suppressed — Silent Mode:', resolvedSound);
        try { fcmDiagLog.add('suppressed_sound_off', { source: diagSource, order_id: diagOrderId, sound: resolvedSound }); } catch { /* ignore */ }
      } else {
        console.log('[Notification] Playing sound:', resolvedSound);
        try { fcmDiagLog.add('played', { source: diagSource, order_id: diagOrderId, sound: resolvedSound }); } catch { /* ignore */ }
        soundManager.play(resolvedSound);
      }
    }

    // Silent notification: stop sound, don't show anything
    if (resolvedSound === 'silent') return;

    // CR-440: banner kill switch — sound already played above; skip banner entry when disabled on this device
    if (!notificationsEnabled) {
      try { fcmDiagLog.add('banner_suppressed_kill_switch', { source: diagSource, order_id: diagOrderId }); } catch { /* ignore */ }
      return;
    }

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
    try { fcmDiagLog.add('banner_shown', { source: diagSource, order_id: diagOrderId, type: notification.type }); } catch { /* ignore */ }
  }, [DEDUP_WINDOW_MS, notificationsEnabled]); // CR-440: notificationsEnabled read inside callback

  // Keep ref in sync
  processNotificationRef.current = processNotification;

  // =========================================================================
  // INITIALIZE ON AUTH — token register THEN foreground FCM listener
  // =========================================================================
  // BUG-749 / reload fix: do NOT gate on initializedRef. StrictMode double-mount
  // used to set initializedRef=true, cancel the first async onForegroundMessage,
  // then skip remount — leaving no listener after reload. Fresh login worked
  // because isAuthenticated flipped false→true after the StrictMode pass.
  // Order matches login: getToken → POST /device-token → onForegroundMessage.
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    soundManager.preload();

    let cancelled = false;

    (async () => {
      // 1) Re-register live FCM token (BUG-749). Skip if permission not granted.
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const r = await requestFCMToken();
          const token = r?.token || null;
          if (!cancelled && token) {
            const res = await registerDeviceToken(token);
            if (!cancelled) {
              console.log('[BUG-749] device-token registered', {
                status: res?.status,
                storedPreview: res?.fcm_token ? `${String(res.fcm_token).slice(0, 12)}…` : null,
              });
            }
          }
        } catch (err) {
          if (!cancelled) console.warn('[BUG-749] device-token register failed:', err?.message || err);
        }
      }

      if (cancelled) return;

      // 2) Attach foreground listener after token path (CR-562 readiness still applies inside)
      try {
        const unsub = await onForegroundMessage((payload) => {
          console.log('[Notification] Foreground message:', payload);
          processNotificationRef.current?.({ ...payload, __source: 'foreground' });
        });
        if (cancelled) {
          unsub?.();
          return;
        }
        foregroundUnsubRef.current = unsub;
        console.log('[Notification] Foreground FCM listener attached');
      } catch (err) {
        if (!cancelled) console.warn('[Notification] foreground subscribe failed:', err?.message);
      }
    })();

    // Background messages forwarded by service worker
    const handleSWMessage = (event) => {
      if (event.data?.type === 'BACKGROUND_NOTIFICATION') {
        console.log('[Notification] SW forwarded message:', event.data.payload);
        processNotificationRef.current?.({ data: event.data.payload, __source: 'sw' });
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      cancelled = true;
      if (foregroundUnsubRef.current) {
        foregroundUnsubRef.current();
        foregroundUnsubRef.current = null;
      }
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [isAuthenticated]);

  // BUG-661: SW update detection — NOT gated by auth (OD-661); reload only after user-triggered skipWaiting (hadController guard)
  useEffect(() => {
    const sw = navigator.serviceWorker;
    if (!sw) return undefined;
    const hadController = !!sw.controller; // BUG-661: first-time install claim must not reload the page
    const markIfWaiting = (reg) => { regRef.current = reg; if (reg.waiting) setSwUpdatePending(true); };
    const onVisible = () => { if (document.visibilityState === 'visible') sw.ready.then(markIfWaiting); };
    const onControllerChange = () => { if (hadController) window.location.reload(); }; // BUG-661: hadController guard
    sw.ready.then((reg) => {
      markIfWaiting(reg);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && reg.waiting) setSwUpdatePending(true); });
      });
    });
    sw.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      sw.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // BUG-747: unlock autoplay (muted silent clip). Only the sidebar Ringer
  // "Tap to enable" control should call this — not Accept / random clicks.
  const unlockAudioNow = useCallback(async () => {
    const ok = await soundManager.unlock();
    if (ok) { setAudioUnlocked(true); setAudioBlockedAt(0); }
    return ok;
  }, []);

  // Sidebar Ringer attention state: lock on boot when autoplay is not unlocked;
  // re-lock when a play is blocked. Do NOT auto-unlock on window gestures —
  // Accept/any click used to flip the icon green while sound was still "off".
  useEffect(() => {
    if (!soundManager.getState().isUnlocked) {
      setAudioUnlocked(false);
      setAudioBlockedAt(Date.now());
    }
    soundManager.setBlockedHandler(() => { setAudioUnlocked(false); setAudioBlockedAt(Date.now()); });
    return () => { soundManager.setBlockedHandler(null); };
  }, []);

  // Reset on logout
  useEffect(() => {
    if (!isAuthenticated) {
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
    audioUnlocked,              // BUG-747
    audioBlockedAt,             // BUG-747
    unlockAudioNow,             // BUG-747
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
    audioUnlocked,              // BUG-747
    audioBlockedAt,             // BUG-747
    unlockAudioNow,             // BUG-747
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <SoundUnlockBanner />
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
