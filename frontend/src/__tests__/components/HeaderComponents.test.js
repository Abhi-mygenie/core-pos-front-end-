/**
 * Test Cases for Header Components
 * 
 * Location: /app/frontend/src/components/header/
 * Purpose: Header sub-components
 */

import { render, screen, fireEvent } from '@testing-library/react';
import ChannelPills from '../../components/header/ChannelPills';
import ViewToggle from '../../components/header/ViewToggle';

describe('ChannelPills Component', () => {
  
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  // TC-001: Should render All button
  test('TC-001: renders All button', () => {
    render(
      <ChannelPills
        activeChannels={['delivery', 'takeAway', 'dineIn']}
        isAllChannels={true}
        isRoomOnly={false}
        onToggle={mockOnToggle}
      />
    );
    
    expect(screen.getByTestId('channel-all')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  // TC-002: Should render all channel buttons
  test('TC-002: renders all channel buttons', () => {
    render(
      <ChannelPills
        activeChannels={['delivery']}
        isAllChannels={false}
        isRoomOnly={false}
        onToggle={mockOnToggle}
      />
    );
    
    expect(screen.getByTestId('channel-delivery')).toBeInTheDocument();
    expect(screen.getByTestId('channel-takeAway')).toBeInTheDocument();
    expect(screen.getByTestId('channel-dineIn')).toBeInTheDocument();
    expect(screen.getByTestId('channel-room')).toBeInTheDocument();
  });

  // TC-003: Should call onToggle with "all" when All clicked
  test('TC-003: calls onToggle with all', () => {
    render(
      <ChannelPills
        activeChannels={['delivery']}
        isAllChannels={false}
        isRoomOnly={false}
        onToggle={mockOnToggle}
      />
    );
    
    fireEvent.click(screen.getByTestId('channel-all'));
    expect(mockOnToggle).toHaveBeenCalledWith('all');
  });

  // TC-004: Should call onToggle with channel id when channel clicked
  test('TC-004: calls onToggle with channel id', () => {
    render(
      <ChannelPills
        activeChannels={['delivery']}
        isAllChannels={false}
        isRoomOnly={false}
        onToggle={mockOnToggle}
      />
    );
    
    fireEvent.click(screen.getByTestId('channel-dineIn'));
    expect(mockOnToggle).toHaveBeenCalledWith('dineIn');
  });

  // TC-005: Should highlight All when isAllChannels is true
  test('TC-005: highlights All when isAllChannels', () => {
    render(
      <ChannelPills
        activeChannels={['delivery', 'takeAway', 'dineIn']}
        isAllChannels={true}
        isRoomOnly={false}
        onToggle={mockOnToggle}
      />
    );
    
    const allButton = screen.getByTestId('channel-all');
    expect(allButton).toHaveStyle({ backgroundColor: expect.stringContaining('rgb') });
  });

  // TC-006: Should highlight Room when isRoomOnly is true
  test('TC-006: highlights Room when isRoomOnly', () => {
    render(
      <ChannelPills
        activeChannels={['room']}
        isAllChannels={false}
        isRoomOnly={true}
        onToggle={mockOnToggle}
      />
    );
    
    const roomButton = screen.getByTestId('channel-room');
    expect(roomButton).toHaveStyle({ color: 'white' });
  });

  // TC-007: Should show channel labels
  test('TC-007: shows channel labels', () => {
    render(
      <ChannelPills
        activeChannels={['delivery']}
        isAllChannels={false}
        isRoomOnly={false}
        onToggle={mockOnToggle}
      />
    );
    
    expect(screen.getByText('Del')).toBeInTheDocument();
    expect(screen.getByText('Take')).toBeInTheDocument();
    expect(screen.getByText('Dine')).toBeInTheDocument();
    expect(screen.getByText('Room')).toBeInTheDocument();
  });

});

describe('ViewToggle Component', () => {
  
  const mockSetActiveView = jest.fn();

  beforeEach(() => {
    mockSetActiveView.mockClear();
  });

  // TC-008: Should render table view button
  test('TC-008: renders table view button', () => {
    render(
      <ViewToggle
        activeView="table"
        setActiveView={mockSetActiveView}
      />
    );
    
    expect(screen.getByTestId('table-view-btn')).toBeInTheDocument();
  });

  // TC-009: Should render order view button
  test('TC-009: renders order view button', () => {
    render(
      <ViewToggle
        activeView="table"
        setActiveView={mockSetActiveView}
      />
    );
    
    expect(screen.getByTestId('order-view-btn')).toBeInTheDocument();
  });

  // TC-010: Should call setActiveView("table") when table view clicked
  test('TC-010: calls setActiveView with table', () => {
    render(
      <ViewToggle
        activeView="order"
        setActiveView={mockSetActiveView}
      />
    );
    
    fireEvent.click(screen.getByTestId('table-view-btn'));
    expect(mockSetActiveView).toHaveBeenCalledWith('table');
  });

  // TC-011: Should call setActiveView("order") when order view clicked
  test('TC-011: calls setActiveView with order', () => {
    render(
      <ViewToggle
        activeView="table"
        setActiveView={mockSetActiveView}
      />
    );
    
    fireEvent.click(screen.getByTestId('order-view-btn'));
    expect(mockSetActiveView).toHaveBeenCalledWith('order');
  });

  // TC-012: Should highlight active view button
  test('TC-012: highlights active view button', () => {
    render(
      <ViewToggle
        activeView="table"
        setActiveView={mockSetActiveView}
      />
    );
    
    const tableBtn = screen.getByTestId('table-view-btn');
    expect(tableBtn).toHaveClass('bg-white');
  });

});
