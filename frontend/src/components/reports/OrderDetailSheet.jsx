// OrderDetailSheet - Enhanced side panel for order drill-down
// Uses get-single-order-new endpoint for rich item data

import { useState, useEffect } from 'react';
import { 
  X, User, Phone, MapPin, Clock, CreditCard, 
  AlertTriangle, Bike, ChefHat, CheckCircle2,
  Circle, Utensils
} from 'lucide-react';
import { getSingleOrderNew } from '../../api/services/reportService';

/**
 * Format currency with ₹ symbol
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return `₹${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

/**
 * Format date/time
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  } catch {
    return '—';
  }
};

/**
 * Format time only
 */
const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  } catch {
    return '—';
  }
};

/**
 * Calculate duration between two timestamps in minutes
 */
const calculateDuration = (fromTime, toTime) => {
  if (!fromTime || !toTime) return null;
  try {
    const diffMs = new Date(toTime) - new Date(fromTime);
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 0) return null;
    if (diffMins < 1) return '<1m';
    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${diffMins}m`;
  } catch {
    return null;
  }
};

/**
 * Format payment method for display
 */
const formatPaymentMethod = (method) => {
  if (!method) return '—';
  const methodMap = {
    'cash': 'CASH',
    'cash_on_delivery': 'CASH',
    'card': 'CARD',
    'upi': 'UPI',
    'tab': 'Added to Credit',
    'Cancel': '—',
  };
  return methodMap[method.toLowerCase()] || method.toUpperCase();
};

/**
 * Format payment display with status context
 * For unpaid orders: "CASH → Unpaid"
 */
const formatPaymentDisplay = (method, paymentStatus) => {
  const base = formatPaymentMethod(method);
  if (paymentStatus === 'unpaid' && base !== '—') {
    return `${base} → Unpaid`;
  }
  return base;
};
const StatusBadge = ({ status, paymentStatus, paymentMethod, isCancelled, isMerged }) => {
  const getStatusConfig = () => {
    // Merged orders - check first (takes priority over cancelled)
    if (isMerged || paymentMethod?.toLowerCase() === 'merge') {
      return { label: 'Merged', color: 'bg-purple-600' };
    }
    // Cancelled orders - check multiple indicators
    if (isCancelled || paymentMethod?.toLowerCase() === 'cancel' || status === 'cancelled') {
      return { label: 'Cancelled', color: 'bg-red-600' };
    }
    // Credit/TAB orders - show "Added to Credit"
    if (paymentMethod?.toLowerCase() === 'tab') {
      return { label: 'Added to Credit', color: 'bg-blue-600' };
    }
    if (paymentStatus === 'paid') return { label: 'Paid', color: 'bg-emerald-600' };
    if (status === 'delivered') return { label: 'Paid', color: 'bg-emerald-600' };
    if (paymentStatus === 'unpaid') return { label: 'Unpaid', color: 'bg-amber-600' };
    return { label: status || 'Unknown', color: 'bg-zinc-600' };
  };
  
  const config = getStatusConfig();
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${config.color} text-white`}>
      {config.label}
    </span>
  );
};

/**
 * Quick Stats Chip
 */
const StatChip = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-full text-xs">
    <Icon className="w-3.5 h-3.5 text-zinc-500" />
    <span className="text-zinc-600 font-medium">{value || label}</span>
  </div>
);

/**
 * Timeline Component - GAP 3 & 4 FIX: Added Ready step and edge cases
 */
