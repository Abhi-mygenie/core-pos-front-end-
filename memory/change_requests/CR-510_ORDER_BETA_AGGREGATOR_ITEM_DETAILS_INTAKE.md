# CR-510 — Order Beta Report: Aggregator Orders — Item Details with Variations and Add-ons

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (aggregator order visibility: full item config needed for dispute resolution)
**Risk:** MEDIUM (extends OrderDetailSheet for aggregator orders)
**Process required:** Full gate flow. FAST LANE eligible? **NO**
**Sprint:** TBD
**Source:** Order Beta Report Enhancement Requirements Excel (Item #9)
**DEPENDS ON:** CR-509 (Order Details view)

---

## Description

Inside the Order Details view (CR-509), for aggregator orders (Swiggy, Zomato, and other supported platforms), display the full item-level configuration:
- Item names and quantities
- Selected variations (size, type, etc.)
- Selected add-ons
- Respective prices for each

This is NOT extra columns in the main report table — it's within the Order Details drill-down sheet.

**Expected behavior:** Open an aggregator order's details → see items with their variations, add-ons, and prices, same level of detail as POS orders.

**Current behavior:** Aggregator order details may not expose full item configuration. BUG-601 (variations/addons silently dropped) suggests data loss during order flow.

---

## Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Confidence:** SUSPECTED (needs verification of aggregator order data structure in detail API)

---

## Code Reality Check

**Code reality: PARTIAL** — `OrderDetailSheet.jsx` renders items but aggregator-specific variation/addon display needs verification. `aiosellTransform.js` handles aggregator data transforms. BUG-601 (variations/addons silently dropped) is in INTAKE — may be prerequisite.

## Duplicate Check

**RELATED** to BUG-601 (Aggregator Variations/Addons Silently Dropped — INTAKE). BUG-601 is about data loss during order flow; this CR is about display in Order Details. If BUG-601 data isn't available, this CR can't show it.

## Blast Radius

- `OrderDetailSheet.jsx` (965 lines) — aggregator item rendering
- Aggregator transforms — data availability
- Estimated scope: SMALL-MEDIUM (1-2 files, ~20-30 lines if data is available)

## Open Questions

- **OD-510-01:** Does the `get-single-order-new` API return variation/addon details for aggregator orders?
- **OD-510-02:** Is BUG-601 a prerequisite — if variation/addon data is lost during ingestion, this CR can't display it?
