/**
 * CreditCustomerList — BUG-104 Phase 1 + Phase 2A UI
 *
 * SS1: Customer list table with search, filter, KPI strip, and Phase 2 action buttons.
 *
 * Phase 2A buttons (enabled, wired in implementation pass):
 *   - Per-row: Download PDF
 *   - KPI: 3-tile strip (Total Credit / Total Paid / Outstanding)
 *
 * Phase 2B/2C buttons (muted with tooltip, not yet wired):
 *   - Per-row: WhatsApp share
 *   - Header: Bulk Download
 */
import { useMemo } from 'react';
import { Search, X, AlertTriangle, Loader2, Download, MessageCircle, FileDown, FileSpreadsheet } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';
import { COLORS } from '../../constants';
import { formatINR } from '../../api/transforms/creditTransform';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'with_balance', label: 'With Balance' },
  { value: 'settled', label: 'Settled' },
];

function BalanceCell({ value }) {
  if (value > 0) {
    return (
      <span className="font-semibold" style={{ color: COLORS.darkText }}>
        {formatINR(value)}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="font-semibold inline-flex items-center gap-1" style={{ color: COLORS.errorText }}>
        <AlertTriangle className="w-3.5 h-3.5" />
        {formatINR(value)}
      </span>
    );
  }
  return <span style={{ color: COLORS.grayText }}>{formatINR(0)}</span>;
}

/**
 * Phase 2 action button with tooltip wrapper.
 * `enabled` = true for Phase 2A buttons ready for implementation.
 * `enabled` = false for Phase 2B/2C placeholder buttons.
 */
