// OrderDetailSheet - Side panel for order drill-down
// Phase 4A: Order Reports - Step 7

import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Clock, CreditCard, Receipt, AlertTriangle, Bike } from 'lucide-react';
import { getOrderDetails } from '../../api/services/reportService';
import { getTabConfig } from './ReportTabs';

/**
 * Format currency with ₹ symbol
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return `₹${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
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
 * Status Badge Component
 */
const StatusBadge = ({ tabId }) => {
  const config = getTabConfig(tabId);
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-sm ${config.color} text-white`}>
      {config.label}
    </span>
  );
};

/**
 * Info Row Component
 */
const InfoRow = ({ icon: Icon, label, value, mono = false }) => (
  <div className="flex items-start gap-3 py-2">
    <Icon className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className={`text-sm text-zinc-900 ${mono ? 'font-mono' : ''} truncate`}>
        {value || '—'}
      </div>
    </div>
  </div>
);

/**
 * Section Header Component
 */
const SectionHeader = ({ title }) => (
  <div className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500 mb-3 mt-6 first:mt-0">
    {title}
  </div>
);

/**
 * Order Item Row Component
 */
const OrderItemRow = ({ item }) => (
  <div className="py-3 border-b border-zinc-100 last:border-0">
    <div className="flex justify-between items-start">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-900 truncate">
          {item.name}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">
          Qty: <span className="font-mono">{item.qty}</span>
          {item.status && (
            <span className="ml-2 text-zinc-400">• {item.status}</span>
          )}
        </div>
        {item.notes && (
          <div className="text-xs text-zinc-400 mt-1 italic">"{item.notes}"</div>
        )}
        {item.variation?.length > 0 && (
          <div className="text-xs text-zinc-400 mt-1">
            Variation: {item.variation.map(v => v.name || v).join(', ')}
          </div>
        )}
        {item.addOns?.length > 0 && (
          <div className="text-xs text-zinc-400 mt-1">
            Add-ons: {item.addOns.map(a => a.name || a).join(', ')}
          </div>
        )}
      </div>
      <div className="text-sm font-mono font-medium text-zinc-900 ml-4">
        {formatCurrency(item.price)}
      </div>
    </div>
  </div>
);

/**
 * Cancellation Alert Component (for Cancelled tab)
 */
const CancellationAlert = ({ reason, type, cancelledBy }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-sm mb-4">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-semibold text-red-900">Order Cancelled</div>
        <div className="text-sm text-red-700 mt-1">
          <strong>Reason:</strong> {reason || 'Not specified'}
        </div>
        {type && (
          <div className="text-sm text-red-700">
            <strong>Type:</strong> {type}
          </div>
        )}
        {cancelledBy && (
          <div className="text-sm text-red-700">
            <strong>Cancelled by:</strong> {cancelledBy}
          </div>
        )}
      </div>
    </div>
  </div>
);

/**
 * Aggregator Info Component (for Aggregator tab)
 */
const AggregatorInfo = ({ order }) => (
  <div className="p-4 bg-orange-50 border border-orange-200 rounded-sm mb-4">
    <div className="flex items-start gap-3">
      <Bike className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-semibold text-orange-900">Delivery Information</div>
        {order.riderName && order.riderName !== '—' && (
          <div className="text-sm text-orange-700 mt-1">
            <strong>Rider:</strong> {order.riderName}
            {order.riderPhone && <span className="font-mono ml-2">{order.riderPhone}</span>}
          </div>
        )}
        {order.deliveryAddress && (
          <div className="text-sm text-orange-700 mt-1">
            <strong>Address:</strong> {[
              order.deliveryAddress.line1,
              order.deliveryAddress.subLocality,
              order.deliveryAddress.city
            ].filter(Boolean).join(', ') || '—'}
          </div>
        )}
        {order.urbanOrderId && (
          <div className="text-sm text-orange-700 mt-1">
            <strong>Urban ID:</strong> <span className="font-mono">{order.urbanOrderId}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

/**
 * Loading Skeleton
 */
const LoadingSkeleton = () => (
  <div className="animate-pulse p-6">
    <div className="h-6 bg-zinc-200 rounded w-32 mb-4" />
    <div className="h-4 bg-zinc-100 rounded w-48 mb-6" />
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-4 h-4 bg-zinc-100 rounded" />
          <div className="flex-1">
            <div className="h-3 bg-zinc-100 rounded w-20 mb-1" />
            <div className="h-4 bg-zinc-200 rounded w-32" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * OrderDetailSheet Component
 * Glass-morphism side panel for order drill-down
 * 
 * @param {boolean} isOpen - Whether sheet is visible
 * @param {function} onClose - Callback to close sheet
 * @param {object} order - Basic order data from table
 * @param {string} tabId - Current tab for context-specific display
 */
const OrderDetailSheet = ({ isOpen, onClose, order, tabId }) => {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch full order details when order changes
  useEffect(() => {
    if (!order?.id) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getOrderDetails(order.id);
        setDetails(data);
      } catch (err) {
        console.error('Failed to fetch order details:', err);
        setError(err.message || 'Failed to load order details');
        // Fall back to basic order data
        setDetails(order);
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

  const displayData = details || order || {};

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
                   backdrop-blur-xl bg-white/80 border-l border-zinc-200 shadow-2xl
                   flex flex-col"
        data-testid="order-detail-sheet"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-zinc-900">
                Order {displayData.orderId || `#${displayData.id}`}
              </h2>
              <StatusBadge tabId={tabId} />
            </div>
            <div className="text-sm text-zinc-500 mt-1">
              {formatDateTime(displayData.createdAt)}
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
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-sm text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              {/* Cancellation Alert (Cancelled tab) */}
              {tabId === 'cancelled' && displayData.cancellationReason && (
                <CancellationAlert 
                  reason={displayData.cancellationReason}
                  type={displayData.cancellationType}
                  cancelledBy={displayData.cancelledBy}
                />
              )}

              {/* Aggregator Info (Aggregator tab) */}
              {tabId === 'aggregator' && (
                <AggregatorInfo order={displayData} />
              )}

              {/* Customer Info */}
              <SectionHeader title="Customer" />
              <div className="bg-white/50 rounded-sm border border-zinc-100 p-3">
                <InfoRow 
                  icon={User} 
                  label="Name" 
                  value={displayData.customer || displayData.customerContact?.name} 
                />
                <InfoRow 
                  icon={Phone} 
                  label="Phone" 
                  value={displayData.customerContact?.phone} 
                  mono 
                />
                {displayData.customerContact?.email && (
                  <InfoRow 
                    icon={Mail} 
                    label="Email" 
                    value={displayData.customerContact?.email} 
                  />
                )}
              </div>

              {/* Order Info */}
              <SectionHeader title="Order Details" />
              <div className="bg-white/50 rounded-sm border border-zinc-100 p-3">
                <InfoRow 
                  icon={MapPin} 
                  label="Table / Area" 
                  value={`${displayData.table || '—'}${displayData.tableArea && displayData.tableArea !== '—' ? ` (${displayData.tableArea})` : ''}`} 
                />
                <InfoRow 
                  icon={User} 
                  label="Waiter" 
                  value={displayData.waiter} 
                />
                <InfoRow 
                  icon={CreditCard} 
                  label="Payment" 
                  value={`${displayData.paymentMethod || '—'} / ${displayData.paymentType || '—'}`} 
                />
                {displayData.transactionRef && (
                  <InfoRow 
                    icon={Receipt} 
                    label="Transaction ID" 
                    value={displayData.transactionRef} 
                    mono 
                  />
                )}
              </div>

              {/* Order Items */}
              <SectionHeader title="Items" />
              <div className="bg-white/50 rounded-sm border border-zinc-100 p-3">
                {displayData.items?.length > 0 ? (
                  displayData.items.map((item, idx) => (
                    <OrderItemRow key={item.id || idx} item={item} />
                  ))
                ) : (
                  <div className="py-4 text-center text-sm text-zinc-400">
                    Item details not available
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer - Totals */}
        {!isLoading && displayData && (
          <div className="border-t border-zinc-200/50 p-6 bg-white/50">
            <div className="space-y-2">
              {displayData.subtotal !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="font-mono text-zinc-700">{formatCurrency(displayData.subtotal)}</span>
                </div>
              )}
              {displayData.tax?.total > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Tax</span>
                  <span className="font-mono text-zinc-700">{formatCurrency(displayData.tax.total)}</span>
                </div>
              )}
              {displayData.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Discount</span>
                  <span className="font-mono text-green-600">-{formatCurrency(displayData.discount)}</span>
                </div>
              )}
              {displayData.tip > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Tip</span>
                  <span className="font-mono text-zinc-700">{formatCurrency(displayData.tip)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-2 border-t border-zinc-200">
                <span className="text-zinc-900">Total</span>
                <span className="font-mono text-zinc-900">{formatCurrency(displayData.amount)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OrderDetailSheet;
