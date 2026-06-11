/**
 * BUG-042-C tests for the remaining three socket handlers:
 *   - handleOrderDataEvent (update-order, update-order-target, update-order-source,
 *     update-order-paid, update-item-status)
 *   - handleNewOrder (defensive status-9 insertion skip)
 *   - handleScanNewOrder (defensive status-9 insertion skip)
 *
 * Behavior under test:
 *   - status 9 (PayLater/Hold) → remove from running OrderContext, do NOT force
 *     table to 'available' (table derived to 'occupied').
 *   - status 9 arriving on new-order / scan-new-order → never inserted.
 *   - status 8 insertion skip (POS2-005) preserved.
 *   - status 3 (cancelled) and 6 (paid) on update-order-style events → still
 *     remove and force table 'available'. (Regression anchors.)
 *   - status 7 (Yet-to-Confirm) on update-order-style events → NOT removed.
 */

import {
  handleNewOrder,
  handleScanNewOrder,
  handleOrderDataEvent,
} from '../../../api/socket/socketHandlers';

// Mock the order service so handleScanNewOrder's single-order-new fetch is
// controllable from each test.
jest.mock('../../../api/services/orderService', () => ({
  fetchSingleOrderForSocket: jest.fn(),
}));

import { fetchSingleOrderForSocket } from '../../../api/services/orderService';

// Mock the transform so each test deterministically chooses what
// orderFromAPI.order returns, mirroring the pattern used in
// updateOrderStatus.test.js.
jest.mock('../../../api/transforms/orderTransform', () => {
  const actual = jest.requireActual('../../../api/transforms/orderTransform');
  return {
    ...actual,
    fromAPI: {
      ...actual.fromAPI,
      order: jest.fn(),
    },
  };
});

import { fromAPI as orderFromAPI } from '../../../api/transforms/orderTransform';

// =============================================================================
// Common helpers
// =============================================================================

const createV2OrderDataMessage = (eventName, orderId, apiOrder) => ([
  eventName,
  orderId,
  690,
  apiOrder?.food_order_status || 'running',
  { orders: [apiOrder] },
]);

const createNewOrderMessage = (orderId, apiOrders, tableInfo = null) => ([
  'new-order',
  orderId,
  690,
  'running',
  { orders: apiOrders },
  tableInfo ? { table_info: tableInfo } : undefined,
]);

let ctx;
let mocks;

beforeEach(() => {
  jest.clearAllMocks();
  mocks = {
    addOrder: jest.fn(),
    updateOrder: jest.fn(),
    removeOrder: jest.fn(),
    updateTableStatus: jest.fn(),
    getOrderById: jest.fn(),
    setTableEngaged: jest.fn(),
    setOrderEngaged: jest.fn(),
  };
  ctx = { ...mocks };
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore?.();
  console.error.mockRestore?.();
  console.warn.mockRestore?.();
});

// =============================================================================
// handleOrderDataEvent — status-9 / 3 / 6 / 7 matrix
// =============================================================================

