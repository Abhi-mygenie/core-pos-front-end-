# INVESTIGATION REPORT — Printer Agent: Stations Tab Removal + Printer Mapping Redesign
**Date:** 2026-08-31
**Role:** INVESTIGATION
**Items:** 2 owner-feedback gaps from Printer Agent screen review
**Status:** ROOT CAUSE FOUND (both) — HIGH confidence
**Steps used:** 7/10

---

## 1. Summary

| # | Gap | Root Cause | Confidence | Recommended Path |
|---|-----|-----------|------------|-----------------|
| **GAP-1** | Stations tab appears in Printer Agent — owner says it belongs to Local Printer only | Tab registered in `PrinterAgentConfigView.jsx` TABS array + import + render — never should have been there | HIGH | DIRECT_BUG_FIX (planning skip eligible — 1 file, 3 removals, LOW risk) |
| **GAP-2** | Printer Mapping UX + API payload both wrong | (2a) `toAPI` sends swapped keys vs owner-spec; (2b) UX design completely different from owner-specified screens | HIGH | FULL PLANNING (Gate 2+3) — 2 files, full UX change, MEDIUM risk |

---

## 2. GAP-1 — Stations Tab in Printer Agent

### What exists

`PrinterAgentConfigView.jsx` registers 6 tabs:
```
Printers | Auto Print | Bill Content | Print Style | Printer Mapping | Stations
```

The **Stations** tab imports and renders `StationsTab` from the local printer path:
```
Line 13:  import { StationsTab } from "../localPrinter/StationsTab";  // CR-161
Line 21:  { id: "stations", label: "Stations" },   // CR-161
Line 141: {activeTab === "stations" && <StationsTab />}
```

### Owner feedback
> "Station last tab is part of local printer — it will not be in printer agent"

### Fix scope
| Field | Value |
|---|---|
| File | `PrinterAgentConfigView.jsx` |
| Removals | Line 13 (import), line 21 (tab entry), line 141 (render) |
| Lines changed | 3 |
| Risk | LOW — purely additive removal; no logic, no API, not financial |
| Planning skip eligible | YES (1 file, ≤10 lines, not hotspot R5, not financial R6) |
| TABS after fix | 5 tabs: Printers, Auto Print, Bill Content, Print Style, Printer Mapping |

---

## 3. GAP-2 — Printer Mapping: UX + API Contract Both Wrong

### 3a. API Payload Mismatch (toAPI swapped keys)

**Current `printerMappingTransform.js` toAPI:**
```js
// CURRENT (WRONG)
fixed_station_v2[employee_id] = 'Yes'/'No'    // keys are employee IDs
mappings[printer_id] = [employee_ids]           // keys are printer IDs
```

**Owner-specified correct payload:**
```json
{
  "fixed_station_v2": { "1478": "Yes", "2304": "Yes" },   // keys are PRINTER IDs
  "mappings": { "485": [1478, 2304], "486": [1478, 2304] } // keys are EMPLOYEE IDs
}
```

**Difference:**
| Field | Current | Correct |
|-------|---------|---------|
| `fixed_station_v2` keys | employee IDs | **printer IDs** |
| `fixed_station_v2` values | Yes/No per employee | **Yes/No — is this printer a fixed station** |
| `mappings` keys | printer IDs | **employee IDs** |
| `mappings` values | array of employee IDs | **array of printer IDs** |

The current implementation sends the exact inverse of what the backend expects. This means any save was silently writing garbage to the server.

### 3b. UX Design — Completely Different

**Current UX (PrinterMappingTab.jsx):**
- "Default Users — Print to All Stations" → chips of all employees (toggle who is default)
- "Printer Assignments" → per printer card, chip each employee on/off
- Single Save button

**Owner-specified UX (from screenshots):**

**Title:** "Station → Default User Mapping"

**Top section:**
- "Select Employee" dropdown (list of all employees)
- "Load" button → loads the areas assigned to the selected employee

**After Load — rows:**
| Column | Content |
|--------|---------|
| Area Name | Dropdown — printer area (BAR / Bill / KDS / etc.) |
| Default User (Fixed Station = Yes) | Dropdown — employee for this area |
| Remove | Button to delete this row |

**Bottom buttons:**
- "Add Mapping" — adds a new empty row
- "Save Mapping" — POSTs all rows as the full mapping payload

**Screenshot evidence:**
- Screenshot 2: Empty state after selecting employee (no rows loaded yet)
- Screenshot 3: After Load → 3 rows (BAR→Albus, Bill→Albus, KDS→Albus) with Remove buttons

