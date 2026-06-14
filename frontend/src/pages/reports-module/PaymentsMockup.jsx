/**
 * PaymentsMockup — CR-011 S8 (Phase 2 Hero Screen)
 *
 * Payment mix deep-dive: Cash vs Card vs UPI vs TAB breakdown,
 * daily payment method trends, digital vs cash trend, method performance.
 * Reuses order-logs-report API via orderLedgerService (same data source as S6/S7).
 *
 * Business rules (owner-locked):
 *   - Revenue = fOrderStatus === 6 only (paid/settled)
 *   - Room orders excluded
 *   - Razorpay = gateway → classified under Card/UPI based on raw method
 *   - Reconciliation (Collected vs Pending) = PARKED until settlement module
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { getOrderLedgerForRange, getRevenueOrdersForRange, getTabSettlementsForRange, REVENUE_BASIS } from '../../api/services/orderLedgerService';
import { classifyPaymentMethod, CREDIT_GROUP } from '../../utils/paymentClassifier';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import {
  ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown,
  Mail, MessageCircle, Send, Wallet, CreditCard, Smartphone, Banknote,
  TrendingUp, BarChart3, PieChart as PieChartIcon, Building2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, Line,
} from 'recharts';

/* ── Helpers ── */
const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => {
  const v = parseFloat(n) || 0;
  return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};
const fmtINR2 = (n) => {
  const v = parseFloat(n) || 0;
  return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtPct = (n) => `${(parseFloat(n) || 0).toFixed(1)}%`;

/* ── Payment method classifier ──
 * CR-032 (GO-2, 2026-06-11): inline chain promoted to the shared module
 * `utils/paymentClassifier.js` — Sales / Payments / Dashboard now use ONE
 * canonical mapping. TAB returns null (CR-030: credit never in paid mix;
 * settlements surface as the 'Credit' group). */

/* ── Constants ── */
const METHOD_COLORS = {
  Cash: '#329937',
  Card: '#3B82F6',
  UPI: '#F26B33',
  Credit: '#8B5CF6',
  'Room Bill': '#0EA5E9',
  Partial: '#EAB308',
  'Zomato Gold': '#E23744',
};
const FALLBACK_COLORS = ['#6B7280', '#EC4899', '#14B8A6', '#A855F7', '#F97316', '#64748B'];
const getMethodColor = (method, idx) => METHOD_COLORS[method] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

const METHOD_ICONS = {
  Cash: Banknote,
  Card: CreditCard,
  UPI: Smartphone,
  Credit: Wallet,
  'Room Bill': Building2,
  Partial: BarChart3,
  'Zomato Gold': CreditCard,
};
const METHOD_ORDER = ['Cash', 'Card', 'UPI', 'Credit', 'Room Bill', 'Partial', 'Zomato Gold'];

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 'payments-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 'payments-download-pdf-btn' },
  { id: 'email', label: 'Send via Email (attachment)', icon: Mail, enabled: false, testId: 'payments-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 'payments-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 'payments-share-sms-btn' },
];

