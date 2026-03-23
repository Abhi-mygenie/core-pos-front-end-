import { getStatusFromCode } from '../constants/orderStatus';

/**
 * Transform API order to UI format
 */
export const transformApiOrderToUI = (apiOrder) => {
  const { order_details_order, order_details_food, restaurant_table, user } = apiOrder;
  
  // Transform items
  const items = (order_details_food || []).map(item => ({
    id: item.id,
    foodId: item.food_id,
    name: item.food_details?.name || 'Unknown Item',
    qty: item.quantity || 1,
    price: parseFloat(item.unit_price) || 0,
    totalPrice: parseFloat(item.price) || 0,
    status: getStatusFromCode(item.food_status),
    isVeg: item.food_details?.veg === 1,
    image: item.food_details?.image || null,
    categoryId: item.food_details?.category_id,
    station: item.station || 'KDS',
    variations: item.variation || [],
    addOns: item.add_ons || []
  }));

  // Calculate time ago
  const createdAt = order_details_order?.created_at;
  const timeAgo = createdAt ? calculateTimeAgo(createdAt) : '';

  // Transform order type to camelCase
  const orderTypeMap = {
    'take_away': 'takeAway',
    'dine_in': 'dineIn',
    'dinein': 'dineIn',      // API returns 'dinein' without underscore
    'delivery': 'delivery',
    'pos': 'dineIn'          // POS orders treated as dine-in
  };

  return {
    // Order identifiers
    id: order_details_order?.id,
    orderId: order_details_order?.restaurant_order_id || `#${order_details_order?.id}`,
    
    // Order type & source
    orderType: orderTypeMap[order_details_order?.order_type] || order_details_order?.order_type,
    source: 'own', // Hardcoded for now, Swiggy/Zomato later
    
    // Status
    status: getStatusFromCode(order_details_order?.f_order_status),
    statusCode: order_details_order?.f_order_status,
    paymentStatus: order_details_order?.payment_status || 'unpaid',
    
    // Customer info
    customer: order_details_order?.user_name || user?.f_name || 'Guest',
    phone: user?.phone || '',
    userId: order_details_order?.user_id || user?.id,
    
    // Amount
    amount: parseFloat(order_details_order?.order_amount) || 0,
    
    // Time
    time: timeAgo,
    createdAt: createdAt,
    
    // Table info (for dine-in)
    tableId: order_details_order?.table_id || 0,
    tableNo: restaurant_table?.restaurant_table_no || '',
    tableArea: restaurant_table?.restaurant_table_area || '',
    waiterId: order_details_order?.waiter_id || 0,
    waiterName: restaurant_table?.restaurant_waiter_name || '',
    
    // Order details
    note: order_details_order?.order_note || '',
    items: items,
    itemCount: items.length,
    
    // Restaurant info
    restaurantId: order_details_order?.restaurant?.id,
    restaurantName: order_details_order?.restaurant?.name,
    
    // Station status (for multi-station)
    stationOrderStatus: order_details_order?.station_order_status || {}
  };
};

/**
 * Calculate time ago from datetime string
 */
const calculateTimeAgo = (dateTimeStr) => {
  try {
    const orderTime = new Date(dateTimeStr);
    const now = new Date();
    const diffMs = now - orderTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } catch (e) {
    return '';
  }
};

/**
 * Split orders by type
 */
export const splitOrdersByType = (orders) => {
  const result = {
    delivery: [],
    takeAway: [],
    dineIn: []
  };
  
  orders.forEach(order => {
    switch (order.orderType) {
      case 'delivery':
        result.delivery.push(order);
        break;
      case 'takeAway':
        result.takeAway.push(order);
        break;
      case 'dineIn':
        result.dineIn.push(order);
        break;
      default:
        // Unknown type - put in takeAway as default
        result.takeAway.push(order);
    }
  });
  
  return result;
};

/**
 * Transform array of API orders to UI format
 */
export const transformAllOrders = (apiOrders) => {
  if (!apiOrders || !Array.isArray(apiOrders)) return [];
  return apiOrders.map(transformApiOrderToUI);
};

/**
 * Get orders for a specific table
 */
export const getOrdersForTable = (orders, tableId) => {
  return orders.filter(order => 
    order.orderType === 'dineIn' && order.tableId === tableId
  );
};

/**
 * Map dine-in orders to tables
 */
export const mapOrdersToTables = (tables, dineInOrders) => {
  return tables.map(table => {
    const tableOrders = dineInOrders.filter(order => order.tableId === table.id);
    return {
      ...table,
      orders: tableOrders,
      hasOrders: tableOrders.length > 0,
      orderCount: tableOrders.length,
      totalAmount: tableOrders.reduce((sum, o) => sum + o.amount, 0)
    };
  });
};
