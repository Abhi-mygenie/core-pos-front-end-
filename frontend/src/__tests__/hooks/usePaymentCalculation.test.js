/**
 * Test Cases for usePaymentCalculation Hook
 * 
 * Location: /app/frontend/src/hooks/usePaymentCalculation.js
 * Purpose: Payment and discount calculations
 */

import { renderHook } from '@testing-library/react';
import usePaymentCalculation from '../../hooks/usePaymentCalculation';

describe('usePaymentCalculation Hook', () => {
  
  const mockCustomer = {
    loyaltyPoints: 100,
    walletBalance: 500,
  };

  const mockCoupon = {
    code: 'FLAT50',
    discount: 50,
    type: 'flat',
  };

  const mockPercentCoupon = {
    code: 'SAVE20',
    discount: 20,
    type: 'percent',
    maxDiscount: 100,
  };

  // TC-001: Should calculate correct subtotal
  test('TC-001: subtotal equals the passed total', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ total: 1000 })
    );
    
    expect(result.current.subtotal).toBe(1000);
  });

  // TC-002: Should calculate 5% tax correctly
  test('TC-002: calculates 5% tax correctly', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ total: 1000 })
    );
    
    expect(result.current.tax).toBe(50); // 5% of 1000
  });

  // TC-003: Should calculate loyalty discount when enabled
  test('TC-003: calculates loyalty discount when enabled', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ 
        total: 1000, 
        customer: mockCustomer, 
        useLoyalty: true 
      })
    );
    
    expect(result.current.loyaltyDiscount).toBe(100); // min(100, 1000)
  });

  // TC-004: Should NOT apply loyalty discount when disabled
  test('TC-004: no loyalty discount when disabled', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ 
        total: 1000, 
        customer: mockCustomer, 
        useLoyalty: false 
      })
    );
    
    expect(result.current.loyaltyDiscount).toBe(0);
  });

  // TC-005: Should cap loyalty discount to subtotal
  test('TC-005: loyalty discount capped to subtotal', () => {
    const customerWithHighPoints = { loyaltyPoints: 2000, walletBalance: 0 };
    const { result } = renderHook(() => 
      usePaymentCalculation({ 
        total: 500, 
        customer: customerWithHighPoints, 
        useLoyalty: true 
      })
    );
    
    expect(result.current.loyaltyDiscount).toBe(500); // capped to subtotal
  });

  // TC-006: Should calculate wallet discount correctly
  test('TC-006: calculates wallet discount correctly', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ 
        total: 1000, 
        customer: mockCustomer, 
        useWallet: true,
        walletAmount: 200
      })
    );
    
    expect(result.current.walletDiscount).toBe(200);
  });

  // TC-007: Should calculate flat coupon discount
  test('TC-007: calculates flat coupon discount', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ 
        total: 1000, 
        selectedCoupon: mockCoupon 
      })
    );
    
    expect(result.current.couponDiscount).toBe(50);
  });

  // TC-008: Should calculate percent coupon discount with max
  test('TC-008: calculates percent coupon with max discount', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ 
        total: 1000, 
        selectedCoupon: mockPercentCoupon 
      })
    );
    
    expect(result.current.couponDiscount).toBe(100); // 20% = 200, capped at 100
  });

  // TC-009: Should calculate final total correctly
  test('TC-009: calculates final total with all discounts', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ 
        total: 1000, 
        customer: mockCustomer, 
        useLoyalty: true,
        useWallet: true,
        walletAmount: 100,
        selectedCoupon: mockCoupon
      })
    );
    
    // subtotal: 1000, tax: 50, loyalty: 100, wallet: 100, coupon: 50
    // final = 1000 + 50 - 250 = 800
    expect(result.current.finalTotal).toBe(800);
  });

  // TC-010: Should calculate change correctly
  test('TC-010: calculateChange returns correct change', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ total: 1000 })
    );
    
    const change = result.current.calculateChange('1200');
    expect(change).toBe(150); // 1200 - 1050 (1000 + 50 tax)
  });

  // TC-011: Should return zero change when amount is less than total
  test('TC-011: calculateChange returns 0 when amount less than total', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ total: 1000 })
    );
    
    const change = result.current.calculateChange('500');
    expect(change).toBe(0);
  });

  // TC-012: Should provide quick amount suggestions
  test('TC-012: getQuickAmounts provides sensible suggestions', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ total: 1000 })
    );
    
    const quickAmounts = result.current.getQuickAmounts;
    expect(quickAmounts).toContain(1050); // exact amount
    expect(quickAmounts).toContain(1100); // rounded to 100
    expect(quickAmounts).toContain(1500); // rounded to 500
  });

  // TC-013: Should handle no customer gracefully
  test('TC-013: handles no customer gracefully', () => {
    const { result } = renderHook(() => 
      usePaymentCalculation({ 
        total: 1000, 
        customer: null, 
        useLoyalty: true 
      })
    );
    
    expect(result.current.loyaltyDiscount).toBe(0);
    expect(result.current.walletDiscount).toBe(0);
  });

  // TC-014: Should not have negative final total
  test('TC-014: final total is never negative', () => {
    const richCustomer = { loyaltyPoints: 5000, walletBalance: 5000 };
    const { result } = renderHook(() => 
      usePaymentCalculation({ 
        total: 100, 
        customer: richCustomer, 
        useLoyalty: true,
        useWallet: true,
        walletAmount: 5000
      })
    );
    
    expect(result.current.finalTotal).toBeGreaterThanOrEqual(0);
  });

});
