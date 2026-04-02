/**
 * ⭐ PHASE 3: Socket.IO Integration
 * Socket Service - Manages WebSocket connection and event handling
 * Created: 2026-04-01
 */

import { io } from 'socket.io-client';

// Socket configuration
const SOCKET_URL = 'https://presocket.mygenie.online';
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

// Connection states
export const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

// Event types
export const SOCKET_EVENTS = {
  NEW_ORDER: 'new-order',
  SCAN_NEW_ORDER: 'scan-new-order',
  UPDATE_ORDER: 'update-order',
  UPDATE_FOOD_STATUS: 'update-food-status',
  UPDATE_ORDER_STATUS: 'update-order-status',
  UPDATE_TABLE: 'update-table',
  // ⭐ PHASE 3: Added delivery-assign-order event
  DELIVERY_ASSIGN_ORDER: 'delivery-assign-order',
};

// Statuses that mean order should be removed from context
export const REMOVE_ORDER_STATUSES = [3, 6]; // 3=Cancelled, 6=Paid

class SocketService {
  constructor() {
    this.socket = null;
    this.restaurantId = null;
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.reconnectAttempt = 0;
    this.lastDisconnectTime = null;
    this.listeners = new Map();
    
    // Debounce tracking
    this.recentEvents = new Map();
    this.DEBOUNCE_MS = 500;
    
    // In-flight API calls tracking
    this.inFlightOrders = new Set();
    
    // Event handlers (will be set by SocketContext)
    this.onConnectionStateChange = null;
    this.onNewOrder = null;
    this.onUpdateOrder = null;
    this.onUpdateTable = null;
    this.onError = null;
  }

