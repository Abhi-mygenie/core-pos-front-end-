# BUG-288 — Implementation Plan (Gate 3, REVISED)

**ID:** BUG-288
**Stage:** Implementation Plan — REVISED after curl diagnostic
**Date:** 2026-07-31
**Risk:** LOW (1 file, 2 lines, no logic change)

---

## Curl Evidence (confirmed 2026-07-31)

```bash
POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login  → token ✓
GET  https://preprod.mygenie.online/api/v2/vendoremployee/product/station-printer-list

Response:
{
  "printers": [
    { "id": 484, "area_name": "KDS" },
    { "id": 485, "area_name": "BAR" },
    { "id": 486, "area_name": "Bill" }
  ]
}
```

**Stations ARE configured in the backend. Data is present and correct.**

---

## Confirmed Root Cause

Two mismatches between API response and transform:

| API returns | Transform looks for | Result |
|-------------|---------------------|--------|
| `printers` key | `stations` / `data` / bare array | Key not found → falls through to `data` (object) → `!Array.isArray` → `[]` |
| `area_name` field | `station_name \|\| name` | Even if key fixed — field name would also fail |

**The entire KDS-only symptom is caused by these 2 wrong key/field names in `menuManagementTransform.js:stationPrinterList`.**
`MenuManagementPanel.jsx` — NO change needed. Pre-processing passes correct data to transform.

---

## Scope Lock

**Files WILL change: 1**
- `api/transforms/menuManagementTransform.js` — 2 lines

**Files WILL NOT touch:** `MenuManagementPanel.jsx`, `CategoryList.jsx`, `menuManagementService.js`, `App.js`, any other file.

---

## The Fix

**File:** `frontend/src/api/transforms/menuManagementTransform.js`
**Function:** `stationPrinterList` (~line 192)

**Current:**
```js
stationPrinterList: (data) => {
  const list = data.stations || data.data || data || [];
  if (!Array.isArray(list)) return [];
  return list.map((s) => ({
    id: s.id,
    name: s.station_name || s.name,
    printerId: s.printer_id || s.restaurant_printer_id || '',
  }));
},
```

**New:**
```js
// BUG-288: API returns { printers: [...] } with area_name field (confirmed via curl 2026-07-31)
stationPrinterList: (data) => {
  if (!data) return [];
  const list = data.printers || data.stations || data.data || data || [];
  if (!Array.isArray(list)) return [];
  return list.map((s) => ({
    id: s.id,
    name: s.area_name || s.station_name || s.name,
    printerId: s.printer_id || s.restaurant_printer_id || '',
  }));
},
```

**Changes:**
1. Line 1: `if (!data) return [];` — null guard
2. Line 2: `data.printers ||` prepended to list extraction
3. Line 6: `s.area_name ||` prepended to name extraction

---

## Verification Matrix

| Check | Command | Expected |
|-------|---------|---------|
| Fix present | `grep -c 'data.printers' menuManagementTransform.js` | 1 |
| Field fix | `grep -c 'area_name' menuManagementTransform.js` | 1 |
| Station dropdown | Open Menu Mgmt → Add/Edit Category → Station dropdown | Shows KDS, BAR, Bill |
| Regression: menu items | Food items still load | Items visible |
| Regression: categories | Category list loads | Categories visible |

---

## Risk Register

| # | Risk | Assessment |
|---|------|-----------|
| 1 | Other restaurants use different API key | `data.printers \|\| data.stations \|\| data.data` — all prior shapes still handled |
| 2 | `area_name` missing for some records | `s.area_name \|\| s.station_name \|\| s.name` — graceful fallback |

---

```
Plan revised: BUG-288
Curl test performed: ✅ API confirmed returning { printers: [...], area_name }
Root cause: CONFIRMED (not hypothetical)
Scope: 1 file, 2 lines (menuManagementTransform.js)
All if/but conditions: ELIMINATED
Next: Gate 4 GO → Implementation
```
