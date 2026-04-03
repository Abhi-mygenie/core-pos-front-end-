import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { TABLE_STATUS } from '../api/constants';
import * as tableService from '../api/services/tableService';

// Create Table Context
const TableContext = createContext(null);

// Table Provider Component
export const TableProvider = ({ children }) => {
  // Single unified array - includes both tables (isRoom=false) and rooms (isRoom=true)
  const [tables, setTablesData] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Set tables (called from LoadingPage) - includes both tables and rooms
  const setTables = useCallback((data) => {
    setTablesData(data || []);
    setIsLoaded(true);
  }, []);

  // Clear tables data (on logout)
  const clearTables = useCallback(() => {
    setTablesData([]);
    setIsLoaded(false);
  }, []);

  // Refresh tables — re-fetch and update context
  const refreshTables = useCallback(async () => {
    const fresh = await tableService.getTables();
    setTablesData(fresh || []);
  }, []);

  // ===========================================================================
  // SOCKET UPDATE FUNCTIONS
  // ===========================================================================

  /**
   * Update table status from socket event
   * @param {number} tableId - Table ID (0 = walk-in/takeaway/delivery, skip update)
   * @param {string} status - New status ('occupied', 'available', etc.)
   */
  const updateTableStatus = useCallback((tableId, status) => {
    // Skip if tableId is 0 (walk-in/takeaway/delivery - not a physical table)
    if (tableId === 0) {
      console.log('[TableContext] updateTableStatus: Skipping tableId=0 (walk-in/takeaway/delivery)');
      return;
    }

    if (!tableId || !status) {
      console.warn('[TableContext] updateTableStatus: Invalid params', { tableId, status });
      return;
    }

    setTablesData(prev => {
      const tableExists = prev.some(t => t.tableId === tableId);
      if (!tableExists) {
        console.warn('[TableContext] updateTableStatus: Table not found', tableId);
        return prev;
      }

      console.log('[TableContext] updateTableStatus:', tableId, '→', status);
      return prev.map(t => {
        if (t.tableId === tableId) {
          return {
            ...t,
            status: status,
            isOccupied: status === 'occupied',
          };
        }
        return t;
      });
    });
  }, []);

  // ===========================================================================
  // COMPUTED & HELPERS
  // ===========================================================================

  // Get unique sections from all tables/rooms
  const sections = useMemo(() => {
    const sectionSet = new Set();
    tables.forEach((table) => {
      sectionSet.add(table.sectionName || 'Default');
    });
    return Array.from(sectionSet).sort();
  }, [tables]);

  // Get table/room by ID (works for both)
  const getTableById = useCallback((tableId) => {
    return tables.find((t) => t.tableId === tableId) || null;
  }, [tables]);

  // Get table/room by number (works for both)
  const getTableByNumber = useCallback((tableNumber) => {
    return tables.find((t) => t.tableNumber === tableNumber) || null;
  }, [tables]);

  // Get tables/rooms by section (works for both)
  const getTablesBySection = useCallback((sectionName) => {
    if (!sectionName || sectionName === 'All') return tables;
    return tables.filter((t) => (t.sectionName || 'Default') === sectionName);
  }, [tables]);

  // Get tables/rooms grouped by section (works for both)
  const getTablesGroupedBySection = useCallback(() => {
    const grouped = {};
    tables.forEach((table) => {
      const section = table.sectionName || 'Default';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(table);
    });
    return grouped;
  }, [tables]);

  // Filter by status (works for both)
  const filterByStatus = useCallback((status) => {
    if (!status || status === 'all') return tables;
    return tables.filter((t) => t.status === status);
  }, [tables]);

  // Get available (free) tables/rooms (works for both)
  const getAvailableTables = useCallback(() => {
    return tables.filter((t) => t.status === TABLE_STATUS.FREE);
  }, [tables]);

  // Get occupied tables/rooms (works for both)
  const getOccupiedTables = useCallback(() => {
    return tables.filter((t) => t.isOccupied);
  }, [tables]);

  // Search tables/rooms by number (works for both)
  const searchTables = useCallback((searchTerm) => {
    if (!searchTerm) return tables;
    const term = searchTerm.toLowerCase();
    return tables.filter((t) =>
      t.tableNumber.toLowerCase().includes(term) ||
      t.displayName.toLowerCase().includes(term)
    );
  }, [tables]);

  // Context value
  const value = useMemo(() => ({
    // State (unified - includes tables and rooms)
    tables,
    sections,
    isLoaded,
    
    // Actions
    setTables,
    clearTables,
    refreshTables,

    // Socket Update Actions
    updateTableStatus,
    
    // Helpers (work for both tables and rooms)
    getTableById,
    getTableByNumber,
    getTablesBySection,
    getTablesGroupedBySection,
    filterByStatus,
    getAvailableTables,
    getOccupiedTables,
    searchTables,
  }), [
    tables,
    sections,
    isLoaded,
    setTables,
    clearTables,
    refreshTables,
    updateTableStatus,
    getTableById,
    getTableByNumber,
    getTablesBySection,
    getTablesGroupedBySection,
    filterByStatus,
    getAvailableTables,
    getOccupiedTables,
    searchTables,
  ]);

  return (
    <TableContext.Provider value={value}>
      {children}
    </TableContext.Provider>
  );
};

// Custom hook to use Table Context
export const useTables = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('useTables must be used within a TableProvider');
  }
  return context;
};

export default TableContext;
