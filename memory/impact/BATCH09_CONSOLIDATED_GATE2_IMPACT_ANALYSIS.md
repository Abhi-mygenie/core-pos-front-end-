# BATCH-09 — Consolidated Gate 2 Impact Analysis
# Printer Setup: Local Printer + Printer Agent

**Gate:** 2 — Impact Analysis (consolidated)
**Date:** 2026-08-27
**Role:** PLANNING
**Sprint:** POS 5.x — BATCH-09
**Items:** CR-167 → CR-160 → CR-161 → CR-351 → CR-169

---

## §0 — Architecture Overview

```
restaurants[0].settings.printer_agent
  "No"  → LOCAL PRINTER SETUP  (new screen — LocalPrinterSetupView.jsx)
  "Yes" → PRINTER AGENT CONFIG (existing — PrinterAgentConfigView.jsx, CR-133)

Update toggle: POST /update-settings → { "basic": { "printer_agent": "Yes"|"No" } }
```

**This batch covers BOTH paths:**

| CR | Path | What it builds |
|---|---|---|
| CR-167 | Printer Agent | Wizard → single-step inline form |
| CR-160 | Printer Agent | Printer Mapping tab (5th tab) |
| CR-161 | Local Printer | Printing Mode (Fixed/Waiter/Station + employee picker) + Stations CRUD |
| CR-351 | Local Printer | Bill Content tab + Bill Style tab |
| CR-169 | Printer Agent | Live Bill/KOT preview panel in Print Style tab |

---

## §1 — Conflict Pre-Check + Execution Order

### File Touch Map

| File | CR-167 | CR-160 | CR-161 | CR-351 | CR-169 |
|---|:---:|:---:|:---:|:---:|:---:|
| `PrintersTab.jsx` | REWRITE | — | ADD (Printing Mode section) | — | — |
| `PrinterAgentConfigView.jsx` | — | ADD 5th tab | ADD 6th tab | — | — |
| `PrintStyleTab.jsx` | — | — | — | — | ADD preview |
| `api/constants.js` | — | +1 | +3 | +1 | — |
| `LocalPrinterSetupView.jsx` | — | — | CREATE (host) | USE (add tabs) | — |
| `StationsTab.jsx` | — | — | NEW | — | — |
| `PrinterMappingTab.jsx` | — | NEW | — | — | — |
| `BillContentTab.jsx` (local) | — | — | — | NEW | — |
| `BillStyleTab.jsx` (local) | — | — | — | NEW | — |
| `PrintPreviewPanel.jsx` | — | — | — | — | NEW |

### Locked Execution Order
```
CR-167 → CR-160 → CR-161 → CR-351 → CR-169
```

**Rationale:**
- CR-167 FIRST: rewrites `PrintersTab.jsx` lines 28–192. CR-161 adds Printing Mode section to the SAME file at the TOP after CR-167's new structure exists. CR-167 must land before CR-161.
- CR-160 SECOND: adds 5th tab to `PrinterAgentConfigView.jsx`. CR-161 adds 6th tab to the same constant. Sequential, same file.
- CR-161 THIRD: creates `LocalPrinterSetupView.jsx` (host). CR-351 adds its tabs to that host. CR-161 must land before CR-351.
- CR-351 FOURTH: no conflict with CR-169.
- CR-169 LAST: `PrintStyleTab.jsx` only — no conflict with any other CR.

