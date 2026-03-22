/**
 * Test Cases for useCustomerLookup Hook
 * 
 * Location: /app/frontend/src/hooks/useCustomerLookup.js
 * Purpose: Customer search and lookup functionality
 */

import { renderHook, act } from '@testing-library/react';
import useCustomerLookup from '../../hooks/useCustomerLookup';

// Mock the mockCustomers data
jest.mock('../../data', () => ({
  mockCustomers: [
    { id: 'C001', name: 'John Doe', phone: '9876543210', loyaltyPoints: 100 },
    { id: 'C002', name: 'Jane Smith', phone: '8765432109', loyaltyPoints: 200 },
  ],
}));

describe('useCustomerLookup Hook', () => {
  
  // TC-001: Should initialize with empty state
  test('TC-001: initializes with empty state', () => {
    const { result } = renderHook(() => useCustomerLookup());
    
    expect(result.current.phone).toBe('');
    expect(result.current.customerName).toBe('');
    expect(result.current.customer).toBe(null);
    expect(result.current.customerStatus).toBe(null);
  });

  // TC-002: Should update phone (digits only)
  test('TC-002: setPhone filters non-digits', () => {
    const { result } = renderHook(() => useCustomerLookup());
    
    act(() => {
      result.current.setPhone('987-654-3210');
    });
    
    expect(result.current.phone).toBe('9876543210');
  });

  // TC-003: Should limit phone to 10 digits
  test('TC-003: setPhone limits to 10 digits', () => {
    const { result } = renderHook(() => useCustomerLookup());
    
    act(() => {
      result.current.setPhone('98765432109999');
    });
    
    expect(result.current.phone).toBe('9876543210');
  });

  // TC-004: Should find existing customer
  test('TC-004: handleFindCustomer finds existing customer', () => {
    const { result } = renderHook(() => useCustomerLookup());
    
    act(() => {
      result.current.setPhone('9876543210');
    });
    
    act(() => {
      result.current.handleFindCustomer();
    });
    
    expect(result.current.customer?.name).toBe('John Doe');
    expect(result.current.customerStatus).toBe('found');
    expect(result.current.customerName).toBe('John Doe');
  });

  // TC-005: Should set status to 'new' for unknown customer
  test('TC-005: handleFindCustomer sets new status for unknown', () => {
    const { result } = renderHook(() => useCustomerLookup());
    
    act(() => {
      result.current.setPhone('1111111111');
    });
    
    act(() => {
      result.current.handleFindCustomer();
    });
    
    expect(result.current.customer).toBe(null);
    expect(result.current.customerStatus).toBe('new');
  });

  // TC-006: Should not search with less than 10 digits
  test('TC-006: does not search with less than 10 digits', () => {
    const { result } = renderHook(() => useCustomerLookup());
    
    act(() => {
      result.current.setPhone('98765');
    });
    
    act(() => {
      result.current.handleFindCustomer();
    });
    
    expect(result.current.customer).toBe(null);
    expect(result.current.customerStatus).toBe(null);
  });

  // TC-007: Should reset customer state
  test('TC-007: resetCustomer clears all state', () => {
    const { result } = renderHook(() => useCustomerLookup());
    
    act(() => {
      result.current.setPhone('9876543210');
      result.current.handleFindCustomer();
    });
    
    act(() => {
      result.current.resetCustomer();
    });
    
    expect(result.current.phone).toBe('');
    expect(result.current.customerName).toBe('');
    expect(result.current.customer).toBe(null);
    expect(result.current.customerStatus).toBe(null);
  });

  // TC-008: Should allow manual name change
  test('TC-008: setCustomerName allows manual change', () => {
    const { result } = renderHook(() => useCustomerLookup());
    
    act(() => {
      result.current.setCustomerName('New Customer');
    });
    
    expect(result.current.customerName).toBe('New Customer');
  });

  // TC-009: Should return found customer from handleFindCustomer
  test('TC-009: handleFindCustomer returns found customer', () => {
    const { result } = renderHook(() => useCustomerLookup());
    
    act(() => {
      result.current.setPhone('9876543210');
    });
    
    let foundCustomer;
    act(() => {
      foundCustomer = result.current.handleFindCustomer();
    });
    
    expect(foundCustomer?.name).toBe('John Doe');
  });

  // TC-010: Should return null from handleFindCustomer when not found
  test('TC-010: handleFindCustomer returns null when not found', () => {
    const { result } = renderHook(() => useCustomerLookup());
    
    act(() => {
      result.current.setPhone('0000000000');
    });
    
    let foundCustomer;
    act(() => {
      foundCustomer = result.current.handleFindCustomer();
    });
    
    expect(foundCustomer).toBe(null);
  });

});
