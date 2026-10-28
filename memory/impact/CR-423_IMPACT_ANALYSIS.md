# CR-423 — Impact Analysis (Gate 2)

**ID:** CR-423
**Date:** 2026-10-22
**Code Reality:** PARTIAL — 34/40 pages have working exports, 6 need fixes
**Risk:** MEDIUM
**Conflict Pre-Check:** CLEAN
**Investigation:** `investigations/CR-423_INVESTIGATION_REPORT_2026_10_17.md`

---

## 1. Summary

Investigation identified 6 report pages with missing/broken Excel+PDF downloads. All use the standard `reportExporter.js` pattern except where noted.

## 2. Pages Requiring Fixes

| # | Page | Current State | Fix Needed | Priority |
|---|------|--------------|------------|:---:|
| 1 | `CancellationsMockup.jsx` | Download button present, `enabled: false` (L152-153) | Implement `buildExportPayload()` + set `enabled: true` | P1 |
| 2 | `RoomOrdersMockup.jsx` | Has `reportExporter` import + UI, but `buildExportPayload` missing → handler calls undefined | Add `buildExportPayload()` function | P1 |
| 3 | `PLReportPage.jsx` | PDF only — no Excel download | Add Excel export option | P2 |
| 4 | `OrderReportBetaPage.jsx` | Excel only (CR-117) — no PDF | Add PDF export option | P2 |
| 5 | `FoodCourtMockup.jsx` | Inline export logic, no standard `buildExportPayload` | Standardize to `reportExporter` pattern | P2 |
| 6 | `FoodCourtBetaPage.jsx` | Same as FoodCourtMockup | Standardize to `reportExporter` pattern | P2 |

## 3. Standard Export Pattern (reference)

All working pages follow:
```js
import { exportReportAsExcel, exportReportAsPDF } from '../../utils/reportExporter';
const buildExportPayload = () => ({ title, headers, rows, summary });
const handleDownloadAction = (action) => { /* excel/pdf/email/whatsapp/sms */ };
```

## 4. Files Affected

| File | Change |
|------|--------|
| `CancellationsMockup.jsx` | Add `buildExportPayload`, enable download buttons |
| `RoomOrdersMockup.jsx` | Add `buildExportPayload` |
| `PLReportPage.jsx` | Add Excel export |
| `OrderReportBetaPage.jsx` | Add PDF export |
| `FoodCourtMockup.jsx` | Standardize export |
| `FoodCourtBetaPage.jsx` | Standardize export |

**Files WILL NOT touch:** All 34 working report pages, `reportExporter.js` utility itself.

## 5. Scope Lock

6 report page files. No shared utility changes. Each page fix is independent.
