// Settings Service - Cancellation Reasons & other settings API calls

import api from '../axios';
import { API_ENDPOINTS, PAGINATION } from '../constants';
import { fromAPI } from '../transforms/settingsTransform';

/**
 * Fetch cancellation reasons
 * @param {Object} options - { limit, offset }
 * @returns {Promise<Object>} - Transformed reasons response
 */
export const getCancellationReasons = async (options = {}) => {
  const params = {
    limit: options.limit || PAGINATION.DEFAULT_LIMIT,
    offset: options.offset || PAGINATION.DEFAULT_OFFSET,
  };
  
  const response = await api.get(API_ENDPOINTS.CANCELLATION_REASONS, { params });
  return fromAPI.cancellationReasonsResponse(response.data);
};

/**
 * Get all cancellation reasons (for caching)
 * @returns {Promise<Array>} - All reasons
 */
export const getAllCancellationReasons = async () => {
  const result = await getCancellationReasons({ limit: 100, offset: 1 });
  return result.reasons;
};

/**
 * Get reasons for order cancellation
 * @param {Array} reasons - All reasons
 * @returns {Array} - Reasons applicable to orders
 */
export const getOrderCancellationReasons = (reasons) => {
  return fromAPI.filterByType(reasons, 'order');
};

/**
 * Get reasons for item cancellation
 * @param {Array} reasons - All reasons
 * @returns {Array} - Reasons applicable to items
 */
export const getItemCancellationReasons = (reasons) => {
  return fromAPI.filterByType(reasons, 'item');
};

/**
 * Get reason by ID from cached list
 * @param {Array} reasons - Reasons list
 * @param {number} reasonId - Reason ID to find
 * @returns {Object|null} - Reason or null
 */
export const getReasonById = (reasons, reasonId) => {
  return reasons.find((reason) => reason.reasonId === reasonId) || null;
};
