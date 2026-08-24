# CR-133 — Impact Analysis (Gate 2)

**ID:** CR-133
**Title:** Printer Agent Config — Full Settings Screen (Complete Rewrite)
**Gate:** 2 — Impact Analysis
**Date:** 2026-08-07
**Risk:** HIGH
**Code Reality:** NONE (endpoint unwired, existing PrintersView is dead stub)
**Conflict Pre-Check:** CLEAN — ListFormViews.jsx not in FILE_OWNERSHIP, no active CR touches it

---

## 1. Code Reality Check

```bash
grep -rn "PRINTER_AGENT_CONFIG\|printer.agent.config" /app/frontend/src/ → NOT FOUND
PrintersView in ListFormViews.jsx L183-258 → EXISTS but full UI stub (zero API, save=handleBack no-op)
restaurant.printers → stale profile field, unrelated
printerAgents (RestaurantContext) → profile print_agent read-only, NOT touched
printerAgentSelector.js → order flow, NOT touched
```

---

## 2. Conflict Pre-Check

| File | Last Modified By | Status |
|---|---|---|
| `ListFormViews.jsx` | Not in FILE_OWNERSHIP | **CLEAN** — no recent modifier |
| `api/constants.js` | CR-090, CR-094 (additive) | **CLEAN** — additive key only, no conflict |
| `api/services/printerAgentConfigService.js` | NEW file | **CLEAN** |
| `api/transforms/printerAgentConfigTransform.js` | NEW file | **CLEAN** |

---

## 3. OD-5 Resolution

**`server_configuration`** (`socket_base_url`, `api_base_url`) — **HIDE from UI.**
Rationale: these are internal infrastructure fields. A restaurant owner cannot change socket/API URLs and should never be exposed to them.
**Action:** `toAPI()` passes through `_serverConfig` unchanged from the GET response. Not rendered in any tab.

---

## 4. Data Flow Trace

```
User → Settings Panel → Printers tile
  → PrintersView mounts
  → useEffect: printerAgentConfigService.getConfig()
      → GET /api/v2/vendoremployee/restaurant-settings/printer-agent-config
      → Response → printerAgentConfigTransform.fromAPI(data)
      → local state { printers[], settings{...}, style{...}, _passthrough{...} }
  → 3 tabs render: [Printers] [Print Settings] [Print Style]

User edits any tab → local state updated (no API call)

User clicks "Save Changes" (sticky button on active tab)
  → printerAgentConfigTransform.toAPI(state) → POST body
  → printerAgentConfigService.saveConfig(state)
      → POST /api/v2/vendoremployee/restaurant-settings/printer-agent-config
      → { success: true } → toast("Saved") + refetch
```

---

## 5. UX Design (UX is priority per owner)

### Layout: 3 Horizontal Tabs inside PrintersView

```
┌──────────────────────────────────────────────────┐
│ [Printers]  [Print Settings]  [Print Style]       │
├──────────────────────────────────────────────────┤
│                                                  │
│  Tab content here (scrollable)                   │
│                                                  │
│                                                  │
│                   [Save Changes]  (sticky bottom)│
└──────────────────────────────────────────────────┘
```

### Tab 1: Printers

```
+ Add Printer
─────────────────────────────────────────────
[Kitchen Printer]  USB Printer · 58mm
  Stations: [KDS]   Handles Bill: No
                    [Edit ✎]  [Delete 🗑]

[Billing Printer]  USB Printer · 58mm
  Stations: —       Handles Bill: Yes
                    [Edit ✎]  [Delete 🗑]

─── Add/Edit Form (slide-down inline) ────────
  Label: [________________]
  Type:  [USB ▼] [BT ▼] [LAN ▼]  (segmented)

  (USB visible) USB Printer Name: [POS58 Printer]
  (LAN visible) IP: [_________]  Port: [9100]
  (BT visible)  MAC: [__:__:__:__:__:__]
                Android Device IP: [_______]

  Paper Size: [58mm] [80mm]  (toggle pills)
  Handled Stations: [KDS ×] [BAR ×] [+Add Station]
  Handles Bill: [toggle]
  [Cancel]  [Save Printer]
```

### Tab 2: Print Settings

