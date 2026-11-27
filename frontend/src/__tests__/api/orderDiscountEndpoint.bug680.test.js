// BUG-680: guard the order-discount-manage endpoint stays on v2.
// v1 stored the discount as config only and never recalculated order_amount,
// so the dashboard/OrderEntry/Cart showed pre-discount totals. v2 recalculates
// order_amount + restaurant_discount_amount and propagates to the running-orders list.

const { ORDER_DISCOUNT_ENDPOINTS } = require('../../api/constants');

describe('BUG-680: order-discount-manage endpoint', () => {
  test('MANAGE points at the v2 order-discount-manage path', () => {
    expect(ORDER_DISCOUNT_ENDPOINTS.MANAGE).toBe('/api/v2/vendoremployee/order/order-discount-manage');
  });

  test('MANAGE is NOT the stale v1 path (regression guard)', () => {
    expect(ORDER_DISCOUNT_ENDPOINTS.MANAGE).not.toContain('/api/v1/');
    expect(ORDER_DISCOUNT_ENDPOINTS.MANAGE).toContain('/api/v2/');
  });
});
