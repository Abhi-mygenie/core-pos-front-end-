# Reports Batch — FE Fix Intake
## BATCH-REPORTS-FE-001 — Items fixable now (no backend needed)

**Date:** 2026-10-17
**Sprint:** oct_cr_batch
**Source:** Investigation report `REPORTS_BATCH_INVESTIGATION_2026_10_17.md`
**Stage:** GATE_1_INTAKE_COMPLETE — ready for Planning Gate 2

---

## Items in this batch (6)

---

### 1. BUG-354 — Order Report Status Column Shows Raw Value
**P2 / LOW / Fast Lane eligible**
`OrderReportBetaPage.jsx:47-56` `getStatusBadge` maps only `Cash/Unpaid/Cancel/Partial`.
Orders with `payment_type = TAB, prepaid, postpaid, null` show raw value or `'—'`.
**Fix:** Add 4 entries to the map. 1 file, ~4 lines. Fast Lane eligible.

---

### 2. CR-422 — Replace "Last 30 Days" with "Last Month" Preset
**P2 / LOW / Medium blast**
13 report pages have `30D` preset (rolling 30 days). Owner wants "Last Month" = calendar month (1st → last day of previous month).
**Files:** `AuditLogMockup`, `CancelDetailMockup`, `CancellationsMockup`, `DailySalesMockup`, `DashboardMockup`, `DeliveryChargeMockup`, `HourlySalesMockup`, `PrepServeTimeMockup`, `PurchaseReportPage`, `SalesMockup`, `SettlementReportMockup`, `TaxDetailMockup`, `TipReportMockup`
**Fix:** Change `30D` label to `LM`, add calendar-month handler. 13 files, ~2 lines each.

---

### 3. CR-423 — Fix Missing Export on 6 Reports
**P1 / MEDIUM**
Six report pages have broken or missing Excel/PDF download:
1. `CancellationsMockup` — buttons hardcoded `enabled: false` + missing `buildExportPayload`
2. `PLReportPage` — PDF only, add Excel
3. `OrderReportBetaPage` — Excel only, add PDF
4. `RoomOrdersMockup` — missing `buildExportPayload` (handler throws on click)
5. `FoodCourtMockup` — inline payload, standardize to `buildExportPayload`
6. `FoodCourtBetaPage` — same as FoodCourt
**Files:** 6 pages. No hotspot. No financial logic.

---

### 4. CR-138 — Migrate Variation & Addon Report to Backend Aggregation
**P2 / MEDIUM**
`VariationAddonMockup` currently uses `order-logs-report + FE aggregation` (slow, 30d chunks).
`insights-items` endpoint (already used by Item Sales) has full variation + addon breakdown in `drill.variations` and `drill.addons` maps. Migrate `VariationAddonMockup` to use `fetchInsightsItems` — removes chunking, enables wider date ranges.
**Files:** `VariationAddonMockup.jsx` + `variationAddonService.js`. ~50 lines change.

---

### 5. CR-164 — Add Payment Link to Orders (Beta) Report
**P1 / MEDIUM**
`WhatsAppPaymentModal` and `paymentLinkService` already exist and work on the live dashboard.
The feature is NOT in any report page. Add it to `OrderReportBetaPage` row actions, gated by `restaurant.settings.razorpayEnabled`.
**Files:** `OrderReportBetaPage.jsx` (add import + button + modal state). No new service needed.
**Test account:** owner@jeshnest.com (has Razorpay integration)

---

### 6. BUG-353 (FE part) — Lift Date Range Caps to 730 Days
**P1 / LOW**
8 report pages have FE-enforced caps that are too restrictive:
- **60d → 730d:** `SalesMockup`, `PaymentsMockup`, `OrderLedgerMockup`, `RoomOrdersMockup`
- **365d → 730d:** `DashboardMockup`, `ItemSalesHybridMockup`, `CancellationsMockup`, `SettlementReportMockup`
**Fix:** Change `MAX_RANGE_DAYS` / `maxDays` constant in each file. 8 files, 1 line each.
**Note:** Backend confirmation needed for FE-aggregated reports (OrderLedger, RoomOrders, Settlement) due to chunking volume. Dashboard + ItemSales + Cancellations use backend agg — safe to lift.

---

## Execution Order

```
BUG-354 (Fast Lane, 1 file) → FIRST (quick win)
BUG-353 FE caps → lift 5 backend-agg pages first (safe), defer 3 FE-agg pending backend confirm
CR-422 Last Month → medium blast, LOW risk, batch all 13 pages together
CR-423 Export gaps → 6 pages, each independent
CR-138 Variation migration → after CR-423 (shares no files)
CR-164 Payment Link → after CR-423 (OrderReportBetaPage touch)
```

---

## Gate status

All items: GATE_1_INTAKE_COMPLETE
Next step: Owner approval → Planning Gate 2 for each item
