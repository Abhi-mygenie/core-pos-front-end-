# BACKEND_BRIEF_BUG486_PAYMENT_OTHER_LABELS_2026-10-05

## Summary
- Issue: `insights-sales` and `insights-dashboard` endpoints group TAB/credit payments as `method: "Other"` in `payments[]`; specific channel-based payment labels (Dine-In TAB, District) are invisible in the Sales Excel export
- Classification: DATA_ISSUE / CONTRACT_MISMATCH
- Frontend impact: "By Payment Method" tab in Sales Excel shows "Other" instead of actual labels for Dine-In TAB / District / other TAB channels
- Priority/Risk: P2 / MEDIUM

## Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/report/insights-sales` and `/api/v2/vendoremployee/report/insights-dashboard`
- Auth/context: Bearer token (owner@thegoankitchen.com, RID 69)

## Current response (payments[])
```json
[
  {"method": "Cash",    "orders": 22, "revenue": 4055},
  {"method": "Other",   "orders": 1,  "revenue": 260},
  {"method": "Partial", "orders": 1,  "revenue": 0}
]
```

## Expected
```json
[
  {"method": "Cash",    "orders": 22, "revenue": 4055},
  {"method": "Dine-In TAB", "orders": 1, "revenue": 260},
  {"method": "Partial", "orders": 1,  "revenue": 0}
]
```

OR: populate `tab_settlements[]` (currently empty) with per-channel breakdown:
```json
"tab_settlements": [
  {"channel": "Dine-In", "orders": 1, "revenue": 260},
  {"channel": "District", "orders": 0, "revenue": 0}
]
```

## Ask
1. Expand `payments[]` to show the actual payment channel label for TAB/credit payments instead of grouping as "Other"
2. Alternatively, ensure `tab_settlements[]` is populated with per-channel TAB breakdown so FE can merge it

## Frontend Workaround
- Available: NO (label comes directly from API; FE cannot infer sub-labels from "Other")