### Hotspot Files
- None of the 5 CRs touch `orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, or any R5/R6 file.
- Risk for all: HIGH (printer affects bill output on every order) — but zero financial logic touched.

---

## §2 — CR-167: Printer Add/Edit Wizard → Single-Step Form

**Path:** Printer Agent | **Risk:** LOW | **Code Reality:** FULL (wizard exists, UX rewrite only)

### What changes
`PrinterWizard` (lines 28–192, `PrintersTab.jsx`) — 3-step wizard — collapses into `PrinterForm` (1-step scrollable inline form).

Remove: `step` state, `next()`, `finish()`, Back/Next nav, `stationInput` free-text.
Add: Single `save()` call, multi-select dropdown for KOT routing from `areaOptions[]`.

KOT routing: **was** free-text + Add button → **now** multi-select dropdown from `GET /printer-config/area-options` (owner decision 2026-08-18).

### Files
| File | Change |
|---|---|
| `PrintersTab.jsx` | Rewrite lines 28–192: `PrinterWizard` → `PrinterForm` (~165 lines → ~125 lines) |
| `printerAgentConfigService.js` | +`getAreaOptions()` (+8 lines) |
| `printerAgentConfigTransform.js` | +`areaOptions` to fromAPI() options block (+3 lines) |
| `api/constants.js` | 0 — `STATION_CONFIG_AREA_OPTIONS` added by CR-161. Dependency: CR-161 must provide constant if CR-167 lands alone. |

**Detail doc:** `/app/memory/impact/CR-167_IMPACT_ANALYSIS.md`

---

## §3 — CR-160: Printer Mapping Tab (Employee → Station Assignment)

**Path:** Printer Agent | **Risk:** HIGH | **Code Reality:** NONE

### What it builds
New 5th tab "Printer Mapping" in `PrinterAgentConfigView.jsx`.

**API:** `GET/POST /printer-mapping`
- GET returns: `printers[]` (each with `mapped_default_employee_ids`), `employees[]`, `default_users[]`
- POST: `{ fixed_station_v2: { [empId]: "Yes"|"No" }, mappings: { [printerId]: [empIds] } }`
- **Data inconsistency:** `mapped_default_employee_ids` — regular restaurant = array, food court = JSON string. Transform MUST parse defensively.

### UI
- Default Users section: employee chips, toggle marks `fixed_station_v2: "Yes"`
- Per printer: area name + chips of assigned employees + `[+ Add Employees]` multi-select dropdown
- "Save Mapping" button (own POST — does NOT use main "Save Changes")

### Files
| File | Change |
|---|---|
| `PrinterMappingTab.jsx` | NEW — ~150 lines |
| `printerMappingService.js` | NEW — `getMapping()` + `saveMapping()` (~25 lines) |
| `printerMappingTransform.js` | NEW — `fromAPI()` (defensive parse) + `toAPI()` (~60 lines) |
| `api/constants.js` | +`PRINTER_MAPPING` endpoint (+1 line) |
| `PrinterAgentConfigView.jsx` | +5th tab entry + import + tab render (~+5 lines) |

**Important:** `PrinterMappingTab` has its OWN load/save state. Main "Save Changes" does NOT save mapping data.

**Detail doc:** `/app/memory/impact/CR-160_IMPACT_ANALYSIS.md`

---

## §4 — CR-161: Local Printer — Printing Mode + Stations CRUD

**Path:** Local Printer | **Risk:** HIGH | **Code Reality:** NONE for local printer path

### What it builds (2 parts)

**Part A — Stations CRUD (new "Printers" tab content)**

API: `GET/POST/PUT/DELETE /printer-config` + `GET /printer-config/area-options`

Table: Area Name | Printer Name (type) | IP/MAC | WiFi IP | Paper | Default KOT Stage | Auto Serve | Actions

Inline Add/Edit form (single-step — per CR-167 pattern applied to local printer):
- Area Name (dropdown from area-options)
- Printer Type (usb/bluetooth/wifi)
- IP/MAC, WiFi IP, WiFi Printer Name
- Paper Roll (58/80mm)
- Default KOT Stage (None/Ready/Serve/Delivered)
- Station GST (food court only — `restaurantFor === 'food_court'`)
- Auto Serve toggle

Backend field changes confirmed (2026-08-27): `printer_type`, `counter_no`, `always`, `mac_printer_ip`, `mapped_default_employee_ids` REMOVED by backend. Final field list: area_name, printer_name, wifi_printer_name, printer_ip, wifi_printer_ip, printer_paper_roll, default, auto_serve, vendor_id, product_id, station_gst, id.

DELETE: `DELETE /printer-config/{id}` — owner confirmed required. Endpoint confirmed from owner-provided curl. Build with interim toast if endpoint returns 404 until backend confirms live.

**Part B — Printing Mode section (inside Printers tab)**

API: `GET/POST /printing-option`

GET response (confirmed live 2026-08-27):
```
{
  printing_option: "Fixed"|"Waiter"|"Station",
  employee_id: 3415,          ← currently selected fixed-station employee
  default_employee: { id, f_name, fixed_station: "Yes" },
  employees: [{ id, f_name, fixed_station: "Yes"|"No" }]  ← full list
}
```

UI: 3 mode cards (Fixed/Waiter/Station) at top of Printers tab.

**When Fixed is selected → employee picker appears below cards:**
- Section: "Fixed Station Employee"
- Employee chips from `employees[]`
- Chip with `fixed_station: "Yes"` pre-highlighted
- Click chip → immediate POST `{ printing_option:"Fixed", employee_id: empId, restaurant_id }`

When Waiter/Station selected → picker hidden, immediate POST without employee_id.

**Host component: `LocalPrinterSetupView.jsx`**
CR-161 ALSO creates this host component (the 3-tab container for Local Printer Setup). Structure:
```
LocalPrinterSetupView
  tabs: [Printers, Bill Content, Bill Style]
  Printers tab = StationsTab content + Printing Mode section
