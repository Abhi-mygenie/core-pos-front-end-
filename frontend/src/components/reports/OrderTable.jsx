// OrderTable - Dense data table for order reports
// Phase 4A: Order Reports - Step 5

import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, RotateCcw, Receipt, Printer } from 'lucide-react';
import PaymentMethodPicker from './PaymentMethodPicker';

/**
 * Format currency with ₹ symbol
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  const n = parseFloat(amount);
  const hasDecimals = n % 1 !== 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`;
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
 * CR-001 CS-7: 'audit' badge added (slate/grey palette to read as a neutral
 * "needs review" tone, distinct from missing/red and running/yellow).
 * 'transferred' kept here for legacy data only — no longer derived in CR-001.
 */
const getStatusBadgeStyle = (status) => {
  const statusStyles = {
    paid: 'bg-blue-100 text-blue-800 border-blue-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    credit: 'bg-purple-100 text-purple-800 border-purple-200',
    hold: 'bg-amber-100 text-amber-800 border-amber-200',
    merged: 'bg-teal-100 text-teal-800 border-teal-200',
    unpaid: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    transferred: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    room: 'bg-pink-100 text-pink-800 border-pink-200',
    running: 'bg-yellow-500 text-white border-yellow-600',
    missing: 'bg-red-500 text-white border-red-600',
    audit: 'bg-slate-200 text-slate-800 border-slate-300',
  };
  return statusStyles[status] || 'bg-zinc-100 text-zinc-800 border-zinc-200';
};

/**
 * Get status label
 * CR-001 CS-7: 'audit' label added.
 */
const getStatusLabel = (status) => {
  const labels = {
    paid: 'Paid',
    cancelled: 'Cancelled',
    credit: 'Credit',
    hold: 'On Hold',
    merged: 'Merged',
    unpaid: 'Unpaid',
    transferred: 'Transferred',
    room: 'Room',
    running: 'RUNNING',
    missing: 'MISSING',
    audit: 'Audit',
  };
  return labels[status] || status;
};

/**
 * Column definitions for different tabs
 */
