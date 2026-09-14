# CR-353 IMPACT ANALYSIS — Printer Agent: Remove Stations Tab + Build Station Mapping Tab
**Date:** 2026-08-31
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE (StationMappingTab does not exist) | PARTIAL (PrinterAgentConfigView has Stations tab that must be removed)
**Conflict Pre-Check:** NO conflicts — PrinterAgentConfigView last touched by CR-352 (2026-08-30) on different lines (printerType field, Step 1/2 wizard). Stations tab lines untouched by CR-352.
**Risk:** MEDIUM

---

## Part A — Remove Stations Tab

### Data Flow Trace
```
PrinterAgentConfigView.jsx
  Line 13:  import { StationsTab } from "../localPrinter/StationsTab"  ← REMOVE
  Line 21:  { id: "stations", label: "Stations" }  in TABS array       ← REMOVE
  Line 141: {activeTab === "stations" && <StationsTab />}               ← REMOVE
```
No downstream impact. StationsTab itself is not changed — it remains in use by LocalPrinterSetupView.

### Affected Files
| File | Change | Risk |
|---|---|---|
| `PrinterAgentConfigView.jsx` | Remove import + TABS entry + render (3 lines) | LOW |

### Owner Decisions: NONE — already locked.

---

## Part B — Build StationMappingTab

### Data Flow Trace
```
GET /printer-mapping
  → printerMappingService.getMapping()
    → fromAPI(data):
        employees[]  — { id, name }           ← used for both dropdowns
        printers[]   — { id, areaName, assignedEmployeeIds[] }
                     ← invert to get employee→printers map on FE
        defaultUserIds Set
    → StationMappingTab local state:
        allData (full fromAPI result, loaded once on mount)
        selectedEmployeeId (top dropdown)
        rows: [{ printerId, areaName, userId }]  (shown after Load)
        dirty flag

UX Flow:
  1. Mount → getMapping() → store allData
  2. Select Employee → update selectedEmployeeId
  3. Click Load → filter allData.printers where assignedEmployeeIds.includes(selectedEmployeeId)
               → build rows from filtered printers
  4. Edit rows (add/remove/change dropdowns) → update rows[]
  5. Save → buildPayload() → saveRawMapping(payload)
         → POST /printer-mapping with correct format

POST payload (owner-confirmed):
  fixed_station_v2: { printer_id: "Yes" }  for all printers appearing in any row
  mappings: { employee_id: [printer_ids] }  for ALL employees (merge rows into full map)
```

### Build Strategy for POST payload
```
On Save in StationMappingTab:
  1. Start from allData.printers to reconstruct full mappings for ALL employees
  2. Override the selected employee's entry with the current rows
  3. Build fixed_station_v2: any printer appearing in any employee's mapping → "Yes", rest → "No"
  4. POST full payload
```
This ensures saving one employee's mapping doesn't erase other employees' mappings.

### Affected Files
| File | Change | Risk |
|---|---|---|
| `StationMappingTab.jsx` | CREATE new file (~120 lines) | MEDIUM — new component |
| `PrinterAgentConfigView.jsx` | + import StationMappingTab + TABS entry `{ id: "stationmapping", label: "Station Mapping" }` + render `{activeTab === "stationmapping" && <StationMappingTab />}` | LOW |
| `printerMappingService.js` | ADD `export const saveRawMapping = async (payload) => api.post(PRINTER_MAPPING, payload)` — additive only, does NOT change saveMapping/getMapping | LOW |

### Files Will NOT Touch
- `PrinterMappingTab.jsx` — no change (working, owner confirmed)
- `printerMappingTransform.js` — no change (existing toAPI/fromAPI untouched)
- `stationConfigService.js` — Local Printer only
- All other 4 Printer Agent tabs

### Owner Decisions: NONE — all locked (design frozen 2026-08-31)

---

## Risk Classification
| Part | Risk | Reason |
|---|---|---|
| A — Remove Stations tab | LOW | Pure removal, no logic change, StationsTab itself unaffected |
| B — Build StationMappingTab | MEDIUM | New component + additive service change, same API endpoint as working tab |
| **Overall** | **MEDIUM** | Not financial, not hotspot (R5), not auth |

---

## Verification Matrix (seeds Gate 3 plan + QA handover)

| # | Change | How to Verify |
|---|---|---|
| V1 | Stations tab removed from Printer Agent | Navigate to Printer Agent → no "Stations" tab visible |
| V2 | Station Mapping tab appears in slot 6 | Navigate to Printer Agent → "Station Mapping" tab present |
| V3 | Employee dropdown loads | Click Station Mapping → dropdown shows all employees |
| V4 | Load populates rows | Select employee → Load → rows appear (Area + Default User) |
| V5 | Add Mapping adds row | Click Add Mapping → new empty row appears |
| V6 | Remove button removes row | Click trash on row → row gone |
| V7 | Save Mapping POSTs correct payload | Click Save → Network tab: POST /printer-mapping with `fixed_station_v2` + `mappings` (employee_id keys) |
| V8 | Other 5 tabs unaffected | Click through Printers/AutoPrint/BillContent/PrintStyle/PrinterMapping → all load normally |
| V9 | Local Printer Stations tab unaffected | Switch to Local Printer → Stations tab still present and functional |

---

## Code Reality: NONE/PARTIAL
- StationMappingTab: NONE (does not exist)
- Stations tab removal: PARTIAL (code exists to remove)

## Blast Radius: SMALL — 2 files modified + 1 file created

## Next: Gate 3 (Implementation Plan) after owner confirms Gate 4 GO
