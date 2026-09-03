// CR-358-P3: PMS Checkout Drawer — right-side slider hosting the EXISTING CollectPaymentPanel (room mode).
// Shell copied from components/reports/CollectBillPanelDrawer.jsx (CR-003); that file is NOT modified.
// CollectPaymentPanel is NOT modified (R6).
//
// Deltas from CR-003 shell (see plan §5 Edit 5):
//   D1: orderId prop (numeric from rooms[].order_id)
//   D2: header "Checkout · Room {roomNo}" + sub {guestName}
//   D3: paymentType omitted (A-08 Dashboard parity)
//   D4: OD-P3-14=(b) LOCKED: allowedMethods omitted (Dashboard parity)
//   D5: onPrintBill wired via printOrder
//   D6: onSuccess({orderId}) callback; on error → toast, drawer stays open
//   D7: isRoom guard — if !detail.isRoom → error state
//   D8: same width/backdrop
//   D9: data-testids pms-checkout-drawer-*

import { useEffect, useState, useCallback } from 'react';
import { Loader2, AlertTriangle, X } from 'lucide-react';

import api from '../../api/axios';
import { API_ENDPOINTS } from '../../api/constants';
import { fromAPI as orderFromAPI, toAPI as orderToAPI } from '../../api/transforms/orderTransform';
import { printOrder } from '../../api/services/orderService';
import { useRestaurant, useSettings } from '../../contexts';
import { useAuth } from '../../contexts/AuthContext';
import CollectPaymentPanel from '../order-entry/CollectPaymentPanel';
import { toast } from 'sonner';

// CR-358-P3: identical to CR-003 helper
const stampPlacedItems = (items = []) => items.map((it) => ({
  ...it,
  placed: true,
}));

// CR-358-P3: identical to CR-003 helper
const buildEffectiveTable = (transformed) => ({
  orderId:      transformed?.orderId,
  isRoom:       transformed?.isRoom === true,
  tableId:      transformed?.tableId || 0,
  tableNumber:  transformed?.tableNumber || '',
  tableSection: transformed?.tableSectionName || '',
});

// CR-358-P3: identical to CR-003 helper
const buildCustomer = (transformed) => ({
  customerName: transformed?.customerName || transformed?.customer || '',
  phone:        transformed?.phone || '',
  email:        '',
});

/**
 * @param {Object}   props
 * @param {boolean}  props.open           Controlled open state.
 * @param {number}   props.orderId        Numeric order id (from rooms[].order_id).
 * @param {string}   props.roomNo         Display room number (e.g. "r3").
 * @param {string}   props.guestName      Display guest name.
 * @param {() => void} props.onClose      Close drawer.
 * @param {({orderId}) => void} props.onSuccess  Called after successful BILL_PAYMENT.
 */
