/**
 * Test Suite: Cancel Item Payload Fixes
 * 
 * Tests for BUG-106: Cancel item payload issues
 * - cancel_type should be 'Pre-Serve' or 'Post-Serve' (not 'full'/'partial')
 * - order_food_id should be item.foodId (food catalog ID)
 * - item_id should be present in partial cancel
 */

import { toAPI } from '../../../api/transforms/orderTransform';

// =============================================================================
// Test Data
// =============================================================================

const createMockTable = (overrides = {}) => ({
  orderId: 730154,
  id: 5,
  displayName: 'Table 5',
  ...overrides,
});

const createMockItem = (overrides = {}) => ({
  id: 1900357,           // Order detail line ID (orderDetails[].id)
  foodId: 96557,         // Food catalog ID (food_details.id)
  name: 'Beer',
  qty: 2,
  price: 150,
  status: 'preparing',   // Default to preparing
  placed: true,
  ...overrides,
});

const createMockReason = (overrides = {}) => ({
  reasonId: 2,
  reasonText: 'Customer request',
  ...overrides,
});

// =============================================================================
// Test Suite: cancelItemFull
// =============================================================================

describe('BUG-106: cancelItemFull payload fixes', () => {
  
  const table = createMockTable();
  const reason = createMockReason();

  describe('cancel_type field', () => {
    
    test('should send cancel_type "Pre-Serve" when item.status is "preparing"', () => {
      const item = createMockItem({ status: 'preparing' });
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload.cancel_type).toBe('Pre-Serve');
    });

    test('should send cancel_type "Post-Serve" when item.status is "ready"', () => {
      const item = createMockItem({ status: 'ready' });
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload.cancel_type).toBe('Post-Serve');
    });

    test('should send cancel_type "Post-Serve" when item.status is "served"', () => {
      const item = createMockItem({ status: 'served' });
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload.cancel_type).toBe('Post-Serve');
    });

    test('should send cancel_type "Post-Serve" when item.status is "running"', () => {
      const item = createMockItem({ status: 'running' });
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload.cancel_type).toBe('Post-Serve');
    });

    test('should NOT send cancel_type "full"', () => {
      const item = createMockItem({ status: 'preparing' });
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload.cancel_type).not.toBe('full');
    });
  });

  describe('other required fields', () => {
    
    test('should send order_id from table.orderId', () => {
      const item = createMockItem();
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload.order_id).toBe(730154);
    });

    test('should send item_id as item.id (order detail line ID)', () => {
      const item = createMockItem({ id: 1900357 });
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload.item_id).toBe(1900357);
    });

    test('should send order_food_id as item.foodId (food catalog ID)', () => {
      const item = createMockItem({ foodId: 96557 });
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload.order_food_id).toBe(96557);
    });

    test('should send order_status as "cancelled"', () => {
      const item = createMockItem();
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload.order_status).toBe('cancelled');
    });

    test('should send reason_type from reason.reasonId', () => {
      const item = createMockItem();
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload.reason_type).toBe(2);
    });

    test('should send reason from reason.reasonText', () => {
      const item = createMockItem();
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload.reason).toBe('Customer request');
    });
  });

  describe('complete payload structure', () => {
    
    test('should match expected payload for Pre-Serve cancel', () => {
      const item = createMockItem({ 
        id: 1900357, 
        foodId: 96557, 
        status: 'preparing' 
      });
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload).toEqual({
        order_id: 730154,
        item_id: 1900357,
        order_food_id: 96557,
        order_status: 'cancelled',
        reason_type: 2,
        reason: 'Customer request',
        cancel_type: 'Pre-Serve',
      });
    });

    test('should match expected payload for Post-Serve cancel', () => {
      const item = createMockItem({ 
        id: 1900357, 
        foodId: 96557, 
        status: 'served' 
      });
      
      const payload = toAPI.cancelItemFull(table, item, reason);
      
      expect(payload).toEqual({
        order_id: 730154,
        item_id: 1900357,
        order_food_id: 96557,
        order_status: 'cancelled',
        reason_type: 2,
        reason: 'Customer request',
        cancel_type: 'Post-Serve',
      });
    });
  });
});

// =============================================================================
// Test Suite: cancelItemPartial
// =============================================================================