```

### Files
| File | Change |
|---|---|
| `LocalPrinterSetupView.jsx` | NEW — 3-tab host for local printer screen (~80 lines) |
| `StationsTab.jsx` | NEW — stations table + inline form + printing mode section (~250 lines) |
| `stationConfigService.js` | NEW — getStations, getAreaOptions, addStation, updateStation, deleteStation, getPrintingOption, updatePrintingOption (~70 lines) |
| `stationConfigTransform.js` | NEW — fromAPI (stations + areaOptions + printingOption + employees) + toAPI (~80 lines) |
| `api/constants.js` | +3: `STATION_CONFIG`, `STATION_CONFIG_AREA_OPTIONS`, `PRINTING_OPTION` |
| `PrintersTab.jsx` | +Printing Mode section at TOP (after CR-167 lands) (+25 lines) — NOTE: Printing Mode in Printer Agent path too |

**Transform critical detail:**
```js
// Defensive parse for food court vs regular restaurant
const rawIds = typeof p.mapped_default_employee_ids === 'string'
  ? JSON.parse(p.mapped_default_employee_ids)
  : (p.mapped_default_employee_ids || []);
```

**Routing:** Settings panel "Printers" tile gates on `restaurant.settings.printerAgentEnabled`. If `false` → shows `LocalPrinterSetupView`. If `true` → shows `PrinterAgentConfigView`.

**Detail doc:** `/app/memory/impact/CR-161_IMPACT_ANALYSIS.md`

---

## §5 — CR-351: Local Printer — Bill Content + Bill Style Tabs

**Path:** Local Printer | **Risk:** HIGH | **Code Reality:** PARTIAL (printer agent versions exist, local path = NONE)

### What it builds

**API: `GET/POST /bill-printer-config`** — confirmed live 2026-08-27

GET response: `{ data: { configs: { "58mm": {...}, "80mm": {...}, "windows": {...} } } }`

Each config contains:
- 27 bill section fields (arrays): android = `[height, width, bold]`, windows = `[height, bold]`
- 6 print option toggles: `print_phone`, `print_email`, `dotted_line_between_item`, `total_amount_bold`, `total_amount_placed_center`, `total_amount_in_word`
- 3 physical dims: `padding`, `margin`, `paperwidth`

POST format (confirmed live):
```json
{ "configs": { "58mm": {...}, "80mm": {...}, "windows": {...} } }
```
Single call saves all 3. Array format fails. (OD-2 confirmed)

**Bill Content tab — show_address + footer_text:**
- Saved via `POST /update-settings` → `{ "basic": { "show_address_on_bill": "Yes", "footer_text": "..." } }` (multipart form)
- GET source for current values: DEFERRED (OQ-1) — implementation agent to resolve using login/profile response

**Locked owner decisions:**
- OD-1: Bill Content toggles → same values to all 3 configs simultaneously
- OD-2: POST batch format confirmed (one call)
- OD-3: `show_address_on_bill` + `footer_text` are global (not per paper size)
- OD-4: employee picker visible only on Fixed mode (in CR-161, not here)

### Data Flow

**Bill Content Tab:**
```
Mount: GET /bill-printer-config → load configs
       GET source TBD → load show_address_on_bill + footer_text (OQ-1)
