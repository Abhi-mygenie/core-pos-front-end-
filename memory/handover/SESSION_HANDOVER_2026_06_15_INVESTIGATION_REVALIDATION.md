# SESSION HANDOVER — 2026-06-15 — INVESTIGATION: Endpoint Sufficiency Revalidation
**Registry synced:** N/A (investigation only — no code changes)
**Scope drift:** NONE
**From:** INVESTIGATION agent · **For:** Owner / Backend Team

## 1. One-line state
Revalidated all 4 live insights endpoints + 5 proposed Phase 3 endpoints against the original audit, v1.1 amendment, and backend brief. Produced consolidated contract v2.0 at `/app/memory/BACKEND_API_CONTRACT_INSIGHTS_CONSOLIDATED_V2.md`.

## 2. Key Findings

### v1.1 Amendment Bugs — CONFIRMED STILL OPEN
- **B-1:** Cancel EP `order_scope.order_count` = 72 (should be 157) on Palm House, = 17 (should be 54) on cafe103. Internal `by_employee` returns correct number. Bug confirmed on both restaurants.
- **B-2 (ESC-3):** Items cancel revenue exceeds Dashboard cancel loss by ₹757 (Palm House). Tax still on 34 cancelled lines.

### v1.1 Amendment Fields — CONFIRMED NOT YET DELIVERED
- **A-1:** `tab_settlements[]` NOT in dashboard revenue. `by_hour` Δ=₹420 (TAB settle not attributed).
- **A-3:** `tab_tax_total` NOT in sales summary. `SUM(daily.tax)` Δ=₹1,868 vs `summary.total_tax`.
- **A-4:** `tab_discount_total` NOT in dashboard discounts. Dashboard discount Δ=₹5,300 vs Sales.
- **A-6:** Daily discount scope appears correct (non-TAB) but contract doesn't explicitly say so.

### Phase 3 Endpoints — CONFIRMED NOT BUILT
All 5 return HTTP 404: `insights-tax`, `insights-discounts`, `insights-staff`, `insights-customers`, `insights-locations`.

### Phase 3 Existing Endpoint Amendments — CONFIRMED NOT DELIVERED
- `insights-items` missing `tax_rate`, `tax_type`, `tax_calc` per item.
- `insights-cancellations` items missing `notes` field.

## 3. Output
Consolidated contract v2.0 at: `/app/memory/BACKEND_API_CONTRACT_INSIGHTS_CONSOLIDATED_V2.md`
- Combines v1.0 + v1.1 + Phase 3 audit + Backend Brief into single handoff document
- Includes live validation evidence, cross-endpoint consistency checks, priority matrix, recommended sequencing
- Evidence saved: `/app/memory/evidence/dashboard_probe.json`, `sales_probe.json`, `items_probe.json`, `cancellations_probe.json`

## 4. Self-Assessment
| Dimension | Score | Notes |
|-----------|:-----:|-------|
| Registry synced? | N/A | No code changes |
| Scope drift? | 1 (none) | Investigation only |
| Steps used | 8/10 | Auth + 4 endpoint probes + Phase 3 probes + consistency checks + cafe103 cross-check |
