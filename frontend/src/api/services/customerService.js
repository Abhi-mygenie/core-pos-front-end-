// Customer Service - Customer search and lookup API calls
// Sprint 3 / CHG-036 — Customer Lookup API
// Endpoint: POST /api/v2/vendoremployee/restaurant-customer-list

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/customerTransform';

/**
 * Search customers by phone number or name
 * Single endpoint handles both — passes query in key array
 * @param {string} query - Phone or name (partial ok)
 * @returns {Promise<Array>} - Transformed customer list (name + phone only in Phase 1/2)
 */
export const searchCustomers = async (query) => {
  if (!query || !query.trim()) return [];
  const response = await api.post(
    API_ENDPOINTS.CUSTOMER_SEARCH,
    toAPI.searchCustomer(query.trim())
  );
  return fromAPI.customerList(response.data?.customer_list || []);
};
