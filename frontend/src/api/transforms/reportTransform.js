// Report Transform - Normalizes 5+ different report API response shapes into common schema
// Phase 4A: Order Reports

/**
 * Common order schema for all report tabs:
 * {
 *   id: number,                    // order_id (API: id)
 *   orderId: string,               // display order ID (API: restaurant_order_id)
 *   amount: number,                // total amount (API: order_amount)
 *   customer: string,              // customer name (API: user_name)
 *   customerContact: { name, phone, email },
 *   waiter: string,                // staff name (API: waiter_name)
 *   table: string,                 // table/room display (smart logic)
 *   tableId: number|null,          // numeric table ID (API: table_id)
 *   orderIn: string|null,          // 'RM' = room order, 'SRM' = shifted to room, null = table/counter
 *   roomId: string|null,           // Room ID for SRM orders (API: parent_order_id)
 *   location: object,              // { type, display, tableId, tableName, roomId }
 *   paymentMethod: string,         // cash, card, upi, TAB, Merge, ROOM, etc.
 *   paymentType: string,           // Prepaid, Postpaid (API: payment_type)
 *   paymentStatus: string,         // paid, unpaid (API: payment_status)
 *   tax: { gst, vat, service },    // tax breakdown
 *   discount: number,              // discount amount
 *   tip: number,                   // tip amount
 *   createdAt: string,             // order creation time
 *   collectedAt: string,           // payment collection time
 *   channel: string|null,          // dinein, takeaway, delivery, room (GAP-001: often missing)
 *   platform: string|null,         // pos, web, zomato, swiggy (GAP-002: often missing)
 *   orderType: string,             // raw order_type from API
 *   transactionRef: string,        // transaction ID
 *   // Tab-specific fields:
 *   cancellationReason: string,    // Cancelled tab only
 *   cancellationType: string,      // Pre-Serve, Post-Serve
 *   cancelledBy: string,           // who cancelled
 *   aggregatorPlatform: string,    // Aggregator tab: zomato, swiggy
 *   riderName: string,             // Aggregator tab
 *   riderPhone: string,            // Aggregator tab
 *   deliveryAddress: object,       // Aggregator tab
 *   items: array,                  // order items (only in detail/cancel endpoints)
 * }
 */

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format currency amount
 */
const formatAmount = (val) => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

/**
 * Format date string to readable format
 */
const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return dateStr;
  }
};

/**
 * Extract customer contact info
 */
const extractCustomerContact = (api) => ({
  name: api.user_name || api.cust_name || '',
  phone: api.cust_mobile || api.user_phone || api.phone || '',
  email: api.cust_email || api.user_email || '',
});

/**
 * Extract tax breakdown
 */
const extractTax = (api) => ({
  gst: formatAmount(api.gst_tax),
  vat: formatAmount(api.vat_tax),
  service: formatAmount(api.service_tax),
  total: formatAmount(api.gst_tax) + formatAmount(api.vat_tax) + formatAmount(api.service_tax),
});

/**
 * Extract location info (Table vs Room)
 * order_in values:
 *   - null/empty: POS/Table/Counter order
 *   - 'RM': Order taken directly in Room
 *   - 'SRM': Order shifted to Room (originally table or walk-in, then transferred)
 * parent_order_id: Room ID when order_in === 'SRM'
 */
const extractLocation = (api) => {
  const orderIn = api.order_in || null;
  const tableId = api.table_id || null;
  const tableName = api.table_no || null;
  const roomId = orderIn === 'SRM' ? api.parent_order_id : null;
  
  let type, display;
  
  if (orderIn === 'RM') {
    // Order taken directly in room
    type = 'room';
    display = 'Room';
  } else if (orderIn === 'SRM') {
    // Order shifted to room (from table or walk-in)
    type = 'room_transfer';
    display = `→ R${roomId}`;
  } else if (tableId && tableId > 0) {
    // Regular table order
    type = 'table';
    display = tableName || `T${tableId}`;
  } else {
    // Counter/Walk-in
    type = 'counter';
    display = '—';
  }
  
  return {
    type,
    display,
    tableId,
    tableName,
    roomId,
    orderIn,
  };
};

// =============================================================================
// FROM API TRANSFORMS - Normalize different endpoint responses
// =============================================================================

