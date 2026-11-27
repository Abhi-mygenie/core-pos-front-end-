# CR-560 — Server-side Excel for ALL reports (replace frontend Excel) — INTAKE

**Gate:** 0→1 (INTAKE)
**Role:** INTAKE
**Date:** 2026-11-20
**Type:** CR · **Area:** Reports / Analytics · **Priority:** P2 (agent-classified; owner may override) · **Risk:** HIGH
**Client:** ALL · **Assignee:** Gyan (backend-blocked — needs per-report download endpoints; FE wiring = Abhishek; cancel endpoints = Piyush)
**Source:** Owner chat 2026-11-20 (OWNER-REPORTED) + backend endpoints from Piyush.
**Duplicate check:** RELATED to **CR-138** (dual-Excel for Item Sales + Variation/Addon) and **CR-117** (Order Report Beta backend Excel). DISTINCT overall — this is a module-wide **replace** (server Excel only), and **supersedes CR-138's "keep BOTH" decision** for the affected screens (owner now wants server-only).

---

## 1. Requirement (Expected Behavior)
Every report that currently generates its Excel **in the browser** (via `utils/reportExporter.js` → `exportReportAsExcel`) must instead download its Excel from a **backend endpoint** (server generates the `.xlsx`, returns the file or a `{ download_url }`, FE just triggers the download).

**Owner decisions (locked this session):**
- **OD-560-1 = SERVER ONLY.** Replace the frontend Excel on these screens — do **not** keep a dual "FE Excel + Server Excel" option (unlike CR-138). PDF export stays frontend (unless owner says otherwise — see OD-560-A).
- **OD-560-2 = ALL REPORTS.** Applies to every report screen with a frontend Excel export (validated list below), not just cancellations.

---

## 2. Code Reality — validated 2026-11-20
**PARTIAL.** 41 screens generate Excel on the FE and **all are enabled** (no `enabled: false`; only transient disable while loading/no-data). The **only** report already using backend Excel is **Order Report Beta** (`OrderReportBetaPage` → `exportOrderReportBetaExcel`, endpoint `ORDER_REPORT_BETA_EXCEL`) — the reference pattern, out of scope.

### Screens using frontend `exportReportAsExcel` (IN SCOPE — 41)
reports-module (39): AuditLogMockup, CancelDetailMockup, CancellationsMockup, CashierSettlementMockup, ChannelPivotMockup, CouponUsageMockup, CustomersMixMockup, CustomersRfmMockup, DailySalesMockup, DashboardMockup, DayOfWeekMockup, DeliveryChargeMockup, DiscountReportMockup, ExpenseReportPage, FoodCourtBetaPage, FoodCourtMockup, GatewayReconMockup, HourlySalesMockup, ItemSalesHybridMockup, ItemSalesLedgerMockup, KotVarianceMockup, OrderLedgerMockup, OrderNotesMockup, PLReportPage, PaymentsMockup, PrepServeTimeMockup, PurchaseReportPage, RoomOrdersMockup, RoomTransfersMockup, SalesMockup, SettlementReportMockup, StaffCashiersMockup, StaffServersMockup, TableSalesMockup, TaxCalcMockup, TaxDetailMockup, TaxSlabsMockup, TipReportMockup, VariationAddonMockup.
PMS (2): NightAuditPage, RevenueDashboardPage.

Shared primitive: `frontend/src/utils/reportExporter.js` (`exportReportAsExcel`). After migration its Excel path may be retired for these screens (keep for PDF).

---

## 3. Backend endpoint matrix (THE blocker)
Server-side Excel requires one download endpoint per report. **Known today = 4; ~37 screens have no endpoint yet.**

| Report screen | Backend endpoint | Status |
|---|---|---|
| Order Report Beta (ref, out of scope) | `/api/v1/vendoremployee/daily-order-report-excel-export-combined` | LIVE |
| Item Sales + Variation/Addon (CR-138) | `/api/v1/vendoremployee/top-food-variation-sales-report-download` | LIVE (`{download_url}`) |
| Cancel item / food-sales (CancelDetailMockup) | `/api/v1/vendoremployee/calcel-food-sales-report-download` *(backend spelling "calcel")* | provided by Piyush — verify live |
| Order cancel (CancellationsMockup) | `/api/v1/vendoremployee/order-cancel-report-download` | provided by Piyush — verify live |
| **All other ~37 screens** | — | **NOT AVAILABLE — backend must build/confirm** |

⚠ **Concurrency risk (from CR-138):** backend used a **static filename** (`top_food_variation_sales_report.xlsx`) — two simultaneous exports can collide. All new endpoints must return a **unique/per-request file or `download_url`**.

---

## 4. Evidence
- Frontend-Excel usage + enabled-state validation: grep of `exportReportAsExcel` across `pages/` (41 files, 0 disabled) — 2026-11-20.
- Backend-Excel precedent: `reportService.js` `exportOrderReportBetaExcel` (blob/`download_url`), CR-138 registry row.
- Cancellation endpoints: supplied by Piyush (backend) 2026-11-20.
- Source: OWNER-REPORTED + backend. Confidence: CONFIRMED (FE state), SUSPECTED (the 2 cancel endpoints — not yet live-probed).

## 5. Blast Radius
**LARGE.** 41 FE screens + shared `reportExporter.js` + a new service layer (per-report download calls) + ~37 new/confirmed backend endpoints. Hotspots: `reportService.js` (shared), `reportExporter.js` (shared primitive).

---

## 6. Open Questions for Owner (feed Planning Gate 2)
- **OD-560-A** — PDF: leave PDF on the frontend, or also move PDF to server? (default: PDF stays FE.)
- **OD-560-B** — Rollout: big-bang all 41 at once, or phased (start with the 4 screens that already have endpoints: cancellations ×2 + Item Sales/Variation ×2, which closes the loop with CR-138)?
- **OD-560-C** — If a backend endpoint for a given report does NOT exist yet, keep the FE Excel as interim for that screen until the endpoint ships, or hide Excel entirely? (default: keep FE interim per-screen until its endpoint is live, then swap.)
- **OD-560-D** — Column parity: must server Excel match the exact columns/column-chooser of today's FE Excel, or is backend's own schema acceptable?
- **Backend brief (Gyan/Piyush):** confirm the 2 cancellation endpoints' request/response shape; provide/confirm download endpoints for the remaining ~37 reports; guarantee unique filenames (no static-name concurrency bug).

## 7. Relationship to B2 / BUG-739
`AuditLogMockup` is in this list → the Audit Excel gaps in **BUG-739** become moot on the Audit screen once it moves to a backend endpoint (needs a backend audit-export endpoint, which does NOT exist yet). Recommend: keep BUG-739's small FE Excel fix as interim until the Audit server endpoint exists, OR drop the 739 Excel sliver if CR-560 will replace it shortly. Owner to decide at B2 Gate-4.

---

```
Intake complete: CR-560
Classification: CR, Severity: P2 (agent), Risk: HIGH
Duplicate check: RELATED to CR-138 (supersedes keep-both) + CR-117
Evidence: captured (FE validation 41 screens, 0 disabled; 2 cancel endpoints from Piyush — verify live)
Blast radius: LARGE (41 FE screens + shared services + ~37 backend endpoints)
Client: ALL · Assignee: Gyan (backend-blocked; FE=Abhishek; cancel endpoints=Piyush)
Owner decisions: OD-560-A/B/C/D + backend endpoint matrix
Next: Planning Gate 2 (once owner answers rollout + endpoint availability)
```
