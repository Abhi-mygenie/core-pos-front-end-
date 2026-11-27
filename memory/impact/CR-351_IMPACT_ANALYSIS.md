# Impact Analysis — CR-351: Local Printer Setup — Bill Content + Bill Style Tabs

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-27
**Role:** PLANNING
**Sprint:** POS 5.x — BATCH-09

---

## Header

| Field | Value |
|---|---|
| Code Reality | PARTIAL — `BillContentTab.jsx` + `PrintStyleTab.jsx` exist in `printerConfig/` (printer agent path, CR-133). These use `/printer-agent-config` data and CANNOT be reused. Local printer path (`/bill-printer-config`) = NONE. |
| Conflict Pre-Check | `api/constants.js` touched by CR-160 (+1), CR-161 (+3), CR-351 (+1) — sequential additions, same file. **Execute after CR-161.** `LocalPrinterSetupView.jsx` created by CR-161 — CR-351 adds 2 tabs to it. No conflict with CR-167 or CR-169. |
| Risk | HIGH — bill formatting affects print output on every order for local printer restaurants |
| Owner Decisions | OD-1: Bill Content toggles → same values to all 3 configs simultaneously. OD-2: POST batch format `{ configs: { 58mm, 80mm, windows } }` confirmed live. OD-3: show_address + footer_text are global (not per paper size). OQ-1: GET source for show_address + footer_text — DEFERRED. |

---

## §1 — API Contract (Confirmed Live — 2026-08-27)

```
GET /api/v2/vendoremployee/restaurant-settings/bill-printer-config
Response: {
  "data": {
    "configs": {
      "58mm": {
        "id": 122, "bill_size": "58mm", "plateform": "android",
        // 27 section fields — android: [height, width, bold]
        "restaurant_logo": ["1","1","false"],
        "restaurant_title": ["1","1","true"],
        // ...
        "restaurant_total_amount": ["1","1","true"],
        // Bill Content fields (same in all 3 configs):
        "print_phone": "Yes",
        "print_email": "Yes",
        "dotted_line_between_item": "Yes",
        "total_amount_bold": "Yes",
        "total_amount_placed_center": "Yes",
        "total_amount_in_word": "Yes",
        "padding": 0,
        "margin": 0,
        "paperwidth": 72
      },
      "80mm": { ...same shape, plateform: "android" },
      "windows": {
        // 27 section fields — windows: [height, bold]  ← 2 elements
        "restaurant_logo": ["7","false"],
        // same Bill Content toggle fields
      }
    }
  }
}

POST /api/v2/vendoremployee/restaurant-settings/bill-printer-config
Body: { "configs": { "58mm": {...}, "80mm": {...}, "windows": {...} } }
→ One call saves all 3 ✅ confirmed. Array format `[{bill_size,...}]` FAILS.

POST /api/v2/vendoremployee/restaurant-settings/update-settings  (for 2 fields)
Content-Type: multipart/form-data
data="{\"basic\":{\"show_address_on_bill\":\"Yes\",\"footer_text\":\"Thank you\"}}"
→ Confirmed working ✅

Evidence: /app/memory/evidence/CR-LOCAL-PRINTER/bill_printer_config_response.json
```

### 27 Section Keys
```
restaurant_logo, restaurant_title, restaurant_address_1, restaurant_address_2,
restaurant_gstno, restaurant_fssai_no, resturant_order_id, date_time, order_type,
customer_name, customer_number, biller_name, resturant_table, resturant_food_list_header,
restaurant_food_list, restaurant_sub_total, service_charge, tip, station_name,
delivery_charge, delivery_address_detail, scan_to_feedback, discount, gst_parcent,
vat_parcent, restaurant_total_amount, resturant_scan_to_pay, powered_by_mygenie
```

---

## §2 — Data Flow Trace

