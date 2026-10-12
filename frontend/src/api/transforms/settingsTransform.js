// Settings Transform - Cancellation Reasons & other settings

import { YES_NO_MAP, CANCELLATION_TYPES } from '../constants';

/**
 * Helper to convert status to boolean
 */
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return YES_NO_MAP[value] ?? false;
};

// =============================================================================
// API → Frontend (Response)
// =============================================================================
export const fromAPI = {
  /**
   * Transform cancellation reasons list response
   */
  cancellationReasonsResponse: (api) => ({
    reasons: fromAPI.cancellationReasonsList(api.reasons),
    total: api.total_size || 0,
    limit: parseInt(api.limit) || 10,
    page: parseInt(api.offset) || 1,
  }),

  /**
   * Transform cancellation reasons array
   */
  cancellationReasonsList: (apiReasons) => {
    if (!Array.isArray(apiReasons)) return [];
    return apiReasons
      .map(fromAPI.cancellationReason)
      .filter((reason) => reason.isActive);
  },

  /**
   * Transform single cancellation reason
   */
  cancellationReason: (api) => ({
    reasonId: api.id,
    reasonText: api.reason,
    
    // Applies to
    itemType: api.item_type, // 'Order', 'Item', or null (both)
    applicableTo: fromAPI.getApplicableTo(api.item_type),
    isForOrder: api.item_type === CANCELLATION_TYPES.ORDER || api.item_type === null,
    isForItem: api.item_type === CANCELLATION_TYPES.ITEM || api.item_type === null,
    
    // Status
    isActive: toBoolean(api.status),
    
    // Metadata
    userType: api.user_type,
    restaurantId: api.restaurant_id,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }),

  /**
   * Get human-readable applicable to text
   */
  getApplicableTo: (itemType) => {
    if (itemType === CANCELLATION_TYPES.ORDER) return 'Order Level';
    if (itemType === CANCELLATION_TYPES.ITEM) return 'Item Level';
    return 'Both';
  },

  /**
   * Filter reasons by type
   */
  filterByType: (reasons, type) => {
    if (type === 'order') {
      return reasons.filter((r) => r.isForOrder);
    }
    if (type === 'item') {
      return reasons.filter((r) => r.isForItem);
    }
    return reasons;
  },
};

// =============================================================================
// Frontend → API (Request) - Phase 2
// =============================================================================
export const toAPI = {
  // Will be added in Phase 2 for create/update operations
};
