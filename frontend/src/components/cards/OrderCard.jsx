import { useState } from "react";
import { User, X, ChevronDown, ChevronUp, MapPin, Clock, Printer, ShoppingBag, Bike, Utensils, DoorOpen, Circle, CheckCircle2, Check, FileText, GitMerge, ArrowLeftRight, CornerRightUp, Loader2 } from "lucide-react";
import { COLORS, SOURCE_COLORS } from "../../constants";
import OrderTimeline from "./OrderTimeline";
import { printOrder, completePrepaidOrder } from "../../api/services/orderService";
import { dispatchOrder } from "../../api/services/deliveryService";
import { useToast } from "../../hooks/use-toast";
import { useMenu, useOrders, useRestaurant, useAuth } from "../../contexts";
import { getStationsFromOrderItems } from "../../api/services/stationService";
import StationPickerModal from "../modals/StationPickerModal";
import AssignRiderModal from "../modals/AssignRiderModal";
// CR-017: WhatsApp Payment Link
import WhatsAppPaymentModal from "./WhatsAppPaymentModal";

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
  // BUG-029 (Apr-2026): callback invoked after successful prepaid settle so the
  // parent dashboard can clear any stale order-entry selection for this order.
  onPostSettleSuccess,
}) => {
  const [showServed, setShowServed] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [isPrintingKot, setIsPrintingKot] = useState(false);
  const [isPrintingBill, setIsPrintingBill] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [isMarkingServed, setIsMarkingServed] = useState(false);
  const [isAcceptingOrder, setIsAcceptingOrder] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [availableStations, setAvailableStations] = useState([]);
  // BUG-097 Bucket 4 (2026-05-20): Assign Rider modal state
  const [showAssignRider, setShowAssignRider] = useState(false);
  // CR-017: WhatsApp Payment Link modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const { toast } = useToast();
  const { getProductById } = useMenu();
  const { restaurant, printerAgents } = useRestaurant();
  const { user } = useAuth();
  const { updateOrder } = useOrders();

  if (!order) return null;

  const source = order.source || "own";
  const isOwn = source === "own";
  const isDineIn = orderType === "dineIn";
  const isDelivery = orderType === "delivery";
  const isTakeAway = orderType === "takeAway";
  const isRoom = orderType === "room" || order.isRoom;
  // BUG-097: delivery_assign from restaurant profile determines Dispatch vs Assign Rider
  const deliveryAssign = restaurant?.features?.deliveryAssign;
  const hasRiderAssigned = !!order.deliveryManId;
  // In-house service flag — covers dine-in, walk-in, POS, room, and any
  // un-normalized variant. Used by the per-item status chip ONLY (line ~434).
  // Strict isDineIn is preserved for label/merge/shift/transfer/padding gates.
  const isItemActionable = !isTakeAway && !isDelivery;
  const orderId = order.orderId || order.id;
  // BUG-071 (Wave 5, May-2026): user-facing order id for ALL display surfaces
  // (chip, toasts, dialogs). DB `orderId` stays for API calls + data-testids
  // + React keys. Q5 rule: no fallback — display hidden when missing.
  const orderNumber = order.orderNumber;
  const fOrderStatus = order.fOrderStatus || 1;
  const items = order.items || [];

  // CR-017: WhatsApp payment link visible on unpaid orders only
  const showWhatsAppPayment = ![3, 6, 10].includes(fOrderStatus);

  // Wave 6: cross-disable all action buttons while any async action is in progress
  const isActionInProgress = isPrintingKot || isPrintingBill || isSettling || isMarkingReady || isMarkingServed || isAcceptingOrder || isRejecting || isDispatching;

  // BUG-102 (POS3.0): Replaced hardcoded 8s setTimeout with immediate reset
  // after await + 2s safety-net fallback. The await already waits for the API
  // response (~100-500ms), so the finally block resets immediately. The 2s
  // fallback timer (started at click time) catches edge cases where the await
  // hangs. Owner directive: "~2s max fallback, socket-response pattern."
  const handleMarkReadyClick = async () => {
    if (isActionInProgress) return;
    setIsMarkingReady(true);
    const fallback = setTimeout(() => setIsMarkingReady(false), 2000);
    try {
      await onMarkReady?.(order);
    } catch (err) {
      console.error('[OrderCard] Ready failed:', err?.message);
    } finally {
      clearTimeout(fallback);
      setIsMarkingReady(false);
    }
  };

  const handleMarkServedClick = async () => {
    if (isActionInProgress) return;
    setIsMarkingServed(true);
    const fallback = setTimeout(() => setIsMarkingServed(false), 2000);
    try {
      await onMarkServed?.(order);
    } catch (err) {
      console.error('[OrderCard] Serve failed:', err?.message);
    } finally {
      clearTimeout(fallback);
      setIsMarkingServed(false);
    }
  };

  const handleAcceptClick = async () => {
    if (isActionInProgress) return;
    setIsAcceptingOrder(true);
    const fallback = setTimeout(() => setIsAcceptingOrder(false), 2000);
    try {
      await onAccept?.(order);
    } catch (err) {
      console.error('[OrderCard] Accept failed:', err?.message);
    } finally {
      clearTimeout(fallback);
      setIsAcceptingOrder(false);
    }
  };

  const handleRejectClick = () => {
    if (isActionInProgress) return;
    setIsRejecting(true);
    onReject?.(order);
    // Reject opens a modal — reset after short delay
    setTimeout(() => setIsRejecting(false), 1000);
  };

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
      // HOTFIX-KOT (2026-05-26): pass order data for waiterName/tablename/orderNote/items
      await printOrder(orderId, 'kot', stationKot, order, 0, {}, printerAgents || []);
    } catch (error) {
      console.error('[OrderCard] KOT print error:', error);
      toast({ title: "Failed to send KOT request", description: error.readableMessage, variant: "destructive" });
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
      // BUG-028 Round 5 (Apr-2026): manual Print Bill from dashboard card honours
      // auto_service_charge flag. Print Bill from inside Collect Payment is already
      // auto-aware via paymentData.serviceCharge.
      const scPctForPrint = restaurant?.autoServiceCharge ? (restaurant?.serviceChargePercentage || 0) : 0;
      // CR-013 (May-2026): pass component-specific GST rate pcts so the
      // dashboard re-print recompute branch (buildBillPrintPayload) uses the
      // same SC/Tip/Delivery GST rates as the live Collect Bill flow.
      // Missing/unset → 0 (force-0 fallback per frozen rule §1 row 10).
      await printOrder(orderId, 'bill', null, order, scPctForPrint, {
        serviceChargeTaxPct:  restaurant?.serviceChargeTaxPct  || 0,
        deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0,
      }, printerAgents || []);
      // BUG-071: display user-facing number only
    } catch (error) {
      console.error('[OrderCard] Bill print error:', error);
      toast({ title: "Failed to send Bill request", description: error.readableMessage, variant: "destructive" });
    } finally {
      setIsPrintingBill(false);
    }
  };

  // BUG-274: Settle prepaid order (fOrderStatus 5 + paymentType 'prepaid')
  // Calls POST /api/v2/vendoremployee/order/paid-prepaid-order → backend emits update-order-paid
  // → socket handler removes order from context. No bill print here.
  // PROD-BUG-002: Settle is financial closure ONLY — NO printOrder() call here.
  // Print belongs to explicit Print buttons and auto-print at Place/Collect time.
  const handleSettlePrepaid = async (e) => {
    e.stopPropagation();
    if (!orderId || isSettling) return;

    setIsSettling(true);
    try {
      await completePrepaidOrder(orderId, order?.serviceTax || 0, order?.tipAmount || 0, order?.paymentMethod?.toLowerCase() === 'paylater');
      // BUG-071: display user-facing number only
      // BUG-029 (Apr-2026): notify parent so it can clear stale order-entry state
      onPostSettleSuccess?.(orderId);
    } catch (error) {
      console.error('[OrderCard] Settle prepaid error:', error);
      toast({ title: "Failed to settle order", description: error.readableMessage, variant: "destructive" });
    } finally {
      setIsSettling(false);
    }
  };

  // Items grouped by status (items already defined above)
  const activeItems = items.filter(i => i.status !== "served" && i.status !== "cancelled");
  const servedItems = items.filter(i => i.status === "served");

  // BUG-097: Dispatch handler for delivery orders
  const handleDispatch = async () => {
    if (isActionInProgress) return;
    setIsDispatching(true);
    try {
      await dispatchOrder(orderId, user?.roleName || 'Manager');
      toast({ title: "Order dispatched", description: `Order #${order.orderNumber || orderId} dispatched successfully` });
    } catch (err) {
      console.error('[OrderCard] Dispatch failed:', err?.message);
      toast({ title: "Dispatch failed", description: err.readableMessage, variant: "destructive" });
    } finally {
      setIsDispatching(false);
    }
  };

  // BUG-025: surface cancelled items in their own dropdown so cashier/kitchen/waiter
  // can see them without opening the order detail screen. Cancelled items are
  // already excluded from order totals at the transform layer; this is purely visual.
  const cancelledItems = items.filter(i => i.status === "cancelled");

  const isYetToConfirm = order.status === "yetToConfirm" || order.status === "pending";
  // BUG-122: Differentiate web YTC (popup + Accept/Reject) vs POS YTC (card + tick only)
  const isWebYetToConfirm = isYetToConfirm && order.isWebOrder;
  const isPosYetToConfirm = isYetToConfirm && !order.isWebOrder;

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
    if (isTakeAway) return "Takeaway";
    if (isDelivery) return "Delivery";
    return "";
  };

  // Customer/Table display - For Dine-In show table number, else customer name
  const getDisplayName = () => {
    // For Room: show room label/number
    if (isRoom) {
      if (tableLabel) return tableLabel;
      if (order.tableNumber) return order.tableNumber;
      return '';
    }
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
            <span className={`${(isRoom || isDineIn) ? 'font-extrabold text-lg' : 'text-xs font-medium'} truncate`} style={{ color: COLORS.darkText }}>
              {getDisplayName()}
            </span>
          )}
          
          {/* CR-007 / A2.1 (May-2026): Order ID chip in row 1, replacing the
              timeline slot. Timeline now lives in the new sibling row below.
              Renders only when orderId is set (brand-new pre-engage cards
              are excluded). Width budget unchanged. */}
          {/* BUG-071 (Wave 5): chip visibility now keyed on `orderNumber`
              (user-facing). `data-testid` stays on DB `orderId` for stable
              test selectors. Pre-engage cards without `orderNumber` render
              no chip — same width-budget shape as today's `!orderId` branch. */}
          {orderNumber && !isRoom && !isDineIn && (
            <span
              data-testid={`order-id-chip-${orderId}`}
              className="text-xs flex-shrink-0"
              style={{ color: COLORS.grayText }}
            >
              #{orderNumber}
            </span>
          )}
        </div>

        {/* Center: Amount - Bold + Large */}
        <span className="font-extrabold text-lg flex-shrink-0 ml-2" style={{ color: COLORS.grayText }}>
          ₹{(order.amount || 0).toLocaleString()}
        </span>

        {/* Prepaid badge — POS2-005: hidden when fOrderStatus === 8 (HOLD takes priority)
            BUG-087: PayLater badge hidden — paymentMethod 'paylater' excluded from PAID badge */}
        {order.paymentType === 'prepaid' && order.fOrderStatus !== 8 && order.paymentMethod?.toLowerCase() !== 'paylater' && (
          <span data-testid={`prepaid-badge-${orderId}`} className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen }}>PAID</span>
        )}

        {/* POS2-005: defensive HOLD label for any status-8 card that slips
            past the socket guards (handleScanNewOrder / handleNewOrder) and
            dashboard filters (statusMatchesFilter). HOLD takes priority over
            PAID for status-8. */}
        {order.fOrderStatus === 8 && (
          <span data-testid={`hold-badge-${orderId}`} className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#FFF3E0', color: COLORS.primaryOrange }}>HOLD</span>
        )}

        {/* CR-018: Scheduled badge — visible when order.scheduled is true.
            Displays schedule date/time. Distinct blue color. */}
        {order.scheduled && (
          <span
            data-testid={`scheduled-badge-${orderId}`}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ backgroundColor: '#E3F2FD', color: '#1565C0' }}
            title={order.scheduleAt ? `Scheduled: ${order.scheduleAt}` : 'Scheduled Order'}
          >
            {order.scheduleAt
              ? `SCH ${new Date(order.scheduleAt.replace(' ', 'T')).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}`
              : 'SCHEDULED'}
          </span>
        )}

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Snooze Button - Only for web Yet to Confirm orders (BUG-122) */}
          {isWebYetToConfirm && onToggleSnooze && (
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

          {/* Merge Order Button - Dine-In only, permission-gated.
              BUG-PREPAID-MERGE-SHIFT (May-2026): hidden for prepaid orders —
              merging would break the finalised financial record. */}
          {isDineIn && !isYetToConfirm && canMergeOrder && order.paymentType !== 'prepaid' && (
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

          {/* Table Shift Button - Dine-In only, permission-gated.
              BUG-PREPAID-MERGE-SHIFT (May-2026): hidden for prepaid orders —
              shifting after payment would orphan the bill print/record. */}
          {isDineIn && !isYetToConfirm && canShiftTable && order.paymentType !== 'prepaid' && (
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

      {/* ── HEADER ROW 2: Timeline tracking — CR-007 / A2.1 (May-2026).
          Same getHeaderBgColor() band as row 1, narrow padding so card height
          grows by ~16-20px only. Mirrors the existing order-note row pattern. ── */}
      <div
        className="px-3 pb-1.5 flex items-center"
        style={{ backgroundColor: getHeaderBgColor() }}
        onClick={(e) => e.stopPropagation()}
      >
        <OrderTimeline
          createdAt={order.createdAt}
          readyAt={order.readyAt}
          servedAt={order.servedAt}
          fOrderStatus={fOrderStatus}
        />
      </div>

      {/* ── HEADER ROW 3: Order Note (same background, part of header) ── */}
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
            
            // Item-level actions for in-house service orders (dine-in, walk-in,
            // POS, room) — hidden only for takeaway and delivery. See L62-65.
            const showItemAction = isItemActionable && actionConfig;
            
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

      {/* ── BUG-025: CANCELLED ITEMS COLLAPSED — separate dropdown, mirrors Served block ── */}
      {cancelledItems.length > 0 && (
        <div className="border-b" style={{ borderColor: COLORS.borderGray }}>
          <button
            data-testid={`cancelled-toggle-${orderId}`}
            className="w-full px-3 min-h-[40px] flex items-center justify-between text-xs hover:bg-gray-50"
            style={{ color: COLORS.grayText }}
            onClick={(e) => {
              e.stopPropagation();
              setShowCancelled(!showCancelled);
            }}
          >
            <span>▼ Cancelled ({cancelledItems.length})</span>
            {showCancelled ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCancelled && (
            <div className="px-3 pb-2">
              {cancelledItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#9CA3AF' }}
                  />
                  <span
                    data-testid={`cancelled-item-${item.id}`}
                    className="flex-1 text-xs line-through"
                    style={{ color: '#9CA3AF' }}
                  >
                    {item.name} ({item.qty})
                  </span>
                  <span className="text-[10px] flex-shrink-0" style={{ color: '#9CA3AF' }}>
                    (Cancelled)
                  </span>
                  {/* Spacer to align with Served block's checkmark column */}
                  <div className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RIDER SECTION (Delivery + Aggregator only) ── */}
      {isDelivery && (hasRiderAssigned || !isOwn) && (
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
          {/* BUG-097 Bucket 4 (2026-05-20): rider status badge from order.riderStatus */}
          {order.riderStatus === 'riderAssigned' && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#FFF3E8', color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
              data-testid={`rider-status-assigned-${orderId}`}
            >
              Assigned
            </span>
          )}
          {/* BUG-097 (2026-05-21): rider-pickup state → riderStatus='dispatched'
              (retired old value 'riderReached'). User-facing pill stays "Order Accepted". */}
          {order.riderStatus === 'dispatched' && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen, border: `1px solid ${COLORS.primaryGreen}` }}
              data-testid={`rider-status-dispatched-${orderId}`}
            >
              Order Accepted
            </span>
          )}
          {/* BUG-097 Bucket 4 (2026-05-20): "Change Rider" link — own-delivery
              orders with deliveryAssign profile setting only. Hidden for aggregator
              (!isOwn) orders since rider source is external (Swiggy/Zomato). */}
          {hasRiderAssigned && isOwn && deliveryAssign && (
            <button
              onClick={() => setShowAssignRider(true)}
              className="text-[10px] font-semibold underline"
              style={{ color: COLORS.primaryOrange }}
              data-testid={`change-rider-link-${orderId}`}
            >
              Change
            </button>
          )}
        </div>
      )}

      {/* ── FOOTER ACTIONS — Dynamic based on fOrderStatus, 44px touch targets ── */}
      <div 
        className="px-3 py-2 flex items-center justify-between gap-2" 
        style={{ backgroundColor: COLORS.sectionBg }}
        onClick={(e) => e.stopPropagation()}
      >
        {isWebYetToConfirm ? (
          /* Web YTC — [X Reject] + [Accept] (unchanged) */
          <>
            <button
              data-testid={`reject-btn-${orderId}`}
              className={`min-h-[44px] min-w-[44px] px-3 rounded-lg border flex items-center justify-center gap-1 text-xs font-semibold ${isActionInProgress ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={{ borderColor: COLORS.errorText, color: COLORS.errorText }}
              onClick={handleRejectClick}
              disabled={isActionInProgress}
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Reject</span>
            </button>
            <button
              data-testid={`accept-btn-${orderId}`}
              className={`min-h-[44px] flex-1 px-4 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-60 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
              onClick={handleAcceptClick}
              disabled={isActionInProgress}
            >
              {isAcceptingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isAcceptingOrder ? 'Accepting...' : 'Accept'}
            </button>
          </>
        ) : isPosYetToConfirm ? (
          /* BUG-122 + CR-018: POS YTC — Cancel (X) + Confirm (✓). Matches TableCard. */
          <>
            <button
              data-testid={`pos-cancel-btn-${orderId}`}
              className={`min-h-[44px] min-w-[44px] px-3 rounded-lg flex items-center justify-center ${isActionInProgress ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: COLORS.errorBg, color: COLORS.errorText }}
              onClick={() => onCancelOrder?.(order)}
              disabled={isActionInProgress}
            >
              <X className="w-5 h-5" />
            </button>
            <button
              data-testid={`pos-confirm-btn-${orderId}`}
              className={`min-h-[44px] min-w-[44px] px-6 rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: COLORS.primaryGreen, color: 'white' }}
              onClick={handleAcceptClick}
              disabled={isActionInProgress}
            >
              {isAcceptingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
            </button>
          </>
        ) : (
          /* Normal flow: [KOT] [Cancel] ... [Ready/Serve/Bill] for ALL order types */
          <div className="flex items-center w-full">
            {/* Left: Print KOT + Cancel */}
            <div className="flex items-center gap-3">
              {/* Print KOT button - permission gated (print_icon) */}
              {/* BUG-097: Hide KOT for delivery orders at dispatch/assign (fOrderStatus 2) and delivered (fOrderStatus 5) states */}
              {canPrintBill && !(isDelivery && (fOrderStatus === 2 || fOrderStatus === 5)) && (
              <button
                data-testid={`print-kot-btn-${orderId}`}
                className={`min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center ${isActionInProgress ? 'opacity-50' : ''}`}
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                title="Print KOT"
                onClick={handlePrintKot}
                disabled={isActionInProgress}
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

              {/* CR-017: WhatsApp Payment Link button */}
              {showWhatsAppPayment && (
              <button
                data-testid={`whatsapp-payment-btn-${orderId}`}
                className={`min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center ${isActionInProgress ? 'opacity-50' : ''}`}
                style={{ borderColor: '#25D366' }}
                title="Send Payment Link via WhatsApp"
                onClick={(e) => { e.stopPropagation(); setShowWhatsAppModal(true); }}
                disabled={isActionInProgress}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right: Action button */}
            {fOrderStatus === 1 && (
              <button
                data-testid={`ready-btn-${orderId}`}
                className={`min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                onClick={handleMarkReadyClick}
                disabled={isActionInProgress}
              >
                {isMarkingReady ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ready'}
              </button>
            )}
            {fOrderStatus === 2 && (
              isDelivery ? (
                // BUG-097: Delivery-specific branching at fOrderStatus 2
                !hasRiderAssigned ? (
                  // No rider yet — show Dispatch or Assign Rider
                  // delivery_assign from restaurant profile is source of truth
                  deliveryAssign ? (
                    <button
                      data-testid={`assign-rider-btn-${orderId}`}
                      className={`min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                      onClick={() => setShowAssignRider(true)}
                      disabled={isActionInProgress}
                    >
                      Assign Rider
                    </button>
                  ) : (
                    <button
                      data-testid={`dispatch-btn-${orderId}`}
                      className={`min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                      onClick={handleDispatch}
                      disabled={isActionInProgress}
                    >
                      {isDispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dispatch'}
                    </button>
                  )
                ) : (
                  // BUG-097 (2026-05-21): branch on rider acceptance state.
                  // - riderStatus === 'riderAssigned' → disabled "Waiting for Rider" (pending accept)
                  // - any other state (e.g. 'dispatched' = rider picked up) → clickable "Reassign"
                  order.riderStatus === 'riderAssigned' ? (
                    <button
                      data-testid={`waiting-rider-btn-${orderId}`}
                      className="min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 opacity-50 cursor-default"
                      style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                      disabled
                    >
                      Waiting for Rider
                    </button>
                  ) : (
                    <button
                      data-testid={`reassign-rider-btn-${orderId}`}
                      className={`min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                      onClick={() => setShowAssignRider(true)}
                      disabled={isActionInProgress}
                    >
                      Reassign
                    </button>
                  )
                )
              ) : (
                // Non-delivery: Serve button (unchanged)
                <button
                  data-testid={`serve-btn-${orderId}`}
                  className={`min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: "#E8F5E9", color: COLORS.primaryGreen, border: `1px solid ${COLORS.primaryGreen}` }}
                  onClick={handleMarkServedClick}
                  disabled={isActionInProgress}
                >
                  {isMarkingServed ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Serve'}
                </button>
              )
            )}
            {fOrderStatus === 5 && canBill && (
              // BUG-097 (2026-05-21): delivery + rider picked up (riderStatus='dispatched')
              //   ⇒ passive "Rider is on the way" label; no Bill/Settle until handover.
              //   Handover-complete exit signal is backend-blocked (Bucket 5).
              isDelivery && order.riderStatus === 'dispatched' ? (
                <button
                  data-testid={`rider-on-the-way-btn-${orderId}`}
                  className="min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 opacity-50 cursor-default"
                  style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
                  disabled
                >
                  Rider is on the way
                </button>
              ) : order.paymentType === 'prepaid' ? (
                // PROD-BUG-001: hide Settle when auto-settle is ON + non-PayLater
                // (auto-settle useEffect in DashboardPage handles the API call)
                (order.paymentMethod?.toLowerCase() === 'paylater' || !(() => { try { return localStorage.getItem('mygenie_auto_settle_enabled') === 'true'; } catch(_) { return false; } })()) && (
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
                )
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

      {/* BUG-097 Bucket 4 (2026-05-20): Assign / Change Rider Modal */}
      <AssignRiderModal
        isOpen={showAssignRider}
        onClose={() => setShowAssignRider(false)}
        orderId={orderId}
        orderNumber={orderNumber}
        orderAmount={order.amount}
        currentRiderId={order.deliveryManId || null}
        onAssigned={(picked) => {
          if (picked) {
            updateOrder(orderId, {
              ...order,
              deliveryManId: picked.id,
              rider: picked.fullName,
              riderPhone: picked.phone || '',
              deliveryManStatus: 'No',
              riderStatus: 'riderAssigned',
            });
          }
        }}
      />

      {/* CR-017: WhatsApp Payment Link Modal */}
      <WhatsAppPaymentModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        order={order}
        restaurantName={restaurant?.name}
      />
    </div>
  );
};

export default OrderCard;
