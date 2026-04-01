/**
 * ⭐ PHASE 3: Socket.IO Integration
 * Added: addOrder(), updateSingleOrder(), removeOrder(), hasOrder()
 * Modified: 2026-04-01
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import * as orderService from '../api/services/orderService';

// Create Order Context
const OrderContext = createContext(null);

// Order Provider Component
export const OrderProvider = ({ children }) => {
  // Single unified array - includes all orders (tables, walk-ins, rooms)
  const [orders, setOrdersState] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Set orders from LoadingPage
  const setOrders = useCallback((ordersList) => {
    setOrdersState(ordersList || []);
    setIsLoaded(true);
  }, []);

  // Clear orders (e.g. on logout)
  const clearOrders = useCallback(() => {
    setOrdersState([]);
    setIsLoaded(false);
  }, []);

  // Refresh orders — re-fetch from API and update context
  const refreshOrders = useCallback(async (roleName = 'Manager') => {
    const fresh = await orderService.getRunningOrders(roleName);
    setOrdersState(fresh || []);
  }, []);

  // ⭐ PHASE 3: Socket.IO - Add single order to context
  const addOrder = useCallback((order) => {
    if (!order?.orderId) return;
    setOrdersState(prev => {
      // Check if order already exists
      const exists = prev.some(o => o.orderId === order.orderId);
      if (exists) {
        console.log(`[OrderContext] Order ${order.orderId} already exists, skipping add`);
        return prev;
      }
      console.log(`[OrderContext] Adding order ${order.orderId}`);
      return [...prev, order];
    });
  }, []);

  // ⭐ PHASE 3: Socket.IO - Update single order in context
  const updateSingleOrder = useCallback((order) => {
    if (!order?.orderId) return;
    setOrdersState(prev => {
      const index = prev.findIndex(o => o.orderId === order.orderId);
      if (index === -1) {
        // Order not found, add it
        console.log(`[OrderContext] Order ${order.orderId} not found, adding`);
        return [...prev, order];
      }
      // Replace existing order
      console.log(`[OrderContext] Updating order ${order.orderId}`);
      const updated = [...prev];
      updated[index] = order;
      return updated;
    });
  }, []);

  // ⭐ PHASE 3: Socket.IO - Remove order from context
  const removeOrder = useCallback((orderId) => {
    if (!orderId) return;
    setOrdersState(prev => {
      const filtered = prev.filter(o => o.orderId !== orderId);
      if (filtered.length !== prev.length) {
        console.log(`[OrderContext] Removed order ${orderId}`);
      }
      return filtered;
    });
  }, []);

  // ⭐ PHASE 3: Socket.IO - Check if order exists in context
  const hasOrder = useCallback((orderId) => {
    return orders.some(o => o.orderId === orderId);
  }, [orders]);

  // --- Computed: orders by type (filter by isRoom in DashboardPage when needed) ---
  const dineInOrders = useMemo(() =>
    orders.filter(o => o.orderType === 'dineIn' && !o.isRoom),
    [orders]
  );

  const takeAwayOrders = useMemo(() =>
    orders.filter(o => o.orderType === 'takeAway'),
    [orders]
  );

  const deliveryOrders = useMemo(() =>
    orders.filter(o => o.orderType === 'delivery'),
    [orders]
  );

  // --- Computed: dine-in split by table vs walk-in ---
  const tableOrders = useMemo(() =>
    dineInOrders.filter(o => !o.isWalkIn),
    [dineInOrders]
  );

  const walkInOrders = useMemo(() =>
    dineInOrders.filter(o => o.isWalkIn),
    [dineInOrders]
  );

  // --- Helpers ---
  // Get order by table/room ID (works for both - uses tableId field)
  const getOrderByTableId = useCallback((tableId) => {
    return orders.find(o => o.tableId === tableId && !o.isWalkIn) || null;
  }, [orders]);

  // Get all orders for a table/room (multiple orders possible)
  const getOrdersByTableId = useCallback((tableId) => {
    return orders.filter(o => o.tableId === tableId && !o.isWalkIn);
  }, [orders]);

  // Build orderItems map keyed by table/room ID (works for both)
  const orderItemsByTableId = useMemo(() => {
    const map = {};
    // Include both table orders and room orders
    for (const order of orders) {
      if (!order.isWalkIn && order.tableId) {
        map[order.tableId] = {
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          customer: order.customer,
          phone: order.phone,
          waiter: '',
          items: order.items,
          amount: order.amount,
          time: order.time,
          status: order.status,
          tableStatus: order.tableStatus,
          punchedBy: order.punchedBy,
          orderNote: order.orderNote,
          isRoom: order.isRoom,
          associatedOrders: order.associatedOrders || [],
        };
      }
    }
    return map;
  }, [orders]);

  const value = useMemo(() => ({
    // State (unified - includes all orders)
    orders,
    isLoaded,

    // Actions
    setOrders,
    clearOrders,
    refreshOrders,
    
    // ⭐ PHASE 3: Socket.IO - New actions
    addOrder,
    updateSingleOrder,
    removeOrder,
    hasOrder,

    // Computed
    dineInOrders,
    takeAwayOrders,
    deliveryOrders,
    tableOrders,
    walkInOrders,

    // Helpers (work for both tables and rooms)
    getOrderByTableId,
    getOrdersByTableId,
    orderItemsByTableId,
  }), [
    orders, isLoaded,
    setOrders, clearOrders, refreshOrders,
    addOrder, updateSingleOrder, removeOrder, hasOrder,
    dineInOrders, takeAwayOrders, deliveryOrders,
    tableOrders, walkInOrders,
    getOrderByTableId, getOrdersByTableId, orderItemsByTableId,
  ]);

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};

// Custom hook
export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

export default OrderContext;
