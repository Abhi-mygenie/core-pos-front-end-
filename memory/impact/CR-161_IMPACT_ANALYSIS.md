# Impact Analysis — CR-161: Station Management CRUD + Printing Mode

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-18
**Role:** PLANNING
**Sprint:** POS 5.x — BATCH-09

---

## Header

| Field | Value |
|---|---|
| Code Reality | NONE — no station management UI, no service, no constants, no transform |
| Conflict Pre-Check | `PrinterAgentConfigView.jsx` touched by CR-160, CR-161, CR-167, CR-169. `PrintersTab.jsx` touched by CR-167 (wizard rewrite) AND CR-161 (Printing Mode section). **Execute order: CR-167 → CR-160 → CR-161 → CR-169.** |
| Risk | HIGH — station config affects KOT routing and bill printing on every order |
| Owner Decisions | Printing Mode inside Printers tab (not a separate tab). Stations = new tab. DELETE included (backend to add endpoint). |

---

## §1 — API Contract (Live-Probed 2026-08-18)

### Part A — Station CRUD
```
GET  /api/v2/vendoremployee/restaurant-settings/printer-config
     Headers: Content-Type: application/json; X-localization: en; Authorization: Bearer

GET  /api/v2/vendoremployee/restaurant-settings/printer-config/area-options
     Response: { "data": { "options": ["Bill","KDS","BAR"] } }
     NOTE: food court returns brand names ["Bill","MSB","CreambellParlour","Zorko","GuptaJee"]
     → Always call API, never hardcode. Per-restaurant fixed list.

POST /api/v2/vendoremployee/restaurant-settings/printer-config   (add new station)
PUT  /api/v2/vendoremployee/restaurant-settings/printer-config   (update station — includes "id")
DELETE /api/v2/vendoremployee/restaurant-settings/printer-config/{id}
     → Backend to add this endpoint (owner confirmed). FE builds delete button; gate with backend brief.

Station payload shape (confirmed from live stations list):
{
  "id": 876,                         // present on PUT/DELETE, absent on POST
  "area_name": "CreambellParlour",   // from area-options dropdown
  "printer_name": "bluetooth",
  "printer_type": "online",          // "online" | "offline"
  "printer_ip": "DC:0D:30:20:3C:D5", // nullable
  "printer_paper_roll": 80,          // 58 | 80
  "vendor_id": "4070",               // nullable (USB)
  "product_id": "33054",             // nullable (USB)
  "default": null,                   // null|1(Ready)|2(Serve)|5(Delivered) — default KOT stage
  "wifi_printer_ip": null,           // nullable
  "wifi_printer_name": "BILLING",    // nullable
  "station_gst": "GSTNO22222",       // food_court only
  "auto_serve": "Yes"                // "Yes"|"No"
}

DATA INCONSISTENCY FOUND:
  mapped_default_employee_ids:
    regular restaurant → array [1478, 2304]
    food court         → JSON string "[2628, 2627, 2805, 2806, 2811, 2812]"
  Transform MUST parse defensively:
    typeof val === 'string' ? JSON.parse(val) : (val || [])
```

### Part B — Printing Mode
```
GET /api/v2/vendoremployee/restaurant-settings/printing-option
    Response: { "success": true, "printing_option": "Fixed" }

PUT /api/v2/vendoremployee/restaurant-settings/printing-option
    Body: { "restaurant_id": 618, "printing_option": "Waiter" }
    Values: "Fixed" | "Waiter" | "Station"
```

---

## §2 — Data Flow Trace

