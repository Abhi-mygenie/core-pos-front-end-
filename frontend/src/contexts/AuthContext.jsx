import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import * as authService from '../api/services/authService';

// Create Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(authService.getToken());
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check if authenticated
  const isAuthenticated = useMemo(() => !!token, [token]);

  // Login function
  const login = useCallback(async (credentials, rememberMe = false) => {
    setIsLoading(true);
    try {
      const authData = await authService.login(credentials, rememberMe);
      setToken(authData.token);
      setPermissions(authData.permissions || []);
      return authData;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    authService.logout();
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    setPermissions([]);
  }, []);

  // Set user data (called from LoadingPage after profile fetch)
  const setUserData = useCallback((userData, perms) => {
    setUser(userData);
    if (perms && perms.length > 0) {
      setPermissions(perms);
    }
  }, []);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission) => {
    return permissions.includes(permission);
  }, [permissions]);

  // Check if user has any of the given permissions
  const hasAnyPermission = useCallback((perms) => {
    return perms.some((perm) => permissions.includes(perm));
  }, [permissions]);

  // Check if user has all of the given permissions
  const hasAllPermissions = useCallback((perms) => {
    return perms.every((perm) => permissions.includes(perm));
  }, [permissions]);

  // Context value
  const value = useMemo(() => ({
    // State
    token,
    user,
    permissions,
    isAuthenticated,
    isLoading,
    
    // Actions
    login,
    logout,
    setUserData,
    
    // Helpers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }), [
    token, 
    user, 
    permissions, 
    isAuthenticated, 
    isLoading, 
    login, 
    logout, 
    setUserData,
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use Auth Context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Custom hook to check a single permission
export const usePermission = (permission) => {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
};

export default AuthContext;
