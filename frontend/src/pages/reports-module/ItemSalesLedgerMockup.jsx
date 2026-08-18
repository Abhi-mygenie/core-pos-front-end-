// ItemSalesLedgerMockup.jsx — CR-136
//
// Item Sales Ledger — backend-aggregated item performance report.
// Data: POST /api/v1/vendoremployee/top-food%20sales-report (single call, no range limit)
// Route: /reports-module/item-sales
// Tabs: All Items | By Category | By Station | Complementary
//
// Key decisions (all owner-confirmed):
//   - Rank col: highest Net Sales first (index+1 from backend sort)
//   - Export: uses visibleColList — both PDF and Excel respect column chooser
//   - No date range limit (unlike Order Ledger's 60-day cap)
//   - Presets: Today/7D/30D/MTD/1Y/FY — all enabled
//   - Variation/Addon: separate CR later — columns shown but not broken down

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import useReportFetch from '../../components/reports/useReportFetch';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { getTopFoodSalesForRange } from '../../api/services/topFoodSalesService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import {
  ArrowLeft, Search, Download, ChevronDown, ChevronUp, ChevronsUpDown,
  Check, X, CalendarIcon, FileSpreadsheet, FileDown, Columns3,
  ShoppingBag, IndianRupee, Tag, Percent, Receipt,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtCur = (v) => {
  if (!v && v !== 0) return '—';
  const hasDecimals = v % 1 !== 0;
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`;
};
const fmtISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

// Station colour pills — cycles through palette by station name hash
const STATION_COLORS = [
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-orange-100 text-orange-800 border-orange-200',
];
const stationColor = (() => {
  const map = {};
  let idx = 0;
  return (name) => {
    if (!map[name]) map[name] = STATION_COLORS[idx++ % STATION_COLORS.length];
    return map[name];
  };
})();

// Column definitions (12)
const COLUMNS = [
  { key: 'rank',          label: '#',          align: 'center', sortable: false, numericExport: false },
  { key: 'foodItem',      label: 'Food Item',  align: 'left',   sortable: true,  numericExport: false },
  { key: 'categoryName',  label: 'Category',   align: 'left',   sortable: true,  numericExport: false },
  { key: 'stationName',   label: 'Station',    align: 'left',   sortable: true,  numericExport: false },
  { key: 'totalQuantity', label: 'Qty Sold',   align: 'right',  sortable: true,  numericExport: false },
  { key: 'basePrice',     label: 'Base Price', align: 'right',  sortable: true,  numericExport: true  },
  { key: 'variationPrice',label: 'Variation',  align: 'right',  sortable: true,  numericExport: true  },
  { key: 'addonPrice',    label: 'Addon',      align: 'right',  sortable: true,  numericExport: true  },
  { key: 'discount',      label: 'Discount',   align: 'right',  sortable: true,  numericExport: true  },
  { key: 'gst',           label: 'GST',        align: 'right',  sortable: true,  numericExport: true  },
  { key: 'netSales',      label: 'Net Sales',  align: 'right',  sortable: true,  numericExport: true  },
  { key: 'pctOfTotal',    label: '% of Total', align: 'right',  sortable: true,  numericExport: false },
];

const DEFAULT_VISIBLE = new Set([
  'rank', 'foodItem', 'categoryName', 'stationName', 'totalQuantity',
  'variationPrice', 'addonPrice',   // visible by default — endpoint computes these in total_sales
  'netSales',
]);
const COL_STORAGE_KEY = 'cr136.columnVisibility.v1';

const TABS = [
  { id: 'all',           label: 'All Items'    },
  { id: 'byCategory',    label: 'By Category'  },
  { id: 'byStation',     label: 'By Station'   },
  { id: 'complementary', label: 'Complementary' },
];

// ══════════════════════════════════════════════════════════════════════════════
const ItemSalesLedgerMockup = () => {
  const navigate    = useNavigate();
  const { restaurant } = useRestaurant();
  const restaurantId   = restaurant?.id || 0;

  // Shared date context
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const today = new Date();
  const [fromDate,    setFromDate]    = useState(sharedFrom);
  const [toDate,      setToDate]      = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo,   setAppliedTo]   = useState(sharedTo);
  const [activePreset, setActivePreset] = useState('7D');

  // UI state
  const [activeTab,     setActiveTab]     = useState('all');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [sortCol,       setSortCol]       = useState('netSales');
  const [sortDir,       setSortDir]       = useState('desc');
  const [showColMenu,   setShowColMenu]   = useState(false);
  const [showDlMenu,    setShowDlMenu]    = useState(false);
  const [openAccordions,setOpenAccordions]= useState(new Set());
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSilentMode,      setIsSilentMode]      = useState(false);

  const colRef = useRef(null);
  const dlRef  = useRef(null);

  // Column chooser — localStorage
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(COL_STORAGE_KEY) || 'null');
      if (Array.isArray(stored) && stored.length > 0) return new Set(stored);
    } catch (_) {}
    return new Set(DEFAULT_VISIBLE);
  });
  useEffect(() => {
    try { localStorage.setItem(COL_STORAGE_KEY, JSON.stringify([...visibleCols])); } catch (_) {}
  }, [visibleCols]);
  const toggleCol = (key) => setVisibleCols((prev) => {
    const n = new Set(prev);
    if (n.has(key) && n.size > 1) n.delete(key); // keep at least 1
    else n.add(key);
    return n;
  });
  const resetCols = () => setVisibleCols(new Set(DEFAULT_VISIBLE));

  // Close popovers on outside click
  useEffect(() => {
    const h = (e) => {
      if (colRef.current && !colRef.current.contains(e.target)) setShowColMenu(false);
      if (dlRef.current  && !dlRef.current.contains(e.target))  setShowDlMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Date helpers
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply   = draftDirty && draftValid;
  const datesValid = appliedFrom && appliedTo && appliedFrom <= appliedTo;

  const handlePreset = (p) => {
    setActivePreset(p);
    const now = new Date();
    let f = new Date(now);
    if (p === '7D')  f = new Date(now.getTime() - 6 * 86400000);
    else if (p === '30D') f = new Date(now.getTime() - 29 * 86400000);
    else if (p === 'MTD') f = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (p === '1Y')  f = new Date(now.getTime() - 364 * 86400000);
    else if (p === 'FY') {
      f = now.getMonth() >= 3
        ? new Date(now.getFullYear(), 3, 1)
        : new Date(now.getFullYear() - 1, 3, 1);
    }
    const fs = fmtISO(f); const ts = fmtISO(now);
    setFromDate(fs); setToDate(ts);
    setAppliedFrom(fs); setAppliedTo(ts); setSharedFrom(fs); setSharedTo(ts);
  };
  const handleApply = () => {
    if (!canApply) return;
    setAppliedFrom(fromDate); setAppliedTo(toDate);
    setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset('');
  };

  // Fetch
  const fetchFn = useCallback(
    () => datesValid
      ? getTopFoodSalesForRange(appliedFrom, appliedTo, restaurantId)
      : Promise.resolve({ rows: [], grandTotal: 0 }),
    [appliedFrom, appliedTo, restaurantId, datesValid]
  );
  const { data, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(
    fetchFn, [appliedFrom, appliedTo, restaurantId]
  );
  const allRows    = data?.rows      || [];
  const grandTotal = data?.grandTotal || 0;

  // Inject pctOfTotal
  const rowsWithPct = useMemo(() =>
    allRows.map(r => ({
      ...r,
      pctOfTotal: grandTotal > 0 ? parseFloat((r.netSales / grandTotal * 100).toFixed(2)) : 0,
    })),
    [allRows, grandTotal]
  );

  // Search (All Items + Complementary tabs)
  const searchedRows = useMemo(() => {
    const src = activeTab === 'complementary'
      ? rowsWithPct.filter(r => r.isComplementary)
      : rowsWithPct;
    if (!searchQuery.trim()) return src;
    const q = searchQuery.toLowerCase();
    return src.filter(r =>
      r.foodItem.toLowerCase().includes(q) ||
      r.categoryName.toLowerCase().includes(q) ||
      r.stationName.toLowerCase().includes(q)
    );
  }, [rowsWithPct, searchQuery, activeTab]);

  // Sort (flat tabs)
  const sortedRows = useMemo(() => {
    const s = [...searchedRows];
    s.sort((a, b) => {
      const va = a[sortCol]; const vb = b[sortCol];
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return s;
  }, [searchedRows, sortCol, sortDir]);
  const handleSort = (key) => {
    if (!COLUMNS.find(c => c.key === key)?.sortable) return;
    sortCol === key ? setSortDir(d => d === 'asc' ? 'desc' : 'asc') : (setSortCol(key), setSortDir('desc'));
  };

  // Accordion groups
  const byCategory = useMemo(() => {
    const map = {};
    rowsWithPct.forEach(r => {
      if (!map[r.categoryName]) map[r.categoryName] = [];
      map[r.categoryName].push(r);
    });
    return Object.entries(map)
      .map(([name, items]) => ({
        name, items,
        totalNet: items.reduce((s, i) => s + i.netSales, 0),
        totalQty: items.reduce((s, i) => s + i.totalQuantity, 0),
      }))
      .sort((a, b) => b.totalNet - a.totalNet);
  }, [rowsWithPct]);

  const byStation = useMemo(() => {
    const map = {};
    rowsWithPct.forEach(r => {
      if (!map[r.stationName]) map[r.stationName] = [];
      map[r.stationName].push(r);
    });
    return Object.entries(map)
      .map(([name, items]) => ({
        name, items,
        totalNet: items.reduce((s, i) => s + i.netSales, 0),
        totalQty: items.reduce((s, i) => s + i.totalQuantity, 0),
      }))
      .sort((a, b) => b.totalNet - a.totalNet);
  }, [rowsWithPct]);

  // KPIs
  const kpis = useMemo(() => {
    const src = activeTab === 'complementary'
      ? rowsWithPct.filter(r => r.isComplementary)
      : rowsWithPct;
    return {
      uniqueItems:  src.length,
      totalQty:     src.reduce((s, r) => s + r.totalQuantity, 0),
      gross:        src.reduce((s, r) => s + r.grossRevenue, 0),
      discount:     src.reduce((s, r) => s + r.discount, 0),
      netSales:     src.reduce((s, r) => s + r.netSales, 0),
    };
  }, [rowsWithPct, activeTab]);

  // Column totals (flat table)
  const columnTotals = useMemo(() => {
    if (!sortedRows.length) return null;
    const t = {};
    COLUMNS.forEach(c => {
      if (c.numericExport) t[c.key] = sortedRows.reduce((s, r) => s + (r[c.key] || 0), 0);
      else if (c.key === 'totalQuantity') t[c.key] = sortedRows.reduce((s, r) => s + (r[c.key] || 0), 0);
    });
    return t;
  }, [sortedRows]);

  const visibleColList = useMemo(() => COLUMNS.filter(c => visibleCols.has(c.key)), [visibleCols]);

  // Export (column-chooser-aware — owner confirmed)
  const buildExportPayload = () => {
    const exportCols = visibleColList
      .filter(c => c.key !== 'pctOfTotal')
      .map(c => ({
        key: c.key, label: c.label,
        format: c.numericExport ? 'inr' : c.key === 'totalQuantity' ? 'integer' : 'text',
        align: c.align, width: c.key === 'foodItem' ? 200 : 110,
      }));
    const sumKeys = exportCols.filter(c => c.numericExport).map(c => c.key);
    const makeTotals = (rows) => {
      const t = { foodItem: `TOTAL (${rows.filter(r => !r._isHeader).length} items)` };
      sumKeys.forEach(k => { t[k] = rows.filter(r => !r._isHeader).reduce((s, r) => s + (r[k] || 0), 0); });
      return t;
    };
    const flattenGroups = (groups) => groups.flatMap(g => [
      { foodItem: `── ${g.name} (${g.items.length})`, netSales: g.totalNet, _isHeader: true },
      ...g.items,
    ]);
    return {
      title: 'Item Sales', dateRange: { from: appliedFrom, to: appliedTo },
      kpis: [
        { label: 'Unique Items',  value: allRows.length,                                    format: 'text'    },
        { label: 'Total Qty',     value: allRows.reduce((s,r)=>s+r.totalQuantity,0),        format: 'text'    },
        { label: 'Gross Revenue', value: allRows.reduce((s,r)=>s+r.grossRevenue,0),         format: 'inr'     },
        { label: 'Discount',      value: allRows.reduce((s,r)=>s+r.discount,0),              format: 'inr'     },
        { label: 'Net Sales',     value: grandTotal,                                        format: 'inr', tone: 'primary' },
      ],
      sheets: [
        { name: 'All Items',   columns: exportCols, rows: sortedRows,             totals: makeTotals(sortedRows)             },
        { name: 'By Category', columns: exportCols, rows: flattenGroups(byCategory), totals: makeTotals(rowsWithPct)          },
        { name: 'By Station',  columns: exportCols, rows: flattenGroups(byStation),  totals: makeTotals(rowsWithPct)          },
      ],
    };
  };
  const handleDownload = (action) => {
    setShowDlMenu(false);
    if (action === 'excel') { exportReportAsExcel(buildExportPayload(), `Item_Sales_${appliedFrom}_${appliedTo}`); return; }
    if (action === 'pdf')   { const w = openReportWindow(); exportReportAsPDF(w, buildExportPayload()); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 text-zinc-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#F26B33]" /> : <ChevronDown className="w-3 h-3 text-[#F26B33]" />;
  };

  const cellVal = (row, col) => {
    if (col.key === 'rank')          return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-semibold">{row.rank}</span>;
    if (col.key === 'stationName')   return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${stationColor(row.stationName)}`}>{row.stationName || '—'}</span>;
    if (col.key === 'pctOfTotal')    return (
      <div className="flex items-center justify-end gap-1.5">
        <div className="w-12 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#F26B33] rounded-full" style={{ width: `${Math.min(row.pctOfTotal * 3, 100)}%` }} />
        </div>
        <span className="text-[11px] text-[#F26B33] font-medium tabular-nums">{row.pctOfTotal}%</span>
      </div>
    );
    const v = row[col.key];
    if (v === undefined || v === null || v === '') return <span className="text-zinc-300">—</span>;
    if (col.numericExport && typeof v === 'number') return v === 0 ? <span className="text-zinc-300">—</span> : fmtCur(v);
    if (col.key === 'totalQuantity') return v === 0 ? <span className="text-zinc-300">—</span> : v;
    return String(v);
  };

  // Accordion toggle
  const toggleAccordion = (name) => setOpenAccordions(prev => {
    const n = new Set(prev);
    n.has(name) ? n.delete(name) : n.add(name);
    return n;
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-white" data-testid="item-sales-page">
      <Sidebar
        isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={refetch} isRefreshing={isLoading} isOrderEntryOpen={false}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="item-sales-header">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" onClick={() => navigate('/reports-module/dashboard')} data-testid="item-sales-back-btn">
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Item Sales</h1>
            <span className="text-[11px] font-semibold bg-[#fff0eb] text-[#F26B33] border border-[#fed7bc] px-2.5 py-0.5 rounded-full">1 API call · any range</span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Date range */}
            <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`} data-testid="item-sales-daterange">
              <CalendarIcon className="w-4 h-4 text-zinc-400" />
              <span className="text-[10px] text-zinc-400 uppercase tracking-wide">From</span>
              <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setActivePreset(''); }}
                max={fmtISO(today)} disabled={isLoading}
                className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer p-0" data-testid="item-sales-date-from" />
              <span className="text-zinc-300">—</span>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wide">To</span>
              <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setActivePreset(''); }}
                max={fmtISO(today)} disabled={isLoading}
                className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer p-0" data-testid="item-sales-date-to" />
            </div>

            {/* Apply */}
            <button onClick={handleApply} disabled={!canApply || isLoading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${canApply ? 'bg-[#329937] text-white hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}
              data-testid="item-sales-apply-btn">
              <Check className="w-4 h-4" /> Apply
            </button>

            {/* Presets */}
            <div className="flex items-center gap-0.5 bg-zinc-100 rounded-lg p-1" data-testid="item-sales-presets">
              {['Today','7D','30D','MTD','1Y','FY'].map(p => (
                <button key={p} onClick={() => handlePreset(p)} disabled={isLoading}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/60'}`}
                  data-testid={`item-sales-preset-${p.toLowerCase()}`}>{p}</button>
              ))}
            </div>

            {/* Column chooser */}
            <div className="relative" ref={colRef}>
              <button onClick={() => setShowColMenu(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 border border-zinc-200 bg-white rounded-lg text-sm font-medium text-zinc-600 hover:border-zinc-300 transition-colors"
                data-testid="item-sales-col-chooser-btn">
                <Columns3 className="w-4 h-4" /> Columns
              </button>
              {showColMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 p-3 min-w-[200px]" data-testid="item-sales-col-menu">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-100">
                    <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Columns</span>
                    <button onClick={resetCols} className="text-xs text-[#F26B33] hover:underline">Reset</button>
                  </div>
                  {COLUMNS.map(c => (
                    <label key={c.key} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-zinc-50 rounded px-1">
                      <input type="checkbox" checked={visibleCols.has(c.key)} onChange={() => toggleCol(c.key)}
                        className="accent-[#F26B33]" data-testid={`col-toggle-${c.key}`} />
                      <span className="text-sm text-zinc-700">{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Download */}
            <div className="relative" ref={dlRef}>
              <button onClick={() => setShowDlMenu(v => !v)}
                disabled={isLoading || !allRows.length}
                className={`flex items-center gap-1.5 px-3 py-2 border border-[#F26B33] text-[#F26B33] rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors ${(!allRows.length || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="item-sales-download-trigger">
                <Download className="w-4 h-4" /> Download <ChevronDown className="w-3 h-3" />
              </button>
              {showDlMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 py-1 min-w-[180px]">
                  <button onClick={() => handleDownload('excel')} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 w-full" data-testid="item-sales-download-excel">
                    <FileSpreadsheet className="w-4 h-4 text-zinc-500" /> Excel (.xlsx)
                  </button>
                  <button onClick={() => handleDownload('pdf')} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 w-full" data-testid="item-sales-download-pdf">
                    <FileDown className="w-4 h-4 text-zinc-500" /> PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── KPI Strip ───────────────────────────────────────────────── */}
        <div className="px-8 pt-4 pb-0 bg-white border-b border-zinc-100 shrink-0" data-testid="item-sales-kpi-strip">
          <div className="grid grid-cols-5 gap-3 pb-4">
            {[
              { label: 'Unique Items',  value: kpis.uniqueItems, sub: 'dishes',      icon: ShoppingBag,  fmt: 'count', testId: 'kpi-unique-items'  },
              { label: 'Units Sold',    value: kpis.totalQty,    sub: 'servings',     icon: Tag,          fmt: 'count', testId: 'kpi-units-sold'    },
              { label: 'Gross Revenue', value: kpis.gross,       sub: 'before disc',  icon: Receipt,      fmt: 'inr',   testId: 'kpi-gross'         },
              { label: 'Discount',      value: kpis.discount,    sub: 'applied',      icon: Percent,      fmt: 'inr',   testId: 'kpi-discount'      },
              { label: 'Net Sales',     value: kpis.netSales,    sub: 'after disc+GST',icon: IndianRupee, fmt: 'inr',   testId: 'kpi-net-sales', accent: true },
            ].map(({ label, value, sub, icon: Icon, fmt, testId, accent }) => (
              <div key={label}
                className={`rounded-xl px-4 py-3 border ${accent ? 'bg-[#fff7f3] border-[#fed7bc]' : 'bg-white border-zinc-200'}`}
                data-testid={testId}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${accent ? 'text-[#F26B33]' : 'text-zinc-400'}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${accent ? 'text-[#F26B33]' : 'text-zinc-400'}`}>{label}</span>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${accent ? 'text-[#F26B33]' : 'text-zinc-950'}`}>
                  {fmt === 'inr' ? fmtCur(value) : value.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5" data-testid="item-sales-tabs">
            {TABS.map(t => {
              const count = t.id === 'complementary'
                ? rowsWithPct.filter(r => r.isComplementary).length
                : t.id === 'byCategory' ? byCategory.length
                : t.id === 'byStation'  ? byStation.length
                : rowsWithPct.length;
              const active = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => { setActiveTab(t.id); setSearchQuery(''); }}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap border-b-2 transition-colors
                    ${active ? 'text-[#F26B33] border-[#F26B33]' : 'text-zinc-500 border-transparent hover:text-zinc-700 hover:border-zinc-300'}`}
                  data-testid={`item-sales-tab-${t.id}`}>
                  {t.label}
                  {count > 0 && <span className="ml-1.5 opacity-60 text-[11px]">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
          <div className="flex-1 overflow-auto p-8 bg-zinc-50">

            {/* Flat table tabs (All Items + Complementary) */}
            {(activeTab === 'all' || activeTab === 'complementary') && (
              <>
                {/* Search + meta */}
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 bg-white rounded-lg w-60">
                    <Search className="w-4 h-4 text-zinc-400" />
                    <input type="text" placeholder="Search item, category…" value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-transparent border-0 outline-none text-sm text-zinc-800 placeholder:text-zinc-400 w-full p-0"
                      data-testid="item-sales-search" />
                    {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600" /></button>}
                  </div>
                  <span className="text-xs text-zinc-400" data-testid="item-sales-meta">
                    {sortedRows.length} items · {appliedFrom} → {appliedTo}
                  </span>
                </div>

                {/* Complementary empty state */}
                {activeTab === 'complementary' && sortedRows.length === 0 && hasLoadedOnce && (
                  <div className="flex flex-col items-center justify-center py-24 bg-white border border-zinc-200 rounded-xl" data-testid="item-sales-complementary-empty">
                    <ShoppingBag className="w-12 h-12 text-zinc-200 mb-3" />
                    <h3 className="text-base font-semibold text-zinc-600 mb-1">No complementary items</h3>
                    <p className="text-sm text-zinc-400">No items were marked as complementary for {appliedFrom} → {appliedTo}</p>
                  </div>
                )}

                {(activeTab !== 'complementary' || sortedRows.length > 0) && (
                  <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm" data-testid="item-sales-table-container">
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ borderCollapse: 'collapse' }} data-testid="item-sales-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                          <tr className="bg-zinc-50 border-b border-zinc-200">
                            {visibleColList.map(col => (
                              <th key={col.key}
                                onClick={() => handleSort(col.key)}
                                className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap
                                  ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                                  ${col.sortable ? 'cursor-pointer select-none hover:text-zinc-700' : ''}`}
                                data-testid={`item-sales-col-${col.key}`}>
                                <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                                  {col.label}
                                  {col.sortable && <SortIcon col={col.key} />}
                                </div>
                              </th>
                            ))}
                          </tr>

                          {/* Sticky TOTALS row */}
                          {columnTotals && (
                            <tr className="bg-[#F26B33]/5 border-b-2 border-[#F26B33]/20" style={{ position: 'sticky', top: 34, zIndex: 10 }} data-testid="item-sales-totals-row">
                              {visibleColList.map((col, i) => {
                                if (i === 0) return <td key={col.key} className="px-3 py-1.5 text-[11px] font-bold text-[#F26B33] uppercase tracking-wider">TOTALS</td>;
                                const v = columnTotals[col.key];
                                if (col.key === 'pctOfTotal') return <td key={col.key} className="px-3 py-1.5 text-right text-[11px] font-bold text-[#F26B33] tabular-nums">100%</td>;
                                if (typeof v === 'number') {
                                  const fmt = col.numericExport ? fmtCur(v) : v.toLocaleString('en-IN');
                                  return <td key={col.key} className={`px-3 py-1.5 text-[11px] font-bold text-[#F26B33] tabular-nums ${col.align === 'right' ? 'text-right' : 'text-center'}`}>{fmt}</td>;
                                }
                                return <td key={col.key} className="px-3 py-1.5" />;
                              })}
                            </tr>
                          )}
                        </thead>

                        <tbody>
                          {sortedRows.map((row, idx) => (
                            <tr key={`${row.foodItem}-${row.stationName}-${idx}`}
                              className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                              data-testid={`item-sales-row-${idx}`}>
                              {visibleColList.map(col => (
                                <td key={col.key}
                                  className={`px-3 py-2 text-sm
                                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                                    ${col.key === 'foodItem' ? 'font-medium text-zinc-900' : ''}
                                    ${col.key === 'netSales' ? 'font-semibold text-[#F26B33]' : 'text-zinc-600'}
                                    ${col.key === 'categoryName' ? 'text-xs text-zinc-500' : ''}`}>
                                  {cellVal(row, col)}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {sortedRows.length === 0 && !isLoading && (
                            <tr><td colSpan={visibleColList.length} className="py-20 text-center">
                              <ShoppingBag className="w-10 h-10 text-zinc-200 mx-auto mb-2" />
                              <p className="text-sm text-zinc-400">No items for {appliedFrom} → {appliedTo}</p>
                            </td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* By Category accordion */}
            {activeTab === 'byCategory' && (
              <div className="space-y-2" data-testid="item-sales-category-accordion">
                {byCategory.map(group => {
                  const isOpen = openAccordions.has(group.name);
                  return (
                    <div key={group.name} className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                      <button
                        onClick={() => toggleAccordion(group.name)}
                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                        data-testid={`category-row-${group.name.replace(/\s+/g,'-')}`}
                        aria-expanded={isOpen}>
                        <div className="flex items-center gap-3">
                          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          <span className="text-sm font-semibold text-zinc-900">{group.name}</span>
                          <span className="text-xs text-zinc-400">{group.items.length} items · {group.totalQty} servings</span>
                        </div>
                        <span className="text-sm font-bold text-[#F26B33] tabular-nums">{fmtCur(group.totalNet)} net</span>
                      </button>
                      {isOpen && (
                        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                          <tbody>
                            {group.items.map((row, idx) => (
                              <tr key={idx} className={`border-t border-zinc-100 ${idx % 2 === 0 ? 'bg-zinc-50/50' : 'bg-white'} hover:bg-zinc-100/50 transition-colors`}>
                                <td className="pl-12 pr-3 py-2 text-sm font-medium text-zinc-900 w-48">{row.foodItem}</td>
                                <td className="px-3 py-2"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stationColor(row.stationName)}`}>{row.stationName}</span></td>
                                <td className="px-3 py-2 text-xs text-zinc-500 text-right">{row.totalQuantity} qty</td>
                                <td className="px-3 py-2 text-xs text-zinc-500 text-right">{fmtCur(row.grossRevenue)} gross</td>
                                <td className="px-3 py-2 text-xs text-zinc-400 text-right">{row.discount > 0 ? `−${fmtCur(row.discount)}` : '—'}</td>
                                <td className="px-3 py-2 text-sm font-semibold text-[#F26B33] text-right pr-5 tabular-nums">{fmtCur(row.netSales)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
                {byCategory.length === 0 && (
                  <div className="flex flex-col items-center py-20 text-zinc-400">
                    <ShoppingBag className="w-10 h-10 mb-2 text-zinc-200" />
                    <p className="text-sm">No data for selected range</p>
                  </div>
                )}
              </div>
            )}

            {/* By Station accordion */}
            {activeTab === 'byStation' && (
              <div className="space-y-2" data-testid="item-sales-station-accordion">
                {byStation.map(group => {
                  const isOpen = openAccordions.has(`st-${group.name}`);
                  return (
                    <div key={group.name} className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                      <button
                        onClick={() => toggleAccordion(`st-${group.name}`)}
                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors"
                        data-testid={`station-row-${group.name.replace(/\s+/g,'-')}`}
                        aria-expanded={isOpen}>
                        <div className="flex items-center gap-3">
                          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${stationColor(group.name)}`}>{group.name}</span>
                          <span className="text-xs text-zinc-400">{group.items.length} items · {group.totalQty} servings</span>
                        </div>
                        <span className="text-sm font-bold text-[#F26B33] tabular-nums">{fmtCur(group.totalNet)} net</span>
                      </button>
                      {isOpen && (
                        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                          <tbody>
                            {group.items.map((row, idx) => (
                              <tr key={idx} className={`border-t border-zinc-100 ${idx % 2 === 0 ? 'bg-zinc-50/50' : 'bg-white'} hover:bg-zinc-100/50 transition-colors`}>
                                <td className="pl-12 pr-3 py-2 text-sm font-medium text-zinc-900 w-48">{row.foodItem}</td>
                                <td className="px-3 py-2 text-xs text-zinc-500">{row.categoryName}</td>
                                <td className="px-3 py-2 text-xs text-zinc-500 text-right">{row.totalQuantity} qty</td>
                                <td className="px-3 py-2 text-xs text-zinc-500 text-right">{fmtCur(row.grossRevenue)} gross</td>
                                <td className="px-3 py-2 text-xs text-zinc-400 text-right">{row.discount > 0 ? `−${fmtCur(row.discount)}` : '—'}</td>
                                <td className="px-3 py-2 text-sm font-semibold text-[#F26B33] text-right pr-5 tabular-nums">{fmtCur(row.netSales)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
                {byStation.length === 0 && (
                  <div className="flex flex-col items-center py-20 text-zinc-400">
                    <ShoppingBag className="w-10 h-10 mb-2 text-zinc-200" />
                    <p className="text-sm">No data for selected range</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </ReportLoadingShield>
      </div>
    </div>
  );
};

export default ItemSalesLedgerMockup;
