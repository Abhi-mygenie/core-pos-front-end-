// Customer Transform - Maps raw API customer data to canonical frontend schema
// Sprint 3 / CHG-036 — Customer Lookup API
// Endpoint: POST /api/v2/vendoremployee/restaurant-customer-list

// =============================================================================
// API → Frontend (Response)
// =============================================================================
export const fromAPI = {
  /**
   * Transform single customer from search API
   * Phase 1/2: name + phone only
   * Phase 3: add loyalty, wallet, birthday, anniversary, GST, memberId
   */
  customer: (api) => ({
    customerId:    api.id,
    name:          (api.customer_name || '').trim(),   // full name field
    phone:         api.phone || '',

    // Phase 3 — parked
    // loyaltyPoints: api.loyalty_point || 0,
    // walletBalance: parseFloat(api.wallet_balance) || 0,
    // birthday:      api.date_of_birth || null,
    // anniversary:   api.date_of_anniversary || null,
    // memberId:      api.membership_id || null,
    // gstNumber:     api.gst_number || null,
    // gstName:       api.gst_name || null,
  }),

  /**
   * Transform customer search results list
   * Response shape: { customer_list: [...] }
   */
  customerList: (apiList) => {
    if (!Array.isArray(apiList)) return [];
    return apiList
      .map(fromAPI.customer)
      .filter(c => c.name || c.phone); // skip blank entries
  },
};

// =============================================================================
// Frontend → API (Request)
// =============================================================================
export const toAPI = {
  /**
   * Customer search payload
   * @param {string} query - Phone number or name typed by waiter
   */
  searchCustomer: (query) => ({
    key: [query],
  }),

  /**
   * Attach customer to order — CHG-041 Update Order
   * Endpoint: TBD — provided by backend in Sprint 3
   */
  attachCustomer: (customer) => ({
    // TODO: map fields when endpoint is provided
  }),
};
