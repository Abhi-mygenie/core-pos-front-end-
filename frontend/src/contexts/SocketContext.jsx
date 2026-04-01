/**
 * ⭐ PHASE 3: Socket.IO Integration
 * Socket Context - Manages socket connection state and event routing
 * Created: 2026-04-01
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import socketService, { CONNECTION_STATES } from '../api/services/socketService';
import { useRestaurant } from './RestaurantContext';
import { useOrders } from './OrderContext';
import { useTables } from './TableContext';
import { useToast } from '../hooks/use-toast';
import * as orderService from '../api/services/orderService';
import { fromAPI } from '../api/transforms/orderTransform';

// Create Socket Context
const SocketContext = createContext(null);

// Socket Provider Component
export const SocketProvider = ({ children }) => {
  const { restaurant } = useRestaurant();
  const { addOrder, updateSingleOrder, removeOrder, hasOrder, refreshOrders } = useOrders();
  const { updateTableStatus } = useTables();
  const { toast } = useToast();

  // Connection state
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastEventAt, setLastEventAt] = useState(null);

  // Track if we've connected at least once (to avoid duplicate connects)
  const hasConnectedRef = useRef(false);

  /**
   * Handle connection state changes
   */
  const handleConnectionStateChange = useCallback((state, attempt, extra = {}) => {
    setConnectionState(state);
    setReconnectAttempt(attempt);

    // If reconnected after long disconnect, refresh all orders
    if (extra.requiresRefresh) {
      console.log('[SocketContext] Long disconnect, refreshing all orders...');
      refreshOrders?.();
    }
  }, [refreshOrders]);

  /**
   * Handle new order event (full data in payload)
   */
  const handleNewOrder = useCallback(async (event) => {
    const { orderId, rawOrder } = event;
    setLastEventAt(new Date());

    try {
      // Transform raw API data to frontend format
      const transformedOrder = fromAPI.order(rawOrder);
      
      // Check if order already exists (shouldn't, but safety check)
      if (hasOrder?.(orderId)) {
        console.log(`[SocketContext] Order ${orderId} already exists, updating instead`);
        updateSingleOrder?.(transformedOrder);
      } else {
        console.log(`[SocketContext] Adding new order ${orderId}`);
        addOrder?.(transformedOrder);
      }

      // Show toast notification
      const tableName = transformedOrder.isWalkIn 
        ? 'Walk-in' 
        : `Table ${transformedOrder.tableNumber}`;
      
      toast({
        title: `New Order #${transformedOrder.orderNumber || orderId}`,
        description: `${tableName} • ₹${transformedOrder.amount}`,
        duration: 3000,
      });

    } catch (error) {
      console.error('[SocketContext] Error processing new order:', error);
    }
  }, [addOrder, updateSingleOrder, hasOrder, toast]);

  /**
   * Handle order update events (may require API call)
   */
  const handleUpdateOrder = useCallback(async (event) => {
    const { type, orderId, requiresApiCall, shouldRemove, fOrderStatus } = event;
    setLastEventAt(new Date());

    // If should remove (paid/cancelled), remove from context
    if (shouldRemove) {
      console.log(`[SocketContext] Removing order ${orderId} (status: ${fOrderStatus})`);
      removeOrder?.(orderId);
      return;
    }

    // If API call required, fetch fresh data
    if (requiresApiCall) {
      // Check if already fetching this order
      if (socketService.isOrderInFlight(orderId)) {
        console.log(`[SocketContext] Order ${orderId} already being fetched, skipping`);
        return;
      }

      socketService.setOrderInFlight(orderId, true);

      try {
        console.log(`[SocketContext] Fetching order ${orderId}...`);
        const freshOrder = await orderService.getSingleOrder(orderId);
        
        if (!freshOrder) {
          // Order not found (404) - remove from context
          console.log(`[SocketContext] Order ${orderId} not found, removing from context`);
          removeOrder?.(orderId);
          return;
        }

        // Check if order should be removed based on fresh status
        if ([3, 6].includes(freshOrder.fOrderStatus)) {
          console.log(`[SocketContext] Order ${orderId} is ${freshOrder.fOrderStatus === 6 ? 'paid' : 'cancelled'}, removing`);
          removeOrder?.(orderId);
          return;
        }

        // Update or add order
        if (hasOrder?.(orderId)) {
          console.log(`[SocketContext] Updating order ${orderId}`);
          updateSingleOrder?.(freshOrder);
        } else {
          console.log(`[SocketContext] Adding order ${orderId} (not in context)`);
          addOrder?.(freshOrder);
          
          // Show toast for scan-new-order (needs confirmation)
          if (type === 'scan-new-order') {
            toast({
              title: 'New Order Needs Confirmation',
              description: `Order #${freshOrder.orderNumber || orderId} from scan`,
              variant: 'warning',
              duration: 5000,
            });
          }
        }

      } catch (error) {
        console.error(`[SocketContext] Error fetching order ${orderId}:`, error);
        
        // If 404, remove from context
        if (error.response?.status === 404) {
          removeOrder?.(orderId);
        } else {
          toast({
            title: 'Sync Failed',
            description: `Failed to update order ${orderId}`,
            variant: 'destructive',
            duration: 3000,
          });
        }
      } finally {
        socketService.setOrderInFlight(orderId, false);
      }
    }
  }, [addOrder, updateSingleOrder, removeOrder, hasOrder, toast]);

  /**
   * Handle table update event (no API call)
   */
  const handleUpdateTable = useCallback((event) => {
    const { tableId, isEngaged, engageStatus } = event;
    setLastEventAt(new Date());

    console.log(`[SocketContext] Updating table ${tableId} → ${engageStatus}`);
    updateTableStatus?.(tableId, engageStatus);

    // If table is freed, also remove any order for that table
    if (!isEngaged) {
      // Note: removeOrderByTableId would need to be added to OrderContext
      // For now, the order removal happens via update-order-status event
    }
  }, [updateTableStatus]);

  /**
   * Handle socket errors
   */
  const handleError = useCallback((error) => {
    console.error('[SocketContext] Socket error:', error);
    toast({
      title: 'Connection Error',
      description: 'Lost connection to server. Reconnecting...',
      variant: 'destructive',
      duration: 3000,
    });
  }, [toast]);

  /**
   * Connect to socket when restaurant is loaded
   */
  useEffect(() => {
    if (restaurant?.restaurantId && !hasConnectedRef.current) {
      console.log(`[SocketContext] Restaurant loaded (ID: ${restaurant.restaurantId}), connecting socket...`);
      
      // Set up event handlers
      socketService.onConnectionStateChange = handleConnectionStateChange;
      socketService.onNewOrder = handleNewOrder;
      socketService.onUpdateOrder = handleUpdateOrder;
      socketService.onUpdateTable = handleUpdateTable;
      socketService.onError = handleError;

      // Connect
      socketService.connect(restaurant.restaurantId);
      hasConnectedRef.current = true;
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount - socket should persist across page navigation
      // Disconnect is handled by logout
    };
  }, [restaurant?.restaurantId, handleConnectionStateChange, handleNewOrder, handleUpdateOrder, handleUpdateTable, handleError]);

  /**
   * Manual reconnect function
   */
  const reconnect = useCallback(() => {
    socketService.reconnect();
  }, []);

  /**
   * Disconnect socket (called on logout)
   */
  const disconnect = useCallback(() => {
    socketService.disconnect();
    hasConnectedRef.current = false;
  }, []);

  // Context value
  const value = useMemo(() => ({
    // State
    connectionState,
    reconnectAttempt,
    lastEventAt,
    
    // Computed
    isConnected: connectionState === CONNECTION_STATES.CONNECTED,
    isReconnecting: connectionState === CONNECTION_STATES.RECONNECTING,
    hasError: connectionState === CONNECTION_STATES.ERROR,
    
    // Actions
    reconnect,
    disconnect,
  }), [connectionState, reconnectAttempt, lastEventAt, reconnect, disconnect]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use Socket Context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
