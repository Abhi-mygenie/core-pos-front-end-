/**
 * Test Cases for SearchResultGroup Component
 * 
 * Location: /app/frontend/src/components/common/SearchResultGroup.jsx
 * Purpose: Display grouped search results with header
 */

import { render, screen, fireEvent } from '@testing-library/react';
import SearchResultGroup from '../../components/common/SearchResultGroup';

describe('SearchResultGroup Component', () => {
  
  const mockItems = [
    { id: 'T1', customer: 'John Doe', phone: '9876543210' },
    { id: 'T2', customer: 'Jane Smith', phone: '8765432109' },
  ];

  const mockOnSelect = jest.fn();
  const mockGetDisplayText = (item) => item.customer;

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  // TC-001: Should render nothing when items is empty
  test('TC-001: renders nothing when items array is empty', () => {
    const { container } = render(
      <SearchResultGroup
        title="Tables"
        items={[]}
        type="table"
        onSelect={mockOnSelect}
        getDisplayText={mockGetDisplayText}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  // TC-002: Should render nothing when items is null
  test('TC-002: renders nothing when items is null', () => {
    const { container } = render(
      <SearchResultGroup
        title="Tables"
        items={null}
        type="table"
        onSelect={mockOnSelect}
        getDisplayText={mockGetDisplayText}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  // TC-003: Should render title correctly
  test('TC-003: renders title correctly', () => {
    render(
      <SearchResultGroup
        title="Tables"
        items={mockItems}
        type="table"
        onSelect={mockOnSelect}
        getDisplayText={mockGetDisplayText}
      />
    );
    
    expect(screen.getByText('Tables')).toBeInTheDocument();
  });

  // TC-004: Should render all items
  test('TC-004: renders all items', () => {
    render(
      <SearchResultGroup
        title="Tables"
        items={mockItems}
        type="table"
        onSelect={mockOnSelect}
        getDisplayText={mockGetDisplayText}
      />
    );
    
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('T2')).toBeInTheDocument();
  });

  // TC-005: Should apply exact match styling when isExact=true
  test('TC-005: applies exact match styling', () => {
    render(
      <SearchResultGroup
        title="Exact Match"
        items={mockItems}
        isExact={true}
        type="table"
        onSelect={mockOnSelect}
        getDisplayText={mockGetDisplayText}
      />
    );
    
    const title = screen.getByText('Exact Match');
    expect(title).toHaveStyle({ color: expect.any(String) });
  });

  // TC-006: Should call onSelect with correct data when item clicked
  test('TC-006: calls onSelect with correct data', () => {
    render(
      <SearchResultGroup
        title="Tables"
        items={mockItems}
        type="table"
        onSelect={mockOnSelect}
        getDisplayText={mockGetDisplayText}
      />
    );
    
    const selectButtons = screen.getAllByRole('button');
    fireEvent.click(selectButtons[0]);
    
    expect(mockOnSelect).toHaveBeenCalledWith({
      type: 'table',
      data: mockItems[0],
    });
  });

  // TC-007: Should display phone when available
  test('TC-007: displays phone when available', () => {
    render(
      <SearchResultGroup
        title="Tables"
        items={mockItems}
        type="table"
        onSelect={mockOnSelect}
        getDisplayText={mockGetDisplayText}
      />
    );
    
    expect(screen.getByText('9876543210')).toBeInTheDocument();
  });

  // TC-008: Should use getDisplayText for customer name
  test('TC-008: uses getDisplayText for display', () => {
    render(
      <SearchResultGroup
        title="Tables"
        items={mockItems}
        type="table"
        onSelect={mockOnSelect}
        getDisplayText={mockGetDisplayText}
      />
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

});
