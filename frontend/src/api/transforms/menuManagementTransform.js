// Menu Management Transform — CR-014
// Maps between Menu Management API (foods-list) and existing UI component shapes.
// BUG-120-D (2026-06-09): Backend added missing fields. Now mapped:
// - is_inventory, packed_food, stock_out, is_disable, tax_calc, portion_size
// Previously resolved:
// - egg, jain: mapped via item_type (0=NonVeg, 1=Veg, 2=Egg, 3=Jain)
// - station_name: not in API — backend to add in future phase

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (value === 'Yes' || value === 'yes' || value === 'Y' || value === 'y') return true;
  return false;
};

// =============================================================================
// API → Frontend (Response)
// =============================================================================
export const fromAPI = {
  /**
   * Transform foods-list response
   * Response shape: { foods: [...], restaurant_settings: {...} }
   */
  foodsListResponse: (data) => ({
    foods: (data.foods || []).map(fromAPI.food),
    restaurantSettings: data.restaurant_settings || {},
  }),

  /**
   * Transform single food item from foods-list
   * NOTE: Several fields are MISSING from this API — they use defaults.
   * When backend adds them, the spread will pick them up automatically.
   */
  food: (api) => ({
    productId: api.id,
    productName: api.name,
    description: api.description || '',
    productImage: api.image?.includes('food-default-image') ? null : api.image || null,

    // Category — foods-list returns nested object, not flat ID
    categoryId: api.category?.id || null,
    categoryName: api.category?.name || 'Uncategorized',

    // Pricing
    basePrice: parseFloat(api.price) || 0,
    discount: parseFloat(api.discount) || 0,
    discountType: api.discount_type?.toLowerCase() || 'percent',

    // Tax
    tax: {
      percentage: parseFloat(api.tax) || 0,
      type: api.tax_type || 'GST',
    },

    // Food type — single `item_type` field: 0=Non-Veg, 1=Veg, 2=Egg, 3=Jain
    // Coerce to number — API may return string ("2") or number (2)
    isVeg: Number(api.item_type) === 1,
    hasEgg: Number(api.item_type) === 2,
    isJain: Number(api.item_type) === 3,
    itemType: Number(api.item_type) || 0,

    // Variations + Add-ons (key names differ from old API)
    variations: fromAPI.variations(api.variation || api.variations),
    hasVariations: Array.isArray(api.variation || api.variations) && (api.variation || api.variations).length > 0,
    addOns: api.addons || api.add_ons || [],

    // Status — only active/inactive via Status API
    isActive: api.status === 1,
    availableTimeStart: api.available_time_starts,
    availableTimeEnd: api.available_time_ends,

    // Channel availability
    availability: {
      dineIn: toBoolean(api.dinein),
      takeaway: toBoolean(api.takeaway),
      delivery: toBoolean(api.delivery),
    },

    // Station — managed at category level, not food level

    // Menu type
    foodFor: api.food_for || 'Normal',

    // Sort order (for drag-and-drop)
    sortOrder: api.food_order || 0,

    // Complementary
    isComplementary: toBoolean(api.complementary),
    complementaryPrice: parseFloat(api.complementary_price) || 0,

    // Additional fields
    itemCode: api.item_code || '',
    allergen: Array.isArray(api.allergens) ? api.allergens.join(', ') : (api.allergens || ''),
    kcal: parseFloat(api.kcal) || 0,
    giveDiscount: toBoolean(api.give_discount),
    liveWeb: toBoolean(api.live_web),

    // Charges
    packCharges: parseFloat(api.pack_charges) || 0,
    takeawayCharge: parseFloat(api.takeaway_charge) || 0,
    deliveryCharge: parseFloat(api.delivery_charge) || 0,

    // Timing
    prepTimeMin: parseInt(api.prepration_time_min) || 0,
    serveTimeMin: parseInt(api.serve_time_in_min) || 0,

    // BUG-120-D: Fields now available in API (2026-06-09)
    isInventory: toBoolean(api.is_inventory),
    packedFood: toBoolean(api.packed_food),
    isOutOfStock: toBoolean(api.stock_out),
    isDisabled: toBoolean(api.is_disable),
    taxCalc: api.tax_calc || 'Exclusive',
    portionSize: api.portion_size || '',

    // CR-010: Weight-based billing fields (filter out "0" / invalid values from backend)
    itemUnit: ['Kg','gm','L','ml'].includes(api.item_unit) ? api.item_unit : null,
    itemUnitPrice: parseFloat(api.item_unit_price) || 0,
  }),

  /**
   * Transform variations array (foods-list uses `variation` singular key)
   */
  variations: (apiVariations) => {
    if (!Array.isArray(apiVariations)) return [];
    return apiVariations.map((v, idx) => ({
      id: `vg-${idx}`,
      name: v.name,
      type: v.type,
      required: v.required === 'on',
      min: v.min || 0,
      max: v.max || 0,
      values: (v.values || []).map((val, vi) => ({
        id: `vo-${vi}`,
        name: val.label,
        price: parseFloat(val.optionPrice) || 0,
      })),
    }));
  },

  /**
   * Extract unique categories from foods list
   */
  categoriesFromFoods: (foods) => {
    const catMap = new Map();
    (foods || []).forEach((f) => {
      const id = f.category?.id;
      const name = f.category?.name;
      if (id && !catMap.has(id)) {
        catMap.set(id, { categoryId: id, categoryName: name, itemCount: 0 });
      }
      if (id && catMap.has(id)) {
        catMap.get(id).itemCount++;
      }
    });
    return Array.from(catMap.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  },

  /**
   * Transform menu master response
   */
  menuMaster: (data) => (data.menus || []).map((m) => ({
    id: m.id,
    name: m.menu_name,
  })),

  /**
   * Transform delete reasons response
   */
  deleteReasons: (data) => data.reason || [],

  /**
   * Transform categories list response (API #12)
   */
  categoryList: (data) => {
    const cats = data.categories || data.data || data || [];
    if (!Array.isArray(cats)) return [];
    return cats.map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      image: c.image || null,
      stationName: c.station_name || 'KDS',
      printerId: c.restaurant_printer_id || '',
      catOrder: c.cat_order || 0,
      catType: c.cat_type || 'food',
      itemCount: c.products_count ?? c.item_count ?? 0,
    }));
  },

  /**
   * Transform station printer list response (API #16)
   */
  stationPrinterList: (data) => {
    const list = data.stations || data.data || data || [];
    if (!Array.isArray(list)) return [];
    return list.map((s) => ({
      id: s.id,
      name: s.station_name || s.name,
      printerId: s.printer_id || s.restaurant_printer_id || '',
    }));
  },

  /**
   * Transform addon list response (API #17)
   */
  addonList: (data) => {
    const addons = data.addons || data.data || data || [];
    if (!Array.isArray(addons)) return [];
    return addons.map((a) => ({
      id: a.id,
      name: a.name,
      price: parseFloat(a.price) || 0,
    }));
  },
};

