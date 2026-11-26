# CR-511 — Order Beta Report: Aggregator Orders — Complete Amount Breakdown

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (financial transparency: aggregator order financials need full breakdown)
**Risk:** MEDIUM (extends OrderDetailSheet financial section)
**Process required:** Full gate flow. FAST LANE eligible? **NO**
**Sprint:** TBD
**Source:** Order Beta Report Enhancement Requirements Excel (Item #10)
**DEPENDS ON:** CR-509 (Order Details view)

---

## Description

Inside the Order Details view (CR-509), for aggregator orders, show a complete financial breakdown:
- Item subtotal
- Item-level discounts
- Order-level discounts
- Additional charges (packaging, delivery, etc.) where applicable
- Taxes
- Final order amount

Platform commissions, deductions, and settlement adjustments should be kept separate from the customer-facing order amount if those are in scope.

**Expected behavior:** Open an aggregator order's details → see full financial breakdown that reconciles to the displayed final amount. Platform deductions not mixed into customer-facing values.

**Current behavior:** Only final amount visible for aggregator orders, no component breakdown.

**Implementation note from Excel:** "Show customer-facing order amount components. Keep platform commissions, deductions and settlement adjustments separate if included in scope."

---

## Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Confidence:** SUSPECTED (needs verification of aggregator financial data in API)

---

## Code Reality Check

**Code reality: NONE** — No aggregator-specific financial breakdown in `OrderDetailSheet.jsx`. Aggregator order data may contain these fields but they aren't rendered.

## Duplicate Check

**DISTINCT.**

## Blast Radius

- `OrderDetailSheet.jsx` (965 lines) — financial breakdown section
- `reportService.js` or aggregator transforms — data mapping
- Estimated scope: SMALL-MEDIUM (1-2 files, ~25-35 lines)

## Open Questions

- **OD-511-01:** Does the API return aggregator-specific financial fields (platform commission, packaging charges, etc.)?
- **OD-511-02:** Should platform commissions be shown at all, or only the customer-facing breakdown?
- **OD-511-03:** For Swiggy vs Zomato, are the financial field names different (requiring separate transforms)?
