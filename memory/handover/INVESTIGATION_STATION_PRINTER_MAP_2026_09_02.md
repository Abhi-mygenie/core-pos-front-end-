# INVESTIGATION — Station Printer Map Gaps
**Date:** 2026-09-02
**Role:** INVESTIGATION
**Trigger:** Owner-reported issue — printer agent station mapping broken
**Status:** COMPLETE — root cause identified, no code written

---

## 1. Hypothesis Set (formed before code trace)

| # | Hypothesis | Verdict |
|---|-----------|---------|
| H1 | `StationMappingTab` calls wrong endpoint | **CONFIRMED** |
| H2 | Save payload shape mismatches new API contract | **CONFIRMED** |
| H3 | Per-employee load does client-side filter instead of per-employee API call | **CONFIRMED** |
| H4 | "Default User" dropdown offers all employees (API requires `default_user_v2=Yes` only) | **CONFIRMED** |
| H5 | New `/station-printer-map` endpoint not registered in `API_ENDPOINTS` at all | **CONFIRMED** |
| H6 | Runtime print-agent data sourced from profile (`print_agent`) may not reflect what UI saved to `station_printer_mappings` | **SUSPECTED — needs backend curl-probe** |

---

## 2. Two Systems That Must Be One

### System A — Runtime Printer Agent Resolution (CR-POS2-003)
- Source: `GET /api/v1/vendoremployee/profile` → top-level `print_agent` array
- Shape per entry: `{ mapping: { area_name, default_employee_id }, printer_data: [...] }`
- Transform: `profileTransform.fromAPI.printerAgents()` → `normalizePrinterAgent()`
- Stored in: `RestaurantContext.printerAgents[]`
- Consumed at print-time: `orderService.printOrder()` → `selectAgentsForKot()` / `selectAgentsForBill()` → `printer_agent` injected in order-temp-store / place-order payloads

