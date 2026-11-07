// Profile Service - Vendor Profile API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI } from '../transforms/profileTransform';

/**
 * Fetch vendor profile with all restaurant data
 * @returns {Promise<Object>} - Transformed profile response
 */
export const getProfile = async () => {
  const response = await api.get(API_ENDPOINTS.PROFILE);
  return fromAPI.profileResponse(response.data);
};
