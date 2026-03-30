// OrderTable - Dense data table for order reports
// Phase 4A: Order Reports - Step 5

import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/**
 * Format currency with ₹ symbol
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return `₹${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

/**
 * Format time from ISO string
 */
const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
};

/**
 * Get payment method badge style
 */
const getPaymentBadgeStyle = (method) => {
  const methodLower = (method || '').toLowerCase();
  if (methodLower === 'cash') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (methodLower === 'card') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (methodLower === 'upi') return 'bg-purple-100 text-purple-800 border-purple-200';
  if (methodLower === 'tab') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (methodLower === 'merge') return 'bg-teal-100 text-teal-800 border-teal-200';
  if (methodLower === 'room' || methodLower === 'transfertoroom') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  if (methodLower === 'online') return 'bg-cyan-100 text-cyan-800 border-cyan-200';
  return 'bg-zinc-100 text-zinc-800 border-zinc-200';
};

/**
 * Get aggregator platform badge
 */
const getAggregatorBadge = (platform) => {
  const p = (platform || '').toLowerCase();
  if (p.includes('zomato')) return { label: 'Zomato', style: 'bg-red-500 text-white' };
  if (p.includes('swiggy')) return { label: 'Swiggy', style: 'bg-orange-500 text-white' };
  return { label: platform, style: 'bg-zinc-500 text-white' };
};

/**
 * Get order status badge style (for All Orders tab)
 */
const getStatusBadgeStyle = (status) => {
  const statusStyles = {
    paid: 'bg-blue-100 text-blue-800 border-blue-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    credit: 'bg-purple-100 text-purple-800 border-purple-200',
    hold: 'bg-amber-100 text-amber-800 border-amber-200',
    merged: 'bg-teal-100 text-teal-800 border-teal-200',
    roomTransfer: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    missing: 'bg-red-500 text-white border-red-600',
  };
  return statusStyles[status] || 'bg-zinc-100 text-zinc-800 border-zinc-200';
};

/**
 * Get status label
 */
const getStatusLabel = (status) => {
  const labels = {
    paid: 'Paid',
    cancelled: 'Cancelled',
    credit: 'Credit',
    hold: 'On Hold',
    merged: 'Merged',
    roomTransfer: 'Room',
    missing: 'MISSING',
  };
  return labels[status] || status;
};

/**
 * Column definitions for different tabs
 */
const getColumns = (tabId) => {
  const baseColumns = [
    { id: 'orderId', label: 'Order #', sortable: true, width: 'w-28' },
    { id: 'createdAt', label: 'Time', sortable: true, width: 'w-24' },
    { id: 'customer', label: 'Customer', sortable: true, width: 'w-40' },
    { id: 'table', label: 'Table', sortable: true, width: 'w-20' },
    { id: 'waiter', label: 'Waiter', sortable: true, width: 'w-32' },
    { id: 'paymentMethod', label: 'Payment', sortable: true, width: 'w-24' },
    { id: 'amount', label: 'Amount', sortable: true, width: 'w-28', align: 'right' },
  ];

  // All Orders tab - includes Status column
  if (tabId === 'all') {
    return [
      { id: 'orderId', label: 'Order #', sortable: true, width: 'w-28' },
      { id: 'status', label: 'Status', sortable: true, width: 'w-28' },
      { id: 'createdAt', label: 'Time', sortable: true, width: 'w-24' },
      { id: 'customer', label: 'Customer', sortable: true, width: 'w-36' },
      { id: 'table', label: 'Table', sortable: true, width: 'w-20' },
      { id: 'paymentMethod', label: 'Payment', sortable: true, width: 'w-24' },
      { id: 'amount', label: 'Amount', sortable: true, width: 'w-28', align: 'right' },
    ];
  }

  // Tab-specific column adjustments
  if (tabId === 'cancelled') {
    return [
      ...baseColumns.slice(0, 5),
      { id: 'cancellationReason', label: 'Reason', sortable: false, width: 'w-40' },
      baseColumns[6], // amount
    ];
  }

  if (tabId === 'credit') {
    // Credit tab prioritizes customer contact
    return [
      { id: 'orderId', label: 'Order #', sortable: true, width: 'w-28' },
      { id: 'createdAt', label: 'Time', sortable: true, width: 'w-24' },
      { id: 'customer', label: 'Customer', sortable: true, width: 'w-48' },
      { id: 'customerPhone', label: 'Phone', sortable: false, width: 'w-32' },
      { id: 'paymentMethod', label: 'Payment', sortable: true, width: 'w-24' },
      { id: 'amount', label: 'Amount', sortable: true, width: 'w-28', align: 'right' },
    ];
  }

  if (tabId === 'aggregator') {
    return [
      { id: 'orderId', label: 'Order #', sortable: true, width: 'w-28' },
      { id: 'platform', label: 'Platform', sortable: true, width: 'w-24' },
      { id: 'createdAt', label: 'Time', sortable: true, width: 'w-24' },
      { id: 'customer', label: 'Customer', sortable: true, width: 'w-40' },
      { id: 'riderName', label: 'Rider', sortable: false, width: 'w-32' },
      { id: 'paymentMethod', label: 'Payment', sortable: true, width: 'w-24' },
      { id: 'amount', label: 'Amount', sortable: true, width: 'w-28', align: 'right' },
    ];
  }

  return baseColumns;
};