const getColumns = (tabId, filters = {}, orders = []) => {
  // CR-005 #1 / Bucket B2-split (May-2026): conditional PG columns.
  // PG Order Id + PG Amount appear whenever the PG filter is narrowed to
  // gateway-only rows. PG Status appears ONLY when backend has started
  // populating the snapshot_razorpay_status field on at least one row in
  // the current filtered dataset (BE-W2 auto-reveal).
  // POS2-006-PG-FILTER-DROPDOWN (May-2026): with the new 3-option dropdown
  // (ALL / Non-PG / PG), the PG columns must appear ONLY for the 'gateway'
  // selection. 'nonGateway'-narrowed rows have no Razorpay IDs to display,
  // so PG columns stay hidden. 'null' (ALL) likewise hides PG columns.
  const pgFilterActive = filters.paymentGateway === 'gateway';
  const anyPgStatusReady = pgFilterActive && orders.some(o => o.pgStatus != null);
  const pgColumnsWhenActive = pgFilterActive
    ? [
        { id: 'razorpayOrderId', label: 'PG Order Id', sortable: false, width: 'w-40' },
        { id: 'pgAmount', label: 'PG Amount', sortable: true, width: 'w-24', align: 'right' },
        ...(anyPgStatusReady
          ? [{ id: 'pgStatus', label: 'PG Status', sortable: true, width: 'w-28' }]
          : []),
      ]
    : [];
  // CR-001 Phase 2 — Replaced legacy 'table' / 'waiter' columns with three
  // new columns:
  //   - 'tableNo'     — uses derived `displayLocationLabel` (table_no when
  //                     present, else order_type fallback like
  //                     "Delivery" / "Takeaway" / "Walk-in").
  //   - 'punchedBy'   — staff who punched the order (name or
  //                     "Employee #<id>" fallback).
  //   - 'actionedBy'  — dynamic per row: "Collected by <name>" / "Cancelled
  //                     by <name>" / "Merged by <name>" / "—".
  // The Order # column now renders the prefixed `displayOrderId` (T- / R-).
  // Base columns WITHOUT Payment (8 columns)
  const baseColumns = [
    { id: 'orderId', label: 'Order #', sortable: true, width: 'w-24' },
    { id: 'status', label: 'Status', sortable: true, width: 'w-28' },
    { id: 'createdAt', label: 'Time', sortable: true, width: 'w-20' },
    { id: 'customer', label: 'Customer', sortable: true, width: 'w-32' },
    { id: 'tableNo', label: 'Table No', sortable: true, width: 'w-24' },
    { id: 'punchedBy', label: 'Punched By', sortable: true, width: 'w-28' },
    { id: 'actionedBy', label: 'Actioned By', sortable: false, width: 'w-36' },
    { id: 'amount', label: 'Amount', sortable: true, width: 'w-24', align: 'right' },
  ];

  // Columns WITH Payment (for All Orders, Paid, Running tabs)
  const columnsWithPayment = [
    { id: 'orderId', label: 'Order #', sortable: true, width: 'w-24' },
    { id: 'status', label: 'Status', sortable: true, width: 'w-28' },
    { id: 'createdAt', label: 'Time', sortable: true, width: 'w-20' },
    { id: 'customer', label: 'Customer', sortable: true, width: 'w-32' },
    { id: 'tableNo', label: 'Table No', sortable: true, width: 'w-24' },
    { id: 'punchedBy', label: 'Punched By', sortable: true, width: 'w-28' },
    { id: 'actionedBy', label: 'Actioned By', sortable: false, width: 'w-36' },
    { id: 'paymentMethod', label: 'Payment', sortable: true, width: 'w-24' },
    ...pgColumnsWhenActive,
    { id: 'amount', label: 'Amount', sortable: true, width: 'w-24', align: 'right' },
  ];

  // All Orders tab: includes Payment column
  if (tabId === 'all') {
    return columnsWithPayment;
  }

  // Paid tab: includes Payment column (+ Actions column appended below)
  if (tabId === 'paid') {
    return [
      ...columnsWithPayment,
      // CR-003 — Wider actions cell to fit the two text+icon pills
      // ("Change" + "Unpaid") without overlapping the Amount column.
      // BUG-059 (Wave 4, May-2026): widened from w-44 to w-56 to fit the
      // third "Print" pill on Paid rows.
      { id: 'actions', label: '', sortable: false, width: 'w-56', align: 'right' },
    ];
  }

  // CR-001 Phase 2: Running tab now shows the Payment column so operators
  // can see method literals (notably `transferToRoom`) and tell apart real
  // running rows from billed-but-uncollected ones.
  if (tabId === 'running') {
    return columnsWithPayment;
  }

  // Cancelled tab: base + REASON + STATUS (BE-1 P4 wired 2026-05-01).
  // baseColumns is 8 entries; slice(0, 7) captures everything except the
  // trailing Amount; baseColumns[7] is Amount.
  if (tabId === 'cancelled') {
    return [
      ...baseColumns.slice(0, 7), // All except Amount
      { id: 'cancellationReason', label: 'Reason', sortable: false, width: 'w-32' },
      { id: 'cancellationType', label: 'Status', sortable: true, width: 'w-28' },
      baseColumns[7], // Amount
    ];
  }

  // Credit tab: base + PHONE. Same indexing rule as Cancelled.
  if (tabId === 'credit') {
    return [
      ...baseColumns.slice(0, 7), // All except Amount
      { id: 'customerPhone', label: 'Phone', sortable: false, width: 'w-28' },
      baseColumns[7], // Amount
    ];
  }

  // Aggregator tab: keep existing (handle later)
  if (tabId === 'aggregator') {
    return [
      { id: 'orderId', label: 'Order #', sortable: true, width: 'w-28' },
      { id: 'status', label: 'Status', sortable: true, width: 'w-24' },
      { id: 'platform', label: 'Platform', sortable: true, width: 'w-24' },
      { id: 'createdAt', label: 'Time', sortable: true, width: 'w-24' },
      { id: 'customer', label: 'Customer', sortable: true, width: 'w-40' },
      { id: 'riderName', label: 'Rider', sortable: false, width: 'w-32' },
      { id: 'amount', label: 'Amount', sortable: true, width: 'w-28', align: 'right' },
    ];
  }

  // All other tabs (Merged, Unpaid, Transferred, Hold, Audit): use base columns without Payment.
  // CR-003: Hold tab gets an Actions column appended for the per-row Collect Bill button.
  if (tabId === 'hold') {
    return [
      ...baseColumns,
      { id: 'actions', label: '', sortable: false, width: 'w-32', align: 'right' },
    ];
  }
  return baseColumns;
};

