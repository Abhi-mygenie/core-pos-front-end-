// Category Service - Categories API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI } from '../transforms/categoryTransform';

/**
 * Fetch all categories
 * @returns {Promise<Array>} - Transformed categories list
 */
export const getCategories = async () => {
  const response = await api.get(API_ENDPOINTS.CATEGORIES);
  return fromAPI.categoryList(response.data);
};

/**
 * Get category by ID from cached list
 * @param {Array} categories - Categories list
 * @param {number} categoryId - Category ID to find
 * @returns {Object|null} - Category or null
 */
export const getCategoryById = (categories, categoryId) => {
  return categories.find((cat) => cat.categoryId === categoryId) || null;
};

/**
 * Calculate item count per category from products
 * @param {Array} categories - Categories list
 * @param {Array} products - Products list
 * @returns {Array} - Categories with item counts
 */
export const calculateItemCounts = (categories, products) => {
  const counts = {};
  
  // Count products per category
  products.forEach((product) => {
    const catId = product.categoryId;
    counts[catId] = (counts[catId] || 0) + 1;
  });
  
  // Update categories with counts
  return categories.map((category) => ({
    ...category,
    itemCount: counts[category.categoryId] || 0,
  }));
};
