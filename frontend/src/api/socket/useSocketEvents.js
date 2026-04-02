// useSocketEvents Hook
// Wires socket events to handlers and context updates

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
} from './socketEvents';
import {
  handleNewOrder,
  handleUpdateOrder,
  handleUpdateFoodStatus,
  handleUpdateOrderStatus,
  handleScanNewOrder,
  handleDeliveryAssignOrder,
  handleUpdateTable,
} from './socketHandlers';

/**
 * Hook that subscribes to all socket events and routes them to handlers
 * Should be used once at the app level (e.g., in DashboardPage or a dedicated component)
 */
export const useSocketEvents = () => {
  const { subscribe, isConnected } = useSocket();
  const { addOrder, updateOrder, removeOrder } = useOrders();
  const { updateTableStatus } = useTables();
  const { restaurant } = useRestaurant();
  
  // Get restaurant ID for dynamic channel names
  const restaurantId = restaurant?.id;
  
  // Use refs to avoid stale closures in event handlers
  const orderActionsRef = useRef({ addOrder, updateOrder, removeOrder });
  const tableActionsRef = useRef({ updateTableStatus });
  
  // Update refs when context functions change
  useEffect(() => {
    orderActionsRef.current = { addOrder, updateOrder, removeOrder };
  }, [addOrder, updateOrder, removeOrder]);
  
  useEffect(() => {
    tableActionsRef.current = { updateTableStatus };
  }, [updateTableStatus]);

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
        handleNewOrder(args, orderActionsRef.current);
        break;
      case SOCKET_EVENTS.UPDATE_ORDER:
        handleUpdateOrder(args, orderActionsRef.current);
        break;
      case SOCKET_EVENTS.UPDATE_FOOD_STATUS:
        handleUpdateFoodStatus(args, orderActionsRef.current);
        break;
      case SOCKET_EVENTS.UPDATE_ORDER_STATUS:
        handleUpdateOrderStatus(args, orderActionsRef.current);
        break;
      case SOCKET_EVENTS.SCAN_NEW_ORDER:
        handleScanNewOrder(args, orderActionsRef.current);
        break;
      case SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER:
        handleDeliveryAssignOrder(args, orderActionsRef.current);
        break;
      default:
        console.log(`[useSocketEvents] Unknown order event: ${eventName}`);
    }
  }, []);
  
  const handleTableChannelEvent = useCallback((...args) => {
    // args is the message array: [eventName, tableId, restaurantId, status]
    const eventName = args[0];
    console.log(`[useSocketEvents] Table channel event: ${eventName}`, args);
    
    if (eventName === SOCKET_EVENTS.UPDATE_TABLE) {
      handleUpdateTable(args, tableActionsRef.current);
    } else {
      console.log(`[useSocketEvents] Unknown table event: ${eventName}`);
    }
  }, []);

  // ===========================================================================
  // SUBSCRIBE TO DYNAMIC CHANNELS
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
    
    // Generate channel names based on restaurant ID
    const orderChannel = getOrderChannel(restaurantId);
    const tableChannel = getTableChannel(restaurantId);
    
    console.log(`[useSocketEvents] Subscribing to channels for restaurant ${restaurantId}:`);
    console.log(`  - Order channel: ${orderChannel}`);
    console.log(`  - Table channel: ${tableChannel}`);
    
    // Subscribe to channels
    const unsubscribeOrder = subscribe(orderChannel, handleOrderChannelEvent);
    const unsubscribeTable = subscribe(tableChannel, handleTableChannelEvent);
    
    // Check if subscriptions were successful
    const successCount = [unsubscribeOrder, unsubscribeTable].filter(Boolean).length;
    console.log(`[useSocketEvents] Subscribed to ${successCount}/2 channels`);
    
    if (successCount < 2) {
      console.warn('[useSocketEvents] Some subscriptions failed, will retry on next connection');
    }
    
    // Cleanup on unmount or when restaurantId changes
    return () => {
      console.log('[useSocketEvents] Unsubscribing from channels');
      unsubscribeOrder && unsubscribeOrder();
      unsubscribeTable && unsubscribeTable();
    };
  }, [
    isConnected,
    restaurantId,
    subscribe,
    handleOrderChannelEvent,
    handleTableChannelEvent,
  ]);

  // Return connection status and restaurantId for UI feedback
  return { isConnected, restaurantId };
};

export default useSocketEvents;
