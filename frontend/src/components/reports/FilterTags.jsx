// FilterTags - Removable active filter badges
// Phase 4A: Order Reports - Step 6

import { X } from 'lucide-react';
import { PAYMENT_METHOD_OPTIONS, PAYMENT_TYPE_OPTIONS } from './FilterBar';

/**
 * Get display label for filter value
 */
const getFilterLabel = (key, value) => {
  if (key === 'paymentMethod') {
    return PAYMENT_METHOD_OPTIONS.find(o => o.value === value)?.label || value;
  }
  if (key === 'paymentType') {
    return PAYMENT_TYPE_OPTIONS.find(o => o.value === value)?.label || value;
  }
  return value;
};

/**
 * Get filter category label
 */
const getCategoryLabel = (key) => {
  const labels = {
    paymentMethod: 'Payment',
    paymentType: 'Type',
    channel: 'Channel',
    platform: 'Platform',
  };
  return labels[key] || key;
};

/**
 * FilterTags Component
 * Displays removable badges for active filters
 * 
 * @param {object} filters - Current filter values
 * @param {function} onRemove - Callback to remove a filter (key)
 * @param {function} onClearAll - Callback to clear all filters
 */
const FilterTags = ({ filters = {}, onRemove, onClearAll }) => {
  // Get active filters
  const activeFilters = Object.entries(filters).filter(([_, value]) => value !== null && value !== undefined);
  
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
