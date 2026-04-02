// Profile Transform - Vendor Profile API response mapping

import { YES_NO_MAP } from '../constants';

/**
 * Helper to convert Yes/No/Y/N strings to boolean
 */
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return YES_NO_MAP[value] ?? false;
};

/**
 * Helper to construct full image URL
 */
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  const baseUrl = process.env.REACT_APP_API_BASE_URL;
  return `${baseUrl}/storage/${imagePath}`;
};

// =============================================================================
// API → Frontend (Response)
// =============================================================================
export const fromAPI = {
  /**
   * Transform full profile response
   */
  profileResponse: (api) => ({
    user: fromAPI.user(api),
    restaurant: fromAPI.restaurant(api.restaurants?.[0]),
    permissions: api.role || [],
  }),

  /**
   * Transform user/employee info
   */
  user: (api) => ({
    odwnerId: api.id,
    employeeId: api.emp_id,
    firstName: api.emp_f_name || '',
    lastName: api.emp_l_name || '',
    fullName: `${api.emp_f_name || ''} ${api.emp_l_name || ''}`.trim(),
    email: api.emp_email || api.email,
    phone: api.phone,
    roleName: api.role_name,
    isDefaultUser: toBoolean(api.default_user),
    image: getImageUrl(api.image),
  }),

  /**
   * Transform restaurant info
   */
  restaurant: (api) => {
    if (!api) return null;
    return {
      id: api.id,
      name: api.name,
      phone: api.phone,
      email: api.email,
      address: api.address,
      logo: getImageUrl(api.logo),
      coverPhoto: getImageUrl(api.cover_photo),
      currency: api.currency || 'INR',
      currencySymbol: api.currency === 'INR' ? '₹' : api.currency,
      
      // Features
      features: {
        dineIn: toBoolean(api.dine_in),
        delivery: toBoolean(api.delivery),
        takeaway: toBoolean(api.take_away),
        room: toBoolean(api.room),
        inventory: toBoolean(api.inventory),
        tip: toBoolean(api.tip),
        serviceCharge: toBoolean(api.service_charge),
      },
      
      // Tax settings
      tax: {
        percentage: parseFloat(api.tax) || 0,
        gstPercentage: parseFloat(api.gst_tax) || 0,
        gstCode: api.gst_code,
      },
      
      // Payment types
      paymentTypes: fromAPI.paymentTypes(api.payment_types),
      
      // Payment method toggles
      paymentMethods: {
        cash: toBoolean(api.pay_cash),
        upi: toBoolean(api.pay_upi),
        card: toBoolean(api.pay_cc),
        tab: toBoolean(api.pay_tab),
      },
      
      // Discount types
      discountTypes: fromAPI.discountTypes(api.restaurant_discount_type),
      
      // Printer configuration
      printers: fromAPI.printers(api.restaurant_printer_new),
      
      // Operating hours
      schedules: fromAPI.schedules(api.schedules),
      
      // Settings
      settings: fromAPI.settings(api.settings),
      
      // Search options
      searchOptions: api.search_by || ['order id', 'table no', 'user id'],
    };
  },

  /**
   * Transform payment types
   */
  paymentTypes: (apiTypes) => {
    if (!Array.isArray(apiTypes)) return [];
    return apiTypes.map((type) => ({
      id: type.id,
      name: type.name,
      displayName: type.display_name,
    }));
  },

  /**
   * Transform discount types
   */
  discountTypes: (apiTypes) => {
    if (!Array.isArray(apiTypes)) return [];
    return apiTypes.map((type) => ({
      id: type.id,
      name: type.name,
      discountPercent: parseFloat(type.discount_percent) || 0,
    }));
  },

  /**
   * Transform printer configuration
   */
  printers: (apiPrinters) => {
    if (!Array.isArray(apiPrinters)) return [];
    return apiPrinters.map((printer) => ({
      id: printer.id,
      name: printer.printer_name,
      type: printer.printer_type,
      paperSize: printer.paper_size,
      categoryIds: printer.categories_id || [],
      isActive: toBoolean(printer.status),
    }));
  },

  /**
   * Transform schedules (operating hours)
   */
  schedules: (apiSchedules) => {
    if (!Array.isArray(apiSchedules)) return [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return apiSchedules.map((schedule) => ({
      id: schedule.id,
      day: schedule.day,
      dayName: dayNames[schedule.day] || `Day ${schedule.day}`,
      openingTime: schedule.opening_time,
      closingTime: schedule.closing_time,
    }));
  },

  /**
   * Transform restaurant settings
   */
  settings: (apiSettings) => {
    if (!apiSettings) return {};
    return {
      isCoupon: toBoolean(apiSettings.is_coupon),
      isLoyalty: toBoolean(apiSettings.is_loyality),
      isCustomerWallet: toBoolean(apiSettings.is_customer_wallet),
      aggregatorAutoKot: toBoolean(apiSettings.aggregator_auto_kot),
      defaultPrepTime: parseInt(apiSettings.default_prep_time) || 15,
    };
  },
};

// =============================================================================
// Frontend → API (Request) - Phase 2
// =============================================================================
export const toAPI = {
  // Will be added in Phase 2 for update operations
};
