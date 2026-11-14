# BUG-663 — Impact Analysis (Gate 2)

**Item:** BUG-663 — New Category station_name Null Despite UI Showing KDS — Items Route to "Others"
**Priority:** P1 | **Risk:** MEDIUM (KOT routing, no money)
**Code Reality:** FULL — buggy code exists; fix is a key name correction
**Conflict Pre-Check:** CLEAN — no other open item touches `menuManagementTransform.js` `stationPrinterList` function.
**Date:** 2026-11-09

---

## 1. Data Flow Trace

```
API: GET /api/v2/vendoremployee/product/station-printer-list
  → Response: { printers: [{ id: 1801, area_name: "KDS" }, { id: 1803, area_name: "Bill" }, ...] }
  → Key field is "id" (not "printer_id", not "restaurant_printer_id")

menuManagementTransform.js L206-214 (stationPrinterList):
  L210-213: return list.map(s => ({
    id: s.id,                                          ← ✅ correct (1801)
    name: s.area_name || s.station_name || s.name,     ← ✅ correct ("KDS")
    printerId: s.printer_id || s.restaurant_printer_id || '',  ← ★ BREAK POINT: both undefined → ''
  }))
  → stationOptions = [{ id: 1801, name: "KDS", printerId: '' }, ...]

CategoryList.jsx L65 (handleAdd):
  printerId: stationOptions.find(s => s.name === formStation)?.printerId || ''
  → printerId = '' (finds the entry, but its printerId is '')

menuManagementService.js L171-183 (addCategory):
  formData.append('restaurant_printer_id', String(printerId))
  → Sends: station_name='KDS', restaurant_printer_id=''

Backend:
  → Receives empty printer ID → stores station_name=null, restaurant_printer_id=null
  → Rule (PROVEN by probe): backend persists station ONLY through a valid restaurant_printer_id;
    station_name alone is ignored.

menuManagementTransform.js L194 (categoryList):
  stationName: c.station_name || 'KDS'
  → Null station displays as "KDS" — MASKS THE BUG

KOT Routing:
  → Category without station → items route to "Others"
```

### Edit Path (also broken)

```
CategoryList.jsx L91 (handleSaveEdit):
  printerId: stationOptions.find(s => s.name === formStation)?.printerId || ''
  → Same bug: printerId = ''

menuManagementService.js L186-195 (editCategory):
  restaurant_printer_id: data.printerId || 0
  → Sends: restaurant_printer_id=0

Backend:
  → 0 is not a valid printer ID, BUT:
    - Does NOT wipe an existing valid station (backend keeps it) ← PROVEN by Probe B
    - Does NOT repair a null station ← PROVEN by Probe A (only valid ID repairs)
  → Editing existing categories is a no-op on station assignment
```

---

## 2. Root Cause

**Single line:** `menuManagementTransform.js` L213

```js
printerId: s.printer_id || s.restaurant_printer_id || '',
```

The API response contains `s.id` (e.g. `1801`), NOT `s.printer_id` or `s.restaurant_printer_id`. Both are `undefined` → `printerId` falls through to `''`.

**Should be:**
```js
printerId: s.id || s.printer_id || s.restaurant_printer_id || '',
```

Note: `s.id` is already mapped at L211 (`id: s.id`) but is NOT used in the `printerId` field at L213.

**Origin:** BUG-297 (sprint pos_5_1) added the printer dropdown to CategoryList and wrote the `stationPrinterList` transform. The BUG-288 comment at L204 correctly notes the API shape (`{id, area_name}`), but the `printerId` mapping reads wrong keys.

---

## 3. Affected Files & Lines

| # | File | Lines | What's Wrong | Risk |
|---|------|-------|-------------|------|
| **A1** | `menuManagementTransform.js` | L213 | `printerId: s.printer_id \|\| s.restaurant_printer_id \|\| ''` — reads wrong keys | NOT hotspot |

### Optional Secondary Fix

| # | File | Lines | What | Risk |
|---|------|-------|------|------|
| **A2** | `menuManagementTransform.js` | L194 | `stationName: c.station_name \|\| 'KDS'` — masks null station as "KDS" | NOT hotspot |

### Files NOT Touched (scope lock)

