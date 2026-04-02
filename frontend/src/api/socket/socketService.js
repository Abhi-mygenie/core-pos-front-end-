// Socket Service - Core connection manager
// Handles connection lifecycle, reconnection, and event management

import io from 'socket.io-client';
import { SOCKET_CONFIG, CONNECTION_EVENTS } from './socketEvents';

// =============================================================================
// CONNECTION STATUS ENUM
// =============================================================================
export const CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

// =============================================================================
// SOCKET SERVICE CLASS
// =============================================================================
class SocketService {
  constructor() {
    this.socket = null;
    this.status = CONNECTION_STATUS.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.lastConnectedAt = null;
    this.lastError = null;
    this.eventHandlers = new Map(); // Store handlers for cleanup
    this.statusListeners = new Set(); // Listeners for status changes
    // Enable debug mode by default in development
    this.debugMode = process.env.NODE_ENV === 'development' || localStorage.getItem('SOCKET_DEBUG') === 'true';
  }

  // ===========================================================================
  // CONNECTION MANAGEMENT
  // ===========================================================================

  /**
   * Initialize socket connection
   * @param {Object} options - Optional override options
   * @returns {Object} socket instance
   */
  connect(options = {}) {
    // Prevent duplicate connections
    if (this.socket && this.socket.connected) {
      this._log('INFO', 'Already connected, skipping');
      return this.socket;
    }

    this._setStatus(CONNECTION_STATUS.CONNECTING);
    this._log('INFO', `Connecting to ${SOCKET_CONFIG.URL}`);

    // Socket.IO v2 connection options
    const connectionOptions = {
      reconnection: SOCKET_CONFIG.RECONNECTION,
      reconnectionAttempts: SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
      reconnectionDelay: SOCKET_CONFIG.RECONNECTION_DELAY,
      reconnectionDelayMax: SOCKET_CONFIG.RECONNECTION_DELAY_MAX,
      timeout: SOCKET_CONFIG.TIMEOUT,
      transports: ['websocket', 'polling'], // Try websocket first
      ...options,
    };

    // Create socket connection
    this.socket = io(SOCKET_CONFIG.URL, connectionOptions);

    // Setup connection event handlers
    this._setupConnectionHandlers();

    return this.socket;
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this._log('INFO', 'Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this._setStatus(CONNECTION_STATUS.DISCONNECTED);
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Check if socket is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }

  /**
   * Get current connection status
   * @returns {string}
   */
  getStatus() {
    return this.status;
  }

  /**
   * Get socket instance
   * @returns {Object|null}
   */
  getSocket() {
    return this.socket;
  }

  // ===========================================================================
  // EVENT MANAGEMENT
  // ===========================================================================

  /**
   * Subscribe to a socket event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function|null} Unsubscribe function or null if failed
   */
  on(event, handler) {
    if (!this.socket) {
      this._log('WARN', `Cannot subscribe to "${event}" - socket not initialized`);
      return null;
    }

    if (!this.socket.connected) {
      this._log('WARN', `Cannot subscribe to "${event}" - socket not connected`);
      return null;
    }

    // Wrap handler for logging
    const wrappedHandler = (...args) => {
      this._log('DEBUG', `Event received: ${event}`, args);
      handler(...args);
    };

    // Store reference for cleanup
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Map());
    }
    this.eventHandlers.get(event).set(handler, wrappedHandler);

    this.socket.on(event, wrappedHandler);
    this._log('DEBUG', `Subscribed to: ${event}`);
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from a socket event
   * @param {string} event - Event name
   * @param {Function} handler - Original handler function
   */
  off(event, handler) {
    if (!this.socket) return;

    const eventHandlers = this.eventHandlers.get(event);
    if (eventHandlers && eventHandlers.has(handler)) {
      const wrappedHandler = eventHandlers.get(handler);
      this.socket.off(event, wrappedHandler);
      eventHandlers.delete(handler);
      this._log('DEBUG', `Unsubscribed from: ${event}`);
    }
  }

  /**
   * Emit an event to server
   * @param {string} event - Event name
   * @param {*} data - Data to send
   */
  emit(event, data) {
    if (!this.socket || !this.socket.connected) {
      this._log('WARN', `Cannot emit "${event}" - not connected`);
      return false;
    }

    this.socket.emit(event, data);
    this._log('DEBUG', `Emitted: ${event}`, data);
    return true;
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    if (this.socket) {
      this.eventHandlers.forEach((handlers, event) => {
        handlers.forEach((wrappedHandler) => {
          this.socket.off(event, wrappedHandler);
        });
      });
      this.eventHandlers.clear();
      this._log('DEBUG', 'Removed all event listeners');
    }
  }

