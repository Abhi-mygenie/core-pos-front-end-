// SummaryBar - Summary statistics cards for reports
// Phase 4A: Order Reports - Step 4

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Format currency amount with ₹ symbol
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

/**
 * Format number with locale
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return '—';
  return num.toLocaleString('en-IN');
};

/**
 * SummaryCard - Individual stat card
 */
const SummaryCard = ({ label, value, formattedValue, trend, trendLabel, isLoading, missingCount }) => {
  // Determine trend icon and color
  const getTrendDisplay = () => {
    if (trend === undefined || trend === null) return null;
    
    if (trend > 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-600">
          <TrendingUp className="w-3 h-3" />
          <span>+{trend}%</span>
          {trendLabel && <span className="text-zinc-400">{trendLabel}</span>}
        </span>
      );
    } else if (trend < 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-red-600">
          <TrendingDown className="w-3 h-3" />
          <span>{trend}%</span>
          {trendLabel && <span className="text-zinc-400">{trendLabel}</span>}
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <Minus className="w-3 h-3" />
          <span>0%</span>
          {trendLabel && <span>{trendLabel}</span>}
        </span>
      );
    }
  };

  return (
    <div 
      className="p-6 bg-white border border-zinc-200 rounded-sm"
      data-testid={`summary-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {/* Label */}
      <div className="text-xs tracking-[0.05em] uppercase font-semibold text-zinc-500 mb-2">
        {label}
      </div>
      
      {/* Value */}
      {isLoading ? (
        <div className="h-9 bg-zinc-100 rounded-sm animate-pulse w-24" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span 
            className="text-3xl font-bold text-zinc-950 tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          >
            {formattedValue}
          </span>
          {missingCount > 0 && (
            <span 
              className="text-lg font-semibold text-red-600 tabular-nums"
              style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
              data-testid="missing-count"
            >
              ({missingCount} missing)
            </span>
          )}
        </div>
      )}
      
      {/* Trend (optional) */}
      {!isLoading && getTrendDisplay() && (
        <div className="mt-2">
          {getTrendDisplay()}
        </div>
      )}
    </div>
  );
};

/**
 * SummaryBar Component
 * Displays 3 summary cards: Total Orders, Total Amount, Avg Order Value
 * 
 * @param {object} summary - { totalOrders, totalAmount, avgOrderValue }
 * @param {boolean} isLoading - Show loading skeletons
 * @param {object} trends - Optional trend percentages { orders, amount, avg }
 * @param {number} missingCount - Number of missing orders (for All Orders tab)
 */
const SummaryBar = ({ summary = {}, isLoading = false, trends = {}, missingCount = 0 }) => {
  const { totalOrders, totalAmount, avgOrderValue } = summary;

  const cards = [
    {
      label: 'Total Orders',
      value: totalOrders,
      formattedValue: formatNumber(totalOrders),
      trend: trends.orders,
      trendLabel: 'vs yesterday',
      missingCount: missingCount, // Only show on Total Orders card
    },
    {
      label: 'Total Amount',
      value: totalAmount,
      formattedValue: formatCurrency(totalAmount),
      trend: trends.amount,
      trendLabel: 'vs yesterday',
      missingCount: 0,
    },
    {
      label: 'Avg Order Value',
      value: avgOrderValue,
      formattedValue: formatCurrency(avgOrderValue),
      trend: trends.avg,
      trendLabel: 'vs yesterday',
      missingCount: 0,
    },
  ];

  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      data-testid="summary-bar"
    >
      {cards.map((card) => (
        <SummaryCard
          key={card.label}
          label={card.label}
          value={card.value}
          formattedValue={card.formattedValue}
          trend={card.trend}
          trendLabel={card.trendLabel}
          isLoading={isLoading}
          missingCount={card.missingCount}
        />
      ))}
    </div>
  );
};

export default SummaryBar;
