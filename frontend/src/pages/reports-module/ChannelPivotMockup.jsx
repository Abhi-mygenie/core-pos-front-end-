/**
 * ChannelPivotMockup — CR-011 S14 (Phase 3)
 *
 * Channel × Metrics Pivot: cross-tabulates channels (Dine-In, Takeaway, Delivery, Room)
 * against revenue, orders, avg order value, percentage contribution.
 * Data source: insights-sales.channels[] + insights-sales.payments[] (CR-049)
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
  Mail, MessageCircle, Send, Utensils, Truck, Coffee, Building2,
  TrendingUp, ShoppingBag, Percent,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// CR-011 S14
const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtINR2 = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CHANNEL_META = {
  'Dine-In': { icon: Utensils, color: '#F26B33', bg: 'bg-orange-50 border-orange-200' },
  'Delivery': { icon: Truck, color: '#329937', bg: 'bg-green-50 border-green-200' },
  'Takeaway': { icon: Coffee, color: '#3B82F6', bg: 'bg-blue-50 border-blue-200' },
  'Room': { icon: Building2, color: '#8B5CF6', bg: 'bg-violet-50 border-violet-200' },
};
const CHANNEL_COLORS = ['#F26B33', '#329937', '#3B82F6', '#8B5CF6', '#EC4899'];
const PAYMENT_COLORS = ['#3B82F6', '#F26B33', '#329937', '#8B5CF6', '#EAB308', '#EC4899', '#06B6D4'];

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's14-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's14-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's14-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's14-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's14-share-sms-btn' },
];

const PivotTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-zinc-700">
      <div className="font-semibold mb-1">{d.channel || d.method}</div>
      <div>{fmtINR(d.revenue)} · {d.orders} orders</div>
      <div className="text-zinc-400">{d.pct}% of total</div>
    </div>
  );
};

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>{(percent * 100).toFixed(0)}%</text>;
};

const ChannelPivotMockup = () => {
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

  // CR-011 S14: Channel + Payment pivot
  const analytics = useMemo(() => {
    if (!salesData) return null;
    const s = salesData.summary || {};
    const totalRev = s.total_revenue || 0;
    const totalOrd = s.total_orders || 0;

    const channels = (salesData.channels || []).map(c => ({
      channel: c.channel, revenue: c.revenue || 0, orders: c.orders || 0,
      avgOrderValue: c.orders > 0 ? (c.revenue || 0) / c.orders : 0,
      pct: totalRev > 0 ? ((c.revenue || 0) / totalRev * 100).toFixed(1) : '0',
      orderPct: totalOrd > 0 ? ((c.orders || 0) / totalOrd * 100).toFixed(1) : '0',
      meta: CHANNEL_META[c.channel] || { icon: ShoppingBag, color: '#71717a', bg: 'bg-zinc-50 border-zinc-200' },
    }));

    const payments = (salesData.payments || []).map(p => ({
      method: p.method, revenue: p.revenue || 0, orders: p.orders || 0,
      pct: totalRev > 0 ? ((p.revenue || 0) / totalRev * 100).toFixed(1) : '0',
    }));

    const topChannel = channels.reduce((b, c) => c.revenue > (b?.revenue || 0) ? c : b, null);

    return { channels, payments, totalRevenue: totalRev, totalOrders: totalOrd, avgOrderValue: s.avg_order_value || 0, topChannel };
  }, [salesData]);

  const buildExportPayload = () => {
    if (!analytics) return null;
    return {
      title: 'Channel & Payment Analysis', subtitle: 'Revenue by order channel and payment method',
      restaurant: { name: restaurant?.name || '', address: restaurant?.address || '', id: restaurant?.id || '' },
      dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [
        { label: 'Total Revenue', value: analytics.totalRevenue, format: 'inr' },
        { label: 'Total Orders', value: analytics.totalOrders, format: 'text' },
        { label: 'Top Channel', value: analytics.topChannel ? `${analytics.topChannel.channel} (${analytics.topChannel.pct}%)` : '—', format: 'text' },
      ],
      sheets: [
        {
          name: 'By Channel', subtitle: `${analytics.channels.length} channels`,
          columns: [
            { key: 'channel', label: 'Channel', format: 'text', align: 'left', width: 120 },
            { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 },
            { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right', width: 120 },
            { key: 'avgOrderValue', label: 'Avg Order', format: 'inr', align: 'right', width: 100 },
            { key: 'pct', label: '% Revenue', format: 'text', align: 'right', width: 80 },
            { key: 'orderPct', label: '% Orders', format: 'text', align: 'right', width: 80 },
          ],
          rows: analytics.channels,
          totals: { channel: 'TOTAL', orders: analytics.totalOrders, revenue: analytics.totalRevenue, avgOrderValue: analytics.avgOrderValue },
        },
        {
          name: 'By Payment Method', subtitle: `${analytics.payments.length} methods`,
          columns: [
            { key: 'method', label: 'Method', format: 'text', align: 'left', width: 150 },
            { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 },
            { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right', width: 120 },
            { key: 'pct', label: '% Revenue', format: 'text', align: 'right', width: 80 },
          ],
          rows: analytics.payments,
          totals: { method: 'TOTAL', orders: analytics.totalOrders, revenue: analytics.totalRevenue },
        },
      ],
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
    <div className="flex h-screen bg-white font-sans" data-testid="s14-channel-pivot-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s14-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s14-back-btn" onClick={() => navigate('/reports-module/sales')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Channel & Payment Analysis</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Revenue breakdown by order channel × payment method{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium" data-testid="s14-definitions-link">ⓘ Definitions</button></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s14-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s14-date-from" /></label>
                <span className="text-zinc-300">—</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s14-date-to" /></label>
              </div>
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s14-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s14-presets">
                {['Today', '7D', '30D', 'MTD'].map((p) => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} data-testid={`s14-preset-${p.toLowerCase()}`} onClick={() => handlePreset(p)}>{p}</button>))}
              </div>
              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || !analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading || !analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s14-download-trigger"><Download className="w-4 h-4" /> Download</button>
                {showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="s14-download-menu">{DOWNLOAD_MENU.map((item) => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}
              </div>
            </div>
          </header>

          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">
              {analytics && (
                <div className="space-y-6">
                  {/* Channel Performance Cards */}
                  <div className={`grid grid-cols-${analytics.channels.length} gap-4`} data-testid="s14-channel-cards">
                    {analytics.channels.map((ch) => {
                      const Icon = ch.meta.icon;
                      return (
                        <div key={ch.channel} className={`border rounded-xl p-5 ${ch.meta.bg}`} data-testid={`s14-card-${ch.channel.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                          <div className="flex items-center gap-2 mb-3"><Icon className="w-5 h-5" style={{ color: ch.meta.color }} /><span className="text-sm font-semibold text-zinc-800">{ch.channel}</span></div>
                          <div className="text-2xl font-bold text-zinc-950 mb-1">{fmtINR(ch.revenue)}</div>
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span>{ch.orders} orders</span>
                            <span className="font-medium" style={{ color: ch.meta.color }}>{ch.pct}%</span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1">Avg: {fmtINR(ch.avgOrderValue)}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Channel Revenue Donut */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s14-channel-donut">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-2">Revenue by Channel</h2>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={analytics.channels.map(c => ({ name: c.channel, value: c.revenue, orders: c.orders, pct: c.pct }))} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" labelLine={false} label={renderPieLabel} animationDuration={600}>
                            {analytics.channels.map((c, i) => (<Cell key={c.channel} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} stroke="white" strokeWidth={2} />))}
                          </Pie>
                          <ReTooltip content={<PivotTooltip />} />
                          <Legend formatter={(v) => <span className="text-xs text-zinc-600">{v}</span>} iconType="circle" iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Payment Method Donut */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s14-payment-donut">
                      <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-2">Revenue by Payment Method</h2>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={analytics.payments.map(p => ({ name: p.method, value: p.revenue, orders: p.orders, pct: p.pct }))} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" labelLine={false} label={renderPieLabel} animationDuration={600}>
                            {analytics.payments.map((p, i) => (<Cell key={p.method} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} stroke="white" strokeWidth={2} />))}
                          </Pie>
                          <ReTooltip content={<PivotTooltip />} />
                          <Legend formatter={(v) => <span className="text-xs text-zinc-600">{v}</span>} iconType="circle" iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Channel + Orders stacked bar */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s14-comparison-chart">
                    <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Channel Comparison: Revenue & Orders</h2>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={analytics.channels} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <YAxis type="category" dataKey="channel" tick={{ fontSize: 12, fill: '#52525b', fontWeight: 500 }} tickLine={false} axisLine={false} width={80} />
                        <ReTooltip content={<PivotTooltip />} />
                        <Bar dataKey="revenue" radius={[0, 6, 6, 0]} animationDuration={600}>
                          {analytics.channels.map((c, i) => (<Cell key={c.channel} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pivot Tables */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s14-channel-table">
                    <div className="px-6 py-4 border-b border-zinc-100"><h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Channel Breakdown</h2></div>
                    <table className="w-full">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Channel</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Orders</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Revenue</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Avg Order</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">% Revenue</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">% Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.channels.map((c, i) => (
                          <tr key={c.channel} className="border-t border-zinc-50 hover:bg-zinc-50/50" data-testid={`s14-ch-row-${c.channel.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                            <td className="px-6 py-3 text-sm font-medium text-zinc-800 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CHANNEL_COLORS[i] }} />{c.channel}</td>
                            <td className="px-4 py-3 text-sm text-right text-zinc-700">{c.orders}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR2(c.revenue)}</td>
                            <td className="px-4 py-3 text-sm text-right text-zinc-600">{fmtINR(c.avgOrderValue)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-blue-700">{c.pct}%</td>
                            <td className="px-6 py-3 text-sm text-right text-zinc-500">{c.orderPct}%</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                        <tr>
                          <td className="px-6 py-3 text-sm font-bold text-zinc-900">TOTAL</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">{analytics.totalOrders}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">{fmtINR2(analytics.totalRevenue)}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold">{fmtINR(analytics.avgOrderValue)}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">100%</td>
                          <td className="px-6 py-3 text-sm text-right font-bold">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="text-xs text-zinc-400 text-center py-2">{analytics.totalOrders} orders · {analytics.channels.length} channels · {analytics.payments.length} payment methods · {appliedFrom} → {appliedTo}</div>
                </div>
              )}
            </div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

export default ChannelPivotMockup;
