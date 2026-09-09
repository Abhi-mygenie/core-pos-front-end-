import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { DEFAULT_PAYMENT_LAYOUT } from '../config/paymentMethods';

// Local storage key for dynamic tables setting
const DYNAMIC_TABLES_STORAGE_KEY = 'mygenie_enable_dynamic_tables';

// Create Settings Context
const SettingsContext = createContext(null);

// Settings Provider Component
export const SettingsProvider = ({ children }) => {
  const [cancellationReasons, setCancellationReasonsData] = useState([]);
  const [paymentLayoutConfig, setPaymentLayoutConfigData] = useState(DEFAULT_PAYMENT_LAYOUT);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Dynamic tables setting - default OFF, persisted in localStorage
  const [enableDynamicTables, setEnableDynamicTablesData] = useState(() => {
    const stored = localStorage.getItem(DYNAMIC_TABLES_STORAGE_KEY);
    return stored === 'true';
  });

  // Set dynamic tables setting
  const setEnableDynamicTables = useCallback((enabled) => {
    setEnableDynamicTablesData(enabled);
    localStorage.setItem(DYNAMIC_TABLES_STORAGE_KEY, String(enabled));
  }, []);

  // Set cancellation reasons (called from LoadingPage)
  const setCancellationReasons = useCallback((data) => {
    setCancellationReasonsData(data || []);
    setIsLoaded(true);
  }, []);

  // Set payment layout config (can be loaded from API or set manually)
  const setPaymentLayoutConfig = useCallback((config) => {
    setPaymentLayoutConfigData(config || DEFAULT_PAYMENT_LAYOUT);
  }, []);

  // Clear settings data (on logout)
  const clearSettings = useCallback(() => {
    setCancellationReasonsData([]);
    setPaymentLayoutConfigData(DEFAULT_PAYMENT_LAYOUT);
    setIsLoaded(false);
  }, []);

  // Get reasons for order cancellation
  const getOrderCancellationReasons = useCallback(() => {
    return cancellationReasons.filter((r) => r.isForOrder);
  }, [cancellationReasons]);

  // Get reasons for item cancellation
  const getItemCancellationReasons = useCallback(() => {
    return cancellationReasons.filter((r) => r.isForItem);
  }, [cancellationReasons]);

  // Get reason by ID
  const getReasonById = useCallback((reasonId) => {
    return cancellationReasons.find((r) => r.reasonId === reasonId) || null;
  }, [cancellationReasons]);

  // Context value
  const value = useMemo(() => ({
    // State
    cancellationReasons,
    paymentLayoutConfig,
    isLoaded,
    enableDynamicTables,
    
    // Actions
    setCancellationReasons,
    setPaymentLayoutConfig,
    clearSettings,
    setEnableDynamicTables,
    
    // Helpers
    getOrderCancellationReasons,
    getItemCancellationReasons,
    getReasonById,
  }), [
    cancellationReasons,
    paymentLayoutConfig,
    isLoaded,
    enableDynamicTables,
    setCancellationReasons,
    setPaymentLayoutConfig,
    clearSettings,
    setEnableDynamicTables,
    getOrderCancellationReasons,
    getItemCancellationReasons,
    getReasonById,
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use Settings Context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
