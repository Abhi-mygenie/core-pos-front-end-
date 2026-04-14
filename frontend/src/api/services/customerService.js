// Customer Service — CRM POS API calls
// All endpoints: /api/pos/*
// Auth: X-API-Key (per restaurant)

import crmApi from '../crmAxios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/customerTransform';

// =============================================================================
// 1. Search & Lookup
// =============================================================================

/**
 * Search customers by name or phone (lightweight, typeahead)
 * GET /pos/customers?search={query}&limit={n}
 * @param {string} query - Min 2 chars, matches name OR phone
 * @param {number} limit - Max results (default 10)
 * @returns {Promise<Array>} - [{id, name, phone, tier, totalPoints, walletBalance, lastVisit}]
 */
export const searchCustomers = async (query, limit = 10) => {
  if (!query || query.trim().length < 2) return [];
  try {
    const response = await crmApi.get(API_ENDPOINTS.CUSTOMER_SEARCH, {
      params: { search: query.trim(), limit },
    });
    if (!response.data?.success) return [];
    return fromAPI.searchResults(response.data?.data?.customers || []);
  } catch (err) {
    console.warn('[CRM] Customer search failed:', err.readableMessage || err.message);
    return [];
  }
};

/**
 * Lookup customer by exact phone (returns profile + addresses)
 * POST /pos/customer-lookup
 * @param {string} phone - Exact phone number
 * @returns {Promise<Object|null>} - Full customer with addresses, or null if not found
 */
export const lookupCustomer = async (phone) => {
  if (!phone?.trim()) return null;
  try {
    const response = await crmApi.post(API_ENDPOINTS.CUSTOMER_LOOKUP, { phone: phone.trim() });
    if (!response.data?.success || !response.data?.data?.registered) return null;
    return fromAPI.customerLookup(response.data.data);
  } catch (err) {
    console.warn('[CRM] Customer lookup failed:', err.readableMessage || err.message);
    return null;
  }
};

/**
 * Get full customer details (loyalty, orders, addresses)
 * GET /pos/customers/{customer_id}
 * @param {string} customerId - CRM customer UUID
 * @returns {Promise<Object|null>}
 */
export const getCustomerDetail = async (customerId) => {
  if (!customerId) return null;
  const response = await crmApi.get(`${API_ENDPOINTS.CUSTOMER_DETAIL}/${customerId}`);
  if (!response.data?.success) return null;
  return fromAPI.customerDetail(response.data.data);
};

// =============================================================================
// 2. Customer CRUD
// =============================================================================

/**
 * Create new customer
 * POST /pos/customers
 * @param {Object} data - { name, phone, email, dob, anniversary, gender, addresses[] }
 * @param {string} restaurantId - Restaurant ID for scoping
 * @returns {Promise<Object>} - { customer_id, name, phone }
 */
export const createCustomer = async (data, restaurantId) => {
  const payload = toAPI.createCustomer(data);
  payload.restaurant_id = String(restaurantId);
  const response = await crmApi.post(API_ENDPOINTS.CUSTOMER_CREATE, payload);
  return response.data?.data || null;
};

/**
 * Update customer details
 * PUT /pos/customers/{customer_id}
 * @param {string} customerId - CRM customer UUID
 * @param {Object} data - Fields to update
 * @param {string} restaurantId - Restaurant ID
 * @returns {Promise<Object>}
 */
export const updateCustomer = async (customerId, data, restaurantId) => {
  const payload = toAPI.updateCustomer(data);
  payload.restaurant_id = String(restaurantId);
  const response = await crmApi.put(`${API_ENDPOINTS.CUSTOMER_UPDATE}/${customerId}`, payload);
  return response.data?.data || null;
};

// =============================================================================
// 3. Addresses
// =============================================================================

/**
 * Lookup addresses across all restaurants by phone
 * POST /pos/address-lookup
 * @param {string} phone - Customer phone
 * @returns {Promise<Array>} - Cross-restaurant addresses
 */
export const lookupAddresses = async (phone) => {
  if (!phone?.trim()) return [];
  try {
    const response = await crmApi.post(API_ENDPOINTS.ADDRESS_LOOKUP, { phone: phone.trim() });
    if (!response.data?.success) return [];
    return fromAPI.crossRestaurantAddresses(response.data?.data?.addresses || []);
  } catch (err) {
    console.warn('[CRM] Address lookup failed:', err.readableMessage || err.message);
    return [];
  }
};

/**
 * Add new address to customer
 * POST /pos/customers/{customer_id}/addresses
 * @param {string} customerId - CRM customer UUID
 * @param {Object} addressData - Address fields
 * @returns {Promise<Object>} - { address_id, address }
 */
export const addAddress = async (customerId, addressData) => {
  const payload = toAPI.addAddress(addressData);
  const response = await crmApi.post(
    `${API_ENDPOINTS.CUSTOMER_ADDRESSES}/${customerId}/addresses`,
    payload
  );
  return response.data?.data || null;
};

/**
 * Update existing address
 * PUT /pos/customers/{customer_id}/addresses/{addr_id}
 * @param {string} customerId
 * @param {string} addressId - addr_xxx
 * @param {Object} data - Fields to update (partial)
 * @returns {Promise<Object>}
 */
export const updateAddress = async (customerId, addressId, data) => {
  const response = await crmApi.put(
    `${API_ENDPOINTS.CUSTOMER_ADDRESSES}/${customerId}/addresses/${addressId}`,
    data
  );
  return response.data?.data || null;
};

/**
 * Delete address
 * DELETE /pos/customers/{customer_id}/addresses/{addr_id}
 * @param {string} customerId
 * @param {string} addressId
 * @returns {Promise<Object>}
 */
export const deleteAddress = async (customerId, addressId) => {
  const response = await crmApi.delete(
    `${API_ENDPOINTS.CUSTOMER_ADDRESSES}/${customerId}/addresses/${addressId}`
  );
  return response.data?.data || null;
};

/**
 * Set default address
 * PUT /pos/customers/{customer_id}/addresses/{addr_id}/default
 * @param {string} customerId
 * @param {string} addressId
 * @returns {Promise<Object>}
 */
export const setDefaultAddress = async (customerId, addressId) => {
  const response = await crmApi.put(
    `${API_ENDPOINTS.CUSTOMER_ADDRESSES}/${customerId}/addresses/${addressId}/default`
  );
  return response.data?.data || null;
};
