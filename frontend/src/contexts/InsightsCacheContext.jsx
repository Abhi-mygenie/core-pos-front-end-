/**
 * InsightsCacheContext — CR-044
 * React context for shared date range across Insights reports.
 * Cache logic lives in api/services/insightsCache.js (module-level).
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { clearInsightsCache } from '../api/services/insightsCache';

const InsightsCacheContext = createContext(null);

export const InsightsCacheProvider = ({ children }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [sharedFrom, setSharedFrom] = useState(today);
  const [sharedTo, setSharedTo] = useState(today);
  // BUG-136: Sidebar scroll position persistence across navigations
  const [sidebarScrollTop, setSidebarScrollTop] = useState(0);

  const resetAll = useCallback(() => {
    clearInsightsCache();
    setSharedFrom(today);
    setSharedTo(today);
  }, [today]);

  return (
    <InsightsCacheContext.Provider value={{
      sharedFrom, sharedTo, setSharedFrom, setSharedTo, resetAll,
      sidebarScrollTop, setSidebarScrollTop, // BUG-136
    }}>
      {children}
    </InsightsCacheContext.Provider>
  );
};

export const useInsightsCache = () => {
  const ctx = useContext(InsightsCacheContext);
  if (!ctx) throw new Error('useInsightsCache must be used within InsightsCacheProvider');
  return ctx;
};

export const useInsightsCacheSafe = () => useContext(InsightsCacheContext);
