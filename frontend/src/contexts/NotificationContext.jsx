// NotificationContext - Manages incoming notifications, sound playback, and toast display
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { onForegroundMessage } from '../config/firebase';
import soundManager from '../utils/soundManager';

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

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const initializedRef = useRef(false);
  const foregroundUnsubRef = useRef(null);
  const processNotificationRef = useRef(null);

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

    // Determine sound: explicit key > inferred from content
    const soundKey = data.sound || data.notification_sound || '';
    const resolvedSound = soundKey || inferSoundFromContent(title, body);
    
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
  }, []);

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
