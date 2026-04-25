/**
 * ROOM_CHECKIN_GAP3 Stage 1 + Stage 2 transform-level tests
 * Verifies:
 *  - fromAPI.order exposes roomInfo struct when api.room_info present
 *  - fromAPI.order returns roomInfo:null when api.room_info absent
 *  - collectBillExisting payload emits `grand_total` ONLY when roomBalance > 0
 */
import { fromAPI, toAPI } from '../orderTransform';
const orderTransform = { fromAPI, toAPI };

describe('Stage 1 — fromAPI.order roomInfo exposure', () => {
  const baseApi = {
    id: 731700, restaurant_order_id: 'r-test-1',
    order_status: 'placed', order_type: 'room', cart: [],
    associated_order_list: [], grand_amount: '0', sub_total_amount: '0',
  };

  test('roomInfo populated when api.room_info present', () => {
    const out = orderTransform.fromAPI.order({
      ...baseApi,
      room_info: { room_price: '1500', advance_payment: '500', balance_payment: '1000' },
    });
    expect(out.roomInfo).toEqual({ roomPrice: 1500, advancePayment: 500, balancePayment: 1000 });
  });

  test('roomInfo null when api.room_info missing', () => {
    const out = orderTransform.fromAPI.order(baseApi);
    expect(out.roomInfo).toBeNull();
  });

  test('roomInfo coerces strings -> numbers, null fields -> 0', () => {
    const out = orderTransform.fromAPI.order({
      ...baseApi,
      room_info: { room_price: null, advance_payment: '750.5', balance_payment: undefined },
    });
    expect(out.roomInfo).toEqual({ roomPrice: 0, advancePayment: 750.5, balancePayment: 0 });
  });
});

describe('Stage 2 — collectBillExisting grand_total emission', () => {
  const table = { orderId: 731700 };
  const customer = {};

  test('grand_total ABSENT when roomBalance = 0 (non-room)', () => {
    const payload = orderTransform.toAPI.collectBillExisting(
      table, [], customer,
      { method: 'cash', finalTotal: 500, roomBalance: 0 }
    );
    expect('grand_total' in payload).toBe(false);
    expect(payload.payment_amount).toBe(500);
    expect(payload.grand_amount).toBe(500);
  });

  test('grand_total ABSENT when roomBalance unset', () => {
    const payload = orderTransform.toAPI.collectBillExisting(
      table, [], customer,
      { method: 'cash', finalTotal: 500 }
    );
    expect('grand_total' in payload).toBe(false);
  });

  test('grand_total PRESENT when roomBalance > 0', () => {
    const payload = orderTransform.toAPI.collectBillExisting(
      table, [], customer,
      { method: 'cash', finalTotal: 1234, roomBalance: 100 }
    );
    expect(payload.grand_total).toBe(1234);
    expect(payload.payment_amount).toBe(1234);
  });

  test('food_detail filters out check-in marker', () => {
    const items = [
      { id: 1, foodId: 11, placed: true, status: 'placed', isCheckInMarker: true, price: 0, qty: 1 },
      { id: 2, foodId: 22, placed: true, status: 'placed', price: 100, unitPrice: 100, qty: 1 },
    ];
    const payload = orderTransform.toAPI.collectBillExisting(
      table, items, customer,
      { method: 'cash', finalTotal: 100 }
    );
    expect(payload.food_detail).toHaveLength(1);
    expect(payload.food_detail[0].food_id).toBe(22);
  });
});
