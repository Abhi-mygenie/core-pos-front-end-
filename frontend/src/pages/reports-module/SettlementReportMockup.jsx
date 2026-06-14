/**
 * SettlementReportMockup — CR-016 Settlement History (Insights Module)
 *
 * Date-range view of past settlement summaries with per-waiter drill-down.
 * Pattern: clones Order Ledger (S6) layout — Sidebar + header + ReportLoadingShield.
 * API: reuses CR-015 POST /waiter/get-settlement-report (multi-day mode).
 *
 * Owner decisions (2026-06-09):
 *   Q1: Show ALL days including zero-activity
 *   Q2: Skip Day Status column (API lacks per-day stattlement_status)
 *   Q3: Max range = 365 days (1 year)
 *   Q4: Sidebar position = before Sales
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import useReportFetch from '../../components/reports/useReportFetch';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { getSettlementForRange } from '../../api/services/settlementReportService';
import { formatDateForAPI } from '../../api/transforms/settlementTransform';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import {
  ArrowLeft, Search, ChevronUp, ChevronDown, ChevronsUpDown, Download,
  FileSpreadsheet, FileDown, Mail, MessageCircle, Send,
  Calendar as CalendarIcon, Check, RefreshCw, ChevronRight,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_RANGE_DAYS = 365;

const DOWNLOAD_MENU = [
  { id: 'excel',    label: 'Download as Excel',           icon: FileSpreadsheet, enabled: true,  testId: 'settlement-report-download-excel-btn' },
  { id: 'pdf',      label: 'Download as PDF',             icon: FileDown,        enabled: true,  testId: 'settlement-report-download-pdf-btn' },
  { id: 'email',    label: 'Send via Email (attachment)', icon: Mail,            enabled: false, testId: 'settlement-report-share-email-btn' },
  { id: 'whatsapp', label: 'Send via WhatsApp',           icon: MessageCircle,   enabled: false, testId: 'settlement-report-share-whatsapp-btn' },
  { id: 'sms',      label: 'Send via SMS',                icon: Send,            enabled: false, testId: 'settlement-report-share-sms-btn' },
];

const DAY_COLUMNS = [
  { key: 'formattedDate',   label: 'Date',             align: 'left',  sortKey: 'date' },
  { key: 'openingBalance',  label: 'Opening Balance',  align: 'right', sortKey: 'openingBalance' },
  { key: 'cashCollected',   label: 'Cash Collected',   align: 'right', sortKey: 'cashCollected' },
  { key: 'totalFunds',      label: 'Total Funds',      align: 'right', sortKey: 'totalFunds' },
  { key: 'settled',         label: 'Settled',           align: 'right', sortKey: 'settled' },
  { key: 'expected',        label: 'Expected',          align: 'right', sortKey: 'expected' },
  { key: 'pilferage',       label: 'Pilferage',         align: 'right', sortKey: 'pilferage' },
  { key: 'activeWaiters',   label: 'Active Waiters',    align: 'center', sortKey: 'activeWaiterCount' },
];

const WAITER_COLUMNS = [
  { key: 'name',           label: 'Name',             align: 'left' },
  { key: 'openingBalance', label: 'Opening',          align: 'right' },
  { key: 'cashCollected',  label: 'Cash Collected',   align: 'right' },
  { key: 'totalFunds',     label: 'Total Funds',      align: 'right' },
  { key: 'settled',        label: 'Settled',           align: 'right' },
  { key: 'expected',       label: 'Expected',          align: 'right' },
  { key: 'pilferage',      label: 'Pilferage',         align: 'right' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtCur = (v) => {
  if (v === null || v === undefined) return '—';
  const abs = Math.abs(v);
  const hasDecimals = abs % 1 !== 0;
  const formatted = abs.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 });
  return `${v < 0 ? '-' : ''}₹${formatted}`;
};

const fmtISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const daysDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// ══════════════════════════════════════════════════════════════════════════════
const SettlementReportMockup = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();

  // App shell
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);

  // ── Date range — default last 7 days ──────────────────────────────────────
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const [fromDate, setFromDate] = useState(sharedFrom);
  const [toDate, setToDate] = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo, setAppliedTo] = useState(sharedTo);
  const [activePreset, setActivePreset] = useState('7D');

  // Table state
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // Download
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadRef = useRef(null);

  // Click outside to close download menu
  useEffect(() => {
    const handler = (e) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── DATA FETCH ────────────────────────────────────────────────────────────
  const datesValid = appliedFrom && appliedTo && appliedFrom <= appliedTo;
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const draftRangeExceeded = draftValid && daysDiff(fromDate, toDate) > MAX_RANGE_DAYS;
  const canApply = draftDirty && draftValid && !draftRangeExceeded;
  const maxToDate = fromDate ? fmtISO(new Date(new Date(fromDate).getTime() + MAX_RANGE_DAYS * 86400000)) : '';
  const minFromDate = toDate ? fmtISO(new Date(new Date(toDate).getTime() - MAX_RANGE_DAYS * 86400000)) : '';

  const fetchFn = useCallback(
    () => {
      if (!datesValid) return Promise.resolve({ aggregateTotals: {}, days: [] });
      const apiFrom = formatDateForAPI(new Date(appliedFrom));
      const apiTo   = formatDateForAPI(new Date(appliedTo));
      return getSettlementForRange(apiFrom, apiTo);
    },
    [appliedFrom, appliedTo, datesValid]
  );

  const { data, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(fetchFn, [appliedFrom, appliedTo]);

  const aggregateTotals = data?.aggregateTotals || {};
  const allDays = data?.days || [];

  // ── Presets ───────────────────────────────────────────────────────────────
  const handlePreset = (p) => {
    setActivePreset(p);
    const now = new Date();
    let f = new Date(now);
    let t = new Date(now);
    if (p === 'Today') { /* f = t = today */ }
    else if (p === 'Yesterday') { f = new Date(now.getTime() - 86400000); t = new Date(now.getTime() - 86400000); }
    else if (p === '7D') f = new Date(now.getTime() - 6 * 86400000);
    else if (p === '30D') f = new Date(now.getTime() - 29 * 86400000);
    else if (p === '90D') f = new Date(now.getTime() - 89 * 86400000);
    else if (p === '365D') f = new Date(now.getTime() - 364 * 86400000);
    else if (p === 'MTD') f = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (p === 'YTD') f = new Date(now.getFullYear(), 0, 1);
    setFromDate(fmtISO(f)); setToDate(fmtISO(t));
    setAppliedFrom(fmtISO(f)); setAppliedTo(fmtISO(t));
    setExpandedDays(new Set());
  };

  const handleApply = () => {
    if (!canApply) return;
    setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset('');
    setExpandedDays(new Set());
  };

  // ── Filter / Sort ─────────────────────────────────────────────────────────
  const filteredDays = useMemo(() => {
    if (!searchQuery.trim()) return allDays;
    const q = searchQuery.toLowerCase();
    return allDays.filter((d) => d.formattedDate.toLowerCase().includes(q) || d.date.includes(q));
  }, [allDays, searchQuery]);

  const sortedDays = useMemo(() => {
    const s = [...filteredDays];
    s.sort((a, b) => {
      let va, vb;
      if (sortCol === 'date') { va = a.date; vb = b.date; }
      else if (sortCol === 'activeWaiterCount') { va = a.activeWaiterCount; vb = b.activeWaiterCount; }
      else { va = a.totals[sortCol] || 0; vb = b.totals[sortCol] || 0; }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return s;
  }, [filteredDays, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const toggleDay = (date) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  // ── Totals row ────────────────────────────────────────────────────────────
  const totalRow = useMemo(() => {
    if (sortedDays.length === 0) return null;
    return {
      openingBalance: sortedDays.reduce((s, d) => s + d.totals.openingBalance, 0),
      cashCollected:  sortedDays.reduce((s, d) => s + d.totals.cashCollected, 0),
      totalFunds:     sortedDays.reduce((s, d) => s + d.totals.totalFunds, 0),
      settled:        sortedDays.reduce((s, d) => s + d.totals.settled, 0),
      expected:       sortedDays.reduce((s, d) => s + d.totals.expected, 0),
      pilferage:      sortedDays.reduce((s, d) => s + Math.abs(d.totals.pilferage), 0),
      activeWaiters:  sortedDays.reduce((s, d) => s + d.activeWaiterCount, 0),
    };
  }, [sortedDays]);

  // ── Cell value helper ─────────────────────────────────────────────────────
  const dayCellVal = (day, col) => {
    if (col.key === 'formattedDate') return day.formattedDate;
    if (col.key === 'activeWaiters') return day.activeWaiterCount;
    if (col.key === 'pilferage') return fmtCur(Math.abs(day.totals.pilferage));
    const v = day.totals[col.key];
    if (v === undefined || v === null) return '—';
    return fmtCur(v);
  };

  const waiterExpected = (w) => w.totalFunds - w.settled - Math.abs(w.pilferage);

  // ── Sort icon ─────────────────────────────────────────────────────────────
  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 text-zinc-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#F26B33]" /> : <ChevronDown className="w-3 h-3 text-[#F26B33]" />;
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const buildExportPayload = () => {
    const daySummaryCols = [
      { key: 'date', label: 'Date', format: 'text', width: 120 },
      { key: 'openingBalance', label: 'Opening Balance', format: 'inr', align: 'right', width: 120 },
      { key: 'cashCollected', label: 'Cash Collected', format: 'inr', align: 'right', width: 120 },
      { key: 'totalFunds', label: 'Total Funds', format: 'inr', align: 'right', width: 120 },
      { key: 'settled', label: 'Settled', format: 'inr', align: 'right', width: 100 },
      { key: 'expected', label: 'Expected', format: 'inr', align: 'right', width: 100 },
      { key: 'pilferage', label: 'Pilferage', format: 'inr', align: 'right', width: 100 },
      { key: 'activeWaiters', label: 'Active Waiters', format: 'number', align: 'center', width: 100 },
    ];

    const daySummaryRows = sortedDays.map((d) => ({
      date: d.formattedDate,
      openingBalance: d.totals.openingBalance,
      cashCollected: d.totals.cashCollected,
      totalFunds: d.totals.totalFunds,
      settled: d.totals.settled,
      expected: d.totals.expected,
      pilferage: Math.abs(d.totals.pilferage),
      activeWaiters: d.activeWaiterCount,
    }));

    const daySummaryTotals = totalRow ? {
      label: 'TOTAL',
      openingBalance: totalRow.openingBalance,
      cashCollected: totalRow.cashCollected,
      totalFunds: totalRow.totalFunds,
      settled: totalRow.settled,
      expected: totalRow.expected,
      pilferage: totalRow.pilferage,
      activeWaiters: totalRow.activeWaiters,
    } : undefined;

    const waiterDetailCols = [
      { key: 'date', label: 'Date', format: 'text', width: 120 },
      { key: 'name', label: 'Waiter', format: 'text', width: 150 },
      { key: 'openingBalance', label: 'Opening', format: 'inr', align: 'right', width: 100 },
      { key: 'cashCollected', label: 'Cash Collected', format: 'inr', align: 'right', width: 120 },
      { key: 'totalFunds', label: 'Total Funds', format: 'inr', align: 'right', width: 120 },
      { key: 'settled', label: 'Settled', format: 'inr', align: 'right', width: 100 },
      { key: 'expected', label: 'Expected', format: 'inr', align: 'right', width: 100 },
      { key: 'pilferage', label: 'Pilferage', format: 'inr', align: 'right', width: 100 },
    ];

    const waiterDetailRows = [];
    sortedDays.forEach((d) => {
      d.waiters.forEach((w) => {
        waiterDetailRows.push({
          date: d.formattedDate,
          name: w.name,
          openingBalance: w.openingBalance,
          cashCollected: w.cashCollected,
          totalFunds: w.totalFunds,
          settled: w.settled,
          expected: waiterExpected(w),
          pilferage: Math.abs(w.pilferage),
        });
      });
    });

    return {
      title: 'Settlement Report',
      restaurant: { name: restaurant?.name, id: restaurant?.id, address: restaurant?.address },
      dateRange: { from: appliedFrom, to: appliedTo },
      kpis: [
        { label: 'Total Opening Balance', value: aggregateTotals.openingBalance || 0, format: 'inr' },
        { label: 'Total Cash Collected', value: aggregateTotals.cashCollected || 0, format: 'inr' },
        { label: 'Total Settled', value: aggregateTotals.settled || 0, format: 'inr' },
        { label: 'Total Expected', value: aggregateTotals.expected || 0, format: 'inr' },
        { label: 'Total Pilferage', value: Math.abs(aggregateTotals.pilferage || 0), format: 'inr', tone: (aggregateTotals.pilferage || 0) !== 0 ? 'warn' : '' },
      ],
      sheets: [
        { name: 'Day Summary', columns: daySummaryCols, rows: daySummaryRows, totals: daySummaryTotals },
        { name: 'Waiter Detail', columns: waiterDetailCols, rows: waiterDetailRows },
      ],
    };
  };

  const handleDownloadAction = (action) => {
    let pdfWin = null;
    if (action === 'pdf') pdfWin = openReportWindow();
    setShowDownloadMenu(false);
    if (['email', 'whatsapp', 'sms'].includes(action)) return;
    try {
      const payload = buildExportPayload();
      if (action === 'excel') exportReportAsExcel(payload);
      else if (action === 'pdf') exportReportAsPDF(pdfWin, payload);
    } catch (e) {
      console.error('export failed:', e);
      if (pdfWin && !pdfWin.closed) pdfWin.close();
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen bg-white font-sans" data-testid="settlement-report-page">
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode}
        setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}}
        onOpenMenu={() => {}}
        onOpenCredit={() => {}}
        onRefresh={refetch}
        isRefreshing={isLoading}
        isOrderEntryOpen={false}
      />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="settlement-report-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="settlement-report-back-btn" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5 text-zinc-600" />
              </button>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }} data-testid="settlement-report-title">
                Settlement Report
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* From-To range */}
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid && !draftRangeExceeded ? 'border-[#F26B33]' : draftRangeExceeded ? 'border-red-400' : 'border-zinc-200'} bg-white rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="settlement-report-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isLoading} min={minFromDate} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="settlement-report-from-date" />
                </label>
                <span className="text-zinc-300">—</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isLoading} max={maxToDate && maxToDate < fmtISO(today) ? maxToDate : fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="settlement-report-to-date" />
                </label>
                {draftRangeExceeded && <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Max {MAX_RANGE_DAYS} days</span>}
              </div>

              {/* Apply */}
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="settlement-report-apply-btn">
                <Check className="w-4 h-4" /> Apply
              </button>

              {/* Presets */}
              <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="settlement-report-presets">
                {['Today', 'Yesterday', '7D', '30D', '90D', '365D', 'MTD', 'YTD'].map((p) => (
                  <button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'}`} data-testid={`settlement-report-preset-${p.toLowerCase()}`} onClick={() => handlePreset(p)}>
                    {p}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button onClick={refetch} disabled={isLoading} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="settlement-report-refresh-btn">
                <RefreshCw className={`w-4 h-4 text-zinc-500 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Download */}
              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || allDays.length === 0} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 transition-colors shadow-sm ${isLoading || allDays.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="settlement-report-download-btn">
                  <Download className="w-4 h-4" /> Download
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="settlement-report-download-menu">
                    {DOWNLOAD_MENU.map((item) => (
                      <button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}>
                        <item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ── Content (wrapped in ReportLoadingShield) ─────────────────── */}
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
            <div className="flex-1 overflow-auto p-8">
              {/* KPI Strip */}
              <div className="grid grid-cols-5 gap-4 mb-6" data-testid="settlement-report-kpi-strip">
                <KPICard label="Total Opening Balance" value={aggregateTotals.openingBalance} testId="settlement-report-kpi-opening" />
                <KPICard label="Total Cash Collected" value={aggregateTotals.cashCollected} testId="settlement-report-kpi-collected" />
                <KPICard label="Total Settled" value={aggregateTotals.settled} testId="settlement-report-kpi-settled" tone="green" />
                <KPICard label="Total Expected" value={aggregateTotals.expected} testId="settlement-report-kpi-expected" />
                <KPICard label="Total Pilferage" value={aggregateTotals.pilferage != null ? Math.abs(aggregateTotals.pilferage) : 0} testId="settlement-report-kpi-pilferage" tone={aggregateTotals.pilferage && aggregateTotals.pilferage !== 0 ? 'amber' : undefined} />
              </div>

              {/* Search */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type="text" placeholder="Search by date..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B33]/20 focus:border-[#F26B33]" data-testid="settlement-report-search" />
                </div>
                <span className="text-xs text-zinc-400">{sortedDays.length} day{sortedDays.length !== 1 ? 's' : ''} in range</span>
              </div>

              {/* Day Summary Table */}
              {sortedDays.length === 0 && hasLoadedOnce ? (
                <div className="text-center py-16 text-zinc-400" data-testid="settlement-report-empty">
                  <p className="text-lg font-medium">No settlement data for this range</p>
                  <p className="text-sm mt-1">Try selecting a different date range</p>
                </div>
              ) : (
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm" data-testid="settlement-report-day-table">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="w-8 px-3 py-3" />
                        {DAY_COLUMNS.map((col) => (
                          <th key={col.key} className={`px-4 py-3 font-medium text-zinc-600 cursor-pointer hover:text-zinc-900 select-none ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`} onClick={() => handleSort(col.sortKey)}>
                            <span className="inline-flex items-center gap-1">
                              {col.label} <SortIcon col={col.sortKey} />
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDays.map((day) => {
                        const isExpanded = expandedDays.has(day.date);
                        const hasPilferage = Math.abs(day.totals.pilferage) > 0;
                        return (
                          <React.Fragment key={day.date}>
                            <tr
                              className={`border-b border-zinc-100 cursor-pointer transition-colors ${isExpanded ? 'bg-zinc-50' : hasPilferage ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-zinc-50'}`}
                              onClick={() => toggleDay(day.date)}
                              data-testid={`settlement-report-day-row-${day.date}`}
                            >
                              <td className="px-3 py-3">
                                <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </td>
                              {DAY_COLUMNS.map((col) => (
                                <td key={col.key} className={`px-4 py-3 ${col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : ''} ${col.key === 'pilferage' && hasPilferage ? 'text-amber-700 font-semibold' : 'text-zinc-800'}`}>
                                  {dayCellVal(day, col)}
                                </td>
                              ))}
                            </tr>
                            {/* Expanded: per-waiter detail */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={DAY_COLUMNS.length + 1} className="bg-zinc-50 px-0 py-0">
                                  <div className="px-12 py-4">
                                    <div className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">
                                      Waiters — {day.formattedDate} ({day.waiters.length} waiter{day.waiters.length !== 1 ? 's' : ''})
                                    </div>
                                    {day.waiters.length === 0 ? (
                                      <p className="text-xs text-zinc-400 italic">No waiter data for this day</p>
                                    ) : (
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-zinc-200">
                                            {WAITER_COLUMNS.map((wc) => (
                                              <th key={wc.key} className={`px-3 py-2 font-medium text-zinc-500 ${wc.align === 'right' ? 'text-right' : 'text-left'}`}>
                                                {wc.label}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {day.waiters.map((w) => {
                                            const wPilferage = Math.abs(w.pilferage);
                                            return (
                                              <tr key={w.waiterId} className={`border-b border-zinc-100 ${wPilferage > 0 ? 'bg-amber-50/50' : ''}`} data-testid={`settlement-report-waiter-row-${w.waiterId}`}>
                                                <td className="px-3 py-2 text-zinc-800 font-medium">{w.name || '—'}</td>
                                                <td className="px-3 py-2 text-right font-mono text-zinc-700">{fmtCur(w.openingBalance)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-zinc-700">{fmtCur(w.cashCollected)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-zinc-700">{fmtCur(w.totalFunds)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-zinc-700">{fmtCur(w.settled)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-zinc-700">{fmtCur(waiterExpected(w))}</td>
                                                <td className={`px-3 py-2 text-right font-mono ${wPilferage > 0 ? 'text-amber-700 font-semibold' : 'text-zinc-700'}`}>{fmtCur(wPilferage)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {/* TOTAL row */}
                      {totalRow && (
                        <tr className="bg-zinc-100 border-t-2 border-zinc-300 font-semibold" data-testid="settlement-report-total-row">
                          <td className="px-3 py-3" />
                          <td className="px-4 py-3 text-zinc-900">TOTAL ({sortedDays.length})</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-900">{fmtCur(totalRow.openingBalance)}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-900">{fmtCur(totalRow.cashCollected)}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-900">{fmtCur(totalRow.totalFunds)}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-900">{fmtCur(totalRow.settled)}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-900">{fmtCur(totalRow.expected)}</td>
                          <td className={`px-4 py-3 text-right font-mono ${totalRow.pilferage > 0 ? 'text-amber-700' : 'text-zinc-900'}`}>{fmtCur(totalRow.pilferage)}</td>
                          <td className="px-4 py-3 text-center text-zinc-900">{totalRow.activeWaiters}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

// ── KPI Card sub-component ──────────────────────────────────────────────────
const KPICard = ({ label, value, testId, tone }) => {
  const displayValue = fmtCur(value || 0);
  const toneClass = tone === 'amber' ? 'text-amber-700' : tone === 'green' ? 'text-green-700' : 'text-zinc-900';

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm" data-testid={testId}>
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-semibold font-mono ${toneClass}`}>{displayValue}</div>
    </div>
  );
};

export default SettlementReportMockup;
