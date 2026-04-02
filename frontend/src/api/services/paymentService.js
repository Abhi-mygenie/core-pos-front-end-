// Payment Service - Collect bill and payment API calls
// Sprint 3 / CHG-038 — Collect Bill API

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Collect payment for an order
 * @param {Object} payload - Built via orderTransform.toAPI.collectPayment()
 * @returns {Promise<Object>} - API response
 * TODO: Wire endpoint when provided in Sprint 3
 */
export const collectPayment = async (payload) => {
  const response = await api.post(API_ENDPOINTS.COLLECT_PAYMENT, payload);
  return response.data;
};
