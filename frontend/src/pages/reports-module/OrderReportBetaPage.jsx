// CR-117: Order Report Beta — Combined Backend-Aggregated Daily Order Report
// New isolated page. No transform file — displays backend fields directly.
// Design mockup: /cr117-mockup.html
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ChevronDown, ChevronRight, Lock, Loader2, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { useRestaurant } from '../../contexts';
import Sidebar from '../../components/layout/Sidebar';
import { getOrderReportBetaCombined, exportOrderReportBetaExcel } from '../../api/services/reportService';

// CR-117: Platform badge
const getPlatformBadge = (p) => {
  if (!p) return { label: 'POS', cls: 'bg-emerald-100 text-emerald-800' };
  const lp = p.toLowerCase();
  if (lp.includes('swiggy')) return { label: 'Swiggy', cls: 'bg-orange-100 text-orange-800' };
  if (lp.includes('zomato')) return { label: 'Zomato', cls: 'bg-red-100 text-red-800' };
  return { label: p, cls: 'bg-zinc-100 text-zinc-800' };
};

// CR-117: Payment badge
const getPaymentBadge = (pm) => {
  const map = {
    cash: { label: 'Cash', cls: 'bg-emerald-100 text-emerald-800' },
    pending: { label: 'Pending', cls: 'bg-zinc-100 text-zinc-600' },
    cancel: { label: 'Cancel', cls: 'bg-red-100 text-red-800' },
    tab: { label: 'TAB', cls: 'bg-amber-100 text-amber-800' },
    aggregator: { label: 'Aggregator', cls: 'bg-orange-100 text-orange-800' },
    payment_gateway: { label: 'PG', cls: 'bg-cyan-100 text-cyan-800' },
    partial: { label: 'Partial', cls: 'bg-blue-100 text-blue-800' },
    cash_on_delivery: { label: 'COD', cls: 'bg-emerald-100 text-emerald-800' },
  };
  return map[pm?.toLowerCase()] || { label: pm || '—', cls: 'bg-zinc-100 text-zinc-600' };
};

// CR-117: Status badge
const getStatusBadge = (pt) => {
  const map = {
    Cash: { label: 'Paid', cls: 'bg-blue-100 text-blue-800' },
    Unpaid: { label: 'Unpaid', cls: 'bg-yellow-100 text-yellow-800' },
    Cancel: { label: 'Cancel', cls: 'bg-red-100 text-red-800' },
    Partial: { label: 'Partial', cls: 'bg-blue-100 text-blue-800' },
  };
  return map[pt] || { label: pt || '—', cls: 'bg-zinc-100 text-zinc-600' };
};

