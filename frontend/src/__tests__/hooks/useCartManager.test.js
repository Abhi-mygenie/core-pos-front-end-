/**
 * Test Cases for useCartManager Hook
 * 
 * Location: /app/frontend/src/hooks/useCartManager.js
 * Purpose: Cart management including add, update, remove items
 */

import { renderHook, act } from '@testing-library/react';
import useCartManager from '../../hooks/useCartManager';

describe('useCartManager Hook', () => {
  
  const mockItem = {
    id: 'item-1',
    name: 'Test Item',
    price: 100,
  };

  const mockOrderData = {
    items: [
      { id: 'existing-1', name: 'Existing Item', qty: 2, time: 10 },
    ],
  };

  // TC-001: Should initialize with empty cart
  test('TC-001: initializes with empty cart', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    expect(result.current.cartItems).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  // TC-002: Should add item to cart
  test('TC-002: addToCart adds new item', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    act(() => {
      result.current.addToCart(mockItem);
    });
    
    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].name).toBe('Test Item');
    expect(result.current.cartItems[0].qty).toBe(1);
  });

  // TC-003: Should increment quantity for existing item
  test('TC-003: addToCart increments qty for existing item', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    act(() => {
      result.current.addToCart(mockItem);
      result.current.addToCart(mockItem);
    });
    
    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].qty).toBe(2);
  });

  // TC-004: Should update cart count map correctly
  test('TC-004: cartCountMap reflects cart state', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    act(() => {
      result.current.addToCart(mockItem);
      result.current.addToCart(mockItem);
    });
    
    expect(result.current.cartCountMap['item-1']).toBe(2);
  });

  // TC-005: Should calculate total correctly
  test('TC-005: total calculates price * qty sum', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    act(() => {
      result.current.addToCart({ id: '1', name: 'A', price: 100 });
      result.current.addToCart({ id: '2', name: 'B', price: 200 });
    });
    
    expect(result.current.total).toBe(300);
  });

  // TC-006: Should update quantity
  test('TC-006: updateQuantity changes item qty', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    act(() => {
      result.current.addToCart(mockItem);
    });
    
    act(() => {
      result.current.updateQuantity('item-1', 5);
    });
    
    expect(result.current.cartItems[0].qty).toBe(5);
  });

  // TC-007: Should remove item from cart
  test('TC-007: removeItem removes item from cart', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    act(() => {
      result.current.addToCart(mockItem);
      result.current.removeItem('item-1');
    });
    
    expect(result.current.cartItems).toHaveLength(0);
  });

  // TC-008: Should set flash item ID temporarily
  test('TC-008: flashItemId is set temporarily on add', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useCartManager(null));
    
    act(() => {
      result.current.addToCart(mockItem);
    });
    
    expect(result.current.flashItemId).toBe('item-1');
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current.flashItemId).toBe(null);
    jest.useRealTimers();
  });

  // TC-009: Should mark items as placed on placeOrder
  test('TC-009: placeOrder marks all items as placed', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    act(() => {
      result.current.addToCart(mockItem);
    });
    
    expect(result.current.cartItems[0].placed).toBe(false);
    
    act(() => {
      result.current.placeOrder();
    });
    
    expect(result.current.cartItems[0].placed).toBe(true);
  });

  // TC-010: Should return false on placeOrder with empty cart
  test('TC-010: placeOrder returns false when cart is empty', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    let orderPlaced;
    act(() => {
      orderPlaced = result.current.placeOrder();
    });
    
    expect(orderPlaced).toBe(false);
  });

  // TC-011: Should update item notes
  test('TC-011: updateItemNotes updates specific item notes', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    act(() => {
      result.current.addToCart(mockItem);
    });
    
    act(() => {
      result.current.updateItemNotes(0, ['No onion', 'Extra spicy']);
    });
    
    expect(result.current.cartItems[0].itemNotes).toEqual(['No onion', 'Extra spicy']);
  });

  // TC-012: Should add customized item as separate entry
  test('TC-012: addCustomizedItemToCart adds as new entry', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    act(() => {
      result.current.addToCart(mockItem);
      result.current.addCustomizedItemToCart({ ...mockItem, customizations: ['No cheese'] });
    });
    
    expect(result.current.cartItems).toHaveLength(2);
  });

  // TC-013: Should not increment placed items
  test('TC-013: does not increment qty of placed items', () => {
    const { result } = renderHook(() => useCartManager(null));
    
    act(() => {
      result.current.addToCart(mockItem);
      result.current.placeOrder();
      result.current.addToCart(mockItem);
    });
    
    // Should have 2 entries - one placed, one new
    expect(result.current.cartItems).toHaveLength(2);
  });

});
