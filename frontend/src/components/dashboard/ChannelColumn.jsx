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
  const sortedItems = useMemo(() => {
    return sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY);
  }, [filteredItems]);

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
        {sortedItems.length === 0 ? (
          <div 
            className="flex items-center justify-center h-32 text-sm"
            style={{ color: COLORS.grayText }}
          >
            No orders
          </div>
        ) : (
          <div 
            className="grid gap-2"
            style={{ 
              gridTemplateColumns: viewType === 'table' 
                ? `repeat(${actualColumns}, ${TABLE_CARD_WIDTH}px)` 
                : `repeat(${actualColumns}, 1fr)`,
            }}
          >
            {sortedItems.map((item) => {
              const key = item.id || `${channel.id}-${item.orderId}`;
              
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
                    isEngaged={isTableEngaged?.(item.tableId)}
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
                  isEngaged={isTableEngaged?.(item.tableId)}
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
                  onCancelOrder={onCancelOrder}
                  onItemStatusChange={onItemStatusChange}
                  onFoodTransfer={onFoodTransfer ? (order, foodItem) => onFoodTransfer(order, foodItem, item) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelColumn;
