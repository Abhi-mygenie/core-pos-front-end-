# Investigation Report — Reports Batch
## BUG-040, BUG-041, BUG-354, BUG-353, BUG-408, BUG-409, BUG-192, BUG-467, BUG-486, BUG-547
## CR-423, CR-138, CR-422, CR-424, CR-164

**Date:** 2026-10-17
**Role:** INVESTIGATION
**Steps used:** 10/10
**Confidence:** HIGH on all except BUG-467 (requires live probe)

---

## BUG-040 & BUG-041 — Audit Report Excel/CSV format + PDF

**Verdict: SUPERSEDED by new reports module. Clarification needed from owner.**

These bugs were filed against the OLD `AllOrdersReportPage.jsx` (the original single-page report still at `/reports/audit`).
The NEW reports module has `AuditLogMockup.jsx` (at `/reports-module/audit-log`) which already has full Excel + PDF via `reportExporter.js` with proper `buildExportPayload()` — both buttons enabled and working.

- **BUG-040** (Excel/CSV format): `AllOrdersReportPage` uses `ExportButtons` component which exports a basic CSV from the visible filtered row list. The "specific format" the owner requested has not been applied. BUT the new `AuditLogMockup` has its own structured Excel export — if the owner is using the new report, this is already addressed.
- **BUG-041** (PDF misaligned rows): Same page, old component. New `AuditLogMockup` has proper PDF.

**Recommendation:** Clarify with owner: are BUG-040/041 about the OLD `AllOrdersReportPage` (still live) or the NEW `AuditLogMockup`? If old page → mark as DEFERRED-TO-OLD-POS-MIGRATION. If new page → likely already fixed, needs owner smoke.

---

## BUG-354 — Order Report Status Column Shows Raw Value / Null

**Verdict: FE_BUG confirmed. Small fix. 1 file.**

`getStatusBadge(row.payment_type)` in `OrderReportBetaPage.jsx:47-56` only maps:
```
Cash → "Paid"    Unpaid → "Unpaid"    Cancel → "Cancel"    Partial → "Partial"
```
Any other value (e.g. `null`, `""`, `upi`, `online`, `TAB`, `prepaid`, `postpaid`) falls through to `{ label: pt || '—' }`.

Known backend values from `orderTransform.js`: `Cash / Unpaid / TAB / postpaid / prepaid / partial`.
Missing mappings: `TAB → "TAB"`, `prepaid → "Prepaid"`, `postpaid → "Postpaid"`, `null → "—"`.

**Fix:** Add entries to the map. Fast Lane eligible (1 file, ~4 lines, LOW risk).

---

## BUG-353 — Date Range Cap Across All Reports (Requirement: 2 Years)

**Verdict: Multiple pages need updating. Backend support must be confirmed first.**

**Current caps found in codebase:**

| Cap | Pages |
|-----|-------|
| **60 days** | `SalesMockup`, `PaymentsMockup`, `OrderLedgerMockup`, `RoomOrdersMockup` |
| **365 days (1 year)** | `DashboardMockup`, `ItemSalesHybridMockup`, `CancellationsMockup`, `SettlementReportMockup` |
| **No cap** | `OrderReportBetaPage`, `AuditLogMockup`, `CancelDetailMockup`, `CashierSettlement`, `ChannelPivot`, `DailySales`, `DayOfWeek`, `DeliveryCharge`, `DiscountReport`, `ExpenseReport`, `FoodCourt`, `GatewayRecon`, `HourlySales`, `KotVariance`, `OrderNotes`, `PLReport`, `PrepServeTime`, `PurchaseReport`, `RoomTransfers`, `StaffCashiers`, `StaffServers`, `TableSales`, `TaxCalc`, `TaxDetail`, `TaxSlabs`, `TipReport`, `VariationAddon` |

