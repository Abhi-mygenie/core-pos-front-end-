// Table Service - Tables API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI } from '../transforms/tableTransform';

/**
 * Fetch all tables and rooms (unified)
 * @returns {Promise<Array>} - All tables and rooms with isRoom flag
 */
export const getTables = async () => {
  const response = await api.get(API_ENDPOINTS.TABLES);
  return fromAPI.tableList(response.data);
};

/**
 * Get table by ID from cached list
 * @param {Array} tables - Tables list
 * @param {number} tableId - Table ID to find
 * @returns {Object|null} - Table or null
 */
export const getTableById = (tables, tableId) => {
  return tables.find((table) => table.tableId === tableId) || null;
};

/**
 * Get table by table number from cached list
 * @param {Array} tables - Tables list
 * @param {string} tableNumber - Table number to find
 * @returns {Object|null} - Table or null
 */
export const getTableByNumber = (tables, tableNumber) => {
  return tables.find((table) => table.tableNumber === tableNumber) || null;
};

/**
 * Get tables grouped by section
 * @param {Array} tables - Tables list
 * @returns {Object} - Tables grouped by section name
 */
export const getTablesBySection = (tables) => {
  return fromAPI.groupBySection(tables);
};

/**
 * Get unique sections from tables
 * @param {Array} tables - Tables list
 * @returns {Array} - Section names
 */
export const getSections = (tables) => {
  return fromAPI.getSections(tables);
};

/**
 * Filter tables by section
 * @param {Array} tables - Tables list
 * @param {string} sectionName - Section to filter by
 * @returns {Array} - Filtered tables
 */
export const filterBySection = (tables, sectionName) => {
  if (!sectionName || sectionName === 'All') return tables;
  return tables.filter((table) => 
    (table.sectionName || 'Default') === sectionName
  );
};

/**
 * Filter tables by status
 * @param {Array} tables - Tables list
 * @param {string} status - 'free', 'occupied', 'disabled'
 * @returns {Array} - Filtered tables
 */
export const filterByStatus = (tables, status) => {
  if (!status || status === 'all') return tables;
  return tables.filter((table) => table.status === status);
};

/**
 * Get available (free) tables
 * @param {Array} tables - Tables list
 * @returns {Array} - Free tables
 */
export const getAvailableTables = (tables) => {
  return tables.filter((table) => table.status === 'free');
};

/**
 * Get occupied tables
 * @param {Array} tables - Tables list
 * @returns {Array} - Occupied tables
 */
export const getOccupiedTables = (tables) => {
  return tables.filter((table) => table.isOccupied);
};

/**
 * Search tables by number
 * @param {Array} tables - Tables list
 * @param {string} searchTerm - Search term
 * @returns {Array} - Matching tables
 */
export const searchTables = (tables, searchTerm) => {
  if (!searchTerm) return tables;
  const term = searchTerm.toLowerCase();
  return tables.filter((table) => 
    table.tableNumber.toLowerCase().includes(term) ||
    table.displayName.toLowerCase().includes(term)
  );
};
