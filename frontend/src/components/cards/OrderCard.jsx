import { useState } from "react";
import { User, X, ChevronDown, ChevronUp, MapPin, Clock, Printer, ShoppingBag, Bike, Utensils, DoorOpen, Circle, CheckCircle2, Check, FileText, GitMerge, ArrowLeftRight, CornerRightUp, Loader2 } from "lucide-react";
import { COLORS, SOURCE_COLORS } from "../../constants";
import OrderTimeline from "./OrderTimeline";
import { printOrder, completePrepaidOrder } from "../../api/services/orderService";
import { useToast } from "../../hooks/use-toast";
import { useMenu, useRestaurant } from "../../contexts";
import { getStationsFromOrderItems } from "../../api/services/stationService";
import StationPickerModal from "../modals/StationPickerModal";

/**
 * Unified Order Card - Handles Dine-In, TakeAway, Delivery, Room
 * Compact design for Order View (4 cards per row, 280px min-width)
 * 
 * REDESIGNED: April 2026
 * - Header: [Logo][Table/Name][Time] [Amount] [Merge][Shift][Cancel]
 * - Items: With food transfer icon (Dine-In), Ready/Serve circles
 * - Footer: Dynamic based on fOrderStatus, 44px touch targets
 */
const OrderCard = ({
  order,
  orderType,
  tableLabel,
  isSnoozed,
  isEngaged,
  // Permission flags (passed from parent)
  canCancelOrder = true,
  canMergeOrder = true,
  canShiftTable = true,
  canFoodTransfer = true,
  canPrintBill = true,  // print_icon permission
  canBill = true,       // bill permission
  onToggleSnooze,
  onEdit,
  onMarkReady,
  onMarkServed,
  onBillClick,
  onCancelOrder,
  onCancelItem,
  onAccept,
  onReject,
  onItemStatusChange,
  onMergeOrder,
  onTableShift,
  onFoodTransfer,
}) => {
  const [showServed, setShowServed] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [isPrintingKot, setIsPrintingKot] = useState(false);
  const [isPrintingBill, setIsPrintingBill] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [availableStations, setAvailableStations] = useState([]);
  const { toast } = useToast();
  const { getProductById } = useMenu();
  const { restaurant } = useRestaurant();

  if (!order) return null;

  const source = order.source || "own";
  const isOwn = source === "own";
  const isDineIn = orderType === "dineIn";
  const isDelivery = orderType === "delivery";
  const isTakeAway = orderType === "takeAway";
  const isRoom = orderType === "room" || order.isRoom;
  const orderId = order.orderId || order.id;
  const fOrderStatus = order.fOrderStatus || 1;
  const items = order.items || [];

  // Handle KOT print - with station picker
  const handlePrintKot = async (e) => {
    e.stopPropagation();
    if (!orderId || isPrintingKot) return;
    
    // Get stations from order items
    const stations = getStationsFromOrderItems(items, getProductById);
    console.log('[OrderCard] Stations for KOT:', stations);
    
    if (stations.length === 0) {
      toast({ title: "No KOT stations", description: "No items with stations found", variant: "destructive" });
      return;
    }
    
    if (stations.length === 1) {
      // Single station - print directly
      await executePrintKot([stations[0].station]);
    } else {
      // Multiple stations - show picker
      setAvailableStations(stations);
      setShowStationPicker(true);
    }
  };

  // Execute print KOT with selected stations
  const executePrintKot = async (selectedStations) => {
    setShowStationPicker(false);
    setIsPrintingKot(true);
    
    try {
      const stationKot = selectedStations.join(',');
      await printOrder(orderId, 'kot', stationKot);
      toast({ title: "KOT request sent", description: `Stations: ${stationKot}` });
    } catch (error) {
      console.error('[OrderCard] KOT print error:', error);
      toast({ title: "Failed to send KOT request", variant: "destructive" });
    } finally {
      setIsPrintingKot(false);
    }
  };

  // Handle Bill print
  const handlePrintBill = async (e) => {
    e.stopPropagation();
    if (!orderId || isPrintingBill) return;
    
    setIsPrintingBill(true);
    try {
      await printOrder(orderId, 'bill', null, order, restaurant?.serviceChargePercentage || 0);
      toast({ title: "Bill request sent", description: `Order #${orderId}` });
    } catch (error) {
      console.error('[OrderCard] Bill print error:', error);
      toast({ title: "Failed to send Bill request", variant: "destructive" });
    } finally {
      setIsPrintingBill(false);
    }
  };

  // BUG-274: Settle prepaid order (fOrderStatus 5 + paymentType 'prepaid')
  // Calls POST /api/v2/vendoremployee/order/paid-prepaid-order → backend emits update-order-paid
  // → socket handler removes order from context. No bill print here.
  const handleSettlePrepaid = async (e) => {
    e.stopPropagation();
    if (!orderId || isSettling) return;

    setIsSettling(true);
    try {
      await completePrepaidOrder(orderId, order?.serviceTax || 0, order?.tipAmount || 0);
      toast({ title: "Order settled", description: `Order #${orderId}` });
    } catch (error) {
      console.error('[OrderCard] Settle prepaid error:', error);
      toast({ title: "Failed to settle order", variant: "destructive" });
    } finally {
      setIsSettling(false);
    }
  };

  // Items grouped by status (items already defined above)
  const activeItems = items.filter(i => i.status !== "served" && i.status !== "cancelled");
  const servedItems = items.filter(i => i.status === "served");

  const isYetToConfirm = order.status === "yetToConfirm" || order.status === "pending";

  // ── Cancellation Logic ──
  // Permission-only check: Restaurant settings are validated on Order Entry page
  // Order Card shows action if user has permission; actual validation happens on action
  const isOrderCancelAllowed = canCancelOrder;

  // Header background color - neutral for all order types
  const getHeaderBgColor = () => {
    return '#F5F5F5';  // Light neutral gray for all
  };

  // Order type label for header
  const getOrderTypeLabel = () => {
    if (isRoom) return "Room";
    if (isDineIn) return "Dine In";
    if (isTakeAway) return "Take Away";
    if (isDelivery) return "Delivery";
    return "";
  };

  // Customer/Table display - For Dine-In show table number, else customer name
  const getDisplayName = () => {
    // For Dine-In: prioritize table label/number
    if (isDineIn) {
      if (tableLabel && tableLabel !== 'WC') return tableLabel;
      if (order.tableNumber) return `T${order.tableNumber}`;
      // Fallback to customer or WC
      if (order.customer && order.customer.trim() && order.customer !== 'Walk-In') {
        return order.customer;
      }
      return 'WC';
    }
    // For TakeAway/Delivery: show customer name only if it exists and is meaningful
    if (order.customer && order.customer.trim() && 
        order.customer !== 'Walk-In' && 
        order.customer !== 'Del' && 
        order.customer !== 'TA') {
      return order.customer;
    }
    return ''; // Don't show anything if no real customer name
  };

  // Source logo - Only show for aggregators (swiggy, zomato, etc.)
  // Skip MG logo for all own orders in Order View
  const renderLogo = () => {
    // For aggregators (swiggy, zomato, etc.) - always show logo
    if (!isOwn) {
      const color = SOURCE_COLORS[source] || SOURCE_COLORS.own;
      const letter = source === "swiggy" ? "S" : source === "zomato" ? "Z" : "O";
      return (
        <div
          className="w-6 h-6 rounded flex items-center justify-center font-bold text-white text-[10px] flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {letter}
        </div>
      );
    }
    // For all own orders - no logo
    return null;
  };

  // Get order type icon
  const renderOrderTypeIcon = () => {
    if (isTakeAway) return <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />;
    if (isDelivery) return <Bike className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />;
    if (isDineIn || orderType === 'walkIn') return <Utensils className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />;
    if (isRoom) return <DoorOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />;
    return null;
  };

  // Get item dot color based on status
  const getItemDotColor = (item) => {
    if (item.status === 'preparing') return COLORS.primaryOrange;
    if (item.status === 'ready') return COLORS.primaryGreen;
    return COLORS.grayText;
  };

  // Get item action icon config based on item status
  // ○ Empty circle (orange) = Preparing → tap to mark Ready
  // ◉ Filled circle (green) = Ready → tap to mark Serve
  const getItemActionConfig = (item) => {
    if (item.status === 'preparing') return { action: 'ready', color: COLORS.primaryOrange, icon: 'empty' };
    if (item.status === 'ready') return { action: 'serve', color: COLORS.primaryGreen, icon: 'filled' };
    return null;
  };

  // Handle item action (Ready/Serve)
  const handleItemAction = (item, action) => {
    console.log(`[OrderCard] ${action} item ${item.id} on order ${orderId}`);
    if (onItemStatusChange) {
      onItemStatusChange(order, item, action.toLowerCase());
    }
  };

  return (
    <div
      data-testid={`order-card-${orderId}`}
      className={`relative rounded-lg shadow-sm overflow-hidden mb-2 ${isSnoozed ? "opacity-60" : ""} ${isEngaged ? "pointer-events-none" : "cursor-pointer"}`}
      style={{ backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.borderGray}`, breakInside: 'avoid' }}
      onClick={isEngaged ? undefined : () => onEdit?.()}
    >
      {/* Engaged spinner overlay */}
      {isEngaged && (
        <div className="absolute inset-0 z-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
        </div>
      )}
      {/* ── HEADER — [Logo][Name][Time] [Amount] [Merge][Shift][Cancel] ── */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ backgroundColor: getHeaderBgColor() }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Section: Logo + Order Type + Name + Time */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Logo */}
          {renderLogo()}

          {/* Order Type Icon (shown for ALL order types) */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {renderOrderTypeIcon()}
          </div>

          {/* Table/Customer Name */}
          {getDisplayName() && (
            <span className="text-xs font-medium truncate" style={{ color: COLORS.darkText }}>
              {getDisplayName()}
            </span>
          )}
          
          {/* Timeline: ●──14m──●──3m──● */}
          <OrderTimeline 
            createdAt={order.createdAt}
            readyAt={order.readyAt}
            servedAt={order.servedAt}
            fOrderStatus={fOrderStatus}
          />
        </div>

        {/* Center: Amount - Bold + Large */}
        <span className="font-extrabold text-lg flex-shrink-0" style={{ color: COLORS.grayText }}>
          ₹{(order.amount || 0).toLocaleString()}
        </span>

        {/* Prepaid badge */}
        {order.paymentType === 'prepaid' && (
          <span data-testid={`prepaid-badge-${orderId}`} className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen }}>PAID</span>
        )}

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Snooze Button - Only for Yet to Confirm orders */}
          {isYetToConfirm && onToggleSnooze && (
            <button
              data-testid={`snooze-btn-${orderId}`}
              onClick={(e) => { 
                e.stopPropagation(); 
                onToggleSnooze(String(orderId)); 
              }}
              className={`min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center transition-colors ${isSnoozed ? "bg-orange-100" : "hover:bg-white/50"}`}
              title={isSnoozed ? "Unsnooze" : "Snooze"}
            >
              <Clock className="w-5 h-5" style={{ color: isSnoozed ? COLORS.primaryOrange : COLORS.grayText }} />
            </button>
          )}

          {/* Merge Order Button - Dine-In only, permission-gated */}
          {isDineIn && !isYetToConfirm && canMergeOrder && (
            <button
              data-testid={`merge-btn-${orderId}`}
              onClick={(e) => {
                e.stopPropagation();
                onMergeOrder?.(order);
              }}
              className="min-h-[44px] min-w-[44px] hover:bg-white/50 rounded-lg flex items-center justify-center"
              title="Merge Order"
            >
              <GitMerge className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          )}

          {/* Table Shift Button - Dine-In only, permission-gated */}
          {isDineIn && !isYetToConfirm && canShiftTable && (
            <button
              data-testid={`shift-btn-${orderId}`}
              onClick={(e) => {
                e.stopPropagation();
                onTableShift?.(order);
              }}
              className="min-h-[44px] min-w-[44px] hover:bg-white/50 rounded-lg flex items-center justify-center"
              title="Table Shift"
            >
              <ArrowLeftRight className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          )}

          {/* Address toggle for own delivery */}
          {isDelivery && isOwn && (
            <button
              data-testid={`address-btn-${orderId}`}
              className="min-h-[44px] min-w-[44px] hover:bg-white/50 rounded-lg flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                setShowAddress(!showAddress);
              }}
              title="View address"
            >
              <MapPin className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          )}
        </div>
      </div>

      {/* ── HEADER ROW 2: Order Note (same background, part of header) ── */}
      {order.orderNote && (
        <div 
          className="px-3 pb-2 flex items-start gap-1.5" 
          style={{ backgroundColor: getHeaderBgColor() }}
          onClick={(e) => e.stopPropagation()}
        >
          <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: COLORS.primaryOrange }} />
          <span className="text-xs" style={{ color: COLORS.darkText }}>
            {order.orderNote}
          </span>
        </div>
      )}

      {/* ── ADDRESS POPUP (own delivery) ── */}
      {showAddress && isDelivery && isOwn && (
        <div 
          className="px-3 py-1.5 border-b text-[10px]" 
          style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: COLORS.primaryOrange }} />
            <span style={{ color: COLORS.darkText }}>
              {order.deliveryAddress?.formatted || order.deliveryAddress?.address || "No address"}
            </span>
          </div>
        </div>
      )}

      {/* ── ITEMS SECTION — Compact for Delivery/TakeAway, normal for DineIn ── */}
      <div className={`px-3 border-b ${isDineIn ? 'py-1.5' : 'py-1'}`} style={{ borderColor: COLORS.borderGray }}>
        {activeItems.length > 0 ? (
          activeItems.map((item) => {
            const actionConfig = getItemActionConfig(item);
            const statusLabel = item.status === 'preparing' ? 'Preparing' : item.status === 'ready' ? 'Ready' : '';
            
            // Build variants/addons display string
            const variants = item.variation || [];
            const addons = item.addOns || [];
            
            // Parse variants - handle different structures
            const variantStr = variants.map(v => {
              if (typeof v === 'string') return v;
              // Check for name + labels array format (e.g., {name: "HALFNHALF", labels: ["Marinara"]})
              if (v.labels && Array.isArray(v.labels) && v.labels.length > 0) {
                const name = v.name || v.variant_name || v.variant_group || '';
                return `${name}: ${v.labels.join(', ')}`;
              }
              // Check for name + value format
              const name = v.name || v.variant_name || v.variant_group || '';
              const value = v.value || v.option_label || v.label || v.selected_option || '';
              if (name && value) return `${name}: ${value}`;
              return name || value || '';
            }).filter(Boolean).join(', ');
            
            // Parse addons - prefix with + 
            const addonStr = addons.map(a => {
              const name = a.name || a.addon_name || '';
              return name ? `+ ${name}` : '';
            }).filter(Boolean).join(', ');
            
            const detailsStr = [variantStr, addonStr].filter(Boolean).join(', ');
            
            // Item-level notes
            const itemNote = item.notes || '';
            
            // Item-level actions only for Dine-In (not TakeAway/Delivery)
            const showItemAction = isDineIn && actionConfig;
            
            return (
              <div key={item.id} className={isDineIn ? "py-1" : "py-0.5"}>
                {/* Main item row */}
                <div className="flex items-center gap-2">
                  {/* Food Transfer icon on LEFT - Dine-In only, permission-gated */}
                  {isDineIn && !isYetToConfirm && canFoodTransfer && (
                    <button
                      data-testid={`food-transfer-btn-${item.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFoodTransfer?.(order, item);
                      }}
                      className="min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0 -ml-2"
                      title="Transfer Item"
                    >
                      <CornerRightUp className="w-4 h-4" style={{ color: COLORS.grayText }} />
                    </button>
                  )}
                  {/* Item name + qty + details inline - SMALLER, SECONDARY */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px]" style={{ color: COLORS.grayText }}>
                      {item.name} ({item.qty})
                    </span>
                    {/* Variants/Addons inline - Gray italic (subtle) */}
                    {detailsStr && (
                      <div className="text-[9px] leading-tight italic" style={{ color: COLORS.grayText }}>
                        {detailsStr}
                      </div>
                    )}
                    {/* Item note inline */}
                    {itemNote && (
                      <div className="flex items-center gap-1 text-[9px] leading-tight">
                        <FileText className="w-2 h-2" style={{ color: COLORS.grayText }} />
                        <span className="italic" style={{ color: COLORS.grayText }}>
                          {itemNote}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Status label + action icon - ONLY for Dine-In - MORE PROMINENT */}
                  {showItemAction && (
                    <button
                      data-testid={`item-action-btn-${item.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemAction(item, actionConfig.action);
                      }}
                      className="min-h-[44px] px-3 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition-colors -mr-2 flex-shrink-0"
                      title={actionConfig.action === 'ready' ? 'Mark Ready' : 'Mark Served'}
                    >
                      <span className="text-xs font-semibold" style={{ color: actionConfig.color }}>
                        {statusLabel}
                      </span>
                      {actionConfig.icon === 'empty' ? (
                        <Circle className="w-5 h-5" style={{ color: actionConfig.color }} strokeWidth={2.5} />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" style={{ color: actionConfig.color }} strokeWidth={2.5} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-1.5 text-xs" style={{ color: COLORS.grayText }}>
            No active items
          </div>
        )}
      </div>

      {/* ── SERVED ITEMS COLLAPSED (44px touch target for toggle) ── */}
      {servedItems.length > 0 && (
        <div className="border-b" style={{ borderColor: COLORS.borderGray }}>
          <button
            data-testid={`served-toggle-${orderId}`}
            className="w-full px-3 min-h-[40px] flex items-center justify-between text-xs hover:bg-gray-50"
            style={{ color: COLORS.grayText }}
            onClick={(e) => {
              e.stopPropagation();
              setShowServed(!showServed);
            }}
          >
            <span>▼ Served ({servedItems.length})</span>
            {showServed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showServed && (
            <div className="px-3 pb-2">
              {servedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS.primaryGreen }}
                  />
                  <span className="flex-1 text-xs" style={{ color: COLORS.grayText }}>
                    {item.name} ({item.qty})
                  </span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: COLORS.grayText }}>
                    Served
                  </span>
                  {/* Served checkmark (no action) */}
                  <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2">
                    <Check className="w-5 h-5" style={{ color: COLORS.grayText }} strokeWidth={2.5} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RIDER SECTION (Delivery + Aggregator only) ── */}
      {isDelivery && !isOwn && (
        <div
          className="px-3 py-2 border-b flex items-center gap-2"
          style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: COLORS.borderGray }}
          >
            <User className="w-3 h-3" style={{ color: COLORS.grayText }} />
          </div>
          <div className="flex-1 min-w-0">
            {order.rider ? (
              <>
                <div className="text-xs font-medium truncate" style={{ color: COLORS.darkText }}>{order.rider}</div>
                <div className="text-[10px]" style={{ color: COLORS.grayText }}>{order.riderPhone}</div>
              </>
            ) : (
              <div className="text-xs" style={{ color: COLORS.grayText }}>Awaiting Runner</div>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ACTIONS — Dynamic based on fOrderStatus, 44px touch targets ── */}
      <div 
        className="px-3 py-2 flex items-center justify-between gap-2" 
        style={{ backgroundColor: COLORS.sectionBg }}
        onClick={(e) => e.stopPropagation()}
      >
        {isYetToConfirm ? (
          /* Yet to confirm — [X Reject] + [Accept] */
          <>
            <button
              data-testid={`reject-btn-${orderId}`}
              className="min-h-[44px] min-w-[44px] px-3 rounded-lg border flex items-center justify-center gap-1 text-xs font-semibold"
              style={{ borderColor: COLORS.errorText, color: COLORS.errorText }}
              onClick={() => onReject?.(order)}
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Reject</span>
            </button>
            <button
              data-testid={`accept-btn-${orderId}`}
              className="min-h-[44px] flex-1 px-4 text-sm font-bold rounded-lg"
              style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
              onClick={() => onAccept?.(order)}
            >
              Accept
            </button>
          </>
        ) : (
          /* Normal flow: [KOT] [Cancel] ... [Ready/Serve/Bill] for ALL order types */
          <div className="flex items-center w-full">
            {/* Left: Print KOT + Cancel */}
            <div className="flex items-center gap-3">
              {/* Print KOT button - permission gated (print_icon) */}
              {canPrintBill && (
              <button
                data-testid={`print-kot-btn-${orderId}`}
                className={`min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center ${isPrintingKot ? 'opacity-50' : ''}`}
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                title="Print KOT"
                onClick={handlePrintKot}
                disabled={isPrintingKot}
              >
                {isPrintingKot ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
              </button>
              )}

              {/* Cancel Order Button - permission gated (order_cancel) */}
              {isOrderCancelAllowed && (
              <button
                data-testid={`cancel-order-btn-${orderId}`}
                onClick={() => onCancelOrder?.(order)}
                className="min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
                title="Cancel Order"
              >
                <X className="w-5 h-5" />
              </button>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right: Action button */}
            {fOrderStatus === 1 && (
              <button
                data-testid={`ready-btn-${orderId}`}
                className="min-h-[44px] px-6 text-sm font-bold rounded-lg"
                style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                onClick={() => onMarkReady?.(order)}
              >
                Ready
              </button>
            )}
            {fOrderStatus === 2 && (
              <button
                data-testid={`serve-btn-${orderId}`}
                className="min-h-[44px] px-6 text-sm font-bold rounded-lg"
                style={{ backgroundColor: "#E8F5E9", color: COLORS.primaryGreen, border: `1px solid ${COLORS.primaryGreen}` }}
                onClick={() => onMarkServed?.(order)}
              >
                Serve
              </button>
            )}
            {fOrderStatus === 5 && canBill && (
              order.paymentType === 'prepaid' ? (
                /* BUG-274: Prepaid + Served → Settle button (calls paid-prepaid-order) */
                <button
                  data-testid={`settle-btn-${orderId}`}
                  className={`min-h-[44px] px-6 text-sm font-bold rounded-lg ${isSettling ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                  onClick={handleSettlePrepaid}
                  disabled={isSettling}
                  title="Settle Order"
                >
                  {isSettling ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Settle'}
                </button>
              ) : (
                <button
                  data-testid={`bill-btn-${orderId}`}
                  className={`min-h-[44px] px-6 text-sm font-bold rounded-lg ${isPrintingBill ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                  onClick={handlePrintBill}
                  disabled={isPrintingBill}
                  title="Print Bill"
                >
                  {isPrintingBill ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Bill'}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Station Picker Modal for KOT */}
      <StationPickerModal
        isOpen={showStationPicker}
        onClose={() => setShowStationPicker(false)}
        onConfirm={executePrintKot}
        stations={availableStations}
        isLoading={isPrintingKot}
      />
    </div>
  );
};

export default OrderCard;
