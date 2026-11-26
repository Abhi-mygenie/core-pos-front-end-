# BUG-605 — Order Report Beta: Unpaid / Change Payment Method Buttons Not Working

**ID:** BUG-605  **Type:** BUG  **Registered:** 2026-10-22  **Sprint:** oct_cr_batch  
**Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE  
**TT source:** TT-002

## Description
In Order Report Beta (OrderReportBetaPage), the action buttons — "Make Unpaid", "Change Payment Method", and similar — are not working. Clicking them has no effect or throws an error.

## Owner input (verbatim)
"in order report beta unpaid change payment method etc buttons are not working"

## Evidence
- Source: OWNER-REPORTED via TT-002
- Confidence: CONFIRMED (owner reported)
- Screenshot: not provided

## Duplicate check
RELATED to CR-349 (2026-08-26 implemented Change/Unpaid/Reprint on Beta Report Settled tab). Buttons were wired by CR-349. Current issue is a regression or incomplete wiring. DISTINCT from BUG-354 (Status column null).

## Code Reality
PARTIAL — `AllOrdersReportPage.jsx` has Change Payment Method handler (CR-003 Phase 3.4). `OrderReportBetaPage` has buttons referenced via CR-349 but handlers may be broken/missing.

## Blast radius
SMALL — OrderReportBetaPage.jsx primarily. Possibly reportService.js.

## Open decisions for Gate 2
- OD-605-01: Which specific buttons — all action buttons or specific ones (Make Unpaid / Change Payment / Reprint)?
- OD-605-02: Does clicking produce a visible error, silent fail, or no response?
