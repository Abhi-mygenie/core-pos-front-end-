/**
 * StaffCashiersMockup — CR-011 S33 (Phase 3, Batch F)
 * Cashier Activity: orders processed, cash/card/upi collected per cashier.
 * Data source: insights-staff.by_cashier[] (NEW endpoint)
 * Gate ①+④: Mockup with live API data.
 * Note: 🟡 BE-1 caveat — partial payment leg accuracy depends on backend fix.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { fetchInsightsStaff } from '../../api/services/insightsService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown, Mail, MessageCircle, Send, User, Banknote, CreditCard, Smartphone } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts';

// CR-011 S33
const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's33-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's33-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's33-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's33-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's33-share-sms-btn' },
];

const StaffCashiersMockup = () => {
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
    try { setRawData(await fetchInsightsStaff(appliedFrom, appliedTo)); setHasLoadedOnce(true); }
    catch (e) { setError(e.message || 'Failed to load'); } finally { setIsLoading(false); }
  }, [appliedFrom, appliedTo]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const analytics = useMemo(() => {
    if (!rawData) return null;
    const cashiers = (rawData.by_cashier || []).sort((a, b) => b.orders_processed - a.orders_processed);
    const totalOrders = cashiers.reduce((s, c) => s + (c.orders_processed || 0), 0);
    const totalCash = cashiers.reduce((s, c) => s + (c.cash_collected || 0), 0);
    const totalCard = cashiers.reduce((s, c) => s + (c.card_collected || 0), 0);
    const totalUpi = cashiers.reduce((s, c) => s + (c.upi_collected || 0), 0);
    const totalCollected = totalCash + totalCard + totalUpi;
    return { cashiers, totalOrders, totalCash, totalCard, totalUpi, totalCollected };
  }, [rawData]);

  const buildExportPayload = () => {
    if (!analytics) return null;
    return { title: 'Cashier Activity', subtitle: 'Orders & payment collection by cashier', restaurant: { name: restaurant?.name || '' }, dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [{ label: 'Total Collected', value: analytics.totalCollected, format: 'inr' }, { label: 'Cash', value: analytics.totalCash, format: 'inr' }, { label: 'Card', value: analytics.totalCard, format: 'inr' }, { label: 'UPI', value: analytics.totalUpi, format: 'inr' }],
      sheets: [{ name: 'By Cashier', columns: [{ key: 'name', label: 'Cashier', format: 'text', align: 'left', width: 150 }, { key: 'orders_processed', label: 'Orders', format: 'integer', align: 'right', width: 80 }, { key: 'cash_collected', label: 'Cash', format: 'inr', align: 'right', width: 110 }, { key: 'card_collected', label: 'Card', format: 'inr', align: 'right', width: 110 }, { key: 'upi_collected', label: 'UPI', format: 'inr', align: 'right', width: 110 }], rows: analytics.cashiers, totals: { name: 'TOTAL', orders_processed: analytics.totalOrders, cash_collected: analytics.totalCash, card_collected: analytics.totalCard, upi_collected: analytics.totalUpi } }] };
  };
  const handleDownloadAction = (action) => { let pw = null; if (action === 'pdf') pw = openReportWindow(); setShowDownloadMenu(false); if (['email','whatsapp','sms'].includes(action)) return; try { const p = buildExportPayload(); if (!p) return; if (action === 'excel') exportReportAsExcel(p); else if (action === 'pdf') exportReportAsPDF(pw, p); } catch(e) { console.error(e); if (pw && !pw.closed) pw.close(); } };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s33-staff-cashiers-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s33-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s33-back-btn" onClick={() => navigate('/reports-module/staff-servers')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Cashier Activity</h1><p className="text-[11px] text-zinc-500 mt-0.5">Orders processed & payment collection by cashier · <span className="text-amber-600">partial payment split approximate</span>{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium">ⓘ Definitions</button></p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s33-daterange"><CalendarIcon className="w-4 h-4 text-zinc-500" /><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s33-date-from" /></label><span className="text-zinc-300">—</span><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s33-date-to" /></label></div>
              <button onClick={handleApply} disabled={isLoading||!canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s33-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s33-presets">{['7D','30D','MTD'].map(p => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} onClick={() => handlePreset(p)}>{p}</button>))}</div>
              <div className="relative" ref={downloadRef}><button onClick={() => setShowDownloadMenu(v=>!v)} disabled={isLoading||!analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading||!analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s33-download-trigger"><Download className="w-4 h-4" /> Download</button>{showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">{DOWNLOAD_MENU.map(item => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}</div>
            </div>
          </header>
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">{analytics && (<div className="space-y-6">
              <div className="grid grid-cols-4 gap-4" data-testid="s33-kpi-strip">
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-blue-500" /><span className="text-xs font-medium text-zinc-500 uppercase">Total Orders</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.totalOrders}</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><Banknote className="w-4 h-4 text-emerald-500" /><span className="text-xs font-medium text-zinc-500 uppercase">Cash Collected</span></div><div className="text-2xl font-bold text-zinc-950">{fmtINR(analytics.totalCash)}</div><div className="text-[10px] text-zinc-400">{analytics.totalCollected > 0 ? Math.round(analytics.totalCash/analytics.totalCollected*100) : 0}%</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-[#F26B33]" /><span className="text-xs font-medium text-zinc-500 uppercase">Card Collected</span></div><div className="text-2xl font-bold text-zinc-950">{fmtINR(analytics.totalCard)}</div><div className="text-[10px] text-zinc-400">{analytics.totalCollected > 0 ? Math.round(analytics.totalCard/analytics.totalCollected*100) : 0}%</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><Smartphone className="w-4 h-4 text-violet-500" /><span className="text-xs font-medium text-zinc-500 uppercase">UPI Collected</span></div><div className="text-2xl font-bold text-zinc-950">{fmtINR(analytics.totalUpi)}</div><div className="text-[10px] text-zinc-400">{analytics.totalCollected > 0 ? Math.round(analytics.totalUpi/analytics.totalCollected*100) : 0}%</div></div>
              </div>
              {/* Stacked Bar */}
              <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s33-chart">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Collection by Cashier</h2>
                <ResponsiveContainer width="100%" height={Math.max(180, analytics.cashiers.length * 50)}><BarChart data={analytics.cashiers} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} /><XAxis type="number" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#52525b' }} tickLine={false} axisLine={false} width={100} /><ReTooltip /><Legend iconType="circle" iconSize={8} /><Bar dataKey="cash_collected" name="Cash" fill="#329937" stackId="a" /><Bar dataKey="card_collected" name="Card" fill="#F26B33" stackId="a" /><Bar dataKey="upi_collected" name="UPI" fill="#8B5CF6" stackId="a" radius={[0,6,6,0]} />
                </BarChart></ResponsiveContainer>
              </div>
              {/* Table */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s33-table">
                <div className="px-6 py-4 border-b border-zinc-100"><h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Cashier Breakdown</h2></div>
                <table className="w-full"><thead className="bg-zinc-50"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Cashier</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Orders</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Cash</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Card</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">UPI</th><th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Total</th></tr></thead>
                <tbody>{analytics.cashiers.map((c,i) => { const total = (c.cash_collected||0)+(c.card_collected||0)+(c.upi_collected||0); return (<tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50" data-testid={`s33-row-${i}`}><td className="px-6 py-3 text-sm font-medium text-zinc-800">{c.name}</td><td className="px-4 py-3 text-sm text-right text-zinc-700">{c.orders_processed}</td><td className="px-4 py-3 text-sm text-right text-emerald-600">{fmtINR(c.cash_collected)}</td><td className="px-4 py-3 text-sm text-right text-[#F26B33]">{fmtINR(c.card_collected)}</td><td className="px-4 py-3 text-sm text-right text-violet-600">{fmtINR(c.upi_collected)}</td><td className="px-6 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR(total)}</td></tr>); })}</tbody>
                <tfoot className="bg-zinc-50 border-t-2 border-zinc-200"><tr><td className="px-6 py-3 text-sm font-bold">TOTAL</td><td className="px-4 py-3 text-sm text-right font-bold">{analytics.totalOrders}</td><td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">{fmtINR(analytics.totalCash)}</td><td className="px-4 py-3 text-sm text-right font-bold text-[#F26B33]">{fmtINR(analytics.totalCard)}</td><td className="px-4 py-3 text-sm text-right font-bold text-violet-600">{fmtINR(analytics.totalUpi)}</td><td className="px-6 py-3 text-sm text-right font-bold">{fmtINR(analytics.totalCollected)}</td></tr></tfoot></table>
              </div>
            </div>)}</div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};
export default StaffCashiersMockup;
