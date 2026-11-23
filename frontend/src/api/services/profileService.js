// Profile Service - Vendor Profile API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI } from '../transforms/profileTransform';

/**
 * Fetch vendor profile with all restaurant data
 * @returns {Promise<Object>} - Transformed profile response
 */
export const getProfile = async (fcmToken = null) => {
  // CR-562: when a fresh FCM device token is available, pass it so the backend
  // upserts vendor_employees.firebase_token on this GET (endpoint stays GET).
  // Omitted when absent → backend no-op (never clears). Other callers (Settings
  // re-fetch) pass nothing and are unaffected.
  const config = fcmToken ? { params: { fcm_token: fcmToken } } : undefined;
  const response = await api.get(API_ENDPOINTS.PROFILE, config);
  return fromAPI.profileResponse(response.data);
};