// CR-003 — Per-row eligibility for the new financial-mutation actions on the
// Audit Report. Aggregator and Room/SRM rows must NOT receive any of the new
// row buttons regardless of permissions / window state. Missing/running
// placeholder rows are also excluded.
//
// Tab-specific rules:
//   - Hold tab "Collect Bill" — eligible for any held row that isn't
//     aggregator / room / SRM / paymentMethod 'ROOM'.
//   - Paid tab "Change Payment Method" + "Mark as Unpaid" — eligible ONLY
//     when the row's current `paymentMethod` is one of cash / card / upi.
//     This intentionally excludes `transferToRoom`, `TAB`, `online`, and any
//     other non-standard method, because the Change-Method endpoint only
//     accepts cash/card/upi and flipping non-standard methods to unpaid
//     conflicts with their dedicated billing flows (e.g. room folio).
//
// NOTE: Hold-tab "Collect Bill" reuses the base eligibility check — held
// aggregator/room rows (if any leak in) should not expose Collect Bill from
// the report either.
const PAID_ACTIONS_ALLOWED_METHODS = ['cash', 'card', 'upi'];

const isOrderEligibleForRowActions = (order, tabId) => {
  if (!order || order._isMissing) return false;
  const orderIn = (order.orderIn || '').toUpperCase();
  if (orderIn === 'RM' || orderIn === 'SRM') return false;
  if ((order.paymentMethod || '').toUpperCase() === 'ROOM') return false;
  if (['zomato', 'swiggy'].includes((order.orderIn || '').toLowerCase())) return false;
  if (tabId === 'paid') {
    const pm = (order.paymentMethod || '').toLowerCase();
    if (!PAID_ACTIONS_ALLOWED_METHODS.includes(pm)) return false;
  }
  // POS2-005-FU: status-8 (Active/Unpaid Running, typically guest-prepaid via
  // PG/Razorpay) is Hold-classified for visibility but is NOT manually
  // collectable from the Hold tab. Money is in flight via the upstream
  // payment gateway; cashier recovery is via cancel / payment-retry flow,
  // not Collect Bill. status-9 (paylater) remains collectable as before.
  if (tabId === 'hold' && order.fOrderStatus === 8) return false;
  return true;
};

