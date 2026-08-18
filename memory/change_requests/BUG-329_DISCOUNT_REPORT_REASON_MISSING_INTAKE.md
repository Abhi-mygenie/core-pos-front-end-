# BUG-329 — Discount Report: Discount Reason / Type Not Shown

**ID:** BUG-329  
**Type:** BUG / FEATURE_GAP  
**Severity:** P2 — MEDIUM  
**Risk:** MEDIUM (reports, no financial data change — display only)  
**Area:** Reports → Discount Report (S26)  
**Sprint:** POS 5.x  
**Created:** 2026-08-18  
**Source:** INVESTIGATION (INV-AUG18-2026, INV-3)  
**Related:** CR-137 (discount_for field capture — IMPLEMENTED, QA PASS)  
**Duplicate check:** DISTINCT from CR-137 (CR-137 captures reason; this shows it in report)  

---

## Description

The Discount Report (`/reports-module/discounts`, S26) shows breakdown by **type** (Manual / Coupon / Loyalty / Comp) and **by employee**, but shows **no breakdown by discount reason** — e.g. why a manual discount was given ("staff", "happy hour", "manager override").

Owner: "Discount report discount reason is not coming."

## Evidence

- `DiscountReportMockup.jsx` table columns: `Date | Manual | Coupon | Loyalty | Comp | Total` — no reason column
- `insightsService.js:640` — `insights-discounts` API returns `{ summary, daily[], by_employee[] }` — no `by_reason[]`
- `CartPanel.jsx:513` — `discountFor: null` (hardcoded, CR-137 pass-through comment)
- Source: AGENT-DISCOVERED + OWNER-REPORTED
- Confidence: HIGH

## Root Cause (two layers)

1. **API layer**: `insights-discounts` endpoint does not return a `by_reason` / `by_discount_type` breakdown
2. **UI layer**: `DiscountReportMockup.jsx` has no reason column — table only shows aggregate type buckets

Note: CR-137 (IMPLEMENTED, QA PASS) adds `discount_for` free-text to order payloads going forward — this will make reason data available in future orders.

## Blast Radius

- `DiscountReportMockup.jsx` — add `by_reason` section/table (~30 lines)
- `insightsService.js` — no change needed (raw passthrough)
- Backend: `insights-discounts` endpoint needs `by_reason[]` array
- Hotspot files: NO
- Estimated scope: SMALL (1 FE file + backend endpoint change)

## Backend Brief Required

```
Endpoint: POST /api/…/insights-discounts { from_date, to_date }
Current:  { summary, daily[], by_employee[] }
Missing:  by_reason[] or by_discount_type[]
Shape:    [{ reason: string, total_amount: number, order_count: number }]
          OR [{ discount_type: string, total_amount: number, order_count: number }]
Note: CR-137 now sends discount_for in order payloads — backend can aggregate on this field
```

## Open Questions

- OQ-1: Should reasons be grouped by `discount_for` text (free-text) or by `discount_type` (preset name)?
- OQ-2: Should only manual discounts show reasons, or all types?

## Next: Gate 2 (Planning) — after backend confirms endpoint shape
