/**
 * BUG-166 Test Suite: addon_amount Quantity Multiplication Fix
 * 
 * Tests that addon_amount is correctly multiplied by item quantity in:
 * - buildCartItem (place-order payload builder) - Line 704
 * - collectBillExisting (collect-bill payload builder) - Line 1493
 * 
 * Also includes regression tests for BUG-VQTY (variation_amount fix)
 */

// We need to test the internal buildCartItem function
// Since it's not exported, we'll test via the exported toAPI functions

import { toAPI } from '../../../api/transforms/orderTransform';

// =============================================================================
// Test Helpers: Create mock items with addons and variations
// =============================================================================

const createMockCartItem = (overrides = {}) => ({
  id: 123,
  foodId: 123,
  name: 'Test Item',
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
// Test Suite: BUG-166 - addon_amount × qty
// =============================================================================

describe('BUG-166: addon_amount Quantity Multiplication', () => {
  
  describe('buildCartItem via toAPI.placeOrder', () => {
    
    // -------------------------------------------------------------------------
    // Test 1: addon_amount with qty=1 (baseline - no change expected)
    // -------------------------------------------------------------------------
    test('addon_amount equals addonAmount when qty=1', () => {
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
      
      // addon_amount should be 20 (20 × 1 addon qty × 1 item qty)
      expect(payload.cart[0].addon_amount).toBe(20);
    });

    // -------------------------------------------------------------------------
    // Test 2: addon_amount with qty=3 (BUG-166 fix verification)
    // -------------------------------------------------------------------------
    test('addon_amount is multiplied by item qty when qty > 1', () => {
      const item = createMockCartItem({
        qty: 3,
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
      
      // addon_amount should be 60 (20 × 1 addon qty × 3 item qty)
      // Before BUG-166 fix, this would incorrectly be 20
      expect(payload.cart[0].addon_amount).toBe(60);
    });

    // -------------------------------------------------------------------------
    // Test 3: Multiple addons with qty > 1
    // -------------------------------------------------------------------------
    test('addon_amount handles multiple addons with qty > 1', () => {
      const item = createMockCartItem({
        qty: 2,
        selectedAddons: [
          { id: 1, name: 'Cheese', price: 20, quantity: 1 },
          { id: 2, name: 'Bacon', price: 30, quantity: 2 }, // 2 bacon per item
        ],
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // Per-unit addon total: (20 × 1) + (30 × 2) = 80
      // Total addon_amount: 80 × 2 item qty = 160
      expect(payload.cart[0].addon_amount).toBe(160);
    });

    // -------------------------------------------------------------------------
    // Test 4: No addons - addon_amount should be 0
    // -------------------------------------------------------------------------
    test('addon_amount is 0 when no addons', () => {
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
      
      expect(payload.cart[0].addon_amount).toBe(0);
    });

    // -------------------------------------------------------------------------
    // Test 5: Runtime complementary items - addon_amount should be 0
    // -------------------------------------------------------------------------
    test('addon_amount is 0 for runtime complementary items', () => {
      const item = createMockCartItem({
        qty: 3,
        selectedAddons: [
          { id: 1, name: 'Cheese', price: 20, quantity: 1 },
        ],
        isComplementaryRuntime: true,
      });
      
      const payload = toAPI.placeOrder(
        createMockTable(),
        [item],
        null,
        'dineIn',
        { restaurantId: 1 }
      );
      
      // Complementary items should have addon_amount = 0
      expect(payload.cart[0].addon_amount).toBe(0);
    });
  });

  // ===========================================================================
  // BUG-VQTY Regression: variation_amount × qty
  // ===========================================================================

  describe('BUG-VQTY Regression: variation_amount × qty', () => {
    
    // -------------------------------------------------------------------------
    // Test 6: variation_amount with qty=1 (baseline)
    // -------------------------------------------------------------------------
    test('variation_amount equals variationAmount when qty=1', () => {
      const item = createMockCartItem({
        qty: 1,
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
      
      expect(payload.cart[0].variation_amount).toBe(50);
    });

    // -------------------------------------------------------------------------
    // Test 7: variation_amount with qty > 1 (BUG-VQTY fix verification)
    // -------------------------------------------------------------------------
    test('variation_amount is multiplied by item qty when qty > 1', () => {
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
      
      // variation_amount should be 150 (50 × 3 item qty)
      expect(payload.cart[0].variation_amount).toBe(150);
    });

    // -------------------------------------------------------------------------
    // Test 8: Both addons and variations with qty > 1
    // -------------------------------------------------------------------------
    test('both addon_amount and variation_amount are multiplied by qty', () => {
      const item = createMockCartItem({
        qty: 2,
        selectedAddons: [
          { id: 1, name: 'Cheese', price: 20, quantity: 1 },
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
      
      // addon_amount: 20 × 2 = 40
      // variation_amount: 50 × 2 = 100
      expect(payload.cart[0].addon_amount).toBe(40);
      expect(payload.cart[0].variation_amount).toBe(100);
    });
  });

  // ===========================================================================
  // collectBillExisting tests (Line 1493)
  // ===========================================================================

  describe('collectBillExisting via toAPI.collectBillExisting', () => {
    
    // -------------------------------------------------------------------------
    // Test 9: Verify collectBillExisting payload structure includes addon_amount × qty
    // -------------------------------------------------------------------------
    test('collectBillExisting food_detail includes addon_amount multiplied by qty', () => {
      // Create a placed item (simulating an existing order)
      const placedItem = {
        id: 1900232,
        foodId: 123,
        name: 'Test Item',
        price: 100,
        unitPrice: 100,
        qty: 3,
        status: 'served',
        tax: {
          percentage: 5,
          type: 'GST',
          calculation: 'Exclusive',
          isInclusive: false,
        },
        addOns: [
          { id: 1, name: 'Cheese', price: 20, quantity: 1 },
        ],
        variation: [],
        isComplementary: false,
        isComplementaryRuntime: false,
        giveDiscount: true,
        placed: true,
      };

      const table = createMockTable();
      const paymentData = {
        method: 'cash',
        tip: 0,
        deliveryCharge: 0,
        discounts: { total: 0 },
      };

      const payload = toAPI.collectBillExisting(
        table,
        [placedItem],
        null,
        paymentData,
        { restaurantId: 1, serviceChargePercentage: 0 }
      );

      // Find the food_detail entry for our item
      const foodDetail = payload.food_detail.find(fd => fd.food_id === 123);
      
      // addon_amount should be 60 (20 × 1 addon qty × 3 item qty)
      expect(foodDetail.addon_amount).toBe(60);
    });

    // -------------------------------------------------------------------------
    // Test 10: collectBillExisting with runtime complementary - addon_amount = 0
    // -------------------------------------------------------------------------
    test('collectBillExisting food_detail has addon_amount=0 for runtime complementary', () => {
      const placedItem = {
        id: 1900232,
        foodId: 123,
        name: 'Test Item',
        price: 100,
        unitPrice: 100,
        qty: 3,
        status: 'served',
        tax: {
          percentage: 5,
          type: 'GST',
          calculation: 'Exclusive',
          isInclusive: false,
        },
        addOns: [
          { id: 1, name: 'Cheese', price: 20, quantity: 1 },
        ],
        variation: [],
        isComplementary: false,
        isComplementaryRuntime: true, // Runtime complementary
        giveDiscount: true,
        placed: true,
      };

      const table = createMockTable();
      const paymentData = {
        method: 'cash',
        tip: 0,
        deliveryCharge: 0,
        discounts: { total: 0 },
      };

      const payload = toAPI.collectBillExisting(
        table,
        [placedItem],
        null,
        paymentData,
        { restaurantId: 1, serviceChargePercentage: 0 }
      );

      const foodDetail = payload.food_detail.find(fd => fd.food_id === 123);
      
      // Complementary items should have addon_amount = 0
      expect(foodDetail.addon_amount).toBe(0);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  
  test('handles decimal addon prices correctly', () => {
    const item = createMockCartItem({
      qty: 3,
      selectedAddons: [
        { id: 1, name: 'Extra Sauce', price: 15.50, quantity: 1 },
      ],
    });
    
    const payload = toAPI.placeOrder(
      createMockTable(),
      [item],
      null,
      'dineIn',
      { restaurantId: 1 }
    );
    
    // 15.50 × 3 = 46.50
    expect(payload.cart[0].addon_amount).toBe(46.5);
  });

  test('handles addon with qty > 1 per item correctly', () => {
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
    
    // Per-unit addon: 10 × 3 = 30
    // Total: 30 × 2 item qty = 60
    expect(payload.cart[0].addon_amount).toBe(60);
  });

  test('handles missing qty (defaults to 1)', () => {
    const item = createMockCartItem({
      qty: undefined, // Missing qty
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
    
    // Should default to qty=1, so addon_amount = 20
    expect(payload.cart[0].addon_amount).toBe(20);
  });
});
