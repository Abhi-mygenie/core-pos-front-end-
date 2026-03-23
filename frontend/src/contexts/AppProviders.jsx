import { AuthProvider } from './AuthContext';
import { RestaurantProvider } from './RestaurantContext';
import { MenuProvider } from './MenuContext';
import { TableProvider } from './TableContext';
import { SettingsProvider } from './SettingsContext';

// Combined App Providers - Wraps all context providers
const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <MenuProvider>
          <TableProvider>
            <SettingsProvider>
              {children}
            </SettingsProvider>
          </TableProvider>
        </MenuProvider>
      </RestaurantProvider>
    </AuthProvider>
  );
};

export default AppProviders;
