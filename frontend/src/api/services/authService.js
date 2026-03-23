// Auth Service - Login API calls

import api from '../axios';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants';
import { fromAPI, toAPI } from '../transforms/authTransform';

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
 * Logout user - Clear stored data
 */
export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  // Keep remember me email if set
  if (!localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)) {
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
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
 * Get remembered email (if remember me was checked)
 * @returns {string|null}
 */
export const getRememberedEmail = () => {
  if (localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)) {
    return localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
  }
  return null;
};

/**
 * Check if remember me is enabled
 * @returns {boolean}
 */
export const isRememberMeEnabled = () => {
  return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
};