### Part A — Stations (new tab)
```
Mount StationsTab:
  Promise.all([
    stationConfigService.getStations(),          → GET printer-config
    stationConfigService.getAreaOptions(),        → GET printer-config/area-options
  ])
  → stationConfigTransform.fromAPI(stationsRaw, areaOptionsRaw)
  → state: { stations[], areaOptions[], isLoading, restaurantFor }

Display:
  Table/list of stations with columns:
    Area Name | Printer Name | Printer Type | Paper Roll | Default Stage | Auto Serve
  [+ Add Station] button

Add / Edit:
  Inline form (slide-down or panel) with all fields
  area_name → SelectInput from areaOptions[]
  printer_type → SelectInput ["online", "offline"]
  printer_paper_roll → SelectInput [58, 80]
  default → SelectInput [null→"None", 1→"Ready", 2→"Serve", 5→"Delivered"]
  auto_serve → ToggleSwitch
  station_gst → TextInput (ONLY shown when restaurantFor === 'food_court')
  Save → POST (new) or PUT (edit) → refresh list → success toast

Delete:
  Trash icon → confirm dialog → DELETE /{id}
  NOTE: DELETE endpoint not yet in backend. Build UI with backend brief.
  Interim: show "Delete" button but display toast "Station deletion requires backend update"
  → Update once backend confirms endpoint.
```

### Part B — Printing Mode (inside Printers tab)
```
Mount PrintersTab (after CR-167 rewrite):
  stationConfigService.getPrintingOption()  → GET printing-option
  → state: printingMode ("Fixed"|"Waiter"|"Station")
  → shown as radio group at TOP of Printers tab content

User selects radio option:
  → stationConfigService.updatePrintingOption(value)
  → PUT /printing-option with { restaurant_id, printing_option: value }
  → success toast "Printing mode updated"
  → NO "Save Changes" needed — saves immediately on change
```

### INVESTIGATION FINDING — printing-option vs printer-agent-config (2026-08-18)

Curl-probe confirmed:
- `printing_option` is **NOT in `GET /printer-agent-config`** response
- `printing_option` **IS in `GET /profile`** response (restaurant settings)
- `PUT /printing-option` saves to restaurant settings (separate store from printer-agent-config)

**What this means:**
- The printer agent DEVICE does not read `printing_option` — it receives explicit printer IDs in each order's `printer_agent[]` payload
- `printing_option` is a **POS-side routing decision** — the FE reads it from profile context to decide which printers to include in `printer_agent[]` when placing orders
- It is valid and used, just not a printer agent config setting — it belongs in restaurant settings

**Impact on implementation:**
- The `PUT /printing-option` save works independently (confirmed live: endpoint returns success)
- Display an info note in the UI: "This is a POS routing preference — not read by the printer agent device"
- Implementation agent must confirm exact `restaurant_id` source for the PUT payload (from `useRestaurant()` context)

---

## §3 — Transform Logic

```js
// stationConfigTransform.js

const DEFAULT_STAGE_MAP = { null: 'None', 1: 'Ready', 2: 'Serve', 5: 'Delivered' };
const DEFAULT_STAGE_REVERSE = { None: null, Ready: 1, Serve: 2, Delivered: 5 };

fromAPI.stations(rawList) {
  return (rawList || []).map(s => ({
    id: s.id,
    areaName: s.area_name,
    printerName: s.printer_name || '',
    printerType: s.printer_type || 'online',
    printerIp: s.printer_ip || '',
    paperRoll: s.printer_paper_roll || 58,
    vendorId: s.vendor_id || '',
    productId: s.product_id || '',
    defaultStage: s.default,          // null | 1 | 2 | 5
    wifiPrinterIp: s.wifi_printer_ip || '',
    wifiPrinterName: s.wifi_printer_name || '',
    stationGst: s.station_gst || '',
    autoServe: s.auto_serve === 'Yes',
  }));
}

fromAPI.areaOptions(raw) {
  return raw?.data?.options || [];
}

toAPI.station(form, isNew) {
  const payload = {
    area_name: form.areaName,
    printer_name: form.printerName,
    printer_type: form.printerType,
    printer_ip: form.printerIp || null,
    printer_paper_roll: form.paperRoll,
    vendor_id: form.vendorId || null,
    product_id: form.productId || null,
    default: form.defaultStage,       // null | 1 | 2 | 5
    wifi_printer_ip: form.wifiPrinterIp || null,
    wifi_printer_name: form.wifiPrinterName || null,
    station_gst: form.stationGst || null,
    auto_serve: form.autoServe ? 'Yes' : 'No',
  };
  if (!isNew) payload.id = form.id;
  return payload;
}
```

