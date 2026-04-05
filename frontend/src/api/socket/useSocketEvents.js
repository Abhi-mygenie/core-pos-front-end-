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
} from './socketEvents';
import {
  handleNewOrder,
  handleUpdateOrder,
  handleUpdateFoodStatus,
  handleUpdateOrderStatus,
  handleScanNewOrder,
  handleDeliveryAssignOrder,
} from './socketHandlers';

/**
 * Hook that subscribes to all socket events and routes them to handlers
 * Should be used once at the app level (e.g., in DashboardPage or a dedicated component)
 */
export const useSocketEvents = () => {
  const { subscribe, isConnected } = useSocket();
  const { addOrder, updateOrder, removeOrder, getOrderById } = useOrders();
  const { updateTableStatus } = useTables();
  const { restaurant } = useRestaurant();
  
  // Get restaurant ID for dynamic channel names
  const restaurantId = restaurant?.id;
  
  // Use refs to avoid stale closures in event handlers
  // All handlers now receive both order + table actions (BUG-203)
  const actionsRef = useRef({ addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus });
  
  // Update ref when context functions change
  useEffect(() => {
    actionsRef.current = { addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus };
  }, [addOrder, updateOrder, removeOrder, getOrderById, updateTableStatus]);

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
        handleUpdateOrder(args, actionsRef.current);
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
    
    // Subscribe to order channel only (table status derived from order data)
    const orderChannel = getOrderChannel(restaurantId);
    
    console.log(`[useSocketEvents] Subscribing to order channel for restaurant ${restaurantId}: ${orderChannel}`);
    
    const unsubscribeOrder = subscribe(orderChannel, handleOrderChannelEvent);
    
    if (unsubscribeOrder) {
      console.log(`[useSocketEvents] Subscribed to order channel successfully`);
    } else {
      console.warn('[useSocketEvents] Order channel subscription failed, will retry on next connection');
    }
    
    // Cleanup on unmount or when restaurantId changes
    return () => {
      console.log('[useSocketEvents] Unsubscribing from order channel');
      unsubscribeOrder && unsubscribeOrder();
    };
  }, [
    isConnected,
    restaurantId,
    subscribe,
    handleOrderChannelEvent,
  ]);

  // Return connection status and restaurantId for UI feedback
  return { isConnected, restaurantId };
};

export default useSocketEvents;
