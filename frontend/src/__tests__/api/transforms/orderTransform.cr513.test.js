// CR-513 + BUG-592: discount_percentage / roundoff print keys + discount fallback removal
import { toAPI, fromAPI } from '../../../api/transforms/orderTransform';

const baseOrder = {
  orderId: 1,
  orderNumber: '000001',
  orderType: 'dineIn',
  rawOrderType: 'dinein',
  rawOrderDetails: [
    { id: 10, quantity: 1, unit_price: '100.00', price: 100, food_details: { id: 5, name: 'Tea', price: 100, tax: 5, tax_type: 'GST' } },
  ],
  discount: 30,
  amount: 74,
  createdAt: '2026-11-06T10:00:00Z',
};

const collectOverrides = { orderItemTotal: 100, orderSubtotal: 70, paymentAmount: 74, discountAmount: 30 };

describe('CR-513 buildBillPrintPayload', () => {
  test('U1 emits discount_percentage and roundoff when passed', () => {
    const p = toAPI.buildBillPrintPayload(baseOrder, 0, { ...collectOverrides, discountPercent: 30, roundoff: 0.5 });
    expect(p.discount_percentage).toBe(30);
    expect(p.roundoff).toBe(0.5);
  });

  test('U2 keeps negative roundoff (signed)', () => {
    const p = toAPI.buildBillPrintPayload(baseOrder, 0, { ...collectOverrides, roundoff: -0.04 });
    expect(p.roundoff).toBe(-0.04);
  });

  test('U3 omits discount_percentage when 0 / undefined', () => {
    expect(toAPI.buildBillPrintPayload(baseOrder, 0, { ...collectOverrides, discountPercent: 0 })).not.toHaveProperty('discount_percentage');
    expect(toAPI.buildBillPrintPayload(baseOrder, 0, collectOverrides)).not.toHaveProperty('discount_percentage');
  });

  test('U4 omits roundoff when 0 / undefined', () => {
    expect(toAPI.buildBillPrintPayload(baseOrder, 0, { ...collectOverrides, roundoff: 0 })).not.toHaveProperty('roundoff');
    expect(toAPI.buildBillPrintPayload(baseOrder, 0, collectOverrides)).not.toHaveProperty('roundoff');
  });

  test('U5 reprint (no overrides) emits neither key; discount_amount from order', () => {
    const p = toAPI.buildBillPrintPayload(baseOrder, 0, {});
    expect(p).not.toHaveProperty('discount_percentage');
    expect(p).not.toHaveProperty('roundoff');
    expect(p.discount_amount).toBe(30);
  });

  test('U8 pre-existing keys unchanged', () => {
    const before = toAPI.buildBillPrintPayload(baseOrder, 0, collectOverrides);
    const after = toAPI.buildBillPrintPayload(baseOrder, 0, { ...collectOverrides, discountPercent: 30, roundoff: 0.5 });
    const { discount_percentage, roundoff, ...rest } = after;
    expect(rest).toEqual(before);
  });
});

describe('BUG-592 fromAPI.order discount', () => {
  const raw = (extra) => ({ id: 1, order_details: [], orderDetails: [], ...extra });

  test('U6 uses restaurant_discount_amount (₹)', () => {
    expect(fromAPI.order(raw({ restaurant_discount_amount: 630, discount_value: '30.00' })).discount).toBe(630);
  });

  test('U7 no fallback to raw discount_value (%)', () => {
    expect(fromAPI.order(raw({ restaurant_discount_amount: 0, discount_value: '50' })).discount).toBe(0);
  });
});
