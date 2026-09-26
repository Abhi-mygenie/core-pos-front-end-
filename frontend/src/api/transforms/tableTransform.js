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

  // Dedupe by id — API can return duplicate records (see BACKEND_CLARIFICATIONS B32)
  const seen = new Set();
  const unique = apiTables.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  // Transform all - no filtering, isRoom flag distinguishes them
  const tables = unique.map(fromAPI.table);
  
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
  }),
};

// =============================================================================
// CR-060: Table Config Transforms (Settings CRUD)
// =============================================================================
export const configFromAPI = {
  tableConfigList: (res) => {
    const data = res?.data || res;
    return {
      tables: (data.tables || []).map(configFromAPI.tableConfigItem),
      walkinQrUrls: data.walkin_qr_urls || {},
      walkinMenuQrUrls: data.walkin_menu_qr_urls || {},
      restaurantId: data.restaurant_id,
      restaurantName: data.restaurant_name,
    };
  },

  tableConfigItem: (api) => ({
    id: api.id,
    tableNo: api.table_no,
    title: api.title || null,
    rtype: api.rtype,
    waiterId: api.waiter_id,
    waiterName: [api.f_name, api.l_name].filter(Boolean).join(' ') || 'Unassigned',
    status: api.status,
    qrCodeUrls: api.qr_code_urls || {},
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }),

  areaOptions: (res) => {
    const data = res?.data || res;
    return (data.areas || data || []).filter(a => a != null);
  },

  waiterList: (res) => {
    const data = res?.data || res;
    return (data.waiters || data || []).map(w => ({
      id: w.id,
      name: (w.name || [w.f_name, w.l_name].filter(Boolean).join(' '))?.trim() || 'Unknown',
    }));
  },

  exportResponse: (res) => ({
    success: res.success,
    message: res.message,
    downloadUrl: res.download_url || null,
  }),
};

export const configToAPI = {
  storeTable: (data) => ({
    title: data.title || null,
    table_no: data.tableNo,
    vendorName: data.waiterId || null,
    rtype: data.rtype || 'TB',
    ...(data.id ? { id: data.id } : {}),
  }),
};
