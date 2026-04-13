import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { COLORS } from '../../constants';
import ChannelColumn from './ChannelColumn';

// LocalStorage keys for column layout (same as StatusConfigPage)
const LAYOUT_TABLE_VIEW_KEY = 'mygenie_layout_table_view';
const LAYOUT_ORDER_VIEW_KEY = 'mygenie_layout_order_view';

// Default max columns per view type (fallback if nothing in localStorage)
const DEFAULT_LAYOUT_TABLE = { dineIn: 2, takeAway: 2, delivery: 2, room: 2 };
const DEFAULT_LAYOUT_ORDER = { dineIn: 1, takeAway: 1, delivery: 1, room: 1 };

// Read layout from localStorage with fallback
const getLayoutFromStorage = (viewType) => {
  const key = viewType === 'table' ? LAYOUT_TABLE_VIEW_KEY : LAYOUT_ORDER_VIEW_KEY;
  const defaults = viewType === 'table' ? DEFAULT_LAYOUT_TABLE : DEFAULT_LAYOUT_ORDER;
  
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse layout from localStorage:', e);
  }
  return defaults;
};

// Channel order for arrow navigation
const CHANNEL_ORDER = ['dineIn', 'takeAway', 'delivery', 'room'];

// Card unit sizes (card width + gap)
const TABLE_CARD_UNIT = 168; // 160px card + 8px gap
const ORDER_CARD_UNIT = 308; // 300px card + 8px gap
const CHANNEL_PADDING = 16;  // p-2 = 8px each side

// Card widths (for pixel-based column sizing)
const TABLE_CARD_WIDTH = 168; // 160px + gap
const ORDER_CARD_WIDTH = 320; // Wider for order cards

/**
 * ChannelColumnsLayout - Main container for channel-based column layout
 * 
 * New Behavior:
 * - Each channel has a "max columns" setting (default 2 for table view, 1 for order view)
 * - Actual columns = min(orderCount, maxColumns) - auto-sizes based on content
 * - 0 orders = channel hidden (0 columns)
 * - Arrow buttons transfer max columns between adjacent channels
 * - Drag also transfers columns
 */
