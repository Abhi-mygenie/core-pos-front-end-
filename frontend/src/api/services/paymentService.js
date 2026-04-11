// Payment Service - Collect bill and payment API calls
// Sprint 3 / CHG-038 — Collect Bill API

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Collect payment for an order
 * @param {Object} payload - Built via orderTransform.toAPI.collectPayment()
 * @returns {Promise<Object>} - API response
 */
export const collectPayment = async (payload) => {
  const response = await api.post(API_ENDPOINTS.CLEAR_BILL, payload);
  return response.data;
};