### Bill Content Tab
```
Mount BillContentTab:
  billPrinterConfigService.getConfig()
    → GET /bill-printer-config
    → billPrinterConfigTransform.fromAPI(response)
    → state: {
        printPhone, printEmail, dottedLine, totalBold, totalCentered, totalInWords,
        padding, margin, paperWidth   ← all read from configs.58mm (primary)
        showAddress, footerText       ← loaded from profile/login (OQ-1 — source TBD)
        configs: { 58mm, 80mm, windows }  ← full configs kept for save
      }

Display:
  Left panel:
    Print Phone Number toggle    → state.printPhone
    Print Email toggle           → state.printEmail
    Show Address on Bill toggle  → state.showAddress      (saved via /update-settings)
    Dotted Line Between Items    → state.dottedLine
    Total Amount Bold            → state.totalBold
    Total Amount Centred         → state.totalCentered
    Total Amount in Words        → state.totalInWords

  Right panel:
    Footer Text input            → state.footerText       (saved via /update-settings)
    Padding input                → state.padding
    Margin input                 → state.margin
    Paper Width input            → state.paperWidth

Save Bill Content button:
  1. POST /bill-printer-config:
     { configs: {
         "58mm":    { ...all 27 section arrays from state, ...toggle fields (same values) },
         "80mm":    { ...all 27 section arrays from state, ...toggle fields (same values) },
         "windows": { ...all 27 section arrays from state, ...toggle fields (same values) }
     }}
  2. POST /update-settings (multipart):
     { basic: { show_address_on_bill: "Yes"|"No", footer_text: state.footerText } }
  → success toast "Bill content saved"
```

### Bill Style Tab
```
Mount BillStyleTab:
  Same config already loaded by Bill Content (shared state if same mount)
  OR: billPrinterConfigService.getConfig() again if mounted independently
  → state: { configs: { 58mm, 80mm, windows }, activePaper: "58mm" }

Display:
  Sub-tab pills: 2-inch (58mm) | 3-inch (80mm) | Windows

  For active sub-tab (e.g. 58mm, android):
    Table header: SECTION | HEIGHT | WIDTH | BOLD
    27 rows, one per section key
    Each row: Section label | height input | width input (android only) | bold toggle

  For windows:
    Table header: SECTION | HEIGHT | BOLD
    27 rows, each: height input | bold toggle (no width column)

Save Bill Style button:
  Build updated configs from current state
  POST /bill-printer-config { configs: { 58mm: {...}, 80mm: {...}, windows: {...} } }
  → success toast "Bill style saved"
```

---

## §3 — Transform Logic

