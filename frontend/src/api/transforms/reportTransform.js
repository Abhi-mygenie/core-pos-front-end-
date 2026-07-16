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
 * Get food status label from status code
 */
const getFoodStatusLabel = (status) => {
  const statusMap = {
    1: 'Preparing',
    2: 'Ready',
    3: 'Cancelled',
    5: 'Served',
    6: 'Paid',
  };
  return statusMap[status] || 'Unknown';
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

// BE-1 P4 — `cancel_type` literal set confirmed 2026-05-01 via live payload + DB DISTINCT:
//   `Pre-Serve` | `Post-Serve` | `Order` | `full`
//   - `Order` and `full` both mean "whole-order cancel" → renders blank (OQ-2 default).
//   - `Pre-Serve` / `Post-Serve` are the operational signal for the Cancelled tab.
// Add new literals here as backend ships them. Returns '' for absent / whole-order / unknown.
const CANCEL_TYPE_LABELS = {
  'Pre-Serve':  'Pre-Serve',
  'Post-Serve': 'Post-Serve',
  'Order':      '',
  'full':       '',
};
const normalizeCancelType = (raw) => (raw ? (CANCEL_TYPE_LABELS[raw] ?? '') : '');

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
  const tableName = api.table_name || null;
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
      waiter: api.waiter_name || '',
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
      ...(process.env.NODE_ENV === 'development' ? { _raw: api } : {}),
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
      waiter: api.waiter_name || '',
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
      // BE-1 P3 wired 2026-05-01 — canonical key is `cancellation_reason`.
      // No fallback; UI layer owns placeholder.
      cancellationReason: api.cancellation_reason || '',
      // BE-1 P4 wired 2026-05-01 — read from item-level `order_details_table[0].cancel_type`.
      // Literals observed: `Pre-Serve` / `Post-Serve` / `Order` (whole-order cancel → blank).
      cancellationType: normalizeCancelType(api.order_details_table?.[0]?.cancel_type),
      cancelledBy: api.cancelled_by || api.cancel_by_name || '—',
      // Items available in this endpoint
      items: (api.orderDetails || api.order_details || []).map(item => ({
        id: item.id,
        name: item.food_details?.name || item.food_name || 'Unknown',
        qty: item.quantity || 1,
        price: formatAmount(item.price),
        status: item.food_status,
      })),
      ...(process.env.NODE_ENV === 'development' ? { _raw: api } : {}),
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
      ...(process.env.NODE_ENV === 'development' ? { _raw: api } : {}),
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
      waiter: api.waiter_name || '',
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
      ...(process.env.NODE_ENV === 'development' ? { _raw: api } : {}),
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
      ...(process.env.NODE_ENV === 'development' ? { _raw: api } : {}),
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
      cancellationReason: order.cancellation_reason || null,
      cancellationType: normalizeCancelType(order.order_details_table?.[0]?.cancel_type) || null,
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
      ...(process.env.NODE_ENV === 'development' ? { _raw: api } : {}),
    };
  },

  /**
   * Transform get-single-order-new response (rich item data)
   * Used for: Enhanced order detail sidebar
   * NOTE: Response is { orders: [{ ...order, orderDetails: [...], vendorEmployee: {...} }] }
   */
  singleOrderNew: (api) => {
    const orders = api.orders || [];
    if (orders.length === 0) {
      return null;
    }
    
    const order = orders[0];
    const employee = order.vendorEmployee || {};
    const table = order.restaurantTable || {};
    const user = order.user || {};
    const items = order.orderDetails || [];
    
    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => sum + formatAmount(item.price), 0);
    
    // Get latest serve time from items
    const serveTimes = items
      .map(item => item.serve_at)
      .filter(Boolean)
      .sort()
      .reverse();
    const lastServeAt = serveTimes[0] || null;
    
    // Get earliest ready time from items (GAP 3 FIX)
    const readyTimes = items
      .map(item => item.ready_at)
      .filter(Boolean)
      .sort();
    const firstReadyAt = readyTimes[0] || null;
    
    // Get earliest cancel time from items (for cancelled orders)
    const cancelTimes = items
      .map(item => item.cancel_at)
      .filter(Boolean)
      .sort();
    const firstCancelAt = cancelTimes[0] || null;
    
    // Detect if order is cancelled
    const isCancelled = order.payment_method === 'Cancel' || 
                        order.f_order_status === 3 ||
                        (items.length > 0 && items.every(item => item.food_status === 3));
    
    // Detect if order is merged (payment_method OR payment_status === 'Merge')
    const isMerged = order.payment_method === 'Merge' || order.payment_status === 'Merge';
    
    // If merged, it's not cancelled (merged takes priority)
    const isActuallyCancelled = isCancelled && !isMerged;
    
    // Determine table/location display
    // GAP 1 FIX: table_id=0 means "Walk In", not "Counter" (Counter is waiter name)
    let locationDisplay = 'Walk In';
    let locationType = 'walkin';
    if (table && table.table_no) {
      // Format: "T-7" or just table_no with area title
      const areaPrefix = table.title ? `${table.title}-` : '';
      locationDisplay = `${areaPrefix}${table.table_no}`;
      locationType = 'table';
    } else if (order.table_id && order.table_id > 0) {
      locationDisplay = `Table ${order.table_id}`;
      locationType = 'table';
    }
    
    return {
      id: order.id,
      orderId: order.restaurant_order_id || `#${order.id}`,
      amount: formatAmount(order.order_amount),
      subtotal: formatAmount(order.order_sub_total_without_tax) || subtotal,

      // Financial fields from order object (parity with orderLogsReportRow)
      itemTotal:            formatAmount(order.order_sub_total_amount),
      gstAmount:            formatAmount(order.total_gst_tax_amount),
      vatAmount:            formatAmount(order.total_vat_tax_amount),
      serviceChargeAmount:  formatAmount(order.total_service_tax_amount),
      tipAmount:            formatAmount(order.tip_amount),
      roundOff:             formatAmount(order.round_up),
      discountAmount:       formatAmount(order.restaurant_discount_amount),
      couponCode:           order.coupon_code || null,
      couponAmount:         formatAmount(order.coupon_discount_amount),
      deliveryChargeGst:    formatAmount(order.delivery_charge_gst),
      orderNote:            order.order_note || null,

      // BUG-039 (May-2026): expose backend's delivery_charge as its own field
      // on the row object so OrderDetailSheet can render a separate "Delivery
      // Charge" line between Subtotal and Tax, and the Tax line can subtract
      // it before display. Backend already ships delivery_charge cleanly as a
      // top-level field (e.g., 10 for order 825844); the FE was just not
      // reading it. Defaults to 0 for non-delivery order types.
      deliveryCharge: formatAmount(order.delivery_charge || 0),

      // Customer info
      customer: order.user_name || user.f_name || 'Guest',
      customerContact: {
        name: order.user_name || user.f_name || '',
        phone: user.phone || '',
        email: user.email || '',
      },
      isGuest: !order.user_id,
      
      // Staff info
      waiter: employee.f_name ? `${employee.f_name}${employee.l_name ? ' ' + employee.l_name : ''}` : '—',
      waiterId: order.waiter_id,
      
      // Location
      table: locationDisplay,
      tableId: order.table_id,
      tableArea: table.title || null,
      location: {
        type: locationType,
        display: locationDisplay,
      },
      
      // Payment
      paymentMethod: order.payment_method || '—',
      paymentType: order.payment_type || '—',
      paymentStatus: order.payment_status || '—',
      
      // Status
      status: order.order_status,
      fOrderStatus: order.f_order_status,
      isCancelled: isActuallyCancelled,  // True only if cancelled, not merged
      isMerged,  // New flag for merged orders
      
      // Timestamps
      createdAt: formatDate(order.created_at),
      updatedAt: formatDate(order.updated_at),
      servedAt: formatDate(lastServeAt),
      cancelledAt: formatDate(firstCancelAt || order.cancel_at),  // Use item-level if order-level empty
      mergedAt: isMerged ? formatDate(order.updated_at) : null,  // Use updated_at for merge time
      
      // Timeline (uses item-level cancel time if order-level is empty)
      timeline: {
        created: order.created_at,
        ready: firstReadyAt,
        served: lastServeAt,
        paid: order.payment_status === 'paid' && !isActuallyCancelled && !isMerged ? order.updated_at : null,
        cancelled: isActuallyCancelled ? (firstCancelAt || order.cancel_at || order.updated_at) : null,
        merged: isMerged ? order.updated_at : null,
      },
      
      // Items with rich details
      items: items.map(item => {
        const food = item.food_details || {};
        
        // Extract selected variation values
        const variations = (item.variation || []).flatMap(v => 
          (v.values || []).map(val => ({
            group: v.name,
            label: val.label,
            price: formatAmount(val.optionPrice || 0),
          }))
        );
        
        // Extract add-ons
        const addOns = (item.add_ons || []).map(addon => ({
          name: addon.name || addon,
          price: formatAmount(addon.price || 0),
        }));
        
        return {
          id: item.id,
          foodId: food.id,
          name: food.name || 'Unknown Item',
          quantity: item.quantity || 1,
          unitPrice: formatAmount(item.unit_price),
          price: formatAmount(item.price),
          
          // Food properties
          isVeg: food.veg === 1,
          isEgg: food.egg === 1,
          image: food.image,
          
          // Tax
          taxPercent: food.tax || 0,
          taxType: food.tax_type || 'GST',
          taxCalc: food.tax_calc || 'Exclusive',
          
          // Customizations
          variations,
          addOns,
          notes: item.food_level_notes || '',
          
          // Kitchen info
          station: item.station || 'KDS',
          itemType: item.item_type,
          
          // Status & timestamps
          status: item.food_status,
          statusLabel: getFoodStatusLabel(item.food_status),
          readyAt: formatDate(item.ready_at),
          serveAt: formatDate(item.serve_at),
          cancelAt: formatDate(item.cancel_at),
          cancelBy: item.cancel_by,
          // Lookup cancel employee name (if same as order creator, use that name)
          cancelByName: item.cancel_by 
            ? (item.cancel_by === employee.id ? (employee.f_name || `Employee #${item.cancel_by}`) : `Employee #${item.cancel_by}`)
            : null,
        };
      }),
      
      // Stats
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 1), 0),
      
      // Raw for debugging
      ...(process.env.NODE_ENV === 'development' ? { _raw: api } : {}),
    };
  },
};

