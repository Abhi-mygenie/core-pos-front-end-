// CRM Axios instance — all customer/address/loyalty calls go through this
// Auth: X-API-Key header (per restaurant, long-lived)
// Base URL: REACT_APP_CRM_BASE_URL from .env

import axios from 'axios';

const CRM_BASE_URL = process.env.REACT_APP_CRM_BASE_URL;
const CRM_API_KEY = process.env.REACT_APP_CRM_API_KEY;

if (!CRM_BASE_URL) {
  console.warn('[CRM Config] REACT_APP_CRM_BASE_URL is not set. CRM features will not work.');
}

const crmApi = axios.create({
  baseURL: CRM_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor — attach X-API-Key
crmApi.interceptors.request.use(
  (config) => {
    if (CRM_API_KEY) {
      config.headers['X-API-Key'] = CRM_API_KEY;
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
