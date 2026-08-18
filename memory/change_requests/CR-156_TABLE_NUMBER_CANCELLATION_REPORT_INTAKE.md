# CR-156 — Table Number in Cancellation Reports (Insights)

**Type:** Change Request (Feature Addition — Backend Blocked)
**ID:** CR-156
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

The Cancellation Report under Insights does not show the **table number** for each cancelled order. Owner needs table number as a column/field in the cancellation report to identify which table's order was cancelled.

**Backend status:** The cancellation report endpoint does not yet return `table_no` / `table_number` in its response. This is a confirmed backend gap — no frontend probing needed.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Reports → Insights → Cancellation Report |
| Priority | P2 |
| Severity | MEDIUM — report is functional but missing a key field for table-service restaurants |
| Risk | MEDIUM (report display field; no billing/financial logic change) |
| Fast Lane | NO — blocked on backend; frontend change is small but can't be done until endpoint is updated |

## Evidence

- Source: OWNER-REPORTED
- Screenshot: not provided
- Steps to reproduce: Navigate to Insights → Cancellation Report → observe no "Table" column
- Confidence: REPORTED (owner-confirmed backend gap — do not probe endpoint)
- Backend status: **BACKEND NOT DONE** — endpoint does not yet return table number field

## Code Reality Check

```bash
# Cancellation report UI exists:
  pages/reports-module/CancellationsMockup.jsx  ← cancellation list view
  pages/reports-module/CancelDetailMockup.jsx   ← cancellation detail view
  api/transforms/reportTransform.js             ← report transform (has table_no for order reports)

# reportTransform.js line 403:
  table: order.table_no || table.table_no || '—'   ← table field exists in order transform
  # But cancellation-specific section may not include this field
```

- **Code reality: PARTIAL** — cancellation report UI exists; `table_no` mapping exists in general order transform but not confirmed in cancellation-specific section; frontend change is small once backend sends the field

## Blast Radius

- Frontend impact: ~2 files (`CancellationsMockup.jsx` + cancellation section of `reportTransform.js`)
- Estimated scope: SMALL (add 1 column to UI + 1 field mapping in transform)
- Blocked: YES — backend must add `table_no` to cancellation endpoint first

## Expected Behavior

- Cancellation Report table shows a "Table" column with the table number (e.g., "T-7", "T-12")
- For delivery/takeaway orders: shows "—" or "Delivery" / "Takeaway"
- Backend must return `table_no` or `table_number` in cancellation report endpoint response

## Owner Decisions Needed

1. Should table number show for all order types or only dine-in?
2. What is the expected field name from backend (`table_no`, `table_number`, `table_name`)?

## Dependency

- **BLOCKED on backend** — frontend implementation cannot start until backend updates the cancellation report endpoint to include table number
- Recommend: raise backend brief when backend team is ready to add the field

## Duplicate Check

DISTINCT — no prior CR/BUG for table number in cancellation reports.

---

**Backend Brief Needed:** YES — when backend is ready, field name + endpoint update needed.
**Next:** Planning Gate 2 (after backend adds field)
