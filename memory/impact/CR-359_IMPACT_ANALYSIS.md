# CR-359 — Impact Analysis (Gate 2)

**ID:** CR-359
**Title:** Station Mapping Tab — Rewire to `/station-printer-map` Endpoint + Fix Data Model
**Date:** 2026-09-02
**Agent:** PLANNING (Gate 2)
**Status:** GATE 2 COMPLETE — GATE 3 BLOCKED on OD-3

---

## 1. Code Reality Check

| File | Status | Evidence |
|------|--------|---------|
| `StationMappingTab.jsx` | EXISTS (CR-353, 2026-09-01) — wrong endpoint/model | Calls `getMapping()` → `PRINTER_MAPPING` constant; `handleLoad` filters `allData.printers[].assignedEmployeeIds` |
| `printerMappingService.js` | EXISTS — `saveRawMapping` added by CR-353, but all 3 functions use `PRINTER_MAPPING` | No reference to `/station-printer-map` anywhere |
| `constants.js` | EXISTS — `PRINTER_MAPPING` present, `STATION_PRINTER_MAP` ABSENT | grep confirms zero hits for new endpoint in entire `src/` |

**Code Reality: PARTIAL** — CR-353 shipped the UI shell against the old endpoint. New wiring is entirely absent.

---

## 2. Conflict Pre-Check

| File | Last modifier | Open items touching it | Conflict? |
|------|-------------|----------------------|---------|
| `constants.js` | CR-141 (IMPLEMENTED), CR-147 (Gate 5b), CR-157 (IMPLEMENTED) | CR-141 + CR-157: IMPLEMENTED (closed, no conflict). CR-147 Awaiting Gate 6 — touches online delivery charge config section, different lines. | **NONE — parallel-safe** |
| `printerMappingService.js` | CR-353 (2026-09-01) | No other open items | **NONE** |
| `StationMappingTab.jsx` | CR-353 (2026-09-01) | No other open items | **NONE** |

**Conflict Pre-Check: CLEAN.**

---

## 3. Data Flow Trace — Current (Broken)

```
[Login] GET /api/v1/vendoremployee/profile
  └─ top-level print_agent[] → profileTransform.fromAPI.printerAgents()
  └─ RestaurantContext.printerAgents  (runtime routing — works correctly, System A)

[StationMappingTab mounts]
  └─ getMapping()
  └─ GET /api/v2/.../printer-mapping        ← WRONG ENDPOINT (CR-160's endpoint)
  └─ fromAPI() → { printers[], employees[], defaultUserIds }
  └─ allData set with CR-160 shape

[User selects employee + clicks Load]
  └─ handleLoad()
  └─ client-side filter: allData.printers.filter(p => p.assignedEmployeeIds.includes(empId))
  └─ rows = [{printerId, areaName, userId}]  ← WRONG — no per-employee GET called

[User edits rows + clicks Save Mapping]
  └─ handleSave()
  └─ saveRawMapping({ fixed_station_v2: {...}, mappings: {empId: [printerIds]} })
  └─ POST /api/v2/.../printer-mapping        ← WRONG ENDPOINT, WRONG PAYLOAD SHAPE
  └─ No profile re-fetch → RestaurantContext.printerAgents stays stale
```

## 4. Data Flow Trace — Target (Correct)

```
[StationMappingTab mounts]
  └─ getStationMap()                         ← NEW service function
  └─ GET /api/v2/.../station-printer-map     ← NEW endpoint (no vendor_employee_id = first employee)
  └─ { areas[], default_users[], all_users[], selected_employee_id, mappings[] }
  └─ Populate: employee dropdown from all_users[], default-user dropdown from default_users[]
  └─ Pre-select selectedEmpId = selected_employee_id from response

[User changes employee dropdown]  ← OD-3: auto-fire or still require Load button?
  └─ getStationMap(newEmpId)
  └─ GET /api/v2/.../station-printer-map?vendor_employee_id=<newEmpId>
  └─ rows seeded from response.mappings[]

[User edits rows + clicks Save Mapping]
  └─ saveStationMap({ vendor_employee_id: selectedEmpId, mappings: [{area_name, default_employee_id}] })
  └─ POST /api/v2/.../station-printer-map
  └─ On success: re-fetch profile → setRestaurant(fresh)  ← OD-4: confirm scope
  └─ RestaurantContext.printerAgents updated mid-session
```

---

## 5. Live API Verification (hogwarts probe — 2026-09-02)