const Timeline = ({ timeline, paymentStatus, paymentMethod, orderStatus, isMerged }) => {
  // Build events based on available data
  const events = [];
  
  // Created - always present
  if (timeline?.created) {
    events.push({ key: 'created', label: 'Created', time: timeline.created, icon: Circle, color: 'text-zinc-400' });
  }
  
  // Ready - optional
  if (timeline?.ready) {
    events.push({ key: 'ready', label: 'Ready', time: timeline.ready, icon: ChefHat, color: 'text-blue-500' });
  }
  
  // Served - optional
  if (timeline?.served) {
    events.push({ key: 'served', label: 'Served', time: timeline.served, icon: Utensils, color: 'text-blue-500' });
  }
  
  // Final state: Merged, Cancelled, Added to Credit, Paid, or Unpaid
  const isCredit = paymentMethod?.toLowerCase() === 'tab';
  if (isMerged || timeline?.merged) {
    events.push({ key: 'merged', label: 'Merged', time: timeline?.merged, icon: Bike, color: 'text-purple-500' });
  } else if (orderStatus === 'cancelled' || timeline?.cancelled) {
    events.push({ key: 'cancelled', label: 'Cancelled', time: timeline?.cancelled, icon: AlertTriangle, color: 'text-red-500' });
  } else if (isCredit && timeline?.paid) {
    events.push({ key: 'credit', label: 'Added to Credit', time: timeline.paid, icon: CreditCard, color: 'text-blue-600' });
  } else if (paymentStatus === 'paid' && timeline?.paid) {
    events.push({ key: 'paid', label: 'Paid', time: timeline.paid, icon: CheckCircle2, color: 'text-emerald-600' });
  } else if (paymentStatus === 'unpaid') {
    events.push({ key: 'unpaid', label: 'Unpaid', time: null, icon: AlertTriangle, color: 'text-amber-500' });
  }

  if (events.length === 0) return null;

  return (
    <div className="flex items-center py-3 px-4 bg-zinc-50 rounded-lg mb-4 overflow-x-auto">
      {events.map((event, idx) => {
        // Calculate duration from previous event
        const prevEvent = idx > 0 ? events[idx - 1] : null;
        const duration = prevEvent && event.time ? calculateDuration(prevEvent.time, event.time) : null;
        
        return (
          <div key={event.key} className="flex items-center">
            {idx > 0 && (
              <div className="flex flex-col items-center mx-1">
                <div className="w-8 h-px bg-zinc-300" />
                {duration && (
                  <span className="text-[9px] font-mono text-zinc-500 -mt-0.5">{duration}</span>
                )}
              </div>
            )}
            <div className="flex flex-col items-center min-w-[50px]">
              <event.icon className={`w-4 h-4 ${event.color}`} />
              <span className={`text-[10px] mt-1 ${event.color}`}>{event.label}</span>
              {event.time && <span className="text-[10px] font-mono text-zinc-600">{formatTime(event.time)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Veg/Non-Veg Indicator
 */
const VegIndicator = ({ isVeg, isEgg }) => {
  if (isEgg) {
    return (
      <span className="inline-flex w-4 h-4 border-2 border-amber-500 rounded-sm items-center justify-center flex-shrink-0">
        <span className="w-2 h-2 bg-amber-500 rounded-full" />
      </span>
    );
  }
  return (
    <span className={`inline-flex w-4 h-4 border-2 ${isVeg ? 'border-green-600' : 'border-red-600'} rounded-sm items-center justify-center flex-shrink-0`}>
      <span className={`w-2 h-2 ${isVeg ? 'bg-green-600' : 'bg-red-600'} rounded-full`} />
    </span>
  );
};

/**
 * Station Badge
 */
const StationBadge = ({ station }) => {
  const colors = {
    KDS: 'bg-blue-100 text-blue-700',
    BAR: 'bg-purple-100 text-purple-700',
    PACKAGED: 'bg-amber-100 text-amber-700',
    OTHER: 'bg-zinc-100 text-zinc-700',
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[station] || colors.OTHER}`}>
      {station}
    </span>
  );
};

/**
 * Mini Timeline for Items (visual icons)
 */
const ItemTimeline = ({ item }) => {
  const events = [];
  
  // Created (use item created_at or infer from existence)
  events.push({ 
    key: 'created', 
    icon: Circle, 
    color: 'text-zinc-400',
    time: item.createdAt 
  });
  
  // Ready
  if (item.readyAt) {
    events.push({ 
      key: 'ready', 
      icon: ChefHat, 
      color: 'text-blue-500',
      time: item.readyAt 
    });
  }
  
  // Served
  if (item.serveAt) {
    events.push({ 
      key: 'served', 
      icon: Utensils, 
      color: 'text-emerald-500',
      time: item.serveAt 
    });
  }
  
  // Cancelled
  if (item.cancelAt) {
    events.push({ 
      key: 'cancelled', 
      icon: AlertTriangle, 
      color: 'text-red-500',
      time: item.cancelAt 
    });
  }

  if (events.length <= 1) return null;

  return (
    <div className="flex items-center mt-2">
      {events.map((event, idx) => {
        // Calculate duration from previous event
        const prevEvent = idx > 0 ? events[idx - 1] : null;
        const duration = prevEvent && event.time && prevEvent.time 
          ? calculateDuration(prevEvent.time, event.time) 
          : null;
        
        return (
          <div key={event.key} className="flex items-center">
            {idx > 0 && (
              <div className="flex flex-col items-center mx-0.5">
                <div className="w-5 h-px bg-zinc-300" />
                {duration && (
                  <span className="text-[8px] font-mono text-zinc-500">{duration}</span>
                )}
              </div>
            )}
            <div className="flex flex-col items-center">
              <event.icon className={`w-3 h-3 ${event.color}`} />
              <span className="text-[8px] font-mono text-zinc-500">{formatTime(event.time)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Enhanced Order Item Card
 */
const OrderItemCard = ({ item }) => {
  const hasCustomizations = (item.variations?.length > 0) || (item.addOns?.length > 0);
  const isCancelled = item.status === 3 || item.cancelAt;
  
  return (
    <div className={`py-3 border-b border-zinc-100 last:border-0 ${isCancelled ? 'opacity-60' : ''}`}>
      {/* Item Header */}
      <div className="flex items-start gap-2">
        <VegIndicator isVeg={item.isVeg} isEgg={item.isEgg} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <span className={`text-sm font-medium text-zinc-900 ${isCancelled ? 'line-through' : ''}`}>{item.name}</span>
            <span className={`text-sm font-mono font-semibold ml-2 ${isCancelled ? 'text-red-500 line-through' : 'text-zinc-900'}`}>
              {formatCurrency(item.price)}
            </span>
          </div>
          
          {/* Qty and Station */}
          <div className="flex items-center flex-wrap gap-2 mt-1 text-xs text-zinc-500">
            <span>Qty: <span className="font-mono">{item.quantity}</span></span>
            {item.quantity > 1 && (
              <span className="text-zinc-400">× {formatCurrency(item.unitPrice)}</span>
            )}
            <span className="text-zinc-300">·</span>
            <StationBadge station={item.station} />
          </div>
          
          {/* Visual Timeline for Item */}
          <ItemTimeline item={item} />
          
          {/* Item-level cancellation info */}
          {item.cancelAt && (
            <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Cancelled By: <strong>{item.cancelByName || '—'}</strong></span>
              </div>
            </div>
          )}
          
          {/* Variations */}
          {item.variations?.length > 0 && (
            <div className="mt-2 pl-2 border-l-2 border-zinc-200">
              {item.variations.map((v, idx) => (
                <div key={idx} className="text-xs text-zinc-600">
                  {v.label}
                  {v.price > 0 && <span className="text-zinc-400 ml-1">(+{formatCurrency(v.price)})</span>}
                </div>
              ))}
            </div>
          )}
          
          {/* Add-ons */}
          {item.addOns?.length > 0 && (
            <div className="mt-2 pl-2 border-l-2 border-amber-200">
              {item.addOns.map((addon, idx) => (
                <div key={idx} className="text-xs text-amber-700">
                  + {addon.name}
                  {addon.price > 0 && <span className="ml-1">(+{formatCurrency(addon.price)})</span>}
                </div>
              ))}
            </div>
          )}
          
          {/* Notes */}
          {item.notes && (
            <div className="mt-2 text-xs text-zinc-500 italic bg-zinc-50 px-2 py-1 rounded">
              "{item.notes}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Cancellation Alert
 */
const CancellationAlert = ({ cancelledAt }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
      <div>
        <div className="text-sm font-semibold text-red-900">Order Cancelled</div>
        {cancelledAt && (
          <div className="text-xs text-red-700 mt-1">
            Cancelled at {formatDateTime(cancelledAt)}
          </div>
        )}
      </div>
    </div>
  </div>
);

/**
 * Missing Order Alert
 */
const MissingOrderAlert = ({ orderId }) => (
  <div className="p-6 text-center">
    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <AlertTriangle className="w-8 h-8 text-zinc-400" />
    </div>
    <h3 className="text-lg font-semibold text-zinc-900 mb-2">Order Not Found</h3>
    <p className="text-sm text-zinc-500">
      Order #{orderId} is missing from records.<br />
      This may indicate a gap in order sequence.
    </p>
  </div>
);

/**
 * Loading Skeleton
 */
const LoadingSkeleton = () => (
  <div className="p-6">
    {/* Spinner + text */}
    <div className="flex flex-col items-center justify-center py-6 mb-6">
      <div className="w-8 h-8 border-[3px] border-zinc-200 border-t-zinc-600 rounded-full animate-spin" />
      <span className="text-sm text-zinc-400 mt-3">Loading order details...</span>
    </div>
    {/* Skeleton chips */}
    <div className="animate-pulse">
      <div className="flex gap-2 mb-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-8 bg-zinc-200 rounded-full w-24" />
        ))}
      </div>
      {/* Timeline skeleton */}
      <div className="h-14 bg-zinc-100 rounded-lg mb-4" />
      {/* Content blocks */}
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-20 bg-zinc-100 rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

/**
 * OrderDetailSheet Component
 */
const OrderDetailSheet = ({ isOpen, onClose, order, tabId }) => {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use tabId as fallback signal for merged orders
  const isMergedFromTab = tabId === 'merged';

  // Fetch order details using new endpoint
  useEffect(() => {
    if (!order?.id) {
      setDetails(null);
      return;
    }

    // Handle missing orders (from audit tab)
    if (order._isMissing) {
      setDetails(null);
      setError('missing');
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getSingleOrderNew(order.id);
        if (!data) {
          setError('not_found');
          setDetails(null);
        } else {
          setDetails(data);
        }
      } catch (err) {
        console.error('Failed to fetch order details:', err);
        setError(err.message || 'Failed to load order details');
        setDetails(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [order]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayData = details || {};
  const isMissing = error === 'missing' || error === 'not_found';
  
  // Effective merged flag: from API transform OR from tab context
  const effectiveIsMerged = displayData.isMerged || isMergedFromTab;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
        data-testid="sheet-backdrop"
      />
      
      {/* Sheet */}
      <div 
        className="fixed right-0 top-0 h-full w-[480px] max-w-full z-50 
                   bg-white border-l border-zinc-200 shadow-2xl
                   flex flex-col"
        data-testid="order-detail-sheet"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-zinc-900">
                Order {order?.orderId || displayData.orderId || `#${order?.id}`}
              </h2>
              {!isMissing && (
                <StatusBadge 
                  status={displayData.status} 
                  paymentStatus={displayData.paymentStatus}
                  paymentMethod={displayData.paymentMethod}
                  isCancelled={displayData.isCancelled}
                  isMerged={effectiveIsMerged}
                />
              )}
            </div>
            <div className="text-sm text-zinc-500 mt-1">
              {formatDateTime(displayData.createdAt || order?.createdAt)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            data-testid="sheet-close"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <LoadingSkeleton />
          ) : isMissing ? (
            <MissingOrderAlert orderId={order?.orderId || order?.id} />
          ) : error ? (
            <div className="p-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            </div>
          ) : (
            <div className="p-5">
              {/* Quick Stats Bar - 3 chips only (removed postpaid) */}
              <div className="flex flex-wrap gap-2 mb-4">
                <StatChip 
                  icon={Utensils} 
                  value={`${displayData.itemCount || 0} Items`} 
                />
                <StatChip 
                  icon={MapPin} 
                  value={displayData.table || 'Walk In'} 
                />
                <StatChip 
                  icon={CreditCard} 
                  value={formatPaymentDisplay(displayData.paymentMethod, displayData.paymentStatus)} 
                />
              </div>

              {/* Timeline */}
              <Timeline 
                timeline={displayData.timeline} 
                paymentStatus={displayData.paymentStatus}
                paymentMethod={displayData.paymentMethod}
                orderStatus={displayData.status}
                isMerged={effectiveIsMerged}
              />

              {/* Cancelled Alert */}
              {displayData.isCancelled && !effectiveIsMerged && (
                <CancellationAlert cancelledAt={displayData.cancelledAt} />
              )}

              {/* Customer Section */}
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Customer
                </div>
                <div className="bg-zinc-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-900">
                      {displayData.customer || 'Guest'}
                    </span>
                    {displayData.isGuest && (
                      <span className="text-xs text-zinc-400">· No contact info</span>
                    )}
                  </div>
                  {displayData.customerContact?.phone && (
                    <div className="flex items-center gap-2 mt-2">
                      <Phone className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-mono text-zinc-600">
                        {displayData.customerContact.phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Details Section */}
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Order Details
                </div>
                <div className="bg-zinc-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Table / Area
                    </span>
                    <span className="text-zinc-900 font-medium">{displayData.table || 'Walk In'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 flex items-center gap-2">
                      <User className="w-4 h-4" /> Punched By
                    </span>
                    <span className="text-zinc-900 font-medium">{displayData.waiter || '—'}</span>
                  </div>
                  {/* Hide Mode of Payment for cancelled orders */}
                  {!displayData.isCancelled && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Mode of Payment
                      </span>
                      <span className={`font-medium ${displayData.paymentStatus === 'unpaid' ? 'text-amber-600' : 'text-zinc-900'}`}>
                        {formatPaymentDisplay(displayData.paymentMethod, displayData.paymentStatus)}
                      </span>
                    </div>
                  )}
                  {/* Show Cancelled indicator for cancelled orders */}
                  {displayData.isCancelled && !effectiveIsMerged && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-500 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Status
                      </span>
                      <span className="text-red-600 font-medium">Cancelled</span>
                    </div>
                  )}
                  {/* Show Merged indicator for merged orders */}
                  {effectiveIsMerged && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-500 flex items-center gap-2">
                        <Bike className="w-4 h-4" /> Status
                      </span>
                      <span className="text-purple-600 font-medium">Merged</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Items
                </div>
                <div className="bg-zinc-50 rounded-lg p-3">
                  {displayData.items?.length > 0 ? (
                    displayData.items.map((item, idx) => (
                      <OrderItemCard key={item.id || idx} item={item} />
                    ))
                  ) : (
                    <div className="py-4 text-center text-sm text-zinc-400">
                      Item details not available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Bill Summary */}
        {!isLoading && !isMissing && displayData && (
          <div className="border-t border-zinc-200 p-5 bg-zinc-50">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subtotal ({displayData.itemCount || 0} items)</span>
                <span className="font-mono text-zinc-700">{formatCurrency(displayData.subtotal)}</span>
              </div>
              {displayData.amount !== displayData.subtotal && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Tax (GST)</span>
                  <span className="font-mono text-zinc-700">
                    {formatCurrency((displayData.amount || 0) - (displayData.subtotal || 0))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-zinc-300">
                <span className="text-zinc-900">Total</span>
                <span className="font-mono text-zinc-900">{formatCurrency(displayData.amount)}</span>
              </div>
            </div>
            
            {/* Payment Badge - only for paid non-cancelled non-merged orders */}
            {displayData.paymentStatus === 'paid' && !displayData.isCancelled && !effectiveIsMerged && (() => {
              const isCredit = displayData.paymentMethod?.toLowerCase() === 'tab';
              return isCredit ? (
                <div className="mt-3 flex items-center justify-center gap-2 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                  <CreditCard className="w-4 h-4" />
                  Added to Credit
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-center gap-2 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                  <CreditCard className="w-4 h-4" />
                  Paid via {formatPaymentMethod(displayData.paymentMethod)}
                </div>
              );
            })()}
            
            {/* Cancelled Badge */}
            {displayData.isCancelled && !effectiveIsMerged && (
              <div className="mt-3 flex items-center justify-center gap-2 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                Order Cancelled
              </div>
            )}
            
            {/* Merged Badge */}
            {effectiveIsMerged && (
              <div className="mt-3 flex items-center justify-center gap-2 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                <Bike className="w-4 h-4" />
                Order Merged
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default OrderDetailSheet;
