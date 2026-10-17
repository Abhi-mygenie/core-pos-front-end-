// CRM Axios instance — all customer/address/loyalty calls go through this
// Auth: X-API-Key header (token from login API response)
// Base URL: REACT_APP_CRM_BASE_URL from .env
// BUG-098: CRM token sourced from login response `crm_token` field.
//          Env-based REACT_APP_CRM_API_KEYS mapping removed per owner directive.

import axios from 'axios';
import api from './axios'; // BUG-300 T2: POS api instance for silent crm_token refresh on 401

const CRM_BASE_URL = process.env.REACT_APP_CRM_BASE_URL;

if (!CRM_BASE_URL) {
  console.warn('[CRM Config] REACT_APP_CRM_BASE_URL is not set. CRM features will not work.');
}

// BUG-098: Single CRM token from login response (replaces per-restaurant env map)
// BUG-300: Restore from localStorage on page refresh (sessionStorage cleared on tab close / hard refresh)
let currentCrmToken = localStorage.getItem('crm_token') || null;
let currentRestaurantId = null;
let _crmTokenRefreshing = false; // BUG-300 T2: guard — prevents concurrent 401 refresh races

/**
 * Set the CRM API token from the login response
 * Called once from authService.login() after successful authentication
 */
export const setCrmToken = (token) => {
  currentCrmToken = token || null;
  console.log(`[CRM Config] Token ${currentCrmToken ? 'set from login response' : 'NOT FOUND in login response'}`);
};

/**
 * Clear the CRM token (called on logout)
 */
export const clearCrmToken = () => {
  currentCrmToken = null;
  currentRestaurantId = null;
};

/**
 * Set the active restaurant ID for CRM context/logging
 * Called once after profile load from LoadingPage
 */
export const setCrmRestaurantId = (restaurantId) => {
  currentRestaurantId = String(restaurantId);
  console.log(`[CRM Config] Restaurant ${currentRestaurantId} — Token ${currentCrmToken ? 'available' : 'NOT SET'}`);
};

/**
 * Get the CRM API key (now returns the login-provided token)
 */
export const getCrmApiKey = () => {
  return currentCrmToken;
};

const crmApi = axios.create({
  baseURL: CRM_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor — attach X-API-Key from login token
crmApi.interceptors.request.use(
  (config) => {
    const apiKey = getCrmApiKey();
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    } else {
      console.warn('[CRM] No API key — crm_token missing from login response. Restaurant:', currentRestaurantId);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — extract readable error
// CR-027 Phase 1 / §4.8 A1: same additive branches as api/axios.js
// (Laravel 422 object shape + friendly timeout/network), KEEPING the
// CRM-specific `data.detail` branch and terminal fallback.
crmApi.interceptors.response.use(
  (response) => response,
  async (error) => { // BUG-300 T2: async to support silent token refresh
    // BUG-300 T2: Silent CRM token refresh on 401 — use dedicated POS endpoint
    if (
      error.response?.status === 401 &&
      !error.config?._crmRetry &&
      !_crmTokenRefreshing
    ) {
      _crmTokenRefreshing = true;
      try {
        const res = await api.get('/api/v2/vendoremployee/restaurant-crm-token');
        if (res.data?.crm_token) {
          const newToken = res.data.crm_token;
          setCrmToken(newToken);
          localStorage.setItem('crm_token', newToken);
          // Retry the original failed CRM request once with the refreshed token
          error.config._crmRetry = true;
          error.config.headers['X-API-Key'] = newToken;
          return crmApi.request(error.config);
        }
      } catch (_refreshErr) {
        // POS session expired → api.get 401 → axios.js auto-logout
        // OR endpoint unavailable — fall through to existing error handling
      } finally {
        _crmTokenRefreshing = false;
      }
    }

    // Existing error shape extraction (unchanged) — CR-027 Phase 1 / §4.8 A1
    // Laravel default 422 object shape — errors: { field: ["msg"] }
    let validationLine = '';
    const errs = error.response?.data?.errors;
    if (errs && typeof errs === 'object' && !Array.isArray(errs)) {
      const firstKey = Object.keys(errs)[0];
      validationLine = errs[firstKey]?.[0] || '';
    }

    // CRM timeout is 15s — friendly text matters more here
    const friendlyTimeout = error.code === 'ECONNABORTED'
      ? 'Request timed out. Check your connection and try again.'
      : '';
    const friendlyNetwork = error.code === 'ERR_NETWORK'
      ? 'Cannot reach server. Check your internet connection.'
      : '';

    // { error: "msg" } shape (preprod-verified on main API; mirrored here)
    const dataError = typeof error.response?.data?.error === 'string'
      ? error.response.data.error
      : '';

    const errorMessage =
      validationLine ||
      error.response?.data?.message ||
      error.response?.data?.detail ||
      dataError ||
      friendlyTimeout ||
      friendlyNetwork ||
      error.message ||
      'CRM request failed';

    error.readableMessage = errorMessage;
    return Promise.reject(error);
  }
);

export default crmApi;
