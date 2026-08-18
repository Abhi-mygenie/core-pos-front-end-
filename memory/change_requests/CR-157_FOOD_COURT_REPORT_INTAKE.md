# CR-157 — Food Court Report (New Report Module)

**Type:** Change Request (New Report — Backend Endpoint CONFIRMED)
**ID:** CR-157
**Date:** 2026-08-17
**Last Updated:** 2026-08-17 (backend endpoint confirmed via INV-BACKEND-001)
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Owner needs a **Food Court Report** — a new dedicated report for food court operations. Backend team will provide the API contract / endpoint details separately. Frontend has a mockup/placeholder (`FoodCourtMockup.jsx`) already in place.

**Backend status:** ✅ ENDPOINT CONFIRMED via INV-BACKEND-001
- Endpoint: `GET /api/v1/vendoremployee/food-court-order-report`
- Current `foodCourtService.js` uses `ORDER_LOGS_REPORT` as a workaround — must be replaced with this dedicated endpoint
- **Owner still needs to provide:** Response shape (fields + structure) before transform can be written

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Reports → Food Court Report (new) |
| Priority | P1 |
| Severity | HIGH — food court operations have no dedicated reporting; owners flying blind on this channel |
| Risk | HIGH (new financial/operational report module) |
| Fast Lane | NO — new report wiring, multi-file, backend-blocked |

## Evidence

- Source: OWNER-REPORTED
- Screenshot: not provided
- Owner note: "backend aggregation point will provide details"
- Confidence: REPORTED (scope TBD pending backend contract)
- Backend status: **BACKEND API CONTRACT PENDING** — details to be provided by owner/backend team

## Code Reality Check

```bash
# Mockup/placeholder already exists:
  pages/reports-module/FoodCourtMockup.jsx    ← UI mockup exists
  api/services/foodCourtService.js            ← service file exists
  components/layout/Sidebar.jsx               ← food court referenced (nav entry may exist)
  App.js                                      ← food court route may be present
```

- **Code reality: PARTIAL** — mockup UI and service file both exist; real API wiring is NONE (mockup only)
- The frontend scaffolding is partially done; full implementation needs the API contract

## Blast Radius

- ~3-4 files to update when API contract is received
- Estimated scope: MEDIUM (replace mockup data with real API calls + transform)

## Expected Behavior

- Food Court Report page accessible under Reports
- Report content: TBD (pending backend API contract from owner)
- Expected pattern: date range filter, table/list view, export (matching existing reports)

## Owner Decisions Needed

1. What data does the Food Court Report show? (order breakdown by stall/counter, revenue by counter, covers, etc.)
2. What is the endpoint? (owner to provide when backend team confirms)
3. Should this replace `FoodCourtMockup.jsx` or is mockup kept for demo environments?

## Dependency

- **BLOCKED on backend API contract** — owner to share endpoint + response shape when backend team provides it
- Frontend scaffolding (`FoodCourtMockup.jsx`, `foodCourtService.js`) already in place — implementation will be fast once contract is received

## Duplicate Check

DISTINCT — no prior CR for Food Court Report wiring.

---

**Backend Brief Needed:** YES (owner to provide) — endpoint URL, method, auth, response shape.
**Next:** Planning Gate 2 (after owner provides backend API details)
