import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { getDashboardAggregated } from '../../api/services/insightsService';
import useReportFetch from '../../components/reports/useReportFetch';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Clock,
  MoreVertical,
  Star,
  FileText,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip 
} from 'recharts';

const CHANNEL_COLORS = {
  'Dine-In': '#F26B33',
  'Delivery': '#329937',
  'Takeaway': '#3B82F6',
  'Room': '#F59E0B',
};

const PAYMENT_COLORS = ['#329937', '#F26B33', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6'];

const formatCurrency = (val) => {
  const hasDecimals = val % 1 !== 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 }).format(val);
};

const DashboardMockup = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const schedules = restaurant?.schedules || [];
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);

  // Draft dates (what user is editing) vs applied dates (what triggers fetch)
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const [fromDate, setFromDate] = useState(sharedFrom);
  const [toDate, setToDate] = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo, setAppliedTo] = useState(sharedTo);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [activePreset, setActivePreset] = useState('Today');

  // Date validation + 2-month max range enforcement
  const datesValid = appliedFrom && appliedTo && appliedFrom <= appliedTo;
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;

  // Max date range: 2 months (~62 days)
  const MAX_RANGE_DAYS = 62;
  const getDaysDiff = (f, t) => Math.round((new Date(t) - new Date(f)) / (1000 * 60 * 60 * 24));
  const draftRangeExceeded = draftValid && getDaysDiff(fromDate, toDate) > MAX_RANGE_DAYS;
  const canApply = draftDirty && draftValid && !draftRangeExceeded;

  // Restrict date inputs: max "to" date = fromDate + 2 months, min "from" = toDate - 2 months
  const maxToDate = fromDate ? new Date(new Date(fromDate).getTime() + MAX_RANGE_DAYS * 86400000).toISOString().slice(0, 10) : '';
  const minFromDate = toDate ? new Date(new Date(toDate).getTime() - MAX_RANGE_DAYS * 86400000).toISOString().slice(0, 10) : '';

  // Fetch dashboard data — only on applied dates
  const { data: tiles, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(
    () => getDashboardAggregated(appliedFrom, appliedTo, schedules),
    [appliedFrom, appliedTo],
    { enabled: datesValid }
  );

  // Apply dates
  const handleApply = useCallback(() => {
    if (draftValid) {
      setAppliedFrom(fromDate);
      setAppliedTo(toDate);
      setSharedFrom(fromDate);
      setSharedTo(toDate);
      setActivePreset('');
    }
  }, [fromDate, toDate, draftValid, setSharedFrom, setSharedTo]);

  // Preset handlers — apply immediately (both dates set at once)
  const handlePreset = (preset) => {
    const now = new Date();
    const fmtDate = (d) => d.toISOString().slice(0, 10);
    let f, t;
    switch (preset) {
      case 'Today':
        f = fmtDate(now); t = fmtDate(now);
        break;
      case '7D': {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        f = fmtDate(d); t = fmtDate(now);
        break;
      }
      case '30D': {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        f = fmtDate(d); t = fmtDate(now);
        break;
      }
      case 'MTD': {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        f = fmtDate(d); t = fmtDate(now);
        break;
      }
      case 'FY': {
        // Last completed financial year: April 1 → March 31
        // If today is June 2026 → FY = 2025-04-01 to 2026-03-31
        // If today is Feb 2026 → FY = 2024-04-01 to 2025-03-31
        const fyEndYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        f = fmtDate(new Date(fyEndYear - 1, 3, 1));  // April 1 of previous year
        t = fmtDate(new Date(fyEndYear, 2, 31));      // March 31
        break;
      }
      default: return;
    }
    setFromDate(f);
    setToDate(t);
    setAppliedFrom(f);
    setAppliedTo(t);
    setActivePreset(preset);
  };

  // Derived data with safe defaults
  const sales = tiles?.sales || { totalRevenue: 0, paidOrderCount: 0, sparkline: [] };
  const channels = tiles?.channels || { mix: [], topChannel: '—', topChannelPct: 0 };
  const topItems = tiles?.topItems || { items: [], totalItemsSold: 0 };
  const payments = tiles?.payments || { mix: [], creditOutstanding: 0, creditSettled: 0 };
  const cancellations = tiles?.cancellations || { orderCount: 0, itemCount: 0, totalCount: 0, orderRevenue: 0, itemRevenue: 0, totalRevenue: 0, topReason: '', topReasonCount: 0 };
  const discounts = tiles?.discounts || { directDiscount: 0, couponDiscount: 0, couponOrders: 0, loyaltyDiscount: 0, compItemTotal: 0, compItemCount: 0, totalLeakage: 0 };
  const audits = tiles?.audits || { madeUnpaid: 0, paymentMethodChanged: 0, orders: [], total: 0, riskScore: 0 };
  const kitchen = tiles?.kitchen || { avgPrep: '00:00', avgServe: '00:00', slaBreachCount: 0, hasPrepData: false };
  const customers = tiles?.customers || { repeatPct: 0, newCustomers: 0, totalOrders: 0 };
  const glanceSummary = tiles?.glanceSummary || '';

  // Channel mix with colors
  const channelData = useMemo(() =>
    channels.mix.map((c) => ({ ...c, color: CHANNEL_COLORS[c.name] || '#94A3B8' })),
    [channels.mix]
  );

  // Payment mix with colors
  const paymentData = useMemo(() =>
    payments.mix.map((p, i) => ({ ...p, color: PAYMENT_COLORS[i % PAYMENT_COLORS.length] })),
    [payments.mix]
  );

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="reports-module-dashboard">
      {/* Real Sidebar */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode}
        setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}}
        onOpenMenu={() => {}}
        onOpenCredit={() => {}}
        onRefresh={() => {}}
        isRefreshing={false}
        isOrderEntryOpen={false}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
        
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200" data-testid="reports-module-header">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              data-testid="reports-back-btn"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <div>
              <h1 
                className="text-2xl font-semibold tracking-tight text-zinc-950"
                style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                Reports
              </h1>
              <p className="text-[11px] text-zinc-500 mt-0.5" data-testid="dashboard-basis-label">
                Revenue by collection date · incl. room food · credit counted on settlement
                {' · '}
                <button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium" data-testid="dashboard-definitions-link">ⓘ Definitions</button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Range Picker */}
            <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid && !draftRangeExceeded ? 'border-[#F26B33]' : draftRangeExceeded ? 'border-red-400' : 'border-zinc-200'} bg-white rounded-lg transition-colors ${isLoading ? 'opacity-50' : ''}`} data-testid="reports-daterange-picker">
              <CalendarIcon className="w-4 h-4 text-zinc-500" />
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setActivePreset(''); }}
                  disabled={isLoading}
                  min={minFromDate}
                  className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0"
                  data-testid="reports-date-from"
                />
              </label>
              <span className="text-zinc-300">&mdash;</span>
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setActivePreset(''); }}
                  disabled={isLoading}
                  max={maxToDate}
                  className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0"
                  data-testid="reports-date-to"
                />
              </label>
              {draftRangeExceeded && (
                <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Max 2 months</span>
              )}
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApply}
              disabled={isLoading || !canApply}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                canApply
                  ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
              data-testid="reports-date-apply-btn"
            >
              <Check className="w-4 h-4" />
              Apply
            </button>

            {/* Quick range presets */}
            <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="reports-date-presets">
              {['Today', '7D', '30D', 'MTD', 'FY'].map((p) => {
                const isDisabledPreset = p === 'FY';
                return (
                  <button
                    key={p}
                    disabled={isLoading || isDisabledPreset}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      isDisabledPreset
                        ? 'text-zinc-300 cursor-not-allowed'
                        : activePreset === p
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'
                    }`}
                    data-testid={`reports-date-preset-${p.toLowerCase()}`}
                    onClick={() => !isDisabledPreset && handlePreset(p)}
                    title={isDisabledPreset ? 'Coming soon — max range is 2 months' : ''}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Export Buttons */}
            <button 
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm ${isLoading ? 'opacity-50' : ''}`}
              data-testid="reports-export-pdf-btn"
            >
              <FileText className="w-4 h-4 text-red-500" />
              PDF
            </button>
            <button 
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm ${isLoading ? 'opacity-50' : ''}`}
              data-testid="reports-export-excel-btn"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Excel
            </button>
          </div>
        </header>

        {/* Scrollable Content — wrapped in ReportLoadingShield */}
        <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
          <div className="flex-1 overflow-auto p-8">
          
            {/* At a Glance Strip */}
            {glanceSummary && (
              <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-3" data-testid="dashboard-glance-strip">
                <div className="p-1.5 bg-blue-100 rounded-md shrink-0">
                  <Star className="w-4 h-4 text-blue-600" fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">At a glance</h3>
                  <p className="text-sm text-blue-800/80 leading-relaxed">{glanceSummary}</p>
                </div>
              </div>
            )}

            {/* Primary Row (6 Tiles) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              
              {/* 1. Net Sales */}
              <button 
                className="text-left bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 flex flex-col group relative"
                data-testid="tile-sales"
                onClick={() => navigate(`/reports-module/items?from=${appliedFrom}&to=${appliedTo}`)}
              >
                <div className="flex justify-between items-start w-full mb-3">
                  <span className="text-sm font-medium text-zinc-500">Net Sales</span>
                  {sales.paidOrderCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md">
                      <TrendingUp className="w-3 h-3" />
                      {sales.paidOrderCount} orders
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold tracking-tight text-zinc-950 mb-1" data-testid="tile-sales-value">
                  {formatCurrency(sales.totalRevenue)}
                </div>
                <div className="text-xs text-zinc-500 mb-4">
                  {sales.paidOrderCount} paid orders
                </div>
                
                {sales.sparkline.length > 1 && (
                  <div className="h-12 w-full mt-auto">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sales.sparkline}>
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#F26B33" 
                          strokeWidth={2} 
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Tooltip 
                          formatter={(val) => [formatCurrency(val), 'Revenue']}
                          contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </button>

              {/* 2. Channel Mix — with revenue per channel */}
              <button 
                className="text-left bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 flex flex-col group relative"
                data-testid="tile-channels"
              >
                <div className="flex justify-between items-start w-full mb-2">
                  <span className="text-sm font-medium text-zinc-500">Channel Mix</span>
                  <MoreVertical className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-end gap-2 mb-4">
                  <div className="text-2xl font-bold tracking-tight text-zinc-950" data-testid="tile-channels-top">
                    {channels.topChannel}
                  </div>
                  <div className="text-sm font-medium text-zinc-500 pb-1">is top ({channels.topChannelPct}%)</div>
                </div>
                
                <div className="flex-1 flex flex-col justify-end w-full">
                  {channelData.length > 0 && (
                    <div className="flex h-3 w-full rounded-full overflow-hidden mb-3">
                      {channelData.filter(c => c.value > 0).map((c) => (
                        <div key={c.name} style={{ width: `${c.value}%`, backgroundColor: c.color }} title={`${c.name}: ${c.value}%`} />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    {channelData.filter(c => c.count > 0).map(c => (
                      <div key={c.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-zinc-600">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          {c.name} ({c.count})
                        </div>
                        <span className="font-medium text-zinc-900">{formatCurrency(c.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </button>

              {/* 3. Top Items */}
              <button 
                className="text-left bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 flex flex-col group relative"
                data-testid="tile-items"
                onClick={() => navigate(`/reports-module/items?from=${appliedFrom}&to=${appliedTo}`)}
              >
                <div className="flex justify-between items-start w-full mb-3">
                  <span className="text-sm font-medium text-zinc-500">Top Items by Revenue</span>
                  <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded-md" data-testid="tile-items-total">
                    {Math.round(topItems.totalItemsSold)} items sold
                  </span>
                </div>
                
                <div className="flex-1 flex flex-col gap-2 w-full mt-1">
                  {topItems.items.length > 0 ? topItems.items.slice(0, 4).map((item, idx) => (
                    <div key={item.foodId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 font-medium w-4">{idx + 1}.</span>
                        <span className="text-zinc-700 font-medium truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <div className="text-zinc-900 font-medium">
                        {item.revenue >= 1000 ? `${(item.revenue / 1000).toFixed(1)}k` : formatCurrency(item.revenue)}
                      </div>
                    </div>
                  )) : (
                    <div className="text-sm text-zinc-400 text-center py-4">No items in this range</div>
                  )}
                </div>
              </button>

              {/* 4. Payment Mix — with total */}
              <button 
                className="text-left bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 flex flex-col group relative"
                data-testid="tile-payments"
              >
                <div className="flex justify-between items-start w-full mb-2">
                  <span className="text-sm font-medium text-zinc-500">Payment Mix</span>
                  {paymentData.length > 0 && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md" data-testid="tile-payments-total">
                      {formatCurrency(paymentData.reduce((s, p) => s + (p.revenue || 0), 0))} total
                    </span>
                  )}
                </div>
                
                <div className="flex items-center h-full gap-4 mt-2">
                  {paymentData.length > 0 ? (
                    <>
                      <div className="w-24 h-24 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentData}
                              innerRadius="65%"
                              outerRadius="100%"
                              paddingAngle={2}
                              dataKey="value"
                              isAnimationActive={false}
                              stroke="none"
                            >
                              {paymentData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 flex flex-col justify-center gap-2">
                        {paymentData.slice(0, 4).map(p => (
                          <div key={p.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-zinc-600">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                              {p.name}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500">{p.value}%</span>
                              <span className="font-medium text-zinc-900">{formatCurrency(p.revenue)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-zinc-400 text-center py-4 w-full">No payment data</div>
                  )}
                </div>

                {/* BUG-127 (GO-2, R2-AMEND): Credit Outstanding — always as of today */}
                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between" data-testid="dashboard-credit-outstanding-tile">
                  <span className="text-xs text-zinc-500">Credit Outstanding <span className="text-zinc-400">(as of today)</span></span>
                  <span className="text-sm font-semibold text-purple-700" data-testid="dashboard-credit-outstanding-value">{formatCurrency(payments.creditOutstanding)}</span>
                </div>
              </button>

              {/* 5. Cancellations — order-level + item-level + sum */}
              <button 
                className="text-left bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 flex flex-col group relative"
                data-testid="tile-cancellations"
              >
                <div className="flex justify-between items-start w-full mb-3">
                  <span className="text-sm font-medium text-zinc-500">Cancellations</span>
                  {cancellations.totalCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md">
                      <TrendingDown className="w-3 h-3" />
                      {formatCurrency(cancellations.totalRevenue)} lost
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <div className="text-3xl font-bold tracking-tight text-red-600" data-testid="tile-cancel-count">
                    {cancellations.totalCount}
                  </div>
                  <div className="text-sm font-medium text-zinc-500 pb-1">total cancelled</div>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-red-50/50 rounded-lg border border-red-100/50">
                    <div className="text-lg font-bold text-red-700" data-testid="tile-cancel-orders">{cancellations.orderCount}</div>
                    <div className="text-xs text-red-900/70">Order-level</div>
                  </div>
                  <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-100/50">
                    <div className="text-lg font-bold text-amber-700" data-testid="tile-cancel-items">{cancellations.itemCount}</div>
                    <div className="text-xs text-amber-900/70">Item-level</div>
                  </div>
                </div>

                {cancellations.topReason && cancellations.totalCount > 0 && (
                  <div className="mt-3 p-2.5 bg-zinc-50 rounded-lg border border-zinc-100">
                    <div className="text-xs font-medium text-zinc-500 mb-0.5">Top Reason</div>
                    <div className="text-sm text-zinc-700">"{cancellations.topReason}" ({cancellations.topReasonCount})</div>
                  </div>
                )}
              </button>

              {/* 6. Discounts & Offers */}
              <button 
                className="text-left bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 flex flex-col group relative"
                data-testid="tile-discounts"
              >
                <div className="flex justify-between items-start w-full mb-3">
                  <span className="text-sm font-medium text-zinc-500">Discounts & Offers</span>
                  {discounts.totalLeakage > 0 && (
                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                      {formatCurrency(discounts.totalLeakage)} total
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <div className="text-3xl font-bold tracking-tight text-purple-600" data-testid="tile-discount-total">
                    {formatCurrency(discounts.totalLeakage)}
                  </div>
                  <div className="text-sm font-medium text-zinc-500 pb-1">total given</div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-orange-50/50 rounded-lg border border-orange-100/50">
                    <div className="text-lg font-bold text-orange-700" data-testid="tile-discount-direct">{formatCurrency(discounts.directDiscount)}</div>
                    <div className="text-xs text-orange-900/70">Direct Discount</div>
                  </div>
                  <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100/50">
                    <div className="text-lg font-bold text-blue-700" data-testid="tile-discount-coupon">{formatCurrency(discounts.couponDiscount)}</div>
                    <div className="text-xs text-blue-900/70">Coupon Discount</div>
                  </div>
                  <div className="p-2.5 bg-green-50/50 rounded-lg border border-green-100/50">
                    <div className="text-lg font-bold text-green-700" data-testid="tile-discount-loyalty">{formatCurrency(discounts.loyaltyDiscount)}</div>
                    <div className="text-xs text-green-900/70">Loyalty Discount</div>
                  </div>
                  <div className="p-2.5 bg-purple-50/50 rounded-lg border border-purple-100/50">
                    <div className="text-lg font-bold text-purple-700" data-testid="tile-discount-comp">{formatCurrency(discounts.compItemTotal)}</div>
                    <div className="text-xs text-purple-900/70">Comp Items ({discounts.compItemCount})</div>
                  </div>
                </div>
              </button>

            </div>

            {/* Secondary Row (3 Tiles — Audit, Kitchen, Customer) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* 7. Post-Settle Edits (Audit) — first */}
              <button 
                className="text-left bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 flex flex-col group relative"
                data-testid="tile-audits"
              >
                <div className="flex justify-between items-start w-full mb-3">
                  <span className="text-sm font-medium text-zinc-500">Post-Settle Edits</span>
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < audits.riskScore ? 'text-amber-400' : 'text-zinc-200'}`} fill="currentColor" />
                    ))}
                  </div>
                </div>
                <div className="flex items-end gap-2 mb-4">
                  <div className="text-3xl font-bold tracking-tight text-amber-600" data-testid="tile-audit-count">
                    {audits.total}
                  </div>
                  <div className="text-sm font-medium text-zinc-500 pb-1">flagged orders</div>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <div className="p-2 bg-red-50/50 rounded-lg border border-red-100/50">
                    <div className="text-lg font-bold text-red-700">{audits.madeUnpaid}</div>
                    <div className="text-xs text-red-900/70">Made Unpaid</div>
                  </div>
                  <div className="p-2 bg-amber-50/50 rounded-lg border border-amber-100/50">
                    <div className="text-lg font-bold text-amber-700">{audits.paymentMethodChanged}</div>
                    <div className="text-xs text-amber-900/70">Payment Changed</div>
                  </div>
                </div>

                {audits.orders.length > 0 && (
                  <div className="mt-3 p-2.5 bg-zinc-50 rounded-lg border border-zinc-100">
                    <div className="text-xs font-medium text-zinc-500 mb-1">Flagged Orders</div>
                    {audits.orders.slice(0, 3).map((o, i) => (
                      <div key={i} className="text-xs text-zinc-700">
                        #{o.id} — {o.type === 'make_unpaid' ? 'Made Unpaid' : `${o.prevMethod} → ${o.currMethod}`}
                        {o.by && o.by !== '—' ? ` by ${o.by}` : ''} ({formatCurrency(o.amount)})
                      </div>
                    ))}
                  </div>
                )}
              </button>

              {/* 8. Kitchen Throughput */}
              <button 
                className="text-left bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 flex flex-col group relative"
                data-testid="tile-kitchen"
              >
                 <div className="flex justify-between items-start w-full mb-3">
                  <span className="text-sm font-medium text-zinc-500">Kitchen Throughput</span>
                  <Clock className="w-4 h-4 text-zinc-400" />
                </div>
                
                {kitchen.hasPrepData ? (
                  <>
                    <div className="flex gap-6">
                      <div>
                        <div className="text-2xl font-bold tracking-tight text-zinc-950 mb-1" data-testid="tile-kitchen-prep">
                          {kitchen.avgPrep}
                        </div>
                        <div className="text-xs text-zinc-500">Avg Prep Time</div>
                      </div>
                      <div className="w-px h-12 bg-zinc-200" />
                      <div>
                        <div className="text-2xl font-bold tracking-tight text-zinc-950 mb-1" data-testid="tile-kitchen-serve">
                          {kitchen.avgServe}
                        </div>
                        <div className="text-xs text-zinc-500">Avg Serve Time</div>
                      </div>
                    </div>

                    {kitchen.slaBreachCount > 0 && (
                      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-zinc-600">{kitchen.slaBreachCount} tickets breached 25min SLA</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-zinc-400 py-4">No prep/serve time data available for this range</div>
                )}
              </button>

              {/* 9. Customer Mix */}
              <button 
                className="text-left bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300 transition-all duration-200 flex flex-col group relative"
                data-testid="tile-customers"
              >
                 <div className="flex justify-between items-start w-full mb-3">
                  <span className="text-sm font-medium text-zinc-500">Customer Mix</span>
                  {customers.repeatPct > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {customers.totalIdentified} identified
                    </span>
                  )}
                </div>
                
                <div className="flex items-end gap-2 mb-4">
                  <div className="text-3xl font-bold tracking-tight text-zinc-950" data-testid="tile-customer-repeat">
                    {customers.repeatPct}%
                  </div>
                  <div className="text-sm font-medium text-zinc-500 pb-1">Repeat Customers</div>
                </div>

                <div className="mt-auto pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-sm text-zinc-600">Walk-in / unidentified orders</span>
                  <span className="text-sm font-bold text-zinc-900" data-testid="tile-customer-new">{customers.newCustomers}</span>
                </div>
              </button>

            </div>

          </div>
        </ReportLoadingShield>
      </main>
    </div>
  );
};

export default DashboardMockup;