const ChannelColumnsLayout = ({
  channels,          // Array of { id, name, items, enabled }
  viewType,          // 'table' | 'order'
  onItemClick,
  // Card handlers passed through
  onMarkReady,
  onMarkServed,
  onBillClick,
  onCancelOrder,
  onItemStatusChange,
  onToggleSnooze,
  onConfirmOrder,
  onUpdateStatus,
  onFoodTransfer,
  // Permissions
  hasPermission,
  // Other
  snoozedOrders,
  currencySymbol,
  isTableEngaged,
  isOrderEngaged,
  searchQuery,
  matchingIds,
  onHideColumn,      // Handler to hide a column
}) => {
  const containerRef = useRef(null);
  
  // Load defaults from localStorage (or fallback to hardcoded defaults)
  const [maxColumns, setMaxColumns] = useState(() => getLayoutFromStorage(viewType));

  // Reset to localStorage values when viewType changes
  useEffect(() => {
    setMaxColumns(getLayoutFromStorage(viewType));
    console.log(`%c[Layout] viewType changed to "${viewType}", loaded from localStorage`, 'color: #f59e0b; font-weight: bold;');
  }, [viewType]);

  // Clean up stale localStorage from previous implementation
  useEffect(() => {
    try { window.localStorage.removeItem('mygenie_channel_max_columns'); } catch (_) {}
  }, []);

  // Filter to only enabled channels
  const enabledChannels = useMemo(() => {
    return channels.filter(c => c.enabled !== false);
  }, [channels]);

  // Calculate actual columns for each channel based on order count
  const getActualColumns = useCallback((channelId, orderCount) => {
    if (orderCount === 0) return 0; // Auto-hide when no orders
    
    const max = maxColumns[channelId] ?? (viewType === 'table' ? 2 : 1);
    return Math.min(orderCount, max);
  }, [maxColumns, viewType]);

  // Arrow click handler
  // `<` = DECREASE this channel by 1 (min 1)
  // `>` = INCREASE this channel by 1 (no max limit)
  // No transfer between channels — each is independent
  const handleArrowClick = useCallback((channelId, direction) => {
    console.log(`%c[Arrow] ${direction === 'left' ? 'DECREASE(<)' : 'INCREASE(>)'} on "${channelId}"`, 'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px;');

    setMaxColumns(prev => {
      const currentMax = prev[channelId] ?? 2;

      if (direction === 'left') {
        if (currentMax <= 1) {
          console.log(`[Arrow] BLOCKED: "${channelId}" already at min (1)`);
          return prev;
        }
        const newVal = currentMax - 1;
        console.log(`%c[Arrow] ${channelId} ${currentMax}→${newVal}`, 'color: #22c55e; font-weight: bold;');
        return { ...prev, [channelId]: newVal };
      }

      if (direction === 'right') {
        const newVal = currentMax + 1;
        console.log(`%c[Arrow] ${channelId} ${currentMax}→${newVal}`, 'color: #22c55e; font-weight: bold;');
        return { ...prev, [channelId]: newVal };
      }

      return prev;
    });
  }, []);

  // Calculate total width needed for layout (kept for potential future use)
  // Render columns with border separators
  const renderColumns = () => {
    const elements = [];
    const visibleChannels = enabledChannels.filter(c => {
      const actualCols = getActualColumns(c.id, c.items?.length || 0);
      return actualCols > 0;
    });

    // Log current layout state
    const layoutSummary = enabledChannels.map(c => {
      const items = c.items?.length || 0;
      const actual = getActualColumns(c.id, items);
      const max = maxColumns[c.id] ?? 2;
      return `${c.name}: ${actual}col (max:${max}, items:${items})`;
    });
    console.log(`%c[Layout] ${layoutSummary.join(' | ')}`, 'color: #8b5cf6;');
    
    enabledChannels.forEach((channel, index) => {
      const actualColumns = getActualColumns(channel.id, channel.items?.length || 0);
      const channelMax = maxColumns[channel.id] ?? (viewType === 'table' ? 2 : 1);
      
      // Skip channels with 0 actual columns (no orders)
      if (actualColumns === 0) return;

      // Determine if this is the last visible channel
      const visibleIndex = visibleChannels.findIndex(c => c.id === channel.id);
      const isLast = visibleIndex === visibleChannels.length - 1;

      // Add column
      elements.push(
        <ChannelColumn
          key={channel.id}
          channel={channel}
          actualColumns={actualColumns}
          maxColumns={channelMax}
          viewType={viewType}
          isLast={isLast}
          hasLeftArrow={true}
          hasRightArrow={true}
          onLeftArrowClick={() => handleArrowClick(channel.id, 'left')}
          onRightArrowClick={() => handleArrowClick(channel.id, 'right')}
          onItemClick={onItemClick}
          onMarkReady={onMarkReady}
          onMarkServed={onMarkServed}
          onBillClick={onBillClick}
          onCancelOrder={onCancelOrder}
          onItemStatusChange={onItemStatusChange}
          onToggleSnooze={onToggleSnooze}
          onConfirmOrder={onConfirmOrder}
          onUpdateStatus={onUpdateStatus}
          onFoodTransfer={onFoodTransfer}
          hasPermission={hasPermission}
          snoozedOrders={snoozedOrders}
          currencySymbol={currencySymbol}
          isTableEngaged={isTableEngaged}
          isOrderEngaged={isOrderEngaged}
          searchQuery={searchQuery}
          matchingIds={matchingIds}
          onHideColumn={onHideColumn}
        />
      );
    });
    
    return elements;
  };

  if (enabledChannels.length === 0) {
    return (
      <div 
        className="flex items-center justify-center h-64 text-sm"
        style={{ color: COLORS.grayText }}
      >
        No channels configured
      </div>
    );
  }

  // Check if all channels have 0 orders
  const allEmpty = enabledChannels.every(c => (c.items?.length || 0) === 0);
  if (allEmpty) {
    return (
      <div 
        className="flex items-center justify-center h-64 text-sm"
        style={{ color: COLORS.grayText }}
      >
        No active orders
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="channel-columns-layout"
      className="flex h-full gap-0 overflow-x-auto"
      style={{ 
        minHeight: '500px',
        backgroundColor: COLORS.sectionBg,
      }}
    >
      {renderColumns()}
    </div>
  );
};

export default ChannelColumnsLayout;
