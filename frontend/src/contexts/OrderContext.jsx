import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import * as orderService from '../api/services/orderService';

// Create Order Context
const OrderContext = createContext(null);

// Order Provider Component
export const OrderProvider = ({ children }) => {
  // Single unified array - includes all orders (tables, walk-ins, rooms)
  const [orders, setOrdersState] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Mutable ref for polling (same pattern as engagedTablesRef in TableContext)
  const ordersRef = useRef([]);

  // Engaged orders state - for order-level locking during updates
  const [engagedOrders, setEngagedOrders] = useState(new Set());
  const engagedOrdersRef = useRef(new Set());

  // Set orders from LoadingPage
  const setOrders = useCallback((ordersList) => {
    const list = ordersList || [];
    setOrdersState(list);
    ordersRef.current = list;
    setIsLoaded(true);
  }, []);

  // Clear orders (e.g. on logout)
  const clearOrders = useCallback(() => {
    setOrdersState([]);
    ordersRef.current = [];
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
   * Set order engaged state (locked during update transactions)
   * @param {number} orderId
   * @param {boolean} engaged
   */
  const setOrderEngaged = useCallback((orderId, engaged) => {
    if (!orderId) return;
    const numericId = Number(orderId);
    console.log(`[OrderContext] setOrderEngaged: ${numericId} → ${engaged}`);
    const next = new Set(engagedOrdersRef.current);
    if (engaged) {
      next.add(numericId);
    } else {
      next.delete(numericId);
    }
    engagedOrdersRef.current = next;
    setEngagedOrders(next);
  }, []);

  /**
   * Check if an order is engaged
   * @param {number} orderId
   * @returns {boolean}
   */
  const isOrderEngaged = useCallback((orderId) => {
    return engagedOrders.has(Number(orderId));
  }, [engagedOrders]);

  /**
   * Get order by orderId
   * @param {number} orderId
   * @returns {object|null}
   */
  const getOrderById = useCallback((orderId) => {
    const numericId = Number(orderId);
    return orders.find(o => o.orderId === numericId) || null;
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
      let next;
      if (exists) {
        console.log('[OrderContext] addOrder: Order already exists, updating instead', order.orderId);
        next = prev.map(o => o.orderId === order.orderId ? order : o);
      } else {
        console.log('[OrderContext] addOrder: Adding new order', order.orderId);
        next = [...prev, order];
      }
      ordersRef.current = next;
      return next;
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
      let next;
      if (!exists) {
        console.log('[OrderContext] updateOrder: Order not found, adding', orderId);
        next = [...prev, updatedOrder];
      } else {
        console.log('[OrderContext] updateOrder: Updating order', orderId);
        next = prev.map(o => o.orderId === orderId ? updatedOrder : o);
      }
      ordersRef.current = next;
      return next;
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
    
    // Normalize to number — socket sends string, orders store number
    const numericId = Number(orderId);
    
    setOrdersState(prev => {
      console.log('[OrderContext] removeOrder: Removing order', numericId);
      const next = prev.filter(o => o.orderId !== numericId);
      ordersRef.current = next;
      return next;
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

  /**
   * Poll until an order is removed from context (by socket handler)
   * Same pattern as waitForTableEngaged in TableContext
   */
  const waitForOrderRemoval = useCallback((orderId, timeout = 5000) => {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const exists = ordersRef.current.some(o => o.orderId === orderId);
        if (!exists) {
          console.log(`[OrderContext] waitForOrderRemoval: Order ${orderId} removed`);
          resolve(true);
          return;
        }
        if (Date.now() - start > timeout) {
          console.warn(`[OrderContext] waitForOrderRemoval: timeout for ${orderId}`);
          resolve(false);
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }, []);

  /**
   * Poll until an order is ready for post-payment actions (e.g. auto-print bill).
   * Resolves with the RESOLVED ORDER OBJECT when BOTH:
   *   - order is present in ordersRef (socket data hydrated)
   *   - order is NOT engaged (lock released)
   *
   * Reading from ordersRef at resolve-time avoids React closure staleness —
   * callers cannot rely on `getOrderById` inside the same handler because it
   * snapshots `orders` state via useCallback dep.
   *
   * Event-driven wait; timeout is a SAFETY CAP only (typical resolve < 1s).
   * On timeout → resolves null (caller should log hard error and skip the action;
   * never print partial / stale data).
   *
   * BUG-273 (Session 16b, Feb 2026): returns order object instead of boolean
   * to bypass closure staleness that caused getOrderById(id) === null even
   * after waitForOrderReady(id) resolved true.
   *
   * @param {number} orderId - Order ID to wait for
   * @param {number} timeout - Max wait time in ms (default 3000)
   * @returns {Promise<object|null>} - the order object when ready, null on timeout
   */
  const waitForOrderReady = useCallback((orderId, timeout = 3000) => {
    return new Promise((resolve) => {
      const start = Date.now();
      const targetId = Number(orderId);
      const check = () => {
        const matched = ordersRef.current.find(o => Number(o.orderId) === targetId);
        const notEngaged = !engagedOrdersRef.current.has(targetId);
        if (matched && notEngaged) {
          console.log(`[OrderContext] waitForOrderReady: Order ${orderId} ready (in context + engage free)`);
          resolve(matched);
          return;
        }
        if (Date.now() - start > timeout) {
          console.warn(`[OrderContext] waitForOrderReady: timeout for order ${orderId} (inContext=${!!matched}, notEngaged=${notEngaged})`);
          resolve(null);
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }, []);

  /**
   * Poll until an order becomes engaged (locked) via socket
   * Used by OrderEntry to wait for socket confirmation before redirect
   * @param {number} orderId - Order ID to wait for
   * @param {number} timeout - Max wait time in ms (default 5000)
   * @returns {Promise<boolean>} - true if engaged, false if timeout
   */
  const waitForOrderEngaged = useCallback((orderId, timeout = 5000) => {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (engagedOrdersRef.current.has(Number(orderId))) {
          console.log(`[OrderContext] waitForOrderEngaged: Order ${orderId} engaged`);
          resolve(true);
        } else if (Date.now() - start > timeout) {
          console.warn(`[OrderContext] waitForOrderEngaged: timeout for order ${orderId}`);
          resolve(false);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }, []);

  // Get all orders for a table/room (multiple orders possible)
  const getOrdersByTableId = useCallback((tableId) => {
    return orders.filter(o => o.tableId === tableId && !o.isWalkIn);
  }, [orders]);

  // Build orderItems map keyed by table/room ID (works for both)
  // Returns ARRAY of orders per tableId to support split orders (1:N)
  const orderItemsByTableId = useMemo(() => {
    const map = {};
    // Include both table orders and room orders
    for (const order of orders) {
      if (!order.isWalkIn && order.tableId) {
        const entry = {
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
          fOrderStatus: order.fOrderStatus,
          // ROOM_CHECKIN_GAP3 (Stage 2 follow-up, 2026-04-25): preserve room
          // booking financials through the orderItemsByTableId memo whitelist
          // so OrderEntry → CartPanel + CollectPaymentPanel can render the
          // Room pill, Room block, Grand-Total Stack row, and combined
          // Checkout amount. Null for non-room orders.
          roomInfo: order.roomInfo || null,
        };
        if (!map[order.tableId]) {
          map[order.tableId] = [];
        }
        map[order.tableId].push(entry);
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
    waitForOrderRemoval,
    waitForOrderEngaged,
    waitForOrderReady,

    // Order Engage (for order-level locking)
    engagedOrders,
    setOrderEngaged,
    isOrderEngaged,

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
    addOrder, updateOrder, removeOrder, getOrderById, waitForOrderRemoval, waitForOrderEngaged, waitForOrderReady,
    engagedOrders, setOrderEngaged, isOrderEngaged,
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
