# QA Handover — CR-359
**Date:** 2026-09-02
**Written by:** Implementation agent
**For:** QA agent

---

## 1. What Was Built

Station Mapping Tab (`StationMappingTab.jsx`) rewired from CR-160's old `/printer-mapping` endpoint to the correct `/station-printer-map` endpoint. Data model, dropdowns, save payload, and profile re-fetch all fixed.

**3 files changed:**
| File | Change |
|------|--------|
| `src/api/constants.js:119` | Added `STATION_PRINTER_MAP` constant (additive) |
| `src/api/services/printerMappingService.js:23-35` | Added `getStationMap()` + `saveStationMap()` (additive) |
| `src/components/panels/settings/printerConfig/StationMappingTab.jsx` | Full logic rewrite — new endpoint, correct model, OD-4 |

---

## 2. Inherited Verification Matrix (from Gate 2/3)

| # | Test | Steps | Expected | Self-Test |
|---|------|-------|----------|-----------|
| V1 | STATION_PRINTER_MAP constant | `grep STATION_PRINTER_MAP src/api/constants.js` | URL = `/station-printer-map` | ✅ PASS |
| V2 | getStationMap calls correct endpoint | Network tab → Load click | GET `/station-printer-map?vendor_employee_id=X` | ✅ Code verified |
| V3 | saveStationMap correct payload | Network tab → Save | POST body = `{vendor_employee_id, mappings:[{area_name, default_employee_id}]}` | ✅ Code verified |
| V4 | Employee dropdown = all_users[] | Open Station Mapping tab | All employees visible (e.g. 7 for hogwarts) | ✅ Code verified |
| V5 | Default-user dropdown = default_users[] ONLY | Add a row → open second dropdown | Only fixed users shown (e.g. 6 not 7 for hogwarts — Pizza La absent) | ✅ Code verified |
| V6 | Area dropdown = areas[] strings | Add a row → open first dropdown | BAR / Bill / KDS / Pizza (not numeric printer IDs) | ✅ Code verified |
| V7 | Load fetches per-employee mappings | Select emp → Load | Rows pre-populated from API mappings[] | ✅ Code verified |
| V8 | No regression: PrinterMappingTab still calls `/printer-mapping` | Printer Mapping tab → Network | GET `/printer-mapping` (not `/station-printer-map`) | ✅ Confirmed unchanged |
| V9 | OD-4: GET /profile fires after save | Save → Network tab | POST `/station-printer-map` then GET `/profile` | ✅ Code verified |
| V10 | PrinterMappingTab unchanged | Open Printer Mapping tab | Still shows employee chips + printer cards | ✅ Confirmed untouched |
| V11 | Compile: 0 new warnings | `tail -3 /var/log/supervisor/frontend.out.log` | `webpack compiled successfully` | ✅ PASS |

---

## 3. Additional Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| A1 | Empty employee: Load blocked | Tab open, no employee selected → click Load | Toast "Select an employee first" |
| A2 | Empty default_users: rows can't be saved with blank user | Add row, leave user blank → Save | Only rows with both area + user sent in POST |
| A3 | Remove row → save → Load again | Remove a mapping → Save → select same emp → Load | Removed mapping no longer appears |
| A4 | Mount pre-loads first employee | Open Station Mapping tab without interaction | Rows already populated for default employee |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Item: CR-359
Status: IMPLEMENTED
Sprint: pos_5_x
EXIT GATE: ALL 5 PASSED (see below)
```

**EXIT GATE results:**
- □1 REGISTRY SYNC: ✅ CR-359 → IMPLEMENTED, pos_5_x
- □2 CR_REGISTRY.MD: ✅ Updated (see CR_REGISTRY.md 2026-09-02 section)
- □3 FILE_OWNERSHIP.MD: ✅ 3 files listed under CR-359 2026-09-02
- □4 CODE MARKERS: ✅ `// CR-359` in all 3 modified files
- □5 COMPILE CHECK: ✅ `webpack compiled successfully`

---

## 5. Credentials + Environment

| Field | Value |
|-------|-------|
| Test account (printer agent, full setup) | owner@hogwarts.com / Qplazm@10 |
| Test account (printer agent, has mappings) | owner@ruby.com / Qplazm@10 |
| Test account (local printer, no default_users) | owner@cafeclub.com / Qplazm@10 |
| App URL | https://core-frontend-live.preview.emergentagent.com |
| Printer Settings path | Settings → Printer Settings → Station Mapping tab |

---

## 6. Regression Scope

Change touches `constants.js` (hotspot) → run 2 cross-flow checks:
1. **PrinterMappingTab** (CR-160): open Printer Mapping tab → confirm it still loads/saves correctly
2. **Print routing at order time**: place a test order → KOT routes to correct printer agent (runtime `printerAgents` still populated from profile)
