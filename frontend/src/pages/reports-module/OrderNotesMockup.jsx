/**
 * OrderNotesMockup — CR-011 S35 (Phase 3, Batch E)
 * Order Note Audit: cancelled items with food-level notes.
 * Data source: insights-cancellations.items[] filtered where notes != null
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
import { ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown, Mail, MessageCircle, Send, StickyNote, MessageSquare } from 'lucide-react';

// CR-011 S35
const fmtISO = (d) => d.toISOString().slice(0, 10);

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's35-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's35-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's35-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's35-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's35-share-sms-btn' },
];

const OrderNotesMockup = () => {
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
  const handlePreset = (p) => { const t = new Date(); let f; if (p === '7D') f = new Date(t.getTime() - 6*86400000); else if (p === '30D') f = new Date(t.getTime() - 29*86400000); else if (p === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); } else return; const fd = fmtISO(f); const td = fmtISO(t); setFromDate(fd); setToDate(td); setAppliedFrom(fd); setAppliedTo(td); setActivePreset(p); setSharedFrom(fd); setSharedTo(td); };

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
    const allItems = rawData.items || [];
    const withNotes = allItems.filter(i => i.notes && i.notes.trim());
    return { withNotes, totalItems: allItems.length, notesCount: withNotes.length };
  }, [rawData]);

  const buildExportPayload = () => {
    if (!analytics) return null;
    return { title: 'Order Note Audit', subtitle: 'Cancelled items with food-level notes', restaurant: { name: restaurant?.name || '' }, dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [{ label: 'Items with Notes', value: analytics.notesCount, format: 'text' }, { label: 'Total Cancel Items', value: analytics.totalItems, format: 'text' }],
      sheets: [{ name: 'Order Notes', columns: [
        { key: 'order_id', label: 'Order', format: 'text', align: 'left', width: 80 }, { key: 'name', label: 'Item', format: 'text', align: 'left', width: 150 },
        { key: 'notes', label: 'Notes', format: 'text', align: 'left', width: 250 }, { key: 'reason', label: 'Reason', format: 'text', align: 'left', width: 150 },
        { key: 'cancel_date', label: 'Date', format: 'text', align: 'left', width: 100 }, { key: 'cancelled_by', label: 'By', format: 'text', align: 'left', width: 100 },
      ], rows: analytics.withNotes }] };
  };
  const handleDownloadAction = (action) => { let pw = null; if (action === 'pdf') pw = openReportWindow(); setShowDownloadMenu(false); if (['email','whatsapp','sms'].includes(action)) return; try { const p = buildExportPayload(); if (!p) return; if (action === 'excel') exportReportAsExcel(p); else if (action === 'pdf') exportReportAsPDF(pw, p); } catch (e) { console.error(e); if (pw && !pw.closed) pw.close(); } };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s35-order-notes-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s35-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s35-back-btn" onClick={() => navigate('/reports-module/cancellations')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Order Note Audit</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Cancelled items with food-level notes · kitchen/staff comments{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium">ⓘ Definitions</button></p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s35-daterange"><CalendarIcon className="w-4 h-4 text-zinc-500" /><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s35-date-from" /></label><span className="text-zinc-300">—</span><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s35-date-to" /></label></div>
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s35-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s35-presets">{['7D','30D','MTD'].map(p => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} onClick={() => handlePreset(p)}>{p}</button>))}</div>
              <div className="relative" ref={downloadRef}><button onClick={() => setShowDownloadMenu(v => !v)} disabled={isLoading || !analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading || !analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s35-download-trigger"><Download className="w-4 h-4" /> Download</button>{showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">{DOWNLOAD_MENU.map(item => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}</div>
            </div>
          </header>
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">
              {analytics && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4" data-testid="s35-kpi-strip">
                    <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><MessageSquare className="w-4 h-4 text-blue-500" /><span className="text-xs font-medium text-zinc-500 uppercase">Items with Notes</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.notesCount}</div></div>
                    <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><StickyNote className="w-4 h-4 text-amber-500" /><span className="text-xs font-medium text-zinc-500 uppercase">Total Cancel Items</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.totalItems}</div></div>
                    <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><StickyNote className="w-4 h-4 text-emerald-500" /><span className="text-xs font-medium text-zinc-500 uppercase">Notes Coverage</span></div><div className="text-2xl font-bold text-zinc-950">{analytics.totalItems > 0 ? Math.round((analytics.notesCount / analytics.totalItems) * 100) : 0}%</div></div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s35-table">
                    <div className="px-6 py-4 border-b border-zinc-100"><h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Items with Notes</h2></div>
                    <table className="w-full"><thead className="bg-zinc-50"><tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Order</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Notes</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">By</th>
                    </tr></thead><tbody>
                      {analytics.withNotes.map((item, i) => (
                        <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50" data-testid={`s35-row-${i}`}>
                          <td className="px-5 py-3 text-sm font-mono text-zinc-700">#{item.order_id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-zinc-800">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-blue-700 max-w-[300px]">{item.notes}</td>
                          <td className="px-4 py-3 text-xs text-zinc-500">{item.reason || '—'}</td>
                          <td className="px-4 py-3 text-xs text-zinc-500">{item.cancel_date}</td>
                          <td className="px-5 py-3 text-xs text-zinc-500">{item.cancelled_by || '—'}</td>
                        </tr>
                      ))}
                    </tbody></table>
                    {analytics.withNotes.length === 0 && <div className="p-12 text-center text-zinc-400 text-sm">No items with notes in this period</div>}
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
export default OrderNotesMockup;
