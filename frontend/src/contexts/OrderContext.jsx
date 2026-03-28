import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import * as orderService from '../api/services/orderService';

// Create Order Context
const OrderContext = createContext(null);

// Order Provider Component
export const OrderProvider = ({ children }) => {
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

  // Refresh orders — re-fetch from API and update context (now includes room orders)
  const refreshOrders = useCallback(async (roleName = 'Manager') => {
    const fresh = await orderService.getRunningOrders(roleName, { includeRooms: true });
    setOrdersState(fresh || []);
  }, []);

  // --- Computed: orders by type ---
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

  // Room orders
  const roomOrders = useMemo(() =>
    orders.filter(o => o.isRoom),
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
  // Get order by table ID (for enriching table cards)
  const getOrderByTableId = useCallback((tableId) => {
    return orders.find(o => o.tableId === tableId && !o.isWalkIn && !o.isRoom) || null;
  }, [orders]);

  // Get order by room ID (for enriching room cards)
  const getOrderByRoomId = useCallback((roomId) => {
    return orders.find(o => o.tableId === roomId && o.isRoom) || null;
  }, [orders]);

  // Get all orders for a table (multiple orders possible)
  const getOrdersByTableId = useCallback((tableId) => {
    return orders.filter(o => o.tableId === tableId && !o.isWalkIn && !o.isRoom);
  }, [orders]);

  // Get all orders for a room
  const getOrdersByRoomId = useCallback((roomId) => {
    return orders.filter(o => o.tableId === roomId && o.isRoom);
  }, [orders]);

  // Build orderItems map keyed by table's API id (for DineInCard compatibility)
  const orderItemsByTableId = useMemo(() => {
    const map = {};
    for (const order of dineInOrders) {
      if (!order.isWalkIn && order.tableId) {
        map[order.tableId] = {
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          customer: order.customer,
          phone: order.phone,
          waiter: '', // Not available from this API
          items: order.items,
          amount: order.amount,
          time: order.time,
          status: order.status,
          tableStatus: order.tableStatus,
          punchedBy: order.punchedBy,
          orderNote: order.orderNote,
        };
      }
    }
    return map;
  }, [dineInOrders]);

  // Build orderItems map for rooms
  const orderItemsByRoomId = useMemo(() => {
    const map = {};
    for (const order of roomOrders) {
      if (order.tableId) {
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
        };
      }
    }
    return map;
  }, [roomOrders]);

  const value = useMemo(() => ({
    // State
    orders,
    isLoaded,

    // Actions
    setOrders,
    clearOrders,
    refreshOrders,

    // Computed
    dineInOrders,
    takeAwayOrders,
    deliveryOrders,
    roomOrders,
    tableOrders,
    walkInOrders,

    // Helpers
    getOrderByTableId,
    getOrderByRoomId,
    getOrdersByTableId,
    getOrdersByRoomId,
    orderItemsByTableId,
    orderItemsByRoomId,
  }), [
    orders, isLoaded,
    setOrders, clearOrders, refreshOrders,
    dineInOrders, takeAwayOrders, deliveryOrders, roomOrders,
    tableOrders, walkInOrders,
    getOrderByTableId, getOrderByRoomId,
    getOrdersByTableId, getOrdersByRoomId,
    orderItemsByTableId, orderItemsByRoomId,
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
