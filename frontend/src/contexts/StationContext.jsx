// Station Context - Manages station view state and data

import React, { createContext, useContext, useState, useCallback } from 'react';

const StationContext = createContext();

// LocalStorage key for station view config
const STATION_VIEW_STORAGE_KEY = 'mygenie_station_view_config';

/**
 * StationProvider - Provides station state to the app
 */
export const StationProvider = ({ children }) => {
  // Available stations (extracted from products)
  const [availableStations, setAvailableStations] = useState([]);
  
  // Enabled stations (user preference or all by default)
  const [enabledStations, setEnabledStations] = useState([]);
  
  // Station data (fetched from station-order-list API)
  const [stationData, setStationData] = useState({});
  
  // Station view enabled flag (default OFF on login)
  const [stationViewEnabled, setStationViewEnabled] = useState(false);
  
  // Display mode: 'stacked' or 'accordion'
  const [displayMode, setDisplayMode] = useState('stacked');
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Initialize station config from localStorage or defaults
   * Called after availableStations are set
   */
  const initializeConfig = useCallback((stations) => {
    try {
      const stored = localStorage.getItem(STATION_VIEW_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setStationViewEnabled(parsed.enabled !== false);
        setDisplayMode(parsed.displayMode || 'stacked');
        // Use saved stations if they exist, otherwise all available
        if (parsed.stations && parsed.stations.length > 0) {
          // Filter to only include stations that still exist
          const validStations = parsed.stations.filter(s => stations.includes(s));
          setEnabledStations(validStations.length > 0 ? validStations : stations);
        } else {
          // First time - enable all stations
          setEnabledStations(stations);
        }
      } else {
        // No saved config - station view OFF by default
        setEnabledStations(stations);
        setStationViewEnabled(false);
        setDisplayMode('stacked');
      }
    } catch (e) {
      console.error('[StationContext] Failed to load config:', e);
      setEnabledStations(stations);
    }
  }, []);

  /**
   * Save config to localStorage
   */
  const saveConfig = useCallback(() => {
    try {
      const config = {
        enabled: stationViewEnabled,
        stations: enabledStations,
        displayMode: displayMode,
      };
      localStorage.setItem(STATION_VIEW_STORAGE_KEY, JSON.stringify(config));
      console.log('[StationContext] Config saved:', config);
    } catch (e) {
      console.error('[StationContext] Failed to save config:', e);
    }
  }, [stationViewEnabled, enabledStations, displayMode]);

  /**
   * Update station data for a specific station
   */
  const updateStationData = useCallback((stationName, data) => {
    setStationData(prev => ({
      ...prev,
      [stationName]: data,
    }));
  }, []);

  /**
   * Set all station data at once
   */
  const setAllStationData = useCallback((data) => {
    setStationData(data);
  }, []);

  /**
   * Toggle a station on/off
   */
  const toggleStation = useCallback((stationName) => {
    setEnabledStations(prev => {
      if (prev.includes(stationName)) {
        return prev.filter(s => s !== stationName);
      } else {
        return [...prev, stationName];
      }
    });
  }, []);

  /**
   * Check if a station is enabled
   */
  const isStationEnabled = useCallback((stationName) => {
    return enabledStations.includes(stationName);
  }, [enabledStations]);

  const value = {
    // State
    availableStations,
    enabledStations,
    stationData,
    stationViewEnabled,
    displayMode,
    isLoading,
    
    // Setters
    setAvailableStations,
    setEnabledStations,
    setStationViewEnabled,
    setDisplayMode,
    setIsLoading,
    
    // Actions
    initializeConfig,
    saveConfig,
    updateStationData,
    setAllStationData,
    toggleStation,
    isStationEnabled,
  };

  return (
    <StationContext.Provider value={value}>
      {children}
    </StationContext.Provider>
  );
};

/**
 * Hook to use station context
 */
export const useStations = () => {
  const context = useContext(StationContext);
  if (!context) {
    throw new Error('useStations must be used within a StationProvider');
  }
  return context;
};

export default StationContext;
