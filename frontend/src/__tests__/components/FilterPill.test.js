/**
 * Test Cases for FilterPill Component
 * 
 * Location: /app/frontend/src/components/common/FilterPill.jsx
 * Purpose: Reusable filter button component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import FilterPill from '../../components/common/FilterPill';

describe('FilterPill Component', () => {
  
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  // TC-001: Should render label text
  test('TC-001: renders label text', () => {
    render(
      <FilterPill
        id="veg"
        label="Veg"
        isActive={false}
        onClick={mockOnClick}
      />
    );
    
    expect(screen.getByText('Veg')).toBeInTheDocument();
  });

  // TC-002: Should have correct test id
  test('TC-002: has correct data-testid', () => {
    render(
      <FilterPill
        id="veg"
        label="Veg"
        isActive={false}
        onClick={mockOnClick}
        testIdPrefix="filter"
      />
    );
    
    expect(screen.getByTestId('filter-veg')).toBeInTheDocument();
  });

  // TC-003: Should call onClick when clicked
  test('TC-003: calls onClick when clicked', () => {
    render(
      <FilterPill
        id="veg"
        label="Veg"
        isActive={false}
        onClick={mockOnClick}
      />
    );
    
    fireEvent.click(screen.getByText('Veg'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  // TC-004: Should render with icon when provided
  test('TC-004: renders icon when provided', () => {
    const MockIcon = () => <span data-testid="mock-icon">Icon</span>;
    
    render(
      <FilterPill
        id="veg"
        label="Veg"
        isActive={false}
        onClick={mockOnClick}
        icon={MockIcon}
      />
    );
    
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  // TC-005: Should apply active styling when isActive=true
  test('TC-005: applies active styling', () => {
    const { rerender } = render(
      <FilterPill
        id="veg"
        label="Veg"
        isActive={false}
        onClick={mockOnClick}
      />
    );
    
    const button = screen.getByRole('button');
    const initialStyle = button.getAttribute('style');
    
    rerender(
      <FilterPill
        id="veg"
        label="Veg"
        isActive={true}
        onClick={mockOnClick}
      />
    );
    
    const activeStyle = button.getAttribute('style');
    expect(activeStyle).not.toBe(initialStyle);
  });

  // TC-006: Should render with channel variant styling
  test('TC-006: renders with channel variant', () => {
    render(
      <FilterPill
        id="delivery"
        label="Del"
        isActive={true}
        onClick={mockOnClick}
        variant="channel"
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('py-3');
  });

  // TC-007: Should have title attribute
  test('TC-007: has title attribute for accessibility', () => {
    render(
      <FilterPill
        id="veg"
        label="Vegetarian"
        isActive={false}
        onClick={mockOnClick}
      />
    );
    
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Vegetarian');
  });

});
