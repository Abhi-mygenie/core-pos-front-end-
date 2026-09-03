/**
 * DailySalesMockup — CR-011 S11 (Phase 3)
 *
 * Daily Sales Summary deep-dive: detailed daily breakdown with trend indicators,
 * cumulative revenue line, day-over-day change, best/worst highlights.
 * Data source: insights-sales.daily[] (CR-049 backend aggregation)
 *
 * Gate ①: Mockup with live API data.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { fetchInsightsSales } from '../../api/services/insightsService'; // CR-049
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import {
  ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown,
  Mail, MessageCircle, Send, TrendingUp, TrendingDown, Calendar, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, Area,
} from 'recharts';

// CR-011 S11
const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtINR2 = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's11-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's11-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's11-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's11-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's11-share-sms-btn' },
];

const DailyBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-zinc-700">
      <div className="font-semibold mb-1">{d.date} ({d.weekday})</div>
      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" />Revenue: {fmtINR(d.revenue)}</div>
      <div className="text-zinc-400">{d.orders} orders · Avg {fmtINR(d.orders > 0 ? d.revenue / d.orders : 0)}</div>
      {d.dodPct !== null && <div className={`mt-1 ${d.dodPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>DoD: {fmtPct(d.dodPct)}</div>}
    </div>
  );
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DailySalesMockup = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const downloadRef = useRef(null);
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  const [isSilentMode, setIsSilentMode] = useState(false);

  const today = new Date();
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const [fromDate, setFromDate] = useState(sharedFrom);
  const [toDate, setToDate] = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo, setAppliedTo] = useState(sharedTo);
  const [activePreset, setActivePreset] = useState('7D');

  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply = draftDirty && draftValid && !isLoading;

  const handleApply = () => { if (canApply) { setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset(''); } };
  const handlePreset = (p) => {
    const t = new Date(); let f;
    if (p === 'Today') f = t;
    else if (p === '7D') f = new Date(t.getTime() - 6 * 86400000);
    else if (p === '30D') f = new Date(t.getTime() - 29 * 86400000);
    else if (p === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); }
    else return;
    const fd = fmtISO(f); const td = fmtISO(t);
    setFromDate(fd); setToDate(td); setAppliedFrom(fd); setAppliedTo(td); setActivePreset(p);
    setSharedFrom(fd); setSharedTo(td);
  };

  // CR-011 S11: Fetch
  const fetchData = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return;
    setIsLoading(true); setError(null);
    try {
      const data = await fetchInsightsSales(appliedFrom, appliedTo);
      setSalesData(data);
      setHasLoadedOnce(true);
    } catch (e) { setError(e.message || 'Failed to load'); }
    finally { setIsLoading(false); }
  }, [appliedFrom, appliedTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // CR-011 S11: Transform daily data with DoD change + cumulative + weekday
  const analytics = useMemo(() => {
    if (!salesData) return null;
    const s = salesData.summary || {};
    const rawDaily = (salesData.daily || []).map(d => ({
      date: d.date || '', revenue: d.revenue || 0, orders: d.orders || 0,
      tax: d.tax || 0, discount: d.discount || 0,
    }));

    let cumulative = 0;
    const daily = rawDaily.map((d, i) => {
      const prev = i > 0 ? rawDaily[i - 1].revenue : null;
      const dodPct = prev !== null && prev > 0 ? ((d.revenue - prev) / prev) * 100 : null;
      const dodAbs = prev !== null ? d.revenue - prev : null;
      cumulative += d.revenue;
      const dt = new Date(d.date + 'T12:00:00');
      return { ...d, dodPct, dodAbs, cumulative, weekday: WEEKDAYS[dt.getDay()] };
    });

    const totalRevenue = s.total_revenue || 0;
    const totalOrders = s.total_orders || 0;
    const activeDays = daily.filter(d => d.revenue > 0).length;
    const avgDailyRevenue = activeDays > 0 ? totalRevenue / activeDays : 0;
    const bestDay = daily.reduce((b, d) => d.revenue > (b?.revenue || 0) ? d : b, null);
    const worstDay = daily.filter(d => d.revenue > 0).reduce((w, d) => d.revenue < (w?.revenue || Infinity) ? d : w, null);
    const medianRevenue = (() => {
      const sorted = daily.filter(d => d.revenue > 0).map(d => d.revenue).sort((a, b) => a - b);
      if (!sorted.length) return 0;
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    })();

    return { daily, totalRevenue, totalOrders, activeDays, avgDailyRevenue, bestDay, worstDay, medianRevenue, totalTax: s.total_tax || 0, totalDiscount: s.total_discount || 0 };
  }, [salesData]);

  // Export
  const buildExportPayload = () => {
    if (!analytics) return null;
    return {
      title: 'Daily Sales Summary', subtitle: 'Day-by-day revenue breakdown',
      restaurant: { name: restaurant?.name || '', address: restaurant?.address || '', id: restaurant?.id || '' },
      dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [
        { label: 'Total Revenue', value: analytics.totalRevenue, format: 'inr' },
        { label: 'Active Days', value: analytics.activeDays, format: 'text' },
        { label: 'Avg Daily Revenue', value: analytics.avgDailyRevenue, format: 'inr' },
        { label: 'Median Daily Revenue', value: analytics.medianRevenue, format: 'inr' },
        { label: 'Best Day', value: analytics.bestDay ? `${analytics.bestDay.date} (${fmtINR(analytics.bestDay.revenue)})` : '—', format: 'text' },
        { label: 'Worst Day', value: analytics.worstDay ? `${analytics.worstDay.date} (${fmtINR(analytics.worstDay.revenue)})` : '—', format: 'text' },
      ],
      sheets: [{
        name: 'Daily Sales', subtitle: `${analytics.daily.length} days`,
        columns: [
          { key: 'date', label: 'Date', format: 'text', align: 'left', width: 100 },
          { key: 'weekday', label: 'Day', format: 'text', align: 'left', width: 60 },
          { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 70 },
          { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right', width: 110 },
          { key: 'tax', label: 'Tax', format: 'inr', align: 'right', width: 90 },
          { key: 'discount', label: 'Discount', format: 'inr', align: 'right', width: 90 },
          { key: 'cumulative', label: 'Cumulative', format: 'inr', align: 'right', width: 120 },
        ],
        rows: analytics.daily,
        totals: { label: 'TOTAL', orders: analytics.totalOrders, revenue: analytics.totalRevenue, tax: analytics.totalTax, discount: analytics.totalDiscount, cumulative: analytics.totalRevenue },
      }],
    };
  };

  const handleDownloadAction = (action) => {
    let pdfWin = null;
    if (action === 'pdf') pdfWin = openReportWindow();
    setShowDownloadMenu(false);
    if (['email', 'whatsapp', 'sms'].includes(action)) return;
    try {
      const payload = buildExportPayload();
      if (!payload) return;
      if (action === 'excel') exportReportAsExcel(payload);
      else if (action === 'pdf') exportReportAsPDF(pdfWin, payload);
    } catch (e) { console.error('export failed:', e); if (pdfWin && !pdfWin.closed) pdfWin.close(); }
  };

  const ChangeIndicator = ({ value }) => {
    if (value === null || value === undefined) return <Minus className="w-3 h-3 text-zinc-300" />;
    if (value > 0) return <span className="inline-flex items-center text-emerald-600 text-xs font-medium"><ArrowUpRight className="w-3 h-3" />{fmtPct(value)}</span>;
    if (value < 0) return <span className="inline-flex items-center text-red-500 text-xs font-medium"><ArrowDownRight className="w-3 h-3" />{fmtPct(value)}</span>;
    return <span className="text-zinc-400 text-xs">0%</span>;
  };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s11-daily-sales-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          {/* Header — S7 pattern */}
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s11-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="s11-back-btn" onClick={() => navigate('/reports-module/sales')}>
                <ArrowLeft className="w-5 h-5 text-zinc-600" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Daily Sales Summary</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Day-by-day revenue with trend indicators · by collection date{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium" data-testid="s11-definitions-link">ⓘ Definitions</button></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s11-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600"><span className="text-xs text-zinc-400 uppercase tracking-wide">From</span><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s11-date-from" /></label>
                <span className="text-zinc-300">—</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600"><span className="text-xs text-zinc-400 uppercase tracking-wide">To</span><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s11-date-to" /></label>
              </div>
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s11-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s11-presets">
                {['Today', '7D', '30D', 'MTD'].map((p) => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} data-testid={`s11-preset-${p.toLowerCase()}`} onClick={() => handlePreset(p)}>{p}</button>))}
              </div>
              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || !analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 transition-colors shadow-sm ${isLoading || !analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s11-download-trigger"><Download className="w-4 h-4" /> Download</button>
                {showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="s11-download-menu">{DOWNLOAD_MENU.map((item) => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}
              </div>
            </div>
          </header>

          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">
              {analytics && (
                <div className="space-y-6">
                  {/* KPI Strip */}
                  <div className="grid grid-cols-6 gap-4" data-testid="s11-kpi-strip">
                    {[
                      { label: 'Total Revenue', value: fmtINR(analytics.totalRevenue), icon: TrendingUp, color: 'text-[#329937]' },
                      { label: 'Total Orders', value: analytics.totalOrders.toLocaleString(), icon: BarChart3, color: 'text-[#F26B33]' },
                      { label: 'Active Days', value: analytics.activeDays, icon: Calendar, color: 'text-blue-500' },
                      { label: 'Avg Daily', value: fmtINR(analytics.avgDailyRevenue), icon: TrendingUp, color: 'text-violet-500' },
                      { label: 'Median Daily', value: fmtINR(analytics.medianRevenue), icon: TrendingUp, color: 'text-teal-500' },
                      { label: 'Best Day', value: analytics.bestDay ? fmtINR(analytics.bestDay.revenue) : '—', sub: analytics.bestDay?.date, icon: TrendingUp, color: 'text-emerald-500' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-white border border-zinc-200 rounded-xl p-4" data-testid={`s11-kpi-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        <div className="flex items-center gap-1.5 mb-1.5"><kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} /><span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{kpi.label}</span></div>
                        <div className="text-xl font-bold text-zinc-950">{kpi.value}</div>
                        {kpi.sub && <div className="text-[10px] text-zinc-400 mt-0.5">{kpi.sub}</div>}
                      </div>
                    ))}
                  </div>

                  {/* Revenue + Cumulative Composed Chart */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s11-revenue-chart">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Daily Revenue & Cumulative Trend</h2>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={analytics.daily} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="s11BarGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.85} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0.45} /></linearGradient>
                          <linearGradient id="s11CumGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F26B33" stopOpacity={0.15} /><stop offset="100%" stopColor="#F26B33" stopOpacity={0.02} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <YAxis yAxisId="cum" orientation="right" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <ReTooltip content={<DailyBarTooltip />} />
                        <Bar yAxisId="rev" dataKey="revenue" fill="url(#s11BarGrad)" radius={[4, 4, 0, 0]} animationDuration={600} />
                        <Area yAxisId="cum" type="monotone" dataKey="cumulative" stroke="#F26B33" strokeWidth={2} fill="url(#s11CumGrad)" dot={false} animationDuration={600} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Daily Table with DoD Change */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s11-daily-table">
                    <div className="px-6 py-4 border-b border-zinc-100">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Daily Breakdown</h2>
                    </div>
                    <table className="w-full">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Day</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Orders</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Avg Order</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase">DoD Change</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Tax</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Discount</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Cumulative</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.daily.map((d, i) => (
                          <tr key={i} className={`border-t border-zinc-50 hover:bg-zinc-50/50 transition-colors ${d === analytics.bestDay ? 'bg-emerald-50/40' : d === analytics.worstDay ? 'bg-red-50/30' : ''}`} data-testid={`s11-row-${d.date}`}>
                            <td className="px-5 py-3 text-sm font-medium text-zinc-800">{d.date}</td>
                            <td className="px-4 py-3 text-xs text-zinc-500 font-medium">{d.weekday}</td>
                            <td className="px-4 py-3 text-sm text-right text-zinc-700">{d.orders}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR2(d.revenue)}</td>
                            <td className="px-4 py-3 text-sm text-right text-zinc-600">{fmtINR(d.orders > 0 ? d.revenue / d.orders : 0)}</td>
                            <td className="px-4 py-3 text-center"><ChangeIndicator value={d.dodPct} /></td>
                            <td className="px-4 py-3 text-sm text-right text-zinc-600">{fmtINR2(d.tax)}</td>
                            <td className="px-4 py-3 text-sm text-right text-red-600">{d.discount > 0 ? fmtINR2(d.discount) : '—'}</td>
                            <td className="px-5 py-3 text-sm text-right text-zinc-500 font-medium">{fmtINR(d.cumulative)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                        <tr>
                          <td className="px-5 py-3 text-sm font-bold text-zinc-900" colSpan={2}>TOTAL</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-zinc-900">{analytics.totalOrders}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-zinc-900">{fmtINR2(analytics.totalRevenue)}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-600">{fmtINR(analytics.totalOrders > 0 ? analytics.totalRevenue / analytics.totalOrders : 0)}</td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 text-sm text-right font-bold text-zinc-900">{fmtINR2(analytics.totalTax)}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{fmtINR2(analytics.totalDiscount)}</td>
                          <td className="px-5 py-3 text-sm text-right font-bold text-zinc-900">{fmtINR(analytics.totalRevenue)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="text-xs text-zinc-400 text-center py-2">{analytics.activeDays} active days · {appliedFrom} → {appliedTo}</div>
                </div>
              )}
            </div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

export default DailySalesMockup;
