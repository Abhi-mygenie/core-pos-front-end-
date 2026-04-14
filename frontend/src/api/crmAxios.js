// CRM Axios instance — all customer/address/loyalty calls go through this
// Auth: X-API-Key header (per restaurant, resolved dynamically)
// Base URL: REACT_APP_CRM_BASE_URL from .env
// Keys: REACT_APP_CRM_API_KEYS — JSON map { restaurantId: apiKey }

import axios from 'axios';

const CRM_BASE_URL = process.env.REACT_APP_CRM_BASE_URL;

// Parse the API keys map from env
let CRM_API_KEYS = {};
try {
  CRM_API_KEYS = JSON.parse(process.env.REACT_APP_CRM_API_KEYS || '{}');
} catch (e) {
  console.error('[CRM Config] Failed to parse REACT_APP_CRM_API_KEYS:', e);
}

if (!CRM_BASE_URL) {
  console.warn('[CRM Config] REACT_APP_CRM_BASE_URL is not set. CRM features will not work.');
}

// Holds the current restaurant ID — set after login via setRestaurantId()
let currentRestaurantId = null;

/**
 * Set the active restaurant ID for CRM API key resolution
 * Called once after login/profile load from RestaurantContext or LoadingPage
 */
export const setCrmRestaurantId = (restaurantId) => {
  currentRestaurantId = String(restaurantId);
  const hasKey = !!CRM_API_KEYS[currentRestaurantId];
  console.log(`[CRM Config] Restaurant ${currentRestaurantId} — API key ${hasKey ? 'found' : 'NOT FOUND'}`);
};

/**
 * Get the CRM API key for the current restaurant
 */
export const getCrmApiKey = () => {
  if (!currentRestaurantId) return null;
  return CRM_API_KEYS[currentRestaurantId] || null;
};

const crmApi = axios.create({
  baseURL: CRM_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor — attach X-API-Key dynamically per restaurant
crmApi.interceptors.request.use(
  (config) => {
    const apiKey = getCrmApiKey();
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    } else {
      console.warn('[CRM] No API key for restaurant:', currentRestaurantId);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — extract readable error
crmApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'CRM request failed';

    error.readableMessage = errorMessage;
    return Promise.reject(error);
  }
);

export default crmApi;
