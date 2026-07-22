// FilterBar - Filter controls for order reports
// Phase 4A: Order Reports - Step 6

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

/**
 * Compact inline dropdown
 */
const Select = ({ 
  value, 
  options, 
  onChange, 
  disabled = false, 
  disabledTooltip = '',
  placeholder = 'All',
  testId 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        data-testid={testId}
        title={disabled ? disabledTooltip : ''}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5
          border rounded text-xs font-medium transition-colors whitespace-nowrap
          ${disabled 
            ? 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed opacity-50' 
            : isOpen
              ? 'bg-white border-zinc-950 ring-1 ring-zinc-950'
              : value
                ? 'bg-zinc-900 border-zinc-900 text-white'
                : 'bg-white border-zinc-300 hover:border-zinc-400 text-zinc-600'
          }
        `}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 min-w-[140px] mt-1 bg-white border border-zinc-200 rounded shadow-lg max-h-48 overflow-y-auto">
          <button
            onClick={() => { onChange(null); setIsOpen(false); }}
            className={`w-full px-3 py-2 text-xs text-left hover:bg-zinc-50 transition-colors ${!value ? 'bg-zinc-100 font-medium' : ''}`}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={`w-full px-3 py-2 text-xs text-left hover:bg-zinc-50 transition-colors ${value === option.value ? 'bg-zinc-100 font-medium' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Status filter options
 * CR-001 CS-10: Added 'On Hold'.
 * CR-001 CS-19: Removed 'Transferred' (no longer derived).
 */
const STATUS_FILTER_OPTIONS = [
  { value: 'paid', label: 'Settled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'merged', label: 'Merged' },
  { value: 'credit', label: 'Credit' },
  // CR-001 follow-up: 'Running' added so operators can narrow the (now merged)
  // Running tab — or any tab — to just open/in-progress rows.
  { value: 'running', label: 'Running' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'hold', label: 'On Hold' },
];

const PAYMENT_TYPE_OPTIONS = [
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'postpaid', label: 'Postpaid' },
];

/**
 * Payment method options
 */
const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
];

/**
 * Channel options
 * CR-001 CS-11/CS-20 + Q-B: Final canonical list — Dine-in / Takeaway / Delivery only.
 *  - 'Room' removed (room orders excluded globally from Audit Report).
 *  - 'Aggregator' is OUT of channel filter; Aggregator stays as its own tab (Q-C).
 */
const CHANNEL_OPTIONS = [
  { value: 'dinein', label: 'Dine-in' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'delivery', label: 'Delivery' },
];

/**
 * Platform options (CR-001 CS-15)
 * Visibility is controlled by the page via `hasPlatformData` prop (Q-F):
 * the dropdown is hidden entirely when backend `order_from` data is not
 * consistently present.
 */
const PLATFORM_OPTIONS = [
  { value: 'pos', label: 'POS' },
  { value: 'web', label: 'Web' },
];

/**
 * Payment Gateway options (CR-001 CS-23..CS-28 + Phase 2 Q-B + POS2-006-PG-FILTER-DROPDOWN 2026-05-09)
 *
 * POS2-006-PG-FILTER-DROPDOWN (May-2026): Owner-locked re-shape of the
 * checkbox toggle into a 3-option dropdown. The internal state machine
 * uses three values for the `paymentGateway` filter key:
 *   - `null`         → no narrowing (Default / "ALL" mode)
 *   - `'nonGateway'` → narrow to orders WITHOUT `razorpay_order_id`
 *   - `'gateway'`    → narrow to orders WITH    `razorpay_order_id`
 *
 * The dropdown is visible across all report tabs (locked items 3 + 4).
 * Selection persists across tab navigation (locked item 5).
 * Default selection is `null` = "ALL" (locked item 6).
 *
 * The exported list below is consumed by FilterTags.jsx to render the
 * active-filter chip for `'gateway'` and `'nonGateway'`. The 'ALL'
 * option carries value === null and is filtered out by FilterTags so it
 * never produces a chip.
 */
const PAYMENT_GATEWAY_OPTIONS = [
  { value: 'nonGateway', label: 'Non-PG' },
  { value: 'gateway',    label: 'PG' },
];

/**
 * Status breakdown pills configuration
 * CR-001 CS-21 + Q-E: 'roomTransfer' (Rm) pill removed. Hold and Audit counts
 * are carried in `statusBreakdown` state on the page but are intentionally
 * NOT visualized as pills here — only the existing pills minus 'roomTransfer'.
 */
const STATUS_CONFIG = [
  { key: 'all', label: 'All', color: 'bg-zinc-800' },
  { key: 'paid', label: 'Settled', color: 'bg-blue-600' },
  { key: 'cancelled', label: 'Can', color: 'bg-red-600' },
  { key: 'credit', label: 'Cre', color: 'bg-purple-600' },
  { key: 'merged', label: 'Mrg', color: 'bg-teal-600' },
  { key: 'running', label: 'Run', color: 'bg-yellow-500' },
  { key: 'missing', label: 'Miss', color: 'bg-red-500' },
];

/**
 * Format currency for compact display
 */
const formatCompactCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
};

/**
 * FilterBar Component
 *
 * @param {object} filters - Current filter values { status, paymentMethod, paymentType, channel, platform, paymentGateway }
 * @param {function} onFilterChange - Callback when filter changes (key, value)
 * @param {function} onClearAll - Callback to clear all filters
 * @param {object} breakdown - Status breakdown for All Orders tab
 * @param {object} summary - Summary stats { totalOrders, totalAmount, avgOrderValue }
 * @param {number} missingCount - Number of missing orders
 * @param {object} tabSettled - TAB settlement data (legacy prop, accepted but unused)
 * @param {string} activeTab - Currently active tab name
 * @param {boolean} hasPlatformData - CR-001 Q-F: when false, the Platform filter
 *   dropdown is hidden entirely (not just disabled). Defaults to false so the
 *   filter is hidden if the page does not yet know whether `order_from` is
 *   present on the response.
 */
const FilterBar = ({
  filters = {},
  onFilterChange,
  onClearAll,
  breakdown = null,
  summary = null,
  missingCount = 0,
  tabSettled = null,
  activeTab = '',
  hasPlatformData = false,
}) => {
  const hasActiveFilters = Object.values(filters).some(v => v !== null && v !== undefined);

  return (
    <div 
      className="bg-white border border-zinc-200 rounded-sm"
      data-testid="filter-bar"
    >
      {/* Row 1: Filters + Summary Stats */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Select
            value={filters.paymentType}
            options={PAYMENT_TYPE_OPTIONS}
            onChange={(val) => onFilterChange('paymentType', val)}
            placeholder="Pay Type"
            testId="filter-payment-type"
          />
          <Select
            value={filters.status}
            options={STATUS_FILTER_OPTIONS}
            onChange={(val) => onFilterChange('status', val)}
            placeholder="Status"
            testId="filter-status"
          />
          <Select
            value={filters.paymentMethod}
            options={PAYMENT_METHOD_OPTIONS}
            onChange={(val) => onFilterChange('paymentMethod', val)}
            placeholder="Payment"
            testId="filter-payment-method"
          />
          <Select
            value={filters.channel}
            options={CHANNEL_OPTIONS}
            onChange={(val) => onFilterChange('channel', val)}
            placeholder="Channel"
            testId="filter-channel"
          />
          {/* CR-001 Q-F: Platform filter hidden entirely when backend data
              is not consistently present. No "Coming soon" tooltip — full hide. */}
          {hasPlatformData && (
            <Select
              value={filters.platform}
              options={PLATFORM_OPTIONS}
              onChange={(val) => onFilterChange('platform', val)}
              placeholder="Platform"
              testId="filter-platform"
            />
          )}
          {/* POS2-006-PG-FILTER-DROPDOWN (May-2026): Owner-locked replacement
              of the 2-checkbox toggle (☐ All ☐ PG) with a 3-option
              dropdown (ALL / Non-PG / PG). Locked behaviour:
                - Visible across all report tabs (item 3).
                - No reset on tab change (item 4); selection persists
                  across tabs (item 5).
                - Default value = ALL = `paymentGateway: null` (item 6).
                - Non-PG branch enabled in OrderTable column predicate
                  (item 7) and AllOrdersReportPage row predicate (item 7).
                - No backend / profile PG-flag inference (item 9): the
                  dropdown stays visible regardless of tenant PG config. */}
          <Select
            value={filters.paymentGateway}
            options={PAYMENT_GATEWAY_OPTIONS}
            onChange={(val) => onFilterChange('paymentGateway', val)}
            placeholder="ALL"
            testId="filter-payment-gateway"
          />
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
              data-testid="filter-clear-all"
              title="Clear filters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Summary Stats */}
        {summary && (
          <div className="flex items-center gap-4 flex-shrink-0" data-testid="compact-summary">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-zinc-900 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {summary.totalOrders}
              </span>
              {missingCount > 0 && (
                <span className="text-xs font-bold text-red-600 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  ({missingCount})
                </span>
              )}
              <span className="text-[10px] uppercase text-zinc-400 font-medium tracking-wide">orders</span>
            </div>
            <div className="w-px h-5 bg-zinc-200" />
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-zinc-900 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCompactCurrency(summary.totalAmount)}
              </span>
              <span className="text-[10px] uppercase text-zinc-400 font-medium tracking-wide">total</span>
            </div>
            {/* TAB Settlement - Removed as per user request */}
            <div className="w-px h-5 bg-zinc-200" />
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-zinc-900 tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCompactCurrency(summary.avgOrderValue)}
              </span>
              <span className="text-[10px] uppercase text-zinc-400 font-medium tracking-wide">avg</span>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Status Breakdown Pills (full width) */}
      {breakdown && (
        <div 
          className="flex items-center gap-2 px-4 py-2 border-t border-zinc-100"
          data-testid="status-breakdown"
        >
          {STATUS_CONFIG.map(({ key, label, color }) => {
            const count = breakdown[key] || 0;
            const isHighlight = key === 'missing' || key === 'running';
            const isAll = key === 'all';
            const highlightBg = key === 'missing' ? 'bg-red-50 border border-red-200' : key === 'running' ? 'bg-yellow-50 border border-yellow-200' : '';
            const highlightText = key === 'missing' ? 'text-red-600' : key === 'running' ? 'text-yellow-600' : '';
            const highlightLabel = key === 'missing' ? 'text-red-500' : key === 'running' ? 'text-yellow-500' : '';
            return (
              <div 
                key={key}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs ${
                  isHighlight && count > 0 
                    ? highlightBg 
                    : isAll 
                      ? 'bg-zinc-100'
                      : 'bg-zinc-50'
                }`}
                title={`${label}: ${count}`}
              >
                <span className={`w-2 h-2 rounded-full ${color}`} />
                <span 
                  className={`font-bold tabular-nums ${
                    isHighlight && count > 0 ? highlightText : isAll ? 'text-zinc-900' : 'text-zinc-700'
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {count}
                </span>
                <span className={`${isHighlight && count > 0 ? highlightLabel : 'text-zinc-400'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
export {
  STATUS_FILTER_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  CHANNEL_OPTIONS,
  PLATFORM_OPTIONS,
  PAYMENT_GATEWAY_OPTIONS,
};
