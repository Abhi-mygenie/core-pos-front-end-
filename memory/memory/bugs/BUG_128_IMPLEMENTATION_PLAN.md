# BUG-128 — Implementation Plan (Gate 3)

**Date:** 2026-06-11 · Workstream A · Decision H4: dedupe ONLY (wider cancel window = CR-031)

## Scope (LOCKED)
Remove the duplicate POST in `getDashboardAggregated`. Zero behaviour change.

## Change
`frontend/src/api/services/insightsService.js` (~lines 530-543):
- Delete the second identical `/order-logs-report` POST (`cancelDataResp`)
- `const cancelDataOrders = orders;` (alias the single response)
- Keep `cancelReasonsResp` GET unchanged

## Expected number shifts
NONE — byte-identical tiles (both calls had identical body + identical filtering). ~40 MB less transfer per Dashboard load at Palm House; ~2× faster load.

## QA
Harness snapshot: every Dashboard metric identical before/after for fixed ranges (Mar/May, both restaurants). Network tab: exactly one order-logs POST per load.

## Note
Dashboard cancel metrics keep their current (punch-fetched) blind spot until CR-031 lands — intentional, per H4.

## Freeze-log
Dashboard not in frozen S-list — no amendment needed.

## Rollback
Re-add the second call.
