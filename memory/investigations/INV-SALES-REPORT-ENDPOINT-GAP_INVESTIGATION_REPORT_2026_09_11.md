# Investigation Report — Sales Report: Endpoint Mismatch & Field Gap Analysis

**Date:** 2026-09-11  
**Agent Role:** INVESTIGATION (Role 6 — AGENT_PROMPT_ALPHA v0.7)  
**Scope:** Compare curl provided by owner against current FE implementation. Find all gaps.  
**Steps used:** 6/10  
**Files read:** `reportService.js`, `OrderSummaryPage.jsx`, `constants.js`, `CR_REGISTRY.md`  
**Curl live result:** Token expired (auth-001) — payload analysis done from code only

---

## 1. Summary

| | |
|-|-|
| **Main gap found** | `getDailySalesReport` sends only `{from: dateStr}` — missing the `to` field. The correct payload per the owner curl is `{from, to}`. |
| **Classification** | BUG — wrong POST payload + no date-range UI support |
| **Confidence** | HIGH — confirmed in code (line 399); live response unavailable (token expired) |
| **Existing CR** | NONE for this specific gap. CR-363 (Night Audit) and CR-366 (Revenue Dashboard) both consume this same endpoint — adjacent but distinct. |

---

## 2. Owner Curl vs Current Implementation

### Owner curl (correct — provided 2026-09-11):
```bash
POST https://preprod.mygenie.online/api/v2/vendoremployee/daily-sales-revenue-report
{
  "from": "2026-09-10",
  "to": "2026-09-10"
}
```

### Current frontend (reportService.js:396–400):
```js
export const getDailySalesReport = async (date) => {
  const dateStr = formatDateParam(date);
  const response = await api.post(API_ENDPOINTS.DAILY_SALES_REPORT, {
    from: dateStr,          // ← sends ONLY from
    // to: ???              // ← 'to' is MISSING
  });
```

**Gap:** `to` field never sent. Backend receives an incomplete payload on every call.

---

## 3. Hypotheses Tested

| # | Hypothesis | Test | Result | Evidence |
|---|-----------|------|--------|---------|
| H1 | Frontend sends wrong payload to the correct endpoint | Code read `getDailySalesReport` | **CONFIRMED** — missing `to` field, line 399 | `reportService.js:399` |
| H2 | Frontend is calling a different endpoint entirely | Check `API_ENDPOINTS.DAILY_SALES_REPORT` | **ELIMINATED** — endpoint URL matches curl exactly: `/api/v2/vendoremployee/daily-sales-revenue-report` | `constants.js:135` |
| H3 | Page supports date range input (from ≠ to) | Read `OrderSummaryPage.jsx` | **ELIMINATED** — single `DatePicker` (not a range picker), passes single `selectedDate` to API | `OrderSummaryPage.jsx:27–52, 134–137` |
| H4 | SalesMockup.jsx is the broken report | Read file | **ELIMINATED** — `SalesMockup.jsx` uses a completely different endpoint (`/report/insights-sales`). Different report, different purpose. | `SalesMockup.jsx:1` |
| H5 | There is an existing CR for this payload bug | Registry search "sales report daily" | **ELIMINATED** — No registered item covers this gap | CR_REGISTRY.md search |
| H6 | Response fields are fully mapped | Read transform (lines 406–472) | **PARTIALLY VERIFIED** — 21 API fields mapped in transform. Live response unavailable (token expired) — cannot confirm if unmapped fields exist | `reportService.js:406–472` |

---

## 4. Gap Analysis

### GAP-1 (CONFIRMED P1): Missing `to` field in POST payload

| | |
|-|-|
| **Location** | `reportService.js:399` |
| **Current** | `{ from: dateStr }` |
| **Correct** | `{ from: dateStr, to: dateStr }` (same date for single-day view) |
| **Impact** | Backend may default `to` to null/today — could return incorrect totals for past dates |
| **Fix** | 1 line: add `to: dateStr` to the payload object |

---

### GAP-2 (CONFIRMED P2): No Date Range Support in UI

| | |
|-|-|
| **Location** | `OrderSummaryPage.jsx:27, 134` |
| **Current** | Single `DatePicker` — one date only. API is always called with `from === to`. |
| **Correct** | API supports different `from` and `to` values (date range reports) |
| **Impact** | Users cannot get a sales summary for a range (e.g., "this week", "Sep 1–10") |
| **Fix** | Replace `DatePicker` with `DateRangePicker` + update service call to pass `from` and `to` separately |

---

### GAP-3 (UNVERIFIED): Possible unmapped API response fields

| | |
|-|-|
| **Status** | Cannot verify without a live API response (token expired) |
| **What's mapped today** | 21 fields: total_sales, paid_revenue, running_order, orderTAB, unpaid_revenue, cancel_revenue, Cash, Card, UPI, paid_revenue_method, station_revenue, TAB fields, room fields, aggregator_order, discount, tax, tips, service_charge, round_off, from, to |
| **What might be missing** | Cannot confirm without live response. Common candidates: order_count by type (Dine-In/Delivery/Takeaway), delivery charge totals, individual payment gateway breakdowns |
| **Action needed** | Fresh token OR owner to share a sample JSON response from the curl |

---

### GAP-4 (MINOR): Page title is "Daily Summary" — should be "Sales Report"

| | |
|-|-|
| **Location** | `OrderSummaryPage.jsx:128` |
| **Current** | `<h1>Daily Summary</h1>` |
| **Suggested** | Could be renamed per owner preference (minor, owner call) |

---

## 5. Impact Map

| Gap | Files | Lines | Risk |
|-----|-------|:-----:|:----:|
| GAP-1: `to` field | `reportService.js` | 1 | LOW |
| GAP-2: Date range UI | `OrderSummaryPage.jsx` + `reportService.js` | ~15–25 | LOW-MEDIUM |
| GAP-3: Unmapped fields | TBD (need live response) | TBD | UNKNOWN |
| GAP-4: Title | `OrderSummaryPage.jsx` | 1 | LOW |

---

## 6. Recommendation

### Register as BUG-393 (GAP-1 = P1 fix) + CR-377 (GAP-2 = feature enhancement)

| Item | Type | Action |
|------|------|--------|
| GAP-1 (missing `to`) | BUG-393 | 1-line fix. Fast Lane eligible. No owner decisions needed. |
| GAP-2 (date range UI) | CR-377 | Needs owner OD: is date range wanted, or always single-day? |
| GAP-3 (unmapped fields) | Blocked | Need fresh token or sample JSON response |
| GAP-4 (title) | Minor | Absorb into CR-377 |

---

## 7. Questions for Owner

| Q | Question | Why needed |
|---|----------|-----------|
| Q1 | **What does "one more report" mean?** (a) Fix the existing OrderSummaryPage, or (b) Build a NEW report page alongside it? | Determines scope |
| Q2 | **Date range?** Should the report support "from → to" range selection (e.g., view a week at a time), or is single-day-only correct? | Determines if CR-377 is needed |
| Q3 | **Can you share a sample JSON response from the curl?** The token in the provided curl expired. Need a fresh response to verify all field mappings are correct. | Unblocks GAP-3 |

---

*Investigation complete. 6/10 steps used. HIGH confidence on GAP-1 (missing `to`). GAP-3 pending fresh token. Ready to register BUG-393 + CR-377.*
