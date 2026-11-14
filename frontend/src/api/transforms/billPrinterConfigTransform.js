// CR-351: Bill Printer Config Transform — local printer bill content + style
// API: GET/POST /bill-printer-config
// Response: { data: { configs: { "58mm": {...}, "80mm": {...}, "windows": {...} } } }

export const SECTION_KEYS = [
  'restaurant_logo','restaurant_title','restaurant_address_1','restaurant_address_2',
  'restaurant_gstno','restaurant_fssai_no','resturant_order_id','date_time','order_type',
  'customer_name','customer_number','biller_name','resturant_table',
  'resturant_food_list_header','restaurant_food_list','restaurant_sub_total',
  'service_charge','tip','station_name','delivery_charge','delivery_address_detail',
  'scan_to_feedback','discount','gst_parcent','vat_parcent','restaurant_total_amount',
  'resturant_scan_to_pay','powered_by_mygenie',
];

export const SECTION_LABELS = {
  restaurant_logo:           'Restaurant Logo',
  restaurant_title:          'Restaurant Title',
  restaurant_address_1:      'Address Line 1',
  restaurant_address_2:      'Address Line 2',
  restaurant_gstno:          'GST Number',
  restaurant_fssai_no:       'FSSAI Number',
  resturant_order_id:        'Order ID',
  date_time:                 'Date & Time',
  order_type:                'Order Type',
  customer_name:             'Customer Name',
  customer_number:           'Customer Phone',
  biller_name:               'Biller Name',
  resturant_table:           'Table Number',
  resturant_food_list_header:'Food List Header',
  restaurant_food_list:      'Food Items List',
  restaurant_sub_total:      'Sub Total',
  service_charge:            'Service Charge',
  tip:                       'Tip',
  station_name:              'Station Name',
  delivery_charge:           'Delivery Charge',
  delivery_address_detail:   'Delivery Address',
  scan_to_feedback:          'Scan to Feedback',
  discount:                  'Discount',
  gst_parcent:               'GST %',
  vat_parcent:               'VAT %',
  restaurant_total_amount:   'Total Amount',
  resturant_scan_to_pay:     'Scan to Pay',
  powered_by_mygenie:        'Powered by MyGenie',
};

const fromAPIConfig = (raw, platform) => ({
  platform,
  sections: SECTION_KEYS.map(key => {
    const val = raw[key];
    if (platform === 'windows') {
      return { key, label: SECTION_LABELS[key], height: val?.[0] ?? '7', bold: val?.[1] === 'true' };
    }
    return { key, label: SECTION_LABELS[key], height: val?.[0] ?? '1', width: val?.[1] ?? '1', bold: val?.[2] === 'true' };
  }),
});

export const fromAPI = (data) => {
  const configs = data?.data?.configs || {};
  const primary = configs['58mm'] || {};
  return {
    // Bill Content fields — read from 58mm as primary (OD-1: same values across all configs)
    printPhone:    primary.print_phone === 'Yes',
    printEmail:    primary.print_email === 'Yes',
    showAddress:   false,   // OQ-1 deferred: loaded from profile/login at implementation time
    footerText:    '',      // OQ-1 deferred
    dottedLine:    primary.dotted_line_between_item === 'Yes',
    totalBold:     primary.total_amount_bold === 'Yes',
    totalCentered: primary.total_amount_placed_center === 'Yes',
    totalInWords:  primary.total_amount_in_word === 'Yes',
    padding:       primary.padding ?? 0,
    margin:        primary.margin ?? 0,
    paperWidth:    primary.paperwidth ?? 72,
    // Full configs for Bill Style
    configs: {
      '58mm':    fromAPIConfig(configs['58mm'] || {}, 'android'),
      '80mm':    fromAPIConfig(configs['80mm'] || {}, 'android'),
      'windows': fromAPIConfig(configs['windows'] || {}, 'windows'),
    },
  };
};

const buildConfigPayload = (state, paperKey) => {
  const toggleFields = {
    print_phone:                state.printPhone    ? 'Yes' : 'No',
    print_email:                state.printEmail    ? 'Yes' : 'No',
    dotted_line_between_item:   state.dottedLine    ? 'Yes' : 'No',
    total_amount_bold:          state.totalBold     ? 'Yes' : 'No',
    total_amount_placed_center: state.totalCentered ? 'Yes' : 'No',
    total_amount_in_word:       state.totalInWords  ? 'Yes' : 'No',
    padding:    state.padding,
    margin:     state.margin,
    paperwidth: state.paperWidth,
  };
  const sectionFields = {};
  (state.configs[paperKey]?.sections || []).forEach(s => {
    sectionFields[s.key] = state.configs[paperKey].platform === 'windows'
      ? [String(s.height), String(s.bold)]
      : [String(s.height), String(s.width), String(s.bold)];
  });
  return { ...toggleFields, ...sectionFields };
};

// OD-2: single POST saves all 3 configs
export const toAPI = (state) => ({
  configs: {
    '58mm':    buildConfigPayload(state, '58mm'),
    '80mm':    buildConfigPayload(state, '80mm'),
    'windows': buildConfigPayload(state, 'windows'),
  },
});

// OD-3: show_address + footer_text are global — saved via /update-settings
export const toAPIBasicSettings = (state) => ({
  basic: {
    show_address_on_bill: state.showAddress ? 'Yes' : 'No',
    footer_text:          state.footerText  || '',
  },
});
