// =============================================================================
// CR-029 — Round-Up persistence on Collect Bill (BILL_PAYMENT)
//          + QSR payload parity (discount_member_category_id/name + discount_type)
// -----------------------------------------------------------------------------
// Locks Gate 3 contract for collectBillExisting:
//   1. `round_up` is now a NUMERIC value derived from paymentData.roundOff
//      (replaces hardcoded 0 at orderTransform.js:1569).
//   2. Defaults to 0 when paymentData.roundOff is undefined (backward compat
//      with Reports re-collect drawer + existing fixtures).
//   3. Negative roundOff clamps to 0 (Math.max(0, …) — defensive mirror of
//      calcOrderTotals roundUpAbs clamp).
//   4. discount_member_category_id / discount_member_category_name propagate
//      from paymentData.discounts in both Flow 3 (PLACE_ORDER, placeOrderWithPayment)
//      and Flow 4 (BILL_PAYMENT, collectBillExisting) per owner directive
//      2026-06-12 (QSR mirrors Full Mode for reporting parity).
//
// Q-BE-1 confirmed BILL_PAYMENT `round_up` is NUMERIC (not string) — this test
// asserts the type, distinct from calcOrderTotals' string contract.
//
// Owner decisions baked in:
//   - QSR has no coupon / loyalty / wallet (out of scope).
//   - transferToRoom does NOT carry round_up (G4 dropped).
//   - PLACE_ORDER continues to send round_up as STRING; BILL_PAYMENT sends NUMERIC.
// =============================================================================

import { toAPI } from '../../../api/transforms/orderTransform';

// -----------------------------------------------------------------------------
// Test fixtures (mirrored from qa_subtotal_delivery_validation.test.js)
// -----------------------------------------------------------------------------
const mkTable    = (overrides = {}) => ({ tableId: 1, orderId: 100, ...overrides });
const mkItem     = (price = 100) => ({
  id: 1, foodId: 100, name: 'Item', price, qty: 1,
  status: 'placed', station: 'KDS', placed: true,
});
const mkCustomer = () => ({ name: 'Test', phone: '9999999999' });

const mkBillPayload = (paymentDataOverrides = {}) =>
  toAPI.collectBillExisting(
    mkTable(),
    [mkItem(100)],
    mkCustomer(),
    {
      finalTotal: 100, subtotal: 100, itemTotal: 100,
      ...paymentDataOverrides,
    },
    {},
  );

// =============================================================================
// G1 — round_up persistence on BILL_PAYMENT (Flow 4)
// =============================================================================
describe('CR-029 G1 | round_up persistence on BILL_PAYMENT', () => {
  test('round_up reflects paymentData.roundOff as NUMERIC value', () => {
    const p = mkBillPayload({ finalTotal: 106, roundOff: 0.2 });
    expect(typeof p.round_up).toBe('number');
    expect(p.round_up).toBe(0.2);
  });

  test('round_up = 0 when roundOff missing (drawer re-collect + legacy fixtures)', () => {
    const p = mkBillPayload({ finalTotal: 100 });   // no roundOff key
    expect(p.round_up).toBe(0);
  });

  test('round_up = 0 when roundOffEnabled=false (profile-gated, UI sends roundOff: 0)', () => {
    const p = mkBillPayload({ finalTotal: 100, roundOff: 0 });
    expect(p.round_up).toBe(0);
  });

  test('negative roundOff clamps to 0 (defensive — Math.ceil never produces negative)', () => {
    const p = mkBillPayload({ finalTotal: 100, roundOff: -0.3 });
    expect(p.round_up).toBe(0);
  });

  test('round_up rounds to 2 decimals (paise precision)', () => {
    const p = mkBillPayload({ finalTotal: 106, roundOff: 0.249 });
    expect(p.round_up).toBe(0.25);
  });

  test('round_up handles string input (defensive parseFloat)', () => {
    const p = mkBillPayload({ finalTotal: 106, roundOff: '0.50' });
    expect(p.round_up).toBe(0.5);
  });

  test('BILL_PAYMENT round_up is distinct type from PLACE_ORDER round_up', () => {
    // PLACE_ORDER (calcOrderTotals) emits round_up as STRING ("0.20").
    // BILL_PAYMENT (collectBillExisting) emits round_up as NUMBER.
    // Cross-flow type unification is OUT of CR-029 scope (Q-BE-1).
    const billP = mkBillPayload({ finalTotal: 106, roundOff: 0.2 });
    expect(typeof billP.round_up).toBe('number');

    const placeP = toAPI.placeOrderWithPayment(
      mkTable(),
      [{ ...mkItem(100), placed: false }],
      mkCustomer(),
      'dineIn',
      { method: 'cash', tip: 0, deliveryCharge: 0, discounts: {} },
      { restaurantId: 1, userId: '42' },
    );
    expect(typeof placeP.round_up).toBe('string');
  });
});

// =============================================================================
// G3 — QSR payload parity (discount_member_category_id/name + discount_type)
// =============================================================================
describe('CR-029 G3 | discount_member_category fields propagate from paymentData.discounts', () => {
  const presetDiscounts = {
    manual: 0, preset: 5, total: 5,
    orderDiscountPercent: 0,
    presetDiscountPercent: 5,
    couponDiscount: 0,
    discountType: 'Staff',
    orderDiscountType: 'Percent',
    discountMemberCategoryId: 42,
    discountMemberCategoryName: 'Staff',
  };

  test('BILL_PAYMENT (Flow 4): id/name + discount_type land from paymentData.discounts', () => {
    const p = mkBillPayload({
      finalTotal: 95, subtotal: 100, itemTotal: 100, roundOff: 0,
      discounts: presetDiscounts,
    });
    expect(p.discount_member_category_id).toBe(42);
    expect(p.discount_member_category_name).toBe('Staff');
    expect(p.discount_type).toBe('Staff');
    expect(p.order_discount_type).toBe('Percent');
  });

  test('BILL_PAYMENT (Flow 4): defaults to 0/"" when discounts.* absent (no-preset QSR + non-QSR)', () => {
    const p = mkBillPayload({ finalTotal: 100, roundOff: 0, discounts: {} });
    expect(p.discount_member_category_id).toBe(0);
    expect(p.discount_member_category_name).toBe('');
  });

  test('PLACE_ORDER (Flow 3, QSR Place & Pay): id/name + discount_type land from paymentData.discounts', () => {
    const p = toAPI.placeOrderWithPayment(
      mkTable(),
      [{ ...mkItem(100), placed: false }],
      mkCustomer(),
      'dineIn',
      { method: 'cash', tip: 0, deliveryCharge: 0, discounts: presetDiscounts },
      { restaurantId: 1, userId: '42' },
    );
    expect(p.discount_member_category_id).toBe(42);
    expect(p.discount_member_category_name).toBe('Staff');
    expect(p.discount_type).toBe('Staff');
    expect(p.order_discount_type).toBe('Percent');
  });

  test('PLACE_ORDER (Flow 3): defaults to 0/"" when discounts.* absent', () => {
    const p = toAPI.placeOrderWithPayment(
      mkTable(),
      [{ ...mkItem(100), placed: false }],
      mkCustomer(),
      'dineIn',
      { method: 'cash', tip: 0, deliveryCharge: 0, discounts: {} },
      { restaurantId: 1, userId: '42' },
    );
    expect(p.discount_member_category_id).toBe(0);
    expect(p.discount_member_category_name).toBe('');
  });
});
