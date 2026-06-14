// RoomOrdersReportPage — PMS-style Room Orders report (CR-004 Phase 1)
// =============================================================================
// Phase 4.3 SCOPE (current):
//   - Header: back arrow + title + DatePicker (Today auto-selected)
//   - Filter pills: [ All ][ Paid ][ Unpaid ] — default "All"
//   - Summary bar skeleton: N Rooms · ₹Total · ₹Food · ₹Outstanding
//   - Day-list fetch via getOrderLogsReport, filtered to order_in === 'RM' only
//   - Room name resolution via useTables() lookup on table_id
//   - Rows render with day-list fields + placeholders for detail-derived totals
//   - Paid/Unpaid filter pills are clickable but only "All" affects rows in 4.3
//     (real filtering by balancePayment kicks in once Phase 4.4 fetches detail)
//   - Anomaly notice (Option B): silent skip of unexpected statuses with a
//     small one-liner notice when count > 0
//
// Deferred to later phases:
//   - Phase 4.4: per-row getSingleOrderRoom fetch + cache, real Food/Total/
//                Outstanding numbers, RoomRowCard expansion, Paid/Unpaid filter
//                actually filters by balancePayment
//   - Phase 4.5: incremental summary-bar totals
//   - Phase 4.6: PDF/CSV export integration
//
// Locked taxonomy + formulas (carried for future phases):
//   - Source:       order-logs-report (RM only) + getSingleOrderRoom per row
//   - Outstanding = RM.order_amount + Σ associated.amount + max(0, balancePayment)
//   - Food        = RM.order_amount + Σ associated.amount
//   - Total       = roomPrice + Food
//   - SRM-only groups, Cancelled / Hold / Merged / Audit / Aggregator / Credit:
//     all explicitly out of scope per user-confirmed taxonomy.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, BedDouble } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import DatePicker from '../components/reports/DatePicker';
import RoomRowCard from '../components/reports/RoomRowCard';
import MarkUnpaidConfirmDialog from '../components/reports/MarkUnpaidConfirmDialog';
import { getRoomsForReport } from '../api/services/reportService';
import { makeOrderUnpaid } from '../api/services/paymentMutationService';
import { useRestaurant, useTables, useAuth } from '../contexts';
import { useToast } from '../hooks/use-toast';
import { isMutationAllowedForSelectedDate } from '../utils/businessDay';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

