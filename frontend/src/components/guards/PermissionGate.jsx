// CR-069: Permission Gate — hides children when user lacks permission (OQ-10: complete hide)
import { useAuth } from '@/contexts/AuthContext';

export function PermissionGate({ permission, permissions, children, fallback = null }) {
  const { hasPermission, hasAnyPermission } = useAuth();

  const allowed = permission
    ? hasPermission(permission)
    : permissions
      ? hasAnyPermission(permissions)
      : true;

  return allowed ? children : fallback;
}

export function usePermission(permission) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}
