import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Debug logger for API calls
const apiLog = (method, url, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`🌐 [API] ${timestamp} - ${method} ${url}`, data || '');
};

const apiResponseLog = (method, url, status, data = null) => {
  const timestamp = new Date().toISOString();
  const statusEmoji = status >= 200 && status < 300 ? '✅' : '❌';
  console.log(`${statusEmoji} [API Response] ${timestamp} - ${method} ${url} (${status})`, data ? { dataKeys: Object.keys(data) } : '');
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests and log
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  apiLog(config.method?.toUpperCase(), config.url, config.data);
  return config;
});

// Log responses
api.interceptors.response.use(
  (response) => {
    apiResponseLog(response.config.method?.toUpperCase(), response.config.url, response.status, response.data);
    return response;
  },
  (error) => {
    const status = error.response?.status || 'Network Error';
    apiResponseLog(error.config?.method?.toUpperCase(), error.config?.url, status, error.response?.data);
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/api/v1/auth/vendoremployee/login', {
      email,
      password,
    });
    return response.data;
  },
};

// Vendor Profile APIs
export const vendorAPI = {
  getProfile: async () => {
    const response = await api.get('/api/v2/vendoremployee/vendor-profile/profile');
    return response.data;
  },
  
  // Update will be added when API is provided
  updateBasicInfo: async (data) => {
    // TODO: Implement when update API is provided
    console.log('Update API not yet implemented', data);
    return { success: true };
  },
};

// Menu Management APIs
export const menuAPI = {
  // Get categories for logged-in vendor's restaurant
  getCategories: async () => {
    const response = await api.get('/api/v1/vendoremployee/get-categories');
    return response.data;
  },
  
  // Get products list with pagination and optional category filter
  getProducts: async (limit = 10, offset = 1, type = 'all', categoryId = null) => {
    let url = `/api/v1/vendoremployee/get-products-list?limit=${limit}&offset=${offset}&type=${type}`;
    if (categoryId) {
      url += `&category_id=${categoryId}`;
    }
    const response = await api.get(url);
    return response.data;
  },
  
  // TODO: Add CRUD operations when APIs are provided
};

// Table/Dashboard APIs
export const tableAPI = {
  // Get all tables with engage status (for Dashboard)
  getAllTables: async () => {
    const response = await api.get('/api/v1/vendoremployee/all-table-list');
    return response.data;
  },
  
  // Get only free/available tables (for table selection)
  getFreeTables: async () => {
    const response = await api.get('/api/v1/vendoremployee/get-table-list');
    return response.data;
  },
  
  // TODO: Add CRUD operations when APIs are provided
};

// Cancellation Reasons APIs
export const cancellationAPI = {
  // Get all cancellation reasons
  getReasons: async (limit = 50, offset = 1) => {
    const response = await api.get(`/api/v1/vendoremployee/cancellation-reasons?limit=${limit}&offset=${offset}`);
    return response.data;
  },
  
  // TODO: Add create/update/delete when APIs are provided
};

// Order APIs
export const orderAPI = {
  // Get station orders (for KDS, kitchen display)
  getStationOrders: async (roleName = 'KDS') => {
    const formData = new FormData();
    formData.append('role_name', roleName);
    
    const response = await api.post('/api/v1/vendoremployee/station-order-list', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // TODO: Add order status update, cancel order, etc. when APIs are provided
};

export default api;
