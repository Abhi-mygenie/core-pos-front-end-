/**
 * ⭐ PHASE 3: Socket.IO Integration
 * Added: SocketProvider
 * Modified: 2026-04-01
 */

import { AuthProvider } from './AuthContext';
import { RestaurantProvider } from './RestaurantContext';
import { MenuProvider } from './MenuContext';
import { TableProvider } from './TableContext';
import { SettingsProvider } from './SettingsContext';
import { OrderProvider } from './OrderContext';
import { SocketProvider } from './SocketContext';

// Combined App Providers - Wraps all context providers
// ⭐ PHASE 3: SocketProvider wraps OrderProvider to access order context
const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <MenuProvider>
          <TableProvider>
            <SettingsProvider>
              <OrderProvider>
                <SocketProvider>
                  {children}
                </SocketProvider>
              </OrderProvider>
            </SettingsProvider>
          </TableProvider>
        </MenuProvider>
      </RestaurantProvider>
    </AuthProvider>
  );
};

export default AppProviders;
