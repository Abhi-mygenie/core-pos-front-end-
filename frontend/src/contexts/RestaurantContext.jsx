import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { setRestaurantRef } from '../utils/restaurantRef';

// Create Restaurant Context
const RestaurantContext = createContext(null);

// Restaurant Provider Component
export const RestaurantProvider = ({ children }) => {
  const [restaurant, setRestaurantData] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // POS2-007 Phase 1 — bridge restaurant snapshot to NotificationContext via
  // a module-level ref. NotificationProvider mounts OUTSIDE RestaurantProvider
  // (AppProviders.jsx:13-35), so it cannot call useRestaurant(). The ref is
  // updated synchronously after every restaurant state change; consumers
  // (e.g. NotificationContext.processNotification) read it lazily at
  // FCM-arrival time. Cleared on unmount/logout.
  useEffect(() => {
    setRestaurantRef(restaurant);
    return () => setRestaurantRef(null);
  }, [restaurant]);

  // Set restaurant data (called from LoadingPage)
  const setRestaurant = useCallback((data) => {
    setRestaurantData(data);
    setIsLoaded(true);
  }, []);

  // Clear restaurant data (on logout)
  const clearRestaurant = useCallback(() => {
    setRestaurantData(null);
    setIsLoaded(false);
  }, []);

  // Get currency symbol
  const currencySymbol = useMemo(() => {
    return restaurant?.currencySymbol || '₹';
  }, [restaurant]);

  // Get features
  const features = useMemo(() => {
    return restaurant?.features || {
      dineIn: false,
      delivery: false,
      takeaway: false,
      room: false,
    };
  }, [restaurant]);

  // Get cancellation rules
  const cancellation = useMemo(() => {
    return restaurant?.cancellation || {
      allowPostServeCancel: false,
      allowPostServeCancel2: false,
      orderCancelWindowMinutes: 0,
      itemCancelWindowMinutes: 0,
    };
  }, [restaurant]);

  // Get default order status for confirm action
  const defaultOrderStatus = useMemo(() => {
    return restaurant?.defaultOrderStatus || 'paid';
  }, [restaurant]);

  // Get settings (auto print, etc.)
  const settings = useMemo(() => {
    return restaurant?.settings || {
      autoKot: false,
      autoBill: false,
    };
  }, [restaurant]);

  // Get payment types
  const paymentTypes = useMemo(() => {
    return restaurant?.paymentTypes || [];
  }, [restaurant]);

  // Get discount types
  const discountTypes = useMemo(() => {
    return restaurant?.discountTypes || [];
  }, [restaurant]);

  // Get printers
  const printers = useMemo(() => {
    return restaurant?.printers || [];
  }, [restaurant]);

  // CR-POS2-003 (May-2026): per-station printer agents from profile mapping.
  // Consumed by Module 14 print flow + Module 4 place-order builders.
  const printerAgents = useMemo(() => {
    return restaurant?.printerAgents || [];
  }, [restaurant]);

  // Context value
  const value = useMemo(() => ({
    // State
    restaurant,
    isLoaded,
    
    // Derived
    currencySymbol,
    features,
    cancellation,
    defaultOrderStatus,
    settings,
    paymentTypes,
    discountTypes,
    printers,
    printerAgents,
    
    // Actions
    setRestaurant,
    clearRestaurant,
  }), [
    restaurant,
    isLoaded,
    currencySymbol,
    features,
    cancellation,
    defaultOrderStatus,
    settings,
    paymentTypes,
    discountTypes,
    printers,
    printerAgents,
    setRestaurant,
    clearRestaurant,
  ]);

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
};

// Custom hook to use Restaurant Context
export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};

export default RestaurantContext;
