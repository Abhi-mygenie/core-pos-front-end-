// CR-133: Printer Agent Config Service
// GET/POST /api/v2/vendoremployee/restaurant-settings/printer-agent-config
// Pattern: restaurantSettingsService.js

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/printerAgentConfigTransform';

/**
 * Fetch printer agent config
 * @returns {Promise<Object>} - Transformed editable state (with _raw retained)
 */
export const getConfig = async () => {
  const response = await api.get(API_ENDPOINTS.PRINTER_AGENT_CONFIG);
  return fromAPI(response.data.data);
};

/**
 * Save printer agent config (merge-onto-raw POST body)
 * @param {Object} state - Editable state from getConfig / UI edits
 * @returns {Promise<Object>} - API response
 */
export const saveConfig = async (state) => {
  const response = await api.post(API_ENDPOINTS.PRINTER_AGENT_CONFIG, toAPI(state));
  return response.data;
};

// CR-133-GAP: Employee list for printer agent employee dropdown (G3b)
/**
 * Fetch employee list for dropdown
 * Response: { employees: [{ id, f_name, l_name, status, role:{name} }] }
 * @returns {Promise<Array>} - [{ value: String(id), label: 'f_name (role)' }]
 */
export const getEmployeeList = async () => {
  const res = await api.get(API_ENDPOINTS.EMPLOYEES_LIST);
  return (res.data.employees || [])
    .filter((e) => e.status === 1)
    .map((e) => ({
      value: String(e.id),
      label: `${e.f_name}${e.l_name ? ' ' + e.l_name : ''} (${e.role?.name || ''})`,
    }));
};
