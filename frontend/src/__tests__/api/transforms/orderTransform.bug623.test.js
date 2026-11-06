// BUG-623: null variation entries must not crash orderTransform
import { toAPI } from '../../../api/transforms/orderTransform';

const sizeVar = { name: 'Size', values: [{ label: 'L', optionPrice: '20' }] };

const cartItem = {
  id: 1, foodId: 5, name: 'Tea', price: 100, qty: 1,
  tax: { percentage: 5, type: 'GST', calculation: 'Exclusive' },
  variation: [null, sizeVar],
};

describe('BUG-623 null variation guard', () => {
  test('U1/U2 placeOrder: null dropped, amount counted, no junk group', () => {
    const p = toAPI.placeOrder({ tableId: 1 }, [cartItem], {}, 'dineIn', {});
    const line = p.cart[0];
    expect(line.variations).toEqual([{ name: 'Size', values: { label: ['L'] } }]);
    expect(line.variation_amount).toBe(20);
  });

  test('U3 collectBillExisting: no throw with null variation', () => {
    expect(() => toAPI.collectBillExisting(
      { orderId: 1, rawOrderDetails: [] },
      [{ ...cartItem, placed: true }],
      {},
      { method: 'cash', finalTotal: 126 },
      {},
    )).not.toThrow();
  });

  test('U4 buildBillPrintPayload reprint: no throw with null variation', () => {
    const order = {
      orderId: 1,
      rawOrderDetails: [{ id: 10, quantity: 1, unit_price: '100', price: 100, variation: [null, sizeVar], food_details: { id: 5, name: 'Tea', price: 100, tax: 5 } }],
    };
    expect(() => toAPI.buildBillPrintPayload(order, 0, {})).not.toThrow();
  });
});
