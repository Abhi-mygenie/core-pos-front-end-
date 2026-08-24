# BUG-266 — Wastage Report / Top Wasted Items: BACKEND-BLOCKED

**ID:** BUG-266
**Type:** BUG
**Severity:** P1
**Risk:** N/A (cannot fix from frontend)
**Source:** OWNER-REPORTED (2026-07-27, screenshot-confirmed)
**Duplicate Check:** DISTINCT (RELATED to CR-072 Phase 2 — wastage CRUD is separate from wastage REPORTS)
**Related:** CR-072, BUG-262 (Coming Soon removal)

## Description
"Wastage Insights" and "Top Wasted Items" widgets on the Inventory Intelligence Dashboard show "Coming soon — awaiting backend wastage endpoint." The KPI card "Wastage Value" shows "—" with "P2" badge. The wastage report feature is entirely BACKEND-BLOCKED.

## Evidence
- Screenshot: Owner-provided (both widgets showing "Coming soon" text)
- `InventoryIntelligencePanel.jsx:315-316`: Both use `WastagePlaceholder` component
- `InventoryIntelligencePanel.jsx:61-73`: Placeholder with explicit "awaiting backend" message
- KPI card line 276: value="—" badge="P2"

## Blocker
Backend team must build wastage API endpoints:
- GET wastage-report (date range, grouped by ingredient)
- GET top-wasted-items (summary/ranking)
- Existing wastage CRUD (log entry) exists via CR-072, but aggregation/reporting endpoints do not.

## Frontend Status
Placeholder UI is ready. Once backend endpoints are available, wire into existing widget structure.

## Fix Recommendation
1. File BACKEND_BRIEF for wastage report endpoints
2. Remove "Coming Soon" text from production (handled by BUG-262)
3. Wire widgets when backend is ready

## Next
BACKEND_BRIEF → Planning Gate 2 (when unblocked)
