# CR-101 — Intake: Daily Report — "Collected By" and "Punched By" Filters on Settled Tab

**Registered:** 2026-07-24
**Source:** OWNER-REPORTED (screenshot of Daily Report / Settled tab)
**Classification:** CR (feature enhancement)
**Severity:** P2
**Risk:** LOW
**Duplicate Check:** DISTINCT — no existing CR covers employee-based filters on Daily Report
**Code Reality:** NONE — FilterBar has 6 filters (Pay Type, Status, Payment, Channel, Platform, ALL). No employee/waiter filter exists.

---

## Summary

The Daily Report (AllOrdersReportPage) shows "PUNCHED BY" and "ACTIONED BY" columns in the order table, but there are **no filter dropdowns** to filter by these employee fields. Owner needs to filter the Settled tab by:

1. **Collected By** (who collected the bill payment) — maps to `actionedBy` field
2. **Punched By** (who placed/punched the order) — maps to `punchedBy` field

## Current State

| Layer | Exists? | Detail |
|---|---|---|
| Data in API response | ✅ | `waiter_name` (punched by), `employee_name`/`payment_collected_by_name` (collected by) |
| Transform mapping | ✅ | `reportTransform.js:933` → `punchedBy`, L936-958 → `actionedBy` |
| Table columns | ✅ | "PUNCHED BY" and "ACTIONED BY" columns visible in table |
| Order Ledger fields | ✅ | `orderLedgerService.js:74-75` → `waiterOrdered`, `waiterCollected` |
| **Filter dropdowns** | ❌ | `FilterBar.jsx` has no employee filter. Only Pay Type, Status, Payment, Channel, Platform, PG |

## Expected Behavior

Add two new filter dropdowns to FilterBar (same pattern as existing dropdowns):

1. **"Punched By"** dropdown — populated from unique `punchedBy` values in the current dataset (client-side derived, no new API call)
2. **"Collected By"** dropdown — populated from unique `actionedBy` values in the current dataset

When selected, filter the table rows to show only orders matching the selected employee.

## Blast Radius

- **Files:** 2-3 (`FilterBar.jsx` + `AllOrdersReportPage.jsx`, possibly `FilterTags.jsx`)
- **Lines:** ~20-30
- **Hotspot:** NO
- **Scope:** SMALL

### Code References

| # | File | Current | Gap |
|---|---|---|---|
| 1 | `components/reports/FilterBar.jsx` L221-276 | 6 filter dropdowns | No employee filter |
| 2 | `pages/AllOrdersReportPage.jsx` | Passes `filters` state to FilterBar | No `punchedBy`/`collectedBy` in filter state |
| 3 | `api/transforms/reportTransform.js` L933, L940 | `punchedBy`, `actionedBy` mapped | Data available, just not filterable |

## Open Questions

1. Should the filter apply to **all tabs** or **Settled tab only**?
2. Should the dropdown be **searchable** (for restaurants with many employees)?

---

## Next

Planning Gate 2 (Impact Analysis)
