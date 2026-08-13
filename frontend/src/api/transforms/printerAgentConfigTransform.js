// CR-133: Printer Agent Config Transform
// Architecture: MERGE-ONTO-RAW — the POST body is a deep clone of the raw GET
// payload with ONLY the editable leaves overwritten. This makes data loss
// structurally impossible: server_configuration, api_authentication,
// restaurant_configuration, restaurant_information, available_options /
// available_fonts lists, every windows{}/android{} platform object, and any
// unknown/future key are preserved bit-for-bit. printer_configuration is
// server-derived and is NEVER sent in the POST.

// =============================================================================
// Helpers (self-contained per codebase convention — do not import across transforms)
// =============================================================================

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/** "Yes"/"No" | bool | 1/0 → boolean */
const toBool = (val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') return val.toLowerCase() === 'yes' || val === '1' || val === 'true';
  return false;
};

/** boolean → "Yes"/"No" */
const toYesNo = (bool) => (bool ? 'Yes' : 'No');

/** '' → null (matches GET shape for nullable text fields — round-trip safe) */
const emptyToNull = (val) => (val === '' || val === undefined ? null : val);

// BUG-316: fallback when API does not return available_fonts
const FALLBACK_FONTS = [
  'Montserrat', 'Roboto', 'Poppins', 'Ubuntu', 'Open Sans', 'Lato', 'Oswald',
  'Helvetica (Sans Serif)', 'Times New Roman', 'Courier', 'Gujarati',
];
// BUG-318: fallback when API does not return aggregator_auto_bill_stage_options
const FALLBACK_AGGREGATOR_STAGES = ['Acknowledged', 'Food Ready'];

/** Coerce to number; parseFloat mandatory (font sizes carry decimals, e.g. 5.5) */
const toNum = (val, fallback = 0) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
};

