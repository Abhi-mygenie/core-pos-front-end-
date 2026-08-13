# CR-111 — OrderCard Aggregator Item Format: ● Qty× Name

**ID:** CR-111
**Type:** CR (Enhancement)
**Created:** 2026-07-27
**Priority:** P3 — LOW (cosmetic, functional display works)
**Risk:** LOW
**Status:** DEFERRED — Owner decisions locked 2026-07-27
**Related:** CR-106, CR-112
**Source:** INVESTIGATION (Report #3, G2)

## Description
Design mockup Section 3 shows items as `● 1× Paneer Butter Masala ₹120.00`. Current OrderCard renders `item.name (item.qty)` — no dot prefix, no × symbol. This is the existing format for ALL order types.

**Owner decision (LOCKED):** Aggregator only. ~5 lines, `isAggregator` branch at OrderCard L692.

## Blast Radius
SMALL — 1 file (`OrderCard.jsx`), ~5 lines in item rendering section (~L692).