**For the 2-year (730-day) requirement:**
- **8 pages need cap increase**: the 60d and 365d ones above
- **FE-aggregated reports** (PrepServe, OrderLedger, RoomOrders, FoodCourt, VariationAddon, Settlement): already use 30-day chunking internally — they CAN handle 2 years technically, but 730÷30 = 24 sequential API calls per load → backend load concern
- **Backend-aggregated reports**: single API call — backend must support 2-year queries. This needs confirmation from backend team before we lift FE caps

**`OrderReportBetaPage` (BUG-353 original):** Has NO cap at all in the FE. Any cap is purely backend. The backend returning no data for wide ranges is a backend limitation, not FE code.

**Recommendation:** File as two-part fix — (1) lift FE caps to 730 days across 8 pages (safe FE change), (2) backend brief to confirm 2-year query support.

---

## BUG-408 — Daily Report Room Settlement Always ₹0

**Verdict: BACKEND-BLOCKED confirmed. No FE code issue.**

`OrderSummaryPage.jsx` reads room settlement sub-fields from the reportService transform. The API (`order-logs-report`) does not populate `room_cash/room_upi/room_card` fields in its response for room orders. The FE correctly reads what the API sends — the API simply doesn't send these sub-fields. Backend brief already filed. No FE work possible until backend ships the fields.

---

## BUG-409 — Daily Report Room Food No Cash/UPI/Card Breakdown

**Verdict: PARKED confirmed. Correct decision.**

Room food orders are billed as a single total in the API response with no payment method sub-breakdown. The API design aggregates room food as a single block. Parked by owner — keep total-only. Revisit when backend adds per-method fields.

---

## BUG-192 — Prep & Serve Time Shows Handover as 0

**Verdict: PARTIALLY BACKEND. FE code is correct but depends on timestamps backend doesn't reliably populate.**

`prepServeService.js` correctly:
- Chunks date range into 30-day batches
- Parses `created_at → ready_at → serve_at` timestamps
- Classifies as Kitchen / Bar / Direct by gap size
- Returns `null` (shown as `'—'`) when `ready_at` or `serve_at` is null

