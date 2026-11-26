# CR-542 — Reason Mandatory on Every Make Unpaid

**Classification:** CR · **Client:** ALL · **Assignee:** Abhishek (waiting on Gyan) · **Priority:** TBD (owner) · **Status:** INTAKE
**Source:** OWNER-REPORTED 2026-11-14 (Batch B Q&A, 526-02/08/09/11) · **Related:** CR-526, CR-515, BUG-671

## Description
**Current:** Making an order unpaid does not ask for a reason.
**Expected:** Every Make Unpaid action, everywhere it exists (dashboard, Audit report, Order Beta, Credit Management), requires a reason picked from a dropdown. The list is a **new, separate unpaid-reasons list** supplied by the backend (not the cancellation reasons list).

## Backend dependency (Gyan)
- Unpaid-reasons list endpoint
- Make-unpaid API to accept + store the reason; reason returned in report APIs

## Open Questions
- OD-542-01: Priority (P0 or P1)?
- OD-542-02: Optional notes box as well (like cancel)?
- OD-542-03: Where should the unpaid reason be shown afterwards (Audit, Order Beta, Credit)?