---

## §4 — Affected Files

| File | Change | Type |
|---|---|---|
| `components/panels/settings/printerConfig/StationsTab.jsx` | NEW — full CRUD screen for stations | NEW (~200 lines) |
| `api/services/stationConfigService.js` | NEW — getStations, getAreaOptions, addStation, updateStation, deleteStation, getPrintingOption, updatePrintingOption | NEW (~70 lines) |
| `api/transforms/stationConfigTransform.js` | NEW — fromAPI.stations, fromAPI.areaOptions, toAPI.station | NEW (~60 lines) |
| `api/constants.js` | ADD STATION_CONFIG, STATION_CONFIG_AREA_OPTIONS, PRINTING_OPTION endpoints | +3 lines |
| `PrinterAgentConfigView.jsx` | ADD 6th tab "Stations", import StationsTab | +5 lines |
| `PrintersTab.jsx` | ADD Printing Mode radio section at TOP of content (after CR-167 lands) | +25 lines |

**Files NOT touched:**
- `printerAgentConfigService.js`, `printerAgentConfigTransform.js`
- `orderTransform.js`, `printerAgentSelector.js`
- `AutoPrintTab.jsx`, `BillContentTab.jsx`, `PrintStyleTab.jsx`

---

## §5 — PrinterAgentConfigView.jsx Changes

```js
// TABS constant — add 6th entry (CR-161, after CR-160's 5th tab):
{ id: "stations", label: "Stations" },   // CR-161

// Tab render — add:
{activeTab === "stations" && <StationsTab />}  // CR-161: own load/save state
```

---

## §6 — constants.js Additions

```js
// In API_ENDPOINTS (after PRINTER_MAPPING from CR-160):
STATION_CONFIG:              '/api/v2/vendoremployee/restaurant-settings/printer-config',         // CR-161
STATION_CONFIG_AREA_OPTIONS: '/api/v2/vendoremployee/restaurant-settings/printer-config/area-options', // CR-161
PRINTING_OPTION:             '/api/v2/vendoremployee/restaurant-settings/printing-option',        // CR-161
```

---

## §7 — PrintersTab.jsx Addition (Printing Mode section — after CR-167)

```jsx
// Added at TOP of PrintersTab content (line ~227 after CR-167 rewrite):
// CR-161: Printing Mode radio section
<div className="mb-4 p-3 rounded-lg border" style={{ borderColor: COLORS.borderGray }}>
  <SectionTitle title="Printing Mode" />
  <p className="text-xs mb-3" style={{ color: COLORS.grayText }}>
    Controls how print jobs are dispatched to printers.
  </p>
  <div className="flex flex-col gap-2">
    {["Fixed", "Waiter", "Station"].map((mode) => (
      <button
        key={mode}
        onClick={() => handlePrintingModeChange(mode)}
        className="flex items-center gap-3 p-2.5 rounded-lg border text-left"
        style={{
          borderColor: printingMode === mode ? COLORS.primaryOrange : COLORS.borderGray,
          backgroundColor: printingMode === mode ? "rgba(242,107,51,0.05)" : "transparent",
        }}
        data-testid={`printing-mode-${mode.toLowerCase()}`}
      >
        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>{mode}</span>
      </button>
    ))}
  </div>
</div>
```

`handlePrintingModeChange(mode)` calls `stationConfigService.updatePrintingOption(mode)` directly (immediate save, no "Save Changes" needed).

`printingMode` is local state loaded via `stationConfigService.getPrintingOption()` on PrintersTab mount.

---

## §8 — `station_gst` Visibility Rule

