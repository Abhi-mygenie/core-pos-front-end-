/**
 * PurchaseReportPage — CR-150 (POS 6.0)
 *
 * Purchase tracking report: daily trend, vendor breakdown, payment split, PO table.
 * Pattern: ExpenseReportPage.jsx / SettlementReportMockup.jsx
 * Data source: GET /api/v2/vendoremployee/inventory/vendor-item-list (with from/to params)
 * Design: frozen mockup at /public/mockups_preview.html (CR-150 tab)
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { getPurchaseReport } from '../../api/services/inventoryService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import {
  ArrowLeft, Search, Download, FileSpreadsheet, FileDown,
  ShoppingCart, TrendingUp, Users, BarChart3, CalendarDays, Check,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtINR = (n) =>
  (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const todayISO   = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const mtdISO     = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };
const fmtDisplay = (iso) => (iso || '').split('-').reverse().join('/');

const QUICK_RANGES = [
  { label: 'Today', getFrom: todayISO,          getTo: todayISO },
  { label: '7D',    getFrom: () => daysAgoISO(6),  getTo: todayISO },
  { label: '30D',   getFrom: () => daysAgoISO(29), getTo: todayISO },
  { label: 'MTD',   getFrom: mtdISO,            getTo: todayISO },
];

const PIE_COLORS = ['#329937', '#F26B33', '#2563EB', '#7C3AED', '#EC4899', '#14B8A6', '#F59E0B', '#EF4444'];

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer'];
const PAYMENT_STYLE = {
  Cash:            { bg: 'rgba(50,153,55,.10)',   color: '#329937' },
  UPI:             { bg: 'rgba(37,99,235,.10)',   color: '#2563EB' },
  'Bank Transfer': { bg: 'rgba(124,58,237,.10)',  color: '#7C3AED' },
};

const TABLE_COLS = [
  { key: 'ID',              label: 'PO REF',       align: 'text-left',   sort: true },
  { key: 'Purchase_Date',   label: 'DATE',         align: 'text-left',   sort: true },
  { key: 'Ingredient_Name', label: 'INGREDIENT',   align: 'text-left',   sort: true },
  { key: 'Vendor_Name',     label: 'VENDOR',       align: 'text-left',   sort: true },
  { key: 'Quantity',        label: 'QTY',          align: 'text-center', sort: false },
  { key: 'unit_price',      label: 'UNIT PRICE',   align: 'text-right',  sort: true },
  { key: '_lineTotal',      label: 'ITEM TOTAL',   align: 'text-right',  sort: true },
  { key: 'Payment_Type',    label: 'PAYMENT TYPE', align: 'text-left',   sort: true },
];

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet },
  { id: 'pdf',   label: 'Download as PDF',   icon: FileDown },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function PurchaseReportPage() {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();

  // Date range — applied state drives fetch
  const [pendingFrom,  setPendingFrom]  = useState(daysAgoISO(29));
  const [pendingTo,    setPendingTo]    = useState(todayISO());
  const [appliedFrom,  setAppliedFrom]  = useState(daysAgoISO(29));
  const [appliedTo,    setAppliedTo]    = useState(todayISO());
  const [activePreset, setActivePreset] = useState('30D');

  // Data
  const [rawData,  setRawData]  = useState([]);
  const [summary,  setSummary]  = useState({});
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // Table controls
  const [search,   setSearch]   = useState('');
  const [sortKey,  setSortKey]  = useState('Purchase_Date');
  const [sortDir,  setSortDir]  = useState('desc');

  // UI
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  const [showDownloadMenu,  setShowDownloadMenu]   = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getPurchaseReport(appliedFrom, appliedTo);
      setRawData(res.data || []);
      setSummary(res.summary || {});
    } catch {
      setError('Failed to load purchase report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Date controls ──────────────────────────────────────────────────────────
  const handleApply = () => {
    setAppliedFrom(pendingFrom);
    setAppliedTo(pendingTo);
  };

  const handlePreset = (preset) => {
    const r = QUICK_RANGES.find(x => x.label === preset);
    if (!r) return;
    const f = r.getFrom(), t = r.getTo();
    setPendingFrom(f); setPendingTo(t);
    setAppliedFrom(f); setAppliedTo(t);
    setActivePreset(preset);
  };

  // ── Sort ──────────────────────────────────────────────────────────────────
  const handleSort = (key) => {
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  // Normalise rows — add _lineTotal numeric field
  const normalised = useMemo(
    () => rawData.map(r => ({ ...r, _lineTotal: parseFloat(r.line_total) || parseFloat(r.Amount) || 0 })),
    [rawData]
  );

  // Filtered + sorted
  const filteredRows = useMemo(() => {
    let rows = normalised;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.Ingredient_Name || '').toLowerCase().includes(q) ||
        (r.Vendor_Name     || '').toLowerCase().includes(q) ||
        String(r.ID || '').includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [normalised, search, sortKey, sortDir]);

  // KPI aggregates
  const totalSpend  = useMemo(() => filteredRows.reduce((s, r) => s + r._lineTotal, 0), [filteredRows]);
  const vendorCount = useMemo(() => new Set(filteredRows.map(r => r.Vendor_Name).filter(Boolean)).size, [filteredRows]);

  // Daily breakdown → bar chart + avgDaily + highestDay
  const byDay = useMemo(() => {
    const acc = {};
    filteredRows.forEach(r => {
      const d = r.Purchase_Date || 'Unknown';
      if (!acc[d]) acc[d] = { date: d, total: 0, count: 0 };
      acc[d].total += r._lineTotal;
      acc[d].count++;
    });
    return Object.values(acc).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRows]);

  const activeDays = byDay.length;
  const avgDaily   = activeDays ? totalSpend / activeDays : 0;
  const highestDay = [...byDay].sort((a, b) => b.total - a.total)[0] || null;

  const barData = useMemo(
    () => byDay.map(d => ({ date: d.date.slice(5).split('-').reverse().join('/'), total: d.total })),
    [byDay]
  );

  // Vendor breakdown → pie chart
  const pieData = useMemo(() => {
    const acc = {};
    filteredRows.forEach(r => {
      const v = r.Vendor_Name || 'Unassigned';
      acc[v] = (acc[v] || 0) + r._lineTotal;
    });
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  // Payment split
  const payData = useMemo(() => {
    const acc = {};
    filteredRows.forEach(r => {
      const p = r.Payment_Type || 'Cash';
      acc[p] = (acc[p] || 0) + r._lineTotal;
    });
    return acc;
  }, [filteredRows]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const buildExportPayload = () => ({
    title:      'Purchase Report',
    restaurant: { name: restaurant?.name, id: restaurant?.id },
    dateRange:  { from: appliedFrom, to: appliedTo },
    kpis: [
      { label: 'Purchases',    value: filteredRows.length, format: 'int' },
      { label: 'Total Spend',  value: totalSpend,          format: 'inr' },
      { label: 'Avg Daily',    value: avgDaily,            format: 'inr' },
      { label: 'Vendors',      value: vendorCount,         format: 'int' },
    ],
    sheets: [{
      name: 'Purchase Report',
      columns: [
        { key: 'ID',              label: 'PO Ref',       format: 'text' },
        { key: 'Purchase_Date',   label: 'Date',         format: 'text' },
        { key: 'Ingredient_Name', label: 'Ingredient',   format: 'text' },
        { key: 'Vendor_Name',     label: 'Vendor',       format: 'text' },
        { key: 'Quantity',        label: 'Quantity',     format: 'text' },
        { key: 'unit_price',      label: 'Unit Price',   format: 'inr',  align: 'right' },
        { key: '_lineTotal',      label: 'Item Total',   format: 'inr',  align: 'right' },
        { key: 'Payment_Type',    label: 'Payment Type', format: 'text' },
      ],
      rows:   filteredRows,
      totals: { label: 'TOTAL', _lineTotal: totalSpend },
    }],
  });

  const handleDownloadAction = (type) => {
    let pdfWin = null;
    if (type === 'pdf') pdfWin = openReportWindow();
    setShowDownloadMenu(false);
    try {
      const payload = buildExportPayload();
      if (type === 'excel') exportReportAsExcel(payload);
      else if (type === 'pdf') exportReportAsPDF(pdfWin, payload);
    } catch (e) {
      console.error('[PurchaseReport] Export failed:', e); // CR-150
      if (pdfWin && !pdfWin.closed) pdfWin.close();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden" data-testid="purchase-report-page">
      <Sidebar
        activeItem="purchase-report"
        isExpanded={isSidebarExpanded}
        setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ReportLoadingShield loading={loading} error={error} onRetry={fetchData}>
          <div className="flex-1 overflow-y-auto">

            {/* ── Header bar ──────────────────────────────────────────────── */}
            <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10"
                 data-testid="purchase-report-header">

              <button onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center border border-zinc-200 rounded-lg text-zinc-500 hover:border-[#F26B33] hover:text-[#F26B33] transition-colors flex-shrink-0"
                data-testid="purchase-report-back-btn">
                <ArrowLeft className="w-4 h-4" />
              </button>

              <h1 className="text-xl font-bold text-zinc-900 mr-1 whitespace-nowrap" data-testid="purchase-report-title">
                Purchase Report
              </h1>

              {/* Date range picker */}
              <div className="flex items-center gap-2 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm hover:border-[#F26B33] focus-within:border-[#F26B33] transition-colors"
                   data-testid="purchase-report-daterange">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">From</span>
                <input type="date" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)}
                  className="border-none outline-none text-sm text-zinc-700 bg-transparent cursor-pointer"
                  data-testid="purchase-report-date-from" />
                <span className="text-zinc-300">—</span>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">To</span>
                <input type="date" value={pendingTo} onChange={e => setPendingTo(e.target.value)}
                  className="border-none outline-none text-sm text-zinc-700 bg-transparent cursor-pointer"
                  data-testid="purchase-report-date-to" />
              </div>

              {/* Apply */}
              <button onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#329937] hover:bg-[#287a2d] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                data-testid="purchase-report-apply-btn">
                <Check className="w-3.5 h-3.5" /> Apply
              </button>

              {/* Quick presets */}
              <div className="flex gap-1 bg-zinc-100 rounded-lg p-1" data-testid="purchase-report-presets">
                {QUICK_RANGES.map(r => (
                  <button key={r.label} onClick={() => handlePreset(r.label)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${activePreset === r.label ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                    data-testid={`purchase-report-preset-${r.label}`}>
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Download */}
              <div className="ml-auto relative">
                <button onClick={() => setShowDownloadMenu(v => !v)}
                  className="flex items-center gap-2 px-4 py-1.5 border-[1.5px] border-[#F26B33] text-[#F26B33] hover:bg-orange-50 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                  data-testid="purchase-report-download-trigger">
                  <Download className="w-4 h-4" /> Download
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    {DOWNLOAD_MENU.map(({ id, label, icon: Icon }) => (
                      <button key={id} onClick={() => handleDownloadAction(id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                        data-testid={`purchase-report-download-${id}`}>
                        <Icon className="w-4 h-4 text-zinc-400" /> {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── KPI strip (5 cards) ─────────────────────────────────────── */}
            <div className="grid grid-cols-5 gap-3 px-6 pt-5" data-testid="purchase-report-kpi-strip">

              <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3" data-testid="purchase-report-kpi-purchases">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Purchases</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums">{filteredRows.length}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="w-4 h-4 text-[#F26B33]" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Total PO entries</p>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3" data-testid="purchase-report-kpi-total-spend">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total Spend</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums">{fmtINR(totalSpend)}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-[#329937]" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Gross inventory outlay</p>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3" data-testid="purchase-report-kpi-avg-daily">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Avg Daily Spend</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums">{fmtINR(avgDaily)}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-4 h-4 text-[#F26B33]" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Across {activeDays} active days</p>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3" data-testid="purchase-report-kpi-vendors">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Vendors</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums">{vendorCount}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">Suppliers engaged</p>
              </div>

              <div className="bg-white border border-[#F26B33]/30 rounded-xl px-4 py-3" data-testid="purchase-report-kpi-highest-day">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Highest Day</p>
                    <p className="text-2xl font-bold text-zinc-950 tabular-nums">{highestDay ? fmtINR(highestDay.total) : '—'}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-4 h-4 text-pink-500" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500">{highestDay ? `${fmtDisplay(highestDay.date)} · ${highestDay.count} POs` : 'No data'}</p>
              </div>
            </div>

            {/* ── Charts row: Bar (2/3) + Pie (1/3) ───────────────────────── */}
            <div className="grid grid-cols-3 gap-4 px-6 pt-4">

              {/* Daily Purchase Trend — col-span-2 */}
              <div className="col-span-2 bg-white border border-zinc-200 rounded-xl p-6"
                   data-testid="purchase-report-daily-chart">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">
                  Daily Purchase Trend
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="purchaseBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#329937" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#329937" stopOpacity={0.40} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date"
                      tick={{ fontSize: 10, fill: '#a1a1aa' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e4e4e7' }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#a1a1aa' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                    />
                    <ReTooltip formatter={v => [fmtINR(v), 'Spend']} />
                    <Bar dataKey="total" fill="url(#purchaseBarGrad)" radius={[4, 4, 0, 0]} animationDuration={600} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Spend by Vendor — doughnut */}
              <div className="bg-white border border-zinc-200 rounded-xl p-6"
                   data-testid="purchase-report-vendor-chart">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">
                  Spend by Vendor
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name"
                         cx="50%" cy="50%" outerRadius={75} innerRadius={42} paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend formatter={val => <span className="text-xs text-zinc-600">{val}</span>} />
                    <ReTooltip formatter={val => fmtINR(val)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Payment method split (3 cards) ──────────────────────────── */}
            <div className="grid grid-cols-3 gap-4 px-6 pt-4" data-testid="purchase-report-payment-split">
              {PAYMENT_METHODS.map(method => {
                const val = payData[method] || 0;
                const pct = Math.round((val / (totalSpend || 1)) * 100);
                const max = Math.max(...PAYMENT_METHODS.map(m => payData[m] || 0), 1);
                const w   = Math.round((val / max) * 100);
                const s   = PAYMENT_STYLE[method];
                return (
                  <div key={method}
                       className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4"
                       data-testid={`purchase-report-payment-${method.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold flex-shrink-0 text-base"
                         style={{ backgroundColor: s.bg, color: s.color }}>₹</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-800">{method}</div>
                      <div className="text-lg font-extrabold text-zinc-950 tracking-tight tabular-nums">
                        {fmtINR(val)}{' '}
                        <span className="text-xs font-normal text-zinc-400">({pct}%)</span>
                      </div>
                      <div className="h-1 rounded-full mt-1.5 bg-zinc-100">
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${w}%`, background: s.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Table section ────────────────────────────────────────────── */}
            <div className="px-6 pt-4 pb-10">

              {/* Controls row */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative max-w-xs flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search purchases..."
                    className="w-full border border-zinc-200 rounded-lg pl-8 pr-3 py-2 text-sm text-zinc-700 outline-none focus:border-[#F26B33] transition-colors bg-white"
                    data-testid="purchase-report-search"
                  />
                </div>
                <span className="ml-auto text-xs text-zinc-400" data-testid="purchase-report-meta">
                  {filteredRows.length} purchases · {fmtDisplay(appliedFrom)} → {fmtDisplay(appliedTo)}
                </span>
              </div>

              {/* Table */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
                   data-testid="purchase-report-table-container">
                <table className="w-full text-xs" data-testid="purchase-report-table">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      {TABLE_COLS.map(col => (
                        <th key={col.key}
                          onClick={col.sort ? () => handleSort(col.key) : undefined}
                          className={`px-4 py-3 ${col.align} text-[10px] font-semibold uppercase tracking-wider text-zinc-500 ${col.sort ? 'cursor-pointer hover:text-zinc-800 select-none' : ''}`}
                          data-testid={`purchase-report-th-${col.key.toLowerCase().replace(/_/g, '-')}`}>
                          {col.label}
                          {col.sort && (
                            <span className={`ml-1 ${sortKey === col.key ? 'opacity-100 text-[#F26B33]' : 'opacity-30'}`}>
                              {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* TOTALS ROW — pinned first, orange */}
                    <tr className="bg-[#F26B33]/5 border-b-2 border-[#F26B33]/25"
                        data-testid="purchase-report-totals-row">
                      <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#F26B33]">TOTALS</td>
                      <td className="px-4 py-2.5 text-[#F26B33] text-[11px] font-bold">—</td>
                      <td className="px-4 py-2.5 text-[#F26B33] text-[11px] font-bold">—</td>
                      <td className="px-4 py-2.5 text-[#F26B33] text-[11px] font-bold">—</td>
                      <td className="px-4 py-2.5 text-center text-[#F26B33] text-[11px] font-bold tabular-nums">
                        {filteredRows.length} entries
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#F26B33] text-[11px] font-bold">—</td>
                      <td className="px-4 py-2.5 text-right text-[#F26B33] text-[11px] font-bold tabular-nums">
                        {fmtINR(totalSpend)}
                      </td>
                      <td className="px-4 py-2.5 text-[#F26B33] text-[11px] font-bold">—</td>
                    </tr>

                    {/* DATA ROWS */}
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-zinc-400 text-sm">
                          No purchase records found for the selected period
                        </td>
                      </tr>
                    ) : filteredRows.map((row, idx) => {
                      const payStyle = PAYMENT_STYLE[row.Payment_Type];
                      return (
                        <tr key={row.ID || idx}
                            className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
                            data-testid={`purchase-report-row-${row.ID}`}>
                          <td className="px-4 py-3 font-semibold text-[#F26B33]">
                            {row.ID ? `#${row.ID}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-zinc-600">{row.Purchase_Date || '—'}</td>
                          <td className="px-4 py-3 font-medium text-zinc-800">{row.Ingredient_Name || '—'}</td>
                          <td className="px-4 py-3 text-zinc-600">
                            {row.Vendor_Name || <span className="text-zinc-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-zinc-600">{row.Quantity || '—'}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{fmtINR(row.unit_price)}</td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-zinc-900">{fmtINR(row._lineTotal)}</td>
                          <td className="px-4 py-3">
                            {payStyle ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
                                    style={{ background: payStyle.bg, color: payStyle.color }}>
                                {row.Payment_Type}
                              </span>
                            ) : (
                              row.Payment_Type
                                ? <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-500">{row.Payment_Type}</span>
                                : <span className="text-zinc-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </ReportLoadingShield>
      </div>
    </div>
  );
}
