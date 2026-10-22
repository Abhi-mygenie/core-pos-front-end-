# BACKEND_BRIEF — BUG-353 — Aggregation Endpoints Needed for FE-Only Reports
# Date: 2026-10-18
# Priority: P2 / MEDIUM

## Summary
- Issue: Three report pages have FE-side date range caps that cannot be safely lifted because they use sequential `order-logs-report` chunked fetching. No backend aggregation endpoint exists for these reports.
- FE impact: Users cannot view more than 60-365 days of data on these reports.
- Classification: BACKEND_NEEDED — FE is blocked until aggregation endpoints ship.

## Reports Blocked

| Report | Current Cap | Service | Why Blocked |
|---|---|---|---|
| **Order Ledger** (`/reports-module/order-ledger`) | 60 days | `orderLedgerService.getOrderLedgerForRange` → `order-logs-report` in 30d chunks | 730d = 24 sequential calls |
| **Room Orders** (`/reports-module/room-orders`) | 60 days | `roomOrdersService` → `order-logs-report` in 30d chunks | 730d = 24 sequential calls |
| **Settlement Report** (`/reports-module/settlement`) | 365 days | `settlementReportService` → `settlementService.getSettlementReport` → chunked | 730d = 24+ sequential calls |

## What Backend Needs to Provide

For each of the 3 reports, a backend aggregation endpoint that:
- Accepts `from_date` + `to_date` (up to 730 days)
- Returns the complete aggregated dataset in a **single API call**
- Replaces the need for FE to chunk by 30-day windows

Suggested approach: add to the existing `insights-*` endpoint family (same pattern as `insights-items`, `insights-sales`, `insights-dashboard`).

| Report | Suggested endpoint | Data needed |
|---|---|---|
| Order Ledger | `insights-order-ledger` | Per-order rows: id, date, waiter, items, amount, payment method |
| Room Orders | `insights-room-orders` | Per-order rows: room, guest, date, amount, status |
| Settlement | `insights-settlement` | Per-day totals: cash collected, UPI, card, TAB, discounts, cancellations |

## Frontend Plan (pending backend)
Once aggregation endpoints exist:
1. FE creates new service wrapping the new endpoint
2. Replace chunked fetch with single call in each page
3. Lift date cap to 730 days

## Current Status
- FE cap changes are **NOT deployed** — kept at current values (60d / 365d)
- Registry: BUG-353 → BACKEND_BLOCKED
- FE work estimated: ~2 days per report once API is available
