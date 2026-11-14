# Probe Report — Station Printer Map + Printer Type Classification
**Date:** 2026-09-02
**Triggered by:** CR-359 OD-1 / OD-2 + owner printer type audit
**Accounts probed:** owner@cafe103.com · owner@cafeclub.com · owner@ruby.com
**Status:** COMPLETE — all questions answered

---

## 1. Printer Type Classification

| Account | Restaurant | ID | printing_option | print_agent entries | default_user_v2 (logged-in) | Verdict |
|---------|-----------|-----|----------------|--------------------|-----------------------------|---------|
| owner@cafe103.com | CAFE 103 | 644 | **Station** | 0 (empty array) | No | **Local / Station printer** |
| owner@cafeclub.com | Cafe N Club | 642 | **Waiter** | 0 (empty array) | null | **Local / Waiter printer** |
| owner@ruby.com | uat Ruby | 672 | **Fixed** | 3 (BILL/KDS/BAR) | Yes | **Printer Agent (Fixed station)** |

**Notes:**
- `printer_agent` field in `settings` sub-object is `None` for all three — this field is NOT used to determine printer type in these accounts. The operative fields are `printing_option` (restaurant level) and whether `print_agent[]` is populated.
- cafe103 and cafeclub have `printing_option = Station / Waiter` and empty `print_agent` → these are **local printer** accounts, NOT printer-agent accounts.
- ruby has `printing_option = Fixed` and 3 `print_agent` entries → this is a **printer agent (Fixed station)** account.
- `restaurant_printer_config` for cafe103 is a `list` type (not dict) — different schema path for local printer config vs agent config.

---

## 2. GAP-6 Probe — OD-1 ANSWER ✅

**Question:** Does `GET /profile` → `print_agent` serve data FROM `vendor_employees.station_printer_mappings`? (i.e., does a POST to `/station-printer-map` immediately affect what the next `/profile` call returns in `print_agent`?)

**Test performed on ruby (owner@ruby.com, employee 3418):**

| Step | Action | Result |
|------|--------|--------|
| BEFORE | GET /profile → print_agent | BILL→3418, KDS→3418, **BAR→3418** |
| POST | /station-printer-map `{vendor_employee_id:3418, mappings:[..., {BAR, 3532}]}` | success: true |
| AFTER | GET /profile → print_agent | BILL→3418, KDS→3418, **BAR→3532** ✅ |
| RESTORE | POST back BAR→3418 | success: true |

**OD-1 VERDICT: YES — sources ARE linked.**
A successful POST to `/station-printer-map` immediately reflects in the next `/profile` call's `print_agent` array. The two systems (System A runtime / System B settings UI) share the same backend data source. GAP-6 is RESOLVED — no backend fix needed.

---

## 3. OD-2 Answer (derived from OD-1) ✅

**Question:** After a successful station mapping save, does the frontend need to re-fetch the profile to refresh `RestaurantContext.printerAgents`?

**Answer: YES — recommended, but LOW urgency.**
Since the save is a settings screen action (not during active order flow), a profile re-fetch after save would ensure the `printerAgents` list in memory stays consistent with what was just saved. This is a UX improvement (no stale state if the operator saves mid-session), but not a blocking correctness issue since the next login will always get fresh `print_agent` data.
Recommendation: add `await getProfile(); setRestaurant(fresh.restaurant);` after successful save (same pattern as BUG-337 fix in `RestaurantSettingsPage.jsx`).

---

## 4. station-printer-map API Behaviour Confirmed

| Account | Areas available | default_users | Current mappings (for default employee) |
|---------|----------------|--------------|----------------------------------------|
| cafe103 | BAR, Bill, KDS | 1 (Counter/3081) | Bill→3081, KDS→3081 (BAR unmapped) |
| cafeclub | BAR, Bill, KDS | **0** ← BLOCKER | [] (empty — no mappings possible) |
| ruby | BAR, Bill, CD, KDS | 3 (Owner/Saurav/p) | Bill→3418, KDS→3418, BAR→3418 |

**cafeclub BLOCKER:** `default_users` is empty (nobody has `default_user_v2=Yes`). The station-printer-map UI cannot function for cafeclub because POST would 422 on any `default_employee_id`. This is a data setup issue, not a frontend bug.

---

## 5. Area Name Case Mismatch — New Finding

| Source | BAR | BILL | KDS |
|--------|-----|------|-----|
| `print_agent` in profile (ruby) | `BAR` | `BILL` (uppercase) | `KDS` |
| `/station-printer-map` areas list (ruby) | `BAR` | `Bill` (title case) | `KDS` |
| `/printer-mapping` printers (ruby) | `BAR` | `Bill` (title case) | `KDS` |

**Finding:** The area name for Bill/BILL has inconsistent casing between the two endpoints:
- `print_agent` in profile returns `"BILL"` (uppercase, from `area_name` on the printer record created historically)
- `/station-printer-map` returns `"Bill"` (title case, from the same printer records)
- `printerAgentSelector.js` uses case-insensitive matching (`matchStation`) which handles this correctly at runtime
- BUT: the station-printer-map UI's save uses `area_name` verbatim from the `areas[]` array, which will save `"Bill"` — and the profile will subsequently return `"Bill"` in `print_agent`. The selector still works (case-insensitive). **Not a blocker**, but worth noting.

---

## 6. Impact on CR-359 Implementation Plan

All ODs are now answered. Gate 3 (Implementation Plan) can proceed immediately.

**Updated scope for CR-359:**

| File | Change | Notes |
|------|--------|-------|
| `constants.js` | Add `STATION_PRINTER_MAP` constant | 1 line |
| `printerMappingService.js` | Add `getStationMap(vendorEmployeeId?)` + `saveStationMap(payload)` | New functions using new constant |
| `StationMappingTab.jsx` | Full logic rewrite: GET with `?vendor_employee_id` on load + employee switch; `areas[]` for area dropdown; `default_users[]` for default-user dropdown; `data.mappings` seeds rows; `handleSave` uses correct payload shape; add profile re-fetch after save (OD-2) | ~80-100 lines changed |

**Files confirmed NOT to touch:** `printerMappingTransform.js`, `printerAgentSelector.js`, `profileTransform.js`, `orderService.js`, `RestaurantContext.jsx`, `PrinterMappingTab.jsx`, `PrinterAgentConfigView.jsx`

---

*Probe complete: 2026-09-02 | All ODs answered | GAP-6 RESOLVED | OD-2 answered | Ready for Gate 3*
