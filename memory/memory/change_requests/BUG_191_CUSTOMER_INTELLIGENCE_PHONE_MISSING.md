# BUG-191: Customer Intelligence — Phone Number Missing in Insights Section

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete)
**Source:** OWNER-REPORTED
**Confidence:** HIGH
**Duplicate check:** DISTINCT
**Risk:** LOW
**Severity:** P2
**Classification:** BACKEND_DATA

## Description
In Insights → Intelligence → "Top Customers" table, Phone column shows "—" for all customers.

## Investigation Findings

**Code trace:**
- `CustomersRfmMockup.jsx:126` → renders `c.phone || '—'`
- Export columns (L79) → includes `{ key: 'phone', label: 'Phone' }`
- FE correctly maps and displays whatever the API returns

**Root cause:** The backend `/insights-customers` API either doesn't return a `phone` field or returns it as null/empty. FE renders correctly — just no data to show.

## Fix Required
- **BACKEND ONLY** — include `phone` in the insights-customers API response
- **Zero FE changes needed**

## Files
- FE correct: `CustomersRfmMockup.jsx`
