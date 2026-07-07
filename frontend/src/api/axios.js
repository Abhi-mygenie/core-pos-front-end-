// Axios instance with interceptors for API calls
import axios from 'axios';

// Base URL for MyGenie API
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('[Config] REACT_APP_API_BASE_URL is not set. Check your .env file.');
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 60000, // 60 seconds
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('remember_me');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/') {
        // Signal intentional navigation so beforeunload doesn't show dialog
        sessionStorage.setItem('auth_redirect', '1');
        window.location.href = '/';
      }
    }
    
    // Extract error message from API response — CR-027 Phase 1 (§4.2)
    // 6-branch chain. Additive: branches 1, 4, 5 are new; existing consumers
    // of `err.readableMessage` see identical behaviour for shapes that
    // matched before.

    // Branch 1 (new): Laravel default 422 object shape — errors: { field: ["msg"] }
    let validationLine = '';
    const errs = error.response?.data?.errors;
    if (errs && typeof errs === 'object' && !Array.isArray(errs)) {
      const firstKey = Object.keys(errs)[0];
      validationLine = errs[firstKey]?.[0] || '';
    }

    // Branches 4 & 5 (new): friendly network/timeout text instead of raw axios codes
    const friendlyTimeout = error.code === 'ECONNABORTED'
      ? 'Request timed out. Check your connection and try again.'
      : '';
    const friendlyNetwork = error.code === 'ERR_NETWORK'
      ? 'Cannot reach server. Check your internet connection.'
      : '';

    // Branch 3b (added 2026-06-12, preprod-verified): some endpoints return
    // { error: "msg" } on 4xx (e.g. POST add-categories duplicate name → 400
    // {"error":"Category with this name already exists in this restaurant"}).
    const dataError = typeof error.response?.data?.error === 'string'
      ? error.response.data.error
      : '';

    const errorMessage =
      validationLine ||
      error.response?.data?.errors?.[0]?.message ||
      error.response?.data?.message ||
      dataError ||
      friendlyTimeout ||
      friendlyNetwork ||
      error.message ||
      'Something went wrong';

    // Attach readable message to error
    error.readableMessage = errorMessage;
    
    return Promise.reject(error);
  }
);

export default api;
