// BUG-749: dedicated FCM device-token registration (boot/reload + login-as-restaurant).
// Idempotent — safe to POST the same token on every authenticated boot (OD-749-04: no client dedupe).

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Upsert the current device FCM token for the authenticated employee.
 * @param {string} fcmToken
 * @returns {Promise<{ status: string, fcm_token: string }|null>}
 */
export const registerDeviceToken = async (fcmToken) => {
  if (!fcmToken || typeof fcmToken !== 'string') return null;
  const response = await api.post(API_ENDPOINTS.DEVICE_TOKEN, { fcm_token: fcmToken });
  return response.data;
};
