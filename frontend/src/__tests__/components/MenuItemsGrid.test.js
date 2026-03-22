/**
 * Test Cases for MenuItemsGrid Component
 * 
 * Location: /app/frontend/src/components/order-entry/MenuItemsGrid.jsx
 * Purpose: Display grid of menu item pills
 */

import { render, screen, fireEvent } from '@testing-library/react';
import MenuItemsGrid, { MenuItemPill } from '../../components/order-entry/MenuItemsGrid';

describe('MenuItemPill Component', () => {
  
  const mockItem = {
    id: 'item-1',
    name: 'Butter Chicken',
    customizable: false,
  };

  const mockCustomizableItem = {
    id: 'item-2',
    name: 'Pizza',
    customizable: true,
  };

  const mockOnAddToCart = jest.fn();
  const mockOnCustomize = jest.fn();

  beforeEach(() => {
    mockOnAddToCart.mockClear();
    mockOnCustomize.mockClear();
  });

  // TC-001: Should render item name
  test('TC-001: renders item name', () => {
    render(
      <MenuItemPill
        item={mockItem}
        cartCount={0}
        isFlashing={false}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    expect(screen.getByText('Butter Chicken')).toBeInTheDocument();
  });

  // TC-002: Should have correct test id
  test('TC-002: has correct data-testid', () => {
    render(
      <MenuItemPill
        item={mockItem}
        cartCount={0}
        isFlashing={false}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    expect(screen.getByTestId('menu-item-item-1')).toBeInTheDocument();
  });

  // TC-003: Should call onAddToCart for non-customizable item
  test('TC-003: calls onAddToCart for non-customizable item', () => {
    render(
      <MenuItemPill
        item={mockItem}
        cartCount={0}
        isFlashing={false}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    fireEvent.click(screen.getByTestId('menu-item-item-1'));
    expect(mockOnAddToCart).toHaveBeenCalledWith(mockItem);
    expect(mockOnCustomize).not.toHaveBeenCalled();
  });

  // TC-004: Should call onCustomize for customizable item
  test('TC-004: calls onCustomize for customizable item', () => {
    render(
      <MenuItemPill
        item={mockCustomizableItem}
        cartCount={0}
        isFlashing={false}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    fireEvent.click(screen.getByTestId('menu-item-item-2'));
    expect(mockOnCustomize).toHaveBeenCalledWith(mockCustomizableItem);
    expect(mockOnAddToCart).not.toHaveBeenCalled();
  });

  // TC-005: Should show "Customize" label for customizable items
  test('TC-005: shows Customize label for customizable items', () => {
    render(
      <MenuItemPill
        item={mockCustomizableItem}
        cartCount={0}
        isFlashing={false}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    expect(screen.getByText('Customize')).toBeInTheDocument();
  });

  // TC-006: Should show cart count badge when cartCount > 0
  test('TC-006: shows cart count badge', () => {
    render(
      <MenuItemPill
        item={mockItem}
        cartCount={3}
        isFlashing={false}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  // TC-007: Should NOT show badge when cartCount is 0
  test('TC-007: does not show badge when cartCount is 0', () => {
    render(
      <MenuItemPill
        item={mockItem}
        cartCount={0}
        isFlashing={false}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  // TC-008: Should apply flash animation when isFlashing=true
  test('TC-008: applies flash styling when isFlashing', () => {
    const { rerender } = render(
      <MenuItemPill
        item={mockItem}
        cartCount={0}
        isFlashing={false}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    const button = screen.getByTestId('menu-item-item-1');
    const normalStyle = button.getAttribute('style');
    
    rerender(
      <MenuItemPill
        item={mockItem}
        cartCount={0}
        isFlashing={true}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    const flashStyle = button.getAttribute('style');
    expect(flashStyle).toContain('scale(1.03)');
  });

});

describe('MenuItemsGrid Component', () => {
  
  const mockItems = [
    { id: '1', name: 'Item 1', customizable: false },
    { id: '2', name: 'Item 2', customizable: true },
    { id: '3', name: 'Item 3', customizable: false },
  ];

  const mockCartCountMap = { '1': 2, '2': 0, '3': 1 };
  const mockOnAddToCart = jest.fn();
  const mockOnCustomize = jest.fn();

  beforeEach(() => {
    mockOnAddToCart.mockClear();
    mockOnCustomize.mockClear();
  });

  // TC-009: Should render all items
  test('TC-009: renders all items', () => {
    render(
      <MenuItemsGrid
        items={mockItems}
        cartCountMap={mockCartCountMap}
        flashItemId={null}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  // TC-010: Should pass correct cartCount to each pill
  test('TC-010: passes correct cartCount to each pill', () => {
    render(
      <MenuItemsGrid
        items={mockItems}
        cartCountMap={mockCartCountMap}
        flashItemId={null}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Item 1 count
    expect(screen.getByText('1')).toBeInTheDocument(); // Item 3 count
  });

  // TC-011: Should only flash the correct item
  test('TC-011: only flashes the correct item', () => {
    render(
      <MenuItemsGrid
        items={mockItems}
        cartCountMap={mockCartCountMap}
        flashItemId="1"
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    const item1 = screen.getByTestId('menu-item-1');
    const item2 = screen.getByTestId('menu-item-2');
    
    expect(item1.getAttribute('style')).toContain('scale(1.03)');
    expect(item2.getAttribute('style')).not.toContain('scale(1.03)');
  });

  // TC-012: Should render empty grid when items is empty
  test('TC-012: renders empty grid when no items', () => {
    const { container } = render(
      <MenuItemsGrid
        items={[]}
        cartCountMap={{}}
        flashItemId={null}
        onAddToCart={mockOnAddToCart}
        onCustomize={mockOnCustomize}
      />
    );
    
    const grid = container.querySelector('.flex.flex-wrap');
    expect(grid.children).toHaveLength(0);
  });

});
