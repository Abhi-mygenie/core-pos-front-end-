// ProtectedRoute — blocks rendering for unauthenticated users
// T-07: CRIT-003 fix
// CR-001 (Fix B2): also redirects authenticated users with empty contexts
// (typical on a hard refresh of a deep-linked route) through /loading so
// every context (Restaurant, Auth user/perms, Menu, Tables, Settings,
// Orders, Stations) gets hydrated, then back to the originally requested URL.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRestaurant } from '../../contexts/RestaurantContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { isLoaded } = useRestaurant();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Authenticated but contexts not yet hydrated. The only hydration path in
  // the app is LoadingPage, so route through it and return to the originally
  // requested URL afterwards. The `!== '/loading'` guard prevents an infinite
  // redirect loop if the user lands directly on /loading.
  if (!isLoaded && location.pathname !== '/loading') {
    return (
      <Navigate
        to="/loading"
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
