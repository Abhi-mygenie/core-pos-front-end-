// Socket Context - React context for socket state and methods
// Provides socket connection status and methods to all components

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import socketService, { CONNECTION_STATUS } from '../api/socket/socketService';

// =============================================================================
// CONTEXT CREATION
// =============================================================================
const SocketContext = createContext(null);

// =============================================================================
// SOCKET PROVIDER COMPONENT
// =============================================================================
export const SocketProvider = ({ children }) => {
  // Connection state
  const [status, setStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastConnectedAt, setLastConnectedAt] = useState(null);
  
  // Track if we've initialized to prevent double-connect in StrictMode
  const initializedRef = useRef(false);

  // ===========================================================================
  // CONNECTION LIFECYCLE
  // ===========================================================================

  // Connect immediately on mount (no auth required for socket)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      
      // Connect to socket server
      socketService.connect();

      // Subscribe to status changes
      const unsubscribe = socketService.onStatusChange((newStatus, attempts) => {
        setStatus(newStatus);
        setReconnectAttempts(attempts);
        if (newStatus === CONNECTION_STATUS.CONNECTED) {
          setLastConnectedAt(new Date());
        }
      });

      // Cleanup on unmount
      return () => {
        unsubscribe();
        socketService.disconnect();
        initializedRef.current = false;
      };
    }
  }, []);

  // ===========================================================================
  // BROWSER VISIBILITY HANDLING
  // ===========================================================================

  // Reconnect when tab becomes visible (handles browser sleep/wake)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab is now visible - check connection
        if (!socketService.isConnected()) {
          console.log('[SocketContext] Tab visible, reconnecting...');
          socketService.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ===========================================================================
  // NETWORK ONLINE/OFFLINE HANDLING
  // ===========================================================================

  useEffect(() => {
    const handleOnline = () => {
      if (!socketService.isConnected()) {
        console.log('[SocketContext] Network online, reconnecting...');
        socketService.connect();
      }
    };

    const handleOffline = () => {
      console.log('[SocketContext] Network offline');
      setStatus(CONNECTION_STATUS.DISCONNECTED);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ===========================================================================
  // EXPOSED METHODS
  // ===========================================================================

  /**
   * Subscribe to a socket event
   * @returns {Function|null} Unsubscribe function or null if failed
   */
  const subscribe = useCallback((event, handler) => {
    const unsubscribe = socketService.on(event, handler);
    return unsubscribe; // Will be null if subscription failed
  }, []);

  /**
   * Manually reconnect (for retry button)
   */
  const reconnect = useCallback(() => {
    if (!socketService.isConnected()) {
      socketService.connect();
    }
  }, []);

  /**
   * Get debug info
   */
  const getDebugInfo = useCallback(() => {
    return socketService.getDebugInfo();
  }, []);

  /**
   * Enable/disable debug mode
   */
  const setDebugMode = useCallback((enabled) => {
    socketService.setDebugMode(enabled);
  }, []);

  // ===========================================================================
  // COMPUTED VALUES
  // ===========================================================================

  const isConnected = status === CONNECTION_STATUS.CONNECTED;
  const isReconnecting = status === CONNECTION_STATUS.RECONNECTING;
  const hasError = status === CONNECTION_STATUS.ERROR;

  // ===========================================================================
  // CONTEXT VALUE
  // ===========================================================================

  const value = useMemo(() => ({
    // Status
    status,
    isConnected,
    isReconnecting,
    hasError,
    reconnectAttempts,
    lastConnectedAt,

    // Methods
    subscribe,
    reconnect,
    getDebugInfo,
    setDebugMode,

    // Direct access to service (for advanced usage)
    socketService,
  }), [
    status,
    isConnected,
    isReconnecting,
    hasError,
    reconnectAttempts,
    lastConnectedAt,
    subscribe,
    reconnect,
    getDebugInfo,
    setDebugMode,
  ]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// =============================================================================
// CUSTOM HOOK
// =============================================================================

/**
 * Hook to access socket context
 * @returns {Object} Socket context value
 */
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Hook to get connection status only (for status indicators)
 * @returns {Object} { isConnected, isReconnecting, hasError, status }
 */
export const useSocketStatus = () => {
  const { isConnected, isReconnecting, hasError, status, reconnectAttempts } = useSocket();
  return { isConnected, isReconnecting, hasError, status, reconnectAttempts };
};

/**
 * Hook to subscribe to a specific socket event
 * Automatically cleans up on unmount
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Array} deps - Dependencies for handler (like useEffect deps)
 */
export const useSocketEvent = (event, handler, deps = []) => {
  const { subscribe, isConnected } = useSocket();

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe(event, handler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, subscribe, isConnected, ...deps]);
};

export default SocketContext;
