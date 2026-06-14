/**
 * PrepServeTimeMockup — CR-011 S10 (Phase 2 Hero Screen)
 *
 * Gate ④ — Live API wired. No seed data.
 *
 * Classification from timestamps (per item):
 *   Kitchen: created_at → ready_at (gap > 30s) → serve_at  → show Prep + Serve
 *   Bar:     created_at ≈ ready_at (instant)   → serve_at  → show Serve only
 *   Direct:  no timestamps or all ≈ created_at             → skip (no timing)
 *
 * Escalation matrix: Coming Soon (backend to provide targets)
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { getPrepServeAnalytics } from '../../api/services/prepServeService';
import useReportFetch from '../../components/reports/useReportFetch';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import {
  ArrowLeft, Calendar as CalendarIcon, Check, Download, FileSpreadsheet, FileDown,
  Mail, MessageCircle, Send, Clock, Timer, Zap, Target,
  ChefHat, UtensilsCrossed, Truck, Coffee, TrendingUp, TrendingDown,
  AlertTriangle, Award, BarChart3, Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell, Legend,
} from 'recharts';

/* ── Helpers ── */
const fmtMins = (n) => {
  if (n === null || n === undefined) return '—';
  const v = Math.round(parseFloat(n) || 0);
  if (v >= 60) return `${Math.floor(v / 60)}h ${v % 60}m`;
  return `${v} min`;
};
const fmtPct = (n) => `${(parseFloat(n) || 0).toFixed(1)}%`;

/* ── Channel Config ── */
const CHANNEL_CONFIG = {
  'Dine-In':  { color: '#F26B33', icon: UtensilsCrossed, prepLabel: 'Prep', serveLabel: 'Serve to Table' },
  'Delivery': { color: '#329937', icon: Truck,            prepLabel: 'Prep', serveLabel: 'Dispatch' },
  'Takeaway': { color: '#3B82F6', icon: Coffee,           prepLabel: 'Prep', serveLabel: 'Handover' },
};

/* ── Time Buckets (for distribution chart colors) ── */
const TIME_BUCKET_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#F26B33', '#EF4444', '#DC2626'];

/* ── View Tabs ── */
const VIEW_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'items',    label: 'By Item' },
  { id: 'stations', label: 'By Station' },
];

/* ── Download menu ── */
const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, testId: 'prepserve-dl-excel' },
  { id: 'pdf',   label: 'Download as PDF',   icon: FileDown,        testId: 'prepserve-dl-pdf' },
  { id: 'email', label: 'Send via Email',     icon: Mail,            testId: 'prepserve-dl-email' },
  { id: 'wa',    label: 'Send via WhatsApp',  icon: MessageCircle,   testId: 'prepserve-dl-wa' },
  { id: 'sms',   label: 'Send via SMS',       icon: Send,            testId: 'prepserve-dl-sms' },
];

/* ── Tooltips ── */
const DailyTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700 min-w-[180px]">
      <div className="font-semibold mb-1.5 border-b border-zinc-700 pb-1">{d.date}</div>
      <div className="flex justify-between py-0.5"><span className="text-orange-400">Avg Prep</span><span>{fmtMins(d.avgPrep)}</span></div>
      <div className="flex justify-between py-0.5"><span className="text-blue-400">Avg Serve</span><span>{fmtMins(d.avgServe)}</span></div>
      <div className="flex justify-between py-0.5"><span className="text-emerald-400">Avg Total</span><span>{fmtMins(d.avgTotal)}</span></div>
      <div className="border-t border-zinc-700 mt-1 pt-1 text-zinc-400">{d.orders} orders</div>
    </div>
  );
};

const HourlyTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700 min-w-[160px]">
      <div className="font-semibold mb-1.5 border-b border-zinc-700 pb-1">{d.hour}:00</div>
      <div className="flex justify-between py-0.5"><span className="text-orange-400">Avg Prep</span><span>{fmtMins(d.avgPrep)}</span></div>
      <div className="flex justify-between py-0.5"><span className="text-blue-400">Avg Serve</span><span>{fmtMins(d.avgServe)}</span></div>
      <div className="border-t border-zinc-700 mt-1 pt-1 text-zinc-400">{d.orders} items</div>
    </div>
  );
};

const DistTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700">
      <div className="font-semibold mb-1">{d.label}</div>
      <div>{d.count} items ({d.pct}%)</div>
    </div>
  );
};

/* ── Performance helpers ── */
const perfColor = (mins) => {
  if (mins === null || mins === 0) return '#9CA3AF';
  if (mins <= 10) return '#22C55E';
  if (mins <= 15) return '#3B82F6';
  if (mins <= 20) return '#F59E0B';
  return '#EF4444';
};

const perfBadge = (mins) => {
  if (mins === null || mins === 0) return { text: 'No Data', bg: '#F4F4F5', color: '#71717A' };
  if (mins <= 10) return { text: 'Excellent', bg: '#DCFCE7', color: '#15803D' };
  if (mins <= 15) return { text: 'Good', bg: '#DBEAFE', color: '#1D4ED8' };
  if (mins <= 20) return { text: 'Needs Attention', bg: '#FEF3C7', color: '#B45309' };
  return { text: 'Critical', bg: '#FEE2E2', color: '#DC2626' };
};

// ── Component ───────────────────────────────────────────────────────────────

const PrepServeTimeMockup = () => {
  const navigate = useNavigate();
  const downloadRef = useRef(null);
  const { restaurant } = useRestaurant();
  const schedules = restaurant?.schedules || [];

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [activeView, setActiveView] = useState('overview');

  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const fmtISO = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
  const [fromDate, setFromDate] = useState(sharedFrom);
  const [toDate, setToDate] = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo, setAppliedTo] = useState(sharedTo);
  const [activePreset, setActivePreset] = useState('7D');

  const datesValid = appliedFrom && appliedTo && appliedFrom <= appliedTo;
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply = draftDirty && draftValid;

  useEffect(() => {
    const handler = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePreset = (preset) => {
    const now = new Date();
    const f2 = (d) => d.toISOString().slice(0, 10);
    let f, t;
    switch (preset) {
      case 'Today': f = f2(now); t = f2(now); break;
      case '7D':  { const d = new Date(now); d.setDate(d.getDate() - 6);  f = f2(d); t = f2(now); break; }
      case '30D': { const d = new Date(now); d.setDate(d.getDate() - 29); f = f2(d); t = f2(now); break; }
      case 'MTD': { const d = new Date(now.getFullYear(), now.getMonth(), 1); f = f2(d); t = f2(now); break; }
      default: return;
    }
    setFromDate(f); setToDate(t); setAppliedFrom(f); setAppliedTo(t); setActivePreset(preset);
  };

  const handleApply = () => { if (draftValid) { setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset(''); } };

  // Live data fetch
  const { data: analytics, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(
    () => getPrepServeAnalytics(appliedFrom, appliedTo, schedules),
    [appliedFrom, appliedTo],
    { enabled: datesValid }
  );

  const kpi = analytics?.kpi || {};
  const daily = analytics?.daily || [];
  const hourly = analytics?.hourly || [];
  const distribution = analytics?.distribution || [];
  const byChannel = analytics?.byChannel || [];
  const byStation = analytics?.byStation || [];
  const slowItems = analytics?.slowItems || [];
  const fastItems = analytics?.fastItems || [];
  const modeCount = analytics?.modeCount || { kitchen: 0, bar: 0, direct: 0 };

  // Insights
  const insights = useMemo(() => {
    if (!daily.length && !hourly.length) return {};
    const peakHour = hourly.length > 0 ? hourly.reduce((best, h) => h.avgPrep > (best?.avgPrep || 0) ? h : best, null) : null;
    const fastestHour = hourly.length > 0 ? hourly.reduce((best, h) => (h.avgPrep > 0 && h.avgPrep < (best?.avgPrep || Infinity)) ? h : best, null) : null;
    const slowestDay = daily.length > 0 ? daily.reduce((best, d) => d.avgTotal > (best?.avgTotal || 0) ? d : best, null) : null;
    const fastestDay = daily.length > 0 ? daily.reduce((best, d) => (d.avgTotal > 0 && d.avgTotal < (best?.avgTotal || Infinity)) ? d : best, null) : null;
    return { peakHour, fastestHour, slowestDay, fastestDay };
  }, [daily, hourly]);

  const formatCurrency = (val) => { const hasDecimals = val % 1 !== 0; return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 }).format(val); };

  // ── Export payload builder ──
  const buildExportPayload = () => {
    const r2 = (v) => Math.round((v || 0) * 10) / 10;

    // Sheet 1: Overview (daily)
    const overviewSheet = {
      name: 'Daily Trend',
      subtitle: 'Avg prep & serve time by day',
      columns: [
        { key: 'date', label: 'Date', format: 'text', width: 100 },
        { key: 'avgPrep', label: 'Avg Prep (min)', format: 'number', align: 'right', width: 110 },
        { key: 'avgServe', label: 'Avg Serve (min)', format: 'number', align: 'right', width: 110 },
        { key: 'avgTotal', label: 'Avg Total (min)', format: 'number', align: 'right', width: 110 },
        { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 },
      ],
      rows: daily,
      totals: { label: 'AVERAGE', avgPrep: r2(kpi.avgPrep), avgServe: r2(kpi.avgServe), avgTotal: r2(kpi.avgTotal), orders: kpi.totalOrders || 0 },
    };

    // Sheet 2: By Station
    const stationSheet = {
      name: 'By Station',
      subtitle: 'Station performance breakdown',
      columns: [
        { key: 'station', label: 'Station', format: 'text', width: 140 },
        { key: 'avgPrep', label: 'Avg Prep (min)', format: 'number', align: 'right', width: 110 },
        { key: 'avgServe', label: 'Avg Serve (min)', format: 'number', align: 'right', width: 110 },
        { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 },
        { key: 'items', label: 'Items', format: 'integer', align: 'right', width: 80 },
      ],
      rows: byStation,
    };

    // Sheet 3: Slowest Items
    const slowSheet = {
      name: 'Slowest Items',
      subtitle: 'Top 10 slowest items by total time (min 2 orders)',
      columns: [
        { key: 'name', label: 'Item', format: 'text', width: 180 },
        { key: 'station', label: 'Station', format: 'text', width: 140 },
        { key: 'mode', label: 'Mode', format: 'text', width: 80 },
        { key: 'avgPrep', label: 'Avg Prep (min)', format: 'number', align: 'right', width: 110 },
        { key: 'avgServe', label: 'Avg Serve (min)', format: 'number', align: 'right', width: 110 },
        { key: 'total', label: 'Total (min)', format: 'number', align: 'right', width: 100 },
        { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 },
      ],
      rows: slowItems.map((it) => ({ ...it, total: r2((it.avgPrep || 0) + (it.avgServe || 0)) })),
    };

    // Sheet 4: Fastest Items
    const fastSheet = {
      name: 'Fastest Items',
      subtitle: 'Top 10 fastest items by total time (min 2 orders)',
      columns: slowSheet.columns,
      rows: fastItems.map((it) => ({ ...it, total: r2((it.avgPrep || 0) + (it.avgServe || 0)) })),
    };

    // Sheet 5: Hourly
    const hourlySheet = {
      name: 'By Hour',
      subtitle: 'Prep time by hour of day',
      columns: [
        { key: 'hour', label: 'Hour', format: 'text', width: 80 },
        { key: 'avgPrep', label: 'Avg Prep (min)', format: 'number', align: 'right', width: 110 },
        { key: 'avgServe', label: 'Avg Serve (min)', format: 'number', align: 'right', width: 110 },
        { key: 'orders', label: 'Items', format: 'integer', align: 'right', width: 80 },
      ],
      rows: hourly.map((h) => ({ ...h, hour: `${h.hour}:00` })),
    };

    return {
      title: 'Prep & Serve Time',
      subtitle: '',
      restaurant: { name: restaurant?.name || '', address: restaurant?.address || '', id: restaurant?.id || '' },
      dateRange: { from: appliedFrom, to: appliedTo },
      generatedBy: restaurant?.ownerName || '',
      kpis: [
        { label: 'Avg Prep', value: `${r2(kpi.avgPrep)} min`, tone: 'primary', format: 'text' },
        { label: 'Avg Serve', value: `${r2(kpi.avgServe)} min`, tone: 'primary', format: 'text' },
        { label: 'Avg Total', value: `${r2(kpi.avgTotal)} min`, tone: 'primary', format: 'text' },
        { label: 'Orders', value: kpi.totalOrders || 0, tone: '', format: 'text' },
      ],
      sheets: [overviewSheet, stationSheet, slowSheet, fastSheet, hourlySheet],
    };
  };

  const handleDownloadAction = (action) => {
    let pdfWin = null;
    if (action === 'pdf') pdfWin = openReportWindow();
    setShowDownloadMenu(false);
    if (action === 'email' || action === 'wa' || action === 'sms') return;
    try {
      const payload = buildExportPayload();
      if (action === 'excel') exportReportAsExcel(payload);
      else if (action === 'pdf') exportReportAsPDF(pdfWin, payload);
    } catch (e) {
      console.error('[S10] export failed:', e);
      if (pdfWin && !pdfWin.closed) pdfWin.close();
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="prepserve-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={() => {}} isRefreshing={false} isOrderEntryOpen={false} />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          {/* Header */}
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="prepserve-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="prepserve-back-btn" onClick={() => navigate('/reports-module/dashboard')}>
                <ArrowLeft className="w-5 h-5 text-zinc-600" />
              </button>
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-0.5 flex items-center gap-1.5">
                  <span>Insights</span><span>›</span><span>Kitchen Ops</span><span>›</span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Prep & Serve Time
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg transition-colors ${isLoading ? 'opacity-50' : ''}`} data-testid="prepserve-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                  <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setActivePreset(''); }} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="prepserve-date-from" />
                </label>
                <span className="text-zinc-300">—</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                  <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setActivePreset(''); }} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="prepserve-date-to" />
                </label>
              </div>

              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="prepserve-apply-btn">
                <Check className="w-4 h-4" /> Apply
              </button>

              <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="prepserve-presets">
                {['Today', '7D', '30D', 'MTD'].map((p) => (
                  <button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} data-testid={`prepserve-preset-${p.toLowerCase()}`} onClick={() => handlePreset(p)}>
                    {p}
                  </button>
                ))}
              </div>

              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || !hasLoadedOnce} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors shadow-sm ${isLoading || !hasLoadedOnce ? 'border-zinc-300 text-zinc-400 cursor-not-allowed opacity-50' : 'border-[#F26B33] text-[#F26B33] hover:bg-orange-50'}`} data-testid="prepserve-download-trigger">
                  <Download className="w-4 h-4" /> Download
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="prepserve-download-menu">
                    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-50 border-b border-zinc-100">Download or Share Report</div>
                    {DOWNLOAD_MENU.map((item) => {
                      const Icon = item.icon;
                      const enabled = item.id === 'excel' || item.id === 'pdf';
                      return (
                        <button key={item.id} onClick={() => enabled && handleDownloadAction(item.id)} disabled={!enabled} className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${enabled ? 'text-zinc-800 hover:bg-orange-50 hover:text-[#F26B33] cursor-pointer' : 'text-zinc-300 cursor-not-allowed'}`} data-testid={item.testId}>
                          <Icon className={`w-4 h-4 ${enabled ? '' : 'text-zinc-300'}`} />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
            <div className="flex-1 overflow-auto p-8" data-testid="prepserve-content">
              <div className="space-y-6">

                {/* ── KPI Strip ── */}
                <div className="grid grid-cols-4 gap-4" data-testid="prepserve-kpi-strip">
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><ChefHat className="w-4 h-4 text-orange-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Avg Prep Time</span></div>
                    <div className="text-2xl font-bold" style={{ color: perfColor(kpi.avgPrep) }} data-testid="prepserve-avg-prep">{fmtMins(kpi.avgPrep)}</div>
                    <div className="text-xs text-zinc-400 mt-1">Kitchen items · {kpi.kitchenItems || 0} items tracked</div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><UtensilsCrossed className="w-4 h-4 text-blue-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Avg Serve Time</span></div>
                    <div className="text-2xl font-bold" style={{ color: perfColor(kpi.avgServe) }} data-testid="prepserve-avg-serve">{fmtMins(kpi.avgServe)}</div>
                    <div className="text-xs text-zinc-400 mt-1">Kitchen + Bar items · {kpi.servedItems || 0} items tracked</div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><Timer className="w-4 h-4 text-emerald-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Avg Total Time</span></div>
                    <div className="text-2xl font-bold" style={{ color: perfColor(kpi.avgTotal) }} data-testid="prepserve-avg-total">{fmtMins(kpi.avgTotal)}</div>
                    <div className="text-xs text-zinc-400 mt-1">End-to-end · {kpi.totalOrders || 0} orders</div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-zinc-400" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Escalation Matrix</span></div>
                    <div className="text-lg font-semibold text-zinc-400 mt-1" data-testid="prepserve-escalation">Coming Soon</div>
                    <div className="text-xs text-zinc-400 mt-1">Target-based tracking</div>
                  </div>
                </div>

                {/* ── Station breakdown badges (dynamic from data) ── */}
                <div className="flex items-center gap-3 text-xs flex-wrap" data-testid="prepserve-station-breakdown">
                  {byStation.map((st, i) => {
                    const colors = ['bg-orange-50 border-orange-200 text-orange-700', 'bg-blue-50 border-blue-200 text-blue-700', 'bg-emerald-50 border-emerald-200 text-emerald-700', 'bg-purple-50 border-purple-200 text-purple-700', 'bg-rose-50 border-rose-200 text-rose-700', 'bg-zinc-100 border-zinc-200 text-zinc-600'];
                    const clr = colors[i % colors.length];
                    return (
                      <div key={st.station} className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-lg ${clr}`}>
                        <span className="font-medium">{st.station}: {st.items}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-1.5 px-2 py-1 text-zinc-400">
                    <Info className="w-3 h-3" />
                    <span>{analytics?.meta?.totalOrders || 0} orders · {analytics?.meta?.totalItems || 0} items</span>
                  </div>
                </div>

                {/* ── View Tabs ── */}
                <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg w-fit" data-testid="prepserve-view-tabs">
                  {VIEW_TABS.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveView(tab.id)} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeView === tab.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} data-testid={`prepserve-tab-${tab.id}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ══ OVERVIEW TAB ══ */}
                {activeView === 'overview' && (
                  <div className="space-y-6">
                    {/* Daily Trend */}
                    {daily.length > 0 && (
                      <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-daily-trend">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Daily Avg Prep & Serve Time</h2>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-[#F26B33]" />Prep</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-[#3B82F6]" />Serve</span>
                            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-[#22C55E]" />Total</span>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                          <AreaChart data={daily}>
                            <defs>
                              <linearGradient id="gradPrep" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F26B33" stopOpacity={0.15} /><stop offset="95%" stopColor="#F26B33" stopOpacity={0} /></linearGradient>
                              <linearGradient id="gradServe" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717A' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#71717A' }} unit=" min" />
                            <ReTooltip content={<DailyTooltip />} />
                            <Area type="monotone" dataKey="avgPrep" stroke="#F26B33" strokeWidth={2} fill="url(#gradPrep)" dot={{ r: 3, fill: '#F26B33' }} animationDuration={800} />
                            <Area type="monotone" dataKey="avgServe" stroke="#3B82F6" strokeWidth={2} fill="url(#gradServe)" dot={{ r: 3, fill: '#3B82F6' }} animationDuration={800} />
                            <Line type="monotone" dataKey="avgTotal" stroke="#22C55E" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: '#22C55E' }} animationDuration={800} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Hourly + Distribution */}
                    <div className="grid grid-cols-2 gap-6">
                      {hourly.length > 0 && (
                        <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-hourly">
                          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Prep Time by Hour</h2>
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={hourly}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#71717A' }} tickFormatter={(v) => `${v}:00`} />
                              <YAxis tick={{ fontSize: 11, fill: '#71717A' }} unit=" min" />
                              <ReTooltip content={<HourlyTooltip />} />
                              <Bar dataKey="avgPrep" radius={[4, 4, 0, 0]} animationDuration={800}>
                                {hourly.map((entry, i) => (
                                  <Cell key={i} fill={perfColor(entry.avgPrep)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {distribution.length > 0 && (
                        <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-distribution">
                          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Prep Time Distribution (Kitchen Items)</h2>
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={distribution}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717A' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#71717A' }} />
                              <ReTooltip content={<DistTooltip />} />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={800}>
                                {distribution.map((_, i) => (
                                  <Cell key={i} fill={TIME_BUCKET_COLORS[i] || '#6B7280'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Channel Performance */}
                    {byChannel.length > 0 && (
                      <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-by-channel">
                        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Performance by Channel</h2>
                        <div className={`grid grid-cols-${Math.min(byChannel.length, 3)} gap-4`}>
                          {byChannel.map((ch) => {
                            const cfg = CHANNEL_CONFIG[ch.channel] || {};
                            const Icon = cfg.icon || BarChart3;
                            const clr = cfg.color || '#6B7280';
                            const badge = perfBadge(ch.avgPrep > 0 ? ch.avgPrep : ch.avgServe);
                            return (
                              <div key={ch.channel} className="border border-zinc-200 rounded-xl p-5 hover:shadow-md transition-shadow" data-testid={`prepserve-channel-${ch.channel.toLowerCase().replace(/[^a-z]/g, '')}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${clr}15` }}>
                                      <Icon className="w-4 h-4" style={{ color: clr }} />
                                    </div>
                                    <span className="text-sm font-semibold text-zinc-800">{ch.channel}</span>
                                  </div>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.text}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                  <div>
                                    <div className="text-[10px] text-zinc-400 uppercase">{cfg.prepLabel || 'Prep'}</div>
                                    <div className="text-base font-bold" style={{ color: perfColor(ch.avgPrep) }}>{fmtMins(ch.avgPrep || null)}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-zinc-400 uppercase">{cfg.serveLabel || 'Serve'}</div>
                                    <div className="text-base font-bold text-blue-600">{fmtMins(ch.avgServe)}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-zinc-400 uppercase">Total</div>
                                    <div className="text-base font-bold text-zinc-800">{fmtMins(ch.avgTotal)}</div>
                                  </div>
                                </div>
                                <div className="text-xs text-zinc-500">{ch.orders} orders</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Insights Strip */}
                    {(insights.peakHour || insights.slowestDay) && (
                      <div className="grid grid-cols-4 gap-4" data-testid="prepserve-insights">
                        {insights.peakHour && (
                          <div className="bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-3.5 h-3.5 text-red-500" /><span className="text-[10px] font-semibold text-red-600 uppercase">Slowest Hour</span></div>
                            <div className="text-lg font-bold text-zinc-900">{insights.peakHour.hour}:00</div>
                            <div className="text-xs text-zinc-500">Avg {fmtMins(insights.peakHour.avgPrep)} prep</div>
                          </div>
                        )}
                        {insights.fastestHour && (
                          <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1"><Zap className="w-3.5 h-3.5 text-green-500" /><span className="text-[10px] font-semibold text-green-600 uppercase">Fastest Hour</span></div>
                            <div className="text-lg font-bold text-zinc-900">{insights.fastestHour.hour}:00</div>
                            <div className="text-xs text-zinc-500">Avg {fmtMins(insights.fastestHour.avgPrep)} prep</div>
                          </div>
                        )}
                        {insights.slowestDay && (
                          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /><span className="text-[10px] font-semibold text-amber-600 uppercase">Slowest Day</span></div>
                            <div className="text-lg font-bold text-zinc-900">{insights.slowestDay.date}</div>
                            <div className="text-xs text-zinc-500">Avg {fmtMins(insights.slowestDay.avgTotal)} total</div>
                          </div>
                        )}
                        {insights.fastestDay && (
                          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1"><Award className="w-3.5 h-3.5 text-blue-500" /><span className="text-[10px] font-semibold text-blue-600 uppercase">Best Day</span></div>
                            <div className="text-lg font-bold text-zinc-900">{insights.fastestDay.date}</div>
                            <div className="text-xs text-zinc-500">Avg {fmtMins(insights.fastestDay.avgTotal)} total</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ BY ITEM TAB ══ */}
                {activeView === 'items' && (
                  <div className="space-y-6">
                    {/* Slow Items */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-slow-items">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Slowest Items</h2>
                        <span className="text-xs text-zinc-400">(by total time, min 2 orders)</span>
                      </div>
                      {slowItems.length === 0 ? (
                        <p className="text-sm text-zinc-400 italic">No kitchen/bar items with timing data found.</p>
                      ) : (
                        <table className="w-full text-sm" data-testid="prepserve-slow-items-table">
                          <thead>
                            <tr className="border-b border-zinc-200">
                              <th className="text-left py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Item Name</th>
                              <th className="text-left py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Station</th>
                              <th className="text-center py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Mode</th>
                              <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Avg Prep</th>
                              <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Avg Serve</th>
                              <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Total</th>
                              <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Orders</th>
                            </tr>
                          </thead>
                          <tbody>
                            {slowItems.map((item, i) => {
                              const total = (item.avgPrep || 0) + (item.avgServe || 0);
                              return (
                                <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors" data-testid={`prepserve-slow-item-${i}`}>
                                  <td className="py-3 px-3 font-medium text-zinc-800">{item.name}</td>
                                  <td className="py-3 px-3 text-zinc-500">{item.station}</td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.mode === 'kitchen' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                      {item.mode === 'kitchen' ? 'Kitchen' : 'Bar'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right font-semibold" style={{ color: perfColor(item.avgPrep) }}>{fmtMins(item.avgPrep || null)}</td>
                                  <td className="py-3 px-3 text-right text-blue-600">{fmtMins(item.avgServe)}</td>
                                  <td className="py-3 px-3 text-right font-medium text-zinc-700">{fmtMins(total)}</td>
                                  <td className="py-3 px-3 text-right text-zinc-600">{item.orders}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Fast Items */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-fast-items">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-green-500" />
                        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Fastest Items</h2>
                        <span className="text-xs text-zinc-400">(by total time, min 2 orders)</span>
                      </div>
                      {fastItems.length === 0 ? (
                        <p className="text-sm text-zinc-400 italic">No kitchen/bar items with timing data found.</p>
                      ) : (
                        <table className="w-full text-sm" data-testid="prepserve-fast-items-table">
                          <thead>
                            <tr className="border-b border-zinc-200">
                              <th className="text-left py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Item Name</th>
                              <th className="text-left py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Station</th>
                              <th className="text-center py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Mode</th>
                              <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Avg Prep</th>
                              <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Avg Serve</th>
                              <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Total</th>
                              <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Orders</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fastItems.map((item, i) => {
                              const total = (item.avgPrep || 0) + (item.avgServe || 0);
                              return (
                                <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors" data-testid={`prepserve-fast-item-${i}`}>
                                  <td className="py-3 px-3 font-medium text-zinc-800">{item.name}</td>
                                  <td className="py-3 px-3 text-zinc-500">{item.station}</td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.mode === 'kitchen' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                      {item.mode === 'kitchen' ? 'Kitchen' : 'Bar'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right font-semibold" style={{ color: perfColor(item.avgPrep) }}>{fmtMins(item.avgPrep || null)}</td>
                                  <td className="py-3 px-3 text-right text-blue-600">{fmtMins(item.avgServe)}</td>
                                  <td className="py-3 px-3 text-right font-medium text-zinc-700">{fmtMins(total)}</td>
                                  <td className="py-3 px-3 text-right text-zinc-600">{item.orders}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* ══ BY STATION TAB ══ */}
                {activeView === 'stations' && (
                  <div className="space-y-6">
                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-station-cards">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Station Performance</h2>
                      {byStation.length === 0 ? (
                        <p className="text-sm text-zinc-400 italic">No station data available.</p>
                      ) : (
                        <div className={`grid gap-4 ${byStation.length >= 3 ? 'grid-cols-3' : byStation.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {byStation.map((st) => {
                            const badge = perfBadge(st.avgPrep > 0 ? st.avgPrep : st.avgServe);
                            return (
                              <div key={st.station} className="border border-zinc-200 rounded-xl p-5 hover:shadow-md transition-shadow" data-testid={`prepserve-station-${st.station.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-sm font-semibold text-zinc-800">{st.station}</h3>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.text}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <div className="text-[10px] text-zinc-400 uppercase">Avg Prep</div>
                                    <div className="text-lg font-bold" style={{ color: perfColor(st.avgPrep) }}>{fmtMins(st.avgPrep || null)}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-zinc-400 uppercase">Avg Serve</div>
                                    <div className="text-lg font-bold text-blue-600">{fmtMins(st.avgServe)}</div>
                                  </div>
                                </div>
                                <div className="text-xs text-zinc-500 mb-2">{st.orders} orders · {st.items} items</div>
                                {/* Mode breakdown */}
                                <div className="flex items-center gap-2 text-[10px]">
                                  {st.modes.kitchen > 0 && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded font-medium">Kitchen: {st.modes.kitchen}</span>}
                                  {st.modes.bar > 0 && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">Bar: {st.modes.bar}</span>}
                                  {st.modes.direct > 0 && <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded font-medium">Direct: {st.modes.direct}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Station Comparison Chart */}
                    {byStation.length > 1 && (
                      <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-station-chart">
                        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Station Comparison</h2>
                        <ResponsiveContainer width="100%" height={Math.max(200, byStation.length * 50)}>
                          <BarChart data={byStation} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#71717A' }} unit=" min" />
                            <YAxis type="category" dataKey="station" tick={{ fontSize: 11, fill: '#71717A' }} width={120} />
                            <ReTooltip content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload;
                              return (
                                <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700 min-w-[160px]">
                                  <div className="font-semibold mb-1.5 border-b border-zinc-700 pb-1">{d.station}</div>
                                  <div className="flex justify-between py-0.5"><span className="text-orange-400">Prep</span><span>{fmtMins(d.avgPrep)}</span></div>
                                  <div className="flex justify-between py-0.5"><span className="text-blue-400">Serve</span><span>{fmtMins(d.avgServe)}</span></div>
                                  <div className="text-zinc-400 mt-1">{d.orders} orders · {d.items} items</div>
                                </div>
                              );
                            }} />
                            <Bar dataKey="avgPrep" name="Prep" fill="#F26B33" radius={[0, 4, 4, 0]} stackId="stack" animationDuration={800} />
                            <Bar dataKey="avgServe" name="Serve" fill="#3B82F6" radius={[0, 4, 4, 0]} stackId="stack" animationDuration={800} />
                            <Legend formatter={(value) => <span className="text-xs text-zinc-600">{value}</span>} iconType="circle" iconSize={8} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

export default PrepServeTimeMockup;