/** Coerce to positive integer (print copies) */
const toInt = (val, fallback = 1) => {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

// =============================================================================
// Printer normalize / denormalize
// =============================================================================

export const normalizePrinter = (p) => ({
  id: p.id,
  label: p.label ?? '',
  type: p.type ?? 'USB Printer',
  usbPrinterName: p.usb_printer_name ?? '',
  vendorId: p.vendor_id ?? '',
  productId: p.product_id ?? '',
  lanIpAddress: p.lan_ip_address ?? '',
  lanPort: p.lan_port ?? '9100', // STRING — backend stores string, no parseInt
  bluetoothMacAddress: p.bluetooth_mac_address ?? '',
  androidDeviceIp: p.android_device_ip_address ?? '',
  paperSize: p.paper_size,
  handledStations: Array.isArray(p.handled_stations) ? [...p.handled_stations] : [],
  handlesBill: p.handles_bill === true,
});

export const denormalizePrinter = (p) => ({
  id: p.id,
  label: p.label,
  type: p.type,
  usb_printer_name: emptyToNull(p.usbPrinterName),
  vendor_id: emptyToNull(p.vendorId),
  product_id: emptyToNull(p.productId),
  lan_ip_address: emptyToNull(p.lanIpAddress),
  lan_port: p.lanPort || '9100', // stays string
  bluetooth_mac_address: emptyToNull(p.bluetoothMacAddress),
  android_device_ip_address: emptyToNull(p.androidDeviceIp),
  paper_size: p.paperSize,
  handled_stations: [...p.handledStations],
  handles_bill: p.handlesBill === true,
});

/** New (unsaved) printer scaffold — backend re-keys the id on save */
export const newPrinter = (defaults = {}) => ({
  id: `printer_new_${Date.now()}`,
  label: '',
  type: 'USB Printer',
  usbPrinterName: '',
  vendorId: '',
  productId: '',
  lanIpAddress: '',
  lanPort: '9100',
  bluetoothMacAddress: '',
  androidDeviceIp: '',
  paperSize: defaults.paperSize || '80 mm',
  handledStations: [],
  handlesBill: false,
});

// =============================================================================
// Style config normalize / apply
// =============================================================================

/** Hybrid API shape: rows have BOTH flat keys AND windows{}/android{} sub-objects.
 *  Prefer windows sub-object (backend now reads this). Fall back to flat for old configs.
 *  CR-133-GAP: G5+G6 fix — android platform added. */
const normalizeStyle = (styleSection = {}) => {
  const out = {};
  Object.entries(styleSection).forEach(([sectionKey, rows]) => {
    if (!rows || typeof rows !== 'object') return;
    out[sectionKey] = {};
    Object.entries(rows).forEach(([rowKey, row]) => {
      if (!row || typeof row !== 'object') return;
      const w = row.windows || row;    // prefer windows sub-object; flat is backward compat
      const a = row.android || {};
      out[sectionKey][rowKey] = {
        windows: {
          fontSize58: toNum(w.font_size_58mm),
          fontSize80: toNum(w.font_size_80mm),
          bold:       toBool(w.bold),
        },
        android: {
          fontSize58: toNum(a.font_size_58mm, 1),
          fontSize80: toNum(a.font_size_80mm, 1),
          bold:       toBool(a.bold),
        },
      };
    });
  });
  return out;
};

/** CR-133-GAP: Write to windows{} (backend reads this) AND flat fields (backward compat for older agents).
 *  Android values written to android{} sub-object. */
const applyStyle = (rawSection = {}, styleState = {}) => {
  Object.entries(styleState).forEach(([sectionKey, rows]) => {
    const rawRows = rawSection[sectionKey];
    if (!rawRows) return;
    Object.entries(rows).forEach(([rowKey, row]) => {
      const rawRow = rawRows[rowKey];
      if (!rawRow) return;
      // Windows (primary — backend reads these for Windows printing)
      if (!rawRow.windows) rawRow.windows = {};
      rawRow.windows.font_size_58mm = toNum(row.windows?.fontSize58);
      rawRow.windows.font_size_80mm = toNum(row.windows?.fontSize80);
      rawRow.windows.bold           = toYesNo(row.windows?.bold);
      // Flat (backward compat — keep in sync with windows values)
      rawRow.font_size_58mm = rawRow.windows.font_size_58mm;
      rawRow.font_size_80mm = rawRow.windows.font_size_80mm;
      rawRow.bold           = rawRow.windows.bold;
      // Android
      if (!rawRow.android) rawRow.android = {};
      rawRow.android.font_size_58mm = toNum(row.android?.fontSize58, 1);
      rawRow.android.font_size_80mm = toNum(row.android?.fontSize80, 1);
      rawRow.android.bold           = toYesNo(row.android?.bold);
    });
  });
};

/**
 * Post-save drift reconciliation (CR-133 QA finding):
 * The preprod backend deep-merges the printers array by id — deleted printers
 * are silently re-injected server-side. Detect them so the UI can warn the
 * user instead of falsely reporting "All changes saved".
 *
 * @param {Array} rawPrinters   printers from the pre-save raw GET (snake_case)
 * @param {Array} sentPrinters  printers the user saved (normalized state)
 * @param {Array} freshPrinters printers from the post-save refetch (normalized state)
 * @returns {Array} printers that were locally deleted but survived on the server
 */
export const findReinjectedPrinters = (rawPrinters = [], sentPrinters = [], freshPrinters = []) => {
  const sentIds = new Set(sentPrinters.map((p) => p.id));
  const deletedIds = new Set(rawPrinters.map((p) => p.id).filter((id) => !sentIds.has(id)));
  return freshPrinters.filter((p) => deletedIds.has(p.id));
};

// =============================================================================
// API → Frontend
// =============================================================================

export const fromAPI = (data) => {
  const sc = data.settings_config || {};
  const style = data.style_config || {};
  const gs = style.global_settings || {};
  const ap = sc.auto_printing || {};
  const qr = sc.qr_codes || {};
  const wo = sc.windows_options || {};
  const info = sc.restaurant_information || {};

  return {
    _raw: deepClone(data), // entire GET payload retained — basis of the POST body

    employeeId: String(data.employee_id ?? ''),  // CR-133-GAP: G3b — bound to dropdown

    printers: (sc.printers || []).map(normalizePrinter),
    paperSize: sc.paper_settings?.paper_size ?? '80 mm',
    printerType: sc.printer_type?.selected ?? 'USB Printer',
    footerText: sc.bill_footer?.footer_text ?? '',
    billCopyCount: sc.print_copies?.bill_copy_count ?? 1,
    kotCopyCount: sc.print_copies?.kot_copy_count ?? 1,

    autoPrintBill: toBool(ap.auto_print_bill),
    autoPrintKot: toBool(ap.auto_print_kot),
    autoSettle: toBool(ap.auto_settle),
    scanOrderAutoPrint: toBool(ap.scan_order_auto_print),
    aggregatorAutoKot: toBool(ap.aggregator_auto_kot),
    aggregatorAutoBill: toBool(ap.aggregator_auto_bill),
    aggregatorAutoBillStage: ap.aggregator_auto_bill_stage ?? 'Acknowledged',

    showItemDateOn80mm: toBool(sc.bill_display_options?.show_item_date_on_80mm),

    upiQrEnabled: toBool(qr.upi_qr_enabled),
    upiId: qr.upi_id ?? '',
    upiDynamicEnabled: toBool(qr.upi_dynamic_enabled),
    feedbackQrEnabled: toBool(qr.feedback_qr_enabled),
    feedbackQrUrl: qr.feedback_qr_url ?? '',

    usePdfOnWindows: toBool(wo.use_pdf_printing_on_windows),
    usePdfForBillsOnly: toBool(wo.use_pdf_for_bills_only),

    fontFamily: gs.font_family ?? '',
    dividerLineStyle: gs.divider_line_style ?? 'Solid',
    // CR-133-GAP: G5+G6 — prefer windows sub-object for global sizes; flat fallback for old configs
    pageMargins: {
      top:    gs.windows?.page_margins_mm?.top    ?? gs.page_margins_mm?.top    ?? 0,
      bottom: gs.windows?.page_margins_mm?.bottom ?? gs.page_margins_mm?.bottom ?? 0,
      left:   gs.windows?.page_margins_mm?.left   ?? gs.page_margins_mm?.left   ?? 0,
      right:  gs.windows?.page_margins_mm?.right  ?? gs.page_margins_mm?.right  ?? 0,
    },
    logoSize: {
      width:  gs.windows?.logo_size_mm?.width  ?? gs.logo_size_mm?.width  ?? 30,
      height: gs.windows?.logo_size_mm?.height ?? gs.logo_size_mm?.height ?? 30,
    },
    qrSize: {
      upi:      gs.windows?.qr_size_mm?.upi      ?? gs.qr_size_mm?.upi      ?? 25,
      feedback: gs.windows?.qr_size_mm?.feedback ?? gs.qr_size_mm?.feedback ?? 25,
    },
    // Android global sizes (scalar int, scale 1–8)
    androidLogoSize:       gs.android?.logo_size_mm          ?? 30,
    androidUpiQrSize:      gs.android?.upi_qr_size_mm        ?? 25,
    androidFeedbackQrSize: gs.android?.feedback_qr_size_mm   ?? 25,
    androidScaleRange:     gs.android?.size_scale_range       ?? [1, 8],

    billStyle: normalizeStyle(style.bill_print_style),
    kotStyle: normalizeStyle(style.kot_print_style),

    // Read-only display (never written back through state)
    restaurantInfo: {
      name: info.restaurant_name ?? '',
      phone: info.phone_number ?? '',
    },

    // Option lists sourced from _raw — never hardcoded ("58 mm" has a space)
    options: {
      paperSizes: [...(sc.paper_settings?.available_options || [])],
      printerTypes: [...(sc.printer_type?.available_options || [])],
      // BUG-318: fallback when API returns empty stage options
      aggregatorStages: ap.aggregator_auto_bill_stage_options?.length
        ? [...ap.aggregator_auto_bill_stage_options]
        : [...FALLBACK_AGGREGATOR_STAGES],
      // BUG-316: fallback when API returns null available_fonts
      fonts: gs.available_fonts?.length ? [...gs.available_fonts] : [...FALLBACK_FONTS],
      dividerStyles: [...(gs.divider_line_options || [])],
    },
  };
};

// =============================================================================
// Frontend → API (merge-onto-raw)
// =============================================================================

export const toAPI = (state) => {
  const body = deepClone(state._raw);
  const sc = body.settings_config;
  const style = body.style_config;

  // server-derived — never send
  delete sc.printer_configuration;

  sc.printers = state.printers.map(denormalizePrinter);
  sc.paper_settings.paper_size = state.paperSize;
  sc.printer_type.selected = state.printerType;
  sc.bill_footer.footer_text = state.footerText;
  sc.print_copies.bill_copy_count = toInt(state.billCopyCount);
  sc.print_copies.kot_copy_count = toInt(state.kotCopyCount);

  const ap = sc.auto_printing;
  ap.auto_print_bill = toYesNo(state.autoPrintBill);
  ap.auto_print_kot = toYesNo(state.autoPrintKot);
  ap.auto_settle = toYesNo(state.autoSettle);
  ap.scan_order_auto_print = toYesNo(state.scanOrderAutoPrint);
  ap.aggregator_auto_kot = toYesNo(state.aggregatorAutoKot);
  ap.aggregator_auto_bill = toYesNo(state.aggregatorAutoBill);
  ap.aggregator_auto_bill_stage = state.aggregatorAutoBillStage;

  sc.bill_display_options.show_item_date_on_80mm = toYesNo(state.showItemDateOn80mm);

  const qr = sc.qr_codes;
  qr.upi_qr_enabled = toYesNo(state.upiQrEnabled);
  qr.upi_id = emptyToNull(state.upiId);
  qr.upi_dynamic_enabled = toYesNo(state.upiDynamicEnabled);
  qr.feedback_qr_enabled = toYesNo(state.feedbackQrEnabled);
  qr.feedback_qr_url = emptyToNull(state.feedbackQrUrl);

  sc.windows_options.use_pdf_printing_on_windows = toYesNo(state.usePdfOnWindows);
  sc.windows_options.use_pdf_for_bills_only = toYesNo(state.usePdfForBillsOnly);

  // Inner restaurant_id is a string on the API — normalize defensively
  if (sc.restaurant_configuration && sc.restaurant_configuration.restaurant_id != null) {
    sc.restaurant_configuration.restaurant_id = String(sc.restaurant_configuration.restaurant_id);
  }

  const gs = style.global_settings;
  gs.font_family = state.fontFamily;
  gs.divider_line_style = state.dividerLineStyle;
  // CR-133-GAP: G5+G6 — write windows (primary, backend reads) + flat (backward compat)
  if (!gs.windows) gs.windows = {};
  gs.windows.page_margins_mm = { top: toNum(state.pageMargins.top), bottom: toNum(state.pageMargins.bottom), left: toNum(state.pageMargins.left), right: toNum(state.pageMargins.right) };
  gs.windows.logo_size_mm    = { width: toNum(state.logoSize.width), height: toNum(state.logoSize.height) };
  gs.windows.qr_size_mm      = { upi: toNum(state.qrSize.upi), feedback: toNum(state.qrSize.feedback) };
  gs.page_margins_mm         = gs.windows.page_margins_mm;   // backward compat flat
  gs.logo_size_mm            = gs.windows.logo_size_mm;
  gs.qr_size_mm              = gs.windows.qr_size_mm;
  // Android global (size_scale_range read-only — preserved via _raw)
  if (!gs.android) gs.android = {};
  gs.android.logo_size_mm        = toNum(state.androidLogoSize);
  gs.android.upi_qr_size_mm      = toNum(state.androidUpiQrSize);
  gs.android.feedback_qr_size_mm = toNum(state.androidFeedbackQrSize);

  applyStyle(style.bill_print_style, state.billStyle);
  applyStyle(style.kot_print_style, state.kotStyle);

  // top-level restaurant_id NOT sent (matches known-good POST)
  return {
    employee_id: state.employeeId || body.employee_id,  // CR-133-GAP: G3b — use dropdown state; fall back to raw
    settings_config: sc,
    style_config: style,
  };
};
