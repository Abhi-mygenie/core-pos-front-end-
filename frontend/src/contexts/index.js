/**
 * ⭐ PHASE 3: Socket.IO Integration
 * Added: SocketProvider, useSocket export
 * Modified: 2026-04-01
 */

// Contexts - Export all context providers and hooks

// Providers
export { AuthProvider, useAuth, usePermission } from './AuthContext';
export { RestaurantProvider, useRestaurant } from './RestaurantContext';
export { MenuProvider, useMenu } from './MenuContext';
export { TableProvider, useTables } from './TableContext';
export { SettingsProvider, useSettings } from './SettingsContext';
export { OrderProvider, useOrders } from './OrderContext';
export { SocketProvider, useSocket } from './SocketContext';

// Combined Provider
export { default as AppProviders } from './AppProviders';
