/**
 * Phase 1 Test Suite: orderTransform.js - Financial Fields Mapping
 * 
 * Tests for new API fields:
 * - order_sub_total_without_tax → subtotalBeforeTax
 * - order_sub_total_amount → subtotalAmount
 * - total_service_tax_amount → serviceTax
 * - tip_amount → tipAmount
 * - tip_tax_amount → tipTaxAmount
 * - item_type → itemType (in orderItem)
 */

import { fromAPI } from '../../../api/transforms/orderTransform';

// =============================================================================
// Test Data: Mock API Response
// =============================================================================

const createMockOrderResponse = (overrides = {}) => ({
  id: 730176,
  restaurant_order_id: 'ORD-001',
  order_type: 'dinein',
  f_order_status: 8,
  order_status: 'queue',
  table_id: 5,
  user_name: 'Test User',
  created_at: '2026-04-03T10:00:00Z',
  updated_at: '2026-04-03T10:30:00Z',
  payment_status: 'unpaid',
  payment_method: 'cash_on_delivery',
  
  // Financial fields (existing)
  order_amount: 100,
  
  // Financial fields (NEW - Phase 1)
  order_sub_total_without_tax: 85,
  order_sub_total_amount: 90,
  total_service_tax_amount: '10.00',
  tip_amount: '5.00',
  tip_tax_amount: '0.50',
  
  // Other fields
  delivery_charge: 0,
  order_note: '',
  print_kot: 'Yes',
  print_bill_status: 'No',
  
  ...overrides,
});

const createMockOrderItem = (overrides = {}) => ({
  id: 1900232,
  food_details: {
    id: 123,
    name: 'Test Item',
    price: 85,
    tax: 5,
    tax_type: 'GST',
    tax_calc: 'Exclusive',
    veg: 1,
  },
  quantity: 1,
  price: 85,
  unit_price: '85.00',
  food_status: 1,
  station: 'KDS',
  item_type: 'BAR',  // NEW field
  variation: [],
  add_ons: [],
  food_level_notes: '',
  ready_at: null,
  serve_at: null,
  cancel_at: null,
  created_at: '2026-04-03T10:00:00Z',
  
  ...overrides,
});

// =============================================================================
// Test Suite: fromAPI.order() - Financial Fields
// =============================================================================

