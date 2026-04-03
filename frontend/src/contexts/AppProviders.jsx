import { AuthProvider } from './AuthContext';
import { SocketProvider } from './SocketContext';
import { RestaurantProvider } from './RestaurantContext';
import { MenuProvider } from './MenuContext';
import { TableProvider } from './TableContext';
import { SettingsProvider } from './SettingsContext';
import { OrderProvider } from './OrderContext';

// Combined App Providers - Wraps all context providers
// Order matters: Auth → Socket → Rest (Socket depends on Auth)
const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <SocketProvider>
        <RestaurantProvider>
          <MenuProvider>
            <TableProvider>
              <SettingsProvider>
                <OrderProvider>
                  {children}
                </OrderProvider>
              </SettingsProvider>
            </TableProvider>
          </MenuProvider>
        </RestaurantProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

export default AppProviders;
