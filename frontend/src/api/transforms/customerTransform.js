// Customer Transform — Maps CRM POS API responses to frontend schema
// CRM Base: /api/pos/customers
// Auth: X-API-Key

// =============================================================================
// Shared helpers
// =============================================================================

/**
 * BUG-108 Loyalty Pipeline Fix (2026-05-23):
 * Single source of truth for the synthetic loyalty blob shape used when the
 * upstream CRM response only carries flat loyalty fields (tier, total_points,
 * points_value). Both `searchResult` (GET /pos/customers?search=) and
 * `customerLookup` (POST /pos/customer-lookup) feed CollectPaymentPanel via
 * the same `customer.loyalty` shape, so the synthetic blob construction lives
 * here to prevent drift.
 *
 * `loyalty_enabled` defaults to `true` — the lookup/search endpoints do not
 * carry this field, and restaurant-level visibility is gated by
 * `restaurantSettings.isLoyalty` upstream in CollectPaymentPanel.
 */
const buildSyntheticLoyalty = ({ tier, totalPoints, pointsValue }) => ({
  tier:             tier || 'Bronze',
  tier_label:       `${tier || 'Bronze'} Member`,
  total_points:     totalPoints || 0,
  ratio_per_point:  (totalPoints && pointsValue)
                      ? Math.round((pointsValue / totalPoints) * 100) / 100
                      : 0,
  points_value:     pointsValue || 0,
  loyalty_enabled:  true,
});

// =============================================================================
// API → Frontend (Response)
// =============================================================================
export const fromAPI = {
  /**
   * Transform single customer from CRM search (lightweight)
   * Source: GET /pos/customers?search=
   * Returns: id, name, phone, tier, total_points, points_value, wallet_balance,
   *          last_visit + synthetic loyalty blob.
   *
   * BUG-108 Loyalty Pipeline Fix (2026-05-23): typeahead-selected customers
   * must reach CollectPaymentPanel with the same loyalty shape as customerLookup
   * provides. `pointsValue` and the synthetic `loyalty` blob were missing,
   * causing the loyalty section to fall back to "Loyalty program unavailable"
   * even when the customer had points.
   */
  searchResult: (api) => {
    const tier = api.tier || 'Bronze';
    const totalPoints = api.total_points || 0;
    const pointsValue = api.points_value || 0;
    return {
      id:            api.id || '',
      name:          (api.name || '').trim(),
      phone:         api.phone || '',
      tier,
      totalPoints,
      pointsValue,
      walletBalance: api.wallet_balance || 0,
      lastVisit:     api.last_visit || null,
      loyalty:       buildSyntheticLoyalty({ tier, totalPoints, pointsValue }),
    };
  },

  /**
   * Transform search results list
   * Response shape: { success, data: { customers: [...], total } }
   */
  searchResults: (customers) => {
    if (!Array.isArray(customers)) return [];
    return customers
      .map(fromAPI.searchResult)
      .filter(c => c.name || c.phone);
  },

  /**
   * Transform customer from lookup (full profile with addresses)
   * Source: POST /pos/customer-lookup
   */
  customerLookup: (api) => ({
    id:            api.customer_id || '',
    registered:    api.registered || false,
    name:          (api.name || '').trim(),
    phone:         api.phone || '',
    tier:          api.tier || 'Bronze',
    totalPoints:   api.total_points || 0,
    pointsValue:   api.points_value || 0,
    walletBalance: api.wallet_balance || 0,
    totalVisits:   api.total_visits || 0,
    totalSpent:    api.total_spent || 0,
    allergies:     api.allergies || [],
    favorites:     api.favorites || [],
    lastVisit:     api.last_visit || null,
    addresses:     (api.addresses || []).map(fromAPI.address),
    // BUG-108 Phase B + Loyalty Pipeline Fix (2026-05-23):
    // customer-lookup endpoint returns flat loyalty fields only — build the
    // synthetic loyalty blob via the shared helper so searchResult and
    // customerLookup stay in lockstep on the shape consumed by
    // CollectPaymentPanel (customer?.loyalty?.{tier|total_points|points_value|loyalty_enabled}).
    loyalty: buildSyntheticLoyalty({
      tier:        api.tier,
      totalPoints: api.total_points,
      pointsValue: api.points_value,
    }),
  }),

  /**
   * Transform full customer detail
   * Source: GET /pos/customers/{id}
   */
  customerDetail: (api) => ({
    id:            api.id || '',
    name:          (api.name || '').trim(),
    phone:         api.phone || '',
    email:         api.email || '',
    tier:          api.tier || 'Bronze',
    totalPoints:   api.total_points || 0,
    walletBalance: api.wallet_balance || 0,
    totalVisits:   api.total_visits || 0,
    totalSpent:    api.total_spent || 0,
    allergies:     api.allergies || [],
    favorites:     api.favorites || [],
    dob:           api.dob || null,
    anniversary:   api.anniversary || null,
    addresses:     (api.addresses || []).map(fromAPI.address),
    // BUG-108 Phase B: pass through the strict 6-key loyalty blob from CRM LX-A.
    loyalty:       api.loyalty || null,
    // Convenience: extract loyalty_enabled for UI gating
    loyaltyEnabled: api.loyalty?.loyalty_enabled ?? null,
    recentOrders:  api.recent_orders || [],
  }),

  /**
   * Transform single address object
   */
  address: (api) => ({
    // BUG-278 (defensive): prefer `pos_address_id` (canonical) then `id` / `address_id`.
    id:                   api.pos_address_id || api.id || api.address_id || '',
    posAddressId:         api.pos_address_id || null,
    isDefault:            api.is_default || false,
    addressType:          api.address_type || 'Home',
    address:              api.address || '',
    house:                api.house || '',
    floor:                api.floor || '',
    road:                 api.road || '',
    city:                 api.city || '',
    state:                api.state || '',
    pincode:              api.pincode || '',
    country:              api.country || 'India',
    latitude:             api.latitude || '',
    longitude:            api.longitude || '',
    contactPersonName:    api.contact_person_name || '',
    contactPersonNumber:  api.contact_person_number || '',
    deliveryInstructions: api.delivery_instructions || '',
  }),

  /**
   * Transform address list
   * Source: GET /pos/customers/{id}/addresses or POST /pos/address-lookup
   */
  addressList: (addresses) => {
    if (!Array.isArray(addresses)) return [];
    return addresses.map(fromAPI.address);
  },

  /**
   * Transform cross-restaurant address lookup result
   * Source: POST /pos/address-lookup
   */
  crossRestaurantAddress: (api) => ({
    // BUG-278: CRM /pos/address-lookup returns the canonical address id as `pos_address_id`.
    // Place-order payload consumes `selectedAddress.id` → must resolve to a valid numeric id,
    // otherwise payload falls back to `address_id: null` and backend cannot attach the address
    // (downstream symptoms: delivery card "No address", edit screen "Tap to select delivery address").
    id:                api.pos_address_id || api.id || api.address_id || '',
    posAddressId:      api.pos_address_id || null,
    address:           api.address || '',
    city:              api.city || '',
    state:             api.state || '',
    pincode:           api.pincode || '',
    country:           api.country || 'India',
    latitude:          api.latitude || '',
    longitude:         api.longitude || '',
    addressType:       api.address_type || 'Home',
    lastUsedAt:        api.last_used_at || null,
    sourceRestaurant:  api.source_restaurant || '',
  }),

  crossRestaurantAddresses: (addresses) => {
    if (!Array.isArray(addresses)) return [];
    return addresses.map(fromAPI.crossRestaurantAddress);
  },
};

