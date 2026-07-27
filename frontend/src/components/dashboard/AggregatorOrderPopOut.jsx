// CR-106: AggregatorOrderPopOut — Mandatory popup for incoming Swiggy/Zomato orders
// Pattern: Clones ScanOrderPopOut structure. Adapted for aggregator lifecycle.
// Predicate: isAggregator && (fOrderStatus === 0 || fOrderStatus === 7)
// Actions: Reject + Accept ONLY (OD-6). Prep time required before accept (OD-4).
// Size: Same as ScanOrderPopOut (OD-7). Blocking until all orders actioned.

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Check, Loader2, Clock, MapPin, FileText, Tag } from 'lucide-react';
import { SOURCE_COLORS } from '../../constants';
import { useRestaurant } from '../../contexts'; // CR-109: access settings for auto-accept + prep time
import { computeAggregatorPrepTime } from '../../utils/aggregatorPrepTime'; // CR-109

// CR-106: Aggregator orders needing immediate action
const isUnconfirmedAggregatorOrder = (order) =>
  Boolean(order) &&
  order.isAggregator === true &&
  (order.fOrderStatus === 0 || order.fOrderStatus === 7);

const PREP_TIME_OPTIONS = [5, 10, 15, 20, 25, 30]; // OD-4

const formatCurrency = (amount, symbol = '₹') => {
  const num = Number(amount) || 0;
  return `${symbol}${num.toFixed(2)}`;
};

