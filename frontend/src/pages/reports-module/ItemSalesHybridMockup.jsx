/**
 * ItemSalesHybridMockup — CR-011 S5 (Phase 2 Hero Screen)
 *
 * Gate ① Mockup (visual review only — NO live API, NO real export).
 * Carries forward the frozen S2 5-tab anatomy + Apply button + 62-day max range
 * and adds the unified Download menu (Excel · PDF · Email · WhatsApp · SMS) per
 * scope addendum: `/app/memory/memory/change_requests/impact_analysis/CR_011_S5_SCOPE_ADDENDUM_2026_06_02.md`
 *
 * Differences vs frozen S2 (`ItemSalesMockup.jsx`):
 *  - Two separate PDF + Excel buttons → ONE `Download` trigger that opens a dropdown
 *  - Dropdown shows 5 options: Excel · PDF · Email · WhatsApp · SMS
 *  - Excel + PDF are ENABLED (mockup stubs to console.info — real export wires at Code Gate 2)
 *  - Email + WhatsApp + SMS are DISABLED placeholders (Phase 2B tooltip)
 *  - Uses SEED data only (S2 is the live one; S5 stays seed-only until owner signs off Gate ①)
 *  - Title chip says "Item Ledger" so reviewer can tell screens apart
 *
 * Anything else (filters, sort, drill, attribution toggle, presets) is byte-for-byte
 * carried forward from S2 to make visual review trivial. Once owner says "lock it",
 * Code Gate 2 swaps seed → live API + ships the shared `reportExporter.js` primitive.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ItemDrillSheet from './ItemDrillSheet';
import { getItemSalesAggregated, fetchInsightsItems, transformItemRows } from '../../api/services/insightsService'; // CR-049: +backend fetch, keep old for audit lazy
import useReportFetch from '../../components/reports/useReportFetch';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import { auditSummary } from '../../utils/auditEngine';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  X,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Check,
  Download,
  FileSpreadsheet,
  FileDown,
  Mail,
  MessageCircle,
  Send,
  ShieldAlert,
  Copy,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────────
// S5 reads from the same live service that S2 (frozen) reads from. Seed-data
// generators removed at Gate ④ (live API wiring). Empty/error states are now
// driven by `ReportLoadingShield` consistent with the rest of the Reports
// module.
// ────────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────────
// S5 Re-open (2026-06-05): "All Items" tab added at index 0 per owner lock-it §2.
// Audit tab visibility — env-gated (preprod only, hidden in production)
const SHOW_AUDIT_TAB = process.env.REACT_APP_SHOW_AUDIT_TAB === 'true';

// Tab order revised per owner directive 2026-06-05: All → Sold → Cancelled → Comp → Pending → Top → Slow → [Phase 3: Variations → Addons → Comp Detail → By Station] → Audit (env-gated)
const ALL_TABS = [
  { id: 'all_items', label: 'All Items'        },
  { id: 'all',       label: 'Sold'             },
  { id: 'cancelled', label: 'Cancelled'        },
  { id: 'comp',      label: 'Complimentary'    },
  { id: 'pending',   label: 'Pending Billing'  },
  { id: 'credit',    label: 'Added to Credit'  }, // CR-034 (GO-3): parent pm='TAB'
  { id: 'top',       label: 'Top Sellers'      },
  { id: 'slow',      label: 'Slow Movers'      },
  // CR-011 Phase 3 Batch B (S15–S18):
  { id: 'variations', label: 'Variations'      }, // S15
  { id: 'addons',     label: 'Addons'          }, // S16
  { id: 'comp_detail', label: 'Comp Detail'    }, // S17
  { id: 'by_station', label: 'By Station'      }, // S18
  { id: 'audit',     label: 'Audit'            },  // CR-011-AUDIT-01
];
const TABS = SHOW_AUDIT_TAB ? ALL_TABS : ALL_TABS.filter(t => t.id !== 'audit');

// Download menu spec (matches scope addendum §1.2 exactly).
// Note: `enabled` for excel + pdf is overridden at render time by `audit.blocksExport`.
const DOWNLOAD_MENU = [
  { id: 'excel',    label: 'Download as Excel',           icon: FileSpreadsheet, enabled: true,  testId: 'report-download-excel-btn',  tip: '',  phase: null },
  { id: 'pdf',      label: 'Download as PDF',             icon: FileDown,        enabled: true,  testId: 'report-download-pdf-btn',    tip: '',  phase: null },
  { id: 'email',    label: 'Send via Email',              icon: Mail,            enabled: false, testId: 'report-share-email-btn',     tip: '',  phase: null },
  { id: 'whatsapp', label: 'Send via WhatsApp',           icon: MessageCircle,   enabled: false, testId: 'report-share-whatsapp-btn',  tip: '',  phase: null },
  { id: 'sms',      label: 'Send via SMS',                icon: Send,            enabled: false, testId: 'report-share-sms-btn',       tip: '',  phase: null },
];

// ────────────────────────────────────────────────────────────────────────────────
const ItemSalesHybridMockup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { restaurant } = useRestaurant();
  const schedules = restaurant?.schedules || [];
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);

  // Read date range from URL query params (passed from Dashboard navigation —
  // same contract S2 honours so cross-screen navigation stays consistent).
  const urlFrom = searchParams.get('from');
  const urlTo   = searchParams.get('to');
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const initialFrom = urlFrom && /^\d{4}-\d{2}-\d{2}$/.test(urlFrom) ? urlFrom : sharedFrom;
  const initialTo   = urlTo   && /^\d{4}-\d{2}-\d{2}$/.test(urlTo)   ? urlTo   : sharedTo;

  // App Shell
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);

  // Header — draft vs applied dates (carried from S2)
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate]     = useState(initialTo);
  const [appliedFrom, setAppliedFrom] = useState(initialFrom);
  const [appliedTo,   setAppliedTo]   = useState(initialTo);
  // S5 Re-open: attribution toggle removed — hardcoded to created_at (Punched Date)
  // const [paidPunchedToggle] and const [cancelPunchedToggle] deleted per owner directive 2026-06-05

  // Tabs, filters, sort, drill (carried from S2)
  // @audit:rule id="FE-05" name="Default active tab on page load"
  //   explains='When user lands on S5, active tab defaults to "All Items" (all_items tab). S5 Re-open §2.'
  //   approved=false approvedDate="" approvedSource=""
  const [activeTab, setActiveTab] = useState('all_items');
  const [stationFilter,  setStationFilter]  = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [vegFilter,      setVegFilter]      = useState('');
  const [searchQuery,    setSearchQuery]    = useState('');
  // @audit:rule id="FE-26" name="Default column sort = Revenue ↓"
  //   explains="On page load, the table sorts by Revenue descending."
  //   approved=false approvedDate="" approvedSource=""
  const [sortConfig, setSortConfig] = useState({ key: 'revenue', direction: 'desc' });
  const [selectedRow, setSelectedRow] = useState(null);
  // @audit:rule id="FE-59" name="Audit tab Investigate button: expand drift lines on click"
  //   explains="Each AMBER row on the Audit tab shows an Investigate button. Clicking reveals driftLines[] inline."
  //   approved=true approvedDate="2026-06-03" approvedSource="Owner chat directive 2026-06-03"
  const [expandedAmber, setExpandedAmber] = useState({});

  // Download menu state
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef(null);

  // Click-outside + Esc to close the dropdown
  useEffect(() => {
    if (!downloadOpen) return;
    const onDocClick = (e) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) setDownloadOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setDownloadOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [downloadOpen]);

  // Date guards (carried from S2)
  const datesValid = appliedFrom && appliedTo && appliedFrom <= appliedTo;
  const draftDirty = fromDate !== appliedFrom || toDate !== appliedTo;
  const draftValid = fromDate && toDate && fromDate <= toDate;
  // @audit:rule id="FE-25" name="MAX_RANGE_DAYS = 365" // INV-001: lifted from 62 to 365 (1-year range)
  //   explains="Hard cap: user cannot query more than 365 days at a time. Apply disables when draft exceeds. Audit tab has separate volume guard."
  //   approved=false approvedDate="" approvedSource=""
  const MAX_RANGE_DAYS = 365;
  const getDaysDiff = (f, t) => Math.round((new Date(t) - new Date(f)) / (1000 * 60 * 60 * 24));
  const draftRangeExceeded = draftValid && getDaysDiff(fromDate, toDate) > MAX_RANGE_DAYS;
  const canApply = draftDirty && draftValid && !draftRangeExceeded;
  const maxToDate   = fromDate ? new Date(new Date(fromDate).getTime() + MAX_RANGE_DAYS * 86400000).toISOString().slice(0, 10) : '';
  const minFromDate = toDate   ? new Date(new Date(toDate).getTime()   - MAX_RANGE_DAYS * 86400000).toISOString().slice(0, 10) : '';

  // Active preset tracking (no preset active when dates came from URL params)
  // @audit:rule id="FE-06" name="Default date preset when no URL params"
  //   explains='Active preset defaults to "Today" when no ?from=&to= query params are present.'
  //   approved=false approvedDate="" approvedSource=""
  const [activePreset, setActivePreset] = useState(urlFrom ? '' : 'Today');

  // Sort_by hardcoded to 'created_at' — single fetch, all tabs filter client-side.
  // effectiveSortBy deleted per owner directive 2026-06-05 (toggle removed, no re-fetch on tab switch).

  // CR-049: Primary data from backend aggregation endpoint
  const { data: fetchResult, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(
    async () => {
      const raw = await fetchInsightsItems(appliedFrom, appliedTo);
      const rows = transformItemRows(raw.items);
      return { rows, meta: raw.meta };
    },
    [appliedFrom, appliedTo],
    { enabled: datesValid }
  );

  // CR-049: Audit tab — lazy fetch raw orders only when audit tab is active (Option A)
  const [auditFetchResult, setAuditFetchResult] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditVolumeExceeded, setAuditVolumeExceeded] = useState(false); // INV-001: volume guard
  const auditFetchedRef = useRef(false);
  useEffect(() => {
    if (activeTab !== 'audit' || !SHOW_AUDIT_TAB || auditFetchedRef.current) return;
    let cancelled = false;
    setAuditLoading(true);
    auditFetchedRef.current = true;
    getItemSalesAggregated(appliedFrom, appliedTo, 'created_at', schedules)
      .then(result => {
        if (cancelled) return;
        // INV-001: Volume guard — FE audit aggregation is unsafe above ~5000 orders.
        // Main view uses backend insights-items (safe at 1 year). Audit tab soft-caps here.
        if ((result?.meta?.totalOrders || 0) > 5000) {
          setAuditVolumeExceeded(true);
        } else {
          setAuditFetchResult(result);
        }
      })
      .catch(err => console.error('[CR-049] Audit lazy fetch failed:', err))
      .finally(() => { if (!cancelled) setAuditLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, appliedFrom, appliedTo, schedules]);

  // CR-049: Reset audit cache when date range changes
  useEffect(() => {
    auditFetchedRef.current = false;
    setAuditFetchResult(null);
    setAuditVolumeExceeded(false); // INV-001: reset volume guard
  }, [appliedFrom, appliedTo]);

  // CR-049: Use backend rows for all tabs; audit data from lazy fetch for Audit tab
  const r2 = (v) => Math.round((v || 0) * 100) / 100;
  const apiRows = useMemo(() => {
    // CR-049: If audit tab active and audit data loaded, use old FE-aggregated rows for audit
    if (activeTab === 'audit' && auditFetchResult?.rows) {
      return auditFetchResult.rows.map((r) => ({
        id: r.foodId,
        name: r.name,
        category: r.category,
        station: r.station,
        isVeg: r.veg,
        qty: r.qtySold,
        qtyCancelled: r.qtyCancelled,
        qtyComplementary: r.qtyComplementary,
        itemTotalSold: r2(r.itemTotalSold), itemTotalCancelled: r2(r.itemTotalCancelled), itemTotalComplementary: r2(r.itemTotalComplementary),
        discountSold: r2(r.discountSold), discountCancelled: r2(r.discountCancelled), discountComplementary: r2(r.discountComplementary),
        subtotalSold: r2(r.subtotalSold), subtotalCancelled: r2(r.subtotalCancelled), subtotalComplementary: r2(r.subtotalComplementary),
        taxSold: r2(r.taxSold), taxCancelled: r2(r.taxCancelled), taxComplementary: r2(r.taxComplementary),
        totalRevenueSold: r2(r.totalRevenueSold), totalRevenueCancelled: r2(r.totalRevenueCancelled), totalRevenueComplementary: r2(r.totalRevenueComplementary),
        avgPriceSold: r2(r.avgPriceSold), avgPriceCancelled: r2(r.avgPriceCancelled), avgPriceComplementary: r2(r.avgPriceComplementary), avgPricePending: r2(r.avgPricePending),
        qtyPending: r.qtyPending, itemTotalPending: r2(r.itemTotalPending), discountPending: r2(r.discountPending), subtotalPending: r2(r.subtotalPending), taxPending: r2(r.taxPending), totalRevenuePending: r2(r.totalRevenuePending),
        qtyCredit: r.qtyCredit, itemTotalCredit: r2(r.itemTotalCredit), discountCredit: r2(r.discountCredit), subtotalCredit: r2(r.subtotalCredit), taxCredit: r2(r.taxCredit), totalRevenueCredit: r2(r.totalRevenueCredit), avgPriceCredit: r2(r.avgPriceCredit),
        itemTotal: r2(r.itemTotalSold), discount: r2(r.discountSold), subtotal: r2(r.subtotalSold), tax: r2(r.taxSold), totalRevenue: r2(r.totalRevenueSold), avgPrice: r2(r.avgPriceSold), revenue: r2(r.totalRevenueSold),
        taxRate: r.taxRate || 0, taxType: r.taxType || '—', taxCalc: r.taxCalc || 'Exclusive',
        bothTaxesBooked_sold: r.bothTaxesBooked_sold === true, bothTaxesBooked_cancelled: r.bothTaxesBooked_cancelled === true, bothTaxesBooked_comp: r.bothTaxesBooked_comp === true, bothTaxesBooked_pending: r.bothTaxesBooked_pending === true,
        hasTaxField_sold: r.hasTaxField_sold === true, hasTaxField_cancelled: r.hasTaxField_cancelled === true, hasTaxField_comp: r.hasTaxField_comp === true, hasTaxField_pending: r.hasTaxField_pending === true,
        status: r.qtySold > 0 ? 'sold' : (r.qtyCancelled > 0 ? 'cancelled' : 'unsold'),
        isComplimentary: r.qtyComplementary > 0, hasPending: r.qtyPending > 0, hasCredit: r.qtyCredit > 0,
        drill: r.drill,
      }));
    }
    // CR-049: Backend aggregation rows for all non-audit tabs
    if (!fetchResult?.rows) return [];
    return fetchResult.rows.map((r) => ({
      id: r.productId,
      name: r.productName,
      category: r.categoryName,
      station: r.station,
      isVeg: false,
      qty: r.qtySold,
      qtyCancelled: r.qtyCancelled,
      qtyComplementary: r.qtyComplementary,
      // CR-049: Backend provides aggregate totals; per-bucket financial breakdowns not available yet
      itemTotalSold: r2(r.totalRevenueSold), itemTotalCancelled: 0, itemTotalComplementary: 0,
      discountSold: 0, discountCancelled: 0, discountComplementary: 0,
      subtotalSold: r2(r.totalRevenueSold), subtotalCancelled: 0, subtotalComplementary: 0,
      taxSold: 0, taxCancelled: 0, taxComplementary: 0,
      totalRevenueSold: r2(r.totalRevenueSold), totalRevenueCancelled: 0, totalRevenueComplementary: 0,
      avgPriceSold: r2(r.avgPriceSold), avgPriceCancelled: 0, avgPriceComplementary: 0, avgPricePending: 0,
      qtyPending: r.qtyPending, itemTotalPending: 0, discountPending: 0, subtotalPending: 0, taxPending: 0, totalRevenuePending: 0,
      qtyCredit: r.qtyCredit, itemTotalCredit: 0, discountCredit: 0, subtotalCredit: 0, taxCredit: 0, totalRevenueCredit: 0, avgPriceCredit: 0,
      itemTotal: r2(r.totalRevenueSold), discount: 0, subtotal: r2(r.totalRevenueSold), tax: 0, totalRevenue: r2(r.totalRevenueSold), avgPrice: r2(r.avgPriceSold), revenue: r2(r.totalRevenueSold),
      taxRate: 0, taxType: '—', taxCalc: 'Exclusive',
      bothTaxesBooked_sold: false, bothTaxesBooked_cancelled: false, bothTaxesBooked_comp: false, bothTaxesBooked_pending: false,
      hasTaxField_sold: false, hasTaxField_cancelled: false, hasTaxField_comp: false, hasTaxField_pending: false,
      status: r.qtySold > 0 ? 'sold' : (r.qtyCancelled > 0 ? 'cancelled' : 'unsold'),
      isComplimentary: r.qtyComplementary > 0, hasPending: r.qtyPending > 0, hasCredit: r.qtyCredit > 0,
      drill: r.drill,
    }));
  }, [fetchResult, activeTab, auditFetchResult]);

  // CR-049: Audit computation — uses lazy-fetched audit data only; shows loading state when fetching
  const EMPTY_AUDIT = { total: 0, red: 0, amber: 0, review: 0, exempt: 0, flags: [], reviewItems: [], rowSeverityIndex: {}, blocksExport: false };
  const audit = useMemo(() => {
    if (!SHOW_AUDIT_TAB) return EMPTY_AUDIT;
    if (activeTab === 'audit' && auditLoading) return EMPTY_AUDIT;
    if (activeTab === 'audit' && auditFetchResult) return auditSummary(apiRows, 'S5', { tolerance: 0.02 });
    return EMPTY_AUDIT;
  }, [apiRows, activeTab, auditLoading, auditFetchResult]);

  // Drift investigation lookup — FE-58/FE-59: map foodId → driftLines for Investigate button
  const driftByFood = useMemo(() => {
    const m = {};
    for (const r of apiRows) {
      if (r.drill?.driftLines?.length > 0) {
        m[r.id] = r.drill.driftLines;
      }
    }
    return m;
  }, [apiRows]);

  // CR-011 S15: Flatten variations across all items
  const variationsData = useMemo(() => {
    const map = {};
    for (const r of apiRows) {
      for (const v of (r.drill?.variations || [])) {
        const key = (!v.label || v.label === '[]' || v.label === 'default') ? 'No Variation' : v.label; // F-1: defensive remap for []/"default"/null/empty
        if (!map[key]) map[key] = { label: key, items: new Set(), qty: 0, revenue: 0 };
        map[key].items.add(r.id);
        map[key].qty += v.qty || 0;
        map[key].revenue += v.revenue || 0;
      }
    }
    return Object.values(map).map(v => ({ ...v, itemCount: v.items.size, items: undefined })).sort((a, b) => b.revenue - a.revenue);
  }, [apiRows]);

  // CR-011 S16: Flatten addons across all items
  const addonsData = useMemo(() => {
    const map = {};
    for (const r of apiRows) {
      for (const a of (r.drill?.addons || [])) {
        const key = a.name || 'Unknown Addon';
        if (!map[key]) map[key] = { name: key, count: 0, items: new Set(), avgRate: 0, rates: [] };
        map[key].count += a.count || 1;
        map[key].items.add(r.id);
        if (a.rate_pct) map[key].rates.push(a.rate_pct);
      }
    }
    return Object.values(map).map(a => ({
      ...a, itemCount: a.items.size, items: undefined,
      avgRate: a.rates.length > 0 ? r2(a.rates.reduce((s, r) => s + r, 0) / a.rates.length) : 0,
      rates: undefined,
    })).sort((a, b) => b.count - a.count);
  }, [apiRows]);

  // CR-011 S17: Comp detail — items where comp qty > 0 with full breakdown
  const compDetailData = useMemo(() => {
    return apiRows.filter(r => r.isComplimentary).map(r => ({
      id: r.id, name: r.name, category: r.category, station: r.station,
      qty: r.qtyComplementary, revenue: r2(r.totalRevenueComplementary),
      menuPrice: r.drill?.menuPrice || r.avgPriceSold || 0,
    })).sort((a, b) => b.qty - a.qty);
  }, [apiRows]);

  // CR-011 S18: Station performance — group all sold items by station
  const stationData = useMemo(() => {
    const map = {};
    for (const r of apiRows) {
      const s = r.station || 'Unassigned';
      if (!map[s]) map[s] = { station: s, items: 0, soldQty: 0, revenue: 0, cancelledQty: 0, compQty: 0 };
      map[s].items += 1;
      map[s].soldQty += r.qty || 0;
      map[s].revenue += r.totalRevenueSold || 0;
      map[s].cancelledQty += r.qtyCancelled || 0;
      map[s].compQty += r.qtyComplementary || 0;
    }
    return Object.values(map).map(s => ({
      ...s, avgPrice: s.soldQty > 0 ? r2(s.revenue / s.soldQty) : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [apiRows]);


  const handlePreset = (preset) => {
    const now = new Date();
    const f2 = (d) => d.toISOString().slice(0, 10);
    let f, t;
    // @audit:rule id="FE-30" name="Date preset definitions (7D · 30D · MTD · FY)"
    //   explains="7D = today + last 6 days. 30D = today + last 29. MTD = month-start → today. FY = last completed FY (Apr 1 → Mar 31). INV-001: FY enabled."
    //   approved=false approvedDate="" approvedSource=""
    switch (preset) {
      case 'Today': f = f2(now); t = f2(now); break;
      case '7D':  { const d = new Date(now); d.setDate(d.getDate() - 6);  f = f2(d); t = f2(now); break; }
      case '30D': { const d = new Date(now); d.setDate(d.getDate() - 29); f = f2(d); t = f2(now); break; }
      case 'MTD': { const d = new Date(now.getFullYear(), now.getMonth(), 1); f = f2(d); t = f2(now); break; }
      case 'FY': { // INV-001: last completed FY (Apr 1 → Mar 31)
        const fyEndYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        f = f2(new Date(fyEndYear - 1, 3, 1)); t = f2(new Date(fyEndYear, 2, 31)); break;
      }
      default: return;
    }
    setFromDate(f); setToDate(t); setAppliedFrom(f); setAppliedTo(t); setActivePreset(preset);
  };

  const handleApply = () => {
    if (draftValid && !draftRangeExceeded) {
      setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset('');
    }
  };
  const handleFromDate = (val) => { setFromDate(val); setActivePreset(''); };
  const handleToDate   = (val) => { setToDate(val);   setActivePreset(''); };

  // Seed-data line removed at Gate ④ — `apiRows` now comes from `useReportFetch` above.

  // Derived data (carried from S2)
  const filteredData = useMemo(() => {
    // ── S5 Re-open §2-§5: "All Items" bucket-grouped view ──
    if (activeTab === 'all_items') {
      const applyFilters = (rows) => {
        let d = rows;
        if (stationFilter)        d = d.filter(r => r.station === stationFilter);
        if (categoryFilter)       d = d.filter(r => r.category === categoryFilter);
        if (vegFilter === 'veg')    d = d.filter(r => r.isVeg);
        if (vegFilter === 'nonveg') d = d.filter(r => !r.isVeg);
        if (searchQuery)          d = d.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return d;
      };
      // §5: sort within each bucket group (group order is fixed)
      const withinSort = (rows) => [...rows].sort((a, b) => {
        let aV = a[sortConfig.key], bV = b[sortConfig.key];
        if (typeof aV === 'string') aV = aV.toLowerCase();
        if (typeof bV === 'string') bV = bV.toLowerCase();
        if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aV > bV) return sortConfig.direction === 'asc' ?  1 : -1;
        return 0;
      });

      // Sold bucket — uses default sold-lens fields already on apiRows
      const sold = withinSort(applyFilters(
        apiRows.filter(d => d.qty > 0).map(d => ({ ...d, _bucket: 'sold', _bucketLabel: 'Sold' }))
      ));
      // Pending bucket
      const pending = withinSort(applyFilters(
        apiRows.filter(d => d.hasPending).map(d => ({
          ...d,
          qty: d.qtyPending, itemTotal: d.itemTotalPending, discount: d.discountPending,
          subtotal: d.subtotalPending, tax: d.taxPending,
          totalRevenue: d.totalRevenuePending, avgPrice: d.avgPricePending, revenue: d.totalRevenuePending,
          _bucket: 'pending', _bucketLabel: 'Pending Billing',
        }))
      ));
      // Credit bucket (CR-034): TAB-parent lines — shown at punched value
      const credit = withinSort(applyFilters(
        apiRows.filter(d => d.hasCredit).map(d => ({
          ...d,
          qty: d.qtyCredit, itemTotal: d.itemTotalCredit, discount: d.discountCredit,
          subtotal: d.subtotalCredit, tax: d.taxCredit,
          totalRevenue: d.totalRevenueCredit, avgPrice: d.avgPriceCredit, revenue: d.totalRevenueCredit,
          _bucket: 'credit', _bucketLabel: 'Added to Credit',
        }))
      ));
      // Cancelled bucket — §4: Revenue = ₹0
      const cancelled = withinSort(applyFilters(
        apiRows.filter(d => d.qtyCancelled > 0).map(d => ({
          ...d,
          qty: d.qtyCancelled, itemTotal: d.itemTotalCancelled, discount: d.discountCancelled,
          subtotal: d.subtotalCancelled, tax: d.taxCancelled,
          totalRevenue: 0, avgPrice: 0, revenue: 0,
          _bucket: 'cancelled', _bucketLabel: 'Cancelled',
        }))
      ));
      // Comp bucket — §4: Revenue = ₹0
      const comp = withinSort(applyFilters(
        apiRows.filter(d => d.isComplimentary).map(d => ({
          ...d,
          qty: d.qtyComplementary, itemTotal: d.itemTotalComplementary, discount: d.discountComplementary,
          subtotal: d.subtotalComplementary, tax: d.taxComplementary,
          totalRevenue: 0, avgPrice: 0, revenue: 0,
          _bucket: 'comp', _bucketLabel: 'Complimentary',
        }))
      ));

      // §3 + CR-034: fixed visual order — Sold → Pending Billing → Added to Credit → Cancelled → Comp
      const result = [...sold, ...pending, ...credit, ...cancelled, ...comp];
      // Attach bucket counts for separator rendering
      result.__bucketCounts = { sold: sold.length, pending: pending.length, credit: credit.length, cancelled: cancelled.length, comp: comp.length };
      return result;
    }

    let data = [...apiRows];
    // @audit:rule id="FE-49" name="All Items tab shows sold items only"
    //   explains="Only items with qtySold > 0 appear on All Items. Cancelled-only and comp-only items excluded — they have dedicated tabs."
    //   approved=true approvedDate="2026-06-02" approvedSource="Owner chat directive 2026-06-02 — 'complementary and cancelled should not be part of all item, fast selling or low selling'"
    if      (activeTab === 'all')        { data = data.filter(d => d.qty > 0); }
    // @audit:rule id="FE-02" name="Top Sellers definition"
    //   explains="REJECTED: was including comp items. Now: Top Sellers shows top 20 sold items (qty > 0) ranked by revenue descending. Comp/cancelled-only items excluded."
    //   approved=false approvedDate="" approvedSource="REJECTED 2026-06-02 — Owner verbatim: 'complementary and cancelled should not be part of all item, fast selling or low selling'. Comp filter removed."
    else if (activeTab === 'top')       { data = data.filter(d => d.qty > 0); data.sort((a, b) => b.revenue - a.revenue); data = data.slice(0, 20); }
    // @audit:rule id="FE-01" name="Slow Movers threshold"
    //   explains="Item is a Slow Mover if it sold > 0 AND sold ≤ 1 unit AND is not currently cancelled. Items with qtySold=0 excluded."
    //   approved=false approvedDate="" approvedSource=""
    else if (activeTab === 'slow')      { data = data.filter(d => d.qty > 0 && d.qty <= 1 && d.status !== 'cancelled'); }
    else if (activeTab === 'cancelled') { data = data.filter(d => d.qtyCancelled > 0); }
    else if (activeTab === 'comp')      { data = data.filter(d => d.isComplimentary); }
    else if (activeTab === 'pending')   { data = data.filter(d => d.hasPending); }
    else if (activeTab === 'credit')    { data = data.filter(d => d.hasCredit); }

    if (stationFilter)        data = data.filter(d => d.station === stationFilter);
    if (categoryFilter)       data = data.filter(d => d.category === categoryFilter);
    if (vegFilter === 'veg')    data = data.filter(d => d.isVeg);
    if (vegFilter === 'nonveg') data = data.filter(d => !d.isVeg);
    if (searchQuery)          data = data.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

    data.sort((a, b) => {
      let aVal = a[sortConfig.key], bVal = b[sortConfig.key];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ?  1 : -1;
      return 0;
    });
    return data;
  }, [apiRows, activeTab, stationFilter, categoryFilter, vegFilter, searchQuery, sortConfig]);

  const tabCounts = useMemo(() => ({
    // §6: all_items = sum of all 4 bucket counts (mutually exclusive per food_id in service layer)
    all_items: apiRows.filter(d => d.qty > 0).length + apiRows.filter(d => d.hasPending).length + apiRows.filter(d => d.hasCredit).length + apiRows.filter(d => d.qtyCancelled > 0).length + apiRows.filter(d => d.isComplimentary).length,
    all:       apiRows.filter(d => d.qty > 0).length,
    top:       Math.min(20, apiRows.filter(d => d.qty > 0).length),
    slow:      apiRows.filter(d => d.qty > 0 && d.qty <= 1 && d.status !== 'cancelled').length,
    cancelled: apiRows.filter(d => d.qtyCancelled > 0).length,
    comp:      apiRows.filter(d => d.isComplimentary).length,
    pending:   apiRows.filter(d => d.hasPending).length,
    credit:    apiRows.filter(d => d.hasCredit).length,
    // CR-011 Phase 3 Batch B (S15-S18):
    variations: variationsData.length,
    addons:     addonsData.length,
    comp_detail: compDetailData.length,
    by_station: stationData.length,
    audit:     audit.total,
  }), [apiRows, audit.total, variationsData.length, addonsData.length, compDetailData.length, stationData.length]);

  const stationOptions  = useMemo(() => Array.from(new Set(apiRows.map(r => r.station))).sort(),  [apiRows]);
  const categoryOptions = useMemo(() => Array.from(new Set(apiRows.map(r => r.category))).sort(), [apiRows]);

  const lensFilteredData = useMemo(() => {
    let lensed;
    if (activeTab === 'all_items') {
      // S5 Re-open: rows already lensed per-bucket in filteredData — just pass through
      lensed = filteredData;
    } else if (activeTab === 'cancelled') {
      lensed = filteredData.map(d => ({
        ...d,
        qty:          d.qtyCancelled,
        itemTotal:    d.itemTotalCancelled,
        discount:     d.discountCancelled,
        subtotal:     d.subtotalCancelled,
        tax:          d.taxCancelled,
        totalRevenue: d.totalRevenueCancelled,
        avgPrice:     d.avgPriceCancelled,
        revenue:      d.totalRevenueCancelled,
      }));
    } else if (activeTab === 'comp') {
      lensed = filteredData.map(d => ({
        ...d,
        qty:          d.qtyComplementary,
        itemTotal:    d.itemTotalComplementary,
        discount:     d.discountComplementary,
        subtotal:     d.subtotalComplementary,
        tax:          d.taxComplementary,
        totalRevenue: d.totalRevenueComplementary,
        avgPrice:     d.avgPriceComplementary,
        revenue:      d.totalRevenueComplementary,
      }));
    } else if (activeTab === 'pending') {
      lensed = filteredData.map(d => ({
        ...d,
        qty:          d.qtyPending,
        itemTotal:    d.itemTotalPending,
        discount:     d.discountPending,
        subtotal:     d.subtotalPending,
        tax:          d.taxPending,
        totalRevenue: d.totalRevenuePending,
        avgPrice:     d.avgPricePending,
        revenue:      d.totalRevenuePending,
      }));
    } else if (activeTab === 'credit') {
      // CR-034: Added to Credit lens — mirrors Sold table at punched value
      lensed = filteredData.map(d => ({
        ...d,
        qty:          d.qtyCredit,
        itemTotal:    d.itemTotalCredit,
        discount:     d.discountCredit,
        subtotal:     d.subtotalCredit,
        tax:          d.taxCredit,
        totalRevenue: d.totalRevenueCredit,
        avgPrice:     d.avgPriceCredit,
        revenue:      d.totalRevenueCredit,
      }));
    } else {
      lensed = filteredData;
    }

    // Compute drift per row: actual tax − expected tax (subtotal × rate%)
    lensed = lensed.map(d => {
      const rate = Number(d.taxRate) || 0;
      const taxCalc = d.taxCalc || 'Exclusive';
      const sub = Number(d.subtotal) || 0;
      const expectedTax = taxCalc === 'Inclusive'
        ? sub - (sub / (1 + rate / 100))
        : sub * (rate / 100);
      const drift = r2((Number(d.tax) || 0) - expectedTax);
      return { ...d, drift };
    });

    // FE-16: Audit-status group ordering (skip for all_items — uses bucket separators instead)
    if (activeTab === 'all_items' || activeTab === 'comp' || activeTab === 'credit' || activeTab === 'audit') {
      // Preserve __bucketCounts from filteredData (lost during .map() above)
      if (activeTab === 'all_items' && filteredData.__bucketCounts) {
        lensed.__bucketCounts = filteredData.__bucketCounts;
      }
      return lensed;
    }

    const isFlagged = activeTab === 'cancelled'
      ? (r) => audit.flags.some((f) => f.foodId === r.id && f.bucketId === 'cancelled' && f.severity === 'AMBER')
      : activeTab === 'pending'
      ? (r) => audit.flags.some((f) => f.foodId === r.id && f.bucketId === 'pending' && (f.severity === 'AMBER' || f.severity === 'RED'))
      : (r) => audit.flags.some((f) => f.foodId === r.id && f.bucketId === 'sold' && (f.severity === 'AMBER' || f.severity === 'RED'));

    const flagged = lensed.filter(isFlagged);
    const clean   = lensed.filter((r) => !isFlagged(r));
    return Object.assign([...flagged, ...clean], { __flaggedCount: flagged.length, __cleanCount: clean.length, __exemptCount: 0 });
  }, [filteredData, activeTab, audit.flags]);

  const summary = useMemo(() => {
    const totalItems = lensFilteredData.length;
    const totalRev   = lensFilteredData.reduce((sum, it) => sum + it.totalRevenue, 0);
    const totalQty   = lensFilteredData.reduce((sum, it) => sum + it.qty,     0);
    const avgRev     = totalQty > 0 ? r2(totalRev / totalQty) : 0;
    return { totalItems, totalRev, avgRev, totalQty };
  }, [lensFilteredData]);

  const handleSort = (key) => setSortConfig(prev => ({
    key,
    direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
  }));

  // Bucket summary — All Items tab only: per-bucket totals for footer bar
  const bucketSummary = useMemo(() => {
    if (activeTab !== 'all_items') return null;
    const b = { sold: { count: 0, qty: 0, revenue: 0 }, pending: { count: 0, qty: 0, revenue: 0 }, credit: { count: 0, qty: 0, revenue: 0 }, cancelled: { count: 0, qty: 0, revenue: 0 }, comp: { count: 0, qty: 0, revenue: 0 } };
    for (const row of filteredData) {
      const bucket = b[row._bucket];
      if (!bucket) continue;
      bucket.count += 1;
      bucket.qty += row.qty || 0;
      bucket.revenue += row.totalRevenue || 0;
    }
    return b;
  }, [filteredData, activeTab]);

  // Station summary — All Items tab only: sold bucket aggregated by station
  const stationSummary = useMemo(() => {
    if (activeTab !== 'all_items') return [];
    const map = {};
    for (const row of filteredData) {
      if (row._bucket !== 'sold') continue;
      const s = row.station || 'Unknown';
      if (!map[s]) map[s] = { station: s, items: 0, qty: 0, revenue: 0 };
      map[s].items += 1;
      map[s].qty += row.qty || 0;
      map[s].revenue += row.totalRevenue || 0;
    }
    return Object.values(map)
      .map(s => ({ ...s, avgPrice: s.qty > 0 ? r2(s.revenue / s.qty) : 0 }))
      .sort((a, b) => a.station.localeCompare(b.station));
  }, [filteredData, activeTab]);
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-300 inline-block ml-1" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp   className="w-3.5 h-3.5 text-zinc-800 inline-block ml-1" />
      : <ChevronDown className="w-3.5 h-3.5 text-zinc-800 inline-block ml-1" />;
  };
  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  // Build a per-tab export payload (5 sheets) for the unified Download menu.
  // Sheet schema matches reportExporter.js: { name, columns:[{key,label,align,format,width}], rows, totals? }
  const buildExportPayload = () => {
    const buildSheet = (tabId, label) => {
      let rows;
      if (tabId === 'all') {
        rows = apiRows;
      } else if (tabId === 'top') {
        rows = [...apiRows].sort((a, b) => b.revenue - a.revenue).slice(0, 20);
      } else if (tabId === 'slow') {
        rows = apiRows.filter((d) => d.qty <= 1 && d.status !== 'cancelled');
      } else if (tabId === 'cancelled') {
        rows = apiRows
          .filter((d) => d.qtyCancelled > 0)
          .map((d) => ({
            ...d,
            qty:      d.qtyCancelled,
            revenue:  d.totalRevenueCancelled,
            discount: d.discountCancelled,
            tax:      d.taxCancelled,
            avgPrice: d.avgPriceCancelled,
          }));
      } else if (tabId === 'comp') {
        rows = apiRows
          .filter((d) => d.isComplimentary)
          .map((d) => ({
            ...d,
            qty:      d.qtyComplementary,
            revenue:  d.totalRevenueComplementary,
            discount: d.discountComplementary,
            tax:      d.taxComplementary,
            avgPrice: d.avgPriceComplementary,
          }));
      } else if (tabId === 'pending') {
        rows = apiRows
          .filter((d) => d.hasPending)
          .map((d) => ({
            ...d,
            qty:      d.qtyPending,
            revenue:  d.totalRevenuePending,
            discount: d.discountPending,
            tax:      d.taxPending,
            avgPrice: d.avgPricePending,
          }));
      } else {
        rows = [];
      }

      const totalQty = rows.reduce((s, r) => s + (r.qty || 0), 0);
      const totalRev = rows.reduce((s, r) => s + (r.revenue || 0), 0);
      const totalDisc = rows.reduce((s, r) => s + (r.discount || 0), 0);
      const totalTax = rows.reduce((s, r) => s + (r.tax || 0), 0);

      return {
        name: label,
        subtitle: tabId === 'cancelled'
          ? 'Attributed by punched date'
          : 'Attributed by punched date',
        columns: [
          { key: 'name',     label: 'Item',      format: 'text',    width: 180 },
          { key: 'category', label: 'Category',  format: 'text',    width: 110 },
          { key: 'station',  label: 'Station',   format: 'text',    width: 140 },
          { key: 'isVeg',    label: 'Veg/Non-Veg', format: 'text',  width: 90 },
          { key: 'qty',      label: 'Qty',       format: 'integer', align: 'right', width: 70 },
          { key: 'revenue',  label: 'Revenue',   format: 'inr',     align: 'right', width: 110 },
          { key: 'discount', label: 'Discount',  format: 'inr',     align: 'right', width: 110 },
          { key: 'tax',      label: 'Tax',       format: 'inr',     align: 'right', width: 100 },
          { key: 'avgPrice', label: 'Avg Price', format: 'inr',     align: 'right', width: 100 },
        ],
        rows: rows.map((r) => ({
          ...r,
          isVeg: r.isVeg ? 'Veg' : 'Non-Veg',
        })),
        totals: { label: 'TOTAL', qty: totalQty, revenue: totalRev, discount: totalDisc, tax: totalTax },
      };
    };

    const allSheet = buildSheet('all', 'Sold');
    const sheets = [
      allSheet,
      buildSheet('top',       'Top Sellers'),
      buildSheet('slow',      'Slow Movers'),
      buildSheet('cancelled', 'Cancelled'),
      buildSheet('comp',      'Complimentary'),
      buildSheet('pending',   'Pending Billing'),
    ];

    // By Station summary sheet (Sold bucket only, alphabetical)
    const buildGroupSheet = (groupKey, sheetName) => {
      const soldRows = apiRows.filter(d => d.qty > 0);
      const map = {};
      for (const r of soldRows) {
        const g = r[groupKey] || 'Unknown';
        if (!map[g]) map[g] = { group: g, items: 0, qty: 0, revenue: 0, discount: 0, tax: 0 };
        map[g].items += 1;
        map[g].qty += r.qty || 0;
        map[g].revenue += r.totalRevenue || 0;
        map[g].discount += r.discount || 0;
        map[g].tax += r.tax || 0;
      }
      const rows = Object.values(map)
        .map(g => ({ ...g, avgPrice: g.qty > 0 ? Math.round((g.revenue / g.qty) * 100) / 100 : 0 }))
        .sort((a, b) => a.group.localeCompare(b.group));
      const totals = {
        label: 'TOTAL',
        items: rows.reduce((s, r) => s + r.items, 0),
        qty: rows.reduce((s, r) => s + r.qty, 0),
        revenue: rows.reduce((s, r) => s + r.revenue, 0),
        discount: rows.reduce((s, r) => s + r.discount, 0),
        tax: rows.reduce((s, r) => s + r.tax, 0),
      };
      return {
        name: sheetName,
        subtitle: 'Sold items only · Attributed by punched date',
        columns: [
          { key: 'group',    label: sheetName.replace('By ', ''), format: 'text', width: 160 },
          { key: 'items',    label: 'Items',    format: 'integer', align: 'right', width: 70 },
          { key: 'qty',      label: 'Qty',      format: 'integer', align: 'right', width: 70 },
          { key: 'revenue',  label: 'Revenue',  format: 'inr',     align: 'right', width: 110 },
          { key: 'discount', label: 'Discount', format: 'inr',     align: 'right', width: 110 },
          { key: 'tax',      label: 'Tax',      format: 'inr',     align: 'right', width: 100 },
          { key: 'avgPrice', label: 'Avg Price', format: 'inr',    align: 'right', width: 100 },
        ],
        rows,
        totals,
      };
    };

    sheets.push(buildGroupSheet('station', 'By Station'));
    sheets.push(buildGroupSheet('category', 'By Category'));

    // Summary tables — rendered on the first/cover page of PDF (between KPIs and sheet sections)
    const stationSheet = buildGroupSheet('station', 'By Station');
    const categorySheet = buildGroupSheet('category', 'By Category');
    const summaryTables = [stationSheet, categorySheet];

    const kpis = [
      { label: 'Items',   value: allSheet.rows.length,             tone: 'primary', format: 'text' },
      { label: 'Revenue', value: allSheet.totals.revenue,          tone: 'good',    format: 'inr'  },
      { label: 'Avg per Qty', value: allSheet.totals.qty > 0 ? Math.round(allSheet.totals.revenue / allSheet.totals.qty) : 0, tone: 'primary', format: 'inr' },
      { label: 'Cancelled',  value: sheets[3].rows.length, tone: 'bad', format: 'text' },
      { label: 'Comp',       value: sheets[4].rows.length, tone: '',    format: 'text' },
      { label: 'Pending Billing',  value: sheets[5].rows.length, tone: '',    format: 'text' },
    ];

    return {
      title:    'Item Ledger',
      subtitle: '',
      restaurant: {
        name:    restaurant?.name    || '',
        address: restaurant?.address || '',
        id:      restaurant?.id      || '',
      },
      dateRange:   { from: appliedFrom, to: appliedTo },
      generatedBy: restaurant?.ownerName || '',
      kpis,
      sheets,
      summaryTables,
    };
  };

  // Unified Download menu handler — wires to reportExporter.js (Code Gate 1.5 primitive).
  const handleDownloadAction = (action) => {
    // Synchronously open the popup BEFORE the dropdown closes, for PDF only —
    // browsers block popups outside the click handler stack.
    let pdfWin = null;
    if (action === 'pdf') {
      pdfWin = openReportWindow();
    }
    setDownloadOpen(false);

    if (action === 'email' || action === 'whatsapp' || action === 'sms') {
      return; // disabled placeholders — should not fire
    }

    try {
      const payload = buildExportPayload();
      if (action === 'excel') {
        exportReportAsExcel(payload);
      } else if (action === 'pdf') {
        exportReportAsPDF(pdfWin, payload);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[S5] export failed:', e);
      if (pdfWin && !pdfWin.closed) pdfWin.close();
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="item-sales-hybrid-report-page">
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode}
        setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}}
        onOpenMenu={() => {}}
        onOpenCredit={() => {}}
        onRefresh={() => {}}
        isRefreshing={false}
        isOrderEntryOpen={false}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50 relative">

        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200" data-testid="reports-module-header">
          <div className="flex items-center gap-4">
            <button
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              data-testid="reports-back-btn"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-0.5 flex items-center gap-1.5">
                <span className="hover:text-zinc-700 cursor-pointer transition-colors">Insights</span>
                <span>›</span>
                <span className="hover:text-zinc-700 cursor-pointer transition-colors">Item Ledger</span>
                <span>›</span>
              </div>
              <h1
                className="text-2xl font-semibold tracking-tight text-zinc-950 flex items-center gap-2"
                style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                Item Ledger
              </h1>
              <p className="text-[11px] text-zinc-500 mt-0.5" data-testid="items-basis-label">
                By punch date · cancellations by cancel date · credit at punched value
                {' · '}
                <button onClick={() => navigate('/reports-module/definitions')} className="text-emerald-700 hover:underline font-medium" data-testid="items-definitions-link">ⓘ Definitions</button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Range Picker */}
            <div
              className={`flex items-center gap-2 px-3 py-2 border ${
                draftDirty && draftValid && !draftRangeExceeded ? 'border-[#F26B33]' :
                draftRangeExceeded ? 'border-red-400' : 'border-zinc-200'
              } bg-white rounded-lg transition-colors ${isLoading ? 'opacity-50' : ''}`}
              data-testid="reports-daterange-picker"
            >
              <CalendarIcon className="w-4 h-4 text-zinc-500" />
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => handleFromDate(e.target.value)}
                  disabled={isLoading}
                  min={minFromDate}
                  max={fmt(today)}
                  className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0"
                  data-testid="reports-date-from"
                />
              </label>
              <span className="text-zinc-300">—</span>
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => handleToDate(e.target.value)}
                  disabled={isLoading}
                  max={fmt(today)}
                  className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0"
                  data-testid="reports-date-to"
                />
              </label>
              {draftRangeExceeded && (
                <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Max 1 year</span>
              )}
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApply}
              disabled={isLoading || !canApply}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                canApply
                  ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
              data-testid="reports-date-apply-btn"
            >
              <Check className="w-4 h-4" />
              Apply
            </button>

            {/* Quick range presets */}
            <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="reports-date-presets">
              {['Today', '7D', '30D', 'MTD', 'FY'].map((p) => {
                const isDisabled = false; // INV-001: FY enabled
                return (
                  <button
                    key={p}
                    disabled={isLoading || isDisabled}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      isDisabled
                        ? 'text-zinc-300 cursor-not-allowed'
                        : activePreset === p
                          ? 'bg-white text-zinc-900 shadow-sm'
                          : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'
                    }`}
                    data-testid={`reports-date-preset-${p.toLowerCase()}`}
                    onClick={() => !isDisabled && handlePreset(p)}
                    title={isDisabled ? 'Coming soon' : ''}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Attribution toggle removed per owner directive 2026-06-05 — "there is no need of punch date and collect bill toggle" */}

            {/* Unified Download / Share menu — replaces separate PDF + Excel buttons */}
            <div className="relative" ref={downloadRef}>
              <button
                onClick={() => setDownloadOpen((v) => !v)}
                disabled={isLoading}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 transition-colors shadow-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                data-testid="report-download-trigger-btn"
                aria-haspopup="menu"
                aria-expanded={downloadOpen}
              >
                <Download className="w-4 h-4" />
                Download
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${downloadOpen ? 'rotate-180' : ''}`} />
              </button>

              {downloadOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-30"
                  data-testid="report-download-menu"
                >
                  <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 bg-zinc-50 border-b border-zinc-100">
                    Download or Share Report
                  </div>
                  {audit.blocksExport && (
                    <div className="px-3 py-2 text-[11px] bg-amber-50 border-b border-amber-200 text-amber-800 flex items-start gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Audit gate active — exports blocked.{' '}
                        <button
                          onClick={() => { setActiveTab('audit'); setDownloadOpen(false); }}
                          className="font-semibold underline hover:text-amber-900"
                          data-testid="report-download-audit-link"
                        >
                          Open Audit tab ({audit.red} red · {audit.amber} amber · {audit.review} review)
                        </button>
                      </span>
                    </div>
                  )}
                  <ul className="py-1">
                    {DOWNLOAD_MENU.map((opt) => {
                      const Icon = opt.icon;
                      // Excel/PDF respect audit gate; others stay disabled (Phase 2B placeholders)
                      const isExportable = opt.id === 'excel' || opt.id === 'pdf';
                      const enabled = opt.enabled && (!isExportable || !audit.blocksExport);
                      const tip = isExportable && audit.blocksExport
                        ? `Audit blocks export: ${audit.red} red · ${audit.amber} amber · ${audit.review} review`
                        : opt.tip;
                      return (
                        <li key={opt.id}>
                          <button
                            onClick={() => enabled && handleDownloadAction(opt.id)}
                            disabled={!enabled}
                            role="menuitem"
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                              enabled
                                ? 'text-zinc-800 hover:bg-orange-50 hover:text-[#F26B33] cursor-pointer'
                                : 'text-zinc-300 cursor-not-allowed'
                            }`}
                            data-testid={opt.testId}
                            title={tip}
                          >
                            <Icon className={`w-4 h-4 ${enabled ? '' : 'text-zinc-300'}`} />
                            <span className="flex-1">
                              <div className="font-medium leading-tight">{opt.label}</div>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Top-tab Segment Bar */}
        <div className={`px-8 pt-4 bg-white border-b border-zinc-100 shrink-0 ${isLoading ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-1 overflow-x-auto pb-3">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id];
              const isAuditTab = tab.id === 'audit';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={isLoading}
                  className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? (isAuditTab && audit.total > 0 ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-white')
                      : (isAuditTab && audit.total > 0 ? 'bg-amber-50 text-amber-800 hover:bg-amber-100' : 'text-zinc-600 hover:bg-zinc-100')
                  }`}
                  data-testid={`reports-items-tab-${tab.id}`}
                >
                  {isAuditTab && <ShieldAlert className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />}
                  {tab.label}
                  {isAuditTab && audit.total > 0 ? (
                    <span className="ml-1.5 text-xs">
                      <span className="opacity-80">{count}</span>
                      {audit.red > 0   && <span className="ml-1 px-1 rounded bg-red-100 text-red-700 font-semibold">{audit.red}R</span>}
                      {audit.amber > 0 && <span className="ml-1 px-1 rounded bg-amber-100 text-amber-700 font-semibold">{audit.amber}A</span>}
                      {audit.review > 0 && <span className="ml-1 px-1 rounded bg-blue-100 text-blue-700 font-semibold">{audit.review}?</span>}
                    </span>
                  ) : (
                    <span className="ml-1 opacity-70">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bucket + Station summary — header area, All Items tab only */}
        {activeTab === 'all_items' && bucketSummary && !isLoading && hasLoadedOnce && (
          <div className="px-8 py-3 bg-white border-b border-zinc-100 shrink-0 space-y-3" data-testid="all-items-summary-panel">
            <div className="grid grid-cols-5 gap-3" data-testid="bucket-summary-bar">
              <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wide text-emerald-600 mb-0.5">Sold</div>
                <div className="text-sm font-bold text-emerald-800">{formatCurrency(bucketSummary.sold.revenue)}</div>
                <div className="text-[10px] text-emerald-600">{bucketSummary.sold.count} items · {bucketSummary.sold.qty} qty</div>
              </div>
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wide text-blue-600 mb-0.5">Pending</div>
                <div className="text-sm font-bold text-blue-800">{formatCurrency(bucketSummary.pending.revenue)}</div>
                <div className="text-[10px] text-blue-600">{bucketSummary.pending.count} items · {bucketSummary.pending.qty} qty</div>
              </div>
              <div className="border border-violet-200 bg-violet-50 rounded-lg p-2.5 text-center" data-testid="bucket-summary-credit">
                <div className="text-[10px] uppercase tracking-wide text-violet-600 mb-0.5">Added to Credit</div>
                <div className="text-sm font-bold text-violet-800">{formatCurrency(bucketSummary.credit.revenue)}</div>
                <div className="text-[10px] text-violet-600">{bucketSummary.credit.count} items · {bucketSummary.credit.qty} qty</div>
              </div>
              <div className="border border-red-200 bg-red-50 rounded-lg p-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wide text-red-600 mb-0.5">Cancelled</div>
                <div className="text-sm font-bold text-red-700">{formatCurrency(bucketSummary.cancelled.revenue)} loss</div>
                <div className="text-[10px] text-red-600">{bucketSummary.cancelled.count} items · {bucketSummary.cancelled.qty} qty</div>
              </div>
              <div className="border border-purple-200 bg-purple-50 rounded-lg p-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wide text-purple-600 mb-0.5">Complimentary</div>
                <div className="text-sm font-bold text-purple-700">{formatCurrency(bucketSummary.comp.revenue)} loss</div>
                <div className="text-[10px] text-purple-600">{bucketSummary.comp.count} items · {bucketSummary.comp.qty} qty</div>
              </div>
            </div>
            {/* F-5: By Station summary block removed — owner directive 2026-06-17 (all tabs) */}
          </div>
        )}

        {/* Content — wrapped in ReportLoadingShield (Code Gate 1 primitive) */}
        <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
          <div className="p-8 flex flex-col flex-1 relative">
          {/* Filter + Summary Row */}
          <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl border border-zinc-200 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all w-48"
                  data-testid="reports-items-filter-search"
                />
              </div>
              <div className="w-px h-6 bg-zinc-200" />
              <select
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                className="py-1.5 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 appearance-none cursor-pointer"
                data-testid="reports-items-filter-station"
              >
                <option value="">All Stations</option>
                {stationOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-1.5 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 appearance-none cursor-pointer"
                data-testid="reports-items-filter-category"
              >
                <option value="">All Categories</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={vegFilter}
                onChange={(e) => setVegFilter(e.target.value)}
                className="py-1.5 pl-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 appearance-none cursor-pointer"
                data-testid="reports-items-filter-veg"
              >
                <option value="">All Types</option>
                <option value="veg">Veg Only</option>
                <option value="nonveg">Non-Veg Only</option>
              </select>
            </div>
            <div className="text-sm font-medium text-zinc-600 flex items-center gap-3">
              <span><strong className="text-zinc-900">{summary.totalItems}</strong> ITEMS</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              {activeTab === 'cancelled' || activeTab === 'comp' ? (
                <span><strong className="text-red-600">{formatCurrency(summary.totalRev)}</strong> <span className="text-red-600">REVENUE LOSS</span></span>
              ) : (
                <span><strong className="text-zinc-900">{formatCurrency(summary.totalRev)}</strong> TOTAL REVENUE</span>
              )}
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              {activeTab === 'cancelled' || activeTab === 'comp' ? (
                <span><strong className="text-red-600">{formatCurrency(summary.avgRev)}</strong> <span className="text-red-600">AVG</span></span>
              ) : (
                <span><strong className="text-zinc-900">{formatCurrency(summary.avgRev)}</strong> AVG</span>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {(stationFilter || categoryFilter || vegFilter || searchQuery) && (
            <div className="flex items-center gap-2 mb-4 shrink-0 flex-wrap">
              {stationFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-xs font-medium text-zinc-700 border border-zinc-200">
                  Station: {stationFilter}
                  <button onClick={() => setStationFilter('')} className="hover:text-zinc-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-xs font-medium text-zinc-700 border border-zinc-200">
                  Category: {categoryFilter}
                  <button onClick={() => setCategoryFilter('')} className="hover:text-zinc-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {vegFilter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-xs font-medium text-zinc-700 border border-zinc-200">
                  Type: {vegFilter === 'veg' ? 'Veg Only' : 'Non-Veg Only'}
                  <button onClick={() => setVegFilter('')} className="hover:text-zinc-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-xs font-medium text-zinc-700 border border-zinc-200">
                  Search: &quot;{searchQuery}&quot;
                  <button onClick={() => setSearchQuery('')} className="hover:text-zinc-900"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button
                onClick={() => { setStationFilter(''); setCategoryFilter(''); setVegFilter(''); setSearchQuery(''); }}
                className="text-xs text-zinc-500 hover:text-zinc-900 font-medium ml-2"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Data Table OR Phase 3 tabs OR Audit panel */}
          {/* CR-011 S15: Variations Tab */}
          {activeTab === 'variations' ? (
            <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col" data-testid="s15-variations-panel">
              <div className="px-6 py-4 border-b border-zinc-200">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Variation Sales Breakdown</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{variationsData.length} unique variations across all items</p>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Variation</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Items</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Qty Sold</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variationsData.map((v, i) => (
                      <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50" data-testid={`s15-row-${i}`}>
                        <td className="px-6 py-3 text-sm font-medium text-zinc-800">{v.label}</td>
                        <td className="px-4 py-3 text-sm text-right text-zinc-600">{v.itemCount}</td>
                        <td className="px-4 py-3 text-sm text-right text-zinc-700">{v.qty}</td>
                        <td className="px-6 py-3 text-sm text-right font-semibold text-zinc-900">{formatCurrency(v.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {variationsData.length > 0 && (
                    <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                      <tr>
                        <td className="px-6 py-3 text-sm font-bold text-zinc-900">TOTAL</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{variationsData.reduce((s, v) => s + v.itemCount, 0)}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{variationsData.reduce((s, v) => s + v.qty, 0)}</td>
                        <td className="px-6 py-3 text-sm text-right font-bold">{formatCurrency(variationsData.reduce((s, v) => s + v.revenue, 0))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {variationsData.length === 0 && <div className="p-12 text-center text-zinc-400 text-sm">No variation data available for this period</div>}
              </div>
            </div>
          ) : activeTab === 'addons' ? (
            /* CR-011 S16: Addons Tab */
            <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col" data-testid="s16-addons-panel">
              <div className="px-6 py-4 border-b border-zinc-200">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Addon Attachment Report</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{addonsData.length} unique addons across all items</p>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Addon Name</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Attached To</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Times Added</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Avg Attach Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addonsData.map((a, i) => (
                      <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50" data-testid={`s16-row-${i}`}>
                        <td className="px-6 py-3 text-sm font-medium text-zinc-800">{a.name}</td>
                        <td className="px-4 py-3 text-sm text-right text-zinc-600">{a.itemCount} items</td>
                        <td className="px-4 py-3 text-sm text-right text-zinc-700 font-medium">{a.count}</td>
                        <td className="px-6 py-3 text-sm text-right text-zinc-600">{a.avgRate > 0 ? `${a.avgRate}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  {addonsData.length > 0 && (
                    <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                      <tr>
                        <td className="px-6 py-3 text-sm font-bold text-zinc-900">TOTAL</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{addonsData.reduce((s, a) => s + a.itemCount, 0)}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{addonsData.reduce((s, a) => s + a.count, 0)}</td>
                        <td className="px-6 py-3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
                {addonsData.length === 0 && <div className="p-12 text-center text-zinc-400 text-sm">No addon data available for this period</div>}
              </div>
            </div>
          ) : activeTab === 'comp_detail' ? (
            /* CR-011 S17: Complementary Detail Tab */
            <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col" data-testid="s17-comp-detail-panel">
              <div className="px-6 py-4 border-b border-zinc-200">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Complementary Items Detail</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{compDetailData.length} items given as complementary · <span className="text-red-500 font-medium">Total would-be revenue: {formatCurrency(compDetailData.reduce((s, c) => s + c.revenue, 0))}</span></p>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Item Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Station</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Comp Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Would-be Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compDetailData.map((c, i) => (
                      <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50" data-testid={`s17-row-${i}`}>
                        <td className="px-6 py-3 text-sm font-medium text-zinc-800">{c.name}</td>
                        <td className="px-4 py-3 text-sm text-zinc-600">{c.category || '—'}</td>
                        <td className="px-4 py-3 text-sm text-zinc-500">{c.station || '—'}</td>
                        <td className="px-4 py-3 text-sm text-right text-zinc-700 font-medium">{c.qty}</td>
                        <td className="px-6 py-3 text-sm text-right text-red-600 font-semibold">{formatCurrency(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {compDetailData.length > 0 && (
                    <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                      <tr>
                        <td className="px-6 py-3 text-sm font-bold text-zinc-900" colSpan={3}>TOTAL</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{compDetailData.reduce((s, c) => s + c.qty, 0)}</td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-red-600">{formatCurrency(compDetailData.reduce((s, c) => s + c.revenue, 0))}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {compDetailData.length === 0 && <div className="p-12 text-center text-zinc-400 text-sm">No complementary items in this period</div>}
              </div>
            </div>
          ) : activeTab === 'by_station' ? (
            /* CR-011 S18: Station Performance Tab */
            <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col" data-testid="s18-station-panel">
              <div className="px-6 py-4 border-b border-zinc-200">
                <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">Station Performance</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{stationData.length} stations · Revenue by kitchen/bar station</p>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Station</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Items</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Sold Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Revenue</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Avg Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Cancelled</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Comp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stationData.map((s, i) => (
                      <tr key={i} className="border-t border-zinc-50 hover:bg-zinc-50/50" data-testid={`s18-row-${i}`}>
                        <td className="px-6 py-3 text-sm font-medium text-zinc-800">{s.station}</td>
                        <td className="px-4 py-3 text-sm text-right text-zinc-600">{s.items}</td>
                        <td className="px-4 py-3 text-sm text-right text-zinc-700">{s.soldQty}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-900">{formatCurrency(s.revenue)}</td>
                        <td className="px-4 py-3 text-sm text-right text-zinc-600">{formatCurrency(s.avgPrice)}</td>
                        <td className="px-4 py-3 text-sm text-right text-red-500">{s.cancelledQty > 0 ? s.cancelledQty : '—'}</td>
                        <td className="px-6 py-3 text-sm text-right text-amber-600">{s.compQty > 0 ? s.compQty : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  {stationData.length > 0 && (
                    <tfoot className="bg-zinc-50 border-t-2 border-zinc-200">
                      <tr>
                        <td className="px-6 py-3 text-sm font-bold text-zinc-900">TOTAL</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{stationData.reduce((s, d) => s + d.items, 0)}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{stationData.reduce((s, d) => s + d.soldQty, 0)}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{formatCurrency(stationData.reduce((s, d) => s + d.revenue, 0))}</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-sm text-right font-bold text-red-500">{stationData.reduce((s, d) => s + d.cancelledQty, 0)}</td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-amber-600">{stationData.reduce((s, d) => s + d.compQty, 0)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {stationData.length === 0 && <div className="p-12 text-center text-zinc-400 text-sm">No station data available</div>}
              </div>
            </div>
          ) : activeTab === 'audit' ? (
            <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col" data-testid="audit-tab-panel">
              {auditVolumeExceeded && (
                <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-sm text-amber-800" data-testid="audit-volume-warning">
                  <span className="font-semibold">Date range too large for Audit:</span>
                  Audit analysis supports up to ~5,000 orders. Select a shorter range (e.g. 60 days) to use the Audit tab.
                </div>
              )}
              <div className="px-6 py-4 border-b border-zinc-200 bg-gradient-to-r from-amber-50 to-white">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <h2 className="text-base font-semibold text-zinc-900">Audit · Item Ledger</h2>
                </div>
                <p className="text-xs text-zinc-500">
                  Resolve RED + AMBER data flags. Approve REVIEW items via chat per Protocol §8. Exports unlock when all 3 reach zero.
                </p>
                <div className="grid grid-cols-5 gap-3 mt-3">
                  <div className="border border-zinc-200 rounded-lg p-2.5 text-center" data-testid="audit-kpi-total">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-400 mb-0.5">Active Flags</div>
                    <div className="text-xl font-bold text-zinc-900">{audit.total}</div>
                  </div>
                  <div className="border border-red-200 bg-red-50 rounded-lg p-2.5 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-red-600 mb-0.5">RED</div>
                    <div className="text-xl font-bold text-red-700">{audit.red}</div>
                  </div>
                  <div className="border border-amber-200 bg-amber-50 rounded-lg p-2.5 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-amber-700 mb-0.5">AMBER</div>
                    <div className="text-xl font-bold text-amber-700">{audit.amber}</div>
                  </div>
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-2.5 text-center">
                    <div className="text-[10px] uppercase tracking-wide text-blue-700 mb-0.5">REVIEW</div>
                    <div className="text-xl font-bold text-blue-700">{audit.review}</div>
                  </div>
                  <div className="border border-green-200 bg-green-50 rounded-lg p-2.5 text-center" data-testid="audit-kpi-exempt">
                    <div className="text-[10px] uppercase tracking-wide text-green-700 mb-0.5">EXEMPT</div>
                    <div className="text-xl font-bold text-green-700">{audit.exempt || 0}</div>
                  </div>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-6 space-y-6">
                {/* RED section */}
                <section data-testid="audit-red-table">
                  <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> RED · Business-rule violations ({audit.red})
                  </h3>
                  {audit.red === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No RED flags.</p>
                  ) : (
                    <div className="border border-red-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-red-50 text-red-700">
                          <tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Bucket</th><th className="px-3 py-2 text-right">Revenue</th><th className="px-3 py-2 text-right">Actual Tax</th><th className="px-3 py-2 text-left">Reason</th></tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {audit.flags.filter(f => f.severity === 'RED').map((f, i) => (
                            <tr key={i} className="bg-white hover:bg-red-50/50">
                              <td className="px-3 py-2 font-medium">{f.name}</td>
                              <td className="px-3 py-2">{f.bucket}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(f.revenue)}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(f.actualTax)}</td>
                              <td className="px-3 py-2 text-zinc-600">{f.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* DRIFT BLOCKS — FE-60/FE-61: order-level drift classified into 3 blocks + exemption */}
                {(() => {
                  // Collect all drift lines across all items, group by orderId
                  const orderMap = {};
                  for (const r of apiRows) {
                    const lines = r.drill?.driftLines || [];
                    for (const dl of lines) {
                      const oid = dl.orderId;
                      if (!orderMap[oid]) {
                        orderMap[oid] = { orderId: oid, date: dl.date, employee: dl.employee, payment: dl.payment, table: dl.table, items: 0, itemNames: [], itemTotal: 0, subtotal: 0, discount: 0, expectedTax: 0, actualTax: 0, drift: 0, rootCauses: new Set() };
                      }
                      const o = orderMap[oid];
                      o.items += 1;
                      o.itemNames.push(r.name);
                      o.itemTotal += (dl.unitPrice || 0) * (dl.qty || 1);
                      o.subtotal += dl.subtotal || 0;
                      o.discount += (((dl.unitPrice || 0) * (dl.qty || 1)) - (dl.subtotal || 0));
                      o.expectedTax += dl.expectedTax || 0;
                      o.actualTax += dl.actualTax || 0;
                      o.drift += dl.drift || 0;
                      if (dl.rootCause) o.rootCauses.add(dl.rootCause);
                      if ((dl.date || '') > (o.date || '')) { o.date = dl.date; o.employee = dl.employee; o.payment = dl.payment; o.table = dl.table; }
                    }
                  }
                  const allOrders = Object.values(orderMap);
                  if (allOrders.length === 0) return null;

                  // Classify orders into blocks — an order can appear in multiple blocks
                  const blocks = [
                    { id: 'OVER_TAXED', label: 'OVER TAXED', desc: 'Split order stale headers — backend copied parent GST to children without recalculating.', badgeClass: 'bg-red-100 text-red-700 border border-red-200', headerClass: 'text-red-700', dotClass: 'bg-red-500', borderClass: 'border-red-200', hoverClass: 'hover:bg-red-50/50', headBg: 'bg-red-50', headText: 'text-red-700', footBg: 'bg-red-50', footText: 'text-red-800', divider: 'divide-red-100' },
                    { id: 'TAX_NOT_COMPUTED', label: 'TAX NOT COMPUTED', desc: 'Backend failed to compute per-line GST despite product config having 5% tax rate.', badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200', headerClass: 'text-amber-700', dotClass: 'bg-amber-500', borderClass: 'border-amber-200', hoverClass: 'hover:bg-amber-50/50', headBg: 'bg-amber-50', headText: 'text-amber-700', footBg: 'bg-amber-50', footText: 'text-amber-800', divider: 'divide-amber-100' },
                    { id: 'GST_NOT_CONFIGURED', label: 'GST NOT CONFIGURED', desc: 'Items were added to the catalog without GST configured. Exempt under policy FE-61.', badgeClass: 'bg-green-100 text-green-700 border border-green-200', headerClass: 'text-green-700', dotClass: 'bg-green-500', borderClass: 'border-green-200', hoverClass: 'hover:bg-green-50/50', headBg: 'bg-green-50', headText: 'text-green-700', footBg: 'bg-green-50', footText: 'text-green-800', divider: 'divide-green-100' },
                  ];

                  const getBlockOrders = (blockId) => {
                    return allOrders.filter(o => o.rootCauses.has(blockId)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                  };

                  const renderBlock = (block) => {
                    const rows = getBlockOrders(block.id);
                    if (rows.length === 0) return null;
                    return (
                      <section key={block.id} data-testid={`audit-drift-block-${block.id.toLowerCase()}`} className="mb-6">
                        <h3 className={`text-sm font-semibold ${block.headerClass} mb-1 flex items-center gap-2`}>
                          <span className={`w-2 h-2 rounded-full ${block.dotClass}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${block.badgeClass}`}>{block.label}</span>
                          <span className="text-zinc-400 font-normal">·</span>
                          <span className="font-normal text-zinc-600">{rows.length} orders</span>
                        </h3>
                        <p className="text-[11px] text-zinc-500 mb-2">{block.desc}</p>
                        <div className={`border ${block.borderClass} rounded-lg overflow-hidden max-h-[400px] overflow-y-auto`}>
                          <table className="w-full text-xs">
                            <thead className={`${block.headBg} ${block.headText} sticky top-0`}>
                              <tr>
                                <th className="px-3 py-2 text-left">Order</th>
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-left">Employee</th>
                                <th className="px-3 py-2 text-left">Payment</th>
                                <th className="px-3 py-2 text-left">Table</th>
                                <th className="px-3 py-2 text-right">Items</th>
                                <th className="px-3 py-2 text-left">Items Ordered</th>
                                <th className="px-3 py-2 text-right">Item Total</th>
                                <th className="px-3 py-2 text-right">Discount</th>
                                <th className="px-3 py-2 text-right">Subtotal</th>
                                <th className="px-3 py-2 text-right">GST Expected</th>
                                <th className="px-3 py-2 text-right">GST Actual</th>
                                <th className="px-3 py-2 text-right">GST Drift</th>
                              </tr>
                            </thead>
                            <tbody className={`${block.divider} divide-y`}>
                              {rows.map((o, i) => (
                                <tr key={i} className={`bg-white ${block.hoverClass}`}>
                                  <td className="px-3 py-2 font-mono font-medium">{o.orderId}</td>
                                  <td className="px-3 py-2">{o.date ? o.date.slice(0, 10) : '—'}</td>
                                  <td className="px-3 py-2">{o.employee}</td>
                                  <td className="px-3 py-2">{o.payment}</td>
                                  <td className="px-3 py-2">{o.table || '—'}</td>
                                  <td className="px-3 py-2 text-right">{o.items}</td>
                                  <td className="px-3 py-2 text-zinc-600 max-w-[200px] truncate" title={o.itemNames.join(', ')}>{o.itemNames.join(', ')}</td>
                                  <td className="px-3 py-2 text-right">{formatCurrency(Math.round(o.itemTotal * 100) / 100)}</td>
                                  <td className="px-3 py-2 text-right">{formatCurrency(Math.round(Math.max(0, o.discount) * 100) / 100)}</td>
                                  <td className="px-3 py-2 text-right">{formatCurrency(Math.round(o.subtotal * 100) / 100)}</td>
                                  <td className="px-3 py-2 text-right">{formatCurrency(Math.round(o.expectedTax * 100) / 100)}</td>
                                  <td className="px-3 py-2 text-right">{formatCurrency(Math.round(o.actualTax * 100) / 100)}</td>
                                  <td className={`px-3 py-2 text-right font-semibold ${o.drift > 0 ? 'text-green-700' : 'text-red-600'}`}>
                                    {o.drift >= 0 ? '+' : ''}{formatCurrency(Math.round(o.drift * 100) / 100)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className={`${block.footBg} font-semibold ${block.footText}`}>
                              <tr>
                                <td className="px-3 py-2">TOTAL</td>
                                <td className="px-3 py-2" colSpan={4}>{rows.length} orders</td>
                                <td className="px-3 py-2 text-right">{rows.reduce((s, o) => s + o.items, 0)}</td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2 text-right">{formatCurrency(Math.round(rows.reduce((s, o) => s + o.itemTotal, 0) * 100) / 100)}</td>
                                <td className="px-3 py-2 text-right">{formatCurrency(Math.round(rows.reduce((s, o) => s + Math.max(0, o.discount), 0) * 100) / 100)}</td>
                                <td className="px-3 py-2 text-right">{formatCurrency(Math.round(rows.reduce((s, o) => s + o.subtotal, 0) * 100) / 100)}</td>
                                <td className="px-3 py-2 text-right">{formatCurrency(Math.round(rows.reduce((s, o) => s + o.expectedTax, 0) * 100) / 100)}</td>
                                <td className="px-3 py-2 text-right">{formatCurrency(Math.round(rows.reduce((s, o) => s + o.actualTax, 0) * 100) / 100)}</td>
                                <td className={`px-3 py-2 text-right font-bold ${rows.reduce((s, o) => s + o.drift, 0) > 0 ? 'text-green-700' : 'text-red-600'}`}>
                                  {formatCurrency(Math.round(rows.reduce((s, o) => s + o.drift, 0) * 100) / 100)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </section>
                    );
                  };

                  return (
                    <div data-testid="audit-drift-blocks">
                      {blocks.map(renderBlock)}
                    </div>
                  );
                })()}

                {/* AMBER section */}
                <section data-testid="audit-amber-table">
                  <h3 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> AMBER · Tax calculation mismatches ({audit.amber})
                  </h3>
                  {audit.amber === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No AMBER flags.</p>
                  ) : (
                    <div className="border border-amber-200 rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-amber-50 text-amber-700 sticky top-0">
                          <tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Bucket</th><th className="px-3 py-2 text-right">Revenue</th><th className="px-3 py-2 text-right">Actual</th><th className="px-3 py-2 text-right">Expected</th><th className="px-3 py-2 text-right">Δ</th><th className="px-3 py-2 text-left">Rate</th><th className="px-3 py-2 text-left">Reason</th><th className="px-3 py-2 text-center">Investigate</th></tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {audit.flags.filter(f => f.severity === 'AMBER').sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).map((f, i) => {
                            const key = `${f.foodId}_${f.bucketId}`;
                            const isExpanded = expandedAmber[key];
                            const lines = (driftByFood[f.foodId] || []).filter(dl => dl.bucket === f.bucketId);
                            return (
                              <React.Fragment key={i}>
                                <tr className="bg-white hover:bg-amber-50/50">
                                  <td className="px-3 py-2 font-medium">{f.name}</td>
                                  <td className="px-3 py-2">{f.bucket}</td>
                                  <td className="px-3 py-2 text-right">{formatCurrency(f.revenue)}</td>
                                  <td className="px-3 py-2 text-right">{formatCurrency(f.actualTax)}</td>
                                  <td className="px-3 py-2 text-right">{formatCurrency(f.expectedTax)}</td>
                                  <td className={`px-3 py-2 text-right font-semibold ${f.delta > 0 ? 'text-green-700' : 'text-red-600'}`}>{f.delta >= 0 ? '+' : ''}{formatCurrency(f.delta)}</td>
                                  <td className="px-3 py-2 text-zinc-500">{f.taxRate}% {f.taxType}</td>
                                  <td className="px-3 py-2 text-zinc-600">{f.reason}</td>
                                  <td className="px-3 py-2 text-center">
                                    {lines.length > 0 ? (
                                      <button
                                        data-testid={`audit-investigate-${f.foodId}-${f.bucketId}`}
                                        onClick={() => setExpandedAmber(prev => ({ ...prev, [key]: !prev[key] }))}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${isExpanded ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                                      >
                                        {isExpanded ? 'Hide' : `${lines.length} order${lines.length > 1 ? 's' : ''}`}
                                      </button>
                                    ) : (
                                      <span className="text-zinc-300 text-[10px]">—</span>
                                    )}
                                  </td>
                                </tr>
                                {isExpanded && lines.length > 0 && (
                                  <tr>
                                    <td colSpan={9} className="px-3 py-2 bg-amber-50/70">
                                      <div className="text-[10px] font-semibold text-amber-800 mb-1">{lines.length} order{lines.length > 1 ? 's' : ''} responsible for {formatCurrency(lines.reduce((s, l) => s + l.drift, 0))} drift</div>
                                      <table className="w-full text-[10px] border border-amber-200 rounded">
                                        <thead className="bg-amber-100 text-amber-800">
                                          <tr>
                                            <th className="px-2 py-1 text-left">Order</th>
                                            <th className="px-2 py-1 text-left">Date</th>
                                            <th className="px-2 py-1 text-left">Employee</th>
                                            <th className="px-2 py-1 text-left">Payment</th>
                                            <th className="px-2 py-1 text-left">Table</th>
                                            <th className="px-2 py-1 text-right">Qty</th>
                                            <th className="px-2 py-1 text-right">Subtotal</th>
                                            <th className="px-2 py-1 text-right">Expected</th>
                                            <th className="px-2 py-1 text-right">Actual</th>
                                            <th className="px-2 py-1 text-right">Drift</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-amber-100">
                                          {lines.map((dl, j) => (
                                            <tr key={j} className="bg-white hover:bg-amber-50/30">
                                              <td className="px-2 py-1 font-mono">{dl.orderId}</td>
                                              <td className="px-2 py-1">{dl.date ? dl.date.slice(0, 10) : '—'}</td>
                                              <td className="px-2 py-1">{dl.employee}</td>
                                              <td className="px-2 py-1">{dl.payment}</td>
                                              <td className="px-2 py-1">{dl.table || '—'}</td>
                                              <td className="px-2 py-1 text-right">{dl.qty}</td>
                                              <td className="px-2 py-1 text-right">{formatCurrency(dl.subtotal)}</td>
                                              <td className="px-2 py-1 text-right">{formatCurrency(dl.expectedTax)}</td>
                                              <td className="px-2 py-1 text-right">{formatCurrency(dl.actualTax)}</td>
                                              <td className={`px-2 py-1 text-right font-semibold ${dl.drift > 0 ? 'text-green-700' : 'text-red-600'}`}>{dl.drift >= 0 ? '+' : ''}{formatCurrency(dl.drift)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* EXEMPT section — FE-15 audit policy */}
                <section data-testid="audit-exempt-table">
                  <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> EXEMPT · Audit-passed by policy ({audit.exempt || 0})
                  </h3>
                  <p className="text-[11px] text-zinc-500 mb-2">Rows excluded from the standard tax-rate audit by an explicit, owner-approved policy. Per <strong>FE-15</strong> (approved 2026-06-02): complimentary lines have no tax because the backend computes tax against billable amount = ₹0.</p>
                  {(audit.exempt || 0) === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No exempt rows in this window.</p>
                  ) : (
                    <div className="border border-green-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-green-50 text-green-700">
                          <tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Bucket</th><th className="px-3 py-2 text-right">Revenue</th><th className="px-3 py-2 text-right">Actual Tax</th><th className="px-3 py-2 text-left">Policy</th></tr>
                        </thead>
                        <tbody className="divide-y divide-green-100">
                          {audit.flags.filter(f => f.severity === 'EXEMPT').map((f, i) => (
                            <tr key={i} className="bg-white hover:bg-green-50/50">
                              <td className="px-3 py-2 font-medium">{f.name}</td>
                              <td className="px-3 py-2">{f.bucket}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(f.revenue)}</td>
                              <td className="px-3 py-2 text-right text-green-700 font-medium">{formatCurrency(f.actualTax)}</td>
                              <td className="px-3 py-2 text-zinc-600">{f.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
                <section data-testid="audit-review-table">
                  <h3 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> REVIEW · Frontend business logic disclosures ({audit.review})
                  </h3>
                  <p className="text-[11px] text-zinc-500 mb-2">Per Protocol §8 — these rules were never explicitly approved. Click Approve or Reject to copy a chat-paste line, then send it back in chat.</p>
                  {audit.review === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No REVIEW items pending. All frontend rules approved.</p>
                  ) : (
                    <div className="border border-blue-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-blue-50 text-blue-700">
                          <tr><th className="px-3 py-2 text-left">ID</th><th className="px-3 py-2 text-left">Rule</th><th className="px-3 py-2 text-left">Explains</th><th className="px-3 py-2 text-left">Source</th><th className="px-3 py-2 text-left">Decision</th></tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                          {audit.reviewItems.map((r, i) => {
                            const gId = `G${i + 1}`;
                            return (
                              <tr key={r.ruleId} className="bg-white hover:bg-blue-50/50">
                                <td className="px-3 py-2 font-mono text-blue-700">{gId} <span className="text-zinc-400">({r.ruleId})</span></td>
                                <td className="px-3 py-2 font-medium">{r.name}</td>
                                <td className="px-3 py-2 text-zinc-600 max-w-xs">{r.explains}</td>
                                <td className="px-3 py-2 text-[10px] text-zinc-500 font-mono">{r.source.file}<br/>{r.source.site}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => navigator.clipboard?.writeText(`${gId} approve`)}
                                      className="text-[10px] px-2 py-0.5 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1"
                                      data-testid={`audit-review-approve-${r.ruleId}`}
                                      title={`Copy "${gId} approve" to clipboard`}
                                    ><Copy className="w-2.5 h-2.5" /> Approve</button>
                                    <button
                                      onClick={() => navigator.clipboard?.writeText(`${gId} reject — `)}
                                      className="text-[10px] px-2 py-0.5 rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1"
                                      data-testid={`audit-review-reject-${r.ruleId}`}
                                      title={`Copy "${gId} reject — " to clipboard (fill in your replacement)`}
                                    ><Copy className="w-2.5 h-2.5" /> Reject</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {audit.total === 0 && (
                  <div className="text-center py-12 text-zinc-500">
                    <ShieldAlert className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-base font-medium text-zinc-900 mb-1">Audit clean for this date range</p>
                    <p className="text-sm">Exports unlocked. All frontend rules approved. ✅</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
          <div className="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col relative">
            <div className="overflow-x-auto">
              {/* @audit:rule id="FE-48" name="Context-aware Cancelled + Comp tab column headers"
                  explains="Cancelled tab → 'Cancelled Qty' + 'Lost Revenue'. Comp tab → 'Comp Qty' + 'Would-be Revenue'. Others unchanged."
                  approved=true approvedDate="2026-06-02" approvedSource="Owner chat directive 2026-06-02 — 'in cancel tab we shd show header cancelled quantity and lost revenue' + 'complementary also revenue also'" */}
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200">
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('name')}>Item {getSortIcon('name')}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Station</th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('qty')}>
                      {activeTab === 'all_items' ? 'Qty' : activeTab === 'cancelled' ? 'Cancelled Qty' : activeTab === 'comp' ? 'Comp Qty' : activeTab === 'pending' ? 'Pending Qty' : activeTab === 'credit' ? 'Credit Qty' : 'Qty Sold'} {getSortIcon('qty')}
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('itemTotal')}>Item Total {getSortIcon('itemTotal')}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('discount')}>Discount {getSortIcon('discount')}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('subtotal')}>Subtotal {getSortIcon('subtotal')}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('tax')}>Tax {getSortIcon('tax')}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('drift')}>Drift {getSortIcon('drift')}</th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('totalRevenue')}>
                      {activeTab === 'all_items' ? 'Revenue' : activeTab === 'cancelled' || activeTab === 'comp' ? 'Lost Revenue' : activeTab === 'pending' ? 'Unbilled Revenue' : activeTab === 'credit' ? 'Credit Value' : 'Total Revenue'} {getSortIcon('totalRevenue')}
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('avgPrice')}>Avg Price {getSortIcon('avgPrice')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {lensFilteredData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-5 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-zinc-500">
                          <Search className="w-10 h-10 text-zinc-300 mb-3" />
                          <p className="text-base font-medium text-zinc-900 mb-1">No items found</p>
                          <p className="text-sm mb-4">No items match your current filters and date range.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    lensFilteredData.flatMap((row, idx, arr) => {
                      const separators = [];

                      // ── S5 Re-open: bucket group separators for "All Items" tab ──
                      if (activeTab === 'all_items' && row._bucket) {
                        const prevBucket = idx > 0 ? arr[idx - 1]?._bucket : null;
                        if (row._bucket !== prevBucket) {
                          const bucketCounts = arr.__bucketCounts || {};
                          const count = bucketCounts[row._bucket] || 0;
                          const colorMap = {
                            sold:      { bg: 'from-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                            pending:   { bg: 'from-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
                            credit:    { bg: 'from-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
                            cancelled: { bg: 'from-red-50',     text: 'text-red-700',     border: 'border-red-200' },
                            comp:      { bg: 'from-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
                          };
                          const c = colorMap[row._bucket] || colorMap.sold;
                          separators.push(
                            <tr key={`bucket-sep-${row._bucket}`} className={`bg-gradient-to-r ${c.bg} to-transparent`} data-testid={`bucket-separator-${row._bucket}`}>
                              <td colSpan={11} className={`px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${c.text} border-y ${c.border}`}>
                                {row._bucketLabel} · {count} {count === 1 ? 'item' : 'items'}
                              </td>
                            </tr>
                          );
                        }
                      }

                      // ── FE-16 separators, audit tinting, badges — REMOVED from all data tabs per owner directive 2026-06-05 ──
                      // Only bucket separators on All Items remain (handled above).

                      // Use composite key for all_items tab (same food_id can appear in multiple buckets)
                      const rowKey = row._bucket ? `${row.id}_${row._bucket}` : row.id;
                      const rowJsx = (
                      <tr
                        key={rowKey}
                        className={`hover:bg-zinc-50 cursor-pointer transition-colors group ${selectedRow?.id === row.id ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setSelectedRow(row)}
                        data-testid="reports-items-table-row"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${row.isVeg ? 'bg-green-500' : 'bg-red-500'}`} title={row.isVeg ? 'Veg' : 'Non-Veg'} />
                            <span className="font-medium text-zinc-900 group-hover:text-blue-600 transition-colors">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-zinc-600">{row.category}</td>
                        <td className="px-5 py-3 text-sm text-zinc-600">{row.station}</td>
                        <td className="px-5 py-3 text-sm font-medium text-zinc-900 text-right">{row.qty}</td>
                        <td className="px-5 py-3 text-sm text-zinc-900 text-right">{formatCurrency(row.itemTotal)}</td>
                        <td className="px-5 py-3 text-sm text-zinc-600 text-right">{formatCurrency(row.discount)}</td>
                        <td className="px-5 py-3 text-sm text-zinc-600 text-right">{formatCurrency(row.subtotal)}</td>
                        <td className="px-5 py-3 text-sm text-zinc-600 text-right">{formatCurrency(row.tax)}</td>
                        <td className={`px-5 py-3 text-sm font-medium text-right ${row.drift > 0 ? 'text-green-600' : row.drift < 0 ? 'text-red-600' : 'text-zinc-400'}`}>{row.drift >= 0 ? '+' : ''}{formatCurrency(row.drift)}</td>
                        <td className={`px-5 py-3 text-sm font-medium text-right ${activeTab === 'cancelled' || activeTab === 'comp' ? 'text-red-600' : 'text-zinc-900'}`}>{formatCurrency(row.totalRevenue)}</td>
                        <td className={`px-5 py-3 text-sm text-right ${activeTab === 'cancelled' || activeTab === 'comp' ? 'text-red-600' : 'text-zinc-600'}`}>{formatCurrency(row.avgPrice)}</td>
                      </tr>
                    );
                    return [...separators, rowJsx];
                    })
                  )}
                </tbody>
              </table>
            </div>
            {lensFilteredData.length > 0 && (
              <div className="mt-auto px-5 py-3 bg-zinc-50 border-t border-zinc-200 text-xs text-zinc-500 flex justify-between items-center shrink-0">
                <span>Showing {lensFilteredData.length} {lensFilteredData.length === 1 ? 'item' : 'items'}</span>
                <span>sorted by {sortConfig.key.charAt(0).toUpperCase() + sortConfig.key.slice(1)} {sortConfig.direction === 'desc' ? '↓' : '↑'}</span>
              </div>
            )}
          </div>
          )}
          </div>
        </ReportLoadingShield>

        {/* Side-sheet Drill (S3 template, carried forward) */}
        {selectedRow && (
          <ItemDrillSheet
            item={selectedRow}
            onClose={() => setSelectedRow(null)}
            totalRevenue={summary.totalRev}
          />
        )}
      </main>
    </div>
  );
};

export default ItemSalesHybridMockup;
