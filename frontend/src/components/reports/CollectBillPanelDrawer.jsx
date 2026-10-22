// CollectBillPanelDrawer — CR-003 Phase 3.6 (revised)
//
// Right-side drawer that, when the operator clicks the green "Collect"
// pill on a Hold-tab row in the Audit Report, opens the SAME existing
// `CollectPaymentPanel` component the dashboard uses for Scenario-1
// "collect bill on existing order". This keeps the UX, the bill-summary
// math, the payload-builder, and the BILL_PAYMENT endpoint perfectly
// aligned with the dashboard collect-bill flow — no parallel
// implementation, no new payload shape.
//
// Layout / styling matches `OrderDetailSheet`:
//   - Fixed full-height, w-[480px] right-anchored panel
//   - Black/20 backdrop fading in
// On open we fetch the held order's full detail via the existing
// `get-single-order-new` endpoint, transform it through the canonical
// `orderTransform.fromAPI.order(...)` (the same transform used for
// running orders + socket frames), and feed the resulting cart items,
// customer info, and financials into `CollectPaymentPanel`.
//
// On `onPaymentComplete(paymentData)`, we:
//   1. Build the payload via `orderTransform.toAPI.collectBillExisting`
//      — exactly what `OrderEntry.jsx` does on the dashboard.
//   2. POST to `API_ENDPOINTS.BILL_PAYMENT`.
//   3. Toast + close drawer + refetch report (parent owns the optimistic
//      Hold-tab removal + refetch trigger; we just emit the success or
//      error callback so the report page can stay authoritative).

import { useEffect, useState, useCallback } from 'react';
import { Loader2, AlertTriangle, X } from 'lucide-react';

import api from '../../api/axios';
import { API_ENDPOINTS } from '../../api/constants';
import { fromAPI as orderFromAPI, toAPI as orderToAPI } from '../../api/transforms/orderTransform';
import { useRestaurant, useSettings } from '../../contexts';
import { useAuth } from '../../contexts/AuthContext';
import CollectPaymentPanel from '../order-entry/CollectPaymentPanel';

/**
 * Mark every cart item as `placed: true`. The dashboard cart can mix
 * placed and unplaced (in-flight) lines; collect-bill only ever bills
 * placed lines (`collectBillExisting` filters with `item.placed`). For
 * a held order every line is, by definition, already placed — so we
 * stamp the flag uniformly to keep `CollectPaymentPanel`'s
 * placed/unplaced derivations correct.
 *
 * Cancelled and Check-In-marker rows are passed through unchanged
 * (CollectPaymentPanel filters them itself).
 */
const stampPlacedItems = (items = []) => items.map((it) => ({
  ...it,
  placed: true,
}));

/**
 * Convert the transformed order (from `orderFromAPI.order`) into the
 * `effectiveTable` shape that `collectBillExisting` expects. The builder
 * only reads `table.orderId` (numeric DB id) and `table.isRoom`; we
 * surface a couple of extra fields for forward compatibility.
 */
const buildEffectiveTable = (transformed) => ({
  orderId:      transformed?.orderId,
  isRoom:       transformed?.isRoom === true,
  tableId:      transformed?.tableId || 0,
  tableNumber:  transformed?.tableNumber || '',
  tableSection: transformed?.tableSectionName || '',
});

/**
 * Build a `customer` object compatible with `CollectPaymentPanel`'s
 * existing dashboard contract (it consumes `customerName` / `phone`).
 * We pass through whatever the held order recorded; null fields are
 * tolerated by downstream consumers.
 */
const buildCustomer = (transformed) => ({
  customerName: transformed?.customerName || transformed?.customer || '',
  phone:        transformed?.phone || '',
  email:        '',
});

/**
 * @param {Object}   props
 * @param {Object|null} props.order             Held-row order (we only need `id`).
 * @param {boolean}  props.open                 Controlled open state.
 * @param {() => void} props.onClose            Close drawer (Cancel / X / overlay click / ESC).
 * @param {() => void} [props.onCollectStart]   Optional — called when the operator presses Pay
 *                                              (parent can mark the row optimistically removed).
 * @param {(order: Object) => void} props.onCollectSuccess   Called after a successful
 *                                              BILL_PAYMENT response (parent should toast + refetch).
 * @param {(order: Object, err: Error) => void} props.onCollectError  Called on API failure
 *                                              (parent should restore optimistic state + toast).
 */