/* ── Custom Tooltips ── */
const StackedBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700 min-w-[160px]">
      <div className="font-semibold mb-1.5 border-b border-zinc-700 pb-1">{label}</div>
      {payload.filter(p => p.value > 0).map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
            {p.dataKey}
          </span>
          <span className="font-medium">{fmtINR(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-zinc-700 mt-1 pt-1 flex justify-between font-semibold">
        <span>Total</span><span>{fmtINR(total)}</span>
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
      <div>{fmtINR(d.value)} · {d.payload.orders} orders</div>
      <div className="text-zinc-400">{d.payload.pct}% · Avg {fmtINR(d.payload.avg)}</div>
    </div>
  );
};

const TrendTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl border border-zinc-700 min-w-[140px]">
      <div className="font-semibold mb-1 border-b border-zinc-700 pb-1">{d.date}</div>
      <div className="flex justify-between py-0.5"><span className="text-green-400">Cash</span><span>{fmtINR(d.cash)}</span></div>
      <div className="flex justify-between py-0.5"><span className="text-blue-400">Digital</span><span>{fmtINR(d.digital)}</span></div>
      {d.digital + d.cash > 0 && (
        <div className="text-zinc-400 mt-0.5">Digital: {fmtPct(d.digital / (d.digital + d.cash) * 100)}</div>
      )}
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

/* ══════════════════════════════════════════════════════════════════════════════ */
const PaymentsMockup = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const schedules = restaurant?.schedules || [];
  const downloadRef = useRef(null);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Date range — default last 7 days
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const [fromDate, setFromDate] = useState(sharedFrom);
  const [toDate, setToDate] = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo, setAppliedTo] = useState(sharedTo);
  const [activePreset, setActivePreset] = useState('7D');

  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState(null);
  const [rawOrders, setRawOrders] = useState([]);
  const [tabSettlements, setTabSettlements] = useState([]);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Close download menu on outside click
  useEffect(() => {
    const handler = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const maxDays = 60;
  const draftRangeExceeded = draftValid && ((new Date(toDate) - new Date(fromDate)) / 86400000) > maxDays;
  const canApply = draftDirty && draftValid && !draftRangeExceeded && !isLoading;

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
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return;
    setIsLoading(true); setError(null);
    try {
      if (REVENUE_BASIS === 'collect') {
        // CR-030 (GO-2): collection-date pipeline + TAB settlements
        const [rows, settlements] = await Promise.all([
          getRevenueOrdersForRange(appliedFrom, appliedTo, schedules),
          getTabSettlementsForRange(appliedFrom, appliedTo),
        ]);
        setRawOrders(rows);
        setTabSettlements(settlements);
      } else {
        const { orders } = await getOrderLedgerForRange(appliedFrom, appliedTo, schedules, 'created_at');
        setRawOrders(orders);
      }
      setHasLoadedOnce(true);
    } catch (e) { setError(e.message || 'Failed to load data'); }
    finally { setIsLoading(false); }
  }, [appliedFrom, appliedTo, schedules]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Aggregations ── */
  const analytics = useMemo(() => {
    if (!rawOrders.length) return null;
    const collectMode = REVENUE_BASIS === 'collect';

    // CR-030: collect rows already fs=6 + collect_bill-windowed; TAB-credit rows excluded from mix
    const paidRows = collectMode ? rawOrders : rawOrders.filter((o) => o.fOrderStatus === 6);
    const revenueOrders = collectMode ? paidRows.filter((o) => !o.isTabCredit) : paidRows;
    const settlementTotal = collectMode ? tabSettlements.reduce((s, x) => s + (x.total || 0), 0) : 0;
    const totalRevenue = revenueOrders.reduce((s, r) => s + (r.totalAmount || 0), 0) + settlementTotal;
    const totalOrders = revenueOrders.length;

    // ── Payment method breakdown (CR-032 shared classifier + Credit group) ──
    const methodMap = {};
    revenueOrders.forEach((o) => {
      const bucket = classifyPaymentMethod(o.paymentMethod);
      if (!bucket) return; // TAB / pending / transferToRoom / cancelled / merge
      if (!methodMap[bucket]) methodMap[bucket] = { method: bucket, revenue: 0, orders: 0 };
      methodMap[bucket].revenue += o.totalAmount || 0;
      methodMap[bucket].orders += 1;
    });
    if (settlementTotal > 0) {
      methodMap[CREDIT_GROUP] = { method: CREDIT_GROUP, revenue: settlementTotal, orders: 0 };
    }
    // Sort by METHOD_ORDER first, then any extras by revenue desc
    let colorIdx = 0;
    const methods = METHOD_ORDER
      .filter((m) => methodMap[m])
      .map((m) => ({
        ...methodMap[m],
        pct: totalRevenue > 0 ? (methodMap[m].revenue / totalRevenue * 100).toFixed(1) : '0',
        avg: methodMap[m].orders > 0 ? methodMap[m].revenue / methodMap[m].orders : 0,
        color: getMethodColor(m, colorIdx++),
      }));
    // Add any methods not in METHOD_ORDER (sorted by revenue desc)
    const extraMethods = Object.keys(methodMap)
      .filter((m) => !METHOD_ORDER.includes(m))
      .sort((a, b) => methodMap[b].revenue - methodMap[a].revenue);
    extraMethods.forEach((m) => {
      methods.push({
        ...methodMap[m],
        pct: totalRevenue > 0 ? (methodMap[m].revenue / totalRevenue * 100).toFixed(1) : '0',
        avg: methodMap[m].orders > 0 ? methodMap[m].revenue / methodMap[m].orders : 0,
        color: getMethodColor(m, colorIdx++),
      });
    });
    // All method names present (for stacked bar + table)
    const allMethodNames = methods.map((m) => m.method);

    // KPI breakdown
    const cashRevenue = methodMap['Cash']?.revenue || 0;
    const digitalRevenue = (methodMap['Card']?.revenue || 0) + (methodMap['UPI']?.revenue || 0);
    const tabRevenue = settlementTotal; // CR-030: Credit SETTLED (money in), not credit punched

    // ── Daily breakdown with per-method split (collect mode: collect_bill business day) ──
    const dailyMap = {};
    const dayKey = (o) => (collectMode ? o.revenueDate : o.orderDate) || 'Unknown';
    revenueOrders.forEach((o) => {
      const date = dayKey(o);
      if (!dailyMap[date]) {
        dailyMap[date] = { date, total: 0, orders: 0 };
      }
      const bucket = classifyPaymentMethod(o.paymentMethod);
      if (!bucket) return;
      dailyMap[date].total += o.totalAmount || 0;
      dailyMap[date].orders += 1;
      dailyMap[date][bucket] = (dailyMap[date][bucket] || 0) + (o.totalAmount || 0);
    });
    if (collectMode) {
      tabSettlements.forEach((s) => {
        if (!(s.total > 0)) return;
        const date = s.dateDisplay;
        if (!dailyMap[date]) dailyMap[date] = { date, total: 0, orders: 0 };
        dailyMap[date].total += s.total;
        dailyMap[date][CREDIT_GROUP] = (dailyMap[date][CREDIT_GROUP] || 0) + s.total;
      });
    }
    const daily = Object.values(dailyMap).sort((a, b) => {
      const [ad, am, ay] = a.date.split('/'); const [bd, bm, by] = b.date.split('/');
      return `${ay}${am}${ad}`.localeCompare(`${by}${bm}${bd}`);
    });

    // ── Digital vs Cash trend ──
    const trend = daily.map((d) => ({
      date: d.date,
      cash: d.Cash || 0,
      digital: (d.Card || 0) + (d.UPI || 0),
      tab: d[CREDIT_GROUP] || 0,
    }));

    // ── Top payment day ──
    const topCashDay = daily.reduce((best, d) => (d.Cash || 0) > (best?.Cash || 0) ? d : best, null);
    const topDigitalDay = daily.reduce((best, d) => ((d.Card || 0) + (d.UPI || 0)) > ((best?.Card || 0) + (best?.UPI || 0)) ? d : best, null);

    // Active methods (those with > 0 revenue)
    const activeMethods = methods.filter((m) => m.revenue > 0);
    // Methods present in stacked bar (use dynamic list)
    const stackMethods = allMethodNames.filter((m) => methodMap[m]?.revenue > 0);
    // Build color map for stacked bar
    const methodColorMap = {};
    methods.forEach((m) => { methodColorMap[m.method] = m.color; });

    return {
      totalRevenue, totalOrders,
      cashRevenue, digitalRevenue, tabRevenue,
      methods, activeMethods, stackMethods, methodColorMap, allMethodNames,
      daily, trend,
      topCashDay, topDigitalDay,
      uniqueDays: daily.length,
      allOrders: rawOrders.length,
    };
  }, [rawOrders]);

  /* ── Export ── */
  const buildExportPayload = () => {
    if (!analytics) return null;
    const sumAll = (rows, keys) => {
      const t = { label: 'TOTAL' };
      keys.forEach((k) => { t[k] = rows.reduce((s, r) => s + (Number(r[k]) || 0), 0); });
      return t;
    };
    return {
      title: 'Payments Report',
      subtitle: 'Payment method breakdown & trends',
      restaurant: { name: restaurant?.name || '', address: restaurant?.address || '', id: restaurant?.id || '' },
      dateRange: { from: appliedFrom, to: appliedTo },
      generatedBy: restaurant?.ownerName || '',
      kpis: [
        { label: 'Total Settled Revenue', value: analytics.totalRevenue, tone: 'good', format: 'inr' },
        { label: 'Total Orders', value: analytics.totalOrders, tone: 'primary', format: 'text' },
        { label: 'Cash Collection', value: analytics.cashRevenue, tone: 'good', format: 'inr' },
        { label: 'Digital (Card+UPI)', value: analytics.digitalRevenue, tone: 'primary', format: 'inr' },
        { label: 'Credit Settled', value: analytics.tabRevenue, tone: 'good', format: 'inr' },
        { label: 'Days', value: analytics.uniqueDays, tone: '', format: 'text' },
      ],
      sheets: [
        {
          name: 'Daily Payment Breakdown',
          subtitle: `${analytics.daily.length} days · ${appliedFrom} → ${appliedTo}`,
          columns: [
            { key: 'date', label: 'Date', format: 'text', align: 'left', width: 100 },
            { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 70 },
            { key: 'total', label: 'Total Revenue', format: 'inr', align: 'right', width: 120 },
            ...analytics.allMethodNames.map((m) => ({ key: m, label: m, format: 'inr', align: 'right', width: 100 })),
          ],
          rows: analytics.daily,
          totals: sumAll(analytics.daily, ['orders', 'total', ...analytics.allMethodNames]),
        },
        {
          name: 'By Payment Method',
          subtitle: `${analytics.activeMethods.length} methods`,
          columns: [
            { key: 'method', label: 'Payment Method', format: 'text', align: 'left', width: 150 },
            { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 },
            { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right', width: 120 },
            { key: 'pct', label: '% Share', format: 'text', align: 'right', width: 80 },
            { key: 'avg', label: 'Avg Order', format: 'inr', align: 'right', width: 100 },
          ],
          rows: analytics.activeMethods,
          totals: {
            label: 'TOTAL',
            orders: analytics.totalOrders,
            revenue: analytics.totalRevenue,
            pct: '100.0',
            avg: analytics.totalOrders > 0 ? analytics.totalRevenue / analytics.totalOrders : 0,
          },
        },
        {
          name: 'Digital vs Cash Trend',
          subtitle: 'Daily cash vs digital collection',
          columns: [
            { key: 'date', label: 'Date', format: 'text', align: 'left', width: 100 },
            { key: 'cash', label: 'Cash', format: 'inr', align: 'right', width: 120 },
            { key: 'digital', label: 'Digital (Card+UPI)', format: 'inr', align: 'right', width: 140 },
            { key: 'tab', label: 'Credit Settled', format: 'inr', align: 'right', width: 100 },
          ],
          rows: analytics.trend,
          totals: sumAll(analytics.trend, ['cash', 'digital', 'tab']),
        },
      ],
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

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="payments-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          {/* Header */}
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="payments-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="payments-back-btn" onClick={() => navigate('/reports-module/dashboard')}>
                <ArrowLeft className="w-5 h-5 text-zinc-600" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Payments
                </h1>
                <p className="text-[11px] text-zinc-500 mt-0.5" data-testid="payments-basis-label">
                  Revenue by collection date · incl. room food · credit counted on settlement
                  {' · '}
                  <button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium" data-testid="payments-definitions-link">ⓘ Definitions</button>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date range */}
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid && !draftRangeExceeded ? 'border-[#F26B33]' : draftRangeExceeded ? 'border-red-400' : 'border-zinc-200'} bg-white rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="payments-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="payments-date-from" />
                </label>
                <span className="text-zinc-300">—</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="payments-date-to" />
                </label>
                {draftRangeExceeded && <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Max 60 days</span>}
              </div>

              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="payments-apply-btn">
                <Check className="w-4 h-4" /> Apply
              </button>

              <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="payments-presets">
                {['Today', '7D', '30D', 'MTD'].map((p) => (
                  <button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'}`} data-testid={`payments-preset-${p.toLowerCase()}`} onClick={() => handlePreset(p)}>
                    {p}
                  </button>
                ))}
              </div>

              {/* Download */}
              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || !analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 transition-colors shadow-sm ${isLoading || !analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="payments-download-trigger">
                  <Download className="w-4 h-4" /> Download
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="payments-download-menu">
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

          {/* Content */}
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">
              {analytics && (
                <div className="space-y-6">

                  {/* ── KPI Strip ── */}
                  <div className="grid grid-cols-4 gap-4" data-testid="payments-kpi-strip">
                    <div className="bg-white border border-zinc-200 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-[#329937]" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total Settled</span></div>
                      <div className="text-2xl font-bold text-zinc-950" data-testid="payments-total-revenue">{fmtINR(analytics.totalRevenue)}</div>
                      <div className="text-xs text-zinc-400 mt-1">{analytics.totalOrders} orders · {analytics.uniqueDays} days</div>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-2"><Banknote className="w-4 h-4 text-[#329937]" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Cash Collection</span></div>
                      <div className="text-2xl font-bold text-zinc-950" data-testid="payments-cash-revenue">{fmtINR(analytics.cashRevenue)}</div>
                      <div className="text-xs text-zinc-400 mt-1">{analytics.totalRevenue > 0 ? fmtPct(analytics.cashRevenue / analytics.totalRevenue * 100) : '0%'} of total</div>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-blue-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Digital (Card + UPI)</span></div>
                      <div className="text-2xl font-bold text-zinc-950" data-testid="payments-digital-revenue">{fmtINR(analytics.digitalRevenue)}</div>
                      <div className="text-xs text-zinc-400 mt-1">{analytics.totalRevenue > 0 ? fmtPct(analytics.digitalRevenue / analytics.totalRevenue * 100) : '0%'} of total</div>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-[#8B5CF6]" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Credit Settled</span></div>
                      <div className="text-2xl font-bold text-zinc-950" data-testid="payments-tab-revenue">{fmtINR(analytics.tabRevenue)}</div>
                      <div className="text-xs text-zinc-400 mt-1">{analytics.totalRevenue > 0 ? fmtPct(analytics.tabRevenue / analytics.totalRevenue * 100) : '0%'} of total</div>
                    </div>
                  </div>

                  {/* ── Payment Donut + Method Performance Cards ── */}
                  <div className="grid grid-cols-5 gap-6">
                    {/* Donut (spans 2 cols) */}
                    <div className="col-span-2 bg-white border border-zinc-200 rounded-xl p-6" data-testid="payments-donut">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-2">Payment Method Split</h2>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={analytics.activeMethods.map((pm) => ({ name: pm.method, value: pm.revenue, orders: pm.orders, pct: pm.pct, avg: pm.avg }))}
                            cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                            paddingAngle={3} dataKey="value"
                            animationDuration={800} animationEasing="ease-out"
                            labelLine={false} label={renderPieLabel}
                          >
                            {analytics.activeMethods.map((pm) => (
                              <Cell key={pm.method} fill={pm.color} stroke="white" strokeWidth={2} />
                            ))}
                          </Pie>
                          <ReTooltip content={<DonutTooltip />} />
                          <Legend formatter={(value) => <span className="text-xs text-zinc-600">{value}</span>} iconType="circle" iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Method Performance Cards (spans 3 cols) */}
                    <div className="col-span-3 grid grid-cols-2 gap-3" data-testid="payments-method-cards">
                      {analytics.activeMethods.map((pm) => {
                        const Icon = METHOD_ICONS[pm.method] || PieChartIcon;
                        return (
                          <div key={pm.method} className="bg-white border border-zinc-200 rounded-xl p-4 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${pm.color}15` }}>
                              <Icon className="w-5 h-5" style={{ color: pm.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-zinc-800">{pm.method}</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${pm.color}15`, color: pm.color }}>{pm.pct}%</span>
                              </div>
                              <div className="text-lg font-bold text-zinc-950 mt-0.5">{fmtINR(pm.revenue)}</div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                                <span>{pm.orders} orders</span>
                                <span>Avg {fmtINR(pm.avg)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Daily Payment Trends — Stacked Bar ── */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="payments-daily-stacked">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Daily Payment Trends</h2>
                      <div className="flex items-center gap-4">
                        {analytics.stackMethods.map((m) => (
                          <span key={m} className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: analytics.methodColorMap[m] }} />
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={analytics.daily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} tickFormatter={(v) => v.slice(0, 5)} />
                        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                        <ReTooltip content={<StackedBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 4 }} />
                        {analytics.stackMethods.map((m) => (
                          <Bar key={m} dataKey={m} stackId="payment" fill={analytics.methodColorMap[m]} radius={0} animationDuration={800} animationEasing="ease-out" />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* ── Digital vs Cash Trend — Area Chart ── */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="payments-trend-chart">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Cash vs Digital Trend</h2>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-[#329937]" />Cash</span>
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" />Digital (Card+UPI)</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={analytics.trend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#329937" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#329937" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="digitalGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} tickFormatter={(v) => v.slice(0, 5)} />
                        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                        <ReTooltip content={<TrendTooltip />} cursor={{ stroke: '#e4e4e7', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area type="monotone" dataKey="cash" stroke="#329937" strokeWidth={2.5} fill="url(#cashGrad)" dot={{ r: 3, fill: '#329937', stroke: 'white', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#329937', stroke: 'white', strokeWidth: 2 }} animationDuration={800} />
                        <Area type="monotone" dataKey="digital" stroke="#3B82F6" strokeWidth={2.5} fill="url(#digitalGrad)" dot={{ r: 3, fill: '#3B82F6', stroke: 'white', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#3B82F6', stroke: 'white', strokeWidth: 2 }} animationDuration={800} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* ── Daily Payment Breakdown Table ── */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="payments-daily-table">
                    <div className="px-6 py-4 border-b border-zinc-100">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Daily Payment Breakdown</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-zinc-50">
                          <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Orders</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Total</th>
                            {analytics.allMethodNames.map((m) => (
                              <th key={m} className="px-5 py-3 text-right text-xs font-semibold uppercase" style={{ color: analytics.methodColorMap[m] || '#71717a' }}>{m}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.daily.map((d, i) => (
                            <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                              <td className="px-5 py-3 text-sm font-medium text-zinc-800">{d.date}</td>
                              <td className="px-5 py-3 text-sm text-right text-zinc-700">{d.orders}</td>
                              <td className="px-5 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR2(d.total)}</td>
                              {analytics.allMethodNames.map((m) => (
                                <td key={m} className="px-5 py-3 text-sm text-right text-zinc-700">{(d[m] || 0) > 0 ? fmtINR2(d[m]) : '—'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                          <tr>
                            <td className="px-5 py-3 text-sm font-bold text-zinc-900">TOTAL</td>
                            <td className="px-5 py-3 text-sm text-right font-bold text-zinc-900">{analytics.totalOrders}</td>
                            <td className="px-5 py-3 text-sm text-right font-bold text-zinc-900">{fmtINR2(analytics.totalRevenue)}</td>
                            {analytics.activeMethods.map((pm) => (
                              <td key={pm.method} className="px-5 py-3 text-sm text-right font-bold" style={{ color: pm.color }}>{fmtINR2(pm.revenue)}</td>
                            ))}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-xs text-zinc-400 text-center py-2">
                    {analytics.allOrders} total orders · {appliedFrom} → {appliedTo} · Reconciliation view coming with Settlement module
                  </div>
                </div>
              )}
            </div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

export default PaymentsMockup;
