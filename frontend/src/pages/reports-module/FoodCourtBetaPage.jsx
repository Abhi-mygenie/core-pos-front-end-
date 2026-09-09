/**
 * FoodCourtBetaPage — CR-157 (POS 6.0)
 *
 * Food Court Beta report — new dedicated endpoint.
 * Design: clone FoodCourtMockup.jsx exactly (same classNames, same layout).
 * Differences: no Audit tab, STATION GST column at pos 2, display_order_id used directly,
 *              items[] formatted as inline text, direct POST (no batch/cache).
 *
 * Endpoint: POST /api/v1/vendoremployee/food-court-order-report
 * Evidence: /app/memory/evidence/CR-157/food_court_response_updated_2026_08_22.json
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import { useRestaurant } from '../../contexts';
import { getFoodCourtStations, getFoodCourtBetaOrders } from '../../api/services/foodCourtBetaService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import {
  ArrowLeft, Download, FileSpreadsheet, FileDown, ChevronDown, ChevronUp,
  ChevronsUpDown, Check, Search, X, CalendarIcon, Store, ShoppingBag, Receipt, IndianRupee,
} from 'lucide-react';

// ── Helpers (identical to FoodCourtMockup) ───────────────────────────────────
const fmtCur = (v) => {
  if (!v && v !== 0) return '';
  const hasDecimals = v % 1 !== 0;
  return `\u20B9${v.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`;
};
const fmtISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const today = new Date();

// CR-157: No Audit tab (owner decision Q1)
const TAB_FILTERS = {
  all:     () => true,
  settled: (o) => o.payment_status === 'paid' || o.f_order_status === 6,
};
const TABS = [
  { id: 'all',     label: 'All Orders' },
  { id: 'settled', label: 'Settled' },
];

// CR-157: STATION GST at position 2 (after ORDER ID) — owner Q3
const COLUMNS = [
  { key: 'display_order_id', label: 'Order ID',     sortable: true,  align: 'left'    },
  { key: 'station_gst',      label: 'Station GST',  sortable: false, align: 'left'    },
  { key: 'order_date',       label: 'Date',         sortable: true,  align: 'left'    },
  { key: 'order_time',       label: 'Time',         sortable: true,  align: 'left'    },
  { key: '_items_text',      label: 'Items',        sortable: false, align: 'left'    },
  { key: 'item_count',       label: 'Items',        sortable: true,  align: 'center'  },
  { key: 'total_qty',        label: 'Qty',          sortable: true,  align: 'center'  },
  { key: 'payment_method',   label: 'Payment Type', sortable: true,  align: 'left'    },
  { key: 'item_total',       label: 'Item Total',   sortable: true,  align: 'right'   },
  { key: 'discount',         label: 'Discount',     sortable: true,  align: 'right'   },
  { key: 'sub_total',        label: 'Sub Total',    sortable: true,  align: 'right'   },
  { key: 'gst',              label: 'GST',          sortable: true,  align: 'right'   },
  { key: 'total',            label: 'Total',        sortable: true,  align: 'right'   },
];

const EXPORT_COLS = [
  { key: 'display_order_id', label: 'Order ID',     format: 'text',    align: 'left',   width: 200 },
  { key: 'station_gst',      label: 'Station GST',  format: 'text',    align: 'left',   width: 120 },
  { key: 'order_date',       label: 'Date',         format: 'text',    align: 'left',   width: 100 },
  { key: 'order_time',       label: 'Time',         format: 'text',    align: 'left',   width: 70  },
  { key: '_items_text',      label: 'Items',        format: 'text',    align: 'left',   width: 350 },
  { key: 'item_count',       label: 'Item Count',   format: 'integer', align: 'center', width: 80  },
  { key: 'total_qty',        label: 'Qty',          format: 'integer', align: 'center', width: 60  },
  { key: 'payment_method',   label: 'Payment Type', format: 'text',    align: 'left',   width: 110 },
  { key: 'item_total',       label: 'Item Total',   format: 'inr',     align: 'right',  width: 110 },
  { key: 'discount',         label: 'Discount',     format: 'inr',     align: 'right',  width: 100 },
  { key: 'sub_total',        label: 'Sub Total',    format: 'inr',     align: 'right',  width: 110 },
  { key: 'gst',              label: 'GST',          format: 'inr',     align: 'right',  width: 100 },
  { key: 'total',            label: 'Total',        format: 'inr',     align: 'right',  width: 110 },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function FoodCourtBetaPage() {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant(); // eslint-disable-line no-unused-vars

  // Sidebar (identical props to FoodCourtMockup)
  // BUG-361: persist sidebar state across reloads
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  const [isSilentMode,      setIsSilentMode]      = useState(false);

  // Date range (identical pattern to FoodCourtMockup)
  const [fromDate,    setFromDate]    = useState(fmtISO(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [toDate,      setToDate]      = useState(fmtISO(today));
  const [appliedFrom, setAppliedFrom] = useState(fmtISO(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [appliedTo,   setAppliedTo]   = useState(fmtISO(today));
  const [activePreset, setActivePreset] = useState('MTD');
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate <= toDate;
  const canApply   = draftDirty && draftValid;

  // Station
  const [stationList,        setStationList]        = useState([]);
  const [stationGstMap,      setStationGstMap]       = useState({});
  const [selectedStation,    setSelectedStation]     = useState('');
  const [stationInitialized, setStationInitialized]  = useState(false);

  // Data
  const [orders,        setOrders]       = useState([]);
  const [isLoading,     setIsLoading]    = useState(false);
  const [error,         setError]        = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Table UI
  const [activeTab,        setActiveTab]        = useState('all');
  const [searchQuery,      setSearchQuery]      = useState('');
  const [sortCol,          setSortCol]          = useState('order_date');
  const [sortDir,          setSortDir]          = useState('desc');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadRef = useRef(null);

  // Close download menu on outside click
  useEffect(() => {
    const handler = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch: Step 1 — station list ──────────────────────────────────────────
  const fetchStations = useCallback(async () => {
    if (!appliedFrom || !appliedTo) return;
    setIsLoading(true); setError(null);
    try {
      const res = await getFoodCourtStations(appliedFrom, appliedTo);
      const stations = res.stations || [];
      setStationList(stations);
      setStationGstMap(res.station_gst_map || {});
      if (!stationInitialized && stations.length > 0) {
        setSelectedStation(stations[0]);
        setStationInitialized(true);
      }
    } catch (e) {
      setError(e.readableMessage || e.message || 'Failed to load stations');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFrom, appliedTo, stationInitialized]);

  // ── Fetch: Step 2 — orders for selected station ───────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!selectedStation) return;
    setIsLoading(true); setError(null);
    try {
      const res = await getFoodCourtBetaOrders(appliedFrom, appliedTo, selectedStation);
      setOrders(res.orders || []);
      setHasLoadedOnce(true);
    } catch (e) {
      setError(e.readableMessage || e.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFrom, appliedTo, selectedStation]);

  useEffect(() => { fetchStations(); }, [fetchStations]);
  useEffect(() => { if (selectedStation) fetchOrders(); }, [fetchOrders, selectedStation]);

  // ── Preset handler (identical to FoodCourtMockup) ─────────────────────────
  const handlePreset = (p) => {
    const t = new Date(); let f = new Date(t);
    if      (p === '7D')  { f.setDate(t.getDate() - 6); }
    else if (p === '30D') { f.setDate(t.getDate() - 29); }
    else if (p === 'MTD') { f = new Date(t.getFullYear(), t.getMonth(), 1); }
    else if (p === '1Y')  { f = new Date(t.getFullYear() - 1, t.getMonth(), t.getDate()); }
    else if (p === 'FY')  { f = t.getMonth() >= 3 ? new Date(t.getFullYear(), 3, 1) : new Date(t.getFullYear() - 1, 3, 1); }
    const fs = fmtISO(f); const ts = fmtISO(t);
    setActivePreset(p);
    setFromDate(fs); setToDate(ts); setAppliedFrom(fs); setAppliedTo(ts);
  };

  const handleApply = () => {
    if (!canApply) return;
    setAppliedFrom(fromDate); setAppliedTo(toDate); setActivePreset('');
  };

  // ── CR-157: Station label helper — "STATION · GST" or just "STATION" (Q2) ─
  const stationLabel = (s) => {
    const gst = stationGstMap[s];
    return gst ? `${s} · ${gst}` : s; // CR-157: null GST → name only (owner Q2 answer A)
  };

  // ── Items inline text helper ───────────────────────────────────────────────
  const itemsText = (items = []) =>
    items.map(i => `${i.name} (${i.quantity}) \u20B9${i.price}`).join(', ');

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() =>
    orders.filter(TAB_FILTERS[activeTab] || (() => true)),
    [orders, activeTab]
  );

  const tabCounts = useMemo(() => ({
    all:     orders.length,
    settled: orders.filter(TAB_FILTERS.settled).length,
  }), [orders]);

  const searchedOrders = useMemo(() => {
    if (!searchQuery.trim()) return filteredOrders;
    const q = searchQuery.toLowerCase();
    return filteredOrders.filter(o =>
      (o.display_order_id || '').toLowerCase().includes(q) ||
      (o.items || []).some(i => i.name.toLowerCase().includes(q))
    );
  }, [filteredOrders, searchQuery]);

  const sortedOrders = useMemo(() => {
    const s = [...searchedOrders];
    s.sort((a, b) => {
      let va = a[sortCol]; let vb = b[sortCol];
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      va = String(va || ''); vb = String(vb || '');
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return s;
  }, [searchedOrders, sortCol, sortDir]);

  const handleSort = (col) => sortCol === col
    ? setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    : (setSortCol(col), setSortDir('desc'));

  const SortIcon = ({ col }) => sortCol !== col
    ? <ChevronsUpDown className="w-3 h-3 text-zinc-300" />
    : sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#F26B33]" /> : <ChevronDown className="w-3 h-3 text-[#F26B33]" />;

  const kpis = useMemo(() => ({
    orders:    sortedOrders.length,
    totalQty:  sortedOrders.reduce((s, o) => s + (o.total_qty  || 0), 0),
    itemTotal: sortedOrders.reduce((s, o) => s + (o.item_total || 0), 0),
    tax:       sortedOrders.reduce((s, o) => s + (o.gst || 0) + (o.vat || 0), 0),
    total:     sortedOrders.reduce((s, o) => s + (o.total      || 0), 0),
  }), [sortedOrders]);

  const columnTotals = useMemo(() => {
    if (!sortedOrders.length) return null;
    return {
      item_count: sortedOrders.reduce((s, o) => s + (o.item_count || 0), 0),
      total_qty:  sortedOrders.reduce((s, o) => s + (o.total_qty  || 0), 0),
      item_total: sortedOrders.reduce((s, o) => s + (o.item_total || 0), 0),
      discount:   sortedOrders.reduce((s, o) => s + (o.discount   || 0), 0),
      sub_total:  sortedOrders.reduce((s, o) => s + (o.sub_total  || 0), 0),
      gst:        sortedOrders.reduce((s, o) => s + (o.gst        || 0), 0),
      vat:        sortedOrders.reduce((s, o) => s + (o.vat        || 0), 0),
      total:      sortedOrders.reduce((s, o) => s + (o.total      || 0), 0),
    };
  }, [sortedOrders]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const buildRows = () => sortedOrders.map(o => ({
    ...o,
    _items_text: itemsText(o.items),
    station_gst: o.station_gst || '—',
  }));

  const handleExportExcel = () => {
    const rows = buildRows();
    const totals = { label: 'TOTAL', ...columnTotals, gst: (columnTotals?.gst || 0) + (columnTotals?.vat || 0) };
    exportReportAsExcel({
      title: `Food Court Beta — ${selectedStation}`,
      dateRange: { from: appliedFrom, to: appliedTo },
      sheets: [{ name: selectedStation || 'Station', columns: EXPORT_COLS, rows, totals }],
      kpis: [
        { label: 'Station',    value: selectedStation,  format: 'text' },
        { label: 'Orders',     value: kpis.orders,      format: 'text' },
        { label: 'Item Total', value: kpis.itemTotal,   format: 'inr'  },
        { label: 'Tax (GST)',  value: kpis.tax,         format: 'inr'  },
        { label: 'Total',      value: kpis.total,       format: 'inr', tone: 'primary' },
      ],
    }, `Food_Court_Beta_${selectedStation}_${appliedFrom}_${appliedTo}`);
    setShowDownloadMenu(false);
  };

  const handleExportPDF = () => {
    const win = openReportWindow();
    const rows = buildRows();
    const totals = { label: 'TOTAL', ...columnTotals, gst: (columnTotals?.gst || 0) + (columnTotals?.vat || 0) };
    exportReportAsPDF(win, {
      title: `Food Court Beta — ${selectedStation}`,
      dateRange: { from: appliedFrom, to: appliedTo },
      sheets: [{ name: selectedStation || 'Station', columns: EXPORT_COLS, rows, totals }],
    });
    setShowDownloadMenu(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-white" data-testid="food-court-beta-page">
      <Sidebar
        isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }}
        isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={() => {}} isRefreshing={false} isOrderEntryOpen={false}
      />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">

          {/* ── Header (identical layout to FoodCourtMockup) ──────────────── */}
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0"
                  data-testid="food-court-beta-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                      data-testid="food-court-beta-back-btn"
                      onClick={() => navigate('/reports-module/dashboard')}>
                <ArrowLeft className="w-5 h-5 text-zinc-600" />
              </button>
              {/* CR-157: Q1 — same title as existing page */}
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950"
                  style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Food Court
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Station dropdown — CR-157: "STATION · GST" when present, name only when null */}
              <div className="flex items-center gap-2 px-3 py-2 border border-zinc-200 bg-white rounded-lg"
                   data-testid="food-court-beta-station-filter">
                <Store className="w-4 h-4 text-zinc-500" />
                <select
                  value={selectedStation}
                  onChange={e => { setSelectedStation(e.target.value); setSearchQuery(''); }}
                  disabled={isLoading || stationList.length === 0}
                  className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0 pr-6"
                  data-testid="food-court-beta-station-select">
                  {stationList.length === 0 && <option value="">Loading stations...</option>}
                  {stationList.map(s => (
                    <option key={s} value={s}>{stationLabel(s)}</option>
                  ))}
                </select>
              </div>

              {/* Date range — identical to FoodCourtMockup */}
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg`}
                   data-testid="food-court-beta-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                  <input type="date" value={fromDate} max={fmtISO(today)}
                    onChange={e => { setFromDate(e.target.value); setActivePreset(''); }}
                    className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0"
                    data-testid="food-court-beta-date-from" />
                </label>
                <span className="text-zinc-300">&mdash;</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                  <input type="date" value={toDate} max={fmtISO(today)}
                    onChange={e => { setToDate(e.target.value); setActivePreset(''); }}
                    className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0"
                    data-testid="food-court-beta-date-to" />
                </label>
              </div>

              {/* Apply — identical */}
              <button onClick={handleApply} disabled={!canApply}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}
                data-testid="food-court-beta-apply-btn">
                <Check className="w-4 h-4" /> Apply
              </button>

              {/* Presets — same 6 as FoodCourtMockup (owner Q4) */}
              <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg"
                   data-testid="food-court-beta-presets">
                {['Today', '7D', '30D', 'MTD', '1Y', 'FY'].map(p => (
                  <button key={p} onClick={() => handlePreset(p)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'}`}
                    data-testid={`food-court-beta-preset-${p}`}>
                    {p}
                  </button>
                ))}
              </div>

              {/* Download dropdown — identical structure, no Audit option */}
              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu(v => !v)}
                  disabled={isLoading || sortedOrders.length === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 transition-colors shadow-sm ${isLoading || !sortedOrders.length ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid="food-court-beta-download-trigger">
                  <Download className="w-4 h-4" /> Download <ChevronDown className="w-3 h-3" />
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 w-full" data-testid="food-court-beta-download-excel">
                      <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
                    </button>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 w-full" data-testid="food-court-beta-download-pdf">
                      <FileDown className="w-4 h-4" /> PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ── Tabs — CR-157: All Orders + Settled ONLY (no Audit, owner Q1) ─ */}
          <div className="px-8 pt-4 bg-white border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-1 pb-3" data-testid="food-court-beta-tabs">
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                const count = tabCounts[tab.id] || 0;
                return (
                  <button key={tab.id}
                    onClick={() => { setActiveTab(tab.id); }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
                    data-testid={`food-court-beta-tab-${tab.id}`}>
                    {tab.label} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Content ───────────────────────────────────────────────────── */}
          <ReportLoadingShield
            isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error}
            onRetry={() => { fetchStations(); if (selectedStation) fetchOrders(); }}>

            <div className="flex-1 overflow-auto p-8">

              {/* KPI Strip — 4 cards, identical to FoodCourtMockup */}
              <div className="grid grid-cols-4 gap-3 mb-4" data-testid="food-court-beta-kpi-strip">
                <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingBag className="w-4 h-4 text-[#F26B33]" />
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Orders</span>
                  </div>
                  <p className="text-2xl font-bold text-zinc-950 tabular-nums" data-testid="food-court-beta-kpi-orders">{kpis.orders}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{kpis.totalQty} items</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="w-4 h-4 text-[#329937]" />
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Item Total</span>
                  </div>
                  <p className="text-2xl font-bold text-zinc-950 tabular-nums" data-testid="food-court-beta-kpi-item-total">{fmtCur(kpis.itemTotal)}</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <IndianRupee className="w-4 h-4 text-blue-600" />
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Tax (GST)</span>
                  </div>
                  <p className="text-2xl font-bold text-zinc-950 tabular-nums" data-testid="food-court-beta-kpi-tax">{fmtCur(kpis.tax)}</p>
                </div>
                <div className="bg-white border border-[#F26B33]/30 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <IndianRupee className="w-4 h-4 text-[#F26B33]" />
                    <span className="text-[10px] text-[#F26B33] uppercase tracking-wider font-semibold">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-[#F26B33] tabular-nums" data-testid="food-court-beta-kpi-total">{fmtCur(kpis.total)}</p>
                </div>
              </div>

              {/* Search + meta — identical to FoodCourtMockup */}
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 rounded-lg bg-white w-64">
                  <Search className="w-4 h-4 text-zinc-400" />
                  <input type="text" placeholder="Search orders..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-transparent border-0 outline-none text-sm text-zinc-800 placeholder:text-zinc-400 w-full focus:ring-0 p-0"
                    data-testid="food-court-beta-search" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-zinc-100 rounded">
                      <X className="w-3 h-3 text-zinc-400" />
                    </button>
                  )}
                </div>
                <span className="text-xs text-zinc-400" data-testid="food-court-beta-meta">
                  {sortedOrders.length} orders · {selectedStation} · {appliedFrom} → {appliedTo}
                </span>
              </div>

              {/* Table — identical structure to FoodCourtMockup */}
              <div className="bg-white border border-zinc-200 rounded-sm overflow-hidden">
                <div className="overflow-x-auto" data-testid="food-court-beta-table-container">
                  <table className="w-full" data-testid="food-court-beta-table">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        {COLUMNS.map(col => (
                          <th key={col.key}
                            onClick={() => col.sortable && handleSort(col.key)}
                            className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:text-zinc-700' : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                            data-testid={`food-court-beta-col-${col.key}`}>
                            <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                              {col.label}
                              {col.sortable && <SortIcon col={col.key} />}
                            </div>
                          </th>
                        ))}
                      </tr>

                      {/* Orange TOTALS row — identical to FoodCourtMockup */}
                      {columnTotals && (
                        <tr className="bg-[#F26B33]/5 border-b-2 border-[#F26B33]/30 sticky top-[34px]"
                            data-testid="food-court-beta-totals-row">
                          {COLUMNS.map(col => {
                            if (col.key === 'display_order_id') return <td key={col.key} className="px-3 py-1.5 text-[11px] font-bold text-[#F26B33] uppercase tracking-wider">TOTALS</td>;
                            if (['station_gst','_items_text','order_date','order_time','payment_method'].includes(col.key)) return <td key={col.key} className="px-3 py-1.5 text-zinc-300 text-[11px]">&mdash;</td>;
                            if (col.key === 'gst') return <td key={col.key} className="px-3 py-1.5 text-right text-[11px] font-bold text-[#F26B33] tabular-nums">{fmtCur((columnTotals.gst||0)+(columnTotals.vat||0))}</td>;
                            const numVal = columnTotals[col.key];
                            if (typeof numVal === 'number') {
                              return <td key={col.key} className={`px-3 py-1.5 ${col.align === 'center' ? 'text-center' : 'text-right'} text-[11px] font-bold text-[#F26B33] tabular-nums`}>{col.align === 'right' ? fmtCur(numVal) : numVal}</td>;
                            }
                            return <td key={col.key} className="px-3 py-1.5 text-zinc-300 text-[11px]">&mdash;</td>;
                          })}
                        </tr>
                      )}
                    </thead>

                    <tbody>
                      {sortedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-sm text-zinc-400">
                            {selectedStation ? 'No orders for the selected period' : 'Select a station to view orders'}
                          </td>
                        </tr>
                      ) : sortedOrders.map((o, idx) => (
                        <tr key={o.order_id || idx}
                            className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
                            data-testid={`food-court-beta-row-${o.order_id}`}>
                          {COLUMNS.map(col => {
                            // CR-157: use display_order_id directly (pre-formatted #ID#STATION)
                            if (col.key === 'display_order_id') return (
                              <td key={col.key} className="px-3 py-2.5 text-[#F26B33] font-semibold text-sm whitespace-nowrap">
                                {o.display_order_id || `#${o.order_id}`}
                              </td>
                            );
                            // CR-157: STATION GST column — show value or "—"
                            if (col.key === 'station_gst') return (
                              <td key={col.key} className="px-3 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
                                {o.station_gst || <span className="text-zinc-300">&mdash;</span>}
                              </td>
                            );
                            // Items inline text
                            if (col.key === '_items_text') return (
                              <td key={col.key} className="px-3 py-2.5 text-xs text-zinc-600 max-w-xs">
                                <span className="line-clamp-2">{itemsText(o.items)}</span>
                              </td>
                            );
                            if (col.key === 'payment_method') return (
                              <td key={col.key} className="px-3 py-2.5 text-xs text-zinc-600">
                                {o.payment_method || '—'}
                              </td>
                            );
                            // GST = gst + vat
                            if (col.key === 'gst') return (
                              <td key={col.key} className="px-3 py-2.5 text-right text-xs text-zinc-700 tabular-nums">
                                {fmtCur((o.gst || 0) + (o.vat || 0))}
                              </td>
                            );
                            const v = o[col.key];
                            if (col.align === 'right' && typeof v === 'number') return (
                              <td key={col.key} className="px-3 py-2.5 text-right text-xs tabular-nums font-semibold text-zinc-900">
                                {fmtCur(v)}
                              </td>
                            );
                            if (col.align === 'center') return (
                              <td key={col.key} className="px-3 py-2.5 text-center text-xs text-zinc-700">{v ?? '—'}</td>
                            );
                            return (
                              <td key={col.key} className="px-3 py-2.5 text-xs text-zinc-600 whitespace-nowrap">{v ?? '—'}</td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
}
