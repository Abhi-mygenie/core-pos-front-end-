# INVESTIGATION REPORT — Two Issues: Dashboard Download + Sales Payment Method Labels

**Date:** 2026-10-05
**Role:** INVESTIGATION (AGENT_PROMPT_ALPHA v0.7 §ROLE 6)
**URL under test:** https://pos-uat.mygenie.online/reports-module/dashboard (download) and /reports-module/sales (Excel export)
**Method:** Static code trace + curl probes. NO code changes.

---

## Probe 1: get-single-order-new room_discount_* fields (prior session item)

```
POST /api/v2/vendoremployee/get-single-order-new  {"order_id": 1232912}
```

**Result:** ✅ Backend NOW returns all new fields in room_info:
- `room_discount_amount: 250.00`
- `room_discount_type: Amount`
- `room_discount_reason: Test probe`
- `room_discount_at: both`
- `room_discount_detail: {check_in:{...}, check_out:{...}}`
- `orders[].room_discount: {apply_to: "room"}`

**Prior session note RESOLVED** — get-single-order-new is now in parity with the list endpoint. The FE read-back key mismatch (line 414–415 in orderTransform.js: `discount_amount` vs `room_discount_amount`) is now the only remaining gap.

---

## Issue 1: Download buttons on Insights Dashboard do nothing

### File
`/app/frontend/src/pages/reports-module/DashboardMockup.jsx`

### Root cause: FE bug — onClick never wired

The PDF and Excel buttons (lines 292–309) are stub UI only:

```jsx
<button
  disabled={isLoading}
  data-testid="reports-export-pdf-btn"
>
  <FileText className="w-4 h-4 text-red-500" /> PDF
</button>
<button
  disabled={isLoading}
  data-testid="reports-export-excel-btn"
>
  <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel
</button>
```

Neither button has an `onClick`. The export utility functions exist and are used by SalesMockup but are NOT imported into DashboardMockup:

| File | Import | onClick wired? |
|------|--------|----------------|
| `SalesMockup.jsx` | `import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter'` | ✅ YES — `handleDownloadAction` |
| `DashboardMockup.jsx` | ❌ NOT imported | ❌ NO onClick |

`reportExporter.js` exports:
- `openReportWindow()` — opens a blank PDF window
- `exportReportAsPDF(win, params)` — renders PDF
- `exportReportAsExcel(params, filename)` — generates XLSX

**What needs to be done:**
1. Import `exportReportAsExcel`, `exportReportAsPDF`, `openReportWindow` from `reportExporter`
2. Build a `buildExportPayload()` function for the dashboard data shape (similar to SalesMockup lines 204–279)
3. Wire `onClick` to both buttons — either a download menu (like SalesMockup) or direct click actions
4. The dashboard's `data` object comes from `transformDashboardResponse(apiData)` which has `sales`, `channels`, `payments`, `topItems`, `cancellations`, `discounts`, `customers`, `audits`

**Risk:** MEDIUM — new feature, no financial mutation, display only

---

## Issue 2: Payment methods in Sales Excel show "Other" instead of specific labels (e.g. Dine-In, District)

### URL: /reports-module/sales → Excel download → "By Payment Method" tab

### Root cause: BACKEND — API groups TAB/credit payments as "Other"

**Live probe against preprod:**
```
POST /api/v2/vendoremployee/report/insights-sales
{"from_date": "2026-10-05", "to_date": "2026-10-05"}
```
Response `payments[]`:
```json
[
  {"method": "Cash",    "orders": 22, "revenue": 4055},
  {"method": "Other",   "orders": 1,  "revenue": 260},
  {"method": "Partial", "orders": 1,  "revenue": 0}
]
```

Same from `insights-dashboard` endpoint — `payment_mix[]` also returns `method: "Other"`.

**FE data path (no transform):**
```javascript
// SalesMockup.jsx line 186
const payments = (salesData.payments || []).map(p => ({
  method: p.method,   // ← raw API value, no label mapping
  revenue: p.revenue || 0,
  orders: p.orders || 0
}));
```

The FE passes `p.method` directly to the Excel row — no label lookup, no expand.

**What "Other" contains (user's report):** TAB/credit settlements via specific channels like "Dine-In" (cashier settled a TAB bill at the table) and "District" (an aggregator / third-party payment). These are internally bucketed as `payment_method = "other"` or `payment_method = "tab"` (which maps to "Other" group) by the backend.

**`tab_settlements` array** — exists in the API response but was empty for this restaurant. On the UAT restaurant with District/Dine-In TAB orders, this field may contain the breakdown.

### Classification

| Root | Owner |
|------|-------|
| Backend returns `method: "Other"` without sub-breakdown | **BACKEND** |
| FE has no label expansion from `tab_settlements` | **FE GAP** (but depends on backend providing the data) |
| No label mapping in `paymentMethods.js` for the "Other" bucket | **FE GAP** (secondary) |

### Backend ask
Break down the `Other` bucket in `payments[]` by actual sub-method. The backend already tracks TAB by channel (e.g. `Dine-In TAB`, `District TAB`). Alternatively, populate `tab_settlements[]` with the per-channel breakdown so FE can merge it.

### FE note
`paymentMethods.js` has `OTHER: 'other'` mapping but no display labels for sub-types. A secondary FE fix would be to expand the "Other" bucket using the `tab_settlements` sub-array when available — but this requires the backend to supply the data first.

---

## Summary

| # | Issue | Root | File | Classification |
|---|-------|------|------|----------------|
| 1 | Dashboard PDF/Excel buttons do nothing | FE stub — onClick never wired | `DashboardMockup.jsx:292–309` | BUG (FE) — MEDIUM |
| 2 | "Other" in payment method download instead of "Dine-In"/"District" | Backend groups TAB into "Other" bucket | `insights-sales` API + `SalesMockup.jsx:186` | BACKEND + FE GAP |

**Files for planning (Issue 1):** `DashboardMockup.jsx` only
**Backend brief needed (Issue 2):** `insights-sales` / `insights-dashboard` payment_mix breakdown