// =============================================================================
// ORDER LOGS REPORT — Transform for /order-logs-report (Audit Report page)
// Extracted from reportService.js inline transform (2026-05-28)
// =============================================================================

/**
 * Resolve employee name from name field or ID fallback.
 */
const resolveName = (nameField, idField) => {
  if (nameField) return nameField;
  if (idField != null && idField !== '' && idField !== 0) {
    return `Employee #${idField}`;
  }
  return null;
};

/**
 * Derive order status from API fields using priority-based rules.
 * Extracted as reusable utility from the inline transform.
 *
 * @param {Object} api - orders_table fields
 * @param {Set<number>|null} activeSrmIds - active SRM IDs (null = override all transferToRoom)
 * @returns {string} status
 */
export const deriveOrderStatus = (api, activeSrmIds = null) => {
  const fStatus = api.f_order_status;
  const paymentMethod = api.payment_method || '';
  const paymentMethodLower = paymentMethod.toLowerCase();
  const paymentStatus = api.payment_status || '';

  let status = 'audit';

  if (paymentMethod === 'Cancel' || paymentMethodLower === 'cancelled') {
    status = 'cancelled';
  } else if (paymentMethod === 'Merge' || paymentStatus === 'Merge') {
    status = 'merged';
  } else if (paymentMethod === 'TAB') {
    status = 'credit';
  } else if (fStatus === 9 || fStatus === 8 || paymentMethodLower === 'paylater') {
    status = 'hold';
  } else if (paymentMethodLower === 'transfertoroom') {
    if (activeSrmIds === null || activeSrmIds.has(api.id)) {
      status = 'running';
    } else if (paymentStatus === 'unpaid') {
      status = 'unpaid';
    } else if (fStatus === 6) {
      status = 'paid';
    }
  } else if (paymentStatus === 'unpaid') {
    status = 'unpaid';
  } else if (fStatus === 6) {
    status = 'paid';
  } else if (fStatus !== 3 && fStatus !== 6 && fStatus !== 9 && fStatus !== 8 && fStatus != null) {
    status = 'running';
  }

  return status;
};

