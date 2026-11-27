# CR-423 — Investigation Report
## "Insights Dashboard — investigate and fix all pages missing Excel/PDF download"

**Date:** 2026-10-17
**Role:** INVESTIGATION
**Steps used:** 5/10
**Confidence:** HIGH

---

## 1. Summary

Complete audit of all 47 report pages. **Standard export pattern** (`reportExporter.js` + `buildExportPayload()`) is implemented in **34 pages**. The remaining pages fall into 4 categories.

---

## 2. Export Architecture

All new-style reports use:
```js
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
const buildExportPayload = () => { ... };
const handleDownloadAction = (action) => { ... };
```
This gives a consistent Download button with Excel + PDF options.

---

## 3. Full Page Audit

### ✅ CATEGORY A — Export WORKING (34 pages)

Standard `reportExporter` + `buildExportPayload` + download button wired:

`AuditLogMockup`, `CancelDetailMockup`, `CashierSettlementMockup`, `ChannelPivotMockup`, `CouponUsageMockup`, `CustomersMixMockup`, `CustomersRfmMockup`, `DailySalesMockup`, `DashboardMockup` *(BUG-485 added)*, `DayOfWeekMockup`, `DeliveryChargeMockup`, `DiscountReportMockup`, `ExpenseReportPage`, `GatewayReconMockup`, `HourlySalesMockup`, `ItemSalesHybridMockup`, `ItemSalesLedgerMockup`, `KotVarianceMockup`, `OrderLedgerMockup`, `OrderNotesMockup`, `PaymentsMockup`, `PrepServeTimeMockup`, `PurchaseReportPage`, `RoomTransfersMockup`, `SalesMockup`, `SettlementReportMockup`, `StaffCashiersMockup`, `StaffServersMockup`, `TableSalesMockup`, `TaxCalcMockup`, `TaxDetailMockup`, `TaxSlabsMockup`, `TipReportMockup`, `VariationAddonMockup`

---

### ⚠️ CATEGORY B — Own export system (not standard pattern — different UX)

| Page | Method | Status |
|---|---|---|
| `CustomerIntelligenceBeta.jsx` | XLSX + jsPDF (BUG-191) | **Working** — own export UI |
| `ConsumptionReportPage.jsx` | CSV + jsPDF (CR-093) | **Working** — own export UI |

*These are functional but use a non-standard pattern. Out of scope for CR-423 unless owner wants unification.*

---

### ❌ CATEGORY C — Missing or disabled download (NEEDS FIX)

| Page | Issue | Priority |
|---|---|---|
| `CancellationsMockup.jsx` | Download button **UI present but explicitly `enabled: false`** (L152-153) — both Excel and PDF disabled | P1 |
| `PLReportPage.jsx` | **PDF only** — no Excel download button | P2 |
| `OrderReportBetaPage.jsx` | **Excel only** (CR-117) — no PDF download button | P2 |
| `RoomOrdersMockup.jsx` | Has `reportExporter` import + download UI but **`buildExportPayload` missing** — handler calls undefined | P1 |
| `FoodCourtMockup.jsx` | Has `reportExporter` import + inline export logic — **no `buildExportPayload`** (inline only, no payload structure) | P2 |
| `FoodCourtBetaPage.jsx` | Same as FoodCourtMockup — inline only | P2 |

---

### ➖ CATEGORY D — No export needed (structural/placeholder pages)

| Page | Reason |
|---|---|
| `RoundOffMockup.jsx` | Placeholder page — no data loaded |
| `GuestVsRegisteredBeta.jsx` | Beta/WIP page |
| `EdgeStatesMockup.jsx` | Dev/QA testing page — not user-facing |
| `ItemDrillSheet.jsx` | Sub-view drill-down sheet — no standalone export |
| `ReportDefinitionsMockup.jsx` | Meta/doc page |

---

## 4. Recommended Scope for CR-423

**Priority 1 (blocking — download button present but broken/disabled):**
1. `CancellationsMockup.jsx` — enable both Excel + PDF (implement `buildExportPayload` + change `enabled: false → true`)
2. `RoomOrdersMockup.jsx` — add `buildExportPayload` function

**Priority 2 (missing one format):**
3. `PLReportPage.jsx` — add Excel export
4. `OrderReportBetaPage.jsx` — add PDF export (Excel already works via CR-117)
5. `FoodCourtMockup.jsx` / `FoodCourtBetaPage.jsx` — standardize to `buildExportPayload` pattern

**Total scope:** 6 files, MEDIUM blast radius, no hotspot files, no financial logic.

---

## 5. Recommendations

- **Classification:** FE_FIX (multiple pages missing export implementation)
- **Planning skip:** NO — 6 files, needs full Gate 2–3
- **Risk:** LOW–MEDIUM
- **Registry action:** CR-423 → `GATE_1_INTAKE_COMPLETE` (investigation done, ready for Planning)
- **Sprint:** oct_cr_batch
