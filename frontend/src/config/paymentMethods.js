/**
 * Payment Methods Registry
 * 
 * Single source of truth for all payment method configurations.
 * Used by CollectPaymentPanel for rendering and API payload construction.
 * 
 * API provides paymentTypes array with available methods:
 * [{ id: 1, name: 'cash', displayName: 'Cash' }, ...]
 * 
 * We map API 'name' to our method IDs for known methods,
 * and dynamically add unknown types from API.
 */

import { Banknote, CreditCard, Smartphone, Split, FileText, ArrowRightLeft, CreditCard as CardIcon, MoreHorizontal } from "lucide-react";

// ============================================================================
// API NAME TO METHOD ID MAPPING
// ============================================================================

// Maps API paymentTypes 'name' to our internal method IDs
export const API_NAME_TO_METHOD_ID = {
  'cash': 'cash',
  'card': 'card',
  'upi': 'upi',
  'partial': 'split',      // API calls split as 'partial'
  'tab': 'credit',
  'credit': 'credit',
  'OTHER': 'other',
  'OTHERS': 'other',
};

// ============================================================================
// PAYMENT METHODS REGISTRY (Known Methods)
// ============================================================================

export const PAYMENT_METHODS = {
  // Primary Payment Methods
  cash: {
    id: "cash",
    icon: Banknote,
    label: "Cash",
    apiValue: "cash",
    apiNames: ["cash"],     // API names that map to this method
    type: "method",
    special: false,
  },
  card: {
    id: "card",
    icon: CreditCard,
    label: "Card",
    apiValue: "card",
    apiNames: ["card"],
    type: "method",
    special: false,
  },
  upi: {
    id: "upi",
    icon: Smartphone,
    label: "UPI",
    apiValue: "upi",
    apiNames: ["upi"],
    type: "method",
    special: false,
  },
  credit: {
    id: "credit",
    icon: FileText,
    label: "Credit",
    apiValue: "TAB",
    apiNames: ["tab", "credit"],
    type: "method",
    special: false,
  },

  // Action Methods
  split: {
    id: "split",
    icon: Split,
    label: "Split",
    apiValue: "partial",
    apiNames: ["partial"],
    type: "action",
    special: true,          // Has custom split payment UI
  },
  transferToRoom: {
    id: "transferToRoom",
    icon: ArrowRightLeft,
    label: "To Room",
    apiValue: "ROOM",
    apiNames: ["room", "transfer_room"],
    type: "action",
    special: true,          // Has custom room picker UI
    requiresRooms: true,    // Only show if restaurant has rooms
  },
  other: {
    id: "other",
    icon: MoreHorizontal,
    label: "Other",
    apiValue: "OTHER",
    apiNames: ["OTHER", "OTHERS"],
    type: "method",
    special: false,
  },
};

// ============================================================================
// DEFAULT LAYOUT CONFIGURATION
// ============================================================================

