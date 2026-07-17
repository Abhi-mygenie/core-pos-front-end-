// ScanOrderPopOut — POS2-002 Phase 4 (May-2026)
// ============================================================================
// Visual attention layer for Web / Scan & Order Yet-to-Confirm orders.
//
// Owner-locked contract (handover 2026-05-10):
//   - PRESENTATION ONLY. Reuses existing YTC card handlers; defines no
//     new business workflow.
//   - Predicate: fOrderStatus === 7 (Wave 6 simplification — status alone is proof of web origin)
//   - Sequential one-at-a-time queue with "Order N of M" + Next/Prev nav.
//   - Desktop (≥ 1024 px): centered overlay covering ≥ 50% of viewport.
//   - Tablet / small viewport (< 1024 px): full-screen modal.
//   - Auto-dismiss when queue drains.
//   - Snooze: reuses caller-provided `onToggleSnooze` AND keeps a tiny
//     pop-out-local 2-minute hide-set so the order does not re-pop until
//     the timer expires (R-SNOOZE-9 — duration superseded 2026-01-16,
//     was 5 min). The local hide-set is in-memory only — no localStorage,
//     no backend, no status mutation, no removal from OrderContext.
//   - Status-flip auto-remove (R-SNOOZE-12) is implicit: the selector
//     recomputes on every prop change, so an order whose status leaves
//     YTC falls out of the queue regardless of snooze membership.
//
// Strict anti-rules:
//   - soundManager import is allowed ONLY for `soundManager.stop()` inside
//     handleSnoozeClick (CR SNOOZE_SOUND_STOP_AND_DURATION, Jan-2026 —
//     owner override of the original "NO soundManager import" rule). NO
//     `soundManager.play(...)`. NO `soundManager.setEnabled(...)`. NO
//     global mute. NO per-order mute. NO future-sound suppression.
//   - NO NotificationContext import. Pop-out remains a silent layer for
//     the FCM-driven audio path; existing chime pipeline untouched.
//   - NO direct service / API / socket call. Every action goes through
//     the props the caller already wires for normal YTC cards.
//   - NO writes to localStorage / sessionStorage / IndexedDB / backend.
//   - NO mutation of order.status / fOrderStatus / OrderContext.
//
// Wire reuse map (from DashboardPage.jsx):
//   onAccept       → handleConfirmOrder        (existing YTC accept)
//   onReject       → handleCancelOrderFromCard (existing cancel-modal path;
//                                               opens <CancelOrderModal />)
//   onToggleSnooze → toggleSnooze              (existing in-memory Set add/remove)
//   onEdit         → handleTableClick family   (existing OrderEntry open)
// ============================================================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Check, Eye, BellOff, Bell, Loader2 } from 'lucide-react';
import { COLORS } from '../../constants';
// CR SNOOZE_SOUND_STOP_AND_DURATION (Jan-2026): Snooze now also stops the
// in-progress local chime. The original anti-rule above is overridden by
// owner decision 2026-01-16. Use ONLY soundManager.stop() — no setEnabled,
// no play, no global / per-order mute.
import soundManager from '../../utils/soundManager';

// BUG-122: Only web-origin orders trigger the popup.
// POS orders with fOrderStatus 7 appear as normal OrderCards with tick button.
// CR-018: Exclude scheduled POS orders.
export const isUnconfirmedScanOrder = (order) =>
  Boolean(order) && order.fOrderStatus === 7 && !order.scheduled && order.isWebOrder;

// Pure helper — derives a tableEntry-shaped object for handleTableClick from
// any web YTC order, regardless of channel. Mirrors the entry shapes the
// existing DashboardPage handlers already build elsewhere (delivery/takeaway
// sections at L1719/L1747; dineIn via table at L1687).
export const buildTableEntryFromOrder = (order) => {
  if (!order || !order.orderId) return null;
  const orderType = order.orderType;
  if (orderType === 'delivery') {
    return {
      id: `del-${order.orderId}`,
      orderId: order.orderId,
      tableId: 0,
      orderType: 'delivery',
    };
  }
  if (orderType === 'takeAway') {
    return {
      id: `ta-${order.orderId}`,
      orderId: order.orderId,
      tableId: 0,
      orderType: 'takeAway',
    };
  }
  if (orderType === 'dineIn' && order.tableId) {
    return {
      id: String(order.tableId),
      orderId: order.orderId,
      tableId: order.tableId,
      orderType: 'dineIn',
    };
  }
  // Fallback: walk-in / room / unknown — give a synthetic id keyed to orderId
  return {
    id: `wc-${order.orderId}`,
    orderId: order.orderId,
    tableId: 0,
    orderType: orderType || 'walkIn',
  };
};