| Check | Result |
|-------|--------|
| `GET /station-printer-map` (no emp_id) | ✅ 200 — `areas: [BAR, Bill, KDS, Pizza]`, `default_users: 6`, `all_users: 7`, `selected_employee_id: 2819`, `mappings: [{BAR,2819},{Bill,2819},{KDS,2819}]` |
| `GET /station-printer-map?vendor_employee_id=2819` | ✅ 200 — same data for employee 2819 (Albus) |
| `POST /station-printer-map` (ruby, change BAR→Saurav) | ✅ 200 — saved correctly |
| Re-fetch `GET /profile` after POST | ✅ `print_agent` immediately reflects saved change — **GAP-6 RESOLVED** |

**Key live observations:**
1. `areas[]` uses title-case `"Bill"` not `"BILL"` — the UI must display verbatim from `areas[]` array.
2. `default_users[]` returns only employees with `default_user_v2 = Yes` — hogwarts has 6, cafeclub has 0. Defensive handling needed for empty case.
3. `selected_employee_id` from initial GET is the backend's first-employee default — FE should respect this as the pre-selected employee on mount.
4. `mappings[]` for the initially-selected employee is pre-populated — no need to call Load separately if auto-loading on employee change.

---

## 6. Risk Classification

| Dimension | Value |
|-----------|-------|
| Risk | **CRITICAL** (printing configuration — in CRITICAL risk category per AGENT_PROMPT_ALPHA) |
| Financial logic touched | NO |
| Order flow touched | NO (only settings UI) |
| Runtime printing affected | YES (profile re-fetch after save updates `RestaurantContext.printerAgents` mid-session) |
| Hotspot files | YES — `constants.js` is a shared file (High-Risk dependency hub) |
| Blast radius | SMALL — 3 files, ~80–120 lines changed |
| Fast Lane eligible | NO |
| Owner approval for Gate 4 | REQUIRED (CRITICAL risk) |

---

## 7. Files WILL Change

| File | Change Type | Scope |
|------|------------|-------|
| `src/api/constants.js` | ADD (additive) | 1 line: `STATION_PRINTER_MAP: '/api/v2/vendoremployee/restaurant-settings/station-printer-map'` after `PRINTER_MAPPING` line |
| `src/api/services/printerMappingService.js` | ADD (additive) | 2 new exported functions: `getStationMap(vendorEmployeeId?)` and `saveStationMap({vendor_employee_id, mappings[]})`. Existing `getMapping`, `saveMapping`, `saveRawMapping` untouched. |
| `src/components/panels/settings/printerConfig/StationMappingTab.jsx` | REWRITE (logic only) | New state shape: `areas[]`, `defaultUsers[]`, `selectedEmpId`. `handleLoad` rewritten to call `getStationMap(empId)`. `handleSave` rewritten to use correct payload. Area dropdown uses `areas[]` strings. Default-user dropdown uses `defaultUsers[]`. +`useRestaurant` import for profile re-fetch after save (pending OD-4). |

---

## 8. Files WILL NOT Touch

| File | Reason |
|------|--------|
| `printerMappingTransform.js` | CR-160 transform — intact, no change needed for new endpoint |
| `PrinterMappingTab.jsx` | CR-160 UI — separate tab, separate concern |
| `PrinterAgentConfigView.jsx` | Tab container — `StationMappingTab` has own load/save, container is untouched |
| `printerAgentSelector.js` | Runtime selector — correct as-is, no change |
| `profileTransform.js` | Profile transform — correct as-is |
| `orderService.js` | Runtime print service — correct as-is |
| `RestaurantContext.jsx` | Context — correct, no provider change needed |
| `App.js` | No route change |
| `Sidebar.jsx` | No navigation change |

---

## 9. Downstream Consumers Analysis

| Consumer | Impact of CR-359 |
|----------|-----------------|
| `orderService.printOrder()` | Reads `printerAgents` from `RestaurantContext`. After profile re-fetch on save, next print call picks up the updated agents. **No code change needed.** |
| `printerAgentSelector.selectAgentsForKot/Bill` | Pure functions operating on already-normalized `printerAgents`. Case-insensitive match already handles `"Bill"` vs `"BILL"`. **No code change needed.** |
| `RestaurantContext.printerAgents` | Updated mid-session only if OD-4 is confirmed (profile re-fetch after save). Otherwise stale until re-login. **No code change needed — read-only consumer.** |
| `PrinterMappingTab.jsx` (CR-160) | Completely independent — different endpoint, different concept. **Zero impact.** |

---

## 10. Owner Decisions Required for Gate 3

### OD-3 — UX: Auto-load vs explicit Load button *(GATE 3 BLOCKER)*

**Current:** Employee dropdown change → user must click "Load" button → data fetches.
**Spec says:** "On employee change, call GET again with the new `vendor_employee_id`."
**Question:** Should we:

- **Option A — Auto-load:** Remove the "Load" button. Employee dropdown change immediately fires `GET /station-printer-map?vendor_employee_id=<selected>`. Rows update automatically. (Matches backend spec intent. Cleaner UX.)
- **Option B — Keep Load button:** Employee change clears rows + sets `loaded=false`. User still clicks Load to fetch. (Preserves existing UX pattern, avoids accidental loads.)

