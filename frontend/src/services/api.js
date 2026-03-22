import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export default api;