describe('BUG-106: cancelItemPartial payload fixes', () => {
  
  const table = createMockTable();
  const reason = createMockReason();
  const cancelQty = 1;

  describe('cancel_type field', () => {
    
    test('should send cancel_type "Pre-Serve" when item.status is "preparing"', () => {
      const item = createMockItem({ status: 'preparing' });
      
      const payload = toAPI.cancelItemPartial(table, item, reason, cancelQty);
      
      expect(payload.cancel_type).toBe('Pre-Serve');
    });

    test('should send cancel_type "Post-Serve" when item.status is "ready"', () => {
      const item = createMockItem({ status: 'ready' });
      
      const payload = toAPI.cancelItemPartial(table, item, reason, cancelQty);
      
      expect(payload.cancel_type).toBe('Post-Serve');
    });

    test('should send cancel_type "Post-Serve" when item.status is "served"', () => {
      const item = createMockItem({ status: 'served' });
      
      const payload = toAPI.cancelItemPartial(table, item, reason, cancelQty);
      
      expect(payload.cancel_type).toBe('Post-Serve');
    });

    test('should NOT send cancel_type "partial"', () => {
      const item = createMockItem({ status: 'preparing' });
      
      const payload = toAPI.cancelItemPartial(table, item, reason, cancelQty);
      
      expect(payload.cancel_type).not.toBe('partial');
    });
  });

  describe('order_food_id and item_id fields', () => {
    
    test('should send order_food_id as item.foodId (food catalog ID), NOT item.id', () => {
      const item = createMockItem({ id: 1900357, foodId: 96557 });
      
      const payload = toAPI.cancelItemPartial(table, item, reason, cancelQty);
      
      expect(payload.order_food_id).toBe(96557);
      expect(payload.order_food_id).not.toBe(1900357);
    });

    test('should include item_id field with item.id value', () => {
      const item = createMockItem({ id: 1900357 });
      
      const payload = toAPI.cancelItemPartial(table, item, reason, cancelQty);
      
      expect(payload.item_id).toBe(1900357);
      expect(payload).toHaveProperty('item_id');
    });
  });

  describe('cancel_qty field (partial cancel specific)', () => {
    
    test('should include cancel_qty field', () => {
      const item = createMockItem();
      
      const payload = toAPI.cancelItemPartial(table, item, reason, 1);
      
      expect(payload).toHaveProperty('cancel_qty');
      expect(payload.cancel_qty).toBe(1);
    });

    test('should send correct cancel_qty value', () => {
      const item = createMockItem();
      
      const payload = toAPI.cancelItemPartial(table, item, reason, 3);
      
      expect(payload.cancel_qty).toBe(3);
    });
  });

  describe('other required fields', () => {
    
    test('should send order_id from table.orderId', () => {
      const item = createMockItem();
      
      const payload = toAPI.cancelItemPartial(table, item, reason, cancelQty);
      
      expect(payload.order_id).toBe(730154);
    });

    test('should send order_status as "cancelled"', () => {
      const item = createMockItem();
      
      const payload = toAPI.cancelItemPartial(table, item, reason, cancelQty);
      
      expect(payload.order_status).toBe('cancelled');
    });

    test('should send reason_type from reason.reasonId', () => {
      const item = createMockItem();
      
      const payload = toAPI.cancelItemPartial(table, item, reason, cancelQty);
      
      expect(payload.reason_type).toBe(2);
    });

    test('should send reason from reason.reasonText', () => {
      const item = createMockItem();
      
      const payload = toAPI.cancelItemPartial(table, item, reason, cancelQty);
      
      expect(payload.reason).toBe('Customer request');
    });
  });

  describe('complete payload structure', () => {
    
    test('should match expected payload for Pre-Serve partial cancel', () => {
      const item = createMockItem({ 
        id: 1900357, 
        foodId: 96557, 
        status: 'preparing' 
      });
      
      const payload = toAPI.cancelItemPartial(table, item, reason, 1);
      
      expect(payload).toEqual({
        order_id: 730154,
        item_id: 1900357,
        order_food_id: 96557,
        cancel_qty: 1,
        order_status: 'cancelled',
        reason_type: 2,
        reason: 'Customer request',
        cancel_type: 'Pre-Serve',
      });
    });

    test('should match expected payload for Post-Serve partial cancel', () => {
      const item = createMockItem({ 
        id: 1900357, 
        foodId: 96557, 
        status: 'served' 
      });
      
      const payload = toAPI.cancelItemPartial(table, item, reason, 2);
      
      expect(payload).toEqual({
        order_id: 730154,
        item_id: 1900357,
        order_food_id: 96557,
        cancel_qty: 2,
        order_status: 'cancelled',
        reason_type: 2,
        reason: 'Customer request',
        cancel_type: 'Post-Serve',
      });
    });
  });
});

// =============================================================================
// Test Suite: Consistency between cancelItemFull and cancelItemPartial
// =============================================================================

describe('BUG-106: Consistency between full and partial cancel', () => {
  
  const table = createMockTable();
  const reason = createMockReason();
  const item = createMockItem({ id: 1900357, foodId: 96557, status: 'ready' });

  test('both should send same order_food_id (item.foodId)', () => {
    const fullPayload = toAPI.cancelItemFull(table, item, reason);
    const partialPayload = toAPI.cancelItemPartial(table, item, reason, 1);
    
    expect(fullPayload.order_food_id).toBe(partialPayload.order_food_id);
    expect(fullPayload.order_food_id).toBe(96557);
  });

  test('both should send same item_id (item.id)', () => {
    const fullPayload = toAPI.cancelItemFull(table, item, reason);
    const partialPayload = toAPI.cancelItemPartial(table, item, reason, 1);
    
    expect(fullPayload.item_id).toBe(partialPayload.item_id);
    expect(fullPayload.item_id).toBe(1900357);
  });

  test('both should send same cancel_type for same item status', () => {
    const fullPayload = toAPI.cancelItemFull(table, item, reason);
    const partialPayload = toAPI.cancelItemPartial(table, item, reason, 1);
    
    expect(fullPayload.cancel_type).toBe(partialPayload.cancel_type);
    expect(fullPayload.cancel_type).toBe('Post-Serve');
  });

  test('only partial should have cancel_qty field', () => {
    const fullPayload = toAPI.cancelItemFull(table, item, reason);
    const partialPayload = toAPI.cancelItemPartial(table, item, reason, 1);
    
    expect(fullPayload).not.toHaveProperty('cancel_qty');
    expect(partialPayload).toHaveProperty('cancel_qty');
  });
});
