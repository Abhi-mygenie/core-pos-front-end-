/**
 * Test Suite: toAPI.updateOrder() - Tax Calculation Breakup
 * 
 * Tests for the updateOrder transform function which builds the payload
 * for PUT /api/v2/vendoremployee/pos/update-place-order
 * 
 * Key fields tested:
 * - Per-item: food_amount, gst_amount, vat_amount, tax_amount, total_price
 * - Order-level: order_amount, order_sub_total_amount, order_total_tax_amount
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
    // -------------------------------------------------------------------------
    test('should calculate gst_amount for exclusive GST', () => {
      const table = createMockTable();
      const items = [createMockItem({
        price: 100,
        qty: 1,
        tax: { percentage: 5, type: 'GST', calculation: 'Exclusive', isInclusive: false },
      })];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      expect(payload['cart-update'][0].gst_amount).toBe(5); // 100 * 5%
      expect(payload['cart-update'][0].vat_amount).toBe(0);
      expect(payload['cart-update'][0].tax_amount).toBe(5);
    });

    // -------------------------------------------------------------------------
    // Test 3: VAT tax calculation
    // -------------------------------------------------------------------------
    test('should calculate vat_amount for VAT type', () => {
      const table = createMockTable();
      const items = [createMockItem({
        price: 100,
        qty: 1,
        tax: { percentage: 10, type: 'VAT', calculation: 'Exclusive', isInclusive: false },
      })];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      expect(payload['cart-update'][0].vat_amount).toBe(10); // 100 * 10%
      expect(payload['cart-update'][0].gst_amount).toBe(0);
      expect(payload['cart-update'][0].tax_amount).toBe(10);
    });

    // -------------------------------------------------------------------------
    // Test 4: Inclusive tax calculation
    // -------------------------------------------------------------------------
    test('should calculate tax correctly for inclusive tax', () => {
      const table = createMockTable();
      const items = [createMockItem({
        price: 105, // price includes 5% tax
        qty: 1,
        tax: { percentage: 5, type: 'GST', calculation: 'Inclusive', isInclusive: true },
      })];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      // For inclusive: taxAmount = 105 - (105 / 1.05) = 105 - 100 = 5
      expect(payload['cart-update'][0].tax_amount).toBe(5);
      expect(payload['cart-update'][0].food_amount).toBe(105);
      expect(payload['cart-update'][0].total_price).toBe(105); // No additional tax added
    });

    // -------------------------------------------------------------------------
    // Test 5: total_price calculation (Exclusive)
    // -------------------------------------------------------------------------
    test('should calculate total_price as food_amount + tax for exclusive', () => {
      const table = createMockTable();
      const items = [createMockItem({
        price: 100,
        qty: 1,
        tax: { percentage: 5, type: 'GST', calculation: 'Exclusive', isInclusive: false },
      })];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      expect(payload['cart-update'][0].total_price).toBe(105); // 100 + 5
    });

    // -------------------------------------------------------------------------
    // Test 6: Multiple items calculation
    // -------------------------------------------------------------------------
    test('should calculate tax for multiple items correctly', () => {
      const table = createMockTable();
      const items = [
        createMockItem({ id: 1, price: 100, qty: 2, tax: { percentage: 5, type: 'GST', isInclusive: false } }),
        createMockItem({ id: 2, price: 50, qty: 1, tax: { percentage: 10, type: 'GST', isInclusive: false } }),
      ];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      // Item 1: food_amount=200, tax=10, total=210
      expect(payload['cart-update'][0].food_amount).toBe(200);
      expect(payload['cart-update'][0].tax_amount).toBe(10);
      expect(payload['cart-update'][0].total_price).toBe(210);
      
      // Item 2: food_amount=50, tax=5, total=55
      expect(payload['cart-update'][1].food_amount).toBe(50);
      expect(payload['cart-update'][1].tax_amount).toBe(5);
      expect(payload['cart-update'][1].total_price).toBe(55);
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
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      expect(payload['cart-update'][0].tax_amount).toBe(0);
      expect(payload['cart-update'][0].total_price).toBe(100);
    });

    // -------------------------------------------------------------------------
    // Test 8: Missing tax object defaults
    // -------------------------------------------------------------------------
    test('should use default tax values when tax object is missing', () => {
      const table = createMockTable();
      const items = [createMockItem({ price: 100, qty: 1, tax: undefined })];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      expect(payload['cart-update'][0].tax_amount).toBe(0);
      expect(payload['cart-update'][0].gst_amount).toBe(0);
      expect(payload['cart-update'][0].total_price).toBe(100);
    });
  });

  // ===========================================================================
  // Test Suite: Order-level totals
  // ===========================================================================

  describe('Order-level totals', () => {
    
    // -------------------------------------------------------------------------
    // Test 9: order_amount calculation
    // -------------------------------------------------------------------------
    test('should calculate order_amount from all items', () => {
      const table = createMockTable();
      const items = [
        createMockItem({ price: 100, qty: 1, tax: { percentage: 5, type: 'GST', isInclusive: false } }),
        createMockItem({ price: 50, qty: 2, tax: { percentage: 10, type: 'GST', isInclusive: false } }),
      ];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      // Item 1: 100 + 5 = 105
      // Item 2: 100 + 10 = 110
      // Total: 215
      expect(payload.order_amount).toBe(215);
    });

    // -------------------------------------------------------------------------
    // Test 10: order_sub_total_amount
    // -------------------------------------------------------------------------
    test('should set order_sub_total_amount equal to order_amount', () => {
      const table = createMockTable();
      const items = [createMockItem({ price: 100, qty: 1, tax: { percentage: 5, type: 'GST', isInclusive: false } })];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      expect(payload.order_sub_total_amount).toBe(payload.order_amount);
    });

    // -------------------------------------------------------------------------
    // Test 11: order_total_tax_amount
    // -------------------------------------------------------------------------
    test('should calculate order_total_tax_amount from all items', () => {
      const table = createMockTable();
      const items = [
        createMockItem({ price: 100, qty: 1, tax: { percentage: 5, type: 'GST', isInclusive: false } }),
        createMockItem({ price: 50, qty: 2, tax: { percentage: 10, type: 'GST', isInclusive: false } }),
      ];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      // Item 1: tax = 5
      // Item 2: tax = 10
      // Total tax: 15
      expect(payload.order_total_tax_amount).toBe(15);
    });

    // -------------------------------------------------------------------------
    // Test 12: order_amount includes addons and variations
    // -------------------------------------------------------------------------
    test('should include addon and variation amounts in order_amount', () => {
      const table = createMockTable();
      const items = [createMockItem({
        price: 100,
        qty: 1,
        tax: { percentage: 0, type: 'GST', isInclusive: false },
        selectedAddons: [{ id: 1, price: 20, quantity: 1 }],
        selectedSize: { price: 30 },
      })];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      // total_price (100) + addon (20) + variation (30) = 150
      expect(payload.order_amount).toBe(150);
    });
  });

  // ===========================================================================
  // Test Suite: Other payload fields
  // ===========================================================================

  describe('Other payload fields', () => {
    
    // -------------------------------------------------------------------------
    // Test 13: order_id from table
    // -------------------------------------------------------------------------
    test('should include order_id from table', () => {
      const table = createMockTable({ orderId: 999 });
      const items = [createMockItem()];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      expect(payload.order_id).toBe(999);
    });

    // -------------------------------------------------------------------------
    // Test 14: customer info
    // -------------------------------------------------------------------------
    test('should include customer name and phone', () => {
      const table = createMockTable();
      const items = [createMockItem()];
      const customer = createMockCustomer({ name: 'John Doe', phone: '1234567890' });
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      expect(payload.cust_name).toBe('John Doe');
      expect(payload.cust_mobile).toBe('1234567890');
    });

    // -------------------------------------------------------------------------
    // Test 15: order_type mapping
    // -------------------------------------------------------------------------
    test('should map orderType correctly', () => {
      const table = createMockTable();
      const items = [createMockItem()];
      const customer = createMockCustomer();
      
      expect(toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 }).order_type).toBe('dinein');
      expect(toAPI.updateOrder(table, items, customer, 'walkIn', { restaurantId: 1 }).order_type).toBe('dinein');
      expect(toAPI.updateOrder(table, items, customer, 'takeAway', { restaurantId: 1 }).order_type).toBe('take_away');
      expect(toAPI.updateOrder(table, items, customer, 'delivery', { restaurantId: 1 }).order_type).toBe('delivery');
    });

    // -------------------------------------------------------------------------
    // Test 16: station field
    // -------------------------------------------------------------------------
    test('should include station in cart items', () => {
      const table = createMockTable();
      const items = [createMockItem({ station: 'bar' })];
      const customer = createMockCustomer();
      
      const payload = toAPI.updateOrder(table, items, customer, 'dineIn', { restaurantId: 1 });
      
      expect(payload['cart-update'][0].station).toBe('BAR'); // uppercased
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
