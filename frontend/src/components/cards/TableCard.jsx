import React, { useMemo, useState } from "react";
import { Printer, Clock, X, Check, PlusSquare, ShoppingBag, Bike, Utensils, DoorOpen, Loader2 } from "lucide-react";
import PropTypes from 'prop-types';
import { COLORS, CONFIG } from "../../constants";
import { mockOrderItems } from "../../data";
import { getTableStatusConfig, isTableActive } from "../../utils";
import { IconButton, TextButton } from "./buttons";
import { CARD_BASE_STYLE } from "./TableCard.styles";
import { printOrder, completePrepaidOrder } from "../../api/services/orderService";
import { dispatchOrder } from "../../api/services/deliveryService";
import AssignRiderModal from "../modals/AssignRiderModal";
import { useToast } from "../../hooks/use-toast";
import { useMenu, useOrders, useRestaurant, useAuth } from "../../contexts";
import { getStationsFromOrderItems } from "../../api/services/stationService";
import StationPickerModal from "../modals/StationPickerModal";

/**
 * Compute stage-specific time for TableCard
 * - Preparing: time since order placed (how long cooking)
 * - Ready: time since became ready (waiting to serve)
 * - Served: time since became served (waiting for bill)
 */
const computeStageTime = (table) => {
  const now = new Date();
  
  const formatDuration = (ms) => {
    if (ms < 0) return "0m";
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  // Use stage-specific timestamps if available
  if (table.fOrderStatus === 3 && table.servedAt) {
    // Served - show time since served
    return formatDuration(now - new Date(table.servedAt));
  } else if (table.fOrderStatus === 2 && table.readyAt) {
    // Ready - show time since ready
    return formatDuration(now - new Date(table.readyAt));
  } else if (table.createdAt) {
    // Preparing or fallback - show time since order placed
    return formatDuration(now - new Date(table.createdAt));
  }
  
  // Fallback to existing time field
  return table.time || '';
};

// Table Card Component - Simplified (no expansion, uses modal)
const TableCard = ({ table, onClick, onOpenModal, onUpdateStatus, onBillClick, onConfirmOrder, onCancelOrder, onMarkReady, onMarkServed, isSnoozed, onToggleSnooze, currencySymbol = '₹', isEngaged = false, orderItems = null,
  // BUG-029 (Apr-2026): callback invoked after successful prepaid settle so the
  // parent dashboard can clear any stale order-entry selection for this order.
  onPostSettleSuccess,
}) => {
  const statusConfig = getTableStatusConfig(table.status);
  const isActive = isTableActive(table.status);
  const hasOrders = ["occupied", "billReady"].includes(table.status);
  const isYetToConfirm = table.status === "yetToConfirm";
  
  const orderData = mockOrderItems[table.id] || { waiter: "", items: [] };
  const { toast } = useToast();
  const { getProductById } = useMenu();
  const { getOrderById, updateOrder } = useOrders();
  const { restaurant, printerAgents } = useRestaurant();
  const { user } = useAuth();
  
  // BUG-097: delivery_assign from restaurant profile determines Dispatch vs Assign Rider
  const isDelivery = table.orderType === 'delivery';
  const deliveryAssign = restaurant?.features?.deliveryAssign;
  const hasRiderAssigned = !!(table.order?.deliveryManId);

  // Loading states for all action buttons
  const [isPrintingKot, setIsPrintingKot] = useState(false);
  const [isPrintingBill, setIsPrintingBill] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [isMarkingServed, setIsMarkingServed] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [availableStations, setAvailableStations] = useState([]);
  // BUG-097 Bucket 4 (2026-05-20): Assign Rider modal state
  const [showAssignRider, setShowAssignRider] = useState(false);

  // Wave 6 parity: cross-disable all action buttons while any async action is in progress
  const isActionInProgress = isPrintingKot || isPrintingBill || isSettling || isMarkingReady || isMarkingServed || isDispatching;

  // Wrapped handlers for Ready/Serve with loading guard
  // BUG-102 fix (was missed for TableCard): immediate reset + 2s safety-net fallback
  const handleMarkReadyClick = async (e) => {
    e?.stopPropagation?.();
    if (isActionInProgress) return;
    setIsMarkingReady(true);
    const fallback = setTimeout(() => setIsMarkingReady(false), 2000);
    try {
      await onMarkReady?.(table);
    } catch (err) {
      console.error('[TableCard] Ready failed:', err?.message);
    } finally {
      clearTimeout(fallback);
      setIsMarkingReady(false);
    }
  };

  const handleMarkServedClick = async (e) => {
    e?.stopPropagation?.();
    if (isActionInProgress) return;
    setIsMarkingServed(true);
    const fallback = setTimeout(() => setIsMarkingServed(false), 2000);
    try {
      await onMarkServed?.(table);
    } catch (err) {
      console.error('[TableCard] Serve failed:', err?.message);
    } finally {
      clearTimeout(fallback);
      setIsMarkingServed(false);
    }
  };

  // BUG-097: Dispatch handler for delivery orders
  const handleDispatch = async (e) => {
    e?.stopPropagation?.();
    if (isActionInProgress) return;
    setIsDispatching(true);
    try {
      await dispatchOrder(table.orderId, user?.roleName || 'Manager');
      toast({ title: "Order dispatched", description: `Order dispatched successfully` });
    } catch (err) {
      console.error('[TableCard] Dispatch failed:', err?.message);
      toast({ title: "Dispatch failed", description: err.readableMessage, variant: "destructive" });
    } finally {
      setIsDispatching(false);
    }
  };

  // Handle KOT print - with station picker
  const handlePrintKot = async (e) => {
    e.stopPropagation();
    console.log('[TableCard] Print KOT clicked:', { tableId: table.id, tableTableId: table.tableId, orderId: table.orderId, isPrintingKot });
    console.log('[TableCard] orderItems prop:', orderItems);
    console.log('[TableCard] table.items:', table.items);
    console.log('[TableCard] table.order:', table.order);
    console.log('[TableCard] table.order?.items:', table.order?.items);
    
    if (!table.orderId || isActionInProgress) {
      console.log('[TableCard] Skipping - orderId missing or action in progress');
      return;
    }
    
    // Get items from orderItems prop OR fallback to table.items OR table.order.items (for walkIn/TakeAway/Delivery)
    const items = orderItems?.items || table.items || table.order?.items || [];
    console.log('[TableCard] Items for station lookup:', items.length, 'items');
    
    if (items.length === 0) {
      // No items available - print without station (backend will handle)
      console.log('[TableCard] No order items available, printing without station filter');
      await executePrintKot(null);
      return;
    }
    
    // Get stations from order items
    const stations = getStationsFromOrderItems(items, getProductById);
    console.log('[TableCard] Stations for KOT:', stations);
    
    if (stations.length === 0) {
      // No stations found - print without station filter
      console.log('[TableCard] No stations found, printing without station filter');
      await executePrintKot(null);
      return;
    }
    
    if (stations.length === 1) {
      // Single station - print directly
      console.log('[TableCard] Single station, printing directly:', stations[0].station);
      await executePrintKot([stations[0].station]);
    } else {
      // Multiple stations - show picker
      console.log('[TableCard] Multiple stations, showing picker');
      setAvailableStations(stations);
      setShowStationPicker(true);
    }
  };

  // Execute print KOT with selected stations
  const executePrintKot = async (selectedStations) => {
    setShowStationPicker(false);
    setIsPrintingKot(true);
    
    try {
      const stationKot = selectedStations ? selectedStations.join(',') : null;
      // HOTFIX-KOT (2026-05-26): pass order data for waiterName/tablename/orderNote/items
      const order = getOrderById(table.orderId);
      await printOrder(table.orderId, 'kot', stationKot, order, 0, {}, printerAgents || []);
      // BUG-071: display user-facing number only (fall back to empty when missing)
    } catch (error) {
      console.error('[TableCard] KOT print error:', error);
      toast({ title: "Failed to send KOT request", description: error.readableMessage, variant: "destructive" });
    } finally {
      setIsPrintingKot(false);
    }
  };

  // Handle Bill print
  const handlePrintBill = async (e) => {
    e.stopPropagation();
    if (!table.orderId || isActionInProgress) return;
    
    setIsPrintingBill(true);
    try {
      const order = getOrderById(table.orderId);
      // BUG-028 Round 5 (Apr-2026): manual Print Bill from dashboard card honours
      // auto_service_charge flag. Print Bill from inside Collect Payment is already
      // auto-aware via paymentData.serviceCharge.
      const scPctForPrint = restaurant?.autoServiceCharge ? (restaurant?.serviceChargePercentage || 0) : 0;
      // CR-013 (May-2026): pass component-specific GST rate pcts so the
      // dashboard re-print recompute branch (buildBillPrintPayload) uses the
      // same SC/Tip/Delivery GST rates as the live Collect Bill flow.
      // Missing/unset → 0 (force-0 fallback per frozen rule §1 row 10).
      await printOrder(table.orderId, 'bill', null, order, scPctForPrint, {
        serviceChargeTaxPct:  restaurant?.serviceChargeTaxPct  || 0,
        deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0,
      }, printerAgents || []);
      // BUG-071: display user-facing number only
    } catch (error) {
      console.error('[TableCard] Bill print error:', error);
      toast({ title: "Failed to send Bill request", description: error.readableMessage, variant: "destructive" });
    } finally {
      setIsPrintingBill(false);
    }
  };

  // BUG-274: Settle prepaid order (fOrderStatus 5 + paymentType 'prepaid')
  // PROD-BUG-002: Settle is financial closure ONLY — NO printOrder() call here.
  const handleSettlePrepaid = async (e) => {
    e.stopPropagation();
    if (!table.orderId || isActionInProgress) return;

    setIsSettling(true);
    try {
      const order = getOrderById(table.orderId);
      await completePrepaidOrder(table.orderId, order?.serviceTax || 0, order?.tipAmount || 0, order?.paymentMethod?.toLowerCase() === 'paylater');
      // BUG-071: display user-facing number only
      // BUG-029 (Apr-2026): notify parent so it can clear stale order-entry state
      onPostSettleSuccess?.(table.orderId);
    } catch (error) {
      console.error('[TableCard] Settle prepaid error:', error);
      toast({ title: "Failed to settle order", description: error.readableMessage, variant: "destructive" });
    } finally {
      setIsSettling(false);
    }
  };

  // Memoize dynamic styles to prevent unnecessary re-renders
  // Border color is neutral gray for all cards (status shown via labels/buttons)
  const cardStyle = useMemo(() => ({
    ...CARD_BASE_STYLE,
    border: `3px solid #E5E5E5`,
    minHeight: CONFIG.CARD_MIN_HEIGHT,
  }), []);

  const headerPillStyle = useMemo(() => {
    // Neutral header for all order types - no colored backgrounds
    return {
      backgroundColor: '#F5F5F5',  // Light neutral gray
      color: COLORS.darkText,
    };
  }, []);

  const handleCardClick = () => {
    if (hasOrders || isYetToConfirm) {
      onOpenModal(table);
    } else {
      onClick(table);
    }
  };

  return (
    <div
      data-testid={`table-card-${table.id}`}
      onClick={isEngaged ? undefined : handleCardClick}
      className={`relative rounded-2xl transition-all duration-200 ${isEngaged ? 'pointer-events-none' : 'cursor-pointer hover:shadow-md'} ${isSnoozed ? 'opacity-60' : ''}`}
      style={cardStyle}
    >
      {/* Engaged spinner overlay */}
      {isEngaged && (
        <div className="absolute inset-0 z-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.primaryOrange }} />
        </div>
      )}
      {/* Card Content */}
      <div className="p-2.5 h-full flex flex-col">
        {/* Header Pill */}
        <div
          className="w-full px-4 py-1.5 rounded-xl flex items-center justify-between font-bold overflow-hidden"
          style={headerPillStyle}
        >
          <div className="flex items-center gap-2 min-w-0">
            {table.orderType === 'takeAway' && <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />}
            {table.orderType === 'delivery' && <Bike className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />}
            {(table.orderType === 'dineIn' || table.orderType === 'walkIn') && <Utensils className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />}
            {table.orderType === 'room' && <DoorOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primaryOrange }} />}
            <span className="text-sm font-bold truncate" title={table.label || table.id}>{table.label || table.id}</span>
          </div>
          {table.status === "reserved" ? (
            <span className="text-xs font-semibold flex-shrink-0" style={{ color: COLORS.primaryOrange }}>Reserved</span>
          ) : table.fOrderStatus === 8 ? (
            /* POS2-005: HOLD takes priority over PAID/amount for status-8.
               Defensive — primary guard hides status-8 cards from dashboard. */
            <span data-testid={`hold-badge-table-${table.id}`} className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#FFF3E0', color: COLORS.primaryOrange }}>HOLD</span>
          ) : table.paymentType === 'prepaid' && table.paymentMethod?.toLowerCase() !== 'paylater' ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen }}>PAID</span>
          ) : (table.scheduled || table.order?.scheduled) ? (
            /* CR-018 G5: SCH badge for scheduled orders */
            <span data-testid={`sch-badge-table-${table.id}`} className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: '#E3F2FD', color: '#1565C0' }}>
              {table.scheduleAt || table.order?.scheduleAt
                ? `SCH ${new Date((table.scheduleAt || table.order?.scheduleAt).replace(' ', 'T')).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}`
                : 'SCH'}
            </span>
          ) : table.amount ? (
            <span className="text-xs font-semibold flex-shrink-0">{currencySymbol}{table.amount.toLocaleString()}</span>
          ) : null}
          
          {/* Snooze Button - Only for web yetToConfirm orders (BUG-122 parity) */}
          {isYetToConfirm && table.isWebOrder === true && onToggleSnooze && (
            <button
              data-testid={`snooze-btn-${table.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSnooze(table.id);
              }}
              className={`p-1 rounded transition-colors ${isSnoozed ? 'bg-white/30' : 'hover:bg-white/20'}`}
              title={isSnoozed ? "Unsnooze" : "Snooze"}
              aria-label={isSnoozed ? `Unsnooze order for table ${table.id}` : `Snooze order for table ${table.id}`}
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Available - Add order icon centered + Available label at bottom */}
        {!isActive && (
          <>
            <div className="flex-1 flex items-center justify-center">
              <PlusSquare className="w-6 h-6" style={{ color: COLORS.primaryOrange }} />
            </div>
            <div
              className="flex items-center justify-center rounded-lg text-xs font-semibold py-3"
              style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
              data-testid={`available-label-${table.id}`}
            >
              Available
            </div>
          </>
        )}

        {/* Active content */}
        {isActive && (
          <div className="mt-2.5 flex-1 flex flex-col">
            {/* Primary name + Status — Rooms: customer, Tables: waiter */}
            <div className="text-sm leading-tight whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: COLORS.darkText }}>
              {table.status === "reserved" 
                ? <span className="font-semibold">{table.reservedFor}</span>
                : (
                  <>
                    <span className="font-semibold">
                      {table.isRoom
                        ? (table.customer || 'NA')
                        : (table.waiter || 'NA')}
                    </span>
                    {/* Add status label inline - normal weight to match bottom style */}
                    {table.fOrderStatus === 1 && <span style={{ color: COLORS.primaryOrange }}> • Preparing</span>}
                    {table.fOrderStatus === 2 && <span style={{ color: COLORS.primaryGreen }}> • Ready</span>}
                    {table.fOrderStatus === 5 && <span style={{ color: COLORS.primaryGreen }}> • Served</span>}
                    {table.fOrderStatus === 7 && <span style={{ color: COLORS.amber }}> • Confirming</span>}
                  </>
                )}
            </div>
            
            {/* Time - Stage specific */}
            <div className="text-xs mt-1 mb-2 whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: COLORS.grayText }}>
              <span>{table.status === "reserved" ? table.reservedTime : computeStageTime(table)}</span>
            </div>

            {/* Action Buttons */}
            {isYetToConfirm ? (
              /* Yet to Confirm: Cancel (red X) left + Confirm (green tick) right */
              <div className="flex justify-between">
                <IconButton
                  icon={X}
                  onClick={() => onCancelOrder?.(table)}
                  backgroundColor={COLORS.errorBg}
                  iconColor={COLORS.errorText}
                  testId={`cancel-btn-${table.id}`}
                  title="Cancel Order"
                  ariaLabel={`Cancel order for table ${table.id}`}
                />
                <IconButton
                  icon={Check}
                  onClick={() => onConfirmOrder?.(table)}
                  backgroundColor={COLORS.primaryGreen}
                  iconColor="white"
                  testId={`confirm-btn-${table.id}`}
                  title="Confirm Order"
                  ariaLabel={`Confirm order for table ${table.id}`}
                />
              </div>
            ) : hasOrders ? (
              /* Button rules:
                 fOrderStatus 1 (preparing) → KOT button + Ready button
                 fOrderStatus 2 (ready)     → KOT button + Serve button
                 fOrderStatus 5 (served)    → KOT button + Bill button */
              <div className="flex gap-2">
                {table.fOrderStatus === 1 && (
                  <>
                    <IconButton
                      icon={Printer}
                      onClick={handlePrintKot}
                      backgroundColor={COLORS.borderGray}
                      testId={`print-btn-${table.id}`}
                      title="Print KOT"
                      ariaLabel={`Print KOT for table ${table.id}`}
                      disabled={isActionInProgress}
                      isLoading={isPrintingKot}
                      LoadingIcon={Loader2}
                    />
                    <TextButton
                      onClick={handleMarkReadyClick}
                      backgroundColor="#FFF3E8"
                      textColor={COLORS.primaryOrange}
                      borderColor={COLORS.primaryOrange}
                      testId={`ready-btn-${table.id}`}
                      ariaLabel={`Mark order ready for table ${table.id}`}
                      fullWidth={false}
                      className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                      disabled={isActionInProgress}
                    >
                      {isMarkingReady ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ready'}
                    </TextButton>
                  </>
                )}
                {table.fOrderStatus === 2 && (
                  <>
                    {/* BUG-097: Hide KOT for delivery orders at dispatch/assign/reassign state */}
                    {!isDelivery && (
                    <IconButton
                      icon={Printer}
                      onClick={handlePrintKot}
                      backgroundColor={COLORS.borderGray}
                      testId={`print-btn-${table.id}`}
                      title="Print KOT"
                      ariaLabel={`Print KOT for table ${table.id}`}
                      disabled={isActionInProgress}
                      isLoading={isPrintingKot}
                      LoadingIcon={Loader2}
                    />
                    )}
                    {/* BUG-097 + Bucket 4.5: Delivery order branching at fOrderStatus 2 */}
                    {isDelivery ? (
                      !hasRiderAssigned ? (
                        // No rider — Assign or Dispatch
                        <TextButton
                          onClick={deliveryAssign
                            ? (e) => { e?.stopPropagation?.(); setShowAssignRider(true); }
                            : handleDispatch}
                          backgroundColor="#FFF3E8"
                          textColor={COLORS.primaryOrange}
                          borderColor={COLORS.primaryOrange}
                          testId={deliveryAssign ? `assign-rider-btn-${table.id}` : `dispatch-btn-${table.id}`}
                          ariaLabel={deliveryAssign ? `Assign rider for table ${table.id}` : `Dispatch order for table ${table.id}`}
                          fullWidth={false}
                          className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                          disabled={isActionInProgress}
                        >
                          {isDispatching ? <Loader2 className="w-4 h-4 animate-spin" />
                            : (deliveryAssign ? 'Assign' : 'Dispatch')}
                        </TextButton>
                      ) : (
                        // BUG-097 (2026-05-21): branch on rider acceptance state.
                        // - riderStatus === 'riderAssigned' → disabled "Waiting.." (pending accept)
                        // - any other state (e.g. 'dispatched' = rider picked up) → clickable "Reassign"
                        table.order?.riderStatus === 'riderAssigned' ? (
                          <TextButton
                            backgroundColor="#FFF3E8"
                            textColor={COLORS.primaryOrange}
                            borderColor={COLORS.primaryOrange}
                            testId={`waiting-rider-btn-${table.id}`}
                            ariaLabel={`Waiting for rider for table ${table.id}`}
                            fullWidth={false}
                            className="flex-1 text-xs py-2 flex items-center justify-center gap-1 opacity-50 cursor-default"
                            disabled
                          >
                            Waiting..
                          </TextButton>
                        ) : (
                          <TextButton
                            onClick={(e) => { e?.stopPropagation?.(); setShowAssignRider(true); }}
                            backgroundColor="#FFF3E8"
                            textColor={COLORS.primaryOrange}
                            borderColor={COLORS.primaryOrange}
                            testId={`reassign-rider-btn-${table.id}`}
                            ariaLabel={`Reassign rider for table ${table.id}`}
                            fullWidth={false}
                            className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                            disabled={isActionInProgress}
                          >
                            Reassign
                          </TextButton>
                        )
                      )
                    ) : (
                      // Non-delivery: Serve (unchanged)
                      <TextButton
                        onClick={handleMarkServedClick}
                        backgroundColor="#E8F5E9"
                        textColor={COLORS.primaryGreen}
                        borderColor={COLORS.primaryGreen}
                        testId={`serve-btn-${table.id}`}
                        ariaLabel={`Mark order served for table ${table.id}`}
                        fullWidth={false}
                        className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                        disabled={isActionInProgress}
                      >
                        {isMarkingServed ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Serve'}
                      </TextButton>
                    )}
                  </>
                )}
                {table.fOrderStatus === 5 && (
                  <>
                    {/* BUG-097: Hide KOT for delivery orders at delivered state */}
                    {!isDelivery && (
                    <IconButton
                      icon={Printer}
                      onClick={handlePrintKot}
                      backgroundColor={COLORS.borderGray}
                      testId={`print-btn-${table.id}`}
                      title="Print KOT"
                      ariaLabel={`Print KOT for table ${table.id}`}
                      disabled={isActionInProgress}
                      isLoading={isPrintingKot}
                      LoadingIcon={Loader2}
                    />
                    )}
                    {/* BUG-097 (2026-05-21): delivery + rider picked up (riderStatus='dispatched')
                        ⇒ passive "On the way.." label; no Bill/Settle until handover.
                        Short label mirrors the fOS=2 "Waiting.." pattern for tile width. */}
                    {isDelivery && table.order?.riderStatus === 'dispatched' ? (
                      <TextButton
                        backgroundColor="#FFF3E8"
                        textColor={COLORS.primaryOrange}
                        borderColor={COLORS.primaryOrange}
                        testId={`rider-on-the-way-btn-${table.id}`}
                        ariaLabel={`Rider on the way for table ${table.id}`}
                        fullWidth={false}
                        className="flex-1 text-xs py-2 flex items-center justify-center gap-1 opacity-50 cursor-default"
                        disabled
                      >
                        On the way..
                      </TextButton>
                    ) : table.paymentType === 'prepaid' ? (
                      // PROD-BUG-001: hide Settle when auto-settle is ON + non-PayLater
                      (table.paymentMethod?.toLowerCase() === 'paylater' || !(() => { try { return localStorage.getItem('mygenie_auto_settle_enabled') === 'true'; } catch(_) { return false; } })()) && (
                      <TextButton
                        onClick={handleSettlePrepaid}
                        testId={`settle-btn-${table.id}`}
                        ariaLabel={`Settle order for table ${table.id}`}
                        fullWidth={false}
                        className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                        disabled={isActionInProgress}
                      >
                        {isSettling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Settle'}
                      </TextButton>
                      )
                    ) : (
                      <TextButton
                        onClick={handlePrintBill}
                        testId={`collect-btn-${table.id}`}
                        ariaLabel={`Print Bill for table ${table.id}`}
                        fullWidth={false}
                        className="flex-1 text-xs py-2 flex items-center justify-center gap-1"
                        disabled={isActionInProgress}
                      >
                        {isPrintingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : (table.isRoom ? 'C/Out' : 'Bill')}
                      </TextButton>
                    )}
                  </>
                )}
              </div>
            ) : table.status === "reserved" ? (
              /* Reserved: Cancel (red X) left + Seat button right */
              <div className="flex gap-2">
                <IconButton
                  icon={X}
                  onClick={() => onUpdateStatus?.(table.id, "available")}
                  backgroundColor={COLORS.errorBg}
                  iconColor={COLORS.errorText}
                  testId={`cancel-reservation-btn-${table.id}`}
                  title="Cancel Reservation"
                  ariaLabel={`Cancel reservation for table ${table.id}`}
                />
                <TextButton
                  onClick={() => onClick(table)}
                  backgroundColor={COLORS.primaryOrange}
                  testId={`seat-btn-${table.id}`}
                  ariaLabel={`Seat customer at table ${table.id}`}
                >
                  Seat
                </TextButton>
              </div>
            ) : statusConfig.buttonText && (
              /* Paid: Clear button - directly sets table to available */
              <TextButton
                onClick={() => onUpdateStatus?.(table.id, "available")}
                testId={`action-btn-${table.id}`}
                ariaLabel={`${statusConfig.buttonText} for table ${table.id}`}
                fullWidth={true}
              >
                {statusConfig.buttonText}
              </TextButton>
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

      {/* BUG-097 Bucket 4 (2026-05-20): Assign Rider Modal */}
      <AssignRiderModal
        isOpen={showAssignRider}
        onClose={() => setShowAssignRider(false)}
        orderId={table.orderId}
        orderNumber={table.order?.orderNumber}
        orderAmount={table.order?.amount}
        currentRiderId={table.order?.deliveryManId || null}
        onAssigned={(picked) => {
          if (picked && table.orderId) {
            const existing = getOrderById(table.orderId);
            if (existing) {
              updateOrder(table.orderId, {
                ...existing,
                deliveryManId: picked.id,
                rider: picked.fullName,
                riderPhone: picked.phone || '',
                deliveryManStatus: 'No',
                riderStatus: 'riderAssigned',
              });
            }
          }
        }}
      />
    </div>
  );
};

TableCard.propTypes = {
  table: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.oneOf([
      'available', 
      'occupied', 
      'reserved', 
      'paid', 
      'yetToConfirm', 
      'billReady'
    ]).isRequired,
    amount: PropTypes.number,
    reservedFor: PropTypes.string,
    reservedTime: PropTypes.string,
    time: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
  onOpenModal: PropTypes.func,
  onUpdateStatus: PropTypes.func,
  onBillClick: PropTypes.func,
  onConfirmOrder: PropTypes.func,
  onCancelOrder: PropTypes.func,
  onMarkReady: PropTypes.func,
  onMarkServed: PropTypes.func,
  isSnoozed: PropTypes.bool,
  onToggleSnooze: PropTypes.func,
  isEngaged: PropTypes.bool,
  orderItems: PropTypes.object,
};

TableCard.defaultProps = {
  onOpenModal: null,
  onUpdateStatus: null,
  onBillClick: null,
  onConfirmOrder: null,
  onCancelOrder: null,
  onMarkReady: null,
  onMarkServed: null,
  isSnoozed: false,
  onToggleSnooze: null,
  isEngaged: false,
};

export default TableCard;