State: {
  printPhone, printEmail, dottedLine, totalBold, totalCentered, totalInWords,  ← from configs.58mm
  padding, margin, paperWidth,                                                  ← from configs.58mm
  showAddress, footerText                                                       ← from profile/login
}
Save: POST /bill-printer-config { configs: { 58mm, 80mm, windows } all same toggles }
    + POST /update-settings { basic: { show_address_on_bill, footer_text } }
```

**Bill Style Tab:**
```
State loaded from same GET /bill-printer-config response (shared with Bill Content)
activePaper: "58mm" | "80mm" | "windows"
Per row: { sectionKey, label, height, width (android only), bold }

Android: configs[paper][sectionKey] = [height, width, bold]
Windows: configs.windows[sectionKey] = [height, bold]

Save Bill Style → POST /bill-printer-config {
  configs: {
    "58mm":    { ...current 58mm section arrays },
    "80mm":    { ...current 80mm section arrays },
    "windows": { ...current windows section arrays }
  }
}
```

### 27 Bill Section Keys
```
restaurant_logo, restaurant_title, restaurant_address_1, restaurant_address_2,
restaurant_gstno, restaurant_fssai_no, resturant_order_id, date_time, order_type,
customer_name, customer_number, biller_name, resturant_table, resturant_food_list_header,
restaurant_food_list, restaurant_sub_total, service_charge, tip, station_name,
delivery_charge, delivery_address_detail, scan_to_feedback, discount, gst_parcent,
vat_parcent, restaurant_total_amount, resturant_scan_to_pay, powered_by_mygenie
```

### Transform Logic
```js
// billPrinterConfigTransform.js

fromAPI(data) {
  const configs = data.data.configs;
  return {
    configs: {
      '58mm':    fromAPIConfig(configs['58mm']),
      '80mm':    fromAPIConfig(configs['80mm']),
      'windows': fromAPIConfig(configs['windows']),
    }
  };
}

fromAPIConfig(raw) {
  // extract toggles (same for all configs, read from 58mm as primary for display)
  // extract section arrays
  return {
    printPhone:      raw.print_phone === 'Yes',
    printEmail:      raw.print_email === 'Yes',
    dottedLine:      raw.dotted_line_between_item === 'Yes',
    totalBold:       raw.total_amount_bold === 'Yes',
    totalCentered:   raw.total_amount_placed_center === 'Yes',
    totalInWords:    raw.total_amount_in_word === 'Yes',
    padding:         raw.padding ?? 0,
    margin:          raw.margin ?? 0,
    paperWidth:      raw.paperwidth ?? 72,
    sections: SECTION_KEYS.map(key => ({
      key,
      label: SECTION_LABELS[key],
      values: raw[key] || (raw.plateform === 'windows' ? ['7','false'] : ['1','1','false'])
    }))
  };
}

