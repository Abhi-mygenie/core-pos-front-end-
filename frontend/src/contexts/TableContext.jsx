import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { TABLE_STATUS } from '../api/constants';
import * as tableService from '../api/services/tableService';

// Create Table Context
const TableContext = createContext(null);

// Table Provider Component
export const TableProvider = ({ children }) => {
  const [tables, setTablesData] = useState([]);
  const [rooms, setRoomsData] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Set tables (called from LoadingPage)
  const setTables = useCallback((data) => {
    setTablesData(data || []);
    setIsLoaded(true);
  }, []);

  // Set rooms (called from LoadingPage)
  const setRooms = useCallback((data) => {
    setRoomsData(data || []);
  }, []);

  // Set both tables and rooms together
  const setTablesAndRooms = useCallback((tablesData, roomsData) => {
    setTablesData(tablesData || []);
    setRoomsData(roomsData || []);
    setIsLoaded(true);
  }, []);

  // Clear tables and rooms data (on logout)
  const clearTables = useCallback(() => {
    setTablesData([]);
    setRoomsData([]);
    setIsLoaded(false);
  }, []);

  // Refresh tables — re-fetch engage status and update context
  const refreshTables = useCallback(async () => {
    const { tables: freshTables, rooms: freshRooms } = await tableService.getTablesAndRooms();
    setTablesData(freshTables || []);
    setRoomsData(freshRooms || []);
  }, []);

  // Get unique sections from tables
  const sections = useMemo(() => {
    const sectionSet = new Set();
    tables.forEach((table) => {
      sectionSet.add(table.sectionName || 'Default');
    });
    return Array.from(sectionSet).sort();
  }, [tables]);

  // Get unique sections from rooms
  const roomSections = useMemo(() => {
    const sectionSet = new Set();
    rooms.forEach((room) => {
      sectionSet.add(room.sectionName || 'Default');
    });
    return Array.from(sectionSet).sort();
  }, [rooms]);

  // Get table by ID
  const getTableById = useCallback((tableId) => {
    return tables.find((t) => t.tableId === tableId) || null;
  }, [tables]);

  // Get room by ID
  const getRoomById = useCallback((roomId) => {
    return rooms.find((r) => r.tableId === roomId) || null;
  }, [rooms]);

  // Get table or room by ID (searches both)
  const getTableOrRoomById = useCallback((id) => {
    return tables.find((t) => t.tableId === id) || rooms.find((r) => r.tableId === id) || null;
  }, [tables, rooms]);

  // Get table by number
  const getTableByNumber = useCallback((tableNumber) => {
    return tables.find((t) => t.tableNumber === tableNumber) || null;
  }, [tables]);

  // Get room by number
  const getRoomByNumber = useCallback((roomNumber) => {
    return rooms.find((r) => r.tableNumber === roomNumber) || null;
  }, [rooms]);

  // Get tables by section
  const getTablesBySection = useCallback((sectionName) => {
    if (!sectionName || sectionName === 'All') return tables;
    return tables.filter((t) => (t.sectionName || 'Default') === sectionName);
  }, [tables]);

  // Get rooms by section
  const getRoomsBySection = useCallback((sectionName) => {
    if (!sectionName || sectionName === 'All') return rooms;
    return rooms.filter((r) => (r.sectionName || 'Default') === sectionName);
  }, [rooms]);

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

  // Get rooms grouped by section
  const getRoomsGroupedBySection = useCallback(() => {
    const grouped = {};
    rooms.forEach((room) => {
      const section = room.sectionName || 'Default';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(room);
    });
    return grouped;
  }, [rooms]);

  // Filter tables by status
  const filterByStatus = useCallback((status) => {
    if (!status || status === 'all') return tables;
    return tables.filter((t) => t.status === status);
  }, [tables]);

  // Filter rooms by status
  const filterRoomsByStatus = useCallback((status) => {
    if (!status || status === 'all') return rooms;
    return rooms.filter((r) => r.status === status);
  }, [rooms]);

  // Get available (free) tables
  const getAvailableTables = useCallback(() => {
    return tables.filter((t) => t.status === TABLE_STATUS.FREE);
  }, [tables]);

  // Get available (free) rooms
  const getAvailableRooms = useCallback(() => {
    return rooms.filter((r) => r.status === TABLE_STATUS.FREE);
  }, [rooms]);

  // Get occupied tables
  const getOccupiedTables = useCallback(() => {
    return tables.filter((t) => t.isOccupied);
  }, [tables]);

  // Get occupied rooms (checked-in)
  const getOccupiedRooms = useCallback(() => {
    return rooms.filter((r) => r.isOccupied);
  }, [rooms]);

  // Search tables by number
  const searchTables = useCallback((searchTerm) => {
    if (!searchTerm) return tables;
    const term = searchTerm.toLowerCase();
    return tables.filter((t) =>
      t.tableNumber.toLowerCase().includes(term) ||
      t.displayName.toLowerCase().includes(term)
    );
  }, [tables]);

  // Search rooms by number
  const searchRooms = useCallback((searchTerm) => {
    if (!searchTerm) return rooms;
    const term = searchTerm.toLowerCase();
    return rooms.filter((r) =>
      r.tableNumber.toLowerCase().includes(term) ||
      r.displayName.toLowerCase().includes(term)
    );
  }, [rooms]);

  // Context value
  const value = useMemo(() => ({
    // State
    tables,
    rooms,
    sections,
    roomSections,
    isLoaded,
    
    // Actions
    setTables,
    setRooms,
    setTablesAndRooms,
    clearTables,
    refreshTables,
    
    // Table Helpers
    getTableById,
    getTableByNumber,
    getTablesBySection,
    getTablesGroupedBySection,
    filterByStatus,
    getAvailableTables,
    getOccupiedTables,
    searchTables,
    
    // Room Helpers
    getRoomById,
    getRoomByNumber,
    getRoomsBySection,
    getRoomsGroupedBySection,
    filterRoomsByStatus,
    getAvailableRooms,
    getOccupiedRooms,
    searchRooms,
    
    // Combined Helpers
    getTableOrRoomById,
  }), [
    tables,
    rooms,
    sections,
    roomSections,
    isLoaded,
    setTables,
    setRooms,
    setTablesAndRooms,
    clearTables,
    refreshTables,
    getTableById,
    getTableByNumber,
    getTablesBySection,
    getTablesGroupedBySection,
    filterByStatus,
    getAvailableTables,
    getOccupiedTables,
    searchTables,
    getRoomById,
    getRoomByNumber,
    getRoomsBySection,
    getRoomsGroupedBySection,
    filterRoomsByStatus,
    getAvailableRooms,
    getOccupiedRooms,
    searchRooms,
    getTableOrRoomById,
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
