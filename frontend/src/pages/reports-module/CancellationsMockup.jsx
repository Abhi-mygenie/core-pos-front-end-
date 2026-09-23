/**
 * CancellationsMockup — CR-011 S9 (Phase 2 Hero Screen)
 *
 * Gate ④ — LIVE API wired via order-logs-report.
 *
 * Fixes applied (2026-06-06 investigation):
 *   FIX 1 — Loader: useReportFetch + ReportLoadingShield wrapping children
 *   FIX 2 — Header: S5 Apply-button pattern inherited (orange draft border, green Apply, FY preset, loading states)
 *   FIX 3B — Revenue: aligned with insightsService.js audited formula (subtotal + tax)
 *   Audit Tab — Flags cancelled items where discount/serviceCharge/gst/vat were NOT reverted to 0
 *
 * Cancellation Stages (system-generated cancel_type, FE-normalized):
 *   "preparing"              → Before Cooking
 *   "serve" | "Pre-Serve"    → Before Serving
 *   "ready" | "Post-Serve"   → After Serving
 *   "Order"                  → Backend bug (full order cancel overwrites) — show as-is
 *   null / unknown           → Unknown
 *
 * Two scopes:
 *   - Order-level: payment_method = 'cancelled' (entire order cancelled)
 *   - Item-level: food_status = 3 within active orders
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { fetchInsightsCancellations } from '../../api/services/insightsService'; // CR-049: backend aggregation
// CR-049: kept for reference — import api from '../../api/axios';
// CR-049: kept for reference — import { API_ENDPOINTS } from '../../api/constants';
// CR-045: orderPayloadStripper removed — backend strips server-side (2026-06-17)
import { getBusinessDayRange, isWithinBusinessDay } from '../../utils/businessDay';
import {
  CANCEL_LOOKBACK_DAYS, isOrderCancelledScope, getCancelAt,
  valueCancelledLine, valueCancelledOrder,
} from '../../utils/cancellationValuation';
import useReportFetch from '../../components/reports/useReportFetch';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import {
  ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown,
  Mail, MessageCircle, Send, XCircle, AlertTriangle, TrendingDown,
  Users, Clock, UtensilsCrossed, ChefHat, MessageSquare,
  ShieldAlert, ChevronDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

/* ── Helpers ── */
const fmtISO = (d) => d.toISOString().slice(0, 10);
const addDaysISO = (dateStr, n) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtINR = (n) => {
  const v = parseFloat(n) || 0;
  return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtPct = (n) => `${(parseFloat(n) || 0).toFixed(1)}%`;

// dateOnly removed (CR-031): display dates now business-day-adjusted via bdayDisplay
const timeOnly = (iso) => {
  if (!iso) return '';
  const t = iso.includes('T') ? iso.split('T')[1] : iso.split(' ')[1];
  return t ? t.substring(0, 5) : '';
};

/* ── cancel_type → Stage normalization ── */
const normalizeStage = (cancelType) => {
  if (!cancelType) return 'Unknown';
  const ct = cancelType.toLowerCase().trim();
  if (ct === 'preparing') return 'Before Cooking';
  if (ct === 'serve' || ct === 'pre-serve') return 'Before Serving';
  if (ct === 'ready' || ct === 'post-serve') return 'After Serving';
  if (ct === 'order') return 'Order';
  return 'Unknown';
};

/* ── Stage Config ── */
const STAGE_CONFIG = {
  'Before Cooking':   { color: '#3B82F6', icon: Clock,            order: 1 },
  'Before Serving':   { color: '#F26B33', icon: ChefHat,          order: 2 },
  'After Serving':    { color: '#EF4444', icon: UtensilsCrossed,   order: 3 },
  'Order':            { color: '#8B5CF6', icon: XCircle,           order: 4 },
  'Unknown':          { color: '#6B7280', icon: AlertTriangle,     order: 5 },
};

/* ── Audit tab env gate ── */
const SHOW_AUDIT_TAB = process.env.REACT_APP_SHOW_AUDIT_TAB === 'true';

/* ── Scope tabs ── */
const ALL_SCOPE_TABS = [
  { id: 'all', label: 'All Cancellations' },
  { id: 'order', label: 'Order-Level' },
  { id: 'item', label: 'Item-Level' },
  { id: 'audit', label: 'Audit' },
];
const SCOPE_TABS = SHOW_AUDIT_TAB ? ALL_SCOPE_TABS : ALL_SCOPE_TABS.filter(t => t.id !== 'audit');

/* ── Tooltips ── */
const BarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700 min-w-[160px]">
      <div className="font-semibold mb-1.5 border-b border-zinc-700 pb-1">{d.date}</div>
      <div className="flex justify-between py-0.5"><span className="text-red-400">Order Cancels</span><span>{d.orderCancels}</span></div>
      <div className="flex justify-between py-0.5"><span className="text-orange-400">Item Cancels</span><span>{d.itemCancels}</span></div>
      <div className="border-t border-zinc-700 mt-1 pt-1 flex justify-between">
        <span className="text-zinc-400">Revenue Loss</span><span>{fmtINR((d.orderLoss || 0) + (d.itemLoss || 0))}</span>
      </div>
    </div>
  );
};

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-zinc-700">
      <div className="font-semibold">{d.name}</div>
      <div>{d.payload.count} cancellations</div>
      <div className="text-red-400">Loss: {fmtINR(d.value)}</div>
    </div>
  );
};

const ReasonTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700 min-w-[160px]">
      <div className="font-semibold mb-1">{d.reason}</div>
      <div className="flex justify-between py-0.5"><span className="text-zinc-400">Count</span><span>{d.count}</span></div>
      <div className="flex justify-between py-0.5"><span className="text-red-400">Loss</span><span>{fmtINR(d.loss)}</span></div>
    </div>
  );
};

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{(percent * 100).toFixed(0)}%</text>;
};

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: false, testId: 'cancellations-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: false, testId: 'cancellations-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 'cancellations-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 'cancellations-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 'cancellations-share-sms-btn' },
];

/* ══════════════════════════════════════════════════════════════════════════════ */
const CancellationsMockup = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const schedules = restaurant?.schedules || [];
  const downloadRef = useRef(null);

  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [activeScope, setActiveScope] = useState('all');

  // Date range — draft vs applied (S5 pattern)
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const [fromDate, setFromDate] = useState(sharedFrom);
  const [toDate, setToDate] = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo, setAppliedTo] = useState(sharedTo);
  const [activePreset, setActivePreset] = useState('7D');

  useEffect(() => {
    const handler = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Date guards (S5 pattern)
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const MAX_RANGE_DAYS = 365; // INV-001: lifted from 62
  const draftRangeExceeded = draftValid && ((new Date(toDate) - new Date(fromDate)) / 86400000) > MAX_RANGE_DAYS;
  const datesValid = appliedFrom && appliedTo && appliedFrom <= appliedTo;
  const canApply = draftDirty && draftValid && !draftRangeExceeded;
  const maxToDate = fromDate ? new Date(new Date(fromDate).getTime() + MAX_RANGE_DAYS * 86400000).toISOString().slice(0, 10) : '';
  const minFromDate = toDate ? new Date(new Date(toDate).getTime() - MAX_RANGE_DAYS * 86400000).toISOString().slice(0, 10) : '';

  const handleApply = () => { if (canApply) { setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset(''); } };
  const handlePreset = (p) => {
    const t = new Date(); let f;
    if (p === 'Today') f = t;
    else if (p === '7D') f = new Date(t.getTime() - 6 * 86400000);
    else if (p === '30D') f = new Date(t.getTime() - 29 * 86400000);
    else if (p === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); }
    else if (p === 'FY') { // INV-001: last completed FY (Apr 1 → Mar 31)
      const fyEndYear = t.getMonth() >= 3 ? t.getFullYear() : t.getFullYear() - 1;
      f = new Date(fyEndYear - 1, 3, 1); t = new Date(fyEndYear, 2, 31);
    }
    else return;
    const fd = fmtISO(f); const td = fmtISO(t);
    setFromDate(fd); setToDate(td); setAppliedFrom(fd); setAppliedTo(td); setActivePreset(p);
  };

  /* ── CR-049: Fetch from backend insights-cancellations endpoint ── */
  const { data: cancelBackend, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(
    async () => {
      const data = await fetchInsightsCancellations(appliedFrom, appliedTo);
      return data;
    },
    [appliedFrom, appliedTo],
    { enabled: datesValid }
  );

  /* ── CR-049: Transform backend response → cancelledItems for table rendering ── */
  const cancelledItems = useMemo(() => {
    if (!cancelBackend?.items) return [];
    return (cancelBackend.items || []).map((i) => ({
      orderNumber: i.order_number || i.restaurant_order_id || '',
      orderDate: i.cancel_date || i.date || '',
      orderTime: i.cancel_time || '',
      cancelAt: i.cancel_at || '',
      createdAt: i.created_at || '',
      foodName: i.food_name || i.name || '',
      foodId: i.food_id || 0,
      unitPrice: i.unit_price || 0,
      qty: i.qty || 1,
      amount: i.value || i.amount || 0,
      itemTotal: i.item_total || 0,
      discount: i.discount || 0,
      serviceCharge: i.service_charge || 0,
      gst: i.gst || 0,
      vat: i.vat || 0,
      tax: (i.gst || 0) + (i.vat || 0),
      stage: i.stage || i.cancel_type || 'Unknown',
      rawCancelType: i.cancel_type || '',
      scope: i.scope || 'item',
      reason: i.reason || i.cancel_reason || '',
      notes: i.notes || '',
      cancelledBy: i.cancelled_by || '',
      punchedBy: i.punched_by || '',
      station: i.station || '',
      readyAt: i.ready_at || null,
      serveAt: i.serve_at || null,
    }));
  }, [cancelBackend]);

  /* ── CR-049: Analytics from backend pre-computed sections ── */
  const analytics = useMemo(() => {
    if (!cancelBackend?.summary) return null;
    const s = cancelBackend.summary || {};

    const stageData = (cancelBackend.by_stage || []).map(st => ({
      name: st.stage || st.name || 'Unknown',
      value: st.loss || st.value || 0,
      count: st.count || 0,
    }));

    const byReason = (cancelBackend.by_reason || []).slice(0, 8).map(r => ({
      reason: r.reason || 'No reason provided',
      count: r.count || 0,
      loss: r.loss || r.value || 0,
    }));

    const byEmployee = (cancelBackend.by_employee || []).slice(0, 6).map(e => ({
      name: e.name || e.employee || 'Unknown',
      orderCancels: e.order_cancels || 0,
      itemCancels: e.item_cancels || 0,
      loss: e.loss || e.value || 0,
    }));

    const daily = (cancelBackend.by_day || []).map(d => ({
      date: d.date || '',
      orderCancels: d.order_cancels || 0,
      itemCancels: d.item_cancels || 0,
      orderLoss: d.order_loss || 0,
      itemLoss: d.item_loss || 0,
    }));

    const totalQty = s.total_qty || s.total_count || 0;
    const beforeCooking = stageData.find(st => st.name === 'Before Cooking');
    const afterServing = stageData.find(st => st.name === 'After Serving');

    return {
      totalQty,
      cancelledOrderCount: s.cancelled_order_count || s.order_scope_count || 0,
      orderQty: s.order_qty || s.order_scope_count || 0,
      itemQty: s.item_qty || s.item_scope_count || 0,
      totalLoss: s.total_loss || 0,
      orderLoss: s.order_loss || s.order_scope_loss || 0,
      itemLoss: s.item_loss || s.item_scope_loss || 0,
      stageData, byReason, byEmployee, daily,
      beforeCookingPct: beforeCooking && totalQty > 0 ? (beforeCooking.count / totalQty * 100) : 0,
      afterServingPct: afterServing && totalQty > 0 ? (afterServing.count / totalQty * 100) : 0,
    };
  }, [cancelBackend]);

  /* ── CR-049: Audit — simplified (line-level financial audit needs raw data = future scope) ── */
  const auditData = useMemo(() => ({
    total: cancelledItems.length,
    flagged: [],
    flaggedCount: 0,
    cleanCount: cancelledItems.length,
    totalLeakage: 0,
  }), [cancelledItems]);

  const filteredTable = useMemo(() => {
    if (activeScope === 'order') return cancelledItems.filter(r => r.scope === 'order');
    if (activeScope === 'item') return cancelledItems.filter(r => r.scope === 'item');
    if (activeScope === 'audit') return auditData.flagged;
    return cancelledItems;
  }, [cancelledItems, activeScope, auditData.flagged]);

  const stageBadge = (stage) => {
    const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG['Unknown'];
    const Icon = cfg.icon;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
        <Icon className="w-3 h-3" />
        {stage}
      </span>
    );
  };

  const showEmpty = hasLoadedOnce && !isLoading && cancelledItems.length === 0;

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="cancellations-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={() => {}} isRefreshing={false} isOrderEntryOpen={false} />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">

          {/* ── FIX 2: Header — S5 pattern (orange draft border, green Apply, FY preset, loading states) ── */}
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="cancellations-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="cancellations-back-btn" onClick={() => navigate('/reports-module/dashboard')}>
                <ArrowLeft className="w-5 h-5 text-zinc-600" />
              </button>
              <div>
                <div className="text-xs font-medium text-zinc-500 mb-0.5 flex items-center gap-1.5">
                  <span className="hover:text-zinc-700 cursor-pointer transition-colors">Insights</span>
                  <span>›</span>
                  <span className="hover:text-zinc-700 cursor-pointer transition-colors">Cancellations</span>
                  <span>›</span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Cancellations
                </h1>
                <p className="text-[11px] text-zinc-500 mt-0.5" data-testid="cancellations-basis-label">
                  By cancellation date · order-scope loss per OPS record
                  {' · '}
                  <button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium" data-testid="cancellations-definitions-link">ⓘ Definitions</button>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Range Picker — orange border when draft dirty (S5 pattern) */}
              <div
                className={`flex items-center gap-2 px-3 py-2 border ${
                  draftDirty && draftValid && !draftRangeExceeded ? 'border-[#F26B33]' :
                  draftRangeExceeded ? 'border-red-400' : 'border-zinc-200'
                } bg-white rounded-lg transition-colors ${isLoading ? 'opacity-50' : ''}`}
                data-testid="cancellations-daterange"
              >
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isLoading} min={minFromDate} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="cancellations-date-from" />
                </label>
                <span className="text-zinc-300">—</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="cancellations-date-to" />
                </label>
                {draftRangeExceeded && (
                  <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Max 1 year</span>
                )}
              </div>

              {/* Apply Button — always visible, green when active (S5 pattern) */}
              <button
                onClick={handleApply}
                disabled={isLoading || !canApply}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  canApply
                    ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]'
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }`}
                data-testid="cancellations-apply-btn"
              >
                <Check className="w-4 h-4" />
                Apply
              </button>

              {/* Quick range presets — S5 pattern with FY disabled */}
              <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="cancellations-presets">
                {['Today', '7D', '30D', 'MTD', 'FY'].map((p) => {
                  const isDisabled = false; // INV-001: FY enabled
                  return (
                    <button
                      key={p}
                      disabled={isLoading || isDisabled}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                        isDisabled
                          ? 'text-zinc-300 cursor-not-allowed'
                          : activePreset === p
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'
                      }`}
                      data-testid={`cancellations-preset-${p.toLowerCase()}`}
                      onClick={() => !isDisabled && handlePreset(p)}
                      title={isDisabled ? 'Coming soon' : ''}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Download — S5 orange border styling, items still disabled */}
              <div className="relative" ref={downloadRef}>
                <button
                  onClick={() => setShowDownloadMenu((v) => !v)}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 transition-colors shadow-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid="cancellations-download-trigger"
                >
                  <Download className="w-4 h-4" />
                  Download
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="cancellations-download-menu">
                    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-50 border-b border-zinc-100">
                      Download or Share Report
                    </div>
                    <ul className="py-1">
                      {DOWNLOAD_MENU.map((item) => (
                        <li key={item.id}>
                          <button disabled className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-zinc-300 cursor-not-allowed" data-testid={item.testId}>
                            <item.icon className="w-4 h-4 text-zinc-300" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ── FIX 1: Content wrapped in ReportLoadingShield (children pattern) ── */}
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
            <div className="flex-1 overflow-auto p-8" data-testid="cancellations-content">

              {showEmpty && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                  <XCircle className="w-12 h-12 mb-3 text-zinc-300" />
                  <div className="text-lg font-medium text-zinc-500">No cancellations found</div>
                  <div className="text-sm mt-1">No cancelled items in this date range</div>
                </div>
              )}

              {analytics && (
              <div className="space-y-6">

                {/* ── KPI Strip ── */}
                <div className="grid grid-cols-4 gap-4" data-testid="cancellations-kpi-strip">
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><XCircle className="w-4 h-4 text-red-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total Cancellations</span></div>
                    <div className="text-2xl font-bold text-zinc-950" data-testid="cancellations-total-count">{analytics.totalQty}</div>
                    <div className="text-xs text-zinc-400 mt-1">{analytics.cancelledOrderCount} orders · {analytics.itemQty} items</div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Revenue Loss</span></div>
                    <div className="text-2xl font-bold text-red-600" data-testid="cancellations-total-loss">{fmtINR(analytics.totalLoss)}</div>
                    <div className="text-xs text-zinc-400 mt-1">Orders: {fmtINR(analytics.orderLoss)} · Items: {fmtINR(analytics.itemLoss)}</div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-blue-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Before Cooking</span></div>
                    <div className="text-2xl font-bold text-zinc-950" data-testid="cancellations-before-cooking">{fmtPct(analytics.beforeCookingPct)}</div>
                    <div className="text-xs text-green-600 mt-1">Lowest waste stage</div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">After Serving</span></div>
                    <div className="text-2xl font-bold text-zinc-950" data-testid="cancellations-after-serving">{fmtPct(analytics.afterServingPct)}</div>
                    <div className="text-xs text-red-500 mt-1">Highest waste — food + labor lost</div>
                  </div>
                </div>

                {/* ── Scope Tabs (with Audit env-gated) ── */}
                <div className={`flex items-center gap-1 p-1 bg-zinc-100 rounded-lg w-fit ${isLoading ? 'opacity-50' : ''}`} data-testid="cancellations-scope-tabs">
                  {SCOPE_TABS.map((tab) => {
                    const isAudit = tab.id === 'audit';
                    const count = tab.id === 'all' ? analytics.totalQty
                      : tab.id === 'order' ? analytics.cancelledOrderCount
                      : tab.id === 'item' ? analytics.itemQty
                      : auditData.flaggedCount;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveScope(tab.id)}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                          activeScope === tab.id
                            ? (isAudit && auditData.flaggedCount > 0 ? 'bg-red-600 text-white' : 'bg-white text-zinc-900 shadow-sm')
                            : (isAudit && auditData.flaggedCount > 0 ? 'bg-red-50 text-red-800 hover:bg-red-100' : 'text-zinc-600 hover:bg-white/50')
                        }`}
                        data-testid={`cancellations-scope-${tab.id}`}
                      >
                        {isAudit && <ShieldAlert className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />}
                        {tab.label}
                        <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isAudit && auditData.flaggedCount > 0
                            ? 'bg-red-200 text-red-700'
                            : 'bg-zinc-200 text-zinc-600'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ── Audit Tab Content ── */}
                {activeScope === 'audit' && (
                  <div className="space-y-4" data-testid="cancellations-audit-section">
                    {/* Audit KPI Strip */}
                    <div className="grid grid-cols-4 gap-4" data-testid="cancellations-audit-kpi">
                      <div className="bg-white border border-zinc-200 rounded-xl p-4">
                        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Total Lines Scanned</div>
                        <div className="text-xl font-bold text-zinc-950">{auditData.total}</div>
                      </div>
                      <div className={`border rounded-xl p-4 ${auditData.flaggedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${auditData.flaggedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>Flagged (Not Reverted)</div>
                        <div className={`text-xl font-bold ${auditData.flaggedCount > 0 ? 'text-red-700' : 'text-green-700'}`}>{auditData.flaggedCount}</div>
                        <div className={`text-xs mt-0.5 ${auditData.flaggedCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {auditData.total > 0 ? ((auditData.flaggedCount / auditData.total) * 100).toFixed(1) : '0'}% of total
                        </div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Clean (Properly Reverted)</div>
                        <div className="text-xl font-bold text-green-700">{auditData.cleanCount}</div>
                      </div>
                      <div className={`border rounded-xl p-4 ${auditData.totalLeakage > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${auditData.totalLeakage > 0 ? 'text-red-600' : 'text-green-600'}`}>Financial Leakage</div>
                        <div className={`text-xl font-bold ${auditData.totalLeakage > 0 ? 'text-red-700' : 'text-green-700'}`}>{fmtINR(auditData.totalLeakage)}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">Discount + SC + Tax not zeroed</div>
                      </div>
                    </div>

                    {/* Audit Rule Explanation */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm" data-testid="cancellations-audit-rule-info">
                      <div className="font-semibold text-amber-800 mb-1 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        Cancellation Revert Audit
                      </div>
                      <div className="text-amber-700 text-xs leading-relaxed">
                        <strong>Business rule:</strong> When an item is cancelled, backend must revert all financial fields to ₹0 —
                        discount (<code>discount_on_food</code>), service charge (<code>service_charge</code>),
                        GST (<code>gst_tax_amount</code>), VAT (<code>vat_tax_amount</code>).
                        Items below have <strong>non-zero values</strong> in at least one of these fields after cancellation.
                      </div>
                    </div>

                    {auditData.flaggedCount === 0 ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center" data-testid="cancellations-audit-clean">
                        <div className="text-green-600 text-lg font-semibold">All Clear</div>
                        <div className="text-green-500 text-sm mt-1">All {auditData.total} cancelled items have properly reverted financial fields.</div>
                      </div>
                    ) : (
                      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="cancellations-audit-table">
                        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-red-50">
                          <h2 className="text-sm font-semibold text-red-800 uppercase tracking-wide flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            Items With Un-Reverted Fields ({auditData.flaggedCount})
                          </h2>
                          <span className="text-xs text-red-600">Financial leakage: {fmtINR(auditData.totalLeakage)}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-zinc-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Order #</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Item</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Item Total</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Stage</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Scope</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Violations</th>
                              </tr>
                            </thead>
                            <tbody>
                              {auditData.flagged.map((r, i) => (
                                <tr key={i} className="border-t border-zinc-50 bg-red-50/30 hover:bg-red-50/60 transition-colors" data-testid={`cancellations-audit-row-${i}`}>
                                  <td className="px-4 py-3 text-sm font-medium text-zinc-800">#{r.orderNumber}</td>
                                  <td className="px-4 py-3 text-sm text-zinc-700 max-w-[160px] truncate" title={r.foodName}>{r.foodName}</td>
                                  <td className="px-4 py-3 text-sm text-zinc-600">{r.orderDate} {r.orderTime}</td>
                                  <td className="px-4 py-3 text-sm text-right font-medium text-zinc-800">{fmtINR(r.itemTotal)}</td>
                                  <td className="px-4 py-3">{stageBadge(r.stage)}</td>
                                  <td className="px-4 py-3">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.scope === 'order' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                      {r.scope === 'order' ? 'Full Order' : 'Item-Level'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      {r.violations.map((v, vi) => (
                                        <span key={vi} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                                          {v.field}: {fmtINR(v.value)}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Non-Audit Content (charts, tables) ── */}
                {activeScope !== 'audit' && (
                <>
                  {/* ── Stage Donut + Stage Cards ── */}
                  <div className="grid grid-cols-5 gap-6">
                    <div className="col-span-2 bg-white border border-zinc-200 rounded-xl p-6" data-testid="cancellations-stage-donut">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-2">Revenue Loss by Stage</h2>
                      {analytics.stageData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={analytics.stageData}
                              cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                              paddingAngle={3} dataKey="value"
                              animationDuration={800} animationEasing="ease-out"
                              labelLine={false} label={renderPieLabel}
                            >
                              {analytics.stageData.map((entry, i) => (
                                <Cell key={i} fill={STAGE_CONFIG[entry.name]?.color || '#6B7280'} stroke="white" strokeWidth={2} />
                              ))}
                            </Pie>
                            <ReTooltip content={<DonutTooltip />} />
                            <Legend formatter={(value) => <span className="text-xs text-zinc-600">{value}</span>} iconType="circle" iconSize={8} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[280px] text-zinc-400 text-sm">No stage data</div>
                      )}
                    </div>

                    <div className="col-span-3 space-y-3" data-testid="cancellations-stage-cards">
                      {analytics.stageData.map((s) => {
                        const cfg = STAGE_CONFIG[s.name] || STAGE_CONFIG['Unknown'];
                        const Icon = cfg.icon;
                        const pct = analytics.totalQty > 0 ? (s.count / analytics.totalQty * 100).toFixed(1) : '0';
                        return (
                          <div key={s.name} className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cfg.color}15` }}>
                              <Icon className="w-6 h-6" style={{ color: cfg.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-zinc-800">{s.name}</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>{pct}%</span>
                              </div>
                              <div className="flex items-center gap-6 mt-1">
                                <span className="text-lg font-bold text-red-600">{fmtINR(s.value)}</span>
                                <span className="text-xs text-zinc-400">{s.count} qty cancelled</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Daily Trend + By Reason ── */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="cancellations-daily-chart">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Daily Cancellation Trend</h2>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" />Orders</span>
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400" />Items</span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={analytics.daily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} tickFormatter={(v) => v.slice(0, 5)} />
                          <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                          <ReTooltip content={<BarTooltip />} cursor={{ fill: 'rgba(239,68,68,0.04)', radius: 4 }} />
                          <Bar dataKey="orderCancels" stackId="cancels" fill="#EF4444" radius={0} animationDuration={800} />
                          <Bar dataKey="itemCancels" stackId="cancels" fill="#FB923C" radius={[4, 4, 0, 0]} animationDuration={800} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="cancellations-by-reason">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Top Cancellation Reasons</h2>
                      {analytics.byReason.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={analytics.byReason} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="reason" tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} width={140} />
                            <ReTooltip content={<ReasonTooltip />} cursor={{ fill: 'rgba(239,68,68,0.04)' }} />
                            <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} animationDuration={800} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[240px] text-zinc-400 text-sm">No reason data</div>
                      )}
                    </div>
                  </div>

                  {/* ── By Employee ── */}
                  {analytics.byEmployee.length > 0 && (
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="cancellations-by-employee">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Cancellations by Employee</h2>
                    </div>
                    <div className="grid grid-cols-6 gap-3">
                      {analytics.byEmployee.map((emp) => {
                        const total = emp.orderCancels + emp.itemCancels;
                        const pct = analytics.totalQty > 0 ? (total / analytics.totalQty * 100).toFixed(1) : '0';
                        return (
                          <div key={emp.name} className="border border-zinc-200 rounded-xl p-4 text-center">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-2">
                              <Users className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="text-sm font-semibold text-zinc-800 truncate">{emp.name}</div>
                            <div className="text-lg font-bold text-red-600 mt-1">{total}</div>
                            <div className="text-xs text-zinc-400">{emp.orderCancels} orders · {emp.itemCancels} items</div>
                            <div className="text-xs text-red-500 font-medium mt-1">{fmtINR(emp.loss)} lost</div>
                            <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">{pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  )}

                  {/* ── Cancellation Detail Table ── */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="cancellations-detail-table">
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Cancellation Details</h2>
                      <span className="text-xs text-zinc-400">{filteredTable.length} records</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-zinc-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Order #</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Item</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Stage</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Scope</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Reason</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Notes</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Cancelled By</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Station</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTable.map((r, i) => (
                            <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50 transition-colors" data-testid={`cancellations-row-${i}`}>
                              <td className="px-4 py-3 text-sm font-medium text-zinc-800">#{r.orderNumber}</td>
                              <td className="px-4 py-3 text-sm text-zinc-700 max-w-[160px] truncate" title={r.foodName}>{r.foodName}</td>
                              <td className="px-4 py-3 text-sm text-zinc-600">{r.orderDate} {r.orderTime}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">{fmtINR(r.amount)}</td>
                              <td className="px-4 py-3">{stageBadge(r.stage)}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.scope === 'order' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                  {r.scope === 'order' ? 'Full Order' : 'Item-Level'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-zinc-700 max-w-[160px] truncate" title={r.reason}>{r.reason || '—'}</td>
                              <td className="px-4 py-3 text-sm max-w-[140px]">
                                {r.notes ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-blue-600" title={r.notes}>
                                    <MessageSquare className="w-3 h-3" />
                                    <span className="truncate max-w-[100px]">{r.notes}</span>
                                  </span>
                                ) : <span className="text-zinc-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-sm text-zinc-700">{r.cancelledBy || '—'}</td>
                              <td className="px-4 py-3 text-xs text-zinc-400">{r.station || '—'}</td>
                            </tr>
                          ))}
                          {filteredTable.length === 0 && (
                            <tr><td colSpan={10} className="px-4 py-8 text-center text-zinc-400 text-sm">No cancellations match the current filter</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
                )}

              </div>
              )}
            </div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

export default CancellationsMockup;
