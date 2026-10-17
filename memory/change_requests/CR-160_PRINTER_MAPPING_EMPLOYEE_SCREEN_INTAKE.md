# CR-160 — Printer Mapping Screen: Employee → Printer Assignment (KOT / Bill)

**Type:** Change Request (New Screen — API Contract Provided)
**ID:** CR-160
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

There is no screen in the POS to map **which employee prints to which printer** (KOT or bill) using which printer agent. Owner needs a dedicated Printer Mapping screen where:
- Each employee is assigned one or more printers from the configured printer agents
- Specific printers can be designated as **fixed station** printers (`fixed_station_v2`)
- The mapping controls which printer fires for each employee's KOT and bill actions

The backend API is fully ready. Frontend screen is completely missing.

---

## API Contract (Owner-Provided)

### GET — List current printer mappings
```
GET https://preprod.mygenie.online/api/v2/vendoremployee/restaurant-settings/printer-mapping
Headers: Authorization: Bearer <token>
```

### POST — Store printer mappings
```
POST https://preprod.mygenie.online/api/v2/vendoremployee/restaurant-settings/printer-mapping
Headers: Authorization: Bearer <token>, Content-Type: application/json

Body:
{
  "fixed_station_v2": {
    "1478": "Yes",   // printer ID → "Yes" = this is a fixed-station printer
    "2304": "Yes"
  },
  "mappings": {
    "485": [1478, 2304],   // employee ID → [printerIds assigned to them]
    "486": [1478, 2304],
    "484": [1478, 2304]
  }
}
```

### Payload Schema
| Field | Type | Description |
|-------|------|-------------|
| `fixed_station_v2` | `{ [printerId: string]: "Yes" \| "No" }` | Marks printers as fixed-station printers |
| `mappings` | `{ [employeeId: string]: number[] }` | Each employee → array of printer IDs they print to |

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Settings → Printer Agent Config → new "Printer Mapping" tab / screen |
| Priority | P1 |
| Severity | HIGH — without this screen, employee-to-printer routing cannot be configured from the POS |
| Risk | HIGH (printer routing affects KOT delivery and bill printing on every order) |
| Fast Lane | NO — new screen, multi-file (component + service + constants + transform + tab wiring) |

---

## Evidence

- Source: OWNER-REPORTED + API CONTRACT PROVIDED
- Screenshot: not provided (screen doesn't exist yet)
- Steps to reproduce: Navigate to Printer Agent Config — no "Printer Mapping" tab or screen exists
- Confidence: CONFIRMED (code reality NONE + backend API confirmed by owner)

---

## Code Reality Check

```bash
# printer-mapping endpoint in constants.js → 0 matches (MISSING)
grep -n "printer.mapping\|PRINTER_MAPPING" api/constants.js → nothing

# Any screen / component for printer mapping → 0 matches
grep -rn "printerMapping\|printer.mapping\|fixed_station_v2" src/ → nothing

# Existing infrastructure available for reuse:
  API_ENDPOINTS.EMPLOYEES_LIST → '/api/v2/vendoremployee/employee/employees-list' ✅ (already used)
  API_ENDPOINTS.PRINTER_AGENT_CONFIG → printer list source ✅ (printers available from config)
  printerAgentConfigService.getEmployeeList() → employee dropdown ✅ (already built for CR-133-GAP)
  PrinterAgentConfigView.jsx → host component (add new tab here) ✅
```

- **Code reality: NONE** — no mapping screen, no service, no constants entry, no transform
- Reusable: employee list service, printer list from agent config, 4-tab container view

---

## Blast Radius

- New files: `PrinterMappingTab.jsx` (main screen), `printerMappingService.js`
- Modified files:
  - `api/constants.js` (+1 endpoint constant)
  - `api/transforms/printerAgentConfigTransform.js` or new `printerMappingTransform.js`
  - `components/panels/settings/printerConfig/PrinterAgentConfigView.jsx` (add 5th tab)
- Estimated scope: MEDIUM-LARGE (4-5 files, new component ~100-150 lines)

---

## Expected Behavior

**New tab "Printer Mapping" in Printer Agent Config (5th tab):**

1. **Load state:** On open, fetch GET printer-mapping + employee list + printer list from agent config
2. **Fixed Station toggle:** Per-printer toggle — mark printer as fixed-station (`fixed_station_v2`)
3. **Employee rows:** Each employee row shows their assigned printers (multi-select or checkboxes)
4. **Assign printers:** Click printers to assign/unassign from an employee
5. **Save:** POST to printer-mapping endpoint with updated `fixed_station_v2` + `mappings`
6. **Feedback:** Success/error toast, matching existing Printer Agent Config save pattern

---

## Owner Decisions Needed

1. Should this be a **new tab inside the existing Printer Agent Config** 4-tab view (becoming 5 tabs), or a standalone settings page?
2. For the employee→printer assignment UI: **per-employee rows with printer checkboxes**, or a matrix view (employees as columns, printers as rows)?
3. Should the "fixed station" toggle appear **per printer** at the top, or **per printer per employee**?

---

## Duplicate Check

DISTINCT — no prior CR/BUG for printer mapping employee assignment screen.

---

**Backend:** API READY (endpoints + payload structure confirmed by owner)
**Frontend:** NONE — complete new screen
**Next:** Planning Gate 2 (owner decisions above needed before implementation plan)