const formatAddress = (addr) => {
  if (!addr) return null;
  const parts = [addr.line_1, addr.line_2, addr.city, addr.pin].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

const AggregatorOrderPopOut = ({
  orders = [],
  onAccept,
  onReject,
  currencySymbol = '₹',
  suppressed = false,
}) => {
  // Derived queue: aggregator orders needing action (status 0 or 7)
  const queue = useMemo(() => {
    const safe = Array.isArray(orders) ? orders : [];
    return safe
      .filter(isUnconfirmedAggregatorOrder)
      .sort((a, b) => {
        const aT = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bT = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aT - bT; // FIFO
      });
  }, [orders]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPrepTime, setSelectedPrepTime] = useState(null);
  const [customPrepTime, setCustomPrepTime] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const autoAcceptFiredRef = useRef(new Set()); // CR-109: track auto-accepted order IDs

  // CR-109: Access restaurant settings for prep time computation + auto-accept
  const { settings } = useRestaurant();
  const autoAcceptEnabled = settings?.autoPrepTimeAck === true; // CR-109: camelCase from profileTransform

  // Clamp index when queue changes
  useEffect(() => {
    if (queue.length === 0) {
      if (currentIndex !== 0) setCurrentIndex(0);
      return;
    }
    if (currentIndex >= queue.length) {
      setCurrentIndex(Math.max(0, queue.length - 1));
    }
  }, [queue.length, currentIndex]);

  // CR-109: Compute prep time from settings brackets + pre-select pill
  const order = queue[currentIndex] || null;
  const computedPrepTime = useMemo(() => {
    if (!order) return null;
    return computeAggregatorPrepTime(order.items || [], settings || {});
  }, [order, settings]);

  // Reset prep time when order changes — pre-select computed value
  useEffect(() => {
    if (computedPrepTime && PREP_TIME_OPTIONS.includes(computedPrepTime)) {
      setSelectedPrepTime(computedPrepTime);
      setCustomPrepTime('');
    } else if (computedPrepTime) {
      // Computed time not in pill options (e.g., 35 min) → set as custom
      setSelectedPrepTime(null);
      setCustomPrepTime(String(computedPrepTime));
    } else {
      setSelectedPrepTime(null);
      setCustomPrepTime('');
    }
  }, [currentIndex, queue.length, computedPrepTime]);

  const effectivePrepTime = selectedPrepTime || (customPrepTime ? Number(customPrepTime) : null);

  const handleAccept = useCallback(async () => {
    const order = queue[currentIndex];
    if (!order || !effectivePrepTime || isAccepting) return;
    setIsAccepting(true);
    try {
      await onAccept(order, effectivePrepTime);
    } catch (err) {
      console.error('[AggregatorPopOut] Accept failed:', err?.message);
      setIsAccepting(false);
    }
    // Auto-dismiss via socket status change; safety reset after 8s
    setTimeout(() => setIsAccepting(false), 8000);
  }, [queue, currentIndex, effectivePrepTime, isAccepting, onAccept]);

  const handleReject = useCallback(() => {
    const order = queue[currentIndex];
    if (!order) return;
    if (typeof onReject === 'function') onReject(order);
  }, [queue, currentIndex, onReject]);

  // CR-109: Auto-accept when auto_prep_time_ack is enabled
  // Fires once per order after prep time is computed and pre-selected
  useEffect(() => {
    if (!autoAcceptEnabled || !order || !effectivePrepTime || isAccepting) return;
    if (autoAcceptFiredRef.current.has(order.orderId)) return; // already auto-accepted this order
    autoAcceptFiredRef.current.add(order.orderId);
    // Brief delay so staff sees the popup + selected time before it auto-accepts
    const timer = setTimeout(() => {
      console.log(`[AggregatorPopOut] CR-109: Auto-accepting order ${order.orderId} with ${effectivePrepTime} min`);
      handleAccept();
    }, 1500);
    return () => clearTimeout(timer);
  }, [autoAcceptEnabled, order, effectivePrepTime, isAccepting, handleAccept]);

  const goPrev = useCallback(() => setCurrentIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setCurrentIndex((i) => Math.min(queue.length - 1, i + 1)), [queue.length]);

  // Don't render if queue empty or suppressed
  if (queue.length === 0 || suppressed) return null;
  if (!order) return null;

  const source = order.source || 'aggregator';
  const sourceColor = SOURCE_COLORS?.[source] || '#6B7280';
  const sourceLetter = source === 'swiggy' ? 'S' : source === 'zomato' ? 'Z' : 'A';
  const items = Array.isArray(order.items) ? order.items : [];
  const totalQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const address = formatAddress(order.deliveryAddress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="aggregator-popout">
      {/* Backdrop — non-dismissible (blocking) */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card — desktop ≥50% viewport, tablet full-screen (OD-7) */}
      <div className="relative w-full max-w-2xl mx-4 lg:mx-0 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ backgroundColor: `${sourceColor}10`, borderColor: `${sourceColor}30` }}>
          <div className="flex items-center gap-3">
            {/* Source badge */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
              style={{ backgroundColor: sourceColor }}
              data-testid="aggregator-source-badge"
            >
              {sourceLetter}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {source.charAt(0).toUpperCase() + source.slice(1)} Order
              </div>
              <div className="text-xs text-slate-500">
                #{order.orderNumber}
                {order.deliveryOtp && <span className="ml-2 font-mono text-slate-600">OTP: {order.deliveryOtp}</span>}
              </div>
            </div>
          </div>

          {/* Queue nav */}
          {queue.length > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={goPrev} disabled={currentIndex === 0} className="p-1 rounded hover:bg-white/50 disabled:opacity-30" data-testid="popout-prev">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-600" data-testid="popout-counter">
                {currentIndex + 1} of {queue.length}
              </span>
              <button onClick={goNext} disabled={currentIndex === queue.length - 1} className="p-1 rounded hover:bg-white/50 disabled:opacity-30" data-testid="popout-next">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Financial breakdown — GAP-2: show coupon discount */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Item Total</span>
              <span className="font-medium text-slate-700">{formatCurrency(order.itemTotal, currencySymbol)}</span>
            </div>
            {order.couponDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Discount {order.couponCode && <span className="text-xs text-slate-400">({order.couponCode})</span>}
                </span>
                <span className="font-medium text-green-600">-{formatCurrency(order.couponDiscount, currencySymbol)}</span>
              </div>
            )}
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax</span>
                <span className="font-medium text-slate-700">{formatCurrency(order.taxAmount, currencySymbol)}</span>
              </div>
            )}
            {order.deliveryCharge > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Delivery</span>
                <span className="font-medium text-slate-700">{formatCurrency(order.deliveryCharge, currencySymbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-base pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-800">Total</span>
              <span className="font-bold text-slate-900">{formatCurrency(order.amount, currencySymbol)}</span>
            </div>
          </div>

          {/* Customer + Address */}
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-slate-500">Customer: </span>
              <span className="font-medium text-slate-700">{order.customerName || '—'}</span>
              {order.phone && <span className="text-slate-400 ml-2 text-xs">{order.phone}</span>}
            </div>
            {address && (
              <div className="flex items-start gap-1.5 text-sm text-slate-500">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{address}</span>
              </div>
            )}
          </div>

          {/* Order note — GAP-1 corrected source */}
          {order.orderNote && (
            <div className="flex items-start gap-1.5 bg-amber-50 rounded-lg px-3 py-2 text-sm">
              <FileText className="w-3.5 h-3.5 mt-0.5 text-amber-500 flex-shrink-0" />
              <span className="text-amber-800">{order.orderNote}</span>
            </div>
          )}

          {/* GAP-5: Scheduled time */}
          {order.scheduledAt && (
            <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-3 py-2 text-sm">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-blue-700">Scheduled: {order.scheduledAt}</span>
            </div>
          )}

          {/* Items list */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Items ({totalQty})
            </div>
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="flex items-start justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{item.name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {item.categoryName && <span>{item.categoryName}</span>}
                      {item.notes && <span className="text-amber-500 italic">Note: {item.notes}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="text-sm text-slate-600">{item.quantity} x {formatCurrency(item.unitPrice, currencySymbol)}</div>
                    {item.discount > 0 && (
                      <div className="text-xs text-green-500">-{formatCurrency(item.discount, currencySymbol)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prep time picker — OD-4: pills + manual input */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Prep Time (required)
            </div>
            <div className="flex flex-wrap gap-2">
              {PREP_TIME_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => { setSelectedPrepTime(mins); setCustomPrepTime(''); }}
                  className={`h-9 px-4 rounded-full text-sm font-medium transition-all ${
                    selectedPrepTime === mins
                      ? 'text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={selectedPrepTime === mins ? { backgroundColor: sourceColor } : {}}
                  data-testid={`prep-time-${mins}`}
                >
                  {mins} min
                </button>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customPrepTime}
                  onChange={(e) => { setCustomPrepTime(e.target.value); setSelectedPrepTime(null); }}
                  placeholder="Custom"
                  className="w-20 h-9 px-2 rounded-full border border-slate-200 text-sm text-center focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': sourceColor }}
                  data-testid="prep-time-custom"
                />
                <span className="text-xs text-slate-400">min</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer — Actions ── */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleReject}
            className="flex-1 h-11 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 hover:border-red-300 transition-all"
            data-testid="popout-reject-btn"
          >
            <X className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            Reject
          </button>
          <button
            onClick={handleAccept}
            disabled={!effectivePrepTime || isAccepting}
            className="flex-1 h-11 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            style={{ backgroundColor: effectivePrepTime ? sourceColor : '#9CA3AF' }}
            data-testid="popout-accept-btn"
          >
            {isAccepting ? (
              <Loader2 className="w-4 h-4 inline-block animate-spin mr-1" />
            ) : (
              <Check className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            )}
            {isAccepting ? 'Accepting...' : effectivePrepTime ? `Accept (${effectivePrepTime} min)` : 'Select Prep Time'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AggregatorOrderPopOut;
