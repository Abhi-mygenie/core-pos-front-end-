# BACKEND BRIEF — CR-133-GAP-BATCH — 2026-08-10

## Summary
- Issue: KDS station in default printer configuration data
- Classification: DATA_ISSUE
- Frontend impact: Printer stations list shows "KDS" (Kitchen Display System) as a print destination — KDS cannot physically print
- Priority/Risk: LOW

## Endpoint
- Method: GET
- URL: `/api/v2/vendoremployee/restaurant-settings/printer-agent-config`
- Auth/context: VendorEmployee Bearer token, restaurant_id in session

## Issue
`printer_default_1` in GET response has `handled_stations: ["KDS"]`.
KDS = Kitchen Display System (a screen, not a printer). It should not be in a printer's `handled_stations`.

### Reproduction
1. `GET /api/v2/vendoremployee/restaurant-settings/printer-agent-config`
2. Check `settings_config.printers[0].handled_stations`
3. Returns: `["KDS"]`

### Expected
Default printer configuration should not assign KDS as a station. KDS is a display, not a print destination. If KDS needs to appear, it should be a separate concept from printer stations.

### Affected restaurants
- Restaurant 618 (from new curl provided 2026-08-10)
- Restaurant 478 (original probe restaurant — verify)

## Frontend decision (OD-A)
No FE change. Backend to clean default data. The FE `PrintersTab.jsx` station input is free-text — it will show whatever stations are in the GET response. Once backend removes KDS from defaults, the UI will reflect correctly.

## Additional request — Employee List API (OD-C) — RESOLVED

Employee list API confirmed:
- Endpoint: `GET /api/v2/vendoremployee/employee/employees-list`
- Constant already in FE: `API_ENDPOINTS.EMPLOYEES_LIST` (constants.js L144)
- Response: `{ employees: [{ id, f_name, l_name, status, role: { name } }] }`
- Dropdown: `f_name (role.name)`, filter `status === 1`, value = `String(id)`
- No backend work needed for this item.
