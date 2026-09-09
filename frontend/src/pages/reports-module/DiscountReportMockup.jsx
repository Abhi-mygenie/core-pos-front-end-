/**
 * DiscountReportMockup — CR-011 S26 (Phase 3, Batch D)
 * Discount Report: manual, coupon, loyalty, comp breakdown with daily trend + by employee.
 * Data source: insights-discounts (NEW endpoint)
 * Gate ①+④: Mockup with live API data.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { fetchInsightsDiscounts } from '../../api/services/insightsService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import { ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown, Mail, MessageCircle, Send, Percent, Tag, Gift, User } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts';

// CR-011 S26
const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 's26-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 's26-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 's26-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 's26-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 's26-share-sms-btn' },
];
const EMP_COLORS = ['#3B82F6', '#F26B33', '#329937', '#8B5CF6', '#EC4899', '#EAB308', '#06B6D4'];

const DailyTooltip = ({ active, payload }) => { if (!active || !payload?.length) return null; const d = payload[0].payload; return (<div className="bg-zinc-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-zinc-700"><div className="font-semibold mb-1">{d.date}</div><div>Manual: {fmtINR(d.manual)}</div>{d.coupon > 0 && <div>Coupon: {fmtINR(d.coupon)}</div>}{d.comp > 0 && <div>Comp: {fmtINR(d.comp)}</div>}</div>); };

const DiscountReportMockup = () => {
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
  const handlePreset = (p) => { const t = new Date(); let f; if (p === 'Today') f = t; else if (p === '7D') f = new Date(t.getTime()-6*86400000); else if (p === '30D') f = new Date(t.getTime()-29*86400000); else if (p === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); } else return; const fd = fmtISO(f); const td = fmtISO(t); setFromDate(fd); setToDate(td); setAppliedFrom(fd); setAppliedTo(td); setActivePreset(p); setSharedFrom(fd); setSharedTo(td); };

  const fetchData = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return;
    setIsLoading(true); setError(null);
    try { setRawData(await fetchInsightsDiscounts(appliedFrom, appliedTo)); setHasLoadedOnce(true); }
    catch (e) { setError(e.message || 'Failed to load'); } finally { setIsLoading(false); }
  }, [appliedFrom, appliedTo]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const analytics = useMemo(() => {
    if (!rawData) return null;
    const s = rawData.summary || {};
    const daily = (rawData.daily || []).map(d => ({ ...d, total: (d.manual||0)+(d.coupon||0)+(d.loyalty||0)+(d.comp||0) }));
    const byEmployee = rawData.by_employee || [];
    const ordersTable = rawData.orders_table || []; // BUG-329: per-order discount reasons
    return { summary: s, daily, byEmployee, ordersTable, total: s.total || 0 };
  }, [rawData]);

  const buildExportPayload = () => {
    if (!analytics) return null;
    return { title: 'Discount Report', subtitle: 'Manual, coupon, loyalty & comp discounts', restaurant: { name: restaurant?.name || '' }, dateRange: { from: appliedFrom, to: appliedTo }, generatedBy: restaurant?.ownerName || '',
      kpis: [{ label: 'Total Discount', value: analytics.total, format: 'inr' }, { label: 'Manual', value: analytics.summary.manual_discount, format: 'inr' }, { label: 'Coupon', value: analytics.summary.coupon_discount, format: 'inr' }, { label: 'Comp', value: analytics.summary.comp_total, format: 'inr' }],
      sheets: [
        { name: 'Daily', columns: [{ key: 'date', label: 'Date', format: 'text', align: 'left', width: 100 }, { key: 'manual', label: 'Manual', format: 'inr', align: 'right', width: 100 }, { key: 'coupon', label: 'Coupon', format: 'inr', align: 'right', width: 100 }, { key: 'loyalty', label: 'Loyalty', format: 'inr', align: 'right', width: 100 }, { key: 'comp', label: 'Comp', format: 'inr', align: 'right', width: 100 }, { key: 'total', label: 'Total', format: 'inr', align: 'right', width: 100 }], rows: analytics.daily, totals: { date: 'TOTAL', manual: analytics.summary.manual_discount, coupon: analytics.summary.coupon_discount, loyalty: analytics.summary.loyalty_discount, comp: analytics.summary.comp_total, total: analytics.total } },
        { name: 'By Employee', columns: [{ key: 'name', label: 'Employee', format: 'text', align: 'left', width: 150 }, { key: 'manual_discount', label: 'Manual Discount', format: 'inr', align: 'right', width: 120 }, { key: 'coupon_applied', label: 'Coupons Applied', format: 'integer', align: 'right', width: 100 }, { key: 'comp_count', label: 'Comp Count', format: 'integer', align: 'right', width: 100 }], rows: analytics.byEmployee },
      ] };
  };
  const handleDownloadAction = (action) => { let pw = null; if (action === 'pdf') pw = openReportWindow(); setShowDownloadMenu(false); if (['email','whatsapp','sms'].includes(action)) return; try { const p = buildExportPayload(); if (!p) return; if (action === 'excel') exportReportAsExcel(p); else if (action === 'pdf') exportReportAsPDF(pw, p); } catch(e) { console.error(e); if (pw && !pw.closed) pw.close(); } };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="s26-discount-report-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="s26-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="s26-back-btn" onClick={() => navigate('/reports-module/dashboard')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div><h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Discount Report</h1><p className="text-[11px] text-zinc-500 mt-0.5">Manual, coupon, loyalty & complementary discounts{' · '}<button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium">ⓘ Definitions</button></p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="s26-daterange"><CalendarIcon className="w-4 h-4 text-zinc-500" /><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s26-date-from" /></label><span className="text-zinc-300">—</span><label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="s26-date-to" /></label></div>
              <button onClick={handleApply} disabled={isLoading||!canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="s26-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="s26-presets">{['7D','30D','MTD'].map(p => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} onClick={() => handlePreset(p)}>{p}</button>))}</div>
              <div className="relative" ref={downloadRef}><button onClick={() => setShowDownloadMenu(v=>!v)} disabled={isLoading||!analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading||!analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="s26-download-trigger"><Download className="w-4 h-4" /> Download</button>{showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">{DOWNLOAD_MENU.map(item => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}</div>
            </div>
          </header>
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-8">{analytics && (<div className="space-y-6">
              <div className="grid grid-cols-5 gap-4" data-testid="s26-kpi-strip">
                <div className="bg-white border border-zinc-200 rounded-xl p-4"><div className="flex items-center gap-1.5 mb-1"><Percent className="w-3.5 h-3.5 text-red-500" /><span className="text-[10px] font-medium text-zinc-500 uppercase">Total</span></div><div className="text-xl font-bold text-red-600">{fmtINR(analytics.total)}</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-4"><div className="flex items-center gap-1.5 mb-1"><Tag className="w-3.5 h-3.5 text-[#F26B33]" /><span className="text-[10px] font-medium text-zinc-500 uppercase">Manual</span></div><div className="text-xl font-bold text-zinc-950">{fmtINR(analytics.summary.manual_discount)}</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-4"><div className="flex items-center gap-1.5 mb-1"><Tag className="w-3.5 h-3.5 text-blue-500" /><span className="text-[10px] font-medium text-zinc-500 uppercase">Coupon</span></div><div className="text-xl font-bold text-zinc-950">{fmtINR(analytics.summary.coupon_discount)}</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-4"><div className="flex items-center gap-1.5 mb-1"><Gift className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-medium text-zinc-500 uppercase">Loyalty</span></div><div className="text-xl font-bold text-zinc-950">{fmtINR(analytics.summary.loyalty_discount)}</div></div>
                <div className="bg-white border border-zinc-200 rounded-xl p-4"><div className="flex items-center gap-1.5 mb-1"><Gift className="w-3.5 h-3.5 text-amber-500" /><span className="text-[10px] font-medium text-zinc-500 uppercase">Comp</span></div><div className="text-xl font-bold text-zinc-950">{fmtINR(analytics.summary.comp_total)}</div></div>
              </div>
              {/* Daily Area Chart */}
              <div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s26-daily-chart">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Daily Discount Trend</h2>
                <ResponsiveContainer width="100%" height={240}><AreaChart data={analytics.daily} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs><linearGradient id="s26Grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F26B33" stopOpacity={0.2} /><stop offset="100%" stopColor="#F26B33" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} tickFormatter={v => v.slice(5)} /><YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} /><ReTooltip content={<DailyTooltip />} /><Area type="monotone" dataKey="manual" stroke="#F26B33" strokeWidth={2} fill="url(#s26Grad)" animationDuration={600} />
                </AreaChart></ResponsiveContainer>
              </div>
              {/* By Employee Bar */}
              {analytics.byEmployee.length > 0 && (<div className="bg-white border border-zinc-200 rounded-xl p-6" data-testid="s26-employee-chart">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-4">Discount by Employee</h2>
                <ResponsiveContainer width="100%" height={200}><BarChart data={analytics.byEmployee} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} /><XAxis type="number" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#52525b' }} tickLine={false} axisLine={false} width={100} /><ReTooltip /><Bar dataKey="manual_discount" radius={[0,6,6,0]} animationDuration={600}>{analytics.byEmployee.map((e,i) => <Cell key={e.name} fill={EMP_COLORS[i % EMP_COLORS.length]} />)}</Bar>
                </BarChart></ResponsiveContainer>
              </div>)}
              {/* Daily Table */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s26-daily-table">
                <div className="px-6 py-4 border-b border-zinc-100"><h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Daily Breakdown</h2></div>
                <table className="w-full"><thead className="bg-zinc-50"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Manual</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Coupon</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Loyalty</th><th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Comp</th><th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Total</th></tr></thead>
                <tbody>{analytics.daily.map((d,i) => (<tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50"><td className="px-6 py-3 text-sm font-medium text-zinc-800">{d.date}</td><td className="px-4 py-3 text-sm text-right text-zinc-700">{fmtINR(d.manual)}</td><td className="px-4 py-3 text-sm text-right text-zinc-600">{d.coupon > 0 ? fmtINR(d.coupon) : '—'}</td><td className="px-4 py-3 text-sm text-right text-zinc-600">{d.loyalty > 0 ? fmtINR(d.loyalty) : '—'}</td><td className="px-4 py-3 text-sm text-right text-zinc-600">{d.comp > 0 ? fmtINR(d.comp) : '—'}</td><td className="px-6 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR(d.total)}</td></tr>))}</tbody>
                <tfoot className="bg-zinc-50 border-t-2 border-zinc-200"><tr><td className="px-6 py-3 text-sm font-bold">TOTAL</td><td className="px-4 py-3 text-sm text-right font-bold">{fmtINR(analytics.summary.manual_discount)}</td><td className="px-4 py-3 text-sm text-right font-bold">{fmtINR(analytics.summary.coupon_discount)}</td><td className="px-4 py-3 text-sm text-right font-bold">{fmtINR(analytics.summary.loyalty_discount)}</td><td className="px-4 py-3 text-sm text-right font-bold">{fmtINR(analytics.summary.comp_total)}</td><td className="px-6 py-3 text-sm text-right font-bold text-red-600">{fmtINR(analytics.total)}</td></tr></tfoot></table>
              </div>
              {/* BUG-329: Discount Orders — per-order discount_for reason */}
              {analytics.ordersTable.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="s26-orders-table">
                  <div className="px-6 py-4 border-b border-zinc-100"><h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Discount Orders</h2></div>
                  <table className="w-full">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Order #</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Reason</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Discount</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.ordersTable.map((row, i) => (
                        <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50">
                          <td className="px-6 py-3 text-sm font-medium text-zinc-800">#{row.restaurant_order_id || row.order_id || '—'}</td>
                          <td className="px-4 py-3 text-sm text-zinc-600">{row.order_date || '—'}</td>
                          <td className="px-4 py-3 text-sm text-zinc-700">{row.discount_for || '—'}</td>
                          <td className="px-4 py-3 text-sm text-right text-zinc-700">{fmtINR(row.order_discount || 0)}</td>
                          <td className="px-6 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR(row.total_discount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>)}</div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};
export default DiscountReportMockup;