function ActionIconBtn({ icon: Icon, tooltip, enabled, onClick, testId, phase }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          data-testid={testId}
          onClick={(e) => {
            e.stopPropagation();
            if (enabled && onClick) onClick();
          }}
          disabled={!enabled}
          className={`p-1.5 rounded-md transition-colors ${
            enabled
              ? 'hover:bg-orange-50 text-zinc-600 hover:text-orange-600 cursor-pointer'
              : 'text-zinc-300 cursor-not-allowed'
          }`}
          aria-label={tooltip}
        >
          <Icon className="w-4 h-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-center">
        <p>{tooltip}</p>
        {phase && <p className="text-[10px] opacity-70 mt-0.5">{phase}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export default function CreditCustomerList({
  customers,
  loading,
  error,
  searchQuery,
  filterType,
  onSearchChange,
  onFilterChange,
  onSelectCustomer,
  onRetry,
  onDownloadStatement,
  onPortfolioExport,
  generatingStatement,
  totalCredit: totalCreditProp,
  totalPaid: totalPaidProp,
}) {
  const filtered = useMemo(() => {
    let list = customers;
    if (filterType === 'with_balance') list = list.filter((c) => c.balance > 0);
    if (filterType === 'settled') list = list.filter((c) => c.balance <= 0);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.mobile || '').includes(q) ||
          (c.email || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [customers, filterType, searchQuery]);

  // KPI derivations
  const outstanding = useMemo(
    () => customers.reduce((s, c) => s + (Number(c.balance) || 0), 0),
    [customers],
  );
  const withBalanceCount = useMemo(
    () => customers.filter((c) => (Number(c.balance) || 0) > 0).length,
    [customers],
  );

  // Backend-provided totals (BG-01 in-flight). Null = not yet available.
  const hasTotals = totalCreditProp != null && totalPaidProp != null;

  return (
    <TooltipProvider delayDuration={300}>
      <div data-testid="credit-customer-list">
        {/* KPI strip — Phase 2A: upgraded to 3 tiles when backend ships BG-01 */}
        {!loading && !error && (
          <div className="mb-4" data-testid="credit-kpi-strip">
            <div className="grid grid-cols-3 gap-3">
              {/* Total Credit tile */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-white rounded-lg shadow-sm px-4 py-3" data-testid="credit-kpi-total-credit">
                    <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.grayText }}>
                      Total Credit
                    </div>
                    <div className="text-xl font-bold mt-1" style={{ color: hasTotals ? COLORS.primaryOrange : COLORS.grayText }}>
                      {hasTotals ? formatINR(totalCreditProp) : '—'}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {hasTotals
                    ? 'Lifetime total credit across all customers'
                    : 'Awaiting backend to provide total_credit on list API (BG-01)'}
                </TooltipContent>
              </Tooltip>

              {/* Total Paid tile */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-white rounded-lg shadow-sm px-4 py-3" data-testid="credit-kpi-total-paid">
                    <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.grayText }}>
                      Total Paid
                    </div>
                    <div className="text-xl font-bold mt-1" style={{ color: hasTotals ? '#16A34A' : COLORS.grayText }}>
                      {hasTotals ? formatINR(totalPaidProp) : '—'}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {hasTotals
                    ? 'Lifetime total payments received'
                    : 'Awaiting backend to provide total_paid on list API (BG-01)'}
                </TooltipContent>
              </Tooltip>

              {/* Outstanding tile (always available) */}
              <div className="bg-white rounded-lg shadow-sm px-4 py-3" data-testid="credit-kpi-outstanding-tile">
                <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.grayText }}>
                  Outstanding
                </div>
                <div className="text-xl font-bold mt-1" data-testid="credit-kpi-outstanding"
                     style={{ color: COLORS.primaryOrange }}>
                  {formatINR(outstanding)}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: COLORS.grayText }}>
                  {customers.length} customers · {withBalanceCount} with balance
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header row: search + filter + bulk actions */}
        <div className="flex gap-3 bg-white rounded-lg p-3 shadow-sm mb-4 items-center">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.grayText }} />
            <input
              data-testid="credit-search-input"
              type="text"
              placeholder="Search by name, mobile or email"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-white border rounded-lg px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-1"
              style={{ borderColor: COLORS.borderGray }}
            />
            {searchQuery && (
              <button
                data-testid="credit-search-clear"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
              </button>
            )}
          </div>
          <select
            data-testid="credit-filter-dropdown"
            value={filterType}
            onChange={(e) => onFilterChange(e.target.value)}
            className="bg-white border rounded-lg px-4 py-2.5 text-sm focus:outline-none"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText, minWidth: 140 }}
          >
            {FILTER_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Portfolio Summary — single PDF with all customers */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                data-testid="credit-portfolio-export-btn"
                onClick={() => {
                  const label = filterType === 'with_balance' ? 'With Balance' : filterType === 'settled' ? 'Settled' : 'All';
                  onPortfolioExport?.(filtered, label);
                }}
                disabled={generatingStatement || filtered.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: COLORS.primaryOrange, borderColor: COLORS.primaryOrange }}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Portfolio Summary
              </button>
            </TooltipTrigger>
            <TooltipContent>Export a single PDF with all customers — Total Credit, Total Paid, Outstanding</TooltipContent>
          </Tooltip>

          {/* Bulk Download — Phase 2B placeholder */}
          <ActionIconBtn
            icon={FileDown}
            tooltip="Download PDF statements for all filtered customers"
            enabled={false}
            testId="credit-bulk-download-btn"
            phase="Phase 2B — Bulk PDF export"
          />
        </div>

        {/* States */}
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-lg shadow-sm" data-testid="credit-list-loading">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.primaryOrange }} />
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm" data-testid="credit-list-error">
            <p className="text-sm mb-3" style={{ color: COLORS.errorText }}>
              {error}
            </p>
            <button
              data-testid="credit-list-retry"
              onClick={onRetry}
              className="text-sm font-medium px-4 py-2 rounded-lg border"
              style={{ color: COLORS.primaryOrange, borderColor: COLORS.primaryOrange }}
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm" data-testid="credit-list-empty">
            <p className="text-sm" style={{ color: COLORS.grayText }}>
              {searchQuery || filterType !== 'all'
                ? 'No customers match your search.'
                : 'No credit customers yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr
                  style={{ backgroundColor: COLORS.sectionBg, borderBottom: `1px solid ${COLORS.borderGray}` }}
                  className="text-xs font-semibold uppercase tracking-wider"
                >
                  <th className="px-5 py-3 text-left" style={{ color: COLORS.grayText }}>Customer Name</th>
                  <th className="px-5 py-3 text-left" style={{ color: COLORS.grayText }}>Mobile</th>
                  <th className="px-5 py-3 text-right" style={{ color: COLORS.grayText }}>Outstanding Balance</th>
                  <th className="px-5 py-3 text-center" style={{ color: COLORS.grayText }}>Quick Actions</th>
                  <th className="px-5 py-3 text-right" style={{ color: COLORS.grayText }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
                    onClick={() => onSelectCustomer(c)}
                    data-testid={`credit-customer-row-${c.id}`}
                  >
                    <td className="px-5 py-3.5 text-sm font-medium" style={{ color: COLORS.darkText }} data-testid={`credit-customer-name-${c.id}`}>
                      {c.name || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm" style={{ color: COLORS.darkText }} data-testid={`credit-customer-mobile-${c.id}`}>
                      {c.mobile || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-right" data-testid={`credit-customer-balance-${c.id}`}>
                      <BalanceCell value={c.balance} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Download PDF — Phase 2A (will be wired) */}
                        <ActionIconBtn
                          icon={Download}
                          tooltip="Download credit statement PDF for this customer"
                          enabled={true}
                          onClick={() => onDownloadStatement?.(c)}
                          testId={`credit-download-btn-${c.id}`}
                          phase="Phase 2A"
                        />
                        {/* WhatsApp share — Phase 2B placeholder */}
                        <ActionIconBtn
                          icon={MessageCircle}
                          tooltip="Share credit statement via WhatsApp"
                          enabled={false}
                          testId={`credit-whatsapp-btn-${c.id}`}
                          phase="Phase 2B — WhatsApp share"
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        data-testid={`credit-customer-action-${c.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCustomer(c);
                        }}
                        className="text-sm font-medium px-3 py-1.5 rounded-md border"
                        style={{ color: COLORS.primaryOrange, borderColor: COLORS.primaryOrange }}
                      >
                        View / Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 text-xs" style={{ color: COLORS.grayText, backgroundColor: COLORS.sectionBg }}>
              Showing {filtered.length} of {customers.length} customers
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