const PmsCheckoutDrawer = ({
  open,
  orderId,
  roomNo,
  guestName,
  onClose,
  onSuccess,
}) => {
  const { restaurant } = useRestaurant();
  const { settings } = useSettings();
  const { user } = useAuth();

  const [isLoading, setIsLoading]   = useState(false);
  const [loadError, setLoadError]   = useState(null);
  const [detail, setDetail]         = useState(null);
  const [isPaying, setIsPaying]     = useState(false);

  // Fetch room order detail when the drawer opens — same unwrap as CR-003 L134-140
  useEffect(() => {
    if (!open || !orderId) {
      setDetail(null);
      setLoadError(null);
      return undefined;
    }
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setDetail(null);

    (async () => {
      try {
        const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, {
          order_id: orderId,
        });
        const raw =
          response?.data?.orders?.order_details_order ||
          response?.data?.order_details_order ||
          (Array.isArray(response?.data?.orders) ? response.data.orders[0] : null) ||
          response?.data?.orders ||
          response?.data ||
          null;
        if (!raw) throw new Error('Empty order detail');
        const transformed = orderFromAPI.order(raw);
        if (!cancelled) setDetail(transformed);
      } catch (err) {
        if (!cancelled) setLoadError(err.readableMessage || err?.message || 'Failed to load order');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, orderId]);

  // D5: Print Bill handler — same call as OrderEntry L1912
  const handlePrintBill = useCallback(async () => {
    if (!detail) return;
    try {
      const scPct = restaurant?.serviceChargePercentage || 0;
      const overrides = {};
      const agents = restaurant?.printerAgents || [];
      await printOrder(orderId, 'bill', null, detail.rawOrderDetails ?? detail, scPct, overrides, agents);
      toast.success('Bill request sent');
    } catch (err) {
      toast.error(err?.readableMessage || err?.message || 'Print failed');
    }
  }, [detail, orderId, restaurant]);

  // Pay handler — mirrors CR-003 with D3 (no paymentType) and D6 (onSuccess + toast)
  const handlePaymentComplete = useCallback(async (paymentData) => {
    if (!detail || !orderId) return;
    if (isPaying) return;
    setIsPaying(true);

    try {
      const effectiveTable = buildEffectiveTable(detail);
      const cartItems      = stampPlacedItems(detail.items);
      const customer       = buildCustomer(detail);

      const payload = orderToAPI.collectBillExisting(
        effectiveTable,
        cartItems,
        customer,
        paymentData,
        {
          autoBill:       settings?.autoBill || false,
          waiterId:       user?.employeeId || '',
          restaurantName: restaurant?.name || '',
          // D3: paymentType omitted — Dashboard parity (A-08)
        }
      );

      await api.post(API_ENDPOINTS.BILL_PAYMENT, payload);

      // D6: success → parent callback → toast + refetch
      onSuccess?.({ orderId });
      onClose?.();
    } catch (err) {
      // D6: error → toast, drawer stays open for retry
      toast.error(err?.readableMessage ?? err?.response?.data?.message ?? 'Checkout failed');
    } finally {
      setIsPaying(false);
    }
  }, [detail, orderId, isPaying, settings?.autoBill, user?.employeeId, restaurant?.name, onSuccess, onClose]);

  // ESC key closes when not paying
  useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (e) => { if (e.key === 'Escape' && !isPaying) onClose?.(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, isPaying, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={() => !isPaying && onClose?.()}
        data-testid="pms-checkout-drawer-backdrop"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full w-[480px] max-w-full z-50
                   bg-white border-l border-zinc-200 shadow-2xl
                   flex flex-col"
        data-testid="pms-checkout-drawer"
      >
        {/* D2: Header — "Checkout · Room rN" + guestName */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#E5E5E5' }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: '#1A1A1A', fontFamily: 'Poppins, sans-serif' }}
                 data-testid="pms-checkout-drawer-title">
              Checkout {roomNo ? `· Room ${roomNo}` : ''}
            </div>
            {guestName && (
              <div className="text-xs text-zinc-500 mt-0.5">{guestName}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => !isPaying && onClose?.()}
            disabled={isPaying}
            className="p-1 text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
            aria-label="Close"
            data-testid="pms-checkout-drawer-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — loading / error / D7 isRoom guard / panel */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-16 text-zinc-500"
                 data-testid="pms-checkout-drawer-loading">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading order...</span>
            </div>
          )}

          {!isLoading && loadError && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center"
                 data-testid="pms-checkout-drawer-error">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <div className="text-sm font-medium text-zinc-800">Could not load this order</div>
              <div className="text-xs text-zinc-500">{loadError}</div>
              <button type="button" onClick={onClose}
                className="mt-2 px-3 py-1.5 text-xs rounded-sm border border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                Close
              </button>
            </div>
          )}

          {/* D7: isRoom guard */}
          {!isLoading && !loadError && detail && detail.isRoom !== true && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center"
                 data-testid="pms-checkout-drawer-error">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div className="text-sm font-medium text-zinc-800">This order is not a room order</div>
              <button type="button" onClick={onClose}
                className="mt-2 px-3 py-1.5 text-xs rounded-sm border border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                Close
              </button>
            </div>
          )}

          {!isLoading && !loadError && detail && detail.isRoom === true && (
            <CollectPaymentPanel
              cartItems={stampPlacedItems(detail.items)}
              total={detail.amount || 0}
              onBack={() => !isPaying && onClose?.()}
              onPaymentComplete={handlePaymentComplete}
              onPrintBill={handlePrintBill}
              onOpenSplitBill={null}
              onToggleComplimentary={null}
              customer={buildCustomer(detail)}
              isRoom={true}
              associatedOrders={detail.associatedOrders || []}
              roomInfo={detail.roomInfo || null}
              orderFinancials={{
                subtotalBeforeTax: detail.subtotalBeforeTax || 0,
                subtotalAmount:    detail.subtotalAmount || 0,
                serviceTax:        detail.serviceTax || 0,
                tipAmount:         detail.tipAmount || 0,
              }}
              hasPlacedItems={true}
              isProcessingPayment={isPaying}
              orderType={detail.orderType || 'dineIn'}
              orderNumber={detail.orderNumber || ''}
              // D4: OD-P3-14=(b) LOCKED — no allowedMethods prop (Dashboard parity)
            />
          )}
        </div>
      </div>
    </>
  );
};

export default PmsCheckoutDrawer;
