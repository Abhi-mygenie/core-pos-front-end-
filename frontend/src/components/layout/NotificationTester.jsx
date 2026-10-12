// NotificationTester - Test panel to simulate FCM notifications
// Accessible from Settings panel for debugging
import { useNotifications } from '../../contexts/NotificationContext';
import { Bell, Play } from 'lucide-react';

const TEST_NOTIFICATIONS = [
  {
    label: 'New Order (Dine-in)',
    payload: {
      notification: { title: 'There is a new order', body: 'Order ID: 002275 Order Type: dinein' },
      data: { sound: 'new_order', type: 'new_order', order_id: '002275', order_type: 'dinein' },
    },
  },
  {
    label: 'New Order (Swiggy)',
    payload: {
      notification: { title: 'Swiggy New Order', body: 'Order ID: 002276 Order Type: delivery' },
      data: { sound: 'swiggy_new_order', type: 'new_order', order_id: '002276', order_type: 'delivery' },
    },
  },
  {
    label: 'Order Confirmed',
    payload: {
      notification: { title: 'Order Confirmed', body: 'Order ID: 002275 has been confirmed' },
      data: { sound: 'order_confirmed', type: 'order_confirmed', order_id: '002275' },
    },
  },
  {
    label: 'Order Ready',
    payload: {
      notification: { title: 'Order Ready', body: 'Order ID: 002275 is ready for serving' },
      data: { sound: 'order_ready', type: 'order_ready', order_id: '002275' },
    },
  },
  {
    label: 'Attend Table',
    payload: {
      notification: { title: 'Attend Table', body: 'Table 5 needs attention' },
      data: { sound: 'attend_table', type: 'attend_table', table_id: '5' },
    },
  },
  {
    label: 'Settle Bill',
    payload: {
      notification: { title: 'Settle Bill', body: 'Order ID: 002275 payment pending' },
      data: { sound: 'settle_bill', type: 'settle_bill', order_id: '002275' },
    },
  },
  {
    label: 'Order Rejected',
    payload: {
      notification: { title: 'Order Rejected', body: 'Order ID: 002276 has been rejected' },
      data: { sound: 'order_rejected', type: 'order_rejected', order_id: '002276' },
    },
  },
  {
    label: 'Silent (Stop Sound)',
    payload: {
      data: { sound: 'silent' },
    },
  },
];

const NotificationTester = () => {
  const { simulateNotification } = useNotifications();

  const handleTest = (payload) => {
    simulateNotification(payload);
  };

  return (
    <div className="p-4 space-y-3" data-testid="notification-tester">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        <Bell className="w-4 h-4" />
        Test Notifications
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Tap to simulate FCM notifications with sound + banner
      </p>
      <div className="grid grid-cols-2 gap-2">
        {TEST_NOTIFICATIONS.map((item, i) => (
          <button
            key={i}
            onClick={() => handleTest(item.payload)}
            data-testid={`test-notif-${i}`}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
          >
            <Play className="w-3 h-3 text-gray-400 flex-shrink-0" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NotificationTester;
