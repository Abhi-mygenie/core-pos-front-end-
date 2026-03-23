// Product Service - Products API calls

import api from '../axios';
import { API_ENDPOINTS, PAGINATION } from '../constants';
import { fromAPI } from '../transforms/productTransform';

/**
 * Fetch all products (with pagination for large datasets)
 * @param {Object} options - { limit, offset, type }
 * @returns {Promise<Object>} - Transformed products response
 */
export const getProducts = async (options = {}) => {
  const params = {
    limit: options.limit || PAGINATION.DEFAULT_LIMIT,
    offset: options.offset || PAGINATION.DEFAULT_OFFSET,
    type: options.type || PAGINATION.PRODUCTS_TYPE,
  };
  
  const response = await api.get(API_ENDPOINTS.PRODUCTS, { params });
  return fromAPI.productListResponse(response.data);
};

/**
 * Fetch all products (load all pages for caching)
 * @returns {Promise<Array>} - All products
 */
export const getAllProducts = async () => {
  const result = await getProducts({ limit: 500, offset: 1, type: 'all' });
  return result.products;
};

/**
 * Fetch popular/bestseller products
 * @param {Object} options - { limit, offset, type }
 * @returns {Promise<Object>} - Transformed popular products response
 */
export const getPopularFood = async (options = {}) => {
  const params = {
    limit: options.limit || PAGINATION.DEFAULT_LIMIT,
    offset: options.offset || PAGINATION.DEFAULT_OFFSET,
    type: options.type || PAGINATION.PRODUCTS_TYPE,
  };
  
  const response = await api.get(API_ENDPOINTS.POPULAR_FOOD, { params });
  return fromAPI.popularFoodResponse(response.data);
};

/**
 * Get product by ID from cached list
 * @param {Array} products - Products list
 * @param {number} productId - Product ID to find
 * @returns {Object|null} - Product or null
 */
export const getProductById = (products, productId) => {
  return products.find((prod) => prod.productId === productId) || null;
};

/**
 * Filter products by category
 * @param {Array} products - Products list
 * @param {number} categoryId - Category ID to filter by
 * @returns {Array} - Filtered products
 */
export const filterByCategory = (products, categoryId) => {
  if (!categoryId) return products;
  return products.filter((prod) => prod.categoryId === categoryId);
};

/**
 * Filter products by search term
 * @param {Array} products - Products list
 * @param {string} searchTerm - Search term
 * @returns {Array} - Filtered products
 */
export const searchProducts = (products, searchTerm) => {
  if (!searchTerm) return products;
  const term = searchTerm.toLowerCase();
  return products.filter((prod) => 
    prod.productName.toLowerCase().includes(term) ||
    prod.description?.toLowerCase().includes(term)
  );
};

/**
 * Filter products by availability status
 * @param {Array} products - Products list
 * @param {Object} filters - { inStock, active }
 * @returns {Array} - Filtered products
 */
export const filterByAvailability = (products, filters = {}) => {
  let result = products;
  
  if (filters.inStock !== undefined) {
    result = result.filter((prod) => !prod.isOutOfStock === filters.inStock);
  }
  
  if (filters.active !== undefined) {
    result = result.filter((prod) => prod.isActive === filters.active);
  }
  
  return result;
};

/**
 * Get popular products (sorted by order count)
 * @param {Array} products - Products list
 * @param {number} limit - Number of products to return
 * @returns {Array} - Popular products
 */
export const getPopularProducts = (products, limit = 10) => {
  return [...products]
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, limit);
};
