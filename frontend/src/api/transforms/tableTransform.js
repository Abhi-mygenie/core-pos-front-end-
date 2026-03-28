// Table Transform - Tables API response mapping

import { YES_NO_MAP, TABLE_TYPES, TABLE_STATUS } from '../constants';

/**
 * Helper to convert Yes/No strings to boolean
 */
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return YES_NO_MAP[value] ?? false;
};

// =============================================================================
// API → Frontend (Response)
// =============================================================================
export const fromAPI = {
  /**
   * Transform tables list response
   * @param {Array} apiTables - Raw API response
   * @param {boolean} tablesOnly - If true, filter only tables (exclude rooms)
   */
  tableList: (apiTables, tablesOnly = true) => {
    if (!Array.isArray(apiTables)) return [];
    
    let tables = apiTables.map(fromAPI.table);
    
    // Filter only tables (TB) for Phase 1
    if (tablesOnly) {
      tables = tables.filter((t) => t.tableType === TABLE_TYPES.TB);
    }
    
    // Sort by table number
    return tables.sort((a, b) => {
      const numA = parseInt(a.tableNumber) || 0;
      const numB = parseInt(b.tableNumber) || 0;
      return numA - numB;
    });
  },

  /**
   * Transform single table
   */
  table: (api) => {
    const isActive = toBoolean(api.status);
    const isOccupied = toBoolean(api.engage);
    
    return {
      tableId: api.id,
      tableNumber: api.table_no,
      displayName: fromAPI.getDisplayName(api),
      sectionName: api.title || null,
      tableType: api.rtype === 'RM' ? TABLE_TYPES.RM : TABLE_TYPES.TB,
      isRoom: api.rtype === 'RM',
      
      // Status
      isActive: isActive,
      isOccupied: isOccupied,
      status: fromAPI.getTableStatus(isActive, isOccupied),
      
      // Waiter assignment
      assignedWaiterId: api.waiter_id,
      
      // QR Code
      qrCode: api.qr_code,
      
      // Metadata
      restaurantId: api.restaurant_id,
      createdAt: api.created_at,
      updatedAt: api.updated_at,
    };
  },

  /**
   * Get display name for table
   */
  getDisplayName: (api) => {
    const prefix = api.rtype === 'RM' ? 'R' : 'T';
    if (api.title) {
      return `${api.title} - ${prefix}${api.table_no}`;
    }
    return `${prefix}${api.table_no}`;
  },

  /**
   * Get table status
   */
  getTableStatus: (isActive, isOccupied) => {
    if (!isActive) return TABLE_STATUS.DISABLED;
    if (isOccupied) return TABLE_STATUS.OCCUPIED;
    return TABLE_STATUS.FREE;
  },

  /**
   * Group tables by section
   */
  groupBySection: (tables) => {
    const grouped = {};
    
    tables.forEach((table) => {
      const section = table.sectionName || 'Default';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(table);
    });
    
    return grouped;
  },

  /**
   * Get unique sections from tables
   */
  getSections: (tables) => {
    const sections = new Set();
    tables.forEach((table) => {
      sections.add(table.sectionName || 'Default');
    });
    return Array.from(sections).sort();
  },
};

// =============================================================================
// Frontend → API (Request) - Phase 2
// =============================================================================
export const toAPI = {
  // Will be added in Phase 2 for create/update operations
};
