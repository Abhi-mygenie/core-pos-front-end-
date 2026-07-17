/**
 * ExpenseReportPage — CR-061 (POS 5.0)
 *
 * Expense tracking report with daily trends, category breakdown, payment split.
 * Pattern: DailySalesMockup / SettlementReportMockup.
 * Data source: GET /expense/expenses-report (client-side aggregation).
 * Mockup approved: 2026-07-09.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import * as expenseService from '../../api/services/expenseService';
import { fromAPI, formatDateDDMMYYYY, formatDateISO, parseDateDDMMYYYY } from '../../api/transforms/expenseTransform';
import { aggregateExpenses } from '../../api/services/expenseReportService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter'; // BUG-179 + BUG-180: added openReportWindow
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import {
  ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown,
  Mail, MessageCircle, Send, TrendingUp, BarChart3, Calendar,
  ChevronLeft, ChevronRight, Search,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// CR-061
const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const PIE_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#6366F1'];

const PAYMENT_COLORS = {
  Cash: '#329937', 'Cash Draw': '#F26B33', UPI: '#3B82F6', 'Bank Transfer': '#8B5CF6',
};
const PAYMENT_BG = {
  Cash: '#F0FDF4', 'Cash Draw': '#FFF7ED', UPI: '#EFF6FF', 'Bank Transfer': '#FDF4FF',
};

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 'expense-report-download-excel' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 'expense-report-download-pdf' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 'expense-report-share-email' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 'expense-report-share-whatsapp' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 'expense-report-share-sms' },
];

const ExpenseReportPage = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();

  // CR-041: sidebar collapsed by default on reports
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);

  const today = new Date();
  const [fromDate, setFromDate]         = useState(sharedFrom || fmtISO(today));
  const [toDate, setToDate]             = useState(sharedTo || fmtISO(today));
  const [appliedFrom, setAppliedFrom]   = useState(sharedFrom || fmtISO(today));
  const [appliedTo, setAppliedTo]       = useState(sharedTo || fmtISO(today));
  const [activePreset, setActivePreset] = useState('Today');

  const [isLoading, setIsLoading]           = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce]   = useState(false);
  const [error, setError]                   = useState(null);
  const [rawData, setRawData]               = useState(null);

  // CR-061 V3: server-side filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentFilter, setPaymentFilter]   = useState('');
  const [searchQuery, setSearchQuery]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage]       = useState(1);

  // Reference data
  const [categories, setCategories]         = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadRef = useRef(null);

  // CR-061 V3: search debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close download menu on outside click
  useEffect(() => {
    const handler = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // CR-061 G7 fix: category/payment/page are server-side; search is client-side (backend ignores ?search= on /expenses-report)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [reportRes, catRes, payRes] = await Promise.all([
        expenseService.getExpenseReport(
          formatDateDDMMYYYY(appliedFrom),
          formatDateDDMMYYYY(appliedTo),
          {
            categoryId: categoryFilter || null,
            paymentMethod: paymentFilter || '',
            page: currentPage,
          }
        ),
        expenseService.getCategories(),
        expenseService.getPaymentMethods(),
      ]);
      const normalized = fromAPI.expenseReport(reportRes);
      setRawData(normalized);
      setCategories(fromAPI.categories(catRes));
      setPaymentMethods(fromAPI.paymentMethods(payRes));
      setHasLoadedOnce(true);
    } catch (err) {
      setError(err?.readableMessage || err?.response?.data?.message || 'Failed to load expense report');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFrom, appliedTo, categoryFilter, paymentFilter, currentPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Aggregated data
  const aggregated = useMemo(() => {
    if (!rawData) return null;
    return aggregateExpenses(rawData.transactions, rawData.totalAmount);
  }, [rawData]);

  // CR-061 G7 fix: client-side search filter on current page transactions
  const filteredTransactions = useMemo(() => {
    if (!aggregated?.transactions) return [];
    if (!debouncedSearch.trim()) return aggregated.transactions;
    const term = debouncedSearch.toLowerCase();
    return aggregated.transactions.filter((t) =>
      (t.expense      || '').toLowerCase().includes(term) ||
      (t.notes        || '').toLowerCase().includes(term) ||
      (t.category     || '').toLowerCase().includes(term) ||
      (t.employeeName || '').toLowerCase().includes(term)
    );
  }, [aggregated, debouncedSearch]);

  // CR-061 V3: KPI totals from API (full-range, not page-scoped)
  const totalAmount = rawData?.totalAmount ?? 0;
  const totalCount  = rawData?.totalCount ?? aggregated?.transactionCount ?? 0;
  const totalPages  = rawData?.totalPages ?? 1;

  // Date preset handlers
  const applyPreset = (preset) => {
    const t = new Date();
    let f = new Date();
    switch (preset) {
      case 'Today': f = t; break;
      case '7D': f = new Date(t); f.setDate(f.getDate() - 6); break;
      case '30D': f = new Date(t); f.setDate(f.getDate() - 29); break;
      case 'MTD': f = new Date(t.getFullYear(), t.getMonth(), 1); break;
      default: break;
    }
    const fStr = fmtISO(f);
    const tStr = fmtISO(t);
    setFromDate(fStr); setToDate(tStr);
    setAppliedFrom(fStr); setAppliedTo(tStr);
    setSharedFrom(fStr); setSharedTo(tStr);
    setActivePreset(preset);
    setCurrentPage(1);
  };

  const handleApply = () => {
    setAppliedFrom(fromDate); setAppliedTo(toDate);
    setSharedFrom(fromDate); setSharedTo(toDate);
    setActivePreset('');
    setCurrentPage(1);
  };

  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply = draftDirty && draftValid && !isLoading;

  // Filter handlers (reset page)
  const handleCategoryFilter = (val) => { setCategoryFilter(val); setCurrentPage(1); };
  const handlePaymentFilter  = (val) => { setPaymentFilter(val); setCurrentPage(1); };

  // Pagination
  const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  // BUG-179 + BUG-180: Build export payload matching reportExporter API
  const buildExportPayload = useCallback(() => {
    if (!aggregated) return null;
    return {
      title: 'Expense Report',
      restaurant: { name: restaurant?.name, id: restaurant?.id },
      dateRange: { from: appliedFrom, to: appliedTo },
      kpis: [
        { label: 'Total Spend', value: totalAmount, format: 'inr', tone: 'primary' },
        { label: 'Transactions', value: totalCount, format: 'text' },
        { label: 'Active Days', value: aggregated.activeDays, format: 'text' },
        { label: 'Avg Daily', value: aggregated.avgDaily, format: 'inr' },
        { label: 'Top Category', value: aggregated.topCategory?.name ?? '\u2014', format: 'text' },
      ],
      sheets: [{
        name: 'Transactions',
        columns: [
          { key: 'date',          label: 'Date',      format: 'text',  width: 100 },
          { key: 'expense',       label: 'Item',      format: 'text',  width: 180 },
          { key: 'category',      label: 'Category',  format: 'text',  width: 120 },
          { key: 'amount',        label: 'Amount',    format: 'inr',   width: 110, align: 'right' },
          { key: 'paymentMethod', label: 'Payment',   format: 'text',  width: 120 },
          { key: 'employeeName',  label: 'Added By',  format: 'text',  width: 140 },
          { key: 'notes',         label: 'Notes',     format: 'text',  width: 200 },
        ],
        rows: aggregated.transactions,
        totals: { label: 'TOTAL', amount: totalAmount },
      }],
    };
  }, [aggregated, restaurant, appliedFrom, appliedTo, totalAmount, totalCount]);

  // BUG-179 + BUG-180: Follows same pattern as DailySalesMockup, OrderNotesMockup, etc.
  const handleDownloadAction = (type) => {
    let pdfWin = null;
    if (type === 'pdf') pdfWin = openReportWindow();
    setShowDownloadMenu(false);
    if (!aggregated) { if (pdfWin && !pdfWin.closed) pdfWin.close(); return; }
    try {
      const payload = buildExportPayload();
      if (!payload) { if (pdfWin && !pdfWin.closed) pdfWin.close(); return; }
      if (type === 'excel') exportReportAsExcel(payload);
      else if (type === 'pdf') exportReportAsPDF(pdfWin, payload);
    } catch (e) {
      console.error('[ExpenseReport] Export failed:', e);
      if (pdfWin && !pdfWin.closed) pdfWin.close();
    }
  };

  // Custom tooltip for bar chart
  const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-zinc-200 rounded-lg shadow-lg px-3 py-2 text-xs">
        <div className="font-semibold text-zinc-800">{label}</div>
        <div className="text-zinc-600">{fmtINR(payload[0].value)} · {payload[0]?.payload?.count ?? 0} txns</div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="expense-report-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          {/* Header */}
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="expense-report-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="expense-report-back-btn" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5 text-zinc-600" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Expense Report</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Expense tracking with daily trends &amp; category breakdown{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium" data-testid="expense-report-definitions-link">i Definitions</button></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="expense-report-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600"><span className="text-xs text-zinc-400 uppercase tracking-wide">From</span><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="expense-report-from-date" /></label>
                <span className="text-zinc-300">-</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600"><span className="text-xs text-zinc-400 uppercase tracking-wide">To</span><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="expense-report-to-date" /></label>
              </div>
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="expense-report-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="expense-report-presets">
                {['Today', '7D', '30D', 'MTD'].map((p) => (
                  <button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} data-testid={`expense-report-preset-${p.toLowerCase()}`} onClick={() => applyPreset(p)}>{p}</button>
                ))}
              </div>
              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || !aggregated} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 transition-colors shadow-sm ${isLoading || !aggregated ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="expense-report-download-trigger"><Download className="w-4 h-4" /> Download</button>
                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="expense-report-download-menu">
                    {DOWNLOAD_MENU.map((item) => (
                      <button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}>
                        <item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">
              {/* Filters */}
              <div className="flex items-center gap-3 mb-6" data-testid="expense-report-filters">
                <select value={categoryFilter} onChange={(e) => handleCategoryFilter(e.target.value)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white outline-none focus:border-[#329937] focus:ring-1 focus:ring-[#329937]/20 min-w-[160px]" data-testid="expense-report-category-filter">
                  <option value="">All Categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={paymentFilter} onChange={(e) => handlePaymentFilter(e.target.value)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white outline-none focus:border-[#329937] focus:ring-1 focus:ring-[#329937]/20 min-w-[170px]" data-testid="expense-report-payment-filter">
                  <option value="">All Payment Methods</option>
                  {paymentMethods.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="relative flex-1 max-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search item, notes, employee..." className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white outline-none focus:border-[#329937] focus:ring-1 focus:ring-[#329937]/20" data-testid="expense-report-search" />
                </div>
              </div>

              {aggregated && (
                <div className="space-y-6">
                  {/* KPI Strip */}
                  <div className="grid grid-cols-6 gap-4" data-testid="expense-report-kpi-strip">
                    {[
                      { label: 'Total Spend', value: fmtINR(totalAmount), icon: TrendingUp, color: 'text-[#329937]', dot: '#329937', sub: `${appliedFrom} - ${appliedTo}` },
                      { label: 'Avg Daily', value: fmtINR(aggregated.avgDaily), icon: TrendingUp, color: 'text-[#F26B33]', dot: '#F26B33', sub: `across ${aggregated.activeDays} active days` },
                      { label: 'Transactions', value: totalCount.toLocaleString(), icon: BarChart3, color: 'text-blue-500', dot: '#3B82F6', sub: totalPages > 1 ? `Page ${currentPage} of ${totalPages}` : '' },
                      { label: 'Active Days', value: aggregated.activeDays, icon: Calendar, color: 'text-violet-500', dot: '#8B5CF6', sub: 'days with expenses' },
                      { label: 'Top Category', value: aggregated.topCategory?.name ?? '-', icon: BarChart3, color: 'text-pink-500', dot: '#EC4899', sub: aggregated.topCategory ? `${fmtINR(aggregated.topCategory.total)}` : '' },
                      { label: 'Highest Day', value: aggregated.highestDay ? fmtINR(aggregated.highestDay.total) : '-', icon: TrendingUp, color: 'text-teal-500', dot: '#14B8A6', sub: aggregated.highestDay ? `${aggregated.highestDay.date} · ${aggregated.highestDay.count} txns` : '' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-white border border-zinc-200 rounded-xl p-4" data-testid={`expense-report-kpi-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: kpi.dot }} />
                          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{kpi.label}</span>
                        </div>
                        <div className="text-xl font-bold text-zinc-950">{kpi.value}</div>
                        {kpi.sub && <div className="text-[10px] text-zinc-400 mt-0.5">{kpi.sub}</div>}
                      </div>
                    ))}
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Daily Trend Bar Chart */}
                    <div className="col-span-2 bg-white border border-zinc-200 rounded-xl p-6" data-testid="expense-report-daily-chart">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Daily Expense Trend</h2>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={aggregated.daily} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <defs>
                            <linearGradient id="expBarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.85} />
                              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.45} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} tickFormatter={(v) => v.length > 5 ? v.slice(0, 5) : v} />
                          <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                          <ReTooltip content={<BarTooltip />} />
                          <Bar dataKey="total" fill="url(#expBarGrad)" radius={[4, 4, 0, 0]} animationDuration={600} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Category Pie Chart */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="expense-report-category-chart">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Category Breakdown</h2>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={aggregated.byCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
                            {aggregated.byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Legend formatter={(val) => <span className="text-xs text-zinc-600">{val}</span>} />
                          <ReTooltip formatter={(val) => fmtINR(val)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Payment Method Split */}
                  <div className="grid grid-cols-3 gap-4" data-testid="expense-report-payment-split">
                    {aggregated.byPayment.map((p) => {
                      const maxAmt = aggregated.byPayment[0]?.total || 1;
                      const pct = Math.round((p.total / (totalAmount || 1)) * 100);
                      const color = PAYMENT_COLORS[p.method] || '#71717A';
                      const bg = PAYMENT_BG[p.method] || '#F4F4F5';
                      return (
                        <div key={p.method} className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4" data-testid={`expense-report-payment-${p.method.toLowerCase().replace(/\s+/g, '-')}`}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold flex-shrink-0" style={{ backgroundColor: bg, color }}>&#8377;</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-zinc-800">{p.method}</div>
                            <div className="text-lg font-extrabold text-zinc-950 tracking-tight">{fmtINR(p.total)} <span className="text-xs font-normal text-zinc-400">({pct}%)</span></div>
                            <div className="h-1 rounded-full mt-1.5 bg-zinc-100"><div className="h-full rounded-full" style={{ width: `${Math.round((p.total / maxAmt) * 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} /></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Transaction Table — 7 columns */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="expense-report-table-card">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Transactions</h2>
                      <span className="text-xs text-zinc-400">
                        {debouncedSearch.trim()
                          ? `${filteredTransactions.length} of ${aggregated.transactions.length} matching "${debouncedSearch}"${totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ''}`
                          : `Showing ${aggregated.transactions.length} of ${totalCount}${totalPages > 1 ? ` · Page ${currentPage} of ${totalPages}` : ''}`}
                      </span>
                    </div>
                    <table className="w-full" data-testid="expense-report-table">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Expense Item</th>
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Category</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Payment</th>
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Added By</th>
                          <th className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.length === 0 && (
                          <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-400">{debouncedSearch.trim() ? `No results match "${debouncedSearch}".` : 'No transactions found for this period.'}</td></tr>
                        )}
                        {filteredTransactions.map((t) => {
                          const badgeColor = PAYMENT_COLORS[t.paymentMethod] || '#71717A';
                          const badgeBg = PAYMENT_BG[t.paymentMethod] || '#F4F4F5';
                          return (
                            <tr key={t.id} className="border-t border-zinc-50 hover:bg-zinc-50/50 transition-colors" data-testid={`expense-report-row-${t.id}`}>
                              <td className="px-5 py-3 text-sm text-zinc-700">{t.date}</td>
                              <td className="px-4 py-3 text-sm font-medium text-zinc-800">{t.expense}</td>
                              <td className="px-4 py-3 text-sm text-zinc-600">{t.category}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-900 tabular-nums">{fmtINR(t.amount)}</td>
                              <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: badgeBg, color: badgeColor }}>{t.paymentMethod}</span></td>
                              <td className="px-4 py-3 text-sm text-zinc-600" data-testid={`expense-report-row-employee-${t.id}`}>{t.employeeName || '\u2014'}</td>
                              <td className="px-5 py-3 text-sm text-zinc-400 max-w-[200px] truncate" data-testid={`expense-report-row-notes-${t.id}`}>{t.notes || '\u2014'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {filteredTransactions.length > 0 && (
                        <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                          <tr>
                            <td className="px-5 py-3 text-sm font-bold text-zinc-900" colSpan={3}>{debouncedSearch.trim() ? 'FILTERED TOTAL' : 'PAGE TOTAL'}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-zinc-900 tabular-nums">{fmtINR(filteredTransactions.reduce((s, t) => s + t.amount, 0))}</td>
                            <td colSpan={3} />
                          </tr>
                        </tfoot>
                      )}
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-3 py-4 border-t border-zinc-100" data-testid="expense-report-pagination">
                        <button onClick={handlePrevPage} disabled={currentPage === 1} className={`w-8 h-8 flex items-center justify-center rounded-md border border-zinc-200 bg-white transition-colors ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-50 cursor-pointer'}`} data-testid="expense-report-prev-page">
                          <ChevronLeft className="w-4 h-4 text-zinc-600" />
                        </button>
                        <span className="text-xs font-medium text-zinc-500" data-testid="expense-report-page-info">Page {currentPage} of {totalPages}</span>
                        <button onClick={handleNextPage} disabled={currentPage === totalPages} className={`w-8 h-8 flex items-center justify-center rounded-md border border-zinc-200 bg-white transition-colors ${currentPage === totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-50 cursor-pointer'}`} data-testid="expense-report-next-page">
                          <ChevronRight className="w-4 h-4 text-zinc-600" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-zinc-400 text-center py-2">{aggregated.activeDays} active days · {appliedFrom} to {appliedTo}</div>
                </div>
              )}
            </div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

export default ExpenseReportPage;
