import { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Create Settings Context
const SettingsContext = createContext(null);

// Settings Provider Component
export const SettingsProvider = ({ children }) => {
  const [cancellationReasons, setCancellationReasonsData] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Set cancellation reasons (called from LoadingPage)
  const setCancellationReasons = useCallback((data) => {
    setCancellationReasonsData(data || []);
    setIsLoaded(true);
  }, []);

  // Clear settings data (on logout)
  const clearSettings = useCallback(() => {
    setCancellationReasonsData([]);
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
    isLoaded,
    
    // Actions
    setCancellationReasons,
    clearSettings,
    
    // Helpers
    getOrderCancellationReasons,
    getItemCancellationReasons,
    getReasonById,
  }), [
    cancellationReasons,
    isLoaded,
    setCancellationReasons,
    clearSettings,
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
