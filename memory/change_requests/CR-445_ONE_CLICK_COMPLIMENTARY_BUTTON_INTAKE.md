# CR-445 — One-Click Complimentary Button in Payment Flow

**ID:** CR-445  **Type:** CR  **Registered:** 2026-10-22  **Sprint:** oct_cr_batch  
**Severity:** P2  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE  
**TT source:** TT-007 + TT-008 (combined)

## Description
When a 100% complimentary discount is configured in the restaurant's discount settings, instead of the staff member having to select it from the payment method dropdown, show a dedicated one-click "Complimentary" button directly in the payment flow. Paired with: a tracking system showing the total number of complimentary orders/services given.

## Owner input (verbatim)
TT-007: "Implement a one-click complimentary order option or a specific payment type"
TT-008: "Implement a tracking system to show the total number of complimentary services"
Owner clarification: "if there is a complimentary discount 100 percent configured in discount instead of user selecting it from drop down in payment method we can have one click button"

## Evidence
- Source: OWNER-REPORTED via TT-007 + TT-008
- Confidence: CONFIRMED
- Screenshot: not provided

## Duplicate check
DISTINCT. 93 hits for "complimentary" in codebase — the complimentary discount type exists in the discount system, but no dedicated one-click button in the payment method selection. No tracking counter for complimentary orders exists.

## Code Reality
PARTIAL — complimentary discount type exists in discount config and CPP. The one-click button and tracking counter do not exist.

## Blast radius
MEDIUM — CollectPaymentPanel.jsx (R5) + possibly restaurantSettingsTransform.js + a new complimentary counter display. ~3–4 files.

## Open decisions for Gate 2
- OD-445-01: Where exactly does the button appear — in payment method selector, or as a top-level action button alongside "Collect"?
- OD-445-02: Complimentary tracking — where is the counter shown? Dashboard tile, report page, or both?
- OD-445-03: Is the button shown only when a 100% complimentary discount is configured, or always with a gate?
- OD-445-04: Can a single order be partially complimentary (some items) or always full order?