### 3c. fromAPI — Needs Restructuring

The current `fromAPI` reads:
- `data.printers` — each printer has `mapped_default_employee_ids` (array of employee IDs assigned to it)
- `data.employees` — list of all employees
- `data.default_users` — list of employees who are default users

The new UX needs to derive: **for each employee → which printers are they mapped to** (to support "Load by employee").

This is the inverse of the current structure. The `fromAPI` must produce a `mappings` dict:
```js
mappings = {
  employee_id: [printer_id_1, printer_id_2, ...],
  ...
}
```
Derived by inverting the `printers[].mapped_default_employee_ids` array.

Additionally, `fixed_station_v2` must track **per printer** whether it is a fixed station (not per employee).

**Note:** GET response shape cannot be re-probed (token expired). Current `fromAPI` assumptions appear correct based on code — but a fresh curl with a valid token is recommended as planning step to confirm `data.printers[].mapped_default_employee_ids` semantics.

---

## 4. Data Flow Trace

### Current (broken) Printer Mapping flow
```
GET /printer-mapping
  → fromAPI: printers[].assignedEmployeeIds + employees + defaultUserIds(Set)
    → PrinterMappingTab UI: chips per printer + default user chips
      → save: toAPI sends employee_id keys in fixed_station_v2 ← WRONG
                       printer_id keys in mappings ← WRONG
```

### Target (correct) Printer Mapping flow
```
GET /printer-mapping
  → fromAPI (restructured):
      employees[] (for select dropdown)
      mappings{ employee_id: [printer_ids] } (from inverting printers[].mapped_default_employee_ids)
      printerAreas{ printer_id: area_name } (for area dropdown options)
      fixedStations{ printer_id: 'Yes'/'No' } (from ???  — needs GET probe to confirm source field)
    → PrinterMappingTab UI (new):
        Select Employee dropdown + Load button
        rows: [{ areaName, employeeId }] (filtered by selected employee after Load)
        Add Mapping / Remove / Save Mapping
          → toAPI sends:
              fixed_station_v2{ printer_id: 'Yes'/'No' }
              mappings{ employee_id: [printer_ids] }
```

**BREAK POINT 1 (GAP-1):** `TABS` array in PrinterAgentConfigView.jsx line 21  
**BREAK POINT 2 (GAP-2):** `toAPI` swapped keys + entire UX design

---

## 5. Evidence Artifacts

| Evidence | Source |
|---------|---------|
| TABS registration | `PrinterAgentConfigView.jsx:21` |
| StationsTab import in Printer Agent | `PrinterAgentConfigView.jsx:13` |
| Wrong `toAPI` keys | `printerMappingTransform.js:41-51` |
| Current UX code | `PrinterMappingTab.jsx:1-147` |
| Owner-specified payload | curl spec (issue report) |
| Owner-specified UX | 3 screenshots (issue report) |
| GET response probe | NEEDED — token expired at investigation time |

---

## 6. Open Questions for Planning

| # | Question | Needed for |
|---|---------|-----------|
| Q1 | Confirm GET `/printer-mapping` response shape — specifically: does `data.printers[].mapped_default_employee_ids` exist as described, and is there a `fixed_station` field per printer? | `fromAPI` restructure |
| Q2 | The "Default User (Fixed Station = Yes)" dropdown in each row — can different employees be assigned per area (each row independent), or does Load pre-fill all rows with the selected employee? | Row behaviour after Load |
| Q3 | Is `fixed_station_v2[printer_id]` always "Yes" for all printers in the rows, or only toggled for specific ones? | `toAPI` logic |

---

## 7. Recommendations

### GAP-1 (Stations tab removal)
```
Classification: FE_FIX
Recommended path: DIRECT_BUG_FIX — planning skip (1 file, 3 line removals)
Owner approval: NEEDED to confirm planning skip
Risk: LOW
```

### GAP-2 (Printer Mapping redesign)
```
Classification: FE_FIX (UX + transform rewrite)
Recommended path: FULL PLANNING — Gate 2 (Impact Analysis) + Gate 3 (Implementation Plan)
Files that WILL change: PrinterMappingTab.jsx, printerMappingTransform.js
Risk: MEDIUM (API contract + full component rewrite)
Curl probe: MANDATORY before plan (Q1 above — valid token needed)
```

---

## 8. Retroactive Candidates

- CR-160 (PrinterMappingTab) currently shows `IMPLEMENTED` but the `toAPI` payload is wrong — recommend status update to `PARTIAL / BUG` once GAP-2 is registered.

---

*Investigation closed: 2026-08-31. Steps used: 7/10.*