// =============================================================================
// Frontend → API (Request)
// =============================================================================
export const toAPI = {
  /**
   * Create customer payload
   * Endpoint: POST /pos/customers
   */
  createCustomer: ({ name, phone, email, dob, anniversary, gender, countryCode, customerType, addresses }) => {
    const payload = {
      pos_id: 'mygenie',
      restaurant_id: '',  // Set at call site from restaurant context
      name,
      phone,
    };
    if (email) payload.email = email;
    if (dob) payload.dob = dob;
    if (anniversary) payload.anniversary = anniversary;
    if (gender) payload.gender = gender;
    if (countryCode) payload.country_code = countryCode;
    if (customerType) payload.customer_type = customerType;
    if (addresses?.length) payload.addresses = addresses;
    return payload;
  },

  /**
   * Update customer payload
   * Endpoint: PUT /pos/customers/{id}
   */
  updateCustomer: ({ phone, name, email, dob, anniversary }) => {
    const payload = {
      pos_id: 'mygenie',
      restaurant_id: '',  // Set at call site
      phone,
    };
    if (name) payload.name = name;
    if (email) payload.email = email;
    if (dob) payload.dob = dob;
    if (anniversary) payload.anniversary = anniversary;
    return payload;
  },

  /**
   * Add address payload
   * Endpoint: POST /pos/customers/{id}/addresses
   */
  addAddress: ({ addressType, address, house, floor, road, city, state, pincode, latitude, longitude, contactPersonName, contactPersonNumber, deliveryInstructions, isDefault }) => {
    const payload = { address };
    if (addressType) payload.address_type = addressType;
    if (house) payload.house = house;
    if (floor) payload.floor = floor;
    if (road) payload.road = road;
    if (city) payload.city = city;
    if (state) payload.state = state;
    if (pincode) payload.pincode = pincode;
    if (latitude) payload.latitude = latitude;
    if (longitude) payload.longitude = longitude;
    if (contactPersonName) payload.contact_person_name = contactPersonName;
    if (contactPersonNumber) payload.contact_person_number = contactPersonNumber;
    if (deliveryInstructions) payload.delivery_instructions = deliveryInstructions;
    if (isDefault !== undefined) payload.is_default = isDefault;
    return payload;
  },
};
