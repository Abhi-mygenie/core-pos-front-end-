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
      // Use unit_price (per-unit) as canonical price — detail.price from socket
      // contains total (unit_price × quantity), which causes double-multiplication
      // in display calculations that do price × qty
      price: parseFloat(detail.unit_price) || parseFloat(detail.price) || 0,
      unitPrice: parseFloat(detail.unit_price) || parseFloat(detail.price) || 0,
      status: mapOrderStatus(detail.food_status),
      station: detail.station || 'KDS',
      itemType: detail.item_type || null,  // Phase 1: BAR, KDS, etc.
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

      // Financials (Phase 1: Enhanced with new API fields)
      // No fallback — if socket doesn't send subtotal, keep as 0 (GET single order will fill it)
      amount: parseFloat(api.order_amount) || 0,
      subtotalBeforeTax: parseFloat(api.order_sub_total_without_tax) || 0,
      subtotalAmount: parseFloat(api.order_sub_total_amount) || 0,
      serviceTax: parseFloat(api.total_service_tax_amount) || 0,
      tipAmount: parseFloat(api.tip_amount) || 0,
      tipTaxAmount: parseFloat(api.tip_tax_amount) || 0,
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

      // Items — filter out "Check In" system marker (room check-in representation, not a real product)
      items: (api.orderDetails || [])
        .filter(d => (d.food_details?.name || '').toLowerCase() !== 'check in')
        .map(fromAPI.orderItem),

      // Notes
      orderNote: api.order_note || '',

      // Print status
      kotPrinted: api.print_kot === 'Yes',
      billPrinted: api.print_bill_status === 'Yes',

      // Delivery (basic — detailed mapping deferred)
      deliveryAddress: api.delivery_address || null,
      deliveryCharge: parseFloat(api.delivery_charge) || 0,

      // Associated orders — table orders transferred to this room (Phase 2B)
      associatedOrders: (() => {
        const raw = api.associated_order_list || [];
        const seen = new Set();
        return raw.filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }).map(item => ({
          orderId: item.id,
          orderNumber: item.restaurant_order_id || '',
          amount: parseFloat(item.order_amount) || 0,
          transferredAt: item.collect_Bill || '',
        }));
      })(),
    };
  },

  /**
   * Transform order list (includes all orders - tables and rooms)
   * @param {Array} apiOrders - Raw API orders
   * @returns {Array} - All orders with isRoom flag
   */
  orderList: (apiOrders) => {
    if (!Array.isArray(apiOrders)) return [];
    return apiOrders.map(fromAPI.order);
  },
};


// =============================================================================
// SHARED HELPERS: Cart Item Builder & Order Totals Calculator
// Used by placeOrder, updateOrder, placeOrderWithPayment
// =============================================================================

/**
 * Build a single cart item for the API payload
 * Maps frontend cart item → backend cart[] item shape
 * @param {Object} item - Frontend cart item (from addToCart or addCustomizedItemToCart)
 * @returns {Object} - API cart item
 */