/**
 * Safely parse a JSON string field. Returns null on failure.
 */
const safeJsonParse = (val) => {
  if (!val || typeof val !== 'string') return null;
  try { return JSON.parse(val); } catch { return null; }
};

/**
 * Parse a single item from order_details_table[].
 * Strictly reads what backend sends — no fallbacks.
 */
const parseOrderItem = (item) => {
  const food = safeJsonParse(item.food_details) || {};
  const variations = safeJsonParse(item.variation) || [];
  const addOns = safeJsonParse(item.add_ons) || [];

  return {
    id: item.id,
    foodId: food.id || null,
    name: food.name || null,
    quantity: item.quantity || 0,
    unitPrice: parseFloat(item.unit_price) || 0,
    price: parseFloat(item.price) || 0,
    isVeg: food.veg === 1,
    isEgg: food.egg === 1,
    image: food.image || null,
    taxPercent: food.tax || 0,
    taxType: food.tax_type || null,
    taxCalc: food.tax_calc || null,
    station: item.station || null,
    itemType: item.item_type || null,
    foodStatus: item.food_status,
    statusLabel: getFoodStatusLabel(item.food_status),
    notes: item.food_level_notes || null,
    variations: variations.flatMap(v =>
      (v.values || []).map(val => ({
        group: v.name,
        label: val.label,
        price: parseFloat(val.optionPrice) || 0,
      }))
    ),
    addOns: addOns.map(a => ({
      name: a.name || a,
      price: parseFloat(a.price) || 0,
    })),
    // Direct-serve rule: items with food_status=5 (Served) but no timestamps
    // were punched and served at the same time (e.g. PACKAGED items).
    // Use item created_at as both readyAt and serveAt.
    readyAt: item.ready_at || (item.food_status === 5 ? item.created_at : null),
    readyBy: item.ready_by || null,
    serveAt: item.serve_at || (item.food_status === 5 ? item.created_at : null),
    serveBy: item.serve_by || null,
    // Raw timestamps without Direct-serve fallback — used by S10 Prep & Serve Time
    // classification to avoid fake timestamps from the fallback above.
    rawReadyAt: item.ready_at || null,
    rawServeAt: item.serve_at || null,
    cancelAt: item.cancel_at || null,
    cancelByName: item.cancel_by_name || null,
    cancelType: item.cancel_type || null,
    cancelReason: item.cancel_reason_text || null,
    complementary: item.complementary || 0,
    // VAT-FIX (2026-06-06): Backend stores item tax in gst_tax_amount regardless of type.
    // For VAT items, gst_tax_amount mirrors the VAT value. Derive pure GST by subtracting.
    gstAmount: (parseFloat(item.gst_tax_amount) || 0) - (parseFloat(item.vat_tax_amount) || 0),
    vatAmount: parseFloat(item.vat_tax_amount) || 0,
    discountAmount: parseFloat(item.discount_amount) || 0,
    serviceCharge: parseFloat(item.service_charge) || 0,
  };
};

