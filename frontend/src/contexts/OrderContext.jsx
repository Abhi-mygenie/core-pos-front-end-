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

  // ===========================================================================
  // SOCKET UPDATE FUNCTIONS
  // ===========================================================================

  /**
   * Get order by orderId
   * @param {number} orderId
   * @returns {object|null}
   */
  const getOrderById = useCallback((orderId) => {
    return orders.find(o => o.orderId === orderId) || null;
  }, [orders]);

  /**
   * Add a new order (from socket: new-order, scan-new-order)
   * @param {object} order - Transformed order object
   */
  const addOrder = useCallback((order) => {
    if (!order || !order.orderId) {
      console.warn('[OrderContext] addOrder: Invalid order', order);
      return;
    }
    
    setOrdersState(prev => {
      // Check if order already exists (prevent duplicates)
      const exists = prev.some(o => o.orderId === order.orderId);
      if (exists) {
        console.log('[OrderContext] addOrder: Order already exists, updating instead', order.orderId);
        return prev.map(o => o.orderId === order.orderId ? order : o);
      }
      console.log('[OrderContext] addOrder: Adding new order', order.orderId);
      return [...prev, order];
    });
  }, []);

  /**
   * Update an existing order (from socket: update-order, update-food-status, etc.)
   * @param {number} orderId
   * @param {object} updatedOrder - Transformed order object
   */
  const updateOrder = useCallback((orderId, updatedOrder) => {
    if (!orderId || !updatedOrder) {
      console.warn('[OrderContext] updateOrder: Invalid params', { orderId, updatedOrder });
      return;
    }

    setOrdersState(prev => {
      const exists = prev.some(o => o.orderId === orderId);
      if (!exists) {
        console.log('[OrderContext] updateOrder: Order not found, adding', orderId);
        return [...prev, updatedOrder];
      }
      console.log('[OrderContext] updateOrder: Updating order', orderId);
      return prev.map(o => o.orderId === orderId ? updatedOrder : o);
    });
  }, []);

  /**
   * Remove an order (when paid/cancelled)
   * @param {number} orderId
   */
  const removeOrder = useCallback((orderId) => {
    if (!orderId) {
      console.warn('[OrderContext] removeOrder: Invalid orderId');
      return;
    }
    
    setOrdersState(prev => {
      console.log('[OrderContext] removeOrder: Removing order', orderId);
      return prev.filter(o => o.orderId !== orderId);
    });
  }, []);

  // ===========================================================================
  // COMPUTED VALUES
  // ===========================================================================

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

    // Socket Update Actions
    addOrder,
    updateOrder,
    removeOrder,
    getOrderById,

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
    addOrder, updateOrder, removeOrder, getOrderById,
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