const buildCartItem = (item) => {
  // Addon IDs and quantities — flat arrays
  const addons = item.selectedAddons || item.addOns || [];
  const addonIds = addons.map(a => a.id).filter(Boolean);
  const addonQtys = addons.map(a => a.quantity || a.qty || 1);

  // Addon total price
  const addonAmount = addons.reduce((sum, a) => {
    return sum + ((parseFloat(a.price) || 0) * (a.quantity || a.qty || 1));
  }, 0);

  // Variation data — group-level structure: {name: "GroupName", values: {label: ["Option1"]}}
  // Backend expects variations grouped by variant group with selected option labels
  const variantGroups = item.variantGroups || [];
  let variations = [];
  let variationAmount = 0;

  if (item.selectedVariants && Object.keys(item.selectedVariants).length > 0) {
    // Build group map: groupName → [selected option labels]
    const groupMap = {};
    Object.entries(item.selectedVariants)
      .filter(([, option]) => option)
      .forEach(([groupId, option]) => {
        variationAmount += parseFloat(option.price) || 0;
        // Look up group name from variantGroups
        const group = variantGroups.find(g => String(g.id) === String(groupId));
        const groupName = group?.name || option.groupName || `Variant`;
        if (!groupMap[groupName]) groupMap[groupName] = [];
        groupMap[groupName].push(option.name);
      });
    // Convert to API format: [{name, values: {label: [...]}}]
    variations = Object.entries(groupMap).map(([name, labels]) => ({
      name,
      values: { label: labels },
    }));
  } else if (item.variation?.length > 0) {
    // Fallback for placed items from socket (already in API format or empty)
    variations = item.variation;
    // Socket format: [{name, values: [{label, optionPrice}]}] or [{name, values: {label: []}}]
    variationAmount = item.variation.reduce((sum, v) => {
      // Try direct price (legacy)
      if (v.price) return sum + (parseFloat(v.price) || 0);
      // Parse nested values array: values[].optionPrice
      const vals = Array.isArray(v.values) ? v.values : (v.values?.label ? [] : []);
      return sum + vals.reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0);
    }, 0);
  }

  // Per-item financials
  const basePrice = item.price || 0;
  const foodAmount = basePrice * (item.qty || 1);
  const fullUnitPrice = basePrice + addonAmount + variationAmount;

  // Tax calculation
  const taxPct = parseFloat(item.tax?.percentage) || 0;
  const taxType = (item.tax?.type || 'GST').toUpperCase();
  const taxCalc = item.tax?.calculation || 'Exclusive';
  const isInclusive = taxCalc === 'Inclusive';
  const lineTotal = fullUnitPrice * (item.qty || 1);
  let taxAmount = 0;
  if (taxPct > 0) {
    taxAmount = isInclusive
      ? lineTotal - (lineTotal / (1 + taxPct / 100))
      : lineTotal * (taxPct / 100);
  }
  const isGst = taxType === 'GST';

  return {
    food_id:             item.foodId || item.id,
    quantity:            item.qty || 1,
    price:               basePrice,
    variant:             '',
    add_on_ids:          addonIds,
    add_on_qtys:         addonQtys,
    variations:          variations,
    add_ons:             [],
    station:             (item.station || 'KDS').toUpperCase(),
    food_amount:         foodAmount,
    variation_amount:    variationAmount,
    addon_amount:        addonAmount,
    gst_amount:          String((isGst ? taxAmount : 0).toFixed(2)),
    vat_amount:          String((!isGst ? taxAmount : 0).toFixed(2)),
    discount_amount:     '0.00',
    complementary_price: 0.0,
    is_complementary:    'No',
    food_level_notes:    Array.isArray(item.itemNotes) ? item.itemNotes.map(n => n.label).join(', ') : (item.notes || ''),
    _fullUnitPrice:      fullUnitPrice,
  };
};

/**
 * Calculate order-level financial totals from built cart items
 * @param {Array} cart - Array of items returned by buildCartItem
 * @returns {Object} - Financial totals for the order payload
 */
const calcOrderTotals = (cart) => {
  let subtotal = 0;
  let gstTax = 0;
  let vatTax = 0;

  cart.forEach(item => {
    const lineTotal = (item._fullUnitPrice || item.price || 0) * (item.quantity || 1);
    subtotal += lineTotal;
    gstTax += parseFloat(item.gst_amount) || 0;
    vatTax += parseFloat(item.vat_amount) || 0;
  });

  const totalTax = Math.round((gstTax + vatTax) * 100) / 100;
  subtotal = Math.round(subtotal * 100) / 100;

  // Rounding logic matching backend
  const rawTotal = subtotal + totalTax;
  const ceilTotal = Math.ceil(rawTotal);
  const diff = Math.round((ceilTotal - rawTotal) * 100) / 100;
  const roundUp = diff >= 0.10 ? diff : 0;
  const orderAmount = roundUp > 0 ? ceilTotal : Math.floor(rawTotal);

  return {
    order_sub_total_amount:      subtotal,
    order_sub_total_without_tax: subtotal,
    tax_amount:                  totalTax,
    gst_tax:                     Math.round(gstTax * 100) / 100,
    vat_tax:                     Math.round(vatTax * 100) / 100,
    order_amount:                orderAmount,
    round_up:                    String(roundUp.toFixed(2)),
  };
};

