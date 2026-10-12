/**
 * CreditCustomerDetailSheet — BUG-104 Phase 1 — SS2
 *
 * Right-side Sheet (drawer) showing the selected customer's tab history.
 * Per VQ-03 (A) credits and debits render as TWO SEPARATE sections — no
 * combined timeline, no tab switcher.
 *
 * "Record Payment" opens the SS4 modal (VQ-04 = C — separate modal).
 * Bill detail opens the SS3 nested Sheet.
 */
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, PlusCircle, AlertTriangle, Info, ChevronDown, ChevronRight, Zap, FileText, Calendar, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';
import { COLORS } from '../../constants';
import { getTabCustomerRecords } from '../../api/services/creditService';
import {
  formatINR,
  formatDateShort,
  formatPaymentMethod,
  formatTimeShort,
} from '../../api/transforms/creditTransform';
import CreditClearanceModal from './CreditClearanceModal';
import OrderDetailSheet from '../reports/OrderDetailSheet';

function SummaryTile({ label, value, sub, testId, accent }) {
  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: COLORS.sectionBg }}>
      <div className="text-xs mb-1" style={{ color: COLORS.grayText }}>{label}</div>
      <div className="text-sm font-bold" style={{ color: accent || COLORS.darkText }} data-testid={testId}>
        {value}
      </div>
      {sub ? (
        <div className="text-[11px] leading-tight mt-0.5" style={{ color: COLORS.grayText }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

/**
 * FIFO coverage inference — payments clear oldest bills first.
 * Advisory only: payments are recorded as lump sums (not bill-tagged).
 *
 * Returns one of:
 *   { type: 'covered' }
 *   { type: 'partial', coveredAmount, totalAmount }
 *   { type: 'open' }
 */
function computeFifoCoverage(credits, totalPaid) {
  const runningBefore = [];
  let acc = 0;
  credits.forEach((c) => {
    runningBefore.push(acc);
    acc += c.amount;
  });
  return credits.map((c, i) => {
    const before = runningBefore[i];
    const after = before + c.amount;
    if (totalPaid <= 0 || after <= 0) return { type: 'open' };
    if (after <= totalPaid) return { type: 'covered' };
    if (before >= totalPaid) return { type: 'open' };
    return { type: 'partial', coveredAmount: totalPaid - before, totalAmount: c.amount };
  });
}

function CoverageBadge({ status }) {
  if (!status) return null;
  if (status.type === 'covered') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
        style={{ backgroundColor: '#DCFCE7', color: '#166534' }}
        data-testid="coverage-badge-covered"
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#16A34A' }} />
        Covered
      </span>
    );
  }
  if (status.type === 'partial') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
        style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
        data-testid="coverage-badge-partial"
        title={`${formatINR(status.coveredAmount)} of ${formatINR(status.totalAmount)} covered by lump-sum payments`}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#D97706' }} />
        Partial {formatINR(status.coveredAmount)}/{formatINR(status.totalAmount)}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
      data-testid="coverage-badge-open"
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#DC2626' }} />
      Open
    </span>
  );
}

/**
 * Renders the shared columns for a credit row inside any bucket section.
 * `coverage` is the per-row FIFO coverage object.
 */
