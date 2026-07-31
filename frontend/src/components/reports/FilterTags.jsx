// FilterTags - Removable active filter badges
// Phase 4A: Order Reports - Step 6
// CR-001 CS-15 + CS-23..CS-28: rendering for `platform` and `paymentGateway`
// (tri-state) was missing — added so active platform / Gateway / Non-Gateway
// selections appear as readable, removable chips alongside Status / Payment /
// Channel.

import { X } from 'lucide-react';
import {
  STATUS_FILTER_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  CHANNEL_OPTIONS,
  PLATFORM_OPTIONS,
  PAYMENT_GATEWAY_OPTIONS,
} from './FilterBar';

/**
 * Get display label for a filter value.
 * Falls back to the raw value when the option is not registered.
 */
const getFilterLabel = (key, value) => {
  if (key === 'status') {
    return STATUS_FILTER_OPTIONS.find(o => o.value === value)?.label || value;
  }
  if (key === 'paymentType') {
    return PAYMENT_TYPE_OPTIONS.find(o => o.value === value)?.label || value;
  }
  if (key === 'paymentMethod') {
    return PAYMENT_METHOD_OPTIONS.find(o => o.value === value)?.label || value;
  }
  if (key === 'channel') {
    return CHANNEL_OPTIONS.find(o => o.value === value)?.label || value;
  }
  if (key === 'platform') {
    return PLATFORM_OPTIONS.find(o => o.value === value)?.label || value;
  }
  if (key === 'paymentGateway') {
    // POS2-006-PG-FILTER-DROPDOWN (May-2026): PG filter is now a 3-option
    // dropdown (ALL / Non-PG / PG). The 'ALL' option carries value === null
    // and is filtered out upstream so it never produces a chip. Both
    // `'gateway'` and `'nonGateway'` surface here, rendered as 'PG' and
    // 'Non-PG' respectively via the PAYMENT_GATEWAY_OPTIONS lookup.
    return PAYMENT_GATEWAY_OPTIONS.find(o => o.value === value)?.label || value;
  }
  return value;
};

/**
 * Get filter category label
 */
const getCategoryLabel = (key) => {
  const labels = {
    paymentType: 'Pay Type',
    status: 'Status',
    paymentMethod: 'Payment',
    channel: 'Channel',
    platform: 'Platform',
    paymentGateway: 'Payment Gateway',
  };
  return labels[key] || key;
};

/**
 * FilterTags Component
 * Displays removable badges for active filters
 *
 * @param {object} filters - Current filter values (status, paymentMethod,
 *   channel, platform, paymentGateway). `null`/`undefined` means inactive.
 * @param {function} onRemove - Callback to remove a filter (key)
 * @param {function} onClearAll - Callback to clear all filters
 */
const FilterTags = ({ filters = {}, onRemove, onClearAll }) => {
  // Active filters = any entry whose value is not null/undefined.
  // The PG tri-state's "All" option carries value === null, so it is
  // automatically excluded by this rule (CS-23..CS-28).
  const activeFilters = Object.entries(filters).filter(
    // eslint-disable-next-line no-unused-vars
    ([_, value]) => value !== null && value !== undefined
  );

  if (activeFilters.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 flex-wrap mb-4"
      data-testid="filter-tags"
    >
      <span className="text-xs text-zinc-500 mr-1">Active filters:</span>

      {activeFilters.map(([key, value]) => (
        <div
          key={key}
          className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-sm text-sm hover:bg-zinc-200 transition-colors"
          data-testid={`filter-tag-${key}`}
        >
          <span className="text-zinc-500 text-xs">{getCategoryLabel(key)}:</span>
          <span className="font-medium">{getFilterLabel(key, value)}</span>
          <button
            onClick={() => onRemove(key)}
            className="ml-1 p-0.5 hover:bg-zinc-300 rounded-sm transition-colors"
            data-testid={`filter-tag-remove-${key}`}
          >
            <X className="w-3 h-3 text-zinc-500" />
          </button>
        </div>
      ))}

      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-zinc-500 hover:text-zinc-700 underline ml-2"
          data-testid="filter-tags-clear-all"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

export default FilterTags;
