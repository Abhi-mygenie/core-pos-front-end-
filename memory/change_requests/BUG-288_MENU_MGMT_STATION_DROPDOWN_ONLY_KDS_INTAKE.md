# BUG-288 — Menu Management: Station Dropdown Only Shows "KDS"

**Intake Date:** 2026-07-31  
**Type:** BUG  
**Source:** OWNER-REPORTED  
**Sprint:** pos_5_0  

---

## 1. Symptom

In Menu Management → Category Management, the "Station" dropdown (used when creating or editing a category) shows only **one option: "KDS"**. All other kitchen stations configured for the restaurant are not appearing.

## 2. Classification

- **Type:** Bug  
- **Area:** Settings → Menu Management → Category Management  
- **Priority:** P1 — Feature broken; categories cannot be assigned to any station other than KDS  
- **Severity:** P1 — No workaround; all new categories default to KDS  
- **Risk:** MEDIUM — Touches API integration (`station-printer-list` endpoint), transform layer, and component state  
- **Fast Lane eligible:** NO (API + state involved)

## 3. Duplicate Check

- `DISTINCT` — No prior BUG or CR references station dropdown in CategoryList context  
- Related: **CR-014** (Menu Management API Migration — `CategoryList.jsx` last modified here)  
- Related: **BUG-120** (CR-014 post-delivery bugs — did not cover station loading)

## 4. Evidence

- **Screenshot:** Not provided  
- **Steps to reproduce:**  
  1. Login → Dashboard → Menu Management (panel opens)  
  2. Navigate to Categories tab  
  3. Click "Add Category" or edit an existing category  
  4. Observe "Station" dropdown — only "KDS" option visible  
- **Curl output:** Not yet captured (pending investigation)  
- **Source:** OWNER-REPORTED  
- **Confidence:** CONFIRMED (owner reproduced)

## 5. Data Flow (known)

```
getStationPrinterList()
  → GET /api/v2/vendoremployee/product/station-printer-list
  → stationsRes.data?.stations ? stationsRes.data : stationsRes.data?.data || stationsRes.data
  → fromAPI.stationPrinterList(stationsData)
    → data.stations || data.data || data || []
    → maps: { id, name (station_name||name), printerId }
  → setStations([...])
  → CategoryList receives stations prop
    → stationOptions = stations?.length > 0 ? stations : [{ id: 0, name: 'KDS' }]
    → BREAK POINT: stations appears empty → fallback triggers → only KDS shown
```

**KDS fallback line:** `CategoryList.jsx:24`  
`const stationOptions = stations?.length > 0 ? stations : [{ id: 0, name: 'KDS' }];`

## 6. Blast Radius

- **Files referencing `stations`:** 22 files, 171 lines (station concept is wide)  
- **Files directly in scope for fix:** SMALL (1–3 files)  
  - `MenuManagementPanel.jsx` — state management + fetch  
  - `menuManagementTransform.js` — `stationPrinterList` transform  
  - `CategoryList.jsx` — consumer (fallback logic)  
- **Hotspot files touched:** NO (none on R5 list)  
- **Estimated scope:** SMALL

## 7. Open Questions

- OQ-1: Does the `station-printer-list` API return data for this restaurant (RID)? Need curl probe to confirm.  
- OQ-2: Is the API response shape `{ stations: [...] }` or `{ data: [...] }` or bare array?  
- OQ-3: Is the panel fetch silently failing (try/catch swallows error)?

## 8. Owner Decisions Needed

None at intake. Investigation will surface if any.

---

*Next: Investigation Role — trace API → transform → state → component chain*