/**
 * Render cell value based on column
 */
const renderCell = (order, columnId, tabId) => {
  // Handle missing order placeholder
  if (order._isMissing) {
    if (columnId === 'orderId') {
      return (
        <span className="font-mono text-sm text-red-600 font-semibold">
          #{order._missingId}
        </span>
      );
    }
    if (columnId === 'status') {
      return (
        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-sm border ${getStatusBadgeStyle('missing')}`}>
          MISSING
        </span>
      );
    }
    return <span className="text-sm text-zinc-300">—</span>;
  }

  switch (columnId) {
    case 'orderId':
      return (
        <span className="font-mono text-sm text-zinc-900">
          {order.orderId || `#${order.id}`}
        </span>
      );
    
    case 'status':
      return (
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm border ${getStatusBadgeStyle(order._status)}`}>
          {getStatusLabel(order._status)}
        </span>
      );
    
    case 'createdAt':
      return (
        <span className="font-mono text-sm text-zinc-600">
          {formatTime(order.createdAt)}
        </span>
      );
    
    case 'customer':
      return (
        <div className="truncate">
          <span className="text-sm text-zinc-900">{order.customer || 'Guest'}</span>
        </div>
      );
    
    case 'customerPhone':
      return (
        <span className="font-mono text-sm text-zinc-600">
          {order.customerContact?.phone || '—'}
        </span>
      );
    
    case 'table':
      return (
        <span className="text-sm text-zinc-600">
          {order.table || '—'}
        </span>
      );
    
    case 'waiter':
      return (
        <span className="text-sm text-zinc-600 truncate">
          {order.waiter || '—'}
        </span>
      );
    
    case 'paymentMethod':
      return (
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm border ${getPaymentBadgeStyle(order.paymentMethod)}`}>
          {order.paymentMethod || '—'}
        </span>
      );
    
    case 'amount':
      return (
        <span className="font-mono text-sm font-medium text-zinc-900 tabular-nums">
          {formatCurrency(order.amount)}
        </span>
      );
    
    case 'cancellationReason':
      return (
        <span className="text-sm text-red-600 truncate">
          {order.cancellationReason || '—'}
        </span>
      );
    
    case 'platform':
      const badge = getAggregatorBadge(order.aggregatorPlatform || order.platform);
      return (
        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-sm ${badge.style}`}>
          {badge.label}
        </span>
      );
    
    case 'riderName':
      return (
        <span className="text-sm text-zinc-600 truncate">
          {order.riderName || '—'}
        </span>
      );
    
    default:
      return <span className="text-sm text-zinc-600">—</span>;
  }
};

/**
 * Empty State Component
 */
const EmptyState = ({ tabLabel }) => (
  <div className="py-20 text-center" data-testid="order-table-empty">
    <div className="text-zinc-300 mb-4">
      <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-zinc-900 mb-1">No {tabLabel} orders found</h3>
    <p className="text-sm text-zinc-500">Try adjusting your filters or date range.</p>
  </div>
);

/**
 * Compact Loading Indicator
 */
const LoadingIndicator = () => (
  <div className="flex items-center justify-center gap-2 py-10" data-testid="order-table-loading">
    <svg className="w-5 h-5 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <span className="text-sm text-zinc-400">Loading orders...</span>
  </div>
);

/**
 * Insert missing order placeholders for gap detection
 * Only used for "All Orders" tab
 */
const insertMissingOrders = (orders) => {
  if (orders.length < 2) return orders;

  const result = [];
  
  // Orders are sorted descending (newest first), so we look for gaps going down
  for (let i = 0; i < orders.length; i++) {
    const current = orders[i];
    result.push(current);
    
    // Check if there's a next order
    if (i < orders.length - 1) {
      const next = orders[i + 1];
      
      // Extract numeric IDs
      const currentId = parseInt(String(current.orderId || current.id).replace(/\D/g, '')) || 0;
      const nextId = parseInt(String(next.orderId || next.id).replace(/\D/g, '')) || 0;
      
      // If gap is more than 1 and less than 100 (reasonable gap), insert missing placeholders
      const gap = currentId - nextId;
      if (gap > 1 && gap <= 100) {
        for (let missingId = currentId - 1; missingId > nextId; missingId--) {
          result.push({
            _isMissing: true,
            _missingId: missingId,
            id: `missing-${missingId}`,
          });
        }
      } else if (gap > 100) {
        // Large gap - just show one placeholder indicating many missing
        result.push({
          _isMissing: true,
          _missingId: `${nextId + 1}...${currentId - 1}`,
          _gapCount: gap - 1,
          id: `missing-gap-${currentId}-${nextId}`,
        });
      }
    }
  }
  
  return result;
};

/**
 * Count missing orders
 */
const countMissingOrders = (ordersWithGaps) => {
  return ordersWithGaps.filter(o => o._isMissing).reduce((count, o) => {
    return count + (o._gapCount || 1);
  }, 0);
};

/**
 * OrderTable Component
 * Dense data table with sorting and row click for drill-down
 * 
 * @param {Array} orders - Array of normalized order objects
 * @param {string} tabId - Current tab id for column configuration
 * @param {string} tabLabel - Tab label for empty state
 * @param {boolean} isLoading - Show loading skeletons
 * @param {function} onRowClick - Callback when row is clicked (receives order)
 */
const OrderTable = ({ orders = [], tabId = 'paid', tabLabel = 'Paid', isLoading = false, onRowClick }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'orderId', direction: 'desc' });
  
  const columns = getColumns(tabId);

  // Handle sort
  const handleSort = (columnId) => {
    const column = columns.find(c => c.id === columnId);
    if (!column?.sortable) return;

    setSortConfig(prev => ({
      key: columnId,
      direction: prev.key === columnId && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Sort orders
  const sortedOrders = [...orders].sort((a, b) => {
    const { key, direction } = sortConfig;
    let aVal = a[key];
    let bVal = b[key];

    // Handle special cases
    if (key === 'amount') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    } else if (key === 'createdAt') {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    } else if (key === 'orderId') {
      // Extract numeric part for proper sorting
      aVal = parseInt(String(a.orderId || a.id).replace(/\D/g, '')) || 0;
      bVal = parseInt(String(b.orderId || b.id).replace(/\D/g, '')) || 0;
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // For "All Orders" tab, detect gaps and insert missing order placeholders
  const ordersWithGaps = tabId === 'all' ? insertMissingOrders(sortedOrders) : sortedOrders;

  // Render sort icon
  const renderSortIcon = (columnId) => {
    const column = columns.find(c => c.id === columnId);
    if (!column?.sortable) return null;

    if (sortConfig.key === columnId) {
      return sortConfig.direction === 'asc' 
        ? <ChevronUp className="w-3.5 h-3.5" />
        : <ChevronDown className="w-3.5 h-3.5" />;
    }
    return <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-300" />;
  };

  return (
    <div 
      className="bg-white border border-zinc-200 rounded-sm overflow-hidden"
      data-testid="order-table"
    >
      {/* Table Header */}
      <div className="bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center px-4 py-3">
          {columns.map((col) => (
            <div
              key={col.id}
              className={`${col.width} flex-shrink-0 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
            >
              <button
                onClick={() => handleSort(col.id)}
                disabled={!col.sortable}
                className={`
                  inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide
                  ${col.sortable ? 'text-zinc-700 hover:text-zinc-900 cursor-pointer' : 'text-zinc-500 cursor-default'}
                  ${col.align === 'right' ? 'flex-row-reverse' : ''}
                `}
                data-testid={`sort-${col.id}`}
              >
                {col.label}
                {renderSortIcon(col.id)}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-zinc-100 max-h-[480px] overflow-y-auto">
        {isLoading ? (
          <LoadingIndicator />
        ) : ordersWithGaps.length === 0 ? (
          <EmptyState tabLabel={tabLabel} />
        ) : (
          ordersWithGaps.map((order) => (
            <div
              key={order.id}
              onClick={() => !order._isMissing && onRowClick?.(order)}
              className={`
                flex items-center px-4 py-3 transition-colors
                ${order._isMissing 
                  ? 'bg-red-50 border-l-4 border-l-red-500 cursor-default' 
                  : 'hover:bg-zinc-50 cursor-pointer'
                }
              `}
              data-testid={`order-row-${order.id}`}
            >
              {columns.map((col) => (
                <div
                  key={col.id}
                  className={`${col.width} flex-shrink-0 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {renderCell(order, col.id, tabId)}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Table Footer */}
      {!isLoading && orders.length > 0 && (
        <div className="bg-zinc-50 border-t border-zinc-200 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Showing <span className="font-semibold text-zinc-700">{orders.length}</span> orders
          </span>
          {tabId === 'all' && countMissingOrders(ordersWithGaps) > 0 && (
            <span className="text-xs text-red-600 font-medium">
              ⚠️ {countMissingOrders(ordersWithGaps)} missing in sequence
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderTable;
