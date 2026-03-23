import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { TABLE_STATUS } from '../api/constants';

// Create Table Context
const TableContext = createContext(null);

// Table Provider Component
export const TableProvider = ({ children }) => {
  const [tables, setTablesData] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Set tables (called from LoadingPage)
  const setTables = useCallback((data) => {
    setTablesData(data || []);
    setIsLoaded(true);
  }, []);

  // Clear tables data (on logout)
  const clearTables = useCallback(() => {
    setTablesData([]);
    setIsLoaded(false);
  }, []);

  // Get unique sections from tables
  const sections = useMemo(() => {
    const sectionSet = new Set();
    tables.forEach((table) => {
      sectionSet.add(table.sectionName || 'Default');
    });
    return Array.from(sectionSet).sort();
  }, [tables]);

  // Get table by ID
  const getTableById = useCallback((tableId) => {
    return tables.find((t) => t.tableId === tableId) || null;
  }, [tables]);

  // Get table by number
  const getTableByNumber = useCallback((tableNumber) => {
    return tables.find((t) => t.tableNumber === tableNumber) || null;
  }, [tables]);

  // Get tables by section
  const getTablesBySection = useCallback((sectionName) => {
    if (!sectionName || sectionName === 'All') return tables;
    return tables.filter((t) => (t.sectionName || 'Default') === sectionName);
  }, [tables]);

  // Get tables grouped by section
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

  // Filter tables by status
  const filterByStatus = useCallback((status) => {
    if (!status || status === 'all') return tables;
    return tables.filter((t) => t.status === status);
  }, [tables]);

  // Get available (free) tables
  const getAvailableTables = useCallback(() => {
    return tables.filter((t) => t.status === TABLE_STATUS.FREE);
  }, [tables]);

  // Get occupied tables
  const getOccupiedTables = useCallback(() => {
    return tables.filter((t) => t.isOccupied);
  }, [tables]);

  // Search tables by number
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
    // State
    tables,
    sections,
    isLoaded,
    
    // Actions
    setTables,
    clearTables,
    
    // Helpers
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
