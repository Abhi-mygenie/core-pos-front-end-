# CR-161 — Station Management Screen (CRUD + Restaurant-Level Printing Mode)

**Type:** Change Request (New Screen — API Contract Provided + Backend Confirmed)
**ID:** CR-161
**Date:** 2026-08-17
**Last Updated:** 2026-08-17 (backend confirmed station_gst + auto_serve fields via INV-BACKEND-001)
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Two related missing features, best delivered as one screen:

### Part A — Station Management (CRUD)
A screen to **add, edit, and delete kitchen/service stations** (area_name = KDS, Bar, Pizza, etc.), each with its own printer configuration, GST number, auto-serve setting, and default KOT stage.

### Part B — Restaurant-Level Printing Mode
A setting to choose **how printing is dispatched** across the restaurant:
- **Fixed** — always print to a fixed printer
- **Waiter** — print based on waiter/employee mapping
- **Station** — print based on the kitchen station handling the item

Both features use confirmed backend APIs. Neither has any frontend code.

---

## Backend Confirmation (2026-08-17 — INV-BACKEND-001)

Backend has **confirmed** the following fields are live on ADD + UPDATE endpoints:
- `station_gst`: string — GST number for the station (show only when `restaurant_for === 'food_court'`)
- `auto_serve`: `"Yes"` / `"No"` — auto-serve toggle
- `default` field mapping confirmed: `null` = None, `1` = Ready, `2` = Serve, `5` = Delivered

**`station_gst` visibility rule:** Show this field in the station form ONLY when `restaurantFor === 'food_court'` (see BUG-339 — food_court option must be added to Restaurant Type select first).

---

## API Contract (Owner-Provided)

### Part A — Station CRUD

#### GET — List all stations
```
GET /api/v2/vendoremployee/restaurant-settings/printer-config
Headers: Content-Type: application/json; charset=UTF-8, X-localization: en, Authorization: Bearer <token>
```

#### GET — Area name options (dropdown source)
```
GET /api/v2/vendoremployee/restaurant-settings/printer-config/area-options
Headers: same as above
```

#### PUT — Update a station
```
PUT /api/v2/vendoremployee/restaurant-settings/printer-config
Body:
{
  "id": 949,
  "area_name": "BAR",
  "printer_name": "usb",
  "printer_type": "online",
  "printer_ip": null,
  "printer_paper_roll": 58,
  "vendor_id": null,
  "product_id": null,
  "default": 1,           // null | 1 (Ready) | 2 (Serve) | 5 (Delivered)
  "wifi_printer_ip": null,
  "wifi_printer_name": "Everycom-58-Series",
  "station_gst": "12345",
  "auto_serve": "Yes"
}
```

#### POST — Add a new station
```
POST /api/v2/vendoremployee/restaurant-settings/printer-config
Body: same shape as PUT, without "id"
```

#### `default` field mapping
| Value | UI Label |
|-------|----------|
| `null` | None (no auto-default) |
| `1` | Ready |
| `2` | Serve |
| `5` | Delivered |

---

### Part B — Printing Option (Restaurant-Level Mode)

#### GET — Current printing mode
```
GET /api/v2/vendoremployee/restaurant-settings/printing-option
```

#### PUT — Update printing mode
```
PUT /api/v2/vendoremployee/restaurant-settings/printing-option
Body:
{
  "restaurant_id": 618,
  "printing_option": "Waiter"   // "Fixed" | "Waiter" | "Station"
}
```

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Settings → Printer Agent Config → new "Stations" tab / screen |
| Priority | P1 |
| Severity | HIGH — stations cannot be configured from the POS; printing mode is also unmanageable |
| Risk | HIGH (printing config affects KOT routing and bill printing on every order) |
| Fast Lane | NO — new screen, multi-file (CRUD UI + 2 services + 2 constants + transform) |

---

## Evidence

- Source: OWNER-REPORTED + API CONTRACT PROVIDED
- Screenshot: not provided
- Confidence: CONFIRMED — both endpoints absent from `api/constants.js` and no UI component exists

---

## Code Reality Check

```bash
# printer-config endpoint:
  grep -n "printer-config\|PRINTER_CONFIG" api/constants.js → 0 matches  ← MISSING

# printing-option endpoint:
  grep -n "printing-option\|PRINTING_OPTION" api/constants.js → 0 matches  ← MISSING

# Any station management UI:
  grep -rn "area_name\|StationManage\|printer.*config.*screen" src/ → 0 relevant matches

# Reusable patterns available:
  TABLE_CONFIG_AREA_OPTIONS → '/api/v2/vendoremployee/restaurant-settings/table-config/area-options'
  tableService.js + table config CRUD → same pattern to follow
  PrinterAgentConfigView.jsx → natural host (add new tabs here)
```

