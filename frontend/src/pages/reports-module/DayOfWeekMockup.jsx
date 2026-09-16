/**
 * DayOfWeekMockup — CR-011 S13 (Phase 3)
 *
 * Day-of-Week Trend: aggregates daily data by weekday (Mon–Sun),
 * shows average revenue per weekday, best/worst weekday, order patterns.
 * Data source: insights-sales.daily[] grouped by weekday (CR-049)
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
  Mail, MessageCircle, Send, TrendingUp, Calendar, BarChart3, Star,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts';

// CR-011 S13
const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtINR2 = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F26B33', '#EAB308', '#329937', '#06B6D4'];

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's13-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's13-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's13-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's13-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's13-share-sms-btn' },
];

const WeekdayTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-zinc-700">
      <div className="font-semibold mb-1">{d.fullName}</div>
      <div>{fmtINR(d.totalRevenue)} total · {d.occurrences} days</div>
      <div className="text-zinc-400">Avg: {fmtINR(d.avgRevenue)} · {d.avgOrders.toFixed(0)} orders/day</div>
    </div>
  );
};

const DayOfWeekMockup = () => {
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
  const [activePreset, setActivePreset] = useState('30D');

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

  // CR-011 S13: Aggregate daily by weekday
  const analytics = useMemo(() => {
    if (!salesData) return null;
    const s = salesData.summary || {};
    const buckets = Array.from({ length: 7 }, () => ({ revenue: 0, orders: 0, tax: 0, discount: 0, count: 0 }));

    (salesData.daily || []).forEach(d => {
      const dt = new Date(d.date + 'T12:00:00');
      const jsDay = dt.getDay(); // 0=Sun
      const idx = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon..6=Sun
      buckets[idx].revenue += d.revenue || 0;
      buckets[idx].orders += d.orders || 0;
      buckets[idx].tax += d.tax || 0;
      buckets[idx].discount += d.discount || 0;
      buckets[idx].count += 1;
    });

    const weekdays = buckets.map((b, i) => ({
      day: WEEKDAY_SHORT[i], fullName: WEEKDAY_NAMES[i],
      totalRevenue: b.revenue, totalOrders: b.orders, totalTax: b.tax, totalDiscount: b.discount,
      occurrences: b.count,
      avgRevenue: b.count > 0 ? b.revenue / b.count : 0,
      avgOrders: b.count > 0 ? b.orders / b.count : 0,
      avgOrderValue: b.orders > 0 ? b.revenue / b.orders : 0,
      color: WEEKDAY_COLORS[i],
    }));

    const bestDay = weekdays.reduce((b, d) => d.avgRevenue > (b?.avgRevenue || 0) ? d : b, null);
    const worstDay = weekdays.filter(d => d.avgRevenue > 0).reduce((w, d) => d.avgRevenue < (w?.avgRevenue || Infinity) ? d : w, null);

    // Radar data (normalized 0-100)
    const maxAvg = Math.max(...weekdays.map(d => d.avgRevenue), 1);
    const radarData = weekdays.map(d => ({ day: d.day, value: (d.avgRevenue / maxAvg) * 100, avgRevenue: d.avgRevenue }));

    return { weekdays, bestDay, worstDay, radarData, totalRevenue: s.total_revenue || 0, totalOrders: s.total_orders || 0 };
  }, [salesData]);

  const buildExportPayload = () => {
    if (!analytics) return null;
    return {
      title: 'Day-of-Week Trend', subtitle: 'Revenue patterns by weekday',
      restaurant: { name: restaurant?.name || '', address: restaurant?.address || '', id: restaurant?.id || '' },
      dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [
        { label: 'Total Revenue', value: analytics.totalRevenue, format: 'inr' },
        { label: 'Best Weekday', value: analytics.bestDay ? `${analytics.bestDay.fullName} (avg ${fmtINR(analytics.bestDay.avgRevenue)})` : '—', format: 'text' },
        { label: 'Weakest Weekday', value: analytics.worstDay ? `${analytics.worstDay.fullName} (avg ${fmtINR(analytics.worstDay.avgRevenue)})` : '—', format: 'text' },
      ],
      sheets: [{
        name: 'By Weekday', subtitle: 'Aggregated by day of week',
        columns: [
          { key: 'fullName', label: 'Day', format: 'text', align: 'left', width: 120 },
          { key: 'occurrences', label: 'Days', format: 'integer', align: 'right', width: 60 },
          { key: 'totalOrders', label: 'Total Orders', format: 'integer', align: 'right', width: 90 },
          { key: 'totalRevenue', label: 'Total Revenue', format: 'inr', align: 'right', width: 120 },
          { key: 'avgRevenue', label: 'Avg Revenue', format: 'inr', align: 'right', width: 120 },
          { key: 'avgOrders', label: 'Avg Orders', format: 'decimal', align: 'right', width: 90 },
          { key: 'avgOrderValue', label: 'Avg Order Value', format: 'inr', align: 'right', width: 110 },
        ],
        rows: analytics.weekdays,
        totals: { fullName: 'TOTAL', occurrences: analytics.weekdays.reduce((s, d) => s + d.occurrences, 0), totalOrders: analytics.totalOrders, totalRevenue: analytics.totalRevenue },
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

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s13-day-of-week-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s13-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s13-back-btn" onClick={() => navigate('/reports-module/sales')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Day-of-Week Trend</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Average revenue by weekday · best 30D for meaningful patterns{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium" data-testid="s13-definitions-link">ⓘ Definitions</button></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s13-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s13-date-from" /></label>
                <span className="text-zinc-300">—</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s13-date-to" /></label>
              </div>
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s13-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s13-presets">
                {['7D', '30D', 'MTD'].map((p) => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} data-testid={`s13-preset-${p.toLowerCase()}`} onClick={() => handlePreset(p)}>{p}</button>))}
              </div>
              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || !analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading || !analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s13-download-trigger"><Download className="w-4 h-4" /> Download</button>
                {showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="s13-download-menu">{DOWNLOAD_MENU.map((item) => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}
              </div>
            </div>
          </header>

          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">
              {analytics && (
                <div className="space-y-6">
                  {/* KPI Strip */}
                  <div className="grid grid-cols-4 gap-4" data-testid="s13-kpi-strip">
                    {[
                      { label: 'Best Weekday', value: analytics.bestDay?.day || '—', sub: `Avg ${fmtINR(analytics.bestDay?.avgRevenue || 0)}`, icon: Star, color: 'text-amber-500' },
                      { label: 'Weakest Weekday', value: analytics.worstDay?.day || '—', sub: `Avg ${fmtINR(analytics.worstDay?.avgRevenue || 0)}`, icon: TrendingUp, color: 'text-red-500' },
                      { label: 'Total Revenue', value: fmtINR(analytics.totalRevenue), icon: BarChart3, color: 'text-[#329937]' },
                      { label: 'Spread', value: analytics.bestDay && analytics.worstDay ? fmtINR(analytics.bestDay.avgRevenue - analytics.worstDay.avgRevenue) : '—', sub: 'best − weakest avg', icon: Calendar, color: 'text-violet-500' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-white border border-zinc-200 rounded-xl p-5" data-testid={`s13-kpi-${kpi.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        <div className="flex items-center gap-2 mb-2"><kpi.icon className={`w-4 h-4 ${kpi.color}`} /><span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{kpi.label}</span></div>
                        <div className="text-2xl font-bold text-zinc-950">{kpi.value}</div>
                        {kpi.sub && <div className="text-xs text-zinc-400 mt-1">{kpi.sub}</div>}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Avg Revenue Bar Chart */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s13-avg-revenue-chart">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Average Revenue by Weekday</h2>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={analytics.weekdays} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#52525b' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                          <ReTooltip content={<WeekdayTooltip />} />
                          <Bar dataKey="avgRevenue" radius={[6, 6, 0, 0]} animationDuration={600}>
                            {analytics.weekdays.map((d, i) => (
                              <Cell key={d.day} fill={d === analytics.bestDay ? '#329937' : d === analytics.worstDay ? '#EF4444' : WEEKDAY_COLORS[i]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Radar Chart */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s13-radar-chart">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Weekly Pattern (Radar)</h2>
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={analytics.radarData} cx="50%" cy="50%" outerRadius="75%">
                          <PolarGrid stroke="#e4e4e7" />
                          <PolarAngleAxis dataKey="day" tick={{ fontSize: 11, fill: '#52525b', fontWeight: 600 }} />
                          <PolarRadiusAxis tick={false} axisLine={false} />
                          <Radar name="Revenue" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} animationDuration={600} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s13-weekday-table">
                    <div className="px-6 py-4 border-b border-zinc-100"><h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Weekday Breakdown</h2></div>
                    <table className="w-full">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Day</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Days</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Total Orders</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Total Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Avg Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Avg Orders</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Avg Order Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.weekdays.map((d) => (
                          <tr key={d.day} className={`border-t border-zinc-50 hover:bg-zinc-50/50 ${d === analytics.bestDay ? 'bg-emerald-50/40' : d === analytics.worstDay ? 'bg-red-50/30' : ''}`} data-testid={`s13-row-${d.day.toLowerCase()}`}>
                            <td className="px-6 py-3 text-sm font-medium text-zinc-800 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />{d.fullName}</td>
                            <td className="px-4 py-3 text-sm text-right text-zinc-600">{d.occurrences}</td>
                            <td className="px-4 py-3 text-sm text-right text-zinc-700">{d.totalOrders}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR2(d.totalRevenue)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-blue-700">{fmtINR(d.avgRevenue)}</td>
                            <td className="px-4 py-3 text-sm text-right text-zinc-600">{d.avgOrders.toFixed(1)}</td>
                            <td className="px-6 py-3 text-sm text-right text-zinc-600">{fmtINR(d.avgOrderValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                        <tr>
                          <td className="px-6 py-3 text-sm font-bold text-zinc-900">TOTAL</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">{analytics.weekdays.reduce((s, d) => s + d.occurrences, 0)}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">{analytics.totalOrders}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">{fmtINR2(analytics.totalRevenue)}</td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3" />
                          <td className="px-6 py-3" />
                        </tr>
                      </tfoot>
                    </table>
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

export default DayOfWeekMockup;
