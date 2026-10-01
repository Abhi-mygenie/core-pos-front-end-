// NotificationBanner - Top-center FCM notification banners
// Displays incoming push notifications as colored full-width banners
import { useEffect, useState, useCallback } from 'react';
import { X, Bell, UtensilsCrossed, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

// Map notification content to type for styling
const getNotificationType = (title = '', body = '') => {
  const text = `${title} ${body}`.toLowerCase();
  if (text.includes('reject') || text.includes('cancel')) return 'error';
  if (text.includes('ready') || text.includes('served') || text.includes('accepted') || text.includes('confirmed')) return 'success';
  if (text.includes('new order') || text.includes('swiggy') || text.includes('zomato')) return 'order';
  if (text.includes('bill') || text.includes('payment') || text.includes('settle')) return 'warning';
  return 'info';
};

const TYPE_CONFIG = {
  order:   { bg: '#F26B33', icon: UtensilsCrossed, label: 'New Order' },
  success: { bg: '#329937', icon: CheckCircle2,     label: 'Update' },
  error:   { bg: '#DC2626', icon: XCircle,          label: 'Alert' },
  warning: { bg: '#D97706', icon: AlertCircle,       label: 'Action' },
  info:    { bg: '#2563EB', icon: Bell,              label: 'Notification' },
};

const MAX_VISIBLE = 3;

const BannerItem = ({ notification, onDismiss }) => {
  const type = getNotificationType(notification.title, notification.body);
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 6000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <div
      data-testid={`notification-banner-${notification.id}`}
      className="flex items-center gap-3 px-4 py-2.5 text-white shadow-lg animate-in slide-in-from-top-2 duration-300"
      style={{ backgroundColor: config.bg }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="font-semibold text-sm whitespace-nowrap">{notification.title}</span>
        {notification.body && (
          <>
            <span className="opacity-60">—</span>
            <span className="text-sm opacity-90 truncate">{notification.body}</span>
          </>
        )}
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="p-1 rounded hover:bg-white/20 transition-colors flex-shrink-0"
        data-testid={`dismiss-notification-${notification.id}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const NotificationBanner = () => {
  const { notifications, dismissNotification } = useNotifications();
  const [visibleIds, setVisibleIds] = useState(new Set());

  // Track new notifications to show as banners
  useEffect(() => {
    if (notifications.length > 0) {
      const latestId = notifications[0]?.id;
      if (latestId && !visibleIds.has(latestId)) {
        setVisibleIds((prev) => {
          const next = new Set(prev);
          next.add(latestId);
          return next;
        });
      }
    }
  }, [notifications, visibleIds]);

  const handleDismiss = useCallback((id) => {
    setVisibleIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    dismissNotification(id);
  }, [dismissNotification]);

  // Get visible notifications (max 3, newest first)
  const visibleNotifications = notifications
    .filter((n) => visibleIds.has(n.id))
    .slice(0, MAX_VISIBLE);

  if (visibleNotifications.length === 0) return null;

  return (
    <div
      data-testid="notification-banner-container"
      className="fixed top-0 left-0 right-0 z-[200] flex flex-col"
    >
      {visibleNotifications.map((n) => (
        <BannerItem key={n.id} notification={n} onDismiss={handleDismiss} />
      ))}
    </div>
  );
};

export default NotificationBanner;
