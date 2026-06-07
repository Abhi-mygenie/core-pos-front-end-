# BUG-115 — Audit Report: Cancelled Item/Order Edge Case + Production Validation Freeze

**Status:** INTAKE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** AllOrdersReportPage / OrderDetailSheet / reportTransform

---

## 1. Problem Statement (Owner Verbatim)

> Few corrections need to be done in the audit report. If the item is canceled or the order is canceled, sometimes for one of the cases it is not coming right in the audit report. During discovery we'll check that case. Basically — validate the audit report and freeze for production.

---

## 2. Symptom

Cancelled items or cancelled orders are **not rendering correctly** in the Audit Report in at least one edge case. The specific case is unknown at intake — needs discovery to identify which cancellation scenario is broken (item-level cancel, order-level cancel, partial cancel, pre-serve vs post-serve, etc.).

---

## 3. Scope of Work

This is a **two-part task:**

### Part A — Bug Fix
Identify and fix the specific cancelled item/order rendering issue in the Audit Report.

### Part B — Production Validation & Freeze
Full end-to-end validation of the Audit Report against production data before freezing for production deployment. This includes:
- All order statuses render correctly (Paid, Cancelled, Hold, Merged, Running, Credit, Aggregator)
- Cancelled items vs cancelled orders display correctly
- Financial totals (subtotal, tax, discount, grand total) are accurate
- Filters (date, payment type, status, channel, platform) work correctly
- Side-sheet drill (OrderDetailSheet) shows correct data
- Export (Excel/PDF) matches on-screen data
- Edge cases: partial cancellations, complementary items, room orders, split orders

---

## 4. Likely Affected Files

| File | Role |
|---|---|
| `AllOrdersReportPage.jsx` | Main audit report page, tab filters, table rendering |
| `OrderDetailSheet.jsx` | Side-sheet drill for order details |
| `reportTransform.js` | API response → UI row transform (order status, cancellation fields) |
| `reportService.js` | API fetch for order-logs-report |

---

## 5. Open Questions (Discovery Phase)

| # | Question |
|---|---|
| Q-115-1 | Which specific cancellation case is broken? (item-level, order-level, partial, specific cancel_type?) |
| Q-115-2 | Is the issue in the table row rendering, the side-sheet drill, or both? |
| Q-115-3 | Which restaurant/date range reproduces the issue? |
| Q-115-4 | Any specific order IDs that demonstrate the problem? |

---

## 6. Next Steps

1. Discovery session: reproduce the broken cancellation case on preprod
2. Identify root cause in reportTransform / AllOrdersReportPage
3. Fix the specific edge case
4. Full production validation pass across all order statuses and edge cases
5. Owner sign-off → freeze for production