function CreditRow({ entry, index, coverage, onViewBill }) {
  const c = entry;
  return (
    <tr key={c.id} style={{ borderTop: `1px solid ${COLORS.borderGray}` }} data-testid={`credit-txn-row-${c.id}`}>
      <td className="px-3 py-2" style={{ color: COLORS.grayText }}>{index + 1}</td>
      <td className="px-3 py-2" style={{ color: COLORS.darkText }}>
        {formatDateShort(c.orderCreatedAt || c.createdAt)}
      </td>
      <td className="px-3 py-2" style={{ color: COLORS.darkText }} data-testid={`credit-txn-order-${c.id}`}>
        {c.restaurantOrderId || (c.orderId > 0 ? `#${c.orderId}` : '—')}
      </td>
      <td className="px-3 py-2 text-right font-semibold" style={{ color: COLORS.primaryOrange }} data-testid={`credit-txn-amount-${c.id}`}>
        {formatINR(c.amount)}
      </td>
      <td className="px-3 py-2" data-testid={`credit-txn-status-${c.id}`}>
        <CoverageBadge status={coverage} />
      </td>
      <td className="px-3 py-2 text-right">
        {c.hasOrderDetail ? (
          <button
            data-testid={`credit-txn-detail-btn-${c.id}`}
            onClick={() => onViewBill({ orderId: c.orderId, restaurantOrderId: c.restaurantOrderId })}
            className="text-xs font-medium px-2 py-1 rounded border"
            style={{ color: COLORS.primaryOrange, borderColor: COLORS.primaryOrange }}
          >
            View
          </button>
        ) : (
          <button
            data-testid={`credit-txn-detail-btn-disabled-${c.id}`}
            disabled
            title="Order detail not available"
            className="text-xs font-medium px-2 py-1 rounded border opacity-40 cursor-not-allowed"
            style={{ color: COLORS.grayText, borderColor: COLORS.borderGray }}
          >
            View
          </button>
        )}
      </td>
    </tr>
  );
}

const CREDIT_TABLE_HEAD = (
  <thead>
    <tr style={{ backgroundColor: COLORS.sectionBg }}>
      <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>#</th>
      <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>Date</th>
      <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>Order ID</th>
      <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>Credit ( Bill )</th>
      <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>Status</th>
      <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>Detail</th>
    </tr>
  </thead>
);

const COVERED_EXPAND_KEY = 'bug_104_covered_expanded';

