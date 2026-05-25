import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { COLORS } from '../../constants';
import { sortByActiveFirst, TABLE_STATUS_PRIORITY } from '../../utils';
import TableCard from '../cards/TableCard';
import OrderCard from '../cards/OrderCard';

// Card widths
const TABLE_CARD_WIDTH = 160;
const ORDER_CARD_WIDTH = 300;
const GAP = 8;
const PADDING = 16;

/**
 * ChannelColumn - Single column for a channel (Dine-In, TakeAway, Delivery, Room)
 * 
 * New Behavior:
 * - actualColumns determines grid width (not percentage)
 * - Arrow buttons to transfer columns to adjacent channels
 * - Auto-hides when 0 orders (handled by parent)
 * - Always sorts by priority: 7→5→2→1→10→8→9→available(last)
 */
const ChannelColumn = ({
  channel,           // { id, name, items, enabled }
  actualColumns,     // Current column count based on order count
  maxColumns,        // Max column setting for this channel
  viewType,          // 'table' | 'order'
  // CR (May-2026) channel-view stability: 'channel' = use stable status-
  // independent sort below (cards do not move when only fOrderStatus
  // changes). 'status' = preserve the legacy status-priority sort
  // (sortByActiveFirst). Default 'channel' so any future caller that
  // forgets to pass the prop still gets the owner-approved behaviour.
  groupingMode = 'channel',
  isLast,            // Is this the last visible channel (no border-right)
  hasLeftArrow,      // Show left arrow button
  hasRightArrow,     // Show right arrow button
  onLeftArrowClick,  // Transfer column to left neighbor
  onRightArrowClick, // Transfer column to right neighbor
  onItemClick,
  // Card handlers
  onMarkReady,
  onMarkServed,
  onBillClick,
  onCancelOrder,
  onItemStatusChange,
  onToggleSnooze,
  onConfirmOrder,
  onUpdateStatus,
  onFoodTransfer,    // Handler for food transfer
  // Permissions
  hasPermission,
  // Other
  snoozedOrders,
  currencySymbol,
  isTableEngaged,
  isOrderEngaged,
  searchQuery,
  matchingIds,
  onHideColumn,      // Handler to hide this column
}) => {
  // Filter by search if applicable
  const filteredItems = useMemo(() => {
    if (!channel.items) return [];
    if (matchingIds === null) return channel.items;
    return channel.items.filter(item => matchingIds.has(item.id || `${channel.id}-${item.orderId}`));
  }, [channel.items, matchingIds, channel.id]);

  // Sort items by priority: 7→5→2→1→10→8→9→available(last)
  // Always applies - no toggle
  // -----------------------------------------------------------------
  // CR (May-2026) channel-view stability: in 'channel' grouping mode the
  // card position must NOT change when only the order's fOrderStatus
  // flips (Accept/Ready/Serve/Dispatch). The legacy
  // sortByActiveFirst(TABLE_STATUS_PRIORITY) keyed on fOrderStatus and
  // therefore reshuffled cards on every status-changing action. We now
  // branch: 'status' mode keeps the byte-identical legacy sort (no
  // regression in status view; within a same-status column the priority
  // key is a no-op anyway), 'channel' mode uses a stable status-
  // independent comparator gated on viewType.
  //
  // Stable comparator rules:
  //   - 'table' viewType → label-numeric ascending (table-floor mental
  //     model); fallback locale string compare on label.
  //   - 'order' viewType → createdAt ascending / FIFO (kitchen-dispatch
  //     mental model); fallback orderNumber ascending; final fallback
  //     label-numeric for determinism.
  // Available/disabled rows (no occupied order) are pre-bucketed last so
  // the "available tables at the bottom of Dine-In" affordance survives
  // without re-introducing status-priority for occupied cards.
  // None of the comparator keys (label, tableNumber, createdAt,
  // orderNumber, status==='available'/'disabled') are mutated by any
  // status-changing action handler or socket update path → cards are
  // provably stable across Accept/Ready/Serve/Dispatch in channel view.
  // BUG-070 (Wave 5, May-2026): group items by `sectionName` and emit an
  // array of { key, name, items } groups. Section order = API insertion
  // order (Q3 owner directive). Items without `sectionName` go into a
  // `__no_section__` bucket rendered at the top with no header (Q4).
  //
  // Sort behavior within each section is identical to the legacy
  // `sortedItems` logic — occupied first then available, with the
  // status-priority or channel-stable comparator based on `groupingMode`.
  const sortedGroups = useMemo(() => {
    if (filteredItems.length === 0) return [];

    // Wave 5 scope correction (2026-05-17): Status View stays flat.
    // groupingMode='status' is the Status-View signal — bypass section
    // bucketing entirely and emit one no-header bucket sorted by status
    // priority (byte-identical to legacy Status-View render).
    if (groupingMode === 'status') {
      return [{
        key: '__no_section__',
        name: null,
        items: sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY),
      }];
    }

    // Step 1: bucket by `sectionName` preserving API insertion order
    const buckets = new Map();
    filteredItems.forEach(it => {
      const key = it.sectionName ?? '__no_section__';
      if (!buckets.has(key)) {
        buckets.set(key, { key, name: it.sectionName ?? null, items: [] });
      }
      buckets.get(key).items.push(it);
    });

    // Step 2: prep comparators (same as legacy sortedItems)
    const isAvailable = (it) => it?.status === 'available' || it?.status === 'disabled';
    const labelNumeric = (it) => {
      const str = String(it?.label ?? it?.tableNumber ?? it?.id ?? '');
      const num = parseInt(str.replace(/\D/g, ''), 10);
      return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
    };
    const labelString = (it) => String(it?.label ?? it?.tableNumber ?? it?.id ?? '');
    const tableCompare = (a, b) => {
      const an = labelNumeric(a);
      const bn = labelNumeric(b);
      if (an !== bn) return an - bn;
      return labelString(a).localeCompare(labelString(b));
    };
    const orderCompare = (a, b) => {
      const at = a?.createdAt ?? a?.order?.createdAt ?? '';
      const bt = b?.createdAt ?? b?.order?.createdAt ?? '';
      if (at && bt && at !== bt) return at < bt ? -1 : 1;
      if (at && !bt) return -1;
      if (!at && bt) return 1;
      const an = Number(a?.orderNumber);
      const bn = Number(b?.orderNumber);
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
      return tableCompare(a, b);
    };
    const compare = viewType === 'table' ? tableCompare : orderCompare;

    // Step 3: within each bucket, sort occupied then available
    for (const bucket of buckets.values()) {
      if (groupingMode === 'status') {
        bucket.items = sortByActiveFirst(bucket.items, TABLE_STATUS_PRIORITY);
      } else {
        const occupied = [];
        const available = [];
        bucket.items.forEach(it => {
          if (isAvailable(it)) available.push(it);
          else occupied.push(it);
        });
        occupied.sort(compare);
        available.sort(compare);
        bucket.items = [...occupied, ...available];
      }
    }

    // Step 4: hoist `__no_section__` to top (Q4)
    const arr = Array.from(buckets.values());
    const noSecIdx = arr.findIndex(b => b.key === '__no_section__');
    if (noSecIdx > 0) {
      const [ns] = arr.splice(noSecIdx, 1);
      arr.unshift(ns);
    }
    return arr;
  }, [filteredItems, groupingMode, viewType]);

  // Count active orders (non-available, non-reserved)
  const activeCount = useMemo(() => {
    return channel.items?.filter(item => 
      !['available', 'reserved', 'disabled'].includes(item.status)
    ).length || 0;
  }, [channel.items]);

  const totalCount = channel.items?.length || 0;

  // Calculate width based on actual columns
  const cardWidth = viewType === 'table' ? TABLE_CARD_WIDTH : ORDER_CARD_WIDTH;
  const columnWidth = (actualColumns * cardWidth) + ((actualColumns - 1) * GAP) + PADDING;

  return (
    <div
      data-testid={`channel-column-${channel.id}`}
      className="flex flex-col h-full bg-white rounded-lg shadow-sm overflow-hidden flex-shrink-0"
      style={{ 
        width: `${columnWidth}px`,
        minWidth: `${columnWidth}px`,
        borderRight: isLast ? 'none' : `1px solid ${COLORS.borderGray}`,
      }}
    >
      {/* Column Header with Arrow Buttons */}
      <div 
        className="flex items-center justify-between px-2 py-1 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        {/* Left Arrow - DECREASE this channel's columns (min 1) */}
        <button
          data-testid={`arrow-left-${channel.id}`}
          onClick={onLeftArrowClick}
          disabled={maxColumns <= 1}
          className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Decrease columns"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
        </button>

        {/* Channel Name & Count */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm whitespace-nowrap" style={{ color: COLORS.darkText }}>
            {channel.name}
          </span>
          <span 
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: COLORS.borderGray,
              color: COLORS.grayText,
            }}
          >
            {activeCount}
          </span>
        </div>

        {/* Right Arrow - INCREASE this channel's columns */}
        <button
          data-testid={`arrow-right-${channel.id}`}
          onClick={onRightArrowClick}
          className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Increase columns"
        >
          <ChevronRight className="w-5 h-5" style={{ color: COLORS.grayText }} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {sortedGroups.length === 0 ? (
          <div 
            className="flex items-center justify-center h-32 text-sm"
            style={{ color: COLORS.grayText }}
          >
            No orders
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedGroups.map(group => (
              <div key={group.key}>
                {/* BUG-070 (Wave 5, May-2026): section header chip.
                    Hidden when `group.name` is null (`__no_section__`
                    bucket — Q4 owner directive + Status-View bypass).
                    May-17 follow-up #2: orange-pill style (primaryOrange
                    background + white text) for maximum prominence on
                    brand. */}
                {group.name && (
                  <div className="mb-2">
                    <span
                      data-testid={`channel-column-section-header-${channel.id}-${group.key}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: COLORS.primaryOrange,
                        color: 'white',
                      }}
                    >
                      {group.name}
                    </span>
                  </div>
                )}
                <div 
                  className="grid gap-2"
                  style={{ 
                    gridTemplateColumns: viewType === 'table' 
                      ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` 
                      : `repeat(${actualColumns}, 1fr)`,
                  }}
                >
                  {group.items.map((item) => {
                    const key = item.id || `${channel.id}-${item.orderId}`;
                    // BUG-279: Available / reserved rows (no orderId) are Table-View-only.
                    // Order View = order-centric → skip entries that are not real orders.
                    if (viewType === 'order' && !item.orderId) return null;
                    
                    // Table View - render TableCard
                    if (viewType === 'table') {
                      return (
                        <TableCard
                          key={key}
                          table={item}
                          onClick={onItemClick}
                          onOpenModal={onItemClick}
                          onUpdateStatus={onUpdateStatus}
                          onBillClick={onBillClick}
                          onConfirmOrder={onConfirmOrder}
                          onCancelOrder={onCancelOrder}
                          onMarkReady={onMarkReady}
                          onMarkServed={onMarkServed}
                          isSnoozed={snoozedOrders?.has(item.id)}
                          onToggleSnooze={onToggleSnooze}
                          currencySymbol={currencySymbol}
                          isEngaged={isOrderEngaged?.(item.orderId) || isTableEngaged?.(item.tableId)}
                        />
                      );
                    }
                    
                    // List View - render OrderCard
                    const order = item.order || item;
                    return (
                      <OrderCard
                        key={key}
                        order={order}
                        orderType={item.orderType || channel.id}
                        tableLabel={item.label || item.tableNumber}
                        isSnoozed={snoozedOrders?.has(item.id)}
                        isEngaged={isOrderEngaged?.(order.orderId) || isTableEngaged?.(item.tableId)}
                        canCancelOrder={hasPermission?.('order_cancel')}
                        canMergeOrder={channel.id === 'dineIn' && hasPermission?.('merge_table')}
                        canShiftTable={channel.id === 'dineIn' && hasPermission?.('transfer_table')}
                        canFoodTransfer={channel.id === 'dineIn' && hasPermission?.('food_transfer')}
                        canPrintBill={hasPermission?.('print_icon')}
                        canBill={hasPermission?.('bill')}
                        onToggleSnooze={onToggleSnooze}
                        onEdit={() => onItemClick?.(item)}
                        onMarkReady={() => onMarkReady?.(item)}
                        onMarkServed={() => onMarkServed?.(item)}
                        onBillClick={() => onBillClick?.(item)}
                        onAccept={(order) => onConfirmOrder?.(item)}
                        onCancelOrder={onCancelOrder}
                        onItemStatusChange={onItemStatusChange}
                        onFoodTransfer={onFoodTransfer ? (order, foodItem) => onFoodTransfer(order, foodItem, item) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelColumn;