The `'—'` display (showing as "0" in the owner's description) occurs because the backend does not populate `ready_at` and `serve_at` for most orders. These fields are only populated when the restaurant uses the KOT marking system.

**Root cause:** Backend only sets `ready_at` when staff clicks "Mark Ready" in KOT, and `serve_at` when staff clicks "Mark Served". For restaurants not using per-item KOT tracking, all orders will show `'—'`.

**Recommendation:** Backend brief: confirm which restaurants have KOT timestamps populated. For restaurants that do, the report will work correctly — no FE fix needed. For restaurants that don't use KOT, the "0" is expected behavior.

---

## BUG-467 — Historical Order Data Disappeared

**Verdict: REQUIRES LIVE PROBE. Cannot determine from code alone.**

The FE code for `AllOrdersReportPage` and all report services have no hardcoded date cutoffs — they pass `from_date/to_date` directly to the backend. If historical data is not showing, the issue is definitively backend-side (data migration, account issue, or backend query limit). **Requires R11 probe with owner@palmhouse.com or affected account credentials.**

---

## BUG-486 — Sales Excel Shows "Other" Instead of Channel Names

**Verdict: BACKEND issue + FE has no mapping fallback.**

`SalesMockup.jsx → buildExportPayload()` passes `analytics.channels` directly to the Excel export. `analytics.channels` comes from `fetchInsightsSales` → `insightsService.transformSalesResponse` → `data.channel_mix[].channel` — the raw string the backend sends.

If backend sends `channel = 'Other'` for TAB or certain payment-linked orders, the FE passes it through as-is. There's no FE mapping table for channel names.

**Two-part fix:**
1. FE: add a `CHANNEL_LABEL_MAP` fallback (e.g. `'Other' → 'Other'` is correct for truly uncategorized, but backend may be miscategorizing)
2. Backend: fix the `insights-sales` endpoint to send the correct channel label instead of 'Other'

**Verdict: BACKEND-BLOCKED.** Backend must fix the categorization. FE can add a mapping table as a workaround if needed.

---

## BUG-547 — Dashboard Doughnut Shows ₹0

**Verdict: ✅ GATE_5A_IMPLEMENTED. Fixed on 2026-10-17.**
`DashboardMockup.jsx:88` — `transformDashboardResponse(raw.data || raw)`. Verified by screenshot (PalmHouse dashboard now shows Channel Mix and Payment Mix with real data).

---

## BUG-580 — Discount Report Missing Restaurant-Specific Types

**Verdict: BACKEND-BLOCKED confirmed.**

`DiscountReportMockup.jsx` reads from `fetchInsightsDiscounts` → `insights-discounts` endpoint. The endpoint returns only standard buckets: `manual_discount, coupon_discount, loyalty_discount, comp_total`. There is no `custom_types[]` or restaurant-specific discount breakdown in the API response shape. PalmHouse's "Thrice Discount" (and similar custom discounts) are not surfaced.

**Fix requires backend to:** add `custom_discount_types: [{ name, amount }]` to the `insights-discounts` response. FE can then render them dynamically in the daily trend and employee tables.

---

## CR-423 — The 6 Reports Missing Export

1. **`CancellationsMockup`** — Download button UI exists, tooltip shows, BUT both Excel and PDF items have `enabled: false` hardcoded. The `buildExportPayload()` is not implemented. Most impactful as it has the UI but it's dead.

2. **`PLReportPage`** — Has PDF export only (`handleExportPDF`). No Excel button or handler. Uses jsPDF directly, not the standard `reportExporter`.

3. **`OrderReportBetaPage`** — Has Excel only (`exportOrderReportBetaExcel` via CR-117 backend call). No PDF button or handler.

4. **`RoomOrdersMockup`** — Has `reportExporter` import and a download button, but **missing `buildExportPayload()`**. The handler will throw `Cannot read properties of undefined (reading 'sheets')` because `buildExportPayload` is not defined.

5. **`FoodCourtMockup`** — Has inline `exportReportAsExcel({...})` and `exportReportAsPDF(win, {...})` calls in the handler, but the payload is built inline (not via `buildExportPayload`). Structurally correct but non-standard — may work but untested.

6. **`FoodCourtBetaPage`** — Same pattern as FoodCourtMockup — inline payload, non-standard.

---

## CR-138 — Variation & Addon Report — Backend Aggregation Already Available

**Verdict: Backend aggregation IS available via `fetchInsightsItems`. CR-138 scope is wrong.**

**Current state:** `VariationAddonMockup.jsx` uses `getVariationAddonSalesForRange` from `variationAddonService.js` which explicitly uses `ORDER_LOGS_REPORT + FE aggregation` — confirmed in service file header comment: *"Fetches order-logs-report and aggregates by variation name + addon name."*

**But:** `insightsService.js` `transformItemRows()` (used by `ItemSalesHybridMockup`) ALREADY parses `line.variation` (JSON) and `line.add_ons[]` from the `insights-items` endpoint. The backend `insights-items` has variation and addon breakdown built in.

**Fix:** Migrate `VariationAddonMockup` to use `fetchInsightsItems` + extract variation/addon breakdown from the already-available `drill.variations` and `drill.addons` maps in the transformed data. This removes the FE aggregation dependency and enables 2-year date ranges. The `INSIGHTS_ITEMS` endpoint at `/api/v2/vendoremployee/report/insights-items` already provides all the data needed.

**CR-138 should be re-titled:** "Migrate VariationAddon report from FE aggregation (order-logs) to backend aggregation (insights-items)".

---

## All FE-Aggregation Reports

Reports that use `ORDER_LOGS_REPORT` + FE compute (performance concern for wide date ranges):

| Report | Service | Date Cap | Notes |
|--------|---------|----------|-------|
| `OrderLedgerMockup` | `orderLedgerService` | 60 days | order-logs + FE |
| `SettlementReportMockup` | `reportService` | 365 days | order-logs + FE |
| `RoomOrdersMockup` | `roomOrdersService` | 60 days | order-logs + FE |
| `FoodCourtMockup` | `foodCourtService` | none | order-logs + FE, 30d chunks |
| `FoodCourtBetaPage` | `foodCourtService` | none | order-logs + FE, 30d chunks |
| `PrepServeTimeMockup` | `prepServeService` | none | order-logs + FE, 30d chunks |
| `VariationAddonMockup` | `variationAddonService` | none | order-logs + FE (should migrate to insights-items) |
| `SalesMockup` | insightsSales + orderLogs | 60 days | BOTH — uses backend for primary, order-logs for audit tab |
| `PaymentsMockup` | insightsPayments + orderLogs | 60 days | BOTH |
| `CancellationsMockup` | insightsCancellations + orderLogs | 365 days | BOTH |
| `AllOrdersReportPage` | `reportService` | none | Legacy old report, pure FE agg |
| `OrderSummaryPage` | `reportService` (daily) | single-day | Legacy daily summary |

---

## CR-422 — "Last 30 Days" → "Last Month"

**Verdict: 13 pages need updating.**

Pages with `30D` preset that need a "Last Month" preset (full calendar month, not rolling 30 days):

`AuditLogMockup`, `CancelDetailMockup`, `CancellationsMockup`, `DailySalesMockup`, `DashboardMockup`, `DeliveryChargeMockup`, `HourlySalesMockup`, `PrepServeTimeMockup`, `PurchaseReportPage`, `SalesMockup`, `SettlementReportMockup`, `TaxDetailMockup`, `TipReportMockup`

**Implementation:** Change `'30D'` label to `'LM'` (Last Month) and compute:
```js
case 'LM': {
  const now = new Date();
  f = new Date(now.getFullYear(), now.getMonth() - 1, 1);   // 1st of last month
  t = new Date(now.getFullYear(), now.getMonth(), 0);        // Last day of last month
  break;
}
```
Medium blast (13 files), LOW risk per file, no financial/API logic change.

---

## CR-424 — Send Reports via WhatsApp/Email/SMS

**Verdict: DEFERRED — big CR. Owner to provide BSP API details.**

Owner clarified: email is needed + own WhatsApp channel via BSP API (details to be provided later). This is a significant integration CR involving email template design, WhatsApp BSP webhooks, and per-report payload serialization. Marking as DEFERRED pending BSP API spec from owner.

---

## CR-164 — Send Payment Link from Daily Reports

**Verdict: PARTIALLY IMPLEMENTED on dashboard. NOT in any report page.**

`WhatsAppPaymentModal` component exists and sends Razorpay payment links via WhatsApp. It is used in **`OrderCard.jsx`** (live dashboard orders view) — gated on `restaurant.settings.razorpayEnabled`. For jeshnest.com, this works from the LIVE DASHBOARD.

**Not in any report page:** `AllOrdersReportPage.jsx`, `OrderReportBetaPage.jsx`, and `OrderLedgerMockup.jsx` — none of them import or use `WhatsAppPaymentModal`.

**CR-164 status clarification:** The feature exists on the live dashboard (correctly gated by Razorpay). CR-164 is specifically about surfacing it in the **Daily Report row** so staff can send a payment link from the report without returning to the live dashboard. This is NOT yet implemented. CRM events endpoint dependency was from an older plan; the Razorpay path (`paymentLinkService.js`) is already functional.

**Recommendation:** Re-scope CR-164: add "Send Payment Link" action to `OrderReportBetaPage` rows — gated by `restaurant.settings.razorpayEnabled`. Use existing `WhatsAppPaymentModal` component and `sendPaymentLink` service. The CRM_EVENTS_ENDPOINT_BLOCKED status is outdated — Razorpay path works. **Medium scope: 2 files, no hotspot.**
