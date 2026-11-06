# CR-353 INTAKE — Printer Agent: Remove Stations Tab + Build Station Mapping Tab
**Date:** 2026-08-31
**Source:** Owner feedback — screen-by-screen Printer Agent review
**Risk:** MEDIUM
**Priority:** P1
**Status:** DESIGN FROZEN — Ready for Gate 2 (Impact Analysis)
**Design approved:** 2026-08-31 by owner
**Design URL:** `/cr133-printer-mockup.html` (Tab 4: Printer Mapping, Tab 5: Station Mapping)

---

## What & Why

**Part A — Remove Stations tab**
The Stations tab (last tab in PrinterAgentConfigView) was incorrectly included. Stations CRUD + Printing Mode is Local Printer functionality only. It must not appear in the Printer Agent screen.

**Part B — Build Station Mapping tab (replaces Stations slot)**
A new "Station Mapping" tab replaces the removed Stations tab. This is a new screen that does not exist yet in the Printer Agent.

---

## Target Design (owner-confirmed)

**Title:** Station → Default User Mapping

**Top section:**
- "Select Employee" dropdown (all employees)
- "Load" button — loads the areas/printers currently mapped to the selected employee

**After Load — row list:**
| Column | Content |
|---|---|
| Area Name | Dropdown — printer area options |
| Default User (Fixed Station = Yes) | Dropdown — employee assigned to that area |
| Remove button | Removes this row |

**Bottom buttons:** "Add Mapping" (new empty row) + "Save Mapping" (POST full payload)

---

## API Contract (owner-confirmed)

| Method | Endpoint |
|---|---|
| GET | `/api/v2/vendoremployee/restaurant-settings/printer-mapping` |
| POST | `/api/v2/vendoremployee/restaurant-settings/printer-mapping` |

**POST payload:**
```json
{
  "fixed_station_v2": { "<printer_id>": "Yes", "<printer_id>": "No" },
  "mappings": { "<employee_id>": [printer_id_1, printer_id_2] }
}
```

**Note:** Same endpoint as existing Printer Mapping tab (chip UI). The new Station Mapping tab is a different UX surface operating on the same data.

---

## Tabs After Change

| # | Tab | Change |
|---|---|---|
| 1 | Printers | No change |
| 2 | Auto Print | No change |
| 3 | Bill Content | No change |
| 4 | Print Style | No change |
| 5 | Printer Mapping | No change (chip UI, working) |
| 6 | ~~Stations~~ → **Station Mapping** | Remove + replace |

---

## Owner Decisions Locked

| Decision | Value |
|---|---|
| Stations tab | Remove — belongs to Local Printer only |
| New tab position | Slot 6 (replaces Stations) |
| New tab label | Station Mapping |
| Existing Printer Mapping | No change |
| UX title | Station → Default User Mapping |

---

## Scope

| Field | Value |
|---|---|
| Files WILL change | `PrinterAgentConfigView.jsx` (remove Stations import/tab/render), new `StationMappingTab.jsx` (create) |
| Files will NOT touch | `PrinterMappingTab.jsx`, `printerMappingTransform.js`, all other tabs |
| Blast radius | SMALL — 1 modified + 1 new file |

---

## Next Gate

Gate 2: Impact Analysis → Gate 3: Implementation Plan → Gate 4 GO → Implementation