```
── Paper & Printer ─────────────────────────────────
  Paper Size:    [58mm]  [80mm]
  Printer Type:  [USB Printer ▼]

── Copies ──────────────────────────────────────────
  Bill Copies:  [1 ▲▼]     KOT Copies:  [1 ▲▼]

── Auto Printing ───────────────────────────────────
  Auto Print Bill            [ON/OFF]
  Auto Print KOT             [ON/OFF]
  Scan Order Auto Print      [ON/OFF]
  Aggregator Auto KOT        [ON/OFF]
  Aggregator Auto Bill       [ON/OFF]
  ↳ Stage: [Acknowledged ▼]  (visible only when above = ON)

── Bill Content ────────────────────────────────────
  Show Item Date on 80mm     [ON/OFF]
  Bill Footer Text: [Powered by MyGenie_______]

── QR Codes ────────────────────────────────────────
  UPI QR Code   [ON/OFF]
  ↳ UPI ID: [yourstore@upi]  (visible only when ON)
  Feedback QR   [ON/OFF]
  ↳ URL: [https://...]       (visible only when ON)

── Windows ─────────────────────────────────────────
  Use PDF Printing on Windows  [ON/OFF]
  ↳ PDF for Bills Only         [ON/OFF]  (visible when above = ON)

                              [Save Changes]
```

### Tab 3: Print Style

```
── Global ──────────────────────────────────────────
  Font Family:    [Poppins ▼]  (20 options)
  Divider Style:  [Solid ▼]
  Page Margins (mm): T[0] B[0] L[0] R[0]
  Logo Size (mm):    W[30] H[30]
  QR Size (mm):  UPI[25]  Feedback[25]

── Bill Print Style ─────────────────────────────────
  [▼ Restaurant Header]
    Restaurant Name: 58mm[11] 80mm[17] Bold[✓]
    Address:         58mm[6]  80mm[7]  Bold[_]
    Phone:           58mm[6]  80mm[7]  Bold[_]
    Email:           58mm[6]  80mm[7]  Bold[_]
    GST Number:      58mm[6]  80mm[7]  Bold[_]
    FSSAI Number:    58mm[6]  80mm[7]  Bold[_]
  [▼ Bill Information (rows 1-4)]
    Row 1: 58mm[6] 80mm[7] Bold[_]
    ...
  [▼ Item Table]
  [▼ Amount Section]
  [▼ Delivery Section]
  [▼ Room Section]
  [▼ Footer]

── KOT Print Style ──────────────────────────────────
  [▼ KOT Header]
  [▼ KOT Information (rows 1-4)]
  [▼ Item Table]
  [▼ Notes]

                              [Save Changes]
```

---

## 6. Affected Files

### Files WILL Change

| File | Action | ~Lines |
|---|---|---|
| `api/constants.js` | ADD `PRINTER_AGENT_CONFIG` key in `API_ENDPOINTS` block | +2 lines |
| `api/transforms/printerAgentConfigTransform.js` | NEW — `fromAPI()` + `toAPI()` | ~140 lines |
| `api/services/printerAgentConfigService.js` | NEW — `getConfig()` + `saveConfig()` | ~35 lines |
| `components/panels/settings/ListFormViews.jsx` | REPLACE `PrintersView` (L183-258) with 3-tab rewrite | replace 76→~450 lines |

**Total net new:** ~625 lines

### Files WILL NOT Touch

| File | Reason |
|---|---|
| `SettingsPanel.jsx` | Already maps `"printers"` → `PrintersView` at L40. No change needed. |
| `api/transforms/orderTransform.js` | R5 hotspot — NOT touched |
| `api/transforms/printerAgentSelector.js` | Order flow — NOT touched |
| `contexts/RestaurantContext.jsx` | `printerAgents` from profile is separate concern — NOT touched |
| `api/transforms/profileTransform.js` | NOT touched |
| `api/axios.js` | Auth interceptor already handles token — service uses default `api` instance |

---

## 7. Transform Design

### `fromAPI(responseData)` → FE state

