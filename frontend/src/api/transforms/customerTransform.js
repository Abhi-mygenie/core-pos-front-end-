// Customer Transform — Maps CRM POS API responses to frontend schema
// CRM Base: /api/pos/customers
// Auth: X-API-Key

// =============================================================================
// API → Frontend (Response)
// =============================================================================
export const fromAPI = {
  /**
   * Transform single customer from CRM search (lightweight)
   * Source: GET /pos/customers?search=
   * Returns: id, name, phone, tier, total_points, wallet_balance, last_visit
   */
  searchResult: (api) => ({
    id:            api.id || '',
    name:          (api.name || '').trim(),
    phone:         api.phone || '',
    tier:          api.tier || 'Bronze',
    totalPoints:   api.total_points || 0,
    walletBalance: api.wallet_balance || 0,
    lastVisit:     api.last_visit || null,
  }),

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
    loyalty:       api.loyalty || null,
    recentOrders:  api.recent_orders || [],
  }),

  /**
   * Transform single address object
   */
  address: (api) => ({
    id:                   api.id || '',
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
    id:                api.id || api.address_id || '',
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