describe('BUG-042-C | handleOrderDataEvent', () => {
  const buildApiOrder = (overrides = {}) => ({
    order_id: 730217,
    restaurant_order_id: 'ORD-001',
    food_order_status: 'running',
    table_id: 5,
    ...overrides,
  });

  test.each([
    'update-order',
    'update-order-target',
    'update-order-source',
    'update-item-status',
    // NOTE (BUG-049, May-2026): 'update-order-paid' deliberately excluded
    // from this Hold-path assertion. PayLater bill-collect is also delivered
    // with fOrderStatus=9, but on the `update-order-paid` channel, and the
    // table MUST be freed for that scenario. See the dedicated BUG-049 test
    // below.
  ])('U-%# %s + fOrderStatus=9 → removeOrder, table NOT forced available', async (eventName) => {
    const apiOrder = buildApiOrder({ food_order_status: 'pendingPayment' });
    orderFromAPI.order.mockReturnValue({
      orderId: 730217,
      status: 'pendingPayment',
      fOrderStatus: 9,
      tableId: 5,
      tableStatus: 'occupied',
    });

    await handleOrderDataEvent(
      createV2OrderDataMessage(eventName, 730217, apiOrder),
      ctx,
      eventName,
    );

    expect(mocks.removeOrder).toHaveBeenCalledWith(730217);
    expect(mocks.updateOrder).not.toHaveBeenCalled();
    // CRITICAL: status-9 must NOT force the table to 'available'.
    expect(mocks.updateTableStatus).toHaveBeenCalledWith(5, 'occupied');
    expect(mocks.updateTableStatus).not.toHaveBeenCalledWith(5, 'available');
  });

  // ===========================================================================
  // BUG-049 (May-2026) — PayLater bill-collect refinement of BUG-042-C
  // ===========================================================================
  test('BUG-049: update-order-paid + fOrderStatus=9 (PayLater settle) → removeOrder AND table forced available', async () => {
    const apiOrder = buildApiOrder({ food_order_status: 'pendingPayment' });
    orderFromAPI.order.mockReturnValue({
      orderId: 825899,
      status: 'pendingPayment',
      fOrderStatus: 9,
      tableId: 3237,
      tableStatus: 'occupied',
    });

    await handleOrderDataEvent(
      createV2OrderDataMessage('update-order-paid', 825899, apiOrder),
      ctx,
      'update-order-paid',
    );

    // Order is removed from running dashboard (preserved from BUG-042-C).
    expect(mocks.removeOrder).toHaveBeenCalledWith(825899);
    expect(mocks.updateOrder).not.toHaveBeenCalled();
    // BUG-049 CORE ASSERTION: table MUST be freed (not stuck 'occupied' with
    // no order, which produced the stale 'NA' display on the dashboard card).
    expect(mocks.updateTableStatus).toHaveBeenCalledWith(3237, 'available');
    expect(mocks.updateTableStatus).not.toHaveBeenCalledWith(3237, 'occupied');
  });

  test('BUG-049 regression: update-order + fOrderStatus=9 (Hold/Park on a non-paid channel) → table STILL occupied', async () => {
    // Hold/Park action must continue to behave per BUG-042-C — the predicate
    // refinement only kicks in on the `update-order-paid` channel.
    const apiOrder = buildApiOrder({ food_order_status: 'pendingPayment' });
    orderFromAPI.order.mockReturnValue({
      orderId: 730217,
      status: 'pendingPayment',
      fOrderStatus: 9,
      tableId: 5,
      tableStatus: 'occupied',
    });

    await handleOrderDataEvent(
      createV2OrderDataMessage('update-order', 730217, apiOrder),
      ctx,
      'update-order',
    );

    expect(mocks.removeOrder).toHaveBeenCalledWith(730217);
    expect(mocks.updateTableStatus).toHaveBeenCalledWith(5, 'occupied');
    expect(mocks.updateTableStatus).not.toHaveBeenCalledWith(5, 'available');
  });

  test('regression: update-order + fOrderStatus=6 (paid) → removeOrder, table forced available', async () => {
    const apiOrder = buildApiOrder({ food_order_status: 'paid' });
    orderFromAPI.order.mockReturnValue({
      orderId: 730217,
      status: 'paid',
      fOrderStatus: 6,
      tableId: 5,
      tableStatus: 'occupied',
    });

    await handleOrderDataEvent(
      createV2OrderDataMessage('update-order', 730217, apiOrder),
      ctx,
      'update-order',
    );

    expect(mocks.removeOrder).toHaveBeenCalledWith(730217);
    expect(mocks.updateTableStatus).toHaveBeenCalledWith(5, 'available');
  });

  test('regression: update-order + fOrderStatus=3 (cancelled) → removeOrder, table forced available', async () => {
    const apiOrder = buildApiOrder({ food_order_status: 'cancelled' });
    orderFromAPI.order.mockReturnValue({
      orderId: 730217,
      status: 'cancelled',
      fOrderStatus: 3,
      tableId: 5,
      tableStatus: 'occupied',
    });

    await handleOrderDataEvent(
      createV2OrderDataMessage('update-order', 730217, apiOrder),
      ctx,
      'update-order',
    );

    expect(mocks.removeOrder).toHaveBeenCalledWith(730217);
    expect(mocks.updateTableStatus).toHaveBeenCalledWith(5, 'available');
  });

  test('CRITICAL GUARD: update-order + fOrderStatus=7 (Yet-to-Confirm) → updateOrder, NOT removed', async () => {
    const apiOrder = buildApiOrder({ food_order_status: 'pending' });
    const transformed = {
      orderId: 730217,
      status: 'pending',
      fOrderStatus: 7,
      tableId: 5,
      tableStatus: 'yetToConfirm',
    };
    orderFromAPI.order.mockReturnValue(transformed);

    await handleOrderDataEvent(
      createV2OrderDataMessage('update-order', 730217, apiOrder),
      ctx,
      'update-order',
    );

    expect(mocks.removeOrder).not.toHaveBeenCalled();
    expect(mocks.updateOrder).toHaveBeenCalledWith(730217, transformed);
  });
});

