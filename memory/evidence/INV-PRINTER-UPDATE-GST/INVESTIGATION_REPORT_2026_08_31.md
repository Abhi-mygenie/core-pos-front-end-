# INVESTIGATION REPORT — Printer Station Update Error + Station GST Not Showing
**Date:** 2026-08-31
**Role:** INVESTIGATION
**Items Investigated:** 2 symptoms reported together
**Status:** ROOT CAUSE FOUND (both) — HIGH confidence
**Steps used:** 6/10

---

## 1. Summary

| # | Symptom | Root Cause | File | Classification | Confidence |
|---|---------|-----------|------|----------------|------------|
| A | "Save failed" on printer update (PUT method error) | `updateStation()` calls `api.put()` but backend only supports POST for this endpoint | `stationConfigService.js:22` | FE_BUG | HIGH |
| B | Station GST field not visible in the edit form | Field is gated behind `restaurantFor === 'food_court'` condition — non-food-court accounts never see it | `StationsTab.jsx:391` + `stationConfigTransform.js:52` | FE_BUG | HIGH |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|------------|-------|--------|---------|
| H1 | `updateStation()` uses wrong HTTP method (PUT) | Code trace: `stationConfigService.js` | 1 | CONFIRMED | Line 22 — `api.put(API_ENDPOINTS.STATION_CONFIG, ...)` |
| H2 | Backend changed PUT→POST contract | Screenshot + curl in issue report | 1 | CONFIRMED | "The PUT method is not supported for this route. Supported methods: GET, HEAD, POST." |
| H3 | `station_gst` field hidden by conditional render | Code trace: `StationsTab.jsx` + `stationConfigTransform.js` | 2 | CONFIRMED | Line 391 guard + line 52 payload guard both gated by `restaurantFor === 'food_court'` |
| H4 | `restaurantFor` is empty/wrong for affected account | Code trace: `StationsTab.jsx:33` + context | 1 | CONFIRMED | Non-food-court account → `restaurantFor = ''` → both guards block field |
| H5 | Printer Agent config has same PUT issue | Code search: `printerAgentConfigService.js` | 1 | ELIMINATED | Printer Agent config uses its own separate service; no `api.put()` found there |

---

## 3. Data Flow Trace

### Gap A — PUT vs POST

```
User clicks "Update Printer" in StationsTab
  → handleSave() [StationsTab.jsx:75]
    → isNew = false → calls updateStation(form, restaurantFor) [stationConfigService.js:22]
      → api.put(API_ENDPOINTS.STATION_CONFIG, payload)          ← BUG HERE
        → STATION_CONFIG = '/api/v2/vendoremployee/restaurant-settings/printer-config'
          → Backend rejects: 405 Method Not Allowed
            → toast: "Save failed — The PUT method is not supported..."

addStation() (isNew=true) correctly uses api.post() at line 17 — only UPDATE is broken.
```

### Gap B — Station GST not visible

```
restaurant?.settings?.restaurantFor [StationsTab.jsx:33]
  → for non-food-court accounts: restaurantFor = '' (empty)

RENDER GUARD [StationsTab.jsx:391-400]:
  {restaurantFor === 'food_court' && (
    <TextInput label="Station GST" ... />
  )}
  → '' !== 'food_court' → field NEVER RENDERS

PAYLOAD GUARD [stationConfigTransform.js:52]:
  station_gst: restaurantFor === 'food_court' ? (form.stationGst || null) : null
  → '' !== 'food_court' → station_gst always sent as null

BREAK POINT: Both the UI field and its payload value are blocked by the same food_court guard.
The field exists in code but is never accessible for regular restaurants.
```

---

## 4. Evidence Artifacts

| Evidence | Location |
|---------|---------|
| Screenshot showing 405 error | Owner-provided (issue report) |
| Curl command (POST spec) | Owner-provided (issue report) |
| Code trace — service | `/app/frontend/src/api/services/stationConfigService.js:22` |
| Code trace — render guard | `/app/frontend/src/components/panels/settings/localPrinter/StationsTab.jsx:391` |
| Code trace — payload guard | `/app/frontend/src/api/transforms/stationConfigTransform.js:52` |

---

## 5. Fix Scope

### Fix A — Change PUT → POST in `updateStation`

| Field | Value |
|-------|-------|
| File | `src/api/services/stationConfigService.js` |
| Line | 22 |
| Change | `api.put(...)` → `api.post(...)` |
| Lines changed | 1 |
| Risk | MEDIUM (API contract change — confirmed correct by owner-provided curl spec) |
| Planning skip eligible | YES — 1 file, 1 line, not a hotspot (R5), not financial |
| Owner approval needed | YES (planning skip) |

### Fix B — Remove `food_court` gate from Station GST

| Field | Value |
|-------|-------|
| Files | `StationsTab.jsx:391` (render guard) + `stationConfigTransform.js:52` (payload guard) |
| Change | Remove `restaurantFor === 'food_court' &&` guard from render; send `stationGst` unconditionally in payload |
| Lines changed | ~3 lines total |
| Risk | MEDIUM (affects payload shape for all restaurant types — previously sent null, now sends value) |
| Planning skip eligible | **NEEDS OWNER DECISION** — see open question below |

---

## 6. Open Owner Decision Required

**Before fixing Gap B**, owner must confirm:

> "Should `station_gst` be visible and editable for ALL restaurant types, or only food courts?"

Options:
- **A) Show for all restaurants** → remove both guards entirely
- **B) Show for food courts + a specific list of non-food-court types** → update guard condition
- **C) Show always but only send non-null when food_court** → separate UI guard from payload guard

Current behaviour (for reference):
- Food courts: field shown + value sent
- All others: field hidden + `null` always sent

---

## 7. Recommendations

| Item | Classification | Recommended Path | Owner Approval Needed |
|------|--------------|----------------|----------------------|
| Fix A (PUT→POST) | FE_FIX | DIRECT_BUG_FIX — planning skip (1 file, 1 line) | YES — approve skip |
| Fix B (station_gst gate) | FE_FIX | DIRECT_BUG_FIX after owner answers open decision | YES — confirm scope of guard removal |

---

## 8. Retroactive Candidates

NONE — both issues are net-new gaps not previously registered.

---

*Investigation closed: 2026-08-31. Steps used: 6/10.*