/**
 * Build timeline strictly from operations[] array.
 * No fallbacks — if data not present, field is null.
 */
const buildTimeline = (api, operations) => {
  const timeline = {
    created: api.created_at || null,
    confirmed: null,
    ready: api.ready_at || null,
    served: api.serve_at || null,
    paid: null,
    cancelled: null,
  };

  if (!Array.isArray(operations) || operations.length === 0) return timeline;

  for (const op of operations) {
    const opName = (op.operation || '').toLowerCase();
    if (opName.includes('bill_payment') || opName.includes('payment')) {
      if (!timeline.paid) timeline.paid = op.created_at;
    }
    if (opName.includes('cancel')) {
      if (!timeline.cancelled) timeline.cancelled = op.created_at;
    }
    if (opName.includes('confirm') || opName.includes('accept')) {
      if (!timeline.confirmed) timeline.confirmed = op.created_at;
    }
  }

  // Use collect_bill from orders_table as paid timestamp if not found in operations
  if (!timeline.paid && api.collect_bill) {
    timeline.paid = api.collect_bill;
  }

  return timeline;
};

/**
 * Transform a single orderWrapper from /order-logs-report.
 * Preserves all existing 42 fields + adds items, bill breakdown, operations, timeline.
 *
 * @param {Object} orderWrapper - Raw wrapper { orders_table, order_details_table, operations, room_info, ... }
 * @param {Set<number>|null} activeSrmIds - Active SRM order IDs
 * @returns {Object} Transformed row
 */
