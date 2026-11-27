# BACKEND_BRIEF_STATION_PRINTER_MAP_GAP6_2026_09_02

## Summary
- **Issue:** Frontend runtime print-agent flow reads `print_agent` from `/api/v1/vendoremployee/profile`. The new settings UI saves to `vendor_employees.station_printer_mappings` via `/api/v2/.../station-printer-map`. It is unconfirmed whether these are the same data source.
- **Classification:** DATA_ISSUE / CONTRACT_GAP (suspected)
- **Frontend impact:** If not linked — saving mappings in the UI has zero effect on actual KOT/bill printer routing at order time. Printers would route based on stale login-time `print_agent` regardless of UI changes.
- **Priority/Risk:** P0 / CRITICAL

## Endpoints

### Settings UI (write path)
- **Method:** POST
- **URL:** `https://preprod.mygenie.online/api/v2/vendoremployee/restaurant-settings/station-printer-map`
- **Writes to:** `vendor_employees.station_printer_mappings` (per backend spec)

### Runtime (read path, at login)
- **Method:** GET
- **URL:** `https://preprod.mygenie.online/api/v1/vendoremployee/profile`
- **Field consumed:** top-level `print_agent` array
- **Shape:** `[{ mapping: { area_name, default_employee_id }, printer_data: [...] }]`

## Question for Backend Team

1. Does `GET /api/v1/vendoremployee/profile` → `print_agent` serve data **from** the logged-in employee's `station_printer_mappings` field?
2. Or does `print_agent` come from a different table/config entirely?
3. If different sources: is there a backend job or trigger that syncs them?
4. After a successful `POST /station-printer-map`, will the **next** profile fetch for the same employee return the updated data in `print_agent`?

## How to Probe (curl)

```bash
# Step 1: Save a station mapping via settings endpoint
curl -s -X POST \
  'https://preprod.mygenie.online/api/v2/vendoremployee/restaurant-settings/station-printer-map' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"vendor_employee_id": 2819, "mappings": [{"area_name":"KITCHEN","default_employee_id":1740}]}'

# Step 2: Re-fetch profile and check print_agent
curl -s \
  'https://preprod.mygenie.online/api/v1/vendoremployee/profile' \
  -H 'Accept: application/json' \
  -H "Authorization: Bearer ${TOKEN}" | python3 -c "import sys,json; d=json.load(sys.stdin); print('print_agent:', json.dumps(d.get('print_agent','NOT FOUND'), indent=2))"
```

**Expected (if linked):** `print_agent` for employee 2819 should now show `KITCHEN → 1740`.  
**Failure signal:** `print_agent` unchanged → runtime routing is NOT updated by UI save.

## Frontend Workaround
- **Available:** NO — `RestaurantContext.printerAgents` is only populated at login from profile. No live sync path exists. If sources are different, a page reload + re-login workaround might help temporarily, but is not reliable.

## Impact on Implementation Plan
- If sources ARE linked: GAP-6 is resolved. Fix only GAP-1 through GAP-5 (all frontend).
- If sources are NOT linked: Additional work needed — either (a) profile endpoint updated to serve from `station_printer_mappings`, or (b) frontend re-fetches profile after save, or (c) both. Backend team must decide.
