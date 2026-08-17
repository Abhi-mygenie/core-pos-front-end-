# BUG FIX REPORT — 2026-06-15 — CR-049 Payment/Channel Percentage Fix

## Failures Fixed

| Test # | Severity | RCA Classification | Root Cause | Fix | Files Changed | Verified |
|--------|----------|-------------------|------------|-----|---------------|:--------:|
| QA-Payment-Pct | MINOR | CODE_ERROR | `transformDashboardResponse` mapped raw revenue (₹75325) to `value` field where old code expected percentage (40%). Also `topChannelPct` hardcoded to 0. | Compute `value = Math.round((orders / totalOrders) * 100)` for both channel_mix and payment_mix. Derive topChannelPct from sorted mix. | `insightsService.js` | ✅ |

## Summary
1/1 fixed. Root cause: CODE_ERROR (transform didn't match old shape contract).
Scope expansion: NONE.
Escalated: NONE.

## Verification
- Channel: Dine-In 95%, Delivery 4%, Takeaway 1% ✅
- Payment: Cash 50%, UPI 40%, Card 4%, Partial 5% ✅
- topChannelPct: 95% ✅
- Webpack: compiled with 0 new warnings ✅