describe('Phase 1: orderTransform - Financial Fields', () => {
  
  describe('fromAPI.order() - New Financial Fields', () => {
    
    // -------------------------------------------------------------------------
    // Test 1: Map subtotalBeforeTax
    // -------------------------------------------------------------------------
    test('should map order_sub_total_without_tax to subtotalBeforeTax', () => {
      const apiResponse = createMockOrderResponse({
        order_sub_total_without_tax: 85,
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.subtotalBeforeTax).toBe(85);
    });

    // -------------------------------------------------------------------------
    // Test 2: Map subtotalAmount
    // -------------------------------------------------------------------------
    test('should map order_sub_total_amount to subtotalAmount', () => {
      const apiResponse = createMockOrderResponse({
        order_sub_total_amount: 90,
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.subtotalAmount).toBe(90);
    });

    // -------------------------------------------------------------------------
    // Test 3: Map serviceTax (string to number)
    // -------------------------------------------------------------------------
    test('should map total_service_tax_amount to serviceTax as number', () => {
      const apiResponse = createMockOrderResponse({
        total_service_tax_amount: '10.00',
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.serviceTax).toBe(10);
      expect(typeof result.serviceTax).toBe('number');
    });

    // -------------------------------------------------------------------------
    // Test 4: Map tipAmount (string to number)
    // -------------------------------------------------------------------------
    test('should map tip_amount to tipAmount as number', () => {
      const apiResponse = createMockOrderResponse({
        tip_amount: '5.00',
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.tipAmount).toBe(5);
      expect(typeof result.tipAmount).toBe('number');
    });

    // -------------------------------------------------------------------------
    // Test 5: Map tipTaxAmount (string to number)
    // -------------------------------------------------------------------------
    test('should map tip_tax_amount to tipTaxAmount as number', () => {
      const apiResponse = createMockOrderResponse({
        tip_tax_amount: '0.50',
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.tipTaxAmount).toBe(0.5);
      expect(typeof result.tipTaxAmount).toBe('number');
    });

    // -------------------------------------------------------------------------
    // Test 6: Fallback subtotalBeforeTax to order_amount when missing
    // -------------------------------------------------------------------------
    test('should fallback subtotalBeforeTax to order_amount when order_sub_total_without_tax is missing', () => {
      const apiResponse = createMockOrderResponse({
        order_amount: 100,
        order_sub_total_without_tax: undefined,
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.subtotalBeforeTax).toBe(100);
    });

    // -------------------------------------------------------------------------
    // Test 7: Fallback subtotalAmount to order_amount when missing
    // -------------------------------------------------------------------------
    test('should fallback subtotalAmount to order_amount when order_sub_total_amount is missing', () => {
      const apiResponse = createMockOrderResponse({
        order_amount: 100,
        order_sub_total_amount: undefined,
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.subtotalAmount).toBe(100);
    });

    // -------------------------------------------------------------------------
    // Test 8: Handle zero serviceTax
    // -------------------------------------------------------------------------
    test('should handle zero serviceTax correctly', () => {
      const apiResponse = createMockOrderResponse({
        total_service_tax_amount: '0.00',
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.serviceTax).toBe(0);
    });

    // -------------------------------------------------------------------------
    // Test 9: Handle missing tip fields (default to 0)
    // -------------------------------------------------------------------------
    test('should default tipAmount to 0 when tip_amount is missing', () => {
      const apiResponse = createMockOrderResponse({
        tip_amount: undefined,
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.tipAmount).toBe(0);
    });

    // -------------------------------------------------------------------------
    // Test 10: Handle missing tipTaxAmount (default to 0)
    // -------------------------------------------------------------------------
    test('should default tipTaxAmount to 0 when tip_tax_amount is missing', () => {
      const apiResponse = createMockOrderResponse({
        tip_tax_amount: undefined,
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.tipTaxAmount).toBe(0);
    });

    // -------------------------------------------------------------------------
    // Test 11: Existing amount field still works
    // -------------------------------------------------------------------------
    test('should still map order_amount to amount (backward compatibility)', () => {
      const apiResponse = createMockOrderResponse({
        order_amount: 100,
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.amount).toBe(100);
    });

    // -------------------------------------------------------------------------
    // Test 12: Handle null values gracefully
    // -------------------------------------------------------------------------
    test('should handle null values for financial fields', () => {
      const apiResponse = createMockOrderResponse({
        order_sub_total_without_tax: null,
        total_service_tax_amount: null,
        tip_amount: null,
        tip_tax_amount: null,
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.subtotalBeforeTax).toBe(100); // fallback to order_amount
      expect(result.serviceTax).toBe(0);
      expect(result.tipAmount).toBe(0);
      expect(result.tipTaxAmount).toBe(0);
    });

    // -------------------------------------------------------------------------
    // Test 13: Handle numeric values (not just strings)
    // -------------------------------------------------------------------------
    test('should handle numeric values for tax/tip fields', () => {
      const apiResponse = createMockOrderResponse({
        total_service_tax_amount: 15,
        tip_amount: 10,
        tip_tax_amount: 1,
      });
      
      const result = fromAPI.order(apiResponse);
      
      expect(result.serviceTax).toBe(15);
      expect(result.tipAmount).toBe(10);
      expect(result.tipTaxAmount).toBe(1);
    });
  });

  // ===========================================================================
  // Test Suite: fromAPI.orderItem() - itemType Field
  // ===========================================================================

  describe('fromAPI.orderItem() - itemType Field', () => {
    
    // -------------------------------------------------------------------------
    // Test 14: Map item_type to itemType
    // -------------------------------------------------------------------------
    test('should map item_type to itemType', () => {
      const apiItem = createMockOrderItem({
        item_type: 'BAR',
      });
      
      const result = fromAPI.orderItem(apiItem);
      
      expect(result.itemType).toBe('BAR');
    });

    // -------------------------------------------------------------------------
    // Test 15: Handle missing item_type (default to null)
    // -------------------------------------------------------------------------
    test('should default itemType to null when item_type is missing', () => {
      const apiItem = createMockOrderItem({
        item_type: undefined,
      });
      
      const result = fromAPI.orderItem(apiItem);
      
      expect(result.itemType).toBeNull();
    });

    // -------------------------------------------------------------------------
    // Test 16: Handle KDS item_type
    // -------------------------------------------------------------------------
    test('should map KDS item_type correctly', () => {
      const apiItem = createMockOrderItem({
        item_type: 'KDS',
      });
      
      const result = fromAPI.orderItem(apiItem);
      
      expect(result.itemType).toBe('KDS');
    });

    // -------------------------------------------------------------------------
    // Test 17: Existing station field still works
    // -------------------------------------------------------------------------
    test('should still map station field (backward compatibility)', () => {
      const apiItem = createMockOrderItem({
        station: 'BAR',
        item_type: 'BAR',
      });
      
      const result = fromAPI.orderItem(apiItem);
      
      expect(result.station).toBe('BAR');
      expect(result.itemType).toBe('BAR');
    });
  });

  // ===========================================================================
  // Integration Test: Full Order Transform
  // ===========================================================================

  describe('Integration: Full Order with Items', () => {
    
    // -------------------------------------------------------------------------
    // Test 18: Transform complete order with all new fields
    // -------------------------------------------------------------------------
    test('should transform complete order with all new financial fields', () => {
      const apiResponse = createMockOrderResponse({
        order_amount: 100,
        order_sub_total_without_tax: 85,
        order_sub_total_amount: 90,
        total_service_tax_amount: '10.00',
        tip_amount: '5.00',
        tip_tax_amount: '0.50',
      });
      
      const result = fromAPI.order(apiResponse);
      
      // Verify all financial fields
      expect(result.amount).toBe(100);
      expect(result.subtotalBeforeTax).toBe(85);
      expect(result.subtotalAmount).toBe(90);
      expect(result.serviceTax).toBe(10);
      expect(result.tipAmount).toBe(5);
      expect(result.tipTaxAmount).toBe(0.5);
      
      // Verify existing fields still work
      expect(result.orderId).toBe(730176);
      expect(result.orderNumber).toBe('ORD-001');
      expect(result.paymentStatus).toBe('unpaid');
    });
  });
});
