import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, vendorAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch profile after login
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const data = await vendorAPI.getProfile();
      
      setProfile(data);
      setUser({
        id: data.emp_id,
        firstName: data.emp_f_name,
        lastName: data.emp_l_name,
        email: data.emp_email,
        roleName: data.role_name,
      });
      setRoles(data.role || []);
      
      // Set first restaurant as active
      if (data.restaurants && data.restaurants.length > 0) {
        setRestaurant(data.restaurants[0]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Login function
  const login = async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await authAPI.login(email, password);
      
      // Store token
      localStorage.setItem('authToken', data.token);
      setToken(data.token);
      
      // Set initial user data from login response
      setUser({
        roleName: data.role_name,
      });
      setRoles(data.role || []);
      
      return { success: true, data };
    } catch (err) {
      const message = err.response?.data?.errors?.[0]?.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    setProfile(null);
    setRestaurant(null);
    setRoles([]);
  };

  // Check if user has a specific role/permission
  const hasPermission = (permission) => {
    return roles.includes(permission);
  };

  // Update restaurant data locally (for optimistic updates)
  const updateRestaurantLocal = (updates) => {
    setRestaurant(prev => ({ ...prev, ...updates }));
  };

  // Fetch profile on mount if token exists
  useEffect(() => {
    if (token && !profile) {
      fetchProfile();
    }
  }, [token, profile, fetchProfile]);

  const value = {
    token,
    user,
    profile,
    restaurant,
    roles,
    isLoading,
    error,
    isAuthenticated: !!token,
    login,
    logout,
    fetchProfile,
    hasPermission,
    updateRestaurantLocal,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
