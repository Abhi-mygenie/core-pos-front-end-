# Session Handover — 2026-10-17 — INTAKE: Reports Batch Registry + Batch Creation

**Role:** INTAKE
**Date:** 2026-10-17
**Code changed:** NO

---

## What Was Done

1. **CR-012 CLOSED_SUPERSEDED** — menuManagementService.js already uses v2 API. Migration complete.
2. **BUG-040 + BUG-041 CLOSED_SUPERSEDED** — old AllOrdersReportPage. New AuditLogMockup has full export.
3. **Registry updated** for all 16 items from investigation (priorities, risk, status, sprint)
4. **Two intake batches created:**
   - `BATCH_REPORTS_FE_FIX_001` — 6 items fixable now without backend
   - `BATCH_REPORTS_BE_BLOCKED_001` — 6 items blocked on backend team

---

## Batch Summary

### BATCH-REPORTS-FE-001 (6 items — FE only, can start now)

| ID | Title | P | Risk | Effort |
|---|---|---|---|---|
| BUG-354 | Order Report status column missing mappings | P2 | LOW | Fast Lane ~4 lines |
| CR-422 | Last 30 Days → Last Month preset (13 pages) | P2 | LOW | ~26 lines, 13 files |
| CR-423 | Fix export on 6 reports (disabled/missing) | P1 | MED | ~6 files, medium |
| CR-138 | Migrate VariationAddon to backend aggregation | P2 | MED | ~50 lines, 2 files |
| CR-164 | Add payment link to Orders Beta report | P1 | MED | ~20 lines, 2 files |
| BUG-353 | Lift date caps to 730 days (FE side) | P1 | LOW | 8 files, 1 line each |

**Intake doc:** `change_requests/BATCH_REPORTS_FE_FIX_001_INTAKE_2026_10_17.md`

### BATCH-REPORTS-BE-001 (6 items — blocked on backend)

| ID | Title | Backend Ask |
|---|---|---|
| BUG-486 | Sales Excel shows 'Other' | Fix insights-sales channel label |
| BUG-580 | Discount report missing custom types | Add custom_discount_types[] to insights-discounts |
| BUG-579 | Cancellation ₹ values not showing | Confirm revenue fields in insights-cancellations |
| BUG-408 | Room settlement ₹0 breakdown | Add room_cash/upi/card to order-logs-report |
| BUG-192 | Prep/Serve time shows 0 | Confirm KOT timestamps populated per restaurant |
| BUG-467 | Historical data disappeared | Backend data investigation + R11 probe needed |

**Intake doc:** `change_requests/BATCH_REPORTS_BACKEND_BLOCKED_001_INTAKE_2026_10_17.md`

---

## Next Agent Instructions

1. Present both batches to owner
2. For FE batch: "Gate 2 GO" → Planning → Implementation
3. For BE batch: file backend briefs to backend team
4. BUG-467 specifically: run R11 probe with palmhouse credentials before filing brief