  // ===========================================================================
  // STATUS LISTENERS
  // ===========================================================================

  /**
   * Subscribe to connection status changes
   * @param {Function} listener - Callback(status, reconnectAttempts)
   * @returns {Function} Unsubscribe function
   */
  onStatusChange(listener) {
    this.statusListeners.add(listener);
    // Immediately call with current status
    listener(this.status, this.reconnectAttempts);
    
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Setup handlers for connection events
   */
  _setupConnectionHandlers() {
    // Connected
    this.socket.on(CONNECTION_EVENTS.CONNECT, () => {
      this._log('INFO', 'Connected successfully');
      this._setStatus(CONNECTION_STATUS.CONNECTED);
      this.lastConnectedAt = new Date();
      this.reconnectAttempts = 0;
      this.lastError = null;
    });

    // Disconnected
    this.socket.on(CONNECTION_EVENTS.DISCONNECT, (reason) => {
      this._log('WARN', `Disconnected: ${reason}`);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, won't auto-reconnect
        this._setStatus(CONNECTION_STATUS.DISCONNECTED);
      } else {
        // Client disconnect or network issue, will auto-reconnect
        this._setStatus(CONNECTION_STATUS.RECONNECTING);
      }
    });

    // Connection error
    this.socket.on(CONNECTION_EVENTS.CONNECT_ERROR, (error) => {
      this._log('ERROR', 'Connection error', error.message);
      this.lastError = error;
      this._setStatus(CONNECTION_STATUS.ERROR);
    });

    // Reconnecting
    this.socket.on(CONNECTION_EVENTS.RECONNECT_ATTEMPT, (attemptNumber) => {
      this.reconnectAttempts = attemptNumber;
      this._log('INFO', `Reconnecting... attempt ${attemptNumber}`);
      this._setStatus(CONNECTION_STATUS.RECONNECTING);
    });

    // Reconnected
    this.socket.on(CONNECTION_EVENTS.RECONNECT, (attemptNumber) => {
      this._log('INFO', `Reconnected after ${attemptNumber} attempts`);
      this._setStatus(CONNECTION_STATUS.CONNECTED);
      this.lastConnectedAt = new Date();
      this.reconnectAttempts = 0;
    });

    // Reconnect error
    this.socket.on(CONNECTION_EVENTS.RECONNECT_ERROR, (error) => {
      this._log('ERROR', 'Reconnect error', error.message);
      this.lastError = error;
    });

    // Reconnect failed (max attempts reached)
    this.socket.on(CONNECTION_EVENTS.RECONNECT_FAILED, () => {
      this._log('ERROR', 'Reconnect failed after max attempts');
      this._setStatus(CONNECTION_STATUS.ERROR);
    });
  }

  /**
   * Update connection status and notify listeners
   * @param {string} newStatus
   */
  _setStatus(newStatus) {
    if (this.status !== newStatus) {
      const oldStatus = this.status;
      this.status = newStatus;
      this._log('DEBUG', `Status changed: ${oldStatus} → ${newStatus}`);
      
      // Notify all listeners
      this.statusListeners.forEach((listener) => {
        try {
          listener(newStatus, this.reconnectAttempts);
        } catch (err) {
          this._log('ERROR', 'Status listener error', err.message);
        }
      });
    }
  }

  /**
   * Internal logging
   * @param {string} level - DEBUG, INFO, WARN, ERROR
   * @param {string} message
   * @param {*} data - Optional data
   */
  _log(level, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[Socket][${timestamp}][${level}]`;

    // Always log WARN and ERROR
    // Log INFO always in development, DEBUG only in debug mode
    if (level === 'ERROR') {
      console.error(prefix, message, data || '');
    } else if (level === 'WARN') {
      console.warn(prefix, message, data || '');
    } else if (level === 'INFO') {
      console.log(prefix, message, data || '');
    } else if (this.debugMode) {
      // DEBUG level - only when debug mode is on
      console.log(prefix, message, data || '');
    }
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    localStorage.setItem('SOCKET_DEBUG', enabled ? 'true' : 'false');
    this._log('INFO', `Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get debug info for troubleshooting
   * @returns {Object}
   */
  getDebugInfo() {
    return {
      status: this.status,
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      lastConnectedAt: this.lastConnectedAt,
      lastError: this.lastError?.message || null,
      registeredEvents: Array.from(this.eventHandlers.keys()),
      socketId: this.socket?.id || null,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================
const socketService = new SocketService();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.__SOCKET_SERVICE__ = socketService;
}

export default socketService;
