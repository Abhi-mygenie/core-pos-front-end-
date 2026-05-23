// Station Service - Kitchen Station API calls

import api from '../axios';

/**
 * Station View Storage Key
 */
export const STATION_VIEW_STORAGE_KEY = 'mygenie_station_view_config';

/**
 * Default station view config
 */
export const DEFAULT_STATION_VIEW_CONFIG = {
  enabled: true,  // Enabled by default
  stations: [],
  displayMode: 'stacked', // 'stacked' | 'accordion'
};

/**
 * Extract unique station names from products
 * @param {Array} products - Products array with station field
 * @returns {Array} - Unique station names
 */
export const extractUniqueStations = (products) => {
  if (!Array.isArray(products)) return [];
  
  const stationSet = new Set();
  products.forEach(product => {
    if (product.station) {
      stationSet.add(product.station);
    }
  });
  
  // Convert to array and sort
  const stations = Array.from(stationSet).sort();
  console.log('[StationService] Extracted unique stations:', stations);
  return stations;
};

/**
 * Get stations with item counts from order items
 * Looks up each item's station from the products catalog
 * 
 * @param {Array} orderItems - Order items array (from order.items or cart)
 * @param {Function} getProductById - Function to get product by ID from MenuContext
 * @returns {Array} - Array of { station, itemCount, items } objects
 */
export const getStationsFromOrderItems = (orderItems, getProductById) => {
  if (!Array.isArray(orderItems) || !getProductById) {
    console.log('[StationService] getStationsFromOrderItems: Invalid params');
    return [];
  }

  const stationMap = new Map(); // station -> { items: [], count: 0 }

  orderItems.forEach(item => {
    // Get foodId from various possible locations
    const foodId = item.foodId || item.food_id || item.food_details?.id || item.productId;
    
    if (!foodId) {
      console.log('[StationService] Item has no foodId:', item);
      return;
    }

    // Look up product in catalog
    const product = getProductById(Number(foodId));
    const station = product?.station;

    if (!station) {
      console.log(`[StationService] No station for foodId ${foodId}, skipping`);
      return; // No KOT for items without station
    }

    const quantity = item.quantity || item.qty || 1;
    const itemName = item.name || item.foodName || item.food_details?.name || product?.productName || 'Unknown';

    if (!stationMap.has(station)) {
      stationMap.set(station, { items: [], count: 0 });
    }

    const stationData = stationMap.get(station);
    stationData.items.push({ foodId, name: itemName, quantity });
    stationData.count += quantity;
  });

  // Convert to array format
  const result = Array.from(stationMap.entries()).map(([station, data]) => ({
    station,
    itemCount: data.count,
    items: data.items,
  })).sort((a, b) => a.station.localeCompare(b.station));

  console.log('[StationService] getStationsFromOrderItems result:', result);
  return result;
};

/**
 * Get station view config from localStorage
 * @returns {Object} Station view configuration
 */
