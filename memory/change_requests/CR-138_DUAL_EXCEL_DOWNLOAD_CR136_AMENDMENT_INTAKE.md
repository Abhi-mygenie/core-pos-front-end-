# CR-138 — Dual Excel Download: Add Backend Excel Endpoint to CR-136 Screens
**ID:** CR-138
**Type:** CR (Feature — amendment to CR-136)
**Priority:** P2 — MEDIUM
**Risk:** LOW
**Status:** INTAKE — Gate 0→1
**Sprint:** pos_5_1
**Registered:** 2026-08-12
**Source:** OWNER-REQUESTED (post-investigation decision)
**Related:** CR-136 (IMPLEMENTED, same screens), CR-117 (same backend-Excel pattern)

---

## Description

CR-136 (`/reports-module/item-sales` + `/reports-module/variation-addon-sales`) currently uses FE-side SpreadsheetML Excel generation for both screens. An investigation (INV-CR136-EXCEL_2026_08_12) confirmed that the backend has a live endpoint:

```
POST /api/v1/vendoremployee/top-food-variation-sales-report-download
```

This endpoint returns `{ download_url }` pointing to a pre-generated `.xlsx` file containing **3 sheets** — Food Sales, Variation Sales, Addon Sales — in a single file. It has richer fields than the FE Excel (Addon ID, Food ID, Variation Group, VAT, Service Charge).

**Owner decision (2026-08-12):** Keep BOTH — add a second "Server Excel" download option alongside the existing FE Excel button on both screens. Neither replaces the other.

---

## Owner Decision Record

| Decision | Owner Answer |
|---|---|
| OD-1: Use backend endpoint despite static filename concurrency risk on preprod? | **YES — proceed. Fix static filename before production.** |
| OD-2: Keep By-Category + By-Station breakdown tabs in FE Excel? | **YES — keep FE Excel as-is** |
| OD-3: Keep column-chooser compliance in FE Excel? | **YES — keep FE Excel as-is** |
| Scope: Replace or keep both? | **KEEP BOTH — dual download buttons** |

---

## What Changes

### Both screens get a second download option:

**Current:** `[ Download ▾ ]` → { Excel (.xlsx) | PDF }

**After:** `[ Download ▾ ]` → { Excel (.xlsx) — FE | Server Excel (.xlsx) — Backend | PDF }

Or alternatively a dedicated `[ Server Excel ]` button. Implementation agent to decide cleanest UX.

---

## Backend Endpoint (confirmed via investigation)

```
Method:  POST
URL:     https://preprod.mygenie.online/api/v1/vendoremployee/top-food-variation-sales-report-download
Headers: Content-Type: application/json; charset=UTF-8
         X-localization: en
         Authorization: Bearer <token>
Body:    { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }

Response (HTTP 200):
{
  "status": true,
  "message": "Template generated successfully.",
  "download_url": "https://preprod.mygenie.online/storage/top_food_variation_sales_report.xlsx"
}
```

**File:** `.xlsx`, ~9KB for 1 day, 3 sheets.

### Backend Excel Sheet Structure:
| Sheet | Columns |
|---|---|
| Food Sales | Sn, Food Item, Station, Category, Qty, Item Price, Variation Price, Addon Price, GST, VAT, Service Charge, Discount, Total Sales |
| Variation Sales | Sn, Food Item, Category, Group, Label, Option Price, Qty, Total Amount |
| Addon Sales | Sn, Addon ID, Addon Name, Addon Price, Food ID, Food Item, Category, Qty, Total Amount |

---

## Code Reality Check

```bash
grep -rn "top-food-variation\|top_food_variation\|download_url" \
  /app/frontend/src/api/services/topFoodSalesService.js \
  /app/frontend/src/pages/reports-module/ItemSalesLedgerMockup.jsx \
  /app/frontend/src/pages/reports-module/VariationAddonMockup.jsx
# Result: 0 matches
```

**Code Reality: NONE** — backend Excel wiring does not exist in any of the 3 target files.

---

## Duplicate Check

| Item | Relationship | Verdict |
|---|---|---|
| CR-136 | Same screens | **RELATED** — CR-138 is an amendment to CR-136. CR-136 is QA PASS, not re-opened. |
| CR-117 | Same backend-Excel download pattern (`download_url` response) | **RELATED** — pattern to mirror |
| INV-CR136-EXCEL_2026_08_12 | Investigation that confirmed this endpoint | Source evidence |

**Duplicate check: DISTINCT** (related: CR-136, CR-117)

---

## Scope

### Files WILL change (4 files):