```js
fromAPI(data) → {
  // === Printers (Tab 1) ===
  printers: data.settings_config.printers.map(normalizePrinter),
  // Each printer: { id, label, type, usbPrinterName, vendorId, productId,
  //                lanIpAddress, lanPort, bluetoothMacAddress,
  //                androidDeviceIp, paperSize, handledStations[], handlesBill }

  // === Print Settings (Tab 2) ===
  paperSize:                data.settings_config.paper_settings.paper_size,
  printerType:              data.settings_config.printer_type.selected,
  billCopyCount:            data.settings_config.print_copies.bill_copy_count,
  kotCopyCount:             data.settings_config.print_copies.kot_copy_count,
  autoPrintBill:            toBool(data.settings_config.auto_printing.auto_print_bill),
  autoPrintKot:             toBool(data.settings_config.auto_printing.auto_print_kot),
  scanOrderAutoPrint:       toBool(data.settings_config.auto_printing.scan_order_auto_print),
  aggregatorAutoKot:        toBool(data.settings_config.auto_printing.aggregator_auto_kot),
  aggregatorAutoBill:       toBool(data.settings_config.auto_printing.aggregator_auto_bill),
  aggregatorAutoBillStage:  data.settings_config.auto_printing.aggregator_auto_bill_stage,
  showItemDateOn80mm:       toBool(data.settings_config.bill_display_options.show_item_date_on_80mm),
  footerText:               data.settings_config.bill_footer.footer_text,
  upiQrEnabled:             toBool(data.settings_config.qr_codes.upi_qr_enabled),
  upiId:                    data.settings_config.qr_codes.upi_id || '',
  feedbackQrEnabled:        toBool(data.settings_config.qr_codes.feedback_qr_enabled),
  feedbackQrUrl:            data.settings_config.qr_codes.feedback_qr_url || '',
  usePdfOnWindows:          toBool(data.settings_config.windows_options.use_pdf_printing_on_windows),
  usePdfForBillsOnly:       toBool(data.settings_config.windows_options.use_pdf_for_bills_only),

  // === Print Style (Tab 3) ===
  fontFamily:               data.style_config.global_settings.font_family,
  dividerLineStyle:         data.style_config.global_settings.divider_line_style,
  pageMargins:              data.style_config.global_settings.page_margins_mm,
  logoSizeMm:               data.style_config.global_settings.logo_size_mm,
  qrSizeMm:                 data.style_config.global_settings.qr_size_mm,
  billPrintStyle:           data.style_config.bill_print_style,   // pass-through object
  kotPrintStyle:            data.style_config.kot_print_style,    // pass-through object

  // === Read-Only Display ===
  restaurantName:           data.settings_config.restaurant_information.restaurant_name,
  phoneNumber:              data.settings_config.restaurant_information.phone_number,

  // === Passthrough (hidden — sent unchanged in POST) ===
  _serverConfig:            data.settings_config.server_configuration,
  _restaurantConfig:        data.settings_config.restaurant_configuration,
  _restaurantInfo:          data.settings_config.restaurant_information,
  _employeeId:              data.employee_id,
  _availablePaperSizes:     data.settings_config.paper_settings.available_options,
  _availablePrinterTypes:   data.settings_config.printer_type.available_options,
  _availableFonts:          data.style_config.global_settings.available_fonts,
  _dividerLineOptions:      data.style_config.global_settings.divider_line_options,
  _aggregatorBillStageOpts: data.settings_config.auto_printing.aggregator_auto_bill_stage_options,
}
```

### `toAPI(state)` → POST body

