/**
 * OrderLedgerMockup — CR-011 S6 (Phase 2 Hero Screen) · Gate ⑤ revision
 *
 * Gate ⑤ owner-driven changes (2026-06-03):
 *   1. Column chooser (per-user localStorage). Default 16 of 51 visible.
 *   2. Header now S5 pattern: From-To range, Apply, presets, attribution
 *      toggle, F26B33 Download. Default last 7 days, max 60.
 *   3. Two audit tabs: "Audit" (mirrors Audit Report's reconciliation:
 *      missing-ID gap detection + unmatched status='audit' rows) and
 *      "Ledger Audit" (S6 rule family TBD). Owner will rename later.
 *   4. NO dual-fetch — single sort_by switched by attribution toggle.
 *
 * Service: orderLedgerService.getOrderLedgerForRange(from, to, schedules, sortBy)
 * Drill:   OrderDetailSheet in DATA MODE via row.__source
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import FilterBar from '../../components/reports/FilterBar';
import FilterTags from '../../components/reports/FilterTags';
import OrderDetailSheet from '../../components/reports/OrderDetailSheet';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import useReportFetch from '../../components/reports/useReportFetch';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { getOrderLedgerForRange } from '../../api/services/orderLedgerService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import { auditAllOrders } from '../../utils/orderLedgerAuditEngine';
import {
  ArrowLeft, X, Search, ChevronUp, ChevronDown, ChevronsUpDown, Download,
  FileSpreadsheet, FileDown, Mail, MessageCircle, Send, ShieldAlert,
  FileText, Calendar as CalendarIcon, Check, Columns3,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_RANGE_DAYS = 60;
const COL_STORAGE_KEY = 's6.columnVisibility.v1';

// Tabs: Audit + Ledger Audit env-gated via REACT_APP_SHOW_AUDIT_TAB (default hidden)
const showAuditTab = process.env.REACT_APP_SHOW_AUDIT_TAB === 'true';
const TABS = [
  { id: 'all',         label: 'All Orders',         color: 'zinc' },
  { id: 'paid',        label: 'Settled',            color: 'blue' },
  { id: 'cancelled',   label: 'Cancelled',          color: 'red' },
  { id: 'credit',      label: 'Added to Credit',    color: 'purple' },
  { id: 'hold',        label: 'On Hold',            color: 'orange' },
  { id: 'merged',      label: 'Merged',             color: 'teal' },
  { id: 'running',     label: 'Running',            color: 'yellow' },
  { id: 'aggregator',  label: 'Aggregator',         color: 'amber' },
  ...(showAuditTab ? [{ id: 'audit',       label: 'Audit',              color: 'green' }] : []),
  ...(showAuditTab ? [{ id: 'ledgerAudit', label: 'Ledger Audit',       color: 'green' }] : []),
];

// ── Canonical TAB_FILTERS — verbatim copy of AllOrdersReportPage L66-123 ─────
// CR-011 S6 Gate ⑤ fix (2026-06-03): owner directive "use same logic as audit
// report". Each predicate checks the same transform fields Audit Report uses
// (paymentMethod / paymentStatus / fOrderStatus / orderIn / status). Rows can
// legitimately appear in multiple tab counts (e.g. Settled + Aggregator).
const TAB_FILTERS = {
  all: () => true,
  paid: (o) => {
    if (o.paymentMethod === 'Cancel') return false;
    if (o.paymentMethod === 'Merge' || o.paymentStatus === 'Merge') return false;
    if (o.paymentMethod === 'TAB') return false;
    if (o.paymentStatus === 'unpaid') return false;
    if (o.paymentMethod?.toLowerCase() === 'paylater') return false;
    if (o.fOrderStatus === 9) return false;
    if (o.paymentMethod?.toLowerCase() === 'transfertoroom') return false;
    return o.fOrderStatus === 6;
  },
  cancelled: (o) => o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled',
  credit: (o) => o.paymentMethod === 'TAB',
  hold: (o) =>
    o.paymentMethod?.toLowerCase() === 'paylater' ||
    o.fOrderStatus === 9 ||
    o.fOrderStatus === 8,
  merged: (o) => o.paymentMethod === 'Merge' || o.paymentStatus === 'Merge',
  running: (o) => {
    if (o.paymentMethod === 'Cancel') return false;
    if (o.paymentMethod === 'Merge' || o.paymentStatus === 'Merge') return false;
    if (o.paymentMethod?.toLowerCase() === 'paylater') return false;
    if (o.fOrderStatus === 9) return false;
    if (o.fOrderStatus === 8) return false;
    return (
      o.status === 'running' ||
      o.paymentStatus === 'unpaid' ||
      o.paymentMethod?.toLowerCase() === 'transfertoroom'
    );
  },
  aggregator: (o) => ['zomato', 'swiggy'].includes((o.orderIn || '').toLowerCase()),
  audit: (o) => {
    if (o._isMissing) return true;
    return !TAB_FILTERS.paid(o) &&
           !TAB_FILTERS.cancelled(o) &&
           !TAB_FILTERS.credit(o) &&
           !TAB_FILTERS.hold(o) &&
           !TAB_FILTERS.merged(o) &&
           !TAB_FILTERS.running(o) &&
           !TAB_FILTERS.aggregator(o);
  },
  ledgerAudit: () => false,
};

// Status-label helper (drives the OrderDetailSheet badge colour)
const statusLabelFor = (o) => {
  if (TAB_FILTERS.cancelled(o)) return 'Cancelled';
  if (TAB_FILTERS.merged(o))    return 'Merged';
  if (TAB_FILTERS.credit(o))    return 'Credit';
  if (TAB_FILTERS.hold(o))      return 'Hold';
  if (TAB_FILTERS.running(o))   return 'Running';
  if (TAB_FILTERS.paid(o))      return 'Paid';
  return 'Paid';
};

const DOWNLOAD_MENU = [
  { id: 'excel',    label: 'Download as Excel',           icon: FileSpreadsheet, enabled: true,  testId: 'order-ledger-download-excel-btn',  phase: null },
  { id: 'pdf',      label: 'Download as PDF',             icon: FileDown,        enabled: true,  testId: 'order-ledger-download-pdf-btn',    phase: null },
  { id: 'email',    label: 'Send via Email (attachment)', icon: Mail,            enabled: false, testId: 'order-ledger-share-email-btn',     phase: null },
  { id: 'whatsapp', label: 'Send via WhatsApp',           icon: MessageCircle,   enabled: false, testId: 'order-ledger-share-whatsapp-btn',  phase: null },
  { id: 'sms',      label: 'Send via SMS',                icon: Send,            enabled: false, testId: 'order-ledger-share-sms-btn',       phase: null },
];

// Default-visible 16 columns (from owner highlight 2026-06-03)
const DEFAULT_VISIBLE = new Set([
  'orderNumber','orderDate','orderTime','orderType','itemCount','orderDetails',
  'waiterOrdered','waiterCollected',
  'paymentType','itemTotal','subTotal','gstAmount','totalAmount',
  'cashAmount','cardAmount','upiAmount',
]);

// All 51 columns (key, label, group, sortable, align)
// Order follows the calculation chain (owner directive 2026-06-03):
//   ItemTotal → +Delivery +Service +Tip − Discount → SubTotal → +GST/VAT → +RoundOff → TotalAmount
// (loyalty/coupon kept after discount block but excluded from FE-82R formula per owner directive)
const COLUMNS = [
  { key: 'orderNumber',       label: 'Order ID',              group: 'Identity & Time', sortable: true,  align: 'left' },
  { key: 'orderDate',         label: 'Order Date',            group: 'Identity & Time', sortable: true,  align: 'left' },
  { key: 'orderTime',         label: 'Order Time',            group: 'Identity & Time', sortable: true,  align: 'left' },
  { key: 'orderType',         label: 'Order Type',            group: 'Order',           sortable: true,  align: 'left' },
  { key: 'itemCount',         label: 'No. Of Items',          group: 'Order',           sortable: true,  align: 'center' },
  { key: 'orderDetails',      label: 'Order Details',         group: 'Order',           sortable: false, align: 'left' },
  { key: 'waiterOrdered',     label: 'Waiter (Ordered)',      group: 'Staff',           sortable: true,  align: 'left' },
  { key: 'waiterCollected',   label: 'Waiter (Collected)',    group: 'Staff',           sortable: true,  align: 'left' },
  { key: 'paymentType',       label: 'Payment Type',          group: 'Money',           sortable: true,  align: 'left' },
  // ── Calculation chain start ────────────────────────────────────────────
  { key: 'itemTotal',         label: 'Item Total',            group: 'Money',           sortable: true,  align: 'right' },
  { key: 'deliveryCharge',    label: 'Delivery Charge',       group: 'Money',           sortable: true,  align: 'right' },
  { key: 'serviceCharge',     label: 'Service Tax',           group: 'Money',           sortable: true,  align: 'right' },
  { key: 'tipAmount',         label: 'Tip Amount',            group: 'Money',           sortable: true,  align: 'right' },
  { key: 'discount',          label: 'Discount',              group: 'Money',           sortable: true,  align: 'right' },
  { key: 'discountCategory',  label: 'Discount Category',     group: 'Money',           sortable: false, align: 'left' },
  { key: 'discountFor',       label: 'Discount For',          group: 'Money',           sortable: false, align: 'left' },
  { key: 'couponCode',        label: 'Coupon Code',           group: 'Money',           sortable: false, align: 'left' },
  { key: 'couponDiscount',    label: 'Coupon Discount',       group: 'Money',           sortable: true,  align: 'right' },
  { key: 'walletUsed',        label: 'Wallet Used',           group: 'Money',           sortable: true,  align: 'right' },
  { key: 'loyaltyUsed',       label: 'Loyalty Used',          group: 'Money',           sortable: true,  align: 'right' },
  { key: 'subTotal',          label: 'Sub Total',             group: 'Money',           sortable: true,  align: 'right' },
  { key: 'gstAmount',         label: 'GST',                   group: 'Money',           sortable: true,  align: 'right' },
  { key: 'vatAmount',         label: 'VAT',                   group: 'Settlement & Tax',sortable: true,  align: 'right' },
  { key: 'gstAmountOnly',     label: 'GST (excl. VAT)',       group: 'Settlement & Tax',sortable: true,  align: 'right' },
  { key: 'roundOff',          label: 'Round Off',             group: 'Money',           sortable: true,  align: 'right' },
  { key: 'totalAmount',       label: 'Total Amount',          group: 'Money',           sortable: true,  align: 'right' },
  // ── Tender split (audits the payment side, not the bill side) ─────────
  { key: 'cashAmount',        label: 'Cash',                  group: 'Money Split',     sortable: true,  align: 'right' },
  { key: 'cardAmount',        label: 'Card',                  group: 'Money Split',     sortable: true,  align: 'right' },
  { key: 'upiAmount',         label: 'UPI',                   group: 'Money Split',     sortable: true,  align: 'right' },
  { key: 'tabAmount',         label: 'TAB',                   group: 'Money Split',     sortable: true,  align: 'right' },
  { key: 'zomatoGold',        label: 'Zomato Gold',           group: 'Money Split',     sortable: true,  align: 'right' },
  { key: 'partialPayment',    label: 'Partial Payment',       group: 'Money Split',     sortable: true,  align: 'right' },
  { key: 'contactName',       label: 'Contact Person Name',   group: 'Customer',        sortable: false, align: 'left' },
  { key: 'contactNumber',     label: 'Contact Person Number', group: 'Customer',        sortable: false, align: 'left' },
  { key: 'dob',               label: 'Date Of Birth',         group: 'Customer',        sortable: false, align: 'left' },
  { key: 'anniversary',       label: 'Date Of Anniversary',   group: 'Customer',        sortable: false, align: 'left' },
  { key: 'userName',          label: 'User Name',             group: 'Customer',        sortable: false, align: 'left' },
  { key: 'userPhone',         label: 'User Phone',            group: 'Customer',        sortable: false, align: 'left' },
  { key: 'addressType',       label: 'Address Type',          group: 'Address',         sortable: false, align: 'left' },
  { key: 'area',              label: 'Area',                  group: 'Address',         sortable: false, align: 'left' },
  { key: 'pincode',           label: 'Pincode',               group: 'Address',         sortable: false, align: 'left' },
  { key: 'completeAddress',   label: 'Complete Address',      group: 'Address',         sortable: false, align: 'left' },
  { key: 'location',          label: 'Location',              group: 'Address',         sortable: false, align: 'left' },
  { key: 'transactionId',     label: 'Transaction ID',        group: 'Payment IDs',     sortable: false, align: 'left' },
  { key: 'razorpayStatus',    label: 'Razorpay Status',       group: 'Payment IDs',     sortable: false, align: 'left' },
  { key: 'razorpayPaymentId', label: 'Razorpay Payment ID',   group: 'Payment IDs',     sortable: false, align: 'left' },
  { key: 'razorpayOrderId',   label: 'Razorpay Order ID',     group: 'Payment IDs',     sortable: false, align: 'left' },
  { key: 'collectBillDate',   label: 'Collect Bill Date',     group: 'Settlement & Tax',sortable: true,  align: 'left' },
  { key: 'collectBillTime',   label: 'Collect Bill Time',     group: 'Settlement & Tax',sortable: true,  align: 'left' },
  { key: 'roomTotal',         label: 'Room Total',            group: 'Room',            sortable: true,  align: 'right' },
  { key: 'roomAdvance',       label: 'Room Advance',          group: 'Room',            sortable: true,  align: 'right' },
  { key: 'roomCheckout',      label: 'Room Checkout',         group: 'Room',            sortable: false, align: 'left' },
];

const fmtCur = (v) => { if (!v && v !== 0) return ''; const hasDecimals = v % 1 !== 0; return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`; };
const fmtISO = (d) => { const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; };
const daysDiff = (a,b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// ══════════════════════════════════════════════════════════════════════════════
const OrderLedgerMockup = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const schedules = useMemo(() => restaurant?.schedules || [], [restaurant?.schedules]);

  // App shell
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);

  // ── Date range — default last 7 days (owner-locked 2026-06-03) ───────────
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 6 * 86400000);
  const { sharedFrom, sharedTo, setSharedFrom, setSharedTo } = useInsightsCache();
  const [fromDate, setFromDate] = useState(sharedFrom);
  const [toDate, setToDate] = useState(sharedTo);
  const [appliedFrom, setAppliedFrom] = useState(sharedFrom);
  const [appliedTo, setAppliedTo] = useState(sharedTo);
  const [activePreset, setActivePreset] = useState('7D');

  // Attribution: hardcoded to Punched Date (created_at) — owner directive 2026-06-05.
  // Toggle removed for production. Matches AllOrdersReportPage L237 (hardcoded created_at).
  const paidToggle = 'created_at';
  const cancelToggle = 'created_at';

  // Tabs
  const [activeTab, setActiveTab] = useState('all');
  // Hardcoded to 'created_at' (Punched Date) — toggle removed per owner directive 2026-06-05
  const effectiveSortBy = 'created_at';

  // Filters / Search / Sort
  const [filters, setFilters] = useState({ status: null, paymentMethod: null, paymentType: null, channel: null, platform: null, paymentGateway: null });
  const [searchQuery, setSearchQuery] = useState('');
  // Ledger-Audit-only search (CR-011-S6-UX-01, 2026-06-04 PM):
  // Filters visible flag rows on the Ledger Audit tab by restaurant_order_id (substring,
  // case-insensitive, leading-zero tolerant). KPI strip + rule legend stay GLOBAL on purpose
  // (audit totals must remain a stable reference); groups with zero matches are hidden.
  const [auditSearchOrderId, setAuditSearchOrderId] = useState('');
  const [sortCol, setSortCol] = useState('orderNumber');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Download
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadRef = useRef(null);

  // ── Column chooser ────────────────────────────────────────────────────────
  const [showColMenu, setShowColMenu] = useState(false);
  const colRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(COL_STORAGE_KEY) || 'null');
      if (Array.isArray(stored) && stored.length > 0) return new Set(stored);
    } catch (_) {}
    return new Set(DEFAULT_VISIBLE);
  });
  useEffect(() => {
    try { localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(Array.from(visibleCols))); } catch (_) {}
  }, [visibleCols]);
  const toggleCol = (key) => setVisibleCols((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const resetCols = () => setVisibleCols(new Set(DEFAULT_VISIBLE));
  const showAllCols = () => setVisibleCols(new Set(COLUMNS.map((c) => c.key)));
  const hideAllCols = () => setVisibleCols(new Set(['orderNumber'])); // never zero — keep ID

  // Click outside for both popovers
  useEffect(() => {
    const handler = (e) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) setShowDownloadMenu(false);
      if (colRef.current && !colRef.current.contains(e.target)) setShowColMenu(false);
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
    () => datesValid ? getOrderLedgerForRange(appliedFrom, appliedTo, schedules, effectiveSortBy) : Promise.resolve({ orders: [], meta: {} }),
    [appliedFrom, appliedTo, schedules, effectiveSortBy, datesValid]
  );
  const { data, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(
    fetchFn,
    [appliedFrom, appliedTo, schedules, effectiveSortBy]
  );
  const apiOrders = data?.orders || [];
  const fullOrders = data?.fullOrders || [];

  // Range preset
  const handlePreset = (p) => {
    setActivePreset(p);
    const now = new Date();
    let f = new Date(now); let t = new Date(now);
    if (p === 'Today') {}
    else if (p === '7D') f = new Date(now.getTime() - 6 * 86400000);
    else if (p === '30D') f = new Date(now.getTime() - 29 * 86400000);
    else if (p === 'MTD') f = new Date(now.getFullYear(), now.getMonth(), 1);
    setFromDate(fmtISO(f)); setToDate(fmtISO(t));
    setAppliedFrom(fmtISO(f)); setAppliedTo(fmtISO(t));
  };
  const handleApply = () => {
    if (!canApply) return;
    setAppliedFrom(fromDate); setAppliedTo(toDate); setSharedFrom(fromDate); setSharedTo(toDate); setActivePreset('');
  };

  // ── Audit (Reconciliation) — mirror AllOrdersReportPage L319-356 ─────────
  // Gap detection runs on FULL (incl. rooms) — see AllOrdersReportPage CR-001
  // Phase 2 G4 correction. Unmatched = transform-derived status==='audit'.
  const reconciliation = useMemo(() => {
    if (fullOrders.length < 2) return { missingIds: [], unmatched: [] };
    const sortedDesc = [...fullOrders].sort((a, b) => {
      const ai = parseInt(String(a.orderNumber).replace(/\D/g, ''), 10) || 0;
      const bi = parseInt(String(b.orderNumber).replace(/\D/g, ''), 10) || 0;
      return bi - ai;
    });
    const missingIds = [];
    for (let i = 0; i < sortedDesc.length - 1; i++) {
      const cur = parseInt(String(sortedDesc[i].orderNumber).replace(/\D/g, ''), 10) || 0;
      const nxt = parseInt(String(sortedDesc[i + 1].orderNumber).replace(/\D/g, ''), 10) || 0;
      const gap = cur - nxt;
      if (gap > 1 && gap <= 100) {
        const padTo = String(sortedDesc[i].orderNumber).length;
        for (let m = cur - 1; m > nxt; m--) missingIds.push(String(m).padStart(padTo, '0'));
      }
    }
    const unmatched = apiOrders.filter((o) => TAB_FILTERS.audit(o));
    return { missingIds, unmatched };
  }, [fullOrders, apiOrders]);

  // ── Ledger Audit engine (CR-011 S6 Block A Revised — 5 active rules, 2026-06-03) ──
  const ledgerAudit = useMemo(
    () => auditAllOrders(apiOrders, { deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0 }),
    [apiOrders, restaurant?.deliveryChargeGstPct]
  );

  // ── Tab counts (canonical TAB_FILTERS predicates — Audit Report parity) ──
  const tabCounts = useMemo(() => {
    const c = {};
    TABS.forEach((t) => {
      if (t.id === 'audit') c[t.id] = 0;             // finalized after gap detection
      else if (t.id === 'ledgerAudit') c[t.id] = 0;
      else c[t.id] = apiOrders.filter(TAB_FILTERS[t.id]).length;
    });
    c.all = apiOrders.length + reconciliation.missingIds.length;
    c.audit = reconciliation.missingIds.length + reconciliation.unmatched.length;
    c.ledgerAudit = ledgerAudit.counts.ACTIVE || 0;
    return c;
  }, [apiOrders, reconciliation, ledgerAudit]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'audit' || activeTab === 'ledgerAudit') return [];
    let r = apiOrders.filter(TAB_FILTERS[activeTab] || (() => true));
    if (filters.paymentMethod) r = r.filter((o) => o.paymentType?.toLowerCase() === filters.paymentMethod.toLowerCase());
    if (filters.paymentType) r = r.filter((o) => filters.paymentType === 'prepaid' ? o.paymentType?.toLowerCase() !== 'cash' : o.paymentType?.toLowerCase() === 'cash');
    if (filters.channel) r = r.filter((o) => o.orderType?.toLowerCase() === filters.channel);
    if (filters.paymentGateway === 'gateway') r = r.filter((o) => Boolean(o.razorpayOrderId));
    else if (filters.paymentGateway === 'nonGateway') r = r.filter((o) => !o.razorpayOrderId);
    return r;
  }, [activeTab, apiOrders, filters]);

  const searchedOrders = useMemo(() => {
    if (!searchQuery.trim()) return filteredOrders;
    const q = searchQuery.toLowerCase();
    return filteredOrders.filter((o) =>
      (o.orderNumber || '').toLowerCase().includes(q) ||
      (o.orderDetails || '').toLowerCase().includes(q) ||
      (o.waiterOrdered || '').toLowerCase().includes(q) ||
      (o.paymentType || '').toLowerCase().includes(q) ||
      (o.contactName || '').toLowerCase().includes(q)
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

  const handleSort = (col) => sortCol === col ? setSortDir((d) => d === 'asc' ? 'desc' : 'asc') : (setSortCol(col), setSortDir('desc'));
  const summary = useMemo(() => ({
    totalOrders: filteredOrders.length,
    totalAmount: filteredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
    avgOrderValue: filteredOrders.length > 0 ? filteredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0) / filteredOrders.length : 0,
  }), [filteredOrders]);

  const handleTabChange = (id) => { setActiveTab(id); setSelectedOrder(null); setFilters({ status: null, paymentMethod: null, paymentType: null, channel: null, platform: null, paymentGateway: null }); };
  const SortIcon = ({ col }) => sortCol !== col ? <ChevronsUpDown className="w-3 h-3 text-zinc-300" /> : sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#F26B33]" /> : <ChevronDown className="w-3 h-3 text-[#F26B33]" />;
  const cellVal = (o, c) => { const v = o[c.key]; if (v === undefined || v === null || v === '' || v === 0) return '—'; if (c.align === 'right' && typeof v === 'number') return fmtCur(v); return String(v); };

  // Visible columns (ordered by COLUMNS array)
  const visibleColList = useMemo(() => COLUMNS.filter((c) => visibleCols.has(c.key)), [visibleCols]);

  // Column-sum totals row (across currently visible/filtered/searched/sorted rows)
  // Q4: only computed for visible columns. Q2: hidden when no rows.
  const columnTotals = useMemo(() => {
    if (sortedOrders.length === 0) return null;
    const totals = {};
    for (const c of visibleColList) {
      if (c.align === 'right') {
        totals[c.key] = sortedOrders.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
      } else if (c.key === 'itemCount') {
        totals[c.key] = sortedOrders.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
      } else {
        totals[c.key] = null;
      }
    }
    return totals;
  }, [sortedOrders, visibleColList]);

  // Header KPI tiles (Q1: sum over currently-visible rows, Q5: shown on all non-audit tabs)
  const billTotals = useMemo(() => {
    const set = sortedOrders;
    const gst = set.reduce((s, r) => s + (Number(r.gstAmount) || 0), 0);
    const vat = set.reduce((s, r) => s + (Number(r.vatAmount) || 0), 0);
    return {
      itemTotal:  set.reduce((s, r) => s + (Number(r.itemTotal) || 0), 0),
      delivery:   set.reduce((s, r) => s + (Number(r.deliveryCharge) || 0) + (Number(r.deliveryChargeGst) || 0), 0),
      scTips:     set.reduce((s, r) => s + (Number(r.serviceCharge) || 0) + (Number(r.tipAmount) || 0), 0),
      discount:   set.reduce((s, r) => s + (Number(r.discount) || 0), 0),
      subTotal:   set.reduce((s, r) => s + (Number(r.subTotal)  || 0), 0),
      tax:        gst + vat,
      gst,
      vat,
      hasVat:     vat > 0,
      roundOff:   set.reduce((s, r) => s + (Number(r.roundOff) || 0), 0),
      total:      set.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0),
    };
  }, [sortedOrders]);

  // ── Export ────────────────────────────────────────────────────────────────
  const buildExportPayload = () => {
    // All numeric column keys for TOTAL row sums
    const NUMERIC_KEYS = [
      'itemCount', 'itemTotal', 'deliveryCharge', 'deliveryChargeGst', 'serviceCharge',
      'tipAmount', 'discount', 'couponDiscount', 'walletUsed', 'loyaltyUsed',
      'subTotal', 'gstAmount', 'vatAmount', 'gstAmountOnly', 'roundOff', 'totalAmount',
      'cashAmount', 'cardAmount', 'upiAmount', 'tabAmount', 'zomatoGold', 'partialPayment',
    ];
    const sumAll = (rows) => {
      const t = { label: 'TOTAL' };
      NUMERIC_KEYS.forEach((k) => { t[k] = rows.reduce((s, r) => s + (Number(r[k]) || 0), 0); });
      return t;
    };

    const exportCols = COLUMNS.filter((c) => !['orderDetails', 'completeAddress'].includes(c.key)).map((c) => ({ key: c.key, label: c.label, format: c.align === 'right' ? 'inr' : 'text', align: c.align, width: 100 }));

    const buildSheet = (id, label, customRows) => {
      const rows = customRows || (id === 'all' ? apiOrders : apiOrders.filter(TAB_FILTERS[id] || (() => false)));
      return {
        name: label,
        subtitle: `${rows.length} orders · ${appliedFrom} → ${appliedTo}`,
        columns: exportCols,
        rows,
        totals: sumAll(rows),
      };
    };

    // ── Task #4: Settled sheet includes TAB/Credit orders with flag column ──
    const settledRows = apiOrders.filter(TAB_FILTERS.paid);
    const creditRows  = apiOrders.filter(TAB_FILTERS.credit);
    const settledPlusCreditRows = [
      ...settledRows.map((r) => ({ ...r, _paymentCategory: 'Settled' })),
      ...creditRows.map((r) => ({ ...r, _paymentCategory: 'Credit/TAB' })),
    ];
    const settledCols = [
      ...exportCols.slice(0, exportCols.findIndex((c) => c.key === 'paymentType') + 1),
      { key: '_paymentCategory', label: 'Payment Category', format: 'text', align: 'left', width: 130 },
      ...exportCols.slice(exportCols.findIndex((c) => c.key === 'paymentType') + 1),
    ];

    // ── Compute per-bucket aggregates for revised KPI summary ──
    const sum = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    const cancelledRows = apiOrders.filter(TAB_FILTERS.cancelled);
    const holdRows      = apiOrders.filter(TAB_FILTERS.hold);
    const runningRows   = apiOrders.filter(TAB_FILTERS.running);
    const mergedRows    = apiOrders.filter(TAB_FILTERS.merged);

    const settledRevenue   = sum(settledRows, 'totalAmount');
    const creditRevenue    = sum(creditRows, 'totalAmount');
    const cancelledRevenue = sum(cancelledRows, 'totalAmount');
    const holdRevenue      = sum(holdRows, 'totalAmount');
    const runningRevenue   = sum(runningRows, 'totalAmount');
    const netRevenue       = settledRevenue + creditRevenue;
    const pendingRevenue   = holdRevenue + runningRevenue;
    const netTax           = sum(settledRows, 'gstAmount') + sum(settledRows, 'vatAmount')
                           + sum(creditRows, 'gstAmount') + sum(creditRows, 'vatAmount');
    const netDiscount      = sum(settledRows, 'discount') + sum(creditRows, 'discount');
    const netOrderCount    = settledRows.length + creditRows.length;
    const avgOrderValue    = netOrderCount > 0 ? netRevenue / netOrderCount : 0;

    // ── Payment method split (from settled orders only) ──
    const pmSum = (field) => settledRows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
    const cashTotal = pmSum('cashAmount');
    const cardTotal = pmSum('cardAmount');
    const upiTotal  = pmSum('upiAmount');

    return {
      title: 'Order Ledger',
      subtitle: 'Historical order ledger',
      restaurant: { name: restaurant?.name || '', address: restaurant?.address || '', id: restaurant?.id || '' },
      dateRange: { from: appliedFrom, to: appliedTo },
      generatedBy: restaurant?.ownerName || '',
      kpis: [
        { label: 'Total Orders',       value: apiOrders.length,        tone: 'primary', format: 'text' },
        { label: 'Net Revenue',        value: netRevenue,              tone: 'good',    format: 'inr' },
        { label: 'Settled Revenue',    value: settledRevenue,          tone: 'good',    format: 'inr' },
        { label: 'Credit Outstanding', value: creditRevenue,           tone: 'primary', format: 'inr' },
        { label: 'Pending Revenue',    value: pendingRevenue,          tone: 'primary', format: 'inr' },
        { label: 'Revenue Loss',       value: cancelledRevenue,        tone: 'bad',     format: 'inr' },
        { label: 'Tax (GST+VAT)',      value: netTax,                  tone: 'good',    format: 'inr' },
        { label: 'Discount',           value: netDiscount,             tone: 'bad',     format: 'inr' },
        { label: 'Avg Order Value',    value: avgOrderValue,           tone: 'primary', format: 'inr' },
        { label: 'Settled',            value: settledRows.length,      tone: 'good',    format: 'text' },
        { label: 'Credit/TAB',         value: creditRows.length,       tone: 'primary', format: 'text' },
        { label: 'On Hold',            value: holdRows.length,         tone: 'primary', format: 'text' },
        { label: 'Running',            value: runningRows.length,      tone: 'primary', format: 'text' },
        { label: 'Cancelled',          value: cancelledRows.length,    tone: 'bad',     format: 'text' },
        { label: 'Merged',             value: mergedRows.length,       tone: '',        format: 'text' },
        { label: 'Cash',               value: cashTotal,               tone: 'primary', format: 'inr' },
        { label: 'Card',               value: cardTotal,               tone: 'primary', format: 'inr' },
        { label: 'UPI',                value: upiTotal,                tone: 'primary', format: 'inr' },
      ],
      sheets: [
        buildSheet('all', 'All Orders'),
        { ...buildSheet(null, 'Settled (incl. Credit)', settledPlusCreditRows), columns: settledCols, totals: sumAll(settledPlusCreditRows) },
        buildSheet('cancelled', 'Cancelled'),
        buildSheet('credit', 'Added to Credit'),
        buildSheet('hold', 'On Hold'),
        buildSheet('merged', 'Merged'),
        buildSheet('running', 'Running'),
        buildSheet('aggregator', 'Aggregator'),
      ],
    };
  };
  const handleDownloadAction = (action) => {
    let pdfWin = null;
    if (action === 'pdf') pdfWin = openReportWindow();
    setShowDownloadMenu(false);
    if (['email','whatsapp','sms'].includes(action)) return;
    try {
      const payload = buildExportPayload();
      if (action === 'excel') exportReportAsExcel(payload);
      else if (action === 'pdf') exportReportAsPDF(pdfWin, payload);
    } catch (e) { console.error('export failed:', e); if (pdfWin && !pdfWin.closed) pdfWin.close(); }
  };

  // ── Ledger Audit engine output now available via the early-declared
  // `ledgerAudit` (moved above tabCounts to fix TDZ — referenced there too).

  const isAuditTab = activeTab === 'audit';
  const isLedgerAuditTab = activeTab === 'ledgerAudit';
  const isAnyAudit = isAuditTab || isLedgerAuditTab;

  // Audit tab colour
  const auditFlagsCount = reconciliation.missingIds.length + reconciliation.unmatched.length;

  // Columns grouped for chooser
  const colGroups = useMemo(() => {
    const g = {};
    COLUMNS.forEach((c) => { if (!g[c.group]) g[c.group] = []; g[c.group].push(c); });
    return g;
  }, []);

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-screen bg-white font-sans" data-testid="order-ledger-screen">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode} onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}} onRefresh={refetch} isRefreshing={isLoading} isOrderEntryOpen={false} />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          {/* ── Header (S5 pattern — verbatim) ───────────────────────────── */}
          <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="order-ledger-header">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="order-ledger-back-btn" onClick={() => navigate('/reports-module/dashboard')}>
                <ArrowLeft className="w-5 h-5 text-zinc-600" />
              </button>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 flex items-center gap-2" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                Order Ledger
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* From-To range (S5) */}
              <div className={`flex items-center gap-2 px-3 py-2 border ${draftDirty && draftValid && !draftRangeExceeded ? 'border-[#F26B33]' : draftRangeExceeded ? 'border-red-400' : 'border-zinc-200'} bg-white rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="order-ledger-daterange">
                <CalendarIcon className="w-4 h-4 text-zinc-500" />
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">From</span>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={isLoading} min={minFromDate} max={fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="order-ledger-date-from" />
                </label>
                <span className="text-zinc-300">—</span>
                <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">To</span>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={isLoading} max={maxToDate && maxToDate < fmtISO(today) ? maxToDate : fmtISO(today)} className="bg-transparent border-0 outline-none text-sm font-medium text-zinc-800 cursor-pointer focus:ring-0 p-0" data-testid="order-ledger-date-to" />
                </label>
                {draftRangeExceeded && <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">Max 60 days</span>}
              </div>

              {/* Apply */}
              <button onClick={handleApply} disabled={isLoading || !canApply} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${canApply ? 'bg-[#329937] text-white shadow-sm hover:bg-[#287a2d]' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`} data-testid="order-ledger-apply-btn">
                <Check className="w-4 h-4" /> Apply
              </button>

              {/* Preset pill */}
              <div className={`flex items-center gap-1 px-1.5 py-1 bg-zinc-100 rounded-lg ${isLoading ? 'opacity-50' : ''}`} data-testid="order-ledger-presets">
                {['Today','7D','30D','MTD','FY'].map((p) => {
                  const dis = p === 'FY';
                  return (
                    <button key={p} disabled={isLoading || dis} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${dis ? 'text-zinc-300 cursor-not-allowed' : activePreset === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/50 hover:text-zinc-900'}`} data-testid={`order-ledger-preset-${p.toLowerCase()}`} onClick={() => !dis && handlePreset(p)}>
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Download (S5 orange style, hidden on audit tabs) */}
              {!isAnyAudit && (
                <div className="relative" ref={downloadRef}>
                  <button onClick={() => setShowDownloadMenu((v) => !v)} disabled={isLoading || apiOrders.length === 0} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-[#F26B33] text-[#F26B33] hover:bg-orange-50 transition-colors shadow-sm ${isLoading || apiOrders.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} data-testid="order-ledger-download-trigger">
                    <Download className="w-4 h-4" /> Download
                  </button>
                  {showDownloadMenu && (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden" data-testid="order-ledger-download-menu">
                      {DOWNLOAD_MENU.map((item) => (
                        <button key={item.id} disabled={!item.enabled} onClick={() => item.enabled && handleDownloadAction(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${item.enabled ? 'hover:bg-zinc-50 text-zinc-800' : 'text-zinc-400 cursor-not-allowed'}`} data-testid={item.testId}>
                          <item.icon className={`w-4 h-4 ${item.enabled ? 'text-zinc-500' : 'text-zinc-300'}`} />
                          <div className="flex-1">
                            <span className="text-sm font-medium">{item.label}</span>
                            {item.phase && <span className="ml-2 text-[10px] bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded hidden">{item.phase}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* ── Tabs (10 — Audit + Ledger Audit at the end) ────────────── */}
          <div className="px-8 pt-4 bg-white border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto pb-3" data-testid="order-ledger-tabs">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const count = tabCounts[tab.id] || 0;
                const isReconAudit = tab.id === 'audit';
                const isLedgerAudit = tab.id === 'ledgerAudit';
                const reconRed = isReconAudit && count > 0;
                const ledgerRed = isLedgerAudit && count > 0;
                let cls;
                if (isActive) cls = (isReconAudit && reconRed) || (isLedgerAudit && ledgerRed) ? 'bg-red-600 text-white' : (isReconAudit || isLedgerAudit) ? 'bg-green-600 text-white' : 'bg-zinc-900 text-white';
                else cls = (isReconAudit && reconRed) ? 'text-red-600 hover:bg-red-50' : (isLedgerAudit && ledgerRed) ? 'text-red-600 hover:bg-red-50' : (isReconAudit || isLedgerAudit) ? 'text-green-600 hover:bg-green-50' : 'text-zinc-600 hover:bg-zinc-100';
                return (
                  <button key={tab.id} onClick={() => handleTabChange(tab.id)} className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${cls}`} data-testid={`order-ledger-tab-${tab.id}`}>
                    {tab.label} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <ReportLoadingShield isLoading={isLoading} hasLoadedOnce={hasLoadedOnce} error={error} onRetry={refetch}>
            <div className="flex-1 overflow-auto p-8">
              {isAuditTab ? (
                /* ── Audit (Reconciliation) — same logic as Audit Report ── */
                <div data-testid="order-ledger-audit-recon-tab">
                  <div className="flex items-center gap-6 mb-6 p-4 bg-white border border-zinc-200 rounded-xl" data-testid="order-ledger-audit-kpi">
                    <div className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-zinc-400" /><span className="text-sm font-semibold text-zinc-700">Audit · Reconciliation</span></div>
                    <div className="w-px h-6 bg-zinc-200" />
                    <div className="text-center"><p className={`text-2xl font-bold ${auditFlagsCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{auditFlagsCount}</p><p className="text-[10px] text-zinc-500 uppercase tracking-wide">Active Flags</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-red-600">{reconciliation.missingIds.length}</p><p className="text-[10px] text-zinc-500 uppercase tracking-wide">Missing IDs</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-amber-600">{reconciliation.unmatched.length}</p><p className="text-[10px] text-zinc-500 uppercase tracking-wide">Unmatched</p></div>
                  </div>
                  {auditFlagsCount === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl" data-testid="order-ledger-audit-recon-empty">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4"><ShieldAlert className="w-8 h-8 text-emerald-400" /></div>
                      <h3 className="text-lg font-semibold text-emerald-700 mb-1">No reconciliation issues</h3>
                      <p className="text-sm text-zinc-500 max-w-md text-center">No missing order IDs, no unmatched cancellations or zero-value paid orders for {appliedFrom} → {appliedTo}.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reconciliation.missingIds.length > 0 && (
                        <div className="bg-white border border-red-200 rounded-xl p-5" data-testid="order-ledger-audit-missing">
                          <h4 className="text-sm font-semibold text-red-700 mb-2">Missing Order IDs ({reconciliation.missingIds.length})</h4>
                          <p className="text-xs text-zinc-500 mb-3">Gaps in the order-ID sequence for this range. Could indicate deleted records.</p>
                          <div className="flex flex-wrap gap-1.5">
                            {reconciliation.missingIds.slice(0, 100).map((id) => <span key={id} className="px-2 py-0.5 text-xs font-mono bg-red-50 text-red-700 border border-red-200 rounded">#{id}</span>)}
                            {reconciliation.missingIds.length > 100 && <span className="px-2 py-0.5 text-xs text-zinc-500">+{reconciliation.missingIds.length - 100} more</span>}
                          </div>
                        </div>
                      )}
                      {reconciliation.unmatched.length > 0 && (
                        <div className="bg-white border border-amber-200 rounded-xl p-5" data-testid="order-ledger-audit-unmatched">
                          <h4 className="text-sm font-semibold text-amber-700 mb-2">Unmatched Orders ({reconciliation.unmatched.length})</h4>
                          <p className="text-xs text-zinc-500 mb-3">Orders the backend transform marked as <code className="px-1 py-0.5 bg-zinc-100 rounded text-[10px]">status='audit'</code> — couldn't be classified into Settled / Cancelled / Credit / Hold / Merged / Running. Same source Audit Report uses.</p>
                          <div className="space-y-1">
                            {reconciliation.unmatched.map((o) => (
                              <button key={o.orderNumber} onClick={() => setSelectedOrder(o)} className="w-full flex items-center justify-between px-3 py-2 text-xs bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors" data-testid={`order-ledger-unmatched-${o.orderNumber}`}>
                                <span className="font-mono font-medium text-amber-900">#{o.orderNumber}</span>
                                <span className="text-zinc-600">{o.orderDate} {o.orderTime}</span>
                                <span className="text-zinc-600">{statusLabelFor(o)}</span>
                                <span className="font-semibold text-amber-900">{fmtCur(o.totalAmount)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : isLedgerAuditTab ? (
                /* ── Ledger Audit — Block A live (FE-81 / 82 / 83) ────────── */
                <div data-testid="order-ledger-audit-tab">
                  {/* Search by order ID (CR-011-S6-UX-01) — filters row visibility within
                      flag groups; KPI strip + legend counts remain GLOBAL. */}
                  <div className="mb-4 flex items-center gap-2" data-testid="order-ledger-ledgeraudit-searchbar">
                    <div className="relative flex-1 max-w-sm">
                      <input
                        type="text"
                        value={auditSearchOrderId}
                        onChange={(e) => setAuditSearchOrderId(e.target.value)}
                        placeholder="Search by order ID (e.g. 011874 or 1874)"
                        className="w-full px-3 py-2 pr-8 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors"
                        data-testid="ledger-audit-search-order-id"
                        aria-label="Search audit flags by order ID"
                      />
                      {auditSearchOrderId && (
                        <button
                          type="button"
                          onClick={() => setAuditSearchOrderId('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
                          aria-label="Clear search"
                          data-testid="ledger-audit-search-clear"
                        >×</button>
                      )}
                    </div>
                    {auditSearchOrderId && (
                      <span className="text-xs text-zinc-500" data-testid="ledger-audit-search-hint">
                        Filtering rows in groups · KPI totals remain global
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-6 mb-6 p-4 bg-white border border-zinc-200 rounded-xl" data-testid="order-ledger-ledgeraudit-kpi">
                    <div className="flex items-center gap-2"><ShieldAlert className={`w-5 h-5 ${ledgerAudit.counts.ACTIVE > 0 ? 'text-red-500' : 'text-emerald-400'}`} /><span className="text-sm font-semibold text-zinc-700">Ledger Audit</span><span className="text-[10px] text-zinc-400">{ledgerAudit.scanned} scanned · {ledgerAudit.skipped} skipped (FE-85)</span></div>
                    <div className="w-px h-6 bg-zinc-200" />
                    <div className="text-center"><p className={`text-2xl font-bold ${ledgerAudit.counts.ACTIVE > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{ledgerAudit.counts.ACTIVE}</p><p className="text-[10px] text-zinc-500 uppercase tracking-wide">Active Flags</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-red-600">{ledgerAudit.counts.RED || 0}</p><p className="text-[10px] text-zinc-500 uppercase tracking-wide">RED</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-amber-600">{ledgerAudit.counts.AMBER || 0}</p><p className="text-[10px] text-zinc-500 uppercase tracking-wide">AMBER</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-blue-600">{ledgerAudit.counts.REVIEW || 0}</p><p className="text-[10px] text-zinc-500 uppercase tracking-wide">REVIEW</p></div>
                    <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{ledgerAudit.counts.EXEMPT || 0}</p><p className="text-[10px] text-zinc-500 uppercase tracking-wide">EXEMPT</p></div>
                  </div>

                  {/* Rule-by-rule legend */}
                  <div className="mb-4 p-3 bg-zinc-50 border border-zinc-200 rounded-lg" data-testid="order-ledger-ledgeraudit-legend">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Block A · Active Rules (approved 2026-06-03)</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-white border border-red-200 rounded">FE-81 · Cancelled w/ tax · <b className="text-red-700">{ledgerAudit.counts.byRule['FE-81'] || 0}</b></span>
                      <span className="px-2 py-1 bg-white border border-red-200 rounded">FE-82R · SubTotal formula · <b className="text-red-700">{ledgerAudit.counts.byRule['FE-82R'] || 0}</b></span>
                      <span className="px-2 py-1 bg-white border border-red-200 rounded">FE-83 · GST + VAT both · <b className="text-red-700">{ledgerAudit.counts.byRule['FE-83'] || 0}</b></span>
                      <span className="px-2 py-1 bg-white border border-red-200 rounded">FE-86 · Tax rollup · <b className="text-red-700">{ledgerAudit.counts.byRule['FE-86'] || 0}</b></span>
                      <span className="px-2 py-1 bg-white border border-red-200 rounded">FE-88 · Grand Total formula · <b className="text-red-700">{ledgerAudit.counts.byRule['FE-88'] || 0}</b></span>
                      <span className="px-2 py-1 bg-white border border-zinc-200 rounded text-zinc-400">FE-84 · Tolerance ₹0 (policy)</span>
                      <span className="px-2 py-1 bg-white border border-zinc-200 rounded text-zinc-400">FE-85 · Skip-empty (policy)</span>
                      <span className="px-2 py-1 bg-white border border-zinc-200 rounded text-zinc-400" title="Tax is item-level — replaced by FE-82R + FE-86">FE-82 · rejected</span>
                    </div>
                  </div>

                  {ledgerAudit.counts.ACTIVE === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-zinc-200 rounded-xl" data-testid="order-ledger-audit-empty">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4"><ShieldAlert className="w-8 h-8 text-emerald-400" /></div>
                      <h3 className="text-lg font-semibold text-emerald-700 mb-1">No GST audit flags</h3>
                      <p className="text-sm text-zinc-500 max-w-md text-center">All {ledgerAudit.scanned} non-empty orders for {appliedFrom} → {appliedTo} passed Block A rules (FE-81 / 82 / 83).</p>
                    </div>
                  ) : (
                    <div className="space-y-6" data-testid="order-ledger-ledgeraudit-flags">
                      {/* Group flags by rule, sorted: FE-82R → FE-86 → FE-88 → FE-81, within each group by |drift| desc */}
                      {(() => {
                        const RULE_ORDER = ['FE-82R', 'FE-86', 'FE-88', 'FE-89', 'FE-81', 'FE-83'];
                        const RULE_LABELS = { 'FE-82R': 'SubTotal Formula', 'FE-86': 'Tax Rollup', 'FE-88': 'Grand Total Formula', 'FE-89': 'Delivery GST', 'FE-81': 'Cancelled w/ Tax', 'FE-83': 'Both Taxes on Item' };
                        // Apply order-ID search filter (CR-011-S6-UX-01) before grouping.
                        // Substring + leading-zero tolerant + case-insensitive.
                        const rawSearch = (auditSearchOrderId || '').trim();
                        const searchNorm = rawSearch.toLowerCase().replace(/^0+/, '');
                        const orderIdMatches = (f) => {
                          if (!searchNorm) return true;
                          const oid = String(f.orderNumber || '').toLowerCase();
                          const oidStripped = oid.replace(/^0+/, '');
                          return oid.includes(searchNorm) || oidStripped.includes(searchNorm);
                        };
                        const flagsToShow = searchNorm ? ledgerAudit.flags.filter(orderIdMatches) : ledgerAudit.flags;
                        const grouped = {};
                        for (const f of flagsToShow) {
                          if (!grouped[f.ruleId]) grouped[f.ruleId] = [];
                          grouped[f.ruleId].push(f);
                        }
                        // Sort each group by: badge batch → severity (RED→AMBER) → latest order first
                        const TAG_ORDER = { CANCELLED: 0, MERGE: 1, TRANSFER: 1, SPLIT: 2, DELIVERY: 3 };
                        const getTagPriority = (f) => {
                          const t = f.tags || [];
                          if (t.includes('ROUND_OFF')) return 99; // always last
                          let best = 50; // no badge
                          for (const tag of t) { if (TAG_ORDER[tag] !== undefined && TAG_ORDER[tag] < best) best = TAG_ORDER[tag]; }
                          return best;
                        };
                        for (const ruleId of Object.keys(grouped)) {
                          grouped[ruleId].sort((a, b) => {
                            const sevOrder = { RED: 0, AMBER: 1, REVIEW: 2 };
                            const sevDiff = (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9);
                            if (sevDiff !== 0) return sevDiff;
                            const tagDiff = getTagPriority(a) - getTagPriority(b);
                            if (tagDiff !== 0) return tagDiff;
                            const dateA = a.orderRow?.__source?.createdAt || '';
                            const dateB = b.orderRow?.__source?.createdAt || '';
                            return dateB.localeCompare(dateA);
                          });
                        }
                        const TAG_BADGE_STYLES = {
                          CANCELLED: 'bg-red-50 text-red-700 border-red-300',
                          DELIVERY: 'bg-blue-50 text-blue-700 border-blue-300',
                          MERGE: 'bg-purple-50 text-purple-700 border-purple-300',
                          TRANSFER: 'bg-purple-50 text-purple-700 border-purple-300',
                          SPLIT: 'bg-teal-50 text-teal-700 border-teal-300',
                          ROUND_OFF: 'bg-orange-100 text-orange-700 border-orange-300',
                          DELIVERY_GST: 'bg-amber-100 text-amber-700 border-amber-300',
                          DEL_GST_TOTAL: 'bg-amber-100 text-amber-700 border-amber-300',
                          DEL_GST_HEADER: 'bg-red-100 text-red-700 border-red-300',
                        };
                        const TAG_LABELS = { CANCELLED: 'Item Cancelled', DELIVERY: 'Delivery', MERGE: 'Merge', TRANSFER: 'Transfer', SPLIT: 'Split Order', ROUND_OFF: 'Round Off', DELIVERY_GST: 'Delivery GST', DEL_GST_TOTAL: 'Del GST → Total', DEL_GST_HEADER: 'Del GST → Header' };
                        // S5 cross-reference badges (CR-011 S5→S6 investigation 2026-06-04)
                        const S5_OVER_TAXED = new Set(['010591','010595','010596','010735','010736','011507','011509','011512','011846','011877']);
                        const S5_TAX_NOT_COMPUTED = new Set(['010366','010469','011713','011714']);
                        // Critical: orders flagged in BOTH FE-86 + FE-88 (GST rollup + grand total both broken)
                        const S6_CRITICAL = new Set(['010591','010595','010596','010677','010703','010708','010879','010932','010942','011105','011740','011747','011846']);
                        const fc = (v) => v === 0 ? '₹0' : (!v && v !== 0) ? '—' : `₹${(Math.round(v * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        const driftVal = (exp, act) => typeof exp === 'number' && typeof act === 'number' ? Math.round((act - exp) * 100) / 100 : null;

                        // No-results state when search filter yields zero matches across all groups
                        if (searchNorm && flagsToShow.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-12 bg-white border border-zinc-200 rounded-xl" data-testid="ledger-audit-search-empty">
                              <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mb-3">
                                <span className="text-2xl text-zinc-400">⌕</span>
                              </div>
                              <h3 className="text-sm font-semibold text-zinc-700 mb-1">No audit flags match "{rawSearch}"</h3>
                              <p className="text-xs text-zinc-500 max-w-md text-center">
                                Try a different order ID, or clear the search to see all {ledgerAudit.counts.ACTIVE} flags.
                              </p>
                              <button
                                type="button"
                                onClick={() => setAuditSearchOrderId('')}
                                className="mt-3 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                                data-testid="ledger-audit-search-empty-clear"
                              >Clear search</button>
                            </div>
                          );
                        }

                        return RULE_ORDER.filter((r) => grouped[r]?.length > 0).map((ruleId) => {
                          const flags = grouped[ruleId];
                          return (
                            <div key={ruleId} className="bg-white border border-red-200 rounded-xl overflow-hidden" data-testid={`order-ledger-ledgeraudit-group-${ruleId}`}>
                              <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center gap-3">
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-red-200 text-red-900 rounded">{ruleId}</span>
                                <span className="text-sm font-semibold text-red-800">{RULE_LABELS[ruleId] || ruleId}</span>
                                <span className="text-xs text-red-600 font-medium">({flags.length})</span>
                              </div>
                              {ruleId === 'FE-88' && flags.some((f) => (f.tags || []).includes('ROUND_OFF')) && (
                                <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-[10px] text-amber-800">
                                  AMBER rows: backend <code className="bg-amber-100 px-1 rounded">round_up=0</code> but <code className="bg-amber-100 px-1 rounded">order_amount</code> includes rounding. Once backend backfills <code className="bg-amber-100 px-1 rounded">round_up</code> → all AMBER become GREEN automatically (±₹0.02 tolerance).
                                </div>
                              )}
                              {ruleId === 'FE-88' && flags.some((f) => (f.tags || []).includes('DEL_GST_TOTAL')) && (
                                <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-[10px] text-amber-800">
                                  <span className="font-bold">Del GST → Total</span> AMBER rows: delivery GST is inside <code className="bg-amber-100 px-1 rounded">order_amount</code> but not booked in any GST field, so the total drifts by exactly <code className="bg-amber-100 px-1 rounded">deliveryCharge × 5%</code>. Self-heals to GREEN once backend books the delivery GST (±₹0.02 tolerance).
                                </div>
                              )}
                              {ruleId === 'FE-86' && flags.some((f) => (f.tags || []).includes('DEL_GST_HEADER')) && (
                                <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-[10px] text-red-800">
                                  <span className="font-bold">Note (legacy tag):</span> rows tagged <code className="bg-red-100 px-1 rounded">DEL_GST_HEADER</code> shouldn't appear anymore — header carrying delivery GST is the accepted API contract (per owner 2026-06-04 PM). If you see this banner, an order legitimately broke the rollup beyond delivery-GST inclusion.
                                </div>
                              )}
                              {ruleId === 'FE-89' && (
                                <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-[10px] text-amber-800">
                                  AMBER rows: restaurant profile sets <code className="bg-amber-100 px-1 rounded">deliver_charge_gst</code> (e.g. 5%) but backend booked <code className="bg-amber-100 px-1 rounded">delivery_charge_gst = 0</code> on delivery orders. <b>Del. GST (API)</b> and <b>Exp. Del. GST</b> should match — once backend backfills the field → all AMBER become GREEN automatically (±₹0.02 tolerance).
                                </div>
                              )}
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-[#FFF8F0]">
                                      <th className="px-3 py-2.5 text-left font-semibold text-[#F26B33] whitespace-nowrap">Order</th>
                                      <th className="px-3 py-2.5 text-left font-semibold text-[#F26B33] whitespace-nowrap">Date</th>
                                      <th className="px-3 py-2.5 text-left font-semibold text-[#F26B33] whitespace-nowrap">Payment</th>
                                      <th className="px-3 py-2.5 text-left font-semibold text-[#F26B33] whitespace-nowrap">Order Type</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Items</th>
                                      <th className="px-3 py-2.5 text-left font-semibold text-[#F26B33] whitespace-nowrap">Items Ordered</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Item Total</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Discount</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Delivery</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Del. GST (API)</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Exp. Del. GST</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Del. GST Drift</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Service</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Tip</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">SubTotal</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Exp. SubTotal</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">ST Drift</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">GST</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Exp. GST</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">GST Drift</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Round Off</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Total</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Exp. Total</th>
                                      <th className="px-3 py-2.5 text-right font-semibold text-[#F26B33] whitespace-nowrap">Total Drift</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {flags.map((f, i) => {
                                      const row = f.orderRow || {};
                                      const src = row.__source || {};
                                      const subTotal = Number(row.subTotal) || 0;
                                      const gst = Number(row.gstAmount) || 0;
                                      const vat = Number(row.vatAmount) || 0;
                                      const total = Number(row.totalAmount) || 0;
                                      const itemCount = row.itemCount || (src.items || []).length || 0;
                                      const itemsOrdered = row.orderDetails || (src.items || []).map((it) => `${it.name || 'Item'} (${it.quantity || 1})`).join(', ') || '—';
                                      const itemTotal = Number(row.itemTotal) || 0;
                                      const discount = Number(row.discount) || 0;
                                      const delivery = Number(row.deliveryCharge) || 0;
                                      const service = Number(row.serviceCharge) || 0;
                                      const tip = Number(row.tipAmount) || 0;
                                      const delGst = Number(row.deliveryChargeGst) || 0;

                                      // Compute expected values per rule
                                      let expST = null, expGST = null, expTotal = null, expDelGst = null;
                                      if (ruleId === 'FE-82R') expST = typeof f.expected === 'number' ? f.expected : null;
                                      if (ruleId === 'FE-86') {
                                        // Policy 2026-06-04 PM: expected header GST = food GST + delivery GST.
                                        // Surface the breakdown in two columns: Exp. GST (food) + Exp. Del. GST.
                                        expGST = typeof f.expFoodGstComponent === 'number' ? f.expFoodGstComponent : (typeof f.expected === 'number' ? f.expected : null);
                                        if (typeof f.expDelGstComponent === 'number' && f.expDelGstComponent > 0) expDelGst = f.expDelGstComponent;
                                      }
                                      if (ruleId === 'FE-81') expGST = typeof f.expected === 'number' ? f.expected : null;
                                      if (ruleId === 'FE-88') expTotal = typeof f.expected === 'number' ? f.expected : null;
                                      if (ruleId === 'FE-89') expDelGst = typeof f.expected === 'number' ? f.expected : null;

                                      const stDrift = expST !== null ? driftVal(expST, subTotal) : null;
                                      // FE-86 drift = header − (food GST + delivery GST). Other rules: drift = actual − expected.
                                      const gstActual = gst > 0 ? gst : vat;
                                      const fe86ExpectedTotal = Math.round(((expGST || 0) + (expDelGst || 0)) * 100) / 100;
                                      const gstDrift = ruleId === 'FE-86' && expGST !== null
                                        ? driftVal(fe86ExpectedTotal, gstActual)
                                        : (expGST !== null ? driftVal(expGST, gstActual) : null);
                                      const totalDrift = expTotal !== null ? driftVal(expTotal, total) : null;
                                      const delGstDrift = expDelGst !== null ? driftVal(expDelGst, delGst) : null;

                                      return (
                                        <tr key={`${f.orderNumber}-${f.ruleId}-${i}`} onClick={() => setSelectedOrder(row)} className={`border-b cursor-pointer transition-colors ${f.severity === 'AMBER' ? 'border-amber-100 bg-amber-50/40 hover:bg-amber-100/60' : 'border-red-100 bg-red-50/40 hover:bg-red-100/60'}`} data-testid={`order-ledger-ledgeraudit-flag-${f.orderNumber}-${f.ruleId}`}>
                                          <td className={`px-3 py-2 font-mono font-medium whitespace-nowrap ${f.severity === 'AMBER' ? 'text-amber-900' : 'text-red-900'}`}>#{f.orderNumber} <span className={`ml-1 text-[8px] px-1 py-0.5 rounded font-bold ${f.severity === 'AMBER' ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'}`}>{f.severity}</span>{(f.tags || []).map((t) => <span key={t} className={`ml-1 text-[8px] px-1 py-0.5 rounded font-bold border ${TAG_BADGE_STYLES[t] || 'bg-zinc-100 text-zinc-600 border-zinc-300'}`}>{TAG_LABELS[t] || t}</span>)}{S5_OVER_TAXED.has(String(f.orderNumber)) && <span className="ml-1 text-[8px] px-1 py-0.5 rounded font-bold border bg-red-100 text-red-700 border-red-300">Over Taxed</span>}{S5_TAX_NOT_COMPUTED.has(String(f.orderNumber)) && <span className="ml-1 text-[8px] px-1 py-0.5 rounded font-bold border bg-amber-100 text-amber-700 border-amber-300">Tax Not Computed</span>}{S6_CRITICAL.has(String(f.orderNumber)) && <span className="ml-1 text-[8px] px-1.5 py-0.5 rounded font-bold border bg-red-600 text-white border-red-700">Critical</span>}</td>
                                          <td className="px-3 py-2 text-zinc-700 whitespace-nowrap">{row.orderDate || '—'}</td>
                                          <td className="px-3 py-2 text-zinc-700 whitespace-nowrap">{row.paymentType || row.paymentMethod || '—'}</td>
                                          <td className="px-3 py-2 text-zinc-700 whitespace-nowrap">{row.orderType || src.channel || src.orderType || '—'}</td>
                                          <td className="px-3 py-2 text-right text-zinc-700 tabular-nums">{itemCount || '—'}</td>
                                          <td className="px-3 py-2 text-zinc-600 max-w-[200px] truncate" title={itemsOrdered}>{itemsOrdered}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fc(itemTotal)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fc(discount)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fc(delivery)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fc(delGst)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{expDelGst !== null ? fc(expDelGst) : <span className="text-zinc-300">—</span>}</td>
                                          <td className="px-3 py-2 text-right tabular-nums font-bold">{delGstDrift !== null ? <span className={f.severity === 'AMBER' ? 'text-amber-600' : 'text-red-600'}>{delGstDrift > 0 ? '+' : ''}{fc(delGstDrift)}</span> : <span className="text-zinc-300">—</span>}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fc(service)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fc(tip)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fc(subTotal)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{expST !== null ? fc(expST) : <span className="text-zinc-300">—</span>}</td>
                                          <td className="px-3 py-2 text-right tabular-nums font-bold">{stDrift !== null ? <span className={f.severity === 'AMBER' ? 'text-amber-600' : 'text-red-600'}>{stDrift > 0 ? '+' : ''}{fc(stDrift)}</span> : <span className="text-zinc-300">—</span>}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fc(gst > 0 ? gst : vat)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{expGST !== null ? fc(expGST) : <span className="text-zinc-300">—</span>}</td>
                                          <td className="px-3 py-2 text-right tabular-nums font-bold">{gstDrift !== null ? <span className={f.severity === 'AMBER' ? 'text-amber-600' : 'text-red-600'}>{gstDrift > 0 ? '+' : ''}{fc(gstDrift)}</span> : <span className="text-zinc-300">—</span>}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fc(Number(row.roundOff) || 0)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{fc(total)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums text-zinc-800">{expTotal !== null ? fc(expTotal) : <span className="text-zinc-300">—</span>}</td>
                                          <td className="px-3 py-2 text-right tabular-nums font-bold">{totalDrift !== null ? <span className={f.severity === 'AMBER' ? 'text-amber-600' : 'text-red-600'}>{totalDrift > 0 ? '+' : ''}{fc(totalDrift)}</span> : <span className="text-zinc-300">—</span>}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                /* ── Orders View ─────────────────────────────────────── */
                <>
                  <div className="mb-4">
                    <FilterBar filters={filters} onFilterChange={(k,v) => setFilters((p) => ({ ...p, [k]: v }))} onClearAll={() => setFilters({ status: null, paymentMethod: null, paymentType: null, channel: null, platform: null, paymentGateway: null })} breakdown={null} summary={summary} missingCount={0} activeTab={activeTab} hasPlatformData={apiOrders.some((o) => o.razorpayOrderId)} />
                  </div>
                  <FilterTags filters={filters} onRemove={(k) => setFilters((p) => ({ ...p, [k]: null }))} onClearAll={() => setFilters({ status: null, paymentMethod: null, paymentType: null, channel: null, platform: null, paymentGateway: null })} />

                  {/* Bill-totals KPI tiles — 8 pills: Item Total | Delivery | SC+Tips | Discount | Sub Total | Tax | Round Off | Total */}
                  <div className="grid grid-cols-8 gap-1.5 my-4" data-testid="order-ledger-bill-totals">
                    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Item Total</p>
                      <p className="text-base font-bold text-zinc-900 tabular-nums" data-testid="order-ledger-billtotal-itemTotal">{fmtCur(billTotals.itemTotal)}</p>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg px-2.5 py-2.5">
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">Delivery</p>
                      <p className="text-sm font-bold text-zinc-700 tabular-nums" data-testid="order-ledger-billtotal-delivery">{fmtCur(billTotals.delivery)}</p>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg px-2.5 py-2.5">
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">SC + Tips</p>
                      <p className="text-sm font-bold text-zinc-700 tabular-nums" data-testid="order-ledger-billtotal-scTips">{fmtCur(billTotals.scTips)}</p>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg px-2.5 py-2.5">
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">Discount</p>
                      <p className="text-sm font-bold text-zinc-700 tabular-nums" data-testid="order-ledger-billtotal-discount">{fmtCur(billTotals.discount)}</p>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg px-2.5 py-2.5">
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">Sub Total</p>
                      <p className="text-sm font-bold text-zinc-700 tabular-nums" data-testid="order-ledger-billtotal-subTotal">{fmtCur(billTotals.subTotal)}</p>
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">{billTotals.hasVat ? 'Tax (GST + VAT)' : 'Tax (GST)'}</p>
                      <p className="text-base font-bold text-zinc-900 tabular-nums" data-testid="order-ledger-billtotal-tax">{fmtCur(billTotals.tax)}</p>
                      {billTotals.hasVat && (
                        <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-zinc-100">
                          <span className="text-[9px] text-zinc-400 tabular-nums" data-testid="order-ledger-billtotal-gst-split">GST {fmtCur(billTotals.gst)}</span>
                          <span className="text-[9px] text-zinc-400 tabular-nums" data-testid="order-ledger-billtotal-vat-split">VAT {fmtCur(billTotals.vat)}</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-white border border-zinc-200 rounded-lg px-2.5 py-2.5">
                      <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">Round Off</p>
                      <p className="text-sm font-bold text-zinc-700 tabular-nums" data-testid="order-ledger-billtotal-roundOff">{fmtCur(billTotals.roundOff)}</p>
                    </div>
                    <div className="bg-white border border-[#F26B33]/30 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-[#F26B33] uppercase tracking-wider font-semibold">Total</p>
                      <p className="text-base font-bold text-[#F26B33] tabular-nums" data-testid="order-ledger-billtotal-total">{fmtCur(billTotals.total)}</p>
                    </div>
                  </div>

                  {/* Search + Columns chooser + count */}
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 rounded-lg bg-white w-64">
                      <Search className="w-4 h-4 text-zinc-400" />
                      <input type="text" placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-0 outline-none text-sm text-zinc-800 placeholder:text-zinc-400 w-full focus:ring-0 p-0" data-testid="order-ledger-search" />
                      {searchQuery && <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-zinc-100 rounded"><X className="w-3 h-3 text-zinc-400" /></button>}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Columns chooser */}
                      <div className="relative" ref={colRef}>
                        <button onClick={() => setShowColMenu((v) => !v)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors text-sm font-medium" data-testid="order-ledger-columns-trigger">
                          <Columns3 className="w-4 h-4" /> Columns <span className="text-xs text-zinc-400">{visibleCols.size}/{COLUMNS.length}</span>
                        </button>
                        {showColMenu && (
                          <div className="absolute right-0 top-full mt-1 w-[380px] max-h-[520px] overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-lg z-50" data-testid="order-ledger-columns-menu">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 sticky top-0 bg-white">
                              <span className="text-sm font-semibold text-zinc-800">Choose columns</span>
                              <div className="flex items-center gap-2">
                                <button onClick={resetCols} className="text-[11px] text-[#F26B33] hover:underline" data-testid="order-ledger-columns-reset">Reset</button>
                                <button onClick={showAllCols} className="text-[11px] text-zinc-500 hover:underline" data-testid="order-ledger-columns-show-all">Show all</button>
                                <button onClick={hideAllCols} className="text-[11px] text-zinc-500 hover:underline" data-testid="order-ledger-columns-hide-all">Hide all</button>
                              </div>
                            </div>
                            <div className="p-2">
                              {Object.entries(colGroups).map(([group, cols]) => (
                                <div key={group} className="mb-2">
                                  <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{group}</div>
                                  {cols.map((c) => (
                                    <label key={c.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 rounded cursor-pointer">
                                      <input type="checkbox" checked={visibleCols.has(c.key)} onChange={() => toggleCol(c.key)} disabled={c.key === 'orderNumber'} className="rounded border-zinc-300 text-[#F26B33] focus:ring-[#F26B33]" data-testid={`order-ledger-col-toggle-${c.key}`} />
                                      <span className={`text-xs ${c.key === 'orderNumber' ? 'text-zinc-400' : 'text-zinc-700'}`}>{c.label}</span>
                                    </label>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400" data-testid="order-ledger-footer-meta">
                        {sortedOrders.length} of {apiOrders.length} orders · {appliedFrom} → {appliedTo}
                      </span>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="bg-white border border-zinc-200 rounded-sm overflow-hidden">
                    <div className="overflow-x-auto" data-testid="order-ledger-table-container">
                      <table className="w-max min-w-full" data-testid="order-ledger-table">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-zinc-50 border-b border-zinc-200">
                            {visibleColList.map((col) => (
                              <th key={col.key} className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 ${col.sortable ? 'cursor-pointer select-none hover:text-zinc-700' : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`} onClick={() => col.sortable && handleSort(col.key)} data-testid={`order-ledger-col-${col.key}`}>
                                <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                                  {col.label}
                                  {col.sortable && <SortIcon col={col.key} />}
                                </div>
                              </th>
                            ))}
                          </tr>
                          {columnTotals && (
                            <tr className="bg-[#F26B33]/5 border-b-2 border-[#F26B33]/30 sticky top-[34px]" data-testid="order-ledger-totals-row">
                              {visibleColList.map((col) => {
                                const v = columnTotals[col.key];
                                const isCurrency = col.align === 'right';
                                const text = v === null || v === undefined ? (col.key === 'orderNumber' ? 'Σ TOTALS' : '—') : isCurrency ? fmtCur(v) : String(v);
                                return (
                                  <td key={col.key} className={`px-3 py-1.5 text-[11px] font-bold tabular-nums ${col.align === 'right' ? 'text-right text-[#F26B33]' : col.align === 'center' ? 'text-center text-[#F26B33]' : col.key === 'orderNumber' ? 'text-left text-[#F26B33] uppercase tracking-wider' : 'text-left text-zinc-300'}`} data-testid={`order-ledger-total-${col.key}`}>
                                    {text}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {sortedOrders.map((order, idx) => (
                            <tr key={order.orderNumber || idx} className={`border-b border-zinc-100 transition-colors cursor-pointer ${selectedOrder?.orderNumber === order.orderNumber ? 'bg-[#F26B33]/5 border-l-2 border-l-[#F26B33]' : 'hover:bg-zinc-50'}`} onClick={() => setSelectedOrder(order)} data-testid={`order-ledger-row-${order.orderNumber}`}>
                              {visibleColList.map((col) => (
                                <td key={col.key} className={`px-3 py-2 text-xs ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.key === 'orderNumber' ? 'font-medium text-[#F26B33]' : col.key === 'totalAmount' ? 'font-semibold text-zinc-900' : col.key === 'orderDetails' ? 'text-zinc-600 truncate max-w-[250px]' : 'text-zinc-600'}`} title={col.key === 'orderDetails' ? order.orderDetails : undefined}>
                                  {col.key === 'orderNumber' ? `#${order.orderNumber}` : cellVal(order, col)}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {sortedOrders.length === 0 && !isLoading && (
                            <tr><td colSpan={visibleColList.length} className="py-20 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center"><FileText className="w-6 h-6 text-zinc-300" /></div>
                                <p className="text-sm font-medium text-zinc-500">{apiOrders.length === 0 ? `No orders for ${appliedFrom} → ${appliedTo}. Try a different range.` : 'No orders in this tab for the selected filters.'}</p>
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
        </main>

        <OrderDetailSheet
          isOpen={!!selectedOrder && !isAnyAudit}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder?.__source || null}
          tabId={activeTab}
        />
      </div>
    </div>
  );
};

export default OrderLedgerMockup;
