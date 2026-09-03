// CR-147: Delivery Management Service
// Base: /api/v2/vendoremployee/restaurant-settings/
// Auth: vendoremployee token (restaurant resolved from token)

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Load existing delivery configuration + slabs.
 * Returns: { status, data: { restaurant, delivery_charges[] } }
 */
export async function getDeliveryConfig() {
  const res = await api.get(API_ENDPOINTS.DELIVERY_CONFIG);
  return res.data || {};
}

/**
 * Update basic delivery settings (lat/lng, toggles, contact).
 * Only sent keys are updated (patch semantics).
 * Toggle fields must be "Yes" / "No" strings (case-sensitive).
 */
export async function updateDeliveryConfig(payload) {
  const res = await api.post(API_ENDPOINTS.UPDATE_DELIVERY_CONFIG, payload);
  return res.data || {};
}

/**
 * Add one or more distance slabs via parallel arrays.
 * All four arrays must be the same length.
 * For each index i: min_distance_km[i] < max_distance_km[i]
 *
 * @param {{ min_distance_km: number[], max_distance_km: number[], min_order_value: number[], charge: number[] }} payload
 */
export async function addDeliveryCharges(payload) {
  const res = await api.post(API_ENDPOINTS.DELIVERY_CHARGES, payload);
  return res.data || {};
}

/**
 * Delete a single delivery charge slab by id.
 * @param {number} id - slab id from delivery_charges[].id
 */
export async function deleteDeliveryCharge(id) {
  const res = await api.delete(`${API_ENDPOINTS.DELIVERY_CHARGES}/${id}`);
  return res.data || {};
}

/**
 * Get delivery zones for the zone dropdown.
 * Returns array of zone objects.
 */
export async function getDeliveryZones() {
  const res = await api.get(API_ENDPOINTS.DELIVERY_ZONES);
  return res.data?.data || [];
}
