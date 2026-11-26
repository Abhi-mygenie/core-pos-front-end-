# BUG FIX REPORT — BUG-365
**Date:** 2026-08-31
**Role:** BUG FIX AGENT
**Status:** FIXED — awaiting QA verification

---

## Summary

| Field | Value |
|---|---|
| Bug ID | BUG-365 |
| Title | Station Config `updateStation()` uses `api.put()` — backend rejects with 405 |
| Priority | P1 |
| Risk | MEDIUM |
| Source | Owner-reported + INV-PRINTER-UPDATE-GST/INVESTIGATION_REPORT_2026_08_31.md |
| Planning skip | OWNER APPROVED |

---

## Failure Details

| Field | Value |
|---|---|
| Symptom | Clicking "Update Printer" on any existing station shows "Save failed — The PUT method is not supported for this route. Supported methods: GET, HEAD, POST." |
| Reproduced | YES — confirmed by owner screenshot + backend 405 response in Network tab |
| Failing function | `updateStation()` in `stationConfigService.js` |
| Failing line | Line 22: `const res = await api.put(API_ENDPOINTS.STATION_CONFIG, ...)` |

---

## Root Cause

| Field | Value |
|---|---|
| Classification | CODE_ERROR |
| Root cause | `updateStation()` used `api.put()` but the backend endpoint `/api/v2/vendoremployee/restaurant-settings/printer-config` only supports GET, HEAD, POST |
| Why `id` still works | `toAPI.station(form, isNew=false, ...)` in `stationConfigTransform.js:54` appends `payload.id = form.id` — so `id` is already in the POST body |
| Why `addStation` was fine | `addStation()` at line 17 already used `api.post()` correctly — only the update path was broken |

---

## Fix Applied

| Field | Value |
|---|---|
| File | `src/api/services/stationConfigService.js` |
| Line | 22 |
| Before | `const res = await api.put(API_ENDPOINTS.STATION_CONFIG, toAPI.station(form, false, restaurantFor));` |
| After | `const res = await api.post(API_ENDPOINTS.STATION_CONFIG, toAPI.station(form, false, restaurantFor)); // BUG-365: PUT→POST` |
| Code marker | `// BUG-365: PUT→POST (backend only supports POST; id sent in body by toAPI.station)` |

---

## Self-Test Results

| Check | Result |
|---|---|
| Code marker present at line 22 | PASS |
| Webpack compiles | PASS — 0 new warnings |
| `api.put` no longer in updateStation | PASS — confirmed by file view |
| `api.post` now used for both add + update | PASS |
| `id` in body for update path | PASS — `toAPI.station(form, false, ...)` → `payload.id = form.id` at transform:54 |

---

## EXIT GATE

| # | Check | Result |
|---|---|---|
| □1 | Registry sync: BUG-365 IMPLEMENTED in registry.json | PASS |
| □2 | BUG_TRACKER.md row added with IMPLEMENTED status | PASS |
| □3 | FILE_OWNERSHIP.md: `stationConfigService.js` listed under BUG-365 | PASS |
| □4 | Code marker `// BUG-365` in modified file | PASS |
| □5 | Webpack compiles with 0 new warnings | PASS |

**EXIT GATE: 5/5 PASS**

---

## Scope

| Field | Value |
|---|---|
| Files CHANGED | `src/api/services/stationConfigService.js` |
| Files NOT touched | All others |
| Scope expansion | NONE |
| Escalated items | NONE |

---

## Related Open Item (not in scope of this fix)

BUG-365B (unregistered) — Station GST field hidden behind `food_court` guard in `StationsTab.jsx:391` + `stationConfigTransform.js:52`. Requires owner decision on scope before fixing. See INV-PRINTER-UPDATE-GST investigation report.

---

*Fix report written: 2026-08-31. Next: QA verification.*
