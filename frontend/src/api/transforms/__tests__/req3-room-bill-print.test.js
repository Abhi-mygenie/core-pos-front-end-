/**
 * REQ3 unit tests — room order bill print payload enrichment.
 * Verifies:
 *   - Non-room orders unaffected (regression)
 *   - Room orders populate roomRemainingPay/roomAdvancePay
 *   - associated_orders[] emitted with backend snake_case schema
 *   - payment_amount rolls in associatedTotal + roomBalance for override path
 */

import { toAPI as orderToAPI, fromAPI } from '../orderTransform';

describe('REQ3 — buildBillPrintPayload (room enrichment)', () => {
  const baseRawOrderDetail = {
    id: 9001,
    food_details: { id: 100, name: 'Test Food', price: 100, tax: 5, tax_type: 'GST', tax_calc: 'Exclusive' },
    unit_price: '100',
    price: 100,
    quantity: 1,
    food_status: 5,
    is_complementary: 'No',
  };

  const buildBaseOrder = (overrides = {}) => ({
    orderId: 731293,
    orderNumber: '000115',
    orderType: 'dineIn',
    rawOrderType: 'dinein',
    isRoom: false,
    isWalkIn: false,
    tableNumber: 'T1',
    waiter: 'Owner',
    customerName: '',
    phone: '',
    createdAt: '2026-04-25T12:00:00Z',
    rawOrderDetails: [baseRawOrderDetail],
    amount: 105,
    subtotalAmount: 100,
    subtotalBeforeTax: 100,
    serviceTax: 0,
    associatedOrders: [],
    roomInfo: null,
    ...overrides,
  });

  test('non-room order: roomRemainingPay/roomAdvancePay = 0; associated_orders=[]', () => {
    const order = buildBaseOrder();
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {});
    expect(payload.roomRemainingPay).toBe(0);
    expect(payload.roomAdvancePay).toBe(0);
    expect(payload.roomGst).toBe(0);
    expect(payload.associated_orders).toEqual([]);
    expect(payload.payment_amount).toBe(105);
  });

  test('room order with no transfers/balance: zero room values, empty associated_orders', () => {
    const order = buildBaseOrder({ isRoom: true, tableNumber: '101', roomInfo: { roomPrice: 0, advancePayment: 0, balancePayment: 0 } });
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {});
    expect(payload.roomRemainingPay).toBe(0);
    expect(payload.roomAdvancePay).toBe(0);
    expect(payload.associated_orders).toEqual([]);
    expect(payload.tablename).toBe('101');
  });

  test('room order with transfers + balance + advance — default branch (no override)', () => {
    const rawAssoc = {
      id: 3755, room_id: 7486, restaurant_id: 618, user_id: null,
      order_id: 731402, restaurant_order_id: '000125', order_amount: 71,
      order_status: 0, created_at: '2026-04-25T05:50:18.000000Z',
      updated_at: '2026-04-25T05:50:18.000000Z',
    };
    const order = buildBaseOrder({
      isRoom: true,
      tableNumber: '202',
      amount: 100 + 71 + 500, // food + assoc + balance (Task 4 computeRoomCardAmount)
      roomInfo: { roomPrice: 2000, advancePayment: 1500, balancePayment: 500 },
      associatedOrders: [{ orderId: 3755, orderNumber: '000125', amount: 71, transferredAt: '', _raw: rawAssoc }],
    });
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {}); // default branch
    expect(payload.roomRemainingPay).toBe(500);
    expect(payload.roomAdvancePay).toBe(1500);
    expect(payload.roomGst).toBe(0);
    expect(payload.associated_orders).toHaveLength(1);
    expect(payload.associated_orders[0]).toEqual({
      id: 3755, room_id: 7486, restaurant_id: 618, user_id: null,
      order_id: 731402, restaurant_order_id: '000125', order_amount: 71,
      order_status: 0,
      created_at: '2026-04-25T05:50:18.000000Z',
      updated_at: '2026-04-25T05:50:18.000000Z',
    });
    expect(payload.payment_amount).toBe(671); // trusts order.amount default branch
  });

  test('room order — override branch rolls assoc + balance into payment_amount', () => {
    const rawAssoc = {
      id: 3755, room_id: 7486, restaurant_id: 618, user_id: null,
      order_id: 731402, restaurant_order_id: '000125', order_amount: 71,
      order_status: 0, created_at: '', updated_at: '',
    };
    const order = buildBaseOrder({
      isRoom: true,
      roomInfo: { roomPrice: 2000, advancePayment: 1500, balancePayment: 500 },
      associatedOrders: [{ orderId: 3755, orderNumber: '000125', amount: 71, transferredAt: '', _raw: rawAssoc }],
    });
    // CollectPaymentPanel sends food-only finalTotal (e.g., 105) as paymentAmount
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {
      paymentAmount: 105,
      orderItemTotal: 100,
      orderSubtotal: 105,
    });
    // 105 (food) + 71 (assoc) + 500 (balance) = 676
    expect(payload.payment_amount).toBe(676);
    expect(payload.grant_amount).toBe(676);
    expect(payload.roomRemainingPay).toBe(500);
    expect(payload.roomAdvancePay).toBe(1500);
    expect(payload.associated_orders[0].order_id).toBe(731402);
  });

  test('non-room override branch: payment_amount NOT inflated', () => {
    const order = buildBaseOrder();
    const payload = orderToAPI.buildBillPrintPayload(order, 0, {
      paymentAmount: 200,
      orderItemTotal: 180,
      orderSubtotal: 200,
    });
    expect(payload.payment_amount).toBe(200);
    expect(payload.associated_orders).toEqual([]);
  });
});

describe('REQ3 — fromAPI.order preserves _raw on associatedOrders', () => {
  test('associated_order_list items get _raw preserved', () => {
    const apiOrder = {
      id: 731293, restaurant_order_id: '000115', table_id: 7486,
      order_status: 'placed', user: { name: 'Owner' }, table: { name: '202' },
      total_amount: 671, payment_amount: 671, sub_total: 100, payment_method: 'cash',
      created_at: '2026-04-25T12:00:00Z', orderDetails: [],
      associated_order_list: [{
        id: 3755, room_id: 7486, restaurant_id: 618, user_id: null,
        order_id: 731402, restaurant_order_id: '000125', order_amount: 71,
        order_status: 0, created_at: '2026-04-25T05:50:18.000000Z',
        updated_at: '2026-04-25T05:50:18.000000Z', collect_Bill: '',
      }],
      room_info: { room_price: 2000, advance_payment: 1500, balance_payment: 500 },
    };
    const out = fromAPI.order(apiOrder);
    expect(out.associatedOrders).toHaveLength(1);
    expect(out.associatedOrders[0].orderNumber).toBe('000125');
    expect(out.associatedOrders[0].amount).toBe(71);
    expect(out.associatedOrders[0]._raw).toBeDefined();
    expect(out.associatedOrders[0]._raw.order_id).toBe(731402);
    expect(out.associatedOrders[0]._raw.room_id).toBe(7486);
    expect(out.associatedOrders[0]._raw.created_at).toBe('2026-04-25T05:50:18.000000Z');
  });
});
