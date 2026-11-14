# CR-474 — Date-Wise Sales Revenue Report

**ID:** CR-474  **Type:** CR  **Registered:** 2026-10-26  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Area:** Reports / Analytics
**Source:** OWNER-PROVIDED (backend handoff doc `PALM_HOUSE_DATEWISE_REPORT_FRONTEND_HANDOFF.md`)
**Confidence:** CONFIRMED — API live on preprod, 26 daily rows returned for Palm House Oct 1–26

---

## Description

New day-by-day financial summary report showing how much was punched, cancelled, discounted, and actually paid — per business day over a date range. Backend has built and deployed the endpoint; frontend page needed.

**API:** `POST /api/v2/vendoremployee/report/datewise-sales-revenue`

**4 columns per day:**

| Column | Key | Meaning |
|---|---|---|
| **Total Sales** | `total_sales` | Net payable order amounts (non-cancelled, non-merged) created that business day |
| **Total Cancelled** | `total_cancelled` | ₹ value cancelled (by cancellation event date, not order date) |
| **Total Discount** | `total_discount` | Manual + coupon + loyalty + complimentary discounts on same order cohort as sales |
| **Total Paid Revenue** | `total_paid_revenue` | Actual ₹ collected (collect_bill, TAB settlements, partial payment legs) |

**Critical rule:** Do NOT subtract discounts or cancellations from Total Sales — they are already excluded from the saved net payable. The 4 columns are independent (events can land on different business dates).

**Response structure:**
- `data.header` — dynamic restaurant title (e.g., "The Palm House Report")
- `data.columns[]` — column keys + labels in display order
- `data.daily[]` — one row per business day (ascending, including zero-value days)
- `data.summary{}` — totals row (equals column sums)
- `data.business_days[]` — exact `from`/`to_exclusive` windows per day
- `data.definitions{}` — backend descriptions of each column
- Amounts are rupees (numbers, not paise). Format with ₹ and 2 decimal places.

**Request:** `{ from_date, to_date }` both required, YYYY-MM-DD, inclusive, max 366 days.

**Business hours:** Restaurant-specific schedule (Palm House: 6:00 AM → 3:00 AM next day). Dates are business-day labels, not midnight boundaries. Do not hardcode hours.

---

## Probe Evidence (2026-10-26, preprod, Palm House RID 541)

| Probe | Result |
|---|---|
| `POST /datewise-sales-revenue` (Oct 1–26) | ✅ 26 daily rows, all 4 columns populated |
| `summary` totals | ✅ sales=₹11,52,590 cancelled=₹49,130 discount=₹44,818.80 paid=₹11,02,870 |
| Zero-value days | ✅ Present (preserved, not omitted) |
| `business_days` | ✅ 26 entries, first: 2026-10-01 06:00 → 2026-10-02 03:00 |
| `columns` array | ✅ 5 entries (date + 4 amounts) in display order |
| `definitions` | ✅ Present — backend descriptions of each column |
| `header` | ✅ "The Palm House Report" |
| Reversed date range | ✅ HTTP 403 with validation error (per handoff doc) |

---

## Duplicate Check

**DISTINCT.**
- `DAILY_SALES_REPORT` (constants.js L135, `/daily-sales-revenue-report`): Different endpoint, different data shape. That's the Insights Daily Sales report. This is a new endpoint `/datewise-sales-revenue` with a different structure (daily[] + summary{} + business_days[]).
- CR-472 (Item Consumption Report): Different — per-item quantities vs per-day financials.
- Sales Summary (`/reports/summary`): Different — aggregated totals, not day-by-day breakdown.

---

## Code Reality

**NONE.** No constants, service functions, transforms, pages, or routes exist for `datewise-sales-revenue`. Entirely new:
- `constants.js` — new endpoint constant
- New service function
- New page component + route in `App.js`
- Sidebar entry

---

## Blast Radius

**MEDIUM — all new files, existing code untouched except additive entries:**
- `constants.js` — +1 endpoint (additive)
- `App.js` — +1 import + route (additive)
- `Sidebar.jsx` — +1 nav entry (additive)
- NEW page component (`DateWiseSalesRevenuePage.jsx` or similar)
- NEW service function
- Estimated: ~3 modified files + 1-2 new files

---

## Open Decisions

- **OD-474-01:** Sidebar location — under Daily Report (alongside Item Consumption, Consumption Report, P&L)? Or under Insights?
- **OD-474-02:** Default date range — MTD (matches CR-472 pattern)? Or 7D?
- **OD-474-03:** Chart — should the page include a bar/line chart visualization above the table (e.g., daily sales trend)? Or table only?
- **OD-474-04:** Export — Excel CSV + PDF (same as other reports)?

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: Awaiting owner answers to ODs → Impact Analysis
