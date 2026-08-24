# BUG-194: Payments Report in Insights — Completely Empty

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete — API verified)
**Source:** OWNER-REPORTED
**Confidence:** HIGH (triple confirmed)
**Duplicate check:** DISTINCT
**Risk:** LOW
**Severity:** P1
**Classification:** FE_BUG (data access mismatch after CR-049)

## Description
Entire Payments report under Insights shows nothing — no charts, no numbers, no data.

## Investigation Findings

**API verification (cafe103, June 2026):**
```
POST /api/v2/vendoremployee/report/insights-sales
Response: { success: true, data: { summary: { total_revenue: 2247154, total_orders: 1989 }, payments: [6 methods], daily: [...] } }
```
Data EXISTS and is correct. 6 payment methods, ₹22 lakh revenue.

**The bug:**
- `fetchInsightsSales` returns: `{ data: resp.data?.data, orderCount: 0 }`
- So `salesData = { data: { summary, payments, daily }, orderCount: 0 }`
- `PaymentsMockup.jsx:213` reads: `salesData.summary` → **undefined**
- `PaymentsMockup.jsx:219` reads: `salesData.payments` → **undefined**
- Should be: `salesData.data.summary` and `salesData.data.payments`

**Root cause:** CR-049 migrated from FE aggregation to backend aggregation. `fetchInsightsSales` wraps response under `.data` but `PaymentsMockup` wasn't updated to read from the new location.

## Fix Required
- **FE ONLY** — 3 lines in `PaymentsMockup.jsx`:
  - L213: `const s = salesData.data?.summary || salesData.summary || {};`
  - L219: `const backendPayments = salesData.data?.payments || salesData.payments || [];`
  - L255: `const daily = (salesData.data?.daily || salesData.daily || []).map(...)`
- Lowest risk fix in the batch. 1 file, ~3 lines.

## Files
- `PaymentsMockup.jsx` — lines 213, 219, 255
