// useSocketEvents Hook
// Wires socket events to handlers and context updates
// 
// BUG-203 (April 5, 2026): Removed update-table channel subscription.
// Table status is now derived from order data inside order event handlers.
// Single source of truth: OrderContext → table status derived from order.

import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useOrders } from '../../contexts/OrderContext';
import { useTables } from '../../contexts/TableContext';
import { useRestaurant } from '../../contexts/RestaurantContext';
import socketService from './socketService';
import { 
  SOCKET_EVENTS,
  getOrderChannel,
  getTableChannel,
  getOrderEngageChannel,
} from './socketEvents';
import {
  handleNewOrder,
  handleOrderDataEvent,
  handleUpdateFoodStatus,
  handleUpdateOrderStatus,
  handleScanNewOrder,
  handleDeliveryAssignOrder,
  handleUpdateTable,
  handleOrderEngage,
} from './socketHandlers';

/**
 * Hook that subscribes to all socket events and routes them to handlers
 * Should be used once at the app level (e.g., in DashboardPage or a dedicated component)
 */
export const useSocketEvents = () => {
  const { subscribe, isConnected } = useSocket();
  const { addOrder, updateOrder, removeOrder, getOrderById, setOrderEngaged } = useOrders();
  const { updateTableStatus, setTableEngaged } = useTables();
  const { restaurant } = useRestaurant();
  
  // Get restaurant ID for dynamic channel names
  const restaurantId = restaurant?.id;
  
  // Use refs to avoid stale closures in event handlers
  // All handlers now receive both order + table actions (BUG-203)
  const actionsRef = useRef({ addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged });
  
  // Update ref when context functions change
  useEffect(() => {
    actionsRef.current = { addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged };
  }, [addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus, setTableEngaged, setOrderEngaged]);

  // ===========================================================================
  // CHANNEL EVENT HANDLER
  // Routes events from channel to appropriate handler based on event name
  // ===========================================================================
  
  const handleOrderChannelEvent = useCallback((...args) => {
    // args is the message array: [eventName, orderId, restaurantId, status, payload?]
    const eventName = args[0];
    console.log(`[useSocketEvents] Order channel event: ${eventName}`, args);
    
    switch (eventName) {
      case SOCKET_EVENTS.NEW_ORDER:
        handleNewOrder(args, actionsRef.current);
        break;
      case SOCKET_EVENTS.UPDATE_ORDER:
        handleOrderDataEvent(args, actionsRef.current, 'update-order');
        break;
      case SOCKET_EVENTS.UPDATE_ORDER_TARGET:
        handleOrderDataEvent(args, actionsRef.current, 'update-order-target');
        break;
      case SOCKET_EVENTS.UPDATE_ORDER_SOURCE:
        handleOrderDataEvent(args, actionsRef.current, 'update-order-source');
        break;
      case SOCKET_EVENTS.UPDATE_ORDER_PAID:
        handleOrderDataEvent(args, actionsRef.current, 'update-order-paid');
        break;
      case SOCKET_EVENTS.UPDATE_ITEM_STATUS:
        handleOrderDataEvent(args, actionsRef.current, 'update-item-status');
        break;
      case SOCKET_EVENTS.UPDATE_FOOD_STATUS:
        handleUpdateFoodStatus(args, actionsRef.current);
        break;
      case SOCKET_EVENTS.UPDATE_ORDER_STATUS:
        handleUpdateOrderStatus(args, actionsRef.current);
        break;
      case SOCKET_EVENTS.SCAN_NEW_ORDER:
        handleScanNewOrder(args, actionsRef.current);
        break;
      case SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER:
        handleDeliveryAssignOrder(args, actionsRef.current);
        break;
      default:
        console.log(`[useSocketEvents] Unknown order event: ${eventName}`);
    }
  }, []);

  // Table channel handler
  const handleTableChannelEvent = useCallback((...args) => {
    const eventName = args[0];
    console.log(`[useSocketEvents] Table channel event: ${eventName}`, args);
    
    if (eventName === SOCKET_EVENTS.UPDATE_TABLE) {
      handleUpdateTable(args, actionsRef.current);
    } else {
      console.log(`[useSocketEvents] Unknown table event: ${eventName}`);
    }
  }, []);

  // Order-engage channel handler
  // Message format: [orderId, restaurantOrderId, restaurantId, status]
  // Note: No event name at index 0, different from other channels
  const handleOrderEngageChannelEvent = useCallback((...args) => {
    console.log(`[useSocketEvents] Order-engage channel event:`, args);
    // Pass directly to handler - format is different (no event name prefix)
    handleOrderEngage(args, actionsRef.current);
  }, []);

  // ===========================================================================
  // SUBSCRIBE TO ORDER CHANNEL ONLY
  // BUG-203: Table channel removed — table status derived from order data
  // ===========================================================================
  
  useEffect(() => {
    // Double-check that socket is actually connected
    const socketReallyConnected = isConnected && socketService.isConnected();
    
    if (!socketReallyConnected) {
      console.log('[useSocketEvents] Socket not ready, skipping subscriptions');
      return;
    }
    
    if (!restaurantId) {
      console.log('[useSocketEvents] No restaurantId yet, skipping subscriptions');
      return;
    }
    
    // Subscribe to order channel
    const orderChannel = getOrderChannel(restaurantId);
    // Subscribe to table channel (for immediate table status updates)
    const tableChannel = getTableChannel(restaurantId);
    // Subscribe to order-engage channel (for order-level locking)
    const orderEngageChannel = getOrderEngageChannel(restaurantId);
    
    console.log(`[useSocketEvents] Subscribing to channels for restaurant ${restaurantId}: ${orderChannel}, ${tableChannel}, ${orderEngageChannel}`);
    
    const unsubscribeOrder = subscribe(orderChannel, handleOrderChannelEvent);
    const unsubscribeTable = subscribe(tableChannel, handleTableChannelEvent);
    const unsubscribeOrderEngage = subscribe(orderEngageChannel, handleOrderEngageChannelEvent);
    
    if (unsubscribeOrder) {
      console.log(`[useSocketEvents] Subscribed to order channel successfully`);
    } else {
      console.warn('[useSocketEvents] Order channel subscription failed, will retry on next connection');
    }
    
    if (unsubscribeTable) {
      console.log(`[useSocketEvents] Subscribed to table channel successfully`);
    } else {
      console.warn('[useSocketEvents] Table channel subscription failed');
    }
    
    if (unsubscribeOrderEngage) {
      console.log(`[useSocketEvents] Subscribed to order-engage channel successfully`);
    } else {
      console.warn('[useSocketEvents] Order-engage channel subscription failed');
    }
    
    // Cleanup on unmount or when restaurantId changes
    return () => {
      console.log('[useSocketEvents] Unsubscribing from channels');
      unsubscribeOrder && unsubscribeOrder();
      unsubscribeTable && unsubscribeTable();
      unsubscribeOrderEngage && unsubscribeOrderEngage();
    };
  }, [
    isConnected,
    restaurantId,
    subscribe,
    handleOrderChannelEvent,
    handleTableChannelEvent,
    handleOrderEngageChannelEvent,
  ]);

  // Return connection status and restaurantId for UI feedback
  return { isConnected, restaurantId };
};

export default useSocketEvents;
