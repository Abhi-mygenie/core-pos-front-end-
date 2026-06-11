// RoomRowCard — collapsed + expandable room row for the Room Orders Report
// =============================================================================
// CR-004 Phase 4.4. The row owns its own detail-fetch lifecycle:
//
//   on mount  → call getSingleOrderRoom(parentOrderId) (unless cached)
//             → cache the resolved detail in the parent-supplied cache Map
//             → render real numbers in the collapsed columns
//
//   on click  → toggle expanded; re-uses the cached detail (no re-fetch)
//
//   on error  → render an inline ⚠ Failed + Retry chip; does NOT block other rows
//
// Locked formulas (CR-004 Phase 4.1 + BUG-048 owner-locked model, 2026-05-12):
//   Food (in-house) = RM-parent.order_amount + Σ associated_orders[].amount
//   Food (settled)  = Σ associated_orders[].amount
//                     + max(0, RM-parent.order_amount
//                              − room_info.balance_payment
//                              − Σ associated_orders[].amount)
//                     (∵ on settled rows, order_amount carries the checkout
//                        collection = balance_payment + associated + room_service;
//                        subtract balance and associated to isolate genuine
//                        room-service.)
//   Total           = roomInfo.roomPrice + Food
//   Paid (settled)  = min(advance + order_amount, Total)
//   Paid (in-house) = advance + receive_balance
//   Outstanding     = max(0, Total − Paid)
//   Discount        = roomInfo.discountAmount only (no derived fallback)
//
// Phase 4.4 deliberately does NOT yet:
//   - Wire summary-bar incremental totals (Phase 4.5)
//   - Plug into PDF/CSV export shape (Phase 4.6)
//   - Re-derive per-order Paid/Unpaid badges (taxonomy: associated orders are
//     "transferred to room", not "paid"; no per-order badge needed)

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, RotateCcw } from 'lucide-react';
import { getSingleOrderRoom } from '../../api/services/reportService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const hasDecimals = n % 1 !== 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2 })}`;
};

