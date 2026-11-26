/**
 * Audit Report v3 — CR-543 + CR-544 + CR-546
 * 3-card theft detection dashboard: High Risk Cancellations, Leakage After Unpaid, Leakage After Print.
 * Data source: insights-dashboard.audits.orders[] (existing endpoint).
 * Design: AUDIT_REPORT_DESIGN_DECISIONS_LOCKED_2026_11_17.md (19 decisions D1–D19).
 * Option B: Card 1+3 fully built, Card 2 partial (cancel_after_unpaid live, discount/gap placeholder).
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { fetchInsightsDashboard } from '../../api/services/insightsService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import Sidebar from '../../components/layout/Sidebar';
import {
  ArrowLeft, CalendarIcon, Check, Download, FileSpreadsheet, FileDown, Mail, MessageCircle, Send,
  ShieldAlert, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Clock, XCircle, Ban, Percent, Info
} from 'lucide-react';
import { fmtISO, DATE_PRESETS, computePresetRange } from '../../utils/datePresets';
import { getRiskTier } from '../../utils/riskTier'; // CR-555: shared risk tier

// --- Helpers ---
const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
// BUG-691: robust to "YYYY-MM-DD HH:MM:SS" (space), ISO "...THH:MM:SS" (T), and date-only
// inputs — returns HH:MM, or "—" when there is no time (never a date prefix like "2026-").
const fmtTime = (dt) => {
  if (!dt) return '—';
  const m = String(dt).match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '—';
};

// BUG-697: derive which preset (if any) matches an applied range so the chip highlight
// reflects the real range on first load instead of a hard-coded default.
const matchPreset = (from, to) => {
  if (!from || !to) return '';
  const t = new Date();
  const td = fmtISO(t);
  const now = new Date();
  const cands = {
    Today: { from: fmtISO(t), to: td },
    '7D': { from: fmtISO(new Date(t.getTime() - 6 * 86400000)), to: td },
    '30D': { from: fmtISO(new Date(t.getTime() - 29 * 86400000)), to: td },
    MTD: { from: fmtISO(new Date(t.getFullYear(), t.getMonth(), 1)), to: td },
    LM: { from: fmtISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: fmtISO(new Date(now.getFullYear(), now.getMonth(), 0)) },
  };
  const fy = computePresetRange('FY');
  if (fy) cands.FY = fy;
  for (const [label, r] of Object.entries(cands)) {
    if (r.from === from && r.to === to) return label;
  }
  return '';
};

// CR-543/544/546: Card classification constants
const CARD_1_TYPES = new Set(['late_cancel']);
const CARD_2_TYPES = new Set(['cancel_after_unpaid', 'discount_apply_after_unpaid', 'discount_remove_after_unpaid']);
const CARD_3_TYPES = new Set(['item_cancel_after_print', 'order_cancel_after_print', 'discount_apply_after_print', 'discount_remove_after_print']);

// D9 Approach C: classify event into cards (can appear in multiple)
const classifyEvent = (e) => {
  const cards = [];
  if (CARD_1_TYPES.has(e.type)) cards.push('card1');
  if (CARD_2_TYPES.has(e.type) || (e.unpaid_count > 0)) cards.push('card2');
  if (CARD_3_TYPES.has(e.type) || (e.bill_printed_at && (e.type === 'late_cancel' || CARD_2_TYPES.has(e.type)))) cards.push('card3');
  return cards;
};

// CR-543 / CR-555: getRiskTier now shared from utils/riskTier (behaviour unchanged).

// Event type badge map
const EVENT_BADGE = {
  late_cancel:                { label: 'Late Cancel',               bg: '#FEE2E2', color: '#991B1B' },
  cancel_after_unpaid:        { label: 'Cancel After Unpaid',       bg: '#FEF3C7', color: '#92400E' },
  item_cancel_after_print:    { label: 'Item Cancel (Post-Print)',  bg: '#FFEDD5', color: '#9A3412' },
  order_cancel_after_print:   { label: 'Order Cancel (Post-Print)', bg: '#FFE4E6', color: '#9F1239' },
  discount_apply_after_print: { label: 'Discount Applied (Post-Print)', bg: '#F3E8FF', color: '#6B21A8' },
  discount_remove_after_print:{ label: 'Discount Removed (Post-Print)', bg: '#E0E7FF', color: '#3730A3' },
  make_unpaid:                { label: 'Make Unpaid',               bg: '#FEE2E2', color: '#991B1B' },
  payment_method_change:      { label: 'Payment Change',            bg: '#FEF3C7', color: '#92400E' },
  discount_apply_after_unpaid:{ label: 'Discount (Post-Unpaid)',    bg: '#F3E8FF', color: '#6B21A8' },
  discount_remove_after_unpaid:{label: 'Discount Removed (Post-Unpaid)', bg: '#E0E7FF', color: '#3730A3' },
};

// Card overlap badge
const CARD_BADGES = {
  card1: { label: 'Late Cancel', bg: '#FEE2E2', color: '#991B1B' }, // BUG-730: pill names the bucket, not a per-row risk assertion (true tier column is P3/backend)
  card2: { label: 'After Unpaid', bg: '#FEF3C7', color: '#92400E' },
  card3: { label: 'After Print', bg: '#FFEDD5', color: '#9A3412' },
};

const DOWNLOAD_MENU = [
  { id: 'excel', label: 'Download as Excel', icon: FileSpreadsheet, enabled: true, testId: 'audit-download-excel-btn' },
  { id: 'pdf', label: 'Download as PDF', icon: FileDown, enabled: true, testId: 'audit-download-pdf-btn' },
  { id: 'email', label: 'Send via Email', icon: Mail, enabled: false, testId: 'audit-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp', icon: MessageCircle, enabled: false, testId: 'audit-share-whatsapp-btn' },
  { id: 'sms', label: 'Send via SMS', icon: Send, enabled: false, testId: 'audit-share-sms-btn' },
];

// --- Sub-components ---

// KPI Card
const KpiCard = ({ icon: Icon, label, value, color, borderColor, testId }) => (
  <div className="bg-white border rounded-xl p-4" style={{ borderColor: borderColor || '#E5E5E5' }} data-testid={testId}>
    <div className="flex items-center gap-2 mb-1.5">
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">{label}</span>
    </div>
    <div className="text-2xl font-bold tabular-nums" style={{ color: color || '#1A1A1A' }}>{value}</div>
  </div>
);

// CR-543: Risk Bar (horizontal stacked)
const RiskBar = ({ doubt, risk, highRisk }) => {
  const total = doubt + risk + highRisk;
  if (total === 0) return <div className="text-xs text-zinc-400 py-2" data-testid="audit-card1-risk-bar">No high-risk cancellations</div>; // BUG-700: testid on empty state
  const pct = (n) => Math.max(2, (n / total) * 100); // min 2% for visibility
  return (
    <div data-testid="audit-card1-risk-bar">
      <div className="flex rounded-lg overflow-hidden h-7 mt-2 mb-1">
        {doubt > 0 && <div className="flex items-center justify-center text-[10px] font-bold text-amber-800" style={{ width: `${pct(doubt)}%`, backgroundColor: '#FEF3C7' }}>{doubt}</div>}
        {risk > 0 && <div className="flex items-center justify-center text-[10px] font-bold text-orange-800" style={{ width: `${pct(risk)}%`, backgroundColor: '#FFEDD5' }}>{risk}</div>}
        {highRisk > 0 && <div className="flex items-center justify-center text-[10px] font-bold text-red-800" style={{ width: `${pct(highRisk)}%`, backgroundColor: '#FEE2E2' }}>{highRisk}</div>}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500 px-0.5">
        <span>Doubt (5-15 min): {doubt}</span>
        <span>Risk (15-30 min): {risk}</span>
        <span>High Risk (30+ min): {highRisk}</span>
      </div>
    </div>
  );
};

// Overlap badge pills on drill-down rows
const OverlapBadges = ({ cards }) => (
  <div className="flex gap-1 flex-wrap">
    {cards.map(c => {
      const b = CARD_BADGES[c];
      return b ? <span key={c} className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: b.bg, color: b.color }}>{b.label}</span> : null;
    })}
  </div>
);

// Drill-down table for Card 2 and Card 3
const DrillDownTable = ({ events, testId }) => {
  if (!events || events.length === 0) return <div className="py-6 text-center text-zinc-400 text-sm" data-testid={testId}>No events</div>; // BUG-700: testid on empty state
  return (
    <div className="overflow-x-auto" data-testid={testId}>
      <table className="w-full text-sm">
        <thead className="bg-zinc-50"><tr>
          <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-500 uppercase">Order</th>
          <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-500 uppercase">Type</th>
          <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-500 uppercase">Item</th>
          <th className="px-3 py-2 text-right text-[11px] font-semibold text-zinc-500 uppercase">Amount</th>
          <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-500 uppercase">By</th>
          <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-500 uppercase">Time</th>
          <th className="px-3 py-2 text-left text-[11px] font-semibold text-zinc-500 uppercase">Cards</th>
        </tr></thead>
        <tbody>
          {events.map((e, i) => {
            const badge = EVENT_BADGE[e.type] || { label: e.type, bg: '#F3F4F6', color: '#374151' };
            const cards = classifyEvent(e);
            return (
              <tr key={i} className="border-t border-zinc-100 hover:bg-zinc-50/60" data-testid={`audit-drill-row-${i}`}>
                <td className="px-3 py-2.5 font-mono text-zinc-800">#{e.order_id}</td>
                <td className="px-3 py-2.5"><span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span></td>
                <td className="px-3 py-2.5 text-zinc-600">{e.food_name || e.scope || '—'}</td>
                <td className="px-3 py-2.5 text-right font-medium text-zinc-900">{fmtINR(e.amount || e.discount_amount || 0)}</td>
                <td className="px-3 py-2.5 text-zinc-600">{e.by || '—'}</td>
                <td className="px-3 py-2.5 text-zinc-500 whitespace-nowrap">{fmtTime(e.cancel_time || e.discount_time || e.edit_time || '')}</td>
                <td className="px-3 py-2.5"><OverlapBadges cards={cards} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// --- Main Component ---
const AuditReportPage = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const downloadRef = useRef(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => localStorage.getItem('mygenie_sidebar_expanded') === 'true');
  const [isSilentMode, setIsSilentMode] = useState(false);
  const today = new Date();
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const [fromDate, setFromDate] = useState(sharedFrom);
  const [toDate, setToDate] = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo, setAppliedTo] = useState(sharedTo);
  const [activePreset, setActivePreset] = useState(() => matchPreset(sharedFrom, sharedTo)); // BUG-697: match applied range, not hard-coded 7D
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null); // 'card1' | 'card2' | 'card3' | null

  useEffect(() => { const h = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply = draftDirty && draftValid && !isLoading;
  const handleApply = () => { if (canApply) { setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset(''); } };
  const handlePreset = (p) => {
    const t = new Date(); let f;
    if (p === 'Today') f = t;
    else if (p === '7D') f = new Date(t.getTime() - 6 * 86400000);
    else if (p === 'LM') { const now = new Date(); const lf = fmtISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)); const lt = fmtISO(new Date(now.getFullYear(), now.getMonth(), 0)); setFromDate(lf); setToDate(lt); setAppliedFrom(lf); setAppliedTo(lt); setActivePreset(p); setSharedFrom(lf); setSharedTo(lt); return; }
    else if (p === '30D') f = new Date(t.getTime() - 29 * 86400000);
    else if (p === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); }
    else if (p === 'FY') { const range = computePresetRange('FY'); if (range) { setFromDate(range.from); setToDate(range.to); setAppliedFrom(range.from); setAppliedTo(range.to); setSharedFrom(range.from); setSharedTo(range.to); setActivePreset(p); } return; } // BUG-698: propagate FY range to shared Insights context (FY window unchanged, OD-698-01)
    else return;
    const fd = fmtISO(f); const td = fmtISO(t);
    setFromDate(fd); setToDate(td); setAppliedFrom(fd); setAppliedTo(td); setActivePreset(p); setSharedFrom(fd); setSharedTo(td);
  };

  const fetchData = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return;
    setIsLoading(true); setError(null);
    try { const r = await fetchInsightsDashboard(appliedFrom, appliedTo); setRawData(r.data || r); setHasLoadedOnce(true); }
    catch (e) { setError(e.message || 'Failed to load'); setRawData(null); /* BUG-722: clear stale KPIs/cards on error — also disables Download (analytics→null) */ }
    finally { setIsLoading(false); }
  }, [appliedFrom, appliedTo]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Analytics: classify events into cards ---
  const analytics = useMemo(() => {
    if (!rawData) return null;
    const audits = rawData.audits || {};
    const allEvents = audits.orders || [];

    // Card 1: late_cancel with duration >= 5 min (CR-543)
    const card1Events = allEvents.filter(e => e.type === 'late_cancel' && (e.duration_minutes >= 5 || getRiskTier(e.duration_minutes) !== 'ok'));
    const card1Doubt = card1Events.filter(e => (e.risk_level || getRiskTier(e.duration_minutes)) === 'doubt').length;
    const card1Risk = card1Events.filter(e => (e.risk_level || getRiskTier(e.duration_minutes)) === 'risk').length;
    const card1HighRisk = card1Events.filter(e => (e.risk_level || getRiskTier(e.duration_minutes)) === 'high_risk').length;
    const card1Leakage = card1Events.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    // Card 2: cancel_after_unpaid (delivered) + discount_after_unpaid (placeholder) (CR-544)
    const card2Events = allEvents.filter(e => CARD_2_TYPES.has(e.type));
    const card2Leakage = card2Events.reduce((s, e) => s + (parseFloat(e.amount) || parseFloat(e.discount_amount) || 0), 0);

    // Card 3: all after-print events (CR-528 + CR-546)
    const card3Events = allEvents.filter(e => CARD_3_TYPES.has(e.type));
    const card3Leakage = card3Events.reduce((s, e) => s + (parseFloat(e.amount) || parseFloat(e.discount_amount) || 0), 0);

    // KPI bar (D11, D13, D19): 4 items. BUG-739: "Total Events" = true event count (not unique orders)
    const makeUnpaidCount = audits.make_unpaid_count || allEvents.filter(e => e.type === 'make_unpaid').length;
    const payChangeCount = audits.payment_method_change_count || allEvents.filter(e => e.type === 'payment_method_change').length;
    const postPrintCount = card3Events.length;

    // Overlap counts for card headlines (D9 Approach C)
    const card1Ids = new Set(card1Events.map(e => e.order_id));
    const card2Ids = new Set(card2Events.map(e => e.order_id));
    const card3Ids = new Set(card3Events.map(e => e.order_id));
    const card1OverlapCard2 = [...card1Ids].filter(id => card2Ids.has(id)).length;
    const card1OverlapCard3 = [...card1Ids].filter(id => card3Ids.has(id)).length;
    const card2OverlapCard3 = [...card2Ids].filter(id => card3Ids.has(id)).length;

    return {
      allEvents, card1Events, card2Events, card3Events,
      card1Doubt, card1Risk, card1HighRisk, card1Leakage,
      card2Leakage, card3Leakage,
      totalEvents: allEvents.length, // BUG-739: true event count (was uniqueOrderIds.size); backend audits.total agrees
      makeUnpaidCount, payChangeCount, postPrintCount,
      card1OverlapCard2, card1OverlapCard3, card2OverlapCard3,
    };
  }, [rawData]);

  // --- Export ---
  const buildExportPayload = () => {
    if (!analytics) return null;
    return {
      title: 'Audit Report', subtitle: 'Theft detection: cancellations, unpaid leakage, post-print edits',
      restaurant: { name: restaurant?.name || '', id: restaurant?.id || '' }, dateRange: { from: appliedFrom, to: appliedTo }, // BUG-739: pass restaurant id → Excel Summary "Restaurant ID"
      generatedBy: (typeof localStorage !== 'undefined' && localStorage.getItem('user_email')) || restaurant?.name || '', // BUG-739: ownerName never existed → use logged-in user email
      kpis: [
        { label: 'Total Events', value: analytics.totalEvents, format: 'text' },
        { label: 'Made Unpaid', value: analytics.makeUnpaidCount, format: 'text' },
        { label: 'Pay Method Changed', value: analytics.payChangeCount, format: 'text' },
        { label: 'Post-Print Edits', value: analytics.postPrintCount, format: 'text' },
      ],
      sheets: [
        { name: 'High Risk Cancellations', columns: [
          { key: 'order_id', label: 'Order', format: 'text', width: 80 },
          { key: 'risk_level', label: 'Risk', format: 'text', width: 80 },
          { key: 'duration_minutes', label: 'Duration (min)', format: 'text', width: 80 },
          { key: 'amount', label: 'Amount', format: 'inr', width: 100 },
          { key: 'by', label: 'By', format: 'text', width: 100 },
          { key: 'scope', label: 'Scope', format: 'text', width: 80 },
        ], rows: analytics.card1Events },
        { name: 'Leakage After Unpaid', columns: [
          { key: 'order_id', label: 'Order', format: 'text', width: 80 },
          { key: 'type', label: 'Type', format: 'text', width: 160 },
          { key: 'amount', label: 'Amount', format: 'inr', width: 100 },
          { key: 'by', label: 'By', format: 'text', width: 100 },
          { key: 'gap_minutes', label: 'Gap (min)', format: 'text', width: 80 },
        ], rows: analytics.card2Events },
        { name: 'Leakage After Print', columns: [
          { key: 'order_id', label: 'Order', format: 'text', width: 80 },
          { key: 'type', label: 'Type', format: 'text', width: 160 },
          { key: 'food_name', label: 'Item', format: 'text', width: 120 },
          { key: 'amount', label: 'Amount', format: 'inr', width: 100 },
          { key: 'by', label: 'By', format: 'text', width: 100 },
          { key: 'bill_printed_at', label: 'Bill Printed', format: 'text', width: 140 },
        ], rows: analytics.card3Events },
      ],
    };
  };
  const handleDownloadAction = (action) => {
    let pw = null; if (action === 'pdf') pw = openReportWindow();
    setShowDownloadMenu(false);
    if (['email', 'whatsapp', 'sms'].includes(action)) return;
    try { const p = buildExportPayload(); if (!p) return; if (action === 'excel') exportReportAsExcel(p); else if (action === 'pdf') exportReportAsPDF(pw, p); }
    catch (e) { console.error(e); if (pw && !pw.closed) pw.close(); }
  };

  const toggleCard = (card) => setExpandedCard(prev => prev === card ? null : card);

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="audit-report-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={fetchData} isRefreshing={isLoading} isOrderEntryOpen={false} />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          {/* Header — preserved from v2 */}
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0 flex-wrap gap-y-3" data-testid="audit-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg" data-testid="audit-back-btn" onClick={() => navigate('/reports-module/dashboard')}><ArrowLeft className="w-5 h-5 text-zinc-600" /></button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Audit Report</h1>
                <p className="text-[11px] text-zinc-500 mt-0.5">Theft detection: late cancellations, unpaid leakage, post-print edits</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="audit-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">From</span><input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="audit-date-from" /></label>
                <span className="text-zinc-300">—</span>
                <label className="flex items-center gap-1.5 text-sm"><span className="text-xs text-zinc-400 uppercase">To</span><input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="audit-date-to" /></label>
              </div>
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${canApply ? 'bg-[#329937] text-white shadow-sm' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="audit-apply-btn"><Check className="w-4 h-4" /> Apply</button>
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg" data-testid="audit-presets">{DATE_PRESETS.map(p => (<button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50'}`} onClick={() => handlePreset(p)}>{p}</button>))}</div>
              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu(v => !v)} disabled={isLoading || !analytics} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 shadow-sm ${isLoading || !analytics ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="audit-download-trigger"><Download className="w-4 h-4" /> Download</button>
                {showDownloadMenu && (<div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">{DOWNLOAD_MENU.map(item => (<button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}><item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} /><span className="text-sm font-medium">{item.label}</span></button>))}</div>)}
              </div>
            </div>
          </header>

          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={fetchData}>
            <div className="flex-1 overflow-auto p-6">
              {analytics && (
                <div className="space-y-5 max-w-6xl mx-auto">

                  {/* KPI Bar — 4 cards (D11, D19: Post-Unpaid Edits deferred) */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="audit-kpi-bar">
                    <KpiCard icon={ShieldAlert} label="Total Events" value={analytics.totalEvents} color="#78716C" borderColor="#E5E5E5" testId="audit-kpi-total" />
                    <KpiCard icon={AlertTriangle} label="Made Unpaid" value={analytics.makeUnpaidCount} color="#DC2626" borderColor="#FECACA" testId="audit-kpi-unpaid" />
                    <KpiCard icon={RefreshCw} label="Pay Method Changed" value={analytics.payChangeCount} color="#D97706" borderColor="#FDE68A" testId="audit-kpi-paychange" />
                    <KpiCard icon={XCircle} label="Post-Print Edits" value={analytics.postPrintCount} color="#EA580C" borderColor="#FED7AA" testId="audit-kpi-postprint" />
                  </div>

                  {/* Card 1 — High Risk Cancellations (CR-543) */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="audit-card1">
                    {/* BUG-695: outer toggle is a div (role=button) so the inner "Cancellation Report" <button> is not nested inside a <button> (invalid HTML) */}
                    <div role="button" tabIndex={0} onClick={() => toggleCard('card1')} onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard('card1'); } }} className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-50/50 transition-colors cursor-pointer text-left" data-testid="audit-card1-toggle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                          <Clock className="w-5 h-5" style={{ color: '#991B1B' }} />
                        </div>
                        <div className="text-left">
                          <h3 className="text-base font-bold text-zinc-900">High Risk Cancellations</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {analytics.card1Events.length} events {analytics.card1Leakage > 0 && <span className="font-semibold text-red-700">· {fmtINR(analytics.card1Leakage)} leakage</span>}
                            {analytics.card1OverlapCard2 > 0 && <span className="text-zinc-400"> · {analytics.card1OverlapCard2} also After Unpaid</span>}
                            {analytics.card1OverlapCard3 > 0 && <span className="text-zinc-400"> · {analytics.card1OverlapCard3} also After Print</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={(ev) => { ev.stopPropagation(); navigate('/reports-module/cancellations'); }} className="text-xs text-emerald-700 font-medium hover:underline flex items-center gap-1" data-testid="audit-card1-link"><ExternalLink className="w-3 h-3" /> Cancellation Report</button>
                        {expandedCard === 'card1' ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                      </div>
                    </div>
                    {/* Risk bar always visible */}
                    <div className="px-6 pb-4 border-t border-zinc-100">
                      <RiskBar doubt={analytics.card1Doubt} risk={analytics.card1Risk} highRisk={analytics.card1HighRisk} />
                    </div>
                    {/* Drill-down (expandable) */}
                    {expandedCard === 'card1' && (
                      <div className="border-t border-zinc-100">
                        <DrillDownTable events={analytics.card1Events} testId="audit-card1-table" />
                      </div>
                    )}
                  </div>

                  {/* Card 2 — Leakage After Unpaid (CR-544, Option B partial) */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="audit-card2">
                    <button onClick={() => toggleCard('card2')} className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-50/50 transition-colors" data-testid="audit-card2-toggle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                          <AlertTriangle className="w-5 h-5" style={{ color: '#92400E' }} />
                        </div>
                        <div className="text-left">
                          <h3 className="text-base font-bold text-zinc-900">Leakage After Unpaid</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {analytics.card2Events.length} events {analytics.card2Leakage > 0 && <span className="font-semibold text-amber-700">· {fmtINR(analytics.card2Leakage)} leakage</span>}
                            {analytics.card2OverlapCard3 > 0 && <span className="text-zinc-400"> · {analytics.card2OverlapCard3} also After Print</span>}
                          </p>
                        </div>
                      </div>
                      {expandedCard === 'card2' ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                    </button>
                    {expandedCard === 'card2' && (
                      <div className="border-t border-zinc-100">
                        {/* Live: cancel_after_unpaid rows */}
                        <DrillDownTable events={analytics.card2Events} testId="audit-card2-table" />
                        {/* Placeholder: discount_after_unpaid (NEW-1 not delivered) */}
                        <div className="px-6 py-4 border-t border-zinc-100 bg-amber-50/30" data-testid="audit-card2-placeholder-discount">
                          <div className="flex items-center gap-2 text-xs text-amber-700">
                            <Info className="w-3.5 h-3.5" />
                            <span className="font-medium">Discount events after unpaid: Awaiting backend delivery (NEW-1)</span>
                          </div>
                        </div>
                        {/* Placeholder: repay_gap (NEW-2 not delivered) */}
                        <div className="px-6 py-4 border-t border-zinc-100 bg-amber-50/30" data-testid="audit-card2-placeholder-gap">
                          <div className="flex items-center gap-2 text-xs text-amber-700">
                            <Info className="w-3.5 h-3.5" />
                            <span className="font-medium">Re-pay gap analysis: Awaiting backend delivery (NEW-2)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card 3 — Leakage After Print (CR-528 + CR-546) */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden" data-testid="audit-card3">
                    <button onClick={() => toggleCard('card3')} className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-50/50 transition-colors" data-testid="audit-card3-toggle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFEDD5' }}>
                          <Ban className="w-5 h-5" style={{ color: '#9A3412' }} />
                        </div>
                        <div className="text-left">
                          <h3 className="text-base font-bold text-zinc-900">Leakage After Print</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {analytics.card3Events.length} events {analytics.card3Leakage > 0 && <span className="font-semibold text-orange-700">· {fmtINR(analytics.card3Leakage)} leakage</span>}
                          </p>
                        </div>
                      </div>
                      {expandedCard === 'card3' ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                    </button>
                    {expandedCard === 'card3' && (
                      <div className="border-t border-zinc-100">
                        <DrillDownTable events={analytics.card3Events} testId="audit-card3-table" />
                      </div>
                    )}
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

export default AuditReportPage;