| # | File | Change | Lines |
|---|---|---|---|
| 1 | `src/api/constants.js` | +1 constant: `TOP_FOOD_VARIATION_DOWNLOAD` | ~+1 |
| 2 | `src/api/services/topFoodSalesService.js` | +1 function: `downloadTopFoodVariationReport(from, to)` | ~+12 |
| 3 | `src/pages/reports-module/ItemSalesLedgerMockup.jsx` | +Server Excel button in download menu + handler call | ~+10 |
| 4 | `src/pages/reports-module/VariationAddonMockup.jsx` | +Server Excel button in download menu + handler call | ~+10 |

**Total: ~33 lines. No hotspot files (R5). No financial logic (R6).**

### Pattern to mirror (CR-117):
```javascript
// topFoodSalesService.js — new function
export const downloadTopFoodVariationReport = async (fromDate, toDate) => {
  const response = await api.post(
    API_ENDPOINTS.TOP_FOOD_VARIATION_DOWNLOAD,
    { from: fromDate, to: toDate }
  );
  const url = response.data?.download_url;
  if (url) {
    window.open(url, '_blank');
    return { success: true, url };
  }
  throw new Error('No download_url returned');
};
```

---

## Risk Classification

| Field | Value |
|---|---|
| **Risk** | **LOW** |
| Trigger | Additive feature — new button + new service function. No existing logic modified. |
| Hotspot files touched | NO — `constants.js`, `topFoodSalesService.js`, two report pages. None in R5 list. |
| Financial logic (R6) | NO — download only, no order/payment/tax logic |
| Fast Lane eligible | **NO** — 4 files (Fast Lane requires 1 file only) |
| Process required | Full gate cycle (lightweight — Gate 2+3 can be combined, small scope) |

---

## ⚠ Known Risk — Static Filename (Backend)

The backend stores the file at a **fixed static path** shared across all restaurants:
```
/storage/top_food_variation_sales_report.xlsx
```

**Risk:** Two users from different restaurants downloading simultaneously will get each other's data.

**Owner decision:** Accepted for preprod. **Must be flagged to backend team before production release.**

Backend ask: Change to `top_food_variation_sales_{rid}_{timestamp}.xlsx` (unique per request).

---

## Severity Justification

**P2 — MEDIUM:** Enhancement to an already-working feature. FE Excel continues to work. No user is blocked. Richer export format is useful but not critical. Quick win given the small scope.

---

## Evidence

- **Investigation report:** `/app/memory/investigation/INV-CR136-EXCEL_2026_08_12.md`
- **Endpoint probe:** `/app/memory/evidence/CR-136-INV/endpoint_evidence.json`
- **Downloaded Excel file:** `/app/memory/evidence/CR-136-INV/top_food_variation_report.xlsx`
- **Response headers:** `/app/memory/evidence/CR-136-INV/headers.txt`
- **Source:** OWNER-REQUESTED (decision given 2026-08-12 after investigation presented)
- **Confidence:** CONFIRMED — endpoint live-probed, file inspected, owner decision recorded

---

## Blast Radius

```bash
grep -rn "top-food-variation\|topFoodSales\|ItemSalesLedger\|VariationAddon" \
  /app/frontend/src/ --include="*.js" --include="*.jsx" | wc -l
# Approx 15 references
```

- **Blast radius:** ~4 files, ~33 lines
- **Hotspot files touched:** NO
- **Estimated scope:** SMALL (4 files, all non-hotspot)

---

## Open Questions (none blocking intake)

| # | Question | OD needed? |
|---|---|---|
| OQ-1 | UX: separate button "Server Excel" or third item in existing Download dropdown? | NO — implementation agent to decide cleanest; suggested: third menu item "Server Excel (.xlsx)" |
| OQ-2 | Should the server Excel button show a loading spinner while waiting? | NO — response is ~1s, a toast on error is sufficient |
| OQ-3 | Error handling: if backend returns non-200 → fall back to FE Excel silently? | NO — show a toast error, keep FE Excel as the independent working fallback |

**Owner decisions: NONE blocking.** Scope, risk, and decision all confirmed.

---

## Next Step

Planning Gate 2 — Impact Analysis (lightweight: 4 non-hotspot files, LOW risk, Gate 2+3 can be combined).

---

**Intake complete: CR-138**
**Classification: CR · P2 · Risk: LOW**
**Duplicate check: DISTINCT (related: CR-136, CR-117)**
**Code Reality: NONE**
**Blast radius: SMALL (~4 files, ~33 lines, 0 hotspots)**
**Evidence: endpoint live-probed, .xlsx inspected, owner decision recorded**
**Next: Planning Gate 2**
