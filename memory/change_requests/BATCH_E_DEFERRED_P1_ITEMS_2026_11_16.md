# BATCH-E — Deferred P1 Items (Backend-Blocked) — 2026-11-16

> Created: 2026-11-16. Owner decision: CR-494, CR-495, CR-443 moved from Batch A to Batch E (P1). All fully blocked on backend APIs.

## Items

| # | ID | Priority | Risk | Blocked on | Backend owner |
|---|---|---|---|---|---|
| 1 | **CR-494** | P1 | CRITICAL | BA-11 to BA-15 | Gyan |
| 2 | **CR-495** | P1 | CRITICAL | B-495-1 to B-495-7 | Parth |
| 3 | **CR-443** | P1 | HIGH | BA-19 to BA-22 | Gyan |

## CR-494 — Per-Action PIN + ₹ Thresholds + Daily Limits
PIN verification before discount/comp/cancel above a ₹ threshold. Daily per-user limits. All backend APIs (PIN store, threshold config, usage counters) need to be built first. FE plan is SKELETON — no exact edits until backend replies to BA-11 through BA-15.

## CR-495 — Meal Package at Check-In + Room Comp Limit
PMS check-in assigns meal package (breakfast included). Room comp items gated by package. All backend APIs for meal package and comp limits need to be built by Parth first. FE plan is SKELETON — waiting B-495-1 through B-495-7.

## CR-443 — Leakage Alerts (Cancel / Unpaid / Payment-Change)
Real-time push/sound alerts when a cashier cancels, marks unpaid, or changes payment method. Backend notification/event APIs need to be built by Gyan first. FE plan is SKELETON — waiting BA-19 through BA-22.

## When to unblock
Each item moves back to active implementation when its backend asks are answered and APIs are available on preprod. FE plans will be completed (SKELETON → FROZEN) at that point.