```js
toAPI(state) → {
  employee_id: state._employeeId,
  settings_config: {
    server_configuration:   state._serverConfig,         // hidden passthrough
    restaurant_configuration: state._restaurantConfig,   // hidden passthrough
    restaurant_information: state._restaurantInfo,       // read-only passthrough
    bill_footer:            { footer_text: state.footerText },
    paper_settings:         { paper_size: state.paperSize,
                              available_options: state._availablePaperSizes },
    printer_type:           { selected: state.printerType,
                              available_options: state._availablePrinterTypes },
    printers:               state.printers.map(denormalizePrinter),
    print_copies:           { bill_copy_count: state.billCopyCount,
                              kot_copy_count: state.kotCopyCount },
    auto_printing:          { auto_print_bill: toYesNo(state.autoPrintBill),
                              auto_print_kot: toYesNo(state.autoPrintKot),
                              scan_order_auto_print: toYesNo(state.scanOrderAutoPrint),
                              aggregator_auto_kot: toYesNo(state.aggregatorAutoKot),
                              aggregator_auto_bill: toYesNo(state.aggregatorAutoBill),
                              aggregator_auto_bill_stage: state.aggregatorAutoBillStage,
                              aggregator_auto_bill_stage_options: state._aggregatorBillStageOpts },
    bill_display_options:   { show_item_date_on_80mm: toYesNo(state.showItemDateOn80mm) },
    qr_codes:               { upi_qr_enabled: toYesNo(state.upiQrEnabled),
                              upi_id: state.upiId || '',
                              feedback_qr_enabled: toYesNo(state.feedbackQrEnabled),
                              feedback_qr_url: state.feedbackQrUrl || '' },
    windows_options:        { use_pdf_printing_on_windows: toYesNo(state.usePdfOnWindows),
                              use_pdf_for_bills_only: toYesNo(state.usePdfForBillsOnly) },
  },
  style_config: {
    global_settings: {
      font_family: state.fontFamily,
      available_fonts: state._availableFonts,
      divider_line_style: state.dividerLineStyle,
      divider_line_options: state._dividerLineOptions,
      page_margins_mm: state.pageMargins,
      logo_size_mm: state.logoSizeMm,
      qr_size_mm: state.qrSizeMm,
    },
    bill_print_style: state.billPrintStyle,   // pass-through with user edits
    kot_print_style: state.kotPrintStyle,     // pass-through with user edits
  },
}
```

---

## 8. New Printer ID Generation

For printers added by the user (not yet saved), generate a temporary local ID:
```js
`printer_new_${Date.now()}`
```
The backend assigns permanent IDs on save (observed pattern: `printer_{rid}_{type}_{seq}`). The locally-generated ID is only used as React key during the session; after save + refetch, the backend-assigned ID replaces it.

---

## 9. Risk Register

| Risk | Classification | Mitigation |
|---|---|---|
| POST replaces ENTIRE config — missing keys wipe backend data | HIGH | `toAPI()` MUST pass through all `available_options`, `_serverConfig`, `_restaurantConfig`, `_restaurantInfo`, `_availableFonts`, `_dividerLineOptions`. These are preserved in state from GET response. |
| Saving one tab wipes edits on another tab | MEDIUM | Single unified state object for all 3 tabs. "Save Changes" on any tab saves the full state. |
| Printer CRUD is local until Save | LOW | State tracks adds/edits/deletes locally. "Save Changes" sends full printers[] to API. UI indicates unsaved state. |
| `style_config.bill_print_style` has ~30 sub-fields with nested objects | MEDIUM | Store entire `billPrintStyle` and `kotPrintStyle` as pass-through objects in state. The Print Style tab edits individual leaf values in-place. |
| `employee_id` and `restaurant_id` must be correct in POST | MEDIUM | Sourced directly from `_employeeId` and `_restaurantConfig` read from the GET response — not derived from auth context. This ensures parity with what the server expects. |
| Deleting last printer while it's the only one | LOW | UI allows deletion regardless; backend enforces constraints. FE shows warning toast if printers[] becomes empty. |

---

## 10. Verification Matrix

| # | Edit | File | Change | How to Verify | Automated? |
|---|---|---|---|---|---|
| E1 | ADD endpoint | `api/constants.js` | +`PRINTER_AGENT_CONFIG` key | `grep PRINTER_AGENT_CONFIG src/api/constants.js` | YES |
| E2a | NEW transform | `printerAgentConfigTransform.js` | `fromAPI(GET_RESPONSE)` | Unit: all 20 FE state fields correctly mapped from fixture | YES |
| E2b | NEW transform | `printerAgentConfigTransform.js` | `toAPI(state)` | Unit: POST body matches curl shape (all 11 settings_config sections + style_config present) | YES |
| E3a | NEW service | `printerAgentConfigService.js` | `getConfig()` | Network tab: GET returns 200 + `success: true` | NO |
| E3b | NEW service | `printerAgentConfigService.js` | `saveConfig()` | Network tab: POST returns `"Printer agent configuration saved successfully"` | NO |
| E4a | Tab render | `ListFormViews.jsx` | 3 tabs visible | Browser: Settings → Printers → 3 tabs render without error | NO |
| E4b | Printers list | `ListFormViews.jsx` | printers[] loaded | Browser: Kitchen Printer + Billing Printer visible with type/station/bill info | NO |
| E4c | Add printer | `ListFormViews.jsx` | add form works | Browser: Add → fill label/type/station → Save → new printer in list | NO |
| E4d | Edit printer | `ListFormViews.jsx` | edit form works | Browser: Edit → change label → Save → label updated in list | NO |
| E4e | Delete printer | `ListFormViews.jsx` | delete with confirm | Browser: Delete → confirm → printer removed from list | NO |
| E4f | Print Settings save | `ListFormViews.jsx` | settings persist | Toggle Auto Print Bill → Save → GET shows auto_print_bill: "Yes" | NO |
| E4g | Print Style save | `ListFormViews.jsx` | style persists | Change font to Roboto → Save → GET shows font_family: "Roboto" | NO |

