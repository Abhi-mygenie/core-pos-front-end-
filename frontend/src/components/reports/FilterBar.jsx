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
 * Payment method options
 */
const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'online', label: 'Online' },
  { value: 'TAB', label: 'TAB (Credit)' },
  { value: 'Merge', label: 'Merge' },
  { value: 'ROOM', label: 'Room' },
];

/**
 * Payment type options
 */
const PAYMENT_TYPE_OPTIONS = [
  { value: 'Prepaid', label: 'Prepaid' },
  { value: 'Postpaid', label: 'Postpaid' },
];

/**
 * Channel options (disabled - GAP-001)
 */
const CHANNEL_OPTIONS = [
  { value: 'dinein', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'room', label: 'Room Service' },
];

/**
 * Platform options (disabled - GAP-002)
 */
const PLATFORM_OPTIONS = [
  { value: 'pos', label: 'POS' },
  { value: 'web', label: 'Web' },
  { value: 'zomato', label: 'Zomato' },
  { value: 'swiggy', label: 'Swiggy' },
];

/**
 * Status breakdown pills configuration
 */
const STATUS_CONFIG = [
  { key: 'all', label: 'All', color: 'bg-zinc-800' },
  { key: 'paid', label: 'Paid', color: 'bg-blue-600' },
  { key: 'cancelled', label: 'Can', color: 'bg-red-600' },
  { key: 'credit', label: 'Cre', color: 'bg-purple-600' },
  { key: 'merged', label: 'Mrg', color: 'bg-teal-600' },
  { key: 'roomTransfer', label: 'Rm', color: 'bg-indigo-600' },
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
 * @param {object} filters - Current filter values { paymentMethod, paymentType, channel, platform }
 * @param {function} onFilterChange - Callback when filter changes (key, value)
 * @param {function} onClearAll - Callback to clear all filters
 * @param {object} breakdown - Status breakdown for All Orders tab { all, paid, cancelled, credit, merged, roomTransfer, missing }
 * @param {object} summary - Summary stats { totalOrders, totalAmount, avgOrderValue }
 * @param {number} missingCount - Number of missing orders
 * @param {object} tabSettled - TAB settlement data { total, cash, card, upi } from daily sales report
 * @param {string} activeTab - Currently active tab name (e.g., 'paid', 'cancelled', etc.)
 */
const FilterBar = ({ filters = {}, onFilterChange, onClearAll, breakdown = null, summary = null, missingCount = 0, tabSettled = null, activeTab = '' }) => {
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
            value={filters.paymentMethod}
            options={PAYMENT_METHOD_OPTIONS}
            onChange={(val) => onFilterChange('paymentMethod', val)}
            placeholder="All Methods"
            testId="filter-payment-method"
          />
          <Select
            value={filters.paymentType}
            options={PAYMENT_TYPE_OPTIONS}
            onChange={(val) => onFilterChange('paymentType', val)}
            placeholder="All Types"
            testId="filter-payment-type"
          />
          <Select
            value={filters.channel}
            options={CHANNEL_OPTIONS}
            onChange={(val) => onFilterChange('channel', val)}
            placeholder="All Channels"
            disabled={true}
            disabledTooltip="Coming soon"
            testId="filter-channel"
          />
          <Select
            value={filters.platform}
            options={PLATFORM_OPTIONS}
            onChange={(val) => onFilterChange('platform', val)}
            placeholder="All Platforms"
            disabled={true}
            disabledTooltip="Coming soon"
            testId="filter-platform"
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
export { PAYMENT_METHOD_OPTIONS, PAYMENT_TYPE_OPTIONS };
