# BUG-644 — Credit Management — Order Details (SS3) does not show items (header says 3 items)

**ID:** BUG-644  **Type:** BUG  **Registered:** 2026-11-05  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Area:** Payments / Coupons / Credit  **Source:** OWNER-REPORTED (chat 2026-11-05)  **Related:** BUG-643

## Description
Order 000414 (pos.mygenie.online/credit): chip shows "3 Items", totals ₹244.23 / ₹257, but no item list is visible in Order Details.

## Evidence
- `evidence/BUG-644/owner_ss3_order_000414_items_missing_2026_11_05.webp`
- Curl output: not captured (no test credentials in memory/test_credentials.md)
- Confidence: REPORTED (hypothesis LIKELY)

## Duplicate Check
RELATED — related: BUG-643

## Code Reality
PARTIAL — SS3 fetches via getSingleOrderNew (FETCH MODE, src/components/reports/OrderDetailSheet.jsx ~L505) and renders items in scroll body (~L728, fallback text "Item details not available" not visible in SS). Hypotheses: (H1, LIKELY) same root cause as BUG-643 — Radix modal scroll-lock blocks wheel/touch scroll on portaled SS3, so Items section below the fold is unreachable on small windows; (H2) items missing in single-order API response for this order. Needs live probe.

## Blast Radius
SMALL (same files as BUG-643)

## Open Owner Decisions
- OD-644-01 Can owner scroll inside the pop-up? (distinguishes H1 vs H2) — OPEN

## Next
Planning Gate 2.

## Evidence update (2026-11-05)
- Owner re-shared SS3 (order 000414). A vertical scrollbar is visible at the right edge of the SS3 body and content ends at "Mode of Payment" — consistent with H1 (Items section below the fold, scroll blocked). Esc / scroll test still OPEN.

## Owner (2026-11-05, round 4)
- Owner: scrolling inside SS3 — "yes, already there" (items visible after scroll).
- OPEN: OD-644-02 close BUG-644 as NOT A BUG (items are below the fold), or keep as UX fix (show items without scrolling)?

## Owner Decision (2026-11-05, round 5)
- OD-644-02 **LOCKED** — behaviour, not a bug; **no change**. Closed.
