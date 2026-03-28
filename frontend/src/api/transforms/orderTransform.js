// Order Transform - Maps raw API order data to canonical frontend schema

import { F_ORDER_STATUS, ORDER_TO_TABLE_STATUS, ORDER_TYPES } from '../constants';

/**
 * Compute elapsed time string from a date
 * @param {string} dateStr - ISO/SQL date string
 * @returns {string} - e.g. "45 min", "2 hrs", "1 day"
 */
const computeElapsedTime = (dateStr) => {
  if (!dateStr) return '';
  const created = new Date(dateStr);
  const now = new Date();
  const diffMs = now - created;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} mins`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hrs`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} days`;
};

/**
 * Map f_order_status number to frontend status key
 */
const mapOrderStatus = (fOrderStatus) => {
  return F_ORDER_STATUS[fOrderStatus] || 'unknown';
};

/**
 * Map f_order_status to table card status
 */
const mapTableStatus = (fOrderStatus) => {
  const statusKey = mapOrderStatus(fOrderStatus);
  return ORDER_TO_TABLE_STATUS[statusKey] || 'occupied';
};

/**
 * Normalize order_type to a consistent frontend value
 */
const normalizeOrderType = (orderType) => {
  switch (orderType) {
    case ORDER_TYPES.POS:
    case ORDER_TYPES.DINE_IN:
    case ORDER_TYPES.WALK_IN:
      return 'dineIn';
    case ORDER_TYPES.TAKE_AWAY:
      return 'takeAway';
    case ORDER_TYPES.DELIVERY:
      return 'delivery';
    default:
      return 'dineIn';
  }
};

// =============================================================================
// FROM API transforms
// =============================================================================
export const fromAPI = {
  /**
   * Transform a single order item (orderDetail)
   */
  orderItem: (detail) => {
    const foodDetails = detail.food_details || {};
    return {
      id: detail.id,
      foodId: foodDetails.id || null,       // food catalog ID — needed for full cancel item_id
      name: foodDetails.name || 'Unknown Item',
      // Tax from food_details — used for billing calculations
      tax: {
        percentage: parseFloat(foodDetails.tax) || 0,
        type: foodDetails.tax_type || 'GST',
        calculation: foodDetails.tax_calc || 'Exclusive',
        isInclusive: foodDetails.tax_calc === 'Inclusive',
      },
      qty: detail.quantity || 1,
      price: parseFloat(detail.price) || 0,
      unitPrice: parseFloat(detail.unit_price) || 0,
      status: mapOrderStatus(detail.food_status),
      station: detail.station || 'KDS',
      variation: detail.variation || [],
      addOns: detail.add_ons || [],
      notes: detail.food_level_notes || '',
      readyAt: detail.ready_at,
      serveAt: detail.serve_at,
      cancelAt: detail.cancel_at,
      createdAt: detail.created_at,
    };
  },

  /**
   * Transform a single order
   */
  order: (api) => {
    const table = api.restaurantTable || {};
    const employee = api.vendorEmployee || {};
    const user = api.user || {};
    const isRoom = table.rtype === 'RM' || api.order_in === 'RM';
    const isWalkIn = !api.table_id || api.table_id === 0;

    // Build customer display name
    let customer = api.user_name || '';
    if (!customer && user.f_name) {
      customer = [user.f_name, user.l_name].filter(Boolean).join(' ');
    }

    return {
      orderId: api.id,
      orderNumber: api.restaurant_order_id || '',
      orderType: normalizeOrderType(api.order_type),
      rawOrderType: api.order_type,
      orderIn: api.order_in,
      status: mapOrderStatus(api.f_order_status),
      fOrderStatus: api.f_order_status,
      tableStatus: mapTableStatus(api.f_order_status),
      lifecycle: api.order_status || 'queue',
      
      // Table info
      tableId: api.table_id || 0,
      tableNumber: table.table_no || '',
      tableSectionName: table.title || '',
      isWalkIn,
      isRoom,

      // Customer
      customer: isWalkIn ? (customer || 'WC') : (customer || ''),
      phone: user.phone || '',

      // Financials
      amount: parseFloat(api.order_amount) || 0,
      paymentStatus: api.payment_status || 'unpaid',
      paymentMethod: api.payment_method || '',

      // Timing
      time: computeElapsedTime(api.created_at),
      createdAt: api.created_at,
      updatedAt: api.updated_at,

      // Staff
      punchedBy: employee.f_name || '',
      waiter: employee.f_name || '',

      // Source (own, swiggy, zomato, etc.)
      source: (api.order_in || 'own').toLowerCase(),

      // Items
      items: (api.orderDetails || []).map(fromAPI.orderItem),

      // Notes
      orderNote: api.order_note || '',

      // Print status
      kotPrinted: api.print_kot === 'Yes',
      billPrinted: api.print_bill_status === 'Yes',

      // Delivery (basic — detailed mapping deferred)
      deliveryAddress: api.delivery_address || null,
      deliveryCharge: parseFloat(api.delivery_charge) || 0,
    };
  },

  /**
   * Transform order list — filters out room orders
   */
  orderList: (apiOrders) => {
    if (!Array.isArray(apiOrders)) return [];
    return apiOrders
      .map(fromAPI.order)
      .filter(order => !order.isRoom); // Skip room orders (Phase 2)
  },
};


// =============================================================================
// Frontend → API (Request) - Phase 1C Order Operations
// =============================================================================
export const toAPI = {
  /**
   * Full cancel — cancels all quantity of an item
   * Endpoint: PUT /api/v2/vendoremployee/cancel-food-item
   * @param {Object} currentTable - Table entry (has orderId)
   * @param {Object} item         - Order item (has id=order_food_id, foodId=item_id)
   * @param {Object} reason       - Cancellation reason from SettingsContext (has reasonId, reasonText)
   */
  cancelItemFull: (currentTable, item, reason) => ({
    order_id:      currentTable.orderId,
    order_food_id: item.foodId,      // food catalog ID (food_details.id)
    item_id:       item.id,          // order line item ID (orderDetails[].id)
    order_status:  'cancelled',
    reason_type:   reason.reasonId,  // integer reason ID (same as partial)
    reason:        reason.reasonText,
    cancel_type:   'full',
  }),

  /**
   * Partial cancel — cancels specific quantity of an item
   * Endpoint: PUT /api/v2/vendoremployee/partial-cancel-food-item
   * @param {Object} currentTable - Table entry (has orderId)
   * @param {Object} item         - Order item (has id=order_food_id)
   * @param {Object} reason       - Cancellation reason (has reasonId, reasonText)
   * @param {number} cancelQty    - Number of items to cancel
   */
  cancelItemPartial: (currentTable, item, reason, cancelQty) => ({
    order_id:      currentTable.orderId,
    order_food_id: item.id,
    cancel_qty:    cancelQty,
    order_status:  'cancelled',
    reason_type:   reason.reasonId,
    reason:        reason.reasonText,
    cancel_type:   'partial',
  }),

  /**
   * Cancel order item — called once per non-cancelled item to cancel entire order
   * cancel_type: "Pre-Serve" (item still cooking) | "Post-Serve" (item cooked/served)
   * Endpoint: PUT /api/v2/vendoremployee/food-status-update
   * @param {Object} currentTable - Table entry (has orderId)
   * @param {Object} item         - Cart item (has id, foodId, status)
   * @param {Object} reason       - Order-level cancellation reason
   */
  cancelOrderItem: (currentTable, item, reason) => ({
    order_id:      currentTable.orderId,
    order_food_id: item.foodId,
    item_id:       item.id,
    order_status:  'cancelled',
    reason_type:   reason.reasonId,
    reason:        reason.reasonText,
    cancel_type:   item.status === 'preparing' ? 'Pre-Serve' : 'Post-Serve',
  }),

  /**
   * Add out-of-menu custom item — creates product in catalog
   * Endpoint: POST /api/v1/vendoremployee/add-single-product
   * @param {string} name       - Custom item name
   * @param {number} categoryId - Category ID from MenuContext
   * @param {number} price      - Custom price
   */
  addCustomItem: (name, categoryId, price) => ({
    name,
    category_id: categoryId,
    price,
    tax:      0,
    tax_type: 'GST',
    tax_calc: 'Exclusive',
  }),

  // ==========================================================================
  // Sprint 3 — Order Taking (stubs — to be filled when endpoints are provided)
  // ==========================================================================

  /**
   * Place Order — CHG-037
   * Endpoint: POST /api/v2/vendoremployee/pos/place-order
   * IMPORTANT: Uses application/x-www-form-urlencoded — wrap in URLSearchParams
   *
   * @param {Object} table       - Table entry (tableId, orderId, orderType)
   * @param {Array}  cartItems   - All cart items (placed + unplaced; API needs unplaced only)
   * @param {Object} customer    - { name, phone } from OrderEntry state
   * @param {string} orderType   - 'dineIn' | 'takeAway' | 'delivery' | 'walkIn'
   * @param {Object} options     - { restaurantId, orderNotes, total, printAllKOT }
   */
  placeOrder: (table, cartItems, customer, orderType, options = {}) => {
    const { restaurantId, orderNotes = [], total = 0, printAllKOT = true } = options;

    // Map frontend orderType → API order_type string
    const ORDER_TYPE_MAP = {
      dineIn:   'dinein',
      walkIn:   'dinein',
      takeAway: 'take_away',
      delivery: 'delivery',
    };

    // Only send unplaced items
    const unplacedItems = cartItems.filter(i => !i.placed && i.status !== 'cancelled');

    const cart = unplacedItems.map(item => {
      // Addon IDs and quantities (from ItemCustomizationModal selectedAddons)
      const addons    = (item.selectedAddons || []).map(a => a.id);
      const addonQtys = (item.selectedAddons || []).map(a => a.quantity);
      const addonsTotal = (item.selectedAddons || []).reduce(
        (sum, a) => sum + ((parseFloat(a.price) || 0) * (a.quantity || 1)), 0
      );

      // Variation total (from selectedSize price + variant prices)
      const variationTotal = parseFloat(item.selectedSize?.price) || 0;

      return {
        food_id:         item.id,
        quantity:        item.qty,
        price:           item.price,
        station:         (item.station || 'KITCHEN').toUpperCase(),
        add_ons:         addons,
        add_on_qtys:     addonQtys,
        variations:      [],     // Phase 3: map item.selectedVariants when API format confirmed
        addons_total:    addonsTotal,
        variation_total: variationTotal,
      };
    });

    return {
      restaurant_id:  restaurantId,
      cust_name:      customer?.name || (orderType === 'walkIn' ? 'Walk-In Customer' : ''),
      order_type:     ORDER_TYPE_MAP[orderType] || 'dinein',
      order_note:     orderNotes.map(n => n.label).join(', '),
      order_amount:   total,
      payment_method: 'cash_on_delivery',
      table_id:       table?.tableId || 0,
      print_kot:      printAllKOT ? 'Yes' : 'No',
      cart,
    };
  },

  /**
   * Collect Bill (Place Order + Payment) — CHG-038
   * Endpoint: POST /api/v1/vendoremployee/pos/place-order-and-payment (form-urlencoded)
   *
   * Used for quick service flow: creates new order AND processes payment together.
   * Frontend MUST pre-calculate all tax and discount amounts per item.
   *
   * @param {Object} table       - Table entry (tableId, orderType)
   * @param {Array}  cartItems   - Cart items (must have tax field from adaptProduct)
   * @param {Object} customer    - { name, phone }
   * @param {string} orderType   - 'dineIn' | 'takeAway' | 'delivery' | 'walkIn'
   * @param {Object} paymentData - From CollectPaymentPanel (method, type, status, transactionId, deliveryCharge, discount)
   * @param {Object} options     - { restaurantId, orderNotes, printAllKOT }
   */
  collectBill: (table, cartItems, customer, orderType, paymentData, options = {}) => {
    const { restaurantId, orderNotes = [], printAllKOT = true } = options;
    const { method = 'cash', paymentType = 'postpaid', paymentStatus = 'paid', transactionId = '', deliveryCharge = 0 } = paymentData;
    const discount = paymentData.discounts?.total || 0;

    const ORDER_TYPE_MAP = {
      dineIn: 'dinein', walkIn: 'dinein',
      takeAway: 'take_away', delivery: 'delivery',
    };

    // Per-item tax calculation (Exclusive: tax added on top; Inclusive: tax in price)
    const buildCartItem = (item) => {
      const tax = item.tax || { percentage: 0, type: 'GST', calculation: 'Exclusive', isInclusive: false };
      const qty = item.qty || 1;
      const foodAmount = item.price * qty;

      let taxAmount = 0;
      if (tax.isInclusive) {
        taxAmount = foodAmount - (foodAmount / (1 + tax.percentage / 100));
      } else {
        taxAmount = foodAmount * (tax.percentage / 100);
      }
      taxAmount = Math.round(taxAmount * 100) / 100;

      const isGst = (tax.type || 'GST').toUpperCase() === 'GST';
      const totalPrice = Math.round((foodAmount + (tax.isInclusive ? 0 : taxAmount)) * 100) / 100;

      const addons = (item.selectedAddons || []);
      const addonIds = addons.map(a => a.id);
      const addonQtys = addons.map(a => a.quantity);
      const addonAmount = addons.reduce((s, a) => s + (parseFloat(a.price) || 0) * (a.quantity || 1), 0);
      const variationAmount = parseFloat(item.selectedSize?.price) || 0;

      return {
        food_id:          item.id,
        quantity:         qty,
        price:            item.price,
        food_amount:      foodAmount,
        variation_amount: variationAmount,
        addon_amount:     addonAmount,
        add_on_price:     addonAmount,
        gst_amount:       isGst ? taxAmount : 0,
        vat_amount:       !isGst ? taxAmount : 0,
        vat_tax:          !isGst ? tax.percentage : 0,
        tax_amount:       taxAmount,
        total_price:      totalPrice,
        discount_amount:  0,
        discount:         0,
        add_on_ids:       addonIds,
        add_on_qtys:      addonQtys,
        variations:       [],
        food_level_notes: item.notes || '',
      };
    };

    const cart = cartItems.filter(i => !i.placed && i.status !== 'cancelled').map(buildCartItem);
    const orderAmount = cart.reduce((s, i) => s + i.total_price + i.addon_amount + i.variation_amount, 0);

    return {
      restaurant_id:            restaurantId,
      cust_name:                customer?.name || (orderType === 'walkIn' ? 'Walk-In Customer' : ''),
      cust_mobile:              customer?.phone || '',
      order_type:               ORDER_TYPE_MAP[orderType] || 'dinein',
      order_note:               orderNotes.map(n => n.label).join(', '),
      order_amount:             Math.round(orderAmount * 100) / 100,
      delivery_charge:          deliveryCharge,
      payment_method:           method,
      payment_type:             paymentType,
      payment_status:           paymentStatus,
      transaction_id:           transactionId,
      print_kot:                printAllKOT ? 'Yes' : 'No',
      table_id:                 table?.tableId || 0,
      // Order-level tax + discount (required fields)
      vat_tax:                  0,
      gst_tax:                  0,
      service_tax:              0,
      service_gst_tax_amount:   0,
      discount:                 discount,
      discount_type:            'percent',
      restaurant_discount_amount: discount,
      order_discount:           0,
      comunity_discount:        0,
      discount_value:           discount,
      tip_amount:               0,
      tip_tax_amount:           0,
      round_up:                 0,
      order_sub_total_amount:   Math.round(orderAmount * 100) / 100,
      order_total_tax_amount:   0,
      cart,
    };
  },

  /**
   * Update/Edit Order — CHG-040 (Scenario 1: add new items to existing order)
   * Endpoint: PUT /api/v2/vendoremployee/pos/update-place-order (JSON, not form-urlencoded)
   * @param {Object} table      - Table entry (has orderId, tableId)
   * @param {Array}  newItems   - Only UNPLACED cart items (placed: false)
   * @param {Object} customer   - { name, phone }
   * @param {string} orderType  - 'dineIn' | 'takeAway' | 'delivery' | 'walkIn'
   * @param {Object} options    - { restaurantId, orderNotes, printAllKOT, total }
   */
  updateOrder: (table, newItems, customer, orderType, options = {}) => {
    const { restaurantId, orderNotes = [], printAllKOT = true, total = 0 } = options;
    const ORDER_TYPE_MAP = {
      dineIn: 'dinein', walkIn: 'dinein',
      takeAway: 'take_away', delivery: 'delivery',
    };

    const cartUpdate = newItems.map(item => {
      const addons = item.selectedAddons || [];
      return {
        food_id:         item.id,
        quantity:        item.qty,
        price:           item.price,
        station:         (item.station || 'KITCHEN').toUpperCase(),
        add_on_ids:      addons.map(a => a.id),
        add_ons:         addons.map(a => a.id),
        addons_total:    addons.reduce((s, a) => s + (parseFloat(a.price) || 0) * (a.quantity || 1), 0),
        variations:      [],
        variation_total: parseFloat(item.selectedSize?.price) || 0,
      };
    });

    return {
      order_id:         table.orderId,
      restaurant_id:    restaurantId,
      payment_method:   'cash_on_delivery',
      order_type:       ORDER_TYPE_MAP[orderType] || 'dinein',
      cust_name:        customer?.name || '',
      cust_mobile:      customer?.phone || '',
      order_note:       orderNotes.map(n => n.label).join(', '),
      order_amount:     total,
      print_kot:        printAllKOT ? 'Yes' : 'No',
      table_id:         table.tableId || 0,
      inventory:        'Yes',
      inventory_negative: 'No',
      'cart-update':    cartUpdate,
    };
  },

  /**
   * Clear Bill — CHG-038 Scenario 1 (collect payment on existing order)
   * Endpoint: POST /api/v2/vendoremployee/order-bill-payment (JSON)
   * @param {Object} table       - Table entry (has orderId)
   * @param {Object} paymentData - { method, finalTotal, sgst, cgst, vatAmount, transactionId, tip, splitPayments, tabContact }
   */
  clearBill: (table, paymentData) => {
    const {
      method = 'cash', finalTotal = 0,
      sgst = 0, cgst = 0, vatAmount = 0,
      transactionId = '', tip = 0,
      splitPayments = null, tabContact = null,
      discounts = {},
    } = paymentData;

    const payload = {
      order_id:                 String(table.orderId),
      payment_mode:             method,
      payment_amount:           finalTotal,
      payment_status:           'paid',
      transaction_id:           transactionId,
      service_tax:              0,
      service_gst_tax_amount:   0,
      tip_amount:               tip,
      tip_tax_amount:           0,
      vat_tax:                  vatAmount,
      gst_tax:                  Math.round((sgst + cgst) * 100) / 100,
      // Discount fields — required by API even when 0
      restaurant_discount_amount: discounts.manual || 0,
      order_discount:             discounts.orderDiscountPercent || 0,
      comunity_discount:          discounts.preset || 0,
      discount_value:             discounts.total || 0,
    };

    // TAB payment → include contact
    if (method === 'TAB' && tabContact) {
      if (tabContact.includes('@')) payload.email = tabContact;
      else payload.mobile = tabContact;
    }

    // Partial payment → include split breakdown
    if (method === 'partial' && splitPayments?.length) {
      payload.partial_payments = splitPayments.map(p => ({
        payment_mode:   p.method,
        payment_amount: p.amount,
        transaction_id: p.transactionId || '',
      }));
    }

    return payload;
  },
};

// =============================================================================
// API Response → Cart Item (custom item mapping)
// =============================================================================
/**
 * Maps add-single-product API response to cart item shape
 * @param {Object} data  - API response data object
 * @param {number} qty   - User-selected quantity
 * @param {string} notes - Optional notes
 */
export const customItemFromAPI = (data, qty, notes) => ({
  id:           data.id,
  name:         data.name,
  price:        parseFloat(data.price) || 0,
  unitPrice:    parseFloat(data.price) || 0,
  qty,
  notes:        notes || '',
  status:       'preparing',
  placed:       false,
  isCustomItem: true,
  addedAt:      new Date().toISOString(),
});