toAPI(state) {
  // Bill Content: build same toggles for all 3 configs
  const toggleFields = {
    print_phone:                  state.printPhone ? 'Yes' : 'No',
    print_email:                  state.printEmail ? 'Yes' : 'No',
    dotted_line_between_item:     state.dottedLine ? 'Yes' : 'No',
    total_amount_bold:            state.totalBold ? 'Yes' : 'No',
    total_amount_placed_center:   state.totalCentered ? 'Yes' : 'No',
    total_amount_in_word:         state.totalInWords ? 'Yes' : 'No',
    padding:  state.padding,
    margin:   state.margin,
    paperwidth: state.paperWidth,
  };
  const buildConfig = (paperKey) => {
    const sectionFields = {};
    state.configs[paperKey].sections.forEach(s => {
      sectionFields[s.key] = s.values;
    });
    return { ...toggleFields, ...sectionFields };
  };
  return {
    configs: {
      '58mm':    buildConfig('58mm'),
      '80mm':    buildConfig('80mm'),
      'windows': buildConfig('windows'),
    }
  };
}
```

### Files
| File | Change | Type |
|---|---|---|
| `components/panels/settings/localPrinter/BillContentTab.jsx` | NEW — toggles + footer + dims (~120 lines) | NEW |
| `components/panels/settings/localPrinter/BillStyleTab.jsx` | NEW — sub-tabs 58mm/80mm/Windows, 27 section rows (~180 lines) | NEW |
| `api/services/billPrinterConfigService.js` | NEW — `getConfig()`, `saveConfig()`, `saveBasicSettings()` (~40 lines) | NEW |
| `api/transforms/billPrinterConfigTransform.js` | NEW — fromAPI + toAPI + SECTION_KEYS + SECTION_LABELS (~100 lines) | NEW |
| `api/constants.js` | +`BILL_PRINTER_CONFIG: '/api/v2/vendoremployee/restaurant-settings/bill-printer-config'` (+1 line) | MOD |
| `LocalPrinterSetupView.jsx` | ADD Bill Content + Bill Style tab imports + tab render (created by CR-161) (+8 lines) | MOD |

**Files NOT touched:**
- `BillContentTab.jsx` in `printerConfig/` (printer agent version — different endpoint, different data)
- `PrintStyleTab.jsx` in `printerConfig/` (printer agent version)
- Any order/report/hotspot file

### Open Question
- OQ-1: GET source for `show_address_on_bill` + `footer_text` → deferred. Implementation agent to resolve using login response or profile API at Gate 3.

---

## §6 — CR-169: Live Bill/KOT Preview in Print Style Tab

**Path:** Printer Agent | **Risk:** LOW | **Code Reality:** PARTIAL ("Coming soon" placeholder at PrintStyleTab.jsx:214–223)

### What it builds
New `PrintPreviewPanel.jsx` component replaces the "Coming soon" placeholder in `PrintStyleTab.jsx`. Renders a simulated receipt using real config data (font sizes, restaurant info, footer text). No new API calls — uses config prop already passed to `PrintStyleTab`.

Toggle: Bill / KOT | 58mm / 80mm

### Files
| File | Change |
|---|---|
| `PrintPreviewPanel.jsx` | NEW (~150 lines) |
| `PrintStyleTab.jsx` | Replace lines 214–223 "Coming soon" with `<PrintPreviewPanel config={config} />` |

**Detail doc:** `/app/memory/impact/CR-169_IMPACT_ANALYSIS.md`

---

## §7 — Consolidated File Change Map

| File | CR | Type | Lines est. |
|---|---|---|---|
| `PrintersTab.jsx` | CR-167 + CR-161 | MOD (rewrite + add) | 308 → ~310 |
| `PrinterAgentConfigView.jsx` | CR-160 + CR-161 | MOD (+5th tab + 6th tab) | +10 |
| `PrintStyleTab.jsx` | CR-169 | MOD (replace placeholder) | ±0 net |
| `api/constants.js` | CR-160 + CR-161 + CR-351 | MOD (+5 constants) | +5 |
| `LocalPrinterSetupView.jsx` | CR-161 + CR-351 | NEW then MOD | ~80+8 |
| `StationsTab.jsx` | CR-161 | NEW | ~250 |
| `stationConfigService.js` | CR-161 | NEW | ~70 |
| `stationConfigTransform.js` | CR-161 | NEW | ~80 |
| `PrinterMappingTab.jsx` | CR-160 | NEW | ~150 |
| `printerMappingService.js` | CR-160 | NEW | ~25 |
| `printerMappingTransform.js` | CR-160 | NEW | ~60 |
| `BillContentTab.jsx` (local) | CR-351 | NEW | ~120 |
| `BillStyleTab.jsx` (local) | CR-351 | NEW | ~180 |
| `billPrinterConfigService.js` | CR-351 | NEW | ~40 |
| `billPrinterConfigTransform.js` | CR-351 | NEW | ~100 |
| `PrintPreviewPanel.jsx` | CR-169 | NEW | ~150 |
| `printerAgentConfigService.js` | CR-167 | MOD (+getAreaOptions) | +8 |
| `printerAgentConfigTransform.js` | CR-167 | MOD (+areaOptions) | +3 |

**Total: 3 modified files + 13 new files**
**Hotspot files touched: NONE**

---

## §8 — Consolidated Verification Matrix

| # | CR | Check | Method |
|---|---|---|---|
| V1 | CR-167 | Add Printer form is 1-step (no "Step X of 3") | Browser |
| V2 | CR-167 | USB/LAN/BLE type selection shows correct conditional fields | Browser |
| V3 | CR-167 | KOT routing uses dropdown from area-options (not free text) | Browser |
| V4 | CR-167 | Add/Edit save works, appears in printer list | Browser DevTools |
| V5 | CR-160 | "Printer Mapping" tab appears as 5th tab in Printer Agent Config | Browser |
| V6 | CR-160 | Printer list loads with employee name chips (not IDs) | Browser |
| V7 | CR-160 | Default Users toggles update `fixed_station_v2` in POST payload | DevTools |
| V8 | CR-160 | "Save Mapping" is separate from main "Save Changes" | Browser |
| V9 | CR-160 | food court: `mapped_default_employee_ids` JSON string parsed correctly | Food court login |
| V10 | CR-161 | Settings routes `printer_agent=No` → LocalPrinterSetupView | Browser |
| V11 | CR-161 | Stations list loads from GET /printer-config | Browser |
| V12 | CR-161 | Add station form shows correct fields (no removed fields) | Browser |
| V13 | CR-161 | Station GST hidden on regular restaurant, visible on food court | Both logins |
| V14 | CR-161 | Printing Mode cards: Fixed/Waiter/Station at top of Printers tab | Browser |
| V15 | CR-161 | Fixed selected → employee picker appears | Browser |
| V16 | CR-161 | BAR chip pre-highlighted (fixed_station: "Yes") | Browser |
| V17 | CR-161 | Click employee chip → POST with employee_id → success toast | DevTools |
| V18 | CR-161 | Waiter/Station selected → employee picker hidden | Browser |
| V19 | CR-351 | Bill Content tab loads toggles from GET /bill-printer-config | Browser |
| V20 | CR-351 | Save Bill Content → POST with all 3 configs in one call | DevTools |
| V21 | CR-351 | Save Bill Content → also POST /update-settings for show_address + footer | DevTools |
| V22 | CR-351 | Bill Style sub-tabs: 2-inch/3-inch/Windows all load | Browser |
| V23 | CR-351 | Windows sub-tab shows Height + Bold only (no Width column) | Browser |
| V24 | CR-351 | Save Bill Style → POST with all 3 configs batch format | DevTools |
| V25 | CR-169 | Print Style tab shows live preview panel (no "Coming soon") | Browser |
| V26 | CR-169 | Bill/KOT toggle + 58mm/80mm toggle work in preview | Browser |
| V27 | CR-169 | Font size change in style editor reflects in preview in real time | Browser |

---

## §9 — Risk Register (Consolidated)

| Risk | CR | Level | Mitigation |
|---|---|---|---|
| `PrintersTab.jsx` conflict | CR-167 + CR-161 | MEDIUM | Execute CR-167 first. CR-161 adds Printing Mode ABOVE printer list — non-overlapping. |
| `api/constants.js` concurrent adds | CR-160 + CR-161 + CR-351 | LOW | Sequential implementation. No merge conflict if done in order. |
| `STATION_CONFIG_AREA_OPTIONS` constant dependency | CR-167 depends on CR-161 | LOW | If CR-167 implements alone, add constant in CR-167 step instead. |
| DELETE /printer-config/{id} endpoint | CR-161 | HIGH | Build UI with interim toast. Owner confirmed endpoint exists. Verify at Gate 3. |
| food court JSON string `mapped_default_employee_ids` | CR-160 | HIGH | Defensive parse in transform. Verify on food court test account. |
| OQ-1: GET source for show_address + footer_text | CR-351 | MEDIUM | Deferred. Implementation agent resolves at Gate 3 from login/profile response. |
| `LocalPrinterSetupView.jsx` host created by CR-161, used by CR-351 | CR-351 | MEDIUM | CR-161 MUST land before CR-351. Host must expose tab-add API cleanly. |
| Printer agent BillContentTab vs local BillContentTab name collision | CR-351 | LOW | Use path `localPrinter/BillContentTab.jsx` vs `printerConfig/BillContentTab.jsx` — different dirs. |

---

## §10 — Open Blockers (carry to Gate 3)

| # | Blocker | CR | Resolution Path |
|---|---|---|---|
| B2 | Are `printer_name`, `printer_type`, `printer_paper_roll` needed in station form? | CR-161 | **RESOLVED 2026-08-27 — ALL 3 REQUIRED by backend validation. Include in form.** |
| B3 | Does `printing_option` stay in Printers tab or move to Restaurant Settings? | CR-161 | Owner decision before Gate 3 |
| B5 | DELETE /printer-config/{id} confirmed live on preprod? | CR-161 | **RESOLVED 2026-08-27 — LIVE. Returns `{ success: true, message: "Printer configuration deleted successfully" }`.** |
| OQ-1 | GET source for `show_address_on_bill` + `footer_text` | CR-351 | Deferred — implementation agent resolves |

---

## §11 — Post-Code Registry Checklist (for Implementation Agent)

```
For each CR implemented:
□ registry.json: <ID> → IMPLEMENTED, sprint_key: pos_5_x
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: all new/modified files listed
□ Code markers: // CR-XXX in every file touched
□ Webpack: 0 new warnings
□ data-testid on all interactive elements
```

---

## §12 — Individual Impact Doc References

| CR | Full Impact Analysis |
|---|---|
| CR-167 | `/app/memory/impact/CR-167_IMPACT_ANALYSIS.md` |
| CR-160 | `/app/memory/impact/CR-160_IMPACT_ANALYSIS.md` |
| CR-161 | `/app/memory/impact/CR-161_IMPACT_ANALYSIS.md` |
| CR-351 | `/app/memory/impact/CR-351_IMPACT_ANALYSIS.md` (see below) |
| CR-169 | `/app/memory/impact/CR-169_IMPACT_ANALYSIS.md` |

---

**Gate 2: COMPLETE for all 5 CRs**
**Files WILL change:** `PrintersTab.jsx`, `PrinterAgentConfigView.jsx`, `PrintStyleTab.jsx`, `api/constants.js`, `LocalPrinterSetupView.jsx` (CR-161 creates)
**Files NEW:** `StationsTab.jsx`, `stationConfigService.js`, `stationConfigTransform.js`, `PrinterMappingTab.jsx`, `printerMappingService.js`, `printerMappingTransform.js`, `BillContentTab.jsx` (local), `BillStyleTab.jsx` (local), `billPrinterConfigService.js`, `billPrinterConfigTransform.js`, `PrintPreviewPanel.jsx`
**Hotspot files:** NONE
**Open blockers:** B2, B3, B5 (CR-161), OQ-1 (CR-351)
**Next:** Gate 3 (Implementation Plans) — CR-167 and CR-169 unblocked. CR-161 needs B2+B5. CR-160 and CR-351 ready.