export const DEFAULT_PAYMENT_LAYOUT = {
  row1: ["cash", "card", "upi"],           // Primary payment methods
  row2: ["split", "credit", "transferToRoom"], // Actions
  dropdown: [],                             // Additional payment types from API
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get payment method config by ID
 */
export const getPaymentMethod = (methodId) => {
  return PAYMENT_METHODS[methodId] || null;
};

/**
 * Get icon component for a payment method
 */
export const getPaymentIcon = (methodId) => {
  return PAYMENT_METHODS[methodId]?.icon || MoreHorizontal;
};

/**
 * Get API value for a payment method
 */
export const getPaymentApiValue = (methodId) => {
  return PAYMENT_METHODS[methodId]?.apiValue || methodId;
};

/**
 * Map API paymentType name to our method ID
 */
export const mapApiNameToMethodId = (apiName) => {
  const lowerName = (apiName || '').toLowerCase();
  
  // Check direct mapping first
  if (API_NAME_TO_METHOD_ID[apiName]) {
    return API_NAME_TO_METHOD_ID[apiName];
  }
  
  // Check in PAYMENT_METHODS apiNames arrays
  for (const [methodId, config] of Object.entries(PAYMENT_METHODS)) {
    if (config.apiNames?.some(n => n.toLowerCase() === lowerName)) {
      return methodId;
    }
  }
  
  // Return original name for dynamic/unknown types
  return apiName;
};

/**
 * Check if a method ID exists in API paymentTypes
 * @param {string} methodId - Our internal method ID
 * @param {Array} apiPaymentTypes - API paymentTypes array [{id, name, displayName}, ...]
 * @returns {boolean}
 */
export const isMethodInApiTypes = (methodId, apiPaymentTypes = []) => {
  const method = PAYMENT_METHODS[methodId];
  if (!method) return false;
  
  // Check if any API name matches
  return apiPaymentTypes.some(pt => 
    method.apiNames?.some(apiName => 
      apiName.toLowerCase() === (pt.name || '').toLowerCase()
    )
  );
};

/**
 * Filter layout config by what's available in API paymentTypes
 * @param {Object} layoutConfig - Layout configuration {row1, row2, dropdown}
 * @param {Array} apiPaymentTypes - API paymentTypes array
 * @param {boolean} hasRooms - Whether restaurant has rooms
 * @returns {Object} Filtered layout config
 */
export const filterLayoutByApiTypes = (layoutConfig, apiPaymentTypes = [], hasRooms = false) => {
  const filterMethods = (methodIds) => 
    methodIds.filter(id => {
      const method = PAYMENT_METHODS[id];
      
      // Check if method requires rooms
      if (method?.requiresRooms && !hasRooms) {
        return false;
      }
      
      // Special actions (split) - check if 'partial' exists in API
      if (id === 'split') {
        return apiPaymentTypes.some(pt => pt.name?.toLowerCase() === 'partial');
      }
      
      // transferToRoom - only if hasRooms (already checked above)
      if (id === 'transferToRoom') {
        return hasRooms;
      }
      
      // For regular methods, check if they exist in API paymentTypes
      return isMethodInApiTypes(id, apiPaymentTypes);
    });

  return {
    row1: filterMethods(layoutConfig.row1 || []),
    row2: filterMethods(layoutConfig.row2 || []),
    dropdown: filterMethods(layoutConfig.dropdown || []),
  };
};

/**
 * Get dynamic payment types from API that aren't primary methods
 * These are types like 'dineout', 'zomato_gold', 'OTHER', etc.
 * Only filters out primary payment methods (cash, upi, card) and split (partial)
 * @param {Array} apiPaymentTypes - API paymentTypes array
 * @returns {Array} Dynamic types with {id, name, displayName, apiValue}
 */
export const getDynamicPaymentTypes = (apiPaymentTypes = []) => {
  // Only filter out primary methods that are shown as buttons in Row 1 + Split + Room
  // BUG-257: 'room' excluded — room billing handled separately via "To Room" transfer action
  const primaryApiNames = ['cash', 'upi', 'card', 'partial', 'room'];
  
  return apiPaymentTypes
    .filter(pt => !primaryApiNames.includes((pt.name || '').toLowerCase()))
    .map(pt => ({
      id: pt.name,
      name: pt.name,
      displayName: (pt.name || '').toLowerCase() === 'tab' ? 'Credit' : (pt.displayName || pt.name),
      apiValue: pt.name,
      isDynamic: true,
    }));
};

/**
 * Get all available payment options combining known methods and dynamic API types
 * @param {Array} apiPaymentTypes - API paymentTypes array
 * @param {boolean} hasRooms - Whether restaurant has rooms
 * @returns {Object} { knownMethods: [...], dynamicTypes: [...] }
 */
export const getAllPaymentOptions = (apiPaymentTypes = [], hasRooms = false) => {
  // Get known methods that exist in API
  const knownMethods = Object.keys(PAYMENT_METHODS).filter(methodId => {
    const method = PAYMENT_METHODS[methodId];
    
    if (method.requiresRooms && !hasRooms) return false;
    if (methodId === 'transferToRoom') return hasRooms;
    if (methodId === 'split') {
      return apiPaymentTypes.some(pt => pt.name?.toLowerCase() === 'partial');
    }
    
    return isMethodInApiTypes(methodId, apiPaymentTypes);
  });
  
  // Get dynamic types from API
  const dynamicTypes = getDynamicPaymentTypes(apiPaymentTypes);
  
  return {
    knownMethods,
    dynamicTypes,
  };
};