// =============================================================================
// Frontend → API (Request)
// =============================================================================
export const toAPI = {
  /**
   * Transform form state → food_info JSON for add/edit API
   */
  foodInfo: (form) => ({
    name: form.productName,
    description: form.description || '',
    category_id: Number(form.categoryId),
    price: Number(form.basePrice),
    discount: Number(form.discount) || 0,
    discount_type: form.discountType || 'amount',
    food_for: form.foodFor || 'Normal',
    dinein: form.dineIn ? 'Yes' : 'No',
    delivery: form.delivery ? 'Yes' : 'No',
    takeaway: form.takeaway ? 'Yes' : 'No',
    live_web: form.liveWeb ? 'Y' : 'N',
    available_time_starts: form.availableTimeStart || '00:00:00',
    available_time_ends: form.availableTimeEnd || '23:59:59',
    prepration_time_min: Number(form.prepTimeMin) || 0,
    serve_time_in_min: Number(form.serveTimeMin) || 0,
    pack_charges: String(parseFloat(form.packCharges) || '0.00'),
    takeaway_charge: String(parseFloat(form.takeawayCharge) || '0.00'),
    delivery_charge: String(parseFloat(form.deliveryCharge) || '0.00'),
    tax_type: form.taxType || 'GST',
    tax: String(Number(form.taxPercentage) || 0),
    complementary: form.isComplementary ? 'Yes' : 'No',
    give_discount: form.giveDiscount ? 'Yes' : 'No',
    item_code: form.itemCode || '',
    kcal: Number(form.kcal) || 0,
    allergens: form.allergens || '',
    item_type: form.foodType === 'veg' ? 1 : form.foodType === 'egg' ? 2 : form.foodType === 'jain' ? 3 : 0,
    // BUG-125-B: Backend reads `veg` not `item_type` for food type persistence
    veg: form.foodType === 'veg' ? 1 : form.foodType === 'egg' ? 2 : form.foodType === 'jain' ? 3 : 0,
    is_inventory: form.isInventory ? 'Yes' : 'No',
    packed_food: form.packedFood ? 'Yes' : 'No',
    stock_out: form.isOutOfStock ? 'Y' : 'N',
    is_disable: form.isDisabled ? 'Y' : 'N',
    tax_calc: form.taxCalc || 'Exclusive',
    ...(form.variations ? { variations: form.variations } : {}),
    ...(form.addonIds ? { addon_ids: form.addonIds } : {}),
    // CR-010: Weight-based billing fields — unit price always equals base price
    item_unit: form.itemUnit || '',
    item_unit_price: ['Kg','gm','L','ml'].includes(form.itemUnit) ? String(Number(form.basePrice) || 0) : '',
  }),

  /**
   * Build reorder payload from ordered items array
   * @param {'food'|'category'} type
   * @param {Array<{productId: number}|{categoryId: number}>} items — in new order
   */
  reorderPayload: (type, items) => ({
    type,
    items: items.map((item, index) => ({
      id: type === 'food' ? item.productId : item.categoryId,
      position: index,
    })),
  }),
};
