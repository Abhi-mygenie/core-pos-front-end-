# CR-447 — Razorpay Enterprise Partnership Migration

**ID:** CR-447  **Type:** CR  **Registered:** 2026-10-22  **Sprint:** oct_cr_batch  
**Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE  
**TT source:** TT-017 + TT-022 (combined)

## Description
Move Razorpay integration from current setup to an enterprise partnership arrangement. This is primarily a backend change — the Razorpay account, API keys, and settlement flow need to be migrated to the enterprise partner model. FE impact TBD after backend scopes the change.

## Owner input (verbatim)
TT-017: "Send the Razorpay integration message to the group"
TT-022: "Discuss the Razorpay UAT findings with Abhishek Jain in the second half of the day"
Owner clarification: "new CR where backend needs to move Razorpay in our enterprise partnership"

## Evidence
- Source: OWNER-REPORTED via TT-017 + TT-022
- Confidence: CONFIRMED
- Screenshot: not provided

## Duplicate check
DISTINCT. No existing Razorpay enterprise migration CR in registry.

## Code Reality
NONE (FE scope) — Razorpay references exist in codebase but no enterprise migration code.

## Classification
Primarily BACKEND-OWNED. FE may need: new API key config, updated payment flow endpoints, updated Razorpay SDK init. Backend team to scope first.

## Blast radius
UNKNOWN until backend scopes — potentially HIGH (payment flow, settlement, reconciliation).

## Open decisions for Gate 2
- OD-447-01: What changes on FE? New Razorpay key, new SDK version, new payment flow?
- OD-447-02: Is this a parallel run (test + live) or hard cutover?
- OD-447-03: Which restaurants are in scope for the enterprise model?
- OD-447-04: Backend timeline — when will the enterprise account be ready for UAT?

## Next
Backend brief to be filed before Gate 2. FE planning blocked on backend scope.
