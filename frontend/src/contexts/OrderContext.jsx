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

  // Refresh orders — re-fetch from API and update context
  const refreshOrders = useCallback(async (roleName = 'Manager') => {
    const fresh = await orderService.getRunningOrders(roleName);
    setOrdersState(fresh || []);
  }, []);

  // --- Computed: orders by type ---
  const dineInOrders = useMemo(() =>
    orders.filter(o => o.orderType === 'dineIn'),
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
  // Get order by table ID (for enriching table cards)
  const getOrderByTableId = useCallback((tableId) => {
    return orders.find(o => o.tableId === tableId && !o.isWalkIn) || null;
  }, [orders]);

  // Get all orders for a table (multiple orders possible)
  const getOrdersByTableId = useCallback((tableId) => {
    return orders.filter(o => o.tableId === tableId && !o.isWalkIn);
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
    tableOrders,
    walkInOrders,

    // Helpers
    getOrderByTableId,
    getOrdersByTableId,
    orderItemsByTableId,
  }), [
    orders, isLoaded,
    setOrders, clearOrders, refreshOrders,
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