```jsx
// StationsTab.jsx — form field:
{restaurantFor === 'food_court' && (
  <TextInput
    label="Station GST Number"
    value={form.stationGst}
    onChange={(v) => setForm(f => ({ ...f, stationGst: v }))}
    placeholder="e.g. 07AAACE0531H1ZV"
    data-testid="station-gst-input"
  />
)}
```

`restaurantFor` obtained from `useRestaurant()` context. Implementation agent to confirm exact path (`restaurant?.settings?.restaurantFor` or similar) during Gate 3.

---

## §9 — Backend Brief: DELETE Station Endpoint

Owner confirmed DELETE is required. No DELETE endpoint in provided API contract. Before Gate 4:

```
BACKEND_BRIEF: Station Delete Endpoint
Method: DELETE
URL: /api/v2/vendoremployee/restaurant-settings/printer-config/{id}
Auth: Bearer token
Expected response: { "success": true, "message": "Station deleted" }
```

**FE interim behaviour until backend delivers DELETE:**
- Show delete button in UI
- On click: display toast "Station deletion not yet available — backend update pending"
- Update to real DELETE call once backend confirms endpoint

---

## §10 — Verification Matrix

| # | Check | Method |
|---|---|---|
| V1 | "Stations" tab appears as 6th tab | Browser |
| V2 | Stations list loads from GET printer-config | Browser |
| V3 | area_name dropdown populated from GET area-options | Browser |
| V4 | Food court restaurant: area_name shows brand names (MSB, Zorko, etc.) | Food court login |
| V5 | Add station → POST → appears in list | Browser DevTools |
| V6 | Edit station → PUT (includes id) → updates in list | Browser DevTools |
| V7 | station_gst field hidden on regular restaurant, shown on food court | Both logins |
| V8 | default stage dropdown: None / Ready / Serve / Delivered | Browser |
| V9 | Printing Mode radio group shows at top of Printers tab | Browser |
| V10 | Selecting Printing Mode option → immediate PUT → success toast | Browser DevTools |
| V11 | `mapped_default_employee_ids` JSON string parsed correctly for food court | Food court login |

---

## §11 — Risk Register

| Risk | Level | Notes |
|---|---|---|
| DELETE endpoint not confirmed | HIGH | Backend brief filed. FE shows interim toast. Do not block implementation on this. |
| `station_gst` path for food_court check | MEDIUM | `restaurantFor` path via useRestaurant — confirm at Gate 3 |
| `mapped_default_employee_ids` string vs array | HIGH | Defensive parse in transform — test on both restaurant types |
| Printing Mode immediate save (no undo) | MEDIUM | User selects → saved instantly. No "Save Changes" needed. Toast on success/error. |
| CR-167 + CR-161 conflict on PrintersTab.jsx | MEDIUM | Execute CR-167 first. CR-161 adds a new section above the printer list. Non-overlapping areas. |

---

## §12 — Post-Code Registry Checklist

```
□ registry.json: CR-161 → IMPLEMENTED
□ CR_REGISTRY.md: row updated
□ FILE_OWNERSHIP.md: new files + PrinterAgentConfigView.jsx + PrintersTab.jsx entries
□ Code markers: // CR-161 in all 6 files
□ Webpack: 0 new warnings
□ Backend brief filed for DELETE endpoint before smoke test
```

**Impact Analysis: COMPLETE**
**Files WILL change:** `PrinterAgentConfigView.jsx` (+5 lines), `api/constants.js` (+3 lines), `PrintersTab.jsx` (+25 lines after CR-167)
**Files NEW:** `StationsTab.jsx`, `stationConfigService.js`, `stationConfigTransform.js`
**Files WILL NOT touch:** All order/report/hotspot files, `printerAgentConfigService.js`
**Backend:** DELETE endpoint brief to be filed before Gate 6 owner smoke
**Next:** Gate 3 (Implementation Plan) → Gate 4 GO → Implementation
