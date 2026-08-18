// Auth Service - Login API calls

import api from '../axios';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants';
import { fromAPI, toAPI } from '../transforms/authTransform';
import { setCrmToken, clearCrmToken } from '../crmAxios';

/**
 * Login user with email and password
 * @param {Object} credentials - { email, password }
 * @param {boolean} rememberMe - Persist login across sessions
 * @returns {Promise<Object>} - Transformed auth response
 */
export const login = async (credentials, rememberMe = false) => {
  const payload = toAPI.loginRequest(credentials);
  
  const response = await api.post(API_ENDPOINTS.LOGIN, payload);
  const authData = fromAPI.loginResponse(response.data);
  
  // Store token
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
  
  // BUG-098: Set CRM token from login response + persist to localStorage
  // BUG-300: changed from sessionStorage (cleared on tab close) to localStorage (survives tab close like auth_token)
  setCrmToken(authData.crmToken);
  if (authData.crmToken) {
    localStorage.setItem('crm_token', authData.crmToken);
  }

  // Persist permissions to sessionStorage for page-refresh restore
  if (authData.permissions?.length) {
    sessionStorage.setItem('permissions', JSON.stringify(authData.permissions));
  }

  // Store remember me preference
  if (rememberMe) {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, credentials.email);
  } else {
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
  
  return authData;
};

/**
 * Logout user - Call PaaS logout API first, then clear local state on success.
 * CR-124: API call FIRST; localStorage cleared only on success (Q-124-4 locked).
 * On API failure, throws — caller handles toast and user stays logged in.
 */
export const logout = async () => {
  // CR-124: Invalidate server-side token + deregister FCM device token
  await api.post(API_ENDPOINTS.LOGOUT);
  // API succeeded — clear local state
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  // BUG-098: Clear CRM token on logout
  // BUG-300: also remove from localStorage (moved from sessionStorage)
  clearCrmToken();
  localStorage.removeItem('crm_token');
  // BUG-130: Always clear channel-visibility override on logout so a freshly
  // enabled channel (via Restaurant Settings) is not suppressed by a stale
  // per-user override on next login. Independent of remember-me.
  localStorage.removeItem(STORAGE_KEYS.CHANNEL_VISIBILITY);
  // Keep remember me email if set (preserved for login pre-fill)
  if (!localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)) {
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
  // IMP-124-GAP-1: clear remember_me here (was only in Sidebar.jsx:411 as dead code)
  localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
};

/**
 * Get stored auth token
 * @returns {string|null}
 */
export const getToken = () => {
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
};

/**
 * Get remembered email for login pre-fill.
 * CR-124 BUG FIX: read user_email directly — REMEMBER_ME flag is cleared on
 * logout (IMP-124-GAP-1) so gating on it breaks pre-fill. user_email is only
 * set when the user checks "Remember Me" at login, so its presence is the
 * implicit opt-in signal.
 * @returns {string|null}
 */
export const getRememberedEmail = () => {
  return localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
};

/**
 * Check if remember me is enabled
 * @returns {boolean}
 */
export const isRememberMeEnabled = () => {
  return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
};
