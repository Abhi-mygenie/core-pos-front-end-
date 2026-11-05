// T-06 Test Suite: SocketContext — Auth-gated socket connection
// 13 tests across 3 groups: Auth-Gating, Existing Behavior, Hook Contracts

import React from 'react';
import { render, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock socketService — define mocks INSIDE the factory to avoid hoisting issues
// Access via require() after mock setup
// ---------------------------------------------------------------------------
jest.mock('../../api/socket/socketService', () => ({
  __esModule: true,
  CONNECTION_STATUS: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
  },
  default: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn(() => false),
    onStatusChange: jest.fn(() => jest.fn()),
    on: jest.fn(() => jest.fn()),
    getDebugInfo: jest.fn(() => ({})),
    setDebugMode: jest.fn(),
  },
}));

// Mock useAuth — use a global to control return value
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: jest.fn(() => ({ isAuthenticated: false, token: null })),
}));

// Get references to mocked modules
const mockSocketService = require('../../api/socket/socketService').default;
const { useAuth: mockUseAuth } = require('../../contexts/AuthContext');

// Now import SocketContext (uses mocked deps)
import {
  SocketProvider,
  useSocket,
  useSocketStatus,
} from '../../contexts/SocketContext';

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------
const SocketConsumer = ({ onRender }) => {
  const ctx = useSocket();
  React.useEffect(() => { onRender(ctx); });
  return <div data-testid="socket-consumer">status: {ctx.status}</div>;
};

const StatusConsumer = ({ onRender }) => {
  const status = useSocketStatus();
  React.useEffect(() => { onRender(status); });
  return <div data-testid="status-consumer">{status.status}</div>;
};

// ---------------------------------------------------------------------------
// Reset before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  mockSocketService.isConnected.mockReturnValue(false);
  mockSocketService.onStatusChange.mockReturnValue(jest.fn()); // returns unsubscribe
  mockUseAuth.mockReturnValue({ isAuthenticated: false, token: null });
});

// =============================================================================
// GROUP A — Auth-Gating Behavior (4 tests)
// =============================================================================
describe('Group A: Auth-Gating', () => {

  test('A1: Socket should NOT connect when isAuthenticated = false', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, token: null });

    render(
      <SocketProvider><div>child</div></SocketProvider>
    );

    expect(mockSocketService.connect).not.toHaveBeenCalled();
  });

  test('A2: Socket SHOULD connect when isAuthenticated becomes true', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, token: null });

    const { rerender } = render(
      <SocketProvider><div>child</div></SocketProvider>
    );

    expect(mockSocketService.connect).not.toHaveBeenCalled();

    // Simulate login
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'test-token' });
    rerender(<SocketProvider><div>child</div></SocketProvider>);

    expect(mockSocketService.connect).toHaveBeenCalledTimes(1);
  });

  test('A3: Socket should disconnect when isAuthenticated changes back to false', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'test-token' });

    const { rerender } = render(
      <SocketProvider><div>child</div></SocketProvider>
    );

    expect(mockSocketService.connect).toHaveBeenCalledTimes(1);

    // Simulate logout
    mockUseAuth.mockReturnValue({ isAuthenticated: false, token: null });
    rerender(<SocketProvider><div>child</div></SocketProvider>);

    expect(mockSocketService.disconnect).toHaveBeenCalled();
  });

  test('A4: Socket should NOT reconnect on visibility change when unauthenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, token: null });

    render(
      <SocketProvider><div>child</div></SocketProvider>
    );

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockSocketService.connect).not.toHaveBeenCalled();
  });
});

// =============================================================================
// GROUP B — Existing Socket Behavior (6 tests)
// =============================================================================
describe('Group B: Existing Behavior Preserved', () => {

  test('B1: Socket connects and status listeners are registered when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'test-token' });

    render(
      <SocketProvider><div>child</div></SocketProvider>
    );

    expect(mockSocketService.connect).toHaveBeenCalledTimes(1);
    expect(mockSocketService.onStatusChange).toHaveBeenCalledTimes(1);
    expect(typeof mockSocketService.onStatusChange.mock.calls[0][0]).toBe('function');
  });

  test('B2: Socket reconnects on tab visibility change when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'test-token' });
    mockSocketService.isConnected.mockReturnValue(false);

    render(
      <SocketProvider><div>child</div></SocketProvider>
    );

    expect(mockSocketService.connect).toHaveBeenCalledTimes(1);

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockSocketService.connect).toHaveBeenCalledTimes(2);
  });

  test('B3: Socket reconnects on network online event when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'test-token' });
    mockSocketService.isConnected.mockReturnValue(false);

    render(
      <SocketProvider><div>child</div></SocketProvider>
    );

    expect(mockSocketService.connect).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(mockSocketService.connect).toHaveBeenCalledTimes(2);
  });

  test('B4: Status updates to DISCONNECTED on network offline event', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'test-token' });
    const renderSpy = jest.fn();

    render(
      <SocketProvider>
        <SocketConsumer onRender={renderSpy} />
      </SocketProvider>
    );

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    const lastCall = renderSpy.mock.calls[renderSpy.mock.calls.length - 1][0];
    expect(lastCall.status).toBe('disconnected');
  });

  test('B5: Socket disconnects on provider unmount', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'test-token' });

    const { unmount } = render(
      <SocketProvider><div>child</div></SocketProvider>
    );

    unmount();

    expect(mockSocketService.disconnect).toHaveBeenCalled();
  });

  test('B6: Double-connect prevention — connect called only once on mount', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'test-token' });

    render(
      <SocketProvider><div>child</div></SocketProvider>
    );

    expect(mockSocketService.connect).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// GROUP C — Hook Contract Tests (3 tests)
// =============================================================================
describe('Group C: Hook Contracts', () => {

  test('C1: useSocket() throws if used outside SocketProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const BadComponent = () => {
      useSocket();
      return <div />;
    };

    expect(() => {
      render(<BadComponent />);
    }).toThrow('useSocket must be used within a SocketProvider');

    spy.mockRestore();
  });

  test('C2: useSocketStatus() returns correct status shape', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'test-token' });
    const renderSpy = jest.fn();

    render(
      <SocketProvider>
        <StatusConsumer onRender={renderSpy} />
      </SocketProvider>
    );

    const status = renderSpy.mock.calls[0][0];
    expect(status).toHaveProperty('isConnected');
    expect(status).toHaveProperty('isReconnecting');
    expect(status).toHaveProperty('hasError');
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('reconnectAttempts');
  });

  test('C3: Context value exposes subscribe, reconnect, getDebugInfo, setDebugMode', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'test-token' });
    const renderSpy = jest.fn();

    render(
      <SocketProvider>
        <SocketConsumer onRender={renderSpy} />
      </SocketProvider>
    );

    const ctx = renderSpy.mock.calls[0][0];
    expect(typeof ctx.subscribe).toBe('function');
    expect(typeof ctx.reconnect).toBe('function');
    expect(typeof ctx.getDebugInfo).toBe('function');
    expect(typeof ctx.setDebugMode).toBe('function');
    expect(ctx.socketService).toBeDefined();
  });
});