export default function CreditCustomerDetailSheet({
  open,
  customer,
  paymentMethods,
  onOpenChange,
  onPaymentRecorded,
  onQuickStatement,
  onDetailedStatement,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clearanceOpen, setClearanceOpen] = useState(false);
  const [billOrder, setBillOrder] = useState(null); // { orderId, restaurantOrderId }

  // Phase 2A: client-side date range filter (temporary — Q4=C)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 3c — global persisted expand state for the Covered accordion.
  const [coveredExpanded, setCoveredExpanded] = useState(() => {
    try {
      return localStorage.getItem(COVERED_EXPAND_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const toggleCovered = () => {
    setCoveredExpanded((prev) => {
      const next = !prev;
      try { localStorage.setItem(COVERED_EXPAND_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  };

  const fetchDetail = useCallback(async () => {
    if (!customer?.id) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await getTabCustomerRecords(customer.id);
      // creditService returns a partially-transformed shape — re-fetch raw via
      // the transform to keep a single source of truth for shape contracts.
      // (creditService already returns { credits, debits, meta } in legacy shape.)
      // Build a freeze-aligned shape locally:
      const credits = (raw?.credits || []).map((c) => ({
        id: c.id,
        orderId: Number(c.order_id) || 0,
        restaurantOrderId: c.restaurant_order_id ?? null,
        amount: parseFloat(c.credit_order_amount) || 0,
        currentBalance: parseFloat(c.current_balance) || 0,
        paymentStatus: c.payment_status || '',
        createdAt: c.created_at || null,
        orderCreatedAt: c.order_created_at || null,
        hasOrderDetail: Number(c.order_id) > 0,
      }));
      const debits = (raw?.debits || []).map((d) => ({
        id: d.id,
        amount: parseFloat(d.debit_order_amount) || 0,
        currentBalance: parseFloat(d.current_balance) || 0,
        paymentMethod: d.payment_status || '',
        createdAt: d.created_at || null,
      }));
      const totalCredit = credits.reduce((s, c) => s + c.amount, 0);
      const totalPaid = debits.reduce((s, d) => s + d.amount, 0);
      setDetail({
        credits,
        debits,
        summary: {
          totalCredit,
          totalPaid,
          balance: totalCredit - totalPaid,
          tapStartDate: raw?.meta?.tapStartDate || null,
          lastCreditDate: raw?.meta?.lastCreditDate || null,
          lastCreditAmount: parseFloat(raw?.meta?.lastCreditAmount) || 0,
          lastDebitDate: raw?.meta?.lastDebitDate || null,
          lastDebitAmount: parseFloat(raw?.meta?.lastDebitAmount) || 0,
        },
      });
    } catch (err) {
      console.error('[CreditCustomerDetail]', err);
      setError('Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    if (open && customer?.id) fetchDetail();
    if (!open) {
      setDetail(null);
      setError(null);
      setClearanceOpen(false);
      setBillOrder(null);
      setDateFrom('');
      setDateTo('');
    }
  }, [open, customer?.id, fetchDetail]);

  if (!customer) return null;

  const handlePaymentSuccess = async () => {
    setClearanceOpen(false);
    await fetchDetail(); // refresh SS2
    onPaymentRecorded?.(); // refresh SS1 (and stays on this drawer)
  };

  const balance = detail?.summary?.balance ?? customer.balance ?? 0;

  // Phase 2A: client-side date filtering on already-fetched transactions (Q4=C)
  const filterByDate = (list, dateField) => {
    if (!dateFrom && !dateTo) return list;
    return list.filter((entry) => {
      const raw = entry[dateField] || entry.createdAt;
      if (!raw) return true; // keep entries with missing dates
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return true;
      const day = d.toISOString().slice(0, 10); // YYYY-MM-DD
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  };

  const filteredCredits = detail ? filterByDate(detail.credits, 'orderCreatedAt') : [];
  const filteredDebits = detail ? filterByDate(detail.debits, 'createdAt') : [];
  const hasDateFilter = !!(dateFrom || dateTo);

  // Recompute summary for filtered view
  const filteredTotalCredit = filteredCredits.reduce((s, c) => s + c.amount, 0);
  const filteredTotalPaid = filteredDebits.reduce((s, d) => s + d.amount, 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={`sm:max-w-2xl w-full ${billOrder ? 'overflow-hidden' : 'overflow-y-auto'}`}
          data-testid="credit-customer-detail-sheet"
          onEscapeKeyDown={(e) => { if (billOrder) e.preventDefault(); }}
          onPointerDownOutside={(e) => { if (billOrder) e.preventDefault(); }}
          onInteractOutside={(e) => { if (billOrder) e.preventDefault(); }}
        >
          <SheetHeader>
            <SheetTitle data-testid="credit-detail-customer-name">{customer.name || '—'}</SheetTitle>
            <SheetDescription data-testid="credit-detail-customer-mobile">
              {customer.mobile || '—'}
            </SheetDescription>
          </SheetHeader>

          {/* Outstanding hero + Record Payment */}
          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="flex-1 rounded-lg p-4" style={{ backgroundColor: COLORS.sectionBg }}>
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.grayText }}>
                Outstanding Balance
              </div>
              <div className="text-2xl font-bold" data-testid="credit-detail-balance"
                   style={{ color: balance < 0 ? COLORS.errorText : COLORS.primaryOrange }}>
                {balance < 0 && <AlertTriangle className="w-5 h-5 inline mr-1 -mt-0.5" />}
                {formatINR(balance)}
              </div>
            </div>
            <button
              data-testid="credit-record-payment-btn"
              onClick={() => setClearanceOpen(true)}
              disabled={loading || balance <= 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: COLORS.primaryOrange }}
            >
              <PlusCircle className="w-4 h-4" />
              Record Payment
            </button>
          </div>

          {/* Phase 2 Action Bar — Quick/Detailed statement + bulk settle */}
          <TooltipProvider delayDuration={300}>
            <div className="mt-3 flex items-center gap-2 flex-wrap" data-testid="credit-detail-actions-bar">
              {/* Quick Statement — instant, no item fetching */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    data-testid="credit-quick-statement-btn"
                    onClick={() => onQuickStatement?.(customer, detail, { dateFrom, dateTo })}
                    disabled={!detail}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: COLORS.primaryOrange, borderColor: COLORS.primaryOrange }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Quick Statement
                  </button>
                </TooltipTrigger>
                <TooltipContent>Transaction summary only — generates instantly</TooltipContent>
              </Tooltip>

              {/* Detailed Statement — includes bill item details (slower) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    data-testid="credit-detailed-statement-btn"
                    onClick={() => onDetailedStatement?.(customer, detail, { dateFrom, dateTo })}
                    disabled={!detail}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: COLORS.darkText, borderColor: COLORS.borderGray }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Detailed Statement
                  </button>
                </TooltipTrigger>
                <TooltipContent>Includes bill item details for each order — may take longer for large accounts</TooltipContent>
              </Tooltip>

              <div className="flex-1" />

              {/* Bulk Settle — Phase 2C placeholder */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    data-testid="credit-bulk-settle-btn"
                    disabled
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors text-zinc-300 border-zinc-200 cursor-not-allowed"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Settle All
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settle full outstanding balance in one action</p>
                  <p className="text-[10px] opacity-70 mt-0.5">Phase 2C — Requires backend batch API (BG-05)</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Date Range Filter — Phase 2A client-side (Q4=C temporary) */}
            <div className="mt-3 flex items-center gap-2 bg-zinc-50 rounded-lg px-3 py-2" data-testid="credit-date-filter">
              <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.grayText }} />
              <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>Date Range:</span>
              <input
                data-testid="credit-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-white focus:outline-none"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              />
              <span className="text-xs" style={{ color: COLORS.grayText }}>to</span>
              <input
                data-testid="credit-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-white focus:outline-none"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              />
              {(dateFrom || dateTo) && (
                <button
                  data-testid="credit-date-clear"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="text-xs px-2 py-1 rounded hover:bg-zinc-200 transition-colors"
                  style={{ color: COLORS.grayText }}
                >
                  Clear
                </button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 flex-shrink-0 cursor-help" style={{ color: COLORS.grayText }} />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Client-side date filter on loaded transactions.</p>
                  <p className="text-[10px] opacity-70 mt-0.5">Phase 2B will add backend date params with opening balance (BG-02).</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {/* Summary tiles */}
          {detail?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              <SummaryTile
                label="Total Credit"
                value={formatINR(detail.summary.totalCredit)}
                testId="credit-detail-total-credit"
                accent={COLORS.primaryOrange}
              />
              <SummaryTile
                label="Total Paid"
                value={formatINR(detail.summary.totalPaid)}
                testId="credit-detail-total-paid"
                accent={COLORS.primaryGreen}
              />
              <SummaryTile
                label="First Credit"
                value={formatDateShort(detail.summary.tapStartDate)}
                testId="credit-detail-first-tab"
              />
              <SummaryTile
                label="Last Credit"
                value={`${formatDateShort(detail.summary.lastCreditDate)} · ${formatINR(detail.summary.lastCreditAmount)}`}
                sub={formatTimeShort(detail.summary.lastCreditDate)}
                testId="credit-detail-last-credit"
              />
              <SummaryTile
                label="Last Payment"
                value={`${formatDateShort(detail.summary.lastDebitDate)} · ${formatINR(detail.summary.lastDebitAmount)}`}
                sub={formatTimeShort(detail.summary.lastDebitDate)}
                testId="credit-detail-last-payment"
              />
            </div>
          )}

          {/* States */}
          {loading ? (
            <div className="flex items-center justify-center py-20" data-testid="credit-detail-loading">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
            </div>
          ) : error ? (
            <div className="text-center py-20" data-testid="credit-detail-error">
              <p className="text-sm mb-3" style={{ color: COLORS.errorText }}>{error}</p>
              <button
                data-testid="credit-detail-retry"
                onClick={fetchDetail}
                className="text-sm font-medium px-4 py-2 rounded-lg border"
                style={{ color: COLORS.primaryOrange, borderColor: COLORS.primaryOrange }}
              >
                Retry
              </button>
            </div>
          ) : detail ? (
            <div className="mt-6 space-y-6">
              {/* Credits (Tabs opened) — Section 1 of 2 (separate per VQ-03 A).
                  Inside: three buckets (Covered accordion + Partial + Open). */}
              <section data-testid="credit-detail-credits-section">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
                    Credits — Tabs opened ({filteredCredits.length}{hasDateFilter ? ` of ${detail.credits.length}` : ''})
                  </h3>
                  <span
                    className="inline-flex items-center gap-1 text-[11px]"
                    style={{ color: COLORS.grayText }}
                    title="Bill coverage is inferred chronologically (oldest first). Payments are recorded as lump sums, not against specific bills."
                    data-testid="coverage-help-icon"
                  >
                    <Info className="w-3 h-3" />
                    Status is estimated (FIFO)
                  </span>
                </div>
                {filteredCredits.length === 0 ? (
                  <p className="text-sm py-4" style={{ color: COLORS.grayText }}>
                    {hasDateFilter ? 'No credit transactions match the selected date range.' : 'No tabs opened yet for this customer.'}
                  </p>
                ) : (() => {
                  // FIFO coverage + bucket split
                  const coverages = computeFifoCoverage(filteredCredits, filteredTotalPaid);
                  const coveredItems = [];
                  const partialItems = [];
                  const openItems = [];
                  filteredCredits.forEach((c, i) => {
                    const cov = coverages[i];
                    const entry = { credit: c, coverage: cov, originalIndex: i };
                    if (cov.type === 'covered') coveredItems.push(entry);
                    else if (cov.type === 'partial') partialItems.push(entry);
                    else openItems.push(entry);
                  });
                  const coveredAmount = coveredItems.reduce((s, e) => s + e.credit.amount, 0);
                  const partialCovered = partialItems.reduce((s, e) => s + (e.coverage.coveredAmount || 0), 0);
                  const settledTotal = coveredAmount + partialCovered;
                  const totalCredit = filteredTotalCredit || 0;
                  const settledPct = totalCredit > 0 ? Math.round((settledTotal / totalCredit) * 100) : 0;
                  const partialDue = partialItems.reduce(
                    (s, e) => s + Math.max(0, (e.credit.amount || 0) - (e.coverage.coveredAmount || 0)),
                    0,
                  );
                  const openDue = openItems.reduce((s, e) => s + e.credit.amount, 0);

                  return (
                    <div className="space-y-3" data-testid="credit-buckets">
                      {/* COVERED bucket — collapsible accordion */}
                      {coveredItems.length > 0 && (
                        <div className="rounded-lg" style={{ border: `1px solid ${COLORS.borderGray}` }} data-testid="bucket-covered">
                          <button
                            type="button"
                            onClick={toggleCovered}
                            data-testid="bucket-covered-toggle"
                            aria-expanded={coveredExpanded}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
                            style={{ backgroundColor: '#F0FDF4' }}
                          >
                            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: '#166534' }}>
                              {coveredExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#16A34A' }} />
                              {coveredItems.length} covered
                            </span>
                            <span className="text-xs" style={{ color: '#166534' }} data-testid="bucket-covered-banner">
                              {formatINR(settledTotal)} of {formatINR(totalCredit)} settled ({settledPct}%)
                            </span>
                          </button>
                          {coveredExpanded && (
                            <div className="border-t" style={{ borderColor: COLORS.borderGray }}>
                              <table className="w-full text-sm">
                                {CREDIT_TABLE_HEAD}
                                <tbody>
                                  {coveredItems.map((e) => (
                                    <CreditRow
                                      key={e.credit.id}
                                      entry={e.credit}
                                      index={e.originalIndex}
                                      coverage={e.coverage}
                                      onViewBill={setBillOrder}
                                    />
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* PARTIAL bucket — always visible if any */}
                      {partialItems.length > 0 && (
                        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.borderGray}` }} data-testid="bucket-partial">
                          <div
                            className="flex items-center justify-between px-3 py-2.5"
                            style={{ backgroundColor: '#FFFBEB' }}
                          >
                            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: '#92400E' }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#D97706' }} />
                              Partial ({partialItems.length})
                            </span>
                            <span className="text-xs" style={{ color: '#92400E' }}>
                              {formatINR(partialDue)} due on this row
                            </span>
                          </div>
                          <table className="w-full text-sm">
                            {CREDIT_TABLE_HEAD}
                            <tbody>
                              {partialItems.map((e) => (
                                <CreditRow
                                  key={e.credit.id}
                                  entry={e.credit}
                                  index={e.originalIndex}
                                  coverage={e.coverage}
                                  onViewBill={setBillOrder}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* OPEN bucket — always visible if any */}
                      {openItems.length > 0 && (
                        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.borderGray}` }} data-testid="bucket-open">
                          <div
                            className="flex items-center justify-between px-3 py-2.5"
                            style={{ backgroundColor: '#FEF2F2' }}
                          >
                            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: '#991B1B' }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#DC2626' }} />
                              Open ({openItems.length})
                            </span>
                            <span className="text-xs" style={{ color: '#991B1B' }} data-testid="bucket-open-due">
                              {formatINR(openDue)} due
                            </span>
                          </div>
                          <table className="w-full text-sm">
                            {CREDIT_TABLE_HEAD}
                            <tbody>
                              {openItems.map((e) => (
                                <CreditRow
                                  key={e.credit.id}
                                  entry={e.credit}
                                  index={e.originalIndex}
                                  coverage={e.coverage}
                                  onViewBill={setBillOrder}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </section>

              {/* Payments (Debits) — Section 2 of 2 */}
              <section data-testid="credit-detail-debits-section">
                <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.darkText }}>
                  Payments — Debits ({filteredDebits.length}{hasDateFilter ? ` of ${detail.debits.length}` : ''})
                </h3>
                {filteredDebits.length === 0 ? (
                  <p className="text-sm py-4" style={{ color: COLORS.grayText }}>
                    {hasDateFilter ? 'No payments match the selected date range.' : 'No payments recorded yet.'}
                  </p>
                ) : (
                  <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.borderGray}` }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: COLORS.sectionBg }}>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>Method</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>Debit ₹</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold uppercase" style={{ color: COLORS.grayText }}>Balance After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDebits.map((d, idx) => (
                          <tr key={d.id} style={{ borderTop: `1px solid ${COLORS.borderGray}` }} data-testid={`credit-debit-row-${d.id}`}>
                            <td className="px-3 py-2" style={{ color: COLORS.grayText }}>{idx + 1}</td>
                            <td className="px-3 py-2" style={{ color: COLORS.darkText }}>{formatDateShort(d.createdAt)}</td>
                            <td className="px-3 py-2" style={{ color: COLORS.darkText }} data-testid={`credit-debit-method-${d.id}`}>
                              {formatPaymentMethod(d.paymentMethod)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold" style={{ color: COLORS.primaryGreen }} data-testid={`credit-debit-amount-${d.id}`}>
                              {formatINR(d.amount)}
                            </td>
                            <td className="px-3 py-2 text-right" style={{ color: COLORS.darkText }} data-testid={`credit-debit-balance-${d.id}`}>
                              {formatINR(d.currentBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* SS4 modal — separate from drawer, opened from inside SS2 */}
      <CreditClearanceModal
        open={clearanceOpen}
        customer={{ ...customer, balance }}
        paymentMethods={paymentMethods}
        onClose={() => setClearanceOpen(false)}
        onSuccess={handlePaymentSuccess}
      />

      {/* SS3 — Audit-Report-style OrderDetailSheet (F-009: reuse audit pattern, exact same data mapping).
          Portaled to document.body so it escapes the CreditManagementPanel's fixed/z-50 stacking
          context and can layer above the Radix Sheet (SS2) which also portals to body at z-50. */}
      {createPortal(
        <OrderDetailSheet
          isOpen={!!billOrder}
          onClose={() => setBillOrder(null)}
          order={billOrder ? { id: billOrder.orderId, orderId: billOrder.restaurantOrderId || `#${billOrder.orderId}` } : null}
          tabId="credit"
        />,
        document.body,
      )}
    </>
  );
}