```js
// billPrinterConfigTransform.js

const SECTION_KEYS = [
  'restaurant_logo','restaurant_title','restaurant_address_1','restaurant_address_2',
  'restaurant_gstno','restaurant_fssai_no','resturant_order_id','date_time','order_type',
  'customer_name','customer_number','biller_name','resturant_table',
  'resturant_food_list_header','restaurant_food_list','restaurant_sub_total',
  'service_charge','tip','station_name','delivery_charge','delivery_address_detail',
  'scan_to_feedback','discount','gst_parcent','vat_parcent','restaurant_total_amount',
  'resturant_scan_to_pay','powered_by_mygenie'
];

const SECTION_LABELS = {
  restaurant_logo: 'Restaurant Logo',
  restaurant_title: 'Restaurant Title',
  restaurant_address_1: 'Address Line 1',
  restaurant_address_2: 'Address Line 2',
  restaurant_gstno: 'GST Number',
  restaurant_fssai_no: 'FSSAI Number',
  resturant_order_id: 'Order ID',
  date_time: 'Date & Time',
  order_type: 'Order Type',
  customer_name: 'Customer Name',
  customer_number: 'Customer Phone',
  biller_name: 'Biller Name',
  resturant_table: 'Table Number',
  resturant_food_list_header: 'Food List Header',
  restaurant_food_list: 'Food Items List',
  restaurant_sub_total: 'Sub Total',
  service_charge: 'Service Charge',
  tip: 'Tip',
  station_name: 'Station Name',
  delivery_charge: 'Delivery Charge',
  delivery_address_detail: 'Delivery Address',
  scan_to_feedback: 'Scan to Feedback',
  discount: 'Discount',
  gst_parcent: 'GST %',
  vat_parcent: 'VAT %',
  restaurant_total_amount: 'Total Amount',
  resturant_scan_to_pay: 'Scan to Pay',
  powered_by_mygenie: 'Powered by MyGenie'
};

fromAPI(data) {
  const raw = data.data.configs;
  const primary = raw['58mm']; // read toggles from 58mm as primary
  return {
    // Bill Content fields (from primary config)
    printPhone:    primary.print_phone === 'Yes',
    printEmail:    primary.print_email === 'Yes',
    dottedLine:    primary.dotted_line_between_item === 'Yes',
    totalBold:     primary.total_amount_bold === 'Yes',
    totalCentered: primary.total_amount_placed_center === 'Yes',
    totalInWords:  primary.total_amount_in_word === 'Yes',
    padding:       primary.padding ?? 0,
    margin:        primary.margin ?? 0,
    paperWidth:    primary.paperwidth ?? 72,
    // Full configs for Bill Style
    configs: {
      '58mm':    fromAPIConfig(raw['58mm'], 'android'),
      '80mm':    fromAPIConfig(raw['80mm'], 'android'),
      'windows': fromAPIConfig(raw['windows'], 'windows'),
    }
  };
}

fromAPIConfig(raw, platform) {
  return {
    platform,
    sections: SECTION_KEYS.map(key => {
      const val = raw[key];
      if (platform === 'windows') {
        // [height, bold]
        return { key, label: SECTION_LABELS[key], height: val?.[0] ?? '7', bold: val?.[1] === 'true' };
      } else {
        // [height, width, bold]
        return { key, label: SECTION_LABELS[key], height: val?.[0] ?? '1', width: val?.[1] ?? '1', bold: val?.[2] === 'true' };
      }
    })
  };
}

toAPI(state) {
  const toggleFields = {
    print_phone:                state.printPhone ? 'Yes' : 'No',
    print_email:                state.printEmail ? 'Yes' : 'No',
    dotted_line_between_item:   state.dottedLine ? 'Yes' : 'No',
    total_amount_bold:          state.totalBold ? 'Yes' : 'No',
    total_amount_placed_center: state.totalCentered ? 'Yes' : 'No',
    total_amount_in_word:       state.totalInWords ? 'Yes' : 'No',
    padding:    state.padding,
    margin:     state.margin,
    paperwidth: state.paperWidth,
  };
  const buildSections = (paperKey) => {
    const cfg = state.configs[paperKey];
    const fields = {};
    cfg.sections.forEach(s => {
      if (cfg.platform === 'windows') {
        fields[s.key] = [String(s.height), String(s.bold)];
      } else {
        fields[s.key] = [String(s.height), String(s.width), String(s.bold)];
      }
    });
    return { ...toggleFields, ...fields };
  };
  return {
    configs: {
      '58mm':    buildSections('58mm'),
      '80mm':    buildSections('80mm'),
      'windows': buildSections('windows'),
    }
  };
}

toAPIBasicSettings(state) {
  // For POST /update-settings (multipart)
  return { basic: {
    show_address_on_bill: state.showAddress ? 'Yes' : 'No',
    footer_text: state.footerText || '',
  }};
}
```

---

## §4 — Affected Files

| File | Change | Type | Lines |
|---|---|---|---|
| `components/panels/settings/localPrinter/BillContentTab.jsx` | NEW | NEW | ~120 |
| `components/panels/settings/localPrinter/BillStyleTab.jsx` | NEW | NEW | ~180 |
| `api/services/billPrinterConfigService.js` | NEW — getConfig(), saveConfig(), saveBasicSettings() | NEW | ~40 |
| `api/transforms/billPrinterConfigTransform.js` | NEW — fromAPI + toAPI + SECTION_KEYS + SECTION_LABELS | NEW | ~100 |
| `api/constants.js` | +`BILL_PRINTER_CONFIG` constant | MOD | +1 |
| `LocalPrinterSetupView.jsx` | ADD 2 tab imports + 2 tab render cases | MOD | +8 |