export const orderLogsReportRow = (orderWrapper, activeSrmIds = null) => {
  const api = orderWrapper.orders_table || {};
  const customerDetails = orderWrapper.customer_details || {};
  const toNum = (val) => parseFloat(val) || 0;

  // === Location ===
  const orderIn = api.order_in || null;
  const tableId = api.table_id || null;
  const tableName = api.table_name || null;
  const roomId = orderIn === 'SRM' ? api.parent_order_id : null;

  let locationType, locationDisplay;
  if (orderIn === 'RM') {
    locationType = 'room';
    locationDisplay = 'Room';
  } else if (orderIn === 'SRM') {
    locationType = 'room_transfer';
    locationDisplay = `→ R${roomId}`;
  } else if (tableId && tableId > 0) {
    locationType = 'table';
    locationDisplay = tableName || `T${tableId}`;
  } else {
    locationType = 'counter';
    locationDisplay = '—';
  }

  // === Status ===
  const status = deriveOrderStatus(api, activeSrmIds);
  const fStatus = api.f_order_status;
  const paymentMethod = api.payment_method || '';
  const paymentMethodLower = paymentMethod.toLowerCase();

  // === Channel ===
  const orderTypeRaw = (api.order_type || '').toString().toLowerCase();
  let channel = null;
  if (orderTypeRaw === 'dinein' || orderTypeRaw === 'dine_in' || orderTypeRaw === 'dine-in') {
    channel = 'dinein';
  } else if (orderTypeRaw === 'takeaway' || orderTypeRaw === 'take_away' || orderTypeRaw === 'take-away') {
    channel = 'takeaway';
  } else if (orderTypeRaw === 'delivery' || orderTypeRaw === 'home_delivery' || orderTypeRaw === 'home-delivery') {
    channel = 'delivery';
  }

  // === Platform ===
  const orderFromRaw = (api.order_from || '').toString().toLowerCase();
  let platform = null;
  if (orderFromRaw === 'pos') {
    platform = 'pos';
  } else if (orderFromRaw === 'web') {
    platform = 'web';
  } else if (orderFromRaw) {
    platform = orderFromRaw;
  }

  // === Payment Gateway ===
  const razorpayOrderId = api.razorpay_order_id || null;
  const isPaymentGateway = Boolean(razorpayOrderId);

  // === Order ID Prefix ===
  let orderIdPrefix = '';
  if (orderIn === 'RM') {
    orderIdPrefix = 'R-';
  } else if (
    orderIn === 'SRM' ||
    (tableId && tableId > 0) ||
    paymentMethodLower === 'transfertoroom'
  ) {
    orderIdPrefix = 'T-';
  }
  const rawOrderIdStr = String(api.restaurant_order_id || api.id || '').replace(/^#/, '');
  const displayOrderId = orderIdPrefix ? `${orderIdPrefix}${rawOrderIdStr}` : rawOrderIdStr;

  // === Display Location Label ===
  const tableNo = api.table_name || null;
  const wrapperRoomInfo = orderWrapper.room_info || null;
  const rmRoomNo = wrapperRoomInfo?.room_no || null;
  let displayLocationLabel;
  if (tableNo) {
    displayLocationLabel = tableNo;
  } else if (orderIn === 'RM') {
    displayLocationLabel = rmRoomNo ? `R${rmRoomNo}` : 'Room';
  } else if (orderIn === 'SRM') {
    displayLocationLabel = roomId ? `→ R${roomId}` : 'Room Transfer';
  } else if (channel === 'delivery') {
    displayLocationLabel = 'Delivery';
  } else if (channel === 'takeaway') {
    displayLocationLabel = 'Takeaway';
  } else if (orderTypeRaw === 'walkin' || orderTypeRaw === 'walk_in' || orderTypeRaw === 'walk-in') {
    displayLocationLabel = 'Walk-in';
  } else if (channel === 'dinein') {
    displayLocationLabel = 'Dine-in';
  } else {
    displayLocationLabel = '—';
  }

  // === Punched By ===
  const punchedBy = api.waiter_name || '';

  // === Actioned By ===
  let actionedByLabel = null;
  let actionedBy = null;
  if (status === 'paid') {
    actionedByLabel = 'Collected by';
    actionedBy = resolveName(
      api.employee_name || api.payment_collected_by_name || api.collect_by_name || api.cashier_name || api.collected_by_name || api.bill_collected_by_name,
      api.employee_id || api.payment_collected_by || api.collect_by || api.cashier_id || api.collected_by || api.bill_collected_by
    );
  } else if (status === 'cancelled') {
    actionedByLabel = 'Cancelled by';
    const firstItemCancelBy = orderWrapper.order_details_table?.[0] || {};
    actionedBy = resolveName(
      api.cancel_by_name || api.cancelled_by_name || firstItemCancelBy.cancel_by_name,
      api.cancel_by || api.cancelled_by || firstItemCancelBy.cancel_by
    );
  } else if (status === 'merged') {
    actionedByLabel = 'Merged by';
    actionedBy = resolveName(
      api.merge_by_name || api.merged_by_name,
      api.merge_by || api.merged_by
    );
  }
  if (!actionedBy) actionedByLabel = null;

  // === Parse Items from order_details_table[] ===
  const rawItems = (orderWrapper.order_details_table || []).filter(item => {
    const name = (safeJsonParse(item.food_details)?.name || '').trim().toLowerCase();
    return name !== 'check in'; // BUG-133
  });
  const items = rawItems.map(parseOrderItem);

  // === Operations (pass-through) ===
  const operations = orderWrapper.operations || [];

  // === Timeline (strict — from operations + orders_table only) ===
  const timeline = buildTimeline(api, operations);

  // === Bill Breakdown (strictly from orders_table — always pass numbers) ===
  // CORRECTED 2026-06-08 (BUG-117): total_gst_tax_amount is PURE GST, total_vat_tax_amount is PURE VAT.
  // total_tax_amount = total_gst_tax_amount + total_vat_tax_amount. Verified live on Lafetta
  // orders 012553 / 012554 / 012555 (rid=78, 2026-06-08): subtotal + GST + VAT + service + round = order_amount.
  // Prior "VAT-FIX (2026-06-06)" assumed combined storage — false; subtraction produced negative GST on VAT-only orders.
  // rawGstAmount kept (= raw api.total_gst_tax_amount) for FE-88 audit-engine compatibility — numerically unchanged.
  const itemTotal = toNum(api.order_sub_total_amount);
  const subtotal = toNum(api.order_sub_total_without_tax);
  const gstAmount = toNum(api.total_gst_tax_amount);       // Pure GST (backend field semantics)
  const vatAmount = toNum(api.total_vat_tax_amount);       // Pure VAT (backend field semantics)
  const rawGstAmount = gstAmount;                           // FE-88 compat: same raw numeric value
  const serviceChargeAmount = toNum(api.total_service_tax_amount);
  const tipAmount = toNum(api.tip_amount);
  const tipTaxAmount = toNum(api.tip_tax_amount);
  const roundOff = toNum(api.round_up);
  const deliveryCharge = toNum(api.delivery_charge);
  const deliveryChargeGst = toNum(api.delivery_charge_gst);
  const discountAmount = toNum(api.restaurant_discount_amount);
  const couponCode = api.coupon_code || null;
  const couponAmount = toNum(api.coupon_discount_amount);
  const orderNote = api.order_note || null;

  // === Flags ===
  const isCancelled = paymentMethod === 'Cancel' || paymentMethodLower === 'cancelled' || fStatus === 3;
  const isMerged = paymentMethod === 'Merge' || (api.payment_status || '') === 'Merge';

  // === Resolve item names for operations ===
  const itemNameMap = {};
  items.forEach(it => { if (it.foodId) itemNameMap[it.foodId] = it.name; });
  const enrichedOperations = operations.map(op => ({
    ...op,
    itemName: (op.food_id && itemNameMap[op.food_id]) || null,
  }));

  return {
    // --- Existing fields (identical to previous inline transform) ---
    id: api.id,
    orderId: api.restaurant_order_id || `#${api.id}`,
    displayOrderId,
    orderIdPrefix,
    amount: toNum(api.order_amount),
    customer: api.user_name || 'Guest',
    customerPhone: api.cust_mobile || api.user_phone || api.phone || '',
    customerEmail: api.cust_email || api.user_email || '',
    customerContact: {
      name: api.user_name || '',
      phone: api.cust_mobile || api.user_phone || api.phone || '',
      email: api.cust_email || api.user_email || '',
    },
    deliveryAddress: {
      line1: customerDetails.address?.line_1 || '',
      subLocality: customerDetails.address?.sub_locality || '',
      city: customerDetails.address?.city || '',
    },
    waiter: api.waiter_name || '',
    tableNo,
    displayLocationLabel,
    punchedBy,
    actionedBy,
    actionedByLabel,
    table: locationDisplay,
    tableId,
    orderIn,
    roomId,
    roomTotal: toNum(wrapperRoomInfo?.room_price),
    roomAdvance: toNum(wrapperRoomInfo?.advance_payment),
    roomBalance: toNum(wrapperRoomInfo?.balance_payment),
    roomCheckout: wrapperRoomInfo?.checkout_date || '',
    location: {
      type: locationType,
      display: locationDisplay,
      tableId,
      tableName,
      roomId,
      orderIn,
    },
    paymentMethod: paymentMethod || 'cash',
    paymentStatus: api.payment_status || 'paid',
    paymentType: api.payment_type || null,
    status,
    fOrderStatus: fStatus,
    createdAt: api.created_at,
    collectedAt: api.collect_bill || api.updated_at,
    orderType: api.order_type,
    channel,
    platform,
    razorpayOrderId,
    pgAmount: (parseFloat(api.payment_amount) || null),
    pgStatus: api.snapshot_razorpay_status || null,
    isPaymentGateway,
    transactionRef: api.transection_id || api.transaction_id || '',
    discount: toNum(api.restaurant_discount_amount || api.discount_value || 0),
    tax: toNum(api.gst_tax) + toNum(api.vat_tax) + toNum(api.service_tax),
    tip: toNum(api.tip_amount || 0),
    cancellationReason: api.cancellation_reason || '',
    cancellationType: orderWrapper.order_details_table?.[0]?.cancel_type || '',

    // --- NEW: Bill breakdown (strictly from orders_table) ---
    itemTotal,
    subtotal,
    gstAmount,
    vatAmount,
    rawGstAmount,  // VAT-FIX: original total_gst_tax_amount (= total tax) for audit engine grand total check
    serviceChargeAmount,
    tipAmount,
    tipTaxAmount,
    roundOff,
    deliveryCharge,
    deliveryChargeGst,
    discountAmount,
    couponCode,
    couponAmount,
    orderNote,

    // --- NEW: Flags ---
    isCancelled,
    isMerged,

    // --- NEW: Parsed items ---
    items,
    itemCount: items.length,

    // --- NEW: Operations (enriched with item names) ---
    operations: enrichedOperations,

    // --- NEW: Timeline ---
    timeline,
  };
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
  orderLogsReport: (orders = [], activeSrmIds = null) => orders.map(w => orderLogsReportRow(w, activeSrmIds)),
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
    // FILTER-A0a-01 (2026-05-04): defensive parity with audit-table A0a mask.
    // `cash_on_delivery` is excluded from the helper's output so any future
    // dynamic filter dropdown never surfaces a raw enum that the audit cell
    // masks to `—`. Zero runtime consumers today (FilterBar uses a hardcoded
    // PAYMENT_METHOD_OPTIONS list); guard hardens the exported helper against
    // future wiring. Raw enum remains preserved in reportTransform payloads.
    if (
      o.paymentMethod &&
      o.paymentMethod !== '—' &&
      o.paymentMethod.toLowerCase() !== 'cash_on_delivery'
    ) {
      methods.add(o.paymentMethod);
    }
  });
  return Array.from(methods).sort();
};

export default {
  fromAPI: reportFromAPI,
  listFromAPI: reportListFromAPI,
  orderLogsReportRow,
  deriveOrderStatus,
  filterPaidOrders,
  filterRoomTransferOrders,
  filterCancelledOrders,
  filterMergedOrders,
  calculateSummary,
  extractPaymentMethods,
};