const formatChannelLabel = (orderType) => {
  switch (orderType) {
    case 'dineIn':
      return 'Dine-In';
    case 'takeAway':
      return 'Takeaway';
    case 'delivery':
      return 'Delivery';
    case 'walkIn':
      return 'Walk-In';
    case 'room':
      return 'Room';
    default:
      return orderType || '';
  }
};

const formatLocation = (order) => {
  if (!order) return '';
  if (order.orderType === 'dineIn') {
    const section = order.tableSectionName || '';
    const table = order.tableNumber || '';
    if (section && table) return `${section} · ${table}`;
    if (section) return section;
    if (table) return table;
    return '—';
  }
  if (order.orderType === 'delivery') {
    const addr = order.deliveryAddress || null;
    if (!addr) return '—';
    const line = [addr.address, addr.city, addr.pincode].filter(Boolean).join(', ');
    return line || '—';
  }
  if (order.orderType === 'takeAway') return '';
  if (order.orderType === 'walkIn') return '';
  if (order.tableNumber) return order.tableNumber;
  return '—';
};

const formatItemCount = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const qty = items.reduce((sum, it) => sum + (Number(it?.qty ?? it?.quantity) || 0), 0);
  if (qty === 0 && items.length === 0) return '— items';
  return `${qty || items.length} item${(qty || items.length) === 1 ? '' : 's'}`;
};

/**
 * ScanOrderPopOut
 *
 * @param {Array<object>} orders            — full live order list (from useOrders().orders)
 * @param {Set<string|number>} snoozedOrders — existing dashboard snooze Set (read-only here)
 * @param {(orderId: string) => void} onToggleSnooze — existing toggleSnooze handler
 * @param {(orderOrTableEntry: object) => void} onAccept — wraps handleConfirmOrder
 * @param {(order: object) => void} onReject — wraps handleCancelOrderFromCard
 * @param {(tableEntry: object) => void} onEdit — wraps handleTableClick
 * @param {string} currencySymbol — '₹' / '$' etc. for total display
 */
