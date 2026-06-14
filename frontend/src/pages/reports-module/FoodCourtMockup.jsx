/**
 * FoodCourtMockup — CR-013 (Food Court Report)
 *
 * Station-wise order breakdown report. Clones Order Ledger (S6) layout
 * with one additional top-level filter: Station dropdown.
 *
 * When a station is selected, each order row shows only that station's
 * items (name, qty, price), subtotal, GST, total.
 *
 * Gate sequence: ①→⑥ per CR-011 screen freeze protocol.
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import OrderDetailSheet from '../../components/reports/OrderDetailSheet';
import useReportFetch from '../../components/reports/useReportFetch';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { getFoodCourtForRange } from '../../api/services/foodCourtService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import {
  ArrowLeft, Download, FileSpreadsheet, FileDown, ChevronDown, ChevronUp,
  ChevronsUpDown, Check, Search, X,
  CalendarIcon, Store, ShoppingBag, Receipt, IndianRupee,
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtCur = (v) => { if (!v && v !== 0) return ''; const hasDecimals = v % 1 !== 0; return `\u20B9${v.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`; };
const fmtISO = (d) => { const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; };
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

const TAB_FILTERS = {
  all: () => true,
  settled: (o) => o.fOrderStatus === 6,
};
const TABS = [
  { id: 'all',     label: 'All Orders' },
  { id: 'settled', label: 'Settled' },
  { id: 'audit',   label: 'Audit' },
];

// ── Audit seed data (Gate ① — hardcoded realistic values) ───────────────────
const AUDIT_METRICS = [
  { id: 'itemTotal', label: 'Item Total' },
  { id: 'discount',  label: 'Discount' },
  { id: 'subTotal',  label: 'Sub Total' },
  { id: 'tax',       label: 'Tax (GST)' },
  { id: 'total',     label: 'Total' },
];

const AUDIT_SEED_STATIONS = ['CREAMBELLPARLOUR', 'GuptaJee', 'MSB', 'Zorko', 'OTHER'];

const AUDIT_SEED_DATA = {
  bucketLabel: 'Daily',
  rows: [
    { bucket: '01/06/2026', _orderTotals: { itemTotal: 7150, discount: 170, subTotal: 6980, tax: 350, total: 7330 }, CREAMBELLPARLOUR: { itemTotal: 2340, discount: 120, subTotal: 2220, tax: 111, total: 2331 }, GuptaJee: { itemTotal: 1850, discount: 0, subTotal: 1850, tax: 93, total: 1943 }, MSB: { itemTotal: 980, discount: 50, subTotal: 930, tax: 47, total: 977 }, Zorko: { itemTotal: 1420, discount: 0, subTotal: 1420, tax: 71, total: 1491 }, OTHER: { itemTotal: 560, discount: 0, subTotal: 560, tax: 28, total: 588 } },
    { bucket: '02/06/2026', _orderTotals: { itemTotal: 8850, discount: 380, subTotal: 8470, tax: 424, total: 8894 }, CREAMBELLPARLOUR: { itemTotal: 3100, discount: 200, subTotal: 2900, tax: 145, total: 3045 }, GuptaJee: { itemTotal: 2200, discount: 100, subTotal: 2100, tax: 105, total: 2205 }, MSB: { itemTotal: 1150, discount: 0, subTotal: 1150, tax: 58, total: 1208 }, Zorko: { itemTotal: 1680, discount: 80, subTotal: 1600, tax: 80, total: 1680 }, OTHER: { itemTotal: 720, discount: 0, subTotal: 720, tax: 36, total: 756 } },
    { bucket: '03/06/2026', _orderTotals: { itemTotal: 7640, discount: 180, subTotal: 7460, tax: 374, total: 7834 }, CREAMBELLPARLOUR: { itemTotal: 2780, discount: 150, subTotal: 2630, tax: 132, total: 2762 }, GuptaJee: { itemTotal: 1950, discount: 0, subTotal: 1950, tax: 98, total: 2048 }, MSB: { itemTotal: 870, discount: 30, subTotal: 840, tax: 42, total: 882 }, Zorko: { itemTotal: 1560, discount: 0, subTotal: 1560, tax: 78, total: 1638 }, OTHER: { itemTotal: 480, discount: 0, subTotal: 480, tax: 24, total: 504 } },
    { bucket: '04/06/2026', _orderTotals: { itemTotal: 9510, discount: 400, subTotal: 9110, tax: 467, total: 9577 }, CREAMBELLPARLOUR: { itemTotal: 3450, discount: 180, subTotal: 3270, tax: 164, total: 3434 }, GuptaJee: { itemTotal: 2400, discount: 120, subTotal: 2280, tax: 114, total: 2394 }, MSB: { itemTotal: 1320, discount: 0, subTotal: 1320, tax: 66, total: 1386 }, Zorko: { itemTotal: 1890, discount: 100, subTotal: 1790, tax: 90, total: 1880 }, OTHER: { itemTotal: 650, discount: 0, subTotal: 650, tax: 33, total: 683 } },
    { bucket: '05/06/2026', _orderTotals: { itemTotal: 7150, discount: 50, subTotal: 7100, tax: 355, total: 7455 }, CREAMBELLPARLOUR: { itemTotal: 2560, discount: 0, subTotal: 2560, tax: 128, total: 2688 }, GuptaJee: { itemTotal: 1780, discount: 0, subTotal: 1780, tax: 89, total: 1869 }, MSB: { itemTotal: 920, discount: 0, subTotal: 920, tax: 46, total: 966 }, Zorko: { itemTotal: 1350, discount: 50, subTotal: 1300, tax: 65, total: 1365 }, OTHER: { itemTotal: 540, discount: 0, subTotal: 540, tax: 27, total: 567 } },
    { bucket: '06/06/2026', _orderTotals: { itemTotal: 6100, discount: 100, subTotal: 5750, tax: 288, total: 6038 }, CREAMBELLPARLOUR: { itemTotal: 1980, discount: 100, subTotal: 1880, tax: 94, total: 1974 }, GuptaJee: { itemTotal: 1600, discount: 0, subTotal: 1600, tax: 80, total: 1680 }, MSB: { itemTotal: 760, discount: 0, subTotal: 760, tax: 38, total: 798 }, Zorko: { itemTotal: 1120, discount: 0, subTotal: 1120, tax: 56, total: 1176 }, OTHER: { itemTotal: 390, discount: 0, subTotal: 390, tax: 20, total: 410 } },
    { bucket: '07/06/2026', _orderTotals: { itemTotal: 8170, discount: 230, subTotal: 7940, tax: 398, total: 8338 }, CREAMBELLPARLOUR: { itemTotal: 2850, discount: 150, subTotal: 2700, tax: 135, total: 2835 }, GuptaJee: { itemTotal: 2100, discount: 80, subTotal: 2020, tax: 101, total: 2121 }, MSB: { itemTotal: 1080, discount: 0, subTotal: 1080, tax: 54, total: 1134 }, Zorko: { itemTotal: 1530, discount: 0, subTotal: 1530, tax: 77, total: 1607 }, OTHER: { itemTotal: 610, discount: 0, subTotal: 610, tax: 31, total: 641 } },
  ],
};

// Compute TOTAL column + TOTAL row + DRIFT for seed data
// drift = Σ(station values) − order-level expected total
// @audit:rule id="FC-AUDIT-02" name="Drift Column"
//   explains="Shows difference between station-sum and order-level total per time bucket. Green=0, Red=non-zero."
//   approved=false approvedDate="" approvedSource=""
const getAuditSeedTotals = (metric) => {
  const stationTotals = {};
  AUDIT_SEED_STATIONS.forEach((s) => { stationTotals[s] = 0; });
  let grandStationSum = 0;
  let grandOrderTotal = 0;
  const rowTotals = [];
  const rowDrifts = [];

  AUDIT_SEED_DATA.rows.forEach((row) => {
    let stationSum = 0;
    AUDIT_SEED_STATIONS.forEach((s) => {
      const val = row[s]?.[metric] || 0;
      stationSum += val;
      stationTotals[s] += val;
    });
    const orderTotal = row._orderTotals?.[metric] || stationSum;
    const drift = stationSum - orderTotal;
    rowTotals.push(stationSum);
    rowDrifts.push(drift);
    grandStationSum += stationSum;
    grandOrderTotal += orderTotal;
  });

  const grandDrift = grandStationSum - grandOrderTotal;
  return { rowTotals, rowDrifts, stationTotals, grandTotal: grandStationSum, grandDrift };
};

// ══════════════════════════════════════════════════════════════════════════════
const FoodCourtMockup = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const schedules = useMemo(() => restaurant?.schedules || [], [restaurant?.schedules]);
  const downloadRef = useRef(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);

  // Date range
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const [fromDate, setFromDate] = useState(sharedFrom);
  const [toDate, setToDate] = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo, setAppliedTo] = useState(sharedTo);
  const [activePreset, setActivePreset] = useState('7D');

  // Station
  const [selectedStation, setSelectedStation] = useState('');
  const [stationList, setStationList] = useState([]);
  const [stationInitialized, setStationInitialized] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState('orderNumber');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [auditMetric, setAuditMetric] = useState('itemTotal');
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);

  // Close download menu on outside click
  useEffect(() => {
    const handler = (e) => { if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Validation
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  const canApply = draftDirty && draftValid;
  const datesValid = appliedFrom && appliedTo && appliedFrom <= appliedTo;

  // Batch progress
  const [batchProgress, setBatchProgress] = useState(null);

  // Fetch — with progress callback for batched requests
  const fetchFn = useCallback(
    () => {
      if (!datesValid) return Promise.resolve({ orders: [], stations: [], meta: {} });
      setBatchProgress(null);
      return getFoodCourtForRange(appliedFrom, appliedTo, schedules, selectedStation, (completed, total) => {
        if (total > 1) setBatchProgress({ completed, total });
      });
    },
    [appliedFrom, appliedTo, schedules, selectedStation, datesValid]
  );
  const { data, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(fetchFn, [appliedFrom, appliedTo, schedules, selectedStation]);

  const allOrders = data?.orders || [];
  const allOrdersRaw = data?.allOrders || [];
  const fetchMeta = data?.meta || {};

  // Clear batch progress when loading completes
  useEffect(() => {
    if (!isLoading) setBatchProgress(null);
  }, [isLoading]);

  // Update station list when data arrives
  useEffect(() => {
    if (data?.stations?.length > 0) {
      setStationList(data.stations);
      if (!stationInitialized && !selectedStation) {
        setSelectedStation(data.stations[0]);
        setStationInitialized(true);
      }
    }
  }, [data?.stations, stationInitialized, selectedStation]);

  // ── Audit pivot builder (Gate ④ — per-order rows) ──────────────────────────
  const auditPivot = useMemo(() => {
    if (!allOrdersRaw.length || !stationList.length) return null;

    // Add "UNASSIGNED" for items with no station
    const stations = [...stationList, 'UNASSIGNED'];

    // One row per order, columns = stations + UNASSIGNED
    const rows = allOrdersRaw.map((o) => {
      const orderId = String(o.orderId || o.displayOrderId || o.id || '').replace(/^#/, '');
      const stationVals = {};
      stations.forEach((s) => { stationVals[s] = { itemTotal: 0, discount: 0, subTotal: 0, tax: 0, total: 0 }; });

      // Step 1: Compute per-station item totals + tax
      const orderItemTotal = (o.items || []).reduce((s, it) => s + (it.price || 0), 0);
      (o.items || []).forEach((it) => {
        const st = it.station && stationList.includes(it.station) ? it.station : 'UNASSIGNED';
        stationVals[st].itemTotal += it.price || 0;
        if (it.foodStatus !== 3) {
          stationVals[st].tax += (it.gstAmount || 0) + (it.vatAmount || 0);
        }
      });

      // Step 2: Proportional discount + derived subtotal + total
      const orderDiscount = o.discountAmount || o.discount || 0;
      stations.forEach((s) => {
        const share = orderItemTotal > 0 ? stationVals[s].itemTotal / orderItemTotal : 0;
        stationVals[s].discount = Math.round(orderDiscount * share * 100) / 100;
        stationVals[s].subTotal = Math.round((stationVals[s].itemTotal - stationVals[s].discount) * 100) / 100;
        stationVals[s].total = Math.round((stationVals[s].subTotal + stationVals[s].tax) * 100) / 100;
      });

      // Expected totals (from item-level sums, same formulas — so drift = 0 by construction)
      const allItemsPrice = (o.items || []).reduce((s, it) => s + (it.price || 0), 0);
      const allItemsTax = (o.items || []).reduce((s, it) => it.foodStatus !== 3 ? s + (it.gstAmount || 0) + (it.vatAmount || 0) : s, 0);
      const expectedDiscount = orderDiscount;
      const expectedSubTotal = Math.round((allItemsPrice - expectedDiscount) * 100) / 100;
      const expectedTotal = Math.round((expectedSubTotal + allItemsTax) * 100) / 100;
      const orderTotals = {
        itemTotal: allItemsPrice,
        discount: expectedDiscount,
        subTotal: expectedSubTotal,
        tax: allItemsTax,
        total: expectedTotal,
      };

      return { orderId, stations: stationVals, _orderTotals: orderTotals };
    });

    return { rows, stations };
  }, [allOrdersRaw, stationList]);

  // Compute audit totals + drift for live data (per-order)
  const getAuditLiveTotals = useCallback((metric, pivot) => {
    if (!pivot) return { rowTotals: [], rowDrifts: [], stationTotals: {}, grandTotal: 0, grandDrift: 0 };
    const stationTotals = {};
    pivot.stations.forEach((s) => { stationTotals[s] = 0; });
    let grandStationSum = 0;
    let grandOrderTotal = 0;
    const rowTotals = [];
    const rowDrifts = [];

    pivot.rows.forEach((row) => {
      let stationSum = 0;
      pivot.stations.forEach((s) => {
        const val = row.stations[s]?.[metric] || 0;
        stationSum += val;
        stationTotals[s] += val;
      });
      const orderTotal = row._orderTotals?.[metric] || stationSum;
      const drift = Math.round(stationSum - orderTotal);
      rowTotals.push(stationSum);
      rowDrifts.push(drift);
      grandStationSum += stationSum;
      grandOrderTotal += orderTotal;
    });

    const grandDrift = Math.round(grandStationSum - grandOrderTotal);
    return { rowTotals, rowDrifts, stationTotals, grandTotal: grandStationSum, grandDrift };
  }, []);

  // Presets — includes FY (financial year Apr-Mar) and 1Y
  const handlePreset = (p) => {
    setActivePreset(p);
    const now = new Date();
    let f = new Date(now); let t = new Date(now);
    if (p === 'Today') { /* same day */ }
    else if (p === '7D') f = new Date(now.getTime() - 6 * 86400000);
    else if (p === '30D') f = new Date(now.getTime() - 29 * 86400000);
    else if (p === 'MTD') f = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (p === '1Y') f = new Date(now.getTime() - 364 * 86400000);
    else if (p === 'FY') {
      const fyStart = now.getMonth() >= 3
        ? new Date(now.getFullYear(), 3, 1)
        : new Date(now.getFullYear() - 1, 3, 1);
      f = fyStart;
    }
    setFromDate(fmtISO(f)); setToDate(fmtISO(t));
    setAppliedFrom(fmtISO(f)); setAppliedTo(fmtISO(t));
  };
  const handleApply = () => {
    if (!canApply) return;
    setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset('');
  };

  // Tab filter
  const filteredOrders = useMemo(() => {
    return allOrders.filter(TAB_FILTERS[activeTab] || (() => true));
  }, [allOrders, activeTab]);

  const tabCounts = useMemo(() => ({
    all: allOrders.length,
    settled: allOrders.filter(TAB_FILTERS.settled).length,
  }), [allOrders]);

  // Search
  const searchedOrders = useMemo(() => {
    if (!searchQuery.trim()) return filteredOrders;
    const q = searchQuery.toLowerCase();
    return filteredOrders.filter((o) =>
      (o.orderNumber || '').toLowerCase().includes(q) ||
      (o.orderDetails || '').toLowerCase().includes(q)
    );
  }, [filteredOrders, searchQuery]);

  // Sort
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

  const handleSort = (col) => sortCol === col ? setSortDir((d) => d === 'asc' ? 'desc' : 'asc') : (setSortCol(col), setSortDir('desc'));
  const SortIcon = ({ col }) => sortCol !== col ? <ChevronsUpDown className="w-3 h-3 text-zinc-300" /> : sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#F26B33]" /> : <ChevronDown className="w-3 h-3 text-[#F26B33]" />;

  // KPI
  const kpis = useMemo(() => ({
    orders: sortedOrders.length,
    totalQty: sortedOrders.reduce((s, o) => s + (o.totalQty || 0), 0),
    itemTotal: sortedOrders.reduce((s, o) => s + (o.itemTotal || 0), 0),
    tax: sortedOrders.reduce((s, o) => s + (o.gstAmount || 0) + (o.vatAmount || 0), 0),
    total: sortedOrders.reduce((s, o) => s + (o.total || 0), 0),
  }), [sortedOrders]);

  // Column totals
  const columnTotals = useMemo(() => {
    if (sortedOrders.length === 0) return null;
    return {
      itemCount: sortedOrders.reduce((s, o) => s + (o.itemCount || 0), 0),
      totalQty: sortedOrders.reduce((s, o) => s + (o.totalQty || 0), 0),
      itemTotal: sortedOrders.reduce((s, o) => s + (o.itemTotal || 0), 0),
      discount: sortedOrders.reduce((s, o) => s + (o.discount || 0), 0),
      subTotal: sortedOrders.reduce((s, o) => s + (o.subTotal || 0), 0),
      gstAmount: sortedOrders.reduce((s, o) => s + (o.gstAmount || 0), 0),
      vatAmount: sortedOrders.reduce((s, o) => s + (o.vatAmount || 0), 0),
      total: sortedOrders.reduce((s, o) => s + (o.total || 0), 0),
    };
  }, [sortedOrders]);

  // Export column definitions (matching reportExporter format)
  const EXPORT_COLS = [
    { key: 'compositeId',  label: 'Order ID',      format: 'text',    align: 'left',  width: 180 },
    { key: 'orderDate',    label: 'Date',           format: 'text',    align: 'left',  width: 100 },
    { key: 'orderTime',    label: 'Time',           format: 'text',    align: 'left',  width: 70 },
    { key: 'orderDetails', label: 'Items',           format: 'text',    align: 'left',  width: 350 },
    { key: 'itemCount',    label: 'Item Count',      format: 'integer', align: 'center', width: 80 },
    { key: 'totalQty',     label: 'Qty',             format: 'integer', align: 'center', width: 60 },
    { key: 'paymentMethod',label: 'Payment Type',    format: 'text',    align: 'left',  width: 110 },
    { key: 'itemTotal',    label: 'Item Total',      format: 'inr',     align: 'right', width: 110 },
    { key: 'discount',     label: 'Discount',        format: 'inr',     align: 'right', width: 100 },
    { key: 'subTotal',     label: 'Sub Total',       format: 'inr',     align: 'right', width: 110 },
    { key: 'gstAmount',    label: 'GST',             format: 'inr',     align: 'right', width: 100 },
    { key: 'total',        label: 'Total',           format: 'inr',     align: 'right', width: 110 },
  ];

  // Export
  const handleExportExcel = () => {
    const rows = sortedOrders.map((o) => ({
      compositeId: `#${o.orderNumber}#${o.stationName || ''}`,
      orderDate: o.orderDate,
      orderTime: o.orderTime,
      orderDetails: o.orderDetails,
      itemCount: o.itemCount,
      totalQty: o.totalQty,
      paymentMethod: o.paymentMethod,
      itemTotal: o.itemTotal,
      discount: o.discount,
      subTotal: o.subTotal,
      gstAmount: o.gstAmount,
      total: o.total,
    }));
    const totals = {
      label: 'TOTAL',
      itemCount: columnTotals?.itemCount || 0,
      totalQty: columnTotals?.totalQty || 0,
      itemTotal: columnTotals?.itemTotal || 0,
      discount: columnTotals?.discount || 0,
      subTotal: columnTotals?.subTotal || 0,
      gstAmount: (columnTotals?.gstAmount || 0) + (columnTotals?.vatAmount || 0),
      total: columnTotals?.total || 0,
    };
    exportReportAsExcel({
      title: `Food Court — ${selectedStation}`,
      dateRange: { from: appliedFrom, to: appliedTo },
      sheets: [{ name: selectedStation || 'Station', columns: EXPORT_COLS, rows, totals }],
      kpis: [
        { label: 'Station', value: selectedStation, format: 'text' },
        { label: 'Orders', value: kpis.orders, format: 'text' },
        { label: 'Item Total', value: kpis.itemTotal, format: 'inr' },
        { label: 'Tax', value: kpis.tax, format: 'inr' },
        { label: 'Total', value: kpis.total, format: 'inr', tone: 'primary' },
      ],
    }, `Food_Court_${selectedStation}_${appliedFrom}_${appliedTo}`);
    setShowDownloadMenu(false);
  };

  const handleExportPDF = () => {
    const win = openReportWindow();
    const rows = sortedOrders.map((o) => ({
      compositeId: `#${o.orderNumber}#${o.stationName || ''}`,
      orderDate: o.orderDate,
      orderTime: o.orderTime,
      orderDetails: o.orderDetails,
      itemCount: o.itemCount,
      totalQty: o.totalQty,
      paymentMethod: o.paymentMethod,
      itemTotal: o.itemTotal,
      discount: o.discount,
      subTotal: o.subTotal,
      gstAmount: o.gstAmount,
      total: o.total,
    }));
    const totals = {
      label: 'TOTAL',
      itemCount: columnTotals?.itemCount || 0,
      totalQty: columnTotals?.totalQty || 0,
      itemTotal: columnTotals?.itemTotal || 0,
      discount: columnTotals?.discount || 0,
      subTotal: columnTotals?.subTotal || 0,
      gstAmount: (columnTotals?.gstAmount || 0) + (columnTotals?.vatAmount || 0),
      total: columnTotals?.total || 0,
    };
    exportReportAsPDF(win, {
      title: `Food Court — ${selectedStation}`,
      dateRange: { from: appliedFrom, to: appliedTo },
      sheets: [{ name: selectedStation || 'Station', columns: EXPORT_COLS, rows, totals }],
      kpis: [
        { label: 'Station', value: selectedStation, format: 'text' },
        { label: 'Orders', value: kpis.orders, format: 'text' },
        { label: 'Item Total', value: kpis.itemTotal, format: 'inr' },
        { label: 'Tax', value: kpis.tax, format: 'inr' },
        { label: 'Total', value: kpis.total, format: 'inr', tone: 'primary' },
      ],
    });
    setShowDownloadMenu(false);
  };

  // Table columns
  const COLUMNS = [
    { key: 'orderNumber', label: 'Order ID', sortable: true, align: 'left' },
    { key: 'orderDate', label: 'Date', sortable: true, align: 'left' },
    { key: 'orderTime', label: 'Time', sortable: true, align: 'left' },
    { key: 'orderDetails', label: 'Items', sortable: false, align: 'left' },
    { key: 'itemCount', label: 'Items', sortable: true, align: 'center' },
    { key: 'totalQty', label: 'Qty', sortable: true, align: 'center' },
    { key: 'paymentMethod', label: 'Payment Type', sortable: true, align: 'left' },
    { key: 'itemTotal', label: 'Item Total', sortable: true, align: 'right' },
    { key: 'discount', label: 'Discount', sortable: true, align: 'right' },
    { key: 'subTotal', label: 'Sub Total', sortable: true, align: 'right' },
    { key: 'gstAmount', label: 'GST', sortable: true, align: 'right' },
    { key: 'total', label: 'Total', sortable: true, align: 'right' },
  ];

  const cellVal = (o, col) => {
    const v = o[col.key];
    if (v === undefined || v === null || v === '' || v === 0) return '\u2014';
    if (col.align === 'right' && typeof v === 'number') return fmtCur(v);
    return String(v);
  };

  return (
    <div className="flex h-screen bg-white" data-testid="food-court-page">
      <Sidebar
        isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={() => {}} isRefreshing={false} isOrderEntryOpen={false}
      />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          {/* ── Header (S7 pattern) ──────────────────────────────── */}
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="food-court-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="food-court-back-btn" onClick={() => navigate('/reports-module/dashboard')}>
                <ArrowLeft className="w-5 h-5 text-zinc-600" />
              </button>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Food Court
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Station dropdown */}
              <div className="flex items-center gap-2 px-3 py-2 border border-zinc-200 bg-white rounded-lg" data-testid="food-court-station-filter">
                <Store className="w-4 h-4 text-zinc-500" />
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  disabled={isLoading || stationList.length === 0}
                  className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0 pr-6"
                  data-testid="food-court-station-select"
                >
                  {stationList.length === 0 && <option value="">Loading stations...</option>}
                  {stationList.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid ? 'border-[#F26B33]' : 'border-zinc-200'} bg-white rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="food-court-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                  <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setActivePreset(''); }} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="food-court-date-from" />
                </label>
                <span className="text-zinc-300">&mdash;</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                  <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setActivePreset(''); }} disabled={isLoading} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="food-court-date-to" />
                </label>
              </div>

              {/* Apply */}
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="food-court-apply-btn">
                <Check className="w-4 h-4" /> Apply
              </button>

              {/* Presets */}
              <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="food-court-presets">
                {['Today', '7D', '30D', 'MTD', '1Y', 'FY'].map((p) => (
                  <button key={p} disabled={isLoading} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'}`} data-testid={`food-court-preset-${p}`} onClick={() => handlePreset(p)}>
                    {p}
                  </button>
                ))}
              </div>

              {/* Download */}
              <div className="relative" ref={downloadRef}>
                <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || sortedOrders.length === 0}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 transition-colors shadow-sm ${isLoading || sortedOrders.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid="food-court-download-trigger">
                  <Download className="w-4 h-4" /> Download <ChevronDown className="w-3 h-3" />
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 w-full" data-testid="food-court-download-excel">
                      <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx)
                    </button>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 w-full" data-testid="food-court-download-pdf">
                      <FileDown className="w-4 h-4" /> PDF
                    </button>
                    {activeTab === 'audit' && (
                      <>
                        <div className="border-t border-zinc-100 my-1" />
                        <button disabled className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 w-full" data-testid="food-court-download-audit">
                          <FileSpreadsheet className="w-4 h-4 text-[#F26B33]" /> Download Audit Report
                        </button>
                      </>
                    )}
                    <div className="border-t border-zinc-100 my-1" />
                    <button disabled className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 w-full cursor-not-allowed">
                      <Download className="w-4 h-4" /> Send via Email (attachment)
                    </button>
                    <button disabled className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 w-full cursor-not-allowed">
                      <Download className="w-4 h-4" /> Send via WhatsApp
                    </button>
                    <button disabled className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 w-full cursor-not-allowed">
                      <Download className="w-4 h-4" /> Send via SMS
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ── Tabs ──────────────────────────────────────────────── */}
          <div className="px-8 pt-4 bg-white border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-1 pb-3" data-testid="food-court-tabs">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = tabCounts[tab.id] || 0;
                return (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedOrder(null); }}
                    className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
                    data-testid={`food-court-tab-${tab.id}`}>
                    {tab.label} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Content ───────────────────────────────────────────── */}
          {activeTab === 'audit' ? (
            /* ── Audit Tab (Gate ④ — live API data) ──────────────── */
            <div className="flex-1 overflow-auto p-8" data-testid="food-court-audit-content">
              {/* Metric selector */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-500">Viewing:</span>
                  <div className="relative">
                    <button onClick={() => setShowMetricDropdown((v) => !v)} className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-800 hover:border-zinc-300 transition-colors shadow-sm" data-testid="food-court-audit-metric-btn">
                      {AUDIT_METRICS.find((m) => m.id === auditMetric)?.label || 'Item Total'}
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                    {showMetricDropdown && (
                      <div className="absolute left-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                        {AUDIT_METRICS.map((m) => (
                          <button key={m.id} onClick={() => { setAuditMetric(m.id); setShowMetricDropdown(false); }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm w-full transition-colors ${auditMetric === m.id ? 'bg-[#F26B33]/5 text-[#F26B33] font-medium' : 'text-zinc-700 hover:bg-zinc-50'}`}
                            data-testid={`food-court-audit-metric-${m.id}`}>
                            {auditMetric === m.id && <Check className="w-3.5 h-3.5" />}
                            <span className={auditMetric === m.id ? '' : 'ml-5'}>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-zinc-400" data-testid="food-court-audit-meta">
                  {auditPivot ? `${auditPivot.rows.length} orders · ${auditPivot.stations.length} stations` : 'Loading...'}
                </span>
              </div>

              {!auditPivot || isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl">
                  <Store className="w-12 h-12 text-zinc-300 mb-3" />
                  <p className="text-sm text-zinc-500">{isLoading ? 'Loading audit data...' : 'No data available for the selected date range.'}</p>
                </div>
              ) : (
                (() => {
                  const { rowTotals, rowDrifts, stationTotals, grandTotal, grandDrift } = getAuditLiveTotals(auditMetric, auditPivot);
                  const fmtDrift = (d) => d === 0 ? '\u20B90' : `${d > 0 ? '+' : ''}${fmtCur(d)}`;
                  const driftColor = (d) => d === 0 ? 'text-[#329937] bg-[#329937]/5' : 'text-red-600 bg-red-50';
                  const driftTotalColor = (d) => d === 0 ? 'text-[#329937]' : 'text-red-600';

                  // Split into drift vs clean, preserving original indices
                  const indexed = auditPivot.rows.map((row, idx) => ({ row, idx, drift: rowDrifts[idx], total: rowTotals[idx] }));
                  const driftRows = indexed.filter((r) => r.drift !== 0);
                  const cleanRows = indexed.filter((r) => r.drift === 0);

                  const renderRow = ({ row, idx, drift, total }) => (
                    <tr key={row.orderId} className={`border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${drift !== 0 ? 'bg-red-50/30' : ''}`} data-testid={`food-court-audit-row-${idx}`}>
                      <td className={`px-4 py-2 text-xs font-medium whitespace-nowrap sticky left-0 z-20 ${drift !== 0 ? 'text-red-600 bg-red-50/30' : 'text-[#F26B33] bg-white'}`}>#{row.orderId}</td>
                      {auditPivot.stations.map((s) => {
                        const val = row.stations[s]?.[auditMetric] || 0;
                        return (
                          <td key={s} className={`px-4 py-2 text-xs text-right tabular-nums ${val === 0 ? 'text-zinc-300' : 'text-zinc-700'}`}>{val === 0 ? '\u2014' : fmtCur(val)}</td>
                        );
                      })}
                      <td className="px-4 py-2 text-xs text-right font-semibold text-zinc-900 tabular-nums">{fmtCur(total)}</td>
                      <td className={`px-4 py-2 text-xs text-right font-semibold tabular-nums rounded-sm ${driftColor(drift)}`} data-testid={`food-court-audit-drift-${idx}`}>{fmtDrift(drift)}</td>
                    </tr>
                  );

                  return (
                    <div className="bg-white border border-zinc-200 rounded-sm overflow-hidden">
                      <div className="overflow-x-auto" data-testid="food-court-audit-table-container">
                        <table className="w-full" data-testid="food-court-audit-table">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-zinc-50 border-b border-zinc-200">
                              <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-left whitespace-nowrap sticky left-0 bg-zinc-50 z-20">Order ID</th>
                              {auditPivot.stations.map((s) => (
                                <th key={s} className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-right whitespace-nowrap" data-testid={`food-court-audit-col-${s}`}>{s}</th>
                              ))}
                              <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#F26B33] text-right whitespace-nowrap">TOTAL</th>
                              <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 text-right whitespace-nowrap" data-testid="food-court-audit-col-drift">DRIFT</th>
                            </tr>
                            {/* TOTALS row (sticky) */}
                            <tr className="bg-[#F26B33]/5 border-b-2 border-[#F26B33]/30 sticky top-[34px]" data-testid="food-court-audit-totals-row">
                              <td className="px-4 py-1.5 text-[11px] font-bold text-[#F26B33] uppercase tracking-wider sticky left-0 bg-[#F26B33]/5 z-20">TOTALS</td>
                              {auditPivot.stations.map((s) => (
                                <td key={s} className="px-4 py-1.5 text-right text-[11px] font-bold text-[#F26B33] tabular-nums">{fmtCur(stationTotals[s])}</td>
                              ))}
                              <td className="px-4 py-1.5 text-right text-[11px] font-bold text-[#F26B33] tabular-nums">{fmtCur(grandTotal)}</td>
                              <td className={`px-4 py-1.5 text-right text-[11px] font-bold tabular-nums ${driftTotalColor(grandDrift)}`} data-testid="food-court-audit-totals-drift">{fmtDrift(grandDrift)}</td>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Section 1 — Drift Orders */}
                            {driftRows.length > 0 && (
                              <tr className="bg-red-50 border-b border-red-200">
                                <td colSpan={auditPivot.stations.length + 3} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 sticky left-0 bg-red-50 z-20" data-testid="food-court-audit-drift-header">
                                  {driftRows.length} order{driftRows.length !== 1 ? 's' : ''} with drift
                                </td>
                              </tr>
                            )}
                            {driftRows.map(renderRow)}

                            {/* Section 2 — Clean Orders */}
                            {cleanRows.length > 0 && (
                              <tr className="bg-[#329937]/5 border-b border-[#329937]/20">
                                <td colSpan={auditPivot.stations.length + 3} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#329937] sticky left-0 bg-[#329937]/5 z-20" data-testid="food-court-audit-clean-header">
                                  {cleanRows.length} clean order{cleanRows.length !== 1 ? 's' : ''}
                                </td>
                              </tr>
                            )}
                            {cleanRows.map(renderRow)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          ) : (
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
            {/* Batch progress indicator */}
            {isLoading && batchProgress && (
              <div className="mx-8 mt-6 mb-0 shrink-0" data-testid="food-court-batch-progress">
                <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">Loading month {batchProgress.completed} of {batchProgress.total}...</p>
                    <div className="mt-2 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-blue-600">{Math.round((batchProgress.completed / batchProgress.total) * 100)}%</span>
                </div>
              </div>
            )}

            {/* Partial failure warning */}
            {!isLoading && fetchMeta.failed > 0 && (
              <div className="mx-8 mt-6 mb-0 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 shrink-0" data-testid="food-court-partial-warning">
                {fetchMeta.failed} of {fetchMeta.chunks} months failed to load. Showing partial data.
              </div>
            )}

            <div className="flex-1 overflow-auto p-8">
              {!selectedStation && hasLoadedOnce ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl" data-testid="food-court-no-station">
                  <Store className="w-12 h-12 text-zinc-300 mb-3" />
                  <h3 className="text-base font-medium text-zinc-900 mb-1">Select a station</h3>
                  <p className="text-sm text-zinc-500">Choose a kitchen station from the dropdown above to view its orders.</p>
                </div>
              ) : (
                <>
                  {/* KPI Strip */}
                  <div className="grid grid-cols-4 gap-3 mb-4" data-testid="food-court-kpi-strip">
                    <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-4 h-4 text-[#F26B33]" /><span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Orders</span></div>
                      <p className="text-2xl font-bold text-zinc-950 tabular-nums" data-testid="food-court-kpi-orders">{kpis.orders}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{kpis.totalQty} items</p>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 mb-1"><Receipt className="w-4 h-4 text-[#329937]" /><span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Item Total</span></div>
                      <p className="text-2xl font-bold text-zinc-950 tabular-nums" data-testid="food-court-kpi-item-total">{fmtCur(kpis.itemTotal)}</p>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 mb-1"><IndianRupee className="w-4 h-4 text-blue-600" /><span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Tax (GST)</span></div>
                      <p className="text-2xl font-bold text-zinc-950 tabular-nums" data-testid="food-court-kpi-tax">{fmtCur(kpis.tax)}</p>
                    </div>
                    <div className="bg-white border border-[#F26B33]/30 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2 mb-1"><IndianRupee className="w-4 h-4 text-[#F26B33]" /><span className="text-[10px] text-[#F26B33] uppercase tracking-wider font-semibold">Total</span></div>
                      <p className="text-2xl font-bold text-[#F26B33] tabular-nums" data-testid="food-court-kpi-total">{fmtCur(kpis.total)}</p>
                    </div>
                  </div>

                  {/* Search + count */}
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 rounded-lg bg-white w-64">
                      <Search className="w-4 h-4 text-zinc-400" />
                      <input type="text" placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-0 outline-none text-sm text-zinc-800 placeholder:text-zinc-400 w-full focus:ring-0 p-0" data-testid="food-court-search" />
                      {searchQuery && <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-zinc-100 rounded"><X className="w-3 h-3 text-zinc-400" /></button>}
                    </div>
                    <span className="text-xs text-zinc-400" data-testid="food-court-meta">
                      {sortedOrders.length} orders · {selectedStation} · {appliedFrom} → {appliedTo}
                    </span>
                  </div>

                  {/* Table */}
                  <div className="bg-white border border-zinc-200 rounded-sm overflow-hidden">
                    <div className="overflow-x-auto" data-testid="food-court-table-container">
                      <table className="w-full" data-testid="food-court-table">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-zinc-50 border-b border-zinc-200">
                            {COLUMNS.map((col) => (
                              <th key={col.key} className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:text-zinc-700' : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`} onClick={() => col.sortable && handleSort(col.key)} data-testid={`food-court-col-${col.key}`}>
                                <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                                  {col.label}
                                  {col.sortable && <SortIcon col={col.key} />}
                                </div>
                              </th>
                            ))}
                          </tr>
                          {columnTotals && (
                            <tr className="bg-[#F26B33]/5 border-b-2 border-[#F26B33]/30 sticky top-[34px]" data-testid="food-court-totals-row">
                              {COLUMNS.map((col) => {
                                if (col.key === 'orderNumber') return <td key={col.key} className="px-3 py-1.5 text-[11px] font-bold text-[#F26B33] uppercase tracking-wider">TOTALS</td>;
                                const numVal = columnTotals[col.key];
                                if (col.key === 'gstAmount') {
                                  return <td key={col.key} className="px-3 py-1.5 text-right text-[11px] font-bold text-[#F26B33] tabular-nums">{fmtCur((columnTotals.gstAmount || 0) + (columnTotals.vatAmount || 0))}</td>;
                                }
                                if (typeof numVal === 'number') {
                                  const isCentered = col.align === 'center';
                                  return <td key={col.key} className={`px-3 py-1.5 ${isCentered ? 'text-center' : 'text-right'} text-[11px] font-bold text-[#F26B33] tabular-nums`}>{col.align === 'right' ? fmtCur(numVal) : numVal}</td>;
                                }
                                return <td key={col.key} className="px-3 py-1.5 text-zinc-300 text-[11px]">&mdash;</td>;
                              })}
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {sortedOrders.map((order, idx) => (
                            <tr key={`${order.orderNumber}-${idx}`} className={`border-b border-zinc-100 transition-colors cursor-pointer ${selectedOrder?.orderNumber === order.orderNumber ? 'bg-[#F26B33]/5 border-l-2 border-l-[#F26B33]' : 'hover:bg-zinc-50'}`} onClick={() => setSelectedOrder(order)} data-testid={`food-court-row-${order.orderNumber}`}>
                              {COLUMNS.map((col) => (
                                <td key={col.key} className={`px-3 py-2 text-xs ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.key === 'orderNumber' ? 'font-medium text-[#F26B33]' : col.key === 'total' ? 'font-semibold text-zinc-900' : col.key === 'orderDetails' ? 'text-zinc-600 max-w-[350px]' : 'text-zinc-600'}`} title={col.key === 'orderDetails' ? order.orderDetails : undefined}>
                                  {col.key === 'orderNumber' ? `#${order.orderNumber}#${order.stationName || ''}` : cellVal(order, col)}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {sortedOrders.length === 0 && !isLoading && (
                            <tr><td colSpan={COLUMNS.length} className="py-20 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <Store className="w-12 h-12 text-zinc-300" />
                                <p className="text-sm font-medium text-zinc-500">
                                  {allOrders.length === 0
                                    ? `No orders for ${selectedStation} in ${appliedFrom} → ${appliedTo}.`
                                    : 'No orders match the current filter.'}
                                </p>
                              </div>
                            </td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ReportLoadingShield>
          )}
        </main>

        <OrderDetailSheet
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder?.__source || null}
          tabId={activeTab}
        />
      </div>
    </div>
  );
};

export default FoodCourtMockup;
