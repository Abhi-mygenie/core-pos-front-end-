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
 * Transform tables list response (includes both tables and rooms)
 * @param {Array} apiTables - Raw API response
 * @returns {Array} - All tables and rooms with isRoom flag
 */
tableList: (apiTables) => {
  if (!Array.isArray(apiTables)) return [];
  
  // Transform all - no filtering, isRoom flag distinguishes them
  const tables = apiTables.map(fromAPI.table);
  
  // Sort by table/room number
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
// Frontend → API (Request) - Phase 1C Table Operations
// =============================================================================
export const toAPI = {
  /**
   * Shift table payload
   * @param {Object} currentTable - Table entry from DashboardPage (has orderId, tableId, amount)
   * @param {Object} targetTable  - Selected free table from ShiftTableModal (has tableId)
   */
  shiftTable: (currentTable, targetTable) => ({
    order_id: currentTable.orderId,
    old_table_id: currentTable.tableId,
    new_table_id: targetTable.tableId,
    order_edit_count: currentTable.amount, // grand total of existing table order
  }),

  /**
   * Transfer food item payload — moves one item from current order to target order
   * @param {Object} currentTable - Current table entry (source order)
   * @param {Object} targetOrder  - Order from OrderContext of target table
   * @param {Object} item         - Cart item being transferred (has id = orderDetails.id)
   */
  transferFood: (currentTable, targetOrder, item) => ({
    source_order_id: currentTable.orderId,
    target_order_id: targetOrder.orderId,
    food_item_id: item.id,
  }),

  /**
   * Merge table payload — merges sourceOrder INTO currentTable's order
   * Called once per selected source table (multi-select = multiple API calls)
   * @param {Object} currentTable  - Current table entry (target/destination — stays)
   * @param {Object} sourceOrder   - Order from OrderContext of the table being dissolved
   */
  mergeTable: (currentTable, sourceOrder) => ({
    source_order_id: sourceOrder.orderId,  // table being dissolved into current
    target_order_id: currentTable.orderId, // current table (survives the merge)
    transfer_note: "Yes",                  // always Yes — transfer all notes
  }),
};
