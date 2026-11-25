// Category Transform - Categories API response mapping

import { YES_NO_MAP } from '../constants';

/**
 * Helper to convert status to boolean
 */
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return YES_NO_MAP[value] ?? false;
};

/**
 * Helper to construct full image URL for categories
 */
const getCategoryImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath === 'def.png') return null; // Default placeholder
  const baseUrl = process.env.REACT_APP_API_BASE_URL;
  return `${baseUrl}/storage/category/${imagePath}`;
};

// =============================================================================
// API → Frontend (Response)
// =============================================================================
export const fromAPI = {
  /**
   * Transform categories list response
   */
  categoryList: (apiCategories) => {
    if (!Array.isArray(apiCategories)) return [];
    return apiCategories
      .map(fromAPI.category)
      .filter((cat) => cat.isActive) // Only active categories
      .filter((cat) => cat.categoryName.toLowerCase() !== 'check in') // Hide system "Check In" category
      .sort((a, b) => a.sortOrder - b.sortOrder); // Sort by cat_order
  },

  /**
   * Transform single category
   */
  category: (api) => ({
    categoryId: api.id,
    categoryName: api.name,
    categoryImage: getCategoryImageUrl(api.image),
    slug: api.slug,
    parentId: api.parent_id || 0,
    sortOrder: api.cat_order || 0,
    position: api.position || 0,
    isActive: toBoolean(api.status),
    itemCount: 0, // Will be calculated from products
    restaurantId: api.restaurant_id,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }),
};

// =============================================================================
// Frontend → API (Request) - Phase 2
// =============================================================================
export const toAPI = {
  // Will be added in Phase 2 for create/update operations
};
