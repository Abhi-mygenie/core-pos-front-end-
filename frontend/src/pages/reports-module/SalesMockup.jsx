/**
 * SalesMockup — CR-011 S7 (Phase 2 Hero Screen)
 *
 * Sales deep-dive: daily revenue trends, channel breakdown, order volume,
 * avg order value. Reuses order-logs-report API via orderLedgerService
 * (same data source as S6, aggregated differently).
 *
 * Gate ①–⑤: Live API wired, export-ready.
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
  Mail, MessageCircle, Send, TrendingUp, ShoppingBag, CreditCard, BarChart3,
  Utensils, Truck, Coffee, Building2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, Line,
} from 'recharts';

const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => {
  const v = parseFloat(n) || 0;
  return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};
const fmtINR2 = (n) => {
  const v = parseFloat(n) || 0;
  return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const showAuditTab = process.env.REACT_APP_SHOW_AUDIT_TAB === 'true';

const DOWNLOAD_MENU = [
  { id: 'excel',    label: 'Download as Excel',           icon: FileSpreadsheet, enabled: true,  testId: 'sales-download-excel-btn' },
  { id: 'pdf',      label: 'Download as PDF',             icon: FileDown,        enabled: true,  testId: 'sales-download-pdf-btn' },
  { id: 'email',    label: 'Send via Email (attachment)', icon: Mail,            enabled: false, testId: 'sales-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp',           icon: MessageCircle,   enabled: false, testId: 'sales-share-whatsapp-btn' },
  { id: 'sms',      label: 'Send via SMS',                icon: Send,            enabled: false, testId: 'sales-share-sms-btn' },
];

const CHANNEL_ICONS = { 'Dine-In': Utensils, 'Delivery': Truck, 'Takeaway': Coffee, 'Room': Building2 };
const CHANNEL_COLORS = { 'Dine-In': '#F26B33', 'Delivery': '#329937', 'Takeaway': '#3B82F6', 'Room': '#8B5CF6' };
const PIE_COLORS_CHANNEL = ['#F26B33', '#329937', '#3B82F6', '#8B5CF6', '#EC4899'];
const PIE_COLORS_PAYMENT = ['#3B82F6', '#F26B33', '#329937', '#8B5CF6', '#EC4899', '#EAB308'];

const CustomBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-zinc-700">
      <div className="font-semibold mb-1">{d.date}</div>
      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#F26B33]" />{fmtINR(d.revenue)}</div>
      <div className="text-zinc-400 mt-0.5">{d.orders} orders · Avg {fmtINR(d.orders > 0 ? d.revenue / d.orders : 0)}</div>
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-zinc-700">
      <div className="font-semibold">{d.name}</div>
      <div>{fmtINR(d.value)} · {d.payload.orders} orders</div>
      <div className="text-zinc-400">{d.payload.pct}%</div>
    </div>
  );
};

const CustomAreaTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-zinc-700">
      <div className="font-semibold">{d.hour}:00</div>
      <div>{d.orders} orders · {fmtINR(d.revenue)}</div>
    </div>
  );
};

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{(percent * 100).toFixed(0)}%</text>;
};

const SalesMockup = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const schedules = restaurant?.schedules || [];
  const downloadRef = useRef(null);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);

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

  // ── Aggregations ──
  const analytics = useMemo(() => {
    if (!rawOrders.length) return null;
    const collectMode = REVENUE_BASIS === 'collect';

    // CR-030: collect mode rows are already fs=6 + collect_bill-windowed.
    // paidRows includes TAB-credit rows (their GST stays in tax — H5);
    // revenueOrders excludes them (credit is never revenue at punch).
    const paidRows = collectMode ? rawOrders : rawOrders.filter((o) => o.fOrderStatus === 6);
    const revenueOrders = collectMode ? paidRows.filter((o) => !o.isTabCredit) : paidRows;
    const settlementTotal = collectMode ? tabSettlements.reduce((s, x) => s + (x.total || 0), 0) : 0;

    const totalRevenue = revenueOrders.reduce((s, r) => s + (r.totalAmount || 0), 0) + settlementTotal;
    const totalOrders = revenueOrders.length;
    const totalTax = paidRows.reduce((s, r) => s + (r.gstAmount || 0) + (r.vatAmount || 0), 0);
    const totalDiscount = revenueOrders.reduce((s, r) => s + (r.discount || 0) + (r.couponDiscount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? (totalRevenue - settlementTotal) / totalOrders : 0;

    // Daily breakdown — collect mode buckets by collect_bill BUSINESS day
    const dailyMap = {};
    const dayKey = (o) => (collectMode ? o.revenueDate : o.orderDate) || 'Unknown';
    revenueOrders.forEach((o) => {
      const date = dayKey(o); // DD/MM/YYYY
      if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, orders: 0, tax: 0, discount: 0 };
      dailyMap[date].revenue += o.totalAmount || 0;
      dailyMap[date].orders += 1;
      dailyMap[date].tax += (o.gstAmount || 0) + (o.vatAmount || 0);
      dailyMap[date].discount += (o.discount || 0) + (o.couponDiscount || 0);
    });
    if (collectMode) {
      tabSettlements.forEach((s) => {
        if (!(s.total > 0)) return;
        const date = s.dateDisplay;
        if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, orders: 0, tax: 0, discount: 0 };
        dailyMap[date].revenue += s.total; // settlement money-in on settlement day (H5)
      });
    }
    const daily = Object.values(dailyMap).sort((a, b) => {
      const [ad, am, ay] = a.date.split('/'); const [bd, bm, by] = b.date.split('/');
      return `${ay}${am}${ad}`.localeCompare(`${by}${bm}${bd}`);
    });
    const bestDay = daily.reduce((best, d) => d.revenue > (best?.revenue || 0) ? d : best, null);
    const worstDay = daily.filter(d => d.revenue > 0).reduce((worst, d) => d.revenue < (worst?.revenue || Infinity) ? d : worst, null);
    const uniqueDays = daily.length;
    const avgDailyRevenue = uniqueDays > 0 ? totalRevenue / uniqueDays : 0;

    // Channel breakdown (CR-029: Room channel surfaces — RM/SRM/pm='ROOM')
    const channelMap = {};
    revenueOrders.forEach((o) => {
      const ot = (o.orderType || '').toLowerCase();
      let ch = 'Dine-In';
      if (o.orderIn === 'RM' || o.orderIn === 'SRM' || o.paymentMethod === 'ROOM') ch = 'Room';
      else if (ot.includes('delivery') || ot.includes('home_delivery')) ch = 'Delivery';
      else if (ot.includes('takeaway') || ot.includes('take_away')) ch = 'Takeaway';
      if (!channelMap[ch]) channelMap[ch] = { channel: ch, revenue: 0, orders: 0 };
      channelMap[ch].revenue += o.totalAmount || 0;
      channelMap[ch].orders += 1;
    });
    const channels = Object.values(channelMap).sort((a, b) => b.revenue - a.revenue);

    // Payment method breakdown — CR-032 shared classifier + Credit settlements group
    const paymentMap = {};
    revenueOrders.forEach((o) => {
      const pmKey = classifyPaymentMethod(o.paymentMethod);
      if (!pmKey) return;
      if (!paymentMap[pmKey]) paymentMap[pmKey] = { method: pmKey, revenue: 0, orders: 0 };
      paymentMap[pmKey].revenue += o.totalAmount || 0;
      paymentMap[pmKey].orders += 1;
    });
    if (settlementTotal > 0) {
      paymentMap[CREDIT_GROUP] = { method: CREDIT_GROUP, revenue: settlementTotal, orders: 0 };
    }
    const payments = Object.values(paymentMap).sort((a, b) => b.revenue - a.revenue);

    // Hourly heatmap
    const hourlyMap = {};
    revenueOrders.forEach((o) => {
      const hour = (o.orderTime || '00:00').slice(0, 2);
      if (!hourlyMap[hour]) hourlyMap[hour] = { hour, revenue: 0, orders: 0 };
      hourlyMap[hour].revenue += o.totalAmount || 0;
      hourlyMap[hour].orders += 1;
    });
    const hourly = Object.values(hourlyMap).sort((a, b) => a.hour.localeCompare(b.hour));
    const peakHour = hourly.reduce((best, h) => h.revenue > (best?.revenue || 0) ? h : best, null);

    return {
      totalRevenue, totalOrders, totalTax, totalDiscount, avgOrderValue,
      daily, bestDay, worstDay, avgDailyRevenue, uniqueDays,
      channels, payments, hourly, peakHour,
      allOrders: rawOrders.length,
      creditSettled: settlementTotal,
    };
  }, [rawOrders, tabSettlements]);

  // ── Export ──
  const buildExportPayload = () => {
    if (!analytics) return null;
    const NUMERIC_KEYS = ['revenue', 'orders', 'tax', 'discount'];
    const sumAll = (rows, keys) => {
      const t = { label: 'TOTAL' };
      keys.forEach((k) => { t[k] = rows.reduce((s, r) => s + (Number(r[k]) || 0), 0); });
      return t;
    };
    return {
      title: 'Sales Report',
      subtitle: 'Revenue & order analytics',
      restaurant: { name: restaurant?.name || '', address: restaurant?.address || '', id: restaurant?.id || '' },
      dateRange: { from: appliedFrom, to: appliedTo },
      generatedBy: restaurant?.ownerName || '',
      kpis: [
        { label: 'Total Revenue', value: analytics.totalRevenue, tone: 'good', format: 'inr' },
        { label: 'Total Orders', value: analytics.totalOrders, tone: 'primary', format: 'text' },
        { label: 'Avg Order Value', value: analytics.avgOrderValue, tone: 'primary', format: 'inr' },
        { label: 'Avg Daily Revenue', value: analytics.avgDailyRevenue, tone: 'good', format: 'inr' },
        { label: 'Best Day', value: analytics.bestDay ? `${analytics.bestDay.date} (${fmtINR(analytics.bestDay.revenue)})` : '—', tone: 'good', format: 'text' },
        { label: 'Peak Hour', value: analytics.peakHour ? `${analytics.peakHour.hour}:00 (${analytics.peakHour.orders} orders)` : '—', tone: 'primary', format: 'text' },
        { label: 'Tax Collected', value: analytics.totalTax, tone: 'primary', format: 'inr' },
        { label: 'Discount Given', value: analytics.totalDiscount, tone: 'bad', format: 'inr' },
        { label: 'Days', value: analytics.uniqueDays, tone: '', format: 'text' },
      ],
      sheets: [
        {
          name: 'Daily Sales',
          subtitle: `${analytics.daily.length} days · ${appliedFrom} → ${appliedTo}`,
          columns: [
            { key: 'date', label: 'Date', format: 'text', align: 'left', width: 120 },
            { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 },
            { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right', width: 120 },
            { key: 'tax', label: 'Tax', format: 'inr', align: 'right', width: 100 },
            { key: 'discount', label: 'Discount', format: 'inr', align: 'right', width: 100 },
          ],
          rows: analytics.daily,
          totals: sumAll(analytics.daily, NUMERIC_KEYS),
        },
        {
          name: 'By Channel',
          subtitle: `${analytics.channels.length} channels`,
          columns: [
            { key: 'channel', label: 'Channel', format: 'text', align: 'left', width: 150 },
            { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 },
            { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right', width: 120 },
          ],
          rows: analytics.channels,
          totals: sumAll(analytics.channels, ['orders', 'revenue']),
        },
        {
          name: 'By Payment Method',
          subtitle: `${analytics.payments.length} methods`,
          columns: [
            { key: 'method', label: 'Payment Method', format: 'text', align: 'left', width: 150 },
            { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 },
            { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right', width: 120 },
          ],
          rows: analytics.payments,
          totals: sumAll(analytics.payments, ['orders', 'revenue']),
        },
        {
          name: 'By Hour',
          subtitle: 'Hourly distribution',
          columns: [
            { key: 'hour', label: 'Hour', format: 'text', align: 'left', width: 80 },
            { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 },
            { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right', width: 120 },
          ],
          rows: analytics.hourly,
          totals: sumAll(analytics.hourly, ['orders', 'revenue']),
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
    <div className="flex h-screen bg-white font-sans" data-testid="sales-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="sales-header">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="sales-back-btn" onClick={() => navigate('/reports-module/dashboard')}>
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Sales
              </h1>
              <p className="text-[11px] text-zinc-500 mt-0.5" data-testid="sales-basis-label">
                Revenue by collection date · incl. room food · credit counted on settlement
                {' · '}
                <button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium" data-testid="sales-definitions-link">ⓘ Definitions</button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date range */}
            <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid && !draftRangeExceeded ? 'border-[#F26B33]' : draftRangeExceeded ? 'border-red-400' : 'border-zinc-200'} bg-white rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="sales-daterange">
              <CalendarIcon className="w-4 h-4 text-zinc-500" />
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="sales-date-from" />
              </label>
              <span className="text-zinc-300">—</span>
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="sales-date-to" />
              </label>
              {draftRangeExceeded && <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Max 60 days</span>}
            </div>

            <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="sales-apply-btn">
              <Check className="w-4 h-4" /> Apply
            </button>

            <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="sales-presets">
              {['Today', '7D', '30D', 'MTD'].map((p) => (
                <button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'}`} data-testid={`sales-preset-${p.toLowerCase()}`} onClick={() => handlePreset(p)}>
                  {p}
                </button>
              ))}
            </div>

            {/* Download */}
            <div className="relative" ref={downloadRef}>
              <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || !analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 transition-colors shadow-sm ${isLoading || !analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="sales-download-trigger">
                <Download className="w-4 h-4" /> Download
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="sales-download-menu">
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
                {/* KPI Strip */}
                <div className="grid grid-cols-4 gap-4" data-testid="sales-kpi-strip">
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-[#329937]" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total Revenue</span></div>
                    <div className="text-2xl font-bold text-zinc-950" data-testid="sales-total-revenue">{fmtINR(analytics.totalRevenue)}</div>
                    <div className="text-xs text-zinc-400 mt-1">{analytics.totalOrders} orders · {analytics.uniqueDays} days</div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><ShoppingBag className="w-4 h-4 text-[#F26B33]" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Avg Order Value</span></div>
                    <div className="text-2xl font-bold text-zinc-950" data-testid="sales-avg-order">{fmtINR2(analytics.avgOrderValue)}</div>
                    <div className="text-xs text-zinc-400 mt-1">Avg daily: {fmtINR(analytics.avgDailyRevenue)}</div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-blue-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Tax Collected</span></div>
                    <div className="text-2xl font-bold text-zinc-950" data-testid="sales-tax">{fmtINR2(analytics.totalTax)}</div>
                    <div className="text-xs text-zinc-400 mt-1">GST + VAT</div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-red-500" /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Discount Given</span></div>
                    <div className="text-2xl font-bold text-zinc-950" data-testid="sales-discount">{fmtINR2(analytics.totalDiscount)}</div>
                    <div className="text-xs text-zinc-400 mt-1">{analytics.allOrders} total orders incl. cancelled</div>
                  </div>
                </div>

                {/* Daily Revenue Chart — recharts BarChart */}
                <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="sales-daily-chart">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Daily Revenue</h2>
                    {analytics.bestDay && (
                      <span className="text-xs text-zinc-400">
                        Best: <span className="text-[#329937] font-medium">{analytics.bestDay.date}</span> ({fmtINR(analytics.bestDay.revenue)})
                        {analytics.worstDay && <> · Lowest: <span className="text-red-500 font-medium">{analytics.worstDay.date}</span> ({fmtINR(analytics.worstDay.revenue)})</>}
                      </span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={analytics.daily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F26B33" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#F26B33" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} tickFormatter={(v) => v.slice(0, 5)} />
                      <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <ReTooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(242,107,51,0.06)', radius: 4 }} />
                      <Bar dataKey="revenue" fill="url(#barGrad)" radius={[6, 6, 0, 0]} animationDuration={800} animationEasing="ease-out" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Channel + Payment Donut Charts */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Channel Donut */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="sales-channel-breakdown">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-2">Revenue by Channel</h2>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={analytics.channels.map((ch) => ({ name: ch.channel, value: ch.revenue, orders: ch.orders, pct: (analytics.totalRevenue > 0 ? (ch.revenue / analytics.totalRevenue * 100).toFixed(1) : '0') }))}
                          cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                          paddingAngle={3} dataKey="value"
                          animationDuration={800} animationEasing="ease-out"
                          labelLine={false} label={renderPieLabel}
                        >
                          {analytics.channels.map((ch, i) => (
                            <Cell key={ch.channel} fill={PIE_COLORS_CHANNEL[i % PIE_COLORS_CHANNEL.length]} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                        <ReTooltip content={<CustomPieTooltip />} />
                        <Legend formatter={(value) => <span className="text-xs text-zinc-600">{value}</span>} iconType="circle" iconSize={8} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Payment Donut */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="sales-payment-breakdown">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-2">Revenue by Payment Method</h2>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={analytics.payments.map((pm) => ({ name: pm.method, value: pm.revenue, orders: pm.orders, pct: (analytics.totalRevenue > 0 ? (pm.revenue / analytics.totalRevenue * 100).toFixed(1) : '0') }))}
                          cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                          paddingAngle={3} dataKey="value"
                          animationDuration={800} animationEasing="ease-out"
                          labelLine={false} label={renderPieLabel}
                        >
                          {analytics.payments.map((pm, i) => (
                            <Cell key={pm.method} fill={PIE_COLORS_PAYMENT[i % PIE_COLORS_PAYMENT.length]} stroke="white" strokeWidth={2} />
                          ))}
                        </Pie>
                        <ReTooltip content={<CustomPieTooltip />} />
                        <Legend formatter={(value) => <span className="text-xs text-zinc-600">{value}</span>} iconType="circle" iconSize={8} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Hourly Distribution — AreaChart */}
                <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="sales-hourly">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Hourly Distribution</h2>
                    {analytics.peakHour && (
                      <span className="text-xs text-zinc-400">Peak: <span className="text-[#F26B33] font-medium">{analytics.peakHour.hour}:00</span> ({analytics.peakHour.orders} orders, {fmtINR(analytics.peakHour.revenue)})</span>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={analytics.hourly} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F26B33" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#F26B33" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} tickFormatter={(v) => `${v}:00`} />
                      <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                      <ReTooltip content={<CustomAreaTooltip />} cursor={{ stroke: '#F26B33', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Area type="monotone" dataKey="orders" stroke="#F26B33" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ r: 4, fill: '#F26B33', stroke: 'white', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#F26B33', stroke: 'white', strokeWidth: 2 }} animationDuration={800} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Daily Table */}
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="sales-daily-table">
                  <div className="px-6 py-4 border-b border-zinc-100">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Daily Breakdown</h2>
                  </div>
                  <table className="w-full">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Orders</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Revenue</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Avg Order</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Tax</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Discount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.daily.map((d, i) => (
                        <tr key={i} className={`border-t border-zinc-50 ${d === analytics.bestDay ? 'bg-green-50/50' : ''}`}>
                          <td className="px-6 py-3 text-sm font-medium text-zinc-800">{d.date}</td>
                          <td className="px-6 py-3 text-sm text-right text-zinc-700">{d.orders}</td>
                          <td className="px-6 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR2(d.revenue)}</td>
                          <td className="px-6 py-3 text-sm text-right text-zinc-600">{fmtINR2(d.orders > 0 ? d.revenue / d.orders : 0)}</td>
                          <td className="px-6 py-3 text-sm text-right text-zinc-600">{fmtINR2(d.tax)}</td>
                          <td className="px-6 py-3 text-sm text-right text-red-600">{d.discount > 0 ? fmtINR2(d.discount) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                      <tr>
                        <td className="px-6 py-3 text-sm font-bold text-zinc-900">TOTAL</td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-zinc-900">{analytics.totalOrders}</td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-zinc-900">{fmtINR2(analytics.totalRevenue)}</td>
                        <td className="px-6 py-3 text-sm text-right font-semibold text-zinc-600">{fmtINR2(analytics.avgOrderValue)}</td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-zinc-900">{fmtINR2(analytics.totalTax)}</td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-red-600">{fmtINR2(analytics.totalDiscount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Footer */}
                <div className="text-xs text-zinc-400 text-center py-2">
                  {analytics.allOrders} total orders · {appliedFrom} → {appliedTo}
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

export default SalesMockup;
