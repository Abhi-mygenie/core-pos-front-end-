/**
 * CustomersMixMockup — CR-011 S37 (Phase 3, Batch G)
 * Guest vs Registered Mix: daily split + summary donut.
 * Data source: insights-customers.summary + daily[] (NEW endpoint)
 * Gate ①+④: Mockup with live API data.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { fetchInsightsCustomers } from '../../api/services/insightsService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown, Mail, MessageCircle, Send, UserCheck, UserX, Users } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// CR-011 S37
const fmtISO = (d) => d.toISOString().slice(0, 10);

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's37-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's37-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's37-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's37-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's37-share-sms-btn' },
];

const CustomersMixMockup = () => {
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
    try { setRawData(await fetchInsightsCustomers(appliedFrom, appliedTo)); setHasLoadedOnce(true); }
    catch (e) { setError(e.message || 'Failed to load'); } finally { setIsLoading(false); }
  }, [appliedFrom, appliedTo]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const analytics = useMemo(() => {
    if (!rawData) return null;
    const s = rawData.summary || {};
    const daily = rawData.daily || [];
    const total = (s.registered_orders || 0) + (s.guest_orders || 0);
    const regPct = total > 0 ? Math.round((s.registered_orders || 0) / total * 100) : 0;
    const guestPct = total > 0 ? 100 - regPct : 0;
    return { summary: s, daily, total, regPct, guestPct };
  }, [rawData]);

  const buildExportPayload = () => {
    if (!analytics) return null;
    return { title: 'Guest vs Registered Mix', subtitle: 'Daily customer type breakdown', restaurant: { name: restaurant?.name || '' }, dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [{ label: 'Registered %', value: `${analytics.regPct}%`, format: 'text' }, { label: 'Guest %', value: `${analytics.guestPct}%`, format: 'text' }, { label: 'Total Orders', value: analytics.total, format: 'text' }],
      sheets: [{ name: 'Daily Mix', columns: [{ key: 'date', label: 'Date', format: 'text', align: 'left', width: 100 }, { key: 'registered_orders', label: 'Registered', format: 'integer', align: 'right', width: 100 }, { key: 'guest_orders', label: 'Guest', format: 'integer', align: 'right', width: 100 }], rows: analytics.daily, totals: { date: 'TOTAL', registered_orders: analytics.summary.registered_orders, guest_orders: analytics.summary.guest_orders } }] };
  };
  const handleDownloadAction = (action) => { let pw = null; if (action === 'pdf') pw = openReportWindow(); setShowDownloadMenu(false); if (['email','whatsapp','sms'].includes(action)) return; try { const p = buildExportPayload(); if (!p) return; if (action === 'excel') exportReportAsExcel(p); else if (action === 'pdf') exportReportAsPDF(pw, p); } catch(e) { console.error(e); if (pw && !pw.closed) pw.close(); } };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s37-customers-mix-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s37-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s37-back-btn" onClick={() => navigate('/reports-module/customers-rfm')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Guest vs Registered</h1><p className="text-[11px] text-zinc-500 mt-0.5">Daily customer type breakdown{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium">ⓘ Definitions</button></p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s37-daterange"><CalendarIcon className="w-4 h-4 text-zinc-500" /><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s37-date-from" /></label><span className="text-zinc-300">—</span><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s37-date-to" /></label></div>
              <button onClick={handleApply} disabled={isLoading||!canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s37-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s37-presets">{['7D','30D','MTD'].map(p => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} onClick={() => handlePreset(p)}>{p}</button>))}</div>
              <div className="relative" ref={downloadRef}><button onClick={() => setShowDownloadMenu(v=>!v)} disabled={isLoading||!analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading||!analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s37-download-trigger"><Download className="w-4 h-4" /> Download</button>{showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">{DOWNLOAD_MENU.map(item => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}</div>
            </div>
          </header>
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">{analytics && (<div className="space-y-6">
              <div className="grid grid-cols-3 gap-4" data-testid="s37-kpi-strip">
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><UserCheck className="w-4 h-4 text-[#329937]" /><span className="text-xs font-medium text-zinc-500 uppercase">Registered</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.summary.registered_orders || 0}</div><div className="text-xs text-zinc-400">{analytics.regPct}% of orders</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><UserX className="w-4 h-4 text-[#F26B33]" /><span className="text-xs font-medium text-zinc-500 uppercase">Guest</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.summary.guest_orders || 0}</div><div className="text-xs text-zinc-400">{analytics.guestPct}% of orders</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-blue-500" /><span className="text-xs font-medium text-zinc-500 uppercase">Total Orders</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.total}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {/* Donut */}
                <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s37-donut">
                  <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Customer Mix</h2>
                  <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={[{ name: 'Registered', value: analytics.summary.registered_orders || 0 }, { name: 'Guest', value: analytics.summary.guest_orders || 0 }]} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value" animationDuration={600}><Cell fill="#329937" stroke="white" strokeWidth={2} /><Cell fill="#F26B33" stroke="white" strokeWidth={2} /></Pie><ReTooltip /><Legend iconType="circle" iconSize={8} /></PieChart></ResponsiveContainer>
                </div>
                {/* Stacked Bar */}
                <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s37-daily-chart">
                  <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Daily Trend</h2>
                  <ResponsiveContainer width="100%" height={220}><BarChart data={analytics.daily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} tickFormatter={v => v.slice(5)} /><YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} /><ReTooltip /><Legend iconType="circle" iconSize={8} /><Bar dataKey="registered_orders" name="Registered" fill="#329937" stackId="a" /><Bar dataKey="guest_orders" name="Guest" fill="#F26B33" stackId="a" radius={[4,4,0,0]} />
                  </BarChart></ResponsiveContainer>
                </div>
              </div>
              {/* Daily Table */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s37-table">
                <div className="px-6 py-4 border-b border-zinc-100"><h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Daily Breakdown</h2></div>
                <table className="w-full"><thead className="bg-zinc-50"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Registered</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Guest</th><th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Total</th></tr></thead>
                <tbody>{analytics.daily.map((d, i) => (<tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50"><td className="px-6 py-3 text-sm font-medium text-zinc-800">{d.date}</td><td className="px-4 py-3 text-sm text-right text-[#329937]">{d.registered_orders}</td><td className="px-4 py-3 text-sm text-right text-[#F26B33]">{d.guest_orders}</td><td className="px-6 py-3 text-sm text-right font-semibold text-zinc-900">{(d.registered_orders||0) + (d.guest_orders||0)}</td></tr>))}</tbody>
                <tfoot className="bg-zinc-50 border-t-2 border-zinc-200"><tr><td className="px-6 py-3 text-sm font-bold">TOTAL</td><td className="px-4 py-3 text-sm text-right font-bold text-[#329937]">{analytics.summary.registered_orders || 0}</td><td className="px-4 py-3 text-sm text-right font-bold text-[#F26B33]">{analytics.summary.guest_orders || 0}</td><td className="px-6 py-3 text-sm text-right font-bold">{analytics.total}</td></tr></tfoot></table>
              </div>
            </div>)}</div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};
export default CustomersMixMockup;