const ScanOrderPopOut = ({
  orders = [],
  snoozedOrders,
  onToggleSnooze,
  onAccept,
  onReject,
  onEdit,
  currencySymbol = '₹',
  suppressed = false,
}) => {
  // Derived queue: web YTC orders. Sort: FIFO by createdAt ascending (oldest first).
  const queue = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    return safeOrders
      .filter(isUnconfirmedScanOrder)
      .sort((a, b) => {
        const aT = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bT = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aT - bT;
      });
  }, [orders]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAccepting, setIsAccepting] = useState(false);

  // Clamp currentIndex whenever queue length changes so it stays valid.
  useEffect(() => {
    if (queue.length === 0) {
      if (currentIndex !== 0) setCurrentIndex(0);
      return;
    }
    if (currentIndex >= queue.length) {
      setCurrentIndex(Math.max(0, queue.length - 1));
    }
  }, [queue.length, currentIndex]);

  const handleSnoozeClick = useCallback(
    (orderId) => {
      // Stop the in-progress chime (CR SNOOZE_SOUND_STOP_AND_DURATION, Jan-2026).
      // soundManager.stop() is idempotent and a no-op when nothing is playing.
      try {
        soundManager.stop();
      } catch (e) {
        console.warn('[Snooze] soundManager.stop() failed:', e?.message);
      }
      // Reuse existing dashboard snooze handler (dims card on dashboard).
      if (typeof onToggleSnooze === 'function') {
        onToggleSnooze(String(orderId));
      }
      // Popup stays open — owner directive Wave 6, 2026-05-17.
    },
    [onToggleSnooze]
  );

  const handleAcceptClick = useCallback(
    async (order) => {
      if (!order || isAccepting) return;
      setIsAccepting(true);
      try {
        const entry = buildTableEntryFromOrder(order);
        if (typeof onAccept === 'function') await onAccept(entry || order);
      } catch (err) {
        console.error('[ScanOrderPopOut] Accept failed:', err?.message);
        setIsAccepting(false);
      }
      // On success: popup auto-dismisses via fOrderStatus change from socket.
      // If socket is slow, reset after 8s safety cap so buttons don't stay locked.
      setTimeout(() => setIsAccepting(false), 8000);
    },
    [onAccept, isAccepting]
  );

  const handleRejectClick = useCallback(
    (order) => {
      if (!order) return;
      // handleCancelOrderFromCard accepts a raw order object — see
      // DashboardPage.jsx:1427. Pass the order through unchanged.
      if (typeof onReject === 'function') onReject(order);
    },
    [onReject]
  );

  const handleViewClick = useCallback(
    (order) => {
      if (!order) return;
      const entry = buildTableEntryFromOrder(order);
      if (typeof onEdit === 'function') onEdit(entry || order);
    },
    [onEdit]
  );

  const goPrev = useCallback(() => {
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((idx) => Math.min(Math.max(0, queue.length - 1), idx + 1));
  }, [queue.length]);

  if (suppressed) return null;
  if (queue.length === 0) return null;

  const activeOrder = queue[Math.min(currentIndex, queue.length - 1)];
  if (!activeOrder) return null;

  const idStr = String(activeOrder.orderId);
  const isUnderlyingSnoozed =
    snoozedOrders && typeof snoozedOrders.has === 'function' && snoozedOrders.has(idStr);
  const total = Number(activeOrder.amount || 0).toFixed(2);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < queue.length - 1;

  return (
    <div
      data-testid="scan-order-popout-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-order-popout-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 lg:p-6"
    >
      <div
        data-testid="scan-order-popout-panel"
        className={[
          // Tablet / small viewport: full-screen modal.
          'flex flex-col h-full w-full',
          // Desktop: centered overlay ≥ 50% width, with bounded max-width.
          'lg:h-auto lg:max-h-[85vh] lg:w-[min(60vw,820px)] lg:min-w-[480px] lg:rounded-2xl',
          'bg-white shadow-2xl overflow-hidden',
        ].join(' ')}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 lg:px-6 lg:py-5"
          style={{ backgroundColor: COLORS.primaryGreen, color: 'white' }}
        >
          <div className="flex items-center gap-3">
            <span
              data-testid="scan-order-popout-origin-badge"
              className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-1 rounded"
              style={{ backgroundColor: 'white', color: COLORS.primaryGreen }}
            >
              Web · Scan &amp; Order
            </span>
            <h2
              id="scan-order-popout-title"
              data-testid="scan-order-popout-title"
              className="text-base lg:text-lg font-bold"
            >
              New Web Order — Awaiting Confirmation
            </h2>
          </div>
          <div
            data-testid="scan-order-popout-queue-indicator"
            className="text-xs lg:text-sm font-semibold opacity-95"
          >
            Order {currentIndex + 1} of {queue.length}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 lg:px-7 lg:py-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  data-testid="scan-order-popout-order-number"
                  className="text-2xl lg:text-3xl font-extrabold"
                  style={{ color: COLORS.darkText }}
                >
                  {(activeOrder.orderType === 'room' || activeOrder.orderType === 'dineIn') && activeOrder.tableNumber
                    ? activeOrder.tableNumber
                    : `#${activeOrder.orderNumber || activeOrder.orderId}`}
                </div>
                <div
                  className="text-sm mt-1"
                  style={{ color: COLORS.grayText }}
                  data-testid="scan-order-popout-location"
                >
                  {formatChannelLabel(activeOrder.orderType)}
                  {(activeOrder.orderType !== 'room' && activeOrder.orderType !== 'dineIn') && formatLocation(activeOrder)
                    ? ` · ${formatLocation(activeOrder)}`
                    : ''}
                </div>
              </div>
              <div className="text-right">
                <div
                  data-testid="scan-order-popout-total"
                  className="text-xl lg:text-2xl font-bold"
                  style={{ color: COLORS.primaryGreen }}
                >
                  {currencySymbol}
                  {total}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: COLORS.grayText }}
                >
                  {formatItemCount(activeOrder)}
                </div>
              </div>
            </div>

            {activeOrder.customerName ? (
              <div
                className="text-sm"
                style={{ color: COLORS.darkText }}
                data-testid="scan-order-popout-customer"
              >
                <span style={{ color: COLORS.grayText }}>Customer: </span>
                <span className="font-semibold">{activeOrder.customerName}</span>
                {activeOrder.phone ? (
                  <span className="ml-2" style={{ color: COLORS.grayText }}>
                    · {activeOrder.phone}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* BUG-045 45l: PAID badge — predicate matches OrderCard.jsx:329
                BUG-058 (Wave 7): hidden for PayLater — treated as postpaid */}
            {activeOrder.paymentType === 'prepaid' && activeOrder.fOrderStatus !== 8 && activeOrder.paymentMethod?.toLowerCase() !== 'paylater' ? (
              <div>
                <span
                  data-testid={`popout-paid-badge-${idStr}`}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen }}
                >
                  PAID
                </span>
              </div>
            ) : null}

            {/* BUG-045 45i: payment label — Prepaid / COD / paymentMethod */}
            {activeOrder.paymentType || activeOrder.paymentMethod ? (
              <div
                className="text-sm"
                style={{ color: COLORS.grayText }}
                data-testid={`popout-payment-label-${idStr}`}
              >
                <span style={{ color: COLORS.grayText }}>Payment: </span>
                <span className="font-semibold" style={{ color: COLORS.darkText }}>
                  {activeOrder.paymentType === 'prepaid' && activeOrder.paymentMethod?.toLowerCase() !== 'paylater'
                    ? 'Prepaid'
                    : activeOrder.paymentMethod === 'cash_on_delivery'
                    ? 'COD'
                    : (activeOrder.paymentMethod || '—')}
                </span>
              </div>
            ) : null}

            {/* BUG-045 45i: delivery charge — hidden when 0 */}
            {activeOrder.orderType === 'delivery' && Number(activeOrder.deliveryCharge) > 0 ? (
              <div
                className="text-sm"
                style={{ color: COLORS.grayText }}
                data-testid={`popout-delivery-charge-${idStr}`}
              >
                <span style={{ color: COLORS.grayText }}>Delivery Charge: </span>
                <span className="font-semibold" style={{ color: COLORS.darkText }}>
                  {currencySymbol}
                  {Number(activeOrder.deliveryCharge).toFixed(2)}
                </span>
              </div>
            ) : null}

            {/* BUG-045 45n: delivery instructions — italic, hidden when blank */}
            {activeOrder.orderType === 'delivery' &&
            activeOrder.deliveryAddress?.delivery_instructions ? (
              <div
                className="text-xs italic"
                style={{ color: COLORS.grayText }}
                data-testid={`popout-delivery-instructions-${idStr}`}
              >
                Instructions: &quot;{activeOrder.deliveryAddress.delivery_instructions}&quot;
              </div>
            ) : null}

            {/* BUG-045 45g: order-level note — italic, above items */}
            {activeOrder.orderNote ? (
              <div
                className="text-sm italic px-2 py-1 rounded"
                style={{ color: COLORS.grayText, backgroundColor: COLORS.sectionBg }}
                data-testid={`popout-order-note-${idStr}`}
              >
                Order Note: &quot;{activeOrder.orderNote}&quot;
              </div>
            ) : null}

            {Array.isArray(activeOrder.items) && activeOrder.items.length > 0 ? (
              <div
                className="rounded-lg border max-h-[28vh] overflow-y-auto"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="scan-order-popout-items"
              >
                <ul className="divide-y" style={{ borderColor: COLORS.borderGray }}>
                  {activeOrder.items.map((it, idx) => {
                    const qty = Number(it?.qty ?? it?.quantity) || 1;
                    const unit = Number(it?.unitPrice ?? it?.price) || 0;
                    const lineTotal = unit * qty;
                    const isComp = Boolean(it?.isComplementary || it?.isComplementaryRuntime);
                    const variations = Array.isArray(it?.variation) ? it.variation : [];
                    const addOns = Array.isArray(it?.addOns) ? it.addOns : [];
                    return (
                      <li
                        key={`${it?.id ?? it?.foodId ?? idx}-${idx}`}
                        className="px-3 py-2 text-sm"
                        data-testid={`popout-item-row-${idx}`}
                      >
                        {/* row 1: qty + name + comp tag + line total */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              style={{ color: COLORS.darkText }}
                              className="font-medium truncate"
                            >
                              {qty}× {it?.name || it?.productName || 'Item'}
                            </span>
                            {isComp ? (
                              <span
                                data-testid={`popout-item-comp-tag-${idx}`}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ backgroundColor: '#F1F5F9', color: COLORS.darkText }}
                              >
                                Comp
                              </span>
                            ) : null}
                          </div>
                          <span
                            style={{ color: COLORS.grayText }}
                            className="font-mono flex-shrink-0"
                          >
                            {currencySymbol}
                            {lineTotal.toFixed(2)}
                          </span>
                        </div>
                        {/* row 2: variations */}
                        {variations.length > 0 ? (
                          <div
                            className="mt-1 pl-3 border-l-2"
                            style={{ borderColor: COLORS.borderGray }}
                          >
                            {variations.map((v, vIdx) => (
                              <div
                                key={`var-${vIdx}`}
                                className="text-xs"
                                style={{ color: COLORS.grayText }}
                                data-testid={`popout-item-variation-${idx}-${vIdx}`}
                              >
                                {v?.name || v?.label || ''}
                                {Number(v?.price) > 0 ? (
                                  <span className="ml-1">
                                    (+{currencySymbol}
                                    {Number(v.price).toFixed(2)})
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {/* row 3: add-ons */}
                        {addOns.length > 0 ? (
                          <div
                            className="mt-1 pl-3 border-l-2"
                            style={{ borderColor: '#FCD9A4' }}
                          >
                            {addOns.map((a, aIdx) => (
                              <div
                                key={`add-${aIdx}`}
                                className="text-xs"
                                style={{ color: COLORS.primaryOrange }}
                                data-testid={`popout-item-addon-${idx}-${aIdx}`}
                              >
                                + {a?.name || ''}
                                {Number(a?.price) > 0 ? (
                                  <span className="ml-1">
                                    (+{currencySymbol}
                                    {Number(a.price).toFixed(2)})
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {/* row 4: item note */}
                        {it?.notes ? (
                          <div
                            className="mt-1 text-xs italic px-2 py-1 rounded"
                            style={{ color: COLORS.grayText, backgroundColor: COLORS.sectionBg }}
                            data-testid={`popout-item-note-${idx}`}
                          >
                            &quot;{it.notes}&quot;
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                data-testid="popout-nav-prev"
                onClick={goPrev}
                disabled={!canPrev}
                aria-label="Previous order in queue"
                className="flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                data-testid="popout-nav-next"
                onClick={goNext}
                disabled={!canNext}
                aria-label="Next order in queue"
                className="flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Action row — REUSES existing handlers verbatim. */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-4 py-3 lg:px-6 lg:py-4 border-t"
          style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
        >
          <button
            type="button"
            data-testid={`popout-snooze-btn-${idStr}`}
            onClick={() => handleSnoozeClick(activeOrder.orderId)}
            disabled={isAccepting}
            className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: COLORS.borderGray,
              color: COLORS.darkText,
              backgroundColor: isUnderlyingSnoozed ? '#FFEDD5' : 'white',
            }}
            title={isUnderlyingSnoozed ? 'Currently snoozed' : 'Mute sound'}
          >
            {isUnderlyingSnoozed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            <span>Mute</span>
          </button>
          <button
            type="button"
            data-testid={`popout-view-btn-${idStr}`}
            onClick={() => handleViewClick(activeOrder)}
            disabled={isAccepting}
            className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            title="Edit order in OrderEntry"
          >
            <Eye className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            data-testid={`popout-reject-btn-${idStr}`}
            onClick={() => handleRejectClick(activeOrder)}
            disabled={isAccepting}
            className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: COLORS.errorText, color: COLORS.errorText }}
            title="Reject / Cancel order — opens cancel modal"
          >
            <X className="w-4 h-4" />
            <span>Reject</span>
          </button>
          <button
            type="button"
            data-testid={`popout-accept-btn-${idStr}`}
            onClick={() => handleAcceptClick(activeOrder)}
            disabled={isAccepting}
            className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: COLORS.primaryGreen }}
            title="Accept / Confirm web order"
          >
            {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isAccepting ? 'Accepting...' : 'Accept'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanOrderPopOut;
