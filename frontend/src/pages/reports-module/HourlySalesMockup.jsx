/**
 * HourlySalesMockup — CR-011 S12 (Phase 3)
 *
 * Hourly Sales Curve deep-dive: peak/off-peak hours, revenue by hour,
 * heatmap-style table, order density visualization.
 * Data source: insights-sales.hourly[] (CR-049 backend aggregation)
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
  Mail, MessageCircle, Send, Clock, TrendingUp, Zap, Moon, Sunrise,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';

// CR-011 S12
const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtINR2 = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's12-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's12-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's12-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's12-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's12-share-sms-btn' },
];

const HourlyTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-zinc-700">
      <div className="font-semibold mb-1">{d.label}</div>
      <div>{fmtINR(d.revenue)} · {d.orders} orders</div>
      {d.avgOrderValue > 0 && <div className="text-zinc-400">Avg: {fmtINR(d.avgOrderValue)}</div>}
      <div className="text-zinc-400">{d.pctOfTotal}% of total</div>
    </div>
  );
};

const HourlySalesMockup = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const downloadRef = useRef(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
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
    if (p === 'Today') f = t; else if (p === '7D') f = new Date(t.getTime() - 6 * 86400000);
    else if (p === '30D') f = new Date(t.getTime() - 29 * 86400000);
    else if (p === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); } else return;
    const fd = fmtISO(f); const td = fmtISO(t);
    setFromDate(fd); setToDate(td); setAppliedFrom(fd); setAppliedTo(td); setActivePreset(p);
    setSharedFrom(fd); setSharedTo(td);
  };

  const fetchData = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return;
    setIsLoading(true); setError(null);
    try { setSalesData(await fetchInsightsSales(appliedFrom, appliedTo)); setHasLoadedOnce(true); }
    catch (e) { setError(e.message || 'Failed to load'); }
    finally { setIsLoading(false); }
  }, [appliedFrom, appliedTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // CR-011 S12: Transform hourly data — fill all 24 hours
  const analytics = useMemo(() => {
    if (!salesData) return null;
    const s = salesData.summary || {};
    const hourMap = {};
    (salesData.hourly || []).forEach(h => { hourMap[h.hour] = { revenue: h.revenue || 0, orders: h.orders || 0 }; });

    const totalRevenue = s.total_revenue || 0;
    const hourly = Array.from({ length: 24 }, (_, i) => {
      const d = hourMap[i] || { revenue: 0, orders: 0 };
      return {
        hour: i, label: `${String(i).padStart(2, '0')}:00 – ${String(i).padStart(2, '0')}:59`,
        revenue: d.revenue, orders: d.orders,
        avgOrderValue: d.orders > 0 ? d.revenue / d.orders : 0,
        pctOfTotal: totalRevenue > 0 ? ((d.revenue / totalRevenue) * 100).toFixed(1) : '0',
      };
    });

    const activeHours = hourly.filter(h => h.orders > 0);
    const peakHour = activeHours.reduce((b, h) => h.revenue > (b?.revenue || 0) ? h : b, null);
    const offPeakHour = activeHours.reduce((w, h) => h.revenue < (w?.revenue || Infinity) ? h : w, null);
    const avgHourlyRevenue = activeHours.length > 0 ? totalRevenue / activeHours.length : 0;

    // Service periods
    const breakfast = hourly.filter(h => h.hour >= 6 && h.hour <= 9); // F-2: [06, 10) = hours 6,7,8,9
    const lunch = hourly.filter(h => h.hour >= 11 && h.hour <= 15);
    const dinner = hourly.filter(h => h.hour >= 18 && h.hour <= 23);
    const breakfastRev = breakfast.reduce((s, h) => s + h.revenue, 0);
    const lunchRev = lunch.reduce((s, h) => s + h.revenue, 0);
    const dinnerRev = dinner.reduce((s, h) => s + h.revenue, 0);

    return { hourly, totalRevenue, totalOrders: s.total_orders || 0, peakHour, offPeakHour, avgHourlyRevenue, activeHourCount: activeHours.length, breakfastRev, lunchRev, dinnerRev };
  }, [salesData]);

  const buildExportPayload = () => {
    if (!analytics) return null;
    return {
      title: 'Hourly Sales Curve', subtitle: 'Revenue distribution by hour of day',
      restaurant: { name: restaurant?.name || '', address: restaurant?.address || '', id: restaurant?.id || '' },
      dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [
        { label: 'Total Revenue', value: analytics.totalRevenue, format: 'inr' },
        { label: 'Peak Hour', value: analytics.peakHour ? `${analytics.peakHour.label} (${fmtINR(analytics.peakHour.revenue)})` : '—', format: 'text' },
        { label: 'Active Hours', value: analytics.activeHourCount, format: 'text' },
        { label: 'Avg Hourly Revenue', value: analytics.avgHourlyRevenue, format: 'inr' },
      ],
      sheets: [{
        name: 'Hourly Sales', subtitle: '24-hour breakdown',
        columns: [
          { key: 'label', label: 'Hour', format: 'text', align: 'left', width: 140 },
          { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 },
          { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right', width: 120 },
          { key: 'avgOrderValue', label: 'Avg Order', format: 'inr', align: 'right', width: 100 },
          { key: 'pctOfTotal', label: '% of Total', format: 'text', align: 'right', width: 80 },
        ],
        rows: analytics.hourly.filter(h => h.orders > 0),
        totals: { label: 'TOTAL', orders: analytics.totalOrders, revenue: analytics.totalRevenue },
      }],
    };
  };

  const handleDownloadAction = (action) => {
    let pdfWin = null; if (action === 'pdf') pdfWin = openReportWindow();
    setShowDownloadMenu(false);
    if (['email', 'whatsapp', 'sms'].includes(action)) return;
    try { const p = buildExportPayload(); if (!p) return; if (action === 'excel') exportReportAsExcel(p); else if (action === 'pdf') exportReportAsPDF(pdfWin, p); }
    catch (e) { console.error('export failed:', e); if (pdfWin && !pdfWin.closed) pdfWin.close(); }
  };

  // Heatmap intensity
  const getIntensity = (revenue, max) => {
    if (!max || revenue <= 0) return 'bg-zinc-50 text-zinc-400';
    const pct = revenue / max;
    if (pct > 0.75) return 'bg-blue-500 text-white font-semibold';
    if (pct > 0.5) return 'bg-blue-400 text-white';
    if (pct > 0.25) return 'bg-blue-200 text-blue-900';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s12-hourly-sales-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s12-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s12-back-btn" onClick={() => navigate('/reports-module/sales')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Hourly Sales Curve</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Revenue by hour of day · peak/off-peak analysis{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium" data-testid="s12-definitions-link">ⓘ Definitions</button></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s12-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s12-date-from" /></label>
                <span className="text-zinc-300">—</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s12-date-to" /></label>
              </div>
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s12-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s12-presets">
                {['Today', '7D', '30D', 'MTD'].map((p) => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} data-testid={`s12-preset-${p.toLowerCase()}`} onClick={() => handlePreset(p)}>{p}</button>))}
              </div>
              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || !analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading || !analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s12-download-trigger"><Download className="w-4 h-4" /> Download</button>
                {showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="s12-download-menu">{DOWNLOAD_MENU.map((item) => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}
              </div>
            </div>
          </header>

          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">
              {analytics && (
                <div className="space-y-6">
                  {/* KPI Strip */}
                  <div className="grid grid-cols-6 gap-4" data-testid="s12-kpi-strip">
                    {[
                      { label: 'Peak Hour', value: analytics.peakHour ? `${String(analytics.peakHour.hour).padStart(2,'0')}:00` : '—', sub: analytics.peakHour ? fmtINR(analytics.peakHour.revenue) : '', icon: Zap, color: 'text-amber-500' },
                      { label: 'Breakfast (06–10)', value: fmtINR(analytics.breakfastRev), sub: `${analytics.totalRevenue > 0 ? ((analytics.breakfastRev / analytics.totalRevenue) * 100).toFixed(1) : 0}%`, icon: Sunrise, color: 'text-orange-400' },
                      { label: 'Lunch (11–15)', value: fmtINR(analytics.lunchRev), sub: `${analytics.totalRevenue > 0 ? ((analytics.lunchRev / analytics.totalRevenue) * 100).toFixed(1) : 0}%`, icon: TrendingUp, color: 'text-[#F26B33]' },
                      { label: 'Dinner (18–23)', value: fmtINR(analytics.dinnerRev), sub: `${analytics.totalRevenue > 0 ? ((analytics.dinnerRev / analytics.totalRevenue) * 100).toFixed(1) : 0}%`, icon: Moon, color: 'text-violet-500' },
                      { label: 'Active Hours', value: analytics.activeHourCount, sub: 'out of 24', icon: Clock, color: 'text-blue-500' },
                      { label: 'Avg / Active Hour', value: fmtINR(analytics.avgHourlyRevenue), icon: TrendingUp, color: 'text-emerald-500' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-white border border-zinc-200 rounded-xl p-4" data-testid={`s12-kpi-${kpi.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                        <div className="flex items-center gap-1.5 mb-1.5"><kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} /><span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{kpi.label}</span></div>
                        <div className="text-xl font-bold text-zinc-950">{kpi.value}</div>
                        {kpi.sub && <div className="text-[10px] text-zinc-400 mt-0.5">{kpi.sub}</div>}
                      </div>
                    ))}
                  </div>

                  {/* Revenue by Hour — Area Chart */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s12-hourly-chart">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Revenue by Hour</h2>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={analytics.hourly} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <defs><linearGradient id="s12Grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} tickFormatter={(v) => `${v}:00`} />
                        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <ReTooltip content={<HourlyTooltip />} />
                        <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fill="url(#s12Grad)" dot={{ r: 4, fill: '#3B82F6', stroke: 'white', strokeWidth: 2 }} activeDot={{ r: 6 }} animationDuration={600} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Orders by Hour — Bar Chart */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s12-orders-chart">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Orders by Hour</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={analytics.hourly} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} tickFormatter={(v) => `${v}h`} />
                        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                        <ReTooltip content={<HourlyTooltip />} />
                        <Bar dataKey="orders" fill="#F26B33" radius={[3, 3, 0, 0]} animationDuration={600} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Heatmap-style Table */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s12-hourly-table">
                    <div className="px-6 py-4 border-b border-zinc-100">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Hourly Breakdown</h2>
                    </div>
                    <div className="grid grid-cols-6 gap-2 p-4">
                      {analytics.hourly.map((h) => {
                        const maxRev = analytics.peakHour?.revenue || 1;
                        return (
                          <div key={h.hour} className={`rounded-lg p-3 text-center transition-colors ${getIntensity(h.revenue, maxRev)}`} data-testid={`s12-heatcell-${h.hour}`}>
                            <div className="text-xs font-semibold">{String(h.hour).padStart(2,'0')}:00</div>
                            <div className="text-sm font-bold mt-1">{h.orders > 0 ? fmtINR(h.revenue) : '—'}</div>
                            <div className="text-[10px] mt-0.5">{h.orders} orders</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-xs text-zinc-400 text-center py-2">{analytics.activeHourCount} active hours · {appliedFrom} → {appliedTo}</div>
                </div>
              )}
            </div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

export default HourlySalesMockup;