- `CategoryList.jsx` — calls `stationOptions.find(s => s.name === formStation)?.printerId` which will now return the correct value once the transform is fixed.
- `menuManagementService.js` — sends whatever `printerId` it receives; no fix needed.
- `MenuManagementPanel.jsx` — parent component, no station logic.
- `BulkEditor.jsx` — uses category data but doesn't create/edit categories.
- `productTransform.js` — item-level station mapping (CR-449), separate concern.

---

## 4. Downstream Consumers

The `stationPrinterList` transform output is consumed by:
1. **CategoryList.jsx** `handleAdd` (L65) — broken → sends empty printerId
2. **CategoryList.jsx** `handleSaveEdit` (L91) — broken → sends empty/0 printerId
3. **BulkEditor.jsx** (if it uses station options for item-level mapping) — potentially affected for CR-449 item-station feature
4. **MenuManagementPanel.jsx** — displays station options in dropdown (display-only, not affected functionally)

Once the transform is fixed, all consumers automatically get correct `printerId` values.

---

## 5. Data Repair

7 of 90 categories on ruby (preprod) have `station_name: null, restaurant_printer_id: null`. After the code fix deploys:

**Repair method:** Open each affected category in Menu Management → Edit → select correct station from dropdown → Save. The fixed transform will now send the correct `restaurant_printer_id`, and the backend will persist the station.

Categories to repair (ruby RID 672):
- ID 11065 ("thali A") — created 2026-11-09 (investigation probe, confirmed null)
- 6 additional categories (IDs not enumerated — identifiable via `station_name: null` in API response)

**OD-663-02:** Should we build a one-time repair script, or manual edit is sufficient?

---

## 6. Owner Decisions — ALL LOCKED 2026-11-09

| OD | Question | Decision | Date |
|----|----------|----------|------|
| **OD-663-01** | Remove display fallback `c.station_name \|\| 'KDS'` at L194? | **(b) No — keep fallback.** Default mapping to KDS is by design. Broken categories are already known from investigation; fallback is safe and dormant once 7 categories are repaired. | 2026-11-09 |
| **OD-663-02** | Data repair method for 7 null-station categories | **(a) Manual re-save** in UI after fix deploys. Only 7 categories — no script needed. | 2026-11-09 |
| **OD-663-03** | Planning skip — Fast Lane eligible? | **(a) FAST LANE APPROVED.** 1 file, 1 line, not hotspot, not financial. Skip Gate 3, direct bug fix. | 2026-11-09 |

---

## 7. Risk Register

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | Changing `printerId` source breaks existing working categories | LOW — existing categories already have `restaurant_printer_id` stored in DB; the transform's `printerId` is only used when ADD/EDIT is called | Probe D confirmed: sending correct ID to backend works |
| R2 | `s.id` could be 0 or null for some printers | LOW — station-printer-list always returns printers with numeric `id` (confirmed via live data: 1801, 1803, 1831, 1910) | Fallback chain `s.id \|\| s.printer_id \|\| ...` handles edge cases |
| R3 | Removing `\|\| 'KDS'` display fallback shows ugly null to user | LOW/cosmetic — only 7 categories affected, and only until repaired | Replace with `c.station_name \|\| '—'` (clearly "not set" vs misleading "KDS") |

---

## 8. Verification Matrix (seeds QA)

| # | Check | How to Verify | Automated? |
|---|-------|---------------|:---:|
| V1 | Add new category with KDS station → `station_name: 'KDS'` and `restaurant_printer_id: 1801` in API | `GET /api/v2/vendoremployee/product/categories` after add | YES (curl) |
| V2 | Edit existing null-station category → station repaired | Edit + GET categories, check station_name not null | YES (curl) |
| V3 | Edit existing working category → station preserved (no regression) | Edit + GET categories, check station unchanged | YES (curl) |
| V4 | Station dropdown shows correct options (KDS, Bill, Chaat, etc.) | Browser: open add/edit form, check dropdown | NO |
| V5 | (If OD-663-01=a) Null-station categories show "—" not "KDS" | Browser: check category list display | NO |
| V6 | webpack compiles with 0 new warnings | `yarn build` | YES |
