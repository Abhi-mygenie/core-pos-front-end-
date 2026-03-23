// Product Transform - Products API response mapping

import { YES_NO_MAP, FOOD_TYPES, TAX_CALC_TYPES, STATION_TYPES } from '../constants';

/**
 * Helper to convert Yes/No/Y/N strings to boolean
 */
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return YES_NO_MAP[value] ?? false;
};

/**
 * Helper to get product image URL
 */
const getProductImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  // Default image check
  if (imagePath.includes('food-default-image')) return null;
  return imagePath;
};

// =============================================================================
// API → Frontend (Response)
// =============================================================================
export const fromAPI = {
  /**
   * Transform products list response (paginated)
   */
  productListResponse: (api) => ({
    products: fromAPI.productList(api.products),
    total: api.total_size || 0,
    limit: parseInt(api.limit) || 10,
    page: parseInt(api.offset) || 1,
  }),

  /**
   * Transform products array
   */
  productList: (apiProducts) => {
    if (!Array.isArray(apiProducts)) return [];
    return apiProducts.map(fromAPI.product);
  },

  /**
   * Transform single product
   */
  product: (api) => ({
    productId: api.id,
    productName: api.name,
    description: api.description || '',
    productImage: getProductImageUrl(api.image),
    slug: api.slug,
    
    // Category
    categoryId: api.category_id,
    categoryIds: fromAPI.categoryIds(api.category_ids),
    
    // Pricing
    basePrice: parseFloat(api.price) || 0,
    discount: parseFloat(api.discount) || 0,
    discountType: api.discount_type?.toLowerCase() || 'percent',
    
    // Tax
    tax: {
      percentage: parseFloat(api.tax) || 0,
      type: api.tax_type || 'GST',
      calculation: api.tax_calc || TAX_CALC_TYPES.EXCLUSIVE,
      isInclusive: api.tax_calc === TAX_CALC_TYPES.INCLUSIVE,
    },
    
    // Food type
    isVeg: api.veg === FOOD_TYPES.VEG,
    hasEgg: toBoolean(api.egg),
    isJain: toBoolean(api.jain),
    allergen: api.allergen,
    
    // Variations (sizes/options)
    variations: fromAPI.variations(api.variations),
    hasVariations: Array.isArray(api.variations) && api.variations.length > 0,
    
    // Add-ons
    addOns: api.add_ons || [],
    
    // Availability
    isActive: toBoolean(api.status),
    isOutOfStock: toBoolean(api.stock_out),
    isDisabled: toBoolean(api.is_disable),
    availableTimeStart: api.available_time_starts,
    availableTimeEnd: api.available_time_ends,
    
    // Channel availability
    availability: {
      dineIn: toBoolean(api.dinein),
      takeaway: toBoolean(api.takeaway),
      delivery: toBoolean(api.delivery),
    },
    
    // Station routing (for KOT)
    station: api.station_name || STATION_TYPES.KDS,
    
    // Order stats
    orderCount: api.order_count || 0,
    isRecommended: toBoolean(api.recommended),
    avgRating: parseFloat(api.avg_rating) || 0,
    ratingCount: api.rating_count || 0,
    
    // Complementary
    isComplementary: toBoolean(api.complementary),
    complementaryPrice: parseFloat(api.complementary_price) || 0,
    
    // Inventory
    isInventoryLinked: toBoolean(api.is_inventory),
    hasRecipe: api.is_recipe === 'Y',
    recipeId: api.recipe_id,
    
    // Charges
    takeawayCharge: parseFloat(api.takeaway_charge) || 0,
    deliveryCharge: parseFloat(api.delivery_charge) || 0,
    packCharges: parseFloat(api.pack_charges) || 0,
    
    // Timing
    prepTimeMin: api.prepration_time_min || 0,
    serveTimeMin: api.serve_time_in_min || 0,
    
    // Metadata
    itemCode: api.item_code,
    restaurantId: api.restaurant_id,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }),

  /**
   * Transform category IDs array
   */
  categoryIds: (apiCategoryIds) => {
    if (!Array.isArray(apiCategoryIds)) return [];
    return apiCategoryIds
      .map((cat) => parseInt(cat.id))
      .filter((id) => id > 0);
  },

  /**
   * Transform variations (sizes/options)
   */
  variations: (apiVariations) => {
    if (!Array.isArray(apiVariations)) return [];
    return apiVariations.map((variation, idx) => ({
      id: `vg-${idx}`,
      name: variation.name,
      type: variation.type, // 'single' or 'multi'
      required: variation.required === 'on',
      min: variation.min || 0,
      max: variation.max || 0,
      options: fromAPI.variationOptions(variation.values),
    }));
  },

  /**
   * Transform variation options
   */
  variationOptions: (apiValues) => {
    if (!Array.isArray(apiValues)) return [];
    return apiValues.map((value, idx) => ({
      id: `vo-${idx}`,
      name: value.label,
      price: parseFloat(value.optionPrice) || 0,
    }));
  },

  /**
   * Transform popular food response (same structure)
   */
  popularFoodResponse: (api) => fromAPI.productListResponse(api),
};

// =============================================================================
// Frontend → API (Request) - Phase 2
// =============================================================================
export const toAPI = {
  // Will be added in Phase 2 for create/update operations
};
