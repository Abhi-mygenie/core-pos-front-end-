/**
 * Test Suite: toAPI.updateOrder() — current wire-format contract
 *
 * HISTORICAL NOTE
 * ---------------
 * Originally written before several deliberate sprint refactors evolved
 * the `updateOrder` payload shape:
 *   - OLD_POS_NORMALIZE Task 3 (Apr-2026, see orderTransform.js:51): wire
 *     `order_type` is `'takeaway'` (not legacy `'take_away'`).
 *   - CR-005..CR-008: per-cart-item `gst_amount`/`vat_amount` are emitted
 *     as 2-decimal strings (`'5.00'`) for a stable backend wire format.
 *   - Per-item `tax_amount` and `total_price` were dropped from the
 *     `cart-update` shape (only `food_amount`, `gst_amount`, `vat_amount`
 *     are emitted per item; tax totals roll up at order level).
 *   - `order_id` is `String(table.orderId)` (`"999"`, not `999`).
 *   - `updateOrder` carries only `cust_name`; customer mobile/email are
 *     captured at place-order time and not re-sent on update.
 *
 * Tests rewritten in place to assert against the documented current shape.
 * No file deletion. Outer describe shells preserved.
 */

import { toAPI } from '../../../api/transforms/orderTransform';

// =============================================================================
// Test Data: Mock inputs
// =============================================================================

const createMockTable = (overrides = {}) => ({
  orderId: 730176,
  tableId: 5,
  ...overrides,
});

const createMockItem = (overrides = {}) => ({
  id: 123,
  name: 'Test Item',
  price: 100,
  qty: 1,
  tax: {
    percentage: 5,
    type: 'GST',
    calculation: 'Exclusive',
    isInclusive: false,
  },
  station: 'KITCHEN',
  selectedAddons: [],
  selectedSize: null,
  notes: '',
  ...overrides,
});

const createMockCustomer = (overrides = {}) => ({
  name: 'Test Customer',
  phone: '9876543210',
  ...overrides,
});

// =============================================================================
// Test Suite: toAPI.updateOrder() - Per-item Tax Calculation
// =============================================================================