---

## 11. Scope Lock

**Files WILL change:**
1. `api/constants.js` — additive +2 lines
2. `api/transforms/printerAgentConfigTransform.js` — NEW ~140 lines
3. `api/services/printerAgentConfigService.js` — NEW ~35 lines
4. `components/panels/settings/ListFormViews.jsx` — REPLACE PrintersView L183-258

**Files WILL NOT touch:**
- `SettingsPanel.jsx`
- `api/transforms/orderTransform.js` (R5)
- `api/transforms/printerAgentSelector.js`
- `contexts/RestaurantContext.jsx`
- `api/transforms/profileTransform.js`
- `api/axios.js`
- Any other file

---

## 12. Post-Code Registry Checklist (for Implementation Agent)

```
□ registry.json: CR-133 → status: IMPLEMENTED, sprint_key: pos_5_1
□ CR_REGISTRY.md: row updated with IMPLEMENTED status
□ FILE_OWNERSHIP.md: add ListFormViews.jsx, printerAgentConfigService.js, printerAgentConfigTransform.js
□ Code markers: // CR-133 in every modified file
□ Compile check: webpack compiles with 0 new warnings
```

---

**Code Reality:** NONE
**Conflict Pre-Check:** CLEAN
**Risk:** HIGH
**Blast Radius:** MEDIUM (4 files, settings layer only, no hotspots)
**Owner Decisions:** ALL LOCKED (OD-1..5)
**Gate 3 (Implementation Plan) ready to proceed with owner GO.**

---

## AMENDMENT — Curl Audit Corrections (Gate 2, 2026-08-07)

**Source:** End-to-end curl probe of live GET + POST endpoints (restaurant 478)
**Evidence:** `/app/memory/evidence/CR-133/get_response_fresh.json`

### 9 Corrections Found

| # | Severity | Field | Finding | Action |
|---|---|---|---|---|
| 1 | 🔴 CRITICAL | `settings_config.api_authentication` | Entire object missed — `{ api_token: "" }` | **Passthrough only** — hidden from UI, sent unchanged in POST |
| 2 | 🔴 CRITICAL | `settings_config.auto_printing.auto_settle` | Field exists in API, missing from UI and transform | **Add toggle** in Auto Print tab (toBool/toYesNo) |
| 3 | 🔴 CRITICAL | `settings_config.qr_codes.upi_dynamic_enabled` | Field exists in API, missing from UI and transform | **Add toggle** in Bill Content QR section |
| 4 | 🔴 CRITICAL | `style_row.windows{}` | Platform-specific sub-object on EVERY style row — completely missed | **Passthrough** — FE reads/writes top-level only; `windows{}` sent unchanged |
| 5 | 🔴 CRITICAL | `style_row.android{}` | Platform-specific sub-object on EVERY style row — android sizes are very different (1-2pt) | **Passthrough** — never expose in UI |
| 6 | 🔴 CRITICAL | `global_settings.windows{}` | Platform sub-object with `page_margins_mm`, `logo_size_mm`, `qr_size_mm` | **Passthrough** |
| 7 | 🔴 CRITICAL | `global_settings.android{}` | Platform sub-object with `logo_size_mm`, `upi_qr_size_mm`, `feedback_qr_size_mm`, `size_scale_range:[1,8]` | **Passthrough** |
| 8 | 🟡 TYPE | `font_size_58mm` / `font_size_80mm` | Can be `float` (e.g. `paid_by = 5.5`) — `parseInt()` would corrupt to `5` | Use `parseFloat()` not `parseInt()` in fromAPI |
| 9 | 🟡 TYPE | `data.restaurant_id` | Top-level is `int (478)` but `restaurant_configuration.restaurant_id` is `str ("478")` | `toAPI()` must `String()` coerce |