**Files NOT touched:**
- `printerConfig/BillContentTab.jsx` (printer agent version — different endpoint)
- `printerConfig/PrintStyleTab.jsx` (printer agent version)
- `orderTransform.js`, `CollectPaymentPanel.jsx` — zero order/financial logic

**Naming safety:** `localPrinter/BillContentTab.jsx` vs `printerConfig/BillContentTab.jsx` — different directories, no name collision in webpack.

---

## §5 — constants.js Addition

```js
// In API_ENDPOINTS (after PRINTING_OPTION from CR-161):
BILL_PRINTER_CONFIG: '/api/v2/vendoremployee/restaurant-settings/bill-printer-config',  // CR-351
```

---

## §6 — LocalPrinterSetupView.jsx Tab Addition

CR-161 creates LocalPrinterSetupView.jsx with 1 tab (Printers).
CR-351 adds 2 more:

```jsx
// TABS constant (after CR-351 adds its entries):
const TABS = [
  { id: "printers",     label: "Printers" },      // CR-161
  { id: "billcontent",  label: "Bill Content" },   // CR-351
  { id: "billstyle",    label: "Bill Style" },     // CR-351
];

// Tab render:
{activeTab === "billcontent" && <BillContentTab />}  // CR-351
{activeTab === "billstyle"   && <BillStyleTab />}    // CR-351
```

Both tabs manage their own load/save state independently.

---

## §7 — Verification Matrix

| # | Check | Method |
|---|---|---|
| V1 | Bill Content tab loads with current toggle states from GET /bill-printer-config | Browser |
| V2 | Save Bill Content → POST /bill-printer-config with `{ configs: { 58mm, 80mm, windows } }` in 1 call | DevTools |
| V3 | Save Bill Content → also POST /update-settings with show_address + footer_text | DevTools |
| V4 | All 3 configs in POST have same toggle values (OD-1) | DevTools |
| V5 | Bill Style sub-tab 2-inch: HEIGHT + WIDTH + BOLD columns visible | Browser |
| V6 | Bill Style sub-tab Windows: HEIGHT + BOLD only (no WIDTH) | Browser |
| V7 | 27 section rows present in each sub-tab | Browser |
| V8 | Changing height value + Save → POST reflects new value | DevTools |
| V9 | Tab switching between Bill Content and Bill Style preserves unsaved changes | Browser |
| V10 | Success toast on save | Browser |

---

## §8 — Risk Register

| Risk | Level | Notes |
|---|---|---|
| OQ-1: GET source for show_address + footer_text | MEDIUM | Deferred. Implementation agent resolves at Gate 3. |
| Windows section array is `[height, bold]` not `[h,w,b]` | HIGH | Transform handles per platform. Verify V6. |
| Name collision with printerConfig/BillContentTab.jsx | LOW | Different directories — safe |
| `LocalPrinterSetupView.jsx` must exist (created by CR-161) | MEDIUM | Execute after CR-161 |

---

## §9 — Post-Code Registry Checklist

```
□ registry.json: CR-351 → IMPLEMENTED, sprint_key: pos_5_x
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: all 6 files listed
□ Code markers: // CR-351 in all 6 files
□ Webpack: 0 new warnings
□ data-testid on all toggles, inputs, save buttons, sub-tab pills
```

**Impact Analysis: COMPLETE**
**Files WILL change:** `api/constants.js` (+1), `LocalPrinterSetupView.jsx` (+8 lines)
**Files NEW:** `BillContentTab.jsx`, `BillStyleTab.jsx`, `billPrinterConfigService.js`, `billPrinterConfigTransform.js`
**Files WILL NOT touch:** printer agent components, order/financial files
**Open:** OQ-1 (deferred)
**Next:** Gate 3 (Implementation Plan) → Gate 4 GO → Implementation
