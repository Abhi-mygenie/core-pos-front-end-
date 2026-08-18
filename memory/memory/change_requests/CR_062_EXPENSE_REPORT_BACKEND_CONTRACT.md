# CR-062: Expense Report — Backend Aggregation Contract

**ID:** CR-062
**Type:** CR (Change Request)
**Created:** 2026-07-06
**Status:** INTAKE — BLOCKED by CR-061 (FE report must ship first)
**Priority:** P2
**Risk:** MEDIUM (new backend endpoint, aggregation logic)
**Sprint:** POS 5.0 (post CR-061)
**Source:** OWNER-DIRECTED (split from CR-059 Phase 2)
**Parent:** CR-059 Phase 2
**Depends on:** CR-061 (FE report finalization)

---

## Summary

Define and deliver a backend aggregation contract for the Expense Report module. Same pattern as CR-049 (Insights Backend Aggregation Migration) where:

1. FE builds report with client-side aggregation (CR-061)
2. Report is finalized and owner-approved
3. FE team documents exact data shapes needed → **Backend API Contract**
4. Backend team builds dedicated aggregation endpoint(s)
5. FE switches from client-side to server-side aggregation

---

## Process (mirrors CR-049 workflow)

### Step 1: CR-061 ships → report is live with client-side aggregation
### Step 2: Document what FE computes
- Exact aggregation fields (total, by_category, daily, monthly, by_payment, etc.)
- Sample request/response JSON
- Business rules (date format, payment bucketing, category grouping)
- Performance requirements (response time, max date range)

### Step 3: Create Backend API Contract document
Format: Same as `BACKEND_API_CONTRACT_INSIGHTS_AGGREGATION.md`
- WHY: raw data doesn't scale (765 txns for 6 months → could be 10,000+ for multi-year)
- WHAT: 1-2 new aggregation endpoints under `/expense/`
- HOW: sample request + sample response + field definitions + business rules
- WHEN: After CR-061 is finalized

### Step 4: Backend review + implementation
### Step 5: FE migration — switch from client-side to backend aggregation

---

## Proposed Backend Endpoint (draft — finalized after CR-061)

```
POST /api/v2/vendoremployee/expense/expense-aggregation
{
  "from": "2026-01-01",
  "to": "2026-06-30",
  "category_id": null,          // optional filter
  "payment_method": null        // optional filter
}

Response:
{
  "success": true,
  "data": {
    "total_amount": 483067,
    "transaction_count": 765,
    "active_days": 152,
    "avg_daily": 3178,
    "by_category": [
      {"category_id": 347, "category_name": "misc", "total": 482007, "count": 764},
      {"category_id": 350, "category_name": "Salary", "total": 1060, "count": 1}
    ],
    "by_payment": [
      {"method": "Cash", "total": 260856, "count": 413},
      {"method": "Cash Draw", "total": 217211, "count": 347},
      {"method": "Bank Transfer", "total": 5000, "count": 5}
    ],
    "daily": [
      {"date": "2026-01-01", "total": 3200, "count": 5},
      {"date": "2026-01-02", "total": 2800, "count": 4}
    ],
    "monthly": [
      {"month": "2026-01", "total": 106851, "count": 195},
      {"month": "2026-02", "total": 80092, "count": 152}
    ],
    "top_category": {"category_name": "misc", "total": 482007},
    "highest_day": {"date": "2026-03-29", "total": 19549, "count": 9}
  }
}
```

**This is a DRAFT.** Final contract created after CR-061 report is approved and data shapes are frozen.

---

## Deliverable

A backend contract document (HTML + MD) similar to:
- `BACKEND_API_CONTRACT_INSIGHTS_AGGREGATION.md`
- `BACKEND_API_CONTRACT_INSIGHTS_CONSOLIDATED_V2.md`
- `memory/evidence/CR-059/BACKEND_GAPS_BRIEF.html`

Includes: endpoint spec, sample request/response, business rules, performance requirements, field definitions.

---

## Next

- BLOCKED until CR-061 ships and report is finalized
- After CR-061: finalize contract → deliver to backend → backend builds → FE migrates
