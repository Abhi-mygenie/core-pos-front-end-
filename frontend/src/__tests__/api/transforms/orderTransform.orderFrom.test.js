// POS2-002 Phase 1 — `order_from` mapping into the live-order model.
// ----------------------------------------------------------------------------
// Locked behaviour:
//   • `orderFrom`: lowercased + trimmed string; `null` for missing / empty.
//   • `isWebOrder`: derived boolean — `orderFrom === 'web'`.
//   • Mirrors audit-side mapping at `reportService.js:746-762` (CR-001 CS-15).
//   • Permissive normaliser preserves future BE values verbatim
//     (e.g. `'aggregator'`, `'kiosk'`) instead of silently dropping them.
//   • Phase 1 is purely additive — no existing field renamed or removed.

const { fromAPI } = require('../../../api/transforms/orderTransform');

const baseAPIOrder = (overrides = {}) => ({
  id: 730154,
  restaurant_order_id: 'T-1234',
  order_type: 'dineIn',
  order_in: 'POS',
  f_order_status: 7,
  order_status: 'pending',
  table_id: 12,
  restaurantTable: { table_no: '12', title: 'Main', rtype: 'NM' },
  vendorEmployee: { f_name: 'Alice' },
  user: {},
  user_name: 'Bob',
  payment_status: 'unpaid',
  payment_type: 'postpaid',
  payment_method: 'pending',
  order_amount: 250,
  order_sub_total_without_tax: 200,
  order_sub_total_amount: 220,
  total_service_tax_amount: 30,
  tip_amount: 0,
  tip_tax_amount: 0,
  created_at: '2026-05-09 10:00:00',
  updated_at: '2026-05-09 10:00:00',
  orderDetails: [],
  ...overrides,
});

// =============================================================================
// 1. Canonical values — 'pos' / 'web'
// =============================================================================
describe('POS2-002 Phase 1 | orderFrom canonical values', () => {
  test('T1: `order_from = "pos"` → orderFrom: "pos", isWebOrder: false', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: 'pos' }));
    expect(out.orderFrom).toBe('pos');
    expect(out.isWebOrder).toBe(false);
  });

  test('T2: `order_from = "web"` → orderFrom: "web", isWebOrder: true', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: 'web' }));
    expect(out.orderFrom).toBe('web');
    expect(out.isWebOrder).toBe(true);
  });
});

// =============================================================================
// 2. Casing + whitespace tolerance (audit-side parity)
// =============================================================================
describe('POS2-002 Phase 1 | casing + whitespace normalisation', () => {
  test('T3: `order_from = "WEB"` (uppercase) → orderFrom: "web"', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: 'WEB' }));
    expect(out.orderFrom).toBe('web');
    expect(out.isWebOrder).toBe(true);
  });

  test('T4: `order_from = "  web  "` (whitespace) → orderFrom: "web"', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: '  web  ' }));
    expect(out.orderFrom).toBe('web');
    expect(out.isWebOrder).toBe(true);
  });

  test('T3b: `order_from = "PoS"` (mixed case) → orderFrom: "pos"', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: 'PoS' }));
    expect(out.orderFrom).toBe('pos');
    expect(out.isWebOrder).toBe(false);
  });
});

// =============================================================================
// 3. Missing / null / non-string → null
// =============================================================================
describe('POS2-002 Phase 1 | missing / null / non-string handling', () => {
  test('T5: `order_from = ""` → orderFrom: null, isWebOrder: false', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: '' }));
    expect(out.orderFrom).toBeNull();
    expect(out.isWebOrder).toBe(false);
  });

  test('T6: `order_from = null` → orderFrom: null, isWebOrder: false', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: null }));
    expect(out.orderFrom).toBeNull();
    expect(out.isWebOrder).toBe(false);
  });

  test('T7: key absent (no `order_from` on payload) → orderFrom: null', () => {
    const out = fromAPI.order(baseAPIOrder()); // no order_from override
    expect(out.orderFrom).toBeNull();
    expect(out.isWebOrder).toBe(false);
  });

  test('T7b: `order_from = undefined` → orderFrom: null', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: undefined }));
    expect(out.orderFrom).toBeNull();
    expect(out.isWebOrder).toBe(false);
  });

  test('T7c: `order_from = 42` (numeric defensive) → orderFrom: null', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: 42 }));
    expect(out.orderFrom).toBeNull();
    expect(out.isWebOrder).toBe(false);
  });
});