  /**
   * Connect to Socket.IO server
   * @param {number|string} restaurantId - Restaurant ID for channel subscription
   */
  connect(restaurantId) {
    if (this.socket?.connected && this.restaurantId === restaurantId) {
      console.log('[Socket] Already connected');
      return;
    }

    this.restaurantId = restaurantId;
    this.connectionState = CONNECTION_STATES.CONNECTING;
    this._notifyStateChange();

    console.log(`[Socket] Connecting to ${SOCKET_URL}...`);

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 16000,
      timeout: 20000,
    });

    this._setupEventHandlers();
  }

  /**
   * Setup socket event handlers
   */
  _setupEventHandlers() {
    // Connection events
    this.socket.on('connect', () => {
      console.log(`[Socket] Connected ✓ (id: ${this.socket.id})`);
      this.connectionState = CONNECTION_STATES.CONNECTED;
      this.reconnectAttempt = 0;
      this._notifyStateChange();
      
      // Check if we were disconnected for a long time
      if (this.lastDisconnectTime) {
        const disconnectDuration = Date.now() - this.lastDisconnectTime;
        if (disconnectDuration > 5 * 60 * 1000) { // > 5 minutes
          console.log('[Socket] Long disconnect detected, triggering full refresh');
          this._triggerFullRefresh();
        }
        this.lastDisconnectTime = null;
      }
      
      // Subscribe to channels
      this._subscribeToChannels();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected (reason: ${reason})`);
      this.lastDisconnectTime = Date.now();
      this.connectionState = CONNECTION_STATES.DISCONNECTED;
      this._notifyStateChange();
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.connectionState = CONNECTION_STATES.ERROR;
      this._notifyStateChange();
      this.onError?.(error);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`[Socket] Reconnecting... (attempt ${attempt}/${RECONNECT_ATTEMPTS})`);
      this.reconnectAttempt = attempt;
      this.connectionState = CONNECTION_STATES.RECONNECTING;
      this._notifyStateChange();
    });

    this.socket.on('reconnect', () => {
      console.log('[Socket] Reconnected ✓');
      this.connectionState = CONNECTION_STATES.CONNECTED;
      this.reconnectAttempt = 0;
      this._notifyStateChange();
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after max attempts');
      this.connectionState = CONNECTION_STATES.ERROR;
      this._notifyStateChange();
    });
  }

  /**
   * Subscribe to restaurant-specific channels
   * ⭐ PHASE 3 FIX: Changed to spread args (...args) to capture all Socket.IO arguments
   */
  _subscribeToChannels() {
    if (!this.restaurantId) return;

    const orderChannel = `new_order_${this.restaurantId}`;
    const tableChannel = `update_table_${this.restaurantId}`;

    console.log(`[Socket] Subscribing to: ${orderChannel}, ${tableChannel}`);

    // Order channel events - Socket.IO passes multiple args, not single array
    this.socket.on(orderChannel, (...args) => {
      this._handleOrderChannelEvent(args);
    });

    // Table channel events - Socket.IO passes multiple args, not single array
    this.socket.on(tableChannel, (...args) => {
      this._handleTableChannelEvent(args);
    });
  }

  /**
   * Handle events from new_order_{restaurantId} channel
   * @param {Array} data - Event payload array
   */
  _handleOrderChannelEvent(data) {
    if (!Array.isArray(data) || data.length < 4) {
      console.warn('[Socket] Invalid order event payload:', data);
      return;
    }

    const [eventType, orderId, restaurantId, statusOrData, fullData] = data;
    
    console.log(`[Socket] ← ${eventType} | order_id: ${orderId} | status: ${statusOrData}`);

    // Deduplicate events
    if (this._isDuplicate(eventType, orderId)) {
      console.log(`[Socket] Skipped duplicate: ${eventType}/${orderId}`);
      return;
    }

    switch (eventType) {
      case SOCKET_EVENTS.NEW_ORDER:
        // Full data in payload, no API call needed
        this._handleNewOrder(orderId, statusOrData, fullData);
        break;

      case SOCKET_EVENTS.SCAN_NEW_ORDER:
        // Needs API call to get full order data
        this._handleScanNewOrder(orderId, statusOrData);
        break;

      case SOCKET_EVENTS.UPDATE_ORDER:
        // Needs API call
        this._handleUpdateOrder(orderId, statusOrData);
        break;

      case SOCKET_EVENTS.UPDATE_FOOD_STATUS:
        // Needs API call
        this._handleUpdateFoodStatus(orderId, statusOrData);
        break;

      case SOCKET_EVENTS.UPDATE_ORDER_STATUS:
        // Needs API call (or remove if paid/cancelled)
        this._handleUpdateOrderStatus(orderId, statusOrData);
        break;

      // ⭐ PHASE 3: Added delivery-assign-order handler
      case SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER:
        // Payload: [event, orderId, restaurantId, deliveryManId]
        this._handleDeliveryAssignOrder(orderId, statusOrData); // statusOrData = deliveryManId
        break;

      default:
        console.log(`[Socket] Unknown event type: ${eventType}`);
    }
  }

  /**
   * Handle events from update_table_{restaurantId} channel
   * @param {Array} data - Event payload array
   */
  _handleTableChannelEvent(data) {
    if (!Array.isArray(data) || data.length < 4) {
      console.warn('[Socket] Invalid table event payload:', data);
      return;
    }

    const [eventType, tableId, restaurantId, engageStatus] = data;
    
    console.log(`[Socket] ← ${eventType} | table_id: ${tableId} | status: ${engageStatus}`);

    if (eventType === SOCKET_EVENTS.UPDATE_TABLE) {
      this._handleUpdateTable(tableId, engageStatus);
    }
  }

  /**
   * Handle new-order event (full data in payload)
   */
  _handleNewOrder(orderId, status, fullData) {
    if (!fullData?.orders?.[0]) {
      console.warn('[Socket] new-order missing order data');
      return;
    }

    const rawOrder = fullData.orders[0];
    console.log(`[Socket] New order #${orderId} (Table: ${rawOrder.table_id || 'Walk-in'})`);
    
    this.onNewOrder?.({
      type: 'new-order',
      orderId,
      rawOrder,
      requiresApiCall: false,
    });
  }

  /**
   * Handle scan-new-order event (needs API call)
   */
  _handleScanNewOrder(orderId, status) {
    console.log(`[Socket] Scan new order #${orderId} (status: ${status}) → needs Accept/Reject`);
    
    this.onUpdateOrder?.({
      type: 'scan-new-order',
      orderId,
      status,
      requiresApiCall: true,
    });
  }

  /**
   * Handle update-order event (needs API call)
   */
  _handleUpdateOrder(orderId, status) {
    console.log(`[Socket] Update order #${orderId} → fetching...`);
    
    this.onUpdateOrder?.({
      type: 'update-order',
      orderId,
      status,
      requiresApiCall: true,
    });
  }

  /**
   * Handle update-food-status event (needs API call)
   */
  _handleUpdateFoodStatus(orderId, foodStatus) {
    console.log(`[Socket] Food status update #${orderId} → status: ${foodStatus}`);
    
    this.onUpdateOrder?.({
      type: 'update-food-status',
      orderId,
      foodStatus,
      requiresApiCall: true,
    });
  }

  /**
   * Handle update-order-status event
   */
  _handleUpdateOrderStatus(orderId, fOrderStatus) {
    console.log(`[Socket] Order status update #${orderId} → f_order_status: ${fOrderStatus}`);
    
    // If paid (6) or cancelled (3), remove from context without API call
    if (REMOVE_ORDER_STATUSES.includes(fOrderStatus)) {
      console.log(`[Socket] Order #${orderId} is ${fOrderStatus === 6 ? 'paid' : 'cancelled'} → removing`);
      this.onUpdateOrder?.({
        type: 'update-order-status',
        orderId,
        fOrderStatus,
        requiresApiCall: false,
        shouldRemove: true,
      });
    } else {
      // Fetch fresh data
      this.onUpdateOrder?.({
        type: 'update-order-status',
        orderId,
        fOrderStatus,
        requiresApiCall: true,
      });
    }
  }

  /**
   * Handle update-table event (no API call)
   */
  _handleUpdateTable(tableId, engageStatus) {
    // tableId=0 means walk-in/dynamic table, skip
    if (tableId === 0) {
      console.log('[Socket] Walk-in table update, skipping');
      return;
    }

    const isEngaged = engageStatus === 'engage';
    console.log(`[Socket] Table #${tableId} → ${isEngaged ? 'engaged' : 'free'}`);
    
    this.onUpdateTable?.({
      type: 'update-table',
      tableId,
      isEngaged,
      engageStatus, // 'engage' or 'free'
    });
  }

  /**
   * ⭐ PHASE 3: Handle delivery-assign-order event (needs API call)
   */
  _handleDeliveryAssignOrder(orderId, deliveryManId) {
    console.log(`[Socket] Delivery assigned: order #${orderId} → driver #${deliveryManId}`);
    
    this.onUpdateOrder?.({
      type: 'delivery-assign-order',
      orderId,
      deliveryManId,
      requiresApiCall: true,
    });
  }

  /**
   * Check if event is a duplicate (same event+orderId within debounce window)
   */
  _isDuplicate(eventType, orderId) {
    const key = `${eventType}:${orderId}`;
    const lastTime = this.recentEvents.get(key);
    const now = Date.now();

    if (lastTime && (now - lastTime) < this.DEBOUNCE_MS) {
      return true;
    }

    this.recentEvents.set(key, now);
    
    // Cleanup old entries periodically
    if (this.recentEvents.size > 100) {
      const cutoff = now - this.DEBOUNCE_MS * 2;
      for (const [k, t] of this.recentEvents) {
        if (t < cutoff) this.recentEvents.delete(k);
      }
    }

    return false;
  }

  /**
   * Notify connection state change
   */
  _notifyStateChange() {
    this.onConnectionStateChange?.(this.connectionState, this.reconnectAttempt);
  }

  /**
   * Trigger full data refresh (after long disconnect)
   */
  _triggerFullRefresh() {
    // This will be handled by SocketContext
    this.onConnectionStateChange?.(CONNECTION_STATES.CONNECTED, 0, { requiresRefresh: true });
  }

  /**
   * Check if order is currently being fetched
   */
  isOrderInFlight(orderId) {
    return this.inFlightOrders.has(orderId);
  }

  /**
   * Mark order as being fetched
   */
  setOrderInFlight(orderId, inFlight) {
    if (inFlight) {
      this.inFlightOrders.add(orderId);
    } else {
      this.inFlightOrders.delete(orderId);
    }
  }

  /**
   * Disconnect from socket server
   */
  disconnect() {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.restaurantId = null;
      this.connectionState = CONNECTION_STATES.DISCONNECTED;
      this.recentEvents.clear();
      this.inFlightOrders.clear();
      this._notifyStateChange();
    }
  }

  /**
   * Manual reconnect
   */
  reconnect() {
    if (this.restaurantId) {
      console.log('[Socket] Manual reconnect requested');
      this.disconnect();
      setTimeout(() => {
        this.connect(this.restaurantId);
      }, 500);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connectionState === CONNECTION_STATES.CONNECTED;
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
