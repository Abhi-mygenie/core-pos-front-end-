# Session Handover — 2026-10-17 — Reports Batch Investigation

**Role:** INVESTIGATION
**Date:** 2026-10-17
**Code changed:** NO

---

## Items Investigated

| ID | Final Status | Finding |
|---|---|---|
| BUG-040 | INVESTIGATION_COMPLETE | Refers to OLD AllOrdersReportPage. New AuditLogMockup already has working export. Owner to confirm if old page still matters. |
| BUG-041 | INVESTIGATION_COMPLETE | Same — likely superseded by new AuditLogMockup. |
| BUG-354 | GATE_1_INTAKE_COMPLETE | getStatusBadge missing TAB/prepaid/postpaid/null mappings. 4 lines, Fast Lane. |
| BUG-353 | GATE_1_INTAKE_COMPLETE | OrderReportBeta has NO cap. 8 other pages have 60d/365d caps needing lift to 730d. Backend confirmation needed. |
| BUG-408 | BACKEND_BLOCKED | API doesn't send room_cash/upi/card sub-fields. Confirmed. |
| BUG-409 | PARKED | Owner decision confirmed. |
| BUG-192 | GATE_1_INTAKE_COMPLETE | FE correct. Only works with KOT timestamps from backend. Backend brief needed. |
| BUG-467 | GATE_1_INTAKE | Needs live R11 probe — FE has no cutoff code. |
| BUG-486 | BACKEND_BLOCKED | insights-sales returns 'Other'. Backend fix needed. |
| BUG-547 | GATE_5A_IMPLEMENTED | ✅ Already fixed + screenshot proved. |
| BUG-580 | BACKEND_BLOCKED | insights-discounts has no custom_types array. |
| CR-423 | GATE_1_INTAKE_COMPLETE | 6 pages: Cancellations(disabled), PLReport(no Excel), OrderBeta(no PDF), RoomOrders(no payload), FoodCourt/Beta(non-standard). |
| CR-138 | GATE_1_INTAKE_COMPLETE | insights-items already has variation+addon data. Migrate VariationAddon from FE agg to backend agg. |
| CR-422 | GATE_1_INTAKE_COMPLETE | 13 pages need 30D→LM. Last Month = calendar month 1st to last day of prev month. |
| CR-424 | DEFERRED | Big CR. Owner to provide BSP API spec. |
| CR-164 | GATE_1_INTAKE_COMPLETE | WhatsAppPaymentModal exists on dashboard (OrderCard) for Razorpay clients. NOT in report pages. 2 files to add to OrderReportBeta. CRM-blocked status outdated. |

## Full Report

`/app/memory/investigations/REPORTS_BATCH_INVESTIGATION_2026_10_17.md`
