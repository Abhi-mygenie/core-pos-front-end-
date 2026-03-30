// FilterBar - Filter controls for order reports
// Phase 4A: Order Reports - Step 6

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

/**
 * Dropdown Select Component
 */
const Select = ({ 
  label, 
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

  // Close on outside click
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
      {/* Label */}
      <div className="text-xs tracking-[0.05em] uppercase font-semibold text-zinc-500 mb-1.5">
        {label}
      </div>
      
      {/* Trigger */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        data-testid={testId}
        title={disabled ? disabledTooltip : ''}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2
          border rounded-sm text-sm transition-colors text-left
          ${disabled 
            ? 'bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed opacity-50' 
            : isOpen
              ? 'bg-white border-zinc-950 ring-1 ring-zinc-950'
              : 'bg-white border-zinc-200 hover:border-zinc-400'
          }
        `}
      >
        <span className={value ? 'text-zinc-900' : 'text-zinc-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-sm shadow-lg max-h-48 overflow-y-auto">
          {/* All/Clear option */}
          <button
            onClick={() => { onChange(null); setIsOpen(false); }}
            className={`
              w-full px-3 py-2 text-sm text-left hover:bg-zinc-50 transition-colors
              ${!value ? 'bg-zinc-100 font-medium' : ''}
            `}
          >
            {placeholder}
          </button>
          
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={`
                w-full px-3 py-2 text-sm text-left hover:bg-zinc-50 transition-colors
                ${value === option.value ? 'bg-zinc-100 font-medium' : ''}
              `}
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
  { key: 'paid', label: 'Paid', color: 'bg-blue-600' },
  { key: 'cancelled', label: 'Can', color: 'bg-red-600' },
  { key: 'credit', label: 'Cre', color: 'bg-purple-600' },
  { key: 'merged', label: 'Mrg', color: 'bg-teal-600' },
  { key: 'roomTransfer', label: 'Rm', color: 'bg-indigo-600' },
  { key: 'missing', label: 'Miss', color: 'bg-red-500' },
];

/**
 * FilterBar Component
 * 
 * @param {object} filters - Current filter values { paymentMethod, paymentType, channel, platform }
 * @param {function} onFilterChange - Callback when filter changes (key, value)
 * @param {function} onClearAll - Callback to clear all filters
 * @param {object} breakdown - Status breakdown for All Orders tab { paid, cancelled, credit, merged, roomTransfer, missing }
 */
const FilterBar = ({ filters = {}, onFilterChange, onClearAll, breakdown = null }) => {
  const hasActiveFilters = Object.values(filters).some(v => v !== null && v !== undefined);

  return (
    <div 
      className="p-4 bg-white border border-zinc-200 rounded-sm"
      data-testid="filter-bar"
    >
      <div className="flex items-end justify-between gap-4 flex-wrap">
        {/* Left: Filters */}
        <div className="flex items-end gap-4 flex-wrap">
          {/* Payment Method */}
          <div className="w-40">
            <Select
              label="Payment Method"
              value={filters.paymentMethod}
              options={PAYMENT_METHOD_OPTIONS}
              onChange={(val) => onFilterChange('paymentMethod', val)}
              placeholder="All Methods"
              testId="filter-payment-method"
            />
          </div>

          {/* Payment Type */}
          <div className="w-36">
            <Select
              label="Payment Type"
              value={filters.paymentType}
              options={PAYMENT_TYPE_OPTIONS}
              onChange={(val) => onFilterChange('paymentType', val)}
              placeholder="All Types"
              testId="filter-payment-type"
            />
          </div>

          {/* Channel (Disabled - GAP-001) */}
          <div className="w-36">
            <Select
              label="Channel"
              value={filters.channel}
              options={CHANNEL_OPTIONS}
              onChange={(val) => onFilterChange('channel', val)}
              placeholder="All Channels"
              disabled={true}
              disabledTooltip="Coming soon - Backend field missing"
              testId="filter-channel"
            />
          </div>

          {/* Platform (Disabled - GAP-002) */}
          <div className="w-32">
            <Select
              label="Platform"
              value={filters.platform}
              options={PLATFORM_OPTIONS}
              onChange={(val) => onFilterChange('platform', val)}
              placeholder="All Platforms"
              disabled={true}
              disabledTooltip="Coming soon - Backend field missing"
              testId="filter-platform"
            />
          </div>

          {/* Clear All Button */}
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-sm transition-colors flex items-center gap-1"
              data-testid="filter-clear-all"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Right: Status Breakdown (All Orders tab only) */}
        {breakdown && (
          <div className="flex items-center gap-2 flex-wrap" data-testid="status-breakdown">
            {STATUS_CONFIG.map(({ key, label, color }) => {
              const count = breakdown[key] || 0;
              const isMissing = key === 'missing';
              return (
                <div 
                  key={key}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-sm ${
                    isMissing && count > 0 ? 'bg-red-50 border border-red-200' : 'bg-zinc-50 border border-zinc-100'
                  }`}
                  title={`${label}: ${count}`}
                >
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span 
                    className={`text-xs font-bold tabular-nums ${
                      isMissing && count > 0 ? 'text-red-600' : 'text-zinc-800'
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {count}
                  </span>
                  <span className={`text-xs ${isMissing && count > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
export { PAYMENT_METHOD_OPTIONS, PAYMENT_TYPE_OPTIONS };