- **Code reality: NONE** — no constants, no services, no UI for either feature
- Closest pattern: `TABLE_CONFIG` + `TABLE_CONFIG_AREA_OPTIONS` in `tableService.js` (same area-options pattern)

---

## Blast Radius

**New files:**
- `components/panels/settings/printerConfig/StationsTab.jsx` (CRUD UI for stations)
- `api/services/stationConfigService.js` (GET list, GET area-options, POST, PUT)
- `api/transforms/stationConfigTransform.js` (fromAPI / toAPI)

**Modified files:**
- `api/constants.js` (+3 endpoint constants: GET/POST/PUT printer-config + area-options + printing-option)
- `components/panels/settings/printerConfig/PrinterAgentConfigView.jsx` (add tabs for Stations + Printing Mode)

- Estimated scope: LARGE (5-6 files, ~150-200 lines new code)

---

## Expected Behavior

### Part A — Stations Tab

**List view:**
- Table/list of all stations with columns: Area Name, Printer Name, Printer Type, Paper Roll, Default Stage, GST, Auto Serve
- Add Station button → opens form

**Add / Edit form:**
| Field | Input | Notes |
|-------|-------|-------|
| Area Name | Dropdown (from `/area-options`) | e.g. KDS, BAR, Pizza |
| Printer Name | Text input | e.g. "usb" |
| Printer Type | Select | "online" / "offline" |
| Printer IP | Text input (nullable) | for network printers |
| WiFi Printer IP | Text input (nullable) | |
| WiFi Printer Name | Text input (nullable) | |
| Paper Roll | Select | 58 / 80 mm |
| Vendor ID | Text input (nullable) | USB only |
| Product ID | Text input (nullable) | USB only |
| Default KOT Stage | Select | None / Ready / Serve / Delivered |
| Station GST | Text input | GST number for this station |
| Auto Serve | Toggle | Yes / No |

**Save:** PUT (edit) or POST (new) → success toast → refresh list

### Part B — Printing Mode (as a settings section or separate tab)
- Radio group or segmented control: **Fixed | Waiter | Station**
- Current mode loaded via GET printing-option on open
- On change → PUT → success toast

---

## Owner Decisions — DEFERRED TO GATE 2 (Impact Analysis)

Owner confirmed all decisions will be answered during Planning Gate 2 (Impact Analysis). Recorded here as open questions for the Planning agent:

| # | Open Question | Deferred To |
|---|---------------|-------------|
| OQ-1 | Should Stations and Printing Mode be in the **same new tab** or **separate tabs** inside Printer Agent Config? | Gate 2 |
| OQ-2 | Does `/area-options` return a fixed list, or can users also type custom area names? | Gate 2 |
| OQ-3 | Is **delete station** required? No DELETE endpoint provided — backend confirmation needed | Gate 2 |
| OQ-4 | Should `station_gst` be a formatted/validated GST number field or free text? | Gate 2 |

## Open Blockers

| # | Blocker | Resolution Path |
|---|---------|-----------------|
| B-1 | OQ-3: No DELETE endpoint in the provided contract — Planning agent must confirm with owner/backend before including delete in implementation plan | Owner to confirm at Gate 2 |
| B-2 | OQ-2: area-options response shape unknown — Planning agent must call the endpoint during investigation to determine if it returns a fixed enum or dynamic list | Gate 2 investigation step |

## Duplicate Check

DISTINCT — no prior CR/BUG for station management CRUD or printing mode selector.
RELATED to CR-160 (Printer Mapping) — both live in the Printer Agent Config settings area. Recommend same sprint.

---

**Backend:** API READY (all 5 endpoints confirmed)
**Frontend:** NONE — complete new screen
**Owner Decisions:** ALL DEFERRED TO GATE 2 — owner confirmed answers will be given during Impact Analysis
**Blockers:** B-1 (DELETE endpoint unconfirmed), B-2 (area-options response shape unknown) — both resolved at Gate 2
**Intake Status:** COMPLETE
**Next:** Planning Gate 2 — Planning agent must resolve OQ-1 through OQ-4 + B-1 + B-2 before writing Implementation Plan
