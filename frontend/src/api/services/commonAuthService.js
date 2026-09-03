// CR-166: CS/Franchise common-auth service
// Uses COMMON_TOKEN as Bearer (NOT AUTH_TOKEN — different session level)
import api from '../axios';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants';
import { fromAPI } from '../transforms/authTransform';
import { setCrmToken } from '../crmAxios';

/**
 * GET /assigned-restaurants
 * Returns active restaurants only (restaurant_status === 1)
 * Requires COMMON_TOKEN in Authorization header
 */
export const getAssignedRestaurants = async () => {
  const commonToken = localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);
  const response = await api.get(API_ENDPOINTS.ASSIGNED_RESTAURANTS, {
    headers: { Authorization: `Bearer ${commonToken}` },
  });
  const data = response.data.assigned_restaurants || [];
  return data.filter(r => r.restaurant_status === 1); // OQ-4: active only
};

/**
 * POST /login-as-restaurant
 * Selects one restaurant from the picker, stores its AUTH_TOKEN + CRM token.
 * CRITICAL: response uses restaurant_token key (not token) — handled by loginAsRestaurantResponse transform.
 */
export const loginAsRestaurant = async (restaurantId) => {
  const commonToken = localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);
  const response = await api.post(
    API_ENDPOINTS.LOGIN_AS_RESTAURANT,
    { restaurant_id: restaurantId },
    { headers: { Authorization: `Bearer ${commonToken}` } },
  );
  const authData = fromAPI.loginAsRestaurantResponse(response.data);
  // CR-166: restaurant_token → AUTH_TOKEN (different key from normal login)
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
  // CR-166: crm_token → CRM store (same pattern as normal login)
  if (authData.crmToken) {
    setCrmToken(authData.crmToken);
    localStorage.setItem('crm_token', authData.crmToken);
  }
  return authData;
};

/**
 * POST /adminemployee/logout
 * Best-effort invalidation of COMMON_TOKEN on server side.
 */
export const commonLogout = async () => {
  const commonToken = localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);
  if (!commonToken) return;
  await api.post(API_ENDPOINTS.COMMON_LOGOUT, {}, {
    headers: { Authorization: `Bearer ${commonToken}` },
  });
};
