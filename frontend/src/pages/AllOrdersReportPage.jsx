import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import DatePicker from "../components/reports/DatePicker";
import OrderTable from "../components/reports/OrderTable";
import FilterBar from "../components/reports/FilterBar";
import FilterTags from "../components/reports/FilterTags";
import OrderDetailSheet from "../components/reports/OrderDetailSheet";
import ExportButtons from "../components/reports/ExportButtons";
import { getOrderLogsReport, getActiveSrmIds } from "../api/services/reportService";
import { getRunningOrders, printOrder } from "../api/services/orderService";
import { changeOrderPaymentMethod, makeOrderUnpaid } from "../api/services/paymentMutationService";
import { calculateSummary } from "../api/transforms/reportTransform";
import { fromAPI as orderFromAPI } from "../api/transforms/orderTransform";
import api from "../api/axios";
import { API_ENDPOINTS } from "../api/constants";
import { useRestaurant } from "../contexts";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import { getBusinessDayRange, isWithinBusinessDay, isMutationAllowedForSelectedDate } from "../utils/businessDay";
import MarkUnpaidConfirmDialog from "../components/reports/MarkUnpaidConfirmDialog";
import CollectBillPanelDrawer from "../components/reports/CollectBillPanelDrawer";

/**
 * AllOrdersReportPage — ALL Orders Report using order-logs-report endpoint
 * Uses single API endpoint with order_in, table_id, parent_order_id fields
 * CR-001: Tabs: All | Paid | Cancelled | Credit | On Hold | Merged | Running | Aggregator | Audit
 *  - Transferred tab REMOVED (CS-19)
 *  - Room orders globally excluded (CS-16..CS-22) — see `EXCLUDE_ROOM_ORDER` predicate
 *  - Audit tab now includes both missing placeholders AND real `status === 'audit'` rows (CS-4, EC-7)
 *  - Unpaid tab excludes paylater / fOrderStatus === 9 (CS-3)
 */

// CR-001 CS-16..CS-22: Globally exclude room orders BEFORE tab filtering,
// counts, and statusBreakdown — they live on the Room Orders Report
// (CR-004), not here. NOTE: gap detection uses the FULL list (including
// rooms) so that room IDs are NOT flagged as "missing" placeholders —
// see fetchOrders for the split.
// CR-029 (GO-2, 2026-06-11): room exclusion REMOVED — room food included
// everywhere (owner rulings H6/H6-c/Q3-val). Predicate deleted; room rows
// flow through TAB_FILTERS which classify all room stages correctly.

// Tab configuration for ALL Orders Report (Audit tab added dynamically based on missing count)
// CR-001 CS-19: `transferred` tab removed.
// CR-001 follow-up: 'unpaid' tab renamed to 'running' and widened to include
// both real running rows (status === 'running') and unpaid rows
// (paymentStatus === 'unpaid'). Both states share the operational meaning
// "money not yet collected", so they live in a single tab. Status badges
// remain distinct (yellow RUNNING vs amber Unpaid).
const ALL_ORDERS_TABS = [
  { id: 'all', label: 'All Orders', color: 'zinc' },
  { id: 'paid', label: 'Settled', color: 'blue' },
  { id: 'cancelled', label: 'Cancelled', color: 'red' },
  { id: 'credit', label: 'Added to Credit', color: 'purple' },
  { id: 'hold', label: 'On Hold', color: 'orange' },
  { id: 'merged', label: 'Merged', color: 'teal' },
  { id: 'running', label: 'Running', color: 'yellow' },
  { id: 'aggregator', label: 'Aggregator', color: 'amber' },
  { id: 'audit', label: 'Audit', color: 'green' }, // Color is dynamic: red if (missing + unmatched) > 0, green otherwise
];