// =============================================================================
// handleNewOrder — status-9 / status-8 insertion guards
// =============================================================================

describe('BUG-042-C | handleNewOrder insertion guard', () => {
  test('U-10 status-9: does NOT call addOrder', () => {
    orderFromAPI.order.mockReturnValue({
      orderId: 999001,
      fOrderStatus: 9,
      tableId: 5,
      tableStatus: 'occupied',
    });

    handleNewOrder(
      createNewOrderMessage(999001, [{ order_id: 999001, food_order_status: 'pendingPayment' }]),
      ctx,
    );

    expect(mocks.addOrder).not.toHaveBeenCalled();
  });

  test('U-11 regression status-8: does NOT call addOrder (POS2-005)', () => {
    orderFromAPI.order.mockReturnValue({
      orderId: 999002,
      fOrderStatus: 8,
      tableId: 5,
      tableStatus: 'occupied',
    });

    handleNewOrder(
      createNewOrderMessage(999002, [{ order_id: 999002, food_order_status: 'running' }]),
      ctx,
    );

    expect(mocks.addOrder).not.toHaveBeenCalled();
  });

  test('U-12 regression status-1 (preparing): calls addOrder normally', () => {
    const transformed = {
      orderId: 999003,
      fOrderStatus: 1,
      tableId: 5,
      tableStatus: 'occupied',
    };
    orderFromAPI.order.mockReturnValue(transformed);

    handleNewOrder(
      createNewOrderMessage(999003, [{ order_id: 999003, food_order_status: 'preparing' }]),
      ctx,
    );

    expect(mocks.addOrder).toHaveBeenCalledWith(transformed);
  });
});

// =============================================================================
// handleScanNewOrder — status-9 / status-8 insertion guards
// =============================================================================

describe('BUG-042-C | handleScanNewOrder insertion guard', () => {
  test('U-13 status-9: does NOT call addOrder', async () => {
    fetchSingleOrderForSocket.mockResolvedValue({
      orderId: 999101,
      fOrderStatus: 9,
      tableId: 5,
      tableStatus: 'occupied',
    });

    await handleScanNewOrder(
      ['scan-new-order', 999101, 690, 9],
      { addOrder: mocks.addOrder, updateTableStatus: mocks.updateTableStatus },
    );

    expect(mocks.addOrder).not.toHaveBeenCalled();
  });

  test('U-14 regression status-8: does NOT call addOrder (POS2-005)', async () => {
    fetchSingleOrderForSocket.mockResolvedValue({
      orderId: 999102,
      fOrderStatus: 8,
      tableId: 5,
      tableStatus: 'occupied',
    });

    await handleScanNewOrder(
      ['scan-new-order', 999102, 690, 8],
      { addOrder: mocks.addOrder, updateTableStatus: mocks.updateTableStatus },
    );

    expect(mocks.addOrder).not.toHaveBeenCalled();
  });

  test('U-15 regression status-1 (preparing): calls addOrder normally', async () => {
    const fetched = {
      orderId: 999103,
      fOrderStatus: 1,
      tableId: 5,
      tableStatus: 'occupied',
      orderFrom: 'web',
    };
    fetchSingleOrderForSocket.mockResolvedValue(fetched);

    await handleScanNewOrder(
      ['scan-new-order', 999103, 690, 1],
      { addOrder: mocks.addOrder, updateTableStatus: mocks.updateTableStatus },
    );

    expect(mocks.addOrder).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 999103,
      fOrderStatus: 1,
    }));
  });
});
