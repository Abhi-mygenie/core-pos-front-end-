# QA Handover — BUG-288 — Menu Management Station Dropdown Only Shows KDS

**Document:** QA_HANDOVER_BUG288_2026_07_31.md
**Implementation Agent Date:** 2026-07-31
**QA Agent:** Pending

---

## 1. Registry Sync Confirmation

```
Registry synced: YES
Item: BUG-288
Status: IMPLEMENTED
Gate: 5a
Sprint: pos_5_0
Curl Evidence: GET /api/v2/vendoremployee/product/station-printer-list → { printers: [{id:484, area_name:"KDS"}, {id:485, area_name:"BAR"}, {id:486, area_name:"Bill"}] }
EXIT GATE checks:
  ✅ registry.json — BUG-288 IMPLEMENTED, gate 5a
  ✅ Code markers — // BUG-288 at menuManagementTransform.js L191
  ✅ Compile — webpack compiled with 1 warning (pre-existing, 0 new)
```

---

## 2. File Changed

| File | Lines | Change |
|------|-------|--------|
| `api/transforms/menuManagementTransform.js` | L191-202 | `stationPrinterList()`: added null guard, `data.printers \|\|` to list extraction, `s.area_name \|\|` to name extraction |

**Root Cause (confirmed via curl):** Transform looked for `data.stations` but API returns `data.printers`. Transform looked for `s.station_name` but API returns `s.area_name`. Both wrong keys caused empty list → CategoryList showed only hardcoded "KDS" fallback.

---

## 3. Verification Matrix — Code Checks (QA must confirm)

| Check | Command | Expected |
|-------|---------|---------|
| C1 | `grep -c 'data.printers' /app/frontend/src/api/transforms/menuManagementTransform.js` | 1 |
| C2 | `grep -c 'area_name' /app/frontend/src/api/transforms/menuManagementTransform.js` | 1 |
| C3 | `grep -c 'BUG-288' /app/frontend/src/api/transforms/menuManagementTransform.js` | ≥1 |

---

## 4. Test Cases

| TC# | Description | Steps | Expected |
|-----|-------------|-------|---------|
| TC-1 | Station dropdown shows all stations | Navigate to Menu Management → Categories tab → click Edit or Add on any category → open Station dropdown | Dropdown shows: KDS, BAR, Bill (or all configured stations — not just KDS) |
| TC-2 | Station dropdown shows ≥2 options | Same as TC-1 | At least 2 options visible (KDS + at least 1 other) |
| TC-3 | Selection saves correctly | Select a non-KDS station (e.g. BAR) → save category | Category saves with BAR station; no error toast |

---

## 5. Regression Tests

| R# | What | Why |
|----|------|-----|
| R1 | Menu items still load | Fix is in `stationPrinterList` transform only — no other transform function touched |
| R2 | Categories still load | Same — only the station dropdown data source fixed |
| R3 | Other restaurants (different API shape) | Fallback chain: `data.printers \|\| data.stations \|\| data.data \|\| data` covers all prior shapes |

---

## 6. Credentials + Environment

| Field | Value |
|---|---|
| Login | `owner@18march.com` / `Qplazm@10` |
| URL | From `REACT_APP_BACKEND_URL` in `/app/frontend/.env` |
| Route | Settings → Menu Management → Categories tab → Edit any category → Station dropdown |
| Notes | The backend at `preprod.mygenie.online` must have stations configured (confirmed: KDS:484, BAR:485, Bill:486). TC-1 is the primary browser verification. |