describe('toAPI.updateOrder() - Tax Calculation Breakup', () => {

  describe('Per-item tax calculation', () => {

    // -------------------------------------------------------------------------
    // Test 1: food_amount calculation
    // -------------------------------------------------------------------------
    test('should calculate food_amount as price * quantity', () => {
      const table = createMockTable();
      const items = [createMockItem({ price: 100, qty: 2 })];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });

      expect(payload['cart-update'][0].food_amount).toBe(200); // 100 * 2
    });

    // -------------------------------------------------------------------------
    // Test 2: GST tax calculation (Exclusive)
    // NS-3C-9: gst_amount/vat_amount are 2-decimal strings per current shape;
    // per-item `tax_amount` is no longer emitted (rolled up to order level).
    // -------------------------------------------------------------------------
    test('should calculate gst_amount for exclusive GST (string-typed)', () => {
      const table = createMockTable();
      const items = [createMockItem({
        price: 100,
        qty: 1,
        tax: { percentage: 5, type: 'GST', calculation: 'Exclusive', isInclusive: false },
      })];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });

      expect(payload['cart-update'][0].gst_amount).toBe('5.00');
      expect(payload['cart-update'][0].vat_amount).toBe('0.00');
      // Per-item `tax_amount` removed — order-level totals replace it
      expect(payload['cart-update'][0].tax_amount).toBeUndefined();
    });

    // -------------------------------------------------------------------------
    // Test 3: VAT tax calculation
    // -------------------------------------------------------------------------
    test('should calculate vat_amount for VAT type (string-typed)', () => {
      const table = createMockTable();
      const items = [createMockItem({
        price: 100,
        qty: 1,
        tax: { percentage: 10, type: 'VAT', calculation: 'Exclusive', isInclusive: false },
      })];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });

      expect(payload['cart-update'][0].vat_amount).toBe('10.00');
      expect(payload['cart-update'][0].gst_amount).toBe('0.00');
      expect(payload['cart-update'][0].tax_amount).toBeUndefined();
    });

    // -------------------------------------------------------------------------
    // Test 4: Inclusive tax calculation
    // -------------------------------------------------------------------------
    test('should calculate gst_amount correctly for inclusive tax', () => {
      const table = createMockTable();
      const items = [createMockItem({
        price: 105, // price includes 5% tax
        qty: 1,
        tax: { percentage: 5, type: 'GST', calculation: 'Inclusive', isInclusive: true },
      })];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });

      // For inclusive: tax = 105 - (105 / 1.05) = 5; food_amount stays at 105 (qty * price)
      expect(payload['cart-update'][0].gst_amount).toBe('5.00');
      expect(payload['cart-update'][0].food_amount).toBe(105);
    });

    // -------------------------------------------------------------------------
    // Test 5 (REPURPOSED): order-level total reflects price + tax (was per-item
    // `total_price`, which is no longer emitted). Asserts order_amount instead.
    // -------------------------------------------------------------------------
    test('should reflect food + tax in order_amount for exclusive tax', () => {
      const table = createMockTable();
      const items = [createMockItem({
        price: 100,
        qty: 1,
        tax: { percentage: 5, type: 'GST', calculation: 'Exclusive', isInclusive: false },
      })];
      const customer = createMockCustomer();

      // updateOrder() computes order-level totals from `allCartItems`.
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1, allCartItems: items });

      // Per-item `total_price` no longer emitted (NS-3C-9); order-level
      // `order_amount` reflects food_amount + tax = 100 + 5 = 105.
      expect(payload['cart-update'][0].total_price).toBeUndefined();
      expect(payload.order_amount).toBe(105);
    });

    // -------------------------------------------------------------------------
    // Test 6: Multiple items calculation
    // -------------------------------------------------------------------------
    test('should calculate tax for multiple items (string-typed amounts)', () => {
      const table = createMockTable();
      const items = [
        createMockItem({ id: 1, price: 100, qty: 2, tax: { percentage: 5, type: 'GST', isInclusive: false } }),
        createMockItem({ id: 2, price: 50, qty: 1, tax: { percentage: 10, type: 'GST', isInclusive: false } }),
      ];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1, allCartItems: items });

      // Item 1: food_amount=200, gst='10.00'
      expect(payload['cart-update'][0].food_amount).toBe(200);
      expect(payload['cart-update'][0].gst_amount).toBe('10.00');

      // Item 2: food_amount=50, gst='5.00'
      expect(payload['cart-update'][1].food_amount).toBe(50);
      expect(payload['cart-update'][1].gst_amount).toBe('5.00');

      // Order-level total tax = 10 + 5 = 15 (exposed as `tax_amount` per current contract)
      expect(payload.tax_amount).toBe(15);
    });

    // -------------------------------------------------------------------------
    // Test 7: Zero tax handling
    // -------------------------------------------------------------------------
    test('should handle zero tax percentage', () => {
      const table = createMockTable();
      const items = [createMockItem({
        price: 100,
        qty: 1,
        tax: { percentage: 0, type: 'GST', isInclusive: false },
      })];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1, allCartItems: items });

      expect(payload['cart-update'][0].gst_amount).toBe('0.00');
      expect(payload['cart-update'][0].vat_amount).toBe('0.00');
      expect(payload.order_amount).toBe(100);
    });

    // -------------------------------------------------------------------------
    // Test 8: Missing tax object defaults
    // -------------------------------------------------------------------------
    test('should use default tax values when tax object is missing', () => {
      const table = createMockTable();
      const items = [createMockItem({ price: 100, qty: 1, tax: undefined })];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1, allCartItems: items });

      expect(payload['cart-update'][0].gst_amount).toBe('0.00');
      expect(payload['cart-update'][0].vat_amount).toBe('0.00');
      expect(payload.order_amount).toBe(100);
    });
  });

  // ===========================================================================
  // Test Suite: Order-level totals
  // ===========================================================================

  describe('Order-level totals', () => {

    // -------------------------------------------------------------------------
    // Test 9: order_amount calculation
    // -------------------------------------------------------------------------
    test('should calculate order_amount from all items (food + tax)', () => {
      const table = createMockTable();
      const items = [
        createMockItem({ price: 100, qty: 1, tax: { percentage: 5, type: 'GST', isInclusive: false } }),
        createMockItem({ price: 50, qty: 2, tax: { percentage: 10, type: 'GST', isInclusive: false } }),
      ];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1, allCartItems: items });

      // Item 1: 100 + 5 = 105
      // Item 2: 100 + 10 = 110
      // Total: 215
      expect(payload.order_amount).toBe(215);
    });

    // -------------------------------------------------------------------------
    // Test 10: order_sub_total_amount
    // -------------------------------------------------------------------------
    test('should set order_sub_total_amount equal to order_amount (no discount)', () => {
      const table = createMockTable();
      const items = [createMockItem({ price: 100, qty: 1, tax: { percentage: 5, type: 'GST', isInclusive: false } })];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });

      expect(payload.order_sub_total_amount).toBe(payload.order_amount);
    });

    // -------------------------------------------------------------------------
    // Test 11: order-level total tax (exposed as `tax_amount`)
    // -------------------------------------------------------------------------
    test('should calculate order-level tax_amount from all items', () => {
      const table = createMockTable();
      const items = [
        createMockItem({ price: 100, qty: 1, tax: { percentage: 5, type: 'GST', isInclusive: false } }),
        createMockItem({ price: 50, qty: 2, tax: { percentage: 10, type: 'GST', isInclusive: false } }),
      ];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1, allCartItems: items });

      // Item 1: tax = 5
      // Item 2: tax = 10
      // Total tax: 15 (current contract field name: tax_amount)
      expect(payload.tax_amount).toBe(15);
    });

    // -------------------------------------------------------------------------
    // Test 12: order_amount includes addon amounts
    // (NS-3C-9: production `buildCartItem` reads addons from `selectedAddons`
    //  but variations from `selectedVariants` / `variantGroups` — `selectedSize`
    //  is not part of the current contract. Test scope narrowed to addons only.)
    // -------------------------------------------------------------------------
    test('should include addon amounts in order_amount', () => {
      const table = createMockTable();
      const items = [createMockItem({
        price: 100,
        qty: 1,
        tax: { percentage: 0, type: 'GST', isInclusive: false },
        selectedAddons: [{ id: 1, price: 20, quantity: 1 }],
      })];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1, allCartItems: items });

      // food (100) + addon (20) = 120 (no tax, no variation)
      expect(payload.order_amount).toBe(120);
    });
  });

  // ===========================================================================
  // Test Suite: Other payload fields
  // ===========================================================================

  describe('Other payload fields', () => {

    // -------------------------------------------------------------------------
    // Test 13: order_id (String-wrapped per current contract)
    // -------------------------------------------------------------------------
    test('should include order_id as a string (String(table.orderId))', () => {
      const table = createMockTable({ orderId: 999 });
      const items = [createMockItem()];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });

      expect(payload.order_id).toBe('999');
    });

    // -------------------------------------------------------------------------
    // Test 14 (REPURPOSED): updateOrder carries only cust_name. Customer
    // mobile/email are captured at place-order time, not re-sent on update.
    // -------------------------------------------------------------------------
    test('should include cust_name only (cust_mobile/cust_email captured at place-order time)', () => {
      const table = createMockTable();
      const items = [createMockItem()];
      const customer = createMockCustomer({ name: 'John Doe', phone: '1234567890', email: 'jd@example.com' });

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });

      expect(payload.cust_name).toBe('John Doe');
      // updateOrder shape (NS-3C-9): no cust_mobile / cust_email (place-order captures these).
      expect(payload).not.toHaveProperty('cust_mobile');
      expect(payload).not.toHaveProperty('cust_email');
    });

    // -------------------------------------------------------------------------
    // Test 15: order_type mapping per OLD_POS_NORMALIZE Task 3 (Apr-2026)
    // -------------------------------------------------------------------------
    test('should map orderType to canonical wire form per OLD_POS_NORMALIZE Task 3', () => {
      const table = createMockTable();
      const items = [createMockItem()];
      const customer = createMockCustomer();

      // OLD_POS_NORMALIZE Task 3 (orderTransform.js:51): canonical wire form
      // for take-away is 'takeaway' (not legacy 'take_away').
      expect(toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 }).order_type).toBe('dinein');
      expect(toAPI.updateOrder(table, items, customer, 'walkIn', { restaurantId: 1 }).order_type).toBe('dinein');
      expect(toAPI.updateOrder(table, items, customer, 'takeAway', { restaurantId: 1 }).order_type).toBe('takeaway');
      expect(toAPI.updateOrder(table, items, customer, 'delivery', { restaurantId: 1 }).order_type).toBe('delivery');
    });

    // -------------------------------------------------------------------------
    // Test 16: station field
    // -------------------------------------------------------------------------
    test('should include station in cart items (uppercased)', () => {
      const table = createMockTable();
      const items = [createMockItem({ station: 'bar' })];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });

      expect(payload['cart-update'][0].station).toBe('BAR');
    });

    // -------------------------------------------------------------------------
    // Test 17: food_level_notes
    // -------------------------------------------------------------------------
    test('should include item notes as food_level_notes', () => {
      const table = createMockTable();
      const items = [createMockItem({ notes: 'No onions please' })];
      const customer = createMockCustomer();

      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });

      expect(payload['cart-update'][0].food_level_notes).toBe('No onions please');
    });
  });
});
