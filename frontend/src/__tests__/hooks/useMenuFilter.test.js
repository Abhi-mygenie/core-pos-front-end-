/**
 * Test Cases for useMenuFilter Hook
 * 
 * Location: /app/frontend/src/hooks/useMenuFilter.js
 * Purpose: Menu filtering with search and dietary filters
 */

import { renderHook, act } from '@testing-library/react';
import useMenuFilter from '../../hooks/useMenuFilter';

// Mock the mockMenuItems data
jest.mock('../../data', () => ({
  mockMenuItems: {
    popular: [
      { id: '1', name: 'Butter Chicken', type: 'nonveg', glutenFree: false, jain: false, vegan: false },
      { id: '2', name: 'Paneer Tikka', type: 'veg', glutenFree: true, jain: true, vegan: false },
      { id: '3', name: 'Egg Curry', type: 'egg', glutenFree: true, jain: false, vegan: false },
      { id: '4', name: 'Vegan Bowl', type: 'veg', glutenFree: true, jain: true, vegan: true },
    ],
    starters: [
      { id: '5', name: 'Samosa', type: 'veg', glutenFree: false, jain: true, vegan: true },
    ],
  },
}));

describe('useMenuFilter Hook', () => {
  
  // TC-001: Should initialize with default category 'popular'
  test('TC-001: initializes with popular category', () => {
    const { result } = renderHook(() => useMenuFilter());
    
    expect(result.current.activeCategory).toBe('popular');
  });

  // TC-002: Should change category
  test('TC-002: setActiveCategory changes category', () => {
    const { result } = renderHook(() => useMenuFilter());
    
    act(() => {
      result.current.setActiveCategory('starters');
    });
    
    expect(result.current.activeCategory).toBe('starters');
  });

  // TC-003: Should filter items by search query
  test('TC-003: filters by search query', () => {
    const { result } = renderHook(() => useMenuFilter());
    
    act(() => {
      result.current.setSearchQuery('butter');
    });
    
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Butter Chicken');
  });

  // TC-004: Should filter by primary filter (veg)
  test('TC-004: togglePrimaryFilter filters veg items', () => {
    const { result } = renderHook(() => useMenuFilter());
    
    act(() => {
      result.current.togglePrimaryFilter('veg');
    });
    
    expect(result.current.primaryFilter).toBe('veg');
    expect(result.current.filteredItems.every(item => item.type === 'veg')).toBe(true);
  });

  // TC-005: Should toggle off primary filter when clicked again
  test('TC-005: togglePrimaryFilter toggles off', () => {
    const { result } = renderHook(() => useMenuFilter());
    
    act(() => {
      result.current.togglePrimaryFilter('veg');
    });
    
    act(() => {
      result.current.togglePrimaryFilter('veg');
    });
    
    expect(result.current.primaryFilter).toBe(null);
  });

  // TC-006: Should filter by secondary filter (glutenFree)
  test('TC-006: toggleSecondaryFilter filters glutenFree', () => {
    const { result } = renderHook(() => useMenuFilter());
    
    act(() => {
      result.current.toggleSecondaryFilter('glutenFree');
    });
    
    expect(result.current.secondaryFilters.glutenFree).toBe(true);
    expect(result.current.filteredItems.every(item => item.glutenFree === true)).toBe(true);
  });

  // TC-007: Should filter by multiple secondary filters
  test('TC-007: multiple secondary filters work together', () => {
    const { result } = renderHook(() => useMenuFilter());
    
    act(() => {
      result.current.toggleSecondaryFilter('glutenFree');
      result.current.toggleSecondaryFilter('jain');
    });
    
    // Should only include items that are both glutenFree AND jain
    expect(result.current.filteredItems.every(item => 
      item.glutenFree === true && item.jain === true
    )).toBe(true);
  });

  // TC-008: Should combine primary and secondary filters
  test('TC-008: combines primary and secondary filters', () => {
    const { result } = renderHook(() => useMenuFilter());
    
    act(() => {
      result.current.togglePrimaryFilter('veg');
      result.current.toggleSecondaryFilter('vegan');
    });
    
    // Should only include veg AND vegan items
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Vegan Bowl');
  });

  // TC-009: Should clear all filters
  test('TC-009: clearFilters resets all filters', () => {
    const { result } = renderHook(() => useMenuFilter());
    
    act(() => {
      result.current.setSearchQuery('test');
      result.current.togglePrimaryFilter('veg');
      result.current.toggleSecondaryFilter('glutenFree');
    });
    
    act(() => {
      result.current.clearFilters();
    });
    
    expect(result.current.searchQuery).toBe('');
    expect(result.current.primaryFilter).toBe(null);
    expect(result.current.secondaryFilters).toEqual({ glutenFree: false, jain: false, vegan: false });
  });

  // TC-010: Should return empty array for non-existent category
  test('TC-010: returns empty for non-existent category', () => {
    const { result } = renderHook(() => useMenuFilter());
    
    act(() => {
      result.current.setActiveCategory('nonexistent');
    });
    
    expect(result.current.filteredItems).toEqual([]);
  });

  // TC-011: Case insensitive search
  test('TC-011: search is case insensitive', () => {
    const { result } = renderHook(() => useMenuFilter());
    
    act(() => {
      result.current.setSearchQuery('BUTTER');
    });
    
    expect(result.current.filteredItems).toHaveLength(1);
  });

});