const CollectBillPanelDrawer = ({
  order,
  open,
  onClose,
  onCollectStart,
  onCollectSuccess,
  onCollectError,
}) => {
  const { restaurant } = useRestaurant();
  const { settings } = useSettings();
  const { user } = useAuth();

  const [isLoading, setIsLoading]   = useState(false);
  const [loadError, setLoadError]   = useState(null);
  const [detail, setDetail]         = useState(null);     // transformed order
  const [isPaying, setIsPaying]     = useState(false);

  // Fetch held order detail when the drawer opens for a new order id.
  // We hit the raw endpoint directly (rather than `getSingleOrderNew`,
  // which routes through the report-side transform that strips fields
  // CollectPaymentPanel needs). The order-side transform is the one
  // that produces the `cartItems` shape the panel was originally built
  // around — same path used by socket re-engages.
  useEffect(() => {
    if (!open || !order?.id) {
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
          order_id: order.id,
        });
        // The endpoint nests the order list under different keys depending
        // on the upstream consumer; mirror the unwrap logic used in
        // `reportService.getSingleOrderRoom`.
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

    return () => {
      cancelled = true;
    };
  }, [open, order?.id]);

  // Pay handler — mirrors OrderEntry.jsx line 1338-1375 (Scenario 1:
  // existing-order collect bill). Same payload builder, same endpoint,
  // same options shape. Parent (the report page) owns optimistic
  // row-removal + toasts via the success / error callbacks.
  const handlePaymentComplete = useCallback(async (paymentData) => {
    if (!detail || !order) return;
    if (isPaying) return;
    setIsPaying(true);
    onCollectStart?.(order);

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
          // BUG-058 (Wave 7): Hold-tab settle must explicitly send postpaid
          // so backend treats prepaid-hold orders as postpaid.
          paymentType:    'postpaid',
        }
      );

      await api.post(API_ENDPOINTS.BILL_PAYMENT, payload);

      // Notify parent of success BEFORE closing so it can fire toast +
      // refetch with the correct order context.
      onCollectSuccess?.(order);
      onClose?.();
    } catch (err) {
      onCollectError?.(order, err);
      // Leave the drawer open so the operator can retry the payment
      // without re-clicking the row's Collect pill.
    } finally {
      setIsPaying(false);
    }
  }, [detail, order, isPaying, settings?.autoBill, user?.employeeId, restaurant?.name, onCollectStart, onCollectSuccess, onCollectError, onClose]);

  // Render nothing when closed so we don't keep the panel + its many
  // contexts subscribed in the background.
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={() => !isPaying && onClose?.()}
        data-testid="collect-bill-drawer-backdrop"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full w-[480px] max-w-full z-50
                   bg-white border-l border-zinc-200 shadow-2xl
                   flex flex-col"
        data-testid="collect-bill-drawer"
      >
        {/* Tiny header bar with a manual close button — CollectPaymentPanel
            also has its own ChevronLeft "back" arrow which we wire to
            `onBack` for parity with the dashboard's nested back behaviour. */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <div className="text-sm font-semibold text-zinc-900">
            {/* BUG-071 (Wave 5): user-facing number only. Q5 — no chip when missing. */}
            Collect Bill {order?.orderNumber ? `· #${order.orderNumber}` : ''}
          </div>
          <button
            type="button"
            onClick={() => !isPaying && onClose?.()}
            disabled={isPaying}
            className="p-1 text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
            aria-label="Close"
            data-testid="collect-bill-drawer-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — loading / error / panel */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading order…</span>
            </div>
          )}

          {!isLoading && loadError && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <div className="text-sm font-medium text-zinc-800">
                Could not load this order
              </div>
              <div className="text-xs text-zinc-500">{loadError}</div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-3 py-1.5 text-xs rounded-sm border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          )}

          {!isLoading && !loadError && detail && (
            <CollectPaymentPanel
              cartItems={stampPlacedItems(detail.items)}
              total={detail.amount || 0}
              onBack={() => !isPaying && onClose?.()}
              onPaymentComplete={handlePaymentComplete}
              // Print bill is supported (see plan); CollectPaymentPanel
              // calls its native printer pipeline. We pass through.
              onPrintBill={null}
              // Split-bill / runtime-complimentary toggling are
              // intentionally not wired from a held-row collect — the
              // operator should use the dashboard for those flows.
              onOpenSplitBill={null}
              onToggleComplimentary={null}
              customer={buildCustomer(detail)}
              isRoom={detail.isRoom === true}
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
              // BUG-042-A (Feb-2026): Audit → Hold Collect Bill rail must
              // expose ONLY primary methods (Cash / Card / UPI), intersected
              // with the restaurant's configured paymentTypes. Hides Split /
              // Credit / "More" dropdown / To Room. Owner-locked.
              allowedMethods={['cash', 'card', 'upi']}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default CollectBillPanelDrawer;