// CR-117: Currency format
const fmtINR = (v) => {
  const n = parseFloat(String(v).replace(/,/g, '')) || 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// CR-117: Format date for display
const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[dt.getDay()]}, ${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

// CR-117: Today as YYYY-MM-DD
const today = () => new Date().toISOString().split('T')[0];

// CR-117: Tab definitions
const TABS = [
  { id: 'all', label: 'All Orders', active: true },
  { id: 'aggregator', label: 'Aggregator', active: true },
  { id: 'settled', label: 'Settled', active: false },
  { id: 'cancelled', label: 'Cancelled', active: false },
  { id: 'credit', label: 'Credit', active: false },
  { id: 'hold', label: 'Hold', active: false },
  { id: 'merged', label: 'Merged', active: false },
  { id: 'running', label: 'Running', active: false },
];

// CR-117: Filter by tab
const filterByTab = (rows, tab) => {
  if (tab === 'all') return rows;
  if (tab === 'aggregator') return rows.filter(r => r.order_plateform != null);
  return rows;
};

// CR-117: Apply client-side filters
const applyFilters = (rows, filters) => {
  let result = rows;
  if (filters.payType) result = result.filter(r => r.payment_for === filters.payType);
  if (filters.channel) result = result.filter(r => r.order_type === filters.channel);
  if (filters.platform) {
    if (filters.platform === 'pos') result = result.filter(r => r.order_plateform == null);
    else result = result.filter(r => r.order_plateform?.toLowerCase() === filters.platform);
  }
  if (filters.payment) result = result.filter(r => r.payment_method_raw === filters.payment);
  if (filters.punchedBy) result = result.filter(r => r.waiter === filters.punchedBy);
  if (filters.collectedBy) result = result.filter(r => r.collected_by === filters.collectedBy);
  return result;
};

// CR-117: Extract unique filter values from all rows
const extractFilterOptions = (dailyReports) => {
  const all = dailyReports.flatMap(d => d.report || []);
  const unique = (key) => [...new Set(all.map(r => r[key]).filter(Boolean))].sort();
  return {
    payTypes: unique('payment_for'),
    channels: unique('order_type'),
    platforms: [...new Set(all.map(r => r.order_plateform == null ? 'pos' : r.order_plateform?.toLowerCase()).filter(Boolean))].sort(),
    payments: unique('payment_method_raw'),
    punchedBy: unique('waiter'),
    collectedBy: unique('collected_by'),
  };
};

// CR-117: KPI Card
const KpiCard = ({ label, value, color, testId }) => (
  <div className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex-1 min-w-[140px]" data-testid={testId}>
    <div className="text-xs font-medium text-zinc-500 mb-1">{label}</div>
    <div className="text-xl font-bold" style={{ color }}>{value}</div>
  </div>
);

// CR-117: Pill badge
const Pill = ({ label, cls }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{label}</span>
);

// CR-117: Filter dropdown
const FilterSelect = ({ label, value, options, onChange, disabled, testId }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value || '')}
      disabled={disabled}
      className={`h-8 px-2 rounded-lg border text-xs font-medium ${disabled ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-white text-zinc-700 border-zinc-300'}`}
      data-testid={testId}
    >
      <option value="">All</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default function OrderReportBetaPage() {
  const navigate = useNavigate();
  const { currencySymbol } = useRestaurant();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // CR-117: Date state
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [appliedFrom, setAppliedFrom] = useState(today());
  const [appliedTo, setAppliedTo] = useState(today());

  // CR-117: Data state
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // CR-117: UI state
  const [activeTab, setActiveTab] = useState('all');
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [filters, setFilters] = useState({ payType: '', channel: '', platform: '', payment: '', punchedBy: '', collectedBy: '' });

  // CR-117: Fetch data
  const fetchData = useCallback(async (from, to) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getOrderReportBetaCombined(from, to);
      setData(result);
      // Auto-expand all days
      const days = new Set((result.daily_reports || []).map(d => d.date));
      setExpandedDays(days);
    } catch (err) {
      console.error('[CR-117] Fetch failed:', err);
      setError(err?.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(appliedFrom, appliedTo);
  }, [appliedFrom, appliedTo, fetchData]);

  const handleApply = () => {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  // CR-117: Export Excel
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportOrderReportBetaExcel(appliedFrom, appliedTo);
    } catch (err) {
      console.error('[CR-117] Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // CR-117: Toggle day section
  const toggleDay = (date) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  // CR-117: Derived data
  const stats = data?.order_stats || {};
  const dailyReports = useMemo(() => data?.daily_reports || [], [data]);
  const grandTotal = data?.grand_total || {};
  const filterOptions = useMemo(() => extractFilterOptions(dailyReports), [dailyReports]);

  // CR-117: Filter + tab
  const filteredDays = useMemo(() => {
    return dailyReports.map(day => {
      const tabbed = filterByTab(day.report || [], activeTab);
      const filtered = applyFilters(tabbed, filters);
      return { ...day, filteredReport: filtered };
    }).filter(day => day.filteredReport.length > 0);
  }, [dailyReports, activeTab, filters]);

  const totalFilteredOrders = filteredDays.reduce((s, d) => s + d.filteredReport.length, 0);
  const totalFilteredAmount = filteredDays.reduce((s, d) => s + d.filteredReport.reduce((ss, r) => ss + (parseFloat(String(r.order_amount_raw).replace(/,/g, '')) || 0), 0), 0);

  return (
    <div className="flex h-screen bg-zinc-50" data-testid="order-report-beta-page">
      <Sidebar isExpanded={sidebarExpanded} setIsExpanded={setSidebarExpanded} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-zinc-100" data-testid="back-btn">
            <ArrowLeft className="w-4 h-4 text-zinc-600" />
          </button>
          <h1 className="text-lg font-bold text-zinc-800">Orders (Beta)</h1>

          <div className="flex items-center gap-2 ml-4">
            <label className="text-xs text-zinc-500">From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="h-8 px-2 rounded-lg border border-zinc-300 text-xs" data-testid="from-date" />
            <label className="text-xs text-zinc-500">To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="h-8 px-2 rounded-lg border border-zinc-300 text-xs" data-testid="to-date" />
            <button onClick={handleApply}
              className="h-8 px-4 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
              data-testid="apply-btn">
              Apply
            </button>
          </div>

          <div className="ml-auto">
            <button onClick={handleExport} disabled={isExporting || !data}
              className="h-8 px-3 rounded-lg border border-zinc-300 text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5 disabled:opacity-50"
              data-testid="export-excel-btn">
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              Export Excel
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-zinc-200 p-1" data-testid="tabs-bar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => tab.active && setActiveTab(tab.id)}
                disabled={!tab.active}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  !tab.active ? 'text-zinc-400 cursor-not-allowed' :
                  activeTab === tab.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {!tab.active && <Lock className="w-3 h-3" />}
              </button>
            ))}
          </div>

          {/* KPI Strip */}
          <div className="flex gap-3" data-testid="kpi-strip">
            <KpiCard label="Total Orders" value={stats.paidOrders + stats.unpaidOrders + stats.cancelOrders || 0} color="#18181b" testId="kpi-total" />
            <KpiCard label="Paid Orders" value={stats.paidOrders || 0} color="#16a34a" testId="kpi-paid" />
            <KpiCard label="Unpaid Orders" value={stats.unpaidOrders || 0} color="#eab308" testId="kpi-unpaid" />
            <KpiCard label="Cancelled" value={stats.cancelOrders || 0} color="#dc2626" testId="kpi-cancelled" />
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-end gap-3 flex-wrap" data-testid="filter-bar">
            <FilterSelect label="Pay Type" value={filters.payType} options={filterOptions.payTypes}
              onChange={(v) => setFilters(p => ({ ...p, payType: v }))} testId="filter-pay-type" />
            <FilterSelect label="Payment" value={filters.payment} options={filterOptions.payments}
              onChange={(v) => setFilters(p => ({ ...p, payment: v }))} testId="filter-payment" />
            <FilterSelect label="Channel" value={filters.channel} options={filterOptions.channels}
              onChange={(v) => setFilters(p => ({ ...p, channel: v }))} testId="filter-channel" />
            <FilterSelect label="Platform" value={filters.platform} options={filterOptions.platforms}
              onChange={(v) => setFilters(p => ({ ...p, platform: v }))} testId="filter-platform" />
            <FilterSelect label="Punched By" value={filters.punchedBy} options={filterOptions.punchedBy}
              onChange={(v) => setFilters(p => ({ ...p, punchedBy: v }))} testId="filter-punched-by" />
            <FilterSelect label="Collected By" value={filters.collectedBy} options={filterOptions.collectedBy}
              onChange={(v) => setFilters(p => ({ ...p, collectedBy: v }))} testId="filter-collected-by" />
            <FilterSelect label="Status" value="" options={[]} disabled testId="filter-status" />
            <FilterSelect label="PG" value="" options={[]} disabled testId="filter-pg" />

            <div className="ml-auto text-xs text-zinc-500 flex items-center gap-3">
              <span data-testid="summary-orders">{totalFilteredOrders} orders</span>
              <span className="font-semibold text-zinc-700" data-testid="summary-amount">{fmtINR(totalFilteredAmount)}</span>
            </div>
          </div>

          {/* Loading / Error / Empty */}
          {isLoading && (
            <div className="flex items-center justify-center py-16" data-testid="loading-state">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-sm text-zinc-500">Loading report...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3" data-testid="error-state">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
          {!isLoading && !error && filteredDays.length === 0 && (
            <div className="text-center py-16 text-zinc-400 text-sm" data-testid="empty-state">
              No orders found for the selected date range and filters.
            </div>
          )}

          {/* Per-Day Collapsible Sections */}
          {!isLoading && filteredDays.map(day => {
            const isExpanded = expandedDays.has(day.date);
            const dayOrders = day.filteredReport;
            const dayAmount = dayOrders.reduce((s, r) => s + (parseFloat(String(r.order_amount_raw).replace(/,/g, '')) || 0), 0);

            return (
              <div key={day.date} className="bg-white rounded-xl border border-zinc-200 overflow-hidden" data-testid={`day-section-${day.date}`}>
                {/* Day Header */}
                <button
                  onClick={() => toggleDay(day.date)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
                  data-testid={`day-header-${day.date}`}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                    <span className="text-sm font-bold text-zinc-800">{fmtDate(day.date)}</span>
                    <span className="text-xs text-zinc-400">{dayOrders.length} orders</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-zinc-500">Revenue: <strong className="text-zinc-700">{fmtINR(day.paid_revenue)}</strong></span>
                    <span className="text-zinc-500">Sales: <strong className="text-zinc-700">{fmtINR(day.total_sales)}</strong></span>
                    <span className="text-zinc-500">Discount: <strong className="text-amber-600">{fmtINR(day.total_discount)}</strong></span>
                    <span className="text-zinc-500">Total: <strong className="text-zinc-800">{fmtINR(dayAmount)}</strong></span>
                  </div>
                </button>

                {/* Order Table */}
                {isExpanded && (
                  <div className="overflow-x-auto border-t border-zinc-100">
                    <table className="w-full text-xs" data-testid={`order-table-${day.date}`}>
                      <thead>
                        <tr className="bg-zinc-50 text-zinc-500 font-semibold uppercase tracking-wider">
                          <th className="px-3 py-2 text-left">Order #</th>
                          <th className="px-3 py-2 text-left">Time</th>
                          <th className="px-3 py-2 text-left">Platform</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Waiter</th>
                          <th className="px-3 py-2 text-right">Items</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-right">GST</th>
                          <th className="px-3 py-2 text-right">Service</th>
                          <th className="px-3 py-2 text-left">Payment</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayOrders.map((row, idx) => {
                          const plat = getPlatformBadge(row.order_plateform);
                          const pay = getPaymentBadge(row.payment_method_raw);
                          const status = getStatusBadge(row.payment_type);
                          return (
                            <tr key={`${row.order_id}-${idx}`} className="border-t border-zinc-100 hover:bg-zinc-50/50" data-testid={`order-row-${row.order_id}`}>
                              <td className="px-3 py-2 font-mono font-medium text-zinc-800">#{row.restaurant_order_id}</td>
                              <td className="px-3 py-2 text-zinc-500">{row.order_date}</td>
                              <td className="px-3 py-2"><Pill label={plat.label} cls={plat.cls} /></td>
                              <td className="px-3 py-2 text-zinc-600 capitalize">{row.order_type}</td>
                              <td className="px-3 py-2 text-zinc-600">{row.waiter || '—'}</td>
                              <td className="px-3 py-2 text-right text-zinc-600">{row.quantity}</td>
                              <td className="px-3 py-2 text-right font-medium text-zinc-800">{fmtINR(row.order_amount_raw)}</td>
                              <td className="px-3 py-2 text-right text-zinc-500">{fmtINR(row.gst_amount)}</td>
                              <td className="px-3 py-2 text-right text-zinc-500">{fmtINR(row.service_tax)}</td>
                              <td className="px-3 py-2"><Pill label={pay.label} cls={pay.cls} /></td>
                              <td className="px-3 py-2"><Pill label={status.label} cls={status.cls} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand Total Footer */}
          {!isLoading && data && Object.keys(grandTotal).length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4 space-y-3" data-testid="grand-total-section">
              <h3 className="text-sm font-bold text-zinc-800">Grand Total ({appliedFrom} to {appliedTo})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                {/* Totals */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Totals</div>
                  <div className="flex justify-between"><span className="text-zinc-500">Total Sales</span><span className="font-medium text-zinc-800">{fmtINR(grandTotal.total_sales)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Paid Revenue</span><span className="font-medium text-emerald-700">{fmtINR(grandTotal.paid_revenue)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Order Revenue</span><span className="font-medium text-zinc-700">{fmtINR(grandTotal.order_revenue)}</span></div>
                </div>
                {/* Revenue by PM */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">By Payment</div>
                  <div className="flex justify-between"><span className="text-zinc-500">TAB Revenue</span><span className="font-medium text-amber-700">{fmtINR(grandTotal.tab_revenue)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Room Revenue</span><span className="font-medium text-zinc-700">{fmtINR(grandTotal.room_revenue)}</span></div>
                </div>
                {/* Unpaid */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Unpaid</div>
                  <div className="flex justify-between"><span className="text-zinc-500">Unpaid Revenue</span><span className="font-medium text-yellow-700">{fmtINR(grandTotal.unpaid_revenue)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Discount</span><span className="font-medium text-amber-600">{fmtINR(grandTotal.total_discount)}</span></div>
                </div>
                {/* Charges */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Charges</div>
                  <div className="flex justify-between"><span className="text-zinc-500">GST</span><span className="font-medium text-zinc-700">{fmtINR(grandTotal.gst_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Service</span><span className="font-medium text-zinc-700">{fmtINR(grandTotal.service_tax)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Delivery</span><span className="font-medium text-zinc-700">{fmtINR(grandTotal.delivery_charge)}</span></div>
                </div>
                {/* Extras */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px]">Extras</div>
                  <div className="flex justify-between"><span className="text-zinc-500">Packing</span><span className="font-medium text-zinc-700">{fmtINR(grandTotal.packing_charge)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Tip</span><span className="font-medium text-zinc-700">{fmtINR(grandTotal.tip_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Round-off</span><span className="font-medium text-zinc-700">{fmtINR(grandTotal.roundoff)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
