# CR-359 — Station Mapping Tab: Rewire to Correct `/station-printer-map` Endpoint + Fix Data Model

**ID:** CR-359
**Type:** CR (post-delivery contract fix)
**Date:** 2026-09-02
**Registered by:** INTAKE agent
**Status:** INTAKE COMPLETE — READY FOR GATE 2
**Priority:** P1
**Risk:** CRITICAL
**Related:** CR-353 (original build), BUG-319 (same backend-blocked printing category)
**Source:** AGENT-DISCOVERED — Investigation session 2026-09-02
**Investigation doc:** `/app/memory/handover/INVESTIGATION_STATION_PRINTER_MAP_2026_09_02.md`
**Backend brief:** `/app/memory/backend_briefs/BACKEND_BRIEF_STATION_PRINTER_MAP_GAP6_2026_09_02.md`

---

## 1. Description

CR-353 built the Station Mapping Tab (`StationMappingTab.jsx`) reusing CR-160's service layer (`printerMappingService.js`, `PRINTER_MAPPING` constant, `printerMappingTransform.fromAPI`). At that time, the dedicated `/station-printer-map` endpoint did not exist or had not been spec'd.

The backend team has now delivered the correct endpoint and provided the API spec (`stationmap.md`). The new endpoint has a **completely different contract** from the old `/printer-mapping` endpoint that the tab currently calls. As a result:

- Every GET loads data from the wrong API (old printer-mapping model, not per-employee station mappings)
- Every POST saves to the wrong API with the wrong payload shape
- Per-employee load uses a client-side filter instead of the spec's per-employee GET call
- The "Default User" dropdown offers all employees instead of only `default_user_v2=Yes` employees
- The new `/station-printer-map` endpoint is not registered anywhere in `API_ENDPOINTS`

Additionally, there is an unresolved question (GAP-6) about whether the UI save path (`station_printer_mappings`) and the runtime read path (`print_agent` from `/profile`) are linked backend-side. This must be answered before Gate 3.

---

## 2. Evidence

| Field | Value |
|---|---|
| Screenshot | Not provided |
| Steps to reproduce | 1. Open Printer Agent Config → Station Mapping tab. 2. Select any employee, click Load. 3. Network tab: observe request goes to `/printer-mapping` not `/station-printer-map`. 4. Rows rendered use `printers[].assignedEmployeeIds` — wrong model. |
| Curl evidence | Not captured (preprod token not available in this session) |
| Source | AGENT-DISCOVERED via code trace + stationmap.md spec comparison |
| Confidence | CONFIRMED — endpoint mismatch, model mismatch, payload mismatch all verified in code |

---

## 3. Gaps (from Investigation)

| Gap | File:Line | Classification | Severity |
|-----|-----------|---------------|---------|
| GAP-1: Wrong endpoint called (`/printer-mapping` not `/station-printer-map`) | `printerMappingService.js:7,12,18` + `constants.js:118` | CONTRACT_MISMATCH | CRITICAL |
| GAP-2: New endpoint not in `API_ENDPOINTS` | `constants.js` | CODE_ERROR | CRITICAL |
| GAP-3: `handleLoad()` uses `allData.printers[].assignedEmployeeIds` (old CR-160 model, no longer matches API response) | `StationMappingTab.jsx:36-48` | CONTRACT_MISMATCH + CODE_ERROR | CRITICAL |
| GAP-4: Default-User dropdown shows all employees — API requires `default_users` only | `StationMappingTab.jsx:219` | CONTRACT_MISMATCH | HIGH |
| GAP-5: Save payload is `{ fixed_station_v2, mappings: {empId:[printerIds]} }` — API expects `{ vendor_employee_id, mappings: [{area_name, default_employee_id}] }` | `StationMappingTab.jsx:54-78` | CONTRACT_MISMATCH | CRITICAL |
| GAP-6: Runtime disconnect — UI saves to `station_printer_mappings`, runtime reads `print_agent` from profile (unconfirmed if linked) | Backend | DATA_ISSUE (suspected) | CRITICAL (if not linked) |

---

## 4. Severity Rationale

**P1 — HIGH** (not P0 because the runtime print-agent path, System A, still functions via `print_agent` from `/profile`; the settings UI is broken but KOT/bill printing itself has not regressed from its pre-CR-353 state).

**Risk: CRITICAL** — touches printing configuration, which is in the CRITICAL risk category per AGENT_PROMPT_ALPHA. Contract change across endpoint + model + payload. GAP-6 could elevate to P0 if runtime and settings data sources are confirmed to be independent.

---

## 5. Blast Radius

```bash
# Files requiring change
constants.js               — add STATION_PRINTER_MAP constant (1 line)
printerMappingService.js   — add getStationMap() + saveStationMap() (new functions)
StationMappingTab.jsx      — full logic rewrite of handleLoad + handleSave + dropdowns
```

- Blast radius: **SMALL** (~3 files, ~80–120 lines)
- Hotspot files: YES — printing category (CRITICAL risk per rules)
- Financial logic: NO
- Existing working code at risk: NO — `PrinterMappingTab.jsx` (CR-160), `printerAgentSelector.js`, `profileTransform.js`, `orderService.js`, `RestaurantContext.jsx` must NOT be touched

---

## 6. Duplicate Check

| Check | Result |
|-------|--------|
| ID search (registry.json) | CR-353: DISTINCT — CR-353 tracked the UI build; this tracks the contract correction post-backend spec delivery |
| CR-160 | DISTINCT — CR-160 is the printer-mapping (employee→printer) screen. This is the station-printer-map (employee→area→default_user) screen. Different APIs, different concepts. |
| BUG-319 | RELATED — also a printer backend-blocked item, same print settings area |
| POS2-003 | RELATED — built the runtime `print_agent` flow (System A); this CR fixes System B (settings UI) |

---

## 7. Owner Decisions Required (Gate 2 blockers)

| ID | Question |
|----|---------|
| **OD-1** | GAP-6 probe: Backend team must confirm — does `GET /profile` → `print_agent` serve data FROM `vendor_employees.station_printer_mappings`? Curl probe in backend brief at `backend_briefs/BACKEND_BRIEF_STATION_PRINTER_MAP_GAP6_2026_09_02.md`. |
| **OD-2** | If GAP-6 = sources are NOT linked: does the frontend need to re-fetch profile after a successful station mapping save (to refresh `printerAgents` in RestaurantContext)? Or is that a backend fix only? |

---

## 8. Scope Lock (proposed — final at Gate 3)

**Files WILL change:**
- `src/api/constants.js`
- `src/api/services/printerMappingService.js`
- `src/components/panels/settings/printerConfig/StationMappingTab.jsx`

**Files will NOT touch:**
- `printerMappingTransform.js` (CR-160 transform — leave intact)
- `printerAgentSelector.js`
- `profileTransform.js`
- `orderService.js`
- `RestaurantContext.jsx`
- `PrinterMappingTab.jsx` (CR-160 UI — leave intact)
- `PrinterAgentConfigView.jsx` (tab container — no logic change needed)

---

## 9. Fast Lane Eligibility

**NO** — touches 3 files, printing category (CRITICAL risk trigger), API contract change. Full gate flow required.

---

## 10. Next Steps

1. Owner answers OD-1 (backend GAP-6 probe — see backend brief)
2. Owner answers OD-2 (profile re-fetch strategy)
3. → PLANNING (Gate 2 Impact Analysis + Gate 3 Implementation Plan)
4. → Gate 4 GO (owner approval required — CRITICAL risk + printing)
5. → IMPLEMENTATION
6. → QA
