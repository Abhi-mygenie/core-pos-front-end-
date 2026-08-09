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
