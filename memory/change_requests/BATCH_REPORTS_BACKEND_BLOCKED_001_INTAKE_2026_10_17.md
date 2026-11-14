# Reports Batch — Backend Blocked Intake
## BATCH-REPORTS-BE-001 — Items blocked on backend team

**Date:** 2026-10-17
**Sprint:** oct_cr_batch
**Source:** Investigation report `REPORTS_BATCH_INVESTIGATION_2026_10_17.md`
**Status:** GATE_1_INTAKE_COMPLETE — backend briefs needed / already filed

---

## Items in this batch (6)

---

### 1. BUG-486 — Sales Excel Shows "Other" Instead of Channel Names
**P2 / LOW / BACKEND-BLOCKED**
`insights-sales` API returns `method = 'Other'` for TAB and certain channel payments.
`SalesMockup` Excel export passes the raw backend value — shows "Other" in the Channel column.
**Backend ask:** Fix `insights-sales` endpoint to return correct channel label (Dine-In, Delivery, etc.) instead of 'Other'.
**FE workaround available:** Add a `CHANNEL_LABEL_MAP` in `SalesMockup.jsx` as interim fix.
**Endpoint:** `POST /api/v2/vendoremployee/report/insights-sales`

---

### 2. BUG-580 — Discount Report Missing Restaurant-Specific Discount Types
**P2 / LOW / BACKEND-BLOCKED**
`DiscountReportMockup` reads `manual_discount/coupon_discount/loyalty_discount/comp_total` from `insights-discounts`. No restaurant-specific discount types (e.g. PalmHouse "Thrice Discount") are returned.
**Backend ask:** Add `custom_discount_types: [{ name: string, amount: number }]` array to `insights-discounts` response. FE will render them dynamically.
**Endpoint:** `POST /api/v2/vendoremployee/report/insights-discounts`

---

### 3. BUG-579 — Cancellation Report Values (₹) Not Displaying
**P1 / LOW / BACKEND-BLOCKED**
Cancellation report summary shows blank or ₹0 for cancelled item/order amounts.
Investigation points to `insights-cancellations` response missing revenue totals.
**Backend ask:** Confirm `insights-cancellations` returns `cancelled_revenue` / `item_scope_revenue` / `order_scope_revenue` fields.
**Endpoint:** `POST /api/v2/vendoremployee/report/insights-cancellations`

---

### 4. BUG-408 — Daily Report Room Settlement Always ₹0
**P1 / LOW / BACKEND-BLOCKED**
Room settlement row in Daily Report shows total but always ₹0 for Cash/Card/UPI sub-breakdown.
API (`order-logs-report`) does not populate `room_cash/room_upi/room_card` fields.
**Backend ask:** Add per-method room settlement sub-fields to `order-logs-report` response for room orders.
**Endpoint:** `POST /api/v2/vendoremployee/report/order-logs-report`

---

### 5. BUG-192 — Prep & Serve Time Shows 0 (KOT Timestamps Not Populated)
**P2 / MEDIUM / BACKEND-DEPENDENT**
Prep & Serve Time report shows `'—'` (appears as 0) because `ready_at`/`serve_at` fields are null for most orders. These are only populated when staff use KOT per-item marking.
**Backend ask:** (1) Confirm which restaurants have KOT enabled and timestamps populated. (2) For restaurants using KOT, verify `ready_at`/`serve_at` are reliably present in `order-logs-report` response.
**Note:** FE code is correct — no FE fix needed once backend confirms timestamps are populated.

---

### 6. BUG-467 — Historical Order Data Disappeared
**P1 / HIGH / REQUIRES PROBE**
Owner reports only ~10 unpaid orders visible after Aug 14. FE has no date cutoffs — this is definitively a backend/data issue.
**Backend ask:** Investigate data for affected restaurant account. Possible causes: (1) account data migration truncation, (2) backend query limit by restaurant, (3) order status filter silently excluding old data.
**FE action:** Run R11 probe with `owner@palmhouse.com` to confirm the API response for a wide date range.
**Priority:** P1 HIGH — if other restaurants are affected this is a systemic data issue.

---

## Backend Brief Template

For each item, file a backend brief at:
`/app/memory/backend_briefs/BACKEND_BRIEF_<ID>_<DATE>.md`

Standard format:
```
## Summary
Issue: <one line>
Classification: BACKEND_BUG / CONTRACT_MISMATCH
Frontend impact: <what breaks in POS>

## Endpoint
POST <endpoint>

## Expected
<field/shape>

## Actual
<field/shape or "field absent">

## Frontend Workaround
Available: YES/NO
```

---

## Items NOT in this batch (for clarity)

- **BUG-409**: PARKED (owner decision — keep total-only for now)
- **CR-424**: DEFERRED (big CR — BSP API spec needed from owner)
- **BUG-353 backend part**: included in FE batch with note to confirm 2-year query support