### Confirmed Working (Positive Results)
- ✅ POST with new Phase 2 keys (`field_visibility`, `alignment`, `row_content`) — **backend stores them** (verified via GET after POST)
- ✅ `handles_bill` is correct `bool` type
- ✅ `print_copies` values are correct `int`
- ✅ `printer_configuration` — server-derived, must **never** be sent in POST body (confirmed)
- ✅ All `auto_printing` values are `"Yes"/"No"` strings — `toBool()` / `toYesNo()` required

### Corrected Complete `settings_config` Key Map

```
server_configuration          → passthrough (hidden)
api_authentication            → passthrough (hidden) ← CORRECTION #1
restaurant_configuration      → passthrough (hidden)
restaurant_information        → read-only display
bill_footer                   → editable
paper_settings                → editable
printer_type                  → editable
printers[]                    → full CRUD
printer_configuration         → SERVER-DERIVED — NEVER send in POST
print_copies                  → editable
auto_printing:
  auto_print_bill             ✅
  auto_print_kot              ✅
  auto_settle                 ← CORRECTION #2 — add toggle
  scan_order_auto_print       ✅
  aggregator_auto_kot         ✅
  aggregator_auto_bill        ✅
  aggregator_auto_bill_stage  ✅
  aggregator_auto_bill_stage_options ✅ passthrough
bill_display_options          → editable
qr_codes:
  upi_qr_enabled              ✅
  upi_id                      ✅
  upi_dynamic_enabled         ← CORRECTION #3 — add toggle
  feedback_qr_enabled         ✅
  feedback_qr_url             ✅
windows_options               → editable
```

### Corrected Style Row Shape

Every row in `bill_print_style` and `kot_print_style` has this shape:
```json
{
  "windows": { "font_size_58mm": 11, "font_size_80mm": 14, "bold": "Yes" },
  "android": { "font_size_58mm": 2,  "font_size_80mm": 2,  "bold": "Yes" },
  "font_size_58mm": 11,
  "font_size_80mm": 17,
  "bold": "Yes"
}
```
FE reads/writes top-level values only. `windows{}` and `android{}` are **passed through unchanged**.

### Corrected Transform Rules

`fromAPI()` additions:
- Map `api_authentication` → `_apiAuth` (passthrough key)
- Map `auto_printing.auto_settle` → `autoSettle` via `toBool()`
- Map `qr_codes.upi_dynamic_enabled` → `upiDynamicEnabled` via `toBool()`
- For each style row: store `_windows` and `_android` as passthrough keys
- For `global_settings`: store `_windowsGlobal` and `_androidGlobal` as passthrough keys
- Use `parseFloat()` (not `parseInt()`) for all font_size values

`toAPI()` additions:
- Include `api_authentication: state._apiAuth`
- Include `auto_settle: toYesNo(state.autoSettle)` in `auto_printing`
- Include `upi_dynamic_enabled: toYesNo(state.upiDynamicEnabled)` in `qr_codes`
- For each style row: spread `_windows` and `_android` back into the row object
- For `global_settings`: spread `_windowsGlobal` and `_androidGlobal` back
- Omit `printer_configuration` entirely
- `String(state._restaurantConfig.restaurant_id)` for restaurant_configuration

### Updated UI Additions

**Auto Print tab** — add to "In-House Orders" block:
- `Auto Settle` toggle (from `auto_printing.auto_settle`)

**Bill Content tab** — add to "QR Codes" block:
- `Dynamic UPI QR` toggle (from `qr_codes.upi_dynamic_enabled`)

### Updated Files WILL Change (amended)

| File | Action | Amendment |
|---|---|---|
| `api/transforms/printerAgentConfigTransform.js` | NEW | +9 corrections to fromAPI/toAPI |
| `api/constants.js` | ADD endpoint | unchanged |
| `api/services/printerAgentConfigService.js` | NEW | unchanged |
| `components/panels/settings/ListFormViews.jsx` | REWRITE | +auto_settle toggle, +upi_dynamic_enabled toggle |
