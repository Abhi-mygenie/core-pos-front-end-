/**
 * Test Cases for useCouponValidation Hook
 * 
 * Location: /app/frontend/src/hooks/useCouponValidation.js
 * Purpose: Coupon validation and application
 */

import { renderHook, act } from '@testing-library/react';
import useCouponValidation from '../../hooks/useCouponValidation';

describe('useCouponValidation Hook', () => {
  
  const mockCustomer = {
    coupons: [
      { code: 'FLAT50', discount: 50, type: 'flat', minOrder: 100 },
      { code: 'SAVE20', discount: 20, type: 'percent', minOrder: 500 },
    ],
  };

  // TC-001: Should initialize with no coupon selected
  test('TC-001: initializes with no coupon', () => {
    const { result } = renderHook(() => useCouponValidation(mockCustomer, 1000));
    
    expect(result.current.selectedCoupon).toBe(null);
    expect(result.current.couponCode).toBe('');
    expect(result.current.couponError).toBe('');
  });

  // TC-002: Should apply valid coupon code
  test('TC-002: handleApplyCoupon applies valid coupon', () => {
    const { result } = renderHook(() => useCouponValidation(mockCustomer, 1000));
    
    act(() => {
      result.current.setCouponCode('FLAT50');
    });
    
    act(() => {
      result.current.handleApplyCoupon();
    });
    
    expect(result.current.selectedCoupon?.code).toBe('FLAT50');
    expect(result.current.couponCode).toBe(''); // cleared after apply
    expect(result.current.couponError).toBe('');
  });

  // TC-003: Should show error for invalid coupon
  test('TC-003: handleApplyCoupon shows error for invalid code', () => {
    const { result } = renderHook(() => useCouponValidation(mockCustomer, 1000));
    
    act(() => {
      result.current.setCouponCode('INVALID');
    });
    
    act(() => {
      result.current.handleApplyCoupon();
    });
    
    expect(result.current.selectedCoupon).toBe(null);
    expect(result.current.couponError).toBe('Invalid coupon code');
  });

  // TC-004: Should show error when minimum order not met
  test('TC-004: shows error when min order not met', () => {
    const { result } = renderHook(() => useCouponValidation(mockCustomer, 50)); // below minOrder
    
    act(() => {
      result.current.setCouponCode('FLAT50');
    });
    
    act(() => {
      result.current.handleApplyCoupon();
    });
    
    expect(result.current.selectedCoupon).toBe(null);
    expect(result.current.couponError).toBe('Min order ₹100 required');
  });

  // TC-005: Should be case insensitive
  test('TC-005: coupon code is case insensitive', () => {
    const { result } = renderHook(() => useCouponValidation(mockCustomer, 1000));
    
    act(() => {
      result.current.setCouponCode('flat50');
    });
    
    act(() => {
      result.current.handleApplyCoupon();
    });
    
    expect(result.current.selectedCoupon?.code).toBe('FLAT50');
  });

  // TC-006: Should select coupon directly
  test('TC-006: handleSelectCoupon selects coupon', () => {
    const { result } = renderHook(() => useCouponValidation(mockCustomer, 1000));
    
    act(() => {
      result.current.handleSelectCoupon(mockCustomer.coupons[0]);
    });
    
    expect(result.current.selectedCoupon?.code).toBe('FLAT50');
  });

  // TC-007: Should toggle off when selecting same coupon
  test('TC-007: handleSelectCoupon toggles off same coupon', () => {
    const { result } = renderHook(() => useCouponValidation(mockCustomer, 1000));
    
    act(() => {
      result.current.handleSelectCoupon(mockCustomer.coupons[0]);
    });
    
    act(() => {
      result.current.handleSelectCoupon(mockCustomer.coupons[0]);
    });
    
    expect(result.current.selectedCoupon).toBe(null);
  });

  // TC-008: Should clear coupon and error
  test('TC-008: clearCoupon clears everything', () => {
    const { result } = renderHook(() => useCouponValidation(mockCustomer, 1000));
    
    act(() => {
      result.current.handleSelectCoupon(mockCustomer.coupons[0]);
      result.current.setCouponCode('test');
    });
    
    act(() => {
      result.current.clearCoupon();
    });
    
    expect(result.current.selectedCoupon).toBe(null);
    expect(result.current.couponCode).toBe('');
    expect(result.current.couponError).toBe('');
  });

  // TC-009: Should not apply empty coupon code
  test('TC-009: does not apply empty coupon code', () => {
    const { result } = renderHook(() => useCouponValidation(mockCustomer, 1000));
    
    let applied;
    act(() => {
      applied = result.current.handleApplyCoupon();
    });
    
    expect(applied).toBe(false);
    expect(result.current.selectedCoupon).toBe(null);
  });

  // TC-010: Should handle null customer gracefully
  test('TC-010: handles null customer', () => {
    const { result } = renderHook(() => useCouponValidation(null, 1000));
    
    act(() => {
      result.current.setCouponCode('FLAT50');
    });
    
    act(() => {
      result.current.handleApplyCoupon();
    });
    
    expect(result.current.couponError).toBe('Invalid coupon code');
  });

});
