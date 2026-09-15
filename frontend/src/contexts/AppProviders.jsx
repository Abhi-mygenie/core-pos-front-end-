import { AuthProvider } from './AuthContext';
import { SocketProvider } from './SocketContext';
import { RestaurantProvider } from './RestaurantContext';
import { MenuProvider } from './MenuContext';
import { TableProvider } from './TableContext';
import { SettingsProvider } from './SettingsContext';
import { OrderProvider } from './OrderContext';
import { StationProvider } from './StationContext';
import { NotificationProvider } from './NotificationContext';

// Combined App Providers - Wraps all context providers
// Order matters: Auth → Socket → Notification → Rest
const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <RestaurantProvider>
            <MenuProvider>
              <TableProvider>
                <SettingsProvider>
                  <OrderProvider>
                    <StationProvider>
                      {children}
                    </StationProvider>
                  </OrderProvider>
                </SettingsProvider>
              </TableProvider>
            </MenuProvider>
          </RestaurantProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

export default AppProviders;
