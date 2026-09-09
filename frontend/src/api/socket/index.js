// Socket Module - Main exports
// Central export point for all socket-related modules

// Service
export { default as socketService, CONNECTION_STATUS } from './socketService';

// Events & Constants
export {
  SOCKET_CONFIG,
  SOCKET_EVENTS,
  AGGREGATOR_EVENTS,
  CONNECTION_EVENTS,
  EVENTS_WITH_PAYLOAD,
  EVENTS_REQUIRING_ORDER_API,
  EVENTS_REQUIRING_AGGREGATOR_API,
  EVENTS_TABLE_UPDATE,
  TABLE_STATUS_MAP,
  MSG_INDEX,
  // Channel generators
  getOrderChannel,
  getTableChannel,
  getAggregatorChannel,
} from './socketEvents';

// Handlers
export {
  handleNewOrder,
  handleUpdateOrder,
  handleUpdateFoodStatus,
  handleUpdateOrderStatus,
  handleScanNewOrder,
  handleDeliveryAssignOrder,
  handleUpdateTable,
  getHandler,
  isAsyncHandler,
} from './socketHandlers';

// Hooks
export { useSocketEvents } from './useSocketEvents';
