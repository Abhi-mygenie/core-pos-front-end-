/**
 * PrepServeTimeMockup — CR-011 S10 (Phase 2 Hero Screen)
 *
 * Gate ① — MOCKUP ONLY (seed data). No live API wiring.
 *
 * Prep & Serve Time deep-dive: lifecycle-mode-aware kitchen timing,
 * order-to-ready (prep), ready-to-served (serve), end-to-end (total).
 *
 * Timing fields from API:
 *   - created_at → order placed
 *   - ready_at   → food marked ready (per item)
 *   - serve_at   → food marked served (per item)
 *
 * Lifecycle modes:
 *   - Dine-In: full cycle (prep → serve → table)
 *   - Delivery: prep → dispatch (serve_at = dispatched)
 *   - Takeaway: prep → handover (serve_at = collected)
 *
 * PACKAGED items: food_status=5 with no timestamps → direct-serve (0 min)
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import {
  ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown,
  Mail, MessageCircle, Send, Clock, Timer, Zap, Target,
  ChefHat, UtensilsCrossed, Truck, Coffee, TrendingUp, TrendingDown,
  AlertTriangle, Award, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

/* ── Helpers ── */
const fmtMins = (n) => {
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
const CHANNEL_COLORS = ['#F26B33', '#329937', '#3B82F6'];

/* ── Time Bucket Config ── */
const TIME_BUCKETS = [
  { label: '0-5 min',   min: 0, max: 5,   color: '#22C55E' },
  { label: '5-10 min',  min: 5, max: 10,  color: '#3B82F6' },
  { label: '10-15 min', min: 10, max: 15, color: '#F59E0B' },
  { label: '15-20 min', min: 15, max: 20, color: '#F26B33' },
  { label: '20-30 min', min: 20, max: 30, color: '#EF4444' },
  { label: '30+ min',   min: 30, max: 999, color: '#DC2626' },
];

/* ── Seed Data ── */
const SEED_DAILY = [
  { date: '01/06/2026', avgPrep: 12.3, avgServe: 4.1, avgTotal: 16.4, orders: 48, withinTarget: 35 },
  { date: '02/06/2026', avgPrep: 14.7, avgServe: 3.8, avgTotal: 18.5, orders: 52, withinTarget: 34 },
  { date: '03/06/2026', avgPrep: 11.2, avgServe: 3.5, avgTotal: 14.7, orders: 61, withinTarget: 49 },
  { date: '04/06/2026', avgPrep: 13.9, avgServe: 4.5, avgTotal: 18.4, orders: 44, withinTarget: 28 },
  { date: '05/06/2026', avgPrep: 10.8, avgServe: 3.2, avgTotal: 14.0, orders: 55, withinTarget: 46 },
  { date: '06/06/2026', avgPrep: 15.2, avgServe: 5.1, avgTotal: 20.3, orders: 58, withinTarget: 30 },
  { date: '07/06/2026', avgPrep: 9.5,  avgServe: 2.9, avgTotal: 12.4, orders: 38, withinTarget: 32 },
];

const SEED_HOURLY = [
  { hour: '09', avgPrep: 8.2,  avgServe: 2.5, orders: 12 },
  { hour: '10', avgPrep: 9.1,  avgServe: 2.8, orders: 18 },
  { hour: '11', avgPrep: 11.4, avgServe: 3.2, orders: 28 },
  { hour: '12', avgPrep: 16.8, avgServe: 5.1, orders: 45 },
  { hour: '13', avgPrep: 18.2, avgServe: 5.8, orders: 52 },
  { hour: '14', avgPrep: 14.5, avgServe: 4.2, orders: 38 },
  { hour: '15', avgPrep: 10.3, avgServe: 3.0, orders: 15 },
  { hour: '16', avgPrep: 9.8,  avgServe: 2.9, orders: 10 },
  { hour: '17', avgPrep: 11.0, avgServe: 3.4, orders: 20 },
  { hour: '18', avgPrep: 13.5, avgServe: 4.0, orders: 32 },
  { hour: '19', avgPrep: 17.9, avgServe: 5.5, orders: 48 },
  { hour: '20', avgPrep: 19.4, avgServe: 6.2, orders: 55 },
  { hour: '21', avgPrep: 16.1, avgServe: 4.8, orders: 42 },
  { hour: '22', avgPrep: 12.0, avgServe: 3.6, orders: 22 },
];

const SEED_BY_CHANNEL = [
  { channel: 'Dine-In',  avgPrep: 13.4, avgServe: 4.2, avgTotal: 17.6, orders: 198, withinTarget: 132 },
  { channel: 'Delivery', avgPrep: 15.8, avgServe: 2.1, avgTotal: 17.9, orders: 112, withinTarget: 68 },
  { channel: 'Takeaway', avgPrep: 10.2, avgServe: 1.5, avgTotal: 11.7, orders: 46,  withinTarget: 40 },
];

const SEED_DISTRIBUTION = [
  { label: '0-5 min',   count: 42,  pct: 11.8 },
  { label: '5-10 min',  count: 78,  pct: 21.9 },
  { label: '10-15 min', count: 112, pct: 31.5 },
  { label: '15-20 min', count: 68,  pct: 19.1 },
  { label: '20-30 min', count: 38,  pct: 10.7 },
  { label: '30+ min',   count: 18,  pct: 5.0 },
];

const SEED_SLOW_ITEMS = [
  { name: 'Biryani (Chicken)',   avgPrep: 28.5, avgServe: 3.2, orders: 34, station: 'Main Kitchen' },
  { name: 'Tandoori Platter',    avgPrep: 25.1, avgServe: 2.8, orders: 22, station: 'Tandoor' },
  { name: 'Thali Special',       avgPrep: 22.8, avgServe: 4.5, orders: 18, station: 'Main Kitchen' },
  { name: 'Paneer Tikka Masala', avgPrep: 20.3, avgServe: 3.1, orders: 28, station: 'Main Kitchen' },
  { name: 'Dal Makhani',         avgPrep: 18.9, avgServe: 2.4, orders: 42, station: 'Main Kitchen' },
  { name: 'Butter Chicken',      avgPrep: 18.2, avgServe: 2.9, orders: 38, station: 'Main Kitchen' },
  { name: 'Masala Dosa',         avgPrep: 16.5, avgServe: 1.8, orders: 25, station: 'South Indian' },
  { name: 'Hakka Noodles',       avgPrep: 15.8, avgServe: 2.2, orders: 30, station: 'Chinese' },
];

const SEED_FAST_ITEMS = [
  { name: 'Cold Coffee',      avgPrep: 3.2,  avgServe: 1.1, orders: 45, station: 'Beverages' },
  { name: 'Fresh Lime Soda',  avgPrep: 2.8,  avgServe: 0.8, orders: 38, station: 'Beverages' },
  { name: 'Papad',            avgPrep: 1.5,  avgServe: 0.5, orders: 52, station: 'Main Kitchen' },
  { name: 'Green Salad',      avgPrep: 4.2,  avgServe: 1.0, orders: 22, station: 'Salad Bar' },
  { name: 'Garlic Naan',      avgPrep: 5.1,  avgServe: 1.2, orders: 65, station: 'Tandoor' },
];

const SEED_BY_STATION = [
  { station: 'Main Kitchen',  avgPrep: 16.2, avgServe: 3.4, orders: 168, items: 245, withinTarget: 98 },
  { station: 'Tandoor',       avgPrep: 14.8, avgServe: 2.5, orders: 87,  items: 120, withinTarget: 58 },
  { station: 'Chinese',       avgPrep: 13.1, avgServe: 2.8, orders: 42,  items: 58,  withinTarget: 30 },
  { station: 'South Indian',  avgPrep: 11.5, avgServe: 2.0, orders: 35,  items: 48,  withinTarget: 28 },
  { station: 'Beverages',     avgPrep: 3.5,  avgServe: 1.0, orders: 83,  items: 102, withinTarget: 80 },
  { station: 'Salad Bar',     avgPrep: 4.8,  avgServe: 0.9, orders: 22,  items: 28,  withinTarget: 21 },
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
      <div className="border-t border-zinc-700 mt-1 pt-1 flex justify-between"><span className="text-zinc-400">{d.orders} orders</span><span>{fmtPct(d.orders > 0 ? (d.withinTarget / d.orders * 100) : 0)} on-target</span></div>
    </div>
  );
};

const HourlyTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700 min-w-[160px]">
      <div className="font-semibold mb-1.5 border-b border-zinc-700 pb-1">{d.hour}:00</div>
      <div className="flex justify-between py-0.5"><span className="text-orange-400">Prep</span><span>{fmtMins(d.avgPrep)}</span></div>
      <div className="flex justify-between py-0.5"><span className="text-blue-400">Serve</span><span>{fmtMins(d.avgServe)}</span></div>
      <div className="flex justify-between py-0.5"><span className="text-zinc-400">{d.orders} orders</span></div>
    </div>
  );
};

const DistTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700">
      <div className="font-semibold">{d.label}</div>
      <div>{d.count} orders ({fmtPct(d.pct)})</div>
    </div>
  );
};

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: false, testId: 'prepserve-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: false, testId: 'prepserve-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 'prepserve-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 'prepserve-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 'prepserve-share-sms-btn' },
];

const VIEW_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'items', label: 'By Item' },
  { id: 'stations', label: 'By Station' },
];

/* ══════════════════════════════════════════════════════════════════════════════ */
const PrepServeTimeMockup = () => {
  const navigate = useNavigate();
  const downloadRef = useRef(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [activeView, setActiveView] = useState('overview');

  const fmtISO = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
  const [fromDate, setFromDate] = useState(fmtISO(sevenDaysAgo));
  const [toDate, setToDate] = useState(fmtISO(today));
  const [activePreset, setActivePreset] = useState('7D');

  useEffect(() => {
    const handler = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Computed seed analytics ── */
  const analytics = useMemo(() => {
    const totalOrders = SEED_DAILY.reduce((s, d) => s + d.orders, 0);
    const totalWithinTarget = SEED_DAILY.reduce((s, d) => s + d.withinTarget, 0);
    const weightedPrep = SEED_DAILY.reduce((s, d) => s + d.avgPrep * d.orders, 0);
    const weightedServe = SEED_DAILY.reduce((s, d) => s + d.avgServe * d.orders, 0);
    const weightedTotal = SEED_DAILY.reduce((s, d) => s + d.avgTotal * d.orders, 0);
    const avgPrep = totalOrders > 0 ? weightedPrep / totalOrders : 0;
    const avgServe = totalOrders > 0 ? weightedServe / totalOrders : 0;
    const avgTotal = totalOrders > 0 ? weightedTotal / totalOrders : 0;
    const targetPct = totalOrders > 0 ? (totalWithinTarget / totalOrders * 100) : 0;

    const peakHour = SEED_HOURLY.reduce((best, h) => h.avgPrep > (best?.avgPrep || 0) ? h : best, null);
    const fastestHour = SEED_HOURLY.reduce((best, h) => h.avgPrep < (best?.avgPrep || Infinity) ? h : best, null);
    const slowestDay = SEED_DAILY.reduce((best, d) => d.avgTotal > (best?.avgTotal || 0) ? d : best, null);
    const fastestDay = SEED_DAILY.reduce((best, d) => d.avgTotal < (best?.avgTotal || Infinity) ? d : best, null);

    return {
      totalOrders, totalWithinTarget, avgPrep, avgServe, avgTotal, targetPct,
      peakHour, fastestHour, slowestDay, fastestDay,
    };
  }, []);

  /* ── Performance color ── */
  const perfColor = (mins, target = 15) => {
    if (mins <= target * 0.7) return '#22C55E';
    if (mins <= target) return '#3B82F6';
    if (mins <= target * 1.3) return '#F59E0B';
    return '#EF4444';
  };

  const perfBadge = (mins, target = 15) => {
    if (mins <= target * 0.7) return { text: 'Excellent', bg: '#DCFCE7', color: '#15803D' };
    if (mins <= target) return { text: 'On Target', bg: '#DBEAFE', color: '#1D4ED8' };
    if (mins <= target * 1.3) return { text: 'Needs Attention', bg: '#FEF3C7', color: '#B45309' };
    return { text: 'Critical', bg: '#FEE2E2', color: '#DC2626' };
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
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Prep & Serve Time
                </h1>
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">Gate 1 — Seed Data Mockup</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 border border-zinc-200 bg-white rounded-lg" data-testid="prepserve-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="prepserve-date-from" />
                </label>
                <span className="text-zinc-300">—</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="prepserve-date-to" />
                </label>
              </div>

              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="prepserve-presets">
                {['Today', '7D', '30D', 'MTD'].map((p) => (
                  <button key={p} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} data-testid={`prepserve-preset-${p.toLowerCase()}`} onClick={() => setActivePreset(p)}>
                    {p}
                  </button>
                ))}
              </div>

              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-zinc-300 text-zinc-400 cursor-not-allowed opacity-50" data-testid="prepserve-download-trigger">
                  <Download className="w-4 h-4" /> Download
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="prepserve-download-menu">
                    {DOWNLOAD_MENU.map((item) => (
                      <button key={item.id} disabled className="w-full flex items-center gap-3 px-4 py-3 text-left text-zinc-400 cursor-not-allowed" data-testid={item.testId}>
                        <item.icon className="w-4 h-4 text-zinc-300" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-auto p-8" data-testid="prepserve-content">
            <div className="space-y-6">

              {/* ── KPI Strip ── */}
              <div className="grid grid-cols-4 gap-4" data-testid="prepserve-kpi-strip">
                <div className="bg-white border border-zinc-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2"><ChefHat className="w-4 h-4 text-orange-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Avg Prep Time</span></div>
                  <div className="text-2xl font-bold" style={{ color: perfColor(analytics.avgPrep) }} data-testid="prepserve-avg-prep">{fmtMins(analytics.avgPrep)}</div>
                  <div className="text-xs text-zinc-400 mt-1">Order placed → Food ready</div>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2"><UtensilsCrossed className="w-4 h-4 text-blue-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Avg Serve Time</span></div>
                  <div className="text-2xl font-bold" style={{ color: perfColor(analytics.avgServe, 5) }} data-testid="prepserve-avg-serve">{fmtMins(analytics.avgServe)}</div>
                  <div className="text-xs text-zinc-400 mt-1">Food ready → Served to customer</div>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2"><Timer className="w-4 h-4 text-emerald-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Avg Total Time</span></div>
                  <div className="text-2xl font-bold" style={{ color: perfColor(analytics.avgTotal, 20) }} data-testid="prepserve-avg-total">{fmtMins(analytics.avgTotal)}</div>
                  <div className="text-xs text-zinc-400 mt-1">End-to-end · {analytics.totalOrders} orders</div>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-green-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Within Target</span></div>
                  <div className="text-2xl font-bold" style={{ color: analytics.targetPct >= 70 ? '#22C55E' : analytics.targetPct >= 50 ? '#F59E0B' : '#EF4444' }} data-testid="prepserve-target-pct">{fmtPct(analytics.targetPct)}</div>
                  <div className="text-xs text-zinc-400 mt-1">{analytics.totalWithinTarget} of {analytics.totalOrders} within 15 min target</div>
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
                  {/* ── Daily Trend ── */}
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
                      <AreaChart data={SEED_DAILY}>
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

                  {/* ── Hourly Heatmap + Prep Time Distribution ── */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-hourly">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Prep Time by Hour</h2>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={SEED_HOURLY}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                          <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#71717A' }} tickFormatter={(v) => `${v}:00`} />
                          <YAxis tick={{ fontSize: 11, fill: '#71717A' }} unit=" min" />
                          <ReTooltip content={<HourlyTooltip />} />
                          <Bar dataKey="avgPrep" radius={[4, 4, 0, 0]} animationDuration={800}>
                            {SEED_HOURLY.map((entry, i) => (
                              <Cell key={i} fill={perfColor(entry.avgPrep)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22C55E]" />Fast (&lt;10m)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" />Normal</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" />Slow</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444]" />Critical</span>
                      </div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-distribution">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Prep Time Distribution</h2>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={SEED_DISTRIBUTION}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717A' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#71717A' }} />
                          <ReTooltip content={<DistTooltip />} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={800}>
                            {SEED_DISTRIBUTION.map((entry, i) => (
                              <Cell key={i} fill={TIME_BUCKETS[i]?.color || '#6B7280'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22C55E]" />0-5m</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" />5-10m</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" />10-15m</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F26B33]" />15-20m</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444]" />20-30m</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#DC2626]" />30+m</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Channel Performance Cards ── */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-by-channel">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Performance by Channel</h2>
                    <div className="grid grid-cols-3 gap-4">
                      {SEED_BY_CHANNEL.map((ch) => {
                        const cfg = CHANNEL_CONFIG[ch.channel] || {};
                        const Icon = cfg.icon || BarChart3;
                        const badge = perfBadge(ch.avgPrep);
                        const onTargetPct = ch.orders > 0 ? (ch.withinTarget / ch.orders * 100) : 0;
                        return (
                          <div key={ch.channel} className="border border-zinc-200 rounded-xl p-5 hover:shadow-md transition-shadow" data-testid={`prepserve-channel-${ch.channel.toLowerCase().replace(/[^a-z]/g, '')}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cfg.color}15` }}>
                                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                                </div>
                                <span className="text-sm font-semibold text-zinc-800">{ch.channel}</span>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.text}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div>
                                <div className="text-[10px] text-zinc-400 uppercase">{cfg.prepLabel || 'Prep'}</div>
                                <div className="text-base font-bold" style={{ color: perfColor(ch.avgPrep) }}>{fmtMins(ch.avgPrep)}</div>
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
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                              <span>{ch.orders} orders</span>
                              <span className="font-medium" style={{ color: onTargetPct >= 70 ? '#22C55E' : onTargetPct >= 50 ? '#F59E0B' : '#EF4444' }}>{fmtPct(onTargetPct)} on-target</span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${onTargetPct}%`, backgroundColor: onTargetPct >= 70 ? '#22C55E' : onTargetPct >= 50 ? '#F59E0B' : '#EF4444' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Insights Strip ── */}
                  <div className="grid grid-cols-4 gap-4" data-testid="prepserve-insights">
                    <div className="bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-3.5 h-3.5 text-red-500" /><span className="text-[10px] font-semibold text-red-600 uppercase">Slowest Hour</span></div>
                      <div className="text-lg font-bold text-zinc-900">{analytics.peakHour?.hour}:00</div>
                      <div className="text-xs text-zinc-500">Avg {fmtMins(analytics.peakHour?.avgPrep)} prep</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1"><Zap className="w-3.5 h-3.5 text-green-500" /><span className="text-[10px] font-semibold text-green-600 uppercase">Fastest Hour</span></div>
                      <div className="text-lg font-bold text-zinc-900">{analytics.fastestHour?.hour}:00</div>
                      <div className="text-xs text-zinc-500">Avg {fmtMins(analytics.fastestHour?.avgPrep)} prep</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /><span className="text-[10px] font-semibold text-amber-600 uppercase">Slowest Day</span></div>
                      <div className="text-lg font-bold text-zinc-900">{analytics.slowestDay?.date}</div>
                      <div className="text-xs text-zinc-500">Avg {fmtMins(analytics.slowestDay?.avgTotal)} total</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1"><Award className="w-3.5 h-3.5 text-blue-500" /><span className="text-[10px] font-semibold text-blue-600 uppercase">Best Day</span></div>
                      <div className="text-lg font-bold text-zinc-900">{analytics.fastestDay?.date}</div>
                      <div className="text-xs text-zinc-500">Avg {fmtMins(analytics.fastestDay?.avgTotal)} total</div>
                    </div>
                  </div>
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
                      <span className="text-xs text-zinc-400">(by avg prep time)</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" data-testid="prepserve-slow-items-table">
                        <thead>
                          <tr className="border-b border-zinc-200">
                            <th className="text-left py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Item Name</th>
                            <th className="text-left py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Station</th>
                            <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Avg Prep</th>
                            <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Avg Serve</th>
                            <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Total</th>
                            <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Orders</th>
                            <th className="text-center py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {SEED_SLOW_ITEMS.map((item, i) => {
                            const total = item.avgPrep + item.avgServe;
                            const badge = perfBadge(item.avgPrep);
                            return (
                              <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors" data-testid={`prepserve-slow-item-${i}`}>
                                <td className="py-3 px-3 font-medium text-zinc-800">{item.name}</td>
                                <td className="py-3 px-3 text-zinc-500">{item.station}</td>
                                <td className="py-3 px-3 text-right font-semibold" style={{ color: perfColor(item.avgPrep) }}>{fmtMins(item.avgPrep)}</td>
                                <td className="py-3 px-3 text-right text-blue-600">{fmtMins(item.avgServe)}</td>
                                <td className="py-3 px-3 text-right font-medium text-zinc-700">{fmtMins(total)}</td>
                                <td className="py-3 px-3 text-right text-zinc-600">{item.orders}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.text}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Fast Items */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-fast-items">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-4 h-4 text-green-500" />
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Fastest Items</h2>
                      <span className="text-xs text-zinc-400">(by avg prep time)</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" data-testid="prepserve-fast-items-table">
                        <thead>
                          <tr className="border-b border-zinc-200">
                            <th className="text-left py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Item Name</th>
                            <th className="text-left py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Station</th>
                            <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Avg Prep</th>
                            <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Avg Serve</th>
                            <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Total</th>
                            <th className="text-right py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Orders</th>
                            <th className="text-center py-3 px-3 text-[10px] font-semibold text-zinc-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {SEED_FAST_ITEMS.map((item, i) => {
                            const total = item.avgPrep + item.avgServe;
                            const badge = perfBadge(item.avgPrep);
                            return (
                              <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors" data-testid={`prepserve-fast-item-${i}`}>
                                <td className="py-3 px-3 font-medium text-zinc-800">{item.name}</td>
                                <td className="py-3 px-3 text-zinc-500">{item.station}</td>
                                <td className="py-3 px-3 text-right font-semibold" style={{ color: perfColor(item.avgPrep) }}>{fmtMins(item.avgPrep)}</td>
                                <td className="py-3 px-3 text-right text-blue-600">{fmtMins(item.avgServe)}</td>
                                <td className="py-3 px-3 text-right font-medium text-zinc-700">{fmtMins(total)}</td>
                                <td className="py-3 px-3 text-right text-zinc-600">{item.orders}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.text}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ BY STATION TAB ══ */}
              {activeView === 'stations' && (
                <div className="space-y-6">
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-station-cards">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Station Performance</h2>
                    <div className="grid grid-cols-3 gap-4">
                      {SEED_BY_STATION.map((st) => {
                        const badge = perfBadge(st.avgPrep);
                        const onTargetPct = st.orders > 0 ? (st.withinTarget / st.orders * 100) : 0;
                        return (
                          <div key={st.station} className="border border-zinc-200 rounded-xl p-5 hover:shadow-md transition-shadow" data-testid={`prepserve-station-${st.station.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-semibold text-zinc-800">{st.station}</h3>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.text}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <div className="text-[10px] text-zinc-400 uppercase">Avg Prep</div>
                                <div className="text-lg font-bold" style={{ color: perfColor(st.avgPrep) }}>{fmtMins(st.avgPrep)}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-zinc-400 uppercase">Avg Serve</div>
                                <div className="text-lg font-bold text-blue-600">{fmtMins(st.avgServe)}</div>
                              </div>
                            </div>
                            <div className="text-xs text-zinc-500 mb-2">{st.orders} orders · {st.items} items</div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-zinc-400">On-target</span>
                              <span className="font-medium" style={{ color: onTargetPct >= 70 ? '#22C55E' : onTargetPct >= 50 ? '#F59E0B' : '#EF4444' }}>{fmtPct(onTargetPct)}</span>
                            </div>
                            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${onTargetPct}%`, backgroundColor: onTargetPct >= 70 ? '#22C55E' : onTargetPct >= 50 ? '#F59E0B' : '#EF4444' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Station Comparison Bar Chart */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="prepserve-station-chart">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Station Comparison</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={SEED_BY_STATION} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#71717A' }} unit=" min" />
                        <YAxis type="category" dataKey="station" tick={{ fontSize: 11, fill: '#71717A' }} width={100} />
                        <ReTooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700 min-w-[160px]">
                              <div className="font-semibold mb-1.5 border-b border-zinc-700 pb-1">{d.station}</div>
                              <div className="flex justify-between py-0.5"><span className="text-orange-400">Prep</span><span>{fmtMins(d.avgPrep)}</span></div>
                              <div className="flex justify-between py-0.5"><span className="text-blue-400">Serve</span><span>{fmtMins(d.avgServe)}</span></div>
                              <div className="flex justify-between py-0.5"><span className="text-zinc-400">{d.orders} orders</span></div>
                            </div>
                          );
                        }} />
                        <Bar dataKey="avgPrep" name="Prep" fill="#F26B33" radius={[0, 4, 4, 0]} stackId="stack" animationDuration={800} />
                        <Bar dataKey="avgServe" name="Serve" fill="#3B82F6" radius={[0, 4, 4, 0]} stackId="stack" animationDuration={800} />
                        <Legend formatter={(value) => <span className="text-xs text-zinc-600">{value}</span>} iconType="circle" iconSize={8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrepServeTimeMockup;