// CR-004: filter pill labels + values. Tri-state, default = 'all'.
// Phase 4.4: Paid/Unpaid filter is now wired against per-row balancePayment.
const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const StatusFilterPills = ({ value, onChange, disabledTooltip }) => (
  <div
    className="inline-flex items-center gap-1 p-1 bg-zinc-100 rounded-sm border border-zinc-200"
    data-testid="room-orders-status-filter"
  >
    {STATUS_FILTERS.map((opt) => {
      const isActive = value === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.value !== 'all' ? disabledTooltip : ''}
          className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
            isActive
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-600 hover:bg-white'
          }`}
          data-testid={`room-orders-filter-${opt.value}`}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

// CR-004 Phase 4.5: SummaryBar surfaces async resolution progress so the
// operator gets clear feedback as per-row detail fetches roll in.
//
// Three visual states per stat:
//   1. day-list still loading (page-level isLoading=true)         → "—"
//   2. day-list done but no per-row detail resolved yet           → tiny spinner
//   3. some rows resolved (resolvedRowCount < visibleRoomCount)   → number + "(N of M)"
//   4. all rows resolved                                          → clean number
//
// The Outstanding stat carries the strongest visual weight (it answers the
// operator's primary question: "how much can I expect to collect?").
const InlineSpinner = () => (
  <svg
    className="w-3 h-3 animate-spin text-zinc-400 inline-block"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const SummaryStat = ({
  label,
  value,
  isPageLoading,
  resolvedCount,
  visibleCount,
  emphasize = false,
}) => {
  const noneResolved = !isPageLoading && resolvedCount === 0 && visibleCount > 0;
  const partial =
    !isPageLoading && resolvedCount > 0 && resolvedCount < visibleCount;
  const allResolved = !isPageLoading && resolvedCount === visibleCount;

  let display;
  if (isPageLoading) {
    display = <span className="text-zinc-300">—</span>;
  } else if (visibleCount === 0) {
    // No rows on screen — nothing to compute.
    display = <span className="text-zinc-300">—</span>;
  } else if (noneResolved) {
    display = <InlineSpinner />;
  } else {
    display = (
      <span
        className={`font-mono tabular-nums ${
          emphasize ? 'font-bold text-zinc-950' : 'font-semibold text-zinc-900'
        }`}
      >
        {formatCurrency(value)}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-zinc-500">{label}</span>
      {display}
      {partial && (
        <span
          className="text-[10px] text-zinc-400 italic ml-0.5"
          title="Some rooms still loading"
        >
          ({resolvedCount}/{visibleCount})
        </span>
      )}
      {/* Reserved space for future tooltip — keeps `allResolved` referenced. */}
      {allResolved ? null : null}
    </div>
  );
};

const SummaryBar = ({
  roomCount,
  total,
  paid,
  outstanding,
  discount,
  isLoading,
  resolvedCount = 0,
}) => (
  <div
    className="flex items-center gap-4 text-xs"
    data-testid="room-orders-summary"
  >
    <div className="flex items-center gap-1">
      <span className="text-zinc-500">Rooms</span>
      <span className="font-mono font-semibold text-zinc-900 tabular-nums">
        {isLoading ? '—' : roomCount}
      </span>
    </div>
    <div className="h-3 w-px bg-zinc-300" />
    <SummaryStat
      label="Total"
      value={total}
      isPageLoading={isLoading}
      resolvedCount={resolvedCount}
      visibleCount={roomCount}
    />
    {/* CR-004 Phase 2 PR-1: Paid stat between Total and Outstanding.
        BE-2 §4.1 (2026-05-01): Paid semantics now = actual lodging cash
        collected (advance + receive_balance) + food on settled rooms,
        not "billed amount". */}
    <div className="h-3 w-px bg-zinc-300" />
    <SummaryStat
      label="Paid"
      value={paid}
      isPageLoading={isLoading}
      resolvedCount={resolvedCount}
      visibleCount={roomCount}
    />
    {/* BE-2 §4.1 (2026-05-01): Discount stat. Sum of derived/explicit
        lodging discounts across visible rooms. Renders blank in summary
        when total is 0 — only surfaces real cash gaps / approved discounts. */}
    {(discount || 0) > 0 && (
      <>
        <div className="h-3 w-px bg-zinc-300" />
        <SummaryStat
          label="Discount"
          value={discount}
          isPageLoading={isLoading}
          resolvedCount={resolvedCount}
          visibleCount={roomCount}
        />
      </>
    )}
    <div className="h-3 w-px bg-zinc-300" />
    <SummaryStat
      label="Outstanding"
      value={outstanding}
      isPageLoading={isLoading}
      resolvedCount={resolvedCount}
      visibleCount={roomCount}
      emphasize
    />
  </div>
);

const EmptyState = ({ filterValue }) => (
  <div
    className="bg-white border border-zinc-200 rounded-sm py-20 text-center"
    data-testid="room-orders-empty"
  >
    <BedDouble className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
    <h3 className="text-base font-medium text-zinc-900 mb-1">
      {filterValue === 'unpaid'
        ? 'No rooms with outstanding balance'
        : filterValue === 'paid'
        ? 'No fully-settled rooms today'
        : 'No room orders for this date'}
    </h3>
    <p className="text-sm text-zinc-500">
      Try changing the date or switching the status filter.
    </p>
  </div>
);

const LoadingState = () => (
  <div
    className="bg-white border border-zinc-200 rounded-sm py-12 text-center"
    data-testid="room-orders-loading"
  >
    <svg
      className="w-5 h-5 animate-spin text-zinc-400 mx-auto mb-2"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
    <p className="text-sm text-zinc-500">Loading rooms…</p>
  </div>
);

// CR-004 Phase 4.4: collapsed/expanded row rendering moved into the dedicated
// `RoomRowCard` component (./components/reports/RoomRowCard.jsx) which owns
// per-row detail-fetch lifecycle, cache wiring, and the expanded billing +
// transferred-orders panes. The Phase 4.3 placeholder skeleton has been
// removed in favor of the real card.

const RoomRowsHeader = () => (
  <div className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-sm flex items-center gap-4 text-xs font-semibold uppercase tracking-wide text-zinc-600">
    <div className="w-4" />
    <div className="w-20">Room</div>
    <div className="flex-1 min-w-0">Guest</div>
    <div className="w-32">Check-in</div>
    <div className="w-28">Transferred</div>
    <div className="w-20 text-right">Total</div>
    {/* CR-004 Phase 2 PR-1: new Paid column between Total and Outstanding. */}
    <div className="w-20 text-right">Paid</div>
    {/* BE-2 §4.1 (wired 2026-05-01): Discount column. Per-row cell renders
        blank when discount is 0; SummaryBar Discount stat sums across visible rows. */}
    <div className="w-20 text-right">Discount</div>
    <div className="w-24 text-right">Outstanding</div>
  </div>
);

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const RoomOrdersReportPage = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const schedules = useMemo(
    () => restaurant?.schedules || [],
    [restaurant?.schedules]
  );
  const { getTableById } = useTables();

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSilentMode, setIsSilentMode] = useState(false);

  // Today auto-selected (matches Audit Report convention).
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // CR-004: top-level filter, default = "All" (per locked Q-5 answer).
  const [statusFilter, setStatusFilter] = useState('all');

  // Day-list state
  const [allOrders, setAllOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Anomaly count (Option B): rows with order_in='RM' that fall through to an
  // unexpected status (cancelled/merged/hold/audit/etc.) — silently skipped
  // from the room list but counted so we can surface a small notice.
  const [anomalyCount, setAnomalyCount] = useState(0);

  // CR-004 Phase 4.4: per-row detail cache. Key = parentOrderId. Value = the
  // transformed order from getSingleOrderRoom (orderTransform.fromAPI.order).
  // The cache is REPLACED (new Map) every time `selectedDate` changes so each
  // row remounts and refetches against the new business day. Within a single
  // date the cache survives expand/collapse and filter toggles.
  //
  // We also keep `resolvedDetails` as a counter-style state so the Paid/Unpaid
  // filter (which reads balancePayment) re-evaluates the moment new detail
  // resolves for any row. The Map mutation alone is invisible to React.
  const detailCacheRef = useRef(new Map());
  const [resolvedTick, setResolvedTick] = useState(0);

  const handleDetailResolved = useCallback(() => {
    // Bump the tick — triggers `visibleRows` re-derive so newly-fetched
    // balancePayment values flow through the Paid/Unpaid filter.
    setResolvedTick((t) => t + 1);
  }, []);

  // -------------------------------------------------------------------------
  // CR-004 Phase 2 PR-2 — "Remove from Room" action
  // -------------------------------------------------------------------------
  // Mirrors the Audit Report's CR-003 Mark-Unpaid pattern. Same backend
  // endpoint (`makeOrderUnpaid`), same permission (`order_unpaid`), same
  // 2-business-day mutation window. Reuses the parameterised
  // `MarkUnpaidConfirmDialog` with overridden copy/colour. The ONLY
  // intentional divergence is the refetch strategy:
  //   - Audit Report fires a full-page `fetchOrders()`.
  //   - Room Orders Report does a SURGICAL per-room refetch by replacing
  //     the detail-cache Map (so RoomRowCard's deps-bound effect re-fires
  //     for that room only) and bumping `resolvedTick` to force a render.
  // No full `/get-room-list` or `/order-logs-report` refetch is fired.
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canRemoveFromRoom = !!hasPermission?.('order_unpaid');
  const isWithinMutationWindow = useMemo(
    () => isMutationAllowedForSelectedDate(selectedDate),
    [selectedDate]
  );
  // Target shape: { srm, parentOrderId } — the SRM child to flip + its room.
  const [removeFromRoomTarget, setRemoveFromRoomTarget] = useState(null);
  const [removeFromRoomPending, setRemoveFromRoomPending] = useState(false);

  // 2026-05-01 — `optimisticRemovedIds` Set + 1.5s `setTimeout` workaround
  // removed. The surgical cache invalidation below already deletes the
  // affected room's entry, which triggers RoomRowCard's deps-bound effect
  // to refire `getSingleOrderRoom(parentOrderId)` — the refreshed
  // `associatedOrders` list omits the removed SRM. Net: same UX with a
  // single network round-trip, no artificial flicker, no growing Set.

  const openRemoveFromRoomDialog = useCallback((srm, parentOrderId) => {
    if (!srm?.orderId || !parentOrderId) return;
    setRemoveFromRoomTarget({ srm, parentOrderId });
  }, []);

  const closeRemoveFromRoomDialog = useCallback(() => {
    setRemoveFromRoomTarget(null);
  }, []);

  const handleRemoveFromRoomConfirm = useCallback(async () => {
    const ctx = removeFromRoomTarget;
    if (!ctx?.srm?.orderId) return;
    const { srm, parentOrderId } = ctx;
    setRemoveFromRoomPending(true);
    try {
      await makeOrderUnpaid(srm.orderId);
      toast({
        title: 'Order removed from room',
        description: `Order #${
          srm.orderNumber || srm.orderId
        } will reappear on the table for re-billing.`,
      });
      setRemoveFromRoomTarget(null);
      // Surgical refetch: rebuild the cache Map without the affected room
      // so RoomRowCard's `useEffect` (deps-bound on the Map identity) re-fires
      // and re-runs `getSingleOrderRoom(parentOrderId)`. Other rows keep their
      // cached detail untouched.
      const nextCache = new Map(detailCacheRef.current);
      nextCache.delete(parentOrderId);
      detailCacheRef.current = nextCache;
      setResolvedTick((t) => t + 1);
    } catch (err) {
      toast({
        title: 'Could not remove from room',
        description: err.readableMessage,
        variant: 'destructive',
      });
    } finally {
      setRemoveFromRoomPending(false);
    }
    // user is intentionally NOT a dep — only used at action time and we
    // don't want this useCallback to rebuild on every auth-context change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeFromRoomTarget, toast]);

  // -------------------------------------------------------------------------
  // Fetch rows (filter-pill-driven data source — CR-004 Phase 2 / Bucket B)
  // -------------------------------------------------------------------------
  // - 'unpaid' → /get-room-list (live, currently in-house rooms only)
  // - 'paid'   → /order-logs-report (RM rows where status === 'paid')
  // - 'all'    → both, parallelised, deduplicated by parentOrderId
  // The filter switch is internalised in `getRoomsForReport`. The page just
  // stores the unified row seeds.
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    // Replace the per-row detail cache so each row remounts and refetches
    // its detail against the new data set (date or filter change).
    detailCacheRef.current = new Map();
    setResolvedTick(0);
    try {
      const { rows, anomalyCount: dropped } = await getRoomsForReport(
        statusFilter,
        selectedDate,
        schedules
      );
      setAnomalyCount(dropped);
      setAllOrders(rows);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RoomOrdersReport] fetchOrders failed:', err);
      setError(err.readableMessage);
      setAllOrders([]);
      setAnomalyCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, selectedDate, schedules]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // -------------------------------------------------------------------------
  // Resolve the page-level row shape from the row seeds returned by the
  // helper. Live-source seeds carry `roomNumber` directly; logs-source seeds
  // need a `getTableById` fallback to surface a human label for the room.
  // -------------------------------------------------------------------------

  const roomRows = useMemo(() => {
    return allOrders.map((seed) => {
      // Live-source seeds carry roomNumber + tableId from /get-room-list.
      // Logs-source seeds carry tableId only and need a tables-context lookup.
      let roomNumber = seed.roomNumber;
      if (!roomNumber && seed.tableId) {
        const tbl = getTableById(seed.tableId);
        // RAW-FIELD-PROD-FALLBACK-FIX (NS-3C-4) — 2026-05-04:
        // Removed dead raw-seed-table middle fallback.
        // Live source: the raw `table` field from /get-room-list is an
        // OBJECT {id, table_no, title} — never a useful string, and
        // unreachable here since `seed.roomNumber` is already populated
        // upstream by roomListTransform (= t.table_no).
        // Logs source: there is no `table` field on the raw log row.
        // The two preceding fallbacks (`tbl?.tableNumber`, `tbl?.displayName`)
        // already cover both source paths.
        roomNumber = tbl?.tableNumber || tbl?.displayName || '—';
      }
      return {
        ...seed,
        roomNumber: roomNumber || '—',
      };
    });
  }, [allOrders, getTableById]);

  // -------------------------------------------------------------------------
  // visibleRows is identical to roomRows now that the helper applies the
  // filter at fetch time. Kept as a separate name so downstream code (the
  // SummaryBar `roomCount`, `summaryTotals`) reads naturally.
  // -------------------------------------------------------------------------
  const visibleRows = roomRows;

  // -------------------------------------------------------------------------
  // Summary totals — derived from cache (Phase 4.5 will polish; Phase 4.4
  // surfaces "live" totals as detail resolves so the user has feedback).
  // -------------------------------------------------------------------------
  const summaryTotals = useMemo(() => {
    let total = 0;
    let food = 0;
    let paid = 0;
    let outstanding = 0;
    let discount = 0;
    let resolvedCount = 0;
    visibleRows.forEach((row) => {
      const detail = detailCacheRef.current.get(row.parentOrderId);
      if (!detail || !detail.roomInfo) return;
      resolvedCount += 1;
      const ri = detail.roomInfo;
      const rmAmt = parseFloat(detail.amount) || 0;
      const aoTotal = (detail.associatedOrders || []).reduce(
        (s, o) => s + (parseFloat(o.amount) || 0),
        0
      );
      const rowFood = aoTotal + (
        detail.fOrderStatus === 6
          ? Math.max(0, rmAmt - (parseFloat(ri.balancePayment) || 0) - aoTotal)
          : rmAmt
      );
      const rowTotal = (parseFloat(ri.roomPrice) || 0) + rowFood;
      // BUG-048 — owner-locked model (2026-05-12). Mirrors RoomRowCard.numbers
      // line-for-line so SummaryBar totals match visible per-row cells.
      const rowSettled = detail.fOrderStatus === 6;
      const advance = parseFloat(ri.advancePayment) || 0;
      const receiveBalance = parseFloat(ri.receiveBalance) || 0;
      const explicitDiscount = parseFloat(ri.discountAmount) || 0;
      const rowDiscount = explicitDiscount; // NO derivation — owner-locked.
      const rowPaid = rowSettled
        ? Math.min(advance + rmAmt, rowTotal)
        : advance + receiveBalance;
      const rowOut = Math.max(0, rowTotal - rowPaid);
      total += rowTotal;
      food += rowFood;
      paid += rowPaid;
      outstanding += rowOut;
      discount += rowDiscount;
    });
    return {
      total: resolvedCount > 0 ? total : null,
      food: resolvedCount > 0 ? food : null,
      paid: resolvedCount > 0 ? paid : null,
      outstanding: resolvedCount > 0 ? outstanding : null,
      discount: resolvedCount > 0 ? discount : null,
      // Number of visible rows whose detail fetch has resolved. Drives the
      // "(N/M loaded)" hint and per-stat spinners in the SummaryBar.
      resolvedCount,
      // True only when every visible row's detail has resolved.
      allResolved: resolvedCount === visibleRows.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, resolvedTick]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleBack = () => navigate('/dashboard', { replace: true });
  const handleDateChange = (d) => setSelectedDate(d);
  const handleStatusChange = (v) => setStatusFilter(v);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="flex h-screen bg-white"
      data-testid="room-orders-report-page"
    >
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

      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
        {/* Header */}
        <header
          className="flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-200"
          data-testid="room-orders-header"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              data-testid="back-to-dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <h1
              className="text-2xl font-semibold tracking-tight text-zinc-950"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Daily Room Report
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* CR-004 Phase 2 / Bucket B: when the active filter is Unpaid,
                the data source is /get-room-list (live, no date) so the
                date picker is disabled with a clarifying tooltip. The "All"
                filter keeps the picker active but clarifies that the date
                gates only the settled portion of the union. */}
            <DatePicker
              value={selectedDate}
              onChange={handleDateChange}
              disabled={statusFilter === 'unpaid'}
              tooltip={
                statusFilter === 'unpaid'
                  ? "Currently checked-in rooms — date doesn't apply"
                  : statusFilter === 'all'
                  ? 'Date affects settled rooms only'
                  : ''
              }
            />
            {/* Phase 4.6: PDF / CSV exports plug in here. */}
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-8">
          {/* Error banner */}
          {error && (
            <div
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm flex items-center gap-3"
              data-testid="room-orders-error"
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

          {/* Filter pills + summary cluster */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <StatusFilterPills
                value={statusFilter}
                onChange={handleStatusChange}
                disabledTooltip=""
              />
            </div>
            <SummaryBar
              roomCount={visibleRows.length}
              total={summaryTotals.total}
              paid={summaryTotals.paid}
              outstanding={summaryTotals.outstanding}
              discount={summaryTotals.discount}
              isLoading={isLoading}
              resolvedCount={summaryTotals.resolvedCount}
            />
          </div>

          {/* Anomaly notice (Option B) — hidden when count = 0 */}
          {anomalyCount > 0 && (
            <div
              className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-800"
              data-testid="room-orders-anomaly-notice"
            >
              ⚠ {anomalyCount} room{anomalyCount === 1 ? '' : 's'} with
              unexpected status today and were skipped. View in Audit Report
              for details.
            </div>
          )}

          {/* Body */}
          {isLoading ? (
            <LoadingState />
          ) : visibleRows.length === 0 ? (
            <EmptyState filterValue={statusFilter} />
          ) : (
            <div className="flex flex-col gap-2" data-testid="room-orders-list">
              <RoomRowsHeader />
              {visibleRows.map((row) => (
                <RoomRowCard
                  key={row.parentOrderId}
                  row={row}
                  detailCache={detailCacheRef.current}
                  onDetailResolved={handleDetailResolved}
                  canRemoveFromRoom={canRemoveFromRoom}
                  isWithinMutationWindow={isWithinMutationWindow}
                  onRemoveFromRoom={openRemoveFromRoomDialog}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      {/* CR-004 Phase 2 PR-2 — Remove-from-Room confirmation dialog. Reuses
          MarkUnpaidConfirmDialog with overridden copy + colour. The
          underlying API call (`makeOrderUnpaid`) is the same as the Audit
          Report's Mark-Unpaid action — the labelling shift just reflects
          the user-mental-model on the room surface. */}
      <MarkUnpaidConfirmDialog
        open={!!removeFromRoomTarget}
        order={removeFromRoomTarget?.srm || null}
        isPending={removeFromRoomPending}
        onCancel={closeRemoveFromRoomDialog}
        onConfirm={handleRemoveFromRoomConfirm}
        title="Remove order {label} from this room?"
        description={
          <>
            The order will be removed from this room&apos;s folio and will
            reappear on the originating table&apos;s running orders for
            re-billing. This action will be reflected on other terminals.
          </>
        }
        actionLabel="Remove from Room"
        pendingLabel="Removing…"
        actionClassName="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
        testId="remove-from-room-confirm-dialog"
      />
    </div>
  );
};

export default RoomOrdersReportPage;
