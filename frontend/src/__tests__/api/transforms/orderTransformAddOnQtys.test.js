/**
 * BUG-168 B1 Revert Test Suite: add_on_qtys Field Per-Unit Quantity
 * 
 * Tests that add_on_qtys array sends PER-UNIT quantities (NOT multiplied by item qty):
 * - buildCartItem (place-order payload builder) - Line 698
 * 
 * Backend contract (confirmed via Order #940260):
 * - add_on_qtys: per-unit quantity (e.g., [1] when user selects 1 addon per item)
 * - addon_amount: total price (e.g., 60 when addon ₹10 × 6 items) - BUG-166 fix KEPT
 * - variation_amount: total price (multiplied by item qty) - BUG-VQTY fix KEPT
 * 
 * The backend multiplies add_on_qtys by item qty on its side for storage.
 * Sending total qty caused double-counting (Order #940260: sent [5] → backend stored 5 → displayed x25)
 * 
 * Revert: L698 changed from 'addonQtys.map(q => q * (item.qty || 1))' back to 'addonQtys'
 */

import { toAPI } from '../../../api/transforms/orderTransform';

// =============================================================================
// Test Helpers: Create mock items with addons
// =============================================================================

const createMockCartItem = (overrides = {}) => ({
  id: 123,
  foodId: 123,
  name: 'Aloo Patties',
  price: 100,
  qty: 1,
  station: 'KDS',
  tax: {
    percentage: 5,
    type: 'GST',
    calculation: 'Exclusive',
    isInclusive: false,
  },
  selectedAddons: [],
  selectedVariants: {},
  variantGroups: [],
  variation: [],
  addOns: [],
  notes: '',
  placed: false,
  status: 'pending',
  isComplementary: false,
  isComplementaryRuntime: false,
  giveDiscount: true,
  ...overrides,
});

const createMockTable = (overrides = {}) => ({
  tableId: 5,
  orderId: 730176,
  tableNumber: 'T5',
  ...overrides,
});

// =============================================================================
// Test Suite: BUG-168 B1 Revert - add_on_qtys is per-unit (NOT multiplied)
// =============================================================================

