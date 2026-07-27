# CR-112 — OrderCard Item Price Display

**ID:** CR-112
**Type:** CR (Enhancement)
**Created:** 2026-07-27
**Priority:** P3 — LOW
**Status:** DEFERRED
**Related:** CR-106, CR-111

## Description
Design mockup shows `₹120.00` per item line. OrderCard doesn't render item prices for ANY order type. Data is available (`item.unitPrice`, `item.price`) but not displayed.

**Owner decision needed:** Aggregator-only or all order types?

## Blast Radius
SMALL — 1 file (`OrderCard.jsx`), ~3 lines.