// =============================================================================
// Frontend → API (Request) - Phase 1C Order Operations
// =============================================================================
export const toAPI = {
  /**
   * Cancel item — cancels specific quantity (full cancel = pass item.qty)
   * cancel_type: "Pre-Serve" (item still cooking) | "Post-Serve" (item cooked/served)
   * Endpoint: PUT /api/v2/vendoremployee/partial-cancel-food-item
   * @param {Object} currentTable - Table entry (has orderId)
   * @param {Object} item         - Order item (has id=order_food_id, foodId=item_id)
   * @param {Object} reason       - Cancellation reason (has reasonId, reasonText)
   * @param {number} cancelQty    - Number of items to cancel (item.qty for full cancel)
   */
  cancelItem: (currentTable, item, reason, cancelQty) => ({
    order_id:      currentTable.orderId,
    order_food_id: item.foodId,      // food catalog ID (food_details.id)
    item_id:       item.id,          // order line item ID (orderDetails[].id)
    cancel_qty:    cancelQty,
    order_status:  'cancelled',
    reason_type:   reason.reasonId,
    reason:        reason.reasonText,
    cancel_type:   item.status === 'preparing' ? 'Pre-Serve' : 'Post-Serve',
  }),

  /**
   * Cancel entire order — single API call
   * Endpoint: PUT /api/v2/vendoremployee/order-status-update
   * @param {number} orderId   - Order ID
   * @param {string} roleName  - User role from profile (e.g. 'Manager')
   * @param {Object} reason    - { reasonText, reasonNote? }
   */
  cancelOrder: (orderId, roleName, reason) => ({
    order_id:            orderId,
    role_name:           roleName,
    order_status:        'cancelled',
    cancellation_reason: reason.reasonText,
    cancellation_note:   reason.reasonNote || reason.reasonText,
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
  // Flow 1: Place New Order (unpaid)
  // Endpoint: POST /api/v1/vendoremployee/order/place-order (multipart/form-data)
  // ==========================================================================

  placeOrder: (table, cartItems, customer, orderType, options = {}) => {
    const { restaurantId, orderNotes = [], printAllKOT = true, userId = '' } = options;

    const unplacedItems = cartItems.filter(i => !i.placed && i.status !== 'cancelled');
    const cart = unplacedItems.map(buildCartItem).map(({ _fullUnitPrice, ...item }) => item);
    const totals = calcOrderTotals(unplacedItems.map(buildCartItem));

    return {
      user_id:                    userId,
      restaurant_id:              restaurantId,
      table_id:                   String(table?.tableId || 0),
      order_type:                 'pos',
      cust_name:                  customer?.name || '',
      cust_mobile:                customer?.phone || '',
      cust_email:                 '',
      cust_dob:                   '',
      cust_anniversary:           '',
      cust_membership_id:         '',
      order_note:                 orderNotes.map(n => n.label).join(', '),
      payment_method:             'pending',
      payment_status:             'unpaid',
      payment_type:               'postpaid',
      transaction_id:             '',
      print_kot:                  printAllKOT ? 'Yes' : 'No',
      auto_dispatch:              'No',
      scheduled:                  0,
      schedule_at:                null,
      // Financial
      ...totals,
      service_tax:                0,
      service_gst_tax_amount:     0,
      tip_amount:                 0,
      tip_tax_amount:             0,
      delivery_charge:            0,
      // Discount
      discount_type:              null,
      self_discount:              0,
      coupon_discount:            0,
      coupon_title:               null,
      coupon_type:                null,
      order_discount:             0,
      // Loyalty & Wallet
      used_loyalty_point:         0,
      use_wallet_balance:         0,
      // Room & Address
      paid_room:                  null,
      room_id:                    null,
      address_id:                 null,
      // Misc
      discount_member_category_id:   0,
      discount_member_category_name: null,
      usage_id:                   null,
      cart,
    };
  },

  // ==========================================================================
  // Flow 2: Update Existing Order (add items)
  // Endpoint: PUT /api/v1/vendoremployee/order/update-place-order (application/json)
  // ==========================================================================

  updateOrder: (table, newItems, customer, orderType, options = {}) => {
    const { 
      orderNotes = [], 
      printAllKOT = true,
      allCartItems = [],
    } = options;

    // cart-update payload: only NEW (unplaced) items
    const cartUpdateRaw = newItems.map(buildCartItem);
    const cartUpdate = cartUpdateRaw.map(({ _fullUnitPrice, ...item }) => item);

    // COMBINED financial totals: ALL items (placed + unplaced, excluding cancelled)
    const allActiveItems = allCartItems.filter(i => i.status !== 'cancelled');
    const allBuilt = allActiveItems.map(buildCartItem);
    const combinedTotals = calcOrderTotals(allBuilt);

    return {
      order_id:                   String(table.orderId),
      order_type:                 'pos',
      cust_name:                  customer?.name || '',
      order_note:                 orderNotes.map(n => n.label).join(', '),
      payment_method:             'pending',
      payment_status:             'unpaid',
      payment_type:               'postpaid',
      print_kot:                  printAllKOT ? 'Yes' : 'No',
      auto_dispatch:              'No',
      // Financial — COMBINED totals (existing placed + new unplaced)
      ...combinedTotals,
      service_tax:                0,
      service_gst_tax_amount:     0,
      tip_amount:                 0,
      tip_tax_amount:             0,
      delivery_charge:            0,
      // Discount
      discount_type:              null,
      self_discount:              0,
      coupon_discount:            0,
      coupon_title:               null,
      coupon_type:                null,
      order_discount:             0,
      // Loyalty & Wallet
      used_loyalty_point:         0,
      use_wallet_balance:         0,
      // Room
      room_id:                    null,
      // Misc
      discount_member_category_id:   0,
      discount_member_category_name: null,
      usage_id:                   null,
      'cart-update':              cartUpdate,
    };
  },

  // ==========================================================================
  // Flow 3: Place New Order + Collect Payment (prepaid)
  // Endpoint: POST /api/v1/vendoremployee/order/place-order (multipart/form-data)
  // ==========================================================================

  placeOrderWithPayment: (table, cartItems, customer, orderType, paymentData, options = {}) => {
    const { restaurantId, orderNotes = [], printAllKOT = true, userId = '' } = options;
    const { method = 'cash', transactionId = '', splitPayments = [], deliveryCharge = 0, discounts = {} } = paymentData;

    const unplacedItems = cartItems.filter(i => !i.placed && i.status !== 'cancelled');
    const cart = unplacedItems.map(buildCartItem).map(({ _fullUnitPrice, ...item }) => item);
    const totals = calcOrderTotals(unplacedItems.map(buildCartItem));

    const payload = {
      user_id:                    userId,
      restaurant_id:              restaurantId,
      table_id:                   String(table?.tableId || 0),
      order_type:                 'pos',
      cust_name:                  customer?.name || '',
      cust_mobile:                customer?.phone || '',
      cust_email:                 '',
      cust_dob:                   '',
      cust_anniversary:           '',
      cust_membership_id:         '',
      order_note:                 orderNotes.map(n => n.label).join(', '),
      payment_method:             method,
      payment_status:             'paid',
      payment_type:               'prepaid',
      transaction_id:             transactionId || null,
      print_kot:                  printAllKOT ? 'Yes' : 'No',
      auto_dispatch:              'No',
      scheduled:                  0,
      schedule_at:                null,
      // Financial
      ...totals,
      service_tax:                0,
      service_gst_tax_amount:     0,
      tip_amount:                 0,
      tip_tax_amount:             0,
      delivery_charge:            deliveryCharge || 0,
      // Discount
      discount_type:              discounts.type || null,
      self_discount:              discounts.manual || 0,
      coupon_discount:            discounts.coupon || 0,
      coupon_title:               discounts.couponTitle || null,
      coupon_type:                discounts.couponType || null,
      order_discount:             discounts.orderDiscountPercent || 0,
      // Loyalty & Wallet
      used_loyalty_point:         0,
      use_wallet_balance:         0,
      // Room & Address
      paid_room:                  null,
      room_id:                    null,
      address_id:                 null,
      // Misc
      discount_member_category_id:   0,
      discount_member_category_name: null,
      usage_id:                   null,
      cart,
    };

    // Partial payments (split payment)
    if (splitPayments?.length) {
      payload.partial_payments = splitPayments.map(p => ({
        payment_mode:   p.method,
        payment_amount: p.amount,
        grant_amount:   p.amount,
        transaction_id: p.transactionId || '',
      }));
    }

    return payload;
  },

  // ==========================================================================
  // Flow 4: Collect Payment on Existing Order (postpaid → paid)
  // Endpoint: POST /api/v1/vendoremployee/order/place-order (multipart/form-data)
  // ==========================================================================

  collectBillExisting: (table, cartItems, customer, paymentData, options = {}) => {
    const { restaurantId, orderNotes = [], userId = '' } = options;
    const { 
      method = 'cash', transactionId = '', 
      splitPayments = [], tip = 0, discounts = {},
      finalTotal = 0, deliveryCharge = 0,
    } = paymentData;

    // Build cart from ALL active (non-cancelled) placed items
    const activeItems = (cartItems || []).filter(i => i.status !== 'cancelled');
    const cartRaw = activeItems.map(buildCartItem);
    const cart = cartRaw.map(({ _fullUnitPrice, ...item }) => item);
    const totals = calcOrderTotals(cartRaw);

    const payload = {
      user_id:                    userId,
      restaurant_id:              restaurantId,
      table_id:                   String(table?.tableId || 0),
      order_type:                 'pos',
      cust_name:                  customer?.name || '',
      cust_mobile:                customer?.phone || '',
      cust_email:                 '',
      cust_dob:                   '',
      cust_anniversary:           '',
      cust_membership_id:         '',
      order_note:                 orderNotes.map(n => n.label).join(', '),
      payment_method:             method,
      payment_status:             'paid',
      payment_type:               'prepaid',
      transaction_id:             transactionId || null,
      print_kot:                  'Yes',
      auto_dispatch:              'No',
      scheduled:                  0,
      schedule_at:                null,
      // Financial
      ...totals,
      service_tax:                0,
      service_gst_tax_amount:     0,
      tip_amount:                 tip || 0,
      tip_tax_amount:             0,
      delivery_charge:            deliveryCharge || 0,
      // Discount
      discount_type:              discounts.type || null,
      self_discount:              discounts.manual || 0,
      coupon_discount:            discounts.coupon || 0,
      coupon_title:               discounts.couponTitle || null,
      coupon_type:                discounts.couponType || null,
      order_discount:             discounts.orderDiscountPercent || 0,
      // Loyalty & Wallet
      used_loyalty_point:         0,
      use_wallet_balance:         0,
      // Room & Address
      paid_room:                  null,
      room_id:                    null,
      address_id:                 null,
      // Misc
      discount_member_category_id:   0,
      discount_member_category_name: null,
      usage_id:                   null,
      cart,
    };

    // Partial payments
    if (splitPayments?.length) {
      payload.partial_payments = splitPayments.map(p => ({
        payment_mode:   p.method,
        payment_amount: p.amount,
        grant_amount:   p.amount,
        transaction_id: p.transactionId || '',
      }));
    }

    return payload;
  },

  /**
   * Transfer to Room — Phase 2B (transfer entire table order to a room)
   * Endpoint: POST /api/v1/vendoremployee/order-shifted-room (JSON)
   * @param {Object} table       - Table entry (has orderId)
   * @param {Object} paymentData - { method, finalTotal, sgst, cgst, vatAmount, tip, discounts }
   * @param {number|string} roomId - Destination room ID
   */
  transferToRoom: (table, paymentData, roomId) => {
    const {
      method = 'cash', finalTotal = 0,
      sgst = 0, cgst = 0, vatAmount = 0,
      tip = 0, discounts = {},
    } = paymentData;

    return {
      order_id:                 String(table.orderId),
      payment_mode:             method,
      payment_amount:           finalTotal,
      payment_status:           'paid',
      room_id:                  String(roomId),
      order_discount:           discounts.orderDiscountPercent || 0,
      self_discount:            discounts.manual || 0,
      comm_discount:            discounts.preset || 0,
      tip_amount:               tip,
      vat_tax:                  vatAmount,
      gst_tax:                  Math.round(((sgst || 0) + (cgst || 0)) * 100) / 100,
      service_tax:              0,
      service_gst_tax_amount:   0,
      tip_tax_amount:           0,
    };
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

