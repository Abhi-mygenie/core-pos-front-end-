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
    // CR-166: /common-login returns role_names (string), /login returned role_name
    roleName: api.role_name || api.role_names || null,
    // CR-166: /common-login returns permissions[] directly, /login returned role[]
    permissions: api.permissions || api.role || [],
    firebaseToken: api.firebase_token,
    isFirstLogin: api.first_login === 'true',
    zoneWiseTopic: api.zone_wise_topic,
    crmToken: api.crm_token || null,
    loginType: api.login_type || null,  // CR-166: 'admin' = CS/franchise, null/'employee' = normal
  }),

  // CR-166: Transform login-as-restaurant response
  // CRITICAL: uses response.restaurant_token (NOT response.token — different key from normal login)
  loginAsRestaurantResponse: (api) => ({
    token:               api.restaurant_token,       // CR-166: maps to AUTH_TOKEN after restaurant selection
    crmToken:            api.crm_token || null,
    restaurantId:        api.restaurant_id,
    restaurantName:      api.restaurant_name,
    supportEmployeeId:   api.support_employee_id,
    supportEmployeeName: api.support_employee_name,
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