// CR-003 — Render the row-level action buttons for Hold/Paid tabs. Rendered
// only when an `actionsConfig` prop is supplied to <OrderTable />. Buttons
// are HIDDEN when the relevant permission is missing, and DISABLED (with a
// tooltip) when the selected report date sits outside the 2-day mutation
// window (see `isMutationAllowedForSelectedDate`).
const renderActionsCell = (order, tabId, actionsConfig) => {
  if (!actionsConfig) return null;
  if (!isOrderEligibleForRowActions(order, tabId)) return null;

  const {
    isWithinMutationWindow = false,
    canChangeMethod = false,
    canMarkUnpaid = false,
    onCollectBill,
    onChangeMethod,
    onMarkUnpaid,
    // BUG-059 (Wave 4, May-2026): per-row Print Bill on Paid tab.
    // Owner directive 2026-05-17: NO permission gate — rendered on every
    // row that passes `isOrderEligibleForRowActions`. Cancelled rows are
    // excluded by tab-level branching (no Print button in non-Paid branches).
    onPrintBill,
    // BUG-042-A (Feb-2026): when explicitly `false`, the Hold-tab Collect
    // button is rendered disabled with a tooltip explaining no eligible
    // primary payment method (Cash / Card / UPI) is configured. Defaults to
    // `undefined` for callers that don't surface the flag — preserves the
    // pre-BUG-042-A behaviour for any consumer that hasn't been updated.
    hasEligibleHoldPaymentMethod,
  } = actionsConfig;

  const disabledTitle = 'Only available for today and yesterday';
  const stop = (e) => {
    e.stopPropagation();
  };

  // Hold tab → Collect Bill button only.
  if (tabId === 'hold') {
    // BUG-042-A (Feb-2026): when AllOrdersReportPage signals no eligible
    // primary payment method is configured (cash / card / upi all absent),
    // disable the Collect Bill row action with a clear tooltip. Window
    // check still applies as the higher-priority disabler.
    const noEligibleMethod = hasEligibleHoldPaymentMethod === false;
    const disabled = !isWithinMutationWindow || noEligibleMethod;
    const title = !isWithinMutationWindow
      ? disabledTitle
      : (noEligibleMethod ? 'No eligible payment methods configured' : 'Collect bill');
    return (
      <button
        type="button"
        onClick={(e) => {
          stop(e);
          if (disabled) return;
          onCollectBill?.(order);
        }}
        disabled={disabled}
        title={title}
        data-testid={`row-action-collect-bill-${order.id}`}
        className={`
          inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors
          ${!disabled
            ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer'
            : 'border-zinc-200 text-zinc-400 cursor-not-allowed'}
        `}
      >
        <Receipt className="w-3.5 h-3.5" />
        <span>Collect</span>
      </button>
    );
  }

  // Paid tab → Change Method + Mark Unpaid + Print Bill (BUG-059).
  if (tabId === 'paid') {
    // BUG-059 (Wave 4, May-2026, Owner directive 2026-05-17):
    // Print Bill renders unconditionally on eligible Paid rows. Early-return
    // dropped so print-only operators (without `update_payment` /
    // `order_unpaid` perms) still see the Print pill alone.
    const currentMethod = (order.paymentMethod || '').toLowerCase();
    const pendingChangeMethod = !!actionsConfig.pendingChangeMethodIds?.has?.(order.id);
    return (
      <div className="flex items-center justify-end gap-1.5">
        {canChangeMethod && (
          <PaymentMethodPicker
            order={order}
            currentMethod={currentMethod}
            disabled={!isWithinMutationWindow}
            isPending={pendingChangeMethod}
            disabledTitle={disabledTitle}
            onConfirm={(newMethod) => onChangeMethod?.(order, newMethod)}
          />
        )}
        {canMarkUnpaid && (
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              if (!isWithinMutationWindow) return;
              onMarkUnpaid?.(order);
            }}
            disabled={!isWithinMutationWindow}
            title={isWithinMutationWindow ? 'Mark as unpaid' : disabledTitle}
            data-testid={`row-action-mark-unpaid-${order.id}`}
            className={`
              inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors
              ${isWithinMutationWindow
                ? 'border-amber-300 text-amber-700 hover:bg-amber-50 cursor-pointer'
                : 'border-zinc-200 text-zinc-400 cursor-not-allowed'}
            `}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Unpaid</span>
          </button>
        )}
        {/* BUG-059 (Wave 4, May-2026): Print Bill row action on Paid tab.
            Owner-approved gating (revised 2026-05-17): NO permission gate.
            NOT date-restricted (printing is read-only — not a financial
            mutation). No print on Cancelled tab (handled by branch above). */}
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            onPrintBill?.(order);
          }}
          title="Print bill"
          data-testid={`row-action-print-bill-${order.id}`}
          className="
            inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-sm border transition-colors
            border-orange-300 text-orange-700 hover:bg-orange-50 cursor-pointer
          "
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>
      </div>
    );
  }

  return null;
};

