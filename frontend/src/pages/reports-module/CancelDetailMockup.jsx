/**
 * CancelDetailMockup — CR-011 S28 (Phase 3, Batch E)
 * Item Cancellation Detail: full item-level cancellation table with filters.
 * Data source: insights-cancellations.items[] (existing endpoint)
 * Gate ①+④: Mockup with live API data.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { fetchInsightsCancellations } from '../../api/services/insightsService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown, Mail, MessageCircle, Send, XCircle, AlertTriangle, User } from 'lucide-react';

// CR-011 S28
const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's28-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's28-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's28-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's28-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's28-share-sms-btn' },
];

const CancelDetailMockup = () => {
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
  const [activePreset, setActivePreset] = useState('7D');
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [stageFilter, setStageFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');

  useEffect(() => { const h = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply = draftDirty && draftValid && !isLoading;
  const handleApply = () => { if (canApply) { setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset(''); } };
  const handlePreset = (p) => { const t = new Date(); let f; if (p === 'Today') f = t; else if (p === '7D') f = new Date(t.getTime() - 6*86400000); else if (p === '30D') f = new Date(t.getTime() - 29*86400000); else if (p === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); } else return; const fd = fmtISO(f); const td = fmtISO(t); setFromDate(fd); setToDate(td); setAppliedFrom(fd); setAppliedTo(td); setActivePreset(p); setSharedFrom(fd); setSharedTo(td); };

  const fetchData = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return;
    setIsLoading(true); setError(null);
    try { const r = await fetchInsightsCancellations(appliedFrom, appliedTo); setRawData(r.data || r); setHasLoadedOnce(true); }
    catch (e) { setError(e.message || 'Failed to load'); }
    finally { setIsLoading(false); }
  }, [appliedFrom, appliedTo]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const analytics = useMemo(() => {
    if (!rawData) return null;
    const items = rawData.items || [];
    const stages = [...new Set(items.map(i => i.stage).filter(Boolean))].sort();
    const reasons = [...new Set(items.map(i => i.reason).filter(Boolean))].sort();
    let filtered = items;
    if (stageFilter) filtered = filtered.filter(i => i.stage === stageFilter);
    if (reasonFilter) filtered = filtered.filter(i => i.reason === reasonFilter);
    const totalQty = filtered.reduce((s, i) => s + (i.qty || 0), 0);
    const totalLoss = filtered.reduce((s, i) => s + (i.amount || 0), 0);
    return { items: filtered, allItems: items, stages, reasons, totalQty, totalLoss };
  }, [rawData, stageFilter, reasonFilter]);

  const buildExportPayload = () => {
    if (!analytics) return null;
    return { title: 'Item Cancellation Detail', subtitle: 'Per-item cancellation breakdown', restaurant: { name: restaurant?.name || '' }, dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [{ label: 'Items Cancelled', value: analytics.totalQty, format: 'text' }, { label: 'Total Loss', value: analytics.totalLoss, format: 'inr' }],
      sheets: [{ name: 'Cancellations', subtitle: `${analytics.items.length} lines`, columns: [
        { key: 'name', label: 'Item', format: 'text', align: 'left', width: 150 }, { key: 'qty', label: 'Qty', format: 'integer', align: 'right', width: 60 },
        { key: 'amount', label: 'Loss', format: 'inr', align: 'right', width: 100 }, { key: 'stage', label: 'Stage', format: 'text', align: 'left', width: 120 },
        { key: 'reason', label: 'Reason', format: 'text', align: 'left', width: 150 }, { key: 'cancelled_by', label: 'By', format: 'text', align: 'left', width: 100 },
        { key: 'order_id', label: 'Order', format: 'text', align: 'left', width: 80 }, { key: 'cancel_date', label: 'Date', format: 'text', align: 'left', width: 100 },
      ], rows: analytics.items, totals: { name: 'TOTAL', qty: analytics.totalQty, amount: analytics.totalLoss } }] };
  };
  const handleDownloadAction = (action) => { let pw = null; if (action === 'pdf') pw = openReportWindow(); setShowDownloadMenu(false); if (['email','whatsapp','sms'].includes(action)) return; try { const p = buildExportPayload(); if (!p) return; if (action === 'excel') exportReportAsExcel(p); else if (action === 'pdf') exportReportAsPDF(pw, p); } catch (e) { console.error(e); if (pw && !pw.closed) pw.close(); } };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s28-cancel-detail-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s28-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s28-back-btn" onClick={() => navigate('/reports-module/cancellations')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Item Cancellation Detail</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Per-item cancellation breakdown · filterable by stage & reason{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium">ⓘ Definitions</button></p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s28-daterange"><CalendarIcon className="w-4 h-4 text-zinc-500" /><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s28-date-from" /></label><span className="text-zinc-300">—</span><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s28-date-to" /></label></div>
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s28-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s28-presets">{['Today','7D','30D','MTD'].map((p) => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} onClick={() => handlePreset(p)}>{p}</button>))}</div>
              <div className="relative" ref={downloadRef}><button onClick={() => setShowDownloadMenu(v => !v)} disabled={isLoading || !analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading || !analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s28-download-trigger"><Download className="w-4 h-4" /> Download</button>{showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="s28-download-menu">{DOWNLOAD_MENU.map(item => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}</div>
            </div>
          </header>
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">
              {analytics && (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4" data-testid="s28-kpi-strip">
                    <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><XCircle className="w-4 h-4 text-red-500" /><span className="text-xs font-medium text-zinc-500 uppercase">Total Items</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.allItems.length}</div></div>
                    <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-amber-500" /><span className="text-xs font-medium text-zinc-500 uppercase">Total Qty Cancelled</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.totalQty}</div></div>
                    <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><XCircle className="w-4 h-4 text-red-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Total Loss</span></div><div className="text-2xl font-bold text-red-600">{fmtINR(analytics.totalLoss)}</div></div>
                    <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><User className="w-4 h-4 text-blue-500" /><span className="text-xs font-medium text-zinc-500 uppercase">Showing</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.items.length}</div><div className="text-[10px] text-zinc-400">filtered lines</div></div>
                  </div>
                  {/* Filters */}
                  <div className="flex gap-3" data-testid="s28-filters">
                    <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white" data-testid="s28-filter-stage"><option value="">All Stages</option>{analytics.stages.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-white" data-testid="s28-filter-reason"><option value="">All Reasons</option>{analytics.reasons.map(r => <option key={r} value={r}>{r}</option>)}</select>
                    {(stageFilter || reasonFilter) && <button onClick={() => { setStageFilter(''); setReasonFilter(''); }} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Clear</button>}
                  </div>
                  {/* Table */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s28-table">
                    <table className="w-full"><thead className="bg-zinc-50"><tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Item</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Loss</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Stage</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Reason</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">By</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Order</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th>
                    </tr></thead><tbody>
                      {analytics.items.slice(0, 200).map((item, i) => (
                        <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50" data-testid={`s28-row-${i}`}>
                          <td className="px-5 py-2.5 text-sm font-medium text-zinc-800">{item.name}</td>
                          <td className="px-3 py-2.5 text-sm text-right text-zinc-700">{item.qty}</td>
                          <td className="px-4 py-2.5 text-sm text-right text-red-600 font-medium">{fmtINR(item.amount)}</td>
                          <td className="px-4 py-2.5 text-xs text-zinc-500">{item.stage || '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-zinc-500 max-w-[180px] truncate">{item.reason || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-zinc-500">{item.cancelled_by || '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-zinc-600 font-mono">#{item.order_id}</td>
                          <td className="px-4 py-2.5 text-xs text-zinc-500">{item.cancel_date} {item.cancel_time}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-50 border-t-2 border-zinc-200"><tr>
                      <td className="px-5 py-3 text-sm font-bold">TOTAL ({analytics.items.length} lines)</td>
                      <td className="px-3 py-3 text-sm text-right font-bold">{analytics.totalQty}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{fmtINR(analytics.totalLoss)}</td>
                      <td colSpan={5} />
                    </tr></tfoot></table>
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
export default CancelDetailMockup;
