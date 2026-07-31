# GO-1 Wave — Gate 4 Code Gate (BUG-125, BUG-126, BUG-128)
**Date:** 2026-06-11 · **Owner GO:** "go 1 only" (verbatim, 2026-06-11) · Scope = plans' Changes sections verbatim

## BUG-125 — Cancellations order-scope predicate (S9)
- File: `frontend/src/pages/reports-module/CancellationsMockup.jsx` (1 line + comment)
- BEFORE: `const isOrderCancelled = pm === 'cancelled';`
- AFTER: `String(ot.f_order_status) === '3' || pm === 'cancel' || pm === 'cancelled'` (H1=b; type-safe fs compare; live enum is `'Cancel'` → lowercased `'cancel'`; Merge guard kept upstream)
- Expected: total loss/qty UNCHANGED (partition only); Palm House May order-scope qty 0 → ~392

## BUG-126 — round_off → round_up (Items & Menu)
- File: `frontend/src/api/services/insightsService.js` line ~93 (1 token)
- Expected: Items "Sold" revenue +₹460/+₹305/+₹272/+₹23 (PH Mar/Apr/May/Jun)

## BUG-128 — Dashboard duplicate fetch removed
- File: `frontend/src/api/services/insightsService.js` getDashboardAggregated (~530)
- Second identical order-logs POST deleted; `cancelDataOrders = orders` alias; cancelReasons GET kept
- Expected: ZERO number change; 1 POST per load instead of 2

## Out of scope (explicitly NOT touched)
Wider cancel_at fetch window (CR-031) · room stripping (CR-029) · basis switch (CR-030) · payment classifier (CR-032)

## Freeze-log
S9 amendment appended to CR_011_SCREEN_FREEZE_LOG.md (BUG-125). BUG-126/128 screens not frozen.

## Rollback
Each fix independently revertible (1 line / 1 token / re-add POST).