export const getStationViewConfig = () => {
  try {
    const stored = localStorage.getItem(STATION_VIEW_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_STATION_VIEW_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('[StationService] Failed to parse station view config:', e);
  }
  return DEFAULT_STATION_VIEW_CONFIG;
};

/**
 * BUG-026: Parse variation array → stable signature + display label.
 * Canonical shape from CartPanel.jsx:75–88 (matches live socket payload):
 *   [{ name: "varrient", values: [{ label: "30ML", optionPrice: "0" }] }]
 * Sorted signature ensures reorderings don't split aggregation.
 */
const parseVariants = (variations) => {
  if (!Array.isArray(variations) || variations.length === 0) return { sig: '', label: '' };
  const parts = variations.map((v) => {
    if (typeof v === 'string') return { sig: v, label: v };
    const name = v.name || v.variant_name || v.variant_group || '';

    let labels = [];
    if (Array.isArray(v.values)) {
      labels = v.values.map((val) => val?.label).filter(Boolean);
    } else if (Array.isArray(v.values?.label)) {
      labels = v.values.label;
    } else if (Array.isArray(v.labels) && v.labels.length > 0) {
      labels = v.labels;
    } else {
      const fallback = v.value || v.option_label || v.label || v.selected_option;
      if (fallback) labels = [fallback];
    }

    return {
      sig: `${name}=${labels.join('|')}`,
      label: labels.join(', ') || name,
    };
  });
  parts.sort((a, b) => a.sig.localeCompare(b.sig));
  return {
    sig: parts.map((p) => p.sig).join(';'),
    label: parts.map((p) => p.label).filter(Boolean).join(', '),
  };
};

/**
 * BUG-026: Parse add_ons array → stable signature + display label.
 * Quantity is part of the signature so "1 raita" and "2 raita" rows do NOT merge.
 */
const parseAddOns = (addOns) => {
  if (!Array.isArray(addOns) || addOns.length === 0) return { sig: '', label: '' };
  const parts = addOns.map((a) => {
    const name = a.name || a.addon_name || '';
    const qty = Number(a.quantity || a.qty || 1);
    return {
      sig: `${name}=${qty}`,
      label: qty > 1 ? `+ ${qty}× ${name}` : `+ ${name}`,
    };
  });
  parts.sort((a, b) => a.sig.localeCompare(b.sig));
  return {
    sig: parts.map((p) => p.sig).join(';'),
    label: parts.map((p) => p.label).filter(Boolean).join(', '),
  };
};

/**
 * Fetch aggregated station data (station-order-list API)
 * Returns categories with item counts per station
 * 
 * @param {string} stationName - Station name (e.g., 'KDS', 'BAR')
 * @param {Map|Object} categoriesMap - Map of category_id to category_name (optional)
 * @returns {Promise<Object>} - { categories: [...], totalItems: number }
 */
export const fetchStationData = async (stationName = 'KDS', categoriesMap = null) => {
  try {
    console.log(`[StationService] Fetching station data for ${stationName}...`);
    
    // Use station-order-list API which returns orders by station
    const formData = new FormData();
    formData.append('role_name', stationName);
    formData.append('def_order_status', '1'); // Preparing status
    
    const response = await api.post('/api/v1/vendoremployee/station-order-list', formData);
    
    console.log('[StationService] Raw API response:', response.data);
    
    const orders = response.data?.orders || [];
    
    // Aggregate items by category from orders
    const categoryMap = new Map();
    
    orders.forEach(order => {
      const foodItems = order.order_details_food || [];
      foodItems.forEach(item => {
        // B2 defensive filter (HANDOVER_v3.1, 2026-04-26):
        // Backend currently returns Ready/Cancelled items on
        // `def_order_status=1` queries (B1, backend bug — see captured payload
        // for order #731715). Skip any item whose item-level food_status is
        // not 1 (Preparing) to keep the kitchen panel honest. Items without a
        // food_status field at all still pass through for legacy safety.
        if (item.food_status !== undefined && item.food_status !== 1) return;

        // Only count items for this station
        if (item.station === stationName || !item.station) {
          const foodName = item.food_details?.name || 'Unknown Item';
          const categoryId = item.food_details?.category_id;
          
          // Look up category name from categoriesMap, fallback to "Other"
          let categoryName = 'Other';
          if (categoriesMap && categoryId) {
            if (categoriesMap instanceof Map) {
              categoryName = categoriesMap.get(categoryId) || categoriesMap.get(String(categoryId)) || 'Other';
            } else if (typeof categoriesMap === 'object') {
              categoryName = categoriesMap[categoryId] || categoriesMap[String(categoryId)] || 'Other';
            }
          }
          
          const quantity = item.quantity || 1;

          // BUG-026: split rows by variant/add-on/notes signature.
          // Notes are part of the signature per locked decision Q6.
          const variant = parseVariants(item.variation);
          const addons = parseAddOns(item.add_ons);
          const noteSig = (item.food_level_notes || '').trim();
          const signatureKey = `${foodName}∷${variant.sig}∷${addons.sig}∷${noteSig}`;

          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, new Map());
          }

          const itemsMap = categoryMap.get(categoryName);
          const existing = itemsMap.get(signatureKey);
          if (existing) {
            existing.count += quantity;
          } else {
            itemsMap.set(signatureKey, {
              name: foodName,
              variantLabel: variant.label,
              addonLabel: addons.label,
              notes: noteSig,
              count: quantity,
            });
          }
        }
      });
    });
    
    // Convert to array format
    const categories = Array.from(categoryMap.entries()).map(([catName, itemsMap]) => {
      const items = Array.from(itemsMap.values()).map((entry) => ({
        name: entry.name,
        variantLabel: entry.variantLabel,
        addonLabel: entry.addonLabel,
        notes: entry.notes,
        count: entry.count,
      }));
      const totalCount = items.reduce((sum, item) => sum + item.count, 0);
      return {
        name: catName,
        items,
        totalCount,
      };
    }).filter(cat => cat.totalCount > 0);
    
    const totalItems = categories.reduce((sum, cat) => sum + cat.totalCount, 0);
    
    console.log(`[StationService] Parsed ${categories.length} categories, ${totalItems} total items from ${orders.length} orders`);
    
    return {
      stationName,
      categories,
      totalItems,
      orderCount: orders.length,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[StationService] Failed to fetch station data for ${stationName}:`, error);
    console.error('[StationService] Error details:', error.response?.data || error.message);
    return {
      stationName,
      categories: [],
      totalItems: 0,
      error: error.message,
    };
  }
};

/**
 * Fetch data for multiple stations in parallel
 * 
 * @param {string[]} stations - Array of station names
 * @returns {Promise<Object>} - { [stationName]: stationData }
 */
export const fetchMultipleStationsData = async (stations = []) => {
  if (stations.length === 0) {
    return {};
  }
  
  // Fetch each station data in parallel
  const results = await Promise.all(
    stations.map(station => fetchStationData(station))
  );
  
  const result = {};
  stations.forEach((station, idx) => {
    result[station] = results[idx];
  });
  
  return result;
};

export default {
  getStationViewConfig,
  fetchStationData,
  fetchMultipleStationsData,
  extractUniqueStations,
  getStationsFromOrderItems,
  STATION_VIEW_STORAGE_KEY,
  DEFAULT_STATION_VIEW_CONFIG,
};