const formatCheckInDateTime = (rawIso) => {
  if (!rawIso) return '—';
  try {
    const d = new Date(rawIso.replace ? rawIso.replace(' ', 'T') : rawIso);
    if (Number.isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month} ${hh}:${mm}`;
  } catch {
    return '—';
  }
};

const formatTime = (rawIso) => {
  if (!rawIso) return '—';
  try {
    const d = new Date(rawIso.replace ? rawIso.replace(' ', 'T') : rawIso);
    if (Number.isNaN(d.getTime())) return '—';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '—';
  }
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const PlaceholderCell = ({ width = 'w-16', title = 'Loading detail…' }) => (
  <div
    className={`${width} h-3 bg-zinc-100 rounded-sm animate-pulse`}
    title={title}
  />
);

const RoomBillingCard = ({ rent, advance, balance }) => {
  const balanceColor = balance > 0 ? 'text-red-600' : 'text-emerald-600';
  return (
    <div
      className="flex-shrink-0 w-64 bg-white border border-zinc-200 rounded-sm p-4"
      data-testid="room-billing-card"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Room billing
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          {/* CR-004 Phase 2 PR-3: label renamed Rent → Total per CR. The numeric
              value still reflects roomInfo.roomPrice (room price only, before
              food). Note the row strip's "Total" column means room price + food;
              the dual definition is acknowledged in the CR. */}
          <span className="text-zinc-600">Total</span>
          <span className="font-mono tabular-nums text-zinc-900">
            {formatCurrency(rent)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-600">Advance</span>
          <span className="font-mono tabular-nums text-zinc-900">
            {formatCurrency(advance)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 pt-2">
          <span className="text-zinc-600">Balance</span>
          <span className={`font-mono tabular-nums font-semibold ${balanceColor}`}>
            {formatCurrency(balance)}
          </span>
        </div>
        {/* Food line removed per user request — value still computed in
            `numbers.food` for any internal consumer; surfaced elsewhere via
            the row-strip Total / Outstanding columns. */}
      </div>
    </div>
  );
};

const TransferredOrdersTable = ({
  associatedOrders,
  roomOrderAmount,
  parentOrderId,
  canRemoveFromRoom,
  isWithinMutationWindow,
  onRemoveFromRoom,
  isFullySettled,
}) => {
  // 2026-05-01 — `optimisticRemovedIds` Set workaround removed.
  // RoomOrdersReportPage now does a surgical cache invalidation that
  // refires `getSingleOrderRoom`, so the refreshed list arrives in a
  // single network round-trip with no artificial flicker.
  const visibleAssociated = associatedOrders || [];
  const hasTransfers = visibleAssociated.length > 0;
  // Pill is rendered only when:
  //   1. operator has the order_unpaid permission, AND
  //   2. the page-level date is inside the mutation window, AND
  //   3. the parent room is currently in-house (fos !== 6) — settled rooms
  //      are post-checkout and not actionable.
  const showPill =
    canRemoveFromRoom &&
    isWithinMutationWindow &&
    !isFullySettled &&
    typeof onRemoveFromRoom === 'function';

  return (
    <div
      className="flex-1 min-w-0 bg-white border border-zinc-200 rounded-sm p-4"
      data-testid="room-transferred-orders"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Associated orders
      </div>

      {/* Room-service line: the RM-parent itself accumulates room-service items.
          The user's locked taxonomy: "room is a table — orders taken on that
          table under that order id". So the RM-parent.order_amount represents
          food consumed via room service (not transferred from another table). */}
      {(roomOrderAmount || 0) > 0 && (
        <div
          className="flex items-center gap-3 px-3 py-2 mb-2 bg-zinc-50 rounded-sm text-sm"
          data-testid="room-service-line"
        >
          <div className="flex-1 min-w-0 truncate text-zinc-700">
            <span className="font-medium">Room service items</span>
            <span className="text-zinc-400 ml-2 text-xs">(on this room)</span>
          </div>
          <div className="font-mono tabular-nums text-zinc-900">
            {formatCurrency(roomOrderAmount)}
          </div>
        </div>
      )}

      {hasTransfers ? (
        <div className="overflow-hidden border border-zinc-100 rounded-sm">
          {/* Grid columns: 3 / 2 / 3 / 2 / 2  (Order | Type | Time | Amount | Action)
              when the Action column is shown. Action is only shown if the pill
              is enabled, otherwise the original 4-column layout is preserved. */}
          <div
            className={`bg-zinc-50 px-3 py-2 grid ${
              showPill ? 'grid-cols-12' : 'grid-cols-12'
            } gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-600`}
          >
            <div className="col-span-3">Order #</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Time</div>
            <div
              className={`${showPill ? 'col-span-2' : 'col-span-4'} text-right`}
            >
              Amount
            </div>
            {showPill && <div className="col-span-2 text-right">Action</div>}
          </div>
          <div className="divide-y divide-zinc-100">
            {visibleAssociated.map((ao) => {
              // RAW-FIELD-PROD-FALLBACK-FIX (NS-3C-4) — 2026-05-04:
              // Items in `associated_order_list[]` are by definition orders
              // transferred to a room from a table → origin label is
              // canonically 'SRM'. The API schema for these items does not
              // carry `order_in`, so the literal value is the stable
              // contract. (See orderTransform.js:249-270 schema comment.)
              const oin = 'SRM';
              // ao.orderNumber === item.restaurant_order_id (mini-transform
              // L265 in orderTransform.js), so the previous middle fallback
              // (raw API restaurant_order_id) was redundant.
              const restId = ao.orderNumber || `#${ao.orderId || '—'}`;
              // Items in associated_order_list[] always carry `collect_Bill`
              // (the room-transfer timestamp); `transferredAt` is the
              // transformed equivalent. The previous raw-API created_at
              // fallback covered an unobserved edge case.
              const time = formatTime(ao.transferredAt);
              return (
                <div
                  key={ao.orderId}
                  className="px-3 py-2 grid grid-cols-12 gap-2 text-sm hover:bg-zinc-50 items-center"
                  data-testid={`associated-order-${ao.orderId}`}
                >
                  <div className="col-span-3 font-mono text-zinc-900">
                    {restId}
                  </div>
                  <div className="col-span-2 text-zinc-600">{oin}</div>
                  <div className="col-span-3 font-mono text-zinc-600">
                    {time}
                  </div>
                  <div
                    className={`${
                      showPill ? 'col-span-2' : 'col-span-4'
                    } text-right font-mono tabular-nums text-zinc-900`}
                  >
                    {formatCurrency(ao.amount)}
                  </div>
                  {showPill && (
                    <div className="col-span-2 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromRoom(ao, parentOrderId);
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-sm border border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                        data-testid={`remove-from-room-${ao.orderId}`}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : !roomOrderAmount ? (
        <div className="px-3 py-6 text-center text-sm text-zinc-400 italic">
          No associated orders or room-service items yet
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main row card
// ---------------------------------------------------------------------------

/**
 * Props
 *  - row: the page-level pre-grouped record
 *      { parentOrderId, roomNumber, guestName, checkInDateTime, _raw }
 *  - detailCache: Map<parentOrderId, transformedOrder>  (from page; survives re-renders, cleared on date change)
 *  - onDetailResolved: (parentOrderId, transformedOrder) => void
 *      Called the FIRST time a detail fetch resolves, so the page can:
 *        (a) feed the summary bar incremental totals (Phase 4.5)
 *        (b) re-evaluate the Paid/Unpaid filter on this row
 *
 *  CR-004 Phase 2 PR-2 — Remove-from-Room props (all optional; the pill is
 *  hidden if any are missing, so the component still renders correctly when
 *  used without the page-level wiring):
 *  - canRemoveFromRoom: boolean (operator has the order_unpaid permission)
 *  - isWithinMutationWindow: boolean (selectedDate is today/yesterday)
 *  - onRemoveFromRoom: (srmOrder, parentOrderId) => void
 *  (optimisticRemovedIds prop removed 2026-05-01 — page now uses surgical
 *   cache invalidation; refreshed associatedOrders list is authoritative.)
 */
const RoomRowCard = ({
  row,
  detailCache,
  onDetailResolved,
  canRemoveFromRoom = false,
  isWithinMutationWindow = false,
  onRemoveFromRoom,
}) => {
  const cached = detailCache?.get(row.parentOrderId) || null;

  const [detail, setDetail] = useState(cached);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // -------------------------------------------------------------------------
  // Fire detail fetch on mount (and on retry). Skip when cache hit.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (cached) {
      setDetail(cached);
      setIsLoading(false);
      setError(null);
      return undefined;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getSingleOrderRoom(row.parentOrderId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setIsLoading(false);
        // Cache + notify the page exactly once.
        if (detailCache && !detailCache.has(row.parentOrderId)) {
          detailCache.set(row.parentOrderId, d);
        }
        if (onDetailResolved) onDetailResolved(row.parentOrderId, d);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error(
          '[RoomRowCard] getSingleOrderRoom failed for parentOrderId=' +
            row.parentOrderId,
          err
        );
        setError(err?.message || 'Failed to load room detail');
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // retryKey is the explicit knob the user pulls to refire the fetch.
    // detailCache identity change (parent rebuilt the map on date change)
    // also re-fires intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.parentOrderId, retryKey, detailCache]);

  // -------------------------------------------------------------------------
  // Derived numbers (Phase 4.1 locked formulas)
  // -------------------------------------------------------------------------
  const numbers = useMemo(() => {
    if (!detail || !detail.roomInfo) {
      return {
        transferredCount: null,
        food: null,
        total: null,
        paid: null,
        outstanding: null,
        discount: null,
        rent: null,
        advance: null,
        balance: null,
        roomOrderAmount: null,
        associatedOrders: [],
      };
    }
    // BUG-048 — owner-locked calculation model (2026-05-12).
    // Model:
    //   room_info.room_price       = fixed room rent
    //   room_info.advance_payment  = paid at check-in
    //   room_info.balance_payment  = original balance owed; persists as a
    //                                record after settlement (backend does not
    //                                zero it).
    //   order_amount               = (settled)  checkout collection
    //                                            = balance + associated + room_service
    //                              | (in-house) running room-service tally on
    //                                            the RM parent (CR-004 Phase 4.1).
    //   discount                   = room_info.discount_amount ONLY (no derivation).
    const ri = detail.roomInfo;
    const roomOrderAmount = parseFloat(detail.amount) || 0;
    const associatedOrders = detail.associatedOrders || [];
    const associatedTotal = associatedOrders.reduce(
      (s, o) => s + (parseFloat(o.amount) || 0),
      0
    );
    const rent             = parseFloat(ri.roomPrice)      || 0;
    const advance          = parseFloat(ri.advancePayment) || 0;
    const balance          = parseFloat(ri.balancePayment) || 0;
    const receiveBalance   = parseFloat(ri.receiveBalance) || 0;
    const isFullySettled   = detail.fOrderStatus === 6;
    const explicitDiscount = parseFloat(ri.discountAmount) || 0;

    // Settled  → strip balance + associated out of order_amount to isolate
    //            genuine room-service spend.
    // In-house → existing CR-004 Phase 4.1 behaviour (order_amount is the
    //            running room-service tally).
    const roomService = isFullySettled
      ? Math.max(0, roomOrderAmount - balance - associatedTotal)
      : roomOrderAmount;

    const food        = associatedTotal + roomService;
    const total       = rent + food;
    const paid        = isFullySettled
      ? Math.min(advance + roomOrderAmount, total)
      : advance + receiveBalance;
    const outstanding = Math.max(0, total - paid);
    const discount    = explicitDiscount; // NO derivation — owner-locked.
    return {
      transferredCount: associatedOrders.length,
      food,
      total,
      paid,
      outstanding,
      discount,
      rent,
      advance,
      balance,
      roomOrderAmount,
      associatedOrders,
    };
  }, [detail]);

  // Prefer roomInfo-sourced fields when available (Phase 4.1 extension).
  const displayGuestName =
    detail?.roomInfo?.guestName || row.guestName || 'Guest';
  // BUG-061 (Wave 7): For in-house rooms, roomInfo.checkInDate may be absent.
  // Fallback to detail.createdAt (order creation time = check-in time).
  const displayCheckInIso =
    detail?.roomInfo?.checkInDate || row.checkInDateTime || detail?.createdAt || null;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleToggle = useCallback(() => {
    if (error || isLoading) return; // can't expand a failed/loading row
    setIsExpanded((v) => !v);
  }, [error, isLoading]);

  const handleRetry = useCallback((e) => {
    e.stopPropagation();
    setRetryKey((k) => k + 1);
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const Chevron = isExpanded ? ChevronDown : ChevronRight;
  const isInteractive = !error && !isLoading;
  const balanceIsRed = numbers.outstanding > 0;

  return (
    <div
      className="bg-white border border-zinc-200 rounded-sm overflow-hidden"
      data-testid={`room-row-${row.parentOrderId}`}
    >
      {/* Collapsed line */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={!isInteractive}
        className={`w-full px-4 py-3 flex items-center gap-4 text-sm text-left transition-colors ${
          isInteractive
            ? 'hover:bg-zinc-50 cursor-pointer'
            : 'cursor-default'
        }`}
        data-testid={`room-row-${row.parentOrderId}-toggle`}
      >
        {/* Chevron */}
        <Chevron
          className={`w-4 h-4 flex-shrink-0 ${
            isInteractive ? 'text-zinc-400' : 'text-zinc-300'
          }`}
        />
        {/* Room number */}
        <div className="w-20 font-mono font-semibold text-zinc-900 flex-shrink-0">
          {row.roomNumber || '—'}
        </div>
        {/* Guest name */}
        <div className="flex-1 min-w-0 truncate text-zinc-900">
          {displayGuestName}
        </div>
        {/* Check-in datetime */}
        <div className="w-32 font-mono text-zinc-600 flex-shrink-0">
          {formatCheckInDateTime(displayCheckInIso)}
        </div>
        {/* Transferred count */}
        <div className="w-28 text-zinc-600 text-xs flex-shrink-0">
          {isLoading ? (
            <PlaceholderCell width="w-20" />
          ) : error ? (
            <span className="text-zinc-300">—</span>
          ) : (
            <span className="font-mono">
              {numbers.transferredCount}{' '}
              <span className="text-zinc-400">transferred</span>
            </span>
          )}
        </div>
        {/* Food cell removed per user request — value still computed in
            `numbers.food` and surfaced in the SummaryBar + expanded ROOM
            BILLING card. */}
        {/* Total */}
        <div className="w-24 text-right font-mono tabular-nums flex-shrink-0">
          {isLoading ? (
            <PlaceholderCell width="w-14 ml-auto" />
          ) : error ? (
            <span className="text-zinc-300">—</span>
          ) : (
            <span className="text-zinc-900">{formatCurrency(numbers.total)}</span>
          )}
        </div>
        {/* Paid — CR-004 Phase 2 PR-1. Neutral colour (informational, not
            success/destructive). Same loading/error treatment as Total. */}
        <div className="w-20 text-right font-mono tabular-nums flex-shrink-0">
          {isLoading ? (
            <PlaceholderCell width="w-12 ml-auto" />
          ) : error ? (
            <span className="text-zinc-300">—</span>
          ) : (
            <span className="text-zinc-900">{formatCurrency(numbers.paid)}</span>
          )}
        </div>
        {/* Discount — BE-2 §4.1 wired 2026-05-01. Renders only when > 0
            (silent on healthy rooms). Amber to distinguish from
            Outstanding's red. */}
        <div className="w-20 text-right font-mono tabular-nums flex-shrink-0">
          {isLoading ? (
            <PlaceholderCell width="w-12 ml-auto" />
          ) : error ? (
            <span className="text-zinc-300">—</span>
          ) : (numbers.discount || 0) > 0 ? (
            <span
              className="font-semibold text-amber-700"
              data-testid={`room-row-${row.parentOrderId}-discount`}
              title="Lodging discount or under-collection"
            >
              {formatCurrency(numbers.discount)}
            </span>
          ) : (
            <span className="text-zinc-300">—</span>
          )}
        </div>
        {/* Outstanding */}
        <div className="w-24 text-right font-mono tabular-nums flex-shrink-0">
          {isLoading ? (
            <PlaceholderCell width="w-14 ml-auto" />
          ) : error ? (
            <div className="flex items-center justify-end gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span
                onClick={handleRetry}
                className="text-xs text-red-600 hover:text-red-800 underline cursor-pointer flex items-center gap-1"
                role="button"
                data-testid={`room-row-${row.parentOrderId}-retry`}
              >
                <RotateCcw className="w-3 h-3" /> Retry
              </span>
            </div>
          ) : (
            <span
              className={`font-semibold ${
                balanceIsRed ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(numbers.outstanding)}
            </span>
          )}
        </div>
      </button>

      {/* Per-row error inline message (below the row) */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      {/* Expanded section */}
      {isExpanded && !error && !isLoading && detail && (
        <div
          className="px-4 py-4 bg-zinc-50 border-t border-zinc-200"
          data-testid={`room-row-${row.parentOrderId}-expanded`}
        >
          <div className="flex items-stretch gap-4 flex-wrap">
            <RoomBillingCard
              rent={numbers.rent}
              advance={numbers.advance}
              balance={numbers.balance}
            />
            <TransferredOrdersTable
              associatedOrders={numbers.associatedOrders}
              roomOrderAmount={numbers.roomOrderAmount}
              parentOrderId={row.parentOrderId}
              canRemoveFromRoom={canRemoveFromRoom}
              isWithinMutationWindow={isWithinMutationWindow}
              onRemoveFromRoom={onRemoveFromRoom}
              isFullySettled={detail?.fOrderStatus === 6}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomRowCard;
