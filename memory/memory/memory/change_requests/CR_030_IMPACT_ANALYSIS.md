# CR-030 — Impact Analysis (Gate 2)

**Date:** 2026-06-11 · **Status:** ANALYSIS COMPLETE — Gate 3 BLOCKED on owner decisions OD-1..OD-3 (see intake)

## 1. Existing Plumbing (good news)
- Backend supports `sort_by: collect_bill | created_at` on `/order-logs-report`.
- `insightsService.getItemSalesAggregated` already accepts `sortBy` param (`collect_bill | created_at | cancel_at`) — the toggle concept half-exists.
- `orderLedgerService.getOrderLedgerForRange(…, sortBy)` parameterised.

## 2. The Hard Problems
1. **Filter/fetch mismatch (structural flag B1):** fetching by `collect_bill` but filtering by `created_at` business-day drops orders punched before range but paid in-range — proven 3-week settlement lags at palmhouse make this a REAL row-loss. Collection-mode needs a collection-date filter (`collect_bill` within business-day range), not created_at.
2. **Business-day tail (B2):** collection-mode must also fetch `to_date+1` for 00:00–03:00 collections (e.g., order 014894 collected Jun 8 00:xx = Jun 7 business day). Palm House May: 42 after-midnight events.
3. **Daily bucketing:** daily tables currently bucket by raw date-string; business-day bucketing decision needed (00:00–03:00 → prior day?) — owner OD.

## 3. Affected Files
All report screens' fetch wiring + a shared `attribution` state (context or per-screen): `SalesMockup`, `PaymentsMockup`, `DashboardMockup`, `ItemSalesHybridMockup`, `CancellationsMockup`, `OrderLedgerMockup`, `insightsService.js`, `orderLedgerService.js` + a small `AttributionBadge` component.

## 4. Regression Risk
- HIGH (money-display change on every screen). Frozen screens S5–S9 require freeze-log entries.
- Settlement/backend comparisons become reconcilable only in collection mode — QA must assert: collection-mode daily totals ≈ settlement `total_sale` (within TAB/room scope differences documented in CR-033/CR-029).

## 5. Phasing Proposal (for Gate 3)
- Phase 1: fix collection-mode filter+tail correctness in services (no UI).
- Phase 2: labelled badge showing current attribution (default = punch, today's behaviour — zero number changes).
- Phase 3: user-facing toggle per owner decision.

## 6. Test Strategy
`/app/audit_data/results.json` `jun_daily_comparison` is the acceptance fixture: punch-mode column must match `sales_created`, collection-mode must match `ledger_collect`±tail, and reconcile to `settlement_sale` per documented scope diffs.
