/**
 * CustomersRfmMockup — CR-011 S36 (Phase 3, Batch G)
 * Repeat Customer (RFM): summary, top customers, RFM bands.
 * Data source: insights-customers (NEW endpoint)
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
import { ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown, Mail, MessageCircle, Send, Users, Repeat, UserCheck, Crown } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';

// CR-011 S36
const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const RFM_COLORS = { Champions: '#329937', Loyal: '#3B82F6', 'At Risk': '#F26B33', Dormant: '#71717a' };
const PIE_COLORS = ['#329937', '#3B82F6', '#F26B33', '#71717a', '#8B5CF6', '#EC4899'];

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's36-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's36-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's36-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's36-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's36-share-sms-btn' },
];

const CustomersRfmMockup = () => {
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
    const topCustomers = rawData.top_customers || [];
    const rfmBands = rawData.rfm_bands || [];
    return { summary: s, topCustomers, rfmBands };
  }, [rawData]);

  const buildExportPayload = () => {
    if (!analytics) return null;
    return { title: 'Customer Intelligence (RFM)', subtitle: 'Repeat customers & RFM segmentation', restaurant: { name: restaurant?.name || '' }, dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [{ label: 'Unique Customers', value: analytics.summary.unique_customers, format: 'text' }, { label: 'Repeat %', value: `${analytics.summary.repeat_pct}%`, format: 'text' }],
      sheets: [
        { name: 'Top Customers', columns: [{ key: 'name', label: 'Name', format: 'text', align: 'left', width: 150 }, { key: 'phone', label: 'Phone', format: 'text', align: 'left', width: 120 }, { key: 'visits', label: 'Visits', format: 'integer', align: 'right', width: 70 }, { key: 'total_spend', label: 'Total Spend', format: 'inr', align: 'right', width: 120 }, { key: 'last_visit', label: 'Last Visit', format: 'text', align: 'left', width: 100 }, { key: 'avg_order', label: 'Avg Order', format: 'inr', align: 'right', width: 100 }], rows: analytics.topCustomers },
        { name: 'RFM Bands', columns: [{ key: 'band', label: 'Band', format: 'text', align: 'left', width: 120 }, { key: 'count', label: 'Customers', format: 'integer', align: 'right', width: 100 }, { key: 'revenue', label: 'Revenue', format: 'inr', align: 'right', width: 120 }], rows: analytics.rfmBands },
      ] };
  };
  const handleDownloadAction = (action) => { let pw = null; if (action === 'pdf') pw = openReportWindow(); setShowDownloadMenu(false); if (['email','whatsapp','sms'].includes(action)) return; try { const p = buildExportPayload(); if (!p) return; if (action === 'excel') exportReportAsExcel(p); else if (action === 'pdf') exportReportAsPDF(pw, p); } catch(e) { console.error(e); if (pw && !pw.closed) pw.close(); } };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s36-customers-rfm-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s36-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s36-back-btn" onClick={() => navigate('/reports-module/dashboard')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Customer Intelligence</h1><p className="text-[11px] text-zinc-500 mt-0.5">Top customers, repeat rate & RFM segmentation{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium">ⓘ Definitions</button></p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s36-daterange"><CalendarIcon className="w-4 h-4 text-zinc-500" /><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s36-date-from" /></label><span className="text-zinc-300">—</span><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s36-date-to" /></label></div>
              <button onClick={handleApply} disabled={isLoading||!canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s36-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s36-presets">{['7D','30D','MTD'].map(p => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} onClick={() => handlePreset(p)}>{p}</button>))}</div>
              <div className="relative" ref={downloadRef}><button onClick={() => setShowDownloadMenu(v=>!v)} disabled={isLoading||!analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading||!analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s36-download-trigger"><Download className="w-4 h-4" /> Download</button>{showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">{DOWNLOAD_MENU.map(item => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}</div>
            </div>
          </header>
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">{analytics && (<div className="space-y-6">
              <div className="grid grid-cols-4 gap-4" data-testid="s36-kpi-strip">
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-blue-500" /><span className="text-xs font-medium text-zinc-500 uppercase">Unique Customers</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.summary.unique_customers || 0}</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><Repeat className="w-4 h-4 text-[#329937]" /><span className="text-xs font-medium text-zinc-500 uppercase">Repeat Customers</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.summary.repeat_customers || 0}</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><UserCheck className="w-4 h-4 text-[#F26B33]" /><span className="text-xs font-medium text-zinc-500 uppercase">Repeat Rate</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.summary.repeat_pct || 0}%</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><Crown className="w-4 h-4 text-amber-500" /><span className="text-xs font-medium text-zinc-500 uppercase">Champions</span></div><div className="text-2xl font-bold text-zinc-950">{(analytics.rfmBands.find(b => b.band === 'Champions') || {}).count || 0}</div></div>
              </div>
              {/* RFM Bands */}
              {analytics.rfmBands.length > 0 && (<div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s36-rfm-donut">
                  <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">RFM Segmentation</h2>
                  <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={analytics.rfmBands.map(b => ({ name: b.band, value: b.count }))} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" animationDuration={600}>{analytics.rfmBands.map((b, i) => <Cell key={b.band} fill={RFM_COLORS[b.band] || PIE_COLORS[i]} stroke="white" strokeWidth={2} />)}</Pie><ReTooltip /><Legend iconType="circle" iconSize={8} /></PieChart></ResponsiveContainer>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s36-rfm-table">
                  <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Band Breakdown</h2>
                  <table className="w-full"><thead><tr><th className="pb-2 text-left text-xs font-semibold text-zinc-500 uppercase">Band</th><th className="pb-2 text-right text-xs font-semibold text-zinc-500 uppercase">Customers</th><th className="pb-2 text-right text-xs font-semibold text-zinc-500 uppercase">Revenue</th></tr></thead>
                  <tbody>{analytics.rfmBands.map((b, i) => (<tr key={b.band} className="border-t border-zinc-100"><td className="py-3 text-sm font-medium text-zinc-800 flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: RFM_COLORS[b.band] || PIE_COLORS[i] }} />{b.band}</td><td className="py-3 text-sm text-right text-zinc-700">{b.count}</td><td className="py-3 text-sm text-right font-medium text-zinc-900">{fmtINR(b.revenue)}</td></tr>))}</tbody></table>
                </div>
              </div>)}
              {/* Top Customers Table */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s36-top-customers">
                <div className="px-6 py-4 border-b border-zinc-100"><h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Top Customers ({analytics.topCustomers.length})</h2></div>
                <table className="w-full"><thead className="bg-zinc-50"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Name</th><th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Phone</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Visits</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Total Spend</th><th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Last Visit</th><th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Avg Order</th></tr></thead>
                <tbody>{analytics.topCustomers.map((c, i) => (<tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50" data-testid={`s36-row-${i}`}><td className="px-6 py-3 text-sm font-medium text-zinc-800">{c.name || '—'}</td><td className="px-4 py-3 text-sm text-zinc-600">{c.phone || '—'}</td><td className="px-4 py-3 text-sm text-right text-zinc-700">{c.visits}</td><td className="px-4 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR(c.total_spend)}</td><td className="px-4 py-3 text-sm text-zinc-500">{c.last_visit}</td><td className="px-6 py-3 text-sm text-right text-zinc-600">{fmtINR(c.avg_order)}</td></tr>))}</tbody></table>
                {analytics.topCustomers.length === 0 && <div className="p-12 text-center text-zinc-400 text-sm">No customer data available</div>}
              </div>
            </div>)}</div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};
export default CustomersRfmMockup;
