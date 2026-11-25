// CR-490: PermissionRoute — extends ProtectedRoute with permission check
// Wraps routes that require specific permissions beyond authentication.
// If user lacks the required permission, redirects to /dashboard.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';

const PermissionRoute = ({ children, requiredAny }) => {
  const { hasAnyPermission } = useAuth();

  // Wrap in ProtectedRoute first (handles auth + context hydration)
  return (
    <ProtectedRoute>
      <PermissionInner requiredAny={requiredAny} hasAnyPermission={hasAnyPermission}>
        {children}
      </PermissionInner>
    </ProtectedRoute>
  );
};

// Renamed PermissionInner (not PermissionGate) to avoid shadowing the existing
// guards/PermissionGate.jsx (CR-069 named export). Behaviour identical.
// Only renders after ProtectedRoute confirms auth + hydration.
const PermissionInner = ({ children, requiredAny, hasAnyPermission }) => {
  if (requiredAny && !hasAnyPermission(requiredAny)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default PermissionRoute;
