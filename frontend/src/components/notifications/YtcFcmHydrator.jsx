// Always-mounted under OrderProvider: processes YTC FCM pending queue during /loading
// and after Dashboard mount. Optimistic minimal web YTC → instant ScanOrderPopOut,
// then fetchSingleOrderForSocket enriches items/table/amount.
import { useEffect, useRef } from 'react';
import { useOrders } from '../../contexts';
import { fetchSingleOrderForSocket } from '../../api/services/orderService';
import { isUnconfirmedScanOrder, hasUnconfirmedWebEditItems } from '../dashboard/ScanOrderPopOut';
import { enqueueYtcFcm, peekYtcFcmPending, removeYtcFcm } from '../../utils/ytcFcmPending';

const buildMinimalYtcOrder = (orderId) => ({
  orderId,
  fOrderStatus: 7,
  orderFrom: 'web',
  isWebOrder: true,
  status: 'pending',
  items: [],
  amount: 0,
  tableId: 0,
  createdAt: new Date().toISOString(),
});

export default function YtcFcmHydrator() {
  const { addOrder, updateOrder, getOrderById } = useOrders();
  const inFlightRef = useRef(new Set());

  useEffect(() => {
    const hydrateOne = async (rawId) => {
      const orderId = Number(rawId);
      if (!Number.isFinite(orderId) || orderId <= 0) return;
      if (inFlightRef.current.has(orderId)) return;

      const existing = getOrderById(orderId);
      if (existing && (isUnconfirmedScanOrder(existing) || hasUnconfirmedWebEditItems(existing))) {
        // Already popup-eligible with real data (has items) or minimal — if full
        // enough (items length > 0 or table), clear pending; if minimal empty, still fetch.
        if ((existing.items && existing.items.length > 0) || existing.tableId) {
          removeYtcFcm(orderId);
          return;
        }
      }

      inFlightRef.current.add(orderId);
      try {
        addOrder(buildMinimalYtcOrder(orderId));
        console.log('[YtcFcmHydrator] optimistic YTC order', orderId);

        const full = await fetchSingleOrderForSocket(orderId);
        if (!full) return;
        if (isUnconfirmedScanOrder(full) || hasUnconfirmedWebEditItems(full)) {
          addOrder(full);
          console.log('[YtcFcmHydrator] enriched YTC order', orderId);
        } else {
          updateOrder(orderId, full);
        }
        removeYtcFcm(orderId);
      } catch (err) {
        console.warn('[YtcFcmHydrator] hydrate failed:', err?.message || err);
        // leave id in pending for retry
      } finally {
        inFlightRef.current.delete(orderId);
      }
    };

    const processPending = () => {
      peekYtcFcmPending().forEach((id) => { hydrateOne(id); });
    };

    const onYtcFcm = (e) => {
      const rawId = e?.detail?.orderId;
      if (rawId != null && rawId !== '') enqueueYtcFcm(rawId);
      processPending();
    };

    processPending();
    window.addEventListener('mygenie:ytc-fcm', onYtcFcm);
    return () => window.removeEventListener('mygenie:ytc-fcm', onYtcFcm);
  }, [addOrder, updateOrder, getOrderById]);

  return null;
}