export const reportFromAPI = {
  /**
   * Transform paid-order-list response (32 fields)
   * Used for: Paid tab, Room Transfer tab
   */
  paidOrder: (api) => {
    const location = extractLocation(api);
    return {
      id: api.id,
      orderId: api.restaurant_order_id || `#${api.id}`,
      amount: formatAmount(api.order_amount),
      customer: api.user_name || 'Guest',
      customerContact: extractCustomerContact(api),
      waiter: api.waiter_name || '—',
      table: location.display,
      tableId: location.tableId,
      orderIn: location.orderIn,
      roomId: location.roomId,
      location,
      paymentMethod: api.payment_method || 'cash',
      paymentType: api.payment_type || '—',
      paymentStatus: api.payment_status || 'paid',
      tax: extractTax(api),
      discount: formatAmount(api.restaurant_discount_amount || api.discount_value || 0),
      tip: formatAmount(api.tip_amount || 0),
      createdAt: formatDate(api.created_at),
      collectedAt: formatDate(api.order_date || api.updated_at),
      channel: null, // GAP-001: missing from this endpoint
      platform: null, // GAP-002: missing from this endpoint
      orderType: api.order_type || null,
      transactionRef: api.transection_id || api.transaction_id || '',
      // Raw API data for debugging
      _raw: api,
    };
  },

  /**
   * Transform cancel-order-list response (100+ fields - richest)
   * Used for: Cancelled tab, Merged tab
   */
  cancelledOrder: (api) => {
    const location = extractLocation(api);
    return {
      id: api.id,
      orderId: api.restaurant_order_id || `#${api.id}`,
      amount: formatAmount(api.order_amount),
      customer: api.user_name || 'Guest',
      customerContact: extractCustomerContact(api),
      waiter: api.waiter_name || '—',
      table: location.display,
      tableId: location.tableId,
      orderIn: location.orderIn,
      roomId: location.roomId,
      location,
      paymentMethod: api.payment_method || 'cancelled',
      paymentType: api.payment_type || '—',
      paymentStatus: api.payment_status || 'cancelled',
      tax: extractTax(api),
      discount: formatAmount(api.restaurant_discount_amount || api.discount_value || 0),
      tip: formatAmount(api.tip_amount || 0),
      createdAt: formatDate(api.created_at),
      collectedAt: formatDate(api.cancelled_at || api.updated_at),
      channel: api.order_type === 'dinein' ? 'dinein' : 
               api.order_type === 'delivery' ? 'delivery' : 
               api.order_type === 'take_away' ? 'takeaway' : null, // Partial mapping from order_type
      platform: api.order_type === 'pos' ? 'pos' : null, // order_type mixes channel+platform
      orderType: api.order_type || null,
      transactionRef: api.transection_id || api.transaction_id || '',
      // Cancelled-specific fields
      cancellationReason: api.cancel_reason || api.cancellation_reason || '—',
      cancellationType: api.cancel_type || '—', // Pre-Serve, Post-Serve
      cancelledBy: api.cancelled_by || api.cancel_by_name || '—',
      // Items available in this endpoint
      items: (api.orderDetails || api.order_details || []).map(item => ({
        id: item.id,
        name: item.food_details?.name || item.food_name || 'Unknown',
        qty: item.quantity || 1,
        price: formatAmount(item.price),
        status: item.food_status,
      })),
      _raw: api,
    };
  },

  /**
   * Transform paid-in-tab-order-list response (23 fields - leanest)
   * Used for: Credit tab
   */
  creditOrder: (api) => {
    const location = extractLocation(api);
    return {
      id: api.id,
      orderId: api.restaurant_order_id || `#${api.id}`,
      amount: formatAmount(api.order_amount),
      customer: api.user_name || 'Guest',
      customerContact: extractCustomerContact(api),
      waiter: '—', // INCONSISTENCY-003: missing from this endpoint
      table: location.display,
      tableId: location.tableId,
      orderIn: location.orderIn,
      roomId: location.roomId,
      location,
      paymentMethod: api.payment_method || 'TAB',
      paymentType: '—', // INCONSISTENCY-003: missing from this endpoint
      paymentStatus: api.payment_status || 'credit',
      tax: extractTax(api),
      discount: formatAmount(api.restaurant_discount_amount || api.discount_value || 0),
      tip: 0, // INCONSISTENCY-003: missing from this endpoint
      createdAt: formatDate(api.created_at),
      collectedAt: null, // Credit = not yet collected
      channel: null, // GAP-001
      platform: null, // GAP-002
      orderType: null,
      transactionRef: '',
      _raw: api,
    };
  },

  /**
   * Transform paid-paylater-order-list response (31 fields)
   * Used for: On Hold tab
   * NOTE: ISSUE-001 - This endpoint returns same data as paid-order-list (backend bug)
   */
  holdOrder: (api) => {
    const location = extractLocation(api);
    return {
      id: api.id,
      orderId: api.restaurant_order_id || `#${api.id}`,
      amount: formatAmount(api.order_amount),
      customer: api.user_name || 'Guest',
      customerContact: extractCustomerContact(api),
      waiter: api.waiter_name || '—',
      table: location.display,
      tableId: location.tableId,
      orderIn: location.orderIn,
      roomId: location.roomId,
      location,
      paymentMethod: api.payment_method || 'hold',
      paymentType: api.payment_type || '—',
      paymentStatus: api.payment_status || 'hold',
      tax: extractTax(api),
      discount: formatAmount(api.restaurant_discount_amount || api.discount_value || 0),
      tip: formatAmount(api.tip_amount || 0),
      createdAt: formatDate(api.created_at),
      collectedAt: null,
      channel: null, // GAP-001
      platform: null, // GAP-002
      orderType: api.order_type || null,
      transactionRef: api.transection_id || '',
      _raw: api,
    };
  },

  /**
   * Transform urbanpiper/get-complete-order-list response (nested structure)
   * Used for: Aggregator tab (Zomato, Swiggy)
   */
  aggregatorOrder: (api) => {
    const orderDetails = api.order_details_order || {};
    const customerDetails = api.customer_details || {};
    const foodItems = api.order_details_food || [];

    return {
      id: orderDetails.id || api.id,
      orderId: orderDetails.restaurant_order_id || `#${orderDetails.id}`,
      amount: formatAmount(orderDetails.order_amount),
      customer: customerDetails.name || orderDetails.user_name || 'Guest',
      customerContact: {
        name: customerDetails.name || '',
        phone: customerDetails.phone || '',
        email: customerDetails.email || '',
      },
      waiter: '—', // Aggregator orders don't have waiter
      table: '—', // Aggregator orders don't have table
      paymentMethod: orderDetails.payment_method || 'online',
      paymentType: orderDetails.payment_type || 'Prepaid',
      paymentStatus: orderDetails.payment_status || 'paid',
      tax: {
        gst: formatAmount(orderDetails.gst_tax),
        vat: formatAmount(orderDetails.vat_tax),
        service: formatAmount(orderDetails.service_tax),
        total: formatAmount(orderDetails.gst_tax) + formatAmount(orderDetails.vat_tax) + formatAmount(orderDetails.service_tax),
      },
      discount: formatAmount(orderDetails.restaurant_discount_amount || 0),
      tip: formatAmount(orderDetails.tip_amount || 0),
      createdAt: formatDate(orderDetails.created_at),
      collectedAt: formatDate(orderDetails.order_date),
      channel: 'delivery', // Aggregator = always delivery
      platform: api.order_plateform || api.order_platform || 'aggregator', // Note: API has typo "plateform"
      orderType: orderDetails.order_type || 'delivery',
      transactionRef: orderDetails.transection_id || '',
      // Aggregator-specific fields
      aggregatorPlatform: api.order_plateform || api.order_platform || '',
      riderName: api.rider_name || '—',
      riderPhone: api.rider_phone_number || '',
      deliveryAddress: {
        line1: customerDetails.address?.line_1 || '',
        subLocality: customerDetails.address?.sub_locality || '',
        city: customerDetails.address?.city || '',
      },
      urbanOrderId: api.urban_order_id || '',
      storeId: api.store_id || '',
      prepTime: api.prep_time_mins || 0,
      // Items
      items: foodItems.map(item => ({
        id: item.id,
        name: item.food_details?.name || item.name || 'Unknown',
        qty: item.quantity || 1,
        price: formatAmount(item.price),
      })),
      _raw: api,
    };
  },

  /**
   * Transform employee-order-details response (108+ fields)
   * Used for: Side sheet drill-down
   * NOTE: Response is nested as orders.order_details_order
   */
  orderDetails: (api) => {
    // Handle nested structure: { orders: { order_details_order: {...}, order_details_food: [...] } }
    const ordersWrapper = api.orders || api;
    const order = ordersWrapper.order_details_order || ordersWrapper.order || api;
    const foodItems = ordersWrapper.order_details_food || order.orderDetails || order.order_details || [];
    const table = order.restaurantTable || {};
    const employee = order.vendorEmployee || {};
    const user = order.user || {};

    return {
      id: order.id,
      orderId: order.restaurant_order_id || `#${order.id}`,
      amount: formatAmount(order.order_amount),
      customer: order.user_name || user.f_name || 'Guest',
      customerContact: {
        name: order.user_name || user.f_name || '',
        phone: order.cust_mobile || user.phone || '',
        email: order.cust_email || user.email || '',
      },
      waiter: order.waiter_name || employee.f_name || '—',
      table: order.table_no || table.table_no || '—',
      tableArea: table.title || order.restaurant_table_area || '—',
      paymentMethod: order.payment_method || '—',
      paymentType: order.payment_type || '—',
      paymentStatus: order.payment_status || '—',
      tax: extractTax(order),
      discount: formatAmount(order.restaurant_discount_amount || order.discount_value || 0),
      tip: formatAmount(order.tip_amount || 0),
      subtotal: formatAmount(order.sub_total || order.order_sub_total_amount),
      createdAt: formatDate(order.created_at),
      collectedAt: formatDate(order.order_date || order.updated_at),
      channel: order.order_type === 'dinein' ? 'dinein' : 
               order.order_type === 'delivery' ? 'delivery' : 
               order.order_type === 'take_away' ? 'takeaway' : null,
      platform: order.order_type === 'pos' ? 'pos' : null,
      orderType: order.order_type || null,
      transactionRef: order.transection_id || order.transaction_id || '',
      // Cancellation fields (if cancelled)
      cancellationReason: order.cancel_reason || order.cancellation_reason || null,
      cancellationType: order.cancel_type || null,
      cancelledBy: order.cancelled_by || order.cancel_by_name || null,
      // Order items - use foodItems from wrapper or fallback
      items: foodItems.map(item => {
        const food = item.food_details || {};
        return {
          id: item.id,
          foodId: food.id,
          name: food.name || item.name || 'Unknown Item',
          qty: item.quantity || 1,
          price: formatAmount(item.price),
          unitPrice: formatAmount(item.unit_price),
          status: item.food_status,
          variation: item.variation || [],
          addOns: item.add_ons || [],
          notes: item.food_level_notes || '',
        };
      }),
      // Loyalty/Coupon/Wallet info
      loyaltyPoints: formatAmount(order.loyalty_points_used || 0),
      couponDiscount: formatAmount(order.coupon_discount || 0),
      walletAmount: formatAmount(order.wallet_amount || 0),
      _raw: api,
    };
  },
};

