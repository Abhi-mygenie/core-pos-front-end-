// Auth Transform - Login API response mapping

import { YES_NO_MAP } from '../constants';

// =============================================================================
// API → Frontend (Response)
// =============================================================================
export const fromAPI = {
  /**
   * Transform login response
   * @param {Object} api - Raw API response
   * @returns {Object} - Frontend auth model
   */
  loginResponse: (api) => ({
    token: api.token,
    roleName: api.role_name,
    permissions: api.role || [],
    firebaseToken: api.firebase_token,
    isFirstLogin: api.first_login === 'true',
    zoneWiseTopic: api.zone_wise_topic,
  }),
};

// =============================================================================
// Frontend → API (Request)
// =============================================================================
export const toAPI = {
  /**
   * Transform login credentials for API
   * @param {Object} form - Frontend form data
   * @returns {Object} - API request payload
   */
  loginRequest: (form) => ({
    email: form.email,
    password: form.password,
    ...(form.fcmToken && { fcm_token: form.fcmToken }),
  }),
};