// =============================================================================
// 4. Future-proofing — unknown values preserved verbatim
// =============================================================================
describe('POS2-002 Phase 1 | future BE values preserved verbatim', () => {
  test('T8: `order_from = "aggregator"` (future) → orderFrom: "aggregator", isWebOrder: false', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: 'aggregator' }));
    expect(out.orderFrom).toBe('aggregator');
    expect(out.isWebOrder).toBe(false);
  });

  test('T8b: `order_from = "KIOSK"` (future, mixed case) → orderFrom: "kiosk"', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: 'KIOSK' }));
    expect(out.orderFrom).toBe('kiosk');
    expect(out.isWebOrder).toBe(false);
  });
});

// =============================================================================
// 5. Regression — existing fields preserved (purely additive change)
// =============================================================================
describe('POS2-002 Phase 1 | regression — pre-existing fields untouched', () => {
  test('All pre-existing top-level keys remain present and correctly mapped', () => {
    const out = fromAPI.order(baseAPIOrder({ order_from: 'web' }));
    // Spot-check the canonical pre-existing keys (matches the shape returned
    // by orderTransform.js fromAPI.order pre-Phase-1).
    expect(out).toMatchObject({
      orderId: 730154,
      orderNumber: 'T-1234',
      orderType: expect.any(String),
      rawOrderType: 'dineIn',
      orderIn: 'POS',
      status: expect.any(String),
      fOrderStatus: 7,
      lifecycle: 'pending',
      tableId: 12,
      tableNumber: '12',
      isWalkIn: false,
      isRoom: false,
      customer: 'Bob',
      customerName: 'Bob',
      amount: 250,
      subtotalBeforeTax: 200,
      subtotalAmount: 220,
      serviceTax: 30,
      tipAmount: 0,
      tipTaxAmount: 0,
      paymentStatus: 'unpaid',
      paymentType: 'postpaid',
      paymentMethod: 'pending',
      source: 'pos',
    });
    // Phase 1 additions:
    expect(out).toHaveProperty('orderFrom');
    expect(out).toHaveProperty('isWebOrder');
  });

  test('Items array still computed (Phase 1 does not touch orderDetails)', () => {
    const out = fromAPI.order(
      baseAPIOrder({
        order_from: 'web',
        orderDetails: [
          {
            id: 1,
            food_id: 100,
            food_quantity: 2,
            food_price: 100,
            food_details: { name: 'Burger', id: 100 },
            f_order_status: 1,
            order_status: 'preparing',
          },
        ],
      })
    );
    expect(Array.isArray(out.items)).toBe(true);
    expect(out.items.length).toBe(1);
    expect(out.orderFrom).toBe('web');
  });

  test('order_from independent of payment_type / payment_status (orthogonal axes)', () => {
    // YTC-orthogonal-to-payment correction (owner 2026-05-09): a web order
    // can be prepaid or postpaid; a postpaid order can be POS or web. The
    // two axes are independent.
    const webPrepaid = fromAPI.order(baseAPIOrder({ order_from: 'web', payment_type: 'prepaid' }));
    const webPostpaid = fromAPI.order(baseAPIOrder({ order_from: 'web', payment_type: 'postpaid' }));
    const posPrepaid = fromAPI.order(baseAPIOrder({ order_from: 'pos', payment_type: 'prepaid' }));
    const posPostpaid = fromAPI.order(baseAPIOrder({ order_from: 'pos', payment_type: 'postpaid' }));

    expect(webPrepaid.isWebOrder).toBe(true);
    expect(webPrepaid.paymentType).toBe('prepaid');
    expect(webPostpaid.isWebOrder).toBe(true);
    expect(webPostpaid.paymentType).toBe('postpaid');
    expect(posPrepaid.isWebOrder).toBe(false);
    expect(posPrepaid.paymentType).toBe('prepaid');
    expect(posPostpaid.isWebOrder).toBe(false);
    expect(posPostpaid.paymentType).toBe('postpaid');
  });
});
