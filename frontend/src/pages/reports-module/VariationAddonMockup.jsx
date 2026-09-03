// VariationAddonMockup.jsx — CR-136
//
// Variation & Addon Sales Report
// Route: /reports-module/variation-addon-sales
// Data: order-logs-report + FE aggregation of item.variations + item.addOns
// Tabs: Variations | Addons

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import useReportFetch from '../../components/reports/useReportFetch';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { getVariationAddonSalesForRange } from '../../api/services/variationAddonService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import {
  ArrowLeft, Search, Download, ChevronDown, ChevronUp, ChevronsUpDown,
  Check, X, CalendarIcon, FileSpreadsheet, FileDown, Layers, ShoppingBag,
} from 'lucide-react';

const fmtCur = (v) => {
  if (!v && v !== 0) return '—';
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

// ── Column definitions ────────────────────────────────────────────────────────
const VAR_COLUMNS = [
  { key: 'rank',         label: '#',             align: 'center' },
  { key: 'foodItem',     label: 'Food Item',      align: 'left'   },
  { key: 'variantGroup', label: 'Group',          align: 'left'   },
  { key: 'variantName',  label: 'Variant',        align: 'left'   },
  { key: 'qty',          label: 'Times Ordered',  align: 'right'  },
  { key: 'revenue',      label: 'Revenue',        align: 'right'  },
];

const ADD_COLUMNS = [
  { key: 'rank',          label: '#',             align: 'center' },
  { key: 'addonName',     label: 'Addon Name',    align: 'left'   },
  { key: 'dishCount',     label: 'Dishes',        align: 'right'  },
  { key: 'foodItemsList', label: 'Applied To',    align: 'left'   },
  { key: 'qty',           label: 'Times Ordered', align: 'right'  },
  { key: 'revenue',       label: 'Revenue',       align: 'right'  },
];

// ══════════════════════════════════════════════════════════════════════════════
const VariationAddonMockup = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const schedules    = useMemo(() => restaurant?.schedules || [], [restaurant?.schedules]);
  const restaurantId = restaurant?.id || 0;

  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const today = new Date();
  const [fromDate, setFromDate]     = useState(sharedFrom);
  const [toDate,   setToDate]       = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo,   setAppliedTo]   = useState(sharedTo);
  const [activePreset, setActivePreset] = useState('7D');

  const [activeTab,   setActiveTab]   = useState('variations');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol,     setSortCol]     = useState('revenue');
  const [sortDir,     setSortDir]     = useState('desc');
  const [showDlMenu,  setShowDlMenu]  = useState(false);
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  const [isSilentMode,      setIsSilentMode]      = useState(false);

  const dlRef = React.useRef(null);

  React.useEffect(() => {
    const h = (e) => { if (dlRef.current && !dlRef.current.contains(e.target)) setShowDlMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply   = draftDirty && draftValid;
  const datesValid = appliedFrom && appliedTo && appliedFrom <= appliedTo;

  const handlePreset = (p) => {
    setActivePreset(p);
    const now = new Date(); let f = new Date(now);
    if (p === '7D')  f = new Date(now.getTime() - 6 * 86400000);
    else if (p === '30D') f = new Date(now.getTime() - 29 * 86400000);
    else if (p === 'MTD') f = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (p === '1Y')  f = new Date(now.getTime() - 364 * 86400000);
    const fs = fmtISO(f); const ts = fmtISO(now);
    setFromDate(fs); setToDate(ts);
    setAppliedFrom(fs); setAppliedTo(ts); setSharedFrom(fs); setSharedTo(ts);
  };
  const handleApply = () => {
    if (!canApply) return;
    setAppliedFrom(fromDate); setAppliedTo(toDate);
    setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset('');
  };

  const fetchFn = useCallback(
    () => datesValid
      ? getVariationAddonSalesForRange(appliedFrom, appliedTo, schedules, restaurantId)
      : Promise.resolve({ variations: [], addons: [], meta: {} }),
    [appliedFrom, appliedTo, schedules, restaurantId, datesValid]
  );
  const { data, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(
    fetchFn, [appliedFrom, appliedTo, schedules, restaurantId]
  );
  const variations = useMemo(() => data?.variations || [], [data]);
  const addons     = useMemo(() => data?.addons     || [], [data]);
  const meta       = data?.meta       || {};

  // Active dataset for the current tab
  const activeRows = activeTab === 'variations' ? variations : addons;
  const activeCols = activeTab === 'variations' ? VAR_COLUMNS : ADD_COLUMNS;

  // Search
  const searchedRows = useMemo(() => {
    if (!searchQuery.trim()) return activeRows;
    const q = searchQuery.toLowerCase();
    return activeRows.filter(r =>
      (r.foodItem || r.addonName || '').toLowerCase().includes(q) ||
      (r.variantName || r.foodItemsList || '').toLowerCase().includes(q)
    );
  }, [activeRows, searchQuery]);

  // Sort
  const sortedRows = useMemo(() => {
    const s = [...searchedRows];
    s.sort((a, b) => {
      const va = a[sortCol]; const vb = b[sortCol];
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc'
        ? String(va || '').localeCompare(String(vb || ''))
        : String(vb || '').localeCompare(String(va || ''));
    });
    return s;
  }, [searchedRows, sortCol, sortDir]);

  const handleSort = (key) => {
    sortCol === key ? setSortDir(d => d === 'asc' ? 'desc' : 'asc') : (setSortCol(key), setSortDir('desc'));
  };

  // KPIs
  const varKpis = useMemo(() => ({
    unique:  variations.length,
    qty:     variations.reduce((s, r) => s + r.qty, 0),
    revenue: variations.reduce((s, r) => s + r.revenue, 0),
  }), [variations]);
  const addKpis = useMemo(() => ({
    unique:  addons.length,
    qty:     addons.reduce((s, r) => s + r.qty, 0),
    revenue: addons.reduce((s, r) => s + r.revenue, 0),
    dishes:  new Set(addons.flatMap(a => a.foodItemsList?.split(', ') || [])).size,
  }), [addons]);

  // Column totals
  const columnTotals = useMemo(() => {
    if (!sortedRows.length) return null;
    return {
      qty:     sortedRows.reduce((s, r) => s + (r.qty || 0), 0),
      revenue: sortedRows.reduce((s, r) => s + (r.revenue || 0), 0),
    };
  }, [sortedRows]);

  // Export
  const buildExportPayload = () => {
    const makeExportCols = (cols) => cols.map(c => ({
      key: c.key, label: c.label,
      format: c.key === 'revenue' ? 'inr' : 'text',
      align: c.align, width: c.key === 'foodItem' || c.key === 'foodItemsList' ? 200 : 100,
    }));
    const makeTotals = (rows, cols) => {
      const t = { foodItem: `TOTAL (${rows.length})`, addonName: `TOTAL (${rows.length})` };
      if (cols.find(c => c.key === 'qty'))     t.qty     = rows.reduce((s,r) => s+(r.qty||0), 0);
      if (cols.find(c => c.key === 'revenue')) t.revenue = rows.reduce((s,r) => s+(r.revenue||0), 0);
      return t;
    };
    return {
      title: 'Variation & Addon Sales',
      dateRange: { from: appliedFrom, to: appliedTo },
      kpis: [
        { label: 'Unique Variations', value: varKpis.unique,  format: 'text' },
        { label: 'Variation Revenue', value: varKpis.revenue, format: 'inr'  },
        { label: 'Unique Addons',     value: addKpis.unique,  format: 'text' },
        { label: 'Addon Revenue',     value: addKpis.revenue, format: 'inr'  },
      ],
      sheets: [
        { name: 'Variations', columns: makeExportCols(VAR_COLUMNS), rows: variations, totals: makeTotals(variations, VAR_COLUMNS) },
        { name: 'Addons',     columns: makeExportCols(ADD_COLUMNS), rows: addons,     totals: makeTotals(addons, ADD_COLUMNS)     },
      ],
    };
  };
  const handleDownload = (action) => {
    setShowDlMenu(false);
    if (action === 'excel') { exportReportAsExcel(buildExportPayload(), `Variation_Addon_${appliedFrom}_${appliedTo}`); return; }
    if (action === 'pdf')   { const w = openReportWindow(); exportReportAsPDF(w, buildExportPayload()); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 text-zinc-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#F26B33]" /> : <ChevronDown className="w-3 h-3 text-[#F26B33]" />;
  };

  const cellVal = (row, col) => {
    if (col.key === 'rank') return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-semibold">{row.rank}</span>
    );
    const v = row[col.key];
    if (v === undefined || v === null || v === '') return <span className="text-zinc-300">—</span>;
    if (col.key === 'revenue') return v === 0 ? <span className="text-zinc-300">—</span> : <span className="font-semibold text-[#F26B33] tabular-nums">{fmtCur(v)}</span>;
    if (col.key === 'foodItemsList') return <span className="text-xs text-zinc-500">{v}</span>;
    if (typeof v === 'number') return v;
    return String(v);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-white" data-testid="var-addon-page">
      <Sidebar
        isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }}
        isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={refetch} isRefreshing={isLoading} isOrderEntryOpen={false}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="var-addon-header">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" onClick={() => navigate('/reports-module/dashboard')} data-testid="var-addon-back-btn">
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Variation & Addon Sales</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="var-addon-daterange">
              <CalendarIcon className="w-4 h-4 text-zinc-400" />
              <span className="text-[10px] text-zinc-400 uppercase tracking-wide">From</span>
              <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setActivePreset(''); }}
                max={fmtISO(today)} disabled={isLoading}
                className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer p-0" data-testid="var-addon-date-from" />
              <span className="text-zinc-300">—</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wide">To</span>
              <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setActivePreset(''); }}
                max={fmtISO(today)} disabled={isLoading}
                className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer p-0" data-testid="var-addon-date-to" />
            </div>

            <button onClick={handleApply} disabled={!canApply || isLoading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${canApply ? 'bg-[#329937] text-white hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}
              data-testid="var-addon-apply-btn">
              <Check className="w-4 h-4" /> Apply
            </button>

            <div className="flex items-center gap-0.5 bg-zinc-100 rounded-lg p-1" data-testid="var-addon-presets">
              {['Today','7D','30D','MTD','1Y'].map(p => (
                <button key={p} onClick={() => handlePreset(p)} disabled={isLoading}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/60'}`}
                  data-testid={`var-addon-preset-${p.toLowerCase()}`}>{p}</button>
              ))}
            </div>

            <div className="relative" ref={dlRef}>
              <button onClick={() => setShowDlMenu(v => !v)}
                disabled={isLoading || (!variations.length && !addons.length)}
                className={`flex items-center gap-1.5 px-3 py-2 border border-[#F26B33] text-[#F26B33] rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors ${(isLoading || (!variations.length && !addons.length)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="var-addon-download-trigger">
                <Download className="w-4 h-4" /> Download <ChevronDown className="w-3 h-3" />
              </button>
              {showDlMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 py-1 min-w-[180px]">
                  <button onClick={() => handleDownload('excel')} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 w-full" data-testid="var-addon-download-excel">
                    <FileSpreadsheet className="w-4 h-4 text-zinc-500" /> Excel (.xlsx)
                  </button>
                  <button onClick={() => handleDownload('pdf')} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 w-full" data-testid="var-addon-download-pdf">
                    <FileDown className="w-4 h-4 text-zinc-500" /> PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* KPI Strip */}
        <div className="px-8 pt-4 pb-0 bg-white border-b border-zinc-100 shrink-0" data-testid="var-addon-kpi-strip">
          <div className="grid grid-cols-4 gap-3 pb-4">
            <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3" data-testid="kpi-var-unique">
              <div className="flex items-center gap-2 mb-1"><Layers className="w-4 h-4 text-zinc-400" /><span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Variations</span></div>
              <p className="text-2xl font-bold text-zinc-950" data-testid="kpi-var-unique-val">{varKpis.unique}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{varKpis.qty} total ordered</p>
            </div>
            <div className="bg-[#fff7f3] border border-[#fed7bc] rounded-xl px-4 py-3" data-testid="kpi-var-revenue">
              <div className="flex items-center gap-2 mb-1"><Layers className="w-4 h-4 text-[#F26B33]" /><span className="text-[10px] font-semibold uppercase tracking-wider text-[#F26B33]">Variation Revenue</span></div>
              <p className="text-2xl font-bold text-[#F26B33] tabular-nums" data-testid="kpi-var-revenue-val">{fmtCur(varKpis.revenue)}</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3" data-testid="kpi-add-unique">
              <div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-4 h-4 text-zinc-400" /><span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Addons</span></div>
              <p className="text-2xl font-bold text-zinc-950" data-testid="kpi-add-unique-val">{addKpis.unique}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{addKpis.qty} total ordered · {addKpis.dishes} dishes</p>
            </div>
            <div className="bg-[#fff7f3] border border-[#fed7bc] rounded-xl px-4 py-3" data-testid="kpi-add-revenue">
              <div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-4 h-4 text-[#F26B33]" /><span className="text-[10px] font-semibold uppercase tracking-wider text-[#F26B33]">Addon Revenue</span></div>
              <p className="text-2xl font-bold text-[#F26B33] tabular-nums" data-testid="kpi-add-revenue-val">{fmtCur(addKpis.revenue)}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5" data-testid="var-addon-tabs">
            {[
              { id: 'variations', label: 'Variations', count: variations.length },
              { id: 'addons',     label: 'Addons',     count: addons.length     },
            ].map(t => {
              const active = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => { setActiveTab(t.id); setSearchQuery(''); setSortCol('revenue'); setSortDir('desc'); }}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${active ? 'text-[#F26B33] border-[#F26B33]' : 'text-zinc-500 border-transparent hover:text-zinc-700'}`}
                  data-testid={`var-addon-tab-${t.id}`}>
                  {t.label} <span className="ml-1.5 opacity-60 text-[11px]">{t.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
          <div className="flex-1 overflow-auto p-8 bg-zinc-50">
            {/* Search + meta */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 bg-white rounded-lg w-60">
                <Search className="w-4 h-4 text-zinc-400" />
                <input type="text" placeholder={activeTab === 'variations' ? 'Search food item or variant…' : 'Search addon name…'}
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 outline-none text-sm text-zinc-800 placeholder:text-zinc-400 w-full p-0"
                  data-testid="var-addon-search" />
                {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-3.5 h-3.5 text-zinc-400" /></button>}
              </div>
              <span className="text-xs text-zinc-400" data-testid="var-addon-meta">
                {sortedRows.length} {activeTab === 'variations' ? 'variations' : 'addons'} · {appliedFrom} → {appliedTo}
              </span>
            </div>

            {/* Table */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm" data-testid="var-addon-table-container">
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse' }} data-testid="var-addon-table">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      {activeCols.map(col => (
                        <th key={col.key}
                          onClick={() => col.key !== 'rank' && handleSort(col.key)}
                          className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap
                            ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                            ${col.key !== 'rank' ? 'cursor-pointer select-none hover:text-zinc-700' : ''}`}
                          data-testid={`var-addon-col-${col.key}`}>
                          <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                            {col.label}
                            {col.key !== 'rank' && <SortIcon col={col.key} />}
                          </div>
                        </th>
                      ))}
                    </tr>

                    {/* Sticky TOTALS */}
                    {columnTotals && sortedRows.length > 0 && (
                      <tr className="bg-[#F26B33]/5 border-b-2 border-[#F26B33]/20" style={{ position: 'sticky', top: 34, zIndex: 10 }} data-testid="var-addon-totals-row">
                        {activeCols.map((col, i) => {
                          if (i === 0) return <td key={col.key} className="px-3 py-1.5 text-[11px] font-bold text-[#F26B33] uppercase tracking-wider">TOTALS</td>;
                          if (col.key === 'qty')     return <td key={col.key} className="px-3 py-1.5 text-right text-[11px] font-bold text-[#F26B33] tabular-nums">{columnTotals.qty.toLocaleString('en-IN')}</td>;
                          if (col.key === 'revenue') return <td key={col.key} className="px-3 py-1.5 text-right text-[11px] font-bold text-[#F26B33] tabular-nums">{fmtCur(columnTotals.revenue)}</td>;
                          return <td key={col.key} className="px-3 py-1.5" />;
                        })}
                      </tr>
                    )}
                  </thead>

                  <tbody>
                    {sortedRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors" data-testid={`var-addon-row-${idx}`}>
                        {activeCols.map(col => (
                          <td key={col.key}
                            className={`px-3 py-2 text-sm
                              ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                              ${col.key === 'foodItem' || col.key === 'addonName' ? 'font-medium text-zinc-900' : 'text-zinc-600'}`}>
                            {cellVal(row, col)}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {sortedRows.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={activeCols.length} className="py-20 text-center">
                          <Layers className="w-10 h-10 text-zinc-200 mx-auto mb-2" />
                          <p className="text-sm text-zinc-400">
                            {activeTab === 'variations'
                              ? 'No variation data found. Variations require items with size or option surcharges.'
                              : 'No addon data found for this date range.'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ReportLoadingShield>
      </div>
    </div>
  );
};

export default VariationAddonMockup;
