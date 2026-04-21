/**
 * Test Suite: handleUpdateOrderStatus - Item Cancel Fix
 * 
 * BUG-107: Single item cancel removes entire order
 * 
 * Expected behavior:
 * - status=6 (paid) → remove order immediately
 * - status=3 (cancelled) → fetch order, check if ALL items cancelled
 * - Other status → fetch order, update
 */

import { handleUpdateOrderStatus } from '../../../api/socket/socketHandlers';
import * as orderService from '../../../api/services/orderService';

// Mock the orderService
jest.mock('../../../api/services/orderService');

// =============================================================================
// Test Data
// =============================================================================

const createMockOrder = (overrides = {}) => ({
  orderId: 730217,
  orderNumber: 'ORD-001',
  status: 'running',
  items: [
    { id: 1, name: 'Beer', status: 'preparing' },
    { id: 2, name: 'Pizza', status: 'ready' },
  ],
  ...overrides,
});

const createMockMessage = (orderId, status) => 
  ['update-order-status', orderId, 690, status];

// =============================================================================
// Test Suite
// =============================================================================

describe('BUG-107: handleUpdateOrderStatus - Single Item Cancel Fix', () => {
  
  let mockUpdateOrder;
  let mockRemoveOrder;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateOrder = jest.fn();
    mockRemoveOrder = jest.fn();
  });

  // ---------------------------------------------------------------------------
  // Paid orders (status 6) - should remove immediately
  // ---------------------------------------------------------------------------
  describe('Paid orders (status 6)', () => {
    
    test('should remove order immediately without fetching', async () => {
      const message = createMockMessage(730217, 6);
      
      await handleUpdateOrderStatus(message, {
        updateOrder: mockUpdateOrder,
        removeOrder: mockRemoveOrder,
      });
      
      expect(mockRemoveOrder).toHaveBeenCalledWith(730217);
      expect(mockUpdateOrder).not.toHaveBeenCalled();
      expect(orderService.fetchSingleOrderForSocket).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Cancelled status (status 3) - should fetch order first
  // ---------------------------------------------------------------------------
  describe('Cancelled status (status 3) - single item cancel', () => {
    
    test('should fetch order when status is 3 (cancelled)', async () => {
      const order = createMockOrder({
        items: [
          { id: 1, name: 'Beer', status: 'cancelled' },
          { id: 2, name: 'Pizza', status: 'ready' },  // Still active!
        ],
      });
      orderService.fetchSingleOrderForSocket.mockResolvedValue(order);
      
      const message = createMockMessage(730217, 3);
      
      await handleUpdateOrderStatus(message, {
        updateOrder: mockUpdateOrder,
        removeOrder: mockRemoveOrder,
      });
      
      expect(orderService.fetchSingleOrderForSocket).toHaveBeenCalledWith(730217);
    });

    test('should UPDATE order if some items are still active', async () => {
      const order = createMockOrder({
        items: [
          { id: 1, name: 'Beer', status: 'cancelled' },
          { id: 2, name: 'Pizza', status: 'ready' },  // Still active!
        ],
      });
      orderService.fetchSingleOrderForSocket.mockResolvedValue(order);
      
      const message = createMockMessage(730217, 3);
      
      await handleUpdateOrderStatus(message, {
        updateOrder: mockUpdateOrder,
        removeOrder: mockRemoveOrder,
      });
      
      expect(mockUpdateOrder).toHaveBeenCalledWith(730217, order);
      expect(mockRemoveOrder).not.toHaveBeenCalled();
    });

    test('should NOT remove order when only one item is cancelled', async () => {
      const order = createMockOrder({
        items: [
          { id: 1, name: 'Beer', status: 'cancelled' },
          { id: 2, name: 'Pizza', status: 'preparing' },
          { id: 3, name: 'Pasta', status: 'served' },
        ],
      });
      orderService.fetchSingleOrderForSocket.mockResolvedValue(order);
      
      const message = createMockMessage(730217, 3);
      
      await handleUpdateOrderStatus(message, {
        updateOrder: mockUpdateOrder,
        removeOrder: mockRemoveOrder,
      });
      
      expect(mockRemoveOrder).not.toHaveBeenCalled();
      expect(mockUpdateOrder).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // All items cancelled - should remove order
  // ---------------------------------------------------------------------------
  describe('All items cancelled - full order cancel', () => {
    
    test('should REMOVE order if ALL items are cancelled', async () => {
      const order = createMockOrder({
        items: [
          { id: 1, name: 'Beer', status: 'cancelled' },
          { id: 2, name: 'Pizza', status: 'cancelled' },
        ],
      });
      orderService.fetchSingleOrderForSocket.mockResolvedValue(order);
      
      const message = createMockMessage(730217, 3);
      
      await handleUpdateOrderStatus(message, {
        updateOrder: mockUpdateOrder,
        removeOrder: mockRemoveOrder,
      });
      
      expect(mockRemoveOrder).toHaveBeenCalledWith(730217);
      expect(mockUpdateOrder).not.toHaveBeenCalled();
    });

    test('should REMOVE order if items array is empty', async () => {
      const order = createMockOrder({
        items: [],
      });
      orderService.fetchSingleOrderForSocket.mockResolvedValue(order);
      
      const message = createMockMessage(730217, 3);
      
      await handleUpdateOrderStatus(message, {
        updateOrder: mockUpdateOrder,
        removeOrder: mockRemoveOrder,
      });
      
      expect(mockRemoveOrder).toHaveBeenCalledWith(730217);
    });
  });

  // ---------------------------------------------------------------------------
  // Order not found in API
  // ---------------------------------------------------------------------------
  describe('Order not found in API', () => {
    
    test('should remove order from context if API returns null', async () => {
      orderService.fetchSingleOrderForSocket.mockResolvedValue(null);
      
      const message = createMockMessage(730217, 3);
      
      await handleUpdateOrderStatus(message, {
        updateOrder: mockUpdateOrder,
        removeOrder: mockRemoveOrder,
      });
      
      expect(mockRemoveOrder).toHaveBeenCalledWith(730217);
      expect(mockUpdateOrder).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Other statuses (not 3 or 6) - should fetch and update
  // ---------------------------------------------------------------------------
  describe('Other statuses - fetch and update', () => {
    
    test.each([1, 2, 5, 7, 8])('should fetch and update for status %i', async (status) => {
      const order = createMockOrder();
      orderService.fetchSingleOrderForSocket.mockResolvedValue(order);
      
      const message = createMockMessage(730217, status);
      
      await handleUpdateOrderStatus(message, {
        updateOrder: mockUpdateOrder,
        removeOrder: mockRemoveOrder,
      });
      
      expect(orderService.fetchSingleOrderForSocket).toHaveBeenCalledWith(730217);
      expect(mockUpdateOrder).toHaveBeenCalledWith(730217, order);
      expect(mockRemoveOrder).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('Edge cases', () => {
    
    test('should handle order with undefined items', async () => {
      const order = createMockOrder({ items: undefined });
      orderService.fetchSingleOrderForSocket.mockResolvedValue(order);
      
      const message = createMockMessage(730217, 3);
      
      await handleUpdateOrderStatus(message, {
        updateOrder: mockUpdateOrder,
        removeOrder: mockRemoveOrder,
      });
      
      // If items is undefined, treat as fully cancelled
      expect(mockRemoveOrder).toHaveBeenCalledWith(730217);
    });

    test('should handle single cancelled item in single-item order', async () => {
      const order = createMockOrder({
        items: [{ id: 1, name: 'Beer', status: 'cancelled' }],
      });
      orderService.fetchSingleOrderForSocket.mockResolvedValue(order);
      
      const message = createMockMessage(730217, 3);
      
      await handleUpdateOrderStatus(message, {
        updateOrder: mockUpdateOrder,
        removeOrder: mockRemoveOrder,
      });
      
      expect(mockRemoveOrder).toHaveBeenCalledWith(730217);
    });
  });
});
