// CR-409: fromAPI.order coupon field mapping tests
import { fromAPI } from '../../../api/transforms/orderTransform';

describe('CR-409 — fromAPI.order coupon fields', () => {
  // V-2: order with no coupon → empty defaults
  it('V-2: order with no coupon fields → couponCode="", couponDiscount=0', () => {
    const result = fromAPI.order({ id: 1, order_type: 'dinein', orderDetails: [] });
    expect(result.couponCode).toBe('');
    expect(result.couponDiscount).toBe(0);
    expect(result.couponTitle).toBe('');
    expect(result.couponType).toBe('order');
  });

  // V-3: order with coupon → fields populated correctly
  it('V-3: order with coupon → fields populated', () => {
    const result = fromAPI.order({
      id: 1233112,
      order_type: 'dinein',
      coupon_code:     'MARRY',
      coupon_discount: 197,
      coupon_title:    'MARRY PROMO',
      coupon_type:     'order',
      orderDetails:    [],
    });
    expect(result.couponCode).toBe('MARRY');
    expect(result.couponDiscount).toBe(197);
    expect(result.couponTitle).toBe('MARRY PROMO');
    expect(result.couponType).toBe('order');
  });

  // V-2b: coupon_discount as string (API sometimes returns strings)
  it('V-2b: coupon_discount as string "197" → parsed as number 197', () => {
    const result = fromAPI.order({
      id: 1,
      order_type: 'dinein',
      coupon_code: 'MARRY',
      coupon_discount: '197',
      orderDetails: [],
    });
    expect(result.couponDiscount).toBe(197);
    expect(typeof result.couponDiscount).toBe('number');
  });

  // V-2c: null coupon_code → empty string (not null)
  it('V-2c: null coupon_code → couponCode=""', () => {
    const result = fromAPI.order({
      id: 1,
      order_type: 'dinein',
      coupon_code: null,
      coupon_discount: null,
      orderDetails: [],
    });
    expect(result.couponCode).toBe('');
    expect(result.couponDiscount).toBe(0);
  });
});