/**
 * Render cell value based on column
 */
const renderCell = (order, columnId, tabId) => {
  // Handle missing/running order placeholder
  if (order._isMissing) {
    const isRunning = order._isRunning;
    if (columnId === 'orderId') {
      return (
        <span className={`font-mono text-sm font-semibold ${isRunning ? 'text-yellow-700' : 'text-red-600'}`}>
          #{order._missingId}
        </span>
      );
    }
    if (columnId === 'status') {
      const statusKey = isRunning ? 'running' : 'missing';
      return (
        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-sm border ${getStatusBadgeStyle(statusKey)}`}>
          {getStatusLabel(statusKey)}
        </span>
      );
    }
    // For running orders, show actual data if available
    if (isRunning && order._runningData) {
      const rd = order._runningData;
      if (columnId === 'createdAt') {
        const formatTime = (dateStr) => {
          if (!dateStr) return '—';
          try {
            return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          } catch { return '—'; }
        };
        return <span className="font-mono text-sm text-yellow-700">{formatTime(rd.createdAt)}</span>;
      }
      if (columnId === 'customer') return <span className="text-sm text-yellow-700">{rd.customer || 'Guest'}</span>;
      if (columnId === 'table' || columnId === 'tableNo') return <span className="text-sm text-yellow-700">{rd.tableNumber || '—'}</span>;
      if (columnId === 'paymentMethod') return <span className="text-sm text-yellow-700">{rd.paymentStatus || '—'}</span>;
      if (columnId === 'amount') return <span className="font-mono text-sm font-medium text-yellow-700 tabular-nums">{rd.amount ? `₹${parseFloat(rd.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</span>;
    }
    return <span className="text-sm text-zinc-300">—</span>;
  }

  switch (columnId) {
    case 'orderId':
      // CR-001 Phase 2: prefer the prefixed `displayOrderId` ("T-002913" /
      // "R-002915") with graceful fallback to the raw orderId.
      // BUG-071 (Wave 5): drop the `order.orderId` and `#${order.id}` DB-id
      // fallbacks. `displayOrderId` (CR-001 Phase 2 prefixed form "T-002913"
      // / "R-002915") is already user-facing; fall back to raw `orderNumber`
      // when prefix isn't built. Missing rows hit the `_isMissing` branch
      // above and are unaffected.
      return (
        <span className="font-mono text-sm text-zinc-900">
          {order.displayOrderId || order.orderNumber || ''}
        </span>
      );
    
    case 'status': {
      // CR-001 CS-2: fallback aligns with reportService — unmatched rows
      // default to 'audit', not 'paid'. `_status` (used by `getAllOrders`)
      // is preserved for backward compatibility with the legacy combined view.
      const orderStatus = order.status || order._status || 'audit';
      return (
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm border ${getStatusBadgeStyle(orderStatus)}`}>
          {getStatusLabel(orderStatus)}
        </span>
      );
    }
    
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
      // Legacy column id (kept for any consumer still passing it). New code
      // uses `tableNo` below.
      return (
        <span className="text-sm text-zinc-600">
          {order.table || '—'}
        </span>
      );

    case 'tableNo':
      // CR-001 Phase 2: derived `displayLocationLabel` is the table_no when
      // present, otherwise an order_type fallback (Delivery / Takeaway /
      // Walk-in / Dine-in / Room / "→ R<id>").
      return (
        <span className="text-sm text-zinc-600">
          {order.displayLocationLabel || order.tableNo || order.table || '—'}
        </span>
      );

    case 'waiter':
      // Legacy column id (kept for any consumer still passing it). New code
      // uses `punchedBy` below.
      return (
        <span className="text-sm text-zinc-600 truncate">
          {order.waiter || '—'}
        </span>
      );

    case 'punchedBy':
      // CR-001 Phase 2: name resolved from waiter_name when available, else
      // "Employee #<id>" fallback. The order-logs endpoint currently does
      // NOT return waiter_name so most rows display the ID-only form.
      return (
        <span className="text-sm text-zinc-600 truncate">
          {order.punchedBy || order.waiter || '—'}
        </span>
      );

    case 'actionedBy':
      // 2026-05-01 — show name only. Column header (ACTIONED BY) conveys
      // the meaning; the "Collected by …" / "Cancelled by …" prefix was
      // visual noise and rendered orphan when no name resolved.
      return order.actionedBy ? (
        <span className="truncate text-sm text-zinc-900" data-testid={`row-actioned-by-${order.id}`}>
          {order.actionedBy}
        </span>
      ) : (
        <span className="text-sm text-zinc-300">—</span>
      );

    case 'paymentMethod': {
      // UI-COD-MASK (May-2026): `cash_on_delivery` is a backend enum value
      // that should never be surfaced to an operator. It is masked as '—'
      // across every tab. Other payment methods render as today.
      const pmLower = (order.paymentMethod || '').toLowerCase();
      if (pmLower === 'cash_on_delivery') {
        return <span className="text-sm text-zinc-400">—</span>;
      }

      // For All Orders tab, only show cash/card/upi, rest should be blank
      if (tabId === 'all') {
        if (['cash', 'card', 'upi'].includes(pmLower)) {
          return (
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm border ${getPaymentBadgeStyle(order.paymentMethod)}`}>
              {order.paymentMethod}
            </span>
          );
        }
        return <span className="text-sm text-zinc-400">—</span>;
      }
      return (
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-sm border ${getPaymentBadgeStyle(order.paymentMethod)}`}>
          {order.paymentMethod || '—'}
        </span>
      );
    }
    
    case 'amount':
      return (
        <span className="font-mono text-sm font-medium text-zinc-900 tabular-nums">
          {formatCurrency(order.amount)}
        </span>
      );
    
    // CR-005 #1 / Bucket B2-split (May-2026): PG Order Id + PG Amount +
    // PG Status (auto-revealing). All three are null-safe and render `—`
    // when backend hasn't shipped / row isn't a PG payment.
    case 'razorpayOrderId':
      return (
        <span className="text-xs font-mono text-zinc-700 truncate" title={order.razorpayOrderId || ''}>
          {order.razorpayOrderId || '—'}
        </span>
      );

    case 'pgAmount':
      return (
        <span className="font-mono text-sm text-zinc-700 tabular-nums">
          {order.pgAmount != null ? formatCurrency(order.pgAmount) : '—'}
        </span>
      );

    case 'pgStatus':
      // Dormant until backend ships BE-W2 (snapshot_razorpay_status).
      // Column visibility guard in getColumns hides this cell entirely
      // when every row's pgStatus is null — so in practice users only see
      // this cell once BE-W2 is live.
      return (
        <span className="text-xs text-zinc-700 capitalize">
          {order.pgStatus || '—'}
        </span>
      );

    case 'cancellationReason':
      return (
        <span className="text-sm text-red-600 truncate">
          {order.cancellationReason || '—'}
        </span>
      );

    case 'cancellationType':
      // BE-1 P4 wired 2026-05-01. Literals: Pre-Serve / Post-Serve
      // (whole-order cancels render blank — see reportTransform.normalizeCancelType).
      return (
        <span className="text-sm text-zinc-700" data-testid={`row-cancel-type-${order.id}`}>
          {order.cancellationType || ''}
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
 * @param {Array} orders - Sorted orders
 * @param {Object} runningOrdersMap - Map of restaurant_order_id → running order data
 */
const insertMissingOrders = (orders, runningOrdersMap = {}) => {
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
      
      // If gap is more than 1 and less than 100 (reasonable gap), insert placeholders
      const gap = currentId - nextId;
      if (gap > 1 && gap <= 100) {
        for (let missingId = currentId - 1; missingId > nextId; missingId--) {
          const runningData = runningOrdersMap[String(missingId)];
          result.push({
            _isMissing: true,
            _isRunning: !!runningData,
            _runningData: runningData || null,
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
 * OrderTable Component
 * Dense data table with sorting and row click for drill-down
 * 
 * @param {Array} orders - Array of normalized order objects
 * @param {string} tabId - Current tab id for column configuration
 * @param {string} tabLabel - Tab label for empty state
 * @param {boolean} isLoading - Show loading skeletons
 * @param {function} onRowClick - Callback when row is clicked (receives order)
 */
const OrderTable = ({ orders = [], tabId = 'paid', tabLabel = 'Paid', isLoading = false, onRowClick, runningOrdersMap = {}, showGapDetection = true, actionsConfig = null, filters = {} }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'orderId', direction: 'desc' });
  
  const columns = getColumns(tabId, filters, orders);

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

  // For "All Orders" tab, detect gaps and insert missing order placeholders.
  // CR-001 Phase 2 — G6 fix: gap detection only runs when sort is by
  // Order # descending (the natural numeric sequence). When the operator
  // sorts by any other column (Status / Time / Customer / etc.), adjacent
  // rows have unrelated order IDs and the gap detector would otherwise
  // insert phantom MISSING placeholders for IDs that are actually in the
  // dataset (just sorted to a different position). The Audit-tab missing
  // count remains accurate because it's computed at page level on the
  // numerically-sorted full list (see AllOrdersReportPage.jsx::fetchOrders).
  const showGaps =
    tabId === 'all' &&
    showGapDetection &&
    sortConfig.key === 'orderId' &&
    sortConfig.direction === 'desc';
  const ordersWithGaps = showGaps
    ? insertMissingOrders(sortedOrders, runningOrdersMap)
    : sortedOrders;

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
      {/* CR-005 #1 / Bucket B2 (May-2026): Option 1 scroll architecture fix.
          Wrap header + body in a single horizontal-scroll boundary so they
          scroll together. Body previously had its own implicit X-scroll via
          `overflow-y-auto`, causing header/body drift when combined column
          width exceeded the viewport. `inline-block min-w-full` keeps the
          intrinsic width correct so X-scroll only activates when cols
          actually overflow. */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
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
                  ? order._isRunning
                    ? 'bg-yellow-50 border-l-4 border-l-yellow-500 cursor-default'
                    : 'bg-red-50 border-l-4 border-l-red-500 cursor-default' 
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
                  {col.id === 'actions'
                    ? renderActionsCell(order, tabId, actionsConfig)
                    : renderCell(order, col.id, tabId)}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
        </div>
      </div>

      {/* Table Footer */}
      {!isLoading && orders.length > 0 && (
        <div className="bg-zinc-50 border-t border-zinc-200 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Showing <span className="font-semibold text-zinc-700">{orders.length}</span> orders
          </span>
          {tabId === 'all' && (() => {
            const runningInGaps = ordersWithGaps.filter(o => o._isMissing && o._isRunning).length;
            const missingInGaps = ordersWithGaps.filter(o => o._isMissing && !o._isRunning).reduce((c, o) => c + (o._gapCount || 1), 0);
            return (runningInGaps > 0 || missingInGaps > 0) && (
              <div className="flex items-center gap-3">
                {runningInGaps > 0 && (
                  <span className="text-xs text-yellow-600 font-medium">
                    {runningInGaps} running
                  </span>
                )}
                {missingInGaps > 0 && (
                  <span className="text-xs text-red-600 font-medium">
                    {missingInGaps} missing
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default OrderTable;
