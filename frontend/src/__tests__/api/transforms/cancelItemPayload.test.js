/**
 * Test Suite: toAPI.cancelItem(...) — unified cancel payload contract
 *
 * HISTORICAL NOTE
 * ---------------
 * Originally written for BUG-106 with a split design (`toAPI.cancelItemFull`
 * + `toAPI.cancelItemPartial`). Production was later unified into a single
 * helper at `src/api/transforms/orderTransform.js:645-654`:
 *
 *   toAPI.cancelItem(currentTable, item, reason, cancelQty)
 *
 * Behaviour preserved exactly: cancel_type is `'Pre-Serve'` for `preparing`
 * items and `'Post-Serve'` otherwise; same `order_id`, `order_food_id`,
 * `item_id`, `cancel_qty`, `order_status`, `reason_type`, `reason` fields.
 * Full cancel == passing `item.qty`; partial cancel == passing partial qty.
 *
 * Two assertions from the original split contract are reversed here, with
 * owner approval (NS-3C-7 T3 Choice 2.A): the unified function ALWAYS
 * emits `cancel_qty` (it is mandatory by the backend contract — for full
 * cancel it equals `item.qty`).
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
// Test Suite: cancelItem (full quantity)
// =============================================================================

describe('BUG-106 (unified): toAPI.cancelItem with full quantity', () => {

  const table = createMockTable();
  const reason = createMockReason();

  describe('cancel_type field', () => {

    test('should send cancel_type "Pre-Serve" when item.status is "preparing"', () => {
      const item = createMockItem({ status: 'preparing' });
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload.cancel_type).toBe('Pre-Serve');
    });

    test('should send cancel_type "Post-Serve" when item.status is "ready"', () => {
      const item = createMockItem({ status: 'ready' });
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload.cancel_type).toBe('Post-Serve');
    });

    test('should send cancel_type "Post-Serve" when item.status is "served"', () => {
      const item = createMockItem({ status: 'served' });
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload.cancel_type).toBe('Post-Serve');
    });

    test('should send cancel_type "Post-Serve" when item.status is "running"', () => {
      const item = createMockItem({ status: 'running' });
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload.cancel_type).toBe('Post-Serve');
    });

    test('should NOT send cancel_type "full" (legacy split-contract value)', () => {
      const item = createMockItem({ status: 'preparing' });
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload.cancel_type).not.toBe('full');
    });
  });

  describe('other required fields', () => {

    test('should send order_id from table.orderId', () => {
      const item = createMockItem();
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload.order_id).toBe(730154);
    });

    test('should send item_id as item.id (order detail line ID)', () => {
      const item = createMockItem({ id: 1900357 });
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload.item_id).toBe(1900357);
    });

    test('should send order_food_id as item.foodId (food catalog ID)', () => {
      const item = createMockItem({ foodId: 96557 });
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload.order_food_id).toBe(96557);
    });

    test('should send order_status as "cancelled"', () => {
      const item = createMockItem();
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload.order_status).toBe('cancelled');
    });

    test('should send reason_type from reason.reasonId', () => {
      const item = createMockItem();
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload.reason_type).toBe(2);
    });

    test('should send reason from reason.reasonText', () => {
      const item = createMockItem();
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload.reason).toBe('Customer request');
    });

    // NS-3C-7 (T3, 2026-05-04): unified contract ALWAYS emits cancel_qty.
    // For full-quantity cancel, it equals item.qty. The original split
    // contract's "fullPayload should not have cancel_qty" assertion has
    // been intentionally reversed per owner approval.
    test('should ALWAYS emit cancel_qty (= item.qty for full cancel)', () => {
      const item = createMockItem({ qty: 2 });
      const payload = toAPI.cancelItem(table, item, reason, item.qty);
      expect(payload).toHaveProperty('cancel_qty');
      expect(payload.cancel_qty).toBe(2);
    });
  });

  describe('complete payload structure', () => {

    test('should match expected payload for Pre-Serve cancel (full qty)', () => {
      const item = createMockItem({
        id: 1900357,
        foodId: 96557,
        qty: 2,
        status: 'preparing',
      });

      const payload = toAPI.cancelItem(table, item, reason, item.qty);

      // NS-3C-7 (T3, 2026-05-04): cancel_qty included per unified contract.
      // CR-POS2-003-REOPEN-A (May-2026): printer_agent additive field; defaults
      // to [] when no options passed (no printerAgents / no allCartItems).
      expect(payload).toEqual({
        order_id: 730154,
        item_id: 1900357,
        order_food_id: 96557,
        cancel_qty: 2,
        order_status: 'cancelled',
        reason_type: 2,
        reason: 'Customer request',
        cancel_type: 'Pre-Serve',
        printer_agent: [],
      });
    });

    test('should match expected payload for Post-Serve cancel (full qty)', () => {
      const item = createMockItem({
        id: 1900357,
        foodId: 96557,
        qty: 2,
        status: 'served',
      });

      const payload = toAPI.cancelItem(table, item, reason, item.qty);

      expect(payload).toEqual({
        order_id: 730154,
        item_id: 1900357,
        order_food_id: 96557,
        cancel_qty: 2,
        order_status: 'cancelled',
        reason_type: 2,
        reason: 'Customer request',
        cancel_type: 'Post-Serve',
        printer_agent: [],
      });
    });
  });
});

// =============================================================================
// Test Suite: cancelItem (partial quantity)
// =============================================================================

describe('BUG-106 (unified): toAPI.cancelItem with partial quantity', () => {

  const table = createMockTable();
  const reason = createMockReason();
  const cancelQty = 1;

  describe('cancel_type field', () => {

    test('should send cancel_type "Pre-Serve" when item.status is "preparing"', () => {
      const item = createMockItem({ status: 'preparing' });
      const payload = toAPI.cancelItem(table, item, reason, cancelQty);
      expect(payload.cancel_type).toBe('Pre-Serve');
    });

    test('should send cancel_type "Post-Serve" when item.status is "ready"', () => {
      const item = createMockItem({ status: 'ready' });
      const payload = toAPI.cancelItem(table, item, reason, cancelQty);
      expect(payload.cancel_type).toBe('Post-Serve');
    });

    test('should send cancel_type "Post-Serve" when item.status is "served"', () => {
      const item = createMockItem({ status: 'served' });
      const payload = toAPI.cancelItem(table, item, reason, cancelQty);
      expect(payload.cancel_type).toBe('Post-Serve');
    });

    test('should NOT send cancel_type "partial" (legacy split-contract value)', () => {
      const item = createMockItem({ status: 'preparing' });
      const payload = toAPI.cancelItem(table, item, reason, cancelQty);
      expect(payload.cancel_type).not.toBe('partial');
    });
  });

  describe('order_food_id and item_id fields', () => {

    test('should send order_food_id as item.foodId (food catalog ID), NOT item.id', () => {
      const item = createMockItem({ id: 1900357, foodId: 96557 });
      const payload = toAPI.cancelItem(table, item, reason, cancelQty);
      expect(payload.order_food_id).toBe(96557);
      expect(payload.order_food_id).not.toBe(1900357);
    });

    test('should include item_id field with item.id value', () => {
      const item = createMockItem({ id: 1900357 });
      const payload = toAPI.cancelItem(table, item, reason, cancelQty);
      expect(payload.item_id).toBe(1900357);
      expect(payload).toHaveProperty('item_id');
    });
  });

  describe('cancel_qty field (partial cancel specific)', () => {

    test('should include cancel_qty field', () => {
      const item = createMockItem();
      const payload = toAPI.cancelItem(table, item, reason, 1);
      expect(payload).toHaveProperty('cancel_qty');
      expect(payload.cancel_qty).toBe(1);
    });

    test('should send correct cancel_qty value', () => {
      const item = createMockItem();
      const payload = toAPI.cancelItem(table, item, reason, 3);
      expect(payload.cancel_qty).toBe(3);
    });
  });

  describe('other required fields', () => {

    test('should send order_id from table.orderId', () => {
      const item = createMockItem();
      const payload = toAPI.cancelItem(table, item, reason, cancelQty);
      expect(payload.order_id).toBe(730154);
    });

    test('should send order_status as "cancelled"', () => {
      const item = createMockItem();
      const payload = toAPI.cancelItem(table, item, reason, cancelQty);
      expect(payload.order_status).toBe('cancelled');
    });

    test('should send reason_type from reason.reasonId', () => {
      const item = createMockItem();
      const payload = toAPI.cancelItem(table, item, reason, cancelQty);
      expect(payload.reason_type).toBe(2);
    });

    test('should send reason from reason.reasonText', () => {
      const item = createMockItem();
      const payload = toAPI.cancelItem(table, item, reason, cancelQty);
      expect(payload.reason).toBe('Customer request');
    });
  });

  describe('complete payload structure', () => {

    test('should match expected payload for Pre-Serve partial cancel', () => {
      const item = createMockItem({
        id: 1900357,
        foodId: 96557,
        status: 'preparing',
      });

      const payload = toAPI.cancelItem(table, item, reason, 1);

      // CR-POS2-003-REOPEN-A (May-2026): printer_agent additive field; defaults to [].
      expect(payload).toEqual({
        order_id: 730154,
        item_id: 1900357,
        order_food_id: 96557,
        cancel_qty: 1,
        order_status: 'cancelled',
        reason_type: 2,
        reason: 'Customer request',
        cancel_type: 'Pre-Serve',
        printer_agent: [],
      });
    });

    test('should match expected payload for Post-Serve partial cancel', () => {
      const item = createMockItem({
        id: 1900357,
        foodId: 96557,
        status: 'served',
      });

      const payload = toAPI.cancelItem(table, item, reason, 2);

      expect(payload).toEqual({
        order_id: 730154,
        item_id: 1900357,
        order_food_id: 96557,
        cancel_qty: 2,
        order_status: 'cancelled',
        reason_type: 2,
        reason: 'Customer request',
        cancel_type: 'Post-Serve',
        printer_agent: [],
      });
    });
  });
});

// =============================================================================
// Test Suite: Consistency between full-qty and partial-qty calls
// =============================================================================

describe('BUG-106 (unified): consistency between full-qty and partial-qty', () => {

  const table = createMockTable();
  const reason = createMockReason();
  const item = createMockItem({ id: 1900357, foodId: 96557, qty: 2, status: 'ready' });

  test('both should send same order_food_id (item.foodId)', () => {
    const fullPayload = toAPI.cancelItem(table, item, reason, item.qty);
    const partialPayload = toAPI.cancelItem(table, item, reason, 1);

    expect(fullPayload.order_food_id).toBe(partialPayload.order_food_id);
    expect(fullPayload.order_food_id).toBe(96557);
  });

  test('both should send same item_id (item.id)', () => {
    const fullPayload = toAPI.cancelItem(table, item, reason, item.qty);
    const partialPayload = toAPI.cancelItem(table, item, reason, 1);

    expect(fullPayload.item_id).toBe(partialPayload.item_id);
    expect(fullPayload.item_id).toBe(1900357);
  });

  test('both should send same cancel_type for same item status', () => {
    const fullPayload = toAPI.cancelItem(table, item, reason, item.qty);
    const partialPayload = toAPI.cancelItem(table, item, reason, 1);

    expect(fullPayload.cancel_type).toBe(partialPayload.cancel_type);
    expect(fullPayload.cancel_type).toBe('Post-Serve');
  });

  // NS-3C-7 (T3, 2026-05-04): REVERSED from the original split contract.
  // Unified `cancelItem` ALWAYS emits cancel_qty (mandatory backend field).
  test('both should always include cancel_qty (full=item.qty, partial=cancelQty)', () => {
    const fullPayload = toAPI.cancelItem(table, item, reason, item.qty);
    const partialPayload = toAPI.cancelItem(table, item, reason, 1);

    expect(fullPayload).toHaveProperty('cancel_qty');
    expect(fullPayload.cancel_qty).toBe(item.qty); // 2
    expect(partialPayload).toHaveProperty('cancel_qty');
    expect(partialPayload.cancel_qty).toBe(1);
  });
});
