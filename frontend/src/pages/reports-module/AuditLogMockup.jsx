/**
 * AuditLogMockup — CR-011 S34 (Phase 3, Batch E)
 * Order Edit Audit: make_unpaid + payment_method_change events.
 * Data source: insights-dashboard.audits.orders[] (existing endpoint)
 * Gate ①+④: Mockup with live API data.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { fetchInsightsDashboard } from '../../api/services/insightsService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown, Mail, MessageCircle, Send, ShieldAlert, AlertTriangle, RefreshCw, XCircle, Ban, Pencil } from 'lucide-react'; // CR-528: +XCircle, Ban, Pencil
import { fmtISO, DATE_PRESETS, computePresetRange } from '../../utils/datePresets'; // BUG-640 + CR-481

// CR-011 S34
// BUG-640: fmtISO moved to shared utility
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

// CR-528: event type → display label + badge colours
const AUDIT_TYPE_MAP = {
  make_unpaid:              { label: 'Make Unpaid',               bg: 'bg-red-100',    text: 'text-red-700' },
  payment_method_change:    { label: 'Payment Change',            bg: 'bg-amber-100',  text: 'text-amber-700' },
  item_cancel_after_print:  { label: 'Item Cancel (Post-Print)',  bg: 'bg-orange-100', text: 'text-orange-700' },
  order_cancel_after_print: { label: 'Order Cancel (Post-Print)', bg: 'bg-rose-100',   text: 'text-rose-700' },
  order_edit_after_print:   { label: 'Order Edit (Post-Print)',   bg: 'bg-blue-100',   text: 'text-blue-700' },
};
const fmtTime = (dt) => dt ? dt.split(' ').pop()?.slice(0, 5) || dt : '—'; // CR-528: "2026-11-16 22:26:16" → "22:26"

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's34-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's34-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's34-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's34-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's34-share-sms-btn' },
];

const AuditLogMockup = () => {
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

  useEffect(() => { const h = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply = draftDirty && draftValid && !isLoading;
  const handleApply = () => { if (canApply) { setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset(''); } };
  const handlePreset = (p) => { const t = new Date(); let f; if (p === 'Today') f = t; else if (p === '7D') f = new Date(t.getTime() - 6*86400000); else if (p === 'LM') { const now=new Date(); const lf=fmtISO(new Date(now.getFullYear(),now.getMonth()-1,1)); const lt=fmtISO(new Date(now.getFullYear(),now.getMonth(),0)); setFromDate(lf); setToDate(lt); setAppliedFrom(lf); setAppliedTo(lt); setActivePreset(p); setSharedFrom(lf); setSharedTo(lt); return; } /* CR-422 */ else if (p === '30D') f = new Date(t.getTime() - 29 * 86400000); // CR-481
    else if (p === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); } else if (p === 'FY') { const range = computePresetRange('FY'); if (range) { setFromDate(range.from); setToDate(range.to); setAppliedFrom(range.from); setAppliedTo(range.to); setActivePreset(p); } return; } // CR-481
    else return; const fd = fmtISO(f); const td = fmtISO(t); setFromDate(fd); setToDate(td); setAppliedFrom(fd); setAppliedTo(td); setActivePreset(p); setSharedFrom(fd); setSharedTo(td); };

  const fetchData = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return;
    setIsLoading(true); setError(null);
    try { const r = await fetchInsightsDashboard(appliedFrom, appliedTo); setRawData(r.data || r); setHasLoadedOnce(true); }
    catch (e) { setError(e.message || 'Failed to load'); }
    finally { setIsLoading(false); }
  }, [appliedFrom, appliedTo]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // CR-528: extended analytics with 3 new post-print event types
  const analytics = useMemo(() => {
    if (!rawData) return null;
    const audits = rawData.audits || {};
    const orders = audits.orders || [];
    const makeUnpaid = orders.filter(o => o.type === 'make_unpaid');
    const payChange = orders.filter(o => o.type === 'payment_method_change');
    const itemCancelAP = orders.filter(o => o.type === 'item_cancel_after_print'); // CR-528
    const orderCancelAP = orders.filter(o => o.type === 'order_cancel_after_print'); // CR-528
    const orderEditAP = orders.filter(o => o.type === 'order_edit_after_print'); // CR-528
    return {
      orders, makeUnpaid, payChange, itemCancelAP, orderCancelAP, orderEditAP,
      total: audits.total || orders.length,
      makeUnpaidCount: audits.make_unpaid_count || makeUnpaid.length,
      payChangeCount: audits.payment_method_change_count || payChange.length,
      itemCancelCount: audits.item_cancel_after_print_count || itemCancelAP.length, // CR-528
      orderCancelCount: audits.order_cancel_after_print_count || orderCancelAP.length, // CR-528
      orderEditCount: audits.order_edit_after_print_count || orderEditAP.length, // CR-528
    };
  }, [rawData]);

  const buildExportPayload = () => {
    if (!analytics) return null;
    return { title: 'Order Edit Audit', subtitle: 'Audit trail: payment changes, post-print edits and cancellations', restaurant: { name: restaurant?.name || '' }, dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '', // CR-528: updated subtitle
      kpis: [
        { label: 'Total Audits', value: analytics.total, format: 'text' },
        { label: 'Make Unpaid', value: analytics.makeUnpaidCount, format: 'text' },
        { label: 'Payment Changes', value: analytics.payChangeCount, format: 'text' },
        { label: 'Item Cancel After Print', value: analytics.itemCancelCount, format: 'text' }, // CR-528
        { label: 'Order Cancel After Print', value: analytics.orderCancelCount, format: 'text' }, // CR-528
        { label: 'Order Edit After Print', value: analytics.orderEditCount, format: 'text' }, // CR-528
      ],
      sheets: [{ name: 'Audit Log', columns: [
        { key: 'order_id', label: 'Order', format: 'text', align: 'left', width: 80 },
        { key: 'type', label: 'Type', format: 'text', align: 'left', width: 160 },
        { key: 'food_name', label: 'Item', format: 'text', align: 'left', width: 120 }, // CR-528
        { key: 'amount', label: 'Amount', format: 'inr', align: 'right', width: 100 },
        { key: 'prev_amount', label: 'Prev Amount', format: 'inr', align: 'right', width: 100 }, // CR-528
        { key: 'by', label: 'By', format: 'text', align: 'left', width: 100 },
        { key: 'bill_printed_at', label: 'Bill Printed', format: 'text', align: 'left', width: 140 }, // CR-528
        { key: 'cancel_time', label: 'Cancel Time', format: 'text', align: 'left', width: 140 }, // CR-528
        { key: 'edit_time', label: 'Edit Time', format: 'text', align: 'left', width: 140 }, // CR-528
        { key: 'prev_method', label: 'Previous Method', format: 'text', align: 'left', width: 100 },
        { key: 'curr_method', label: 'Current Method', format: 'text', align: 'left', width: 100 },
      ], rows: analytics.orders }] };
  };
  const handleDownloadAction = (action) => { let pw = null; if (action === 'pdf') pw = openReportWindow(); setShowDownloadMenu(false); if (['email','whatsapp','sms'].includes(action)) return; try { const p = buildExportPayload(); if (!p) return; if (action === 'excel') exportReportAsExcel(p); else if (action === 'pdf') exportReportAsPDF(pw, p); } catch (e) { console.error(e); if (pw && !pw.closed) pw.close(); } };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s34-audit-log-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0 flex-wrap gap-y-3" data-testid="s34-header"> {/* BUG-555 */}
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s34-back-btn" onClick={() => navigate('/reports-module/dashboard')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Order Edit Audit</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Audit trail: payment changes, post-print edits and cancellations{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium">ⓘ Definitions</button></p></div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s34-daterange"><CalendarIcon className="w-4 h-4 text-zinc-500" /><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s34-date-from" /></label><span className="text-zinc-300">—</span><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s34-date-to" /></label></div>
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s34-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s34-presets">{DATE_PRESETS.map(p => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} onClick={() => handlePreset(p)}>{p}</button>))}</div>
              <div className="relative" ref={downloadRef}><button onClick={() => setShowDownloadMenu(v => !v)} disabled={isLoading || !analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading || !analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s34-download-trigger"><Download className="w-4 h-4" /> Download</button>{showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">{DOWNLOAD_MENU.map(item => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}</div>
            </div>
          </header>
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">
              {analytics && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-4" data-testid="s34-kpi-strip">
                    <div className="bg-white border border-zinc-200 rounded-xl p-5"><div className="flex items-center gap-2 mb-2"><ShieldAlert className="w-4 h-4 text-amber-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Total Audits</span></div><div className="text-2xl font-bold text-zinc-950" data-testid="s34-kpi-total">{analytics.total}</div></div>
                    <div className="bg-white border border-red-200 rounded-xl p-5 bg-red-50/30"><div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Make Unpaid</span></div><div className="text-2xl font-bold text-red-700" data-testid="s34-kpi-unpaid">{analytics.makeUnpaidCount}</div></div>
                    <div className="bg-white border border-amber-200 rounded-xl p-5 bg-amber-50/30"><div className="flex items-center gap-2 mb-2"><RefreshCw className="w-4 h-4 text-amber-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Payment Change</span></div><div className="text-2xl font-bold text-amber-700" data-testid="s34-kpi-paychange">{analytics.payChangeCount}</div></div>
                    {/* CR-528: 3 new post-bill-print KPI cards */}
                    <div className="bg-white border border-orange-200 rounded-xl p-5 bg-orange-50/30"><div className="flex items-center gap-2 mb-2"><XCircle className="w-4 h-4 text-orange-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Item Cancel After Print</span></div><div className="text-2xl font-bold text-orange-700" data-testid="s34-kpi-item-cancel">{analytics.itemCancelCount}</div></div>
                    <div className="bg-white border border-rose-200 rounded-xl p-5 bg-rose-50/30"><div className="flex items-center gap-2 mb-2"><Ban className="w-4 h-4 text-rose-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Order Cancel After Print</span></div><div className="text-2xl font-bold text-rose-700" data-testid="s34-kpi-order-cancel">{analytics.orderCancelCount}</div></div>
                    <div className="bg-white border border-blue-200 rounded-xl p-5 bg-blue-50/30"><div className="flex items-center gap-2 mb-2"><Pencil className="w-4 h-4 text-blue-600" /><span className="text-xs font-medium text-zinc-500 uppercase">Order Edit After Print</span></div><div className="text-2xl font-bold text-blue-700" data-testid="s34-kpi-order-edit">{analytics.orderEditCount}</div></div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s34-table">
                    <div className="px-6 py-4 border-b border-zinc-100"><h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Audit Trail</h2></div>
                    {/* CR-528: table with 5 event types + type-specific columns */}
                    <div className="overflow-x-auto">
                    <table className="w-full"><thead className="bg-zinc-50"><tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Order</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Type</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Item</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Amount</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Prev Amt</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">By</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Bill Printed</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Event Time</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Prev Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Curr Method</th>
                    </tr></thead><tbody>
                      {analytics.orders.map((o, i) => {
                        const tm = AUDIT_TYPE_MAP[o.type] || { label: o.type, bg: 'bg-zinc-100', text: 'text-zinc-700' };
                        const isPostPrint = o.type?.includes('after_print');
                        return (
                        <tr key={i} className={`border-t border-zinc-50 hover:bg-zinc-50/50 ${isPostPrint ? 'bg-amber-50/20' : ''}`} data-testid={`s34-row-${i}`}>
                          <td className="px-4 py-3 text-sm font-mono text-zinc-800">#{o.order_id}</td>
                          <td className="px-3 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${tm.bg} ${tm.text}`}>{tm.label}</span></td>
                          <td className="px-3 py-3 text-sm text-zinc-600">{o.food_name || '—'}</td>
                          <td className="px-3 py-3 text-sm text-right font-medium text-zinc-900">{fmtINR(o.amount)}</td>
                          <td className="px-3 py-3 text-sm text-right text-zinc-500">{o.prev_amount != null ? fmtINR(o.prev_amount) : '—'}</td>
                          <td className="px-3 py-3 text-sm text-zinc-600">{o.by || '—'}</td>
                          <td className="px-3 py-3 text-sm text-zinc-500 whitespace-nowrap">{o.bill_printed_at ? fmtTime(o.bill_printed_at) : '—'}</td>
                          <td className="px-3 py-3 text-sm text-zinc-500 whitespace-nowrap">{o.cancel_time ? fmtTime(o.cancel_time) : o.edit_time ? fmtTime(o.edit_time) : '—'}</td>
                          <td className="px-3 py-3 text-sm text-zinc-500">{o.prev_method || '—'}</td>
                          <td className="px-4 py-3 text-sm text-zinc-500">{o.curr_method || '—'}</td>
                        </tr>
                        );
                      })}
                    </tbody></table>
                    </div>
                    {analytics.orders.length === 0 && <div className="p-12 text-center text-zinc-400 text-sm">No audit events in this period</div>}
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
export default AuditLogMockup;
