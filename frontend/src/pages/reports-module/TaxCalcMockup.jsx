/**
 * TaxCalcMockup — CR-011 S25 (Phase 3, Batch C)
 * Inclusive vs Exclusive Mix: tax calculation method breakdown.
 * Data source: insights-tax.by_calc[]
 * Gate ①+④: Mockup with live API data.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { fetchInsightsTax } from '../../api/services/insightsService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown, Mail, MessageCircle, Send, Calculator } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';

const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const CALC_COLORS = { exclusive: '#3B82F6', inclusive: '#F26B33' };
const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's25-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's25-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's25-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's25-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's25-share-sms-btn' },
];

const TaxCalcMockup = () => {
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
  const [rawData, setRawData] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  useEffect(() => { const h = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply = draftDirty && draftValid && !isLoading;
  const handleApply = () => { if (canApply) { setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset(''); } };
  const handlePreset = (p) => { const t = new Date(); let f; if (p === '7D') f = new Date(t.getTime()-6*86400000); else if (p === '30D') f = new Date(t.getTime()-29*86400000); else if (p === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); } else return; const fd = fmtISO(f); const td = fmtISO(t); setFromDate(fd); setToDate(td); setAppliedFrom(fd); setAppliedTo(td); setActivePreset(p); setSharedFrom(fd); setSharedTo(td); };

  const fetchData = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return;
    setIsLoading(true); setError(null);
    try { setRawData(await fetchInsightsTax(appliedFrom, appliedTo)); setHasLoadedOnce(true); }
    catch (e) { setError(e.message || 'Failed to load'); } finally { setIsLoading(false); }
  }, [appliedFrom, appliedTo]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const analytics = useMemo(() => {
    if (!rawData) return null;
    const byCalc = rawData.by_calc || [];
    const totalOrders = byCalc.reduce((s, c) => s + (c.orders || 0), 0);
    const totalRev = byCalc.reduce((s, c) => s + (c.revenue || 0), 0);
    return { byCalc, totalOrders, totalRev };
  }, [rawData]);

  const buildExportPayload = () => {
    if (!analytics) return null;
    return { title: 'Inclusive vs Exclusive Mix', subtitle: 'Tax calculation method breakdown', restaurant: { name: restaurant?.name || '' }, dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [{ label: 'Total Orders', value: analytics.totalOrders, format: 'text' }, { label: 'Total Revenue', value: analytics.totalRev, format: 'inr' }],
      sheets: [{ name: 'By Calc Method', columns: [{ key: 'method', label: 'Method', format: 'text', align: 'left', width: 120 }, { key: 'orders', label: 'Orders', format: 'integer', align: 'right', width: 80 }, { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right', width: 120 }], rows: analytics.byCalc, totals: { method: 'TOTAL', orders: analytics.totalOrders, revenue: analytics.totalRev } }] };
  };
  const handleDownloadAction = (action) => { let pw = null; if (action === 'pdf') pw = openReportWindow(); setShowDownloadMenu(false); if (['email','whatsapp','sms'].includes(action)) return; try { const p = buildExportPayload(); if (!p) return; if (action === 'excel') exportReportAsExcel(p); else if (action === 'pdf') exportReportAsPDF(pw, p); } catch(e) { console.error(e); if (pw && !pw.closed) pw.close(); } };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s25-tax-calc-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s25-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s25-back-btn" onClick={() => navigate('/reports-module/tax-detail')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Inclusive vs Exclusive</h1><p className="text-[11px] text-zinc-500 mt-0.5">Tax calculation method split{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium">ⓘ Definitions</button></p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s25-daterange"><CalendarIcon className="w-4 h-4 text-zinc-500" /><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s25-date-from" /></label><span className="text-zinc-300">—</span><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s25-date-to" /></label></div>
              <button onClick={handleApply} disabled={isLoading||!canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s25-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s25-presets">{['7D','30D','MTD'].map(p => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} onClick={() => handlePreset(p)}>{p}</button>))}</div>
              <div className="relative" ref={downloadRef}><button onClick={() => setShowDownloadMenu(v=>!v)} disabled={isLoading||!analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading||!analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s25-download-trigger"><Download className="w-4 h-4" /> Download</button>{showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">{DOWNLOAD_MENU.map(item => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}</div>
            </div>
          </header>
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">{analytics && (<div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Method cards */}
                {analytics.byCalc.map((c, i) => (
                  <div key={c.method} className="bg-white border border-zinc-200 rounded-xl p-6" data-testid={`s25-card-${c.method}`}>
                    <div className="flex items-center gap-3 mb-4"><Calculator className="w-5 h-5" style={{ color: CALC_COLORS[c.method] || '#71717a' }} /><span className="text-lg font-semibold text-zinc-800 capitalize">{c.method}</span></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><div className="text-xs text-zinc-500 uppercase mb-1">Orders</div><div className="text-2xl font-bold text-zinc-950">{c.orders}</div><div className="text-xs text-zinc-400">{analytics.totalOrders > 0 ? ((c.orders / analytics.totalOrders) * 100).toFixed(1) : 0}%</div></div>
                      <div><div className="text-xs text-zinc-500 uppercase mb-1">Revenue</div><div className="text-2xl font-bold text-zinc-950">{fmtINR(c.revenue)}</div><div className="text-xs text-zinc-400">{analytics.totalRev > 0 ? ((c.revenue / analytics.totalRev) * 100).toFixed(1) : 0}%</div></div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Donut */}
              <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s25-donut">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Method Distribution (by orders)</h2>
                <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={analytics.byCalc.map(c => ({ name: c.method, value: c.orders }))} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" animationDuration={600}>{analytics.byCalc.map(c => <Cell key={c.method} fill={CALC_COLORS[c.method] || '#71717a'} stroke="white" strokeWidth={2} />)}</Pie><ReTooltip /><Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-zinc-600 capitalize">{v}</span>} /></PieChart></ResponsiveContainer>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s25-table">
                <table className="w-full"><thead className="bg-zinc-50"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Method</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Orders</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Revenue</th><th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">% Orders</th></tr></thead>
                <tbody>{analytics.byCalc.map((c, i) => (<tr key={i} className="border-t border-zinc-50"><td className="px-6 py-3 text-sm font-medium text-zinc-800 capitalize">{c.method}</td><td className="px-4 py-3 text-sm text-right text-zinc-700">{c.orders}</td><td className="px-4 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR(c.revenue)}</td><td className="px-6 py-3 text-sm text-right text-zinc-500">{analytics.totalOrders > 0 ? ((c.orders / analytics.totalOrders) * 100).toFixed(1) : 0}%</td></tr>))}</tbody>
                <tfoot className="bg-zinc-50 border-t-2 border-zinc-200"><tr><td className="px-6 py-3 text-sm font-bold">TOTAL</td><td className="px-4 py-3 text-sm text-right font-bold">{analytics.totalOrders}</td><td className="px-4 py-3 text-sm text-right font-bold">{fmtINR(analytics.totalRev)}</td><td className="px-6 py-3 text-sm text-right font-bold">100%</td></tr></tfoot></table>
              </div>
            </div>)}</div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};
export default TaxCalcMockup;