// =============================================================================
// LIST TRANSFORMS - Process arrays of orders
// =============================================================================

export const reportListFromAPI = {
  paidOrders: (orders = []) => orders.map(reportFromAPI.paidOrder),
  cancelledOrders: (orders = []) => orders.map(reportFromAPI.cancelledOrder),
  creditOrders: (orders = []) => orders.map(reportFromAPI.creditOrder),
  holdOrders: (orders = []) => orders.map(reportFromAPI.holdOrder),
  aggregatorOrders: (orders = []) => orders.map(reportFromAPI.aggregatorOrder),
};

// =============================================================================
// FILTER HELPERS
// =============================================================================

/**
 * Filter paid orders to exclude Room Transfer orders
 */
export const filterPaidOrders = (orders) => {
  return orders.filter(o => !['ROOM', 'transferToRoom'].includes(o.paymentMethod));
};

/**
 * Filter paid orders to get only Room Transfer orders
 */
export const filterRoomTransferOrders = (orders) => {
  return orders.filter(o => ['ROOM', 'transferToRoom'].includes(o.paymentMethod));
};

/**
 * Filter cancelled orders to exclude Merged orders
 */
export const filterCancelledOrders = (orders) => {
  return orders.filter(o => o.paymentMethod !== 'Merge');
};

/**
 * Filter cancelled orders to get only Merged orders
 */
export const filterMergedOrders = (orders) => {
  return orders.filter(o => o.paymentMethod === 'Merge');
};

// =============================================================================
// SUMMARY CALCULATIONS
// =============================================================================

export const calculateSummary = (orders = []) => {
  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;

  return {
    totalOrders,
    totalAmount,
    avgOrderValue,
  };
};

// =============================================================================
// PAYMENT METHOD EXTRACTION
// =============================================================================

/**
 * Extract unique payment methods from orders for filter dropdown
 */
export const extractPaymentMethods = (orders = []) => {
  const methods = new Set();
  orders.forEach(o => {
    if (o.paymentMethod && o.paymentMethod !== '—') {
      methods.add(o.paymentMethod);
    }
  });
  return Array.from(methods).sort();
};

export default {
  fromAPI: reportFromAPI,
  listFromAPI: reportListFromAPI,
  filterPaidOrders,
  filterRoomTransferOrders,
  filterCancelledOrders,
  filterMergedOrders,
  calculateSummary,
  extractPaymentMethods,
};