// Filter functions for each tab - MUTUALLY EXCLUSIVE (priority-based)
// CR-001: Operates on the post-room-exclusion list. Room rows are stripped
// upstream (see `fetchOrders`), so per-filter `RM`/`SRM`/`ROOM` guards
// previously needed in `paid` are no longer required here.
const TAB_FILTERS = {
  all: () => true,
  paid: (o) => {
    // Exclude special categories first
    if (o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled') return false;
    if (o.paymentMethod === 'Merge' || o.paymentStatus === 'Merge') return false;
    if (o.paymentMethod === 'TAB') return false;
    if (o.paymentStatus === 'unpaid') return false;
    // CR-001 CS-1: paylater / fOrderStatus === 9 belong in Hold, not Paid.
    if (o.paymentMethod?.toLowerCase() === 'paylater') return false;
    if (o.fOrderStatus === 9) return false;
    // CR-001 Phase 2: transferToRoom orders move to Running tab. Money is
    // routed to the room folio, not yet collected at the restaurant — so
    // they don't belong under Paid revenue.
    if (o.paymentMethod?.toLowerCase() === 'transfertoroom') return false;
    // Include paid orders (f_order_status = 6)
    return o.fOrderStatus === 6;
  },
  cancelled: (o) => o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled',
  credit: (o) => o.paymentMethod === 'TAB',
  // CR-001 CS-1 + POS2-005: Hold matches paylater payment method OR
  // fOrderStatus === 9 OR fOrderStatus === 8 (POS2-005 reroute — status-8
  // is now Hold-classified instead of Running).
  hold: (o) =>
    o.paymentMethod?.toLowerCase() === 'paylater' ||
    o.fOrderStatus === 9 ||
    o.fOrderStatus === 8,
  merged: (o) => o.paymentMethod === 'Merge' || o.paymentStatus === 'Merge',
  // CR-001 CS-3 + follow-up: Renamed from `unpaid` → `running`. The tab now
  // includes BOTH:
  //   - real running rows (status === 'running'), i.e. open / in-progress
  //     orders where the bill has not been generated yet,
  //   - unpaid rows (paymentStatus === 'unpaid'), i.e. bill generated but
  //     payment not collected, AND
  //   - CR-001 Phase 2: transferToRoom rows (money routed to a room folio,
  //     not collected at the restaurant yet).
  // All three share the operational meaning "money not yet collected".
  // Paylater / fOrderStatus === 9 still belong in Hold (not Running).
  // POS2-005: fOrderStatus === 8 is now Hold-classified, no longer running.
  // Cancelled and Merged take precedence and are excluded.
  running: (o) => {
    if (o.paymentMethod === 'Cancel' || o.paymentMethod?.toLowerCase() === 'cancelled') return false;
    if (o.paymentMethod === 'Merge' || o.paymentStatus === 'Merge') return false;
    if (o.paymentMethod?.toLowerCase() === 'paylater') return false;
    if (o.fOrderStatus === 9) return false;
    if (o.fOrderStatus === 8) return false;   // POS2-005: status-8 is Hold, not Running
    return (
      o.status === 'running' ||
      o.paymentStatus === 'unpaid' ||
      o.paymentMethod?.toLowerCase() === 'transfertoroom'
    );
  },
  aggregator: (o) => ['zomato', 'swiggy'].includes(o.orderIn?.toLowerCase()),
  // CR-001 CS-4 + EC-7: Audit tab also includes real rows whose derived status
  // is 'audit' (the new fallback). Missing-ID placeholders are handled in the
  // page's useEffect — both contribute to the Audit tab count.
  audit: (o) => o._isMissing === true || o.status === 'audit',
};

const AllOrdersReportPage = () => {
  const navigate = useNavigate();
  const { restaurant, paymentTypes: restaurantPaymentTypes, printerAgents } = useRestaurant();
  const { hasPermission, permissions, user } = useAuth();
  const { toast } = useToast();
  const schedules = useMemo(() => restaurant?.schedules || [], [restaurant?.schedules]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);

  // CR-003 diagnostic — once-per-mount log of the logged-in user's
  // permissions so we can confirm whether `update_payment` /
  // `order_unpaid` are present on the Owner role on preprod. Remove or
  // gate behind a debug flag once confirmed.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[CR-003 DIAGNOSTIC] Logged-in user/permissions:', {
      user_id: user?.id,
      role: user?.roleName,
      permissions,
      has_update_payment: hasPermission?.('update_payment') ?? false,
      has_order_unpaid: hasPermission?.('order_unpaid') ?? false,
    });
  }, [user?.id, user?.roleName, permissions, hasPermission]);
  
  // Report state
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  
  // Data state - all orders from single API call
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [runningOrdersMap, setRunningOrdersMap] = useState({});
  const [missingOrdersList, setMissingOrdersList] = useState([]); // List of missing order IDs
  const [summary, setSummary] = useState({ totalOrders: 0, totalAmount: 0, avgOrderValue: 0 });
  const [tabCounts, setTabCounts] = useState({});
  const [statusBreakdown, setStatusBreakdown] = useState(null);
  const [missingCount, setMissingCount] = useState(0);
  const [runningCount, setRunningCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter state
  // CR-001: filter shape extended with `platform` (was previously declared in
  // resets but never persisted as a key) and `paymentGateway` (new tri-state:
  // null = All, 'gateway' = with razorpay_order_id, 'nonGateway' = without).
  const [filters, setFilters] = useState({
    status: null,
    paymentMethod: null,
    channel: null,
    platform: null,
    paymentGateway: null,
  });

  // CR-001 Q-F: Platform filter is hidden entirely if backend `order_from` is
  // not consistently present on the response. We expose this flag to FilterBar
  // by detecting any non-null platform value in the post-room-exclusion list.
  const [hasPlatformData, setHasPlatformData] = useState(false);
  
  // Side sheet state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // CR-003 — Row-level mutation state.
  //   `paymentMethodOverrides` holds per-order optimistic payment-method
  //     overrides applied on top of `allOrders`. Cleared on successful
  //     refetch (and per-row on error rollback).
  //   `pendingChangeMethodIds` is a Set<orderId> of in-flight Change-Method
  //     calls — used by the picker trigger to render a spinner and lock the
  //     button until the request settles.
  //   `markUnpaidTarget`        order currently shown in the confirm dialog
  //                             (null when dialog is closed).
  //   `markUnpaidPending`       true while Endpoint B is in flight; locks
  //                             the dialog buttons and the row's Unpaid pill.
  //   `optimisticUnpaidIds`     Set<orderId> of paid rows that have been
  //                             optimistically removed from the Paid tab
  //                             pending API confirmation. Restored on error.
  const [paymentMethodOverrides, setPaymentMethodOverrides] = useState({});
  const [pendingChangeMethodIds, setPendingChangeMethodIds] = useState(() => new Set());
  const [markUnpaidTarget, setMarkUnpaidTarget] = useState(null);
  const [markUnpaidPending, setMarkUnpaidPending] = useState(false);
  const [optimisticUnpaidIds, setOptimisticUnpaidIds] = useState(() => new Set());
  // CR-003 Phase 3.6 — Collect-Bill (Hold tab) state.
  //   `collectBillTarget`     held-row order open in the modal (null when closed).
  //   `collectBillPending`    true while BILL_PAYMENT is in flight; locks the
  //                           Collect button + suppresses ESC/overlay close.
  //   `optimisticCollectedIds` Set<orderId> of held rows already optimistically
  //                            removed from the Hold tab pending API success.
  const [collectBillTarget, setCollectBillTarget] = useState(null);
  const [collectBillPending, setCollectBillPending] = useState(false);
  const [optimisticCollectedIds, setOptimisticCollectedIds] = useState(() => new Set());

  // Fetch all orders from order-logs-report endpoint
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // CR-001 Bucket D-1 — fetch the active-SRM index in parallel with
      // /order-logs-report so the per-row override can distinguish "still
      // running because parent room is in-house" from "settled long ago".
      // See `getActiveSrmIds` for the rationale and live-data evidence.
      const [activeSrmIds, runningOrders] = await Promise.all([
        getActiveSrmIds(),
        getRunningOrders().catch(() => []),
      ]);

      const data = await getOrderLogsReport(
        selectedDate,
        schedules,
        'created_at',
        activeSrmIds
      );
      
      // CR-001 Phase 2 — G4 corrected architecture (supersedes the earlier
      // "include rooms in display" attempt). Two distinct lists are derived
      // from the API payload:
      //
      //   fullOrders     — every row from /order-logs-report (incl. rooms).
      //                    Used ONLY for gap detection so that room order
      //                    IDs are seen as "real" rows, NOT flagged as
      //                    missing placeholders in the Audit tab.
      //   nonRoomOrders  — fullOrders minus RM / SRM / payment_method 'ROOM'.
      //                    Used for everything operator-facing: tab
      //                    filtering, tab counts, statusBreakdown,
      //                    exports, the visible row list. Per CR-001
      //                    CS-16..CS-22 room orders belong to /reports/rooms
      //                    only and do not render here.
      //
      // CR-003 row-action eligibility (Mark-Unpaid / Change-Method /
      // Collect-Bill) already excludes RM/SRM/ROOM rows in OrderTable's
      // `isOrderEligibleForRowActions`, so even if a stray room row leaks
      // through it gets no action pills.
      const fullOrders = data.orders || [];
      // CR-029 (GO-2, 2026-06-11): room stripping REMOVED — room food rows now
      // flow into all operator-facing tabs (owner rulings H6/H6-c). Q3-val matrix
      // confirmed existing TAB_FILTERS classify every room stage correctly.
      const nonRoomOrders = fullOrders;

      // Detect platform-data presence on the operator-facing list (Q-F).
      // Render the Platform filter only when at least one row carries a
      // non-null platform value.
      setHasPlatformData(nonRoomOrders.some((o) => o.platform));

      // The downstream filter useEffect operates on `allOrders`. Storing
      // the room-excluded list ensures every consumer (tab filtering,
      // summary, statusBreakdown, exports) sees the same room-free dataset.
      setAllOrders(nonRoomOrders);

      // CR-003 — Authoritative data has arrived; drop optimistic
      // payment-method overrides so the UI reflects the server state.
      setPaymentMethodOverrides({});
      // CR-003 Phase 3.5 — Drop optimistic unpaid-removal markers; the
      // refetched list either no longer contains the flipped order (because
      // backend removed it from the paid set) or, on a server failure that
      // somehow let it stay paid, we want to surface the real state again.
      setOptimisticUnpaidIds(new Set());
      // CR-003 Phase 3.6 — Same idea for Collect-Bill optimistic removal:
      // drop the markers; either the refetched list moved the row from
      // Hold → Paid (success) or kept it in Hold (server-side error path).
      setOptimisticCollectedIds(new Set());
      
      // Filter running orders by business day and build lookup map
      const { start, end } = getBusinessDayRange(selectedDate, schedules);
      const runningFiltered = runningOrders.filter(order => {
        if (!order.createdAt) return false;
        const ca = order.createdAt.replace('T', ' ').substring(0, 19);
        return isWithinBusinessDay(ca, start, end);
      });
      
      // Build running orders map by order number (numeric part)
      const runningMap = {};
      runningFiltered.forEach(o => {
        const numericId = String(o.orderNumber || '').replace(/\D/g, '');
        if (numericId) runningMap[numericId] = o;
      });
      setRunningOrdersMap(runningMap);
      
      // Calculate tab counts from the room-excluded dataset (CR-001
      // CS-22) — operator-facing.
      const counts = {};
      ALL_ORDERS_TABS.forEach(tab => {
        const filterFn = TAB_FILTERS[tab.id];
        if (tab.id === 'audit') {
          // Audit tab count is finalized after gap detection (missing + unmatched).
          counts[tab.id] = 0;
        } else {
          counts[tab.id] = filterFn ? nonRoomOrders.filter(filterFn).length : 0;
        }
      });

      // Calculate gap detection on the FULL dataset (CR-001 Phase 2 G4
      // correction). Including rooms here means their order IDs are seen
      // as real rows, NOT flagged as missing — even though those rooms
      // are themselves never rendered in this report.
      const missingIds = [];
      let computedMissing = 0;
      let computedRunning = 0;
      if (fullOrders.length >= 2) {
        const sortedByIdDesc = [...fullOrders].sort((a, b) => {
          const aId = parseInt(String(a.orderId || a.id).replace(/\D/g, '')) || 0;
          const bId = parseInt(String(b.orderId || b.id).replace(/\D/g, '')) || 0;
          return bId - aId;
        });

        for (let i = 0; i < sortedByIdDesc.length - 1; i++) {
          const currentId = parseInt(String(sortedByIdDesc[i].orderId || sortedByIdDesc[i].id).replace(/\D/g, '')) || 0;
          const nextId = parseInt(String(sortedByIdDesc[i + 1].orderId || sortedByIdDesc[i + 1].id).replace(/\D/g, '')) || 0;
          const gap = currentId - nextId;
          if (gap > 1 && gap <= 100) {
            for (let missingId = currentId - 1; missingId > nextId; missingId--) {
              if (runningMap[String(missingId)]) {
                computedRunning++;
              } else {
                computedMissing++;
                // Get the format from existing order IDs
                const sampleId = sortedByIdDesc[i].orderId || sortedByIdDesc[i].id;
                const padding = sampleId.length;
                missingIds.push(String(missingId).padStart(padding, '0'));
              }
            }
          }
        }
      }
      setMissingCount(computedMissing);
      setRunningCount(computedRunning);
      setMissingOrdersList(missingIds);

      // CR-001 CS-5: Audit count = missing placeholders + unmatched real
      // rows (status === 'audit'). All Orders count = visible rows + missing.
      // Both use the room-excluded list because they're operator-facing.
      const unmatchedAuditCount = nonRoomOrders.filter((o) => o.status === 'audit').length;
      counts['audit'] = computedMissing + unmatchedAuditCount;
      counts['all'] = nonRoomOrders.length + computedMissing;

      setTabCounts(counts);
      
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.readableMessage);
      setAllOrders([]);
      setHasPlatformData(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, schedules]);

  // Filter orders based on active tab and filters
  useEffect(() => {
    // CR-001 CS-4 + EC-7: Audit tab merges missing-ID placeholders with real
    // unmatched rows (status === 'audit'). The placeholder rows feed the gap
    // detection summary; the real rows are drillable via OrderDetailSheet.
    if (activeTab === 'audit') {
      const missingOrderPlaceholders = missingOrdersList.map(id => ({
        orderId: id,
        _missingId: id,
        status: 'missing',
        createdAt: '—',
        customer: '—',
        table: '—',
        waiter: '—',
        paymentMethod: '—',
        amount: 0,
        _isMissing: true,
      }));
      const unmatchedAuditRows = allOrders.filter((o) => o.status === 'audit');
      const auditRows = [...missingOrderPlaceholders, ...unmatchedAuditRows];
      setFilteredOrders(auditRows);
      setSummary({
        totalOrders: auditRows.length,
        totalAmount: unmatchedAuditRows.reduce((acc, o) => acc + (o.amount || 0), 0),
        avgOrderValue: 0,
      });
      setStatusBreakdown(null);
      return;
    }
    
    // Apply tab filter
    let result = allOrders.filter(TAB_FILTERS[activeTab] || (() => true));
    
    // Apply payment method filter
    if (filters.paymentMethod) {
      result = result.filter(o => 
        o.paymentMethod?.toLowerCase() === filters.paymentMethod.toLowerCase()
      );
    }
    
    // Apply status filter
    if (filters.status) {
      result = result.filter(o => o.status === filters.status);
    }

    // Apply payment type filter (prepaid / postpaid)
    if (filters.paymentType) {
      result = result.filter(o => o.paymentType === filters.paymentType);
    }
    
    // CR-001 CS-13: Channel filter now operates on the normalized `channel`
    // field surfaced by getOrderLogsReport. Allowed values: 'dinein', 'takeaway',
    // 'delivery'. Room channel was removed (CS-20) and aggregator stays in its
    // own tab, not in the channel filter (Q-B).
    if (filters.channel) {
      result = result.filter(o => o.channel === filters.channel);
    }

    // CR-001 CS-15 + Q-D: Platform filter is permissive on missing data —
    // rows whose `platform` is null/undefined are NOT excluded when a value
    // is selected. The dropdown itself is hidden upstream when `hasPlatformData`
    // is false (Q-F).
    if (filters.platform) {
      result = result.filter(o => !o.platform || o.platform === filters.platform);
    }

    // CR-001 CS-23..CS-28 + Phase 2 (Q-B = a) + POS2-006-PG-FILTER-DROPDOWN
    // (May-2026): Payment Gateway filter is a 3-option dropdown
    // (ALL / Non-PG / PG). Internal state values:
    //   - null         → no narrowing (ALL mode)
    //   - 'gateway'    → narrow to orders carrying a `razorpay_order_id`
    //                    (i.e. `isPaymentGateway === true`)
    //   - 'nonGateway' → narrow to orders WITHOUT a `razorpay_order_id`
    //                    (i.e. `isPaymentGateway !== true`; covers both
    //                    explicit `false` and missing/null values)
    // Locked item 7: the 'nonGateway' branch must be enabled in filtering.
    if (filters.paymentGateway === 'gateway') {
      result = result.filter(o => o.isPaymentGateway === true);
    } else if (filters.paymentGateway === 'nonGateway') {
      result = result.filter(o => o.isPaymentGateway !== true);
    }

    setFilteredOrders(result);
    
    // Calculate summary
    const summaryData = calculateSummary(result);
    setSummary(summaryData);
    
    // Calculate status breakdown for All tab
    // CR-001 CS-6 / Q-E: `transferred` is removed; new `hold` and `audit`
    // counts are carried in state but no new pills are added to the bar.
    // CR-001 follow-up: 'unpaid' tab is now 'running' and merges real running
    // rows + unpaid rows. The breakdown's `running` key reflects the merged
    // tab count so the All Orders summary stays consistent with the tab bar.
    if (activeTab === 'all') {
      const runningTabCount = result.filter(TAB_FILTERS.running).length;
      const breakdown = {
        all: result.length,
        paid: result.filter(TAB_FILTERS.paid).length,
        cancelled: result.filter(TAB_FILTERS.cancelled).length,
        credit: result.filter(TAB_FILTERS.credit).length,
        merged: result.filter(TAB_FILTERS.merged).length,
        hold: result.filter(TAB_FILTERS.hold).length,
        audit: result.filter((o) => o.status === 'audit').length,
        // `running` = the merged Running tab total + gap-detection running placeholders.
        running: runningTabCount + runningCount,
        missing: missingCount,
      };
      setStatusBreakdown(breakdown);
    } else {
      setStatusBreakdown(null);
    }
  }, [allOrders, activeTab, filters, runningCount, missingCount, missingOrdersList]);

  // Fetch orders when date changes
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleBackToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Reset filters when tab changes (CR-001 — keep filter shape consistent
    // across the page; `paymentGateway` is a tri-state where null = All).
    setFilters({
      status: null,
      paymentMethod: null,
      paymentType: null,
      channel: null,
      platform: null,
      paymentGateway: null,
    });
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: null,
      paymentMethod: null,
      paymentType: null,
      channel: null,
      platform: null,
      paymentGateway: null,
    });
  };

  const handleRemoveFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: null }));
  };

  const handleRowClick = (order) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const currentTabConfig = ALL_ORDERS_TABS.find(t => t.id === activeTab) || ALL_ORDERS_TABS[0];

  // CR-003 — Row-level mutation actions configuration. Computed page-level
  // because every visible row shares the same selected business day, so the
  // 2-day window is a single check on `selectedDate` rather than per-row.
  // Permissions:
  //   - `update_payment` gates the Change Payment Method button (Paid tab).
  //   - `order_unpaid`   gates the Mark as Unpaid button (Paid tab).
  //   - Collect Bill (Hold tab) inherits the existing collect-payment role
  //     gate, so it does not require a CR-003-specific permission key.
  // Window:
  //   - `isMutationAllowedForSelectedDate` returns true iff the picker date
  //     equals device today or device yesterday.
  const isWithinMutationWindow = isMutationAllowedForSelectedDate(selectedDate);
  const canChangeMethod = hasPermission?.('update_payment') ?? false;
  const canMarkUnpaid = hasPermission?.('order_unpaid') ?? false;

  // BUG-042-A (Feb-2026): determine whether the restaurant has at least one
  // primary payment method (Cash / Card / UPI) configured. The Hold-tab
  // Collect Bill drawer restricts the rail to those three methods only — if
  // none are configured, the row-level Collect button must be disabled with
  // a clear tooltip so the cashier knows why. `paymentTypes` is the same
  // bootstrap-seeded array consumed by CollectPaymentPanel via useRestaurant.
  const hasEligibleHoldPaymentMethod = useMemo(() => {
    const types = restaurantPaymentTypes || [];
    return ['cash', 'card', 'upi'].some((id) =>
      types.some((pt) => (pt.name || '').toLowerCase() === id)
    );
  }, [restaurantPaymentTypes]);

  // CR-003 Phase 3.4 — Change Payment Method handler.
  //   1. Optimistic: write the new method to `paymentMethodOverrides` so
  //      the row's badge updates immediately. Mark the row as pending so
  //      the picker trigger renders a spinner.
  //   2. Network: call Endpoint A with the numeric DB id (`order.id`).
  //   3. Success: clear pending; toast "Payment method updated"; refetch
  //      the report so the override is replaced by authoritative data.
  //      We keep the optimistic override in place until the refetch
  //      completes (cleared by the next `fetchOrders` resolving).
  //   4. Error: roll back the override on this row, clear pending, toast
  //      the failure. No refetch (state is already authoritative).
  const handleChangeMethod = useCallback(async (order, newMethod) => {
    if (!order?.id || !newMethod) return;
    const previousMethod = order.paymentMethod || null;

    setPaymentMethodOverrides((prev) => ({
      ...prev,
      [order.id]: newMethod,
    }));
    setPendingChangeMethodIds((prev) => {
      const next = new Set(prev);
      next.add(order.id);
      return next;
    });

    try {
      await changeOrderPaymentMethod(order.id, newMethod);
      toast({
        title: 'Payment method updated',
        description: `Order #${order.orderId || order.id} → ${newMethod.toUpperCase()}`,
      });
      // Refetch so the optimistic override is reconciled with authoritative
      // data. The override map is cleared inside `fetchOrders` on success.
      fetchOrders();
    } catch (err) {
      // Roll back ONLY this row's override. Leave the rest of the map
      // intact in case other parallel calls are in flight.
      setPaymentMethodOverrides((prev) => {
        const next = { ...prev };
        if (previousMethod === null) delete next[order.id];
        else next[order.id] = previousMethod;
        // If `previousMethod` matches `allOrders` value, drop the key entirely.
        return next;
      });
      toast({
        title: 'Could not update payment method',
        description: err.readableMessage,
        variant: 'destructive',
      });
    } finally {
      setPendingChangeMethodIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  }, [toast, fetchOrders]);

  // CR-003 Phase 3.5 — Mark Paid → Unpaid handler.
  //
  // Two-step flow with confirmation:
  //   1. Click on Paid row's "Unpaid" pill   → opens the confirm dialog.
  //      We just stash the row in `markUnpaidTarget` and let the dialog
  //      drive the rest. No API call yet.
  //   2. Confirm inside the dialog          → optimistically remove the
  //      row from the Paid tab, call Endpoint B, on success show toast +
  //      refetch + close dialog. On error, restore the row + show error.
  //
  // The dashboard's existing socket listener (`new_order_${restaurantId}`)
  // handles re-surfacing the order on other terminals — we deliberately
  // do NOT add another subscription here. CR doc CS-A11 explicitly allows
  // explicit refetch as the fallback path until backend rolls out the
  // socket emission for this endpoint.
  const openMarkUnpaidDialog = useCallback((order) => {
    if (!order?.id) return;
    setMarkUnpaidTarget(order);
  }, []);

  const closeMarkUnpaidDialog = useCallback(() => {
    setMarkUnpaidTarget(null);
  }, []);

  const handleMarkUnpaidConfirm = useCallback(async (order) => {
    if (!order?.id) return;
    setMarkUnpaidPending(true);

    // Optimistic: hide the row from the Paid tab immediately.
    setOptimisticUnpaidIds((prev) => {
      const next = new Set(prev);
      next.add(order.id);
      return next;
    });

    try {
      await makeOrderUnpaid(order.id);
      toast({
        title: 'Order marked as unpaid',
        description: `Order #${order.orderId || order.id} will reappear on the dashboard.`,
      });
      // Close the dialog before kicking off the refetch — user-perceived
      // latency wins over visual continuity in the dialog.
      setMarkUnpaidTarget(null);
      // Refetch so authoritative data overwrites the optimistic Set.
      // `fetchOrders` clears `optimisticUnpaidIds` itself on success.
      fetchOrders();
    } catch (err) {
      // Restore the row to the visible list and surface the error. The
      // dialog stays open so the operator can retry without re-clicking
      // the pill.
      setOptimisticUnpaidIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
      toast({
        title: 'Could not mark as unpaid',
        description: err.readableMessage,
        variant: 'destructive',
      });
    } finally {
      setMarkUnpaidPending(false);
    }
  }, [toast, fetchOrders]);

  // CR-003 Phase 3.6 — Collect Bill (Hold tab) handler.
  //
  // Flow has shifted from the original mini-modal sketch to opening the
  // dashboard's existing `CollectPaymentPanel` inside a right-side
  // drawer (`CollectBillPanelDrawer`). The drawer owns the network call
  // (BILL_PAYMENT) and the payload-building (`collectBillExisting`); the
  // page only owns the optimistic Hold-tab removal + toasts + refetch.
  //
  //   1. Click "Collect" pill on a Hold row     → opens drawer.
  //   2. Drawer fetches the held order's full detail and renders the
  //      same Collect Payment UI the dashboard uses.
  //   3. Operator picks method + adjustments + presses Pay     → drawer
  //      builds payload via `collectBillExisting` and POSTs to
  //      BILL_PAYMENT. On success it fires `onCollectSuccess`; on error
  //      `onCollectError`. We optimistically remove the row from Hold
  //      when the operator first presses Pay (`onCollectStart`) so the
  //      list stays in sync with the user's mental model — restored on
  //      error.
  const openCollectBillDrawer = useCallback((order) => {
    if (!order?.id) return;
    setCollectBillTarget(order);
  }, []);

  const closeCollectBillDrawer = useCallback(() => {
    setCollectBillTarget(null);
  }, []);

  const handleCollectStart = useCallback((order) => {
    if (!order?.id) return;
    setCollectBillPending(true);
    setOptimisticCollectedIds((prev) => {
      const next = new Set(prev);
      next.add(order.id);
      return next;
    });
  }, []);

  const handleCollectSuccess = useCallback((order) => {
    setCollectBillPending(false);
    toast({
      title: 'Bill collected',
      description: `Order #${order?.orderId || order?.id} marked paid.`,
    });
    // Refetch reclassifies the row from Hold → Paid; clears the
    // optimistic Set itself.
    fetchOrders();
  }, [toast, fetchOrders]);

  const handleCollectError = useCallback((order, err) => {
    setCollectBillPending(false);
    // Restore the row in Hold so the operator can retry.
    setOptimisticCollectedIds((prev) => {
      const next = new Set(prev);
      next.delete(order?.id);
      return next;
    });
    toast({
      title: 'Could not collect bill',
      description: err.readableMessage,
      variant: 'destructive',
    });
  }, [toast]);

  // BUG-059 (Wave 4, May-2026): Print Bill from Audit Report (Paid tab).
  //
  // Flow:
  //   1. Fetch the full single-order detail by hitting the RAW endpoint
  //      directly (NOT `getSingleOrderNew` — that routes through the
  //      report-side transform which strips `rawOrderDetails`, the exact
  //      field the print payload builder needs). Same pattern documented
  //      in CollectBillPanelDrawer L110-114.
  //   2. Transform via `orderFromAPI.order` so `rawOrderDetails` is
  //      populated for `buildBillPrintPayload`.
  //   3. Call `printOrder` with NO restaurant-context-derived overrides.
  //      Owner directive 2026-05-17: payload values come ONLY from the
  //      fetched single-order API record. Unlike the dashboard print path
  //      (which passes auto-SC %, SC tax pct, delivery GST pct from
  //      `restaurant`), the audit print trusts the persisted order — the
  //      default branch of `buildBillPrintPayload` reads `order.serviceTax`,
  //      `order.discount`, `order.amount`, etc. directly.
  //   4. Toast success / failure; no optimistic state changes (print is
  //      read-only).
  //
  // Owner directive 2026-05-17: NO permission gate.
  // Q-P4-PRINT-03c: cancelled rows excluded by OrderTable branch (this
  // handler is only reachable from Paid-tab buttons).
  const handlePrintBillFromAudit = useCallback(async (row) => {
    if (!row?.id) return;
    try {
      const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, {
        order_id: row.id,
      });
      // Mirror the unwrap logic used in CollectBillPanelDrawer — the
      // endpoint nests the order list under different keys depending on
      // the upstream consumer.
      const raw =
        response?.data?.orders?.order_details_order ||
        response?.data?.order_details_order ||
        (Array.isArray(response?.data?.orders) ? response.data.orders[0] : null) ||
        response?.data?.orders ||
        response?.data ||
        null;
      if (!raw) {
        toast({
          title: 'Cannot print bill',
          description: 'Order details unavailable',
          variant: 'destructive',
        });
        return;
      }
      const order = orderFromAPI.order(raw);
      if (!order || !order.rawOrderDetails) {
        toast({
          title: 'Cannot print bill',
          description: 'Order details unavailable',
          variant: 'destructive',
        });
        return;
      }
      // No restaurant-context overrides — order's persisted values flow
      // through the default branch unchanged.
      await printOrder(row.id, 'bill', null, order, 0, {}, printerAgents || []);
      toast({
        title: 'Bill request sent',
        description: `Order #${row.orderId || row.id}`,
      });
    } catch (err) {
      console.error('[AuditPrintBill] error:', err);
      toast({
        title: 'Failed to send Bill request',
        description: err.readableMessage,
        variant: 'destructive',
      });
    }
  }, [printerAgents, toast]);

  const actionsConfig = (activeTab === 'paid' || activeTab === 'hold')
    ? {
        isWithinMutationWindow,
        canChangeMethod,
        canMarkUnpaid,
        pendingChangeMethodIds,
        onCollectBill: openCollectBillDrawer,
        onChangeMethod: handleChangeMethod,
        onMarkUnpaid: openMarkUnpaidDialog,
        // BUG-059 (Wave 4, May-2026, Owner directive 2026-05-17):
        // expose Print Bill handler to OrderTable so the Paid tab renders
        // a "Print" row action. NO permission gate (owner directive).
        // Hold-tab eligibility branch ignores it.
        onPrintBill: handlePrintBillFromAudit,
        // BUG-042-A (Feb-2026): Hold-tab Collect Bill must surface only
        // primary methods (Cash / Card / UPI). When none of those is
        // configured for the restaurant, the row-level Collect Bill button
        // is disabled with a clear tooltip (see OrderTable.renderActionsCell).
        hasEligibleHoldPaymentMethod,
      }
    : null;

  // CR-003 — Apply optimistic payment-method overrides AND optimistic
  // unpaid-removals AND optimistic collect-bill-removals on top of the
  // post-tab-filtered list. We keep `filteredOrders` as the source of
  // truth for counts/summary; `displayOrders` is purely a presentational
  // mapping for the table renderer. Removal is intentionally only applied
  // on the relevant tab (Paid for unpaid-flip, Hold for collect-bill) so
  // the row remains visible in All / Audit views (until the refetch
  // reclassifies it).
  const displayOrders = useMemo(() => {
    let list = filteredOrders;
    if (activeTab === 'paid' && optimisticUnpaidIds.size > 0) {
      list = list.filter((o) => !optimisticUnpaidIds.has(o.id));
    }
    if (activeTab === 'hold' && optimisticCollectedIds.size > 0) {
      list = list.filter((o) => !optimisticCollectedIds.has(o.id));
    }
    if (Object.keys(paymentMethodOverrides).length > 0) {
      list = list.map((o) => {
        const override = paymentMethodOverrides[o.id];
        if (!override) return o;
        const displayCased = override === 'upi' ? 'UPI' : (override.charAt(0).toUpperCase() + override.slice(1));
        return { ...o, paymentMethod: displayCased };
      });
    }
    return list;
  }, [filteredOrders, paymentMethodOverrides, optimisticUnpaidIds, optimisticCollectedIds, activeTab]);

  return (
    <div className="flex h-screen bg-white" data-testid="all-orders-report-page">
      {/* Sidebar */}
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
        {/* Header */}
        <header 
          className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200"
          data-testid="all-orders-header"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToDashboard}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <div>
              <h1 
                className="text-2xl font-semibold tracking-tight text-zinc-950"
                style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                Daily Report
              </h1>
            </div>
          </div>

          {/* Date Picker + Export Buttons */}
          <div className="flex items-center gap-3">
            <DatePicker 
              value={selectedDate} 
              onChange={handleDateChange} 
            />
            <ExportButtons
              orders={filteredOrders}
              tabId={activeTab}
              tabLabel={currentTabConfig.label}
              selectedDate={selectedDate}
              summary={summary}
              disabled={isLoading}
            />
          </div>
        </header>

        {/* Tabs */}
        <div className="px-8 pt-4 bg-white border-b border-zinc-100">
          <div className="flex items-center gap-1 overflow-x-auto pb-3">
            {ALL_ORDERS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id] || 0;
              
              // CR-001 CS-5: Dynamic color for Audit tab — red whenever the
              // combined audit count (missing placeholders + unmatched real
              // rows) is greater than 0, green otherwise.
              const isAuditTab = tab.id === 'audit';
              const auditHasItems = isAuditTab && count > 0;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all
                    ${isActive 
                      ? isAuditTab 
                        ? auditHasItems 
                          ? 'bg-red-600 text-white' 
                          : 'bg-green-600 text-white'
                        : 'bg-zinc-900 text-white' 
                      : isAuditTab
                        ? auditHasItems
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }
                  `}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8">
          {/* Error Banner */}
          {error && (
            <div 
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-center gap-3"
              data-testid="error-banner"
            >
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
              <button 
                onClick={fetchOrders}
                className="ml-auto text-sm font-medium text-red-700 hover:text-red-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* Filters + Summary Stats */}
          <div className="mb-4">
            <FilterBar 
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearFilters}
              breakdown={null}
              summary={summary}
              missingCount={0}
              runningCount={0}
              tabSettled={null}
              activeTab={activeTab}
              hasPlatformData={hasPlatformData}
            />
          </div>

          {/* Filter Tags */}
          <FilterTags 
            filters={filters}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearFilters}
          />

          {/* Order Table */}
          <OrderTable
            orders={displayOrders}
            tabId={activeTab}
            tabLabel={currentTabConfig.label}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            runningOrdersMap={runningOrdersMap}
            showGapDetection={activeTab === 'all' && !Object.values(filters).some(v => v !== null)}
            actionsConfig={actionsConfig}
            filters={filters}
          />
        </div>
      </main>

      {/* Order Detail Side Sheet */}
      <OrderDetailSheet
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
        order={selectedOrder}
        tabId={activeTab}
      />

      {/* CR-003 Phase 3.5 — Mark as Unpaid confirmation */}
      <MarkUnpaidConfirmDialog
        open={!!markUnpaidTarget}
        order={markUnpaidTarget}
        isPending={markUnpaidPending}
        onCancel={closeMarkUnpaidDialog}
        onConfirm={handleMarkUnpaidConfirm}
      />

      {/* CR-003 Phase 3.6 — Collect Bill (Hold) drawer reusing the
          dashboard's CollectPaymentPanel inside a right-side panel. */}
      <CollectBillPanelDrawer
        open={!!collectBillTarget}
        order={collectBillTarget}
        onClose={closeCollectBillDrawer}
        onCollectStart={handleCollectStart}
        onCollectSuccess={handleCollectSuccess}
        onCollectError={handleCollectError}
      />
    </div>
  );
};

export default AllOrdersReportPage;