describe('BUG-168 B1 Revert: add_on_qtys Per-Unit Quantity', () => {
  
  describe('buildCartItem via toAPI.placeOrder', () => {
    
    // -------------------------------------------------------------------------
    // Test 1: Backend contract - item qty=5, addon qty=1 per unit → add_on_qtys=[1] NOT [5]
    // -------------------------------------------------------------------------
    test('backend contract: item qty=5, addon qty=1 per unit → add_on_qtys=[1] NOT [5]', () => {
      const item = createMockCartItem({
        name: 'Aloo Patties',
        qty: 5,
        selectedAddons: [
          { id: 101, name: 'Pack', price: 10, quantity: 1 },
        ],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // BUG-168 B1 revert: add_on_qtys should be [1] (per-unit, NOT multiplied)
      // Backend multiplies by item qty on its side
      expect(payload.cart[0].add_on_qtys).toEqual([1]);
    });

    // -------------------------------------------------------------------------
    // Test 2: add_on_qtys with qty=1 (baseline - unchanged)
    // -------------------------------------------------------------------------
    test('add_on_qtys equals original addonQtys when item qty=1', () => {
      const item = createMockCartItem({
        qty: 1,
        selectedAddons: [
          { id: 1, name: 'Cheese', price: 20, quantity: 1 },
        ],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // add_on_qtys should be [1] (per-unit)
      expect(payload.cart[0].add_on_qtys).toEqual([1]);
    });

    // -------------------------------------------------------------------------
    // Test 3: Multiple addons with item qty > 1 - per-unit qtys preserved
    // e.g., addon1 qty=1, addon2 qty=2, item qty=3 → add_on_qtys=[1,2] NOT [3,6]
    // -------------------------------------------------------------------------
    test('multiple addons preserve per-unit qtys (NOT multiplied by item qty)', () => {
      const item = createMockCartItem({
        qty: 3,
        selectedAddons: [
          { id: 1, name: 'Cheese', price: 20, quantity: 1 },
          { id: 2, name: 'Bacon', price: 30, quantity: 2 },
        ],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // add_on_qtys should be [1, 2] (per-unit, NOT [3, 6])
      expect(payload.cart[0].add_on_qtys).toEqual([1, 2]);
    });

    // -------------------------------------------------------------------------
    // Test 4: No addons - add_on_qtys should be empty array
    // -------------------------------------------------------------------------
    test('add_on_qtys is empty array when no addons', () => {
      const item = createMockCartItem({
        qty: 5,
        selectedAddons: [],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      expect(payload.cart[0].add_on_qtys).toEqual([]);
    });

    // -------------------------------------------------------------------------
    // Test 5: Addon with qty > 1 per item - per-unit preserved
    // -------------------------------------------------------------------------
    test('addon qty > 1 per item is preserved (NOT multiplied)', () => {
      const item = createMockCartItem({
        qty: 2,
        selectedAddons: [
          { id: 1, name: 'Extra Cheese', price: 10, quantity: 3 }, // 3 cheese per item
        ],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // add_on_qtys should be [3] (per-unit, NOT [6])
      expect(payload.cart[0].add_on_qtys).toEqual([3]);
    });

    // -------------------------------------------------------------------------
    // Test 6: Missing item qty defaults to 1 - no effect on per-unit addon qty
    // -------------------------------------------------------------------------
    test('missing item qty defaults to 1 - addon qty unchanged', () => {
      const item = createMockCartItem({
        qty: undefined, // Missing qty
        selectedAddons: [
          { id: 1, name: 'Cheese', price: 20, quantity: 2 },
        ],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // add_on_qtys should be [2] (per-unit)
      expect(payload.cart[0].add_on_qtys).toEqual([2]);
    });

    // -------------------------------------------------------------------------
    // Test 7: Missing addon quantity defaults to 1
    // -------------------------------------------------------------------------
    test('missing addon quantity defaults to 1', () => {
      const item = createMockCartItem({
        qty: 3,
        selectedAddons: [
          { id: 1, name: 'Cheese', price: 20 }, // No quantity field
        ],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // Addon qty defaults to 1, add_on_qtys = [1] (per-unit)
      expect(payload.cart[0].add_on_qtys).toEqual([1]);
    });

    // -------------------------------------------------------------------------
    // Test 8: Addon using 'qty' field instead of 'quantity'
    // -------------------------------------------------------------------------
    test('addon using qty field instead of quantity', () => {
      const item = createMockCartItem({
        qty: 2,
        selectedAddons: [
          { id: 1, name: 'Cheese', price: 20, qty: 2 }, // Using 'qty' not 'quantity'
        ],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // add_on_qtys should be [2] (per-unit, NOT [4])
      expect(payload.cart[0].add_on_qtys).toEqual([2]);
    });

    // -------------------------------------------------------------------------
    // Test 9: Large quantities - per-unit preserved
    // -------------------------------------------------------------------------
    test('handles large quantities correctly - per-unit preserved', () => {
      const item = createMockCartItem({
        qty: 10,
        selectedAddons: [
          { id: 1, name: 'Addon1', price: 5, quantity: 5 },
          { id: 2, name: 'Addon2', price: 10, quantity: 3 },
        ],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // add_on_qtys should be [5, 3] (per-unit, NOT [50, 30])
      expect(payload.cart[0].add_on_qtys).toEqual([5, 3]);
    });
  });

  // ===========================================================================
  // Regression Tests: BUG-166 (addon_amount) and BUG-VQTY (variation_amount)
  // These should STILL be multiplied by item qty (total price)
  // ===========================================================================

  describe('Regression: BUG-166 addon_amount and BUG-VQTY variation_amount KEPT', () => {
    
    // -------------------------------------------------------------------------
    // Test 10: addon_amount STILL correctly multiplied (BUG-166 KEPT)
    // -------------------------------------------------------------------------
    test('addon_amount is STILL multiplied by item qty (BUG-166 KEPT)', () => {
      const item = createMockCartItem({
        qty: 3,
        selectedAddons: [
          { id: 1, name: 'Pack', price: 10, quantity: 1 },
        ],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // addon_amount should be 30 (10 × 1 addon qty × 3 item qty) - TOTAL price
      expect(payload.cart[0].addon_amount).toBe(30);
      
      // But add_on_qtys should be [1] (per-unit)
      expect(payload.cart[0].add_on_qtys).toEqual([1]);
    });

    // -------------------------------------------------------------------------
    // Test 11: variation_amount STILL correctly multiplied (BUG-VQTY KEPT)
    // -------------------------------------------------------------------------
    test('variation_amount is STILL multiplied by item qty (BUG-VQTY KEPT)', () => {
      const item = createMockCartItem({
        qty: 3,
        selectedVariants: {
          'group1': { id: 1, name: 'Large', price: 50, groupName: 'Size' },
        },
        variantGroups: [{ id: 'group1', name: 'Size' }],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // variation_amount should be 150 (50 × 3 item qty) - TOTAL price
      expect(payload.cart[0].variation_amount).toBe(150);
    });

    // -------------------------------------------------------------------------
    // Test 12: All three fields correct together - qty vs price distinction
    // -------------------------------------------------------------------------
    test('add_on_qtys (per-unit), addon_amount (total), variation_amount (total) all correct', () => {
      const item = createMockCartItem({
        qty: 2,
        selectedAddons: [
          { id: 1, name: 'Cheese', price: 20, quantity: 1 },
          { id: 2, name: 'Bacon', price: 30, quantity: 2 },
        ],
        selectedVariants: {
          'group1': { id: 1, name: 'Large', price: 50, groupName: 'Size' },
        },
        variantGroups: [{ id: 'group1', name: 'Size' }],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // add_on_qtys: [1, 2] (per-unit, NOT multiplied)
      expect(payload.cart[0].add_on_qtys).toEqual([1, 2]);
      
      // addon_amount: (20×1 + 30×2) × 2 = 80 × 2 = 160 (TOTAL price)
      expect(payload.cart[0].addon_amount).toBe(160);
      
      // variation_amount: 50 × 2 = 100 (TOTAL price)
      expect(payload.cart[0].variation_amount).toBe(100);
    });
  });

  // ===========================================================================
  // Update Order Tests (toAPI.updateOrder)
  // ===========================================================================

  describe('buildCartItem via toAPI.updateOrder', () => {
    
    // -------------------------------------------------------------------------
    // Test 13: add_on_qtys per-unit in update-order payload
    // -------------------------------------------------------------------------
    test('add_on_qtys is per-unit (NOT multiplied) in update-order', () => {
      const newItem = createMockCartItem({
        qty: 3,
        selectedAddons: [
          { id: 1, name: 'Pack', price: 10, quantity: 1 },
        ],
        placed: false,
      });
      
      const payload = toAPI.updateOrder(
        createMockTable(),
        [newItem],
        null,
        'dineIn',
        { allCartItems: [newItem] }
      );
      
      // add_on_qtys should be [1] in cart-update (per-unit)
      expect(payload['cart-update'][0].add_on_qtys).toEqual([1]);
      
      // addon_amount should be 30 (TOTAL price)
      expect(payload['cart-update'][0].addon_amount).toBe(30);
    });
  });

  // ===========================================================================
  // Place Order With Payment Tests (toAPI.placeOrderWithPayment)
  // ===========================================================================

  describe('buildCartItem via toAPI.placeOrderWithPayment', () => {
    
    // -------------------------------------------------------------------------
    // Test 14: add_on_qtys per-unit in prepaid order payload
    // -------------------------------------------------------------------------
    test('add_on_qtys is per-unit (NOT multiplied) in prepaid order', () => {
      const item = createMockCartItem({
        qty: 3,
        selectedAddons: [
          { id: 1, name: 'Pack', price: 10, quantity: 1 },
        ],
      });
      
      const paymentData = {
        method: 'cash',
        tip: 0,
        deliveryCharge: 0,
        discounts: { total: 0 },
      };
      
      const payload = toAPI.placeOrderWithPayment(
        createMockTable(),
        [item],
        null,
        'dineIn',
        paymentData,
        { restaurantId: 1 }
      );
      
      // add_on_qtys should be [1] (per-unit)
      expect(payload.cart[0].add_on_qtys).toEqual([1]);
      
      // addon_amount should be 30 (TOTAL price)
      expect(payload.cart[0].addon_amount).toBe(30);
    });
  });
});
