# BUG-663 — New Category station_name Null Despite UI Showing KDS — Items Route to "Others"

**Type:** BUG
**Priority:** P1
**Risk:** MEDIUM (KOT routing broken for new categories, no money impact)
**Sprint:** nov_cr_batch
**Date:** 2026-11-09
**Source:** INVESTIGATION — `investigations/INV_2026_11_09_PREPAID_SC_AND_CATEGORY_STATION.md` Issue 2
**Duplicate Check:** RELATED to BUG-297 (GATE_5B_QA_PASS, sprint pos_5_1). BUG-297 added the printer dropdown to CategoryList but the underlying data transform reads the wrong API key — BUG-297's fix was INCOMPLETE. This is a new registration for the transform-level root cause.
**Code Reality:** FULL — buggy code exists at `menuManagementTransform.js` L213.

---

## Description

When creating a new category in Menu Management and selecting a KDS station, the category is saved with `station_name: null` and `restaurant_printer_id: null`. KOT tickets for items in that category are routed to "Others" instead of the correct station.

The UI masks this bug by displaying "KDS" as a fallback for null values (`c.station_name || 'KDS'` at L194), making the bug invisible to the user until they notice KOT tickets going to the wrong station.

## Root Cause

The `station-printer-list` API returns printers with field **`id`** (e.g. `{"id": 1801, "area_name": "KDS"}`).

`menuManagementTransform.js` L206-214 (`stationPrinterList`) reads:
```js
printerId: s.printer_id || s.restaurant_printer_id || ''
```

**Neither `s.printer_id` nor `s.restaurant_printer_id` exists in the API response** — the correct field is `s.id`. So `printerId` is always `''`.

When adding a category:
- `CategoryList.jsx` L65: `printerId = stationOptions.find(name).printerId` → `''`
- `menuManagementService.js` L171-183: `addCategory` sends `station_name='KDS', restaurant_printer_id=''`
- Backend receives empty printer ID → stores `station_name=null, restaurant_printer_id=null`

**Backend rule (PROVEN by probe):** Backend persists the station only through a valid `restaurant_printer_id`; `station_name` alone is ignored.

**Edit path:** Editing with `restaurant_printer_id: 0` does NOT wipe an existing station (backend keeps it) and does NOT repair a null one. Editing with the correct id (1801) DOES repair.

**Display masking:** `menuManagementTransform.js` L194 `stationName: c.station_name || 'KDS'` shows "KDS" for null — hides the bug from users.

## Evidence

- **Station printer list:** `evidence/INV-SC-STATION/station_printer_list.json` — `[{id:1801, area_name:"KDS"}, ...]`
- **Live data (ruby, preprod):** 7 of 90 categories have null station. New category "thali A" (id 11065, created 2026-11-09) = `station_name:null, restaurant_printer_id:null`.
- **Controlled probes:**

| Probe | Request | Result |
|-------|---------|--------|
| C add (FE-style) | `station_name=KDS, restaurant_printer_id=''` | `station_name:null, restaurant_printer_id:null` ❌ |
| D add (correct) | `station_name=KDS, restaurant_printer_id=1801` | `station_name:"KDS", restaurant_printer_id:1801` ✅ |
| B edit (FE-style) | existing KDS/1801 edited with `restaurant_printer_id:0` | stays KDS/1801 (no wipe) |
| A edit (repair) | null-station category with `restaurant_printer_id:1801` | becomes KDS/1801 (repaired) ✅ |

- Probe categories 11066-11069 deleted and verified absent. "thali A" (11065) left for repair after fix.
- Full evidence at `evidence/INV-SC-STATION/`

## Blast Radius

- ~5 files reference `stationPrinterList` / `restaurant_printer_id`
- **Files WILL change:** `menuManagementTransform.js` (1 line L213: `s.id`)
- **Files MAY change:** `menuManagementTransform.js` L194 (optional: remove `|| 'KDS'` fallback to expose null as "Not set")
- **Hotspot files:** NO — `menuManagementTransform.js` is not an R5 hotspot
- **Estimated scope:** SMALL (1 file, 1-2 lines)
- **Data repair needed:** Re-save 7 null categories (including "thali A") after fix deploys

## Fix Direction (for Planning)

1. **Core fix:** `stationPrinterList` L213: `printerId: s.id` (1 line)
2. **Optional display fix:** L194: remove `|| 'KDS'` fallback so null shows as "Not set" — surfaces broken categories to user
3. **Data repair:** After fix, re-save the 7 null categories with correct printer IDs (manual or script)

## Open Questions

None — investigation fully traced and confirmed. Ready for Gate 2.

## Retroactive Candidate

BUG-297 — introduced printerId plumbing with wrong source key (`s.printer_id || s.restaurant_printer_id` instead of `s.id`).
