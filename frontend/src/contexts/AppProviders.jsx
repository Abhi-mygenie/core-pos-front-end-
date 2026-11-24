import { AuthProvider } from './AuthContext';
import { SocketProvider } from './SocketContext';
import { RestaurantProvider } from './RestaurantContext';
import { MenuProvider } from './MenuContext';
import { TableProvider } from './TableContext';
import { SettingsProvider } from './SettingsContext';
import { OrderProvider } from './OrderContext';
import { StationProvider } from './StationContext';
import { NotificationProvider } from './NotificationContext';
import YtcFcmHydrator from '../components/notifications/YtcFcmHydrator';

// Combined App Providers - Wraps all context providers
// Order matters: Auth → Socket → Notification → Rest
// YtcFcmHydrator must sit under OrderProvider so YTC FCM during /loading is not lost.
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
                    <YtcFcmHydrator />
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