**Recommendation:** Option A (auto-load). The current Load button was a workaround for the client-side filter — it added no value. With a real API call, auto-loading on dropdown change is standard UX for this pattern.
**But: awaiting owner decision before Gate 3.**

### OD-4 — Profile re-fetch after save *(GATE 3 BLOCKER)*

**Confirmed in probe (2026-09-02):** Saving via `/station-printer-map` immediately updates `print_agent` in the next `/profile` response. `RestaurantContext.printerAgents` becomes stale mid-session unless the profile is re-fetched.

**Question:** Should CR-359 include the profile re-fetch after successful save?

- **Option A — Include it (recommended):** After `POST /station-printer-map` succeeds, call `getProfile()` → `setRestaurant(fresh.restaurant)`. Same pattern as BUG-337 (`RestaurantSettingsPage.jsx`). `StationMappingTab` needs `useRestaurant` import. ~5 lines.
- **Option B — Defer:** Skip profile re-fetch in this CR. Operators apply new routing on next login. Document as known limitation.

**Recommendation:** Option A. The profile re-fetch is a 5-line change that makes the feature complete. Deferring creates a confusing gap where saved mappings are silently ignored until re-login.

---

## 11. Verification Matrix (seeds QA handover)

| # | Edit | File | How to Verify | Automated? |
|---|------|------|--------------|:---:|
| V1 | Add `STATION_PRINTER_MAP` constant | `constants.js` | `grep STATION_PRINTER_MAP src/api/constants.js` → value matches `/api/v2/.../station-printer-map` | YES |
| V2 | Add `getStationMap()` function | `printerMappingService.js` | Call function, verify network tab shows `GET /station-printer-map` | NO (live) |
| V3 | Add `saveStationMap()` function | `printerMappingService.js` | Call function, verify network tab shows `POST /station-printer-map` with correct payload shape | NO (live) |
| V4 | Employee dropdown populates from `all_users[]` | `StationMappingTab.jsx` | Open tab → verify all 7 hogwarts employees appear in dropdown | NO (browser) |
| V5 | Default-user dropdown shows only `default_users[]` | `StationMappingTab.jsx` | Open tab → verify only 6 default_user_v2=Yes employees appear (not all 7) | NO (browser) |
| V6 | Area dropdown shows `areas[]` from API | `StationMappingTab.jsx` | Add a row → area select shows BAR / Bill / KDS / Pizza (not printer IDs) | NO (browser) |
| V7 | Per-employee load returns correct mappings | `StationMappingTab.jsx` | Select employee 2819 → rows show BAR/Bill/KDS pre-populated | NO (browser) |
| V8 | Save payload is `{vendor_employee_id, mappings:[{area_name, default_employee_id}]}` | `StationMappingTab.jsx` | Click Save → Network tab → verify POST body shape | NO (browser) |
| V9 | Profile re-fetched after save (if OD-4=A) | `StationMappingTab.jsx` | Save → check that `RestaurantContext.printerAgents` updates without re-login | NO (browser) |
| V10 | Old endpoint `PRINTER_MAPPING` still used by `PrinterMappingTab` (regression) | `PrinterMappingTab.jsx` | Confirm `getMapping()` still hits `/printer-mapping` — no regression | NO (browser) |
| V11 | Webpack compiles with 0 new warnings | ALL | `tail -n 5 /var/log/supervisor/frontend.out.log` | YES |

---

## 12. Post-Code Registry Checklist (for Implementation agent)

```
□ registry.json: CR-359 → status: IMPLEMENTED, sprint_key: pos_5_x
□ CR_REGISTRY.md: CR-359 row updated with IMPLEMENTED + file list
□ FILE_OWNERSHIP.md: constants.js / printerMappingService.js / StationMappingTab.jsx listed with CR-359 + date
□ Code markers: // CR-359 comment in every modified file
□ Compile check: webpack 0 new warnings
```

---

## 13. Scope Lock (Gate 2)

**Files WILL change (3):**
- `src/api/constants.js`
- `src/api/services/printerMappingService.js`
- `src/components/panels/settings/printerConfig/StationMappingTab.jsx`

**Files will NOT touch:**
`printerMappingTransform.js` · `PrinterMappingTab.jsx` · `PrinterAgentConfigView.jsx` · `printerAgentSelector.js` · `profileTransform.js` · `orderService.js` · `RestaurantContext.jsx` · `App.js` · `Sidebar.jsx`

---

*Gate 2 complete: 2026-09-02 | Planning agent | 2 owner decisions outstanding (OD-3, OD-4) | Gate 3 blocked until answers received*
