# CR-101 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** NONE — no employee filter exists in FilterBar or AllOrdersReportPage
**Conflict Pre-Check:** No active CR targets FilterBar.jsx or AllOrdersReportPage.jsx
**Risk:** LOW (2 files, ~25 lines, additive filters, no financial logic)

---

## Data Flow Trace

```
Backend: GET /order-logs-report → orderWrapper.orders_table
  → Transform: reportTransform.js:933 → punchedBy = api.waiter_name
  → Transform: reportTransform.js:939-958 → actionedBy (collected/cancelled/merged by)
  → Return: L1030-1032 → { punchedBy, actionedBy, actionedByLabel }

Page: AllOrdersReportPage.jsx
  → L158: allOrders = transformed rows (each has punchedBy, actionedBy)
  → L174-180: filters state = { status, paymentMethod, channel, platform, paymentGateway }
  → L409-455: filter chain applies each filter to rows
  → ❌ GAP: No punchedBy or collectedBy in filters state
  → ❌ GAP: No filter application for these fields

FilterBar.jsx:
  → L221-276: 6 Select dropdowns (payType, status, payment, channel, platform, PG)
  → ❌ GAP: No employee/waiter dropdown
```

## Affected Files

| # | File | Line(s) | Change | Risk |
|---|------|---------|--------|------|
| 1 | `AllOrdersReportPage.jsx` | L174-180 | Add `punchedBy: null, collectedBy: null` to filters state | LOW |
| 2 | `AllOrdersReportPage.jsx` | L409-455 area | Add filter logic: `if (filters.punchedBy) result = result.filter(...)` | LOW |
| 3 | `AllOrdersReportPage.jsx` | L1004 area | Pass `punchedByOptions` + `collectedByOptions` (derived from unique values) to FilterBar | LOW |
| 4 | `FilterBar.jsx` | L196 props | Add `punchedByOptions`, `collectedByOptions` props | LOW |
| 5 | `FilterBar.jsx` | L276 area | Add 2 new Select dropdowns ("Punched By", "Collected By") | LOW |

**Files WILL NOT touch:** reportTransform.js (data already mapped), reportService.js, OrderTable.jsx, FilterTags.jsx

## Design Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Dropdown options | Client-side derived from unique values in current dataset | No new API call; same pattern as existing filters |
| 2 | Apply to all tabs | YES — punchedBy is on all orders; collectedBy only populated for settled | Consistent with other filters |
| 3 | Searchable dropdown | NO for now (use existing Select component) | Can upgrade later if employee count is high |

## Scope Lock

- **2 files, ~25 lines**
- No API change, no transform change
- Additive: 2 new filter keys + 2 new dropdowns

---

**Next:** Gate 3 (Implementation Plan)