### System B — Station Mapping Settings UI (CR-353)
- Component: `StationMappingTab.jsx`
- Intended endpoint: `GET/POST /api/v2/vendoremployee/restaurant-settings/station-printer-map` (from backend spec)
- **Actual endpoint hit:** `GET/POST /api/v2/vendoremployee/restaurant-settings/printer-mapping` (CR-160's old endpoint, re-used by mistake)
- Intended storage: `vendor_employees.station_printer_mappings` (per backend spec)

**These two systems must ultimately use the same data. Whether they do is unconfirmed — see GAP-6.**

---

## 3. Confirmed Gaps

### GAP-1 — Wrong endpoint (CRITICAL)
- **File:** `src/api/services/printerMappingService.js:7,12,18`
- **Root cause:** `StationMappingTab` calls `getMapping()` and `saveRawMapping()` from `printerMappingService.js`, both of which use `API_ENDPOINTS.PRINTER_MAPPING = '/api/v2/vendoremployee/restaurant-settings/printer-mapping'` (the CR-160 printer-mapping endpoint).
- **Expected:** `/api/v2/vendoremployee/restaurant-settings/station-printer-map` (GET + POST)
- **Impact:** Every GET loads the old printer-mapping data (not station mappings). Every POST writes to the wrong API — or fails silently if the old endpoint doesn't understand the payload.
- **Classification:** CONTRACT_MISMATCH

### GAP-2 — New endpoint not registered in constants (CRITICAL)
- **File:** `src/api/constants.js:118`
- **Root cause:** `API_ENDPOINTS` has no `STATION_PRINTER_MAP` constant. The new endpoint `/station-printer-map` was never added.
- **Impact:** Any future correct service call would need a hardcoded string. Blocks clean implementation.
- **Classification:** CODE_ERROR

### GAP-3 — Data model mismatch in `StationMappingTab.handleLoad()` (CRITICAL)
- **File:** `src/components/panels/settings/printerConfig/StationMappingTab.jsx:36-48`
- **Root cause:** `handleLoad()` does a client-side filter of `allData.printers` by `assignedEmployeeIds.includes(selectedEmpId)`. This relies on the OLD CR-160 shape `{ printers: [{ id, areaName, assignedEmployeeIds }] }`.
- **New API shape:** `{ areas: string[], default_users: [...], all_users: [...], mappings: [{area_name, default_employee_id}] }`
- **No `printers` key. No `assignedEmployeeIds`.** `allData.printers` will be `undefined` → every employee loads zero rows.
- **Additionally:** the spec says "on employee change, call GET again with `?vendor_employee_id=<id>`". The tab never re-calls the API per employee — it filters one initial response client-side.
- **Classification:** CONTRACT_MISMATCH + CODE_ERROR

### GAP-4 — "Default User" dropdown shows all employees, not `default_users` only (HIGH)
- **File:** `StationMappingTab.jsx:218-220`
- **Root cause:** Second column dropdown maps `allData?.employees || []`. New API separates `default_users` (employees with `default_user_v2=Yes` — valid POST targets) from `all_users` (everyone, used only for the "whose map am I editing?" selector).
- **Impact:** User can select a non-default employee as the station's fixed user → POST will return 422 `"Invalid default employee selected."` The UI offers no hint about which employees are valid targets.
- **Classification:** CONTRACT_MISMATCH

### GAP-5 — Save payload shape is completely wrong (CRITICAL)
- **File:** `StationMappingTab.jsx:54-78`
- **Current payload sent:**
  ```json
  {
    "fixed_station_v2": { "<printerId>": "Yes/No" },
    "mappings": { "<empId>": [<printerIds>] }
  }
  ```
- **API expects:**
  ```json
  {
    "vendor_employee_id": 2819,
    "mappings": [
      { "area_name": "KITCHEN", "default_employee_id": 1740 }
    ]
  }
  ```
- `fixed_station_v2` is a CR-160 concept (which printers are "fixed station") — irrelevant to the new endpoint.
- `mappings` is currently an object keyed by employee IDs → printer ID arrays. New API needs an array of `{area_name, default_employee_id}` objects.
- **Classification:** CONTRACT_MISMATCH

### GAP-6 — Runtime disconnect: UI saves to `station_printer_mappings`, runtime reads `print_agent` (SUSPECTED — needs backend probe)
- **Root cause (suspected):** The settings UI (System B) writes to `vendor_employees.station_printer_mappings`. The runtime flow (System A, `printOrder`) reads `printerAgents` from `RestaurantContext`, which is populated from `print_agent` in the `/api/v1/vendoremployee/profile` response.
- **Question:** Does the backend's `/profile` endpoint serve `print_agent` **from** `vendor_employees.station_printer_mappings` for the logged-in employee? Or from a different table/field?
- **If NO:** Saving station mappings via the UI will have **zero effect on actual print-time routing**. The printer agent sent on orders would still be from whatever `print_agent` was at login, regardless of what the UI saved.
- **Impact:** CRITICAL if the two data sources are not linked. P0 hidden bug.
- **Classification:** DATA_ISSUE (suspected) — requires `BACKEND_BRIEF`

---

## 4. Evidence Map

| Evidence | Finding |
|----------|---------|
| `constants.js:118` | Only `PRINTER_MAPPING` registered. No `STATION_PRINTER_MAP`. |
| `printerMappingService.js:6-20` | `getMapping`, `saveMapping`, `saveRawMapping` all use `PRINTER_MAPPING` constant. |
| `StationMappingTab.jsx:6` | Imports `getMapping` and `saveRawMapping` from `printerMappingService.js`. |
| `StationMappingTab.jsx:36-48` | `handleLoad` accesses `allData.printers[].assignedEmployeeIds` — old CR-160 shape. |
| `StationMappingTab.jsx:219` | Default-user dropdown maps `allData.employees` — all employees, not `default_users`. |
| `StationMappingTab.jsx:54-78` | `handleSave` builds `{ fixed_station_v2, mappings: { empId: [printerIds] } }` — old shape. |
| `printerMappingTransform.js` | `fromAPI` returns `{ printers, employees, defaultUserIds }` — old CR-160 model. |
| `stationmap.md` spec | GET returns `{ areas, default_users, all_users, mappings }`. POST expects `{ vendor_employee_id, mappings: [{area_name, default_employee_id}] }`. |
| `grep for station-printer-map` | Zero hits in `/app/frontend/src/` outside tests. New endpoint never wired. |
| `profileTransform.js:213` | Runtime `printerAgents` sourced from `print_agent` top-level on profile response. |
| `orderService.js:134,177` | `printOrder` injects `printer_agent` built from `printerAgents` passed by caller. |

---

## 5. Files Requiring Changes (Implementation scope — for PLANNING agent)

| File | What Needs To Change | Risk |
|------|---------------------|------|
| `src/api/constants.js` | Add `STATION_PRINTER_MAP` constant pointing to new endpoint | LOW |
| `src/api/services/printerMappingService.js` | Add `getStationMap(vendorEmployeeId)` and `saveStationMap(payload)` using new constant | MEDIUM |
| `src/components/panels/settings/printerConfig/StationMappingTab.jsx` | Rewrite `handleLoad` to call GET with `vendor_employee_id`; fix area dropdown to use `areas`; fix default-user dropdown to use `default_users`; fix `handleSave` payload to `{vendor_employee_id, mappings: [{area_name, default_employee_id}]}` | MEDIUM |
| Backend (not FE) | Confirm: does `/profile` → `print_agent` reflect `station_printer_mappings`? | GAP-6 probe needed |

**Files must NOT change:** `printerAgentSelector.js`, `profileTransform.js`, `orderService.js`, `PrinterMappingTab.jsx` (CR-160), `RestaurantContext.jsx` — runtime flow is correct as-is.

---

## 6. Backend Brief Required

See: `/app/memory/backend_briefs/BACKEND_BRIEF_STATION_PRINTER_MAP_GAP6_2026_09_02.md`

---

## 7. Risk Classification

- **GAP-1 to GAP-5:** CRITICAL / HIGH — printing logic is broken (wrong endpoint + wrong payload)
- **GAP-6:** CRITICAL (suspected) — saved mappings may have no effect on print-time routing
- **Overall item risk:** CRITICAL — touches printing, order flow

---

*Investigation complete: 2026-09-02 | INVESTIGATION role | 6 gaps confirmed, 1 suspected | No code written*
