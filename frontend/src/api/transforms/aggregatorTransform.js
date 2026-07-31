// CR-106: Normalize nested aggregator API response → flat FE order model
// Incorporates GAP-1 (order note), GAP-2 (coupon/discount), GAP-3 (rider_info casing), GAP-5 (schedule_at)
import { F_ORDER_STATUS, ORDER_TO_TABLE_STATUS } from '../constants';

// CR-106: Map f_order_status → tableStatus (same logic as orderTransform.mapTableStatus)
const mapAggregatorTableStatus = (fOrderStatus) => {
  const statusKey = F_ORDER_STATUS[fOrderStatus] || 'unknown';
  return ORDER_TO_TABLE_STATUS[statusKey] || 'occupied';
};

export const fromAPI = {
  /**
   * Transform single aggregator order from API nested shape → flat FE model
   * Compatible with OrderContext.addOrder()
   */
  aggregatorOrder(raw) {
    const od = raw.order_details_order || {};
    const foods = raw.order_details_food || [];
    const cust = raw.customer_details || {};
    const rider = raw.rider_info || {};

    // GAP-1: order note — food_details.order_note takes precedence over order_details_order.order_note
    // BUG-283: Strip Zomato "Order Instructions :::" prefix from order notes
    // BUG-287: Filter UrbanPiper default placeholder "This is order level instructions"
    const rawNote = foods[0]?.food_details?.order_note || od.order_note || '';
    const stripped = rawNote.replace(/^Order Instructions\s*:::\s*/i, '').trim();
    const orderNote = (stripped && !/^this is order level instructions$/i.test(stripped)) ? stripped : null;

    return {
      // Identity
      orderId: od.id,
      urbanOrderId: String(od.urban_order_id || ''),
      aggrId: String(od.aggrigator_id || ''), // CR-118: actual Swiggy/Zomato order ID for display + print
      orderNumber: od.restaurant_order_id || '',
      restaurantId: od.restaurant_id,

      // Status
      fOrderStatus: od.f_order_status,
      tableStatus: mapAggregatorTableStatus(od.f_order_status), // CR-106: needed by TableCard to render as "occupied"

      // Source / Origin
      source: od.order_plateform || 'aggregator', // NOTE: backend misspells "plateform"
      orderFrom: 'aggregator',
      isAggregator: true,
      isWebOrder: false, // prevents ScanOrderPopOut from triggering

      // Type
      orderType: od.order_type || 'delivery',

      // Financials
      amount: Number(od.order_amount) || 0,
      itemTotal: Number(od.item_total) || 0,
      taxAmount: Number(od.total_tax_amount) || 0,
      deliveryCharge: Number(od.delivery_charge) || 0,
      // GAP-2: coupon/discount fields
      couponCode: od.coupon_code || null,
      couponDiscount: Number(od.coupon_discount_amount) || 0,
      discountBy: od.discount_on_product_by || null,

      // Payment
      paymentMethod: od.payment_method || 'aggregator',
      paymentType: od.payment_status || 'unpaid',

      // Timestamps
      createdAt: od.created_at || '',
      // GAP-5: scheduled aggregator orders
      scheduledAt: od.schedule_at || null,

      // Prep / Lifecycle
      prepTimeMins: od.prep_time_mins || null,
      deliveryOtp: od.otp ? String(od.otp) : null,

      // Customer
      customerName: cust.name || od.user_name || '',
      customer: od.aggrigator_id ? `#${od.aggrigator_id}` : (cust.name || od.user_name || 'DEL'), // CR-118: display actual aggregator ID on TableCard
      phone: cust.phone || '',
      deliveryAddress: cust.address || null,

      // Notes
      orderNote,

      // Rider — GAP-3: inconsistent key casing (Phone, Cahnel)
      riderName: od.rider_name || rider.name || null,
      riderPhone: od.rider_phone_number || rider.Phone || rider.phone || null,
      riderInfo: {
        id: rider.id || null,
        name: rider.name || null,
        phone: rider.Phone || rider.phone || null,
        channel: rider.Cahnel || rider.channel || null,
        returnOtp: rider.order_return_otp || null,
        bagReturnOtp: rider.bag_return_otp || null,
      },

      // Items
      items: foods.map(f => {
        const fd = f.food_details || {};
        return {
          id: f.id,
          foodId: f.food_id,
          posId: f.pos_id,
          name: fd.title || fd.name || '', // C-1: use .title first
          categoryName: fd.category?.name || '',
          quantity: Number(f.quantity) || 1,
          qty: Number(f.quantity) || 1, // BUG-257: OrderCard reads item.qty (not item.quantity)
          unitPrice: Number(f.unit_price || f.price) || 0,
          price: Number(f.price) || 0,
          tax: Number(f.gst || f.tax_amount) || 0,
          notes: f.food_level_notes || null,
          // CR-118: Normalize aggregator addon shape — aggregator uses 'title', POS uses 'name'
          // Also separate variants (group.is_variant=true) from addons for OrderCard rendering
          addOns: (f.add_ons || []).filter(a => !a?.group?.is_variant).map(a => ({
            ...a,
            name: a.title || a.name || '',
            addon_name: a.title || a.name || '',
          })),
          variation: f.variation || (f.add_ons || []).filter(a => a?.group?.is_variant).map(a => ({
            name: a.group?.title || 'Variant',
            value: a.title || '',
            label: a.title || '',
            price: a.price || 0,
          })) || null,
          imageUrl: fd.image_url || null,
          foodStatus: f.food_status,
          // GAP-2: item-level discount
          discount: Number(f.discount_on_food || fd.discount) || 0,
          discountCode: f.discount_type || fd.discount_code || null,
          taxBreakdown: f.tax_breakdown || null,
          station: f.station || null,
        };
      }),

      // Derived fields for UI compatibility
      tableId: 0,
      tableName: '',
      waiterName: '',
      waiter: cust.name || od.user_name || 'Aggregator', // CR-106: waiter field used by TableCard for display
      time: od.created_at || '', // CR-106: time field used by adaptOrder
    };
  },

  /**
   * Transform full API list response → array of flat orders
   */
  aggregatorOrderList(apiResponse) {
    const orders = apiResponse?.orders || [];
    return orders.map(raw => fromAPI.aggregatorOrder(raw));
  },
};
